import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useMicrophonePermission,
  useFrameProcessor,
} from 'react-native-vision-camera';
import { useRunOnJS } from 'react-native-worklets-core';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { FaceProgressRing } from '@/components/face-progress-ring';
import { DirectionArrow, BlinkingEyeIcon } from '@/components/face-guide-icons';
import { Spacing } from '@/constants/theme';
import { BlinkDetector, isBlinkStep, isFaceCentered, isStepSatisfied, type FaceMetrics } from '@/utilities/face-liveness';
import { scanFaces } from '@/utilities/scan-faces';

type Props = {
  /** Movements to guide the user through, e.g. ['Look Right', 'Look Left', 'Blink']. */
  challenge: string[];
  onComplete: (localUri: string) => void;
  onCancel: () => void;
};

type Phase = 'positioning' | 'active' | 'success' | 'timeout' | 'max-attempts';

const SESSION_TIMEOUT_MS = 10_000;
const MAX_ATTEMPTS = 5;
const RING_SIZE = 280;
const RING_STROKE = 6;

const STEP_COPY: Record<string, { instruction: string; direction?: 'left' | 'right' | 'up' | 'down' }> = {
  'Look Left': { instruction: 'Turn your head to the left', direction: 'left' },
  'Look Right': { instruction: 'Turn your head to the right', direction: 'right' },
  'Look Up': { instruction: 'Look up', direction: 'up' },
  'Look Down': { instruction: 'Look down', direction: 'down' },
  Blink: { instruction: 'Blink naturally' },
};

export function FaceRecordingCamera({ challenge, onComplete, onCancel }: Props) {
  const { hasPermission: hasCameraPermission, requestPermission: requestCameraPermission } = useCameraPermission();
  const { hasPermission: hasMicPermission, requestPermission: requestMicPermission } = useMicrophonePermission();
  const device = useCameraDevice('front');
  const cameraRef = useRef<Camera>(null);

  const [phase, setPhase] = useState<Phase>('positioning');
  const [attempt, setAttempt] = useState(1);
  const [stepIndex, setStepIndex] = useState(0);
  const [faceCentered, setFaceCentered] = useState(false);
  const [recordingStarted, setRecordingStarted] = useState(false);

  const blinkDetector = useRef(new BlinkDetector());
  const stepIndexRef = useRef(0);
  const phaseRef = useRef<Phase>('positioning');
  const isMounted = useRef(true);
  useEffect(() => {
    stepIndexRef.current = stepIndex;
  }, [stepIndex]);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(
    () => () => {
      isMounted.current = false;
    },
    [],
  );

  useEffect(() => {
    if (!hasCameraPermission) requestCameraPermission();
    if (!hasMicPermission) requestMicPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const glow = useSharedValue(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [pulse]);

  useEffect(() => {
    glow.value = withTiming(faceCentered ? 1 : 0, { duration: 250 });
  }, [faceCentered, glow]);

  const ringAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    borderColor: glow.value > 0.5 ? '#22A06B' : 'rgba(255,255,255,0.35)',
    shadowOpacity: glow.value * 0.8,
  }));

  const resetForNewAttempt = useCallback(() => {
    blinkDetector.current.reset();
    setStepIndex(0);
    setFaceCentered(false);
    setRecordingStarted(false);
    setPhase('positioning');
  }, []);

  const finishAsFailure = useCallback(async () => {
    if (cameraRef.current && recordingStarted) {
      try {
        await cameraRef.current.stopRecording();
      } catch {
        // Recording may already have stopped - nothing to clean up.
      }
    }
    if (!isMounted.current) return;
    setAttempt((current) => {
      const next = current + 1;
      if (next > MAX_ATTEMPTS) {
        setPhase('max-attempts');
      } else {
        setPhase('timeout');
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordingStarted]);

  const sessionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startSessionTimer = useCallback(() => {
    if (sessionTimer.current) clearTimeout(sessionTimer.current);
    sessionTimer.current = setTimeout(() => {
      if (phaseRef.current === 'active') {
        finishAsFailure();
      }
    }, SESSION_TIMEOUT_MS);
  }, [finishAsFailure]);

  useEffect(
    () => () => {
      if (sessionTimer.current) clearTimeout(sessionTimer.current);
    },
    [],
  );

  const advanceStep = useCallback(async () => {
    const nextIndex = stepIndexRef.current + 1;
    if (nextIndex >= challenge.length) {
      if (sessionTimer.current) clearTimeout(sessionTimer.current);
      setPhase('success');
      if (cameraRef.current) {
        try {
          await cameraRef.current.stopRecording();
        } catch {
          // Handled via onRecordingError below.
        }
      }
      return;
    }
    setStepIndex(nextIndex);
  }, [challenge.length]);

  const onFaceSample = useCallback(
    (metrics: FaceMetrics | null, frameWidth: number, frameHeight: number) => {
      if (!isMounted.current) return;

      if (!metrics) {
        setFaceCentered(false);
        return;
      }

      const centered = isFaceCentered(metrics, { width: frameWidth, height: frameHeight });
      setFaceCentered(centered);

      if (phaseRef.current === 'positioning') {
        if (centered) {
          blinkDetector.current.reset();
          setPhase('active');
          startSessionTimer();
        }
        return;
      }

      if (phaseRef.current !== 'active') return;

      const currentStep = challenge[stepIndexRef.current];
      if (!currentStep || !centered) return;

      if (isBlinkStep(currentStep)) {
        const blinked = blinkDetector.current.update(metrics.leftEyeOpenProbability, metrics.rightEyeOpenProbability);
        if (blinked) advanceStep();
        return;
      }

      if (isStepSatisfied(currentStep, metrics)) {
        advanceStep();
      }
    },
    [challenge, advanceStep, startSessionTimer],
  );

  const handleFaceSample = useRunOnJS(onFaceSample, [onFaceSample]);

  const frameProcessor = useFrameProcessor(
    (frame) => {
      'worklet';
      const faces = scanFaces(frame);
      const face = faces[0];
      if (!face) {
        handleFaceSample(null, frame.width, frame.height);
        return;
      }
      handleFaceSample(
        {
          yawAngle: face.yawAngle,
          pitchAngle: face.pitchAngle,
          leftEyeOpenProbability: face.leftEyeOpenProbability,
          rightEyeOpenProbability: face.rightEyeOpenProbability,
          bounds: face.bounds,
        },
        frame.width,
        frame.height,
      );
    },
    [handleFaceSample],
  );

  // Start recording once we transition into 'active' - one continuous clip covers the whole challenge.
  useEffect(() => {
    if (phase !== 'active' || recordingStarted || !cameraRef.current) return;
    setRecordingStarted(true);
    cameraRef.current.startRecording({
      onRecordingFinished: (video) => {
        if (phaseRef.current === 'success' && isMounted.current) {
          onComplete(video.path);
        }
      },
      onRecordingError: () => {
        // Surfaced implicitly by the timeout/retry flow if it wasn't a clean stop.
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, recordingStarted]);

  const onRetry = () => {
    resetForNewAttempt();
  };

  if (!hasCameraPermission || !hasMicPermission) {
    return (
      <View style={styles.centered}>
        <ThemedText type="title" style={styles.whiteText}>
          Camera access needed
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.whiteSecondary}>
          JOJO needs camera and microphone access to verify your Face Identity.
        </ThemedText>
        <PrimaryButton
          title="Grant Access"
          onPress={() => {
            requestCameraPermission();
            requestMicPermission();
          }}
        />
        <PrimaryButton title="Cancel" onPress={onCancel} />
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.centered}>
        <ThemedText type="title" style={styles.whiteText}>
          No camera available
        </ThemedText>
        <PrimaryButton title="Cancel" onPress={onCancel} />
      </View>
    );
  }

  if (phase === 'max-attempts') {
    return (
      <View style={styles.centered}>
        <ThemedText type="title" style={styles.whiteText}>
          Maximum attempts reached
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.whiteSecondary}>
          We couldn&apos;t verify your Face Identity after {MAX_ATTEMPTS} attempts. Please try again later.
        </ThemedText>
        <PrimaryButton title="Back" onPress={onCancel} />
      </View>
    );
  }

  if (phase === 'timeout') {
    return (
      <View style={styles.centered}>
        <ThemedText type="title" style={styles.whiteText}>
          Verification timed out
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.whiteSecondary}>
          Attempt {Math.min(attempt, MAX_ATTEMPTS)} of {MAX_ATTEMPTS}.
        </ThemedText>
        <PrimaryButton title="Retry" onPress={onRetry} />
        <PrimaryButton title="Cancel" onPress={onCancel} />
      </View>
    );
  }

  if (phase === 'success') {
    return (
      <View style={styles.centered}>
        <View style={styles.successCircle}>
          <ThemedText style={styles.successCheck}>✓</ThemedText>
        </View>
        <ThemedText type="title" style={styles.whiteText}>
          Face successfully verified
        </ThemedText>
      </View>
    );
  }

  const currentStep = challenge[stepIndex];
  const copy = STEP_COPY[currentStep];
  const progress = phase === 'active' ? stepIndex / challenge.length : 0;

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive
        video
        audio={hasMicPermission}
        frameProcessor={frameProcessor}
      />

      <View style={styles.overlay}>
        <View style={styles.frameArea}>
          <FaceProgressRing
            size={RING_SIZE + RING_STROKE * 2}
            strokeWidth={RING_STROKE}
            progress={progress}
            color="#22A06B"
            trackColor="rgba(255,255,255,0.15)"
          />
          <Animated.View style={[styles.circle, { width: RING_SIZE, height: RING_SIZE, borderRadius: RING_SIZE / 2 }, ringAnimatedStyle]} />
        </View>

        {!faceCentered && (
          <ThemedText style={styles.hintText}>Center your face inside the circle</ThemedText>
        )}

        {faceCentered && phase === 'active' && currentStep && (
          <View style={styles.guideArea}>
            {copy?.direction ? (
              <DirectionArrow direction={copy.direction} color="#22A06B" />
            ) : (
              <BlinkingEyeIcon color="#22A06B" />
            )}
            <ThemedText type="subtitle" style={styles.instruction}>
              {copy?.instruction ?? currentStep}
            </ThemedText>
          </View>
        )}

        <PrimaryButton title="Cancel" onPress={onCancel} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1410' },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
    backgroundColor: '#0B1410',
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.six,
    paddingHorizontal: Spacing.four,
  },
  frameArea: {
    alignItems: 'center',
    justifyContent: 'center',
    width: RING_SIZE + RING_STROKE * 2,
    height: RING_SIZE + RING_STROKE * 2,
    marginTop: Spacing.six,
  },
  circle: {
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.35)',
    shadowColor: '#22A06B',
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
  },
  hintText: { color: '#ffffff', textAlign: 'center' },
  guideArea: { alignItems: 'center', gap: Spacing.three },
  instruction: { color: '#ffffff', textAlign: 'center', fontSize: 22, lineHeight: 28 },
  whiteText: { color: '#ffffff', textAlign: 'center' },
  whiteSecondary: { textAlign: 'center' },
  successCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#22A06B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successCheck: { fontSize: 56, color: '#ffffff', fontWeight: '700' },
});
