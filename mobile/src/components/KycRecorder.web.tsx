/**
 * KycRecorder (browser) — records a real video with getUserMedia + MediaRecorder.
 *
 * expo-camera's web build cannot record video, which is why KYC "never recorded" on a
 * laptop. This talks to the browser APIs directly and exposes the same handle as the
 * native recorder.
 */
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { View } from 'react-native';
import type { KycClip, KycRecorderHandle, KycRecorderProps, KycRecorderStatus } from './KycRecorder.types';

// Preferred first. Safari only offers mp4; Chrome / Firefox / Edge offer webm.
const CANDIDATE_TYPES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
  'video/mp4;codecs=avc1,mp4a',
  'video/mp4',
];

const pickRecorderType = (): string => {
  if (typeof MediaRecorder === 'undefined') return '';
  return CANDIDATE_TYPES.find((type) => MediaRecorder.isTypeSupported?.(type)) ?? '';
};

const describeMediaError = (error: any): KycRecorderStatus => {
  const name = error?.name || '';
  if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError') {
    return {
      state: 'denied',
      message: 'Camera access is blocked for this site. Click the camera icon in your browser\'s address bar, allow access, then press "Try again".',
    };
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') {
    return { state: 'error', message: 'No camera was found on this device. Connect a webcam, or continue in the mobile app.' };
  }
  if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError') {
    return { state: 'error', message: 'Your camera is being used by another app or tab. Close it and press "Try again".' };
  }
  return { state: 'error', message: error?.message || 'The camera could not be started.' };
};

const KycRecorder = forwardRef<KycRecorderHandle, KycRecorderProps>(({ onStatusChange, style }, ref) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingRef = useRef(false);
  const mountedRef = useRef(true);
  const statusRef = useRef(onStatusChange);
  statusRef.current = onStatusChange;

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const start = useCallback(async () => {
    statusRef.current({ state: 'loading' });

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      // Browsers only expose the camera on https:// or http://localhost
      statusRef.current({
        state: 'error',
        message:
          typeof window !== 'undefined' && !window.isSecureContext
            ? 'Browsers only allow camera access on https or localhost. Open the app at http://localhost:8081 instead of an IP address.'
            : 'This browser does not support camera recording. Try the latest Chrome, Edge, Firefox or Safari.',
      });
      return;
    }
    if (typeof MediaRecorder === 'undefined') {
      statusRef.current({ state: 'error', message: 'This browser cannot record video. Try the latest Chrome, Edge, Firefox or Safari.' });
      return;
    }

    stopStream();
    const video: MediaTrackConstraints = { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } };
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video, audio: true });
    } catch (error: any) {
      const firstFailure = describeMediaError(error);
      try {
        // No / blocked microphone: a silent clip is still a valid verification video
        stream = await navigator.mediaDevices.getUserMedia({ video, audio: false });
      } catch {
        if (mountedRef.current) statusRef.current(firstFailure);
        return;
      }
    }

    if (!mountedRef.current) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }

    streamRef.current = stream;
    const element = videoRef.current;
    if (element) {
      element.srcObject = stream;
      try {
        await element.play();
      } catch {
        /* autoplay of a muted inline video is allowed; ignore transient interruptions */
      }
    }
    statusRef.current({ state: 'ready' });
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    start();
    return () => {
      mountedRef.current = false;
      stopStream();
    };
  }, [start]);

  const record = useCallback((seconds: number): Promise<KycClip> => {
    return new Promise<KycClip>((resolve, reject) => {
      const stream = streamRef.current;
      if (!stream || !stream.active) {
        reject(new Error('The camera is not running. Press "Try again" and allow camera access.'));
        return;
      }
      if (recordingRef.current) {
        reject(new Error('A recording is already in progress.'));
        return;
      }

      const requestedType = pickRecorderType();
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, {
          ...(requestedType ? { mimeType: requestedType } : {}),
          videoBitsPerSecond: 1_000_000, // ~0.6MB for a 5 second clip
        });
      } catch (error: any) {
        reject(new Error(error?.message || 'This browser could not start a video recording.'));
        return;
      }

      const chunks: BlobPart[] = [];
      let timer: ReturnType<typeof setTimeout> | undefined;
      recordingRef.current = true;

      const finish = (error?: Error) => {
        if (timer) clearTimeout(timer);
        recordingRef.current = false;
        if (error) {
          reject(error);
          return;
        }
        // Strip codec parameters: "video/webm;codecs=vp8,opus" is not a valid multipart
        // Content-Type and gets mangled by servers.
        const mimeType = (recorder.mimeType || requestedType || 'video/webm').split(';')[0] || 'video/webm';
        const blob = new Blob(chunks, { type: mimeType });
        if (blob.size === 0) {
          reject(new Error('The recording came out empty. Please try again.'));
          return;
        }
        resolve({
          uri: URL.createObjectURL(blob),
          mimeType,
          name: mimeType === 'video/mp4' ? 'kyc.mp4' : 'kyc.webm',
          blob,
        });
      };

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) chunks.push(event.data);
      };
      recorder.onerror = (event: any) => finish(new Error(event?.error?.message || 'Recording failed. Please try again.'));
      recorder.onstop = () => finish();

      try {
        recorder.start();
      } catch (error: any) {
        finish(new Error(error?.message || 'Recording failed to start.'));
        return;
      }
      timer = setTimeout(() => {
        if (recorder.state !== 'inactive') recorder.stop();
      }, seconds * 1000);
    });
  }, []);

  useImperativeHandle(ref, () => ({ record, requestPermission: start }), [record, start]);

  return (
    <View style={[{ flex: 1, backgroundColor: '#111' }, style]}>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
      />
    </View>
  );
});

KycRecorder.displayName = 'KycRecorder';

export default KycRecorder;
