import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackdropLeaves } from '@/components/backdrop-leaves';
import { LangToggle } from '@/components/lang-toggle';
import { brand, BrandLogo } from '@/components/brand';
import { PressableScale, Row, ScreenBackground } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { colors, gradients, radius, space } from '@/theme';

export default function Welcome() {
  const { t, isRTL } = useI18n();
  const { continueAsGuest, user } = useAuth();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenBackground />
      <BackdropLeaves />
      <View style={{ flex: 1, paddingTop: insets.top + space.md, paddingBottom: insets.bottom + space.lg, paddingHorizontal: space.xl }}>
        <View style={styles.topBar}>
          <PressableScale onPress={() => router.push('/about')} style={styles.about} accessibilityLabel={t('aboutUs')}>
            <Ionicons name="information-circle-outline" size={20} color={brand.sand} />
            <Text style={{ color: colors.text, fontWeight: '600', fontSize: 13 }}>{t('aboutUs')}</Text>
          </PressableScale>
          <LangToggle />
        </View>

        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Animated.View entering={FadeInDown.duration(800)} style={styles.card}>
            <LinearGradient colors={['rgba(255,255,255,0.13)', 'rgba(255,255,255,0.04)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <View style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: space.xl }}>
              <BrandLogo width={250} animated />

              <Animated.View entering={FadeInUp.delay(700).duration(700)} style={{ alignSelf: 'stretch', marginTop: space.xl }}>
                <PressableScale onPress={() => router.push('/register')} style={styles.cta}>
                  <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                  <Row justify="center" gap={space.md}>
                    <Text style={styles.ctaText}>{t('getStarted')}</Text>
                    <Ionicons name={isRTL ? 'arrow-back' : 'arrow-forward'} size={20} color={colors.onPrimary} />
                  </Row>
                </PressableScale>
              </Animated.View>
            </View>
          </Animated.View>
        </View>

        <Animated.View entering={FadeInUp.delay(900).duration(700)} style={{ gap: space.md, alignItems: 'center' }}>
          <Pressable onPress={() => router.push('/login')} hitSlop={8}>
            <Text style={{ color: colors.text, fontWeight: '600', fontSize: 15 }}>
              {t('haveAccount')}
            </Text>
          </Pressable>
          {!user && (
            <Pressable
              hitSlop={8}
              onPress={async () => {
                await continueAsGuest();
                router.replace('/(tabs)');
              }}>
              <Text style={{ color: colors.textFaint, fontSize: 14 }}>{t('exploreGuest')}</Text>
            </Pressable>
          )}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Same layout in both languages, so nothing jumps when the language is switched.
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', direction: 'ltr' },
  card: { borderRadius: 34, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', backgroundColor: 'rgba(40,58,47,0.35)' },
  cta: { height: 58, borderRadius: radius.pill, overflow: 'hidden', justifyContent: 'center' },
  ctaText: { color: colors.onPrimary, fontSize: 17, fontWeight: '600' },
  about: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
});
