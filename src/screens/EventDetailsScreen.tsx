import React, { useEffect, useState, useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  Image,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Linking,
  Modal,
  FlatList,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { api } from '../services/api';
import { type Events } from '../types/auth';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../constants/Color';

const colors = COLORS;

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TERMS_LIST: string[] = [
  "By accepting, holding or using a ticket, you acknowledge that you have read, understood, accepted and agreed to the full terms and conditions.",
  "The organizer reserves the right of admission.",
  "The organizer may alter the event schedule without prior notice.",
  "Entry is permitted only after a thorough security check and through designated entrances.",
  "Re-entry is not permitted.",
  "The venue does not allow food, beverages, liquids, bottles, cans, tins, bags, lighters, matchboxes, flammable items, or any illegal or hazardous substances inside the venue or seating area (\"Prohibited Items\"). Security personnel will search ticket holders' belongings at entry. If a ticket holder refuses a search and/or is found in possession of Prohibited Items, the organizer may deny entry without any refund or compensation.",
  "This is a drug-free event. If any ticket holder uses, possesses, procures, supplies, or consumes drugs, narcotics, or psychotropic substances (as defined under the Narcotic Drugs and Psychotropic Substances Act, 1985), the organizer will immediately evict them from the venue without refund or compensation. The organizer also reserves the right to initiate legal action as permitted under applicable law.",
  "The organizer reserves the right to refuse admission or eject any ticket holder who appears intoxicated, under the influence of drugs, behaves dangerously or inappropriately, or engages in conduct likely to cause harassment, damage, injury, or nuisance. The organizer's decision in this regard shall be final.",
  "The use of audio or video recording equipment, including still cameras, is strictly prohibited.",
  "The organizer issues this ticket in accordance with the rules and regulations of the event organizer and venue management.",
  "The organizer does not accept responsibility for any injury to persons or for any loss or damage to personal property brought to the event.",
  "In accordance with applicable law, persons below the legally permissible age may not purchase or consume alcoholic beverages.",
  "The organizer and venue are not liable for any issues arising from unauthorized copies or reproductions of this ticket. Except as stated herein, the ticket is non-refundable and cannot be exchanged, cancelled, or returned once purchased.",
  "If the organizer cancels the performance, the organizer will refund the ticket fee. All other charges, including parking fees, internet handling fees, and order processing fees, remain non-refundable.",
  "The ticket is invalid if the security features affixed to it are tampered with.",
  "You voluntarily assume all risks related to contracting COVID-19, H1N1, or any other communicable disease or illness, whether occurring before, during, or after the event, and waive all claims against the organizer arising from such risks.",
  "The event is subject to force majeure conditions.",
  "We request your cooperation at all times.",
  "All disputes or claims shall be subject to the exclusive jurisdiction of the courts in Mumbai.",
  "The organizer may modify these terms and conditions at its discretion from time to time.",
  "All secondary performances (if any) and the event lineup are subject to the artist's discretion.",
  "To ensure a high-quality user experience, the organizer may collect certain information (including personally identifiable information such as name, email address, or phone number) at the time of booking, registration, or payment, in accordance with its Terms and Conditions and Privacy Policy."
];

export const TermsModal = ({ isOpen, onClose }: TermsModalProps) => {
  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={modalStyles.overlay}>
        <View style={modalStyles.content}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.title}>Terms & Conditions</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={24} color={colors.textMuted || colors.grey} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={TERMS_LIST}
            keyExtractor={(_, index) => index.toString()}
            showsVerticalScrollIndicator
            style={modalStyles.list}
            renderItem={({ item, index }) => (
              <View style={modalStyles.termRow}>
                <Text style={modalStyles.bullet}>{index + 1}.</Text>
                <Text style={modalStyles.termText}>{item}</Text>
              </View>
            )}
          />
        </View>
      </View>
    </Modal>
  );
};

export interface EventTicket {
  id: number;
  event_id: number;
  name: string;
  description?: string | null;
  price: number | string;
  status?: string;
}

export interface EventWithTickets extends Events {
  image: any;
  tickets?: EventTicket[];
  instructions?: string;
  additional_instructions?: string;
  languages?: string | string[];
  age_group?: string;
  duration_hours?: number | string;
}

type Props = {
  route: {
    params?: {
      slug?: string;
      event?: EventWithTickets;
    };
  };
  navigation: any;
};

export default function EventDetailsScreen({ route, navigation }: Props) {
  const routeEvent = route.params?.event;
  const slug = route.params?.slug || routeEvent?.slug || String(routeEvent?.id);

  const [event, setEvent] = useState<EventWithTickets | null>(routeEvent || null);
  const [tickets, setTickets] = useState<EventTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<EventTicket | null>(null);
  const [loading, setLoading] = useState<boolean>(!routeEvent);
  const [error, setError] = useState<string | null>(null);
  const [showTerms, setShowTerms] = useState<boolean>(false);

  useEffect(() => {
    const fetchEventDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await api.get(`/v1/events/${slug}`);
        const loadedEvent: EventWithTickets = response.data.event || response.data;
        setEvent(loadedEvent);

        const eventTicketList: EventTicket[] = (
          loadedEvent.tickets ||
          []
        ).filter(
          (ticket) => ticket.status === undefined || ticket.status === 'ACTIVE'
        );

        setTickets(eventTicketList);
        setSelectedTicket(eventTicketList[0] || null);
      } catch (err) {
        console.error('EVENT DETAILS ERROR:', err);
        setError('Failed to load event details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchEventDetails();
    }
  }, [slug]);

  const formatEventDate = (eventDate?: string) => {
    if (!eventDate) return 'Date to be announced';
    const parsedDate = new Date(eventDate);
    if (Number.isNaN(parsedDate.getTime())) return eventDate;

    return parsedDate.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTimeString = (timeStr?: string) => {
    if (!timeStr) return '';
    const match = timeStr.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (match) {
      const hours = Number(match[1]);
      const minutes = Number(match[2]);
      if (hours > 23 || minutes > 59) return timeStr;

      return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString('en-IN', {
        hour: 'numeric',
        minute: '2-digit',
      });
    }
    return timeStr;
  };

  const getFormattedLanguages = (languages?: string | string[]) => {
    if (!languages) return 'English';
    if (Array.isArray(languages)) return languages.join(' / ');
    try {
      const parsed = JSON.parse(languages);
      if (Array.isArray(parsed)) return parsed.join(' / ');
    } catch {}
    return languages.replace(/,/g, ' / ');
  };

  const formatDuration = (duration?: number | string) => {
    if (!duration) return '2 Hours';
    const num = Number(duration);
    if (!isNaN(num)) return `${num} ${num === 1 ? 'Hour' : 'Hours'}`;
    return String(duration);
  };

  const openMaps = () => {
    if (!event?.location) return;
    const query = encodeURIComponent(`${event.location} ${event.city_name || ''}`);
    const url = Platform.select({
      ios: `maps:0,0?q=${query}`,
      android: `geo:0,0?q=${query}`,
      default: `https://www.google.com/maps/search/?api=1&query=${query}`,
    });
    Linking.openURL(url as string).catch(() => {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
    });
  };

  const seatsLeft = Number(event?.capacity ?? 0);
  const isCancelled = event?.status === 'CANCELLED';
  const isCompleted = event?.status === 'COMPLETED';
  const isSoldOut = seatsLeft <= 0 && event?.capacity !== undefined;

  const isAvailable =
    event?.is_active !== false &&
    event?.is_live !== false &&
    !isCancelled &&
    !isCompleted &&
    !isSoldOut;

  const currentPrice = useMemo(() => {
    if (selectedTicket) return Number(selectedTicket.price);
    if (tickets.length > 0) return Math.min(...tickets.map((t) => Number(t.price)));
    return Number(event?.price || 0);
  }, [selectedTicket, tickets, event]);

  const handleBookTicketsClick = () => {
    if (!isAvailable || !event) return;

    navigation.navigate('Booking', {
      event: {
        ...event,
        tickets,
        event_tickets: tickets,
        selected_ticket_id: selectedTicket?.id ?? null,
        selected_ticket_name: selectedTicket?.name ?? null,
        selected_ticket_price: selectedTicket ? Number(selectedTicket.price) : currentPrice,
      },
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.purple} />
        <Text style={styles.loadingText}>Loading event details...</Text>
      </View>
    );
  }

  if (error || !event) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.errorText}>{error || 'Event not found.'}</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
          <Text style={styles.backBtnText}>Back to Events</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const instructions = event.additional_instructions || event.instructions;
  const organizerName =
    event.organiser_stage_name || event.organiser_user_name || 'CityPass Organiser';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      {/* Floating Top Controls */}
      <SafeAreaProvider style={styles.floatingHeader}>
        <TouchableOpacity
          style={styles.iconCircle}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        {(event.is_live === true || event.is_live === 1) && (
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}
      </SafeAreaProvider>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Event Backdrop / Poster */}
        <View style={styles.heroPoster}>
          <Image
            source={event.image ? { uri: event.image } : require('../../assets/logo.png')}
            style={styles.heroImage}
            resizeMode="cover"
          />

          <View style={styles.heroChipsRow}>
            <View style={styles.categoryPill}>
              <Text style={styles.categoryText}>
                {(event.category_name || 'Event').toUpperCase()}
              </Text>
            </View>
            <View style={styles.infoChip}>
              <Text style={styles.infoChipText}>{getFormattedLanguages(event.languages)}</Text>
            </View>
            <View style={styles.infoChip}>
              <Text style={styles.infoChipText}>{event.age_group || 'All Ages'}</Text>
            </View>
            <View style={styles.infoChip}>
              <Ionicons name="time-outline" size={12} color="#D8B4E2" />
              <Text style={styles.infoChipText}>{formatDuration(event.duration_hours)}</Text>
            </View>
          </View>
        </View>

        {/* Content Section */}
        <View style={styles.body}>
          <Text style={styles.eventTitle}>{event.name || 'Untitled Event'}</Text>

          {/* Organizer Card */}
          <View style={styles.organizerCard}>
            <View style={styles.avatar}>
              <Ionicons name="person-outline" size={20} color={colors.purple} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.smallCaption}>PRESENTED BY</Text>
              <Text style={styles.organizerName}>{organizerName}</Text>
            </View>
          </View>

          {/* Date, Time & Venue Card */}
          <View style={styles.metaCardContainer}>
            <View style={styles.metaRow}>
              <View style={styles.metaIcon}>
                <Ionicons name="calendar-outline" size={20} color={colors.purple} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.smallCaption}>DATE & TIME</Text>
                <Text style={styles.metaPrimaryText}>{formatEventDate(event.event_date)}</Text>
                <Text style={styles.metaSecondaryText}>
                  {formatTimeString(event.time) || 'Time to be announced'}
                </Text>
              </View>
            </View>

            <View style={styles.innerDivider} />

            <View style={styles.metaRow}>
              <View style={styles.metaIcon}>
                <Ionicons name="location-outline" size={20} color={colors.purple} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.smallCaption}>VENUE</Text>
                <Text style={styles.metaPrimaryText}>{event.city_name || 'Location'}</Text>
                <Text style={styles.metaSecondaryText}>
                  {event.location || 'Venue details to be confirmed'}
                </Text>

                {event.location ? (
                  <TouchableOpacity style={styles.mapsBtn} onPress={openMaps}>
                    <Text style={styles.mapsText}>View on Maps</Text>
                    <Ionicons name="open-outline" size={12} color={colors.purple} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </View>

          {/* About Event */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>About the Event</Text>
            <Text style={styles.descriptionText}>
              {event.description || 'No description provided for this event.'}
            </Text>
          </View>

          {/* Ticket Selection Tiers */}
          {tickets.length > 0 && (
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>Choose Your Ticket</Text>
              <Text style={styles.sectionSub}>Select your preferred ticket category</Text>

              {tickets.map((ticket) => {
                const isSelected = selectedTicket?.id === ticket.id;
                return (
                  <TouchableOpacity
                    key={ticket.id}
                    activeOpacity={0.85}
                    style={[styles.ticketCard, isSelected && styles.ticketCardSelected]}
                    onPress={() => setSelectedTicket(ticket)}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={styles.ticketTitleRow}>
                        <Text style={styles.ticketName}>{ticket.name}</Text>
                        {isSelected && (
                          <Ionicons
                            name="checkmark-circle"
                            size={18}
                            color={colors.purple}
                          />
                        )}
                      </View>
                      {ticket.description ? (
                        <Text style={styles.ticketDesc}>{ticket.description}</Text>
                      ) : null}
                    </View>
                    <Text style={styles.ticketPrice}>
                      ₹{Number(ticket.price).toLocaleString('en-IN')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Instructions & Amenities */}
          {instructions ? (
            <View style={styles.sectionBlock}>
              <View style={styles.sectionTitleRow}>
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color={colors.purple}
                />
                <Text style={styles.sectionTitle}>Instructions & Amenities</Text>
              </View>
              <Text style={styles.descriptionText}>{instructions}</Text>
            </View>
          ) : null}

          {/* Terms & Conditions Trigger Card */}
          <TouchableOpacity
            style={styles.termsActionCard}
            onPress={() => setShowTerms(true)}
            activeOpacity={0.85}
          >
            <View style={styles.termsActionLeft}>
              <Ionicons
                name="shield-checkmark-outline"
                size={22}
                color={colors.purple}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.termsTitle}>Terms & Conditions</Text>
                <Text style={styles.termsSub}>
                  Cancellation policies, venue rules, and entry guidelines
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted || colors.grey} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Floating Bottom Booking Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomPriceBox}>
          <Text style={styles.bottomPriceLabel}>
            {selectedTicket ? selectedTicket.name : 'Starting from'}
          </Text>
          <Text style={styles.bottomPriceValue}>
            {currentPrice > 0 ? `₹${currentPrice.toLocaleString('en-IN')}` : 'Free'}
          </Text>
          {seatsLeft > 0 && seatsLeft <= 20 ? (
            <Text style={styles.limitedSeatsText}>Only {seatsLeft} spots left!</Text>
          ) : null}
        </View>

        <TouchableOpacity
          style={[styles.bookBtn, !isAvailable && styles.bookBtnDisabled]}
          onPress={handleBookTicketsClick}
          disabled={!isAvailable}
          activeOpacity={0.85}
        >
          <Text style={styles.bookBtnText}>
            {isSoldOut
              ? 'Sold Out'
              : isCancelled
              ? 'Cancelled'
              : isCompleted
              ? 'Completed'
              : 'Book Tickets'}
          </Text>
          {isAvailable && <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />}
        </TouchableOpacity>
      </View>

      {/* Terms & Conditions Modal */}
      <TermsModal
        isOpen={showTerms}
        onClose={() => setShowTerms(false)}
      />
    </SafeAreaView>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: colors.surface || '#161124',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    width: '100%',
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },
  list: {
    marginBottom: 16,
  },
  termRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bullet: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.purple,
    marginRight: 8,
    lineHeight: 18,
  },
  termText: {
    flex: 1,
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 19,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    color: colors.grey,
    fontSize: 14,
  },
  errorText: {
    color: colors.red,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 16,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  floatingHeader: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 36 : 10,
    left: 16,
    right: 16,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(11, 11, 16, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(220, 38, 38, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  liveText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  scroll: {
    paddingBottom: 130,
  },
  heroPoster: {
    height: 380,
    width: '100%',
    position: 'relative',
    backgroundColor: colors.surfaceLight,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroChipsRow: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  categoryPill: {
    backgroundColor: colors.purple,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  categoryText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(11, 11, 16, 0.75)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  infoChipText: {
    color: '#E4E4E7',
    fontSize: 10,
    fontWeight: '600',
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  eventTitle: {
    color: colors.white,
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 32,
    marginBottom: 16,
  },
  organizerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallCaption: {
    color: colors.grey,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  organizerName: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  metaCardContainer: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 20,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metaIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  metaPrimaryText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  metaSecondaryText: {
    color: colors.grey,
    fontSize: 12,
    marginTop: 2,
  },
  mapsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  mapsText: {
    color: colors.purple,
    fontSize: 11,
    fontWeight: '700',
  },
  innerDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
    marginLeft: 50,
  },
  sectionBlock: {
    marginBottom: 22,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  sectionTitle: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionSub: {
    color: colors.grey,
    fontSize: 12,
    marginBottom: 10,
  },
  descriptionText: {
    color: '#D4D4D8',
    fontSize: 14,
    lineHeight: 22,
  },
  ticketCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  ticketCardSelected: {
    borderColor: colors.purple,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
  },
  ticketTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ticketName: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  ticketDesc: {
    color: colors.grey,
    fontSize: 12,
    marginTop: 3,
  },
  ticketPrice: {
    color: colors.green,
    fontSize: 16,
    fontWeight: '800',
  },
  termsActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  termsActionLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  termsTitle: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  termsSub: {
    color: colors.textMuted || colors.grey,
    fontSize: 11,
    marginTop: 2,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background || '#111017',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 14,
  },
  bottomPriceBox: {
    flexShrink: 0,
  },
  bottomPriceLabel: {
    color: colors.grey,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bottomPriceValue: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '800',
  },
  limitedSeatsText: {
    color: '#FBBF24',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  bookBtn: {
    flex: 1,
    minHeight: 48,
    backgroundColor: colors.purple,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  bookBtnDisabled: {
    backgroundColor: '#353043',
  },
  bookBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});