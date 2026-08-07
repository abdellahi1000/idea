import { useState } from 'react';
import { Alert } from 'react-native';

import { deviceTransferService } from '@/services/device-transfer.service';

type PreviewState = {
  code: string;
  requestId: string;
  deviceName: string;
} | null;

export function useScanDeviceTransfer(onDone: () => void) {
  const [isScanning, setIsScanning] = useState(false);
  const [preview, setPreview] = useState<PreviewState>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [approved, setApproved] = useState(false);

  const startScanning = () => {
    setPreview(null);
    setApproved(false);
    setIsScanning(true);
  };

  const onScanned = async (code: string) => {
    setIsScanning(false);
    try {
      const result = await deviceTransferService.previewQrCode(code);
      setPreview({ code, requestId: result.requestId, deviceName: result.deviceName });
    } catch (error) {
      Alert.alert('Could not read QR Code', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const onCancel = async () => {
    if (!preview) {
      setIsScanning(false);
      return;
    }
    setIsSubmitting(true);
    try {
      await deviceTransferService.approveQrCode(preview.code, false);
    } catch {
      // Best-effort invalidation; the code expires on its own regardless.
    } finally {
      setIsSubmitting(false);
      setPreview(null);
    }
  };

  const onApprove = async () => {
    if (!preview) return;
    setIsSubmitting(true);
    try {
      await deviceTransferService.approveQrCode(preview.code, true);
      setApproved(true);
      setTimeout(() => {
        setPreview(null);
        setApproved(false);
        onDone();
      }, 1200);
    } catch (error) {
      Alert.alert('Could not approve device', error instanceof Error ? error.message : 'Please try again.');
      setPreview(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isScanning,
    preview,
    isSubmitting,
    approved,
    startScanning,
    stopScanning: () => setIsScanning(false),
    onScanned,
    onCancel,
    onApprove,
  };
}
