import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { bootstrapAuth } from '../store/authSlice';
import { AuthNavigator } from './AuthNavigator';
import { StudentNavigator } from './StudentNavigator';
import { ParentNavigator } from './ParentNavigator';
import { OrgNavigator }        from './OrgNavigator';
import { InstructorNavigator } from './InstructorNavigator';
import type { RootStackParamList } from '../types/navigation';
import { useTheme } from '../shared/hooks/useTheme';

const Stack = createNativeStackNavigator<RootStackParamList>();

/** Returns true if the authenticated user is an organization (school or academy). */
function isOrgUser(role: string | undefined): boolean {
  if (!role) return false;
  const r = role.toUpperCase();
  return r === 'SCHOOL' || r === 'ACADEMY' || r === 'ORGANIZATION';
}

/**
 * RootNavigator — rendered inside Expo Router's root screen (src/app/index.tsx).
 * Expo Router already provides NavigationContainer, so we omit it here.
 */
export function RootNavigator() {
  const dispatch  = useAppDispatch();
  const { isBootstrapping, isAuthenticated, user } = useAppSelector((s) => s.auth);
  const { T }     = useTheme();

  useEffect(() => {
    dispatch(bootstrapAuth());
  }, [dispatch]);

  if (isBootstrapping) {
    return (
      <View style={[styles.splash, { backgroundColor: T.background }]}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  const role = user?.role ?? user?.Role;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : isOrgUser(role) ? (
        <Stack.Screen name="OrgApp" component={OrgNavigator} />
      ) : role === 'TEACHER' ? (
        <Stack.Screen name="InstructorApp" component={InstructorNavigator} />
      ) : role === 'PARENT' ? (
        <Stack.Screen name="ParentApp" component={ParentNavigator} />
      ) : (
        <Stack.Screen name="StudentApp" component={StudentNavigator} />
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
