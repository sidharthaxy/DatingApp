import React, { useState, useEffect } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Image } from '@/components/ui/image';
import { Button, ButtonText } from '@/components/ui/button';
import { useAuthStore } from '@/src/store/authStore';
import { useRouter, type Href } from 'expo-router';
import { Settings, Pencil, ShieldCheck, Activity, Sparkles, ChevronRight, LogOut, Crown, Heart, List, Eye } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { apiGet } from '@/src/lib/api';

export default function ProfileScreen() {
  const router = useRouter();
  const logout = useAuthStore(state => state.logout);
  const user = useAuthStore(state => state.user);
  const tier = user?.subscription_tier ?? 'FREE';
  const displayName = user?.first_name || 'My Profile';
  const isElite = tier === 'ELITE';
  const isPremium = tier === 'PREMIUM';

  const [stats, setStats] = useState({ profile_views: 0, likes_received: 0, dislikes_received: 0 });

  useEffect(() => {
    apiGet('/api/v1/analytics/me')
      .then(r => r.json())
      .then(json => { if (json.success) setStats(json.data); })
      .catch(() => {}); // Non-blocking
  }, []);



  return (
    <Box className="flex-1 bg-surface">
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Header */}
        <HStack className="justify-between items-center px-6 pt-12 pb-6">
          <Heading className="font-headline text-2xl font-bold tracking-tighter text-on-surface">{displayName}</Heading>
          <TouchableOpacity className="p-2 bg-surface-container-low rounded-full">
            <Settings size={20} color="#2f2f2e" />
          </TouchableOpacity>
        </HStack>

        {/* Profile Identity */}
        <VStack className="items-center px-6 mb-8 space-y-4">
          <Box className="w-32 h-32 relative">
            <Box className="w-full h-full rounded-full border-4 border-primary/20 p-1">
              <Image 
                source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB6ob1vuMo2Svf3nB_QJk5v9ZIqTdgNOptvxowNDXMq24U_mnuaWaS9d_jthEAEWs63ZF3luDo94Dr4nBAUkfLQ0hi_49J73f5lYKSkaZhoL4wO5gkcRWNWmZXyshZKz4N5KF9gRILJxGVFABjJmQFVXKbwviYchT1f2D16hyhestdxA-vfCzsokNKLEuI_7X5_tkE5h6f7dooN2Y42Y2IhmSmuQ6exUwRYiS_LleXvm-ycPiOXVorPGzqQZuGA6tFPV-aegG3jdZo' }} 
                className="w-full h-full rounded-full" 
                alt="Profile" 
              />
            </Box>
            <TouchableOpacity className="absolute bottom-0 right-0 w-10 h-10 bg-primary rounded-full items-center justify-center border-4 border-surface shadow-lg">
               <Pencil size={16} color="white" />
            </TouchableOpacity>
          </Box>
          
          <VStack className="items-center space-y-1">
            <Heading className="font-headline text-2xl font-bold text-on-surface">{displayName}</Heading>
            {tier !== 'FREE' && (
              <HStack className="items-center space-x-1 mt-1">
                <Crown size={12} color={isElite ? '#FFD700' : '#414BEA'} />
                <Text className="font-label text-[10px] uppercase tracking-widest" style={{ color: isElite ? '#FFD700' : '#414BEA' }}>{tier} Member</Text>
              </HStack>
            )}
            <Text className="font-body text-xs text-on-surface-variant text-center px-8 mt-2 leading-relaxed">
              Digital architect and kinetic art enthusiast. Always looking for the perfect blend of form and functionality.
            </Text>
          </VStack>
        </VStack>

        {/* Bento Stats Board */}
        <VStack className="px-6 mb-8 space-y-4">
          <HStack className="space-x-4">
            <Box className="flex-1 bg-primary/5 p-4 rounded-2xl border border-primary/10">
              <HStack className="items-center space-x-3 mb-2">
                <Eye size={18} color="#414BEA" />
                <Text className="font-label text-[10px] uppercase tracking-widest text-primary font-bold">Profile Views</Text>
              </HStack>
              <Text className="font-headline text-2xl font-bold text-on-surface">{stats.profile_views}</Text>
            </Box>
            
            <Box className="flex-1 bg-surface-container-low p-4 rounded-2xl border border-surface-container-high">
              <HStack className="items-center space-x-3 mb-2">
                <Heart size={18} color="#b41340" />
                <Text className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Likes In</Text>
              </HStack>
              <Text className="font-headline text-2xl font-bold text-on-surface">{stats.likes_received}</Text>
            </Box>
          </HStack>

          <Box className="w-full bg-surface-container-low p-5 rounded-2xl border border-surface-container-high">
            <HStack className="justify-between items-center mb-3">
              <HStack className="items-center space-x-3">
                <Sparkles size={18} color="#414BEA" />
                <Text className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Profile Completion</Text>
              </HStack>
              <Text className="font-headline text-sm font-bold text-primary">{user?.is_profile_complete ? '100%' : '70%'}</Text>
            </HStack>
            <Box className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden">
               <Box className="h-full signature-gradient" style={{ width: user?.is_profile_complete ? '100%' : '70%' }} />
            </Box>
          </Box>
        </VStack>


        {/* Upgrade Banner — only shown for FREE users */}
        {tier === 'FREE' && (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push('/subscription')}
          className="mx-6 mb-8 rounded-3xl overflow-hidden"
        >
          <LinearGradient
            colors={['#414BEA', '#9097ff']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 24, padding: 20 }}
          >
            <HStack className="justify-between items-center">
              <VStack className="space-y-1 flex-1">
                <HStack className="items-center space-x-2 mb-1">
                  <Crown size={16} color="#FFD700" />
                  <Text className="font-label text-[10px] uppercase tracking-widest text-white/70">Exclusive</Text>
                </HStack>
                <Heading className="font-headline text-xl text-white">Go Elite</Heading>
                <Text className="font-body text-xs text-white/75 leading-relaxed">
                  Unlock AI matchmaking, unlimited swipes & more.
                </Text>
              </VStack>
              <View className="w-10 h-10 rounded-full bg-white/15 items-center justify-center ml-4">
                <ChevronRight size={20} color="#fff" />
              </View>
            </HStack>
          </LinearGradient>
        </TouchableOpacity>

        )}

        {/* Account Menu */}
        <VStack className="px-6 mb-8 space-y-2">
          <Text className="font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-bold mb-2">Account</Text>
          
          <TouchableOpacity className="flex-row items-center justify-between py-4 border-b border-surface-container-low">
             <HStack className="items-center space-x-4">
                <View className="w-10 h-10 bg-surface-container-low rounded-xl items-center justify-center">
                   <ShieldCheck size={18} color="#afadac" />
                </View>
                <Text className="font-body text-sm font-bold text-on-surface">Security & Privacy</Text>
             </HStack>
             <ChevronRight size={18} color="#afadac" />
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center justify-between py-4 border-b border-surface-container-low">
             <HStack className="items-center space-x-4">
                <View className="w-10 h-10 bg-surface-container-low rounded-xl items-center justify-center">
                   <Activity size={18} color="#afadac" />
                </View>
                <Text className="font-body text-sm font-bold text-on-surface">Push Notifications</Text>
             </HStack>
             <ChevronRight size={18} color="#afadac" />
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center justify-between py-4 border-b border-surface-container-low"
            onPress={() => router.push('/subscription')}
          >
             <HStack className="items-center space-x-4">
                <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: '#414BEA15' }}>
                   <Crown size={18} color="#414BEA" />
                </View>
                <Text className="font-body text-sm font-bold text-on-surface">Subscription & Plans</Text>
             </HStack>
             <ChevronRight size={18} color="#afadac" />
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center justify-between py-4 border-b border-surface-container-low"
            onPress={() => router.push('/favorites' as Href)}
          >
             <HStack className="items-center space-x-4">
                <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: '#b4134015' }}>
                   <Heart size={18} color="#b41340" />
                </View>
                <Text className="font-body text-sm font-bold text-on-surface">My Favorites</Text>
             </HStack>
             <ChevronRight size={18} color="#afadac" />
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center justify-between py-4 border-b border-surface-container-low"
            onPress={() => router.push('/wishlists' as Href)}
          >
             <HStack className="items-center space-x-4">
                <View className="w-10 h-10 rounded-xl items-center justify-center" style={{ backgroundColor: '#414BEA15' }}>
                   <List size={18} color="#414BEA" />
                </View>
                <Text className="font-body text-sm font-bold text-on-surface">My Wishlists</Text>
             </HStack>
             <ChevronRight size={18} color="#afadac" />
          </TouchableOpacity>

          <TouchableOpacity 
            className="flex-row items-center justify-between py-4"
            onPress={logout}
          >
             <HStack className="items-center space-x-4">
                <View className="w-10 h-10 bg-error/10 rounded-xl items-center justify-center">
                   <LogOut size={18} color="#b41340" />
                </View>
                <Text className="font-body text-sm font-bold text-error">Logout</Text>
             </HStack>
             <ChevronRight size={18} color="#b41340" />
          </TouchableOpacity>
        </VStack>

      </ScrollView>
    </Box>
  );
}
