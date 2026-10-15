import { useEffect } from 'react';
import Svg, { Path } from 'react-native-svg';
import Animated, { Easing, useAnimatedProps, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { colors } from '@/theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Outline paths of the MPS mark: a three-leaf sprout above a soft base line (64×64 grid). */
const PATHS = [
  { d: 'M32 7 C41 17 41 34 32 45 C23 34 23 17 32 7 Z', len: 92 },
  { d: 'M29.5 45 C19 43.5 11.5 35 9.5 24 C20 24.5 27.5 32.5 29.5 45 Z', len: 62 },
  { d: 'M34.5 45 C45 43.5 52.5 35 54.5 24 C44 24.5 36.5 32.5 34.5 45 Z', len: 62 },
  { d: 'M32 15 L32 41', len: 26 },
  { d: 'M19 51.5 C25 55.5 39 55.5 45 51.5', len: 30 },
];

function Stroke({ d, len, index, animated, color, width }: { d: string; len: number; index: number; animated: boolean; color: string; width: number }) {
  const t = useSharedValue(animated ? 0 : 1);
  useEffect(() => {
    if (animated) t.value = withDelay(index * 160, withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }));
  }, [animated, index, t]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: len * (1 - t.value) }));
  return (
    <AnimatedPath
      d={d}
      stroke={color}
      strokeWidth={index === 3 ? width * 0.7 : width}
      strokeOpacity={index === 3 ? 0.65 : 1}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      strokeDasharray={[len, len]}
      animatedProps={props}
    />
  );
}

/** The MPS leaf logo. `animated` draws the strokes in one after another. */
export function LeafLogo({ size = 56, color = colors.lime, animated = false, strokeWidth = 2.2 }: { size?: number; color?: string; animated?: boolean; strokeWidth?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      {PATHS.map((p, i) => (
        <Stroke key={i} {...p} index={i} animated={animated} color={color} width={strokeWidth} />
      ))}
    </Svg>
  );
}
