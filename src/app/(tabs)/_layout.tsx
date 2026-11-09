import React from 'react';
import { Pressable, View } from 'react-native';
import { Tabs, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeProvider';
import { Icon } from '@/components/ui/Icon';
import { Txt } from '@/components/ui/Txt';

const items = [
  { name: 'index', label: 'Home', icon: 'home-variant-outline', active: 'home-variant' },
  { name: 'transactions', label: 'Transactions', icon: 'format-list-bulleted', active: 'format-list-bulleted' },
  { name: 'budgets', label: 'Budgets', icon: 'chart-donut', active: 'chart-donut' },
  { name: 'reports', label: 'Reports', icon: 'chart-box-outline', active: 'chart-box' },
];

interface TabBarProps {
  state: { index: number; routes: { key: string; name: string }[] };
  navigateToTab: (routeKey: string) => void;
}

function TabItem({ it, on, onPress }: { it: (typeof items)[number]; on: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable testID={`tab-${it.name}`} onPress={onPress} style={{ flex: 1, alignItems: 'center', paddingTop: 10, gap: 3 }}>
      <Icon name={on ? it.active : it.icon} size={23} color={on ? colors.primary : colors.ink3} />
      <Txt v="caption" color={on ? colors.primary : colors.ink3} style={{ fontSize: 10, fontWeight: '700' }}>{it.label}</Txt>
    </Pressable>
  );
}

function TabBar({ state, navigateToTab }: TabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const activeName = state.routes[state.index]?.name;
  const go = (name: string) => {
    const route = state.routes.find((r) => r.name === name);
    if (route) navigateToTab(route.key);
  };
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.tabBar, borderTopWidth: 1, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 10), flexDirection: 'row', alignItems: 'flex-start' }}>
      <TabItem it={items[0]} on={activeName === items[0].name} onPress={() => go(items[0].name)} />
      <TabItem it={items[1]} on={activeName === items[1].name} onPress={() => go(items[1].name)} />
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Pressable
          testID="fab-add"
          onPress={() => router.push('/transaction/edit')}
          style={({ pressed }) => ({ marginTop: -22, width: 58, height: 58, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 8, opacity: pressed ? 0.9 : 1 })}
        >
          <Icon name="plus" size={30} color="#fff" />
        </Pressable>
      </View>
      <TabItem it={items[2]} on={activeName === items[2].name} onPress={() => go(items[2].name)} />
      <TabItem it={items[3]} on={activeName === items[3].name} onPress={() => go(items[3].name)} />
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar state={props.state} navigateToTab={props.navigateToTab} />}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="transactions" options={{ title: 'Transactions' }} />
      <Tabs.Screen name="budgets" options={{ title: 'Budgets' }} />
      <Tabs.Screen name="reports" options={{ title: 'Reports' }} />
    </Tabs>
  );
}
