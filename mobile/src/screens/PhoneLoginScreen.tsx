import React, { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, Platform, View } from 'react-native';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Button, ButtonText, ButtonSpinner } from '@/components/ui/button';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Heading } from '@/components/ui/heading';
import { Input, InputField } from '@/components/ui/input';
import { useAuthStore } from '@/src/store/authStore';
import { ArrowLeft, SmartphoneIcon, KeyRound } from 'lucide-react-native';
import { router } from 'expo-router';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

export default function PhoneLoginScreen() {
  const { setUser, setToken } = useAuthStore();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const [confirm, setConfirm] = useState<FirebaseAuthTypes.ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const sendOtp = async () => {
    setErrorMsg('');
    if (!phoneNumber || phoneNumber.length < 5) {
      setErrorMsg('Please enter a valid phone number with country code (e.g. +1234567890)');
      return;
    }
    
    setLoading(true);
    try {
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
      const confirmation = await auth().signInWithPhoneNumber(formattedPhone);
      setConfirm(confirmation);
    } catch (error: any) {
      console.error('Send OTP Error: ', error);
      setErrorMsg(error.message || 'Failed to send OTP. Please check your phone number.');
    } finally {
      setLoading(false);
    }
  };

  const confirmCode = async () => {
    setErrorMsg('');
    if (!code || code.length !== 6) {
      setErrorMsg('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    try {
      if (confirm) {
        const userCredential = await confirm.confirm(code);
        if (userCredential?.user) {
          const idToken = await userCredential.user.getIdToken();
          
          const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000'; 
          
          try {
             const res = await fetch(`${apiUrl}/api/v1/auth/verify`, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ idToken })
             });
             
             const data = await res.json();
             
             if (data.success) {
               setToken(data.data.accessToken);
               setUser({
                 id: data.data.user.id,
                 status: data.data.user.status,
                 is_profile_complete: data.data.user.is_profile_complete ?? false,
               });
               if (data.data.user.is_profile_complete && data.data.user.status === 'APPROVED') {
                 router.replace('/(tabs)/discovery');
               } else {
                 router.replace('/onboarding');
               }
             } else {
               setErrorMsg(data.error?.message || 'Verification failed on server');
             }
          } catch(e) {
             console.error("Backend auth error", e);
             setErrorMsg('Unable to connect to the server');
          }
        }
      }
    } catch (error: any) {
      console.error('Confirm OTP Error: ', error);
      setErrorMsg('Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      className="flex-1 bg-surface dark:bg-background-dark"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <HStack className="items-center px-4 pt-16 pb-4">
          <Button variant="link" onPress={() => router.back()} className="p-2">
            <ArrowLeft size={24} color="#1E1E1E" />
          </Button>
        </HStack>

        <VStack className="items-center px-6 py-4 space-y-10">
          
          <VStack className="items-center space-y-2 w-full">
            <View className="w-16 h-16 bg-surface-container-high rounded-full items-center justify-center mb-4">
              {confirm ? <KeyRound size={28} color="#000" /> : <SmartphoneIcon size={28} color="#000" />}
            </View>
            <Heading className="font-headline font-bold text-3xl tracking-tight text-on-surface text-center">
              {confirm ? 'Enter Code' : 'Your Phone'}
            </Heading>
            <Text className="font-body text-on-surface-variant text-sm text-center px-6">
              {confirm ? `Enter the 6-digit code sent to ${phoneNumber}` : 'Enter your phone number to receive a verification code.'}
            </Text>
          </VStack>

          <Box className="w-full max-w-md bg-surface-container-lowest p-8 rounded-2xl shadow-sm border border-outline-variant/30 space-y-6">
            
            {errorMsg ? (
              <View className="p-3 bg-error/10 rounded border border-error/20 mb-4">
                <Text className="text-error font-body text-xs text-center">{errorMsg}</Text>
              </View>
            ) : null}

            {!confirm ? (
              <VStack space="md">
                <Text className="font-label text-xs uppercase tracking-wider text-on-surface-variant mb-1 mt-2">Phone Number</Text>
                <Input className="h-14 border border-outline-variant rounded-lg bg-surface flex-row items-center px-4">
                  <InputField 
                    className="flex-1 font-body text-lg text-on-surface h-full"
                    placeholder="+1 234 567 8900" 
                    keyboardType="phone-pad"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    autoFocus
                  />
                </Input>
                
                <Button 
                  className="w-full h-14 bg-primary active:opacity-90 mt-6 signature-gradient rounded shadow-lg shadow-primary/20 flex-row items-center justify-center"
                  onPress={sendOtp}
                  disabled={loading}
                >
                  {loading ? <ButtonSpinner /> : <ButtonText className="font-label font-bold text-sm text-white tracking-wide">Send OTP</ButtonText>}
                </Button>
              </VStack>
            ) : (
              <VStack space="md">
                <Text className="font-label text-xs uppercase tracking-wider text-on-surface-variant mb-1 mt-2">Verification Code</Text>
                <Input className="h-14 border border-outline-variant rounded-lg bg-surface flex-row items-center px-4">
                  <InputField 
                    className="flex-1 font-body text-2xl tracking-[0.2em] text-center text-on-surface h-full"
                    placeholder="------" 
                    keyboardType="number-pad"
                    value={code}
                    onChangeText={setCode}
                    maxLength={6}
                    autoFocus
                  />
                </Input>
                
                <Button 
                  className="w-full h-14 bg-primary active:opacity-90 mt-6 signature-gradient rounded shadow-lg shadow-primary/20 flex-row items-center justify-center"
                  onPress={confirmCode}
                  disabled={loading}
                >
                  {loading ? <ButtonSpinner /> : <ButtonText className="font-label font-bold text-sm text-white tracking-wide">Verify & Login</ButtonText>}
                </Button>

                <Button variant="link" onPress={() => setConfirm(null)} className="mt-4 self-center">
                  <Text className="font-label text-xs text-primary underline">Change phone number</Text>
                </Button>
              </VStack>
            )}
          </Box>
        </VStack>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
