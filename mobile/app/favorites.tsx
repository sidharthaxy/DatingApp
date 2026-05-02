import React, { useState, useEffect, useCallback } from 'react';
import { ScrollView, TouchableOpacity, View, ActivityIndicator, RefreshControl } from 'react-native';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Image } from '@/components/ui/image';
import { ArrowLeft, Heart, Briefcase } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiGet, apiPost } from '@/src/lib/api';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

interface FavoriteUser {
  id: string;
  target_id: string;
  target: {
    id: string;
    first_name: string | null;
    job_title: string | null;
    photos: { url: string }[];
  };
}

function getPhoto(photos: { url: string }[]): string {
  const raw = photos?.[0]?.url;
  if (!raw) return 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400';
  return raw.startsWith('http') ? raw : `${API_URL}/${raw}`;
}

export default function FavoritesScreen() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<FavoriteUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchFavorites = useCallback(async () => {
    try {
      const res = await apiGet('/api/v1/favorites');
      const json = await res.json();
      if (json.success) {
        setFavorites(json.data.favorites);
      }
    } catch (e) {
      console.error('Failed to load favorites', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchFavorites(); }, []);

  const removeFavorite = async (targetId: string) => {
    setTogglingId(targetId);
    try {
      const res = await apiPost(`/api/v1/favorites/${targetId}`, {});
      const json = await res.json();
      if (json.success && json.data.action === 'removed') {
        setFavorites(prev => prev.filter(f => f.target.id !== targetId));
      }
    } catch (e) {
      console.error('Failed to remove favorite', e);
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9f6f5' }}>
      <Box className="flex-1 bg-surface">
        {/* Header */}
        <HStack className="items-center px-6 py-4 border-b border-surface-container-low space-x-4">
          <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center rounded-full bg-surface-container-low">
            <ArrowLeft size={20} color="#2f2f2e" />
          </TouchableOpacity>
          <Heading className="font-headline text-xl font-bold text-on-surface flex-1">My Favorites</Heading>
          <Text className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest">{favorites.length} saved</Text>
        </HStack>

        {loading ? (
          <Box className="flex-1 items-center justify-center">
            <ActivityIndicator color="#414BEA" size="large" />
          </Box>
        ) : favorites.length === 0 ? (
          <Box className="flex-1 items-center justify-center px-8">
            <Box className="w-20 h-20 bg-primary/10 rounded-full items-center justify-center mb-4">
              <Heart size={36} color="#414BEA" />
            </Box>
            <Heading className="font-headline text-xl font-bold text-on-surface text-center mb-2">No Favorites Yet</Heading>
            <Text className="font-body text-sm text-on-surface-variant text-center leading-relaxed">
              Heart profiles you love during discovery — they'll appear here.
            </Text>
          </Box>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchFavorites(); }} tintColor="#414BEA" />}
          >
            <HStack className="flex-wrap gap-3">
              {favorites.map((fav) => (
                <Box
                  key={fav.id}
                  className="rounded-2xl overflow-hidden bg-surface-container-low border border-surface-container-high"
                  style={{ width: '47%' }}
                >
                  <Box style={{ height: 180 }}>
                    <Image
                      source={{ uri: getPhoto(fav.target.photos) }}
                      className="w-full h-full"
                      alt={fav.target.first_name || 'User'}
                    />
                  </Box>
                  <VStack className="p-3" space="xs">
                    <Text className="font-headline text-sm font-bold text-on-surface" numberOfLines={1}>
                      {fav.target.first_name || 'User'}
                    </Text>
                    {fav.target.job_title && (
                      <HStack className="items-center space-x-1">
                        <Briefcase size={10} color="#afadac" />
                        <Text className="font-body text-[10px] text-on-surface-variant" numberOfLines={1}>
                          {fav.target.job_title}
                        </Text>
                      </HStack>
                    )}
                    <TouchableOpacity
                      onPress={() => removeFavorite(fav.target.id)}
                      disabled={togglingId === fav.target.id}
                      className="mt-1 py-2 rounded-lg bg-error/10 items-center"
                    >
                      {togglingId === fav.target.id ? (
                        <ActivityIndicator size="small" color="#b41340" />
                      ) : (
                        <Text className="text-[10px] font-bold text-error uppercase tracking-widest">Remove</Text>
                      )}
                    </TouchableOpacity>
                  </VStack>
                </Box>
              ))}
            </HStack>
          </ScrollView>
        )}
      </Box>
    </SafeAreaView>
  );
}
