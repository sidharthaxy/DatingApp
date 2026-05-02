import React, { useState, useEffect, useCallback } from 'react';
import { ScrollView, TouchableOpacity, TextInput, Modal, View, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Image } from '@/components/ui/image';
import { ArrowLeft, Plus, Trash2, Users, Lock, Globe, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiGet, apiPost, apiPut, apiDelete } from '@/src/lib/api';

interface Wishlist {
  id: string;
  name: string;
  is_public: boolean;
  created_at: string;
  _count: { members: number };
}

export default function WishlistsScreen() {
  const router = useRouter();
  const [wishlists, setWishlists] = useState<Wishlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPublic, setNewPublic] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchWishlists = useCallback(async () => {
    try {
      const res = await apiGet('/api/v1/wishlists');
      const json = await res.json();
      if (json.success) {
        setWishlists(json.data.wishlists);
      }
    } catch (e) {
      console.error('Failed to load wishlists', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchWishlists(); }, []);

  const createWishlist = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await apiPost('/api/v1/wishlists', { name: newName.trim(), is_public: newPublic });
      const json = await res.json();
      if (json.success) {
        setWishlists(prev => [{ ...json.data.wishlist, _count: { members: 0 } }, ...prev]);
        setNewName('');
        setNewPublic(false);
        setCreateVisible(false);
      }
    } catch (e) {
      console.error('Failed to create wishlist', e);
    } finally {
      setCreating(false);
    }
  };

  const deleteWishlist = async (id: string, name: string) => {
    Alert.alert('Delete Wishlist', `Delete "${name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          setDeletingId(id);
          try {
            const res = await apiDelete(`/api/v1/wishlists/${id}`);
            const json = await res.json();
            if (json.success) {
              setWishlists(prev => prev.filter(w => w.id !== id));
            }
          } catch (e) {
            console.error('Failed to delete wishlist', e);
          } finally {
            setDeletingId(null);
          }
        }
      }
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9f6f5' }}>
      <Box className="flex-1 bg-surface">
        {/* Header */}
        <HStack className="items-center px-6 py-4 border-b border-surface-container-low space-x-4">
          <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center rounded-full bg-surface-container-low">
            <ArrowLeft size={20} color="#2f2f2e" />
          </TouchableOpacity>
          <Heading className="font-headline text-xl font-bold text-on-surface flex-1">My Wishlists</Heading>
          <TouchableOpacity
            onPress={() => setCreateVisible(true)}
            className="w-10 h-10 items-center justify-center rounded-full signature-gradient shadow-lg shadow-primary/20"
          >
            <Plus size={20} color="white" />
          </TouchableOpacity>
        </HStack>

        {/* Create Modal */}
        <Modal visible={createVisible} animationType="slide" transparent onRequestClose={() => setCreateVisible(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: '#f9f6f5', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 }}>
              <HStack className="justify-between items-center mb-6">
                <Heading className="font-headline text-xl font-bold text-on-surface">New Wishlist</Heading>
                <TouchableOpacity onPress={() => setCreateVisible(false)} className="w-10 h-10 bg-surface-container-low rounded-full items-center justify-center">
                  <X size={20} color="#2f2f2e" />
                </TouchableOpacity>
              </HStack>

              <VStack space="lg">
                <VStack space="xs">
                  <Text className="text-xs font-bold uppercase tracking-widest text-primary">Wishlist Name</Text>
                  <View style={{ borderRadius: 12, borderWidth: 1, borderColor: '#e0e0e0', backgroundColor: 'white', paddingHorizontal: 16 }}>
                    <TextInput
                      placeholder="E.g. My Dream Dates"
                      placeholderTextColor="#afadac"
                      value={newName}
                      onChangeText={setNewName}
                      style={{ height: 48, fontFamily: 'System', fontSize: 14, color: '#2f2f2e' }}
                    />
                  </View>
                </VStack>

                <TouchableOpacity
                  onPress={() => setNewPublic(!newPublic)}
                  className={`p-4 rounded-xl border flex-row items-center justify-between ${newPublic ? 'bg-primary/5 border-primary' : 'bg-white border-surface-container-high'}`}
                >
                  <HStack space="sm" className="items-center">
                    {newPublic ? <Globe size={16} color="#414BEA" /> : <Lock size={16} color="#afadac" />}
                    <VStack>
                      <Text className={`font-bold ${newPublic ? 'text-primary' : 'text-on-surface'}`}>
                        {newPublic ? 'Public' : 'Private'}
                      </Text>
                      <Text className="text-[10px] text-on-surface-variant">
                        {newPublic ? 'Others can see this list' : 'Only you can see this'}
                      </Text>
                    </VStack>
                  </HStack>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={createWishlist}
                  disabled={!newName.trim() || creating}
                  className={`h-14 rounded-2xl items-center justify-center ${!newName.trim() ? 'bg-surface-container-high' : 'signature-gradient shadow-lg shadow-primary/20'}`}
                >
                  {creating ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-white font-bold text-lg">Create Wishlist</Text>
                  )}
                </TouchableOpacity>
              </VStack>
            </View>
          </View>
        </Modal>

        {loading ? (
          <Box className="flex-1 items-center justify-center">
            <ActivityIndicator color="#414BEA" size="large" />
          </Box>
        ) : wishlists.length === 0 ? (
          <Box className="flex-1 items-center justify-center px-8">
            <Box className="w-20 h-20 bg-primary/10 rounded-full items-center justify-center mb-4">
              <Users size={36} color="#414BEA" />
            </Box>
            <Heading className="font-headline text-xl font-bold text-on-surface text-center mb-2">No Wishlists Yet</Heading>
            <Text className="font-body text-sm text-on-surface-variant text-center leading-relaxed mb-6">
              Create lists to organise the people you're interested in.
            </Text>
            <TouchableOpacity
              onPress={() => setCreateVisible(true)}
              className="px-8 py-3 signature-gradient rounded-full shadow-lg shadow-primary/20"
            >
              <Text className="text-white font-bold">Create First Wishlist</Text>
            </TouchableOpacity>
          </Box>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchWishlists(); }} tintColor="#414BEA" />}
          >
            <VStack space="sm">
              {wishlists.map((wl) => (
                <Box
                  key={wl.id}
                  className="bg-white rounded-2xl border border-surface-container-high p-4"
                >
                  <HStack className="items-center justify-between">
                    <HStack className="items-center space-x-3 flex-1">
                      <Box className="w-12 h-12 bg-primary/10 rounded-xl items-center justify-center">
                        {wl.is_public ? <Globe size={20} color="#414BEA" /> : <Lock size={20} color="#414BEA" />}
                      </Box>
                      <VStack className="flex-1">
                        <Text className="font-headline text-base font-bold text-on-surface" numberOfLines={1}>
                          {wl.name}
                        </Text>
                        <HStack space="sm" className="items-center">
                          <Users size={10} color="#afadac" />
                          <Text className="font-body text-[10px] text-on-surface-variant">
                            {wl._count.members} {wl._count.members === 1 ? 'person' : 'people'} · {wl.is_public ? 'Public' : 'Private'}
                          </Text>
                        </HStack>
                      </VStack>
                    </HStack>
                    <TouchableOpacity
                      onPress={() => deleteWishlist(wl.id, wl.name)}
                      disabled={deletingId === wl.id}
                      className="w-10 h-10 bg-error/10 rounded-xl items-center justify-center ml-2"
                    >
                      {deletingId === wl.id ? (
                        <ActivityIndicator size="small" color="#b41340" />
                      ) : (
                        <Trash2 size={16} color="#b41340" />
                      )}
                    </TouchableOpacity>
                  </HStack>
                </Box>
              ))}
            </VStack>
          </ScrollView>
        )}
      </Box>
    </SafeAreaView>
  );
}
