import React, { useState, useEffect } from 'react';
import { ScrollView, TouchableOpacity, View, ActivityIndicator, Image as RNImage, Platform } from 'react-native';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Button, ButtonText, ButtonSpinner } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/src/store/authStore';
import { apiFetch, apiPut, apiPost, apiGet } from '@/src/lib/api';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { ChevronRight, ChevronLeft, MapPin, Heart, Sparkles, User as UserIcon, Camera, Plus, Check, Calendar } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';

const API_URL = process.env.EXPO_PUBLIC_API_URL as string;

export default function OnboardingScreen() {
  const router = useRouter();
  const { user, setUser, token } = useAuthStore();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Step 1: Profile
  const [formData, setFormData] = useState({
    first_name: '',
    dob: '',
    gender: 'NON_BINARY' as const,
    bio: '',
    living_in: '',
  });

  // Step 2: Preferences
  const [preferences, setPreferences] = useState({
    interested_in: 'EVERYONE',
    relationship_goal: 'LONG_TERM',
  });

  // Step 3: Location
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  // Step 4: Interests
  const [allInterests, setAllInterests] = useState<any[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [interestsLoading, setInterestsLoading] = useState(false);

  // Step 5: Photo
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  
  // Custom Interest
  const [customInterest, setCustomInterest] = useState('');
  const [isAddingCustom, setIsAddingCustom] = useState(false);

  useEffect(() => {
    if (step === 4) {
      fetchInterests();
    }
  }, [step]);

  const fetchInterests = async () => {
    setInterestsLoading(true);
    try {
      const res = await apiGet('/api/v1/users/interests/list');
      const data = await res.json();
      if (data.success) {
        setAllInterests(data.data);
      }
    } catch (e) {
      console.error('Failed to fetch interests', e);
    } finally {
      setInterestsLoading(false);
    }
  };

  const handleNext = async () => {
    if (step < 5) {
      setStep(step + 1);
    } else {
      await finalizeOnboarding();
    }
  };

  const handleSkipInterests = () => {
    setStep(5);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const finalizeOnboarding = async () => {
    setLoading(true);
    try {
      // 1. Update Profile
      const dobDate = new Date(formData.dob);
      if (isNaN(dobDate.getTime())) {
        alert('Invalid Date of Birth format');
        setLoading(false);
        return;
      }

      await apiPut('/api/v1/users/me', {
        ...formData,
        dob: dobDate.toISOString(),
      });

      // 2. Update Preferences
      await apiPost('/api/v1/users/preferences', preferences);

      // 3. Update Location
      if (location) {
        await apiPost('/api/v1/users/location', {
          latitude: location.lat,
          longitude: location.lng,
        });
      }

      // 4. Update Interests
      await apiPost('/api/v1/users/interests', {
        interest_ids: selectedInterests,
      });

      // 5. Photo Upload (if selected)
      if (photoUri) {
         const photoData = new FormData();
         if (Platform.OS === 'web') {
           const response = await fetch(photoUri);
           const blob = await response.blob();
           photoData.append('photo', blob, 'profile_photo.jpg');
         } else {
           // @ts-ignore
           photoData.append('photo', {
             uri: photoUri,
             name: 'profile_photo.jpg',
             type: 'image/jpeg',
           });
         }

         const uploadRes = await fetch(`${API_URL}/api/v1/media/upload`, {
            method: 'POST',
            headers: {
               'Authorization': `Bearer ${token}`,
            },
            body: photoData,
         });
         const uploadJson = await uploadRes.json();
         if (!uploadJson.success) {
            console.error('Photo upload failed', uploadJson.error);
         }
      }

      // 6. Refresh user state in store
      const userRes = await apiGet('/api/v1/users/me');
      const userData = await userRes.json();
      if (userData.success) {
        setUser({
          ...user!,
          is_profile_complete: userData.data.is_profile_complete,
          first_name: userData.data.first_name,
        });
      }

      router.replace('/kyc');
    } catch (e) {
      console.error('Onboarding finalization failed', e);
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const requestLocation = async () => {
    setLocationLoading(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access location was denied');
        return;
      }

      let loc = await Location.getCurrentPositionAsync({});
      setLocation({
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLocationLoading(false);
    }
  };

  const toggleInterest = (id: string) => {
    if (selectedInterests.includes(id)) {
      setSelectedInterests(selectedInterests.filter(i => i !== id));
    } else {
      setSelectedInterests([...selectedInterests, id]);
    }
  };

  const addCustomInterest = async () => {
    if (!customInterest.trim()) return;
    setIsAddingCustom(true);
    try {
      // In a real app, we'd call an API to create this interest
      // For now, we'll simulate it by adding it to the local list if it doesn't exist
      // and checking if we can find a match or create a placeholder.
      // Since we need an ID, let's assume the backend has an endpoint for this.
      const res = await apiPost('/api/v1/users/interests/custom', { name: customInterest });
      const data = await res.json();
      if (data.success) {
        setAllInterests([...allInterests, data.data]);
        setSelectedInterests([...selectedInterests, data.data.id]);
        setCustomInterest('');
      } else {
        alert(data.error?.message || 'Failed to add interest');
      }
    } catch (e) {
      console.error(e);
      alert('Could not add custom interest');
    } finally {
      setIsAddingCustom(false);
    }
  };

  const renderStep = () => {
    switch(step) {
      case 1:
        return (
          <VStack space="xl" className="flex-1">
            <VStack space="xs">
              <Heading size="xl" className="text-on-surface font-headline font-bold">About You</Heading>
              <Text className="text-on-surface-variant font-body">Let's start with the basics.</Text>
            </VStack>

            <VStack space="md">
              <VStack space="xs">
                <Text className="text-xs font-bold uppercase tracking-widest text-primary ml-1">Full Name</Text>
                <Input variant="outline" size="lg" className="rounded-xl bg-white border-surface-container-high">
                  <InputField 
                    placeholder="E.g. John Doe" 
                    className="font-body" 
                    value={formData.first_name}
                    onChangeText={(t) => setFormData({...formData, first_name: t})}
                  />
                </Input>
              </VStack>

              <VStack space="xs">
                <Text className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Date of Birth</Text>
                {Platform.OS === 'web' ? (
                  <Box className="w-full h-14 bg-surface-container-low rounded-2xl border border-outline-variant/10 px-4 justify-center">
                    <input 
                      type="date" 
                      value={formData.dob} 
                      onChange={(e) => setFormData({...formData, dob: e.target.value})}
                      style={{ 
                        background: 'transparent', 
                        border: 'none', 
                        color: '#1A1C1E', 
                        width: '100%', 
                        outline: 'none',
                        fontFamily: 'Inter'
                      }} 
                    />
                  </Box>
                ) : (
                  <>
                    <TouchableOpacity 
                      onPress={() => setShowDatePicker(true)}
                      className="w-full h-14 bg-surface-container-low rounded-2xl border border-outline-variant/10 px-4 flex-row items-center justify-between"
                    >
                      <Text className={formData.dob ? "text-on-surface font-body" : "text-on-surface-variant/40 font-body"}>
                        {formData.dob || 'Select Date'}
                      </Text>
                      <Calendar size={20} color="#414BEA" />
                    </TouchableOpacity>
                    {showDatePicker && (
                      <DateTimePicker
                        value={formData.dob ? new Date(formData.dob) : new Date(2000, 0, 1)}
                        mode="date"
                        display="default"
                        maximumDate={new Date()}
                        onChange={(event, selectedDate) => {
                          setShowDatePicker(false);
                          if (selectedDate) {
                            setFormData({...formData, dob: selectedDate.toISOString().split('T')[0]});
                          }
                        }}
                      />
                    )}
                  </>
                )}
              </VStack>

              <VStack space="xs">
                <Text className="text-xs font-bold uppercase tracking-widest text-primary ml-1">Bio</Text>
                <Input variant="outline" size="lg" className="rounded-xl bg-white border-surface-container-high h-24">
                  <InputField 
                    placeholder="Tell us a bit about yourself..." 
                    className="font-body" 
                    multiline
                    value={formData.bio}
                    onChangeText={(t) => setFormData({...formData, bio: t})}
                  />
                </Input>
              </VStack>

              <VStack space="xs">
                <Text className="text-xs font-bold uppercase tracking-widest text-primary ml-1">City</Text>
                <Input variant="outline" size="lg" className="rounded-xl bg-white border-surface-container-high">
                  <InputField 
                    placeholder="New York, NY" 
                    className="font-body" 
                    value={formData.living_in}
                    onChangeText={(t) => setFormData({...formData, living_in: t})}
                  />
                </Input>
              </VStack>
            </VStack>
          </VStack>
        );
      case 2:
        return (
          <VStack space="xl" className="flex-1">
            <VStack space="xs">
              <Heading size="xl" className="text-on-surface font-headline font-bold">Preferences</Heading>
              <Text className="text-on-surface-variant font-body">Who are you looking for?</Text>
            </VStack>

            <VStack space="lg">
              <VStack space="md">
                <Text className="text-xs font-bold uppercase tracking-widest text-primary ml-1">Your Gender</Text>
                <HStack space="md" className="flex-wrap">
                  {['MALE', 'FEMALE', 'NON_BINARY'].map((g) => (
                    <TouchableOpacity 
                      key={g} 
                      onPress={() => setFormData({...formData, gender: g as any})}
                      className={`px-6 py-3 rounded-full border ${formData.gender === g ? 'bg-primary border-primary' : 'bg-white border-surface-container-high'}`}
                    >
                      <Text className={`font-bold ${formData.gender === g ? 'text-white' : 'text-on-surface'}`}>{g.replace('_', ' ')}</Text>
                    </TouchableOpacity>
                  ))}
                </HStack>
              </VStack>

              <VStack space="md">
                <Text className="text-xs font-bold uppercase tracking-widest text-primary ml-1">Looking For</Text>
                <HStack space="md" className="flex-wrap">
                  {['MALE', 'FEMALE', 'EVERYONE'].map((g) => (
                    <TouchableOpacity 
                      key={g} 
                      onPress={() => setPreferences({...preferences, interested_in: g})}
                      className={`px-6 py-3 rounded-full border ${preferences.interested_in === g ? 'bg-primary border-primary' : 'bg-white border-surface-container-high'}`}
                    >
                      <Text className={`font-bold ${preferences.interested_in === g ? 'text-white' : 'text-on-surface'}`}>{g}</Text>
                    </TouchableOpacity>
                  ))}
                </HStack>
              </VStack>

              <VStack space="md">
                <Text className="text-xs font-bold uppercase tracking-widest text-primary ml-1">Relationship Goal</Text>
                <VStack space="sm">
                  {['LONG_TERM', 'SHORT_TERM', 'FRIENDSHIP', 'NOT_SURE'].map((goal) => (
                    <TouchableOpacity 
                      key={goal} 
                      onPress={() => setPreferences({...preferences, relationship_goal: goal})}
                      className={`p-4 rounded-xl border flex-row items-center justify-between ${preferences.relationship_goal === goal ? 'bg-primary/5 border-primary' : 'bg-white border-surface-container-high'}`}
                    >
                      <Text className={`font-bold ${preferences.relationship_goal === goal ? 'text-primary' : 'text-on-surface'}`}>{goal.replace('_', ' ')}</Text>
                      {preferences.relationship_goal === goal && <Sparkles size={16} color="#414BEA" />}
                    </TouchableOpacity>
                  ))}
                </VStack>
              </VStack>
            </VStack>
          </VStack>
        );
      case 3:
        return (
          <VStack space="xl" className="flex-1 items-center justify-center">
             <Box className="w-24 h-24 bg-primary/10 rounded-full items-center justify-center mb-4">
                <MapPin size={48} color="#414BEA" />
             </Box>
             <VStack space="xs" className="items-center">
                <Heading size="xl" className="text-on-surface font-headline font-bold text-center">Enable Location</Heading>
                <Text className="text-on-surface-variant font-body text-center px-8">We need your location to find people nearby.</Text>
             </VStack>

             {location ? (
               <Box className="p-4 bg-success/10 rounded-xl border border-success/20">
                  <Text className="text-success font-bold text-center">Location captured successfully!</Text>
               </Box>
             ) : (
               <Button 
                size="lg" 
                className="w-full bg-white border border-primary h-14 rounded-xl"
                onPress={requestLocation}
                disabled={locationLoading}
               >
                 {locationLoading ? <ButtonSpinner color="#414BEA" /> : <ButtonText className="text-primary font-bold">Share Location</ButtonText>}
               </Button>
             )}
          </VStack>
        );
      case 4:
        return (
          <VStack space="xl" className="flex-1">
            <VStack space="xs">
              <Heading size="xl" className="text-on-surface font-headline font-bold">Your Interests</Heading>
              <Text className="text-on-surface-variant font-body">Select at least 3 things you love.</Text>
            </VStack>

            {interestsLoading ? (
              <Box className="flex-1 items-center justify-center">
                <ActivityIndicator color="#414BEA" />
              </Box>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
                 <VStack space="lg" className="pb-10">
                   <HStack space="sm" className="flex-wrap">
                      {allInterests.map((interest) => (
                        <TouchableOpacity 
                          key={interest.id} 
                          onPress={() => toggleInterest(interest.id)}
                          className={`px-4 py-2 rounded-full border mb-2 ${selectedInterests.includes(interest.id) ? 'bg-primary border-primary' : 'bg-white border-surface-container-high'}`}
                        >
                          <Text className={`text-sm font-medium ${selectedInterests.includes(interest.id) ? 'text-white' : 'text-on-surface'}`}>#{interest.name}</Text>
                        </TouchableOpacity>
                      ))}
                   </HStack>

                   <VStack space="sm" className="mt-4 p-4 bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm">
                      <Text className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">Other Interest</Text>
                      <HStack space="sm">
                        <Input variant="outline" size="md" className="flex-1 rounded-xl bg-white border-surface-container-high">
                          <InputField 
                            placeholder="Type something..." 
                            className="font-body" 
                            value={customInterest}
                            onChangeText={setCustomInterest}
                          />
                        </Input>
                        <TouchableOpacity 
                          onPress={addCustomInterest}
                          disabled={isAddingCustom || !customInterest.trim()}
                          className={`w-12 h-12 rounded-xl items-center justify-center ${(!customInterest.trim() || isAddingCustom) ? 'bg-surface-container-high' : 'bg-primary'}`}
                        >
                          {isAddingCustom ? <ActivityIndicator size="small" color="white" /> : <Plus size={20} color="white" />}
                        </TouchableOpacity>
                      </HStack>
                   </VStack>
                 </VStack>
              </ScrollView>
            )}
          </VStack>
        );
      case 5:
        return (
          <VStack space="xl" className="flex-1 items-center">
            <VStack space="xs" className="w-full">
              <Heading size="xl" className="text-on-surface font-headline font-bold">Profile Photo</Heading>
              <Text className="text-on-surface-variant font-body">Add a great photo of yourself.</Text>
            </VStack>

            <TouchableOpacity 
              onPress={pickImage}
              className="w-64 h-80 bg-surface-container-low rounded-3xl overflow-hidden border-2 border-dashed border-surface-container-high items-center justify-center"
            >
              {photoUri ? (
                <RNImage source={{ uri: photoUri }} className="w-full h-full" />
              ) : (
                <VStack className="items-center space-y-2">
                  <Camera size={48} color="#afadac" />
                  <Text className="text-on-surface-variant font-bold uppercase tracking-widest text-[10px]">Tap to Upload</Text>
                </VStack>
              )}
            </TouchableOpacity>

            <Text className="text-on-surface-variant font-body text-center px-12 italic">
               "First impressions matter! Make sure your face is clearly visible."
            </Text>
          </VStack>
        );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <Box className="flex-1 px-6 pt-6">
        {/* Progress Bar */}
        <HStack space="xs" className="mb-8">
           {[1, 2, 3, 4, 5].map((s) => (
             <Box key={s} className={`flex-1 h-1.5 rounded-full ${s <= step ? 'bg-primary' : 'bg-surface-container-high'}`} />
           ))}
        </HStack>

        {renderStep()}

        {/* Navigation */}
        <HStack space="md" className="py-8 bg-surface">
           {step > 1 && (
             <TouchableOpacity 
              onPress={handleBack}
              disabled={loading}
              className="w-14 h-14 rounded-2xl bg-surface-container-low items-center justify-center"
             >
               <ChevronLeft size={24} color="#2f2f2e" />
             </TouchableOpacity>
           )}

           {step === 4 && (
             <TouchableOpacity 
              onPress={handleSkipInterests}
              disabled={loading}
              className="px-6 h-14 rounded-2xl bg-surface-container-low items-center justify-center mr-2"
             >
               <Text className="text-on-surface-variant font-bold">Skip</Text>
             </TouchableOpacity>
           )}
           
           <TouchableOpacity 
            onPress={handleNext}
            disabled={loading || (step === 4 && selectedInterests.length < 3) || (step === 5 && !photoUri)}
            className={`flex-1 h-14 rounded-2xl items-center justify-center flex-row space-x-2 ${(loading || (step === 4 && selectedInterests.length < 3) || (step === 5 && !photoUri)) ? 'bg-surface-container-high' : 'signature-gradient shadow-lg shadow-primary/20'}`}
           >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Text className="text-white font-bold text-lg">{step === 5 ? 'Finish Setup' : 'Continue'}</Text>
                  <ChevronRight size={20} color="white" />
                </>
              )}
           </TouchableOpacity>
        </HStack>
      </Box>
    </SafeAreaView>
  );
}
