import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut, interpolate, LinearTransition, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackdropLeaves } from '@/components/backdrop-leaves';
import { LangToggle } from '@/components/lang-toggle';
import { AppText, IconButton, IconName, PressableScale, Row, ScreenBackground, Segmented } from '@/components/ui';
import { authErrorDetail, passwordScore, SocialProvider, useAuth, validEmail, validPassword } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { TKey } from '@/lib/translations';
import { colors, gradients, radius, space } from '@/theme';

import { FloatingInput } from './floating-input';
import { Mood, PlantMascot } from './plant-mascot';
import { SubmitButton, SubmitState } from './submit-button';

type Mode = 'login' | 'register';
type Field = 'name' | 'email' | 'password' | 'confirm';

const STRENGTH: { key: TKey; color: string }[] = [
  { key: 'weak', color: colors.coral },
  { key: 'weak', color: colors.coral },
  { key: 'medium', color: colors.sun },
  { key: 'strong', color: colors.lime },
  { key: 'strong', color: colors.primary },
];

/** Combined, animated sign-in / sign-up screen. */
export function AuthScreen({ initialMode }: { initialMode: Mode }) {
  const { t, isRTL } = useI18n();
  const { login, register, resetPassword, resendCode, continueAsGuest, user } = useAuth();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState<Partial<Record<Field | 'form', TKey>>>({});
  const [shake, setShake] = useState(0);
  // Supabase's own error text, shown in small print so problems can be diagnosed.
  const [detail, setDetail] = useState('');
  const [focus, setFocus] = useState<Field | null>(null);
  const [state, setState] = useState<SubmitState>('idle');
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  // Shrink the mascot while the keyboard is open so the form stays visible.
  const kb = useSharedValue(0);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => kb.set(withTiming(1, { duration: 250 })));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => kb.set(withTiming(0, { duration: 250 })));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [kb]);
  const heroStyle = useAnimatedStyle(() => ({
    height: interpolate(kb.value, [0, 1], [196, 118]),
    marginTop: interpolate(kb.value, [0, 1], [0, -10]),
  }));

  // The card's title slides when switching modes.
  const flip = useSharedValue(0);
  useEffect(() => {
    // A quiet cross-fade when switching modes — nothing moves.
    flip.value = 0.35;
    flip.value = withTiming(1, { duration: 220 });
  }, [mode, flip]);
  const titleStyle = useAnimatedStyle(() => ({ opacity: flip.value }));

  const mood: Mood =
    state === 'success' ? 'happy' : Object.values(errors).some(Boolean) ? 'sad' : focus === 'password' || focus === 'confirm' ? 'shy' : focus ? 'typing' : 'idle';

  const set = (k: Field) => (v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined, form: undefined }));
  };

  function switchMode(m: Mode) {
    setMode(m);
    setErrors({});
    setState('idle');
  }

  function fail(e: Partial<Record<Field | 'form', TKey>>, fromServer = false) {
    setErrors(e);
    setDetail(fromServer ? authErrorDetail() : '');
    setShake((s) => s + 1);
    setState('idle');
  }

  async function submit() {
    Keyboard.dismiss();
    const e: Partial<Record<Field, TKey>> = {};
    if (mode === 'register' && !form.name.trim()) e.name = 'errName';
    if (!validEmail(form.email)) e.email = 'errEmail';
    if (mode === 'register' ? !validPassword(form.password) : !form.password) e.password = mode === 'register' ? 'errPassword' : 'errCredentials';
    if (mode === 'register' && form.password !== form.confirm) e.confirm = 'errMatch';
    if (Object.keys(e).length) return fail(e);

    setState('loading');
    const err = mode === 'login' ? await login(form.email, form.password) : await register(form.name, form.email, form.password);
    if (err === 'errConfirmEmail') {
      setState('idle');
      const email = form.email.trim().toLowerCase();
      // Sign-up sent a code already; a login attempt means the user never entered it.
      if (mode === 'register') return router.push({ pathname: '/verify', params: { email } });
      return Alert.alert(t('verifyTitle'), t('notConfirmed'), [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('enterCode'),
          onPress: async () => {
            await resendCode(email);
            router.push({ pathname: '/verify', params: { email } });
          },
        },
      ]);
    }
    if (err) return fail(err === 'errExists' ? { email: err } : { form: err }, true);
    setState('success');
    setTimeout(() => router.replace('/(tabs)'), 900);
  }

  async function forgot() {
    if (!validEmail(form.email)) return Alert.alert(t('forgotPassword'), t('enterEmailFirst'));
    const r = await resetPassword(form.email);
    Alert.alert(t('forgotPassword'), r === 'sent' ? t('resetSent') : r === 'unavailable' ? t('resetUnavailable') : t('errNetwork'));
  }

  const err = (k: Field) => (errors[k] ? t(errors[k]!) : undefined);
  const score = passwordScore(form.password);
  const level = form.password ? Math.max(1, Math.round(score * 4)) : 0;
  const reqs: { key: TKey; ok: boolean; optional?: boolean }[] = [
    { key: 'reqLength', ok: form.password.length >= 8 },
    { key: 'reqLetter', ok: /[a-zA-Z]/.test(form.password) },
    { key: 'reqNumber', ok: /\d/.test(form.password) },
    { key: 'reqSymbol', ok: /[^A-Za-z0-9]/.test(form.password), optional: true },
  ];
  const isRegister = mode === 'register';

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenBackground />
      <BackdropLeaves />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: insets.top + space.sm, paddingBottom: insets.bottom + space.xl, paddingHorizontal: space.xl }}>
          <Row justify="space-between">
            <IconButton icon={isRTL ? 'chevron-forward' : 'chevron-back'} onPress={() => (router.canGoBack() ? router.back() : router.replace('/welcome'))} />
            <LangToggle />
          </Row>

          <Animated.View style={[{ alignItems: 'center', justifyContent: 'flex-end' }, heroStyle]}>
            <PlantMascot mood={mood} shrink={kb} />
          </Animated.View>

          <Animated.View style={titleStyle}>
            <AppText variant="title" center>
              {state === 'success' ? t('authSuccess') : isRegister ? t('registerTitle') : t('loginTitle')}
            </AppText>
            <AppText variant="caption" center style={{ marginTop: 4, marginBottom: space.lg }}>
              {isRegister ? t('registerSubtitle') : t('loginSubtitle')}
            </AppText>
          </Animated.View>

          <Animated.View entering={FadeIn.delay(150).duration(400)} layout={LinearTransition.duration(220)} style={styles.card}>
            <LinearGradient colors={gradients.glass} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <View style={styles.cardGlow} pointerEvents="none" />
            <View style={{ padding: space.lg, gap: space.md }}>
              <Segmented<Mode>
                value={mode}
                onChange={switchMode}
                options={[
                  { id: 'login', label: t('signIn'), icon: 'log-in-outline' },
                  { id: 'register', label: t('signUp'), icon: 'person-add-outline' },
                ]}
              />

              {isRegister && (
                <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(120)}>
                  <FloatingInput
                    label={t('name')}
                    icon="person-outline"
                    value={form.name}
                    onChangeText={set('name')}
                    autoComplete="name"
                    returnKeyType="next"
                    onSubmitEditing={() => emailRef.current?.focus()}
                    onFocusChange={(f) => setFocus(f ? 'name' : null)}
                    error={err('name')}
                    shakeKey={shake}
                    valid={form.name.trim().length > 1}
                  />
                </Animated.View>
              )}

              <FloatingInput
                ref={emailRef}
                label={t('email')}
                icon="mail-outline"
                value={form.email}
                onChangeText={set('email')}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                onFocusChange={(f) => setFocus(f ? 'email' : null)}
                error={err('email')}
                shakeKey={shake}
                valid={validEmail(form.email)}
              />

              <FloatingInput
                ref={passwordRef}
                label={t('password')}
                icon="lock-closed-outline"
                value={form.password}
                onChangeText={set('password')}
                secure
                autoComplete={isRegister ? 'new-password' : 'password'}
                returnKeyType={isRegister ? 'next' : 'go'}
                onSubmitEditing={() => (isRegister ? confirmRef.current?.focus() : submit())}
                onFocusChange={(f) => setFocus(f ? 'password' : null)}
                error={err('password')}
                shakeKey={shake}
              />

              {isRegister && form.password.length > 0 && (
                <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(120)} style={{ gap: 10 }}>
                  <Row gap={6}>
                    {[1, 2, 3, 4].map((i) => (
                      <Segment key={i} on={level >= i} color={STRENGTH[level].color} />
                    ))}
                    <Text style={{ color: STRENGTH[level].color, fontWeight: '800', fontSize: 12, minWidth: 54, textAlign: 'center' }}>{t(STRENGTH[level].key)}</Text>
                  </Row>
                  <View style={{ gap: 6 }}>
                    {reqs.map((r) => (
                      <Requirement key={r.key} ok={r.ok} optional={r.optional} label={t(r.key)} />
                    ))}
                  </View>
                </Animated.View>
              )}

              {isRegister && (
                <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(120)}>
                  <FloatingInput
                    ref={confirmRef}
                    label={t('confirmPassword')}
                    icon="shield-checkmark-outline"
                    value={form.confirm}
                    onChangeText={set('confirm')}
                    secure
                    returnKeyType="go"
                    onSubmitEditing={submit}
                    onFocusChange={(f) => setFocus(f ? 'confirm' : null)}
                    error={err('confirm')}
                    shakeKey={shake}
                    valid={!!form.confirm && form.confirm === form.password}
                  />
                </Animated.View>
              )}

              {!isRegister && (
                <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(120)}>
                  <Pressable onPress={forgot} hitSlop={8} style={{ alignSelf: isRTL ? 'flex-start' : 'flex-end' }}>
                    <Text style={{ color: colors.primary, fontWeight: '700' }}>{t('forgotPassword')}</Text>
                  </Pressable>
                </Animated.View>
              )}

              {errors.form ? (
                <Animated.View key={shake} entering={FadeIn.duration(200)} style={styles.banner}>
                  <Row gap={space.sm}>
                    <Ionicons name="alert-circle" size={18} color={colors.danger} />
                    <AppText variant="caption" color={colors.text} style={{ flex: 1 }}>
                      {t(errors.form)}
                    </AppText>
                  </Row>
                  {detail ? (
                    <AppText variant="caption" style={{ fontSize: 11, marginTop: 6, opacity: 0.8 }}>
                      {detail}
                    </AppText>
                  ) : null}
                </Animated.View>
              ) : null}

              <SubmitButton title={isRegister ? t('signUp') : t('signIn')} icon={isRegister ? 'sparkles' : 'log-in-outline'} state={state} onPress={submit} />

              {isRegister && (
                <AppText variant="caption" center style={{ fontSize: 12 }}>
                  {t('agreeTerms')}
                </AppText>
              )}
            </View>
          </Animated.View>

          <Animated.View entering={FadeIn.delay(300).duration(400)} style={{ marginTop: space.xl, gap: space.lg }}>
            <SocialButtons />
            {!user && (
              <Row justify="center" gap={6}>
                <AppText variant="caption">{t('orExplore')}</AppText>
                <Pressable
                  hitSlop={8}
                  onPress={async () => {
                    await continueAsGuest();
                    router.replace('/(tabs)');
                  }}>
                  <Text style={{ color: colors.primary, fontWeight: '800' }}>{t('exploreGuest')}</Text>
                </Pressable>
              </Row>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Segment({ on, color }: { on: boolean; color: string }) {
  const v = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    v.value = withTiming(on ? 1 : 0, { duration: 220 });
  }, [on, v]);
  const style = useAnimatedStyle(() => ({ transform: [{ scaleX: v.value }], opacity: interpolate(v.value, [0, 1], [0.3, 1]) }));
  return (
    <View style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
      <Animated.View style={[{ flex: 1, borderRadius: 3, backgroundColor: color }, style]} />
    </View>
  );
}

function Requirement({ ok, label, optional }: { ok: boolean; label: string; optional?: boolean }) {
  const v = useSharedValue(ok ? 1 : 0);
  useEffect(() => {
    v.value = withTiming(ok ? 1 : 0, { duration: 200 });
  }, [ok, v]);
  const dot = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(v.value, [0, 1], [0.85, 1]) }],
    backgroundColor: ok ? colors.primary : 'transparent',
    borderColor: ok ? colors.primary : optional ? colors.textFaint : 'rgba(255,255,255,0.25)',
  }));
  return (
    <Row gap={8}>
      <Animated.View style={[styles.reqDot, dot]}>{ok && <Ionicons name="checkmark" size={11} color="#1C2B22" />}</Animated.View>
      <AppText variant="caption" color={ok ? colors.text : colors.textDim} style={{ fontSize: 12.5 }}>
        {label}
      </AppText>
    </Row>
  );
}

const PROVIDERS: { id: SocialProvider; name: string; icon: IconName; color: string }[] = [
  { id: 'google', name: 'Google', icon: 'logo-google', color: '#EA4335' },
  { id: 'apple', name: 'Apple', icon: 'logo-apple', color: '#FFFFFF' },
  { id: 'facebook', name: 'Facebook', icon: 'logo-facebook', color: '#1877F2' },
];

function SocialButtons() {
  const { t } = useI18n();
  const { signInWithProvider } = useAuth();
  const [busy, setBusy] = useState<SocialProvider | null>(null);

  async function go(p: (typeof PROVIDERS)[number]) {
    if (busy) return;
    setBusy(p.id);
    const err = await signInWithProvider(p.id);
    setBusy(null);
    if (err === null) router.replace('/(tabs)');
    else if (err !== 'cancelled') Alert.alert(t('socialTitle'), `${t(err, { provider: p.name })}\n\n${authErrorDetail()}`.trim());
  }

  return (
    <View style={{ gap: space.md }}>
      <Row gap={space.md}>
        <View style={styles.line} />
        <AppText variant="caption">{t('orContinueWith')}</AppText>
        <View style={styles.line} />
      </Row>
      <Row gap={space.md}>
        {PROVIDERS.map((p) => (
          <View key={p.name} style={{ flex: 1 }}>
            <PressableScale style={styles.social} accessibilityLabel={`${t('orContinueWith')} ${p.name}`} onPress={() => go(p)} disabled={!!busy && busy !== p.id}>
              {busy === p.id ? <ActivityIndicator color={colors.text} /> : <Ionicons name={p.icon} size={22} color={p.color} />}
            </PressableScale>
          </View>
        ))}
      </Row>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.05)' },
  cardGlow: { position: 'absolute', top: -60, alignSelf: 'center', width: 220, height: 120, borderRadius: 110, backgroundColor: 'rgba(168,198,154,0.12)' },
  banner: { padding: 12, borderRadius: radius.md, backgroundColor: 'rgba(255,90,95,0.12)', borderWidth: 1, borderColor: 'rgba(255,90,95,0.4)' },
  reqDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  social: { height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
});
