import { DarkTheme, DefaultTheme, Tabs, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider
      value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}
    >
      <AnimatedSplashOverlay />

      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#4F1720',
          tabBarInactiveTintColor: '#000000',

          headerStyle: {
            backgroundColor: '#E5DDE0',
          },

          headerShadowVisible: false,

          headerTintColor: '',

          tabBarStyle: {
            backgroundColor: '#E5DDE0',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Inicio',
            headerShown: false,
            tabBarIcon: ({ focused }) => (
              <Ionicons
                name={focused ? 'image' : 'image'}
                color={focused ? '#4F1720' : '#000000'}
                size={24}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="information"
          options={{
            title: 'Info Pokémon',
            headerShown: false,
            tabBarIcon: ({ focused }) => (
              <Ionicons
                name={focused ? 'list' : 'list'}
                color={focused ? '#4F1720' : '#000000'}
                size={24}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="character"
          options={{
            title: 'Character',
            headerShown: false,
            tabBarIcon: ({ focused }) => (
              <Ionicons
                name="person-circle-outline"
                size={28}
                color={focused ? '#4F1720' : '#000000'}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="transformations"
          options={{
            title: 'Info Dragon Ball',
            headerShown: false,
            tabBarIcon: ({ focused }) => (
              <Ionicons
                name="information-circle-outline"
                size={28}
                color={focused ? '#4F1720' : '#000000'}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="profesores"
          options={{
            title: 'Profesores',
            headerShown: false,
            tabBarIcon: ({ focused }) => (
              <Ionicons
                name="people-outline"
                size={28}
                color={focused ? '#4F1720' : '#000000'}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="ia"
          options={{
            title: 'IA',
            headerShown: false,
            tabBarIcon: ({ focused, size }) => (
              <MaterialCommunityIcons
                name="robot-outline"
                color={focused ? '#4F1720' : '#000000'}
                size={size ?? 24}
              />
            ),
          }}
        />
      </Tabs>
    </ThemeProvider>
  );
}
