import { PlayfairDisplay_500Medium } from '@expo-google-fonts/playfair-display/500Medium';
import { PlayfairDisplay_600SemiBold } from '@expo-google-fonts/playfair-display/600SemiBold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ConfirmProvider } from '@/components/confirm';
import { AuthProvider, useAuth } from '@/lib/auth';
import { DataProvider } from '@/lib/data';
import { I18nProvider } from '@/lib/i18n';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync();

function RootStack() {
  const { ready } = useAuth();
  // Continue even if the fonts fail to load; text then falls back to the system face.
  const [fontsLoaded, fontError] = useFonts({ PlayfairDisplay_500Medium, PlayfairDisplay_600SemiBold });
  const fonts = fontsLoaded || !!fontError;
  useEffect(() => {
    if (ready && fonts) SplashScreen.hideAsync();
  }, [ready, fonts]);
  if (!ready || !fonts) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'slide_from_right' }}>
      <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
      <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
      <Stack.Screen name="add-plant" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="new-post" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <I18nProvider>
          <AuthProvider>
            <DataProvider>
              <ConfirmProvider>
                <StatusBar style="light" />
                <RootStack />
              </ConfirmProvider>
            </DataProvider>
          </AuthProvider>
        </I18nProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
