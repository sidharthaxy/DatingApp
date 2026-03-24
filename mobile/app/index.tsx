import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/src/store/authStore';
import { Box } from '@/components/ui/box';
import { Spinner } from '@/components/ui/spinner';
import { Heading } from '@/components/ui/heading';

export default function SplashScreen() {
  const { user, isLoading } = useAuthStore();

  useEffect(() => {
    // Simulate loading/checking token mechanism
    setTimeout(() => {
      useAuthStore.setState({ isLoading: false });
    }, 1000);
  }, []);

  if (isLoading) {
    return (
      <Box className="flex-1 justify-center items-center bg-[#1A1A2E]">
        <Heading size="3xl" className="text-[#E53A9B] mb-4 font-poppins font-bold">MingleX</Heading>
        <Spinner size="large" className="text-[#A230ED]" />
      </Box>
    );
  }

  // Redirect based on auth state
  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!user.profile_complete || user.status === 'UNDER_REVIEW') {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)/discovery" />;
}
