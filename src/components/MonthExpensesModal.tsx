import React from 'react';
import { useThemeColors } from '../hooks/useThemeColors';
import { View, StyleSheet, Modal, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppText from '../components/AppText';
import { useThemeContext } from '../context/ThemeContext';
import ExpenseList from './ExpenseList';

interface MonthExpensesModalProps {
  visible: boolean;
  onClose: () => void;
  selectedMonth: number | null;
  selectedYear: number | null;
  isHidden?: boolean;
}

export default function MonthExpensesModal({ visible, onClose, selectedMonth, selectedYear, isHidden }: MonthExpensesModalProps) {
  const colors = useThemeColors();
  const { isDarkTheme } = useThemeContext();

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  
  const formattedDate = (selectedMonth !== null && selectedYear !== null) 
    ? `${MONTHS[selectedMonth]} ${selectedYear}`
    : '';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}>
        <View style={[styles.header, { borderBottomColor: isDarkTheme ? '#333' : '#eee' }]}>
          <View style={styles.headerButton} />
          <AppText style={[styles.headerTitle, { color: colors.text }]}>{formattedDate}</AppText>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <AppText style={{ color: colors.primary, fontSize: 16, fontWeight: 'bold' }}>Close</AppText>
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1 }}>
          {(selectedMonth !== null && selectedYear !== null) ? (
            <ExpenseList 
              hideTitle={true} 
              isExpensesScreen={true} 
              monthFilter={{ month: selectedMonth, year: selectedYear }} 
              forceHiddenState={isHidden} 
            />
          ) : null}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerButton: {
    padding: 5,
    minWidth: 50,
    alignItems: 'flex-end'
  },
});
