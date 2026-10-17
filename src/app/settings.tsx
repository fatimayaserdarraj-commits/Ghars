import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { UserAvatar } from '@/components/user-avatar';
import { AppText, Appear, Badge, GhostButton, GlassCard, GradientButton, Header, IconName, Row, Screen, Segmented } from '@/components/ui';
import { aiOnline, aiProvider } from '@/lib/ai';
import { plantnetEnabled } from '@/lib/plantnet';
import { useAuth } from '@/lib/auth';
import { useData } from '@/lib/data';
import { useI18n } from '@/lib/i18n';
import { syncEnabled } from '@/lib/sync';
import { Lang } from '@/lib/translations';
import { colors, space } from '@/theme';

export default function Settings() {
  const { t, lang, setLang } = useI18n();
  const { user, isGuest, logout } = useAuth();
  const { lastSynced, syncNow, wipe } = useData();
  const [syncing, setSyncing] = useState(false);

  async function sync() {
    if (!syncEnabled) return Alert.alert(t('sync'), t('syncNotConfigured'));
    setSyncing(true);
    try {
      await syncNow();
      Alert.alert(t('sync'), t('syncDone'));
    } catch {
      Alert.alert(t('error'));
    } finally {
      setSyncing(false);
    }
  }

  return (
    <Screen header={<Header title={t('settings')} />}>
      <Appear>
        <GlassCard>
          <Row gap={space.lg}>
            <UserAvatar size={64} radius={22} />
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="h2">{isGuest ? t('guest') : user?.name}</AppText>
              {!isGuest && <AppText variant="caption">{user?.email}</AppText>}
              {!isGuest && user && (
                <AppText variant="caption">
                  {t('memberSince')} {new Date(user.createdAt).toLocaleDateString(lang === 'ar' ? 'ar-BH' : 'en-GB', { month: 'long', year: 'numeric' })}
                </AppText>
              )}
            </View>
          </Row>
        </GlassCard>
      </Appear>

      {isGuest && (
        <Appear index={1}>
          <GradientButton title={t('signUp')} icon="person-add-outline" onPress={() => router.push('/register')} />
        </Appear>
      )}

      <Appear index={2}>
        <GlassCard>
          <AppText variant="label">{t('language')}</AppText>
          <View style={{ marginTop: space.md }}>
            <Segmented<Lang>
              value={lang}
              onChange={setLang}
              options={[
                { id: 'en', label: 'English' },
                { id: 'ar', label: 'العربية' },
              ]}
            />
          </View>
        </GlassCard>
      </Appear>

      <Appear index={3}>
        <GlassCard>
          <InfoRow icon="cloud-upload-outline" title={t('sync')} body={`${t('lastSynced')}: ${lastSynced ? new Date(lastSynced).toLocaleString() : t('never')}`} />
          {!isGuest && <GhostButton title={t('syncNow')} icon="sync" onPress={sync} style={{ marginTop: space.md, opacity: syncing ? 0.6 : 1 }} />}
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: space.lg }} />
          <InfoRow icon="shield-checkmark-outline" title={t('security')} body={t('securityBody')} />
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: space.lg }} />
          <Row justify="space-between">
            <InfoRow icon="sparkles-outline" title={t('aiStatus')} body="" />
            <Badge
              text={aiOnline || plantnetEnabled ? [aiProvider, plantnetEnabled && 'Pl@ntNet'].filter(Boolean).join(' + ') : t('aiOffline')}
              color={aiOnline || plantnetEnabled ? colors.primary : colors.sun}
            />
          </Row>
        </GlassCard>
      </Appear>

      <Appear index={4}>
        <View style={{ gap: space.md }}>
          <GhostButton
            title={t('logout')}
            icon="log-out-outline"
            onPress={async () => {
              await logout();
              router.replace('/welcome');
            }}
          />
          <GhostButton
            title={t('deleteData')}
            icon="trash-outline"
            style={{ borderColor: `${colors.coral}66` }}
            onPress={() =>
              Alert.alert(t('deleteData'), t('deleteConfirm'), [
                { text: t('cancel'), style: 'cancel' },
                { text: t('confirm'), style: 'destructive', onPress: () => wipe() },
              ])
            }
          />
        </View>
      </Appear>
    </Screen>
  );
}

function InfoRow({ icon, title, body }: { icon: IconName; title: string; body: string }) {
  return (
    <Row gap={space.md} align="flex-start" style={{ flexShrink: 1 }}>
      <Ionicons name={icon} size={20} color={colors.primary} style={{ marginTop: 2 }} />
      <View style={{ flexShrink: 1 }}>
        <AppText variant="h2" style={{ fontSize: 15 }}>
          {title}
        </AppText>
        {body ? <AppText variant="caption">{body}</AppText> : null}
      </View>
    </Row>
  );
}
