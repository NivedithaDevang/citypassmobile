import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  Image,
  FlatList,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../services/api';
import { type Events } from '../types/auth';
import { SafeAreaProvider } from 'react-native-safe-area-context';
type EventCardData = Events & {
  id?: string | number;
  title?: string;
  name?: string;
  city?: string | { name?: string } | null;
  city_name?: string | null;
  venue?: string;
  price?: string | number;
  date?: string;
  category?: string;
  image?: string;
};

const DATE_FILTERS = ['All', 'Today', 'Tomorrow', 'This Weekend'];
const CATEGORIES = ['All', 'Music', 'Comedy', 'Nightlife', 'Workshops', 'Theatre'];

export default function EventScreen({ navigation }: any) {
  const [events, setEvents] = useState<EventCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDateFilter, setSelectedDateFilter] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const fetchEvents = useCallback(async () => {
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
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEvents();
  };

  const getCityName = (event: EventCardData) => {
    const city = event.city;
    if (typeof city === 'string' && city) return city;
    if (city && typeof city !== 'string' && city.name) return city.name;
    return event.city_name || event.venue || '';
  };

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesCategory =
        selectedCategory === 'All' ||
        event.category?.toLowerCase() === selectedCategory.toLowerCase();
      // Add custom date parsing matching logic here when dates are connected
      return matchesCategory;
    });
  }, [events, selectedCategory]);

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Date Filter Badges */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
      >
        {DATE_FILTERS.map((filter) => {
          const isActive = selectedDateFilter === filter;
          return (
            <TouchableOpacity
              key={filter}
              activeOpacity={0.8}
              style={[styles.filterChip, isActive && styles.filterChipActive]}
              onPress={() => setSelectedDateFilter(filter)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  isActive && styles.filterChipTextActive,
                ]}
              >
                {filter}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Category Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
      >
        {CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat;
          return (
            <TouchableOpacity
              key={cat}
              activeOpacity={0.8}
              style={[styles.categoryChip, isActive && styles.categoryChipActive]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text
                style={[
                  styles.categoryText,
                  isActive && styles.categoryTextActive,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Explore Events</Text>
        <Text style={styles.resultCount}>{filteredEvents.length} Events</Text>
      </View>
    </View>
  );

  const renderEventCard = ({ item }: { item: EventCardData }) => {
    const location = getCityName(item);
    const eventTitle = item.title || item.name || 'Untitled Event';
    const formattedPrice = item.price ? `₹${item.price} onwards` : 'Free / TBA';

    return (
      <TouchableOpacity
        activeOpacity={0.88}
        style={styles.card}
        onPress={() => navigation?.navigate('EventDetails', { event: item })}
      >
        <View style={styles.imageContainer}>
          <Image
            source={
              item.image
                ? { uri: item.image }
                : require('../../assets/logo.png')
            }
            style={styles.cardImage}
            resizeMode="cover"
          />
          {item.category ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.category.toUpperCase()}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.cardDate}>{item.date || 'Upcoming'}</Text>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {eventTitle}
          </Text>

          {location ? (
            <Text style={styles.cardLocation} numberOfLines={1}>
              📍 {location}
            </Text>
          ) : null}

          <View style={styles.priceRow}>
            <Text style={styles.priceText}>{formattedPrice}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
    <SafeAreaProvider style={styles.container}>
          <StatusBar style="light" />

          {loading ? (
              <View style={styles.loaderContainer}>
                  <ActivityIndicator size="large" color="#D8B4E2" />
              </View>
          ) : (
              <FlatList
                  data={filteredEvents}
                  renderItem={renderEventCard}
                  keyExtractor={(index) => index.toString()}
                  numColumns={2}
                  columnWrapperStyle={styles.columnWrapper}
                  contentContainerStyle={styles.listContent}
                  showsVerticalScrollIndicator={false}
                  ListHeaderComponent={renderHeader}
                  refreshControl={<RefreshControl
                      refreshing={refreshing}
                      onRefresh={onRefresh}
                      tintColor="#D8B4E2" />}
                  ListEmptyComponent={<View style={styles.emptyContainer}>
                      <Text style={styles.emptyTitle}>No events found</Text>
                      <Text style={styles.emptySubtitle}>
                          Try changing your filters or check back later.
                      </Text>
                  </View>} />
          )}
      </SafeAreaProvider>
      
      
      </>
  );
  

}

const styles = StyleSheet.create({
  container: {
    paddingTop: 50,
    flex: 1,
    backgroundColor: '#0F0214',
  },

  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerContainer: {
    marginBottom: 16,
    paddingTop: 8,
  },

  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 10,
  },

  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#20072B',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },

  filterChipActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },

  filterChipText: {
    color: '#D8B4E2',
    fontSize: 12,
    fontWeight: '600',
  },

  filterChipTextActive: {
    color: '#0F0214',
    fontWeight: '700',
  },

  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(216, 180, 226, 0.25)',
  },

  categoryChipActive: {
    backgroundColor: '#350A47',
    borderColor: '#A855F7',
  },

  categoryText: {
    color: '#A78BFA',
    fontSize: 11,
    fontWeight: '500',
  },

  categoryTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 10,
  },

  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  resultCount: {
    color: '#93829B',
    fontSize: 12,
  },

  listContent: {
    paddingBottom: 28,
  },

  columnWrapper: {
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },

  card: {
    flex: 1,
    backgroundColor: '#1E0528',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },

  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 125,
    backgroundColor: '#2A0839',
  },

  cardImage: {
    width: '100%',
    height: '100%',
  },

  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(15, 2, 20, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },

  badgeText: {
    color: '#F472B6',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  cardContent: {
    padding: 10,
    justifyContent: 'space-between',
    flex: 1,
  },

  cardDate: {
    color: '#A855F7',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 3,
  },

  cardTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    marginBottom: 6,
  },

  cardLocation: {
    color: '#BFA8C7',
    fontSize: 11,
    marginBottom: 8,
  },

  priceRow: {
    marginTop: 'auto',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },

  priceText: {
    color: '#34D399',
    fontSize: 12,
    fontWeight: '700',
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },

  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },

  emptySubtitle: {
    color: '#93829B',
    fontSize: 13,
    textAlign: 'center',
  },
});