import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { Image } from '@/components/ui/image';
import { Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/src/store/authStore';
import { useChatStore } from '@/src/store/chatStore';
import { mediaUrl } from '@/src/lib/config';
import { rtc, rtcUnavailableReason, StreamView } from '@/src/lib/webrtc';

const RING_TIMEOUT_MS = 35000;

/**
 * 1-on-1 video call.
 *
 * Signalling (relayed by the backend socket):
 *   caller:  call_initiated ───────────────▶ callee sees the incoming-call prompt
 *   callee:  call_accepted  ◀─ (camera on) ─ opens this screen with ?incoming=1
 *   caller:  webrtc_offer   ───────────────▶ callee
 *   callee:  webrtc_answer  ───────────────▶ caller
 *   both:    webrtc_ice_candidate ⇄ … connected. Either side: call_ended.
 *
 * The offer is only created once the callee has accepted, so it can never arrive before
 * the callee's screen is listening for it.
 */
export default function CallScreen() {
  const router = useRouter();
  const { id, name, image, incoming } = useLocalSearchParams<{ id: string; name: string; image: string; incoming?: string }>();
  const isCallee = incoming === '1';
  const user = useAuthStore(s => s.user);
  const socket = useChatStore(s => s.socket);
  const isConnected = useChatStore(s => s.isConnected);
  const connectSocket = useChatStore(s => s.connectSocket);
  const setActiveCall = useChatStore(s => s.setActiveCall);

  const [localStream, setLocalStream] = useState<any>(null);
  const [remoteStream, setRemoteStream] = useState<any>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [status, setStatus] = useState(isCallee ? 'Connecting…' : 'Calling…');

  // Refs, because the cleanup below must see the CURRENT stream / connection — reading
  // state from a mount-time closure left the camera running after hanging up.
  const peerConnection = useRef<any>(null);
  const localStreamRef = useRef<any>(null);
  const pendingCandidates = useRef<any[]>([]);
  const finished = useRef(false);

  // Make sure the realtime connection exists (e.g. when opened from a deep link)
  useEffect(() => {
    connectSocket();
  }, []);

  const leave = useCallback((notifyPartner: boolean) => {
    if (finished.current) return;
    finished.current = true;
    if (notifyPartner) useChatStore.getState().socket?.emit('call_ended', { partnerId: id });
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/chat');
  }, [id]);

  useEffect(() => {
    const unavailable = rtcUnavailableReason();
    if (unavailable) {
      setStatus(unavailable);
      return;
    }
    if (!socket || !isConnected || !user || !id) return;

    let cancelled = false;
    let ringTimer: ReturnType<typeof setTimeout> | undefined;
    setActiveCall(id);

    const flushCandidates = async () => {
      const pc = peerConnection.current;
      if (!pc) return;
      for (const candidate of pendingCandidates.current.splice(0)) {
        try {
          await pc.addIceCandidate(new rtc.RTCIceCandidate(candidate));
        } catch (err) {
          console.warn('[Call] Dropped ICE candidate', err);
        }
      }
    };

    const handleAccepted = async (data: any) => {
      if (data.from !== id || !peerConnection.current) return;
      if (ringTimer) clearTimeout(ringTimer);
      setStatus('Connecting…');
      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);
      socket.emit('webrtc_offer', { partnerId: id, offer });
    };

    const handleOffer = async (data: any) => {
      const pc = peerConnection.current;
      if (data.from !== id || !pc) return;
      await pc.setRemoteDescription(new rtc.RTCSessionDescription(data.offer));
      await flushCandidates();
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('webrtc_answer', { partnerId: id, answer });
    };

    const handleAnswer = async (data: any) => {
      if (data.from !== id || !peerConnection.current) return;
      await peerConnection.current.setRemoteDescription(new rtc.RTCSessionDescription(data.answer));
      await flushCandidates();
    };

    const handleIceCandidate = async (data: any) => {
      const pc = peerConnection.current;
      if (data.from !== id || !pc || !data.candidate) return;
      // Candidates can arrive before the remote description; hold them until it is set
      if (!pc.remoteDescription) {
        pendingCandidates.current.push(data.candidate);
        return;
      }
      try {
        await pc.addIceCandidate(new rtc.RTCIceCandidate(data.candidate));
      } catch (err) {
        console.warn('[Call] Dropped ICE candidate', err);
      }
    };

    const endWith = (message: string) => {
      setStatus(message);
      setRemoteStream(null);
      setTimeout(() => leave(false), 1500);
    };

    const handleCallEnded = (data: any) => {
      if (data.from === id) endWith(`${name || 'Your match'} ended the call`);
    };

    const handleDeclined = (data: any) => {
      if (data.from === id) endWith(data.reason === 'busy' ? `${name || 'Your match'} is on another call` : 'Call declined');
    };

    socket.on('call_accepted', handleAccepted);
    socket.on('call_declined', handleDeclined);
    socket.on('webrtc_offer', handleOffer);
    socket.on('webrtc_answer', handleAnswer);
    socket.on('webrtc_ice_candidate', handleIceCandidate);
    socket.on('call_ended', handleCallEnded);

    const start = async () => {
      try {
        let stream: any;
        try {
          stream = await rtc.mediaDevices.getUserMedia({ audio: true, video: { facingMode: 'user' } });
        } catch {
          // No camera (or it is blocked): fall back to an audio-only call
          stream = await rtc.mediaDevices.getUserMedia({ audio: true, video: false });
          setIsVideoOff(true);
        }
        if (cancelled) {
          stream.getTracks().forEach((track: any) => track.stop());
          return;
        }
        localStreamRef.current = stream;
        setLocalStream(stream);

        const pc = new rtc.RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        peerConnection.current = pc;

        stream.getTracks().forEach((track: any) => pc.addTrack(track, stream));

        pc.ontrack = (event: any) => {
          if (event.streams?.[0]) setRemoteStream(event.streams[0]);
          setStatus('Connected');
        };

        pc.onicecandidate = (event: any) => {
          if (event.candidate) {
            socket.emit('webrtc_ice_candidate', { partnerId: id, candidate: event.candidate });
          }
        };

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === 'connected') setStatus('Connected');
          if (pc.connectionState === 'failed') endWith('Connection lost');
        };

        if (isCallee) {
          // Tell the caller we are ready; their offer follows
          socket.emit('call_accepted', { partnerId: id });
        } else {
          socket.emit('call_initiated', { partnerId: id });
          ringTimer = setTimeout(() => {
            if (!peerConnection.current?.remoteDescription) endWith('No answer');
          }, RING_TIMEOUT_MS);
        }
      } catch (err) {
        console.error('Failed to start call', err);
        setStatus('Could not access your camera or microphone');
      }
    };

    start();

    return () => {
      cancelled = true;
      if (ringTimer) clearTimeout(ringTimer);
      socket.off('call_accepted', handleAccepted);
      socket.off('call_declined', handleDeclined);
      socket.off('webrtc_offer', handleOffer);
      socket.off('webrtc_answer', handleAnswer);
      socket.off('webrtc_ice_candidate', handleIceCandidate);
      socket.off('call_ended', handleCallEnded);
      localStreamRef.current?.getTracks().forEach((track: any) => track.stop());
      localStreamRef.current = null;
      peerConnection.current?.close();
      peerConnection.current = null;
      pendingCandidates.current = [];
      setActiveCall(null);
      // Leaving the screen any other way (back gesture, browser back) also ends the call
      if (!finished.current) socket.emit('call_ended', { partnerId: id });
    };
  }, [socket, isConnected, user?.id, id]);

  const toggleMute = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach((track: any) => {
      track.enabled = !track.enabled;
    });
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    const stream = localStreamRef.current;
    if (!stream || stream.getVideoTracks().length === 0) return;
    stream.getVideoTracks().forEach((track: any) => {
      track.enabled = !track.enabled;
    });
    setIsVideoOff(!isVideoOff);
  };

  const handleHangup = () => leave(true);

  return (
    <SafeAreaView style={styles.container}>
      {/* Remote Video Background */}
      {remoteStream ? (
        <StreamView stream={remoteStream} style={styles.remoteVideo} />
      ) : (
        <View style={styles.placeholderBackground}>
          <Image source={{ uri: mediaUrl(image) }} style={styles.avatarLarge} alt={name || 'Profile'} />
          <Heading style={styles.name}>{name}</Heading>
          <Text style={styles.status}>{status}</Text>
        </View>
      )}

      {/* Header Overlay */}
      {remoteStream && (
        <View style={styles.header}>
          <Heading style={{ color: 'white', fontSize: 18 }}>{name}</Heading>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>{status}</Text>
        </View>
      )}

      {/* Local Video PIP — muted so you never hear yourself */}
      {localStream && !isVideoOff && (
        <StreamView stream={localStream} mirror muted style={styles.localVideo} />
      )}

      {/* Controls */}
      <HStack style={styles.controls}>
        <TouchableOpacity onPress={toggleMute} style={[styles.controlBtn, isMuted && styles.controlBtnActive]}>
          {isMuted ? <MicOff size={24} color="#fff" /> : <Mic size={24} color="#fff" />}
        </TouchableOpacity>

        <TouchableOpacity onPress={toggleVideo} style={[styles.controlBtn, isVideoOff && styles.controlBtnActive]}>
          {isVideoOff ? <VideoOff size={24} color="#fff" /> : <VideoIcon size={24} color="#fff" />}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleHangup} style={[styles.controlBtn, styles.hangupBtn]}>
          <PhoneOff size={24} color="#fff" />
        </TouchableOpacity>
      </HStack>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  remoteVideo: {
    ...StyleSheet.absoluteFillObject,
  },
  placeholderBackground: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2f2f2e',
  },
  avatarLarge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 20,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  name: {
    color: '#fff',
    fontSize: 24,
    marginBottom: 8,
  },
  status: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  header: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  localVideo: {
    position: 'absolute',
    bottom: 140,
    right: 20,
    width: 100,
    height: 150,
    borderRadius: 12,
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  controls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  controlBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlBtnActive: {
    backgroundColor: '#fff3',
  },
  hangupBtn: {
    backgroundColor: '#ff3b30',
  }
});
