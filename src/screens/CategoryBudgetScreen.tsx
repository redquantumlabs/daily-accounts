import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Keyboard, Animated } from 'react-native';
import AppText from '../components/AppText';
import { useThemeColors } from '../hooks/useThemeColors';
import { useExpenseContext } from '../context/ExpenseContext';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { formatAmount } from '../utils/format';

export default function CategoryBudgetScreen() {
  const colors = useThemeColors();
  const { categories, currency, updateCategoryBudget, yearlyBudget } = useExpenseContext();
  
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastOpacity] = useState(new Animated.Value(0));

  const showToast = (message: string) => {
    setToastMessage(message);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setToastMessage(null));
  };

  // Local state to manage the inputs before saving
  const [budgets, setBudgets] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    categories.forEach(c => {
      initial[c.id] = c.yearlyBudget ? c.yearlyBudget.toString() : '';
    });
    return initial;
  });

  const handleBudgetChange = (id: string, value: string) => {
    setBudgets(prev => ({ ...prev, [id]: value }));
  };

  const handleSave = (id: string) => {
    const val = parseFloat(budgets[id]);
    const finalVal = isNaN(val) || val < 0 ? 0 : val;

    let newTotal = 0;
    categories.forEach(c => {
      if (c.id === id) {
        newTotal += finalVal;
      } else {
        newTotal += c.yearlyBudget || 0;
      }
    });

    if (yearlyBudget > 0 && newTotal > yearlyBudget) {
      showToast(`Budget Exceeded! Sum cannot exceed ${currency}${formatAmount(yearlyBudget)}`);
      // Reset input back to saved state or let them fix it
      return;
    }

    updateCategoryBudget(id, finalVal);
    setBudgets(prev => ({ ...prev, [id]: finalVal ? finalVal.toString() : '' }));
    Keyboard.dismiss();
  };

  return (
    <View style={{ flex: 1 }}>
      <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <AppText style={[styles.title, { color: colors.text }]}>Category Yearly Budgets</AppText>
          <AppText style={styles.subtitle}>
            Set a maximum yearly spending limit for specific categories. Leave empty or 0 for no limit.
          </AppText>
        </View>

        {categories.length === 0 ? (
          <View style={styles.emptyState}>
            <AppText style={styles.emptyText}>No categories found.</AppText>
          </View>
        ) : (
          categories.map((cat) => {
            const isChanged = budgets[cat.id] !== (cat.yearlyBudget ? cat.yearlyBudget.toString() : '');
            
            return (
              <View key={cat.id} style={[styles.card, { backgroundColor: colors.card }]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.iconContainer, { backgroundColor: cat.color }]}>
                    <Ionicons name={cat.icon as any} size={20} color="#fff" />
                  </View>
                  <AppText style={[styles.catName, { color: colors.text }]} numberOfLines={1}>
                    {cat.name}
                  </AppText>
                </View>
                
                <View style={styles.inputRow}>
                  <AppText style={[styles.currencySymbol, { color: colors.textMuted }]}>{currency}</AppText>
                  <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                    placeholder="0.00"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={budgets[cat.id]}
                    onChangeText={(val) => handleBudgetChange(cat.id, val)}
                    onBlur={() => handleSave(cat.id)}
                  />
                  {isChanged && (
                    <TouchableOpacity 
                      style={[styles.saveBtn, { backgroundColor: colors.primary }]} 
                      onPress={() => handleSave(cat.id)}
                    >
                      <Ionicons name="checkmark" size={20} color="#fff" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </KeyboardAvoidingView>
      {toastMessage && (
        <Animated.View style={{
          position: 'absolute',
          bottom: 50,
          alignSelf: 'center',
          backgroundColor: 'rgba(0,0,0,0.7)',
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderRadius: 20,
          opacity: toastOpacity,
          zIndex: 9999,
        }}>
          <AppText style={{ color: 'white', fontSize: 14 }}>{toastMessage}</AppText>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    lineHeight: 20,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  catName: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    fontSize: 18,
    marginRight: 8,
    fontWeight: 'bold',
  },
  input: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    marginRight: 12,
  },
  saveBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  }
});
