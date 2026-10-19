import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleProp, Text, View, ViewStyle } from 'react-native';

import { sizedThumb, useWikiImage } from '@/lib/wiki-images';

/**
 * A real photo (from Wikipedia) that fills its box, with the emoji shown until it loads
 * or when the phone is offline.
 */
export function PlantPhoto({
  wiki,
  emoji,
  width = 500,
  emojiSize = 40,
  style,
}: {
  wiki?: string;
  emoji?: string;
  /** Roughly how wide the photo is drawn, to pick a sharp enough file. */
  width?: number;
  emojiSize?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const url = useWikiImage(wiki);
  const [failed, setFailed] = useState<string | null>(null);
  const [shown, setShown] = useState<string | null>(null);
  // If the sharper size isn't available, fall back to the default thumbnail.
  const src = url ? (failed === url ? url : sizedThumb(url, width)) : null;
  return (
    <View style={[{ overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(168,198,154,0.14)' }, style]}>
      {emoji && (!src || shown !== src) ? <Text style={{ fontSize: emojiSize }}>{emoji}</Text> : null}
      {src ? (
        <Image
          source={{ uri: src }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          contentFit="cover"
          cachePolicy="disk"
          transition={150}
          onLoad={() => setShown(src)}
          onError={() => url && setFailed(url)}
          accessibilityIgnoresInvertColors
        />
      ) : null}
    </View>
  );
}
