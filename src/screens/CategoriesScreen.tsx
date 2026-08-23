import React, { useState } from 'react';
import { useThemeColors } from '../hooks/useThemeColors';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import AppText from '../components/AppText';
import { useThemeContext } from '../context/ThemeContext';
import { useExpenseContext, Category } from '../context/ExpenseContext';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AddCategoryModal from '../components/AddCategoryModal';

export default function CategoriesScreen() {
  const colors = useThemeColors();
  const { isDarkTheme } = useThemeContext();
  const { categories } = useExpenseContext();
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const handleOpenAddModal = () => {
    setSelectedCategory(null);
    setIsModalVisible(true);
  };

  const handleEditCategory = (cat: Category) => {
    if (isSelectionMode) {
      toggleSelection(cat.id);
      return;
    }
    setSelectedCategory(cat);
    setIsModalVisible(true);
  };

  const handleLongPress = (id: string) => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedIds([id]);
    }
  };

  const toggleSelection = (id: string) => {
    let newSelected = [...selectedIds];
    if (newSelected.includes(id)) {
      newSelected = newSelected.filter((selectedId) => selectedId !== id);
      if (newSelected.length === 0) {
        setIsSelectionMode(false);
      }
    } else {
      newSelected.push(id);
    }
    setSelectedIds(newSelected);
  };

  const { bulkDeleteCategories } = useExpenseContext();

  const handleBulkDelete = () => {
    Alert.alert(
      'Delete Categories',
      `Are you sure you want to delete ${selectedIds.length} categories?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            bulkDeleteCategories(selectedIds);
            setIsSelectionMode(false);
            setSelectedIds([]);
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        
        <View style={styles.header}>
          <AppText style={[styles.title, { color: colors.text }]}>Your Categories</AppText>
          <AppText style={styles.subtitle}>
            {isSelectionMode ? `${selectedIds.length} selected` : 'Tap a category to edit or delete it.'}
          </AppText>
        </View>

        {categories.length === 0 ? (
          <View style={styles.emptyState}>
            <AppText style={styles.emptyText}>No categories found. Add one!</AppText>
          </View>
        ) : (
          <View style={styles.grid}>
            {categories.map((cat) => {
              const isSelected = selectedIds.includes(cat.id);
              return (
                <TouchableOpacity 
                  key={cat.id} 
                  style={[
                    styles.catCard, 
                    { backgroundColor: colors.card, shadowColor: colors.shadow },
                    isSelected && { borderColor: colors.primary, borderWidth: 2 }
                  ]}
                  onPress={() => handleEditCategory(cat)}
                  onLongPress={() => handleLongPress(cat.id)}
                >
                  <View style={[styles.iconContainer, { backgroundColor: cat.color }]}>
                    <Ionicons name={cat.icon as any} size={28} color="#fff" />
                    {isSelected && (
                      <View style={[styles.checkContainer, { backgroundColor: colors.primary }]}>
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      </View>
                    )}
                  </View>
                  <AppText style={[styles.catName, { color: colors.text }]} numberOfLines={1}>{cat.name}</AppText>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button or Action Bar */}
      {isSelectionMode ? (
        <View style={[styles.actionRow, { backgroundColor: colors.background }]}>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: colors.card }]}
            onPress={() => { setIsSelectionMode(false); setSelectedIds([]); }}
          >
            <AppText style={{ color: colors.text, fontWeight: 'bold' }}>Cancel</AppText>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: '#FF3B30' }]}
            onPress={handleBulkDelete}
          >
            <Ionicons name="trash" size={20} color="#fff" />
            <AppText style={{ color: '#fff', fontWeight: 'bold', marginLeft: 8 }}>Delete</AppText>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity 
          style={[styles.fab, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
          onPress={handleOpenAddModal}
        >
          <Ionicons name="add" size={32} color="#fff" />
        </TouchableOpacity>
      )}

      <AddCategoryModal 
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        categoryToEdit={selectedCategory}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    padding: 20,
    paddingBottom: 100, // For FAB
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
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    color: '#888',
    fontStyle: 'italic',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  catCard: {
    width: '48%',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  catName: {
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  checkContainer: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  actionRow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
});

