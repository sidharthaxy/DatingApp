import React from 'react';
import { ScrollView } from 'react-native';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Heading } from '@/components/ui/heading';
import { Image } from '@/components/ui/image';

const DUMMY_CHATS = [
  { id: '1', name: 'Aisha', lastMessage: 'Hey! How are you doing?', time: '2m ago', image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150&h=150', unread: 2 },
  { id: '2', name: 'Rohan', lastMessage: 'That sounds like a great plan 😅', time: '1h ago', image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=150&h=150', unread: 0 },
  { id: '3', name: 'Priya', lastMessage: 'See you tomorrow!', time: 'Yesterday', image: 'https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?auto=format&fit=crop&q=80&w=150&h=150', unread: 0 },
];

export default function ChatScreen() {
  return (
    <Box className="flex-1 bg-background-dark p-4">
      <Heading className="text-typography-0 font-poppins font-bold text-2xl mt-8 mb-6">Messages</Heading>

      <ScrollView showsVerticalScrollIndicator={false}>
        <VStack space="xl">
          {DUMMY_CHATS.map((chat) => (
            <HStack key={chat.id} className="items-center bg-background-dark-800 p-3 rounded-2xl">
              <Image 
                source={{ uri: chat.image }} 
                className="w-14 h-14 rounded-full mr-4"
                alt={`${chat.name} profile`} 
              />
              
              <VStack className="flex-1 justify-center">
                <HStack className="justify-between items-center mb-1">
                  <Heading size="md" className="text-white font-poppins">{chat.name}</Heading>
                  <Text className="text-gray-500 text-xs font-poppins">{chat.time}</Text>
                </HStack>
                <HStack className="justify-between items-center">
                  <Text className="text-gray-400 font-poppins text-sm truncate pr-4" numberOfLines={1}>
                    {chat.lastMessage}
                  </Text>
                  {chat.unread > 0 && (
                    <Box className="bg-primary-500 w-5 h-5 rounded-full items-center justify-center">
                      <Text className="text-white text-xs font-bold">{chat.unread}</Text>
                    </Box>
                  )}
                </HStack>
              </VStack>
            </HStack>
          ))}
        </VStack>
      </ScrollView>
    </Box>
  );
}
