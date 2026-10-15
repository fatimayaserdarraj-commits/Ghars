import Ionicons from '@expo/vector-icons/Ionicons';
import { ReactNode, Ref, useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, TextInputProps, TextStyle, View } from 'react-native';
import Animated, {
  FadeInDown,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { IconName } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { colors, font, radius } from '@/theme';

type Props = Omit<TextInputProps, 'onFocus' | 'onBlur'> & {
  label: string;
  icon: IconName;
  error?: string;
  /** Changing this number replays the shake animation. */
  shakeKey?: number;
  secure?: boolean;
  valid?: boolean;
  right?: ReactNode;
  onFocusChange?: (focused: boolean) => void;
  ref?: Ref<TextInput>;
};

/** Text field whose label floats up on focus, with a glowing border, shake-on-error and a valid tick. */
export function FloatingInput({ label, icon, error, shakeKey = 0, secure, valid, right, value, onFocusChange, style, ref, ...props }: Props) {
  const { isRTL } = useI18n();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(!!secure);
  const lift = useSharedValue(value ? 1 : 0);
  const focus = useSharedValue(0);
  const shake = useSharedValue(0);

  useEffect(() => {
    lift.value = withTiming(focused || !!value ? 1 : 0, { duration: 200 });
    focus.value = withTiming(focused ? 1 : 0, { duration: 220 });
  }, [focused, value, lift, focus]);

  useEffect(() => {
    if (shakeKey && error) {
      shake.value = withSequence(withTiming(-9, { duration: 50 }), withTiming(9, { duration: 70 }), withTiming(-6, { duration: 70 }), withTiming(6, { duration: 70 }), withSpring(0));
    }
  }, [shakeKey, error, shake]);

  const box = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }],
    borderColor: error ? colors.danger : interpolateColor(focus.value, [0, 1], ['rgba(255,255,255,0.12)', colors.primary]),
    backgroundColor: interpolateColor(focus.value, [0, 1], ['rgba(255,255,255,0.05)', 'rgba(168,198,154,0.08)']),
    shadowOpacity: focus.value * 0.5,
  }));
  const labelStyle = useAnimatedStyle(() => ({
    top: interpolate(lift.value, [0, 1], [19, 8]),
    fontSize: interpolate(lift.value, [0, 1], [15, 11]),
    color: error ? colors.danger : interpolateColor(focus.value, [0, 1], [colors.textFaint, colors.primary]),
  }));

  const side = isRTL ? 'right' : 'left';
  return (
    <View style={{ gap: 6 }}>
      <Animated.View style={[styles.box, box]}>
        <View style={[styles.icon, { [side]: 14 }]}>
          <Ionicons name={icon} size={19} color={error ? colors.danger : focused ? colors.primary : colors.textFaint} />
        </View>
        <Animated.Text
          numberOfLines={1}
          style={[styles.label, { [side]: 46, textAlign: isRTL ? 'right' : 'left', fontWeight: '600' }, labelStyle]}
          pointerEvents="none">
          {label}
        </Animated.Text>
        <TextInput
          {...props}
          ref={ref}
          value={value}
          secureTextEntry={hidden}
          placeholderTextColor="transparent"
          selectionColor={colors.primary}
          onFocus={() => {
            setFocused(true);
            onFocusChange?.(true);
          }}
          onBlur={() => {
            setFocused(false);
            onFocusChange?.(false);
          }}
          style={[
            styles.input,
            { paddingLeft: isRTL ? 48 : 46, paddingRight: isRTL ? 46 : 48, textAlign: isRTL ? 'right' : 'left' },
            style,
          ]}
        />
        <View style={[styles.right, { [isRTL ? 'left' : 'right']: 12 }]}>
          {valid && !error ? (
            <Animated.View entering={FadeInDown.springify()}>
              <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
            </Animated.View>
          ) : null}
          {secure ? (
            <Pressable onPress={() => setHidden((h) => !h)} hitSlop={12} accessibilityLabel="Show password">
              <Ionicons name={hidden ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textDim} />
            </Pressable>
          ) : null}
          {right}
        </View>
      </Animated.View>
      {error ? (
        <Animated.Text entering={FadeInDown.duration(220)} style={[styles.error, { textAlign: isRTL ? 'right' : 'left' }]}>
          {error}
        </Animated.Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    height: 60,
    borderRadius: radius.md,
    borderWidth: 1.5,
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
  icon: { position: 'absolute', top: 0, bottom: 0, justifyContent: 'center' },
  label: { position: 'absolute', right: 60 },
  // The glowing border already shows focus, so drop the browser's default outline on web.
  input: { height: '100%', paddingTop: 18, color: colors.text, fontSize: font.sizes.md, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : null) },
  right: { position: 'absolute', top: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  error: { color: colors.danger, fontSize: font.sizes.sm, paddingHorizontal: 4 },
});
