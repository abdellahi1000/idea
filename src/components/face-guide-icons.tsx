import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Direction = 'left' | 'right' | 'up' | 'down';

/** The glyph itself always points right; rotating the static wrapper turns
 * it, and the animated "shift" translate lives inside that rotated space so
 * it always reads as moving toward the arrowhead on screen. */
const ARROW_ROTATION: Record<Direction, string> = {
  right: '0deg',
  down: '90deg',
  left: '180deg',
  up: '270deg',
};

export function DirectionArrow({ direction, color, size = 72 }: { direction: Direction; color: string; size?: number }) {
  const shift = useSharedValue(0);

  useEffect(() => {
    shift.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 550, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 450, easing: Easing.in(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [shift]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shift.value * 14 }],
  }));

  return (
    <View style={{ width: size, height: size, transform: [{ rotate: ARROW_ROTATION[direction] }] }}>
      <Animated.View style={animatedStyle}>
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path
            d="M4 12h14M13 6l6 6-6 6"
            stroke={color}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

export function BlinkingEyeIcon({ color, size = 84 }: { color: string; size?: number }) {
  const openness = useSharedValue(1);

  useEffect(() => {
    openness.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900, easing: Easing.linear }),
        withTiming(0.04, { duration: 130, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 180, easing: Easing.in(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [openness]);

  const lidProps = useAnimatedProps(() => ({ ry: 15 * openness.value }));
  const pupilProps = useAnimatedProps(() => ({
    r: 9 * openness.value,
    opacity: openness.value > 0.15 ? 1 : 0,
  }));

  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <AnimatedEllipse cx={32} cy={32} rx={26} animatedProps={lidProps} stroke={color} strokeWidth={2.5} fill="rgba(255,255,255,0.06)" />
      <AnimatedCircle cx={32} cy={32} animatedProps={pupilProps} fill={color} />
    </Svg>
  );
}
