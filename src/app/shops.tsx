import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Linking, Text, View } from 'react-native';

import { AppText, Chip, GhostButton, GlassCard, Header, IconName, Input, PressableScale, Row, Screen } from '@/components/ui';
import { mapsLink, Shop, SHOPS, ShopType } from '@/data/shops';
import { useI18n } from '@/lib/i18n';
import { TKey } from '@/lib/translations';
import { colors, radius, space } from '@/theme';

const TYPES: { id: ShopType | 'all'; key: TKey; emoji: string }[] = [
  { id: 'all', key: 'all', emoji: '✨' },
  { id: 'nursery', key: 'nursery', emoji: '🌳' },
  { id: 'online', key: 'onlineShops', emoji: '🛒' },
];

const NEARBY = 'https://www.google.com/maps/search/plant+nursery+%D9%85%D8%B4%D8%AA%D9%84/';

export default function Shops() {
  const { t, l } = useI18n();
  const [type, setType] = useState<ShopType | 'all'>('all');
  const [q, setQ] = useState('');

  const query = q.trim().toLowerCase();
  const list = SHOPS.filter((s) => type === 'all' || s.type === type).filter(
    (s) => !query || [s.name.en, s.name.ar, s.area.en, s.area.ar, s.branches?.en ?? '', s.branches?.ar ?? ''].some((x) => x.toLowerCase().includes(query)),
  );

  return (
    <Screen header={<Header title={t('shopsTitle')} subtitle={t('shopsSubtitle')} />}>
      <Input icon="search" value={q} onChangeText={setQ} placeholder={t('search')} />
      <Row gap={space.sm} wrap>
        {TYPES.map((x) => (
          <Chip key={x.id} emoji={x.emoji} label={t(x.key)} active={type === x.id} onPress={() => setType(x.id)} />
        ))}
      </Row>
      <View style={{ gap: space.md }}>
        {list.map((s) => (
          <ShopCard key={s.id} shop={s} name={l(s.name)} area={l(s.area)} branches={s.branches && l(s.branches)} />
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

function ShopCard({ shop, name, area, branches }: { shop: Shop; name: string; area: string; branches?: string }) {
  const { t } = useI18n();
  const online = shop.type === 'online';
  return (
    <GlassCard padding={0}>
      <View style={{ height: 160, backgroundColor: shop.background ?? '#fff' }}>
        <Image source={shop.image} style={{ width: '100%', height: '100%' }} contentFit={shop.fit ?? 'cover'} />
      </View>
      <View style={{ padding: space.lg, gap: 4 }}>
        <AppText variant="h2">{name}</AppText>
        <Row gap={6}>
          <Ionicons name={online ? 'globe-outline' : 'location-outline'} size={14} color={colors.primary} />
          <AppText variant="caption" style={{ flex: 1 }}>
            {area}
          </AppText>
        </Row>
        {branches ? (
          <AppText variant="caption" color={colors.textFaint}>
            {branches}
          </AppText>
        ) : null}
        <Row gap={space.sm} style={{ marginTop: space.md }}>
          {!online && <Action icon="navigate" label={t('openInMaps')} color={colors.sky} onPress={() => Linking.openURL(mapsLink(shop))} />}
          {shop.instagram && <Action icon="logo-instagram" label={t('instagram')} color="#E1306C" onPress={() => Linking.openURL(shop.instagram!)} />}
        </Row>
      </View>
    </GlassCard>
  );
}

function Action({ icon, label, color, onPress }: { icon: IconName; label: string; color: string; onPress: () => void }) {
  return (
    <PressableScale
      onPress={onPress}
      style={{ flex: 1, flexDirection: 'row', gap: 6, justifyContent: 'center', paddingVertical: 11, borderRadius: radius.pill, backgroundColor: `${color}1F`, borderWidth: 1, borderColor: `${color}55`, alignItems: 'center' }}>
      <Ionicons name={icon} size={17} color={color} />
      <Text style={{ color, fontSize: 13, fontWeight: '800' }}>{label}</Text>
    </PressableScale>
  );
}
