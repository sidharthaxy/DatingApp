import React from 'react';
import { ScrollView, View, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { useRouter } from 'expo-router';
import { Shield, ChevronRight, XCircle } from 'lucide-react-native';
import { useAuthStore } from '@/src/store/authStore';

export default function TermsScreen() {
  const router = useRouter();
  const { logout } = useAuthStore();

  const handleAccept = () => {
    router.replace('/onboarding');
  };

  const handleDecline = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <Box className="flex-1 px-6 pt-6">
        {/* Header */}
        <VStack space="md" className="items-center mb-8">
          <Box className="w-16 h-16 bg-primary/10 rounded-full items-center justify-center">
            <Shield size={32} color="#414BEA" />
          </Box>
          <VStack space="xs" className="items-center">
            <Heading size="xl" className="text-on-surface font-headline font-bold text-center">
              Terms & Privacy
            </Heading>
            <Text className="text-on-surface-variant font-body text-center px-4">
              Please review our agreement to continue your journey with Minglex.
            </Text>
          </VStack>
        </VStack>

        {/* Content Island */}
        <Box className="flex-1 bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/10 shadow-sm overflow-hidden">
          <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
            <VStack space="lg">
              <VStack space="xs">
                <Text className="font-headline font-bold text-lg text-on-surface">1. Acceptance of Terms</Text>
                <Text className="font-body text-sm text-on-surface-variant leading-relaxed">
                  By accessing Minglex, you agree to follow our guidelines for digital kineticism and respectful dating. We prioritize safety, authenticity, and real human connections.
                </Text>
              </VStack>

              <VStack space="xs">
                <Text className="font-headline font-bold text-lg text-on-surface">2. Privacy Commitment</Text>
                <Text className="font-body text-sm text-on-surface-variant leading-relaxed">
                  Your privacy is our core principle. We use your data (location, interests) solely to find you meaningful matches. We never sell your personal information to third parties.
                </Text>
              </VStack>

              <VStack space="xs">
                <Text className="font-headline font-bold text-lg text-on-surface">3. Community Safety</Text>
                <Text className="font-body text-sm text-on-surface-variant leading-relaxed">
                  We maintain a zero-tolerance policy for harassment, fake profiles, or harmful behavior. Our AI-driven moderation and KYC process ensure a secure environment for all members.
                </Text>
              </VStack>

              <VStack space="xs">
                <Text className="font-headline font-bold text-lg text-on-surface">4. Age Requirements</Text>
                <Text className="font-body text-sm text-on-surface-variant leading-relaxed">
                  You must be at least 18 years old to use Minglex. By continuing, you affirm that you meet this requirement.
                </Text>
              </VStack>

              <Box className="mt-4 p-4 bg-primary/5 rounded-xl border border-primary/10">
                <Text className="text-xs font-label text-primary uppercase tracking-widest text-center font-bold">
                  Last Updated: May 2026
                </Text>
              </Box>
            </VStack>
          </ScrollView>
        </Box>

        {/* Actions */}
        <VStack space="md" className="py-8">
          <TouchableOpacity 
            onPress={handleAccept}
            className="h-14 rounded-2xl signature-gradient shadow-lg shadow-primary/20 items-center justify-center flex-row space-x-2"
          >
            <Text className="text-white font-bold text-lg">Accept & Continue</Text>
            <ChevronRight size={20} color="white" />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={handleDecline}
            className="h-14 rounded-2xl bg-surface-container-low items-center justify-center flex-row space-x-2"
          >
            <XCircle size={18} color="#afadac" />
            <Text className="text-on-surface-variant font-bold text-base">Decline & Go Back</Text>
          </TouchableOpacity>
        </VStack>
      </Box>
    </SafeAreaView>
  );
}
