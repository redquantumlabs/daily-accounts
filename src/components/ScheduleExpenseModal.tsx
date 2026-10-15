import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AppText from './AppText';
import { useThemeColors } from '../hooks/useThemeColors';
import { useExpenseContext, ScheduledExpense } from '../context/ExpenseContext';
import { useAlert } from '../context/AlertContext';

interface ScheduleExpenseModalProps {
  visible: boolean;
  onClose: () => void;
  itemToEdit?: ScheduledExpense | null;
}

export default function ScheduleExpenseModal({ visible, onClose, itemToEdit }: ScheduleExpenseModalProps) {
  const { showAlert } = useAlert();
  const colors = useThemeColors();
  const {
    scheduleExpense,
    updateScheduledExpense,
    deleteScheduledExpense,
    categories,
    paymentModes,
  } = useExpenseContext();
  const insets = useSafeAreaInsets();

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date());
  const [scheduleDate, setScheduleDate] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 10);
    return d;
  });
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [paymentModeId, setPaymentModeId] = useState<string | undefined>(undefined);

  // Pickers state
  const [showExpenseDatePicker, setShowExpenseDatePicker] = useState(false);
  const [showScheduleDatePicker, setShowScheduleDatePicker] = useState(false);
  const [showScheduleTimePicker, setShowScheduleTimePicker] = useState(false);

  // Errors state
  const [amountError, setAmountError] = useState('');
  const [descriptionError, setDescriptionError] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [paymentModeError, setPaymentModeError] = useState('');
  const [scheduleDateError, setScheduleDateError] = useState('');

  const clearErrors = () => {
    setAmountError('');
    setDescriptionError('');
    setCategoryError('');
    setPaymentModeError('');
    setScheduleDateError('');
  };

  useEffect(() => {
    if (visible) {
      if (itemToEdit) {
        setAmount(itemToEdit.amount.toString());
        setDescription(itemToEdit.description);
        setExpenseDate(new Date(itemToEdit.expenseDate));
        setScheduleDate(new Date(itemToEdit.scheduleDate));
        setCategoryId(itemToEdit.categoryId);
        setPaymentModeId(itemToEdit.paymentModeId);
      } else {
        setAmount('');
        setDescription('');
        setExpenseDate(new Date());
        const defaultSched = new Date();
        defaultSched.setMinutes(defaultSched.getMinutes() + 10);
        setScheduleDate(defaultSched);
        setCategoryId(undefined);
        setPaymentModeId(undefined);
      }
      clearErrors();
    }
  }, [visible, itemToEdit]);

  const placeholderColor = colors.textMuted;

  const handleSave = async () => {
    clearErrors();
    let hasError = false;

    if (!amount.trim() || isNaN(Number(amount)) || Number(amount) <= 0) {
      setAmountError('Please enter a valid positive amount.');
      hasError = true;
    }
    if (!description.trim()) {
      setDescriptionError('Please enter a description.');
      hasError = true;
    }
    const isValidCategory = categoryId && categories.some(c => c.id === categoryId);
    if (!isValidCategory) {
      setCategoryError('Please select a category.');
      hasError = true;
    }
    const isValidPaymentMode = paymentModeId && paymentModes.some(p => p.id === paymentModeId);
    if (!isValidPaymentMode) {
      setPaymentModeError('Please select a payment mode.');
      hasError = true;
    }
    if (scheduleDate.getTime() <= Date.now()) {
      setScheduleDateError('Auto-add date and time must be in the future.');
      hasError = true;
    }

    if (hasError) return;

    try {
      if (itemToEdit) {
        await updateScheduledExpense(
          itemToEdit.id,
          Number(amount),
          description,
          expenseDate,
          scheduleDate,
          categoryId,
          paymentModeId
        );
      } else {
        await scheduleExpense(
          Number(amount),
          description,
          expenseDate,
          scheduleDate,
          categoryId,
          paymentModeId
        );
      }
      onClose();
    } catch (e: any) {
      showAlert('Error', e.message || 'Failed to save scheduled expense.');
    }
  };

  const handleDelete = () => {
    if (itemToEdit) {
      showAlert(
        'Delete Scheduled Expense',
        'Are you sure you want to cancel and delete this scheduled expense?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteScheduledExpense(itemToEdit.id);
                onClose();
              } catch (e: any) {
                showAlert('Error', e.message || 'Failed to delete scheduled expense.');
              }
            },
          },
        ]
      );
    }
  };

  // Date/Time Change Handlers
  const onChangeExpenseDate = (event: any, selectedDate?: Date) => {
    setShowExpenseDatePicker(Platform.OS === 'ios');
    if (event?.type === 'dismissed') return;
    if (selectedDate) {
      setExpenseDate(selectedDate);
    }
  };

  const onChangeScheduleDate = (event: any, selectedDate?: Date) => {
    setShowScheduleDatePicker(Platform.OS === 'ios');
    if (event?.type === 'dismissed') return;
    if (selectedDate) {
      // Retain the existing hours and minutes of scheduleDate
      const updated = new Date(selectedDate);
      updated.setHours(scheduleDate.getHours(), scheduleDate.getMinutes(), 0, 0);
      setScheduleDate(updated);
      setScheduleDateError('');
    }
  };

  const onChangeScheduleTime = (event: any, selectedTime?: Date) => {
    setShowScheduleTimePicker(Platform.OS === 'ios');
    if (event?.type === 'dismissed') return;
    if (selectedTime) {
      const updated = new Date(scheduleDate);
      updated.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
      setScheduleDate(updated);
      setScheduleDateError('');
    }
  };

  const formatScheduleTimeString = (d: Date) => {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={[
                styles.modalContent,
                { backgroundColor: colors.background, paddingBottom: Math.max(24, insets.bottom + 16) },
              ]}
            >
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* Header */}
                <View style={styles.header}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="time" size={24} color={colors.primary} style={{ marginRight: 8 }} />
                    <AppText style={[styles.title, { color: colors.text }]}>
                      {itemToEdit ? 'Edit Scheduled Expense' : 'Schedule Expense'}
                    </AppText>
                  </View>
                  <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="close" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>

                {/* Amount */}
                <View style={styles.inputWrapper}>
                  <AppText style={styles.label}>Amount</AppText>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
                    placeholder="0.00"
                    placeholderTextColor={placeholderColor}
                    keyboardType="numeric"
                    value={amount}
                    onChangeText={(text) => {
                      setAmount(text);
                      setAmountError('');
                    }}
                  />
                  {amountError ? <AppText style={styles.fieldErrorText}>{amountError}</AppText> : null}
                </View>

                {/* Description */}
                <View style={styles.inputWrapper}>
                  <AppText style={styles.label}>Description</AppText>
                  <View style={[styles.input, { height: 75, backgroundColor: colors.surface, borderColor: colors.border, paddingHorizontal: 0, overflow: 'hidden' }]}>
                    <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled={true} showsVerticalScrollIndicator={true}>
                      <TextInput
                        style={{ minHeight: 75, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, fontSize: 16, color: colors.text, textAlignVertical: 'top' }}
                        placeholder="Description"
                        placeholderTextColor={placeholderColor}
                        value={description}
                        onChangeText={(text) => {
                          setDescription(text);
                          setDescriptionError('');
                        }}
                        multiline
                      />
                    </ScrollView>
                  </View>
                  {descriptionError ? <AppText style={styles.fieldErrorText}>{descriptionError}</AppText> : null}
                </View>

                {/* Expense Date */}
                <View style={styles.inputWrapper}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <Ionicons name="calendar" size={14} color={colors.textMuted} style={{ marginRight: 4 }} />
                    <AppText style={styles.label}>Expense Date (Date shown in records)</AppText>
                  </View>
                  <TouchableOpacity
                    style={[styles.dateButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    onPress={() => setShowExpenseDatePicker(true)}
                  >
                    <AppText style={{ color: colors.text, fontSize: 16 }}>
                      {expenseDate.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                    </AppText>
                    <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                  </TouchableOpacity>
                </View>

                {/* Category */}
                <View style={styles.inputWrapper}>
                  <AppText style={styles.label}>Category</AppText>
                  <ScrollView
                    keyboardShouldPersistTaps="handled"
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.categoryScroll}
                    contentContainerStyle={{ flexDirection: 'row', alignItems: 'center' }}
                  >
                    {categories.map((cat) => (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.categoryChip,
                          { backgroundColor: categoryId === cat.id ? cat.color : colors.surface },
                        ]}
                        onPress={() => {
                          setCategoryId(cat.id);
                          setCategoryError('');
                        }}
                      >
                        <Ionicons
                          name={cat.icon as any}
                          size={16}
                          color={categoryId === cat.id ? '#fff' : cat.color}
                          style={{ marginRight: 6 }}
                        />
                        <AppText style={{ color: categoryId === cat.id ? '#fff' : colors.text, fontWeight: '600' }}>
                          {cat.name}
                        </AppText>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  {categoryError ? <AppText style={styles.fieldErrorText}>{categoryError}</AppText> : null}
                </View>

                {/* Payment Mode */}
                <View style={styles.inputWrapper}>
                  <AppText style={styles.label}>Payment Mode</AppText>
                  <ScrollView
                    keyboardShouldPersistTaps="handled"
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.categoryScroll}
                    contentContainerStyle={{ flexDirection: 'row', alignItems: 'center' }}
                  >
                    {paymentModes.map((mode) => (
                      <TouchableOpacity
                        key={mode.id}
                        style={[
                          styles.categoryChip,
                          { backgroundColor: paymentModeId === mode.id ? mode.color : colors.surface },
                        ]}
                        onPress={() => {
                          setPaymentModeId(mode.id);
                          setPaymentModeError('');
                        }}
                      >
                        <Ionicons
                          name={mode.icon as any}
                          size={16}
                          color={paymentModeId === mode.id ? '#fff' : mode.color}
                          style={{ marginRight: 6 }}
                        />
                        <AppText style={{ color: paymentModeId === mode.id ? '#fff' : colors.text, fontWeight: '600' }}>
                          {mode.name}
                        </AppText>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  {paymentModeError ? <AppText style={styles.fieldErrorText}>{paymentModeError}</AppText> : null}
                </View>

                {/* Scheduled Date & Time */}
                <View style={styles.inputWrapper}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <Ionicons name="alarm" size={14} color={colors.primary} style={{ marginRight: 4 }} />
                    <AppText style={[styles.label, { color: colors.primary, fontWeight: 'bold' }]}>
                      Auto-Add Date & Time (When to post)
                    </AppText>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {/* Date Picker Button */}
                    <TouchableOpacity
                      style={[styles.dateButton, { flex: 1.4, backgroundColor: colors.surface, borderColor: colors.border }]}
                      onPress={() => setShowScheduleDatePicker(true)}
                    >
                      <AppText style={{ color: colors.text, fontSize: 15 }} numberOfLines={1}>
                        {scheduleDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                      </AppText>
                      <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
                    </TouchableOpacity>

                    {/* Time Picker Button */}
                    <TouchableOpacity
                      style={[styles.dateButton, { flex: 1, backgroundColor: colors.surface, borderColor: colors.border }]}
                      onPress={() => setShowScheduleTimePicker(true)}
                    >
                      <AppText style={{ color: colors.text, fontSize: 15 }} numberOfLines={1}>
                        {formatScheduleTimeString(scheduleDate)}
                      </AppText>
                      <Ionicons name="time-outline" size={18} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                  {scheduleDateError ? <AppText style={styles.fieldErrorText}>{scheduleDateError}</AppText> : null}
                </View>

                {/* Action Buttons */}
                <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.primary }]} onPress={handleSave}>
                  <AppText style={styles.saveButtonText}>
                    {itemToEdit ? 'Update Scheduled Expense' : 'Schedule Expense'}
                  </AppText>
                </TouchableOpacity>

                {itemToEdit && (
                  <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                    <Ionicons name="trash-outline" size={20} color="#ff4444" style={{ marginRight: 8 }} />
                    <AppText style={styles.deleteButtonText}>Delete Scheduled Expense</AppText>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Date & Time Pickers */}
      {showExpenseDatePicker && (
        <DateTimePicker
          value={expenseDate}
          mode="date"
          display="default"
          onChange={onChangeExpenseDate}
        />
      )}

      {showScheduleDatePicker && (
        <DateTimePicker
          value={scheduleDate}
          mode="date"
          display="default"
          onChange={onChangeScheduleDate}
        />
      )}

      {showScheduleTimePicker && (
        <DateTimePicker
          value={scheduleDate}
          mode="time"
          display="default"
          is24Hour={false}
          onChange={onChangeScheduleTime}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  fieldErrorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  inputWrapper: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    color: '#888',
    marginBottom: 6,
    marginLeft: 2,
    fontWeight: '600',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  dateButton: {
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryScroll: {
    paddingVertical: 4,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  saveButton: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  deleteButton: {
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#ff4444',
    backgroundColor: 'transparent',
  },
  deleteButtonText: {
    color: '#ff4444',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
