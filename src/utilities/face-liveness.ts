export type FaceMetrics = {
  yawAngle: number;
  pitchAngle: number;
  leftEyeOpenProbability: number;
  rightEyeOpenProbability: number;
  bounds: { x: number; y: number; width: number; height: number };
};

export type FrameSize = { width: number; height: number };

const YAW_THRESHOLD = 16;
const PITCH_THRESHOLD = 12;
const EYES_OPEN = 0.6;
const EYES_CLOSED = 0.25;

/** MLKit's front-camera yaw/pitch sign convention: positive yaw is the
 * subject's face turning toward their own left, positive pitch is looking
 * up. Flip these two lines first if a device reports gestures reversed. */
export function isStepSatisfied(step: string, face: FaceMetrics): boolean {
  switch (step) {
    case 'Look Left':
      return face.yawAngle > YAW_THRESHOLD;
    case 'Look Right':
      return face.yawAngle < -YAW_THRESHOLD;
    case 'Look Up':
      return face.pitchAngle > PITCH_THRESHOLD;
    case 'Look Down':
      return face.pitchAngle < -PITCH_THRESHOLD;
    default:
      return false;
  }
}

export function isFaceCentered(face: FaceMetrics, frame: FrameSize): boolean {
  const faceCenterX = face.bounds.x + face.bounds.width / 2;
  const faceCenterY = face.bounds.y + face.bounds.height / 2;
  const toleranceX = frame.width * 0.25;
  const toleranceY = frame.height * 0.25;
  const sizeRatio = face.bounds.width / frame.width;

  return (
    Math.abs(faceCenterX - frame.width / 2) < toleranceX &&
    Math.abs(faceCenterY - frame.height / 2) < toleranceY &&
    sizeRatio > 0.2 &&
    sizeRatio < 0.9
  );
}

/** Tracks an open->closed->open transition, not just "eyes currently
 * closed" - a static closed-eye pose must never count as a blink. */
export class BlinkDetector {
  private wasOpen = true;

  reset(): void {
    this.wasOpen = true;
  }

  /** Returns true the moment a full blink cycle completes. */
  update(leftOpenProbability: number, rightOpenProbability: number): boolean {
    const openness = Math.min(leftOpenProbability, rightOpenProbability);
    if (this.wasOpen && openness < EYES_CLOSED) {
      this.wasOpen = false;
      return false;
    }
    if (!this.wasOpen && openness > EYES_OPEN) {
      this.wasOpen = true;
      return true;
    }
    return false;
  }
}

export function isBlinkStep(step: string): boolean {
  return step === 'Blink';
}
