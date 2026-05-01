import React, { useState, useRef } from 'react';
import { View, TouchableOpacity, Dimensions } from 'react-native';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Button, ButtonText } from '@/components/ui/button';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/store/authStore';
import { Spinner } from '@/components/ui/spinner';
import { User, Check, ScanFace, ChevronRight } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function KYCScreen() {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [isRecording, setIsRecording] = useState(false);
  const [timeLeft, setTimeLeft] = useState(5);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [step, setStep] = useState(1);

  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();
  const setUser = useAuthStore(state => state.setUser);
  const user = useAuthStore(state => state.user);

  if (!cameraPermission || !micPermission) {
    return (
      <Box className="flex-1 bg-surface items-center justify-center p-4">
        <Spinner size="large" />
      </Box>
    );
  }

  if (!cameraPermission.granted || !micPermission.granted) {
    return (
      <Box className="flex-1 bg-surface items-center justify-center p-8">
        <VStack space="xl" className="items-center">
          <Box className="w-20 h-20 bg-primary/10 rounded-full items-center justify-center mb-4">
            <ScanFace size={40} color="#414BEA" />
          </Box>
          <Heading className="text-on-surface text-center font-headline text-2xl font-bold">Permissions Required</Heading>
          <Text className="text-on-surface-variant text-center font-body leading-relaxed">
            We need camera and microphone access to record your safe verification video.
          </Text>
          <Button onPress={() => { requestCameraPermission(); requestMicPermission(); }} className="w-full signature-gradient h-14 rounded-xl shadow-lg shadow-primary/20">
            <ButtonText className="font-label font-bold uppercase tracking-widest text-white">Grant Access</ButtonText>
          </Button>
        </VStack>
      </Box>
    );
  }

  const startRecording = async () => {
    if (!cameraRef.current) return;
    setIsRecording(true);
    setTimeLeft(5);
    
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          cameraRef.current?.stopRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    try {
      const video = await cameraRef.current.recordAsync();
      setVideoUri(video?.uri || null);
    } catch (e) {
      console.log('Video recording failed', e);
    }
    setIsRecording(false);
  };

  const uploadVideo = async () => {
    if (!videoUri) return;
    setIsUploading(true);
    
    setTimeout(() => {
      setIsUploading(false);
      if (user) {
        setUser({ ...user, is_profile_complete: true, status: 'APPROVED' });
      }
      router.replace('/(tabs)/discovery');
    }, 2000);
  };

  return (
    <Box className="flex-1 bg-surface">
      {/* Header */}
      <VStack className="px-6 pt-12 pb-6 space-y-2">
        <Heading className="font-headline text-3xl font-bold tracking-tighter text-on-surface">KYC Verification</Heading>
        <Text className="font-body text-sm text-on-surface-variant">Step {step} of 3</Text>
      </VStack>

      {/* Progress Stepper */}
      <HStack className="px-6 mb-8 items-center justify-between">
        {[1, 2, 3].map((s) => (
          <React.Fragment key={s}>
            <Box className={`w-10 h-10 rounded-full items-center justify-center border-2 ${
              s <= step ? 'bg-primary border-primary' : 'bg-surface-container-low border-surface-container-high'
            }`}>
              {s < step ? (
                <Check size={16} color="white" />
              ) : (
                <Text className={`font-label font-bold ${s <= step ? 'text-white' : 'text-on-surface-variant'}`}>{s}</Text>
              )}
            </Box>
            {s < 3 && <Box className={`flex-1 h-1 mx-2 rounded-full ${s < step ? 'bg-primary' : 'bg-surface-container-high'}`} />}
          </React.Fragment>
        ))}
      </HStack>

      {/* Main Verification Card */}
      <Box className="flex-1 px-6 justify-center">
        <VStack className="items-center space-y-8">
          <VStack className="items-center space-y-2">
            <Heading className="font-headline text-2xl font-bold text-on-surface">Face Scan</Heading>
            <Text className="font-body text-sm text-on-surface-variant text-center px-8">
              Verify your identity with a quick 5-second video scan.
            </Text>
          </VStack>

          <Box className="w-full aspect-square bg-surface-container-low rounded-3xl overflow-hidden shadow-2xl shadow-black/5 relative border border-surface-container-high">
            {!videoUri ? (
              <CameraView 
                ref={cameraRef} 
                style={{ flex: 1 }} 
                facing="front"
                mode="video"
              />
            ) : (
              <Box className="flex-1 items-center justify-center bg-primary/5">
                <Box className="w-24 h-24 bg-primary/10 rounded-full items-center justify-center mb-4">
                  <Check size={48} color="#414BEA" />
                </Box>
                <Text className="font-headline text-lg font-bold text-on-surface">Video Captured</Text>
                <Text className="font-body text-sm text-on-surface-variant mt-1">Ready for verification</Text>
              </Box>
            )}

            {isRecording && (
              <Box className="absolute inset-0 items-center justify-center bg-black/20">
                <Box className="bg-error px-6 py-3 rounded-full flex-row items-center space-x-3">
                  <View className="w-3 h-3 bg-white rounded-full animate-pulse" />
                  <Text className="text-white font-label font-bold text-lg">{timeLeft}s Recording</Text>
                </Box>
              </Box>
            )}

            {/* Scan Overlay Lines */}
            {!isRecording && !videoUri && (
                <View className="absolute inset-0 pointer-events-none items-center justify-center">
                   <View className="w-48 h-64 border-2 border-primary/40 rounded-[3rem] border-dashed" />
                </View>
            )}
          </Box>

          <VStack className="w-full space-y-4">
             {!videoUri ? (
               <Button 
                 onPress={startRecording}
                 disabled={isRecording}
                 className={`w-full h-16 rounded-2xl flex-row items-center justify-center space-x-3 ${
                   isRecording ? 'bg-surface-container-highest' : 'signature-gradient shadow-lg shadow-primary/30'
                 }`}
               >
                 <ScanFace size={24} color={isRecording ? "#afadac" : "white"} />
                 <ButtonText className={`font-label font-bold text-lg tracking-widest ${isRecording ? 'text-on-surface-variant' : 'text-white'}`}>
                   {isRecording ? 'RECORDING...' : 'START CAPTURE'}
                 </ButtonText>
               </Button>
             ) : (
               <Button 
                 onPress={() => setVideoUri(null)}
                 variant="outline"
                 className="w-full h-16 rounded-2xl border-2 border-surface-container-high"
               >
                 <ButtonText className="font-label font-bold text-on-surface-variant tracking-widest uppercase">Retake Scan</ButtonText>
               </Button>
             )}
             <Text className="text-center font-body text-[10px] text-on-surface-variant uppercase tracking-[0.2em]">Ensure good lighting throughout</Text>
          </VStack>
        </VStack>
      </Box>

      {/* Footer Actions */}
      <Box className="p-8 pb-12">
        <HStack className="items-center justify-between">
           <TouchableOpacity onPress={() => router.replace('/(tabs)/discovery')}>
             <Text className="font-label text-sm text-on-surface-variant uppercase tracking-widest">Skip for now</Text>
           </TouchableOpacity>
           
           <Button 
             onPress={uploadVideo} 
             disabled={!videoUri || isUploading}
             className={`h-14 px-8 rounded-xl flex-row items-center space-x-2 ${
               !videoUri ? 'bg-surface-container-high' : 'signature-gradient shadow-lg shadow-primary/20'
             }`}
           >
             {isUploading ? <Spinner color="white" /> : (
               <>
                 <ButtonText className={`font-label font-bold tracking-widest uppercase ${!videoUri ? 'text-on-surface-variant' : 'text-white'}`}>Continue</ButtonText>
                 <ChevronRight size={18} color={!videoUri ? "#afadac" : "white"} />
               </>
             )}
           </Button>
        </HStack>
      </Box>
    </Box>
  );
}
