import React from 'react';
import { View, Text, TextInput } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, TitanOne_400Regular } from '@expo-google-fonts/titan-one';
import {
  Fredoka_400Regular,
  Fredoka_600SemiBold,
  Fredoka_700Bold,
} from '@expo-google-fonts/fredoka';

import { GameSessionProvider } from './src/context/GameSessionContext';
import CharacterCreatorScreen from './src/screens/CharacterCreatorScreen';
import HomeScreen from './src/screens/HomeScreen';
import SetupScreen from './src/screens/SetupScreen';
import RoleAssignmentScreen from './src/screens/RoleAssignmentScreen';
import SpectatorScreen from './src/screens/SpectatorScreen';
import CookingChallengeScreen from './src/screens/CookingChallengeScreen';
import SabotageScreen from './src/screens/SabotageScreen';
import PhotoSubmitScreen from './src/screens/PhotoSubmitScreen';
import JudgingScreen from './src/screens/JudgingScreen';
import ResultsScreen from './src/screens/ResultsScreen';
import MiniGameMenuScreen from './src/screens/MiniGameMenuScreen';
import HangmanScreen from './src/screens/HangmanScreen';
import FlappyChefScreen from './src/screens/FlappyChefScreen';
import BettingScreen from './src/screens/BettingScreen';
import VotingScreen from './src/screens/VotingScreen';
import FunniestRoastVoteScreen from './src/screens/FunniestRoastVoteScreen';
import RoastSendModalScreen from './src/screens/RoastSendModalScreen';

const Stack = createNativeStackNavigator();
let globalTypographyInitialized = false;

export default function App() {
  const [fontsLoaded] = useFonts({
    TitanOne_400Regular,
    Fredoka_400Regular,
    Fredoka_600SemiBold,
    Fredoka_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#87CEEB',
        }}
      />
    );
  }

  if (!globalTypographyInitialized) {
    Text.defaultProps = Text.defaultProps || {};
    Text.defaultProps.style = [{ fontFamily: 'Fredoka_600SemiBold' }, Text.defaultProps.style];
    TextInput.defaultProps = TextInput.defaultProps || {};
    TextInput.defaultProps.style = [{ fontFamily: 'Fredoka_600SemiBold' }, TextInput.defaultProps.style];
    globalTypographyInitialized = true;
  }

  return (
    <GameSessionProvider>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar style="dark" />
          <Stack.Navigator
            initialRouteName="CharacterCreator"
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
              contentStyle: { backgroundColor: '#87CEEB' },
            }}
          >
            <Stack.Screen name="CharacterCreator" component={CharacterCreatorScreen} />
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Setup" component={SetupScreen} />
            <Stack.Screen name="RoleAssignment" component={RoleAssignmentScreen} />
            <Stack.Screen name="Spectator" component={SpectatorScreen} />
            <Stack.Screen name="CookingChallenge" component={CookingChallengeScreen} />
            <Stack.Screen name="Sabotage" component={SabotageScreen} />
            <Stack.Screen name="PhotoSubmit" component={PhotoSubmitScreen} />
            <Stack.Screen name="Judging" component={JudgingScreen} />
            <Stack.Screen name="ResultsScreen" component={ResultsScreen} />
            <Stack.Screen name="MiniGameMenu" component={MiniGameMenuScreen} />
            <Stack.Screen name="Hangman" component={HangmanScreen} />
            <Stack.Screen name="FlappyChef" component={FlappyChefScreen} />
            <Stack.Screen name="Betting" component={BettingScreen} />
            <Stack.Screen name="VotingScreen" component={VotingScreen} />
            <Stack.Screen name="FunniestRoastVote" component={FunniestRoastVoteScreen} />
            <Stack.Screen
              name="RoastSendModal"
              component={RoastSendModalScreen}
              options={{
                presentation: 'transparentModal',
                animation: 'fade',
                contentStyle: { backgroundColor: 'transparent' },
              }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GameSessionProvider>
  );
}
