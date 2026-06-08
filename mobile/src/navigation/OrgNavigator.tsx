import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OrgWorkspaceScreen } from '../features/organization/screens/OrgWorkspaceScreen';
import { NotificationTestScreen } from '../features/notifications/NotificationTestScreen';
import type { OrgStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<OrgStackParamList>();

export function OrgNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="OrgWorkspace"     component={OrgWorkspaceScreen} />
      <Stack.Screen name="NotificationTest" component={NotificationTestScreen} />
    </Stack.Navigator>
  );
}
