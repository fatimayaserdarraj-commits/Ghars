import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { View } from 'react-native';

import { FloatingInput } from '@/components/auth/floating-input';
import { useConfirm } from '@/components/confirm';
import { AppText, Appear, GhostButton, GlassCard, GradientButton, Header, Row, Screen } from '@/components/ui';
import { UserAvatar } from '@/components/user-avatar';
import { authErrorDetail, useAuth, validEmail, validPassword } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { supabase, uploadPhoto } from '@/lib/supabase';
import { TKey } from '@/lib/translations';
import { colors, space } from '@/theme';

const PROVIDER_NAMES: Record<string, string> = { google: 'Google', facebook: 'Facebook', apple: 'Apple' };

function ErrorText({ error }: { error: TKey | null }) {
  const { t } = useI18n();
  if (!error) return null;
  return (
    <AppText variant="caption" color={colors.danger} style={{ marginTop: space.sm }}>
      {t(error)}
      {/* The generic message alone doesn't say what went wrong, so add Supabase's own reason. */}
      {error === 'errAuthUnknown' && authErrorDetail() ? `\n${authErrorDetail()}` : ''}
    </AppText>
  );
}

export default function EditProfile() {
  const { t } = useI18n();
  const { user, updateProfile, changePassword, changeEmail, confirmEmailChange } = useAuth();
  const { confirm: ask, notify } = useConfirm();

  const [name, setName] = useState(user?.name ?? '');
  const [nameBusy, setNameBusy] = useState(false);
  const [nameErr, setNameErr] = useState<TKey | null>(null);

  const [photoBusy, setPhotoBusy] = useState(false);

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailErr, setEmailErr] = useState<TKey | null>(null);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [passBusy, setPassBusy] = useState(false);
  const [passErr, setPassErr] = useState<TKey | null>(null);

  if (!user) return null;
  const social = user.social ? (PROVIDER_NAMES[user.social] ?? user.social) : null;

  async function pickPhoto() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6, allowsEditing: true, aspect: [1, 1] });
    if (res.canceled || !res.assets[0]) return;
    if (!(await ask({ title: t('confirmPhotoTitle'), message: t('confirmPhotoBody'), icon: 'image-outline' }))) return;
    setPhotoBusy(true);
    try {
      const url = await uploadPhoto(res.assets[0].uri, user!.id);
      const err = await updateProfile({ avatar: url ?? null });
      notify(err ? t('error') : t('photoSaved'));
    } catch {
      notify(t('error'));
    } finally {
      setPhotoBusy(false);
    }
  }

  async function removePhoto() {
    if (!(await ask({ title: t('confirmRemovePhotoTitle'), message: t('confirmRemovePhotoBody'), destructive: true, confirmText: t('removePhoto') }))) return;
    setPhotoBusy(true);
    const err = await updateProfile({ avatar: null });
    setPhotoBusy(false);
    if (err) notify(t('error'));
  }

  async function saveName() {
    if (!name.trim()) return setNameErr('errName');
    setNameErr(null);
    if (!(await ask({ title: t('confirmNameTitle'), message: t('confirmNameBody', { name: name.trim() }), icon: 'person-outline' }))) return;
    setNameBusy(true);
    const err = await updateProfile({ name });
    setNameBusy(false);
    setNameErr(err);
    if (!err) notify(t('nameSaved'));
  }

  async function sendEmailCode() {
    if (!validEmail(email)) return setEmailErr('errEmail');
    if (email.trim().toLowerCase() === user!.email) return setEmailErr('sameEmail');
    setEmailErr(null);
    if (!(await ask({ title: t('confirmEmailTitle'), message: t('confirmEmailBody', { email: email.trim().toLowerCase() }), icon: 'mail-outline' }))) return;
    setEmailBusy(true);
    const res = await changeEmail(email);
    setEmailBusy(false);
    if (res === 'code') {
      setEmailErr(null);
      setCodeSent(true);
    } else if (res) setEmailErr(res);
    else {
      setEmailErr(null);
      setEmail('');
      notify(t('emailSaved'));
    }
  }

  async function confirmEmail() {
    if (code.length < 6) return setEmailErr('errCode');
    setEmailBusy(true);
    const err = await confirmEmailChange(email, code);
    setEmailBusy(false);
    setEmailErr(err);
    if (!err) {
      setCodeSent(false);
      setEmail('');
      setCode('');
      notify(t('emailSaved'));
    }
  }

  async function savePassword() {
    if (!validPassword(password)) return setPassErr('errPassword');
    if (password !== confirm) return setPassErr('passwordMismatch');
    setPassErr(null);
    if (!(await ask({ title: t('confirmPasswordTitle'), message: t('confirmPasswordBody'), icon: 'lock-closed-outline' }))) return;
    setPassBusy(true);
    const err = await changePassword(password);
    setPassBusy(false);
    setPassErr(err);
    if (!err) {
      setPassword('');
      setConfirm('');
      notify(t('passwordSaved'));
    }
  }

  return (
    <Screen header={<Header title={t('editProfile')} />}>
      <Appear>
        <GlassCard>
          <View style={{ alignItems: 'center', gap: space.md }}>
            <UserAvatar size={104} radius={34} uri={user.avatar} />
            <Row gap={space.sm} justify="center" wrap>
              <GradientButton title={t('changePhoto')} icon="camera-outline" small loading={photoBusy} onPress={pickPhoto} />
              {user.avatar ? <GhostButton title={t('removePhoto')} icon="close" onPress={removePhoto} style={{ paddingVertical: 10 }} /> : null}
            </Row>
          </View>
        </GlassCard>
      </Appear>

      <Appear index={1}>
        <GlassCard>
          <AppText variant="label">{t('name')}</AppText>
          <View style={{ marginTop: space.md }}>
            <FloatingInput label={t('name')} icon="person-outline" value={name} onChangeText={setName} autoComplete="name" />
          </View>
          <ErrorText error={nameErr} />
          <GradientButton title={t('saveName')} icon="checkmark" loading={nameBusy} disabled={name.trim() === user.name} onPress={saveName} style={{ marginTop: space.md }} />
        </GlassCard>
      </Appear>

      {social ? (
        <Appear index={2}>
          <GlassCard>
            <Row gap={space.md} align="flex-start">
              <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
              <AppText color={colors.textDim} style={{ flex: 1, lineHeight: 22 }}>
                {t('socialAccountNote', { provider: social })}
              </AppText>
            </Row>
          </GlassCard>
        </Appear>
      ) : (
        <>
          <Appear index={2}>
            <GlassCard>
              <AppText variant="label">{t('changeEmailTitle')}</AppText>
              <AppText variant="caption" style={{ marginTop: 4 }}>
                {user.email}
              </AppText>
              <View style={{ marginTop: space.md, gap: space.md }}>
                <FloatingInput
                  label={t('newEmail')}
                  icon="mail-outline"
                  value={email}
                  onChangeText={(v) => {
                    setEmail(v);
                    setCodeSent(false);
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                />
                {codeSent && (
                  <>
                    <AppText variant="caption">{t('emailCodeHint')}</AppText>
                    <FloatingInput
                      label={t('enterCode')}
                      icon="keypad-outline"
                      value={code}
                      onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
                      keyboardType="number-pad"
                      textContentType="oneTimeCode"
                      autoComplete="one-time-code"
                      maxLength={6}
                    />
                  </>
                )}
              </View>
              <ErrorText error={emailErr} />
              <GradientButton
                title={codeSent ? t('verifyAction') : supabase ? t('sendCode') : t('save')}
                icon={codeSent ? 'shield-checkmark-outline' : 'send-outline'}
                loading={emailBusy}
                disabled={!email.trim()}
                onPress={codeSent ? confirmEmail : sendEmailCode}
                style={{ marginTop: space.md }}
              />
            </GlassCard>
          </Appear>

          <Appear index={3}>
            <GlassCard>
              <AppText variant="label">{t('changePasswordTitle')}</AppText>
              <View style={{ marginTop: space.md, gap: space.md }}>
                <FloatingInput label={t('newPassword')} icon="lock-closed-outline" value={password} onChangeText={setPassword} secure autoComplete="new-password" />
                <FloatingInput label={t('confirmPassword')} icon="lock-closed-outline" value={confirm} onChangeText={setConfirm} secure autoComplete="new-password" />
              </View>
              <ErrorText error={passErr} />
              <GradientButton title={t('save')} icon="checkmark" loading={passBusy} disabled={!password} onPress={savePassword} style={{ marginTop: space.md }} />
            </GlassCard>
          </Appear>
        </>
      )}
    </Screen>
  );
}
