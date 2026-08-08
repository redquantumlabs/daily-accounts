import React, { useState } from 'react';
import { useThemeColors } from '../hooks/useThemeColors';
import { View, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import AppText from '../components/AppText';
import { useAuthContext } from '../context/AuthContext';

export default function ProfileScreen({ navigation }: any) {
  const colors = useThemeColors();
  const { profileName, updateName } = useAuthContext();

  const [firstName, setFirstName] = useState(profileName?.firstName || '');
  const [lastName, setLastName] = useState(profileName?.lastName || '');
  const [firstNameError, setFirstNameError] = useState('');
  const [lastNameError, setLastNameError] = useState('');
  const [generalMessage, setGeneralMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const placeholderColor = colors.textMuted;

  const handleUpdateProfile = async () => {
    setFirstNameError('');
    setLastNameError('');
    setGeneralMessage('');
    setIsSuccess(false);

    let isValid = true;
    if (!firstName.trim()) {
      setFirstNameError('First Name cannot be empty.');
      isValid = false;
    }
    if (!isValid) return;

    try {
      await updateName(firstName.trim(), lastName.trim());
      setGeneralMessage('Name updated successfully!');
      setIsSuccess(true);
    } catch (error: any) {
      setGeneralMessage(error.message);
      setIsSuccess(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {generalMessage ? (
          <View style={[styles.messageBox, { backgroundColor: isSuccess ? '#4caf5020' : '#ff444420', borderColor: isSuccess ? '#4caf50' : '#ff4444' }]}>
            <AppText style={[styles.messageText, { color: isSuccess ? '#4caf50' : '#ff4444' }]}>{generalMessage}</AppText>
          </View>
        ) : null}

        <View style={[styles.card, { backgroundColor: colors.card, shadowColor: colors.shadow }]}>
          <AppText style={[styles.sectionTitle, { color: colors.text }]}>Your Name</AppText>

          <View style={styles.inputWrapper}>
            <AppText style={styles.label}>First Name</AppText>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.surface, color: colors.text, borderColor: firstNameError ? '#ff4444' : colors.border }
              ]}
              placeholder="First Name"
              placeholderTextColor={placeholderColor}
              value={firstName}
              onChangeText={(text) => { setFirstName(text); setFirstNameError(''); setGeneralMessage(''); }}
            />
            {firstNameError ? <AppText style={styles.errorText}>{firstNameError}</AppText> : null}
          </View>

          <View style={styles.inputWrapper}>
            <AppText style={styles.label}>Last Name</AppText>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.surface, color: colors.text, borderColor: lastNameError ? '#ff4444' : colors.border }
              ]}
              placeholder="Last Name"
              placeholderTextColor={placeholderColor}
              value={lastName}
              onChangeText={(text) => { setLastName(text); setLastNameError(''); setGeneralMessage(''); }}
            />
            {lastNameError ? <AppText style={styles.errorText}>{lastNameError}</AppText> : null}
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={handleUpdateProfile}
          >
            <AppText style={styles.buttonText}>Save Name</AppText>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  messageBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  messageText: {
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    borderRadius: 16,
    padding: 20,
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  inputWrapper: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  button: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
