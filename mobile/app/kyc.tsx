import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, TouchableOpacity, Platform, useWindowDimensions, ScrollView } from 'react-native';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Button, ButtonText } from '@/components/ui/button';
import { useRouter } from 'expo-router';
import { useAuthStore, type UserStatus } from '@/src/store/authStore';
import { Spinner } from '@/components/ui/spinner';
import { Check, ScanFace, ChevronRight, CameraOff } from 'lucide-react-native';
import { apiUpload, apiJson } from '@/src/lib/api';
import KycRecorder from '@/src/components/KycRecorder';
import type { KycClip, KycRecorderHandle, KycRecorderStatus } from '@/src/components/KycRecorder.types';

const RECORD_SECONDS = 5;

// Utility for joining class names
function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(' ');
}

const STEP_LABELS = ['FACE SCAN', 'REVIEW', 'FINAL SUBMISSION'];

export default function KYCScreen() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const user = useAuthStore(state => state.user);
  const patchUser = useAuthStore(state => state.patchUser);

  const recorderRef = useRef<KycRecorderHandle>(null);
  const [recorderStatus, setRecorderStatus] = useState<KycRecorderStatus>({ state: 'loading' });
  const [isRecording, setIsRecording] = useState(false);
  const [timeLeft, setTimeLeft] = useState(RECORD_SECONDS);
  const [clip, setClip] = useState<KycClip | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const step = submitted || isUploading ? 3 : clip ? 2 : 1;
  const cameraReady = recorderStatus.state === 'ready';
  const cameraBlocked = recorderStatus.state === 'needs-permission' || recorderStatus.state === 'denied' || recorderStatus.state === 'error';

  // Countdown shown while recording. Purely visual — the recorder stops itself.
  useEffect(() => {
    if (!isRecording) return;
    setTimeLeft(RECORD_SECONDS);
    const interval = setInterval(() => setTimeLeft(prev => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(interval);
  }, [isRecording]);

  // Free the browser's copy of a clip once it is replaced or the screen closes
  useEffect(() => {
    return () => {
      if (Platform.OS === 'web' && clip?.uri.startsWith('blob:')) URL.revokeObjectURL(clip.uri);
    };
  }, [clip]);

  const handleStatusChange = useCallback((status: KycRecorderStatus) => {
    setRecorderStatus(status);
  }, []);

  const startRecording = async () => {
    if (!recorderRef.current || isRecording || !cameraReady) return;
    setError('');
    setIsRecording(true);
    try {
      const recorded = await recorderRef.current.record(RECORD_SECONDS);
      setClip(recorded);
    } catch (e: any) {
      console.error('KYC recording failed', e);
      setError(e?.message || 'Recording failed. Please try again.');
    } finally {
      setIsRecording(false);
    }
  };

  const retake = () => {
    setError('');
    setClip(null);
  };

  const uploadVideo = async () => {
    if (!clip || isUploading) return;
    setIsUploading(true);
    setError('');

    try {
      // The clip goes to our API, which stores it — the device never has to reach
      // object storage itself (that is what broke on phones and in the browser).
      const form = new FormData();
      if (clip.blob) {
        form.append('video', clip.blob, clip.name);
      } else {
        // @ts-ignore — React Native's FormData accepts { uri, name, type }
        form.append('video', { uri: clip.uri, name: clip.name, type: clip.mimeType });
      }

      const result = await apiJson<{ status?: UserStatus; has_kyc: boolean }>(
        apiUpload('/api/v1/media/kyc', form)
      );

      patchUser({ has_kyc: true, ...(result?.status ? { status: result.status } : {}) });
      setSubmitted(true);
      router.replace('/(tabs)/discovery');
    } catch (e: any) {
      console.error('KYC Upload error:', e);
      setError(`Upload failed: ${e?.message || 'please try again.'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const isDesktop = Platform.OS === 'web' && width > 768;

  const renderStepDot = (s: number) => (
    <Box className={`w-8 h-8 rounded-full items-center justify-center border-2 ${
      s <= step ? 'bg-primary border-primary' : 'bg-surface-container-low border-surface-container-high'
    }`}>
      {s < step ? (
        <Check size={12} color="white" />
      ) : (
        <Text className={`text-xs font-bold ${s <= step ? 'text-white' : 'text-on-surface-variant'}`}>{s}</Text>
      )}
    </Box>
  );

  const renderCameraArea = () => {
    if (clip) {
      return (
        <Box className="flex-1 items-center justify-center bg-primary/5">
          {Platform.OS === 'web' ? (
            // Let them watch the clip back before sending it
            <video
              src={clip.uri}
              controls
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover', backgroundColor: '#000' }}
            />
          ) : (
            <>
              <Box className="w-24 h-24 bg-primary/10 rounded-full items-center justify-center mb-4">
                <Check size={48} color="#414BEA" />
              </Box>
              <Text className="font-headline text-xl font-bold text-on-surface">Scan Completed</Text>
              <Text className="font-body text-base text-on-surface-variant mt-1">Verification ready</Text>
            </>
          )}
        </Box>
      );
    }

    return (
      <>
        <KycRecorder ref={recorderRef} onStatusChange={handleStatusChange} />

        {recorderStatus.state === 'loading' && (
          <Box className="absolute inset-0 items-center justify-center bg-black/40">
            <Spinner size="large" color="white" />
            <Text className="text-white font-body text-sm mt-3">Starting camera…</Text>
          </Box>
        )}

        {cameraBlocked && (
          <Box className="absolute inset-0 items-center justify-center bg-surface-container-low p-8">
            <Box className="w-16 h-16 bg-primary/10 rounded-full items-center justify-center mb-4">
              {recorderStatus.state === 'needs-permission'
                ? <ScanFace size={32} color="#414BEA" />
                : <CameraOff size={32} color="#414BEA" />}
            </Box>
            <Heading className="text-on-surface text-center font-headline text-xl font-bold mb-2">
              {recorderStatus.state === 'needs-permission' ? 'Permissions Required' : 'Camera unavailable'}
            </Heading>
            <Text className="text-on-surface-variant text-center font-body text-sm leading-relaxed mb-5">
              {recorderStatus.state === 'needs-permission'
                ? 'We need camera and microphone access to record your safe verification video.'
                : recorderStatus.message}
            </Text>
            <TouchableOpacity
              onPress={() => recorderRef.current?.requestPermission()}
              activeOpacity={0.8}
              className="px-8 h-12 rounded-xl signature-gradient items-center justify-center"
            >
              <Text className="font-label font-bold uppercase tracking-widest text-white">
                {recorderStatus.state === 'needs-permission' ? 'Grant Access' : 'Try again'}
              </Text>
            </TouchableOpacity>
          </Box>
        )}

        {isRecording && (
          <Box className="absolute inset-0 items-center justify-end pb-6 bg-black/10">
            <Box className="bg-error px-6 py-3 rounded-full flex-row items-center space-x-3 shadow-lg">
              <View className="w-3 h-3 bg-white rounded-full" />
              <Text className="text-white font-label font-bold text-lg">{timeLeft}s Recording</Text>
            </Box>
          </Box>
        )}

        {/* Scan Overlay Lines */}
        {cameraReady && !isRecording && (
          <View className="absolute inset-0 items-center justify-center" pointerEvents="none">
            <View className="w-2/3 h-3/4 border-2 border-primary/40 rounded-[4rem] border-dashed" />
          </View>
        )}
      </>
    );
  };

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
              {renderStepDot(s)}
              {s < 3 && <Box className={`flex-1 h-1 mx-2 rounded-full ${s < step ? 'bg-primary' : 'bg-surface-container-high'}`} />}
            </React.Fragment>
          ))}
        </HStack>
      )}

      {/* Main Container - Responsive Layout */}
      <Box className={`flex-1 px-6 pb-6 ${isDesktop ? 'flex-row items-center justify-center pt-10' : 'justify-center'}`} style={isDesktop ? { gap: 48 } : undefined}>

        {/* Left Side: Instructions & Vertical Stepper (Desktop) */}
        {isDesktop && (
          <VStack className="flex-1 max-w-md" style={{ gap: 40 }}>
            {/* Desktop Stepper */}
            <VStack space="md" className="items-start">
               {[1, 2, 3].map((s) => (
                <HStack key={s} space="md" className="items-center">
                  {renderStepDot(s)}
                  <Text className={`text-xs font-bold uppercase tracking-widest ${s <= step ? 'text-primary' : 'text-on-surface-variant opacity-40'}`}>
                    {STEP_LABELS[s - 1]}
                  </Text>
                </HStack>
              ))}
            </VStack>

            <VStack space="md">
              <Heading className="font-headline text-4xl font-bold text-on-surface">Face Scan Verification</Heading>
              <Text className="font-body text-lg text-on-surface-variant leading-relaxed">
                To keep our community safe, we need to verify that you are the person in your photos. Record a {RECORD_SECONDS}-second video of your face.
              </Text>
            </VStack>

            <VStack space="lg" className="bg-surface-container-lowest p-6 rounded-[32px] border border-outline-variant/10 shadow-sm">
              <Text className="text-xs font-bold uppercase tracking-widest text-primary mb-2">Checklist</Text>
              {['Position your face in the frame', 'Ensure you have good lighting', 'Keep a neutral expression'].map((item) => (
                <HStack key={item} space="md" className="items-center">
                  <Box className="w-6 h-6 rounded-full bg-green-500/10 items-center justify-center">
                    <Check size={14} color="#22c55e" />
                  </Box>
                  <Text className="text-sm font-medium text-on-surface">{item}</Text>
                </HStack>
              ))}
            </VStack>
          </VStack>
        )}

        {/* Right Side: Camera Card */}
        <VStack className={cn("items-center", isDesktop ? "flex-1" : "w-full")} style={{ gap: 24 }}>
          {!isDesktop && (
            <VStack className="items-center space-y-2">
              <Heading className="font-headline text-2xl font-bold text-on-surface">Face Scan</Heading>
              <Text className="font-body text-sm text-on-surface-variant text-center px-8">
                Verify your identity with a quick {RECORD_SECONDS}-second video.
              </Text>
            </VStack>
          )}

          {user?.has_kyc && !clip && (
            <Box className="w-full p-3 bg-primary/5 rounded-xl border border-primary/10" style={isDesktop ? { width: 500 } : undefined}>
              <Text className="text-primary font-body text-xs text-center">
                You have already submitted a verification video. Recording a new one will replace it.
              </Text>
            </Box>
          )}

          <Box
            className="bg-surface-container-low rounded-[48px] overflow-hidden shadow-2xl shadow-black/10 relative border border-surface-container-high"
            style={{
              width: isDesktop ? 500 : '100%',
              aspectRatio: 1,
              maxHeight: isDesktop ? 500 : undefined
            }}
          >
            {renderCameraArea()}
          </Box>

          {error ? (
            <View className="p-3 bg-error/10 rounded-xl border border-error/20" style={{ width: isDesktop ? 500 : '100%' }}>
              <Text className="text-error font-body text-xs text-center">{error}</Text>
            </View>
          ) : null}

          <VStack className={cn("space-y-4", isDesktop ? "w-[500px]" : "w-full")}>
             {!clip ? (
               <TouchableOpacity
                 onPress={startRecording}
                 disabled={isRecording || !cameraReady}
                 activeOpacity={0.8}
                 className={`w-full h-16 rounded-2xl flex-row items-center justify-center space-x-3 shadow-lg ${
                   isRecording || !cameraReady ? 'bg-surface-container-highest' : 'signature-gradient'
                 }`}
               >
                 <ScanFace size={24} color={isRecording || !cameraReady ? "#afadac" : "white"} />
                 <Text className={`font-label font-bold text-lg tracking-widest ${isRecording || !cameraReady ? 'text-on-surface-variant' : 'text-white'}`}>
                   {isRecording ? 'RECORDING...' : 'START CAPTURE'}
                 </Text>
               </TouchableOpacity>
             ) : (
               <TouchableOpacity
                 onPress={retake}
                 disabled={isUploading}
                 className="w-full h-16 rounded-2xl border-2 border-surface-container-high items-center justify-center bg-white"
               >
                 <Text className="font-label font-bold text-on-surface-variant tracking-widest uppercase">Retake Scan</Text>
               </TouchableOpacity>
             )}
             <Text className="text-center font-body text-[10px] text-on-surface-variant uppercase tracking-[0.2em]">
               {clip ? 'Happy with it? Submit your video below' : 'Please stay still during the scan'}
             </Text>
          </VStack>
        </VStack>
      </Box>

      {/* Footer Actions */}
      <Box className={cn("p-8 pb-12", isDesktop ? "border-t border-outline-variant/10 bg-white" : "")}>
        <HStack className="max-w-6xl mx-auto w-full items-center justify-between">
           <TouchableOpacity onPress={() => router.replace('/(tabs)/discovery')} disabled={isUploading}>
             <Text className="font-label text-sm text-on-surface-variant uppercase tracking-widest">Skip for now</Text>
           </TouchableOpacity>

           <Button
             onPress={uploadVideo}
             disabled={!clip || isUploading}
             className={`h-14 px-10 rounded-xl flex-row items-center space-x-2 ${
               !clip ? 'bg-surface-container-high' : 'signature-gradient shadow-lg shadow-primary/30'
             }`}
           >
             {isUploading ? <Spinner color="white" /> : (
               <>
                 <ButtonText className={`font-label font-bold tracking-widest uppercase ${!clip ? 'text-on-surface-variant' : 'text-white'}`}>
                    Submit Video
                 </ButtonText>
                 <ChevronRight size={18} color={!clip ? "#afadac" : "white"} />
               </>
             )}
           </Button>
        </HStack>
      </Box>
    </ScrollView>
  );
}
