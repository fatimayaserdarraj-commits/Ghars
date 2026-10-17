import Ionicons from '@expo/vector-icons/Ionicons';
import { createContext, ReactNode, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppText, IconName } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { colors, radius, space } from '@/theme';

type Options = {
  title: string;
  message?: string;
  /** Label of the confirm button; defaults to "Confirm". */
  confirmText?: string;
  /** Red styling for actions that delete or can't be undone. */
  destructive?: boolean;
  icon?: IconName;
};

type Dialog = Options & { kind: 'confirm' | 'notify' };

type ConfirmValue = {
  /** Ask before doing something. Resolves true when the user confirms. */
  confirm: (options: Options) => Promise<boolean>;
  /** Show a short message with a single OK button. */
  notify: (title: string, message?: string) => Promise<void>;
};

const ConfirmContext = createContext<ConfirmValue | null>(null);

/** In-app dialogs that look the same on iOS, Android and the web (where Alert buttons don't work). */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const open = useCallback((d: Dialog) => {
    resolver.current?.(false);
    setDialog(d);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = useCallback((ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setDialog(null);
  }, []);

  const value = useMemo<ConfirmValue>(
    () => ({
      confirm: (options) => open({ ...options, kind: 'confirm' }),
      notify: async (title, message) => {
        await open({ title, message, kind: 'notify', icon: 'checkmark-circle-outline' });
      },
    }),
    [open],
  );

  const accent = dialog?.destructive ? colors.danger : colors.primary;
  const icon = dialog?.icon ?? (dialog?.destructive ? 'trash-outline' : 'help-circle-outline');

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Modal visible={!!dialog} transparent animationType="fade" onRequestClose={() => close(false)}>
        <Pressable style={styles.backdrop} onPress={() => close(false)}>
          <Pressable style={styles.card} onPress={() => {}}>
            {dialog && (
              <>
                <View style={[styles.iconTile, { backgroundColor: `${accent}22` }]}>
                  <Ionicons name={icon} size={28} color={accent} />
                </View>
                <AppText variant="h2" center style={{ marginTop: space.md }}>
                  {dialog.title}
                </AppText>
                {dialog.message ? (
                  <AppText color={colors.textDim} center style={{ marginTop: space.sm, lineHeight: 22 }}>
                    {dialog.message}
                  </AppText>
                ) : null}
                <View style={styles.buttons}>
                  {dialog.kind === 'confirm' && (
                    <Pressable onPress={() => close(false)} style={({ pressed }) => [styles.btn, styles.cancel, pressed && styles.pressed]}>
                      <Text style={styles.cancelText}>{t('cancel')}</Text>
                    </Pressable>
                  )}
                  <Pressable onPress={() => close(true)} style={({ pressed }) => [styles.btn, { backgroundColor: accent }, pressed && styles.pressed]}>
                    <Text style={[styles.okText, dialog.destructive && { color: '#fff' }]}>
                      {dialog.kind === 'notify' ? t('ok') : (dialog.confirmText ?? t('confirm'))}
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used inside ConfirmProvider');
  return ctx;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: space.xl },
  card: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    padding: space.xl,
    borderRadius: radius.xl,
    backgroundColor: '#24362C',
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconTile: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  buttons: { flexDirection: 'row', gap: space.sm, marginTop: space.xl, alignSelf: 'stretch' },
  btn: { flex: 1, height: 50, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  cancel: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  cancelText: { color: colors.text, fontWeight: '700', fontSize: 15 },
  okText: { color: colors.onPrimary, fontWeight: '800', fontSize: 15 },
  pressed: { opacity: 0.7 },
});
