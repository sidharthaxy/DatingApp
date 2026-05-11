import React, { useEffect } from 'react';
import { ScrollView, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Heading } from '@/components/ui/heading';
import { Image } from '@/components/ui/image';
import { Search, Plus, Play } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useChatStore } from '@/src/store/chatStore';
import { useAuthStore } from '@/src/store/authStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiGet } from '@/src/lib/api';

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200';
const API_URL = process.env.EXPO_PUBLIC_API_URL as string;

function getPartnerImage(partner: any): string {
  const raw = partner.photos?.[0]?.url;
  if (!raw) return PLACEHOLDER_IMAGE;
  return raw.startsWith('http') ? raw : `${API_URL}/${raw}`;
}

function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function ChatScreen() {
  const router = useRouter();
  const { conversations, fetchConversations, activeUsers, isConnected, connectSocket } = useChatStore();
  const user = useAuthStore((s) => s.user);

  const [stories, setStories] = React.useState<any[]>([]);

  useEffect(() => {
    // Ensure socket is connected (with auth token) when user enters chat tab
    connectSocket();
    fetchConversations();
    fetchStories();
  }, []);

  const fetchStories = async () => {
    try {
      const res = await apiGet('/api/v1/social/stories');
      const data = await res.json();
      if (data.success) {
        setStories(data.data.stories);
      }
    } catch (err) {
      console.error('Failed to fetch stories:', err);
    }
  };

  // Separate: conversations with messages (Recent Chats) vs no messages yet (New Matches)
  const newMatches = conversations.filter((c) => !c.lastMessage);
  const recentChats = conversations.filter((c) => !!c.lastMessage);

  const navigateToChat = (conv: typeof conversations[0]) => {
    router.push({
      pathname: '/chat/[id]',
      params: {
        id: conv.partner.id,
        name: conv.partner.first_name || 'User',
        image: getPartnerImage(conv.partner),
        isActive: activeUsers.includes(conv.partner.id) ? 'true' : 'false',
      },
    });
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#f9f6f5' }}>
      <Box className="flex-1 bg-surface">
        <ScrollView showsVerticalScrollIndicator={false} className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>

          {/* Header */}
          <HStack className="justify-between items-center px-6 pt-6 pb-6">
            <Heading className="font-headline text-3xl font-bold tracking-tighter text-on-surface">Messages</Heading>
            <HStack space="md" className="items-center">
              {isConnected && (
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#4CAF50' }} />
              )}
              <TouchableOpacity className="p-2">
                <Search size={24} color="#2f2f2e" />
              </TouchableOpacity>
            </HStack>
          </HStack>

          {/* Stories Section */}
          <VStack space="md" className="mb-6 mt-2">
            <Text className="px-6 font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-bold">
              Stories
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 24, paddingRight: 12 }}>
              <HStack space="lg">
                {/* Add Story Button */}
                <TouchableOpacity className="items-center">
                  <View className="w-16 h-16 rounded-full border border-dashed border-primary items-center justify-center mb-1">
                    <Plus size={24} color="#414BEA" />
                  </View>
                  <Text className="font-label text-[10px] text-on-surface-variant">Add Story</Text>
                </TouchableOpacity>

                {/* Render Fetched Stories */}
                {stories.map(story => (
                  <TouchableOpacity key={story.id} className="items-center" onPress={() => {}}>
                    <View className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-primary to-purple-500 mb-1">
                      <Image 
                        source={{ uri: story.user?.photos?.[0]?.url?.startsWith('http') ? story.user.photos[0].url : `${API_URL}/${story.user?.photos?.[0]?.url}` || PLACEHOLDER_IMAGE }}
                        className="w-full h-full rounded-full border-2 border-surface"
                        alt="Story"
                      />
                    </View>
                    <Text className="font-label text-[10px] text-on-surface font-bold">{story.user?.first_name || 'User'}</Text>
                  </TouchableOpacity>
                ))}
              </HStack>
            </ScrollView>
          </VStack>

          {conversations.length === 0 ? (
            <Box className="flex-1 items-center justify-center py-24">
              <ActivityIndicator color="#414BEA" />
              <Text className="text-on-surface-variant font-body mt-4">Loading matches…</Text>
            </Box>
          ) : (
            <>
              {/* New Matches — no messages yet */}
              {newMatches.length > 0 && (
                <VStack space="md" className="mb-8">
                  <Text className="px-6 font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-bold">
                    New Matches
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 24, paddingRight: 12 }}>
                    <HStack space="lg">
                      {newMatches.map((match) => {
                        const isOnline = activeUsers.includes(match.partner.id);
                        return (
                          <TouchableOpacity key={match.match_id} onPress={() => navigateToChat(match)}>
                            <VStack className="items-center" space="xs">
                              <Box className="w-16 h-16 rounded-full p-0.5 border-2 border-primary shadow-lg shadow-primary/20 relative">
                                <Image
                                  source={{ uri: getPartnerImage(match.partner) }}
                                  className="w-full h-full rounded-full"
                                  alt={match.partner.first_name || 'User'}
                                />
                                {isOnline && (
                                  <View className="absolute bottom-0 right-0 w-4 h-4 signature-gradient rounded-full border-2 border-surface" />
                                )}
                              </Box>
                              <Text className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest mt-1">
                                {match.partner.first_name || 'User'}
                              </Text>
                            </VStack>
                          </TouchableOpacity>
                        );
                      })}
                    </HStack>
                  </ScrollView>
                </VStack>
              )}

              {/* Recent Chats — conversations with messages */}
              {recentChats.length > 0 && (
                <VStack space="xs">
                  <Text className="px-6 font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant font-bold mb-4">
                    Messages
                  </Text>
                  {recentChats.map((chat) => {
                    const isOnline = activeUsers.includes(chat.partner.id);
                    const isMine = chat.lastMessage?.from_user === user?.id;
                    return (
                      <TouchableOpacity key={chat.match_id} onPress={() => navigateToChat(chat)}>
                        <HStack className="px-6 py-4 items-center space-x-4 border-b border-surface-container-low/50">
                          <Box className="relative w-14 h-14">
                            <Image
                              source={{ uri: getPartnerImage(chat.partner) }}
                              className="w-full h-full rounded-full"
                              alt={chat.partner.first_name || 'User'}
                            />
                            {isOnline && (
                              <Box className="absolute top-0 right-0 w-3.5 h-3.5 signature-gradient border-2 border-surface rounded-full" />
                            )}
                          </Box>

                          <VStack className="flex-1 justify-center">
                            <HStack className="justify-between items-baseline mb-1">
                              <Text className="font-headline text-base font-bold text-on-surface">
                                {chat.partner.first_name || 'User'}
                              </Text>
                              <Text className="font-body text-[10px] text-on-surface-variant">
                                {timeAgo(chat.lastMessage?.created_at)}
                              </Text>
                            </HStack>
                            <Text
                              className="font-body text-sm text-on-surface-variant leading-tight flex-1 mr-4"
                              numberOfLines={1}
                            >
                              {isMine ? 'You: ' : ''}{chat.lastMessage?.content || ''}
                            </Text>
                          </VStack>
                        </HStack>
                      </TouchableOpacity>
                    );
                  })}
                </VStack>
              )}

              {/* No chats at all */}
              {conversations.length > 0 && recentChats.length === 0 && newMatches.length === 0 && (
                <Box className="items-center py-16">
                  <Text className="text-on-surface-variant font-body">No matches yet. Keep swiping!</Text>
                </Box>
              )}
            </>
          )}
        </ScrollView>
      </Box>
    </SafeAreaView>
  );
}
