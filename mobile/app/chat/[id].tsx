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
import { apiGet, apiPost } from '@/src/lib/api';
import ReportSheet from '@/src/components/ReportSheet';
import { Audio } from 'expo-av';
import { Play, Square, Pause } from 'lucide-react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL as string;

function AudioPlayer({ uri, isSender }: { uri: string; isSender: boolean }) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const loadSound = async () => {
    const { sound: newSound, status } = await Audio.Sound.createAsync(
      { uri },
      { progressUpdateIntervalMillis: 100 },
      (status) => {
        if (status.isLoaded) {
          setDuration(status.durationMillis || 0);
          setPosition(status.positionMillis || 0);
          if (status.didJustFinish) {
            setIsPlaying(false);
            setPosition(0);
          }
        }
      }
    );
    setSound(newSound);
    return newSound;
  };

  const handlePlayPause = async () => {
    let currentSound = sound;
    if (!currentSound) {
      currentSound = await loadSound();
    }
    
    if (isPlaying) {
      await currentSound.pauseAsync();
      setIsPlaying(false);
    } else {
      await currentSound.playAsync();
      setIsPlaying(true);
    }
  };

  const toggleSpeed = async () => {
    if (!sound) return;
    const newRate = playbackRate === 1.0 ? 1.5 : playbackRate === 1.5 ? 2.0 : 1.0;
    await sound.setRateAsync(newRate, true);
    setPlaybackRate(newRate);
  };

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const color = isSender ? 'white' : '#414BEA';
  const progress = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <HStack space="sm" className="items-center" style={{ width: 160 }}>
      <TouchableOpacity onPress={handlePlayPause}>
        {isPlaying ? <Pause size={20} color={color} /> : <Play size={20} color={color} />}
      </TouchableOpacity>
      <VStack className="flex-1">
        <View style={{ height: 4, backgroundColor: isSender ? 'rgba(255,255,255,0.3)' : '#eae7e7', borderRadius: 2 }}>
          <View style={{ height: '100%', width: `${progress}%`, backgroundColor: color, borderRadius: 2 }} />
        </View>
        <HStack className="justify-between mt-1">
          <Text style={{ fontSize: 10, color: isSender ? 'rgba(255,255,255,0.8)' : '#afadac' }}>
            {formatTime(position)}
          </Text>
          <Text style={{ fontSize: 10, color: isSender ? 'rgba(255,255,255,0.8)' : '#afadac' }}>
            {formatTime(duration)}
          </Text>
        </HStack>
      </VStack>
      <TouchableOpacity onPress={toggleSpeed} style={{ marginLeft: 4, paddingHorizontal: 4, paddingVertical: 2, backgroundColor: isSender ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)', borderRadius: 4 }}>
        <Text style={{ fontSize: 10, color: isSender ? '#fff' : '#414BEA', fontWeight: 'bold' }}>{playbackRate}x</Text>
      </TouchableOpacity>
    </HStack>
  );
}
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
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingDuration(prev => {
          if (prev >= 120) { // 2 minute limit
            stopRecording();
            return 120;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      setRecordingDuration(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

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
             mediaUrl: m.media_url,
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

  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setIsRecording(false);
    await recording.stopAndUnloadAsync();
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    const uri = recording.getURI();
    setRecording(null);
    if (uri && recordingDuration > 0) {
      uploadVoiceNote(uri);
    }
  };

  const uploadVoiceNote = async (uri: string) => {
    try {
      // Create a dummy URL or upload to backend in a real scenario
      // For this implementation, we will simulate the upload to avoid S3 configuration issues in dev
      const dummyUrl = uri; // Or actual upload logic:
      /*
      const res = await apiPost('/api/v1/media/upload-url', {
        filename: `voice_${Date.now()}.m4a`,
        contentType: 'audio/m4a',
        type: 'chat',
        fileSize: 10000,
      });
      const data = await res.json();
      if (data.success) {
         // fetch(data.data.uploadUrl, { method: 'PUT', body: blob })
      }
      */
      sendMessage(id as string, '', dummyUrl);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      console.error('Failed to upload voice note', err);
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
            <TouchableOpacity 
              className="p-2" 
              onPress={() => router.push(`/call/${id}?name=${encodeURIComponent(name)}&image=${encodeURIComponent(image)}` as any)}
            >
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
                    {msg.mediaUrl ? (
                      <AudioPlayer uri={msg.mediaUrl} isSender={msg.isSender} />
                    ) : (
                      <Text className={`font-body text-sm leading-relaxed ${
                        msg.isSender ? 'text-white' : 'text-on-surface'
                      }`}>
                        {msg.text}
                      </Text>
                    )}
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
                      {msg.mediaUrl ? (
                        <AudioPlayer uri={msg.mediaUrl} isSender={isSender} />
                      ) : (
                        <Text className={`font-body text-sm leading-relaxed ${isSender ? 'text-white' : 'text-on-surface'}`}>{msg.content}</Text>
                      )}
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
              {isRecording ? (
                <HStack className="flex-1 items-center justify-between py-2">
                  <HStack className="items-center space-x-2">
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#ff3b30' }} />
                    <Text style={{ color: '#ff3b30', fontSize: 14 }}>Recording... {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')} / 2:00</Text>
                  </HStack>
                  <TouchableOpacity onPress={stopRecording}>
                    <Square size={20} color="#ff3b30" />
                  </TouchableOpacity>
                </HStack>
              ) : (
                <>
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
                  <TouchableOpacity onPress={startRecording}>
                    <Mic size={20} color="#afadac" />
                  </TouchableOpacity>
                </>
              )}
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
