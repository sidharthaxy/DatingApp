/**
 * KycRecorder (iOS / Android) — front-camera preview that records a short verification clip.
 * The browser implementation lives in KycRecorder.web.tsx and exposes the same handle.
 */
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Linking, View } from 'react-native';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import type { KycClip, KycRecorderHandle, KycRecorderProps } from './KycRecorder.types';

const KycRecorder = forwardRef<KycRecorderHandle, KycRecorderProps>(({ onStatusChange, style }, ref) => {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [mountError, setMountError] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const recordingRef = useRef(false);

  const cameraGranted = !!cameraPermission?.granted;
  // The microphone is nice to have. Without it we record a silent clip rather than fail.
  const micGranted = !!micPermission?.granted;

  useEffect(() => {
    if (!cameraPermission || !micPermission) {
      onStatusChange({ state: 'loading' });
    } else if (mountError) {
      onStatusChange({ state: 'error', message: mountError });
    } else if (!cameraGranted) {
      onStatusChange(
        cameraPermission.canAskAgain
          ? { state: 'needs-permission' }
          : { state: 'denied', message: 'Camera access is turned off for Minglex. Enable it in your device settings to verify your identity.' }
      );
    } else {
      onStatusChange(cameraReady ? { state: 'ready' } : { state: 'loading' });
    }
  }, [cameraPermission, micPermission, cameraGranted, cameraReady, mountError]);

  const requestPermission = useCallback(async () => {
    // One prompt at a time: firing both at once made the second request get dropped.
    const camera = await requestCameraPermission();
    if (!camera.granted) {
      if (!camera.canAskAgain) Linking.openSettings().catch(() => {});
      return;
    }
    if (!micPermission?.granted && micPermission?.canAskAgain !== false) {
      await requestMicPermission();
    }
  }, [requestCameraPermission, requestMicPermission, micPermission]);

  const record = useCallback(async (seconds: number): Promise<KycClip> => {
    const camera = cameraRef.current;
    if (!camera || !cameraReady) throw new Error('The camera is still starting. Give it a second and try again.');
    if (recordingRef.current) throw new Error('A recording is already in progress.');

    recordingRef.current = true;
    // `maxDuration` ends the recording natively; this timer is only a safety net for
    // devices that ignore it.
    const safety = setTimeout(() => {
      try {
        cameraRef.current?.stopRecording();
      } catch {
        /* already stopped */
      }
    }, seconds * 1000 + 1500);

    try {
      const video = await camera.recordAsync({ maxDuration: seconds });
      if (!video?.uri) throw new Error('The camera did not produce a video. Please try again.');
      const isMov = video.uri.toLowerCase().split('?')[0].endsWith('.mov');
      return {
        uri: video.uri,
        mimeType: isMov ? 'video/quicktime' : 'video/mp4',
        name: isMov ? 'kyc.mov' : 'kyc.mp4',
      };
    } catch (e: any) {
      throw new Error(e?.message ? `Recording failed: ${e.message}` : 'Recording failed. Please try again.');
    } finally {
      clearTimeout(safety);
      recordingRef.current = false;
    }
  }, [cameraReady]);

  useImperativeHandle(ref, () => ({ record, requestPermission }), [record, requestPermission]);

  if (!cameraGranted) return <View style={[{ flex: 1, backgroundColor: '#111' }, style]} />;

  return (
    <CameraView
      ref={cameraRef}
      style={[{ flex: 1 }, style]}
      facing="front"
      mode="video"
      mirror
      mute={!micGranted}
      videoQuality="480p"
      onCameraReady={() => setCameraReady(true)}
      onMountError={(event) => setMountError(event?.message || 'The camera could not be started on this device.')}
    />
  );
});

KycRecorder.displayName = 'KycRecorder';

export default KycRecorder;
