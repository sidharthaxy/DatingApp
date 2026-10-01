/**
 * webrtc.tsx — one WebRTC surface for every platform.
 *
 *  - Browser: the built-in RTCPeerConnection / getUserMedia and a <video> element
 *  - iOS / Android dev build: react-native-webrtc
 *  - Expo Go: neither exists → `rtc.supported` is false and the call screen says so
 */
import React, { useEffect, useRef } from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';

interface RtcApi {
  supported: boolean;
  RTCPeerConnection: any;
  RTCSessionDescription: any;
  RTCIceCandidate: any;
  mediaDevices: any;
  NativeRTCView: any;
}

const resolve = (): RtcApi => {
  if (Platform.OS === 'web') {
    const w: any = typeof window !== 'undefined' ? window : {};
    const mediaDevices = typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined;
    return {
      supported: !!w.RTCPeerConnection && !!mediaDevices?.getUserMedia,
      RTCPeerConnection: w.RTCPeerConnection,
      RTCSessionDescription: w.RTCSessionDescription,
      RTCIceCandidate: w.RTCIceCandidate,
      mediaDevices,
      NativeRTCView: null,
    };
  }
  try {
    // Requires a custom dev client; throws in Expo Go
    const webrtc = require('react-native-webrtc');
    return {
      supported: !!webrtc.RTCPeerConnection,
      RTCPeerConnection: webrtc.RTCPeerConnection,
      RTCSessionDescription: webrtc.RTCSessionDescription,
      RTCIceCandidate: webrtc.RTCIceCandidate,
      mediaDevices: webrtc.mediaDevices,
      NativeRTCView: webrtc.RTCView,
    };
  } catch {
    return { supported: false, RTCPeerConnection: null, RTCSessionDescription: null, RTCIceCandidate: null, mediaDevices: null, NativeRTCView: null };
  }
};

export const rtc = resolve();

/** Why calling is unavailable here, or null when it is available. */
export const rtcUnavailableReason = (): string | null => {
  if (rtc.supported) return null;
  if (Platform.OS === 'web') {
    return typeof window !== 'undefined' && !window.isSecureContext
      ? 'Video calls need https or http://localhost in the browser.'
      : 'This browser does not support video calls.';
  }
  return 'Video calls need a development build of the app (not available in Expo Go).';
};

/** Renders a MediaStream. */
export function StreamView({ stream, mirror, muted, style }: { stream: any; mirror?: boolean; muted?: boolean; style?: StyleProp<ViewStyle> }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const element = videoRef.current;
    if (!element) return;
    element.srcObject = stream ?? null;
    if (stream) element.play?.().catch(() => {});
  }, [stream]);

  if (!stream) return null;

  if (Platform.OS === 'web') {
    return (
      <View style={[{ overflow: 'hidden', backgroundColor: '#000' }, style]}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          style={{ width: '100%', height: '100%', objectFit: 'cover', transform: mirror ? 'scaleX(-1)' : undefined }}
        />
      </View>
    );
  }

  const RTCView = rtc.NativeRTCView;
  if (!RTCView) return null;
  return <RTCView streamURL={stream.toURL()} style={style} objectFit="cover" mirror={mirror} zOrder={mirror ? 1 : 0} />;
}
