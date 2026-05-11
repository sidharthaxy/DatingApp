import React, { useState, useEffect } from 'react';
import { ScrollView, View, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Activity, Camera, Heart, Zap, Image as ImageIcon } from 'lucide-react-native';
import { apiGet } from '@/src/lib/api';

export default function ActivityFeedScreen() {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivity();
  }, []);

  const fetchActivity = async () => {
    try {
      const res = await apiGet('/api/v1/social/activity');
      const json = await res.json();
      if (json.success) {
        setActivities(json.data.activities);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'NEW_STORY': return <Camera size={20} color="#414BEA" />;
      case 'STORY_REACTION': return <Heart size={20} color="#b41340" />;
      case 'UPDATED_PROMPTS': return <Zap size={20} color="#e6b800" />;
      default: return <ImageIcon size={20} color="#2f2f2e" />;
    }
  };

  const getActivityText = (act: any) => {
    const actorName = act.actor?.first_name || 'Someone';
    switch (act.type) {
      case 'NEW_STORY': return `${actorName} added a new story`;
      case 'STORY_REACTION': return `${actorName} reacted to your story`;
      case 'UPDATED_PROMPTS': return `${actorName} updated their profile prompts`;
      default: return `${actorName} performed an action`;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <VStack style={styles.header}>
          <HStack style={{ alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Activity size={28} color="#2f2f2e" />
            <Heading style={styles.title}>Activity Feed</Heading>
          </HStack>
          <Text style={styles.subtitle}>See what your matches are up to.</Text>
        </VStack>

        {loading ? (
          <ActivityIndicator color="#414BEA" size="large" style={{ marginTop: 40 }} />
        ) : activities.length === 0 ? (
          <Text style={styles.emptyText}>No recent activity found.</Text>
        ) : (
          activities.map((act) => (
            <HStack key={act.id} style={styles.activityCard}>
              <View style={styles.iconContainer}>
                {getActivityIcon(act.type)}
              </View>
              <VStack style={{ flex: 1 }}>
                <Text style={styles.activityText}>{getActivityText(act)}</Text>
                <Text style={styles.timeText}>
                  {new Date(act.created_at).toLocaleDateString()} at {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </VStack>
            </HStack>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
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
  activityCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityText: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#2f2f2e',
  },
  timeText: {
    fontSize: 11,
    color: '#afadac',
    fontFamily: 'Manrope_400Regular',
    marginTop: 4,
  },
  emptyText: {
    color: '#afadac',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'Manrope_400Regular',
    paddingVertical: 24,
  }
});
