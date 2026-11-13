import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';

import { AuthContext } from '../../src/context/AuthContext';

import SignupScreen from '../../src/screens/auth/SignupScreen';
import LoginScreen from '../../src/screens/auth/LoginScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import HomeScreen from '../../src/screens/home/HomeScreen';
import EventScreen from '../../src/screens/home/EventScreen';
import ProfileScreen from '../../src/screens/home/ProfileScreen';
import MyBookingsScreen from '../screens/profile/MyBookings';
import EventDetailsScreen from '../../src/screens/EventDetailsScreen';
import BookingScreen from '../../src/screens/booking/BookingScreen';

const Stack = createNativeStackNavigator();

export function AppNavigator() {
  const { isAuthenticated, isLoading } = useContext(AuthContext);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#0F0214',
        }}
      >
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          // Logged-in stack (Home is now first, so it loads on reload)
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="EventScreen" component={EventScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="MyBookings" component={MyBookingsScreen} />
            <Stack.Screen name="EventDetails" component={EventDetailsScreen} />
            <Stack.Screen name="Booking" component={BookingScreen} />
          </>
        ) : (
          // Logged-out stack
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="LoginScreen" component={LoginScreen} />
            <Stack.Screen name="SignUpScreen" component={SignupScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}