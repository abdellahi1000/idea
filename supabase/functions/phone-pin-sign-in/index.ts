// Supabase Edge Function: phone-pin-sign-in
//
// Mints a real Supabase Auth session for "Phone Number + Login PIN" sign-in
// without ever checking the PIN client-side. The PIN itself is only ever
// compared inside verify_phone_login_pin (Postgres, service-role only).
// On success, this uses the Admin API to generate a one-time magic-link
// token for the account's email - no email is actually sent, the token is
// just handed back to the caller, who exchanges it for a session via
// supabase.auth.verifyOtp({ token_hash, type: 'magiclink' }).
//
// No secrets need to be configured for this function - SUPABASE_URL,
// SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are auto-injected into
// every Edge Function.

import { createClient } from 'supabase';

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const GENERIC_ERROR = { error: 'Invalid phone number or PIN' };

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const serviceClient = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { phone, pin } = await req.json();
    if (!phone || !pin) {
      return jsonResponse(GENERIC_ERROR, 400);
    }

    const { data: verified, error: verifyError } = await serviceClient
      .rpc('verify_phone_login_pin', { p_phone: phone, p_pin: pin })
      .single();

    if (verifyError || !verified) {
      return jsonResponse(GENERIC_ERROR, 401);
    }

    const { data: link, error: linkError } = await serviceClient.auth.admin.generateLink({
      type: 'magiclink',
      email: verified.email,
    });

    if (linkError || !link?.properties?.hashed_token) {
      return jsonResponse(GENERIC_ERROR, 401);
    }

    return jsonResponse({ token_hash: link.properties.hashed_token }, 200);
  } catch (error) {
    console.error('phone-pin-sign-in failed', error);
    return jsonResponse(GENERIC_ERROR, 401);
  }
});
