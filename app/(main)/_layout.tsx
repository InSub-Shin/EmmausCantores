import { Tabs } from 'expo-router';
import { Text, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{icon}</Text>;
}

export default function MainLayout() {
  const insets = useSafeAreaInsets();
  // 안드로이드 하단 네비게이션 바 높이만큼 패딩 추가
  const bottomPadding = Platform.OS === 'android' ? Math.max(insets.bottom, 8) : insets.bottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#4f46e5',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#f3f4f6',
          height: 56 + bottomPadding,
          paddingBottom: bottomPadding,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      }}
    >
      <Tabs.Screen name="home" options={{ title: '홈', tabBarIcon: ({ focused }) => <TabIcon icon="🏠" focused={focused} /> }} />
      <Tabs.Screen name="members" options={{ title: '단원', tabBarIcon: ({ focused }) => <TabIcon icon="👥" focused={focused} /> }} />
      <Tabs.Screen name="votes" options={{ title: '투표', tabBarIcon: ({ focused }) => <TabIcon icon="🗳️" focused={focused} /> }} />
      <Tabs.Screen name="schedule/index" options={{ title: '일정', tabBarIcon: ({ focused }) => <TabIcon icon="📅" focused={focused} /> }} />
      <Tabs.Screen name="songs/index" options={{ title: '특송', tabBarIcon: ({ focused }) => <TabIcon icon="🎵" focused={focused} /> }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}
