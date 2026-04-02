import React from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Heading } from '@/components/ui/heading';
import { Image } from '@/components/ui/image';
import { Search } from 'lucide-react-native';

const NEW_MATCHES = [
  { id: 'm1', name: 'Elena', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuATG4NFvVudzlklxSnu4hEuN49G2lrM7L8wdg7Bl9-amQAaTlR-ql9qNUA93Xk4gQ3gUPCArMXQGUR6QGS2oy_gIkf606pFbjS1d2Zn4V2SYGPCfKhqfJX8qV9qCLhanReTP1p_Rwe461O2Z80N0P23TzbNff56fVH53TAlA6TKSyWfbslOdtpidKFYy6NwiuShXZz8hP8MCleh04A_nLxZCFzA9shOp-S7LN9r_foNA-bnq554laCAEZGmRJjD0wCSkqm_7rqUUuA' },
  { id: 'm2', name: 'Marcus', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB5lLx8sb-dC3meTo76_5we1U6IpVzXzXc6J8UcE9PlklvaaSxDvdeoIHCpHyvc2uC0b_lYRuaPZm42aHMgqnY43O6-3VCQuP6TOQqjLatB4V7L8cLNVltkbKspQeq8H2ddRDoqKPcnlECXuejh2PGG7-nQQ3bRn_ivbSWZENxEniOvT_sJi4aXVvK_iq2PyxA3V0KBnSckxamyo4S1Ic3LAwHE7bppyvPrm9je_hoo22HQFD5LsK0tjTKRnES8KQ_z_wh1dQTgJd4' },
  { id: 'm3', name: 'Sara', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDPD7u67S2m7B7PZ9hWjgfy1f2Pkxz6v480AGVGCdtGLBA16ZGWTY1ERkCTsIr7B7PzB2EDHpduRaw-EbkOoeZT5ewdbgJ0zI7OEa_Uux0pX12yJ5wib2m0twO5pNPyCRlQVV1RMA7kcNf87sN3_nasoge4mxoawJl0oOMkY0XzTOntvG-4OUnHVOqvWzi0rVsOGBLKhz2FrcRvY4ZQzUV6pZNZ6xG4bpueULL170sv704xlDpNhhkKhsZHnXw4uEmZ4xqyII' }
];

const RECENT_CHATS = [
  { id: '1', name: 'Sophie Walters', lastMessage: 'That restaurant sounds amazing! I\'ve been wanting...', time: '2m ago', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuATG4NFvVudzlklxSnu4hEuN49G2lrM7L8wdg7Bl9-amQAaTlR-ql9qNUA93Xk4gQ3gUPCArMXQGUR6QGS2oy_gIkf606pFbjS1d2Zn4V2SYGPCfKhqfJX8qV9qCLhanReTP1p_Rwe461O2Z80N0P23TzbNff56fVH53TAlA6TKSyWfbslOdtpidKFYy6NwiuShXZz8hP8MCleh04A_nLxZCFzA9shOp-S7LN9r_foNA-bnq554laCAEZGmRJjD0wCSkqm_7rqUUuA', isOnline: true, unread: 2 },
  { id: '2', name: 'Alex Rivera', lastMessage: 'See you there at 8 then? ☕️', time: '1h ago', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB5lLx8sb-dC3meTo76_5we1U6IpVzXzXc6J8UcE9PlklvaaSxDvdeoIHCpHyvc2uC0b_lYRuaPZm42aHMgqnY43O6-3VCQuP6TOQqjLatB4V7L8cLNVltkbKspQeq8H2ddRDoqKPcnlECXuejh2PGG7-nQQ3bRn_ivbSWZENxEniOvT_sJi4aXVvK_iq2PyxA3V0KBnSckxamyo4S1Ic3LAwHE7bppyvPrm9je_hoo22HQFD5LsK0tjTKRnES8KQ_z_wh1dQTgJd4', isOnline: false, unread: 0 },
  { id: '3', name: 'Jordan Kim', lastMessage: 'Haha, no way! I grew up in that s...', time: 'Yesterday', image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDPD7u67S2m7B7PZ9hWjgfy1f2Pkxz6v480AGVGCdtGLBA16ZGWTY1ERkCTsIr7B7PzB2EDHpduRaw-EbkOoeZT5ewdbgJ0zI7OEa_Uux0pX12yJ5wib2m0twO5pNPyCRlQVV1RMA7kcNf87sN3_nasoge4mxoawJl0oOMkY0XzTOntvG-4OUnHVOqvWzi0rVsOGBLKhz2FrcRvY4ZQzUV6pZNZ6xG4bpueULL170sv704xlDpNhhkKhsZHnXw4uEmZ4xqyII', isOnline: true, unread: 0 }
];

export default function ChatScreen() {
  return (
    <Box className="flex-1 bg-surface">
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Header */}
        <HStack className="justify-between items-center px-6 pt-12 pb-6">
          <Heading className="font-headline text-3xl font-bold tracking-tighter text-on-surface">Messages</Heading>
          <TouchableOpacity className="p-2">
            <Search size={24} color="#2f2f2e" />
          </TouchableOpacity>
        </HStack>

        {/* New Matches Section */}
        <VStack space="md" className="mb-8">
          <Text className="px-6 font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-bold">New Matches</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 24, paddingRight: 12 }}>
            <HStack space="lg">
              {NEW_MATCHES.map((match) => (
                <VStack key={match.id} className="items-center" space="xs">
                  <Box className="w-16 h-16 rounded-full p-0.5 border-2 border-primary shadow-lg shadow-primary/20 relative">
                    <Image source={{ uri: match.image }} className="w-full h-full rounded-full" alt={match.name} />
                    <View className="absolute bottom-0 right-0 w-4 h-4 signature-gradient rounded-full border-2 border-surface" />
                  </Box>
                  <Text className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest mt-1">{match.name}</Text>
                </VStack>
              ))}
            </HStack>
          </ScrollView>
        </VStack>

        {/* Recent Chats Section */}
        <VStack space="xs">
          <Text className="px-6 font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-bold mb-4">Messages</Text>
          {RECENT_CHATS.map((chat) => (
            <TouchableOpacity key={chat.id}>
              <HStack className="px-6 py-4 items-center space-x-4 border-b border-surface-container-low/50">
                <Box className="relative w-14 h-14">
                  <Image source={{ uri: chat.image }} className="w-full h-full rounded-full" alt={chat.name} />
                  {chat.isOnline && (
                    <Box className="absolute top-0 right-0 w-3.5 h-3.5 signature-gradient border-2 border-surface rounded-full" />
                  )}
                </Box>
                
                <VStack className="flex-1 justify-center">
                  <HStack className="justify-between items-baseline mb-1">
                    <Text className="font-headline text-base font-bold text-on-surface">{chat.name}</Text>
                    <Text className="font-body text-[10px] text-on-surface-variant">{chat.time}</Text>
                  </HStack>
                  <HStack className="justify-between items-center">
                    <Text className="font-body text-sm text-on-surface-variant leading-tight flex-1 mr-4" numberOfLines={1}>
                      {chat.lastMessage}
                    </Text>
                    {chat.unread > 0 && (
                      <Box className="w-5 h-5 signature-gradient rounded-full items-center justify-center">
                        <Text className="text-[10px] font-bold text-white">{chat.unread}</Text>
                      </Box>
                    )}
                  </HStack>
                </VStack>
              </HStack>
            </TouchableOpacity>
          ))}
        </VStack>

      </ScrollView>
    </Box>
  );
}
