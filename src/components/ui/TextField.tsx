import React, { useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Icon } from './Icon';
import { Txt } from './Txt';

export function TextField({ label, icon, style, ...rest }: TextInputProps & { label?: string; icon?: string }) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={[{ backgroundColor: focused ? colors.surface : colors.surface2, borderWidth: 1, borderColor: focused ? colors.primary : colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }, style]}>
      {icon ? <Icon name={icon} size={18} color={colors.ink3} /> : null}
      <View style={{ flex: 1 }}>
        {label ? <Txt v="caption" style={{ fontWeight: '600', marginBottom: 1 }}>{label}</Txt> : null}
        <TextInput
          {...rest}
          onFocus={(e) => { setFocused(true); rest.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); rest.onBlur?.(e); }}
          placeholderTextColor={colors.ink4}
          style={{ fontSize: 14.5, fontWeight: '600', color: colors.ink, paddingVertical: 2, minHeight: 22 }}
        />
      </View>
    </View>
  );
}
