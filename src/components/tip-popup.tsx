import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { AppText, GradientButton, IconBubble } from '@/components/ui';
import { TIPS } from '@/data/seasons';
import { useI18n } from '@/lib/i18n';
import { readJSON, writeJSON } from '@/lib/storage';
import { colors, radius, space } from '@/theme';

const SHOWN_KEY = 'ghars.tipShownOn';

function today() {
  return new Date().toDateString();
}

/** "Tip of the day" pop-up, shown the first time the app is opened each day. */
export function TipPopup() {
  const { t, l } = useI18n();
  const [open, setOpen] = useState(false);
  const tip = TIPS[new Date().getDate() % TIPS.length];

  useEffect(() => {
    readJSON<string | null>(SHOWN_KEY, null).then((shown) => {
      if (shown !== today()) setOpen(true);
    });
  }, []);

  function close() {
    setOpen(false);
    writeJSON(SHOWN_KEY, today());
  }

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={{ alignItems: 'center', gap: space.md }}>
            <IconBubble emoji="💡" gradient="sun" size={56} />
            <AppText variant="label">{t('tipOfDay')}</AppText>
            <AppText center style={{ fontSize: 17, lineHeight: 25 }}>
              {l(tip)}
            </AppText>
          </View>
          <GradientButton title={t('ok')} onPress={close} style={{ marginTop: space.xl }} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: space.xl },
  card: {
    width: '100%',
    maxWidth: 380,
    padding: space.xl,
    borderRadius: radius.xl,
    backgroundColor: '#24362C',
    borderWidth: 1,
    borderColor: colors.border,
  },
});
