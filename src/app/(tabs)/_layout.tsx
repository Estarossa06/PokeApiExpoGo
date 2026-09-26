import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />

      <Tabs
        screenOptions={{
          tabBarActiveTintColor: "#4F1720",
          tabBarInactiveTintColor: '#000000',

          headerStyle: {
            backgroundColor: "#E5DDE0",
          },

          headerShadowVisible: false,

          headerTintColor: '',

          tabBarStyle: {
            backgroundColor: "#E5DDE0",
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Inicio',
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'image' : 'image'}
                color={color}
                size={24}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="information"
          options={{
            title: 'Informacion',
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'list' : 'list' }
                color={color}
                size={24}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="character"
          options={{
            title: "Character",
            headerShown: false,
            tabBarIcon: ({ color }) => (
             <Ionicons
               name="person-circle-outline"
               size={28}
               color={color}
             />
            ),
          }}
        />
        <Tabs.Screen
          name="transformations"
          options={{
            title: "Transformations",
            headerShown: false,
            tabBarIcon: ({ color }) => (
             <Ionicons
               name="flash-outline"
               size={28}
               color={color}
             />
            ),
          }}
        />
      </Tabs>
    </ThemeProvider>
  );
}