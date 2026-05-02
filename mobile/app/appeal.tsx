import React, { useState } from 'react';
import {
  ScrollView,
  TouchableOpacity,
  TextInput,
  View,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { ShieldX, LogOut, Send as SendIcon } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/src/store/authStore';
import { apiPost } from '@/src/lib/api';

export default function AppealScreen() {
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim() || reason.trim().length < 20) {
      Alert.alert('Too Short', 'Please provide at least 20 characters explaining your appeal.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiPost('/api/v1/appeals', { reason: reason.trim() });
      const json = await res.json();

      if (json.success) {
        setSubmitted(true);
      } else if (json.error?.code === 'ALREADY_PENDING') {
        Alert.alert('Already Submitted', 'You already have a pending appeal. Our team will respond within 24 hours.');
        setSubmitted(true);
      } else if (json.error?.code === 'INVALID_STATE') {
        Alert.alert('Account Active', 'Your account is currently active. No appeal is needed.');
      } else {
        Alert.alert('Error', json.error?.message || 'Failed to submit appeal. Try again.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9f6f5' }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24 }} showsVerticalScrollIndicator={false}>

        {/* Icon */}
        <VStack style={{ alignItems: 'center', marginTop: 24, marginBottom: 32 }}>
          <View style={styles.iconWrap}>
            <ShieldX size={40} color="#b41340" />
          </View>
          <Heading style={styles.title}>Account Restricted</Heading>
          <Text style={styles.subtitle}>
            Your account has been restricted{user?.status === 'REJECTED' ? ' and is under review' : ''}.
            If you believe this was a mistake, you can submit an appeal below.
          </Text>
        </VStack>

        {submitted ? (
          /* Success State */
          <View style={styles.successCard}>
            <Text style={styles.successTitle}>✅ Appeal Submitted</Text>
            <Text style={styles.successBody}>
              Our moderation team will review your appeal and respond within 24 hours.
              You will be notified when a decision is made.
            </Text>
          </View>
        ) : (
          /* Appeal Form */
          <VStack style={{ gap: 16 }}>
            <VStack style={{ gap: 6 }}>
              <Text style={styles.label}>REASON FOR APPEAL</Text>
              <TextInput
                style={styles.textArea}
                placeholder="Explain why you believe your account was restricted in error. The more detail you provide, the faster we can review..."
                placeholderTextColor="#afadac"
                multiline
                numberOfLines={6}
                value={reason}
                onChangeText={setReason}
                maxLength={1000}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>{reason.length}/1000 (min 20)</Text>
            </VStack>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting || reason.trim().length < 20}
              style={[
                styles.submitBtn,
                (submitting || reason.trim().length < 20) && styles.submitBtnDisabled,
              ]}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <HStack style={{ alignItems: 'center', gap: 8 }}>
                  <SendIcon size={16} color="#fff" />
                  <Text style={styles.submitText}>Submit Appeal</Text>
                </HStack>
              )}
            </TouchableOpacity>

            <Text style={styles.disclaimer}>
              Appeals are reviewed by our trust & safety team. False appeals may result in permanent suspension.
            </Text>
          </VStack>
        )}

        {/* Logout */}
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <HStack style={{ alignItems: 'center', gap: 8, justifyContent: 'center' }}>
            <LogOut size={16} color="#b41340" />
            <Text style={styles.logoutText}>Logout</Text>
          </HStack>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#b4134015',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#2f2f2e',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Manrope_400Regular',
    color: '#5c5b5b',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
    alignSelf: 'center',
  },
  label: {
    fontSize: 10,
    letterSpacing: 2,
    color: '#5c5b5b',
    fontFamily: 'SpaceMono_400Regular',
  },
  textArea: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e4e2e1',
    borderRadius: 16,
    padding: 16,
    fontSize: 14,
    fontFamily: 'Manrope_400Regular',
    color: '#2f2f2e',
    minHeight: 140,
  },
  charCount: {
    fontSize: 10,
    color: '#afadac',
    textAlign: 'right',
  },
  submitBtn: {
    backgroundColor: '#414BEA',
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    backgroundColor: '#d0cece',
  },
  submitText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  disclaimer: {
    fontSize: 11,
    color: '#afadac',
    textAlign: 'center',
    lineHeight: 17,
  },
  successCard: {
    backgroundColor: '#e8f5e9',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#a5d6a7',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 16,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#2e7d32',
    marginBottom: 8,
  },
  successBody: {
    fontSize: 13,
    fontFamily: 'Manrope_400Regular',
    color: '#388e3c',
    lineHeight: 20,
  },
  logoutBtn: {
    marginTop: 32,
    paddingVertical: 12,
  },
  logoutText: {
    color: '#b41340',
    fontSize: 14,
    fontFamily: 'Manrope_700Bold',
  },
});
