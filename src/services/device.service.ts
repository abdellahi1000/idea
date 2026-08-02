import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

import { deviceRepository } from '@/repositories/device.repository';

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
  // Web has no stable native identifier - persist a generated one.
  const existing = await AsyncStorage.getItem(WEB_INSTALLATION_ID_KEY);
  if (existing) return existing;
  const generated = Crypto.randomUUID();
  await AsyncStorage.setItem(WEB_INSTALLATION_ID_KEY, generated);
  return generated;
}

export const deviceService = {
  listOwnDevices: deviceRepository.listOwn,
  activateDevice: deviceRepository.activate,

  async registerCurrentDevice(userId: string) {
    return deviceRepository.register({
      user_id: userId,
      device_installation_id: await getInstallationId(),
      device_name: Device.deviceName ?? `${Device.manufacturer ?? ''} ${Device.modelName ?? ''}`.trim(),
      platform: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web',
    });
  },
};
