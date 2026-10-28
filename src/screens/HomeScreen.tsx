import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  Image,
  FlatList,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from '@react-native-vector-icons/ionicons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import EventScreen from './EventScreen';
import ProfileScreen from './ProfileScreen';
import { api } from '../services/api';
import { type Events } from '../types/auth';

type EventCardData = Events & {
  id?: string | number;
  title?: string;
  name?: string;
  city?: string | { name?: string } | null;
  city_name?: string | null;
  image?: string;
};

// 1. Inner Home Feed View (Previously HomeScreen body)
function HomeFeedScreen({ navigation }: any) {
  const [events, setEvents] = useState<EventCardData[]>([]);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await api.get('/v1/events/events');
        const rawData = response.data;
        const eventList: EventCardData[] = Array.isArray(rawData)
          ? rawData
          : rawData?.events || rawData?.data || [];
        setEvents(eventList);
      } catch (error) {
        console.error('Error fetching events:', error);
        setEvents([]);
      }
    };

    fetchEvents();
  }, []);

  const getCityName = (event: EventCardData) => {
    const city = event.city;
    if (typeof city === 'string' && city) return city;
    if (city && typeof city !== 'string' && city.name) return city.name;
    return event.city_name || '';
  };

  const renderEventCard = ({ item }: { item: EventCardData }) => {
    const cityName = getCityName(item);
    const eventTitle = item.title || item.name || 'Untitled Event';

    return (
      <TouchableOpacity activeOpacity={0.85} style={styles.card}>
        <Image
          source={
            item.image
              ? { uri: item.image }
              : require('../../assets/logo.png')
          }
          style={styles.cardImage}
          resizeMode="cover"
        />
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {eventTitle}
          </Text>
          {cityName ? (
            <Text style={styles.cardLocation} numberOfLines={1}>
              {cityName}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaProvider style={styles.container}>
      <StatusBar style="light" />

      {/* Top Navbar */}
      <View style={styles.navbar}>
        <Image
          source={require('../../assets/logo.png')}
          style={styles.localImage}
        />
        <Text style={styles.heading}>Citypass</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <Ionicons name="person-outline" size={22} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={events}
        renderItem={renderEventCard}
        keyExtractor={(item, index) => item.id?.toString() || index.toString()}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Text style={styles.sectionTitle}>Upcoming Events</Text>
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No events found</Text>
        }
      />
    </SafeAreaProvider>
  );
}

// 2. Exported HomeScreen hosting Bottom Tabs
const Tab = createBottomTabNavigator();

export default function HomeScreen() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.45)',
        tabBarStyle: styles.floatingTabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = 'home';

          if (route.name === 'HomeFeed') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Events') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="HomeFeed"
        component={HomeFeedScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen name="Events" component={EventScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e0025',
  },

  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 27,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },

  localImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },

  heading: {
    flex: 1,
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },

  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 100, // Extra space so bottom tab bar doesn't obscure cards
  },

  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },

  columnWrapper: {
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },

  card: {
    flex: 1,
    backgroundColor: '#2e0b3b',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },

  cardImage: {
    width: '100%',
    height: 110,
    backgroundColor: '#431254',
  },

  cardContent: {
    padding: 10,
  },

  cardTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },

  cardLocation: {
    color: '#D8B4E2',
    fontSize: 12,
  },

  emptyText: {
    color: '#A78BFA',
    fontSize: 14,
    marginTop: 20,
    textAlign: 'center',
  },

  floatingTabBar: {
    position: 'absolute',
    bottom: 25,
    marginHorizontal: 20,
    height: 65,
    backgroundColor: '#16001b',
    borderRadius: 35,
    overflow: 'hidden',
    borderTopWidth: 0,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },

  tabItem: {
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
  },

  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
});