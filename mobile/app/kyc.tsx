import React, { useState, useRef } from 'react';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { VStack } from '@/components/ui/vstack';
import { Button, ButtonText } from '@/components/ui/button';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/store/authStore';
import { Spinner } from '@/components/ui/spinner';

export default function KYCScreen() {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [isRecording, setIsRecording] = useState(false);
  const [timeLeft, setTimeLeft] = useState(5);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const cameraRef = useRef<CameraView>(null);
  const router = useRouter();
  const setUser = useAuthStore(state => state.setUser);
  const user = useAuthStore(state => state.user);

  if (!cameraPermission || !micPermission) {
    return <Box className="flex-1 bg-[#1A1A2E] items-center justify-center p-4">
      <Spinner size="large" />
    </Box>
  }

  if (!cameraPermission.granted || !micPermission.granted) {
    return (
      <Box className="flex-1 bg-[#1A1A2E] items-center justify-center p-6">
        <VStack space="xl" className="items-center">
          <Heading className="text-white text-center font-poppins">Camera & Microphone Access Required</Heading>
          <Text className="text-gray-400 text-center font-poppins">We need these permissions to record your 5-second verification video.</Text>
          <Button onPress={() => { requestCameraPermission(); requestMicPermission(); }} className="bg-[#A230ED]">
            <ButtonText className="font-poppins font-bold">Grant Permissions</ButtonText>
          </Button>
        </VStack>
      </Box>
    );
  }

  const startRecording = async () => {
    if (!cameraRef.current) return;
    setIsRecording(true);
    setTimeLeft(5);
    
    // Countdown timer
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
    
    // Mock upload flow: Get Signed URL from Backend -> Upload to Cloudflare R2 -> Update User Status
    setTimeout(() => {
      setIsUploading(false);
      // Simulate backend updating the status to "UNDER_REVIEW" and onboarding complete
      if (user) {
        setUser({ ...user, profile_complete: true, status: 'APPROVED' }); // Automatically approving for testing
      }
      router.replace('/(tabs)/discovery');
    }, 2000);
  };

  return (
    <Box className="flex-1 bg-[#1A1A2E]">
      <Box className="h-[70%] bg-black w-full overflow-hidden rounded-b-3xl relative">
        {!videoUri ? (
          <CameraView 
            ref={cameraRef} 
            style={{ flex: 1 }} 
            facing="front"
            mode="video"
          />
        ) : (
          <Box className="flex-1 items-center justify-center">
            <Text className="text-white text-lg font-poppins">Video Recorded Successfully 🎉</Text>
            <Text className="text-gray-400 text-sm font-poppins">Ready to upload.</Text>
          </Box>
        )}

        {isRecording && (
          <Box className="absolute top-10 w-full flex-row justify-center">
            <Box className="bg-red-500/80 px-4 py-2 rounded-full">
              <Text className="text-white font-bold font-poppins text-lg">Recording: {timeLeft}s</Text>
            </Box>
          </Box>
        )}
      </Box>

      <Box className="flex-1 p-6 justify-center">
        <VStack space="xl">
          <Heading className="text-white font-poppins text-center">KYC Verification</Heading>
          <Text className="text-gray-400 font-poppins text-center text-sm">
            Record a 5-second video saying your name to verify your profile identity.
          </Text>

          {!videoUri ? (
            <Button 
              size="xl" 
              className={`rounded-full shadow-lg ${isRecording ? 'bg-red-500' : 'bg-[#E53A9B]'}`}
              onPress={startRecording}
              disabled={isRecording}
            >
              <ButtonText className="font-poppins font-bold text-lg">
                {isRecording ? 'Recording...' : 'Start Record'}
              </ButtonText>
            </Button>
          ) : (
            <VStack space="md">
              <Button size="xl" className="bg-[#A230ED]" onPress={uploadVideo} disabled={isUploading}>
                {isUploading ? <Spinner color="white" /> : <ButtonText className="font-poppins font-bold text-lg">Submit KYC</ButtonText>}
              </Button>
              <Button variant="outline" size="xl" className="border-gray-500 border" onPress={() => setVideoUri(null)} disabled={isUploading}>
                <ButtonText className="font-poppins font-bold text-lg text-gray-300">Retake Video</ButtonText>
              </Button>
            </VStack>
          )}
        </VStack>
      </Box>
    </Box>
  );
}
