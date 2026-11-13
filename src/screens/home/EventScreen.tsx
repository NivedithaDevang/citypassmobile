import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  TextInput,
  Modal,
  Platform,
  Pressable,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../services/api';
import { type Events } from '../../types/auth';
import { COLORS } from '../../constants/Color';

const colors = COLORS;

export type EventCardData = Events & {
  id?: string | number;
  title?: string;
  name?: string;
  city?: string | { name?: string; id?: number | string } | null;
  city_name?: string | null;
  venue?: string;
  location?: string;
  price?: string | number;
  date?: string;
  event_date?: string;
  category?: string;
  category_name?: string;
  image?: string;
  is_featured?: boolean | number;
};

type SortOption = 'upcoming' | 'date_desc' | 'price_low' | 'price_high';

const SORT_OPTIONS: { label: string; value: SortOption }[] = [
  { label: 'Upcoming First', value: 'upcoming' },
  { label: 'Latest First', value: 'date_desc' },
  { label: 'Price: Low to High', value: 'price_low' },
  { label: 'Price: High to Low', value: 'price_high' },
];

const DATE_FILTERS = [
  { label: 'All', icon: 'sparkles-outline' },
  { label: 'Today', icon: 'today-outline' },
  { label: 'Tomorrow', icon: 'calendar-outline' },
  { label: 'This Weekend', icon: 'wine-outline' },
];

export default function EventScreen({ navigation }: any) {
  const [events, setEvents] = useState<EventCardData[]>([]);
  const [cities, setCities] = useState<string[]>(['All Cities']);
  const [categories, setCategories] = useState<{ name: string }[]>([{ name: 'All' }]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [cityIdMap, setCityIdMap] = useState<Record<string | number, string>>({});
  const [favorites, setFavorites] = useState<Record<string | number, boolean>>({});

  // Filter & Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [selectedDateFilter, setSelectedDateFilter] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState<SortOption>('upcoming');

  // Modals
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [citySearchQuery, setCitySearchQuery] = useState('');

  const getCityName = useCallback((event: EventCardData): string => {
    if (event.city_name && typeof event.city_name === 'string') return event.city_name.trim();
    if (event.city && typeof event.city === 'string') return event.city.trim();
    if (typeof event.city === 'object' && typeof event.city?.name === 'string') return event.city.name.trim();
    if (event.city_id != null && cityIdMap[event.city_id]) return cityIdMap[event.city_id];
    return '';
  }, [cityIdMap]);

  const fetchCities = useCallback(async (currentEvents?: EventCardData[]) => {
    try {
      setCitiesLoading(true);
      const response = await api.get('/v1/cities');
      const rawData = response.data;
      const list = Array.isArray(rawData) ? rawData : rawData?.cities || rawData?.data || [];

      const parsedCityNames: string[] = list
        .map((c: any) => (typeof c === 'string' ? c : c?.name || c?.city_name || c?.cityName))
        .filter((name: any): name is string => typeof name === 'string' && Boolean(name.trim()));

      const nextCityIdMap: Record<string | number, string> = {};
      list.forEach((city: any) => {
        if (typeof city !== 'string' && city?.id != null) {
          const name = city.name || city.city_name || city.cityName;
          if (typeof name === 'string' && name.trim()) nextCityIdMap[city.id] = name.trim();
        }
      });
      setCityIdMap(nextCityIdMap);

      if (parsedCityNames.length > 0) {
        setCities(['All Cities', ...Array.from(new Set(parsedCityNames))]);
      } else if (currentEvents && currentEvents.length > 0) {
        const extracted = Array.from(
          new Set(
            currentEvents
              .map((e) => e.city_name || (typeof e.city === 'string' ? e.city : e.city?.name) || '')
              .filter(Boolean)
          )
        );
        setCities(['All Cities', ...extracted]);
      }
    } catch {
      if (currentEvents && currentEvents.length > 0) {
        const extracted = Array.from(
          new Set(
            currentEvents
              .map((e) => e.city_name || (typeof e.city === 'string' ? e.city : e.city?.name) || '')
              .filter(Boolean)
          )
        );
        setCities(['All Cities', ...extracted]);
      }
    } finally {
      setCitiesLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await api.get('/v1/categories');
      const rawData = response.data;
      const categoryList = Array.isArray(rawData) ? rawData : rawData?.categories || rawData?.data || [];
      const normalizedList = categoryList
        .map((c: any) => (typeof c === 'string' ? { name: c } : c))
        .filter((c: any) => c?.name && c.name.toLowerCase() !== 'all');

      setCategories([{ name: 'All' }, ...normalizedList]);
    } catch {
      setCategories([{ name: 'All' }]);
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      const response = await api.get('/v1/events/events');
      const rawData = response.data;
      const eventList: EventCardData[] = Array.isArray(rawData) ? rawData : rawData?.events || rawData?.data || [];
      setEvents(eventList);
      return eventList;
    } catch {
      setEvents([]);
      return [];
    }
  }, []);

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    const eventList = await fetchEvents();
    await fetchCities(eventList);
    await fetchCategories();
    setLoading(false);
  }, [fetchEvents, fetchCities, fetchCategories]);

  useEffect(() => {
    void Promise.resolve().then(loadInitialData);
  }, [loadInitialData]);

  const onRefresh = async () => {
    setRefreshing(true);
    const eventList = await fetchEvents();
    await fetchCities(eventList);
    await fetchCategories();
    setRefreshing(false);
  };

  const matchesDateFilter = (eventDateStr?: string, filter?: string) => {
    if (!filter || filter === 'All') return true;
    if (!eventDateStr) return false;

    const eventDate = new Date(eventDateStr);
    if (isNaN(eventDate.getTime())) return true;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
    const diffDays = Math.round((eventDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (filter === 'Today') return diffDays === 0;
    if (filter === 'Tomorrow') return diffDays === 1;
    if (filter === 'This Weekend') {
      const dayOfWeek = eventDay.getDay();
      return (dayOfWeek === 0 || dayOfWeek === 6) && diffDays >= 0 && diffDays <= 6;
    }
    return true;
  };

  const filteredEvents = useMemo(() => {
    const list = events.filter((event) => {
      const title = (event.title || event.name || '').toLowerCase();
      const city = getCityName(event).toLowerCase();
      const cat = (event.category || event.category_name || '').toLowerCase();
      const eventDate = event.event_date || event.date;

      const matchesSearch =
        !searchQuery || title.includes(searchQuery.toLowerCase()) || city.includes(searchQuery.toLowerCase());
      const matchesCity = selectedCity === 'All Cities' || city.includes(selectedCity.toLowerCase());
      const matchesCat = selectedCategory === 'All' || cat === selectedCategory.toLowerCase();
      const matchesDate = matchesDateFilter(eventDate, selectedDateFilter);

      return matchesSearch && matchesCity && matchesCat && matchesDate;
    });

    return [...list].sort((a, b) => {
      const dateA = new Date(a.event_date || a.date || 0).getTime();
      const dateB = new Date(b.event_date || b.date || 0).getTime();
      const priceA = Number(a.price) || 0;
      const priceB = Number(b.price) || 0;

      switch (sortBy) {
        case 'upcoming': return dateA - dateB;
        case 'date_desc': return dateB - dateA;
        case 'price_low': return priceA - priceB;
        case 'price_high': return priceB - priceA;
        default: return 0;
      }
    });
  }, [events, searchQuery, selectedCity, selectedCategory, selectedDateFilter, sortBy, getCityName]);

  const featuredEvents = useMemo(() => {
    return events.filter((e) => e.is_featured === true || e.is_featured === 1).slice(0, 5);
  }, [events]);

  const filteredModalCities = useMemo(() => {
    if (!citySearchQuery.trim()) return cities;
    return cities.filter((c) => c.toLowerCase().includes(citySearchQuery.trim().toLowerCase()));
  }, [cities, citySearchQuery]);

  const formatDateBadge = (dateStr?: string) => {
    if (!dateStr) return { day: '--', month: 'TBA' };
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return { day: 'UP', month: 'SOON' };
    return {
      day: d.toLocaleDateString('en-IN', { day: '2-digit' }),
      month: d.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase(),
    };
  };

  const toggleFavorite = (eventId?: string | number) => {
    if (!eventId) return;
    setFavorites((prev) => ({ ...prev, [eventId]: !prev[eventId] }));
  };

  const currentSortLabel = useMemo(() => {
    return SORT_OPTIONS.find((s) => s.value === sortBy)?.label || 'Sort';
  }, [sortBy]);

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Top Bar with Location and Profile/Notification action */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.locationSelector}
          onPress={() => setCityModalVisible(true)}
          activeOpacity={0.8}
        >
          <View style={styles.locationIconWrap}>
            <Ionicons name="location-sharp" size={16} color={colors.purple} />
          </View>
          <View>
            <Text style={styles.locationLabel}>EXPLORING IN</Text>
            <View style={styles.cityNameRow}>
              <Text style={styles.cityNameText}>{selectedCity}</Text>
              <Ionicons name="chevron-down" size={13} color={colors.textMuted} />
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.roundActionBtn} activeOpacity={0.8}>
          <Ionicons name="notifications-outline" size={18} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          placeholder="Search gigs, artists, or venues..."
          placeholderTextColor={colors.textDim || '#64748B'}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
          clearButtonMode="while-editing"
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Featured Spotlight */}
      {!searchQuery && featuredEvents.length > 0 && (
        <View style={styles.featuredSection}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.titleWithDot}>
              <View style={styles.liveDot} />
              <Text style={styles.featuredSectionTitle}>Featured Spotlight</Text>
            </View>
            <Text style={styles.featuredTag}>CURATED</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.featuredScroll}
            snapToInterval={296}
            decelerationRate="fast"
          >
            {featuredEvents.map((item) => {
              const { day, month } = formatDateBadge(item.event_date || item.date);
              return (
                <TouchableOpacity
                  key={`featured-${item.id}`}
                  style={styles.featuredCard}
                  activeOpacity={0.92}
                  onPress={() => navigation?.navigate('EventDetails', { event: item })}
                >
                  <Image
                    source={item.image ? { uri: item.image } : require('../../../assets/logo.png')}
                    style={styles.featuredImage}
                  />
                  <LinearGradient
                    colors={['transparent', 'rgba(11, 8, 20, 0.4)', 'rgba(11, 8, 20, 0.95)']}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={styles.featuredBadgeRow}>
                    <View style={styles.featuredBadge}>
                      <Ionicons name="flame" size={11} color="#FFF" style={{ marginRight: 3 }} />
                      <Text style={styles.featuredBadgeText}>TRENDING</Text>
                    </View>
                  </View>
                  <View style={styles.featuredContent}>
                    <Text style={styles.featuredDate}>{month} {day} • {getCityName(item) || 'Bengaluru'}</Text>
                    <Text style={styles.featuredTitle} numberOfLines={1}>
                      {item.name || item.title}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Date Filter Badges */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
      >
        {DATE_FILTERS.map((item) => {
          const isActive = selectedDateFilter === item.label;
          return (
            <TouchableOpacity
              key={item.label}
              activeOpacity={0.8}
              style={[styles.dateChip, isActive && styles.dateChipActive]}
              onPress={() => setSelectedDateFilter(item.label)}
            >
              <Ionicons
                name={item.icon as any}
                size={13}
                color={isActive ? colors.purple : colors.textMuted}
                style={{ marginRight: 5 }}
              />
              <Text style={[styles.dateChipText, isActive && styles.dateChipTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Category Filter Badges */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.filterScroll, { marginBottom: 16 }]}
      >
        {categories.map((cat) => {
          const isActive = selectedCategory.toLowerCase() === cat.name.toLowerCase();
          return (
            <TouchableOpacity
              key={cat.name}
              activeOpacity={0.8}
              style={[styles.categoryChip, isActive && styles.categoryChipActive]}
              onPress={() => setSelectedCategory(cat.name)}
            >
              <Text style={[styles.categoryText, isActive && styles.categoryTextActive]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Section Header with Sort Button Inline */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Upcoming Experiences</Text>
        <TouchableOpacity
          style={styles.sortTriggerBtn}
          onPress={() => setSortModalVisible(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="swap-vertical" size={13} color={colors.accent || colors.purple} />
          <Text style={styles.sortTriggerText} numberOfLines={1}>
            {currentSortLabel}
          </Text>
          <Ionicons name="chevron-down" size={11} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEventCard = ({ item }: { item: EventCardData }) => {
    const cityName = getCityName(item);
    const venueName = item.location || item.venue;
    const eventTitle = item.name || item.title || 'Untitled Event';
    const rawPrice = Number(item.price);
    const formattedPrice = rawPrice > 0 ? `₹${rawPrice.toLocaleString('en-IN')}` : 'Free';
    const { day, month } = formatDateBadge(item.event_date || item.date);
    const categoryTag = (item.category || item.category_name || '').toUpperCase();
    const isFav = !!favorites[item.id || 0];

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.card}
        onPress={() => navigation?.navigate('EventDetails', { event: item })}
      >
        <View style={styles.imageContainer}>
          <Image
            source={item.image ? { uri: item.image } : require('../../../assets/logo.png')}
            style={styles.cardImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.3)', 'transparent', 'rgba(11, 8, 20, 0.9)']}
            style={StyleSheet.absoluteFill}
          />

          {/* Date Badge */}
          <View style={styles.dateBadge}>
            <Text style={styles.dateBadgeMonth}>{month}</Text>
            <Text style={styles.dateBadgeDay}>{day}</Text>
          </View>

          {/* Bookmark Button */}
          <TouchableOpacity
            style={styles.favButton}
            onPress={() => toggleFavorite(item.id)}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isFav ? 'bookmark' : 'bookmark-outline'}
              size={15}
              color={isFav ? '#9232bf' : '#FFFFFF'}
            />
          </TouchableOpacity>

          {categoryTag ? (
            <View style={styles.categoryCardPill}>
              <Text style={styles.categoryCardPillText}>{categoryTag}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {eventTitle}
          </Text>

          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={12} color={colors.textMuted} />
            <Text style={styles.cardLocation} numberOfLines={1}>
              {venueName ? `${venueName}, ${cityName}` : cityName || 'Bengaluru'}
            </Text>
          </View>

          <View style={styles.cardFooter}>
            <View>
              <Text style={styles.priceCaption}>STARTING</Text>
              <Text style={[styles.priceValue, rawPrice === 0 && styles.freeBadge]}>
                {formattedPrice}
              </Text>
            </View>
            <View style={styles.bookActionPill}>
              <Text style={styles.bookActionText}>Book</Text>
              <Ionicons name="chevron-forward" size={11} color="#FFFFFF" />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.purple} />
          <Text style={styles.loaderText}>Discovering events around you...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredEvents}
          renderItem={renderEventCard}
          keyExtractor={(item, index) => item.id?.toString() || index.toString()}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderHeader}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.purple}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyFooterContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="calendar-clear-outline" size={32} color={colors.textDim} />
              </View>
              <Text style={styles.emptyFooterTitle}>No matching experiences</Text>
              <Text style={styles.emptySubtitle}>
                No events match your current filters. Try changing your city or date preferences.
              </Text>
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={() => {
                  setSearchQuery('');
                  setSelectedCity('All Cities');
                  setSelectedDateFilter('All');
                  setSelectedCategory('All');
                  setSortBy('upcoming');
                }}
              >
                <Text style={styles.resetBtnText}>Clear All Filters</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* City Selector Modal */}
      <Modal
        visible={cityModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setCityModalVisible(false);
          setCitySearchQuery('');
        }}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => {
            setCityModalVisible(false);
            setCitySearchQuery('');
          }}
        >
          <Pressable style={styles.citySheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handleBar} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Select City</Text>
              <TouchableOpacity
                onPress={() => {
                  setCityModalVisible(false);
                  setCitySearchQuery('');
                }}
              >
                <Ionicons name="close-circle" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearchBar}>
              <Ionicons name="search" size={16} color={colors.textMuted} />
              <TextInput
                placeholder="Search city..."
                placeholderTextColor={colors.textDim || '#64748B'}
                value={citySearchQuery}
                onChangeText={setCitySearchQuery}
                style={styles.modalSearchInput}
                clearButtonMode="while-editing"
              />
            </View>

            {citiesLoading ? (
              <View style={styles.cityLoaderBox}>
                <ActivityIndicator size="small" color={colors.purple} />
                <Text style={styles.cityLoaderText}>Loading cities...</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {filteredModalCities.map((c) => {
                  const isSelected = selectedCity.toLowerCase() === c.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={c}
                      style={[styles.cityRow, isSelected && styles.cityRowSelected]}
                      onPress={() => {
                        setSelectedCity(c);
                        setCityModalVisible(false);
                        setCitySearchQuery('');
                      }}
                    >
                      <Text style={[styles.cityRowText, isSelected && styles.cityRowTextSelected]}>
                        {c}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={18} color={colors.purple} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Sort Selection Bottom Sheet Modal */}
      <Modal
        visible={sortModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSortModalVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSortModalVisible(false)}>
          <Pressable style={styles.citySheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handleBar} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Sort Events</Text>
              <TouchableOpacity onPress={() => setSortModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={{ marginTop: 8 }}>
              {SORT_OPTIONS.map((option) => {
                const isSelected = sortBy === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.cityRow, isSelected && styles.cityRowSelected]}
                    onPress={() => {
                      setSortBy(option.value);
                      setSortModalVisible(false);
                    }}
                  >
                    <Text style={[styles.cityRowText, isSelected && styles.cityRowTextSelected]}>
                      {option.label}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={18} color={colors.purple} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingBottom: 80
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loaderText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  headerContainer: {
    paddingBottom: 6,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  locationSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  locationIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.25)',
  },
  roundActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  locationLabel: {
    color: colors.textDim,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  cityNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  cityNameText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  searchBar: {
    marginHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    gap: 10,
    marginTop: 6,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    color: colors.white,
    fontSize: 14,
  },
  featuredSection: {
    marginBottom: 18,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  titleWithDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  featuredSectionTitle: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  featuredTag: {
    color: colors.purple,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  featuredScroll: {
    paddingHorizontal: 16,
    gap: 14,
  },
  featuredCard: {
    width: 284,
    height: 164,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredBadgeRow: {
    position: 'absolute',
    top: 10,
    left: 10,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
  },
  featuredBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  featuredContent: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
  },
  featuredDate: {
    color: '#C4B5FD',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 3,
  },
  featuredTitle: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 10,
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateChipActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderColor: colors.purple,
  },
  dateChipText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  dateChipTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  categoryChip: {
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipActive: {
    backgroundColor: colors.purple,
    borderColor: colors.purple,
  },
  categoryText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
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
    marginTop: 4,
    marginBottom: 12,
  },
  sectionTitle: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '800',
  },
  sortTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sortTriggerText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 24,
  },
  columnWrapper: {
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  card: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 155,
    backgroundColor: colors.border,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  dateBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(15, 11, 28, 0.82)',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  dateBadgeMonth: {
    color: '#F472B6',
    fontSize: 8,
    fontWeight: '800',
  },
  dateBadgeDay: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '800',
  },
  categoryCardPill: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(15, 11, 28, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryCardPillText: {
    color: '#D8B4FE',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  favButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(15, 11, 28, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardContent: {
    padding: 10,
    flex: 1,
    justifyContent: 'space-between',
  },
  cardTitle: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17,
    minHeight: 34,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    marginBottom: 8,
  },
  cardLocation: {
    color: colors.textMuted,
    fontSize: 11,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  priceCaption: {
    color: colors.textDim,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  priceValue: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '800',
  },
  freeBadge: {
    color: '#34D399',
  },
  bookActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.purple,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  bookActionText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyFooterContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyFooterTitle: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  resetBtn: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resetBtnText: {
    color: colors.purple,
    fontSize: 12,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  citySheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 28,
    paddingTop: 10,
    maxHeight: '65%',
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sheetTitle: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '700',
  },
  modalSearchBar: {
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    gap: 8,
    marginBottom: 12,
  },
  modalSearchInput: {
    flex: 1,
    color: colors.white,
    fontSize: 13,
  },
  cityLoaderBox: {
    paddingVertical: 30,
    alignItems: 'center',
    gap: 8,
  },
  cityLoaderText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  cityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cityRowSelected: {
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  cityRowText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  cityRowTextSelected: {
    color: colors.white,
    fontWeight: '700',
  },
});