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
import { COLORS } from '../../constants/Color';
import Ionicons from '@react-native-vector-icons/ionicons';
import { api } from '../../services/api';
import { type EventWithTickets, type EventTicket } from '../EventDetailsScreen';
import { SafeAreaView } from 'react-native-safe-area-context';

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

const colors = COLORS;

export default function BookingScreen({ route, navigation }: Props) {
  const event = route.params?.event;

  const [ticketList, setTicketList] = useState<EventTicket[]>(() => {
    return event?.event_tickets || event?.tickets || [];
  });
  const [loadingTickets, setLoadingTickets] = useState<boolean>(false);

  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(
    event?.selected_ticket_id ?? ticketList[0]?.id ?? null
  );

  const [quantity, setQuantity] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showReviewModal, setShowReviewModal] = useState<boolean>(false);

  const capacityLeft = event?.available_capacity ?? 10;

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

      {/* Fixed SafeArea Header */}
      <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={20} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 1. Event Summary Card */}
        <View style={styles.eventCard}>
          <View style={styles.eventHeaderRow}>
            <View style={styles.eventBadgePill}>
              <Ionicons name="sparkles" size={11} color={colors.primaryLight} />
              <Text style={styles.eventBadge}>EVENT TICKET</Text>
            </View>

            {capacityLeft > 0 && capacityLeft <= 5 && (
              <View style={styles.urgencyBadge}>
                <Text style={styles.urgencyText}>Only {capacityLeft} left</Text>
              </View>
            )}
          </View>

          <Text style={styles.eventName}>{event?.name || 'Untitled Event'}</Text>

          <View style={styles.metaDivider} />

          <View style={styles.metaRow}>
            <View style={styles.metaIconBox}>
              <Ionicons name="calendar-outline" size={15} color={colors.primaryLight} />
            </View>
            <Text style={styles.metaText}>
              {event?.event_date || 'Date TBA'} {event?.time ? `• ${event.time}` : ''}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaIconBox}>
              <Ionicons name="location-outline" size={15} color={colors.primaryLight} />
            </View>
            <Text style={styles.metaText} numberOfLines={1}>
              {event?.city_name ? `${event.city_name} — ` : ''}
              {event?.location || 'Venue TBA'}
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>Select Ticket Category</Text>
        </View>

        {loadingTickets ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={colors.purple} />
            <Text style={styles.placeholderText}>Loading ticket tiers...</Text>
          </View>
        ) : (
          <View style={styles.tierListContainer}>
            {ticketList.map((tier) => {
              const isSelected = activeTicket?.id === tier.id;
              return (
                <TouchableOpacity
                  key={tier.id}
                  style={[styles.tierCard, isSelected && styles.tierCardSelected]}
                  onPress={() => setSelectedTicketId(tier.id)}
                  activeOpacity={0.85}
                >
                  <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                    {isSelected && <View style={styles.radioInner} />}
                  </View>

                  <View style={styles.tierInfo}>
                    <Text style={styles.tierName}>{tier.name}</Text>
                    {tier.description ? (
                      <Text style={styles.tierDesc} numberOfLines={2}>
                        {tier.description}
                      </Text>
                    ) : null}
                  </View>

                  <View style={styles.tierPriceBox}>
                    <Text style={[styles.tierPrice, isSelected && styles.tierPriceSelected]}>
                      ₹{Number(tier.price).toLocaleString('en-IN')}
                    </Text>
                    <Text style={styles.tierPerLabel}>/ ticket</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* 3. Quantity Stepper */}
        <Text style={styles.sectionHeading}>Quantity</Text>
        <View style={styles.quantityCard}>
          <View>
            <Text style={styles.quantityTitle}>Number of Passes</Text>
            <Text style={styles.quantitySub}>
              Max {maxAllowedTickets} per booking
            </Text>
          </View>

          <View style={styles.stepperContainer}>
            <TouchableOpacity
              style={[styles.stepBtn, quantity <= 1 && styles.stepBtnDisabled]}
              onPress={handleDecrement}
              disabled={quantity <= 1 || capacityLeft <= 0}
              activeOpacity={0.7}
            >
              <Ionicons name="remove" size={18} color={colors.white} />
            </TouchableOpacity>

            <Text style={styles.quantityText}>{quantity}</Text>

            <TouchableOpacity
              style={[
                styles.stepBtn,
                styles.stepBtnPrimary,
                (quantity >= maxAllowedTickets || capacityLeft <= 0) && styles.stepBtnDisabled,
              ]}
              onPress={handleIncrement}
              disabled={quantity >= maxAllowedTickets || capacityLeft <= 0}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={18} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 4. Ticket-Stub Style Price Breakdown */}
        <Text style={styles.sectionHeading}>Bill Summary</Text>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              {activeTicket?.name ?? 'Ticket'} × {quantity}
            </Text>
            <Text style={styles.summaryVal}>₹{totalAmount.toLocaleString('en-IN')}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Platform & Convenience Fee</Text>
            <View style={styles.freeBadge}>
              <Text style={styles.freeTag}>FREE</Text>
            </View>
          </View>

          <View style={styles.dashedDivider} />

          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total Payable</Text>
            <Text style={styles.totalVal}>₹{totalAmount.toLocaleString('en-IN')}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Sticky Checkout Bar */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.bottomLabel}>
            {quantity} {quantity > 1 ? 'PASSES' : 'PASS'} • TOTAL
          </Text>
          <Text style={styles.bottomPrice}>₹{totalAmount.toLocaleString('en-IN')}</Text>
        </View>

        <TouchableOpacity
          style={[styles.payBtn, (capacityLeft <= 0 || !activeTicket) && styles.payBtnDisabled]}
          onPress={handleInitiatePay}
          disabled={capacityLeft <= 0 || !activeTicket || isSubmitting}
          activeOpacity={0.85}
        >
          <Text style={styles.payBtnText}>
            {capacityLeft <= 0 ? 'Sold Out' : 'Proceed to Pay'}
          </Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Bottom Sheet Confirmation Modal */}
      <Modal
        visible={showReviewModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReviewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirm Your Booking</Text>
              <Text style={styles.modalSubtitle}>Review your ticket details before confirming</Text>
            </View>

            <View style={styles.modalDetailsList}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Event</Text>
                <Text style={styles.detailValue} numberOfLines={1}>
                  {event?.name}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Category</Text>
                <Text style={[styles.detailValue, { color: colors.primaryLight }]}>
                  {activeTicket?.name}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Quantity</Text>
                <Text style={styles.detailValue}>
                  {quantity} Pass{quantity > 1 ? 'es' : ''}
                </Text>
              </View>

              <View style={[styles.detailRow, styles.detailRowTotal]}>
                <Text style={styles.detailLabelBold}>Amount to Pay</Text>
                <Text style={styles.detailValBold}>₹{totalAmount.toLocaleString('en-IN')}</Text>
              </View>
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowReviewModal(false)}
                disabled={isSubmitting}
              >
                <Text style={styles.modalCancelText}>Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleConfirmBooking}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmText}>
                    Confirm ₹{totalAmount.toLocaleString('en-IN')}
                  </Text>
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
    backgroundColor: colors.background,
  },
  headerSafeArea: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  eventCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 22,
  },
  eventHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(139, 92, 246, 0.14)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  eventBadge: {
    color: colors.primaryLight,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  urgencyBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  urgencyText: {
    color: '#FBBF24',
    fontSize: 11,
    fontWeight: '700',
  },
  eventName: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
  },
  metaDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  metaIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metaText: {
    color: colors.grey,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionHeading: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  sectionSubText: {
    color: colors.grey,
    fontSize: 12,
    marginBottom: 10,
  },
  loadingBox: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 22,
  },
  placeholderText: {
    color: colors.grey,
    fontSize: 13,
  },
  tierListContainer: {
    gap: 10,
    marginBottom: 22,
  },
  tierCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  tierCardSelected: {
    borderColor: colors.purple,
    backgroundColor: 'rgba(139, 92, 246, 0.10)',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.grey,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: colors.purple,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.purple,
  },
  tierInfo: {
    flex: 1,
  },
  tierName: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  tierDesc: {
    color: colors.grey,
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16,
  },
  tierPriceBox: {
    alignItems: 'flex-end',
  },
  tierPrice: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
  tierPriceSelected: {
    color: colors.green,
  },
  tierPerLabel: {
    color: colors.grey,
    fontSize: 10,
  },
  quantityCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 22,
  },
  quantityTitle: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  quantitySub: {
    color: colors.grey,
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
    borderRadius: 12,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBtnPrimary: {
    backgroundColor: colors.purple,
    borderColor: colors.purple,
  },
  stepBtnDisabled: {
    opacity: 0.35,
  },
  quantityText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '800',
    minWidth: 22,
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    color: colors.grey,
    fontSize: 13,
  },
  summaryVal: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  freeBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  freeTag: {
    color: colors.green,
    fontSize: 11,
    fontWeight: '800',
  },
  dashedDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    borderStyle: 'dashed',
    marginVertical: 2,
  },
  totalLabel: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
  },
  totalVal: {
    color: colors.green,
    fontSize: 19,
    fontWeight: '900',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomLabel: {
    color: colors.grey,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  bottomPrice: {
    color: colors.white,
    fontSize: 22,
    fontWeight: '900',
    marginTop: 1,
  },
  payBtn: {
    backgroundColor: colors.purple,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 14,
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
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 18,
  },
  modalIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    color: colors.white,
    fontSize: 19,
    fontWeight: '800',
  },
  modalSubtitle: {
    color: colors.grey,
    fontSize: 12,
    marginTop: 4,
  },
  modalDetailsList: {
    backgroundColor: colors.surfaceLight,
    padding: 16,
    borderRadius: 16,
    gap: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailRowTotal: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    borderStyle: 'dashed',
    paddingTop: 12,
    marginTop: 4,
  },
  detailLabel: {
    color: colors.grey,
    fontSize: 13,
  },
  detailValue: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
    maxWidth: '65%',
  },
  detailLabelBold: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
  },
  detailValBold: {
    color: colors.green,
    fontSize: 18,
    fontWeight: '900',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalCancelText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  modalConfirmBtn: {
    flex: 2,
    backgroundColor: colors.purple,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});