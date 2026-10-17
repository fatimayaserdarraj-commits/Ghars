import { useEffect, useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';

/** One large leaf silhouette with a midrib, drawn in deep greens. */
function LeafShape({ w, h, id: base }: { w: number; h: number; id: string }) {
  // Unique per instance, since the backdrop can be mounted on several stacked screens at once.
  const id = `${base}-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg width={w} height={h} viewBox="0 0 100 220">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#4F7258" />
          <Stop offset="1" stopColor="#1F3027" />
        </LinearGradient>
      </Defs>
      <Path d="M50 0 C95 40 92 140 50 220 C8 140 5 40 50 0 Z" fill={`url(#${id})`} />
      <Path d="M50 14 C52 80 52 150 50 214" stroke="rgba(201,221,176,0.22)" strokeWidth={1.4} fill="none" />
      {[40, 70, 100, 130, 160].map((y) => (
        <Path key={y} d={`M50.5 ${y} C62 ${y - 8} 72 ${y - 18} 80 ${y - 30} M49.5 ${y} C38 ${y - 8} 28 ${y - 18} 20 ${y - 30}`} stroke="rgba(201,221,176,0.10)" strokeWidth={1} fill="none" />
      ))}
    </Svg>
  );
}

function SwayingLeaf({ w, h, x, y, rotate, opacity, delay, id }: { w: number; h: number; x: number | `${number}%`; y: number | `${number}%`; rotate: number; opacity: number; delay: number; id: string }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withRepeat(withTiming(1, { duration: 5200, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [t, delay]);
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate + interpolate(t.value, [0, 1], [-3, 3])}deg` }, { translateY: interpolate(t.value, [0, 1], [0, 8]) }],
  }));
  return (
    <Animated.View style={[{ position: 'absolute', left: x, top: y, opacity }, style]}>
      <LeafShape w={w} h={h} id={id} />
    </Animated.View>
  );
}

/** Soft, out-of-focus foliage behind hero screens. */
export function BackdropLeaves() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <SwayingLeaf id="l1" w={260} h={560} x="48%" y={-40} rotate={-28} opacity={0.75} delay={0} />
      <SwayingLeaf id="l2" w={190} h={420} x={-90} y="42%" rotate={32} opacity={0.55} delay={900} />
      <SwayingLeaf id="l3" w={150} h={330} x="62%" y="64%" rotate={-48} opacity={0.5} delay={1800} />
      <SwayingLeaf id="l4" w={120} h={260} x={-30} y={-30} rotate={18} opacity={0.35} delay={600} />
      {/* Darken the leaves so the glass card on top stays readable. */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(20,32,25,0.35)' }]} />
    </View>
  );
}
