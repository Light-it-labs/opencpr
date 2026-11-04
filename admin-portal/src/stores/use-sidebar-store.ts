import { create } from "zustand";
import { persist } from "zustand/middleware";

type SidebarStoreState = {
  isExpanded: boolean;
};

type SidebarStoreActions = {
  toggle: () => void;
};

type SidebarStore = SidebarStoreState & SidebarStoreActions;

export const useSidebarStore = create<SidebarStore>()(
  persist(
    (set) => {
      return {
        isExpanded: true,

        toggle: () => {
          return set((state) => {
            return { isExpanded: !state.isExpanded };
          });
        },
      };
    },
    {
      name: "sidebar-storage",
      partialize: (state) => {
        return { isExpanded: state.isExpanded };
      },
    },
  ),
);
