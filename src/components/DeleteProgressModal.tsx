import React from 'react';
import { Modal, View, StyleSheet, ActivityIndicator } from 'react-native';
import AppText from './AppText';
import { useThemeColors } from '../hooks/useThemeColors';

interface DeleteProgressModalProps {
  visible: boolean;
  progress: number | null;
  message?: string;
}

export default function DeleteProgressModal({
  visible,
  progress,
  message,
}: DeleteProgressModalProps) {
  const colors = useThemeColors();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.processingOverlay}>
        <View style={[styles.processingBox, { backgroundColor: colors.card }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <AppText style={[styles.processingText, { color: colors.text }]}>
            {progress !== null ? `Deleting... ${progress}%` : (message || 'Processing...')}
          </AppText>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  processingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingBox: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    minWidth: 160,
  },
  processingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
