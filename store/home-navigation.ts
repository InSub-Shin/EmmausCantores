import { create } from 'zustand';

interface HomeNavigationStore {
  selectedVoteId: string | null;
  setSelectedVoteId: (id: string | null) => void;
  selectedSongId: string | null;
  setSelectedSongId: (id: string | null) => void;
}

export const useHomeNavigationStore = create<HomeNavigationStore>((set) => ({
  selectedVoteId: null,
  setSelectedVoteId: (id) => set({ selectedVoteId: id }),
  selectedSongId: null,
  setSelectedSongId: (id) => set({ selectedSongId: id }),
}));
