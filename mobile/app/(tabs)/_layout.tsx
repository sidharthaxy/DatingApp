import { Tabs } from 'expo-router';
import React from 'react';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#FF4D6D' }}>
      <Tabs.Screen 
        name="discovery" 
        options={{ title: 'Discover' }} 
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
