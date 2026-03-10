import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/lib/constants';

const TAB_ICONS: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  index: { active: 'home', inactive: 'home-outline' },
  study: { active: 'book', inactive: 'book-outline' },
  analysis: { active: 'bar-chart', inactive: 'bar-chart-outline' },
  mypage: { active: 'person', inactive: 'person-outline' },
};

const TAB_LABELS: Record<string, string> = {
  index: '홈',
  study: '학습',
  analysis: '분석',
  mypage: 'MY',
};

const VISIBLE_TABS = new Set(['index', 'study', 'analysis', 'mypage']);

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 8);

  return (
    <View style={[styles.tabBarOuter, { paddingBottom: bottomPadding }]}>
      <View style={styles.tabBarInner}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];

          // Only show main 4 tabs
          if (!VISIBLE_TABS.has(route.name)) return null;

          const isFocused = state.index === index;
          const label = TAB_LABELS[route.name] || options.title || route.name;
          const icons = TAB_ICONS[route.name];

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <Pressable
              key={route.key}
              style={styles.tabItem}
              onPress={onPress}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={label}
            >
              {isFocused && <View style={styles.activeIndicator} />}
              {icons && (
                <Ionicons
                  name={isFocused ? icons.active : icons.inactive}
                  size={22}
                  color={isFocused ? COLORS.primary : COLORS.textLight}
                />
              )}
              <Text
                style={[
                  styles.tabLabel,
                  isFocused && styles.tabLabelActive,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.surface,
          ...(Platform.OS === 'web' ? { borderBottomWidth: 0 } : {}),
        },
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18,
          color: COLORS.text,
        },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ headerTitle: '한국사 마스터' }}
      />
      <Tabs.Screen
        name="study"
        options={{ headerTitle: '학습' }}
      />
      <Tabs.Screen
        name="analysis"
        options={{ headerTitle: '분석' }}
      />
      <Tabs.Screen
        name="mypage"
        options={{ headerTitle: '마이페이지' }}
      />

      {/* Hidden from tab bar but still shows tab bar when navigated */}
      <Tabs.Screen name="exam" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="onboarding" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="settings" options={{ href: null, headerTitle: '학습 설정' }} />
      <Tabs.Screen name="premium" options={{ href: null, headerTitle: '프리미엄' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarOuter: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 0,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 -2px 16px rgba(99,102,241,0.08)' }
      : {
          shadowColor: '#6366F1',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 16,
          elevation: 8,
        }),
  } as any,
  tabBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 8,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 16,
    position: 'relative',
  },
  activeIndicator: {
    position: 'absolute',
    top: -8,
    width: 20,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.primary,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textLight,
    marginTop: 2,
  },
  tabLabelActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});
