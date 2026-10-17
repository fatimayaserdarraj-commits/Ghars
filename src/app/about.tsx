import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { View } from 'react-native';

import { brand, BrandLogo } from '@/components/brand';
import { AppText, Appear, GlassCard, Header, IconBubble, IconName, Row, Screen } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { TKey } from '@/lib/translations';
import { colors, GradientName, space } from '@/theme';

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
            <Ionicons name="flag-outline" size={18} color={brand.sand} />
            <AppText variant="h2">{t('aboutMissionTitle')}</AppText>
          </Row>
          <AppText color={colors.textDim} style={{ marginTop: space.sm, lineHeight: 23 }}>
            {t('aboutMission')}
          </AppText>
        </GlassCard>
      </Appear>

      <Appear index={2}>
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

      <Appear index={3}>
        <GlassCard>
          <Row gap={space.sm}>
            <Ionicons name="shield-checkmark-outline" size={18} color={brand.sand} />
            <AppText variant="h2">{t('aboutPrivacyTitle')}</AppText>
          </Row>
          <AppText color={colors.textDim} style={{ marginTop: space.sm, lineHeight: 23 }}>
            {t('aboutPrivacy')}
          </AppText>
        </GlassCard>
      </Appear>

      <Appear index={4}>
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
