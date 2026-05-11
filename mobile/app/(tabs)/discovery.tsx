import React, { useState, useEffect, useCallback } from 'react';
import {
  useWindowDimensions, View, ScrollView,
  TouchableOpacity, Modal, ActivityIndicator, Platform
} from 'react-native';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Image } from '@/components/ui/image';
import { Heading } from '@/components/ui/heading';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle, useSharedValue, withSpring, runOnJS
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Menu, SlidersHorizontal, X, Star, Heart, MapPin, Bolt,
  Check, ChevronDown, ChevronUp, BookmarkPlus, Sparkles
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/src/store/authStore';
import { apiGet, apiPost } from '@/src/lib/api';
import { useRouter, type Href } from 'expo-router';

// ─── Types ────────────────────────────────────────────────────────────────────
interface DiscoveredUser {
  id: string;
  name: string;
  age: number;
  city: string;
  distance_km: number;
  job: string;
  match_pct: number;
  active: boolean;
  image: string;
  bio: string;
}

interface Filters {
  min_age: number;
  max_age: number;
  distance: number;
  sort: string;
  recently_active: boolean;
}

const API_URL = process.env.EXPO_PUBLIC_API_URL as string;

// ─── User Card ────────────────────────────────────────────────────────────────
const UserCard = ({ user, isDesktop = false, onFavorite, isFavorited }: { user: DiscoveredUser; isDesktop?: boolean; onFavorite?: () => void; isFavorited?: boolean }) => (
  <Box className={`bg-surface-container-lowest rounded-xl overflow-hidden shadow-lg border border-outline-variant/10 ${isDesktop ? 'aspect-[3/4] mb-4' : 'w-full h-full'}`}>
    <Image
      source={{ uri: user.image }}
      className="w-full h-full absolute"
      alt="Profile"
    />
    <LinearGradient
      colors={['rgba(0,0,0,0.2)', 'transparent', 'rgba(0,0,0,0.8)']}
      className="absolute inset-0"
    />
    <HStack className="absolute top-4 left-0 right-0 px-4 space-x-1.5 z-20">
      <View className="h-1 flex-1 bg-white rounded-full" />
      <View className="h-1 flex-1 bg-white/30 rounded-full" />
      <View className="h-1 flex-1 bg-white/30 rounded-full" />
    </HStack>
    {/* Favorite button — top right */}
    {onFavorite && (
      <TouchableOpacity
        onPress={onFavorite}
        className="absolute top-4 right-4 z-30 w-9 h-9 rounded-full items-center justify-center"
        style={{ backgroundColor: isFavorited ? '#b41340' : 'rgba(255,255,255,0.2)' }}
      >
        <Heart size={16} color="white" fill={isFavorited ? 'white' : 'transparent'} />
      </TouchableOpacity>
    )}
    <VStack className="absolute bottom-0 left-0 right-0 p-6 z-20">
      <VStack space="xs">
        <HStack className="items-center space-x-2 flex-wrap">
          <Heading className={`font-headline ${isDesktop ? 'text-xl' : 'text-3xl'} font-bold text-white tracking-tight`}>
            {user.name}, {user.age}
          </Heading>
          <View className="bg-primary/40 px-2 py-0.5 rounded border border-white/20 mt-1">
            <Text className="font-label text-[10px] text-white uppercase tracking-tighter">KYC Verified</Text>
          </View>
          {user.active && (
            <View className="bg-[#4CAF50]/40 px-2 py-0.5 rounded border border-white/20 mt-1">
              <Text className="font-label text-[10px] text-white uppercase tracking-tighter">Active Dater</Text>
            </View>
          )}
        </HStack>
        <HStack className="items-center space-x-3">
          <MapPin size={12} color="white" />
          <Text className="font-label text-[10px] text-white uppercase tracking-widest leading-none">
            {user.city} • {user.distance_km < 99999 ? `${user.distance_km} km away` : 'Nearby'}
          </Text>
        </HStack>
      </VStack>
      {!isDesktop && (
        <Text className="mt-4 font-body text-sm text-white/90 leading-relaxed" numberOfLines={2}>
          {user.bio}
        </Text>
      )}
      <HStack className="mt-4 self-start items-center space-x-2 bg-white/10 px-3 py-1.5 rounded-full border border-white/10">
        <Bolt size={12} color="#9097ff" fill="#9097ff" />
        <Text className="font-label text-[10px] uppercase tracking-widest text-white">{user.match_pct}% Match</Text>
      </HStack>
    </VStack>
  </Box>
);

// ─── Action Buttons ───────────────────────────────────────────────────────────
const ActionButtons = ({ isDesktop = false, onLeft, onRight, onStar }: any) => (
  <HStack className={`justify-between items-center ${isDesktop ? 'px-1' : 'px-4 mb-8'}`}>
    <TouchableOpacity onPress={onLeft} className={`${isDesktop ? 'w-10 h-10' : 'w-16 h-16'} rounded-full bg-surface-container-lowest shadow-lg items-center justify-center border border-outline-variant/10`}>
      <X size={isDesktop ? 20 : 32} color="#b41340" />
    </TouchableOpacity>
    <TouchableOpacity onPress={onStar} className={`${isDesktop ? 'w-8 h-8' : 'w-12 h-12'} rounded-full bg-surface-container-lowest shadow-md items-center justify-center border border-outline-variant/10`}>
      <Star size={isDesktop ? 16 : 24} color="#5321d9" fill="#5321d9" />
    </TouchableOpacity>
    <TouchableOpacity onPress={onRight} className={`${isDesktop ? 'w-10 h-10' : 'w-16 h-16'} rounded-full signature-gradient shadow-lg items-center justify-center`}>
      <Heart size={isDesktop ? 20 : 32} color="white" fill="white" />
    </TouchableOpacity>
  </HStack>
);

// ─── Filter Modal ─────────────────────────────────────────────────────────────
const FilterModal = ({
  visible, filters, onClose, onApply
}: {
  visible: boolean;
  filters: Filters;
  onClose: () => void;
  onApply: (f: Filters) => void;
}) => {
  const [local, setLocal] = useState<Filters>(filters);

  useEffect(() => { setLocal(filters); }, [filters, visible]);

  const SORT_OPTIONS = [
    { value: 'RELEVANCE', label: 'Best Match' },
    { value: 'DISTANCE', label: 'Nearest First' },
    { value: 'ACTIVITY', label: 'Recently Active' },
    { value: 'AGE', label: 'Age' },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: '#f9f6f5', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 }}>
          
          {/* Header */}
          <HStack className="justify-between items-center mb-6">
            <Heading className="font-headline text-2xl font-bold text-on-surface">Filters</Heading>
            <TouchableOpacity onPress={onClose} className="w-10 h-10 bg-surface-container-low rounded-full items-center justify-center">
              <X size={20} color="#2f2f2e" />
            </TouchableOpacity>
          </HStack>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Age Range */}
            <VStack space="sm" className="mb-6">
              <Text className="font-label text-[10px] uppercase tracking-widest text-primary font-bold">Age Range</Text>
              <HStack space="md" className="items-center">
                <VStack className="flex-1" space="xs">
                  <Text className="text-xs text-on-surface-variant">Min: {local.min_age}</Text>
                  <HStack space="sm" className="flex-wrap">
                    {[18, 21, 25, 30, 35].map(age => (
                      <TouchableOpacity
                        key={age}
                        onPress={() => setLocal({ ...local, min_age: age })}
                        className={`px-3 py-2 rounded-lg border ${local.min_age === age ? 'bg-primary border-primary' : 'bg-white border-surface-container-high'}`}
                      >
                        <Text className={`text-xs font-bold ${local.min_age === age ? 'text-white' : 'text-on-surface'}`}>{age}</Text>
                      </TouchableOpacity>
                    ))}
                  </HStack>
                </VStack>
                <VStack className="flex-1" space="xs">
                  <Text className="text-xs text-on-surface-variant">Max: {local.max_age}</Text>
                  <HStack space="sm" className="flex-wrap">
                    {[30, 35, 40, 50, 65].map(age => (
                      <TouchableOpacity
                        key={age}
                        onPress={() => setLocal({ ...local, max_age: age })}
                        className={`px-3 py-2 rounded-lg border ${local.max_age === age ? 'bg-primary border-primary' : 'bg-white border-surface-container-high'}`}
                      >
                        <Text className={`text-xs font-bold ${local.max_age === age ? 'text-white' : 'text-on-surface'}`}>{age}</Text>
                      </TouchableOpacity>
                    ))}
                  </HStack>
                </VStack>
              </HStack>
            </VStack>

            {/* Distance */}
            <VStack space="sm" className="mb-6">
              <Text className="font-label text-[10px] uppercase tracking-widest text-primary font-bold">Max Distance: {local.distance} km</Text>
              <HStack space="sm" className="flex-wrap">
                {[10, 25, 50, 100, 250].map(d => (
                  <TouchableOpacity
                    key={d}
                    onPress={() => setLocal({ ...local, distance: d })}
                    className={`px-4 py-2 rounded-full border ${local.distance === d ? 'bg-primary border-primary' : 'bg-white border-surface-container-high'}`}
                  >
                    <Text className={`text-sm font-bold ${local.distance === d ? 'text-white' : 'text-on-surface'}`}>{d} km</Text>
                  </TouchableOpacity>
                ))}
              </HStack>
            </VStack>

            {/* Sort */}
            <VStack space="sm" className="mb-6">
              <Text className="font-label text-[10px] uppercase tracking-widest text-primary font-bold">Sort By</Text>
              <VStack space="xs">
                {SORT_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setLocal({ ...local, sort: opt.value })}
                    className={`p-4 rounded-xl border flex-row items-center justify-between ${local.sort === opt.value ? 'bg-primary/5 border-primary' : 'bg-white border-surface-container-high'}`}
                  >
                    <Text className={`font-bold ${local.sort === opt.value ? 'text-primary' : 'text-on-surface'}`}>{opt.label}</Text>
                    {local.sort === opt.value && <Check size={16} color="#414BEA" />}
                  </TouchableOpacity>
                ))}
              </VStack>
            </VStack>

            {/* Recently Active Toggle */}
            <TouchableOpacity
              onPress={() => setLocal({ ...local, recently_active: !local.recently_active })}
              className={`p-4 rounded-xl border mb-8 flex-row items-center justify-between ${local.recently_active ? 'bg-primary/5 border-primary' : 'bg-white border-surface-container-high'}`}
            >
              <VStack>
                <Text className={`font-bold ${local.recently_active ? 'text-primary' : 'text-on-surface'}`}>Active in last 24h only</Text>
                <Text className="text-xs text-on-surface-variant">Show people who recently logged in</Text>
              </VStack>
              {local.recently_active && <Check size={16} color="#414BEA" />}
            </TouchableOpacity>
          </ScrollView>

          {/* Apply Button */}
          <TouchableOpacity
            onPress={() => onApply(local)}
            className="h-14 signature-gradient rounded-2xl items-center justify-center shadow-lg shadow-primary/20"
          >
            <Text className="text-white font-bold text-lg">Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function DiscoveryScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width > 768;
  const maxWidth = 1200;
  const router = useRouter();

  const [users, setUsers] = useState<DiscoveredUser[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [favoritedIds, setFavoritedIds] = useState<Set<string>>(new Set());

  const [filters, setFilters] = useState<Filters>({
    min_age: 18,
    max_age: 50,
    distance: 100,
    sort: 'RELEVANCE',
    recently_active: false,
  });

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const fetchUsers = useCallback(async (activeFilters: Filters) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        min_age: String(activeFilters.min_age),
        max_age: String(activeFilters.max_age),
        distance: String(activeFilters.distance),
        sort: activeFilters.sort,
        recently_active: String(activeFilters.recently_active),
      });
      const res = await apiGet(`/api/v1/discovery?${params.toString()}`);
      const json = await res.json();
      if (json.success && json.data.users) {
        const mapped: DiscoveredUser[] = json.data.users.map((u: any) => ({
          id: u.id,
          name: u.first_name || 'User',
          age: u.dob ? new Date().getFullYear() - new Date(u.dob).getFullYear() : 25,
          city: u.living_in || 'Unknown',
          distance_km: u.distance_km ?? 99999,
          job: u.job_title || '',
          match_pct: u.match_pct ?? 50,
          active: u.status === 'APPROVED',
          image: u.photos?.length > 0
            ? (u.photos[0].url.startsWith('http') ? u.photos[0].url : `${API_URL}/${u.photos[0].url}`)
            : 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400',
          bio: u.bio || '',
        }));
        setUsers(mapped);
        setCurrentIndex(0);
      }
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers(filters);
  }, []);

  const handleApplyFilters = (newFilters: Filters) => {
    setFilterVisible(false);
    setFilters(newFilters);
    fetchUsers(newFilters);
  };

  const handleSwipe = async (userId: string, action: 'LIKE' | 'DISLIKE' | 'SUPER_LIKE') => {
    try {
      await apiPost('/api/v1/swipe', { to_user_id: userId, action });
    } catch (err) {
      console.error('Swipe failed:', err);
    }
  };

  const toggleFavorite = async (userId: string) => {
    try {
      await apiPost(`/api/v1/favorites/${userId}`, {});
      setFavoritedIds(prev => {
        const next = new Set(prev);
        next.has(userId) ? next.delete(userId) : next.add(userId);
        return next;
      });
    } catch (err) {
      console.error('Favorite failed:', err);
    }
  };

  const handleSwipeComplete = (direction: 'left' | 'right' | 'star') => {
    if (users.length === 0) return;
    const userToSwipe = users[currentIndex];

    setCurrentIndex(prev => (prev + 1) % users.length);
    translateX.value = 0;
    translateY.value = 0;

    const action = direction === 'right' ? 'LIKE' : direction === 'star' ? 'SUPER_LIKE' : 'DISLIKE';
    handleSwipe(userToSwipe.id, action);
  };

  const SWIPE_THRESHOLD = width * 0.25;

  const panGesture = Gesture.Pan()
    .onChange((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      if (event.translationX > SWIPE_THRESHOLD) {
        translateX.value = withSpring(width + 100, {}, () => runOnJS(handleSwipeComplete)('right'));
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withSpring(-width - 100, {}, () => runOnJS(handleSwipeComplete)('left'));
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${(translateX.value / width) * 10}deg` },
    ],
  }));

  const currentUser = users.length > 0 ? users[currentIndex] : null;

  const hasActiveFilters =
    filters.min_age !== 18 || filters.max_age !== 50 ||
    filters.distance !== 100 || filters.sort !== 'RELEVANCE' ||
    filters.recently_active;

  return (
    <Box className="flex-1 bg-surface items-center">
      <FilterModal
        visible={filterVisible}
        filters={filters}
        onClose={() => setFilterVisible(false)}
        onApply={handleApplyFilters}
      />

      <Box className="w-full flex-1" style={{ maxWidth: isDesktop ? maxWidth : '100%' }}>

        {/* TopAppBar */}
        <SafeAreaView edges={['top']} style={{ backgroundColor: '#f9f6f5' }}>
          <HStack className="justify-between items-center px-6 py-4 bg-surface border-b border-surface-container-low">
            <TouchableOpacity>
              <Menu size={24} color="#2f2f2e" />
            </TouchableOpacity>
            <HStack className="items-center space-x-3">
              <Text className="font-headline uppercase tracking-widest text-sm text-primary font-bold">
                Discovery
              </Text>
            </HStack>
            <HStack className="items-center space-x-3">
              <TouchableOpacity
                onPress={() => router.push('/recommendations' as Href)}
                style={{ padding: 4 }}
              >
                <Sparkles size={22} color="#414BEA" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setFilterVisible(true)}
                className={`relative ${hasActiveFilters ? 'opacity-100' : 'opacity-80'}`}
              >
                <SlidersHorizontal size={24} color={hasActiveFilters ? '#414BEA' : '#2f2f2e'} />
                {hasActiveFilters && (
                  <View style={{
                    position: 'absolute', top: -4, right: -4,
                    width: 10, height: 10, borderRadius: 5, backgroundColor: '#414BEA'
                  }} />
                )}
              </TouchableOpacity>
            </HStack>
          </HStack>
        </SafeAreaView>

        <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 32, paddingBottom: 120 }}>

          {loading ? (
            <Box className="w-full aspect-[3/4] mb-8 items-center justify-center bg-surface-container-lowest rounded-xl border border-outline-variant/10">
              <ActivityIndicator size="large" color="#414BEA" />
              <Text className="font-body text-on-surface-variant mt-4">Finding people near you…</Text>
            </Box>
          ) : isDesktop ? (
            /* Desktop Grid View */
            <VStack space="xl">
              <HStack className="flex-wrap justify-center gap-6">
                {users.map((user) => (
                  <VStack key={user.id} className="w-[30%] min-w-[300px]" space="md">
                    <UserCard user={user} isDesktop />
                    <ActionButtons
                      isDesktop
                      onLeft={() => handleSwipe(user.id, 'DISLIKE')}
                      onRight={() => handleSwipe(user.id, 'LIKE')}
                      onStar={() => handleSwipe(user.id, 'SUPER_LIKE')}
                    />
                  </VStack>
                ))}
              </HStack>
            </VStack>
          ) : (
            /* Mobile Swipe View */
            <>
              {currentUser ? (
                <>
                  <Box className="w-full aspect-[3/4] relative mb-8">
                    <Box className="absolute inset-0 translate-x-3 translate-y-3 bg-surface-container-high rounded-xl -z-10" />
                    <GestureDetector gesture={panGesture}>
                      <Animated.View style={[animatedStyle, { width: '100%', height: '100%' }]}>
                        <UserCard
                          user={currentUser}
                          onFavorite={() => toggleFavorite(currentUser.id)}
                          isFavorited={favoritedIds.has(currentUser.id)}
                        />
                      </Animated.View>
                    </GestureDetector>
                  </Box>
                  <ActionButtons
                    onLeft={() => handleSwipeComplete('left')}
                    onRight={() => handleSwipeComplete('right')}
                    onStar={() => handleSwipeComplete('star')}
                  />
                </>
              ) : (
                <Box className="w-full aspect-[3/4] mb-8 items-center justify-center bg-surface-container-lowest rounded-xl border border-outline-variant/10">
                  <Text className="text-on-surface-variant font-body">No more people nearby</Text>
                  <TouchableOpacity onPress={() => fetchUsers(filters)} className="mt-4 px-6 py-3 signature-gradient rounded-full">
                    <Text className="text-white font-bold">Refresh</Text>
                  </TouchableOpacity>
                </Box>
              )}
            </>
          )}

          {/* Discovery Status Board */}
          <HStack
            className={`space-x-4 mt-8 ${isDesktop ? 'justify-center mx-auto' : ''}`}
            style={isDesktop ? { width: '80%', maxWidth: 800 } : {}}
          >
            <VStack className="flex-1 bg-surface-container-low p-4 rounded-xl space-y-2">
              <Text className="font-label text-[10px] uppercase text-on-surface-variant tracking-widest">Daily Picks</Text>
              <Text className="font-headline text-xl font-bold text-on-surface">{users.length} Found</Text>
              <Box className="w-full bg-surface-container-high h-1 rounded-full overflow-hidden">
                <Box className="bg-primary h-full" style={{ width: `${Math.min(100, users.length * 5)}%` }} />
              </Box>
            </VStack>
            <VStack className="flex-1 bg-primary/10 p-4 rounded-xl space-y-2">
              <Text className="font-label text-[10px] uppercase text-primary tracking-widest font-bold">Active Filters</Text>
              <Text className="font-headline text-xl font-bold text-primary">
                {[
                  filters.min_age !== 18 || filters.max_age !== 50 ? `${filters.min_age}–${filters.max_age}y` : null,
                  filters.distance !== 100 ? `${filters.distance}km` : null,
                  filters.recently_active ? 'Active' : null,
                ].filter(Boolean).join(', ') || 'None'}
              </Text>
              <Text className="font-body text-[10px] text-on-surface-variant">
                {filters.sort.replace('_', ' ').toLowerCase()} sorting
              </Text>
            </VStack>
          </HStack>

        </ScrollView>
      </Box>
    </Box>
  );
}
