import React, { useState } from 'react';
import { Dimensions } from 'react-native';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Heading } from '@/components/ui/heading';
import { Button, ButtonText, ButtonIcon } from '@/components/ui/button';
import { Image } from '@/components/ui/image';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring, 
  runOnJS 
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');
const SWIPE_THRESHOLD = width * 0.3;

const DUMMY_USERS = [
  { id: '1', name: 'Aisha', age: 24, city: 'Mumbai', distance: '5 km', image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400&h=600' },
  { id: '2', name: 'Rohan', age: 26, city: 'Delhi', distance: '12 km', image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=400&h=600' },
  { id: '3', name: 'Priya', age: 23, city: 'Bangalore', distance: '2 km', image: 'https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?auto=format&fit=crop&q=80&w=400&h=600' },
];

export default function DiscoveryScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const handleSwipeComplete = (direction: 'left' | 'right') => {
    setCurrentIndex((prev) => prev + 1);
    translateX.value = 0;
    translateY.value = 0;
  };

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      // Nothing needed on begin for swipe card
    })
    .onChange((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      if (event.translationX > SWIPE_THRESHOLD) {
        translateX.value = withSpring(width + 100, {}, () => runOnJS(handleSwipeComplete)('right'));
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withSpring(-width - 100, {}, () => runOnJS(handleSwipeComplete)('left'));
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${(translateX.value / width) * 15}deg` },
      ],
    };
  });

  const currentUser = DUMMY_USERS[currentIndex];

  return (
    <Box className="flex-1 bg-background-dark items-center justify-center p-4">
      <VStack space="2xl" className="items-center w-full">
        <Heading className="text-primary-500 font-poppins font-bold text-center" size="2xl">Discover</Heading>

        <Box className="w-full h-[500px] relative items-center justify-center">
          {currentIndex >= DUMMY_USERS.length ? (
            <Text className="text-gray-400 font-poppins text-lg">No more profiles today!</Text>
          ) : (
            <GestureDetector gesture={panGesture}>
              <Animated.View style={[animatedStyle, { width: '100%', height: '100%', position: 'absolute' }]}>
                <Box className="w-full h-full bg-background-dark-800 rounded-2xl overflow-hidden shadow-2xl elevation-md">
                  <Image 
                    source={{ uri: currentUser.image }} 
                    className="w-full h-full absolute" 
                    alt="Profile Photo"
                  />
                  
                  {/* Gradient Overlay for Text Readability */}
                  <Box className="absolute bottom-0 w-full h-[150px] bg-black/50 justify-end p-5">
                    <HStack className="items-center justify-between">
                      <VStack>
                        <Heading className="text-white font-poppins font-bold" size="xl">
                          {currentUser.name}, {currentUser.age}
                        </Heading>
                        <Text className="text-gray-300 font-poppins text-sm">{currentUser.city}</Text>
                        <Text className="text-primary-400 font-poppins text-xs font-bold mt-1">{currentUser.distance} away</Text>
                      </VStack>
                    </HStack>
                  </Box>
                </Box>
              </Animated.View>
            </GestureDetector>
          )}
        </Box>

        <HStack className="justify-center gap-8 mt-4">
          <Button 
            size="xl" 
            variant="outline" 
            className="rounded-full w-16 h-16 border-2 border-error-500 bg-transparent flex items-center justify-center"
            onPress={() => {
              if (currentIndex < DUMMY_USERS.length) {
                translateX.value = withSpring(-width - 100, {}, () => runOnJS(handleSwipeComplete)('left'));
              }
            }}
          >
            <Text className="text-error-500 text-2xl">✕</Text>
          </Button>

          <Button 
            size="xl" 
            variant="outline" 
            className="rounded-full w-16 h-16 border-2 border-success-500 bg-transparent flex items-center justify-center"
            onPress={() => {
              if (currentIndex < DUMMY_USERS.length) {
                translateX.value = withSpring(width + 100, {}, () => runOnJS(handleSwipeComplete)('right'));
              }
            }}
          >
            <Text className="text-success-500 text-2xl">❤️</Text>
          </Button>
        </HStack>

      </VStack>
    </Box>
  );
}
