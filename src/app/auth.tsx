import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { useToast } from '@/components/ui/Toast';
import { describeAuthError } from '@/services/firebase';
import { resetPassword, signIn, signUp } from '@/services/auth';
import { Button, Note, Row, Screen } from '@/components/ui/Primitives';
import { TextField } from '@/components/ui/TextField';
import { Icon } from '@/components/ui/Icon';
import { Txt } from '@/components/ui/Txt';
import { Hero } from '@/components/Hero';

type Mode = 'signin' | 'signup' | 'reset';

export default function Auth() {
  const { colors } = useTheme();
  const toast = useToast();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = /\S+@\S+\.\S+/.test(email.trim()) && (mode === 'reset' || password.length >= 6) && (mode !== 'signup' || confirm === password);

  const submit = async () => {
    setError(null);
    if (mode === 'signup' && confirm !== password) { setError('Passwords do not match.'); return; }
    setBusy(true);
    try {
      if (mode === 'signin') await signIn(email, password);
      else if (mode === 'signup') await signUp(email, password);
      else {
        await resetPassword(email);
        toast('Password reset email sent', { tone: 'ok' });
        setMode('signin');
      }
      // On success the auth listener routes to the app.
    } catch (e) {
      setError(describeAuthError(e));
    } finally {
      setBusy(false);
    }
  };

  const title = mode === 'signin' ? 'Welcome back' : mode === 'signup' ? 'Create your account' : 'Reset password';
  const cta = mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset email';

  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Hero tone="blue" style={{ marginTop: 10, paddingVertical: 26 }}>
          <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <Icon name="currency-inr" size={28} color="#fff" />
          </View>
          <Txt v="h1" color="#fff">Expense Tracker</Txt>
          <Txt v="small" color="rgba(255,255,255,0.8)" style={{ marginTop: 4 }}>Your accounts, budgets and reports, backed up to the cloud and available on every device.</Txt>
        </Hero>

        <Txt v="h2" style={{ marginBottom: 4 }}>{title}</Txt>
        <Txt v="small" color={colors.ink2} style={{ marginBottom: 16 }}>
          {mode === 'signin' ? 'Sign in to load your data.' : mode === 'signup' ? 'Use an email and a password of at least 6 characters.' : 'We will email you a link to choose a new password.'}
        </Txt>

        <TextField label="Email" placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" value={email} onChangeText={setEmail} icon="email-outline" testID="auth-email" />
        {mode !== 'reset' ? (
          <View>
            <TextField label="Password" placeholder="••••••••" secureTextEntry={!showPw} autoCapitalize="none" autoComplete={mode === 'signup' ? 'new-password' : 'password'} value={password} onChangeText={setPassword} icon="lock-outline" testID="auth-password" />
            <Pressable onPress={() => setShowPw(!showPw)} hitSlop={8} style={{ position: 'absolute', right: 14, top: 16 }}>
              <Icon name={showPw ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.ink3} />
            </Pressable>
          </View>
        ) : null}
        {mode === 'signup' ? <TextField label="Confirm password" placeholder="••••••••" secureTextEntry={!showPw} autoCapitalize="none" value={confirm} onChangeText={setConfirm} icon="lock-check-outline" testID="auth-confirm" /> : null}

        {error ? <Note tone="danger" icon="alert-circle-outline">{error}</Note> : null}

        <Button label={cta} icon={mode === 'reset' ? 'email-send-outline' : 'login'} onPress={submit} loading={busy} disabled={!valid} testID="auth-submit" />

        <Row gap={6} style={{ justifyContent: 'center', marginTop: 18, flexWrap: 'wrap' }}>
          {mode === 'signin' ? (
            <>
              <Txt v="small" color={colors.ink2}>New here?</Txt>
              <Pressable onPress={() => { setMode('signup'); setError(null); }} testID="auth-to-signup"><Txt v="small" color={colors.primaryInk} style={{ fontWeight: '700' }}>Create an account</Txt></Pressable>
              <Txt v="small" color={colors.ink3}>·</Txt>
              <Pressable onPress={() => { setMode('reset'); setError(null); }}><Txt v="small" color={colors.primaryInk} style={{ fontWeight: '700' }}>Forgot password?</Txt></Pressable>
            </>
          ) : (
            <>
              <Txt v="small" color={colors.ink2}>Already have an account?</Txt>
              <Pressable onPress={() => { setMode('signin'); setError(null); }} testID="auth-to-signin"><Txt v="small" color={colors.primaryInk} style={{ fontWeight: '700' }}>Sign in</Txt></Pressable>
            </>
          )}
        </Row>
        <Txt v="caption" center style={{ marginTop: 26, color: colors.ink4 }}>Your data is stored in your private cloud space and cached on this device for offline use.</Txt>
      </KeyboardAvoidingView>
    </Screen>
  );
}
