import React, { useState, useEffect } from 'react';
import { ScrollView, TouchableOpacity, View, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShieldAlert, ShieldCheck, HeartPulse, UserCheck, CheckCircle2, Phone, Plus, Trash2 } from 'lucide-react-native';
import { apiGet, apiPost, apiDelete } from '@/src/lib/api';
import * as Location from 'expo-location';

export default function SafetyCenterScreen() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [panicLoading, setPanicLoading] = useState(false);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const res = await apiGet('/api/v1/safety/emergency-contacts');
      const json = await res.json();
      if (json.success) {
        setContacts(json.data.contacts);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = () => {
    Alert.prompt('Add Contact', 'Enter Name and Phone Number (comma separated)', async (input) => {
      if (!input) return;
      const parts = input.split(',');
      if (parts.length < 2) {
        return Alert.alert('Invalid Format', 'Please use: Name, Phone');
      }
      try {
        const res = await apiPost('/api/v1/safety/emergency-contacts', {
          name: parts[0].trim(),
          phone: parts[1].trim(),
          relation: 'Friend'
        });
        const json = await res.json();
        if (json.success) {
          fetchContacts();
        } else {
          Alert.alert('Error', json.error?.message || 'Failed to add');
        }
      } catch (e) {
        console.error(e);
      }
    });
  };

  const handleDeleteContact = (id: string) => {
    Alert.alert('Delete', 'Remove this emergency contact?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try {
          await apiDelete(`/api/v1/safety/emergency-contacts/${id}`);
          fetchContacts();
        } catch (err) {}
      }}
    ]);
  };

  const handlePanicButton = async () => {
    Alert.alert(
      'TRIGGER PANIC MODE',
      'This will instantly notify your emergency contacts and log an incident with your location. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'ACTIVATE', 
          style: 'destructive',
          onPress: async () => {
            setPanicLoading(true);
            try {
              let location = await Location.getCurrentPositionAsync({});
              const res = await apiPost('/api/v1/safety/panic', {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude
              });
              const json = await res.json();
              if (json.success) {
                Alert.alert('Panic Activated', json.data.message);
              } else {
                Alert.alert('Error', 'Failed to trigger panic mode');
              }
            } catch (err) {
              Alert.alert('Error', 'Location permission denied or network error.');
            } finally {
              setPanicLoading(false);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <VStack style={styles.header}>
          <HStack style={{ alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <ShieldAlert size={28} color="#2f2f2e" />
            <Heading style={styles.title}>Safety Center</Heading>
          </HStack>
          <Text style={styles.subtitle}>Your well-being is our top priority.</Text>
        </VStack>

        {/* Panic Button */}
        <Box style={styles.panicContainer}>
          <TouchableOpacity 
            style={[styles.panicBtn, panicLoading && { opacity: 0.7 }]}
            onPress={handlePanicButton}
            disabled={panicLoading}
          >
            {panicLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <HeartPulse size={40} color="#fff" />
            )}
            <Text style={styles.panicText}>PANIC BUTTON</Text>
          </TouchableOpacity>
          <Text style={styles.panicSub}>Notifies your emergency contacts with your live location.</Text>
        </Box>

        {/* Trust Badges Explanation */}
        <VStack style={styles.section}>
          <Heading style={styles.sectionTitle}>Trust Badges Explained</Heading>
          <HStack style={styles.badgeItem}>
            <ShieldCheck size={24} color="#4CAF50" />
            <VStack style={{ flex: 1 }}>
              <Text style={styles.badgeTitle}>KYC Verified</Text>
              <Text style={styles.badgeDesc}>This user has completed video KYC verification.</Text>
            </VStack>
          </HStack>
          <HStack style={styles.badgeItem}>
            <UserCheck size={24} color="#2196F3" />
            <VStack style={{ flex: 1 }}>
              <Text style={styles.badgeTitle}>Active Dater</Text>
              <Text style={styles.badgeDesc}>Regularly logs in and has a complete profile.</Text>
            </VStack>
          </HStack>
          <HStack style={styles.badgeItem}>
            <CheckCircle2 size={24} color="#FFC107" />
            <VStack style={{ flex: 1 }}>
              <Text style={styles.badgeTitle}>Elite Member</Text>
              <Text style={styles.badgeDesc}>Subscribed to our highest trust tier.</Text>
            </VStack>
          </HStack>
        </VStack>

        {/* Emergency Contacts */}
        <VStack style={styles.section}>
          <HStack style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Heading style={styles.sectionTitle}>Emergency Contacts</Heading>
            <TouchableOpacity onPress={handleAddContact} style={styles.addBtn}>
              <Plus size={16} color="#414BEA" />
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          </HStack>

          {loading ? (
            <ActivityIndicator color="#414BEA" />
          ) : contacts.length === 0 ? (
            <Text style={styles.emptyText}>No emergency contacts added yet.</Text>
          ) : (
            contacts.map((c) => (
              <HStack key={c.id} style={styles.contactCard}>
                <View style={styles.contactIcon}>
                  <Phone size={18} color="#414BEA" />
                </View>
                <VStack style={{ flex: 1 }}>
                  <Text style={styles.contactName}>{c.name}</Text>
                  <Text style={styles.contactPhone}>{c.phone}</Text>
                </VStack>
                <TouchableOpacity onPress={() => handleDeleteContact(c.id)} style={{ padding: 8 }}>
                  <Trash2 size={18} color="#ff3b30" />
                </TouchableOpacity>
              </HStack>
            ))
          )}
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}

// Dummy Box component for styled view
function Box({ children, style }: any) {
  return <View style={style}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f6f5',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#2f2f2e',
  },
  subtitle: {
    fontSize: 14,
    color: '#5c5b5b',
    fontFamily: 'Manrope_400Regular',
  },
  panicContainer: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#ff3b30',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 5,
  },
  panicBtn: {
    backgroundColor: '#ff3b30',
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ff3b30',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 4,
    borderColor: '#ffebee',
  },
  panicText: {
    color: '#fff',
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 16,
    marginTop: 8,
  },
  panicSub: {
    marginTop: 16,
    fontSize: 12,
    color: '#afadac',
    textAlign: 'center',
    fontFamily: 'Manrope_400Regular',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#2f2f2e',
    marginBottom: 16,
  },
  badgeItem: {
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  badgeTitle: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#2f2f2e',
  },
  badgeDesc: {
    fontSize: 12,
    color: '#5c5b5b',
    fontFamily: 'Manrope_400Regular',
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#414BEA10',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  addBtnText: {
    color: '#414BEA',
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 12,
  },
  emptyText: {
    color: '#afadac',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'Manrope_400Regular',
    paddingVertical: 12,
  },
  contactCard: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  contactIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#414BEA10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactName: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#2f2f2e',
  },
  contactPhone: {
    fontSize: 12,
    color: '#5c5b5b',
    fontFamily: 'Manrope_400Regular',
    marginTop: 2,
  }
});
