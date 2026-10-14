import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/theme';

/** How the mascot reacts to what the user is doing on the form. */
export type Mood = 'idle' | 'typing' | 'shy' | 'sad' | 'happy';

const W = 180;
const H = 180;
const POT_H = 46;
const STEM = 96;
const CX = W / 2;

/** Leaf angle per mood: [left, right] in degrees (0 = horizontal). */
const ANGLES: Record<Mood, [number, number]> = {
  idle: [-28, 28],
  typing: [-38, 18],
  shy: [62, -62], // fold up over the "face" while a password is typed
  sad: [-70, 70], // droop
  happy: [-45, 45],
};

function Leaf({ side, at, grow, mood, sway, size = 1 }: { side: 'left' | 'right'; at: number; grow: SharedValue<number>; mood: Mood; sway: SharedValue<number>; size?: number }) {
  const angle = useSharedValue(ANGLES.idle[side === 'left' ? 0 : 1]);
  useEffect(() => {
    angle.value = withSpring(ANGLES[mood][side === 'left' ? 0 : 1], { damping: 9, stiffness: 120 });
  }, [mood, side, angle]);

  const style = useAnimatedStyle(() => {
    // Each leaf unfurls once the stem has grown past it.
    const shown = interpolate(grow.value, [at - 0.1, at + 0.15], [0, 1], 'clamp');
    const wobble = interpolate(sway.value, [0, 1], [-5, 5]) * (side === 'left' ? 1 : -1);
    return {
      opacity: shown,
      transform: [{ rotate: `${angle.value + wobble}deg` }, { scale: shown * size }],
    };
  });

  const len = 46;
  return (
    // The wrapper is centred on the stem, so rotating it pivots the leaf at its base.
    <Animated.View style={[{ position: 'absolute', left: CX - len, bottom: POT_H + at * STEM - 9, width: len * 2, height: 18 }, style]}>
      <LinearGradient
        colors={['#C6F432', '#3DDC84', '#14A55B']}
        start={{ x: side === 'left' ? 1 : 0, y: 0.5 }}
        end={{ x: side === 'left' ? 0 : 1, y: 0.5 }}
        style={[
          styles.leaf,
          side === 'left'
            ? { left: 0, borderTopLeftRadius: 18, borderBottomRightRadius: 18, borderTopRightRadius: 3, borderBottomLeftRadius: 3 }
            : { right: 0, borderTopRightRadius: 18, borderBottomLeftRadius: 18, borderTopLeftRadius: 3, borderBottomRightRadius: 3 },
        ]}>
        <View style={[styles.vein, side === 'left' ? { right: 4 } : { left: 4 }]} />
      </LinearGradient>
    </Animated.View>
  );
}

function Sparkle({ x, delay }: { x: number; delay: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withRepeat(withTiming(1, { duration: 2600, easing: Easing.out(Easing.quad) }), -1));
  }, [t, delay]);
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.2, 1], [0, 1, 0]),
    transform: [{ translateY: interpolate(t.value, [0, 1], [0, -90]) }, { scale: interpolate(t.value, [0, 1], [0.6, 1.2]) }],
  }));
  return <Animated.View style={[styles.sparkle, { left: x, bottom: POT_H + 10 }, style]} />;
}

/** `shrink` (0–1) scales the mascot down, e.g. while the keyboard is open. */
export function PlantMascot({ mood, shrink }: { mood: Mood; shrink?: SharedValue<number> }) {
  const grow = useSharedValue(0);
  const sway = useSharedValue(0);
  const glow = useSharedValue(0);
  const bloom = useSharedValue(0);
  const body = useSharedValue(0);

  useEffect(() => {
    grow.value = withDelay(250, withTiming(1, { duration: 1400, easing: Easing.out(Easing.cubic) }));
    bloom.value = withDelay(1500, withSpring(1, { damping: 7 }));
    sway.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }), -1, true);
    glow.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [grow, bloom, sway, glow]);

  useEffect(() => {
    if (mood === 'happy') {
      bloom.set(withSequence(withSpring(1.6, { damping: 5 }), withSpring(1.25)));
      body.set(withSequence(withTiming(-14, { duration: 160 }), withSpring(0, { damping: 6 })));
    } else if (mood === 'sad') {
      bloom.set(withSpring(0.7));
      body.set(withSequence(withTiming(8, { duration: 70 }), withTiming(-8, { duration: 70 }), withTiming(6, { duration: 70 }), withSpring(0)));
    } else {
      bloom.set(withSpring(1));
    }
  }, [mood, bloom, body]);

  const wrap = useAnimatedStyle(() => ({ transform: [{ scale: shrink ? interpolate(shrink.value, [0, 1], [1, 0.62]) : 1 }] }));
  const plant = useAnimatedStyle(() => ({
    transform: [
      { translateX: mood === 'sad' ? body.value : 0 },
      { translateY: mood === 'happy' ? body.value : 0 },
      { rotate: `${interpolate(sway.value, [0, 1], [-1.5, 1.5]) + (mood === 'sad' ? 6 : 0)}deg` },
    ],
  }));
  const stem = useAnimatedStyle(() => ({ height: grow.value * STEM }));
  const flower = useAnimatedStyle(() => ({
    bottom: POT_H + grow.value * STEM - 14,
    opacity: interpolate(bloom.value, [0, 0.4], [0, 1], 'clamp'),
    transform: [{ scale: bloom.value }, { rotate: `${interpolate(sway.value, [0, 1], [-10, 10])}deg` }],
  }));
  const halo = useAnimatedStyle(() => ({
    opacity: interpolate(glow.value, [0, 1], [0.25, 0.55]),
    transform: [{ scale: interpolate(glow.value, [0, 1], [0.92, 1.08]) }],
  }));

  return (
    <Animated.View style={[{ width: W, height: H }, wrap]}>
      <Animated.View style={[styles.halo, halo]} />
      <Sparkle x={CX - 50} delay={0} />
      <Sparkle x={CX + 40} delay={900} />
      <Sparkle x={CX - 10} delay={1700} />
      <Animated.View style={[StyleSheet.absoluteFill, plant]}>
        <Animated.View style={[styles.stem, stem]} />
        <Leaf side="left" at={0.3} grow={grow} mood={mood} sway={sway} />
        <Leaf side="right" at={0.52} grow={grow} mood={mood} sway={sway} />
        <Leaf side="left" at={0.74} grow={grow} mood={mood} sway={sway} size={0.8} />
        <Leaf side="right" at={0.9} grow={grow} mood={mood} sway={sway} size={0.65} />
        <Animated.View style={[styles.flower, flower]}>
          <Text style={{ fontSize: 30 }}>{mood === 'sad' ? '🥀' : '🌼'}</Text>
        </Animated.View>
      </Animated.View>
      <LinearGradient colors={['#FF9A6B', '#E0603C']} style={styles.pot}>
        <View style={styles.potRim} />
        <Text style={styles.face}>{mood === 'shy' ? '🙈' : mood === 'sad' ? '😟' : mood === 'happy' ? '😄' : mood === 'typing' ? '👀' : '🙂'}</Text>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  halo: { position: 'absolute', left: CX - 80, top: 6, width: 160, height: 160, borderRadius: 80, backgroundColor: colors.primary },
  sparkle: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: colors.lime },
  stem: { position: 'absolute', left: CX - 3, bottom: POT_H, width: 6, borderRadius: 3, backgroundColor: '#22B865' },
  leaf: { position: 'absolute', top: 0, width: 46, height: 18, overflow: 'hidden' },
  vein: { position: 'absolute', top: 8.5, width: 34, height: 1.5, backgroundColor: 'rgba(5,33,15,0.25)' },
  flower: { position: 'absolute', left: CX - 18, width: 36, alignItems: 'center' },
  pot: {
    position: 'absolute',
    bottom: 0,
    left: CX - 38,
    width: 76,
    height: POT_H,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  potRim: { position: 'absolute', top: -4, left: -5, right: -5, height: 10, borderRadius: 5, backgroundColor: '#FFB089' },
  face: { fontSize: 18, marginTop: 6 },
});
