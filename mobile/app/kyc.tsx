import React, { useState, useRef } from 'react';
import { View, TouchableOpacity, Platform, useWindowDimensions, ScrollView } from 'react-native';
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
import * as FileSystem from 'expo-file-system/legacy';
import { apiPost } from '@/src/lib/api';



// Utility for joining class names
function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(' ');
}

export default function KYCScreen() {
  const { width } = useWindowDimensions();
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

    if (Platform.OS === 'web') {
      // Web Fallback: Since recordAsync is unsupported, we take a high-quality selfie
      // and simulate the "recording" duration for UX consistency.
      setTimeLeft(3);
      const interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      try {
        // Wait for the "recording" to finish
        await new Promise(resolve => setTimeout(resolve, 3000));
        const photo = await cameraRef.current.takePictureAsync({
          quality: 1,
          base64: true,
        });
        setVideoUri(photo?.uri || null);
      } catch (e) {
        console.error('Web capture failed', e);
      }
    } else {
      // Native: Use real video recording
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
    }
    setIsRecording(false);
  };

  const uploadVideo = async () => {
    if (!videoUri) return;
    setIsUploading(true);
    
    try {
      let filename = videoUri.split('/').pop() || 'kyc_video.mov';
      let contentType = filename.endsWith('.mp4') ? 'video/mp4' : 'video/quicktime';
      let fileSize = 0;
      let blob: Blob | null = null;

      if (Platform.OS === 'web') {
        // Web: Fetch the local blob/data URI to get its size and content
        const blobRes = await fetch(videoUri);
        blob = await blobRes.blob();
        fileSize = blob.size;
        contentType = blob.type || 'image/jpeg'; // Web fallback is a photo
        filename = 'kyc_selfie.jpg';
      } else {
        // Native: Use FileSystem
        const fileInfo = await FileSystem.getInfoAsync(videoUri);
        if (!fileInfo.exists) throw new Error('Video file does not exist');
        fileSize = fileInfo.size;
      }

      // 1. Get signed upload URL
      const res = await apiPost('/api/v1/media/upload-url', {
        filename,
        contentType,
        type: 'kyc',
        fileSize
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || 'Failed to get upload URL');

      const { uploadUrl, key } = data.data;

      // 2. Upload to S3/MinIO
      if (Platform.OS === 'web' && blob) {
        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': contentType },
          body: blob
        });
        if (!uploadRes.ok) throw new Error(`Upload failed with status ${uploadRes.status}`);
      } else {
        const uploadTask = FileSystem.createUploadTask(
          uploadUrl,
          videoUri,
          {
            httpMethod: 'PUT',
            headers: { 'Content-Type': contentType },
            uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT
          }
        );
        const result = await uploadTask.uploadAsync();
        if (!result || (result.status !== 200 && result.status !== 204)) {
          throw new Error(`Upload failed with status ${result?.status}`);
        }
      }

      // 3. Confirm with backend
      const confirmRes = await apiPost('/api/v1/media/upload-kyc', {
        url: key
      });
      const confirmData = await confirmRes.json();
      if (!confirmData.success) throw new Error(confirmData.error?.message || 'Failed to confirm KYC');

      if (user) setUser({ ...user, status: 'UNDER_REVIEW' });
      router.replace('/(tabs)/discovery');
    } catch (e: any) {
      alert('Upload failed: ' + e.message);
      console.error('KYC Upload error:', e);
    } finally {
      setIsUploading(false);
    }
  };

  const isDesktop = Platform.OS === 'web' && width > 768;

  return (
    <ScrollView className="flex-1 bg-surface" contentContainerStyle={{ flexGrow: 1 }}>
      {/* Header - Only on Mobile */}
      {!isDesktop && (
        <VStack className="px-6 pt-12 pb-6 space-y-2">
          <Heading className="font-headline text-3xl font-bold tracking-tighter text-on-surface">KYC Verification</Heading>
          <Text className="font-body text-sm text-on-surface-variant">Step {step} of 3 • Safety Check</Text>
        </VStack>
      )}

      {/* Progress Stepper - Top on Mobile, Left on Desktop */}
      {!isDesktop && (
        <HStack className="px-6 mb-8 items-center justify-between">
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <Box className={`w-8 h-8 rounded-full items-center justify-center border-2 ${
                s <= step ? 'bg-primary border-primary' : 'bg-surface-container-low border-surface-container-high'
              }`}>
                {s < step ? (
                  <Check size={12} color="white" />
                ) : (
                  <Text className={`text-xs font-bold ${s <= step ? 'text-white' : 'text-on-surface-variant'}`}>{s}</Text>
                )}
              </Box>
              {s < 3 && <Box className={`flex-1 h-1 mx-2 rounded-full ${s < step ? 'bg-primary' : 'bg-surface-container-high'}`} />}
            </React.Fragment>
          ))}
        </HStack>
      )}

      {/* Main Container - Responsive Layout */}
      <Box className={`flex-1 px-6 pb-6 ${isDesktop ? 'flex-row items-center space-x-12' : 'justify-center'}`}>
        
        {/* Left Side: Instructions & Vertical Stepper (Desktop) */}
        {isDesktop && (
          <VStack className="flex-1 space-y-12 max-w-md">
            {/* Desktop Stepper */}
            <VStack space="md" className="items-start">
               {[1, 2, 3].map((s) => (
                <HStack key={s} space="md" className="items-center">
                   <Box className={`w-8 h-8 rounded-full items-center justify-center border-2 ${
                    s <= step ? 'bg-primary border-primary shadow-sm' : 'bg-surface-container-low border-surface-container-high opacity-50'
                  }`}>
                    {s < step ? <Check size={12} color="white" /> : <Text className={`text-xs font-bold ${s <= step ? 'text-white' : 'text-on-surface-variant'}`}>{s}</Text>}
                  </Box>
                  <Text className={`text-xs font-bold uppercase tracking-widest ${s <= step ? 'text-primary' : 'text-on-surface-variant opacity-40'}`}>
                    {s === 1 ? 'FACE SCAN' : s === 2 ? 'LIVENESS CHECK' : 'FINAL SUBMISSION'}
                  </Text>
                </HStack>
              ))}
            </VStack>

            <VStack space="md">
              <Heading className="font-headline text-4xl font-bold text-on-surface">Face Scan Verification</Heading>
              <Text className="font-body text-lg text-on-surface-variant leading-relaxed">
                To keep our community safe, we need to verify that you are the person in your photos.
              </Text>
            </VStack>

            <VStack space="lg" className="bg-surface-container-lowest p-6 rounded-[32px] border border-outline-variant/10 shadow-sm">
              <Text className="text-xs font-bold uppercase tracking-widest text-primary mb-2">Checklist</Text>
              <HStack space="md" className="items-center">
                <Box className="w-6 h-6 rounded-full bg-green-500/10 items-center justify-center">
                  <Check size={14} color="#22c55e" />
                </Box>
                <Text className="text-sm font-medium text-on-surface">Position your face in the frame</Text>
              </HStack>
              <HStack space="md" className="items-center">
                <Box className="w-6 h-6 rounded-full bg-green-500/10 items-center justify-center">
                  <Check size={14} color="#22c55e" />
                </Box>
                <Text className="text-sm font-medium text-on-surface">Ensure you have good lighting</Text>
              </HStack>
              <HStack space="md" className="items-center">
                <Box className="w-6 h-6 rounded-full bg-green-500/10 items-center justify-center">
                  <Check size={14} color="#22c55e" />
                </Box>
                <Text className="text-sm font-medium text-on-surface">Keep a neutral expression</Text>
              </HStack>
            </VStack>
          </VStack>
        )}

        {/* Right Side: Camera Card */}
        <VStack className={cn("items-center space-y-8", isDesktop ? "flex-1" : "w-full")}>
          {!isDesktop && (
            <VStack className="items-center space-y-2">
              <Heading className="font-headline text-2xl font-bold text-on-surface">Face Scan</Heading>
              <Text className="font-body text-sm text-on-surface-variant text-center px-8">
                Verify your identity with a quick scan.
              </Text>
            </VStack>
          )}

          <Box 
            className="bg-surface-container-low rounded-[48px] overflow-hidden shadow-2xl shadow-black/10 relative border border-surface-container-high"
            style={{ 
              width: isDesktop ? 500 : '100%', 
              aspectRatio: 1,
              maxHeight: isDesktop ? 500 : undefined
            }}
          >
            {!videoUri ? (
              <CameraView 
                ref={cameraRef} 
                style={{ flex: 1 }} 
                facing="front"
                mode={Platform.OS === 'web' ? 'picture' : 'video'}
              />
            ) : (
              <Box className="flex-1 items-center justify-center bg-primary/5">
                <Box className="w-24 h-24 bg-primary/10 rounded-full items-center justify-center mb-4">
                  <Check size={48} color="#414BEA" />
                </Box>
                <Text className="font-headline text-xl font-bold text-on-surface">Scan Completed</Text>
                <Text className="font-body text-base text-on-surface-variant mt-1">Verification ready</Text>
              </Box>
            )}

            {isRecording && (
              <Box className="absolute inset-0 items-center justify-center bg-black/20">
                <Box className="bg-error px-6 py-3 rounded-full flex-row items-center space-x-3 shadow-lg">
                  <View className="w-3 h-3 bg-white rounded-full animate-pulse" />
                  <Text className="text-white font-label font-bold text-lg">{timeLeft}s {Platform.OS === 'web' ? 'Processing' : 'Recording'}</Text>
                </Box>
              </Box>
            )}

            {/* Scan Overlay Lines */}
            {!isRecording && !videoUri && (
                <View className="absolute inset-0 pointer-events-none items-center justify-center">
                   <View className="w-2/3 h-3/4 border-2 border-primary/40 rounded-[4rem] border-dashed" />
                </View>
            )}
          </Box>

          <VStack className={cn("space-y-4", isDesktop ? "w-[500px]" : "w-full")} style={{ zIndex: 50 }}>
             {!videoUri ? (
               <TouchableOpacity 
                 onPress={() => {
                   console.log('Capture button clicked');
                   startRecording();
                 }}
                 disabled={isRecording}
                 activeOpacity={0.8}
                 className={`w-full h-16 rounded-2xl flex-row items-center justify-center space-x-3 shadow-lg ${
                   isRecording ? 'bg-surface-container-highest' : 'signature-gradient'
                 }`}
                 style={{ zIndex: 60 }}
               >
                 <ScanFace size={24} color={isRecording ? "#afadac" : "white"} />
                 <Text className={`font-label font-bold text-lg tracking-widest ${isRecording ? 'text-on-surface-variant' : 'text-white'}`}>
                   {isRecording ? (Platform.OS === 'web' ? 'PROCESSING...' : 'RECORDING...') : 'START CAPTURE'}
                 </Text>
               </TouchableOpacity>
             ) : (
               <TouchableOpacity 
                 onPress={() => setVideoUri(null)}
                 className="w-full h-16 rounded-2xl border-2 border-surface-container-high items-center justify-center bg-white"
               >
                 <Text className="font-label font-bold text-on-surface-variant tracking-widest uppercase">Retake Scan</Text>
               </TouchableOpacity>
             )}
             <Text className="text-center font-body text-[10px] text-on-surface-variant uppercase tracking-[0.2em]">Please stay still during the scan</Text>
          </VStack>
        </VStack>
      </Box>

      {/* Footer Actions */}
      <Box className={cn("p-8 pb-12", isDesktop ? "border-t border-outline-variant/10 bg-white" : "")}>
        <HStack className="max-w-6xl mx-auto w-full items-center justify-between">
           <TouchableOpacity onPress={() => router.replace('/(tabs)/discovery')}>
             <Text className="font-label text-sm text-on-surface-variant uppercase tracking-widest">Skip for now</Text>
           </TouchableOpacity>
           
           <Button 
             onPress={uploadVideo} 
             disabled={!videoUri || isUploading}
             className={`h-14 px-10 rounded-xl flex-row items-center space-x-2 ${
               !videoUri ? 'bg-surface-container-high' : 'signature-gradient shadow-lg shadow-primary/30'
             }`}
           >
             {isUploading ? <Spinner color="white" /> : (
               <>
                 <ButtonText className={`font-label font-bold tracking-widest uppercase ${!videoUri ? 'text-on-surface-variant' : 'text-white'}`}>
                    {Platform.OS === 'web' ? 'Submit Photo' : 'Submit Video'}
                 </ButtonText>
                 <ChevronRight size={18} color={!videoUri ? "#afadac" : "white"} />
               </>
             )}
           </Button>
        </HStack>
      </Box>
    </ScrollView>
  );
}
