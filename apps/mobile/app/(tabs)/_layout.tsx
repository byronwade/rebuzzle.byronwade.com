/**
 * Tab Navigator Layout
 * Bottom tab navigation with Lucide icons matching web design
 */

import { Tabs } from 'expo-router';
import { StyleSheet, View, Platform } from 'react-native';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Home, Trophy, User } from 'lucide-react-native';

type TabIconProps = {
  focused: boolean;
  Icon: typeof Home;
  colors: {
    foreground: string;
    mutedForeground: string;
  };
};

function TabIcon({ focused, Icon, colors }: TabIconProps) {
  return (
    <View style={styles.tabIconContainer}>
      <Icon
        size={22}
        color={focused ? colors.foreground : colors.mutedForeground}
        strokeWidth={focused ? 2.5 : 2}
      />
    </View>
  );
}

export default function TabLayout() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const colors = theme.colors;

  const handleTabPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.card,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          ...Platform.select({
            ios: {
              shadowColor: 'transparent',
            },
            android: {
              elevation: 0,
            },
          }),
        },
        headerTintColor: colors.foreground,
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 17,
        },
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 56 + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom || 8,
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.05,
              shadowRadius: 4,
            },
            android: {
              elevation: 8,
            },
          }),
        },
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          marginTop: 2,
        },
        tabBarActiveTintColor: colors.foreground,
        tabBarInactiveTintColor: colors.mutedForeground,
      }}
      screenListeners={{
        tabPress: handleTabPress,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Daily Puzzle',
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} Icon={Home} colors={colors} />
          ),
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Leaderboard',
          tabBarLabel: 'Ranks',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} Icon={Trophy} colors={colors} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} Icon={User} colors={colors} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
