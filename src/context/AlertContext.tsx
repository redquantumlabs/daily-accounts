import React, { createContext, useState, useContext, ReactNode } from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import AppText from '../components/AppText';
import { useThemeColors } from '../hooks/useThemeColors';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface AlertState {
  title: string;
  message?: string;
  buttons?: AlertButton[];
  options?: { cancelable?: boolean; onDismiss?: () => void };
}

interface AlertContextType {
  showAlert: (title: string, message?: string, buttons?: AlertButton[], options?: { cancelable?: boolean; onDismiss?: () => void }) => void;
}

const AlertContext = createContext<AlertContextType>({
  showAlert: () => {},
});

export const useAlert = () => useContext(AlertContext);

export const AlertProvider = ({ children }: { children: ReactNode }) => {
  const colors = useThemeColors();
  const [isVisible, setIsVisible] = useState(false);
  const [alertState, setAlertState] = useState<AlertState | null>(null);

  const showAlert = (title: string, message?: string, buttons?: AlertButton[], options?: { cancelable?: boolean; onDismiss?: () => void }) => {
    setAlertState({ title, message, buttons, options });
    setIsVisible(true);
  };

  const closeAlert = () => {
    setIsVisible(false);
    if (alertState?.options?.onDismiss) {
      alertState.options.onDismiss();
    }
  };

  const handleButtonPress = (onPress?: () => void) => {
    setIsVisible(false);
    if (onPress) {
      setTimeout(onPress, 50); // slight delay to allow modal close animation 
    }
  };

  const handleBackgroundPress = () => {
    if (alertState?.options?.cancelable !== false) {
      closeAlert();
    }
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      
      <Modal transparent visible={isVisible} animationType="fade" onRequestClose={handleBackgroundPress}>
        <TouchableWithoutFeedback onPress={handleBackgroundPress}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={[styles.alertBox, { backgroundColor: colors.surface }]}>
                {alertState?.title && (
                  <AppText style={[styles.title, { color: colors.text }]}>{alertState.title}</AppText>
                )}
                
                {alertState?.message && (
                  <AppText style={[styles.message, { color: colors.textMuted }]}>{alertState.message}</AppText>
                )}

                <View style={styles.buttonContainer}>
                  {alertState?.buttons ? (
                    alertState.buttons.map((btn, index) => {
                      const isDestructive = btn.style === 'destructive';
                      const isCancel = btn.style === 'cancel';
                      
                      let textColor = colors.primary;
                      if (isDestructive) textColor = '#ff4444';
                      if (isCancel) textColor = colors.textMuted;
                      
                      return (
                        <TouchableOpacity 
                          key={index} 
                          style={styles.button} 
                          onPress={() => handleButtonPress(btn.onPress)}
                        >
                          <AppText style={[styles.buttonText, { color: textColor }]}>
                            {btn.text}
                          </AppText>
                        </TouchableOpacity>
                      );
                    })
                  ) : (
                    <TouchableOpacity style={styles.button} onPress={() => handleButtonPress()}>
                      <AppText style={[styles.buttonText, { color: colors.primary }]}>OK</AppText>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </AlertContext.Provider>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  alertBox: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    borderRadius: 8,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  }
});
