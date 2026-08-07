import { VisionCameraProxy, type Frame } from 'react-native-vision-camera';

export type RawFace = {
  yawAngle: number;
  pitchAngle: number;
  rollAngle: number;
  leftEyeOpenProbability: number;
  rightEyeOpenProbability: number;
  smilingProbability: number;
  bounds: { x: number; y: number; width: number; height: number };
};

const plugin = VisionCameraProxy.initFrameProcessorPlugin('scanFaces', {});

/** Calls the native MLKit face-detector Frame Processor Plugin registered by
 * the (patched, see patches/vision-camera-face-detector+*.patch) native
 * module - VisionCamera v4's plugin API, not the npm package's stale JS. */
export function scanFaces(frame: Frame): RawFace[] {
  'worklet';
  if (!plugin) return [];
  const result = plugin.call(frame) as unknown as RawFace[] | undefined;
  return result ?? [];
}
