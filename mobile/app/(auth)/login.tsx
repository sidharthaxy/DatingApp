import React, { useState } from 'react';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Button, ButtonText } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import { VStack } from '@/components/ui/vstack';
import { Heading } from '@/components/ui/heading';
import { useAuthStore } from '@/src/store/authStore';

export default function LoginScreen() {
  const setUser = useAuthStore((state) => state.setUser);
  const [phoneNumber, setPhoneNumber] = useState('');

  const handleGoogleLogin = () => {
    // Placeholder for Google Auth
    setUser({ id: '1', status: 'APPROVED', profile_complete: true });
  };

  const handlePhoneLogin = () => {
    // Placeholder for Phone OTP Auth
    setUser({ id: '2', status: 'UNDER_REVIEW', profile_complete: false });
  };

  return (
    <Box className="flex-1 justify-center p-6 bg-[#1A1A2E]">
      <VStack space="4xl">
        <Heading size="4xl" className="text-[#E53A9B] text-center font-poppins font-bold">
          MingleX
        </Heading>
        
        <VStack space="md">
          <Button size="lg" variant="solid" className="bg-[#A230ED]" onPress={handleGoogleLogin}>
            <ButtonText className="font-poppins font-bold">Continue with Google</ButtonText>
          </Button>
          
          <Text className="text-center text-gray-400 font-poppins">or</Text>
          
          <Input variant="outline" size="lg" className="border-[#6E22E5]">
            <InputField 
              placeholder="Enter phone number" 
              className="text-white font-poppins" 
              value={phoneNumber} 
              onChangeText={setPhoneNumber} 
              keyboardType="phone-pad" 
            />
          </Input>
          
          <Button size="lg" variant="solid" className="bg-[#FF7539]" onPress={handlePhoneLogin}>
            <ButtonText className="font-poppins font-bold">Send OTP</ButtonText>
          </Button>
        </VStack>
      </VStack>
    </Box>
  );
}
