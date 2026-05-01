import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';

import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Button, ButtonText, ButtonIcon, ButtonSpinner } from '@/components/ui/button';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Heading } from '@/components/ui/heading';
import { Image } from '@/components/ui/image';
import { useAuthStore } from '@/src/store/authStore';
import { SmartphoneIcon } from 'lucide-react-native';
import { router } from 'expo-router';

// ─── Config ───────────────────────────────────────────────────────────────────
const USE_EMULATOR = process.env.EXPO_PUBLIC_USE_EMULATOR === 'true';
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
const EMULATOR_URL = process.env.EXPO_PUBLIC_EMULATOR_URL || 'http://localhost:9099';
const FIREBASE_API_KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'fake-api-key';

// ─── Emulator Google Sign-In Modal ────────────────────────────────────────────
// Replicates the Firebase Auth Emulator IDP widget UI.
function EmulatorGoogleModal({
  visible,
  onClose,
  onSignIn,
}: {
  visible: boolean;
  onClose: () => void;
  onSignIn: (email: string, displayName: string) => Promise<void>;
}) {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const autoGenerate = () => {
    const rand = Math.floor(Math.random() * 9000) + 1000;
    setEmail(`testuser${rand}@example.com`);
    setDisplayName(`Test User ${rand}`);
  };

  const handleSignIn = async () => {
    if (!email.trim()) {
      setError('Please enter an email address');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await onSignIn(email.trim(), displayName.trim());
    } catch (e: any) {
      setError(e.message || 'Sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sign-in with Google.com</Text>
          </View>

          {/* Scrollable body */}
          <ScrollView
            style={{ maxHeight: Dimensions.get('window').height * 0.65 }}
            contentContainerStyle={{ paddingBottom: 8 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Info banner */}
            <View style={styles.infoBanner}>
              <Text style={styles.infoText}>ℹ️  Custom claims can be added after an account is created</Text>
            </View>

            {/* Auto-generate button */}
            <TouchableOpacity style={styles.autoGenBtn} onPress={autoGenerate}>
              <Text style={styles.autoGenText}>Auto-generate user information</Text>
            </TouchableOpacity>

            {/* Fields */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={styles.fieldInput}
                value={email}
                onChangeText={setEmail}
                placeholder="name@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Display name (optional)</Text>
              <TextInput
                style={styles.fieldInput}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Display Name"
              />
            </View>

            {/* Error */}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </ScrollView>

          {/* Actions — always visible, outside ScrollView */}
          <View style={styles.actions}>
            <TouchableOpacity onPress={onClose} style={styles.backBtn}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.signInBtn, loading && styles.signInBtnDisabled]}
              onPress={handleSignIn}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.signInText}>Sign in with Google.com</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Login Screen ────────────────────────────────────────────────────────
export default function LoginScreen() {
  const { setUser, setToken } = useAuthStore();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emulatorModalVisible, setEmulatorModalVisible] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Calls the Firebase Auth Emulator REST API with the user-supplied email
  const handleEmulatorSignIn = async (email: string, displayName: string) => {
    // Build a fake Google unsigned JWT with the provided user info
    const b64url = (obj: object) =>
      btoa(JSON.stringify(obj))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

    // Create a stable sub (uid) from the email
    const uid = `google-emulator-${email.replace(/[^a-zA-Z0-9]/g, '-')}`;

    const fakeGoogleJwt = [
      b64url({ alg: 'none', typ: 'JWT' }),
      b64url({
        sub: uid,
        email,
        name: displayName || email.split('@')[0],
        email_verified: true,
        iss: 'https://accounts.google.com',
        aud: 'fake-client-id',
      }),
      '',
    ].join('.');

    // Call the emulator's signInWithIdp endpoint
    const emulatorAuthUrl = `${EMULATOR_URL}/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${FIREBASE_API_KEY}`;
    const emRes = await fetch(emulatorAuthUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        postBody: `id_token=${fakeGoogleJwt}&providerId=google.com`,
        requestUri: 'http://localhost',
        returnIdpCredential: true,
        returnSecureToken: true,
      }),
    });
    const emData = await emRes.json();
    if (emData.error) throw new Error(emData.error.message);

    // Exchange Firebase token for our backend JWT
    const res = await fetch(`${API_URL}/api/v1/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: emData.idToken }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error?.message || 'Login failed');

    setToken(data.data.accessToken);
    setUser({
      id: data.data.user.id,
      status: data.data.user.status,
      is_profile_complete: data.data.user.is_profile_complete ?? false,
    });

    setEmulatorModalVisible(false);

    if (data.data.user.is_profile_complete && data.data.user.status === 'APPROVED') {
      router.replace('/(tabs)/discovery');
    } else {
      router.replace('/onboarding');
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg('');
    if (USE_EMULATOR) {
      // Show the in-app emulator IDP widget
      setEmulatorModalVisible(true);
    } else {
      // Production: requires real Google OAuth client IDs
      setGoogleLoading(true);
      setErrorMsg(
        'Production Google Sign-In is not configured.\n' +
        'Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in your .env file.'
      );
      setGoogleLoading(false);
    }
  };

  const handlePhoneLogin = () => {
    router.push('/(auth)/phone-login' as any);
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-surface dark:bg-background-dark"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* ── Emulator Google Widget Modal ── */}
      <EmulatorGoogleModal
        visible={emulatorModalVisible}
        onClose={() => setEmulatorModalVisible(false)}
        onSignIn={handleEmulatorSignIn}
      />

      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} showsVerticalScrollIndicator={false}>
        <VStack className="items-center px-6 py-12 space-y-12">

          {/* Branding */}
          <VStack className="items-center space-y-4">
            <View className="items-center justify-center w-24 h-24 mb-6">
              <Image
                source={require('../../assets/images/minglexlogo.png')}
                className="w-full h-full"
                resizeMode="contain"
                alt="Minglex Logo"
              />
            </View>
            <Heading className="font-headline font-bold text-5xl tracking-tighter text-primary">
              Minglex
            </Heading>
            <Text className="font-label text-on-surface-variant text-[10px] uppercase tracking-[0.2em] text-center">
              Digital Kineticism in Dating
            </Text>
          </VStack>

          {/* Login Card */}
          <Box className="w-full max-w-md bg-surface-container-lowest p-8 rounded-lg shadow-[0_32px_64px_-12px_rgba(47,47,46,0.06)] space-y-8 relative overflow-hidden">
            <View
              className="absolute -top-24 -right-24 w-48 h-48 signature-gradient opacity-10 rounded-full blur-3xl"
              style={{ position: 'absolute' }}
            />

            <VStack space="xs">
              <Heading className="font-headline text-2xl text-on-surface">Welcome back</Heading>
              <Text className="font-body text-on-surface-variant">Sign in to continue your journey.</Text>
              {USE_EMULATOR && (
                <Text className="font-label text-[10px] text-primary uppercase tracking-wider mt-1">
                  🔧 Local emulator mode
                </Text>
              )}
            </VStack>

            {errorMsg ? (
              <View className="p-3 bg-error/10 rounded border border-error/20">
                <Text className="text-error font-body text-xs text-center">{errorMsg}</Text>
              </View>
            ) : null}

            <VStack space="md">
              {/* Google Login */}
              <Button
                className="w-full h-14 bg-surface-container-high border-b-2 border-outline-variant/20 active:bg-surface-container-highest flex-row items-center justify-center space-x-3 rounded"
                onPress={handleGoogleLogin}
                disabled={googleLoading}
              >
                {googleLoading
                  ? <ButtonSpinner />
                  : <Text className="font-label font-bold text-sm text-on-surface tracking-wide">
                      Continue with Google
                    </Text>
                }
              </Button>

              {/* Phone Login */}
              <Button
                className="w-full h-14 signature-gradient shadow-lg shadow-primary/20 active:opacity-90 flex-row items-center justify-center space-x-3 rounded"
                onPress={handlePhoneLogin}
                disabled={googleLoading}
              >
                <ButtonIcon as={SmartphoneIcon} className="text-white" />
                <ButtonText className="font-label font-bold text-sm text-white tracking-wide">Login with Phone</ButtonText>
              </Button>
            </VStack>

            <HStack className="items-center space-x-4">
              <View className="flex-1 h-[1px] bg-outline-variant/20" />
              <Text className="font-label text-[10px] text-outline uppercase tracking-widest text-center">or</Text>
              <View className="flex-1 h-[1px] bg-outline-variant/20" />
            </HStack>

            <Button variant="link" className="self-center">
              <Text className="font-label text-xs text-on-surface-variant hover:text-primary uppercase tracking-wider">
                Trouble logging in?
              </Text>
            </Button>
          </Box>

          <HStack space="xs" className="justify-center">
            <View className="w-1.5 h-1.5 rounded-full bg-primary/20" />
            <View className="w-1.5 h-1.5 rounded-full bg-primary" />
            <View className="w-1.5 h-1.5 rounded-full bg-primary/20" />
          </HStack>

        </VStack>
      </ScrollView>

      <View className="p-8 items-center">
        <Text className="font-body text-[10px] text-on-surface-variant max-w-[280px] text-center leading-relaxed">
          By clicking Log In, you agree with our{' '}
          <Text className="text-on-surface font-medium underline">Terms</Text> and{' '}
          <Text className="text-on-surface font-medium underline">Privacy Policy</Text>.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Emulator Modal Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  modalHeader: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#202124',
  },
  infoBanner: {
    backgroundColor: '#e8f0fe',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#1a73e8',
    lineHeight: 18,
  },
  autoGenBtn: {
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#f3e8ff',
    borderRadius: 4,
    alignItems: 'center',
  },
  autoGenText: {
    fontSize: 14,
    color: '#6d28d9',
    fontWeight: '500',
  },
  fieldGroup: {
    marginHorizontal: 16,
    marginTop: 14,
  },
  fieldLabel: {
    fontSize: 12,
    color: '#5f6368',
    marginBottom: 4,
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: '#dadce0',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#202124',
    backgroundColor: '#fff',
  },
  errorText: {
    marginHorizontal: 16,
    marginTop: 8,
    fontSize: 12,
    color: '#d32f2f',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
    marginTop: 8,
  },
  backBtn: {
    padding: 8,
  },
  backText: {
    fontSize: 14,
    color: '#1a73e8',
  },
  signInBtn: {
    backgroundColor: '#6d28d9',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 4,
    minWidth: 160,
    alignItems: 'center',
  },
  signInBtnDisabled: {
    opacity: 0.7,
  },
  signInText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});
