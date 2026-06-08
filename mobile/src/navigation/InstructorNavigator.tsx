import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { InstructorWorkspaceScreen }   from '../features/instructor/screens/InstructorWorkspaceScreen';
import { InstructorLessonDetailScreen } from '../features/instructor/screens/InstructorLessonDetailScreen';
import { NotificationTestScreen }       from '../features/notifications/NotificationTestScreen';
import type { InstructorStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<InstructorStackParamList>();

export function InstructorNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="InstructorWorkspace"    component={InstructorWorkspaceScreen} />
      <Stack.Screen name="InstructorLessonDetail" component={InstructorLessonDetailScreen} />
      <Stack.Screen name="NotificationTest"       component={NotificationTestScreen} />
    </Stack.Navigator>
  );
}
