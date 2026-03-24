import React from 'react';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { VStack } from '@/components/ui/vstack';
import { Button, ButtonText } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/store/authStore';

export default function OnboardingScreen() {
  const router = useRouter();
  const setUser = useAuthStore(state => state.setUser);
  const user = useAuthStore(state => state.user);

  const completeOnboarding = () => {
    // Navigate to KYC Verification step 
    if (user) {
      router.push('/kyc');
    }
  };

  return (
    <Box className="flex-1 bg-background-light p-6 justify-center">
      <VStack space="xl">
        <Heading size="2xl" className="text-primary-500 font-poppins font-bold">Complete Your Profile</Heading>
        
        <Text className="text-gray-400 font-poppins">Step 1: Basic Info</Text>
        
        <VStack space="md">
          <Input variant="outline" size="md">
            <InputField placeholder="Name" className="font-poppins" />
          </Input>
          <Input variant="outline" size="md">
            <InputField placeholder="Date of Birth" className="font-poppins" />
          </Input>
          <Input variant="outline" size="md">
            <InputField placeholder="City" className="font-poppins" />
          </Input>
        </VStack>

        <Button size="lg" className="bg-primary-500" onPress={completeOnboarding}>
          <ButtonText className="font-poppins font-bold">Finish Setup</ButtonText>
        </Button>
      </VStack>
    </Box>
  );
}
