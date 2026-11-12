import React, { useState, useEffect, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  Image,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { COLORS } from '../../constants/Color';

const colors = COLORS;

const formatBookingDate = (dateStr?: string) => {
  if (!dateStr) return 'Recent';
  const clean = dateStr.includes('T')
    ? dateStr.split('T')[0]
    : dateStr.split(' ')[0];
  const parts = clean.split('-');
  if (parts.length === 3) {
    const d = new Date(
      Number(parts[0]),
      Number(parts[1]) - 1,
      Number(parts[2]),
    );
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
  }
  return dateStr;
};

export default function MyBookingsScreen({ navigation }: any) {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Cancellation state
  const [bookingToCancel, setBookingToCancel] = useState<any | null>(null);
  const [cancellingId, setCancellingId] = useState<number | string | null>(null);

  // Digital pass modal state
  const [selectedPass, setSelectedPass] = useState<any | null>(null);

  const fetchBookings = useCallback(async () => {
    try {
      const res = await api.get('/v1/bookings', {
        withCredentials: true,
        headers: { 'x-client-type': 'mobile' },
      });

      const list =
        res.data?.bookings ||
        res.data?.booking ||
        res.data?.data?.bookings ||
        res.data?.data ||
        (Array.isArray(res.data) ? res.data : []);

      setBookings(Array.isArray(list) ? list : [list]);
    } catch (err: any) {
      console.error('Bookings fetch error:', err?.response?.data || err.message);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBookings();
    setRefreshing(false);
  };

  const handleConfirmCancel = async () => {
    if (!bookingToCancel) return;

    const bookingId =
      bookingToCancel.id || bookingToCancel.booking_id || bookingToCancel._id;

    if (!bookingId) {
      Alert.alert('Error', 'Invalid booking reference.');
      setBookingToCancel(null);
      return;
    }

    try {
      setCancellingId(bookingId);

      await api.patch(`/v1/bookings/${bookingId}`, {
        withCredentials: true,
        headers: { 'x-client-type': 'mobile' },
      });

      setBookings((prev) =>
        prev.map((item) => {
          const itemId = item.id || item.booking_id || item._id;
          return itemId === bookingId
            ? { ...item, status: 'CANCELLED' }
            : item;
        }),
      );

      setBookingToCancel(null);
      Alert.alert(
        'Booking Cancelled',
        'Your ticket booking has been cancelled.',
      );
    } catch (err: any) {
      console.error('Cancel booking error:', err?.response?.data || err.message);
      const msg =
        err?.response?.data?.message ||
        'Unable to cancel booking right now. Please try again.';
      Alert.alert('Cancellation Failed', msg);
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.primaryLight} />
        <Text style={styles.loadingText}>Loading your passes...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />

      {/* Screen Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Bookings</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primaryLight}
          />
        }
      >
        {bookings.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="ticket-outline" size={54} color={colors.grey} />
            <Text style={styles.emptyTitle}>No Passes Booked Yet</Text>
            <Text style={styles.emptySub}>
              Explore upcoming concerts, exhibitions, and events across your city.
            </Text>
            <TouchableOpacity
              style={styles.browseBtn}
              onPress={() => navigation.navigate('Events')}
              activeOpacity={0.85}
            >
              <Text style={styles.browseBtnText}>Explore Events</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.bookingsContainer}>
            {bookings.map((booking: any, index: number) => {
              const bookingId =
                booking.id || booking.booking_id || booking._id || index;
              const isCancelled =
                String(booking.status || '').toUpperCase() === 'CANCELLED';
              const isThisCancelling = cancellingId === bookingId;

              const posterUrl =
                booking.image;

              const eventTitle =
                booking.event_title ||
                'CityPass Event';

              const venue =
                booking.venue ||
                'Venue details on ticket';

              const ticketCount =
                booking.number_of_tickets;
              const totalAmount = Number(
                booking.total_amount || booking.price || 0,
              );

              return (
                <View key={bookingId} style={styles.bookingCard}>
                  {/* Poster & Header */}
                  <View style={styles.cardHeader}>
                    {posterUrl ? (
                      <Image source={{ uri: posterUrl }} style={styles.poster} />
                    ) : (
                      <View style={styles.posterPlaceholder}>
                        <Ionicons
                          name="ticket-outline"
                          size={24}
                          color={colors.grey}
                        />
                      </View>
                    )}

                    <View style={styles.headerInfo}>
                      <View style={styles.badgeRow}>
                        <View
                          style={[
                            styles.statusBadge,
                            isCancelled
                              ? styles.statusCancelled
                              : styles.statusConfirmed,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusBadgeText,
                              isCancelled
                                ? styles.textCancelled
                                : styles.textConfirmed,
                            ]}
                          >
                            {booking.status || 'CONFIRMED'}
                          </Text>
                        </View>

                        {booking.city_name ? (
                          <View style={styles.cityPill}>
                            <Text style={styles.cityPillText}>
                              {String(booking.city_name).toUpperCase()}
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      <Text style={styles.eventTitle} numberOfLines={2}>
                        {eventTitle}
                      </Text>
                    </View>
                  </View>

                  {/* Booking Details */}
                  <View style={styles.cardBody}>
                    <View style={styles.metaRow}>
                      <Ionicons
                        name="location-outline"
                        size={15}
                        color={colors.primaryLight}
                      />
                      <Text style={styles.metaText} numberOfLines={1}>
                        {venue}
                      </Text>
                    </View>

                    <View style={styles.metaRow}>
                      <Ionicons
                        name="calendar-outline"
                        size={15}
                        color={colors.grey}
                      />
                      <Text style={styles.metaSubText}>
                        Booked on:{' '}
                        {formatBookingDate(
                          booking.booking_date || booking.created_at,
                        )}
                      </Text>
                    </View>

                    {/* Capsule summary */}
                    <View style={styles.infoCapsule}>
                      <View style={styles.capsuleItem}>
                        <Text style={styles.capsuleLabel}>TICKET TYPE</Text>
                        <Text style={styles.capsuleValue} numberOfLines={1}>
                          {booking.ticket_name || 'Standard Pass'}
                        </Text>
                      </View>

                      <View style={styles.capsuleDivider} />

                      <View style={styles.capsuleItem}>
                        <Text style={styles.capsuleLabel}>TICKETS</Text>
                        <Text style={styles.capsuleValue}>
                          {ticketCount} {ticketCount > 1 ? 'Passes' : 'Pass'}
                        </Text>
                      </View>

                      <View style={styles.capsuleDivider} />

                      <View style={styles.capsuleItem}>
                        <Text style={styles.capsuleLabel}>AMOUNT</Text>
                        <Text style={styles.capsulePrice}>
                          ₹{totalAmount.toLocaleString('en-IN')}
                        </Text>
                      </View>
                    </View>

                    {/* Actions */}
                    <View style={styles.actionsRow}>
                      <TouchableOpacity
                        style={[
                          styles.cancelBtn,
                          isCancelled && styles.cancelBtnDisabled,
                        ]}
                        activeOpacity={0.8}
                        disabled={isCancelled || isThisCancelling}
                        onPress={() => setBookingToCancel(booking)}
                      >
                        {isThisCancelling ? (
                          <ActivityIndicator size="small" color={colors.red} />
                        ) : (
                          <>
                            <Ionicons
                              name="ban-outline"
                              size={14}
                              color={isCancelled ? colors.grey : colors.red}
                            />
                            <Text
                              style={[
                                styles.cancelBtnText,
                                isCancelled && styles.cancelBtnTextDisabled,
                              ]}
                            >
                              {isCancelled ? 'Cancelled' : 'Cancel Booking'}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.viewPassBtn}
                        activeOpacity={0.8}
                        onPress={() => setSelectedPass(booking)}
                      >
                        <Ionicons name="eye-outline" size={14} color="#FFFFFF" />
                        <Text style={styles.viewPassBtnText}>View Pass</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* CANCEL CONFIRMATION MODAL */}
      <Modal
        visible={Boolean(bookingToCancel)}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!cancellingId) setBookingToCancel(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalWarningIcon}>
              <Ionicons name="alert-circle" size={34} color={colors.red} />
            </View>
            <Text style={styles.modalTitle}>Cancel Selected Tickets?</Text>
            <Text style={styles.modalSubtitle}>
              Are you sure you want to cancel{' '}
              <Text style={{ color: colors.white, fontWeight: '700' }}>
                {bookingToCancel?.number_of_tickets || 1}x{' '}
                {bookingToCancel?.ticket_name || 'Standard Pass'}
              </Text>{' '}
              for{' '}
              <Text style={{ color: colors.white, fontWeight: '700' }}>
                {bookingToCancel?.event_title ||
                  bookingToCancel?.name ||
                  'this event'}
              </Text>
              ? This action cannot be undone.
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalSecondaryBtn}
                disabled={Boolean(cancellingId)}
                onPress={() => setBookingToCancel(null)}
              >
                <Text style={styles.modalSecondaryText}>Keep Tickets</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalDangerBtn}
                disabled={Boolean(cancellingId)}
                onPress={handleConfirmCancel}
              >
                {cancellingId ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalDangerText}>Yes, Cancel</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* IMPROVISED DIGITAL TICKET PASS MODAL */}
      <Modal
        visible={Boolean(selectedPass)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedPass(null)}
      >
        <View style={styles.ticketModalOverlay}>
          <View style={styles.ticketWrapper}>
            {/* Top Close Bar */}
            <View style={styles.ticketTopBar}>
              <View style={styles.ticketTopBrand}>
                <Ionicons
                  name="sparkles"
                  size={16}
                  color={colors.primaryLight}
                />
                <Text style={styles.ticketBrandText}>CITYPASS E-TICKET</Text>
              </View>
              <TouchableOpacity
                style={styles.ticketCloseBtn}
                onPress={() => setSelectedPass(null)}
              >
                <Ionicons name="close" size={20} color={colors.white} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 12 }}
            >
              <View style={styles.ticketCard}>
                {/* 1. Event Poster Header */}
                <View style={styles.ticketBannerContainer}>
                  {selectedPass?.image_url ||
                  selectedPass?.poster_url ||
                  selectedPass?.banner_image ||
                  selectedPass?.image ? (
                    <Image
                      source={{
                        uri:
                          selectedPass.image_url ||
                          selectedPass.poster_url ||
                          selectedPass.banner_image ||
                          selectedPass.image,
                      }}
                      style={styles.ticketBannerImage}
                    />
                  ) : (
                    <View style={styles.ticketBannerFallback}>
                      <Ionicons
                        name="ticket"
                        size={42}
                        color={colors.primaryLight}
                      />
                    </View>
                  )}

                  {/* Floating Status & Category Badges */}
                  <View style={styles.ticketBannerOverlay}>
                    <View
                      style={[
                        styles.ticketStatusChip,
                        String(selectedPass?.status).toUpperCase() ===
                        'CANCELLED'
                          ? { backgroundColor: 'rgba(248, 113, 113, 0.92)' }
                          : { backgroundColor: 'rgba(16, 185, 129, 0.92)' },
                      ]}
                    >
                      <Text style={styles.ticketStatusChipText}>
                        {String(
                          selectedPass?.status || 'CONFIRMED',
                        ).toUpperCase()}
                      </Text>
                    </View>

                    {selectedPass?.category_name ? (
                      <View style={styles.ticketCategoryChip}>
                        <Text style={styles.ticketCategoryChipText}>
                          {selectedPass.category_name}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                {/* 2. Event Title & Organizer */}
                <View style={styles.ticketMainBody}>
                  <Text style={styles.ticketEventTitle}>
                    {selectedPass?.event_title ||
                      selectedPass?.event?.title ||
                      selectedPass?.name ||
                      'CityPass Event'}
                  </Text>

                  {selectedPass?.organizer_name ? (
                    <Text style={styles.ticketOrganizerText}>
                      Hosted by {selectedPass.organizer_name}
                    </Text>
                  ) : null}

                  {/* 3. Event Date, Time & Venue Grid */}
                  <View style={styles.ticketMetaGrid}>
                    <View style={styles.ticketMetaBlock}>
                      <View style={styles.ticketMetaIconBox}>
                        <Ionicons
                          name="calendar-outline"
                          size={16}
                          color={colors.primaryLight}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.ticketMetaLabel}>EVENT DATE</Text>
                        <Text style={styles.ticketMetaValue}>
                          {formatBookingDate(
                            selectedPass?.event_date ||
                              selectedPass?.event?.event_date ||
                              selectedPass?.booking_date,
                          )}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.ticketMetaBlock}>
                      <View style={styles.ticketMetaIconBox}>
                        <Ionicons
                          name="time-outline"
                          size={16}
                          color={colors.primaryLight}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.ticketMetaLabel}>TIME / ENTRY</Text>
                        <Text style={styles.ticketMetaValue}>
                          {selectedPass?.event_time ||
                            selectedPass?.start_time ||
                            'Gates Open 1 Hr Prior'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.ticketVenueBox}>
                    <View style={styles.ticketMetaIconBox}>
                      <Ionicons
                        name="location-outline"
                        size={16}
                        color={colors.primaryLight}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.ticketMetaLabel}>VENUE & CITY</Text>
                      <Text style={styles.ticketMetaValue}>
                        {[
                          selectedPass?.venue ||
                            selectedPass?.location ||
                            selectedPass?.event?.location,
                          selectedPass?.city_name,
                        ]
                          .filter(Boolean)
                          .join(', ') || 'Venue details confirmed'}
                      </Text>
                    </View>
                  </View>

                  {/* 4. Pass Tier, Quantity, Booked Date & Amount Details */}
                  <View style={styles.ticketSpecsBox}>
                    <View style={styles.ticketSpecRow}>
                      <View style={styles.ticketSpecCol}>
                        <Text style={styles.ticketSpecLabel}>TICKET TIER</Text>
                        <Text
                          style={[
                            styles.ticketSpecValue,
                            { color: colors.primaryLight },
                          ]}
                        >
                          {selectedPass?.ticket_name || 'Standard Pass'}
                        </Text>
                      </View>

                      <View style={styles.ticketSpecColRight}>
                        <Text style={styles.ticketSpecLabel}>ADMITS</Text>
                        <Text style={styles.ticketSpecValue}>
                          {selectedPass?.number_of_tickets ||
                            selectedPass?.quantity ||
                            1}{' '}
                          {(selectedPass?.number_of_tickets || 1) > 1
                            ? 'Guests'
                            : 'Guest'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.ticketSpecDivider} />

                    <View style={styles.ticketSpecRow}>
                      <View style={styles.ticketSpecCol}>
                        <Text style={styles.ticketSpecLabel}>BOOKED ON</Text>
                        <Text style={styles.ticketSpecValue}>
                          {formatBookingDate(
                            selectedPass?.booking_date ||
                              selectedPass?.created_at,
                          )}
                        </Text>
                      </View>

                      <View style={styles.ticketSpecColRight}>
                        <Text style={styles.ticketSpecLabel}>TOTAL PAID</Text>
                        <Text
                          style={[
                            styles.ticketSpecValue,
                            { color: colors.green, fontSize: 15 },
                          ]}
                        >
                          ₹
                          {Number(
                            selectedPass?.total_amount ||
                              selectedPass?.price ||
                              0,
                          ).toLocaleString('en-IN')}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.perforationRow}>
                  <View style={styles.dashedLine} />
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: colors.grey,
    fontSize: 14,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  bookingsContainer: {
    gap: 14,
  },
  bookingCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 12,
    marginBottom: 10,
  },
  poster: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: colors.surfaceLight,
  },
  posterPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusConfirmed: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
  },
  statusCancelled: {
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  textConfirmed: {
    color: colors.green,
  },
  textCancelled: {
    color: colors.red,
  },
  cityPill: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cityPillText: {
    color: colors.grey,
    fontSize: 9,
    fontWeight: '700',
  },
  eventTitle: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  cardBody: {
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '500',
  },
  metaSubText: {
    color: colors.grey,
    fontSize: 11,
  },
  infoCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginVertical: 4,
  },
  capsuleItem: {
    flex: 1,
  },
  capsuleDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
    marginHorizontal: 8,
  },
  capsuleLabel: {
    color: colors.grey,
    fontSize: 9,
    fontWeight: '700',
    marginBottom: 2,
  },
  capsuleValue: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  capsulePrice: {
    color: colors.green,
    fontSize: 13,
    fontWeight: '800',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  cancelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.3)',
  },
  cancelBtnDisabled: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    opacity: 0.6,
  },
  cancelBtnText: {
    color: colors.red,
    fontSize: 12,
    fontWeight: '700',
  },
  cancelBtnTextDisabled: {
    color: colors.grey,
  },
  viewPassBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: colors.purple,
  },
  viewPassBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyBox: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 32,
    alignItems: 'center',
    marginTop: 40,
  },
  emptyTitle: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 6,
  },
  emptySub: {
    color: colors.grey,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  browseBtn: {
    backgroundColor: colors.purple,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 12,
  },
  browseBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    alignItems: 'center',
  },
  modalWarningIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(248, 113, 113, 0.14)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    color: colors.grey,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  modalSecondaryBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalSecondaryText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
  modalDangerBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: colors.red,
    alignItems: 'center',
  },
  modalDangerText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  ticketModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(7, 6, 14, 0.88)',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 32,
  },
  ticketWrapper: {
    width: '100%',
    maxHeight: '92%',
  },
  ticketTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  ticketTopBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ticketBrandText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  ticketCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  ticketCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  ticketBannerContainer: {
    width: '100%',
    height: 155,
    backgroundColor: colors.surfaceLight,
    position: 'relative',
  },
  ticketBannerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  ticketBannerFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E1633',
  },
  ticketBannerOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketStatusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ticketStatusChipText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  ticketCategoryChip: {
    backgroundColor: 'rgba(18, 15, 30, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  ticketCategoryChipText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  ticketMainBody: {
    padding: 18,
    gap: 12,
  },
  ticketEventTitle: {
    color: colors.white,
    fontSize: 19,
    fontWeight: '800',
    lineHeight: 25,
  },
  ticketOrganizerText: {
    color: colors.grey,
    fontSize: 12,
    marginTop: -6,
  },
  ticketMetaGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  ticketMetaBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceLight,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ticketVenueBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceLight,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ticketMetaIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.14)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ticketMetaLabel: {
    color: colors.grey,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  ticketMetaValue: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  ticketSpecsBox: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  ticketSpecRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketSpecCol: {
    flex: 1,
  },
  ticketSpecColRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  ticketSpecLabel: {
    color: colors.grey,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  ticketSpecValue: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  ticketSpecDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  perforationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 24,
    position: 'relative',
  },
  notchLeft: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(7, 6, 14, 0.96)',
    marginLeft: -12,
  },
  dashedLine: {
    flex: 1,
    height: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    marginHorizontal: 6,
  },
  notchRight: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(7, 6, 14, 0.96)',
    marginRight: -12,
  },
  ticketStub: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 20,
    alignItems: 'center',
    gap: 10,
  },
  stubInstruction: {
    color: colors.grey,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.9,
  },
  barcodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 10,
  },
  barcodeBar: {
    height: '100%',
    backgroundColor: '#111111',
  },
  bookingCodeText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2.5,
  },
});