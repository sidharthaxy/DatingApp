import React from 'react';
import { Modal, View, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Phone, PhoneOff } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useChatStore } from '@/src/store/chatStore';
import { mediaUrl } from '@/src/lib/config';

/**
 * Rings when a match starts a video call. Mounted once at the root so it shows on any
 * screen. (Before this existed nothing listened for incoming calls, so no call could
 * ever be answered.)
 */
export default function IncomingCallModal() {
  const router = useRouter();
  const from = useChatStore((s) => s.incomingCallFrom);
  const dismiss = useChatStore((s) => s.dismissIncomingCall);
  const caller = useChatStore((s) => s.conversations.find((c) => c.partner.id === from)?.partner);

  if (!from) return null;

  const name = caller?.first_name || 'Your match';
  const image = mediaUrl(caller?.photos?.[0]?.url);

  const accept = () => {
    dismiss(false);
    router.push({ pathname: '/call/[id]', params: { id: from, name, image, incoming: '1' } });
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => dismiss(true)}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Image source={{ uri: image }} style={styles.avatar} />
          <Heading style={styles.name}>{name}</Heading>
          <Text style={styles.subtitle}>Incoming video call…</Text>
          <View style={styles.actions}>
            <TouchableOpacity onPress={() => dismiss(true)} style={[styles.button, styles.decline]} accessibilityLabel="Decline call">
              <PhoneOff size={26} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={accept} style={[styles.button, styles.accept]} accessibilityLabel="Accept call">
              <Phone size={26} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 340, backgroundColor: '#2f2f2e', borderRadius: 28, padding: 28, alignItems: 'center' },
  avatar: { width: 104, height: 104, borderRadius: 52, marginBottom: 16, backgroundColor: '#444' },
  name: { color: '#fff', fontSize: 22 },
  subtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 48, marginTop: 28 },
  button: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  decline: { backgroundColor: '#ff3b30' },
  accept: { backgroundColor: '#34c759' },
});
