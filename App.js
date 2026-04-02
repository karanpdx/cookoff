import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

import HomeScreen from './src/screens/HomeScreen';
import RoleAssignmentScreen from './src/screens/RoleAssignmentScreen';
import CookingChallengeScreen from './src/screens/CookingChallengeScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: '#1a1a2e' },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="RoleAssignment" component={RoleAssignmentScreen} />
        <Stack.Screen name="CookingChallenge" component={CookingChallengeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
