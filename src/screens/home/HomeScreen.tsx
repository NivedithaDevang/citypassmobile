import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  Image,
  ImageBackground,
  FlatList,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  Dimensions,
  Modal,
} from 'react-native';
import { useState, useEffect, useMemo } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from '@react-native-vector-icons/ionicons';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/Color';
import EventScreen from '../home/EventScreen';
import ProfileScreen from '../home/ProfileScreen';
import { api } from '../../services/api';
import { type Events } from '../../types/auth';

const { width } = Dimensions.get('window');

type CityItem = {
  id: string | number;
  name: string;
  code?: string;
};

type EventCardData = Events & {
  id?: string | number;
  title?: string;
  name?: string;
  city?: string | { id?: string | number; name?: string } | null;
  city_name?: string | null;
  city_id?: string | number | null;
  venue?: { name?: string; city?: string } | null;
  image?: string;
  image_url?: string;
  location?: string;
  price?: number | string;
  event_date?: string;
  date?: string;
  category?: string | { name?: string };
  category_name?: string;
};

const colors = COLORS;

const CATEGORIES = [
  { id: 'all', name: 'All Vibe', icon: 'sparkles' },
  { id: 'music', name: 'Music & Concerts', icon: 'musical-notes' },
  { id: 'comedy', name: 'Standup Comedy', icon: 'happy' },
  { id: 'nightlife', name: 'Nightlife & Parties', icon: 'wine' },
  { id: 'workshops', name: 'Workshops', icon: 'brush' },
  { id: 'theatre', name: 'Theatre & Plays', icon: 'film' },
];

function HomeFeedScreen({ navigation }: any) {
  const [events, setEvents] = useState<EventCardData[]>([]);
  const [cities, setCities] = useState<CityItem[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [isCityModalVisible, setIsCityModalVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [favorites, setFavorites] = useState<Record<string | number, boolean>>({});

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const response = await api.get('/v1/cities');
        const rawData = response.data;
        const list = Array.isArray(rawData)
          ? rawData
          : rawData?.cities || rawData?.data || [];

        const normalizedCities: CityItem[] = list.map((item: any, index: number) => {
          if (typeof item === 'string') {
            return { id: item.toLowerCase(), name: item, code: item.toLowerCase() };
          }
          return {
            id: item.id || item.code || index,
            name: item.name || item.cityName || item.city_name || 'Unknown',
            code: item.code || String(item.id || ''),
          };
        });

        setCities(normalizedCities);
      } catch (error) {
        console.error('Error fetching cities:', error);
      }
    };

    fetchCities();
  }, []);

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

  const toggleFavorite = (id?: string | number) => {
    if (!id) return;
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getCityName = (event: EventCardData) => {
    if (typeof event.city === 'string' && event.city.trim()) return event.city.trim();
    if (typeof event.city_name === 'string' && event.city_name.trim()) return event.city_name.trim();

    if (event.city && typeof event.city === 'object' && 'name' in event.city && event.city.name) {
      return String(event.city.name).trim();
    }
    const anyEvent = event as any;
    if (anyEvent.City?.name) return String(anyEvent.City.name).trim();

    if (event.venue?.city) return String(event.venue.city).trim();
    if (anyEvent.venue_city) return String(anyEvent.venue_city).trim();

    const cityId = event.city_id || (typeof event.city === 'number' ? event.city : null);
    if (cityId && cities.length > 0) {
      const match = cities.find(
        (c) => String(c.id) === String(cityId) || String(c.code) === String(cityId)
      );
      if (match) return match.name;
    }

    if (event.location && typeof event.location === 'string' && event.location.trim()) {
      return event.location.trim();
    }

    return '';
  };

  const getTitle = (event: EventCardData) =>
    event.title || event.name || 'Special Experience';

  const getImage = (event: EventCardData) =>
    event.image_url || event.image || undefined;

  const getCategory = (event: EventCardData) => {
    if (typeof event.category === 'string') return event.category;
    return event.category?.name || event.category_name || 'Experience';
  };

  const getDate = (event: EventCardData) => {
    const value = event.event_date || event.date;
    if (!value) return 'Upcoming';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });
  };

  const activeCityLabel = useMemo(() => {
    if (selectedCity === 'all') return 'All locations';
    const found = cities.find(
      (c) => c.name.toLowerCase() === selectedCity.toLowerCase()
    );
    return found ? found.name : selectedCity;
  }, [cities, selectedCity]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const city = getCityName(event).toLowerCase();
      const matchesCity =
        selectedCity === 'all' || city === selectedCity.toLowerCase();

      const cat = getCategory(event).toLowerCase();
      const matchesCategory =
        selectedCategory === 'all' || cat.includes(selectedCategory);

      const query = search.trim().toLowerCase();
      if (!query) return matchesCity && matchesCategory;

      const searchable = [
        getTitle(event),
        city,
        event.location || '',
        cat,
      ]
        .join(' ')
        .toLowerCase();

      return matchesCity && matchesCategory && searchable.includes(query);
    });
  }, [events, search, selectedCategory, selectedCity, cities]);

  const thisWeekEvents = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    return events.filter((item) => {
      const rawDate = item.event_date || item.date;
      if (!rawDate) return false;

      const eventDate = new Date(rawDate);
      if (Number.isNaN(eventDate.getTime())) return false;

      return eventDate >= startOfWeek && eventDate < endOfWeek;
    });
  }, [events]);

  const renderEventCard = ({ item }: { item: EventCardData }) => {
    const image = getImage(item);
    const resolvedCity = getCityName(item);
    const date = getDate(item);
    const isFav = !!favorites[item.id || 0];

    // Combine location/venue and city nicely (e.g., "Koramangala, Bengaluru")
    const venueLocation = item.venue?.name || item.location?.trim() || '';
    const locationCityText =
      [venueLocation, resolvedCity].filter(Boolean).join(', ') ||
      'Location yet to be announced';

    return (
      <TouchableOpacity
        activeOpacity={0.88}
        style={styles.card}
        onPress={() => navigation.navigate('EventDetails', { event: item })}
      >
        <View style={styles.cardImageContainer}>
          {image ? (
            <Image source={{ uri: image }} style={styles.cardImage} resizeMode="cover" />
          ) : (
            <View style={[styles.cardImage, styles.cardImageFallback]}>
              <Ionicons name="sparkles" size={28} color={colors.primaryLight} />
            </View>
          )}

          <View style={styles.cardTopRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText} numberOfLines={1}>
                {getCategory(item).toUpperCase()}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.favButton}
              onPress={() => toggleFavorite(item.id)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isFav ? 'bookmark' : 'bookmark-outline'}
                size={16}
                color={isFav ? colors.accent : '#FFFFFF'}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.dateFloatingTag}>
            <Ionicons name="calendar-outline" size={11} color={colors.primaryLight} />
            <Text style={styles.dateFloatingText}>{date}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {getTitle(item)}
          </Text>

          <View style={styles.cardLocationRow}>
            <Ionicons name="location-sharp" size={12} color={colors.textDim} />
            <Text style={styles.cardLocationText} numberOfLines={1}>
              {locationCityText}
            </Text>
          </View>

          <View style={styles.cardFooter}>
            <Text style={styles.priceLabel}>Starting from</Text>
            <Text style={styles.priceValue}>
              {item.price !== undefined && Number(item.price) > 0
                ? `₹${Number(item.price).toLocaleString('en-IN')}`
                : 'FREE'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.navbar}>
        <View style={styles.navBrandBlock}>
          <View style={styles.logoBadge}>
            <Ionicons name="ticket" size={18} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.brandName}>CityPass</Text>
            <TouchableOpacity
              style={styles.citySelector}
              activeOpacity={0.7}
              onPress={() => setIsCityModalVisible(true)}
            >
              <Ionicons name="location-outline" size={12} color={colors.primaryLight} />
              <Text style={styles.citySelectorText} numberOfLines={1}>
                {activeCityLabel}
              </Text>
              <Ionicons name="chevron-down" size={12} color={colors.primaryLight} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={styles.profileAvatar}
          onPress={() => navigation.navigate('Profile')}
          activeOpacity={0.8}
        >
          <Ionicons name="person-circle-outline" size={32} color={colors.primaryLight} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchBarWrapper}>
        <Ionicons name="search" size={18} color={colors.textDim} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search gigs, comedians, venues..."
          placeholderTextColor={colors.textDim}
          style={styles.searchInput}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScroll}
      >
        {CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              activeOpacity={0.8}
              style={[styles.categoryPill, isActive && styles.categoryPillActive]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <Ionicons
                name={cat.icon as any}
                size={14}
                color={isActive ? '#FFFFFF' : colors.primaryLight}
              />
              <Text style={[styles.categoryPillText, isActive && styles.categoryPillTextActive]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {!search && (
        <View style={styles.carouselSection}>
          <View style={styles.sectionTitleRow}>
            <View>
              <Text style={styles.sectionEyebrow}>DON'T MISS OUT</Text>
              <Text style={styles.sectionHeading}>Happening This Week</Text>
            </View>
            {thisWeekEvents.length > 0 && (
              <TouchableOpacity onPress={() => navigation.navigate('EventScreen')}>
                <Text style={styles.seeAllLink}>View All</Text>
              </TouchableOpacity>
            )}
          </View>

          {thisWeekEvents.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carouselScroll}
              snapToInterval={width * 0.78 + 14}
              decelerationRate="fast"
            >
              {thisWeekEvents.map((item, idx) => {
                const bgImg = getImage(item);
                const itemCity = getCityName(item);
                const itemLocation = item.venue?.name || item.location?.trim() || '';
                const itemLocationFull = [itemLocation, itemCity].filter(Boolean).join(', ');

                return (
                  <TouchableOpacity
                    key={item.id?.toString() || idx.toString()}
                    activeOpacity={0.92}
                    style={styles.carouselCard}
                    onPress={() => navigation.navigate('EventDetails', { event: item })}
                  >
                    {bgImg ? (
                      <ImageBackground
                        source={{ uri: bgImg }}
                        style={styles.carouselBg}
                        imageStyle={{ borderRadius: 20 }}
                        resizeMode="cover"
                      >
                        <View style={styles.carouselGradient} />
                        <View style={styles.carouselBadgeTop}>
                          <View style={styles.pulsingDot} />
                          <Text style={styles.carouselBadgeText}>THIS WEEK</Text>
                        </View>

                        <View style={styles.carouselInfo}>
                          <Text style={styles.carouselDateText}>
                            {getDate(item)} {itemLocationFull ? `• ${itemLocationFull}` : ''}
                          </Text>
                          <Text style={styles.carouselTitle} numberOfLines={2}>
                            {getTitle(item)}
                          </Text>
                          <View style={styles.carouselFooterRow}>
                            <Text style={styles.carouselPrice}>
                              {item.price ? `₹${item.price} onwards` : 'Free Entry'}
                            </Text>
                            <View style={styles.carouselBookBtn}>
                              <Text style={styles.carouselBookBtnText}>Book Now</Text>
                              <Ionicons name="arrow-forward" size={13} color="#FFFFFF" />
                            </View>
                          </View>
                        </View>
                      </ImageBackground>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : (
            <View style={styles.noWeekEventsCard}>
              <Ionicons name="calendar-outline" size={26} color={colors.primaryLight} />
              <View style={styles.noWeekEventsContent}>
                <Text style={styles.noWeekEventsTitle}>No events this week</Text>
                <Text style={styles.noWeekEventsSubtext}>
                  Check out upcoming experiences below or explore all dates.
                </Text>
              </View>
            </View>
          )}
        </View>
      )}

      <View style={[styles.sectionTitleRow, { marginTop: 8 }]}>
        <View>
          <Text style={styles.sectionEyebrow}>HANDPICKED EXPERIENCES</Text>
          <Text style={styles.sectionHeading}>Explore All Events</Text>
        </View>
        <Text style={styles.resultCountBadge}>{filteredEvents.length} events</Text>
      </View>
    </View>
  );

  const renderFooter = () => (
    <View style={styles.footerContainer}>
      <View style={styles.quoteCard}>
        <Ionicons name="chatbubble-outline" size={24} color="rgba(139, 92, 246, 0.4)" style={{ marginBottom: 6 }} />
        <Text style={styles.quoteText}>
          "Your city is filled with stories waiting to be lived. Step out and make them yours."
        </Text>
        <Text style={styles.quoteAuthor}>— The CityPass Curators</Text>
      </View>

      <TouchableOpacity
        style={styles.exploreAllBtn}
        activeOpacity={0.88}
        onPress={() => navigation.navigate('Events')}
      >
        <Text style={styles.exploreAllBtnText}>Explore All Events in Detail</Text>
        <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      <FlatList
        data={filteredEvents}
        renderItem={renderEventCard}
        keyExtractor={(item, index) => item.id?.toString() || index.toString()}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={filteredEvents.length > 0 ? renderFooter : undefined}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="ticket-outline" size={36} color={colors.primaryLight} />
            </View>
            <Text style={styles.emptyTitle}>No experiences match</Text>
            <Text style={styles.emptyText}>
              Try picking another city, vibe category, or keyword.
            </Text>
          </View>
        }
      />

      <Modal
        visible={isCityModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCityModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setIsCityModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Location</Text>
              <TouchableOpacity onPress={() => setIsCityModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.cityListScroll} showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={[
                  styles.cityOption,
                  selectedCity === 'all' && styles.cityOptionActive,
                ]}
                onPress={() => {
                  setSelectedCity('all');
                  setIsCityModalVisible(false);
                }}
              >
                <Text
                  style={[
                    styles.cityOptionText,
                    selectedCity === 'all' && styles.cityOptionTextActive,
                  ]}
                >
                  All locations
                </Text>
                {selectedCity === 'all' && (
                  <Ionicons name="checkmark" size={18} color={colors.primaryLight} />
                )}
              </TouchableOpacity>

              {cities.map((city) => {
                const isSelected = selectedCity.toLowerCase() === city.name.toLowerCase();
                return (
                  <TouchableOpacity
                    key={city.id.toString()}
                    style={[styles.cityOption, isSelected && styles.cityOptionActive]}
                    onPress={() => {
                      setSelectedCity(city.name);
                      setIsCityModalVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.cityOptionText,
                        isSelected && styles.cityOptionTextActive,
                      ]}
                    >
                      {city.name}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={18} color={colors.primaryLight} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const Tab = createBottomTabNavigator();

export default function HomeScreen() {
  return (
    <SafeAreaProvider>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: '#FFFFFF',
          tabBarInactiveTintColor: 'rgba(255, 255, 255, 0.4)',
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
        <Tab.Screen
          name="Events"
          component={EventScreen}
          options={{ tabBarLabel: 'Events' }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ tabBarLabel: 'Profile' }}
        />
      </Tab.Navigator>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  headerContainer: {
    paddingTop: 8,
    marginBottom: 8,
  },
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 14,
  },
  navBrandBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  citySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
    maxWidth: 160,
  },
  citySelectorText: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: '600',
  },
  profileAvatar: {
    padding: 2,
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    color: colors.white,
    fontSize: 14,
  },
  categoryScroll: {
    gap: 8,
    paddingBottom: 18,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 24,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  categoryPillActive: {
    backgroundColor: colors.purple,
    borderColor: colors.lavender,
  },
  categoryPillText: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: '700',
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  sectionEyebrow: {
    color: colors.primaryLight,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  sectionHeading: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '800',
  },
  seeAllLink: {
    color: colors.primaryLight,
    fontSize: 12,
    fontWeight: '700',
  },
  resultCountBadge: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '600',
  },
  carouselSection: {
    marginBottom: 20,
  },
  carouselScroll: {
    gap: 12,
  },
  carouselCard: {
    width: width * 0.78,
    height: 200,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  carouselBg: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 14,
  },
  carouselGradient: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(11, 8, 20, 0.58)',
  },
  carouselBadgeTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.green,
  },
  carouselBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  carouselInfo: {
    gap: 4,
  },
  carouselDateText: {
    color: colors.primaryLight,
    fontSize: 11,
    fontWeight: '700',
  },
  carouselTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 20,
  },
  carouselFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  carouselPrice: {
    color: colors.green,
    fontSize: 13,
    fontWeight: '800',
  },
  carouselBookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.purple,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  carouselBookBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  noWeekEventsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  noWeekEventsContent: {
    flex: 1,
  },
  noWeekEventsTitle: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  noWeekEventsSubtext: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  card: {
    width: '48.2%',
    backgroundColor: colors.card,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardImageContainer: {
    height: 128,
    position: 'relative',
    backgroundColor: colors.cardElevated,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTopRow: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    backgroundColor: 'rgba(11, 8, 20, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    maxWidth: '75%',
  },
  categoryBadgeText: {
    color: colors.primaryLight,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  favButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(11, 8, 20, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateFloatingTag: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(11, 8, 20, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dateFloatingText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  cardBody: {
    padding: 10,
  },
  cardTitle: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    minHeight: 36,
    marginBottom: 4,
  },
  cardLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  cardLocationText: {
    color: colors.textMuted,
    fontSize: 11,
    flex: 1,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 6,
  },
  priceLabel: {
    color: colors.textDim,
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  priceValue: {
    color: colors.green,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 1,
  },
  footerContainer: {
    marginTop: 20,
    gap: 14,
    alignItems: 'center',
  },
  quoteCard: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
  },
  quoteText: {
    color: '#CBD5E1',
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 20,
  },
  quoteAuthor: {
    color: colors.primaryLight,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 8,
  },
  exploreAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.purple,
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
  },
  exploreAllBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContainer: {
    width: '100%',
    maxHeight: '60%',
    backgroundColor: colors.cardElevated,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  cityListScroll: {
    marginTop: 8,
  },
  cityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginVertical: 2,
  },
  cityOptionActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  cityOptionText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  cityOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  floatingTabBar: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    height: 64,
    backgroundColor: '#120D22',
    borderRadius: 32,
    borderTopWidth: 0,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  tabItem: {
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 3,
  },
});