import { useState, useMemo, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { api } from '../services/api';
import { type EventWithTickets, type EventTicket } from './EventDetailsScreen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
type Props = {
  route: {
    params?: {
      event?: EventWithTickets & {
        selected_ticket_id?: number | null;
        selected_ticket_name?: string | null;
        selected_ticket_price?: number | null;
        available_capacity?: number;
        event_tickets?: EventTicket[];
        tickets?: EventTicket[];
      };
    };
  };
  navigation: any;
};

const COLORS = {
  background: '#0B0B10',
  surface: '#15151D',
  surfaceLight: '#1E1B29',
  primary: '#8B5CF6',
  primaryLight: '#C4B5FD',
  text: '#FFFFFF',
  muted: '#A1A1AA',
  border: '#292633',
  green: '#4ADE80',
  red: '#F87171',
};

export default function BookingScreen({ route, navigation }: Props) {
  const event = route.params?.event;

  // Tickets state
  const [ticketList, setTicketList] = useState<EventTicket[]>(() => {
    const directList = event?.event_tickets || event?.tickets || [];
    return directList;
  });
  const [loadingTickets, setLoadingTickets] = useState<boolean>(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  // Selected Category
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(
    event?.selected_ticket_id ?? ticketList[0]?.id ?? null
  );

  // Booking states
  const [quantity, setQuantity] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showReviewModal, setShowReviewModal] = useState<boolean>(false);

  // Capacity check
  const capacityLeft = event?.available_capacity ?? 10;

  // Load ticket categories from server if not pre-populated in route
  useEffect(() => {
    if (ticketList.length > 0 || !event?.id) return;

    let isMounted = true;
    const fetchTiers = async () => {
      setLoadingTickets(true);
      try {
        const res = await api.get(`/v1/events/${event.id}/tickets`);
        const responseData = res.data?.data ?? res.data;
        const fetched = Array.isArray(responseData)
          ? responseData
          : Array.isArray(responseData?.tickets)
            ? responseData.tickets
            : [];
        if (isMounted) {
          setTicketList(fetched);
          if (fetched.length > 0) {
            setSelectedTicketId(fetched[0].id);
          }
        }
      } catch (err) {
        console.warn('Could not fetch tickets, using fallback:', err);
        if (isMounted) {
          const fallback = [
            {
              id: event?.selected_ticket_id || 1,
              event_id: Number(event?.id || 1),
              name: event?.selected_ticket_name || 'Standard Pass',
              price: event?.selected_ticket_price || Number(event?.price || 0),
            },
          ];
          setTicketList(fallback);
          setSelectedTicketId(fallback[0].id);
        }
      } finally {
        if (isMounted) setLoadingTickets(false);
      }
    };

    void fetchTiers();
    return () => {
      isMounted = false;
    };
  }, [
    event?.id,
    event?.price,
    event?.selected_ticket_id,
    event?.selected_ticket_name,
    event?.selected_ticket_price,
    ticketList.length,
  ]);

  const activeTicket = useMemo(() => {
    return ticketList.find((t) => t.id === selectedTicketId) || ticketList[0];
  }, [ticketList, selectedTicketId]);

  // Billing breakdown
  const ticketUnitPrice = Number(activeTicket?.price ?? 0);
  const totalAmount = ticketUnitPrice * quantity;
  const maxAllowedTickets = Math.min(10, Math.max(0, capacityLeft));

  const handleIncrement = () => {
    if (quantity < maxAllowedTickets) {
      setQuantity((prev) => prev + 1);
    } else {
      Alert.alert('Max Limit', `You can reserve up to ${maxAllowedTickets} passes.`);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity((prev) => prev - 1);
    }
  };

  const handleInitiatePay = () => {
    if (!activeTicket) {
      Alert.alert('Selection Missing', 'Please select a ticket category first.');
      return;
    }
    if (capacityLeft <= 0) {
      Alert.alert('Sold Out', 'Tickets are completely sold out for this event.');
      return;
    }
    setShowReviewModal(true);
  };

  const handleConfirmBooking = async () => {
    if (!event || !activeTicket) return;

    try {
      setIsSubmitting(true);

      const bookingPayload = {
        pass_id: Number(event.id),
        event_ticket_id: activeTicket.id,
        number_of_tickets: quantity,
        total_amount: totalAmount,
        booking_date: new Date().toISOString().split('T')[0],
        status: 'CONFIRMED',
      };

      await api.post('/v1/bookings', bookingPayload);

      setShowReviewModal(false);
      Alert.alert(
        'Booking Confirmed!',
        `Your pass for "${event.name || 'Event'}" has been secured successfully.`,
        [
          {
            text: 'View in Profile',
            onPress: () => navigation.navigate('Profile'),
          },
        ]
      );
    } catch (err: any) {
      console.error('Payment/Booking error:', err);
      setShowReviewModal(false);
      Alert.alert(
        'Booking Failed',
        err?.response?.data?.message || 'Unable to complete your booking. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Top Header */}
      <SafeAreaProvider style={styles.headerSafeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Book Pass</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaProvider>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 1. Event Name, Date, and Time */}
        <View style={styles.eventCard}>
          <Text style={styles.eventBadge}>EVENT DETAILS</Text>
          <Text style={styles.eventName}>{event?.name || 'Untitled Event'}</Text>

          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={17} color={COLORS.primaryLight} />
            <Text style={styles.metaText}>
              {event?.event_date || 'Date TBA'} {event?.time ? `• ${event.time}` : ''}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={17} color={COLORS.primaryLight} />
            <Text style={styles.metaText} numberOfLines={1}>
              {event?.city_name ? `${event.city_name} — ` : ''}
              {event?.location || 'Venue TBA'}
            </Text>
          </View>
        </View>

        {/* 2. Ticket Category (Custom Dropdown matching Web) */}
        <Text style={styles.sectionHeading}>Ticket Category</Text>
        <View style={styles.dropdownContainer}>
          <TouchableOpacity
            style={[styles.dropdownTrigger, isDropdownOpen && styles.dropdownTriggerActive]}
            onPress={() => setIsDropdownOpen((prev) => !prev)}
            disabled={loadingTickets || ticketList.length === 0}
            activeOpacity={0.85}
          >
            {loadingTickets ? (
              <Text style={styles.placeholderText}>Loading ticket tiers...</Text>
            ) : activeTicket ? (
              <View style={styles.selectedTierRow}>
                <Text style={styles.selectedTierName}>{activeTicket.name}</Text>
                <Text style={styles.selectedTierPrice}>
                  ₹{Number(activeTicket.price).toLocaleString('en-IN')}
                </Text>
              </View>
            ) : (
              <Text style={styles.placeholderText}>Select Category</Text>
            )}

            <Ionicons
              name={isDropdownOpen ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={COLORS.muted}
            />
          </TouchableOpacity>

          {isDropdownOpen && (
            <View style={styles.dropdownMenu}>
              {ticketList.map((tier) => {
                const isSelected = activeTicket?.id === tier.id;
                return (
                  <TouchableOpacity
                    key={tier.id}
                    style={[styles.dropdownItem, isSelected && styles.dropdownItemSelected]}
                    onPress={() => {
                      setSelectedTicketId(tier.id);
                      setIsDropdownOpen(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.dropdownItemName}>{tier.name}</Text>
                      {tier.description ? (
                        <Text style={styles.dropdownItemDesc}>{tier.description}</Text>
                      ) : null}
                    </View>

                    <Text style={styles.dropdownItemPrice}>
                      ₹{Number(tier.price).toLocaleString('en-IN')}
                    </Text>

                    {isSelected && (
                      <Ionicons
                        name="checkmark"
                        size={18}
                        color={COLORS.primary}
                        style={{ marginLeft: 8 }}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {activeTicket?.description && !isDropdownOpen && (
            <Text style={styles.tierDescriptionText}>{activeTicket.description}</Text>
          )}
        </View>

        {/* 3. Ticket Quantity Counter */}
        <Text style={styles.sectionHeading}>Quantity</Text>
        <View style={styles.quantityCard}>
          <View>
            <Text style={styles.quantityTitle}>Number of Passes</Text>
            <Text style={styles.quantitySub}>
              ₹{ticketUnitPrice.toLocaleString('en-IN')} / pass
            </Text>
          </View>

          <View style={styles.stepperContainer}>
            <TouchableOpacity
              style={[styles.stepBtn, quantity <= 1 && styles.stepBtnDisabled]}
              onPress={handleDecrement}
              disabled={quantity <= 1 || capacityLeft <= 0}
              activeOpacity={0.7}
            >
              <Ionicons name="remove" size={18} color={COLORS.text} />
            </TouchableOpacity>

            <Text style={styles.quantityText}>{quantity}</Text>

            <TouchableOpacity
              style={[
                styles.stepBtn,
                (quantity >= maxAllowedTickets || capacityLeft <= 0) && styles.stepBtnDisabled,
              ]}
              onPress={handleIncrement}
              disabled={quantity >= maxAllowedTickets || capacityLeft <= 0}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={18} color={COLORS.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Price Breakdown */}
        <Text style={styles.sectionHeading}>Price Breakdown</Text>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              {activeTicket?.name ?? 'Ticket'} (×{quantity})
            </Text>
            <Text style={styles.summaryVal}>₹{totalAmount.toLocaleString('en-IN')}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Convenience Fee</Text>
            <Text style={styles.freeTag}>FREE</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total Payable</Text>
            <Text style={styles.totalVal}>₹{totalAmount.toLocaleString('en-IN')}</Text>
          </View>
        </View>
      </ScrollView>

      {/* 4. Pay Action Bar */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.bottomLabel}>TOTAL</Text>
          <Text style={styles.bottomPrice}>₹{totalAmount.toLocaleString('en-IN')}</Text>
        </View>

        <TouchableOpacity
          style={[styles.payBtn, (capacityLeft <= 0 || !activeTicket) && styles.payBtnDisabled]}
          onPress={handleInitiatePay}
          disabled={capacityLeft <= 0 || !activeTicket || isSubmitting}
          activeOpacity={0.85}
        >
          <Text style={styles.payBtnText}>
            {capacityLeft <= 0 ? 'Sold Out' : `Pay ₹${totalAmount.toLocaleString('en-IN')}`}
          </Text>
          <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Review Modal */}
      <Modal
        visible={showReviewModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReviewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconBox}>
              <Ionicons name="help-circle-outline" size={36} color={COLORS.primary} />
            </View>

            <Text style={styles.modalTitle}>Confirm Your Booking</Text>
            <Text style={styles.modalSubtitle}>Please review your reservation details below.</Text>

            <View style={styles.modalDetailsList}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Event:</Text>
                <Text style={styles.detailValue}>{event?.name}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Category:</Text>
                <Text style={[styles.detailValue, { color: COLORS.primaryLight }]}>
                  {activeTicket?.name}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Passes:</Text>
                <Text style={styles.detailValue}>
                  {quantity} Pass{quantity > 1 ? 'es' : ''}
                </Text>
              </View>

              <View style={[styles.detailRow, styles.detailRowTotal]}>
                <Text style={styles.detailLabelBold}>Total Amount:</Text>
                <Text style={styles.detailValBold}>₹{totalAmount.toLocaleString('en-IN')}</Text>
              </View>
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowReviewModal(false)}
                disabled={isSubmitting}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleConfirmBooking}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmText}>Confirm & Pay</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerSafeArea: {
    backgroundColor: COLORS.surface,
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 36 : 8,
    paddingHorizontal: 16,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  eventCard: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  eventBadge: {
    color: COLORS.primaryLight,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 6,
  },
  eventName: {
    color: COLORS.text,
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  metaText: {
    color: COLORS.muted,
    fontSize: 13,
    flex: 1,
  },
  sectionHeading: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  dropdownContainer: {
    marginBottom: 20,
  },
  dropdownTrigger: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownTriggerActive: {
    borderColor: COLORS.primary,
  },
  selectedTierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedTierName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  selectedTierPrice: {
    color: COLORS.primaryLight,
    fontSize: 15,
    fontWeight: '700',
  },
  placeholderText: {
    color: COLORS.muted,
    fontSize: 14,
  },
  dropdownMenu: {
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    marginTop: 8,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dropdownItemSelected: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  dropdownItemName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  dropdownItemDesc: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 2,
  },
  dropdownItemPrice: {
    color: COLORS.green,
    fontSize: 14,
    fontWeight: '700',
  },
  tierDescriptionText: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  quantityCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  quantityTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  quantitySub: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 2,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBtnDisabled: {
    opacity: 0.35,
  },
  quantityText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
    minWidth: 20,
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    color: COLORS.muted,
    fontSize: 13,
  },
  summaryVal: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },
  freeTag: {
    color: COLORS.green,
    fontSize: 12,
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  totalLabel: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
  },
  totalVal: {
    color: COLORS.green,
    fontSize: 18,
    fontWeight: '900',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#111017',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomLabel: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  bottomPrice: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '900',
  },
  payBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 14,
  },
  payBtnDisabled: {
    opacity: 0.5,
  },
  payBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalIconBox: {
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  modalSubtitle: {
    color: COLORS.muted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  modalDetailsList: {
    backgroundColor: COLORS.surfaceLight,
    padding: 14,
    borderRadius: 12,
    gap: 8,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailRowTotal: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
    marginTop: 4,
  },
  detailLabel: {
    color: COLORS.muted,
    fontSize: 13,
  },
  detailValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  detailLabelBold: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800',
  },
  detailValBold: {
    color: COLORS.green,
    fontSize: 16,
    fontWeight: '900',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: COLORS.surfaceLight,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    color: COLORS.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  modalConfirmBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});