import React, { useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from './AppText';
import { useThemeColors } from '../hooks/useThemeColors';
import { useThemeContext } from '../context/ThemeContext';
import { getOrdinalSuffix } from '../utils/format';

interface PreviousMonthSummaryModalProps {
  visible: boolean;
  onClose: () => void;
  day: number;
  time: Date;
  onSave: (day: number, time: Date) => void;
}

export default function PreviousMonthSummaryModal({
  visible,
  onClose,
  day,
  time,
  onSave,
}: PreviousMonthSummaryModalProps) {
  const colors = useThemeColors();
  const { isDarkTheme } = useThemeContext();
  const insets = useSafeAreaInsets();

  const [selectedDay, setSelectedDay] = useState<number>(day);
  const [selectedTime, setSelectedTime] = useState<Date>(time);
  const [showTimePicker, setShowTimePicker] = useState<boolean>(false);

  useEffect(() => {
    if (visible) {
      setSelectedDay(day);
      setSelectedTime(new Date(time));
      setShowTimePicker(false);
    }
  }, [visible, day, time]);

  const handleSave = () => {
    onSave(selectedDay, selectedTime);
    onClose();
  };

  const formattedTime = selectedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.modalContent,
                {
                  backgroundColor: colors.background,
                  paddingBottom: Math.max(24, insets.bottom + 16),
                },
              ]}
            >
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerTitleRow}>
                  <Ionicons name="calendar-number-outline" size={24} color={colors.primary} style={{ marginRight: 8 }} />
                  <AppText style={[styles.title, { color: colors.text }]}>Previous Month Notification</AppText>
                </View>
                <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 12 }}
              >
                {/* Description */}
                <AppText style={[styles.description, { color: colors.textMuted }]}>
                  Choose the date (day of month) and time to automatically receive last month's expense summary each month.
                </AppText>

                {/* Day of Month Selector */}
                <View style={styles.section}>
                  <View style={styles.sectionHeaderRow}>
                    <AppText style={[styles.sectionTitle, { color: colors.text }]}>
                      Day of the Month
                    </AppText>
                    <View style={[styles.dayBadge, { backgroundColor: colors.primary + '20' }]}>
                      <AppText style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>
                        {getOrdinalSuffix(selectedDay)} of every month
                      </AppText>
                    </View>
                  </View>

                  <View style={styles.daysGrid}>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
                      const isSelected = selectedDay === d;
                      return (
                        <TouchableOpacity
                          key={d}
                          style={[
                            styles.dayCell,
                            {
                              backgroundColor: isSelected
                                ? colors.primary
                                : isDarkTheme
                                ? '#1e293b'
                                : '#f1f5f9',
                              borderColor: isSelected ? colors.primary : colors.border,
                            },
                          ]}
                          onPress={() => setSelectedDay(d)}
                          activeOpacity={0.7}
                        >
                          <AppText
                            style={[
                              styles.dayText,
                              {
                                color: isSelected ? '#ffffff' : colors.text,
                                fontWeight: isSelected ? '700' : '500',
                              },
                            ]}
                          >
                            {d}
                          </AppText>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {selectedDay > 28 && (
                    <AppText style={[styles.hintText, { color: colors.textMuted }]}>
                      * In shorter months like February, the notification will trigger on the last day of the month.
                    </AppText>
                  )}
                </View>

                {/* Notification Time Selector */}
                <View style={styles.section}>
                  <AppText style={[styles.sectionTitle, { color: colors.text, marginBottom: 8 }]}>
                    Notification Time
                  </AppText>

                  <TouchableOpacity
                    style={[
                      styles.timeButton,
                      {
                        backgroundColor: isDarkTheme ? '#1e293b' : '#f8fafc',
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={() => setShowTimePicker(true)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="time-outline" size={22} color={colors.primary} style={{ marginRight: 10 }} />
                      <View>
                        <AppText style={{ fontSize: 12, color: colors.textMuted }}>Delivery Time</AppText>
                        <AppText style={{ fontSize: 16, fontWeight: '700', color: colors.primary }}>
                          {formattedTime}
                        </AppText>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <AppText style={{ color: colors.primary, fontSize: 14, fontWeight: '600', marginRight: 4 }}>
                        Change
                      </AppText>
                      <Ionicons name="chevron-forward" size={16} color={colors.primary} />
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Schedule Summary Preview Box */}
                <View
                  style={[
                    styles.previewBox,
                    {
                      backgroundColor: isDarkTheme ? '#1e293b' : '#eff6ff',
                      borderColor: colors.primary + '35',
                    },
                  ]}
                >
                  <Ionicons name="information-circle" size={22} color={colors.primary} style={{ marginRight: 10, marginTop: 1 }} />
                  <AppText style={[styles.previewText, { color: colors.text }]}>
                    Notification triggers on the{' '}
                    <AppText style={{ fontWeight: '700', color: colors.primary }}>
                      {getOrdinalSuffix(selectedDay)}
                    </AppText>{' '}
                    of each month at{' '}
                    <AppText style={{ fontWeight: '700', color: colors.primary }}>
                      {formattedTime}
                    </AppText>{' '}
                    with the total expenses of the previous month.
                  </AppText>
                </View>

                {/* Save Button */}
                <TouchableOpacity
                  style={[styles.saveButton, { backgroundColor: colors.primary }]}
                  onPress={handleSave}
                  activeOpacity={0.8}
                >
                  <AppText style={styles.saveButtonText}>Save Notification Settings</AppText>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>

      {/* Time Picker Modal */}
      {showTimePicker && (
        <DateTimePicker
          value={selectedTime}
          mode="time"
          is24Hour={false}
          display="default"
          onChange={(event, date) => {
            setShowTimePicker(false);
            if (date && event.type !== 'dismissed') {
              setSelectedTime(date);
            }
          }}
        />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 18,
  },
  section: {
    marginBottom: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  dayBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginTop: 4,
  },
  dayCell: {
    width: '12%',
    marginHorizontal: '1.14%',
    aspectRatio: 1,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  dayText: {
    fontSize: 14,
  },
  hintText: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 6,
    lineHeight: 16,
  },
  timeButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  previewBox: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  previewText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  saveButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
