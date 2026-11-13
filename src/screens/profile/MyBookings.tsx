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

type CancelMode = 'all' | 'partial';

const formatCurrency = (amount: string | number | null | undefined): string =>
  `₹${Number(amount ?? 0).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
  })}`;

const isEventCompleted = (dateStr?: string, timeStr?: string): boolean => {
  if (!dateStr) return false;

  const now = new Date();
  const cleanDate = dateStr.includes('T')
    ? dateStr.split('T')[0]
    : dateStr.split(' ')[0];
  const [yearStr, monthStr, dayStr] = cleanDate.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    const fallbackDate = new Date(dateStr);
    return !Number.isNaN(fallbackDate.getTime()) && fallbackDate < now;
  }

  let hours = 23;
  let minutes = 59;

  if (timeStr && timeStr.trim()) {
    const raw = timeStr.trim();
    if (raw.includes(':')) {
      const parts = raw.split(':');
      const parsedH = parseInt(parts[0], 10);
      const parsedM = parseInt(parts[1], 10);
      if (!Number.isNaN(parsedH)) hours = parsedH;
      if (!Number.isNaN(parsedM)) minutes = parsedM;
    }
  }

  const eventDateTime = new Date(year, month - 1, day, hours, minutes, 59);
  return eventDateTime.getTime() < now.getTime();
};

const extractFormattedTime = (
  timeField?: string,
  dateField?: string,
): string | null => {
  if (timeField && timeField.trim()) {
    const rawTime = timeField.trim();

    if (/[ap]m/i.test(rawTime)) {
      return rawTime;
    }

    if (rawTime.includes(':')) {
      const parts = rawTime.split(':');
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);

      if (
        !Number.isNaN(hours) &&
        !Number.isNaN(minutes) &&
        hours >= 0 &&
        hours <= 23 &&
        minutes >= 0 &&
        minutes <= 59
      ) {
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);

        return new Intl.DateTimeFormat('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }).format(date);
      }
    }

    return rawTime;
  }

  if (dateField && dateField.includes('T')) {
    const date = new Date(dateField);
    if (
      !Number.isNaN(date.getTime()) &&
      (date.getUTCHours() !== 0 ||
        date.getUTCMinutes() !== 0 ||
        date.getUTCSeconds() !== 0)
    ) {
      return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(date);
    }
  }

  return null;
};

const formatEventOnlyDate = (dateStr?: string) => {
  if (!dateStr) return 'Date to be announced';

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
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(d);
    }
  }

  const fallback = new Date(dateStr);
  if (!Number.isNaN(fallback.getTime())) {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(fallback);
  }

  return dateStr;
};

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
  const [error, setError] = useState<string>('');

  // Cancellation modal state (matches web partial & full cancellation)
  const [bookingToCancel, setBookingToCancel] = useState<any | null>(null);
  const [cancelMode, setCancelMode] = useState<CancelMode>('all');
  const [cancelQuantity, setCancelQuantity] = useState<number>(1);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Digital pass modal state
  const [selectedPass, setSelectedPass] = useState<any | null>(null);

  // Track failed image URLs to trigger fallback gracefully
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const fetchBookings = useCallback(async () => {
    try {
      setError('');
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
      setError('Unable to load bookings. Please sign in and try again.');
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

  const openCancelModal = (booking: any) => {
    const bookedQty = booking.number_of_tickets ?? 1;
    setCancelError(null);
    setCancelMode('all');
    setCancelQuantity(bookedQty);
    setBookingToCancel(booking);
  };

  const handleConfirmCancel = async () => {
    if (!bookingToCancel || isCancelling) return;

    const bookingId =
      bookingToCancel.id || bookingToCancel.booking_id || bookingToCancel._id;

    if (!bookingId) {
      setCancelError('Invalid booking reference.');
      return;
    }

    const bookedQty = bookingToCancel.number_of_tickets ?? 1;
    const quantityToCancel =
      cancelMode === 'all' ? bookedQty : cancelQuantity;

    if (
      !Number.isSafeInteger(quantityToCancel) ||
      quantityToCancel < 1 ||
      quantityToCancel > bookedQty
    ) {
      setCancelError('Please select a valid number of tickets to cancel.');
      return;
    }

    try {
      setIsCancelling(true);
      setCancelError(null);

      const response = await api.patch(
        `/v1/bookings/${bookingId}/cancel`,
        { quantity: quantityToCancel },
        {
          withCredentials: true,
          headers: { 'x-client-type': 'mobile' },
        },
      );

      const result = response.data;

      setBookings((prev) =>
        prev.map((item) => {
          const itemId = item.id;
          if (itemId !== bookingId) return item;

          return {
            ...item,
            number_of_tickets:
              result?.remainingTickets !== undefined
                ? result.remainingTickets
                : cancelMode === 'all'
                  ? 0
                  : bookedQty - quantityToCancel,
            total_amount:
              result?.remainingAmount !== undefined
                ? result.remainingAmount
                : item.total_amount,
            status:
              result?.status ||
              (cancelMode === 'all' ? 'CANCELLED' : item.status),
          };
        }),
      );

      setBookingToCancel(null);
      Alert.alert(
        cancelMode === 'all' ? 'Booking Cancelled' : 'Tickets Cancelled',
        cancelMode === 'all'
          ? 'All tickets in this booking have been cancelled.'
          : `${quantityToCancel} ticket${quantityToCancel > 1 ? 's' : ''} cancelled successfully.`,
      );

      // Background refresh to sync exact server figures
      fetchBookings();
    } catch (err: any) {
      console.error('Cancel booking error:', err?.response?.data || err.message);
      const msg =
        err?.response?.data?.message ||
        'Failed to cancel your tickets. Please try again.';
      setCancelError(msg);
    } finally {
      setIsCancelling(false);
    }
  };

  const resolvePosterSource = (booking: any, bookingId: string | number) => {
    const directUrl = (booking.image || '').trim();

    if (directUrl && !failedImages[String(bookingId)]) {
      return { uri: directUrl };
    }

    return null;
  };

  const getCombinedDateTimeDisplay = (item: any) => {
    const date = formatEventOnlyDate(item.event_date || item.booking_date);
    const time = extractFormattedTime(
      item.time || item.event_time,
      item.event_date,
    );
    return time ? `${date} • ${time}` : date;
  };

  // Derived calculations for Cancel Modal
  const selectedBookedQuantity = bookingToCancel?.number_of_tickets ?? 1;
  const selectedBookingAmount = Number(
    bookingToCancel?.total_amount ?? bookingToCancel?.price ?? 0,
  );
  const effectiveCancelQty =
    cancelMode === 'all' ? selectedBookedQuantity : cancelQuantity;

  const estimatedRefund =
    bookingToCancel && effectiveCancelQty === selectedBookedQuantity
      ? selectedBookingAmount
      : bookingToCancel
        ? Math.round(
            ((selectedBookingAmount * effectiveCancelQty) /
              Math.max(1, selectedBookedQuantity)) *
              100,
          ) / 100
        : 0;

  const remainingQuantity = Math.max(
    0,
    selectedBookedQuantity - effectiveCancelQty,
  );
  const remainingAmount =
    Math.round((selectedBookingAmount - estimatedRefund) * 100) / 100;

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
        <Text style={styles.headerTitle}>My Event Bookings</Text>
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
        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={28} color={colors.red} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchBookings}>
              <Text style={styles.retryBtnText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : bookings.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="ticket-outline" size={54} color={colors.grey} />
            <Text style={styles.emptyTitle}>No Bookings Found</Text>
            <Text style={styles.emptySub}>
              Explore upcoming concerts, exhibitions, and events across your
              city.
            </Text>
            <TouchableOpacity
              style={styles.browseBtn}
              onPress={() => navigation.navigate('Events')}
              activeOpacity={0.85}
            >
              <Text style={styles.browseBtnText}>Explore Events →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.bookingsContainer}>
            {bookings.map((booking: any) => {
              const bookingId = booking.id;

              const isCancelled =
                String(booking.status || '').toUpperCase() === 'CANCELLED';

              const isPast =
                !isCancelled &&
                isEventCompleted(
                  booking.event_date,
                  booking.time || booking.event_time,
                );

              const isDisabled = isCancelled || isPast;

              const statusLabel = isCancelled
                ? 'CANCELLED'
                : isPast
                  ? 'COMPLETED'
                  : 'CONFIRMED';

              const posterSource = resolvePosterSource(booking, bookingId);

              const eventTitle = booking.event_title || 'CityPass Event';
              const venue = booking.venue || 'Venue details TBA';

              const ticketCount = booking.number_of_tickets ?? 1;
              const totalAmount = Number(
                booking.total_amount ?? booking.price ?? 0,
              );

              const handleCardPress = () => {
                if (isDisabled) return;
                if (booking.event_id || booking.slug) {
                  navigation.navigate('EventDetails', {
                    eventId: booking.event_id,
                    slug: booking.slug,
                  });
                }
              };

              return (
                <TouchableOpacity
                  key={bookingId}
                  activeOpacity={isDisabled ? 1 : 0.88}
                  onPress={handleCardPress}
                  style={[
                    styles.bookingCard,
                    isDisabled && styles.bookingCardDisabled,
                  ]}
                >
                  {/* Poster & Header (Static image, no preview) */}
                  <View style={styles.cardHeader}>
                    <View style={styles.posterWrapper}>
                      {posterSource ? (
                        <Image
                          source={posterSource}
                          style={styles.poster}
                          onError={() =>
                            setFailedImages((prev) => ({
                              ...prev,
                              [String(bookingId)]: true,
                            }))
                          }
                        />
                      ) : (
                        <View style={styles.posterPlaceholder}>
                          <Ionicons
                            name="ticket-outline"
                            size={24}
                            color={colors.grey}
                          />
                        </View>
                      )}
                    </View>

                    <View style={styles.headerInfo}>
                      <View style={styles.badgeRow}>
                        <View
                          style={[
                            styles.statusBadge,
                            isCancelled
                              ? styles.statusCancelled
                              : isPast
                                ? styles.statusCompleted
                                : styles.statusConfirmed,
                          ]}
                        >
                          <Ionicons
                            name={
                              isCancelled
                                ? 'close-circle'
                                : 'checkmark-circle'
                            }
                            size={11}
                            color={
                              isCancelled
                                ? colors.red
                                : isPast
                                  ? colors.grey
                                  : colors.green
                            }
                          />
                          <Text
                            style={[
                              styles.statusBadgeText,
                              isCancelled
                                ? styles.textCancelled
                                : isPast
                                  ? styles.textCompleted
                                  : styles.textConfirmed,
                            ]}
                          >
                            {statusLabel}
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
                        name="calendar-outline"
                        size={14}
                        color={colors.primaryLight}
                      />
                      <Text style={styles.metaText} numberOfLines={1}>
                        {getCombinedDateTimeDisplay(booking)}
                      </Text>
                    </View>

                    <View style={styles.metaRow}>
                      <Ionicons
                        name="location-outline"
                        size={14}
                        color={colors.primaryLight}
                      />
                      <Text style={styles.metaText} numberOfLines={1}>
                        {venue}
                      </Text>
                    </View>

                    {/* Capsule summary */}
                    <View style={styles.infoCapsule}>
                      <View
                        style={[styles.capsuleItem, styles.ticketTypeCapsuleItem]}
                      >
                        <Text style={styles.capsuleLabel}>TICKET TYPE</Text>
                        <Text style={styles.capsuleValue}>
                          {booking.ticket_name || 'Standard Pass'}
                        </Text>
                        {booking.ticket_price != null && (
                          <Text style={styles.capsuleSubValue}>
                            {formatCurrency(booking.ticket_price)} each
                          </Text>
                        )}
                      </View>

                      <View style={styles.capsuleDivider} />

                      <View style={styles.capsuleItem}>
                        <Text style={styles.capsuleLabel}>REMAINING</Text>
                        <Text style={styles.capsuleValue}>
                          {ticketCount} Ticket{ticketCount !== 1 ? 's' : ''}
                        </Text>
                      </View>

                      <View style={styles.capsuleDivider} />

                      <View style={styles.capsuleItem}>
                        <Text style={styles.capsuleLabel}>AMOUNT</Text>
                        <Text style={styles.capsulePrice}>
                          {formatCurrency(totalAmount)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.bookedOnRow}>
                      <Text style={styles.metaSubText}>
                        Booked on{' '}
                        {formatBookingDate(
                          booking.booking_date || booking.created_at,
                        )}
                      </Text>
                    </View>

                    {/* Actions */}
                    <View style={styles.actionsRow}>
                      {!isDisabled && (
                        <TouchableOpacity
                          style={styles.cancelBtn}
                          activeOpacity={0.8}
                          onPress={(e) => {
                            e.stopPropagation();
                            openCancelModal(booking);
                          }}
                        >
                          <Ionicons
                            name="ban-outline"
                            size={14}
                            color={colors.red}
                          />
                          <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        style={styles.viewPassBtn}
                        activeOpacity={0.8}
                        onPress={(e) => {
                          e.stopPropagation();
                          setSelectedPass(booking);
                        }}
                      >
                        <Ionicons
                          name="eye-outline"
                          size={14}
                          color="#FFFFFF"
                        />
                        <Text style={styles.viewPassBtnText}>View Pass</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* PARTIAL & FULL CANCELLATION MODAL (MATCHES WEB) */}
      <Modal
        visible={Boolean(bookingToCancel)}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isCancelling) {
            setBookingToCancel(null);
            setCancelError(null);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.cancelModalCard}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: 14 }}
            >
              <View style={styles.cancelModalHeader}>
                <Text style={styles.modalTitle}>Manage Your Tickets</Text>
                <TouchableOpacity
                  disabled={isCancelling}
                  onPress={() => {
                    setBookingToCancel(null);
                    setCancelError(null);
                  }}
                >
                  <Ionicons name="close" size={22} color={colors.grey} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSubtitle}>
                Choose how many tickets you want to cancel for{' '}
                <Text style={{ color: colors.white, fontWeight: '700' }}>
                  {bookingToCancel?.event_title ||
                    bookingToCancel?.name ||
                    'this event'}
                </Text>
                .
              </Text>

              {/* Current Booking Summary Box */}
              <View style={styles.summaryBox}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Ticket category:</Text>
                  <Text style={styles.summaryValue}>
                    {bookingToCancel?.ticket_name || 'Ticket type unavailable'}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Currently booked:</Text>
                  <Text style={styles.summaryValue}>
                    {selectedBookedQuantity} Ticket
                    {selectedBookedQuantity !== 1 ? 's' : ''}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>
                    Current booking amount:
                  </Text>
                  <Text style={styles.summaryValue}>
                    {formatCurrency(selectedBookingAmount)}
                  </Text>
                </View>
              </View>

              {/* All vs Partial Selection */}
              {selectedBookedQuantity > 1 ? (
                <View style={styles.cancelOptionsGroup}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    disabled={isCancelling}
                    onPress={() => {
                      setCancelMode('all');
                      setCancelQuantity(selectedBookedQuantity);
                      setCancelError(null);
                    }}
                    style={[
                      styles.radioOptionCard,
                      cancelMode === 'all' && styles.radioOptionCardActive,
                    ]}
                  >
                    <Ionicons
                      name={
                        cancelMode === 'all'
                          ? 'radio-button-on'
                          : 'radio-button-off'
                      }
                      size={20}
                      color={
                        cancelMode === 'all' ? colors.primaryLight : colors.grey
                      }
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.radioOptionTitle}>
                        Cancel all tickets
                      </Text>
                      <Text style={styles.radioOptionSub}>
                        Cancel all {selectedBookedQuantity} tickets.
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    disabled={isCancelling}
                    onPress={() => {
                      setCancelMode('partial');
                      setCancelQuantity(1);
                      setCancelError(null);
                    }}
                    style={[
                      styles.radioOptionCard,
                      cancelMode === 'partial' && styles.radioOptionCardActive,
                    ]}
                  >
                    <Ionicons
                      name={
                        cancelMode === 'partial'
                          ? 'radio-button-on'
                          : 'radio-button-off'
                      }
                      size={20}
                      color={
                        cancelMode === 'partial'
                          ? colors.primaryLight
                          : colors.grey
                      }
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.radioOptionTitle}>
                        Cancel selected tickets
                      </Text>
                      <Text style={styles.radioOptionSub}>
                        Keep the tickets you still want to use.
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {cancelMode === 'partial' && (
                    <View style={styles.stepperBox}>
                      <Text style={styles.stepperLabel}>
                        Number of tickets to cancel
                      </Text>
                      <View style={styles.stepperControls}>
                        <TouchableOpacity
                          style={[
                            styles.stepperBtn,
                            cancelQuantity <= 1 && styles.stepperBtnDisabled,
                          ]}
                          disabled={isCancelling || cancelQuantity <= 1}
                          onPress={() => {
                            setCancelQuantity((q) => Math.max(1, q - 1));
                            setCancelError(null);
                          }}
                        >
                          <Ionicons
                            name="remove"
                            size={18}
                            color={colors.white}
                          />
                        </TouchableOpacity>

                        <Text style={styles.stepperValue}>
                          {cancelQuantity} Ticket
                          {cancelQuantity !== 1 ? 's' : ''}
                        </Text>

                        <TouchableOpacity
                          style={[
                            styles.stepperBtn,
                            cancelQuantity >= selectedBookedQuantity - 1 &&
                              styles.stepperBtnDisabled,
                          ]}
                          disabled={
                            isCancelling ||
                            cancelQuantity >= selectedBookedQuantity - 1
                          }
                          onPress={() => {
                            setCancelQuantity((q) =>
                              Math.min(selectedBookedQuantity - 1, q + 1),
                            );
                            setCancelError(null);
                          }}
                        >
                          <Ionicons name="add" size={18} color={colors.white} />
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.stepperHint}>
                        You must keep at least one ticket when using partial
                        cancellation.
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.singleTicketNote}>
                  <Text style={styles.radioOptionSub}>
                    You booked only one ticket. Confirm below if you want to
                    cancel the entire booking.
                  </Text>
                </View>
              )}

              {/* Refund & Remaining Breakdown Box */}
              <View style={styles.summaryBox}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Tickets to cancel:</Text>
                  <Text style={styles.summaryValue}>{effectiveCancelQty}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Tickets remaining:</Text>
                  <Text style={styles.summaryValue}>{remainingQuantity}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Estimated refund:</Text>
                  <Text style={[styles.summaryValue, { color: colors.green }]}>
                    {formatCurrency(estimatedRefund)}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>
                    Remaining booking amount:
                  </Text>
                  <Text style={styles.summaryValue}>
                    {formatCurrency(remainingAmount)}
                  </Text>
                </View>
              </View>

              <Text style={styles.termsNote}>
                The displayed refund is an estimate. Actual refund eligibility
                depends on the event's cancellation policy and payment provider.
              </Text>

              {cancelError ? (
                <Text style={styles.inlineErrorText}>{cancelError}</Text>
              ) : null}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalSecondaryBtn}
                  disabled={isCancelling}
                  onPress={() => {
                    setBookingToCancel(null);
                    setCancelError(null);
                  }}
                >
                  <Text style={styles.modalSecondaryText}>Keep Booking</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalDangerBtn}
                  disabled={isCancelling}
                  onPress={handleConfirmCancel}
                >
                  {isCancelling ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalDangerText}>
                      {cancelMode === 'all'
                        ? 'Confirm Cancellation'
                        : `Cancel ${cancelQuantity} Ticket${cancelQuantity !== 1 ? 's' : ''}`}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* DIGITAL TICKET PASS MODAL (MATCHES WEB DATA & STATUSES) */}
      <Modal
        visible={Boolean(selectedPass)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedPass(null)}
      >
        {selectedPass && (() => {
          const passCancelled =
            String(selectedPass.status || '').toUpperCase() === 'CANCELLED';
          const passPast =
            !passCancelled &&
            isEventCompleted(
              selectedPass.event_date || selectedPass.booking_date,
              selectedPass.time || selectedPass.event_time,
            );
          const passStatusText = passCancelled
            ? 'CANCELLED'
            : passPast
              ? 'COMPLETED'
              : String(selectedPass.status || 'CONFIRMED').toUpperCase();

          const formattedPassTime =
            extractFormattedTime(
              selectedPass.time || selectedPass.event_time,
              selectedPass.event_date,
            ) || 'Gates Open 1 Hr Prior';

          const passTicketCount =
            selectedPass.number_of_tickets ?? selectedPass.quantity ?? 1;

          return (
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
                    <Text style={styles.ticketBrandText}>
                      CITYPASS OFFICIAL E-TICKET
                    </Text>
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
                  <View
                    style={[
                      styles.ticketCard,
                      (passCancelled || passPast) && { opacity: 0.92 },
                    ]}
                  >
                    {/* 1. Event Poster Header */}
                    <View style={styles.ticketBannerContainer}>
                      {selectedPass.image_url ||
                      selectedPass.poster_url ||
                      selectedPass.banner_image ||
                      selectedPass.image ? (
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
                            passCancelled
                              ? { backgroundColor: 'rgba(248, 113, 113, 0.92)' }
                              : passPast
                                ? { backgroundColor: 'rgba(107, 114, 128, 0.92)' }
                                : { backgroundColor: 'rgba(16, 185, 129, 0.92)' },
                          ]}
                        >
                          <Text style={styles.ticketStatusChipText}>
                            {passStatusText}
                          </Text>
                        </View>

                        {selectedPass.category_name ? (
                          <View style={styles.ticketCategoryChip}>
                            <Text style={styles.ticketCategoryChipText}>
                              {selectedPass.category_name}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>

                    {/* 2. Event Title & Pass Holder */}
                    <View style={styles.ticketMainBody}>
                      <Text style={styles.ticketEventTitle}>
                        {selectedPass.event_title ||
                          selectedPass.event?.title ||
                          selectedPass.name ||
                          'Live Event Pass'}
                      </Text>

                      {selectedPass.organizer_name ? (
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
                            <Text style={styles.ticketMetaLabel}>
                              EVENT DATE
                            </Text>
                            <Text style={styles.ticketMetaValue}>
                              {formatEventOnlyDate(
                                selectedPass.event_date ||
                                  selectedPass.event?.event_date ||
                                  selectedPass.booking_date,
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
                            <Text style={styles.ticketMetaLabel}>
                              TIME / ENTRY
                            </Text>
                            <Text style={styles.ticketMetaValue}>
                              {formattedPassTime}
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
                          <Text style={styles.ticketMetaLabel}>
                            VENUE & CITY
                          </Text>
                          <Text style={styles.ticketMetaValue}>
                            {[
                              selectedPass.venue ||
                                selectedPass.location ||
                                selectedPass.event?.location,
                              selectedPass.city_name,
                            ]
                              .filter(Boolean)
                              .join(', ') || 'Venue details TBA'}
                          </Text>
                        </View>
                      </View>

                      {/* 4. Pass Holder, Tier, Quantity & Amount Details */}
                      <View style={styles.ticketSpecsBox}>
                        <View style={styles.ticketSpecRow}>
                          <View style={styles.ticketSpecCol}>
                            <Text style={styles.ticketSpecLabel}>
                              PASS HOLDER
                            </Text>
                            <Text style={styles.ticketSpecValue}>
                              {selectedPass.user_name ||
                                selectedPass.user_email ||
                                'Authorized Holder'}
                            </Text>
                          </View>

                          <View style={styles.ticketSpecColRight}>
                            <Text style={styles.ticketSpecLabel}>QUANTITY</Text>
                            <Text style={styles.ticketSpecValue}>
                              {passTicketCount} Ticket
                              {passTicketCount !== 1 ? 's' : ''}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.ticketSpecDivider} />

                        <View style={styles.ticketSpecRow}>
                          <View style={styles.ticketSpecCol}>
                            <Text style={styles.ticketSpecLabel}>
                              TICKET CATEGORY
                            </Text>
                            <Text
                              style={[
                                styles.ticketSpecValue,
                                { color: colors.primaryLight },
                              ]}
                            >
                              {selectedPass.ticket_name || 'Standard Pass'}
                            </Text>
                            {selectedPass.ticket_price != null && (
                              <Text style={styles.ticketSpecSubValue}>
                                {formatCurrency(selectedPass.ticket_price)} per
                                ticket
                              </Text>
                            )}
                          </View>

                          <View style={styles.ticketSpecColRight}>
                            <Text style={styles.ticketSpecLabel}>
                              BOOKING AMOUNT
                            </Text>
                            <Text
                              style={[
                                styles.ticketSpecValue,
                                { color: colors.green, fontSize: 15 },
                              ]}
                            >
                              {formatCurrency(
                                selectedPass.total_amount ??
                                  selectedPass.price ??
                                  0,
                              )}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Perforation Divider */}
                    <View style={styles.perforationRow}>
                      <View style={styles.dashedLine} />
                    </View>

                    {/* Tagline Footer (Matches Web) */}
                    <View style={styles.ticketTaglineBox}>
                      <Text style={styles.ticketTaglineText}>
                        Your city, unlocked. Present this digital pass at the
                        entrance for entry, subject to the event's terms and
                        conditions.
                      </Text>
                    </View>
                  </View>
                </ScrollView>
              </View>
            </View>
          );
        })()}
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
  bookingCardDisabled: {
    opacity: 0.78,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 12,
    marginBottom: 10,
  },
  posterWrapper: {
    position: 'relative',
  },
  poster: {
    width: 68,
    height: 68,
    borderRadius: 10,
    backgroundColor: colors.surfaceLight,
  },
  posterPlaceholder: {
    width: 68,
    height: 68,
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
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusConfirmed: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
  },
  statusCancelled: {
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
  },
  statusCompleted: {
    backgroundColor: 'rgba(156, 163, 175, 0.16)',
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
  textCompleted: {
    color: colors.grey,
  },
  cityPill: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 6,
    paddingVertical: 3,
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
    fontSize: 12.5,
    fontWeight: '500',
    flex: 1,
  },
  bookedOnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaSubText: {
    color: colors.grey,
    fontSize: 11,
  },
  infoCapsule: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: colors.surfaceLight,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 10,
    marginVertical: 2,
  },
  capsuleItem: {
    flex: 1,
  },
  ticketTypeCapsuleItem: {
    flex: 1.5,
  },
  capsuleDivider: {
    width: 1,
    alignSelf: 'stretch',
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
  capsuleSubValue: {
    color: colors.grey,
    fontSize: 10,
    marginTop: 1,
  },
  capsulePrice: {
    color: colors.green,
    fontSize: 13,
    fontWeight: '800',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.3)',
  },
  cancelBtnText: {
    color: colors.red,
    fontSize: 12,
    fontWeight: '700',
  },
  viewPassBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.purple,
  },
  viewPassBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  errorBox: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.35)',
    padding: 24,
    alignItems: 'center',
    marginTop: 24,
    gap: 10,
  },
  errorText: {
    color: colors.red,
    fontSize: 13,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  retryBtnText: {
    color: colors.white,
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
    marginTop: 24,
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
  // Cancel Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  cancelModalCard: {
    width: '100%',
    maxHeight: '88%',
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
  },
  cancelModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '700',
  },
  modalSubtitle: {
    color: colors.grey,
    fontSize: 13,
    lineHeight: 19,
  },
  summaryBox: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    color: colors.grey,
    fontSize: 12,
  },
  summaryValue: {
    color: colors.white,
    fontSize: 12.5,
    fontWeight: '700',
  },
  cancelOptionsGroup: {
    gap: 10,
  },
  radioOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  radioOptionCardActive: {
    borderColor: colors.primaryLight,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  radioOptionTitle: {
    color: colors.white,
    fontSize: 13.5,
    fontWeight: '700',
  },
  radioOptionSub: {
    color: colors.grey,
    fontSize: 11.5,
    marginTop: 2,
  },
  stepperBox: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    gap: 8,
  },
  stepperLabel: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepperBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: colors.purple,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperBtnDisabled: {
    backgroundColor: colors.surfaceLight,
    opacity: 0.45,
  },
  stepperValue: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  stepperHint: {
    color: colors.grey,
    fontSize: 11,
  },
  singleTicketNote: {
    backgroundColor: colors.surfaceLight,
    borderRadius: 10,
    padding: 12,
  },
  termsNote: {
    color: colors.grey,
    fontSize: 11,
    lineHeight: 16,
  },
  inlineErrorText: {
    color: colors.red,
    fontSize: 12,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
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
    flex: 1.2,
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
  // Digital Ticket Modal styles
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
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
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
  ticketSpecSubValue: {
    color: colors.grey,
    fontSize: 10.5,
    marginTop: 2,
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
  dashedLine: {
    flex: 1,
    height: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    marginHorizontal: 6,
  },
  ticketTaglineBox: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 18,
  },
  ticketTaglineText: {
    color: colors.grey,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
});