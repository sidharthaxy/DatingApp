import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Button, ButtonText } from '@/components/ui/button';
import { VStack } from '@/components/ui/vstack';
import { useAuthStore } from '@/src/store/authStore';

export default function ProfileScreen() {
  const logout = useAuthStore(state => state.logout);

  return (
    <Box className="flex-1 bg-background-dark items-center justify-center">
      <VStack space="md" className="items-center">
        <Heading className="text-typography-0 font-poppins font-bold">My Profile</Heading>
        <Text className="text-gray-400 font-poppins">Settings and Media Uploads pending.</Text>
        
        <Button className="mt-4 bg-error-500" action="negative" variant="solid" onPress={logout}>
          <ButtonText className="font-poppins font-bold">Logout</ButtonText>
        </Button>
      </VStack>
    </Box>
  );
}
