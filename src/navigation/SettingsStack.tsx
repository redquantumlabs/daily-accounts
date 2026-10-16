import React from 'react';
import { useThemeColors } from '../hooks/useThemeColors';
import { View, TouchableOpacity } from 'react-native';
import AppText from '../components/AppText';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';

import SettingsScreen from '../screens/SettingsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CurrencyScreen from '../screens/CurrencyScreen';
import BudgetScreen from '../screens/BudgetScreen';
import CategoriesScreen from '../screens/CategoriesScreen';
import PaymentModesScreen from '../screens/PaymentModesScreen';
import ManageAccountsScreen from '../screens/ManageAccountsScreen';
import AnalyticsChartSettingsScreen from '../screens/AnalyticsChartSettingsScreen';

const Stack = createNativeStackNavigator();

export default function SettingsStack() {
  const colors = useThemeColors();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.card,
        },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="SettingsMain"
        component={SettingsScreen}
        options={{
          headerShown: true,
          headerTitle: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="settings" size={22} color={colors.text} style={{ marginRight: 8 }} />
              <AppText style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>Settings</AppText>
            </View>
          )
        }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={({ navigation }) => ({
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => {
                if (navigation.canGoBack()) {
                  navigation.goBack();
                } else {
                  navigation.navigate('SettingsMain');
                }
              }}
              style={{ paddingRight: 14, paddingVertical: 4 }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          ),
          headerTitle: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="person" size={22} color={colors.text} style={{ marginRight: 8 }} />
              <AppText style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>User Profile</AppText>
            </View>
          )
        })}
      />
      <Stack.Screen
        name="Currency"
        component={CurrencyScreen}
        options={{
          headerTitle: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: -20 }}>
              <Ionicons name="cash" size={22} color={colors.text} style={{ marginRight: 8 }} />
              <AppText style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>Select Currency</AppText>
            </View>
          )
        }}
      />
      <Stack.Screen
        name="Budget"
        component={BudgetScreen}
        options={{
          headerTitle: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: -20 }}>
              <Ionicons name="wallet" size={22} color={colors.text} style={{ marginRight: 8 }} />
              <AppText style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>Budget</AppText>
            </View>
          )
        }}
      />

      <Stack.Screen
        name="Categories"
        component={CategoriesScreen}
        options={{
          headerTitle: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: -20 }}>
              <Ionicons name="pricetag" size={22} color={colors.text} style={{ marginRight: 8 }} />
              <AppText style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>Manage Categories</AppText>
            </View>
          )
        }}
      />
      <Stack.Screen
        name="ManageAccounts"
        component={ManageAccountsScreen}
        options={{
          headerTitle: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: -20 }}>
              <Ionicons name="business" size={22} color={colors.text} style={{ marginRight: 8 }} />
              <AppText style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>Manage Accounts</AppText>
            </View>
          )
        }}
      />
      <Stack.Screen
        name="PaymentModes"
        component={PaymentModesScreen}
        options={{
          headerTitle: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: -20 }}>
              <Ionicons name="card" size={22} color={colors.text} style={{ marginRight: 8 }} />
              <AppText style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>Payment Modes</AppText>
            </View>
          )
        }}
      />
      <Stack.Screen
        name="AnalyticsChartSettings"
        component={AnalyticsChartSettingsScreen}
        options={{
          headerTitle: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: -20 }}>
              <Ionicons name="bar-chart" size={22} color={colors.text} style={{ marginRight: 8 }} />
              <AppText style={{ color: colors.text, fontSize: 18, fontWeight: '600' }}>Analytics Chart</AppText>
            </View>
          )
        }}
      />
    </Stack.Navigator>
  );
}

