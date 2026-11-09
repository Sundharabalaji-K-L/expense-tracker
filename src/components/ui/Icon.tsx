import React from 'react';
import { View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/theme/ThemeProvider';

export type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export function Icon({ name, size = 20, color }: { name: string; size?: number; color?: string }) {
  const { colors } = useTheme();
  return <MaterialCommunityIcons name={name as IconName} size={size} color={color ?? colors.ink2} />;
}

/** Rounded square with a coloured background and a white glyph: used for categories and accounts. */
export function TileIcon({ name, color, size = 42, iconSize, soft, radius }: { name: string; color: string; size?: number; iconSize?: number; soft?: boolean; radius?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius ?? Math.round(size / 3),
        backgroundColor: soft ? `${color}22` : color,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <MaterialCommunityIcons name={name as IconName} size={iconSize ?? Math.round(size * 0.5)} color={soft ? color : '#fff'} />
    </View>
  );
}
