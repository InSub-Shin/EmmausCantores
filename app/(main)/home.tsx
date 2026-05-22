import { View, Text, ScrollView, TouchableOpacity, Alert, FlatList } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/auth';
import { useHomeNavigationStore } from '@/store/home-navigation';
import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { Vote, Song } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function HomeScreen() {
  const { profile, signOut } = useAuthStore();
  const { setSelectedVoteId, setSelectedSongId } = useHomeNavigationStore();
  const [unreadVotes, setUnreadVotes] = useState<Vote[]>([]);
  const [unreadSongs, setUnreadSongs] = useState<Song[]>([]);
  const [viewedSongIds, setViewedSongIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return '좋은 아침이에요';
    if (h < 18) return '좋은 오후예요';
    return '좋은 저녁이에요';
  })();

  // 확인한 특송 ID 로드
  const loadViewedSongs = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('viewedSongIds');
      if (stored) {
        setViewedSongIds(new Set(JSON.parse(stored)));
      }
    } catch (error) {
      console.error('특송 확인 상태 로드 오류:', error);
    }
  }, []);

  // 미확인 투표 조회
  const fetchUnreadVotes = useCallback(async () => {
    try {
      // 모든 투표 가져오기
      const { data: allVotes } = await supabase
        .from('votes')
        .select(`*, items:vote_items(*, responses:vote_responses(user_id))`)
        .order('created_at', { ascending: false });

      if (allVotes && profile) {
        // 사용자가 투표하지 않은 투표 필터링
        const unvoted = allVotes.filter((vote) => {
          const hasVoted = vote.items?.some((item: any) =>
            item.responses?.some((r: any) => r.user_id === profile.id)
          );
          return !hasVoted;
        });
        setUnreadVotes(unvoted as unknown as Vote[]);
      }
    } catch (error) {
      console.error('투표 조회 오류:', error);
    }
  }, [profile]);

  // 미확인 특송 조회
  const fetchUnreadSongs = useCallback(async () => {
    try {
      const { data: recentSongs } = await supabase
        .from('songs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentSongs && viewedSongIds.size > 0) {
        // 확인하지 않은 특송만 필터링
        const unread = recentSongs.filter((song) => !viewedSongIds.has(song.id));
        setUnreadSongs(unread as unknown as Song[]);
      } else if (recentSongs) {
        setUnreadSongs(recentSongs as unknown as Song[]);
      }
    } catch (error) {
      console.error('특송 조회 오류:', error);
    }
  }, [viewedSongIds]);

  // 초기 로드
  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      await loadViewedSongs();
      await fetchUnreadVotes();
      await fetchUnreadSongs();
      setLoading(false);
    };
    initialize();
  }, [loadViewedSongs, fetchUnreadVotes, fetchUnreadSongs]);

  // 특송 확인 처리
  const markSongAsViewed = useCallback(async (songId: string) => {
    try {
      const newViewed = new Set(viewedSongIds);
      newViewed.add(songId);
      setViewedSongIds(newViewed);
      await AsyncStorage.setItem('viewedSongIds', JSON.stringify(Array.from(newViewed)));

      // 미확인 특송 목록 업데이트
      setUnreadSongs((prev) => prev.filter((s) => s.id !== songId));
    } catch (error) {
      console.error('특송 확인 상태 저장 오류:', error);
    }
  }, [viewedSongIds]);

  // 투표 완료 후 미확인 목록 업데이트
  const onVoteComplete = useCallback((voteId: string) => {
    setUnreadVotes((prev) => prev.filter((v) => v.id !== voteId));
  }, []);

  const unreadCount = unreadVotes.length + unreadSongs.length;

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
        {/* 헤더 */}
        <View className="flex-row items-center justify-between mb-6">
          <View>
            <Text className="text-gray-500 text-sm">{greeting} 👋</Text>
            <Text className="text-2xl font-bold text-gray-900">
              {profile?.name ?? '단원'}님
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(main)/profile')}
            className="w-12 h-12 bg-indigo-100 rounded-full items-center justify-center"
          >
            <Text className="text-xl">👤</Text>
          </TouchableOpacity>
        </View>

        {/* 미확인 알림 대시보드 */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-bold text-gray-800">🔔 미확인 알림</Text>
            {unreadCount > 0 && (
              <View className="bg-red-500 rounded-full px-2.5 py-0.5">
                <Text className="text-white text-xs font-bold">{unreadCount}개</Text>
              </View>
            )}
          </View>

          {unreadCount === 0 ? (
            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
              <Text className="text-center text-green-700 font-medium">
                ✅ 모든 알림을 확인했습니다!
              </Text>
            </Card>
          ) : (
            <View className="gap-3">
              {/* 미확인 투표 */}
              {unreadVotes.length > 0 && (
                <View>
                  <View className="flex-row items-center mb-2">
                    <Text className="text-base font-bold text-gray-800">🗳️ 참여 대기 투표</Text>
                    <View className="bg-red-500 rounded-full px-2 ml-2">
                      <Text className="text-white text-xs font-bold">{unreadVotes.length}</Text>
                    </View>
                  </View>

                  {unreadVotes.slice(0, 3).map((vote) => (
                    <TouchableOpacity
                      key={vote.id}
                      onPress={() => {
                        setSelectedVoteId(vote.id);
                        router.push('/(main)/votes');
                      }}
                      className="bg-white border border-red-200 rounded-lg p-3 mb-2"
                    >
                      <View className="flex-row items-start justify-between">
                        <View className="flex-1">
                          <Text className="text-gray-900 font-semibold text-sm line-clamp-1">
                            {vote.title}
                          </Text>
                          {vote.ends_at && (
                            <Text className="text-xs text-gray-500 mt-1">
                              종료: {format(new Date(vote.ends_at), 'M월 d일 HH:mm', { locale: ko })}
                            </Text>
                          )}
                        </View>
                        <Text className="text-lg">→</Text>
                      </View>
                    </TouchableOpacity>
                  ))}

                  {unreadVotes.length > 3 && (
                    <TouchableOpacity
                      onPress={() => router.push('/(main)/votes')}
                      className="items-center py-2"
                    >
                      <Text className="text-red-500 text-sm font-medium">
                        +{unreadVotes.length - 3}개 더보기
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* 미확인 특송 */}
              {unreadSongs.length > 0 && (
                <View>
                  <View className="flex-row items-center mb-2">
                    <Text className="text-base font-bold text-gray-800">🎵 새로운 특송</Text>
                    <View className="bg-blue-500 rounded-full px-2 ml-2">
                      <Text className="text-white text-xs font-bold">{unreadSongs.length}</Text>
                    </View>
                  </View>

                  {unreadSongs.map((song) => (
                    <View key={song.id} className="bg-white border border-blue-200 rounded-lg p-3 mb-2">
                      <View className="flex-row items-start justify-between">
                        <View className="flex-1">
                          <Text className="text-gray-900 font-semibold text-sm line-clamp-1">
                            {song.title}
                          </Text>
                          {song.description && (
                            <Text className="text-xs text-gray-500 mt-1 line-clamp-1">
                              {song.description}
                            </Text>
                          )}
                        </View>
                      </View>

                      <View className="flex-row gap-2 mt-2">
                        <TouchableOpacity
                          onPress={() => {
                            markSongAsViewed(song.id);
                          }}
                          className="flex-1 bg-blue-50 rounded py-1.5 items-center"
                        >
                          <Text className="text-blue-600 text-xs font-medium">확인</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => {
                            setSelectedSongId(song.id);
                            router.push('/(main)/songs');
                          }}
                          className="flex-1 bg-blue-500 rounded py-1.5 items-center"
                        >
                          <Text className="text-white text-xs font-medium">상세보기</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>

        {/* 바로가기 메뉴 */}
        <Text className="text-lg font-bold text-gray-800 mb-3">바로가기</Text>
        <View className="flex-row flex-wrap gap-3 mb-6">
          {[
            { icon: '👥', label: '단원 목록', href: '/(main)/members' as const },
            { icon: '🗳️', label: '투표', href: '/(main)/votes' as const },
            { icon: '📅', label: '일정', href: '/(main)/schedule' as const },
            { icon: '🎵', label: '특송 정보', href: '/(main)/songs' as const },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              onPress={() => router.push(item.href)}
              className="bg-white rounded-2xl p-4 items-center border border-gray-100 shadow-sm"
              style={{ width: '47%' }}
            >
              <Text className="text-3xl mb-2">{item.icon}</Text>
              <Text className="text-gray-700 font-medium text-sm">{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 로그아웃 */}
        <TouchableOpacity
          onPress={async () => {
            await signOut();
            router.replace('/(auth)/login');
          }}
          className="items-center py-3"
        >
          <Text className="text-gray-400 text-sm">로그아웃</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
