import React from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Image } from '@/components/ui/image';
import { Button, ButtonText } from '@/components/ui/button';
import { useAuthStore } from '@/src/store/authStore';
import { Settings, Pencil, ShieldCheck, Activity, Sparkles, ChevronRight, LogOut } from 'lucide-react-native';

export default function ProfileScreen() {
  const logout = useAuthStore(state => state.logout);
  const user = useAuthStore(state => state.user);

  const INTERESTS = ['Design', 'Crypto', 'Synthesizers', 'Brutalism', 'Vinyl'];

  return (
    <Box className="flex-1 bg-surface">
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Header */}
        <HStack className="justify-between items-center px-6 pt-12 pb-6">
          <Heading className="font-headline text-2xl font-bold tracking-tighter text-on-surface">My Profile</Heading>
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
            <Heading className="font-headline text-2xl font-bold text-on-surface">Alexander, 28</Heading>
            <Text className="font-body text-sm text-on-surface-variant font-medium">Product Designer at Minglex</Text>
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
                <ShieldCheck size={18} color="#414BEA" />
                <Text className="font-label text-[10px] uppercase tracking-widest text-primary font-bold">Verified</Text>
              </HStack>
              <Text className="font-headline text-lg font-bold text-on-surface">Safe Profile</Text>
            </Box>
            
            <Box className="flex-1 bg-surface-container-low p-4 rounded-2xl border border-surface-container-high">
              <HStack className="items-center space-x-3 mb-2">
                <Activity size={18} color="#afadac" />
                <Text className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Activity</Text>
              </HStack>
              <Text className="font-headline text-lg font-bold text-on-surface">24 Matches</Text>
            </Box>
          </HStack>

          <Box className="w-full bg-surface-container-low p-5 rounded-2xl border border-surface-container-high">
            <HStack className="justify-between items-center mb-3">
              <HStack className="items-center space-x-3">
                <Sparkles size={18} color="#414BEA" />
                <Text className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Profile Completion</Text>
              </HStack>
              <Text className="font-headline text-sm font-bold text-primary">85%</Text>
            </HStack>
            <Box className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden">
               <Box className="h-full signature-gradient w-[85%]" />
            </Box>
          </Box>
        </VStack>

        {/* Personality Section */}
        <VStack className="px-6 mb-8 space-y-4">
           <Text className="font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-bold">Personality</Text>
           <HStack className="flex-wrap gap-2">
             {INTERESTS.map((interest) => (
               <Box key={interest} className="px-4 py-2 bg-surface-container-lowest border border-surface-container-high rounded-full">
                  <Text className="font-body text-xs text-on-surface-variant font-medium">#{interest}</Text>
               </Box>
             ))}
           </HStack>
        </VStack>

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
