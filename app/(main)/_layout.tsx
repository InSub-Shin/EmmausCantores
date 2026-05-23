import { Tabs } from 'expo-router';
import { Text, Platform, Dimensions, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{icon}</Text>;
}

function useBottomInset() {
  const insets = useSafeAreaInsets();
  if (Platform.OS !== 'android') return insets.bottom;

  // useSafeAreaInsets가 일부 갤럭시 기기에서 0을 반환하는 경우를 보완.
  // 화면 전체 높이 - 앱 윈도우 높이 - 상태바 높이 = 실제 네비게이션 바 높이
  const screen = Dimensions.get('screen');
  const window = Dimensions.get('window');
  const detectedNavBar = Math.max(0, screen.height - window.height - (StatusBar.currentHeight ?? 0));
  return Math.max(insets.bottom, detectedNavBar);
}

export default function MainLayout() {
  const bottomInset = useBottomInset();
  const bottomPadding = Math.max(bottomInset, 8);

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
