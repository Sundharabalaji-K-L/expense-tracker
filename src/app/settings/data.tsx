import React from 'react';
import { useStore } from '@/store/useStore';
import { usePeriod, usePeriodTransactions } from '@/store/selectors';
import { useToast } from '@/components/ui/Toast';
import { allBudgetProgress } from '@/domain/budgets';
import { reportToHTML, transactionsToCSV } from '@/domain/exporters';
import { exportBackup, exportCSV, exportPDF } from '@/services/exporter';
import { AppBar, Card, ListItem, Note, Screen } from '@/components/ui/Primitives';
import { TileIcon } from '@/components/ui/Icon';
import { Txt } from '@/components/ui/Txt';

export default function DataSettings() {
  const toast = useToast();
  const store = useStore();
  const period = usePeriod();
  const periodTxns = usePeriodTransactions(null);
  const ctx = { accounts: store.accounts, categories: store.categories, currency: store.settings.currency, rangeLabel: period.label };

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast(ok, { tone: 'ok' });
    } catch {
      toast('Export could not be completed. Please try again.', { tone: 'danger' });
    }
  };

  return (
    <Screen>
      <AppBar title="Export & backup" back />
      <Txt v="label" style={{ marginBottom: 8 }}>Export</Txt>
      <Card style={{ paddingVertical: 4 }}>
        <ListItem left={<TileIcon name="file-delimited-outline" color="#0f9d58" soft size={36} />} title="Transactions CSV · this period" subtitle={`${periodTxns.length} rows · ${period.label}`} chevron onPress={() => run(() => exportCSV(transactionsToCSV(periodTxns, ctx)), 'CSV exported')} />
        <ListItem left={<TileIcon name="file-delimited-outline" color="#0f9d58" soft size={36} />} title="Transactions CSV · all time" subtitle={`${store.transactions.length} rows`} chevron onPress={() => run(() => exportCSV(transactionsToCSV(store.transactions, { ...ctx, rangeLabel: 'All time' }), 'all-transactions'), 'CSV exported')} />
        <ListItem left={<TileIcon name="file-pdf-box" color="#e03e3e" soft size={36} />} title="PDF report · this period" subtitle="Summary, categories, budgets, transactions" chevron onPress={() => run(() => exportPDF(reportToHTML(periodTxns, allBudgetProgress(store.budgets, periodTxns), ctx)), 'PDF ready')} last />
      </Card>

      <Txt v="label" style={{ marginBottom: 8 }}>Backup</Txt>
      <Card style={{ paddingVertical: 4 }}>
        <ListItem left={<TileIcon name="cloud-download-outline" color="#2a78d6" soft size={36} />} title="Download a copy of your data" subtitle="Accounts, categories, transactions, budgets and settings (JSON)" chevron onPress={() => run(() => exportBackup(JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), accounts: store.accounts, categories: store.categories, transactions: store.transactions, budgets: store.budgets, settings: store.settings }, null, 2)), 'Backup ready')} last />
      </Card>
      <Note tone="ok" icon="cloud-check-outline">Your data is automatically backed up to your account and available on any device you sign in to.</Note>
    </Screen>
  );
}
