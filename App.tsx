import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from './src/screens/HomeScreen';
import EventScreen from './src/screens/EventScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import EventDetailsScreen from './src/screens/EventDetailsScreen';
import BookingScreen from './src/screens/BookingScreen';
const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="MainTabs"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="MainTabs" component={HomeScreen} />
        <Stack.Screen name="Events" component={EventScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="EventDetails" component={EventDetailsScreen} />
        <Stack.Screen name="Booking" component={BookingScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}