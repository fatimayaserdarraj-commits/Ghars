import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useConfirm } from '@/components/confirm';
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
  const { confirm, notify } = useConfirm();

  async function sync() {
    if (!syncEnabled) return notify(t('sync'), t('syncNotConfigured'));
    setSyncing(true);
    try {
      await syncNow();
      notify(t('sync'), t('syncDone'));
    } catch {
      notify(t('error'));
    } finally {
      setSyncing(false);
    }
  }

  return (
    <Screen header={<Header title={t('settings')} />}>
      <Appear>
        <GlassCard>
          <Row gap={space.lg}>
            <UserAvatar size={64} radius={22} uri={user?.avatar} />
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
          {!isGuest && (
            <GhostButton title={t('editProfile')} icon="create-outline" onPress={() => router.push('/edit-profile')} style={{ marginTop: space.lg, paddingVertical: 12 }} />
          )}
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
        <GlassCard padding={space.sm}>
          <ActionRow
            icon="log-out-outline"
            title={t('logout')}
            onPress={async () => {
              if (!(await confirm({ title: t('confirmLogoutTitle'), message: t('confirmLogoutBody'), confirmText: t('logout'), icon: 'log-out-outline' }))) return;
              await logout();
              router.replace('/welcome');
            }}
          />
        </GlassCard>
      </Appear>

      <Appear index={5}>
        <AppText variant="label" style={{ marginTop: space.md, marginHorizontal: space.xs }}>
          {t('dangerZone')}
        </AppText>
        <View style={styles.danger}>
          <ActionRow
            icon="trash-outline"
            title={t('deleteData')}
            subtitle={t('deleteConfirm')}
            color={colors.danger}
            onPress={async () => {
              if (await confirm({ title: t('confirmDeleteDataTitle'), message: `${t('deleteConfirm')} ${t('cantUndo')}`, confirmText: t('delete'), destructive: true })) wipe();
            }}
          />
        </View>
      </Appear>
    </Screen>
  );
}

/** A full-width tappable row with a tinted icon tile, used for account actions. */
function ActionRow({ icon, title, subtitle, color = colors.text, onPress }: { icon: IconName; title: string; subtitle?: string; color?: string; onPress: () => void }) {
  const { isRTL } = useI18n();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.action, pressed && { opacity: 0.6 }]} accessibilityRole="button">
      <Row gap={space.md}>
        <View style={[styles.actionIcon, { backgroundColor: `${color}22` }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText style={{ color, fontWeight: '700' }}>{title}</AppText>
          {subtitle ? (
            <AppText variant="caption" style={{ marginTop: 2 }}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
        <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.textFaint} />
      </Row>
    </Pressable>
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

const styles = StyleSheet.create({
  action: { padding: space.md, borderRadius: 18 },
  actionIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  danger: {
    marginTop: space.sm,
    padding: space.sm,
    borderRadius: 24,
    backgroundColor: 'rgba(224,122,110,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(224,122,110,0.35)',
  },
});
