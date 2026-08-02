// Supabase Edge Function: verify-identity
//
// Secure server-side proxy for the ID-photo-vs-selfie face match required by
// Client_App.docx's Identity Verification / Selfie Verification flow. The
// mobile app must never hold AWS credentials, so this function does the
// AWS Rekognition CompareFaces call on the client's behalf.
//
// Deploy-time secrets required (set via `supabase secrets set`, never
// committed): AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION.
// Not deployed as part of this phase - see plan section 8.

import { createClient } from 'supabase';
import { CompareFacesCommand, RekognitionClient } from 'rekognition';

const SIMILARITY_THRESHOLD = 80;
const IDENTITY_DOCUMENTS_BUCKET = 'identity-documents';

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

async function downloadAsUint8Array(
  serviceClient: ReturnType<typeof createClient>,
  path: string,
): Promise<Uint8Array> {
  const { data, error } = await serviceClient.storage.from(IDENTITY_DOCUMENTS_BUCKET).download(path);
  if (error || !data) {
    throw new Error(`Unable to download ${path}`);
  }
  return new Uint8Array(await data.arrayBuffer());
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ error: 'Missing authorization' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Caller-scoped client: RLS still applies, so fetching the row here also
  // proves the caller owns it (identity_verification_select_own policy).
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const serviceClient = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { identity_verification_id: id } = await req.json();
    if (!id) {
      return jsonResponse({ error: 'identity_verification_id is required' }, 400);
    }

    const { data: record, error: fetchError } = await callerClient
      .from('identity_verification')
      .select('id, user_id, document_front_path, selfie_path')
      .eq('id', id)
      .single();

    if (fetchError || !record) {
      return jsonResponse({ error: 'Verification request not found' }, 404);
    }
    if (!record.document_front_path || !record.selfie_path) {
      return jsonResponse({ error: 'Both a document photo and a selfie are required' }, 400);
    }

    const [sourceImage, targetImage] = await Promise.all([
      downloadAsUint8Array(serviceClient, record.document_front_path),
      downloadAsUint8Array(serviceClient, record.selfie_path),
    ]);

    const rekognition = new RekognitionClient({
      region: Deno.env.get('AWS_REGION')!,
      credentials: {
        accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID')!,
        secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY')!,
      },
    });

    let similarity = 0;
    try {
      const result = await rekognition.send(
        new CompareFacesCommand({
          SourceImage: { Bytes: sourceImage },
          TargetImage: { Bytes: targetImage },
          SimilarityThreshold: SIMILARITY_THRESHOLD,
        }),
      );
      similarity = result.FaceMatches?.[0]?.Similarity ?? 0;
    } catch {
      // No face detected / API error - treat as a non-match, never leak the
      // underlying AWS error to the client.
      similarity = 0;
    }

    const approved = similarity >= SIMILARITY_THRESHOLD;

    const { error: updateError } = await serviceClient
      .from('identity_verification')
      .update({
        status: approved ? 'approved' : 'rejected',
        match_similarity: similarity,
        matched_at: new Date().toISOString(),
        rejection_reason: approved
          ? null
          : 'We could not verify your identity from the provided photos. Please visit an authorized agency.',
      })
      .eq('id', id);

    if (updateError) {
      throw updateError;
    }

    await serviceClient.from('audit_logs').insert({
      actor_user_id: record.user_id,
      action: 'identity_verification.reviewed',
      entity_table: 'identity_verification',
      entity_id: id,
      metadata: { approved, similarity },
    });

    return jsonResponse({ status: approved ? 'approved' : 'rejected', similarity }, 200);
  } catch (error) {
    console.error('verify-identity failed', error);
    return jsonResponse({ error: 'Verification could not be completed. Please try again later.' }, 500);
  }
});
