import { identityVerificationRepository } from '@/repositories/identity-verification.repository';

export const identityVerificationService = {
  getOwn: identityVerificationRepository.getOwn,
  subscribeToOwn: identityVerificationRepository.subscribeToOwn,

  async submitVerification(args: {
    userId: string;
    documentType: 'national_id' | 'passport' | 'drivers_license';
    documentNumber: string;
    documentFrontUri: string;
    documentBackUri?: string;
    selfieUri: string;
  }) {
    const [documentFrontPath, documentBackPath, selfiePath] = await Promise.all([
      identityVerificationRepository.uploadDocumentFront(args.userId, args.documentFrontUri),
      args.documentBackUri
        ? identityVerificationRepository.uploadDocumentBack(args.userId, args.documentBackUri)
        : Promise.resolve(undefined),
      identityVerificationRepository.uploadSelfie(args.userId, args.selfieUri),
    ]);

    const record = await identityVerificationRepository.submit({
      user_id: args.userId,
      document_type: args.documentType,
      document_number: args.documentNumber,
      document_front_path: documentFrontPath,
      document_back_path: documentBackPath ?? null,
      selfie_path: selfiePath,
    });

    await identityVerificationRepository.requestVerification(record.id);

    return record;
  },
};
