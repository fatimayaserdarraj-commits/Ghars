import Ionicons from '@expo/vector-icons/Ionicons';
import { useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useI18n } from '@/lib/i18n';
import { Lang } from '@/lib/translations';
import { colors } from '@/theme';

const LANGS: { id: Lang; short: string; name: string }[] = [
  { id: 'en', short: 'EN', name: 'English' },
  { id: 'ar', short: 'ع', name: 'العربية' },
];

/** Language picker: a globe pill showing the current language that opens a small menu. */
export function LangToggle() {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const ref = useRef<View>(null);
  const current = LANGS.find((l) => l.id === lang) ?? LANGS[0];

  function show() {
    // Place the menu right under the pill.
    ref.current?.measureInWindow((x, y, w, h) => {
      setAnchor({ x, y, w, h });
      setOpen(true);
    });
  }

  return (
    <>
      <Pressable ref={ref} onPress={show} style={styles.pill} accessibilityRole="button" accessibilityLabel="Language">
        <Ionicons name="globe-outline" size={18} color={colors.text} />
        <Text style={styles.code}>{current.short}</Text>
        <Ionicons name="chevron-down" size={14} color={colors.textDim} />
      </Pressable>

      <Modal visible={open} transparent animationType="none" onRequestClose={() => setOpen(false)}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)}>
          <View style={[styles.menu, { top: anchor.y + anchor.h + 6, left: Math.max(8, anchor.x + anchor.w - 160) }]}>
            {LANGS.map((l) => {
              const active = l.id === lang;
              return (
                <Pressable
                  key={l.id}
                  onPress={() => {
                    setLang(l.id);
                    setOpen(false);
                  }}
                  style={[styles.item, active && styles.itemActive]}
                  accessibilityRole="menuitem">
                  <Text style={[styles.itemText, active && { color: colors.onPrimary }]}>{l.name}</Text>
                  {active && <Ionicons name="checkmark" size={16} color={colors.onPrimary} />}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  code: { color: colors.text, fontWeight: '700', fontSize: 14, minWidth: 18, textAlign: 'center' },
  menu: {
    position: 'absolute',
    width: 160,
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#24362C',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10 },
  itemActive: { backgroundColor: colors.primary },
  itemText: { color: colors.text, fontSize: 15, fontWeight: '600' },
});
