import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { brand, BrandLogo } from '@/components/brand';
import { SdgBadge } from '@/components/sdg-badge';
import { AppText, Appear, GlassCard, Header, IconBubble, IconName, Row, Screen } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { TKey } from '@/lib/translations';
import { colors, GradientName, radius, space } from '@/theme';

export const PRIVACY_URL = 'https://fatimayaserdarraj-commits.github.io/Ghars/privacy-policy.html';

const FEATURES: { key: TKey; icon: IconName; tint: GradientName }[] = [
  { key: 'aboutF1', icon: 'scan-outline', tint: 'lime' },
  { key: 'aboutF2', icon: 'medkit-outline', tint: 'coral' },
  { key: 'aboutF3', icon: 'sparkles-outline', tint: 'violet' },
  { key: 'aboutF4', icon: 'book-outline', tint: 'sky' },
  { key: 'aboutF5', icon: 'water-outline', tint: 'mint' },
  { key: 'aboutF6', icon: 'sunny-outline', tint: 'sun' },
  { key: 'aboutF7', icon: 'storefront-outline', tint: 'sky' },
  { key: 'aboutF8', icon: 'people-outline', tint: 'primary' },
];

const HADITH = 'إنْ قامَتِ السَّاعةُ وفي يدِ أحدِكُم فَسيلةٌ، فإنِ استَطاعَ أن لا تَقومَ حتَّى يغرِسَها فلْيغرِسْها';

export default function About() {
  const { t } = useI18n();
  return (
    <Screen header={<Header title={t('aboutTitle')} />}>
      <Appear>
        <GlassCard>
          <View style={{ alignItems: 'center', paddingVertical: space.md }}>
            <BrandLogo width={220} />
          </View>
          <AppText color={colors.textDim} style={{ marginTop: space.md, lineHeight: 23 }}>
            {t('aboutIntro')}
          </AppText>
        </GlassCard>
      </Appear>

      <Appear index={1}>
        <GlassCard>
          <Row gap={space.sm}>
            <Ionicons name="leaf-outline" size={18} color={brand.sand} />
            <AppText variant="h2">{t('nameTitle')}</AppText>
          </Row>
          <View style={styles.quote}>
            <Text style={styles.hadith}>«{HADITH}»</Text>
            {t('nameTranslation') ? (
              <AppText variant="caption" center style={{ marginTop: space.sm, lineHeight: 20, fontStyle: 'italic' }}>
                {t('nameTranslation')}
              </AppText>
            ) : null}
            <AppText variant="caption" center color={brand.sand} style={{ marginTop: space.sm }}>
              {t('nameSource')}
            </AppText>
          </View>
        </GlassCard>
      </Appear>

      <Appear index={2}>
        <GlassCard>
          <Row gap={space.sm}>
            <Ionicons name="flag-outline" size={18} color={brand.sand} />
            <AppText variant="h2">{t('aboutMissionTitle')}</AppText>
          </Row>
          <AppText color={colors.textDim} style={{ marginTop: space.sm, lineHeight: 23 }}>
            {t('aboutMission')}
          </AppText>
        </GlassCard>
      </Appear>

      <Appear index={3}>
        <GlassCard>
          <AppText variant="h2">{t('aboutFeaturesTitle')}</AppText>
          <View style={{ gap: space.md, marginTop: space.md }}>
            {FEATURES.map((f) => (
              <Row key={f.key} gap={space.md}>
                <IconBubble icon={f.icon} gradient={f.tint} size={38} />
                <AppText style={{ flex: 1 }}>{t(f.key)}</AppText>
              </Row>
            ))}
          </View>
        </GlassCard>
      </Appear>

      <Appear index={4}>
        <GlassCard>
          <Row gap={space.sm}>
            <Ionicons name="ribbon-outline" size={18} color={brand.sand} />
            <AppText variant="h2" style={{ flex: 1 }}>
              {t('initiativeTitle')}
            </AppText>
          </Row>
          <Row gap={space.md} style={{ marginTop: space.md }}>
            <View style={[styles.logoTile, { width: 92, height: 92, padding: 4 }]}>
              <Image source={require('../../assets/images/partners/nifad.jpg')} style={styles.logo} resizeMode="contain" />
            </View>
            <AppText color={colors.textDim} style={{ flex: 1, lineHeight: 23 }}>
              {t('initiativeText')}
            </AppText>
          </Row>

          <View style={styles.divider} />

          <Row gap={space.md}>
            <View style={[styles.logoTile, { width: 92, height: 92, padding: 6 }]}>
              <Image source={require('../../assets/images/partners/dumti-khadra.png')} style={styles.logo} resizeMode="contain" />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <AppText variant="h2">{t('campaignTitle')}</AppText>
              <AppText variant="caption" style={{ lineHeight: 20 }}>
                {t('campaignText')}
              </AppText>
            </View>
          </Row>

          <View style={styles.divider} />

          <Row gap={space.md}>
            <View style={{ borderRadius: 6, overflow: 'hidden' }}>
              <SdgBadge size={92} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <AppText variant="h2">{t('sdgTitle')}</AppText>
              <AppText variant="caption" style={{ lineHeight: 20 }}>
                {t('sdgText')}
              </AppText>
            </View>
          </Row>
        </GlassCard>
      </Appear>

      <Appear index={5}>
        <GlassCard>
          <Row gap={space.sm}>
            <Ionicons name="shield-checkmark-outline" size={18} color={brand.sand} />
            <AppText variant="h2">{t('aboutPrivacyTitle')}</AppText>
          </Row>
          <AppText color={colors.textDim} style={{ marginTop: space.sm, lineHeight: 23 }}>
            {t('aboutPrivacy')}
          </AppText>
          <Pressable onPress={() => Linking.openURL(PRIVACY_URL)} hitSlop={8} style={{ marginTop: space.md }}>
            <Text style={{ color: colors.primary, fontWeight: '700' }}>{t('privacyPolicy')}</Text>
          </Pressable>
        </GlassCard>
      </Appear>

      <Appear index={6}>
        <GlassCard>
          <View style={{ alignItems: 'center', gap: space.sm }}>
            <AppText variant="label">{t('creditTitle')}</AppText>
            <View style={[styles.logoTile, { width: 110, height: 110, padding: 10 }]}>
              <Image source={require('../../assets/images/partners/uob.png')} style={styles.logo} resizeMode="contain" accessibilityLabel="University of Bahrain" />
            </View>
            <AppText variant="h2" center>
              {t('creditText')}
            </AppText>
          </View>
        </GlassCard>
      </Appear>

      <Appear index={7}>
        <View style={{ alignItems: 'center', gap: 4, paddingVertical: space.md }}>
          <AppText variant="caption" center>
            {t('aboutMadeIn')}
          </AppText>
          <AppText variant="caption" center color={colors.textFaint}>
            {t('aboutVersion')} {Constants.expoConfig?.version ?? '1.0.0'}
          </AppText>
        </View>
      </Appear>
    </Screen>
  );
}

const styles = StyleSheet.create({
  quote: {
    marginTop: space.md,
    paddingVertical: space.lg,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    backgroundColor: 'rgba(201,221,176,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(201,221,176,0.25)',
  },
  hadith: { color: colors.text, fontSize: 19, lineHeight: 36, textAlign: 'center', writingDirection: 'rtl' },
  logoTile: { backgroundColor: '#fff', borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  logo: { width: '100%', height: '100%' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: space.lg },
});
