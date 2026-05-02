/**
 * ReportSheet.tsx
 * 
 * A bottom-sheet modal that lets the current user report another user.
 * Calls POST /reports/:targetId with { reason, evidence? }.
 * 
 * Usage:
 *   <ReportSheet
 *     visible={reportVisible}
 *     targetId={someUserId}
 *     targetName="Alex"
 *     onClose={() => setReportVisible(false)}
 *   />
 */
import React, { useState } from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { X, Flag, AlertTriangle, MessageSquareX, Ban, HelpCircle, Check } from 'lucide-react-native';
import { apiPost } from '@/src/lib/api';

type ReportReason = 'INAPPROPRIATE_CONTENT' | 'SPAM' | 'HARASSMENT' | 'SCAM' | 'OTHER';

const REASONS: { value: ReportReason; label: string; icon: React.ElementType }[] = [
  { value: 'HARASSMENT', label: 'Harassment', icon: MessageSquareX },
  { value: 'INAPPROPRIATE_CONTENT', label: 'Inappropriate Content', icon: AlertTriangle },
  { value: 'SPAM', label: 'Spam', icon: Ban },
  { value: 'SCAM', label: 'Scam / Fake Profile', icon: Flag },
  { value: 'OTHER', label: 'Other', icon: HelpCircle },
];

interface ReportSheetProps {
  visible: boolean;
  targetId: string;
  targetName?: string;
  onClose: () => void;
}

export default function ReportSheet({ visible, targetId, targetName, onClose }: ReportSheetProps) {
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [evidence, setEvidence] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setSelectedReason(null);
    setEvidence('');
    setSubmitting(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!selectedReason) return;
    setSubmitting(true);
    try {
      const res = await apiPost(`/api/v1/reports/${targetId}`, {
        reason: selectedReason,
        ...(evidence.trim() && { evidence: evidence.trim() }),
      });
      const json = await res.json();

      if (json.success) {
        reset();
        onClose();
        Alert.alert(
          'Report Submitted',
          'Thank you. Our team will review this report within 24 hours.',
          [{ text: 'OK' }]
        );
      } else if (json.error?.code === 'RATE_LIMIT_EXCEEDED') {
        Alert.alert('Limit Reached', 'You can submit up to 5 reports per day.');
        handleClose();
      } else {
        Alert.alert('Error', json.error?.message || 'Failed to submit report.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <HStack style={styles.header}>
            <VStack style={{ flex: 1 }}>
              <Heading style={styles.title}>Report User</Heading>
              {targetName && (
                <Text style={styles.subtitle}>Reporting {targetName}</Text>
              )}
            </VStack>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <X size={20} color="#2f2f2e" />
            </TouchableOpacity>
          </HStack>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Reason Picker */}
            <Text style={styles.sectionLabel}>WHY ARE YOU REPORTING?</Text>
            <VStack style={{ gap: 8, marginBottom: 20 }}>
              {REASONS.map(({ value, label, icon: Icon }) => {
                const isSelected = selectedReason === value;
                return (
                  <TouchableOpacity
                    key={value}
                    onPress={() => setSelectedReason(value)}
                    style={[styles.reasonBtn, isSelected && styles.reasonBtnSelected]}
                  >
                    <HStack style={{ alignItems: 'center', gap: 12 }}>
                      <View style={[styles.reasonIcon, isSelected && styles.reasonIconSelected]}>
                        <Icon size={16} color={isSelected ? '#fff' : '#5c5b5b'} />
                      </View>
                      <Text style={[styles.reasonLabel, isSelected && styles.reasonLabelSelected]}>
                        {label}
                      </Text>
                    </HStack>
                    {isSelected && (
                      <View style={styles.checkmark}>
                        <Check size={14} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </VStack>

            {/* Optional Evidence */}
            <Text style={styles.sectionLabel}>ADDITIONAL DETAILS (OPTIONAL)</Text>
            <TextInput
              style={styles.evidenceInput}
              placeholder="Describe the issue..."
              placeholderTextColor="#afadac"
              multiline
              numberOfLines={3}
              value={evidence}
              onChangeText={setEvidence}
              maxLength={500}
            />
            <Text style={styles.charCount}>{evidence.length}/500</Text>

            {/* Submit */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!selectedReason || submitting}
              style={[styles.submitBtn, (!selectedReason || submitting) && styles.submitBtnDisabled]}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>Submit Report</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.disclaimer}>
              False reports may result in action against your account.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#f9f6f5',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingBottom: 48,
    paddingTop: 12,
    maxHeight: '90%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#d0cece',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontFamily: 'SpaceGrotesk_700Bold',
    color: '#2f2f2e',
  },
  subtitle: {
    fontSize: 12,
    color: '#5c5b5b',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    backgroundColor: '#eae7e7',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 2,
    color: '#5c5b5b',
    fontFamily: 'SpaceMono_400Regular',
    marginBottom: 10,
  },
  reasonBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e4e2e1',
  },
  reasonBtnSelected: {
    borderColor: '#414BEA',
    backgroundColor: '#414BEA08',
  },
  reasonIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#f3f0ef',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasonIconSelected: {
    backgroundColor: '#414BEA',
  },
  reasonLabel: {
    fontSize: 14,
    fontFamily: 'Manrope_500Medium',
    color: '#2f2f2e',
    flex: 1,
  },
  reasonLabelSelected: {
    color: '#414BEA',
    fontFamily: 'Manrope_700Bold',
  },
  checkmark: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#414BEA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  evidenceInput: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e4e2e1',
    borderRadius: 16,
    padding: 16,
    fontSize: 14,
    fontFamily: 'Manrope_400Regular',
    color: '#2f2f2e',
    minHeight: 90,
    textAlignVertical: 'top',
    marginBottom: 4,
  },
  charCount: {
    fontSize: 10,
    color: '#afadac',
    textAlign: 'right',
    marginBottom: 20,
  },
  submitBtn: {
    backgroundColor: '#b41340',
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 12,
  },
  submitBtnDisabled: {
    backgroundColor: '#d0cece',
  },
  submitText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'SpaceGrotesk_700Bold',
  },
  disclaimer: {
    fontSize: 10,
    color: '#afadac',
    textAlign: 'center',
    lineHeight: 16,
  },
});
