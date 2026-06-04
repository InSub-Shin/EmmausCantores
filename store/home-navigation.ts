import { create } from 'zustand';
import { Vote, Song, Post } from '@/types';

interface HomeNavigationStore {
  selectedVote: Vote | null;
  setSelectedVote: (vote: Vote | null) => void;
  selectedSong: Song | null;
  setSelectedSong: (song: Song | null) => void;
  selectedPost: Post | null;
  setSelectedPost: (post: Post | null) => void;
}

export const useHomeNavigationStore = create<HomeNavigationStore>((set) => ({
  selectedVote: null,
  setSelectedVote: (vote) => set({ selectedVote: vote }),
  selectedSong: null,
  setSelectedSong: (song) => set({ selectedSong: song }),
  selectedPost: null,
  setSelectedPost: (post) => set({ selectedPost: post }),
}));
