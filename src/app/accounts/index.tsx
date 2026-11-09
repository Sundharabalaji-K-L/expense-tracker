import React, { useMemo } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/theme/ThemeProvider';
import { useStore } from '@/store/useStore';
import { usePeriod, usePeriodTransactions } from '@/store/selectors';
import { useMoney } from '@/hooks/useMoney';
import { accountBalance, netWorth, totals } from '@/domain/analytics';
import { AppBar, Button, Card, EmptyState, IconButton, Row, Screen } from '@/components/ui/Primitives';
import { Icon, TileIcon } from '@/components/ui/Icon';
import { Txt } from '@/components/ui/Txt';
import { Hero } from '@/components/Hero';
import { accountTypeLabel } from '@/components/Pickers';

export default function Accounts() {
  const { colors } = useTheme();
  const money = useMoney();
  const accounts = useStore((s) => s.accounts);
  const all = useStore((s) => s.transactions);
  const period = usePeriod();
  const periodTxns = usePeriodTransactions(null);
  const nw = useMemo(() => netWorth(accounts, all), [accounts, all]);
  const active = accounts.filter((a) => !a.archived);

  return (
    <Screen>
      <AppBar title="Accounts" subtitle={`${active.length} account${active.length === 1 ? '' : 's'}`} back large right={<IconButton name="plus" onPress={() => router.push('/accounts/edit')} testID="add-account" />} />
      <Hero tone="green">
        <Txt v="caption" color="rgba(255,255,255,0.78)">Net worth</Txt>
        <Txt v="display" color="#fff" tabular style={{ marginTop: 4 }}>{money(nw.total)}</Txt>
        <Txt v="caption" color="rgba(255,255,255,0.8)" style={{ marginTop: 6 }}>Assets {money(nw.assets)} · Dues {money(nw.liabilities)}</Txt>
      </Hero>
      <Row gap={10} style={{ marginBottom: 14 }}>
        <Button label="Transfer" icon="swap-horizontal" size="sm" onPress={() => router.push('/transaction/edit?type=transfer')} style={{ flex: 1 }} testID="transfer-button" />
        <Button label="Add account" icon="plus" size="sm" variant="ghost" onPress={() => router.push('/accounts/edit')} style={{ flex: 1 }} />
      </Row>

      {active.length === 0 ? (
        <EmptyState icon="wallet-plus-outline" title="No accounts" body="Add your bank, cash, UPI and credit card accounts to track where your money is." />
      ) : (
        active.map((a) => {
          const bal = accountBalance(a, all);
          const t = totals(periodTxns, a.id);
          const util = a.type === 'credit' && a.creditLimit ? Math.round((Math.max(0, -bal) / a.creditLimit) * 100) : null;
          return (
            <Card key={a.id} onPress={() => router.push(`/accounts/${a.id}`)} testID={`account-${a.id}`}>
              <Row gap={12}>
                <TileIcon name={a.icon} color={a.color} size={44} />
                <View style={{ flex: 1 }}>
                  <Txt v="h3" numberOfLines={1}>{a.name}</Txt>
                  <Txt v="muted" numberOfLines={1}>{accountTypeLabel(a.type)}{a.note ? ` · ${a.note}` : ''}{util !== null ? ` · ${util}% of limit` : ''}</Txt>
                </View>
                <Txt v="h3" tabular color={bal < 0 ? colors.expenseInk : colors.ink}>{money(bal)}</Txt>
              </Row>
              <Row gap={14} style={{ marginTop: 10, paddingLeft: 56 }}>
                <Row gap={4}><Icon name="arrow-down-left" size={13} color={colors.incomeInk} /><Txt v="caption" color={colors.incomeInk} tabular>{money(t.income + t.transfersIn, { compact: true })}</Txt></Row>
                <Row gap={4}><Icon name="arrow-up-right" size={13} color={colors.expenseInk} /><Txt v="caption" color={colors.expenseInk} tabular>{money(t.expense + t.transfersOut, { compact: true })}</Txt></Row>
                <Txt v="caption">{period.isCurrent ? 'this cycle' : period.label}</Txt>
              </Row>
            </Card>
          );
        })
      )}
    </Screen>
  );
}
