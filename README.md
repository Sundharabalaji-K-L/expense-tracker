# Expense Tracker

A personal finance manager for Android and iOS built with Expo (React Native). It tracks multiple accounts, income, expenses and transfers, category budgets with alerts, a configurable salary-based financial cycle, daily expense reminders, reports with charts, and CSV/PDF export. All data stays on the device.

## Features

- **Accounts**: bank, cash, UPI, credit card and custom accounts, each with its own history and balance. Transfers between accounts are never counted as income or expense.
- **Transactions**: quick keypad entry, categories and subcategories, account, date/time and notes. Edit and delete from the detail screen.
- **Categories**: 12 default expense and 6 default income categories with subcategories. Create, edit and delete custom ones.
- **Budgets**: per-category budgets measured against the current financial cycle, with allocated / spent / remaining / percentage, a daily pace, and alerts at configurable thresholds (default 80% and 100%).
- **Financial cycle**: salary-based (any start day, or "last day of month") or calendar month. Drives every summary, budget and report.
- **Daily reminders**: at your chosen time, only if no expense was recorded that day. Actions: Add expense, No spending today, Remind me later (same-day slots only). Resets each day.
- **Reports**: daily trend, weekly bars, cycle breakdown (doughnut, top categories vs previous cycle, per-account bars) and multi-cycle comparison. Filter by cycle, custom date range and account.
- **Export**: CSV (transactions) and PDF (report), plus a downloadable JSON copy of your data.
- **Themes**: light, dark or system.

## Cloud backend (Firebase)

Sign-in is required. Data is stored in Firestore under `users/{uid}/…` and cached on the device so the app works offline; changes sync both ways whenever the device is online.

- **Auth**: Firebase Authentication, email/password. Sessions persist via AsyncStorage.
- **Data**: Firestore collections `accounts`, `categories`, `transactions`, `budgets` plus a `meta/settings` document per user. Every document carries an ISO `updatedAt`; deletions are tombstones (`deleted: true`) so they propagate to all devices. Conflicts resolve as last-write-wins per entity.
- **Sync engine**: `src/services/sync.ts` streams remote changes into the store, pushes local changes in batches, and reconciles on sign-in and when the app returns to the foreground. Merge logic is pure and unit tested in `src/domain/sync.ts`.
- **Security rules**: `firestore.rules` lets a user read and write only their own subtree. Deploy them once from the Firebase console (Firestore → Rules → paste → Publish) or with the Firebase CLI: `npx firebase-tools deploy --only firestore:rules`.
- **Config**: `src/services/firebaseConfig.ts` holds the web app config (not a secret; access is enforced by the rules).

## Project layout

```
src/app/            Expo Router screens ((tabs), accounts, transaction, categories, budgets, settings, reminder, onboarding)
src/components/     UI kit (Primitives, Sheet, Toast, Keypad, TextField), charts, pickers, TxnRow, Hero
src/domain/         Pure logic: types, cycle math, analytics, budgets, reminders, money formatting, exporters, sample data
src/store/          zustand store persisted to AsyncStorage, plus UI selectors (usePeriod etc.)
src/services/       expo-notifications, file export/share/print, budget alert dispatch
src/theme/          colour tokens and ThemeProvider
src/__tests__/      Jest unit and component tests
```

## Requirements

- Node 22.13 or newer (Expo SDK 58). On this machine a portable Node 22 lives at `F:\Workspace\tools\node-v22.14.0-win-x64`; add it to `PATH` before running commands.
- For a phone build: the Expo Go app (local notifications work in Expo Go), or Android Studio / EAS for a standalone build.

## Commands

On this machine the system Node is 16, so use the launcher scripts, which put the portable Node 22 on PATH for you:

```powershell
.\dev.ps1         # expo start (scan the QR with Expo Go)
.\dev.ps1 web     # run in the browser
.\dev.ps1 test    # jest
.\dev.ps1 lint    # expo lint
```

Or for a whole PowerShell session run `$env:Path = "F:\Workspace\tools\node-v22.14.0-win-x64;$env:Path"` once, then use the normal commands:

```bash
npm install
npx expo start            # dev server; scan the QR with Expo Go, or press w for web
npm run typecheck         # tsc --noEmit
npm run lint              # expo lint
npm test                  # jest (61 tests)
npm run export:web        # static web build in dist/
```


## Building for Android

No Android SDK is required for a cloud build:

```bash
npx eas-cli@latest build --platform android --profile preview
```

Or locally with Android Studio installed: `npx expo run:android`.

## Verification performed

- `tsc --noEmit`: clean
- `expo lint`: clean
- `jest`: 7 suites, 61 tests passing (cycle math, money formatting, analytics, budgets and alerts, reminder rules, store, exports, rendered components)
- `expo-doctor`: 20/20 checks passed
- `expo export --platform web` plus headless-browser screenshots of every main screen with sample data
