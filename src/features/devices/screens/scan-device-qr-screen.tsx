import { router } from 'expo-router';
import { useEffect } from 'react';

import { DeviceTransferConfirmSheet } from '@/components/device-transfer-confirm-sheet';
import { QrScanner } from '@/components/qr-scanner';
import { useScanDeviceTransfer } from '@/features/devices/hooks/use-scan-device-transfer';

export function ScanDeviceQrScreen() {
  const scan = useScanDeviceTransfer(() => router.back());

  useEffect(() => {
    scan.startScanning();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <QrScanner
        onScanned={scan.onScanned}
        onCancel={() => {
          scan.stopScanning();
          router.back();
        }}
      />

      <DeviceTransferConfirmSheet
        visible={!!scan.preview || scan.approved}
        deviceName={scan.preview?.deviceName ?? null}
        approved={scan.approved}
        loading={scan.isSubmitting}
        onCancel={async () => {
          await scan.onCancel();
          scan.startScanning();
        }}
        onApprove={scan.onApprove}
      />
    </>
  );
}
