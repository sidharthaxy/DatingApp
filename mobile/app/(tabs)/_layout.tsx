import { Tabs } from 'expo-router';
import React from 'react';
import { View, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/text';
import { Layers, MessageCircle, User } from 'lucide-react-native';
import { BlurView } from 'expo-blur';

function CustomTabBar({ state, descriptors, navigation }: any) {
  return (
    <View style={styles.tabBarContainer}>
      <BlurView intensity={80} tint="light" style={styles.blurContainer}>
        <View className="flex-row justify-around items-center px-4 pb-6 pt-3">
          {state.routes.map((route: any, index: number) => {
            const { options } = descriptors[route.key];
            const label = options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
              ? options.title
              : route.name;

            const isFocused = state.index === index;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };

            const onLongPress = () => {
              navigation.emit({
                type: 'tabLongPress',
                target: route.key,
              });
            };

            const Icon = route.name === 'discovery' ? Layers : 
                         route.name === 'chat' ? MessageCircle : User;

            return (
              <TouchableOpacity
                key={index}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={options.tabBarAccessibilityLabel}
                testID={options.tabBarTestID}
                onPress={onPress}
                onLongPress={onLongPress}
                className={`flex-col items-center justify-center p-3 transition-all duration-200 ${
                  isFocused ? 'bg-primary rounded-full scale-110 -translate-y-2 shadow-lg shadow-primary/30' : 'opacity-50'
                }`}
                style={isFocused ? { backgroundColor: '#414BEA' } : {}}
              >
                <Icon size={24} color={isFocused ? '#FFFFFF' : '#2f2f2e'} />
                {isFocused && (
                  <Text className="font-label text-[10px] uppercase text-white mt-1">
                    {label}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs 
      screenOptions={{ 
        headerShown: false,
      }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen 
        name="discovery" 
        options={{ title: 'Discovery' }} 
      />
      <Tabs.Screen 
        name="chat" 
        options={{ title: 'Messages' }} 
      />
      <Tabs.Screen 
        name="profile" 
        options={{ title: 'Profile' }} 
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
    elevation: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  blurContainer: {
    width: '100%',
  }
});
