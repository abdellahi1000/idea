import { faceIdentityRepository } from '@/repositories/face-identity.repository';

export const faceIdentityService = {
  getOwn: faceIdentityRepository.getOwn,

  async createFirstFaceIdentity(userId: string, localVideoUri: string): Promise<void> {
    const path = await faceIdentityRepository.uploadFirstFace(userId, localVideoUri);
    await faceIdentityRepository.submitFirstFaceIdentity(path);
  },
};
