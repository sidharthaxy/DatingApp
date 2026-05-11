import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Image } from '@/components/ui/image';
import { Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/src/store/authStore';
import { useChatStore } from '@/src/store/chatStore';

// Note: react-native-webrtc requires a custom dev client. 
// This acts as a mock/placeholder if it fails to import in Expo Go.
let RTCView: any = View;
let mediaDevices: any = null;
let RTCPeerConnection: any = null;
let RTCSessionDescription: any = null;
let RTCIceCandidate: any = null;

try {
  const webrtc = require('react-native-webrtc');
  RTCView = webrtc.RTCView;
  mediaDevices = webrtc.mediaDevices;
  RTCPeerConnection = webrtc.RTCPeerConnection;
  RTCSessionDescription = webrtc.RTCSessionDescription;
  RTCIceCandidate = webrtc.RTCIceCandidate;
} catch (e) {
  console.warn('react-native-webrtc not available (expected in Expo Go)');
}

export default function CallScreen() {
  const router = useRouter();
  const { id, name, image } = useLocalSearchParams<{ id: string; name: string; image: string }>();
  const user = useAuthStore(s => s.user);
  const socket = useChatStore(s => s.socket);

  const [localStream, setLocalStream] = useState<any>(null);
  const [remoteStream, setRemoteStream] = useState<any>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [status, setStatus] = useState('Calling...');
  
  const peerConnection = useRef<any>(null);

  useEffect(() => {
    if (!socket || !user || !RTCPeerConnection) {
      setStatus('WebRTC not supported in this environment');
      return;
    }

    const startCall = async () => {
      try {
        const stream = await mediaDevices.getUserMedia({
          audio: true,
          video: { facingMode: 'user' }
        });
        setLocalStream(stream);

        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        peerConnection.current = pc;

        stream.getTracks().forEach((track: any) => pc.addTrack(track, stream));

        pc.ontrack = (event: any) => {
          setRemoteStream(event.streams[0]);
          setStatus('Connected');
        };

        pc.onicecandidate = (event: any) => {
          if (event.candidate) {
            socket.emit('webrtc_ice_candidate', {
              partnerId: id,
              candidate: event.candidate
            });
          }
        };

        // Notify partner
        socket.emit('call_initiated', { partnerId: id });

        // Create offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('webrtc_offer', { partnerId: id, offer });

      } catch (err) {
        console.error('Failed to start call', err);
        setStatus('Failed to access camera/mic');
      }
    };

    startCall();

    // Socket listeners for WebRTC
    const handleAnswer = async (data: any) => {
      if (data.from === id && peerConnection.current) {
        await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        setStatus('Connected');
      }
    };

    const handleIceCandidate = async (data: any) => {
      if (data.from === id && peerConnection.current) {
        await peerConnection.current.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    };

    const handleCallEnded = (data: any) => {
      if (data.from === id) {
        Alert.alert('Call Ended', `${name} ended the call.`, [{ text: 'OK', onPress: handleHangup }]);
      }
    };

    socket.on('webrtc_answer', handleAnswer);
    socket.on('webrtc_ice_candidate', handleIceCandidate);
    socket.on('call_ended', handleCallEnded);

    return () => {
      socket.off('webrtc_answer', handleAnswer);
      socket.off('webrtc_ice_candidate', handleIceCandidate);
      socket.off('call_ended', handleCallEnded);
      if (localStream) {
        localStream.getTracks().forEach((track: any) => track.stop());
      }
      if (peerConnection.current) {
        peerConnection.current.close();
      }
      socket.emit('call_ended', { partnerId: id });
    };
  }, []);

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track: any) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track: any) => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  const handleHangup = () => {
    if (socket) socket.emit('call_ended', { partnerId: id });
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Remote Video Background */}
      {remoteStream && !isVideoOff ? (
        <RTCView
          streamURL={remoteStream.toURL()}
          style={styles.remoteVideo}
          objectFit="cover"
        />
      ) : (
        <View style={styles.placeholderBackground}>
          <Image source={{ uri: image }} style={styles.avatarLarge} />
          <Heading style={styles.name}>{name}</Heading>
          <Text style={styles.status}>{status}</Text>
        </View>
      )}

      {/* Header Overlay */}
      <View style={styles.header}>
        <Heading style={{ color: 'white', fontSize: 18 }}>{name}</Heading>
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>{status}</Text>
      </View>

      {/* Local Video PIP */}
      {localStream && !isVideoOff && (
        <RTCView
          streamURL={localStream.toURL()}
          style={styles.localVideo}
          objectFit="cover"
          zOrder={1}
        />
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
