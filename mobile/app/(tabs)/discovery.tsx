import React, { useState, useEffect } from 'react';
import { useWindowDimensions, View, ScrollView, Platform, TouchableOpacity } from 'react-native';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Image } from '@/components/ui/image';
import { Heading } from '@/components/ui/heading';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring, 
  runOnJS 
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Menu, SlidersHorizontal, X, Star, Heart, MapPin, Bolt } from 'lucide-react-native';

import { useAuthStore } from '@/src/store/authStore';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
const UserCard = ({ user, isDesktop = false }: { user: any, isDesktop?: boolean }) => (
  <Box className={`bg-surface-container-lowest rounded-xl overflow-hidden shadow-lg border border-outline-variant/10 ${isDesktop ? 'aspect-[3/4] mb-4' : 'w-full h-full'}`}>
    <Image 
      source={{ uri: user.image }} 
      className="w-full h-full absolute" 
      alt="Profile"
    />
    <LinearGradient
      colors={['rgba(0,0,0,0.2)', 'transparent', 'rgba(0,0,0,0.8)']}
      className="absolute inset-0"
    />
    <HStack className="absolute top-4 left-0 right-0 px-4 space-x-1.5 z-20">
      <View className="h-1 flex-1 bg-white rounded-full" />
      <View className="h-1 flex-1 bg-white/30 rounded-full" />
      <View className="h-1 flex-1 bg-white/30 rounded-full" />
    </HStack>
    <VStack className="absolute bottom-0 left-0 right-0 p-6 z-20">
      <VStack space="xs">
        <HStack className="items-baseline space-x-3">
          <Heading className={`font-headline ${isDesktop ? 'text-xl' : 'text-3xl'} font-bold text-white tracking-tight`}>
            {user.name}, {user.age}
          </Heading>
          <View className="bg-primary/20 bg-opacity-70 px-2 py-0.5 rounded border border-white/20">
            <Text className="font-label text-[10px] text-white uppercase tracking-tighter">Verified</Text>
          </View>
        </HStack>
        <HStack className="items-center space-x-3">
          <MapPin size={12} color="white" />
          <Text className="font-label text-[10px] text-white uppercase tracking-widest leading-none">{user.city} • {user.distance}</Text>
        </HStack>
      </VStack>
      {!isDesktop && (
        <Text className="mt-4 font-body text-sm text-white/90 leading-relaxed" numberOfLines={2}>
          {user.bio}
        </Text>
      )}
      <HStack className="mt-4 self-start items-center space-x-2 bg-white/10 px-3 py-1.5 rounded-full border border-white/10">
        <Bolt size={12} color="#9097ff" fill="#9097ff" />
        <Text className="font-label text-[10px] uppercase tracking-widest text-white">{user.match} Match</Text>
      </HStack>
    </VStack>
  </Box>
);

const ActionButtons = ({ isDesktop = false, onLeft, onRight, onStar }: any) => (
  <HStack className={`justify-between items-center ${isDesktop ? 'px-1' : 'px-4 mb-8'}`}>
    <TouchableOpacity onPress={onLeft} className={`${isDesktop ? 'w-10 h-10' : 'w-16 h-16'} rounded-full bg-surface-container-lowest shadow-lg items-center justify-center border border-outline-variant/10 active:scale-90 transition-transform`}>
      <X size={isDesktop ? 20 : 32} color="#b41340" />
    </TouchableOpacity>
    <TouchableOpacity onPress={onStar} className={`${isDesktop ? 'w-8 h-8' : 'w-12 h-12'} rounded-full bg-surface-container-lowest shadow-md items-center justify-center border border-outline-variant/10 active:scale-90 transition-transform`}>
      <Star size={isDesktop ? 16 : 24} color="#5321d9" fill="#5321d9" />
    </TouchableOpacity>
    <TouchableOpacity onPress={onRight} className={`${isDesktop ? 'w-10 h-10' : 'w-16 h-16'} rounded-full signature-gradient shadow-lg items-center justify-center active:scale-90 transition-transform`}>
      <Heart size={isDesktop ? 20 : 32} color="white" fill="white" />
    </TouchableOpacity>
  </HStack>
);

export default function DiscoveryScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width > 768;
  const maxWidth = 1200;
  
  const [users, setUsers] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!token) return;
      try {
        const response = await fetch(`${API_URL}/api/v1/discovery`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await response.json();
        if (json.success && json.data.users) {
          const mappedUsers = json.data.users.map((u: any) => ({
            id: u.id,
            name: u.first_name || 'User',
            age: u.dob ? new Date().getFullYear() - new Date(u.dob).getFullYear() : 25,
            city: u.city || 'Unknown Location',
            distance: '5 km away', // calculate distance if coords present
            job: u.job_title || 'Professional',
            match: '90%', 
            active: u.status === 'APPROVED',
            image: u.photos && u.photos.length > 0 ? (u.photos[0].url.startsWith('http') ? u.photos[0].url : `${API_URL}/${u.photos[0].url}`) : 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400',
            bio: u.bio || 'Say hello to my new profile.'
          }));
          setUsers(mappedUsers);
        }
      } catch (err) {
        console.error('Failed to fetch users', err);
      }
    };
    fetchUsers();
  }, [token]);

  const handleSwipeComplete = async (direction: 'left' | 'right') => {
    if (users.length === 0) return;
    const userToSwipe = users[currentIndex];

    setCurrentIndex((prev) => (prev + 1) % users.length);
    translateX.value = 0;
    translateY.value = 0;

    // Send backend swipe request
    if (token) {
       try {
         await fetch(`${API_URL}/api/v1/swipe`, {
           method: 'POST',
           headers: {
             Authorization: `Bearer ${token}`,
             'Content-Type': 'application/json'
           },
           body: JSON.stringify({
             targetUserId: userToSwipe.id,
             type: direction === 'right' ? 'LIKE' : 'DISLIKE'
           })
         });
       } catch (err) {
         console.error('Failed to register swipe:', err);
       }
    }
  };

  const SWIPE_THRESHOLD = width * 0.25;

  const panGesture = Gesture.Pan()
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
        { rotate: `${(translateX.value / width) * 10}deg` },
      ],
    };
  });

  const currentUser = users.length > 0 ? users[currentIndex] : null;

  return (
    <Box className="flex-1 bg-surface items-center">
      <Box className="w-full flex-1" style={{ maxWidth: isDesktop ? maxWidth : '100%' }}>
        
        {/* TopAppBar */}
        <HStack className="justify-between items-center px-6 py-4 w-full bg-surface dark:bg-zinc-950 border-b border-surface-container-low">
          <TouchableOpacity>
            <Menu size={24} color="#2f2f2e" />
          </TouchableOpacity>
          <Text className="font-headline uppercase tracking-widest text-sm text-primary font-bold">
            Discovery
          </Text>
          <TouchableOpacity>
            <SlidersHorizontal size={24} color="#2f2f2e" />
          </TouchableOpacity>
        </HStack>

        <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 32, paddingBottom: 120 }}>
          
          {isDesktop ? (
            /* Desktop Grid View */
            <VStack space="xl">
              <HStack className="flex-wrap justify-center gap-6">
                {users.map((user) => (
                  <VStack key={user.id} className="w-[30%] min-w-[300px]" space="md">
                    <UserCard user={user} isDesktop />
                    <ActionButtons isDesktop onLeft={() => handleSwipeComplete('left')} onRight={() => handleSwipeComplete('right')} onStar={() => {}} />
                  </VStack>
                ))}
              </HStack>
            </VStack>
          ) : (
            /* Mobile Swipe View */
            <>
              {currentUser ? (
                <>
                  <Box className="w-full aspect-[3/4] relative mb-8">
                    <Box className="absolute inset-0 translate-x-3 translate-y-3 bg-surface-container-high rounded-xl -z-10" />
                    <GestureDetector gesture={panGesture}>
                      <Animated.View style={[animatedStyle, { width: '100%', height: '100%' }]}>
                        <UserCard user={currentUser} />
                      </Animated.View>
                    </GestureDetector>
                  </Box>
                  <ActionButtons onLeft={() => handleSwipeComplete('left')} onRight={() => handleSwipeComplete('right')} onStar={() => {}} />
                </>
              ) : (
                <Box className="w-full aspect-[3/4] mb-8 items-center justify-center bg-surface-container-lowest rounded-xl border border-outline-variant/10">
                  <Text className="text-on-surface-variant font-body">No remaining users nearby</Text>
                </Box>
              )}
            </>
          )}

          {/* Discovery Status Board */}
          <HStack className={`space-x-4 mt-8 ${isDesktop ? 'justify-center mx-auto' : ''}`} style={isDesktop ? { width: '80%', maxWidth: 800 } : {}}>
            <VStack className="flex-1 bg-surface-container-low p-4 rounded-xl space-y-2">
              <Text className="font-label text-[10px] uppercase text-on-surface-variant tracking-widest">Daily Picks</Text>
              <Text className="font-headline text-xl font-bold text-on-surface">12 / 20</Text>
              <Box className="w-full bg-surface-container-high h-1 rounded-full overflow-hidden">
                <Box className="bg-primary w-3/5 h-full" />
              </Box>
            </VStack>
            <VStack className="flex-1 bg-primary/10 p-4 rounded-xl space-y-2">
              <Text className="font-label text-[10px] uppercase text-primary tracking-widest font-bold">Nearby Now</Text>
              <HStack className="items-center -space-x-2">
                <Box className="w-6 h-6 rounded-full border-2 border-surface overflow-hidden">
                   <Image source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBam3fvsqCWfsvFUfZnrBQEL3F3qB_0Am3ACb7LblW6GVevex8UGBb_X_Zv099p-osl-R3MJmvOmrNa82XvgahQtpJ7dpWjcxRFddlJ9iVCQuJpWIZChKtIJGeZHOulY7cpzK5Qphrf31-Wx_YphK9L02x88WRbAEB6JQSO5tULvPmHJh0cTq7H_v8k7gJPVLiRmiaqWuSgyxpaFIYrtYtqpgbF9OVinqVjIrd2YLEx6CTKB7yTmPWFNDbXTOFvkc9RMixwviPdvPo' }} className="w-full h-full" alt="user" />
                </Box>
                <Box className="w-6 h-6 rounded-full border-2 border-surface overflow-hidden">
                   <Image source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuABHqtRSe5kyMVRXYe-v6V0h5IY6_qTcC6mNGswLI5DqX12zJQXfjKuLwBCJLoeaHthesgvy8myDE0YYVY6D9OG4xiSvCFwjAEBDa6CVX-_9jxu9CiMTMIRZUwEYR9AC7_J9sG5Gveh05urfifeH_UeIJA-VUAurfHCDz6NfofZ5BcBFJQsgj020kYIq2IrOb91w1_s4kW51_6agNx4UQokT5YSBwRSskWZ90yMD_8_Mu4S8MPm6dWiMIrGcGkX687K0Xgk3WJ2RCU' }} className="w-full h-full" alt="user" />
                </Box>
                <Box className="w-6 h-6 rounded-full bg-primary items-center justify-center border-2 border-surface">
                   <Text className="text-[8px] text-white font-bold">+24</Text>
                </Box>
              </HStack>
              <Text className="font-body text-[10px] text-on-surface-variant">Active users in Mumbai</Text>
            </VStack>
          </HStack>

        </ScrollView>
      </Box>
    </Box>
  );
}
