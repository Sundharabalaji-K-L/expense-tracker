import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { format } from 'date-fns';

function safeName(base: string, ext: string): string {
  return `${base.replace(/[^a-z0-9-_]+/gi, '-')}-${format(new Date(), 'yyyyMMdd-HHmm')}.${ext}`;
}

async function shareFile(uri: string, mimeType: string, dialogTitle: string): Promise<void> {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType, dialogTitle, UTI: mimeType === 'text/csv' ? 'public.comma-separated-values-text' : 'com.adobe.pdf' });
  }
}

function webDownload(content: string, name: string, mime: string): void {
  // Web only: trigger a browser download.
  const g = globalThis as unknown as { document?: Document; URL?: typeof URL; Blob?: typeof Blob };
  if (!g.document || !g.Blob || !g.URL) return;
  const blob = new g.Blob([content], { type: mime });
  const url = g.URL.createObjectURL(blob);
  const a = g.document.createElement('a');
  a.href = url;
  a.download = name;
  g.document.body.appendChild(a);
  a.click();
  a.remove();
  g.URL.revokeObjectURL(url);
}

export async function exportCSV(csv: string, baseName = 'transactions'): Promise<string> {
  const name = safeName(baseName, 'csv');
  if (Platform.OS === 'web') {
    webDownload(csv, name, 'text/csv');
    return name;
  }
  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  await file.write(csv);
  await shareFile(file.uri, 'text/csv', 'Export transactions');
  return file.uri;
}

export async function exportPDF(html: string, baseName = 'expense-report'): Promise<string> {
  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return 'print-dialog';
  }
  const { uri } = await Print.printToFileAsync({ html });
  const target = new File(Paths.cache, safeName(baseName, 'pdf'));
  const source = new File(uri);
  source.move(target);
  await shareFile(target.uri, 'application/pdf', 'Share report');
  return target.uri;
}

export async function exportBackup(json: string): Promise<string> {
  const name = safeName('expense-tracker-backup', 'json');
  if (Platform.OS === 'web') {
    webDownload(json, name, 'application/json');
    return name;
  }
  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  await file.write(json);
  await shareFile(file.uri, 'application/json', 'Backup data');
  return file.uri;
}
