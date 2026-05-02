import React, { useState, useRef, useEffect } from 'react';
import { ScrollView, TextInput, KeyboardAvoidingView, Platform, Pressable, View, TouchableOpacity } from 'react-native';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Heading } from '@/components/ui/heading';
import { Image } from '@/components/ui/image';
import { ArrowLeft, Video, Phone, Plus, Mic, Send, Flag } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useChatStore } from '@/src/store/chatStore';
import { useAuthStore } from '@/src/store/authStore';
import { apiGet } from '@/src/lib/api';
import ReportSheet from '@/src/components/ReportSheet';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';
export default function ChatThreadScreen() {
  const router = useRouter();
  const { id, name, image, isActive } = useLocalSearchParams<{ id: string; name: string; image: string; isActive: string }>();
  
  const [inputText, setInputText] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);
  const { messages, sendMessage, setTyping, connectSocket, typingUsers, markRead } = useChatStore();
  const currentUser = useAuthStore((s) => s.user);

  const isUserActive = isActive === 'true';
  const partnerIsTyping = typingUsers[id as string] ?? false;
  const [reportVisible, setReportVisible] = useState(false);

  useEffect(() => {
    // Ensure socket is connected with auth token
    connectSocket();
  }, []);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!id) return;
      try {
        const res = await apiGet(`/api/v1/chat/messages/${id}`);
        const json = await res.json();
        if (json.success && json.data.messages) {
           const formatted = json.data.messages.reverse().map((m: any) => ({
             id: m.id,
             text: m.content || '',
             time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
             isSender: m.from_user === currentUser?.id
           }));
           setHistory(formatted);
        }
      } catch (err) {
        console.error('Failed to load chat history:', err);
      }
    };
    fetchHistory();
  }, [id]);

  const handleSend = () => {
    if (inputText.trim()) {
      sendMessage(id as string, inputText.trim());
      setTyping(id as string, false); // stop typing indicator
      setInputText('');
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <KeyboardAvoidingView 
        className="flex-1" 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Chat Header */}
        <HStack className="px-6 py-4 items-center justify-between bg-surface border-b border-surface-container-low z-10">
          <HStack className="items-center space-x-4">
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft size={24} color="#2f2f2e" />
            </TouchableOpacity>
            
            <HStack className="items-center space-x-3">
              <Box className="w-10 h-10 relative">
                <Image source={{ uri: image }} className="w-full h-full rounded-full" alt="Profile" />
                {isUserActive && (
                  <Box className="absolute top-0 right-0 w-3 h-3 bg-primary border-2 border-surface rounded-full" />
                )}
              </Box>
              <VStack>
                <Heading className="font-headline text-base font-bold text-on-surface leading-tight">{name}</Heading>
                <Text className="font-body text-[10px] text-primary uppercase tracking-widest font-bold">Active Now</Text>
              </VStack>
            </HStack>
          </HStack>

          <HStack space="md" className="items-center">
            <TouchableOpacity className="p-2">
              <Video size={20} color="#afadac" />
            </TouchableOpacity>
            <TouchableOpacity className="p-2">
              <Phone size={20} color="#afadac" />
            </TouchableOpacity>
            <TouchableOpacity className="p-2" onPress={() => setReportVisible(true)}>
              <Flag size={20} color="#afadac" />
            </TouchableOpacity>
          </HStack>
        </HStack>

        {/* Message Thread */}
        <ScrollView 
          className="flex-1 px-6"
          ref={scrollViewRef}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingVertical: 24 }}
        >
          <VStack space="lg">
            {history.map((msg) => (
              <Box key={msg.id} className={`flex-row ${msg.isSender ? 'justify-end' : 'justify-start'}`}>
                <VStack space="xs" className="max-w-[75%]">
                  <Box className={`p-4 rounded-2xl ${
                    msg.isSender 
                      ? 'signature-gradient rounded-br-none shadow-lg shadow-primary/20' 
                      : 'bg-surface-container-high rounded-bl-none'
                  }`}>
                    <Text className={`font-body text-sm leading-relaxed ${
                      msg.isSender ? 'text-white' : 'text-on-surface'
                    }`}>
                      {msg.text}
                    </Text>
                  </Box>
                  <Text className={`font-body text-[10px] text-on-surface-variant ${
                    msg.isSender ? 'text-right' : 'text-left'
                  }`}>
                    {msg.time}
                  </Text>
                </VStack>
              </Box>
            ))}

            {/* Typing Indicator */}
            {partnerIsTyping && (
              <Box className="flex-row justify-start mt-2">
                <Box className="px-4 py-3 bg-surface-container-high rounded-2xl rounded-bl-none">
                  <HStack space="xs" className="items-center">
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#afadac' }} />
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#afadac' }} />
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#afadac' }} />
                  </HStack>
                </Box>
              </Box>
            )}
            {messages.filter(m => m.toUserId === id || m.fromUserId === id).map((msg) => {
               const isSender = msg.fromUserId === currentUser?.id;
               return (
               <Box key={msg.id} className={`flex-row ${isSender ? 'justify-end' : 'justify-start'}`}>
                  <VStack space="xs" className="max-w-[75%] mt-4">
                    <Box className={`p-4 rounded-2xl ${
                      isSender 
                        ? 'signature-gradient rounded-br-none shadow-lg shadow-primary/20' 
                        : 'bg-surface-container-high rounded-bl-none'
                    }`}>
                      <Text className={`font-body text-sm leading-relaxed ${isSender ? 'text-white' : 'text-on-surface'}`}>{msg.content}</Text>
                    </Box>
                    <Text className={`font-body text-[10px] text-on-surface-variant ${isSender ? 'text-right' : 'text-left'}`}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </VStack>
               </Box>
               );
            })}
          </VStack>
        </ScrollView>

        {/* Message Input Area */}
        <Box className="px-4 py-4 bg-surface border-t border-surface-container-low pb-10">
          <HStack className="items-center space-x-3">
            <TouchableOpacity className="w-10 h-10 items-center justify-center rounded-full bg-surface-container-low">
              <Plus size={20} color="#afadac" />
            </TouchableOpacity>
            
            <HStack className="flex-1 bg-surface-container-low rounded-full items-center px-4 py-1">
              <TextInput 
                className="flex-1 py-2 font-body text-sm text-on-surface" 
                placeholder="Write a message..."
                placeholderTextColor="#afadac"
                multiline
                value={inputText}
                onChangeText={(text) => {
                  setInputText(text);
                  setTyping(id as string, text.length > 0);
                }}
                onBlur={() => setTyping(id as string, false)}
              />
              <TouchableOpacity>
                <Mic size={20} color="#afadac" />
              </TouchableOpacity>
            </HStack>

            <TouchableOpacity 
               className={`w-12 h-12 rounded-full items-center justify-center shadow-lg transition-all ${
                 inputText.trim() ? 'signature-gradient shadow-primary/30' : 'bg-surface-container-low shadow-none'
               }`}
               onPress={handleSend}
            >
               <Send size={20} color={inputText.trim() ? 'white' : '#afadac'} fill={inputText.trim() ? 'white' : 'transparent'} />
            </TouchableOpacity>
          </HStack>
        </Box>
      </KeyboardAvoidingView>

      {/* Report Sheet */}
      <ReportSheet
        visible={reportVisible}
        targetId={id as string}
        targetName={name as string}
        onClose={() => setReportVisible(false)}
      />
    </SafeAreaView>
  );
}
