import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/src/store/authStore';
import { Box } from '@/components/ui/box';
import { Spinner } from '@/components/ui/spinner';
import { Image } from '@/components/ui/image';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import Animated, { 
  withRepeat, 
  withSequence, 
  withTiming, 
  useSharedValue, 
  useAnimatedStyle, 
  Easing 
} from 'react-native-reanimated';

export default function SplashScreen() {
  const { user, isLoading } = useAuthStore();

  const scale = useSharedValue(0.95);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    if (isLoading) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.95, { duration: 1200, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      opacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.6, { duration: 1200, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    }
  }, [isLoading]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value
  }));

  useEffect(() => {
    // Simulate loading/checking token mechanism
    setTimeout(() => {
      useAuthStore.setState({ isLoading: false });
    }, 2500); // Increased slightly so user can enjoy the loading animation
  }, []);

  if (isLoading) {
    return (
      <Box className="flex-1 justify-center items-center bg-surface-container-lowest">
        
        {/* Middle Tile */}
        <Box className="bg-white p-12 rounded-3xl items-center justify-center shadow-soft-4 border border-outline-variant/5">
          <Animated.View style={animatedStyle}>
            <Image 
              source={require('../assets/images/minglexlogo.png')} 
              className="w-48 h-16"
              resizeMode="contain"
              alt="MingleX Digital Kineticist Logo"
            />
          </Animated.View>

          <VStack space="md" className="items-center mt-10">
            <Spinner size="small" className="text-primary" />
            <Text className="font-label text-xs tracking-widest uppercase text-on-surface-variant">
              Synchronizing...
            </Text>
          </VStack>
        </Box>

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
