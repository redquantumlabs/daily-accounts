import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ProfileName {
  firstName: string;
  lastName: string;
}

interface AuthContextType {
  isLoggedIn: boolean;
  user: null;
  profileName: ProfileName | null;
  updateName: (firstName: string, lastName: string) => Promise<void>;
  isAuthLoading: boolean;
  // Stub functions kept for compatibility with any remaining imports
  login: () => Promise<void>;
  register: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: () => Promise<void>;
  changePassword: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: true,
  user: null,
  profileName: null,
  updateName: async () => {},
  isAuthLoading: false,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  updateProfile: async () => {},
  changePassword: async () => {},
  refreshAuth: async () => {},
});

export const useAuthContext = () => useContext(AuthContext);

const PROFILE_NAME_KEY = '@app_profile_name';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profileName, setProfileName] = useState<ProfileName | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const loadProfile = async () => {
    try {
      const stored = await AsyncStorage.getItem(PROFILE_NAME_KEY);
      if (stored) {
        setProfileName(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load profile name', e);
    } finally {
      setIsAuthLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const updateName = async (firstName: string, lastName: string) => {
    const name = { firstName, lastName };
    await AsyncStorage.setItem(PROFILE_NAME_KEY, JSON.stringify(name));
    setProfileName(name);
  };

  return (
    <AuthContext.Provider value={{
      isLoggedIn: true,
      user: null,
      profileName,
      updateName,
      isAuthLoading,
      login: async () => {},
      register: async () => {},
      logout: async () => {},
      updateProfile: async () => {},
      changePassword: async () => {},
      refreshAuth: loadProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
