import * as Application from 'expo-application';
import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { deviceTransferRepository } from '@/repositories/device-transfer.repository';
import { faceIdentityRepository } from '@/repositories/face-identity.repository';
import { generateFaceChallenge } from '@/utilities/face-challenge';

const WEB_INSTALLATION_ID_KEY = 'jojo.webInstallationId';

async function getInstallationId(): Promise<string> {
  if (Platform.OS === 'android') {
    return Application.getAndroidId();
  }
  if (Platform.OS === 'ios') {
    const id = await Application.getIosIdForVendorAsync();
    if (!id) throw new Error('Unable to determine iOS vendor identifier');
    return id;
  }
  const existing = await AsyncStorage.getItem(WEB_INSTALLATION_ID_KEY);
  if (existing) return existing;
  const generated = Crypto.randomUUID();
  await AsyncStorage.setItem(WEB_INSTALLATION_ID_KEY, generated);
  return generated;
}

export const deviceTransferService = {
  getCurrentInstallationId: getInstallationId,

  async start(verificationMethod: 'qr_code' | 'face_id' | 'fingerprint') {
    return deviceTransferRepository.start({
      verificationMethod,
      deviceInstallationId: await getInstallationId(),
      deviceName: Device.deviceName ?? `${Device.manufacturer ?? ''} ${Device.modelName ?? ''}`.trim(),
      platform: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web',
    });
  },

  createQrCode: deviceTransferRepository.createQrCode,
  previewQrCode: deviceTransferRepository.previewQrCode,
  approveQrCode: deviceTransferRepository.approveQrCode,
  cancel: deviceTransferRepository.cancel,
  getRequest: deviceTransferRepository.getRequest,
  subscribeToRequest: deviceTransferRepository.subscribeToRequest,
  complete: deviceTransferRepository.complete,

  async submitFaceVerification(userId: string, requestId: string, localVideoUri: string, challenge: string[]) {
    const path = await faceIdentityRepository.uploadLastFace(userId, localVideoUri);
    return deviceTransferRepository.submitFaceVerification({ requestId, storagePath: path, challenge });
  },

  generateChallenge: generateFaceChallenge,
};
