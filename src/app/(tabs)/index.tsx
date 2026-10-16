import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { Href, router } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { BrandMark } from '@/components/brand';
import { LangToggle } from '@/components/lang-toggle';
import { ReminderRow } from '@/components/reminder-row';
import { AppText, Appear, GlassCard, GradientButton, IconBubble, IconName, PressableScale, Row, Screen, SectionTitle } from '@/components/ui';
import { PLANTS, plantById } from '@/data/plants';
import { currentSeason, TIPS } from '@/data/seasons';
import { useAuth } from '@/lib/auth';
import { daysUntil, useData } from '@/lib/data';
import { useI18n } from '@/lib/i18n';
import { TKey } from '@/lib/translations';
import { colors, GradientName, gradients, radius, space } from '@/theme';

const ACTIONS: { key: TKey; icon: IconName; gradient: GradientName; href: Href }[] = [
  { key: 'identify', icon: 'scan-outline', gradient: 'lime', href: '/scan' },
  { key: 'diagnose', icon: 'medkit-outline', gradient: 'coral', href: { pathname: '/scan', params: { mode: 'diagnose' } } },
  { key: 'guides', icon: 'book-outline', gradient: 'violet', href: '/guides' },
  { key: 'shops', icon: 'storefront-outline', gradient: 'sky', href: '/shops' },
  { key: 'seasons', icon: 'sunny-outline', gradient: 'sun', href: '/seasons' },
  { key: 'reminders', icon: 'water-outline', gradient: 'mint', href: '/garden' },
];

/** A potted plant that gently floats and sways on the season card. */
function FloatingPlant({ emoji, isRTL }: { emoji: string; isRTL: boolean }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [t]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: t.value * -8 }, { rotate: `${(t.value - 0.5) * 6}deg` }] }));
  return (
    <Animated.View style={[{ position: 'absolute', bottom: 18, [isRTL ? 'left' : 'right']: 14, alignItems: 'center' }, style]}>
      <Text style={{ fontSize: 30, position: 'absolute', top: -14, [isRTL ? 'right' : 'left']: -6 }}>{emoji}</Text>
      <Text style={{ fontSize: 92 }}>🪴</Text>
    </Animated.View>
  );
}

export default function Home() {
  const { t, l, isRTL } = useI18n();
  const { user, isGuest } = useAuth();
  const { plants, reminders } = useData();
  const season = currentSeason();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t('goodMorning') : hour < 18 ? t('goodAfternoon') : t('goodEvening');
  const due = reminders.filter((r) => daysUntil(r) <= 0);
  const tip = TIPS[new Date().getDate() % TIPS.length];
  const picks = PLANTS.filter((p) => p.plantIn.includes(season.id)).slice(0, 5);

  return (
    <Screen tabBar>
      <Appear>
        <Row justify="space-between">
          <BrandMark size={42} />
          <View style={{ flex: 1 }}>
            <AppText variant="caption">{greeting} 👋</AppText>
            <AppText variant="title" numberOfLines={1}>
              {isGuest ? t('gardener') : user?.name.split(' ')[0]}
            </AppText>
          </View>
          <LangToggle />
          <PressableScale onPress={() => router.push('/settings')}>
            <LinearGradient colors={gradients.lime} style={styles.avatar}>
              <Text style={{ fontWeight: '900', color: '#1C2B22', fontSize: 18 }}>{isGuest ? '🌱' : (user?.name[0] ?? '?').toUpperCase()}</Text>
            </LinearGradient>
          </PressableScale>
        </Row>
      </Appear>

      {isGuest && (
        <Appear index={1}>
          <PressableScale onPress={() => router.push('/register')}>
            <GlassCard>
              <Row gap={space.md}>
                <IconBubble emoji="🔐" gradient="violet" size={42} />
                <View style={{ flex: 1 }}>
                  <AppText variant="h2">{t('guestBannerTitle')}</AppText>
                  <AppText variant="caption">{t('guestBannerBody')}</AppText>
                </View>
                <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color={colors.textDim} />
              </Row>
            </GlassCard>
          </PressableScale>
        </Appear>
      )}

      <Appear index={2}>
        <PressableScale onPress={() => router.push('/seasons')} scaleTo={0.98}>
          <View style={styles.hero}>
            <LinearGradient colors={gradients.deep} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <View style={styles.heroGlow} />
            <FloatingPlant emoji={season.emoji} isRTL={isRTL} />
            <View style={{ maxWidth: '64%' }}>
              <AppText variant="label" color={colors.lime}>
                {t('seasonNow')} · {l(season.months)}
              </AppText>
              <AppText variant="title" style={{ marginTop: 6, fontSize: 30 }}>
                {t(season.id)}
              </AppText>
              <AppText color={colors.textDim} style={{ marginTop: 6, fontSize: 14 }}>
                {l(season.climate)}
              </AppText>
            </View>
            <Row gap={6} wrap style={{ marginTop: space.lg, maxWidth: '60%' }}>
              {picks.slice(0, 3).map((p) => (
                <View key={p.id} style={styles.pick}>
                  <Text style={{ color: colors.text, fontWeight: '600', fontSize: 12 }}>
                    {p.emoji} {l(p.name)}
                  </Text>
                </View>
              ))}
            </Row>
            <View style={[styles.heroBtn, { alignSelf: isRTL ? 'flex-end' : 'flex-start' }]}>
              <Text style={{ color: colors.onPrimary, fontWeight: '700', fontSize: 13 }}>{t('seasonsTitle')}</Text>
            </View>
          </View>
        </PressableScale>
      </Appear>

      <Appear index={3}>
        <SectionTitle title={t('quickActions')} />
      </Appear>
      <Row wrap gap={space.md} style={{ marginTop: -space.sm }}>
        {ACTIONS.map((a, i) => (
          <Appear key={a.key} index={4 + i} style={{ width: '30.5%', flexGrow: 1 }}>
            <PressableScale onPress={() => router.push(a.href)}>
              <GlassCard padding={space.md} style={{ alignItems: 'center' }}>
                <View style={{ alignItems: 'center', gap: 8 }}>
                  <IconBubble icon={a.icon} gradient={a.gradient} size={52} />
                  <AppText variant="caption" center color={colors.text} style={{ fontWeight: '700' }} numberOfLines={1}>
                    {t(a.key)}
                  </AppText>
                </View>
              </GlassCard>
            </PressableScale>
          </Appear>
        ))}
      </Row>

      <Appear index={10}>
        <SectionTitle title={t('todayTasks')} action={t('seeAll')} onAction={() => router.push('/garden')} />
      </Appear>
      <Appear index={11}>
        {due.length ? (
          <View style={{ gap: space.sm }}>
            {due.slice(0, 4).map((r) => (
              <ReminderRow key={r.id} reminder={r} showPlant />
            ))}
          </View>
        ) : (
          <GlassCard>
            <Row gap={space.md}>
              <Text style={{ fontSize: 30 }}>🌞</Text>
              <AppText variant="caption" style={{ flex: 1 }}>
                {t('noTasks')}
              </AppText>
            </Row>
          </GlassCard>
        )}
      </Appear>

      <Appear index={12}>
        <SectionTitle title={t('myPlants')} action={plants.length ? t('seeAll') : undefined} onAction={() => router.push('/garden')} />
      </Appear>
      <Appear index={13}>
        {plants.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.md, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
            {plants.map((p) => {
              const s = plantById(p.speciesId);
              return (
                <PressableScale key={p.id} onPress={() => router.push({ pathname: '/plant/[id]', params: { id: p.id } })}>
                  <GlassCard style={{ width: 130 }} padding={space.md}>
                    <Text style={{ fontSize: 44, textAlign: 'center' }}>{s?.emoji ?? '🌿'}</Text>
                    <AppText variant="h2" center numberOfLines={1} style={{ marginTop: 6 }}>
                      {p.nickname || (s ? l(s.name) : '')}
                    </AppText>
                    <AppText variant="caption" center numberOfLines={1}>
                      {t(p.location)}
                    </AppText>
                  </GlassCard>
                </PressableScale>
              );
            })}
          </ScrollView>
        ) : (
          <GradientButton title={t('addPlant')} icon="add" gradient="lime" onPress={() => router.push('/add-plant')} />
        )}
      </Appear>

      <Appear index={14}>
        <GlassCard>
          <Row gap={space.md} align="flex-start">
            <IconBubble emoji="💡" gradient="sun" size={42} />
            <View style={{ flex: 1 }}>
              <AppText variant="label">{t('tipOfDay')}</AppText>
              <AppText style={{ marginTop: 4 }}>{l(tip)}</AppText>
            </View>
          </Row>
        </GlassCard>
      </Appear>
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  hero: { borderRadius: radius.xl, padding: space.xl, overflow: 'hidden', minHeight: 220, borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)' },
  heroGlow: { position: 'absolute', right: -40, top: -40, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(201,221,176,0.10)' },
  pick: { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  heroBtn: { alignSelf: 'flex-start', marginTop: space.lg, backgroundColor: colors.lime, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
});
