import React from 'react';
import {
  Modal,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

interface TermsConditionsProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
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

export const TermsModal = ({ isOpen, onClose, onAccept }: TermsConditionsProps) => {
  const handleAccept = () => {
    onClose();
    onAccept();
  };

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>Terms and Conditions</Text>

          {/* Using FlatList for performant list rendering */}
          <FlatList
            data={TERMS_LIST}
            keyExtractor={(_, index) => index.toString()}
            style={styles.listContainer}
            showsVerticalScrollIndicator
            renderItem={({ item, index }) => (
              <View style={styles.termRow}>
                <Text style={styles.bullet}>{index + 1}.</Text>
                <Text style={styles.termText}>{item}</Text>
              </View>
            )}
          />

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.button, styles.declineButton]}
              onPress={onClose}
            >
              <Text style={styles.buttonText}>Decline</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              style={[styles.button, styles.acceptButton]}
              onPress={handleAccept}
            >
              <Text style={styles.buttonText}>Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxHeight: '80%',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
    textAlign: 'center',
  },
  listContainer: {
    marginBottom: 16,
  },
  termRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  bullet: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginRight: 6,
    lineHeight: 18,
  },
  termText: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButton: {
    backgroundColor: '#F87171',
  },
  acceptButton: {
    backgroundColor: '#10B981',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});