import { useEffect, useId } from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';

import { ARABIC_PATH, LATIN_PATH, LOCKUP, MARK_PATH, MARK_SIZE } from './brand-paths';

export const brand = {
  sand: '#D8C5B2',
  sandDeep: '#C6B09B',
  cream: '#EDE2D7',
};

/** The Ghars leaf tile (palm frond cut out of a sand-coloured leaf shape). */
export function BrandMark({ size = 56 }: { size?: number }) {
  // Gradient ids must be unique per instance: several logos can be mounted at once (e.g. stacked screens).
  const gid = `ghars-sand-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${MARK_SIZE} ${MARK_SIZE}`}>
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={brand.sand} />
          <Stop offset="1" stopColor={brand.sandDeep} />
        </LinearGradient>
      </Defs>
      <Path d={MARK_PATH} fill={`url(#${gid})`} fillRule="evenodd" />
    </Svg>
  );
}

/** Animated reveal: the mark pops in, then the Arabic and Latin wordmarks slide into place. */
function useReveal(delay: number, animated: boolean, from = 14) {
  const t = useSharedValue(animated ? 0 : 1);
  useEffect(() => {
    if (animated) t.value = withDelay(delay, withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }));
  }, [animated, delay, t]);
  return useAnimatedStyle(() => ({ opacity: t.value, transform: [{ translateY: (1 - t.value) * from }] }));
}

/** Full Ghars lockup: leaf mark + غَرس + GHARS. */
export function BrandLogo({ width = 260, animated = false }: { width?: number; animated?: boolean }) {
  const k = width / LOCKUP.width;
  const pop = useSharedValue(animated ? 0 : 1);
  useEffect(() => {
    if (animated) pop.value = withSpring(1, { damping: 11, stiffness: 120 });
  }, [animated, pop]);
  const markStyle = useAnimatedStyle(() => ({ opacity: Math.min(pop.value * 1.5, 1), transform: [{ scale: 0.6 + pop.value * 0.4 }, { rotate: `${(1 - pop.value) * -12}deg` }] }));
  const arabicStyle = useReveal(250, animated);
  const latinStyle = useReveal(500, animated, 8);

  return (
    // Logos keep their own layout in both reading directions.
    <View style={{ width, height: LOCKUP.height * k, direction: 'ltr' }} accessibilityRole="image" accessibilityLabel="Ghars غَرس">
      <Animated.View style={[{ position: 'absolute', left: 0, top: 80 * k }, markStyle]}>
        <BrandMark size={MARK_SIZE * k} />
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', left: 180 * k, top: 0 }, arabicStyle]}>
        <Svg width={468 * k} height={236 * k} viewBox="0 0 468 236">
          <Path d={ARABIC_PATH} fill={brand.cream} fillRule="evenodd" />
        </Svg>
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', left: 258 * k, top: 236 * k }, latinStyle]}>
        <Svg width={320 * k} height={42 * k} viewBox="0 0 320 42">
          <Path d={LATIN_PATH} fill={brand.cream} fillRule="evenodd" />
        </Svg>
      </Animated.View>
    </View>
  );
}
