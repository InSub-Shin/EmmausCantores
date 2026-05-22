import { create } from 'zustand';
import { Vote, Song } from '@/types';

interface HomeNavigationStore {
  selectedVote: Vote | null;
  setSelectedVote: (vote: Vote | null) => void;
  selectedSong: Song | null;
  setSelectedSong: (song: Song | null) => void;
}

export const useHomeNavigationStore = create<HomeNavigationStore>((set) => ({
  selectedVote: null,
  setSelectedVote: (vote) => set({ selectedVote: vote }),
  selectedSong: null,
  setSelectedSong: (song) => set({ selectedSong: song }),
}));
