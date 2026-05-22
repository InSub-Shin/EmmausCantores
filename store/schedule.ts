import { create } from 'zustand';

interface ScheduleStore {
  autoSelectDate: string | null;
  setAutoSelectDate: (date: string | null) => void;
}

export const useScheduleStore = create<ScheduleStore>((set) => ({
  autoSelectDate: null,
  setAutoSelectDate: (date) => set({ autoSelectDate: date }),
}));
