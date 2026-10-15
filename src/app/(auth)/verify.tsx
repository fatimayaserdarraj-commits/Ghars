import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  FadeInDown,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Mood, PlantMascot } from '@/components/auth/plant-mascot';
import { SubmitButton, SubmitState } from '@/components/auth/submit-button';
import { BackdropLeaves } from '@/components/backdrop-leaves';
import { LangToggle } from '@/components/lang-toggle';
import { AppText, IconButton, Row, ScreenBackground } from '@/components/ui';
import { authErrorDetail, useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { TKey } from '@/lib/translations';
import { colors, radius, space } from '@/theme';

const LENGTH = 6;
const RESEND_SECONDS = 60;

export default function Verify() {
  const { t, isRTL } = useI18n();
  const insets = useSafeAreaInsets();
  const { email = '' } = useLocalSearchParams<{ email: string }>();
  const { verifyEmail, resendCode } = useAuth();
  const [code, setCode] = useState('');
  const [focused, setFocused] = useState(true);
  const [state, setState] = useState<SubmitState>('idle');
  const [error, setError] = useState<TKey | null>(null);
  const [detail, setDetail] = useState('');
  const [wait, setWait] = useState(RESEND_SECONDS);
  const input = useRef<TextInput>(null);
  const shake = useSharedValue(0);

  // Count down until the user may ask for another code.
  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  const mood: Mood = state === 'success' ? 'happy' : error ? 'sad' : code.length ? 'typing' : 'idle';

  async function submit(value = code) {
    if (value.length < LENGTH || state !== 'idle') return;
    setState('loading');
    const err = await verifyEmail(email, value);
    if (err) {
      setState('idle');
      setError(err);
      setDetail(authErrorDetail());
      shake.set(withSequence(withTiming(-10, { duration: 50 }), withRepeat(withTiming(10, { duration: 80 }), 4, true), withSpring(0)));
      return;
    }
    setState('success');
    setTimeout(() => router.replace('/(tabs)'), 900);
  }

  async function resend() {
    setWait(RESEND_SECONDS);
    const err = await resendCode(email);
    if (err) {
      setError(err);
      setDetail(authErrorDetail());
    } else Alert.alert(t('resendCode'), t('codeSent'));
  }

  const row = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenBackground />
      <BackdropLeaves />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingTop: insets.top + space.sm, paddingBottom: insets.bottom + space.xl, paddingHorizontal: space.xl, gap: space.lg }}>
          <Row justify="space-between">
            <IconButton icon={isRTL ? 'chevron-forward' : 'chevron-back'} onPress={() => (router.canGoBack() ? router.back() : router.replace('/register'))} />
            <LangToggle />
          </Row>

          <View style={{ alignItems: 'center' }}>
            <PlantMascot mood={mood} />
          </View>

          <Animated.View entering={FadeInDown.duration(500)} style={{ gap: 6 }}>
            <AppText variant="title" center>
              {state === 'success' ? t('authSuccess') : t('verifyTitle')}
            </AppText>
            <AppText variant="caption" center>
              {t('verifySubtitle')}
            </AppText>
            <View style={styles.emailPill}>
              <Ionicons name="mail" size={14} color={colors.lime} />
              <Text style={{ color: colors.text, fontWeight: '800' }} numberOfLines={1}>
                {email}
              </Text>
            </View>
            <AppText variant="caption" center>
              {t('verifyHint')}
            </AppText>
          </Animated.View>

          {/* One hidden input holds the code; the boxes just display it (supports paste and SMS/email autofill). */}
          <Pressable onPress={() => input.current?.focus()} accessibilityLabel={t('enterCode')}>
            <Animated.View style={[styles.boxes, { flexDirection: 'row' }, row]}>
              {Array.from({ length: LENGTH }, (_, i) => (
                <CodeBox key={i} char={code[i]} active={focused && state === 'idle' && i === Math.min(code.length, LENGTH - 1)} error={!!error} done={state === 'success'} index={i} />
              ))}
            </Animated.View>
            <TextInput
              ref={input}
              value={code}
              onChangeText={(v) => {
                const digits = v.replace(/\D/g, '').slice(0, LENGTH);
                setCode(digits);
                setError(null);
                if (digits.length === LENGTH) submit(digits);
              }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              autoFocus
              maxLength={LENGTH}
              caretHidden
              style={styles.hidden}
            />
          </Pressable>

          {error ? (
            <Animated.View entering={FadeInDown.springify()} style={styles.banner}>
              <Row gap={space.sm}>
                <Ionicons name="alert-circle" size={18} color={colors.danger} />
                <AppText variant="caption" color={colors.text} style={{ flex: 1 }}>
                  {t(error)}
                </AppText>
              </Row>
              {detail ? (
                <AppText variant="caption" style={{ fontSize: 11, marginTop: 6, opacity: 0.8 }}>
                  {detail}
                </AppText>
              ) : null}
            </Animated.View>
          ) : null}

          <SubmitButton title={t('verifyAction')} icon="shield-checkmark" state={code.length < LENGTH && state === 'idle' ? 'idle' : state} onPress={() => submit()} />

          <Row justify="center" gap={6}>
            {wait > 0 ? (
              <AppText variant="caption">{t('resendIn', { n: wait })}</AppText>
            ) : (
              <Pressable onPress={resend} hitSlop={8}>
                <Text style={{ color: colors.primary, fontWeight: '800' }}>↻ {t('resendCode')}</Text>
              </Pressable>
            )}
          </Row>
          {/* Projects without custom SMTP can only send Supabase's default email, which has a link instead of a code. */}
          <Row justify="center" gap={6}>
            <AppText variant="caption">{t('gotLink')}</AppText>
            <Pressable onPress={() => router.replace('/login')} hitSlop={8}>
              <Text style={{ color: colors.primary, fontWeight: '800' }}>{t('signIn')}</Text>
            </Pressable>
          </Row>
          <Row justify="center" gap={6}>
            <AppText variant="caption">{t('wrongEmail')}</AppText>
            <Pressable onPress={() => router.replace('/register')} hitSlop={8}>
              <Text style={{ color: colors.primary, fontWeight: '800' }}>{t('goBack')}</Text>
            </Pressable>
          </Row>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function CodeBox({ char, active, error, done, index }: { char?: string; active: boolean; error: boolean; done: boolean; index: number }) {
  const pop = useSharedValue(1);
  const glow = useSharedValue(0);
  const filled = useSharedValue(0);

  useEffect(() => {
    if (char) pop.set(withSequence(withTiming(1.18, { duration: 90 }), withSpring(1, { damping: 8 })));
    filled.set(withTiming(char ? 1 : 0, { duration: 160 }));
  }, [char, pop, filled]);

  useEffect(() => {
    glow.set(active ? withRepeat(withSequence(withTiming(1, { duration: 600 }), withTiming(0.35, { duration: 600 })), -1) : withTiming(0));
  }, [active, glow]);

  useEffect(() => {
    // A little wave across the boxes when the code is accepted.
    if (done) pop.set(withDelay(index * 70, withSequence(withSpring(1.2, { damping: 6 }), withSpring(1))));
  }, [done, index, pop]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: pop.value }],
    borderColor: error ? colors.danger : done ? colors.lime : interpolateColor(Math.max(glow.value, filled.value), [0, 1], ['rgba(255,255,255,0.14)', colors.primary]),
    backgroundColor: done ? 'rgba(201,221,176,0.15)' : interpolateColor(filled.value, [0, 1], ['rgba(255,255,255,0.05)', 'rgba(168,198,154,0.12)']),
  }));

  return (
    <Animated.View style={[styles.box, style]}>
      <Text style={styles.digit}>{char ?? ''}</Text>
      {active && !char ? <Caret /> : null}
    </Animated.View>
  );
}

function Caret() {
  const o = useSharedValue(1);
  useEffect(() => {
    o.set(withRepeat(withSequence(withTiming(0, { duration: 450 }), withTiming(1, { duration: 450 })), -1));
  }, [o]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[styles.caret, style]} />;
}

const styles = StyleSheet.create({
  emailPill: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '100%',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(201,221,176,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(201,221,176,0.35)',
  },
  // Digits always read left-to-right, even in Arabic.
  boxes: { justifyContent: 'center', gap: 10, direction: 'ltr' },
  box: { width: 48, height: 60, borderRadius: radius.md, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  digit: { color: colors.text, fontSize: 26, fontWeight: '900' },
  caret: { position: 'absolute', width: 2, height: 26, borderRadius: 1, backgroundColor: colors.primary },
  hidden: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  banner: { padding: 12, borderRadius: radius.md, backgroundColor: 'rgba(255,90,95,0.12)', borderWidth: 1, borderColor: 'rgba(255,90,95,0.4)' },
});
