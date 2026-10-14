import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';

import type { IconName } from '@/components/ui';
import { colors, gradients } from '@/theme';

export type SubmitState = 'idle' | 'loading' | 'success';

/** Full-width button that morphs into a spinner while loading and into a check mark on success. */
export function SubmitButton({ title, icon, state, onPress }: { title: string; icon: IconName; state: SubmitState; onPress: () => void }) {
  const [full, setFull] = useState(0);
  const morph = useSharedValue(0);
  const press = useSharedValue(1);
  const shine = useSharedValue(0);

  useEffect(() => {
    morph.value = withSpring(state === 'idle' ? 0 : 1, { damping: 16, stiffness: 140 });
    if (state === 'success' && Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [state, morph]);

  useEffect(() => {
    shine.value = withRepeat(withSequence(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.quad) }), withDelay(2500, withTiming(0, { duration: 0 }))), -1);
  }, [shine]);

  const shape = useAnimatedStyle(() => ({
    width: full ? interpolate(morph.value, [0, 1], [full, 60]) : '100%',
    borderRadius: 30,
    transform: [{ scale: press.value }],
  }));
  const shineStyle = useAnimatedStyle(() => ({
    opacity: 1 - morph.value,
    transform: [{ translateX: interpolate(shine.value, [0, 1], [-120, full + 60]) }, { rotate: '20deg' }],
  }));
  const label = useAnimatedStyle(() => ({ opacity: interpolate(morph.value, [0, 0.4], [1, 0], 'clamp') }));

  return (
    <View style={{ alignItems: 'center' }} onLayout={(e) => setFull(e.nativeEvent.layout.width)}>
      <Pressable
        disabled={state !== 'idle'}
        onPress={() => {
          if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onPress();
        }}
        onPressIn={() => press.set(withSpring(0.96))}
        onPressOut={() => press.set(withSpring(1))}
        accessibilityRole="button"
        accessibilityLabel={title}>
        <Animated.View style={[styles.btn, shape]}>
          <LinearGradient colors={state === 'success' ? gradients.lime : gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          <Animated.View pointerEvents="none" style={[styles.shine, shineStyle]} />
          {state === 'idle' && (
            <Animated.View style={[styles.row, label]}>
              <Ionicons name={icon} size={20} color="#05210F" />
              <Text numberOfLines={1} style={styles.text}>
                {title}
              </Text>
            </Animated.View>
          )}
          {state === 'loading' && <ActivityIndicator color="#05210F" />}
          {state === 'success' && (
            <Animated.View entering={ZoomIn.springify().damping(9)}>
              <Ionicons name="checkmark" size={30} color="#05210F" />
            </Animated.View>
          )}
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 60,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  shine: { position: 'absolute', top: -20, bottom: -20, width: 46, backgroundColor: 'rgba(255,255,255,0.35)' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  text: { color: '#05210F', fontWeight: '900', fontSize: 16, letterSpacing: 0.3 },
});
