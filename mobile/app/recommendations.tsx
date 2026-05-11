import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView, TouchableOpacity, View, ActivityIndicator,
  RefreshControl, Alert, StyleSheet,
} from 'react-native';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Image } from '@/components/ui/image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, MapPin, RefreshCw, Heart, ChevronRight, Zap } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { apiGet, apiPost } from '@/src/lib/api';
import { useAuthStore } from '@/src/store/authStore';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface ScoreBreakdown {
  interests: number;
  goal: number;
  age: number;
  distance: number;
  activity: number;
  boost: number;
}

interface Recommendation {
  id: string;
  first_name: string | null;
  dob: string | null;
  bio: string | null;
  city: string | null;
  job_title: string | null;
  compatibility_score: number;
  score_breakdown: ScoreBreakdown;
  distance_km: number;
  photos: { url: string }[];
}

// ─── Score Ring ─────────────────────────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const color = score >= 75 ? '#414BEA' : score >= 50 ? '#ff7c62' : '#afadac';
  return (
    <View style={[styles.scoreRing, { borderColor: color }]}>
      <Text style={[styles.scoreNum, { color }]}>{score}</Text>
      <Text style={styles.scoreLabel}>%</Text>
    </View>
  );
}

// ─── Breakdown Bar ──────────────────────────────────────────────────────────────
function BreakdownBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <VStack style={{ marginBottom: 6 }}>
      <HStack style={{ justifyContent: 'space-between', marginBottom: 3 }}>
        <Text style={styles.barLabel}>{label}</Text>
        <Text style={styles.barValue}>{value}/{max}</Text>
      </HStack>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%` as any }]} />
      </View>
    </VStack>
  );
}

// ─── Recommendation Card ────────────────────────────────────────────────────────
function RecCard({ rec, onFavorite }: { rec: Recommendation; onFavorite: () => void }) {
  const router = useRouter();
  const age = rec.dob
    ? Math.floor((Date.now() - new Date(rec.dob).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;
  const photo = rec.photos?.[0]?.url;
  const [showBreakdown, setShowBreakdown] = useState(false);

  return (
    <Box style={styles.card}>
      {/* Photo + Score ring */}
      <View style={{ position: 'relative' }}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.photo} alt="Profile" />
        ) : (
          <View style={[styles.photo, { backgroundColor: '#eae7e7', alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={{ fontSize: 40 }}>👤</Text>
          </View>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.photoGradient}
        />
        <View style={styles.scoreRingWrap}>
          <ScoreRing score={rec.compatibility_score} />
        </View>
      </View>

      {/* Info */}
      <VStack style={styles.cardBody}>
        <HStack style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <VStack>
            <Heading style={styles.cardName}>
              {rec.first_name ?? 'Unknown'}{age ? `, ${age}` : ''}
            </Heading>
            {rec.city && (
              <HStack style={{ alignItems: 'center', gap: 4, marginTop: 2 }}>
                <MapPin size={11} color="#afadac" />
                <Text style={styles.cardSub}>
                  {rec.city}{rec.distance_km < 99999 ? ` · ${rec.distance_km} km` : ''}
                </Text>
              </HStack>
            )}
            {rec.job_title && <Text style={styles.cardJob}>{rec.job_title}</Text>}
          </VStack>
          <TouchableOpacity onPress={onFavorite} style={styles.favoriteBtn}>
            <Heart size={16} color="#b41340" />
          </TouchableOpacity>
        </HStack>

        {rec.bio && (
          <Text style={styles.cardBio} numberOfLines={2}>{rec.bio}</Text>
        )}

        {/* Score breakdown toggle */}
        <TouchableOpacity
          onPress={() => setShowBreakdown(!showBreakdown)}
          style={styles.breakdownToggle}
        >
          <Zap size={13} color="#414BEA" />
          <Text style={styles.breakdownToggleText}>
            {showBreakdown ? 'Hide' : 'View'} compatibility breakdown
          </Text>
          <ChevronRight
            size={13}
            color="#414BEA"
            style={{ transform: [{ rotate: showBreakdown ? '90deg' : '0deg' }] }}
          />
        </TouchableOpacity>

        {showBreakdown && (
          <VStack style={styles.breakdownBox}>
            <BreakdownBar label="Shared Interests" value={rec.score_breakdown.interests} max={30} />
            <BreakdownBar label="Relationship Goal" value={rec.score_breakdown.goal} max={20} />
            <BreakdownBar label="Age Proximity" value={rec.score_breakdown.age} max={15} />
            <BreakdownBar label="Distance" value={rec.score_breakdown.distance} max={15} />
            <BreakdownBar label="Activity" value={rec.score_breakdown.activity} max={10} />
            <BreakdownBar label="Boost / Tier" value={rec.score_breakdown.boost} max={10} />
          </VStack>
        )}
      </VStack>
    </Box>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────────
export default function RecommendationsScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const tier = user?.subscription_tier ?? 'FREE';

  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [favoritedIds, setFavoritedIds] = useState<Set<string>>(new Set());

  const fetchRecs = useCallback(async () => {
    try {
      const res = await apiGet('/api/v1/recommendations');
      const json = await res.json();
      if (json.success) {
        setRecs(json.data.recommendations);
        setGeneratedAt(json.data.generated_at);
      }
    } catch (e) {
      console.error('[Recommendations] fetch failed:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchRecs(); }, [fetchRecs]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await apiPost('/api/v1/recommendations/refresh', {});
      const json = await res.json();
      if (json.success) {
        setRecs(json.data.recommendations);
        setGeneratedAt(json.data.generated_at);
      } else if (json.error?.code === 'RATE_LIMIT_EXCEEDED') {
        Alert.alert(
          'Daily Limit Reached',
          tier === 'FREE'
            ? 'Free users get 1 manual refresh per day. Upgrade to Premium for 3/day or Elite for unlimited.'
            : 'You\'ve used all your daily refreshes.',
          [{ text: 'OK' }]
        );
      }
    } catch {
    } finally {
      setRefreshing(false);
    }
  };

  const toggleFavorite = async (targetId: string) => {
    try {
      await apiPost(`/api/v1/favorites/${targetId}`, {});
      setFavoritedIds((prev) => {
        const next = new Set(prev);
        next.has(targetId) ? next.delete(targetId) : next.add(targetId);
        return next;
      });
    } catch {}
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9f6f5' }} edges={['top']}>
      {/* Header */}
      <LinearGradient colors={['#414BEA', '#6b74f0']} style={styles.header}>
        <HStack style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <VStack>
            <HStack style={{ alignItems: 'center', gap: 8 }}>
              <Sparkles size={20} color="#FFD700" />
              <Heading style={styles.headerTitle}>Daily Picks</Heading>
            </HStack>
            <Text style={styles.headerSub}>
              {recs.length} AI-matched profiles for you
            </Text>
          </VStack>
          <TouchableOpacity onPress={handleRefresh} style={styles.refreshBtn} disabled={refreshing}>
            <RefreshCw size={18} color="#fff" style={refreshing ? { opacity: 0.5 } : undefined} />
          </TouchableOpacity>
        </HStack>

        {generatedAt && (
          <Text style={styles.generatedAt}>
            Updated {new Date(generatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        )}

        {/* Tier chips */}
        <HStack style={{ gap: 8, marginTop: 12 }}>
          {[
            { label: 'FREE: 1 refresh/day', active: tier === 'FREE' },
            { label: 'PREMIUM: 3/day', active: tier === 'PREMIUM' },
            { label: 'ELITE: Unlimited', active: tier === 'ELITE' },
          ].map(({ label, active }) => (
            <View key={label} style={[styles.tierChip, active && styles.tierChipActive]}>
              <Text style={[styles.tierChipText, active && styles.tierChipTextActive]}>{label}</Text>
            </View>
          ))}
        </HStack>
      </LinearGradient>

      {/* Content */}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#414BEA" />
          <Text style={{ marginTop: 12, color: '#5c5b5b' }}>Computing your matches...</Text>
        </View>
      ) : recs.length === 0 ? (
        <VStack style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ fontSize: 48 }}>🔍</Text>
          <Heading style={{ fontSize: 20, color: '#2f2f2e', textAlign: 'center', marginTop: 16 }}>
            No picks yet
          </Heading>
          <Text style={{ color: '#5c5b5b', textAlign: 'center', marginTop: 8, lineHeight: 22 }}>
            Complete your profile with interests and relationship goals for better matches.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/edit-profile' as any)}
            style={styles.editProfileBtn}
          >
            <Text style={styles.editProfileText}>Complete Profile</Text>
          </TouchableOpacity>
        </VStack>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchRecs} tintColor="#414BEA" />}
        >
          {recs.map((rec) => (
            <RecCard
              key={rec.id}
              rec={rec}
              onFavorite={() => toggleFavorite(rec.id)}
            />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#fff',
  },
  headerSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  generatedAt: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 6,
    fontFamily: 'SpaceMono_400Regular',
  },
  tierChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  tierChipActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  tierChipText: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.6)',
    fontFamily: 'SpaceMono_400Regular',
  },
  tierChipTextActive: {
    color: '#fff',
    fontFamily: 'SpaceMono_400Regular',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  photo: {
    width: '100%',
    height: 220,
  },
  photoGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  scoreRingWrap: {
    position: 'absolute',
    bottom: -20,
    right: 16,
  },
  scoreRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  scoreNum: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  scoreLabel: {
    fontSize: 8,
    color: '#5c5b5b',
    fontFamily: 'SpaceMono_400Regular',
    marginBottom: 2,
  },
  cardBody: {
    padding: 16,
    paddingTop: 28, // space for score ring
  },
  cardName: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#2f2f2e',
  },
  cardSub: {
    fontSize: 11,
    color: '#afadac',
    fontFamily: 'Manrope_400Regular',
  },
  cardJob: {
    fontSize: 12,
    color: '#5c5b5b',
    marginTop: 2,
    fontFamily: 'Manrope_500Medium',
  },
  cardBio: {
    fontSize: 13,
    color: '#5c5b5b',
    lineHeight: 20,
    marginTop: 8,
    fontFamily: 'Manrope_400Regular',
  },
  favoriteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#b4134010',
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakdownToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#414BEA08',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#414BEA20',
  },
  breakdownToggleText: {
    flex: 1,
    fontSize: 12,
    color: '#414BEA',
    fontFamily: 'Manrope_500Medium',
  },
  breakdownBox: {
    marginTop: 10,
    backgroundColor: '#f9f6f5',
    borderRadius: 12,
    padding: 12,
  },
  barLabel: {
    fontSize: 11,
    color: '#5c5b5b',
    fontFamily: 'Manrope_400Regular',
  },
  barValue: {
    fontSize: 11,
    color: '#2f2f2e',
    fontFamily: 'SpaceMono_400Regular',
  },
  barTrack: {
    height: 5,
    backgroundColor: '#eae7e7',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#414BEA',
    borderRadius: 3,
  },
  editProfileBtn: {
    marginTop: 20,
    backgroundColor: '#414BEA',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  editProfileText: {
    color: '#fff',
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
  },
});
