import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { Txt } from './Txt';
import { Button } from './Primitives';
import { Icon } from './Icon';

export function Sheet({ visible, onClose, title, subtitle, children, scroll = true, maxHeight = '85%' }: { visible: boolean; onClose: () => void; title?: string; subtitle?: string; children: React.ReactNode; scroll?: boolean; maxHeight?: `${number}%` }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable onPress={onClose} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.backdrop }} />
        <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 10, paddingHorizontal: 20, paddingBottom: Math.max(insets.bottom, 16) + 8, maxHeight }}>
          <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: colors.border2, alignSelf: 'center', marginBottom: 14 }} />
          {title ? (
            <View style={{ marginBottom: 12 }}>
              <Txt v="h2">{title}</Txt>
              {subtitle ? <Txt v="muted" style={{ marginTop: 3 }}>{subtitle}</Txt> : null}
            </View>
          ) : null}
          {scroll ? (
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {children}
            </ScrollView>
          ) : (
            children
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function ConfirmDialog({ visible, onClose, onConfirm, title, body, confirmLabel = 'Delete', danger = true, icon = 'trash-can-outline' }: { visible: boolean; onClose: () => void; onConfirm: () => void; title: string; body: string; confirmLabel?: string; danger?: boolean; icon?: string }) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: colors.backdrop, justifyContent: 'center', padding: 28 }}>
        <Pressable onPress={() => undefined} style={{ backgroundColor: colors.surface, borderRadius: 22, padding: 22, alignItems: 'center' }}>
          <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: danger ? colors.expenseSoft : colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <Icon name={icon} size={26} color={danger ? colors.expense : colors.primary} />
          </View>
          <Txt v="h2" center>{title}</Txt>
          <Txt v="body" center color={colors.ink2} style={{ marginTop: 6, marginBottom: 18 }}>{body}</Txt>
          <View style={{ flexDirection: 'row', gap: 10, alignSelf: 'stretch' }}>
            <Button label="Cancel" variant="ghost" onPress={onClose} style={{ flex: 1 }} />
            <Button label={confirmLabel} variant={danger ? 'danger' : 'primary'} onPress={onConfirm} style={{ flex: 1 }} testID="confirm-button" />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
