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
import { apiGet, apiUpload, apiJson } from '@/src/lib/api';
import { mediaUrl } from '@/src/lib/config';
import ReportSheet from '@/src/components/ReportSheet';
import { Audio } from 'expo-av';
import { Play, Square, Pause } from 'lucide-react-native';


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
      { uri: mediaUrl(uri, uri) },
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
    try {
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
    } catch (err) {
      console.warn('Could not play voice note', err);
      setIsPlaying(false);
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

  const [sendError, setSendError] = useState('');
  const [uploadingVoice, setUploadingVoice] = useState(false);
  const MAX_VOICE_SECONDS = 120; // 2 minute limit

  // Tick the recording timer
  useEffect(() => {
    if (!isRecording) {
      setRecordingDuration(0);
      return;
    }
    const interval = setInterval(() => setRecordingDuration(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [isRecording]);

  // Enforce the limit from an effect (side effects don't belong inside a state updater)
  useEffect(() => {
    if (isRecording && recordingDuration >= MAX_VOICE_SECONDS) stopRecording();
  }, [isRecording, recordingDuration]);

  useEffect(() => {
    // Ensure socket is connected with auth token
    connectSocket();
  }, []);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!id) return;
      try {
        const res = await apiGet(`/api/v1/chat/messages/${id}?limit=100`);
        const json = await res.json();
        if (json.success && json.data.messages) {
           const formatted = [...json.data.messages].reverse().map((m: any) => ({
             id: m.id,
             text: m.content || '',
             mediaUrl: m.media_url,
             createdAt: m.created_at,
             isDeleted: !!m.is_deleted,
             isSender: m.from_user === currentUser?.id
           }));
           setHistory(formatted);
           // Let the sender know their messages were seen
           json.data.messages
             .filter((m: any) => m.to_user === currentUser?.id && !m.is_read)
             .forEach((m: any) => markRead(m.id));
        } else if (!json.success) {
          setSendError(json.error?.message || 'Could not load this conversation.');
        }
      } catch (err) {
        console.error('Failed to load chat history:', err);
        setSendError("Can't reach the server. Messages will appear when you're back online.");
      }
    };
    fetchHistory();
  }, [id]);

  // History (loaded once over HTTP) + live messages (socket), without showing anything twice
  const historyIds = new Set(history.map((m) => m.id));
  const thread = [
    ...history,
    ...messages
      .filter((m) => (m.toUserId === id || m.fromUserId === id) && !historyIds.has(m.id))
      .map((m) => ({
        id: m.id,
        text: m.content || '',
        mediaUrl: m.mediaUrl,
        createdAt: m.createdAt,
        isDeleted: !!m.is_deleted,
        isSender: m.fromUserId === currentUser?.id,
      })),
  ];

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const handleSend = () => {
    const text = inputText.trim();
    if (!text) return;
    if (!useChatStore.getState().socket?.connected) {
      setSendError('Reconnecting to chat… try again in a moment.');
      connectSocket();
      return;
    }
    setSendError('');
    sendMessage(id as string, text);
    setTyping(id as string, false); // stop typing indicator
    setInputText('');
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const startRecording = async () => {
    try {
      setSendError('');
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        setSendError('Microphone access is needed to record a voice note.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording', err);
      setSendError('Could not start recording on this device.');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    const seconds = recordingDuration;
    setIsRecording(false);
    setRecording(null);
    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    } catch (err) {
      console.warn('Failed to stop recording cleanly', err);
    }
    const uri = recording.getURI();
    if (uri && seconds > 0) {
      uploadVoiceNote(uri);
    }
  };

  // Uploads the recording so the OTHER person can actually play it — a local file:// or
  // blob: URI only ever existed on the sender's device.
  const uploadVoiceNote = async (uri: string) => {
    setUploadingVoice(true);
    try {
      const form = new FormData();
      if (Platform.OS === 'web') {
        const blob = await (await fetch(uri)).blob();
        const isMp4 = blob.type.includes('mp4');
        form.append('file', new Blob([blob], { type: isMp4 ? 'audio/mp4' : 'audio/webm' }), isMp4 ? 'voice.m4a' : 'voice.webm');
      } else {
        const ext = (uri.split('?')[0].split('.').pop() || 'm4a').toLowerCase();
        const type = ext === 'caf' ? 'audio/x-caf' : ext === '3gp' ? 'audio/3gpp' : ext === 'webm' ? 'audio/webm' : 'audio/mp4';
        // @ts-ignore — React Native's FormData accepts { uri, name, type }
        form.append('file', { uri, name: `voice.${ext}`, type });
      }
      const uploaded = await apiJson<{ url: string }>(apiUpload('/api/v1/media/chat-upload', form));
      sendMessage(id as string, '', uploaded.url);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err: any) {
      console.error('Failed to upload voice note', err);
      setSendError(`Voice note failed to send: ${err?.message || 'please try again.'}`);
    } finally {
      setUploadingVoice(false);
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
                <Image source={{ uri: mediaUrl(image) }} className="w-full h-full rounded-full" alt="Profile" />
                {isUserActive && (
                  <Box className="absolute top-0 right-0 w-3 h-3 bg-primary border-2 border-surface rounded-full" />
                )}
              </Box>
              <VStack>
                <Heading className="font-headline text-base font-bold text-on-surface leading-tight">{name}</Heading>
                {(isUserActive || partnerIsTyping) && (
                  <Text className="font-body text-[10px] text-primary uppercase tracking-widest font-bold">
                    {partnerIsTyping ? 'Typing…' : 'Active Now'}
                  </Text>
                )}
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
            {thread.length === 0 && (
              <Box className="items-center py-10">
                <Text className="font-body text-sm text-on-surface-variant text-center">
                  You matched with {name}. Say hello!
                </Text>
              </Box>
            )}

            {thread.map((msg) => (
              <Box key={msg.id} className={`flex-row ${msg.isSender ? 'justify-end' : 'justify-start'}`}>
                <VStack space="xs" className="max-w-[75%]">
                  <Box className={`p-4 rounded-2xl ${
                    msg.isSender 
                      ? 'signature-gradient rounded-br-none shadow-lg shadow-primary/20' 
                      : 'bg-surface-container-high rounded-bl-none'
                  }`}>
                    {msg.isDeleted ? (
                      <Text className={`font-body text-sm italic ${msg.isSender ? 'text-white/70' : 'text-on-surface-variant'}`}>
                        Message deleted
                      </Text>
                    ) : msg.mediaUrl ? (
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
                    {formatTime(msg.createdAt)}
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
          </VStack>
        </ScrollView>

        {sendError ? (
          <View className="mx-4 mb-2 p-2 bg-error/10 rounded-lg border border-error/20">
            <Text className="text-error font-body text-xs text-center">{sendError}</Text>
          </View>
        ) : null}

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
                    // Enter sends on a laptop keyboard (Shift+Enter still adds a new line)
                    onKeyPress={(e: any) => {
                      if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
                        e.preventDefault?.();
                        handleSend();
                      }
                    }}
                  />
                  <TouchableOpacity onPress={startRecording} disabled={uploadingVoice}>
                    <Mic size={20} color={uploadingVoice ? '#414BEA' : '#afadac'} />
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
