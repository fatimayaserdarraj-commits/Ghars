import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { useState } from 'react';
import { Linking, Text, View } from 'react-native';
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';

import { useConfirm } from '@/components/confirm';
import { AppText, Badge, Chip, GhostButton, GlassCard, Header, IconName, Input, PressableScale, Row, Screen } from '@/components/ui';
import { distanceKm, mapsLink, Shop, SHOPS, ShopType } from '@/data/shops';
import { useI18n } from '@/lib/i18n';
import { TKey } from '@/lib/translations';
import { colors, space } from '@/theme';

const TYPES: { id: ShopType | 'all'; key: TKey; emoji: string }[] = [
  { id: 'all', key: 'all', emoji: '✨' },
  { id: 'nursery', key: 'nursery', emoji: '🌳' },
  { id: 'online', key: 'onlineShops', emoji: '🛒' },
];

const NEARBY = 'https://www.google.com/maps/search/plant+nursery+%D9%85%D8%B4%D8%AA%D9%84/';
const hasCoords = SHOPS.some((s) => s.lat != null && s.lng != null);

export default function Shops() {
  const { t } = useI18n();
  const { notify } = useConfirm();
  const [type, setType] = useState<ShopType | 'all'>('all');
  const [q, setQ] = useState('');
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  async function locate() {
    setLocating(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) return;
      const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setPos({ lat: p.coords.latitude, lng: p.coords.longitude });
    } catch {
      notify(t('error'));
    } finally {
      setLocating(false);
    }
  }

  const query = q.trim().toLowerCase();
  const list = SHOPS.filter((s) => type === 'all' || s.type === type)
    .filter((s) =>
      !query ||
      [s.name, s.area, s.branches, s.description].some((v) => v && (v.en.toLowerCase().includes(query) || v.ar.includes(q.trim()))),
    )
    .map((s) => ({ s, km: pos && s.lat != null && s.lng != null ? distanceKm(pos.lat, pos.lng, s.lat, s.lng) : null }))
    // Nearest first when the location is known; shops without a map position go last.
    .sort((a, b) => (a.km ?? Infinity) - (b.km ?? Infinity) || (b.s.rating ?? 0) - (a.s.rating ?? 0));

  return (
    <Screen header={<Header title={t('shopsTitle')} subtitle={t('shopsSubtitle')} />}>
      <Input icon="search" value={q} onChangeText={setQ} placeholder={t('search')} />
      <Row gap={space.sm} wrap>
        {TYPES.map((x) => (
          <Chip key={x.id} emoji={x.emoji} label={t(x.key)} active={type === x.id} onPress={() => setType(x.id)} />
        ))}
      </Row>
      {hasCoords && (
        <GhostButton title={pos ? `📍 ${t('useLocation')} ✓` : t('useLocation')} icon={locating ? 'hourglass-outline' : 'navigate-outline'} onPress={locate} />
      )}
      <View style={{ gap: space.md }}>
        {list.map(({ s, km }, i) => (
          <Animated.View key={s.id} layout={LinearTransition} entering={FadeIn.delay(i * 60)}>
            <ShopCard shop={s} km={km} />
          </Animated.View>
        ))}
      </View>
      <GlassCard>
        <AppText variant="caption" center>
          {t('findNearbyHint')}
        </AppText>
        <GhostButton title={t('findNearby')} icon="navigate-outline" onPress={() => Linking.openURL(NEARBY)} style={{ marginTop: space.md }} />
      </GlassCard>
    </Screen>
  );
}

function ShopCard({ shop, km }: { shop: Shop; km: number | null }) {
  const { t, l } = useI18n();
  const { notify } = useConfirm();
  const online = shop.type === 'online';
  const phone = shop.phone?.replace(/[^\d+]/g, '');
  return (
    <GlassCard>
      <Row gap={space.md} align="flex-start">
        <View style={{ width: 64, height: 64, borderRadius: 18, overflow: 'hidden', backgroundColor: shop.background ?? '#fff' }}>
          <Image source={shop.image} style={{ width: '100%', height: '100%' }} contentFit={shop.fit ?? 'cover'} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <AppText variant="h2">{l(shop.name)}</AppText>
          <Row gap={6} wrap>
            <AppText variant="caption">
              {online ? '🌐' : '📍'} {l(shop.area)}
            </AppText>
            {shop.rating != null && <AppText variant="caption">· ⭐ {shop.rating.toFixed(1)}</AppText>}
            {km != null && <Badge text={t('kmAway', { n: km.toFixed(1) })} color={colors.sky} />}
          </Row>
          {shop.branches ? (
            <AppText variant="caption" color={colors.textFaint}>
              {l(shop.branches)}
            </AppText>
          ) : null}
          {shop.description ? (
            <AppText variant="caption" color={colors.text}>
              {l(shop.description)}
            </AppText>
          ) : null}
          {shop.hours ? <AppText variant="caption">🕒 {shop.hours}</AppText> : null}
        </View>
      </Row>
      <Row gap={space.sm} style={{ marginTop: space.md }}>
        <Action icon="call" label={t('call')} color={colors.primary} disabled={!phone} onPress={() => (phone ? Linking.openURL(`tel:${phone}`) : notify(t('call'), t('noPhone')))} />
        <Action
          icon="logo-whatsapp"
          label={t('whatsapp')}
          color="#25D366"
          disabled={!phone}
          onPress={() => (phone ? Linking.openURL(`https://wa.me/${phone.replace(/\D/g, '')}`) : notify(t('whatsapp'), t('noPhone')))}
        />
        {online && shop.instagram ? (
          <Action icon="logo-instagram" label={t('instagram')} color="#E1306C" onPress={() => Linking.openURL(shop.instagram!)} />
        ) : (
          <Action icon="navigate" label={t('directions')} color={colors.sky} onPress={() => Linking.openURL(mapsLink(shop))} />
        )}
      </Row>
    </GlassCard>
  );
}

function Action({ icon, label, color, onPress, disabled }: { icon: IconName; label: string; color: string; onPress: () => void; disabled?: boolean }) {
  return (
    <PressableScale onPress={onPress} style={{ opacity: disabled ? 0.45 : 1, flex: 1, paddingVertical: 10, borderRadius: 14, backgroundColor: `${color}1F`, borderWidth: 1, borderColor: `${color}55`, alignItems: 'center' }}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={{ color, fontSize: 11, fontWeight: '800', marginTop: 2 }}>{label}</Text>
    </PressableScale>
  );
}
