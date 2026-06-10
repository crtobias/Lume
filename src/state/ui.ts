import { create } from "zustand";

export type SidebarView = "explorer" | "search" | "scm";

interface UIState {
  sidebarView: SidebarView;
  setSidebarView: (v: SidebarView) => void;
  panelOpen: boolean;
  togglePanel: () => void;
  panelHeight: number;
  setPanelHeight: (h: number) => void;
  panelMaximized: boolean;
  togglePanelMax: () => void;
}

const MIN_PANEL = 80;

export const useUIStore = create<UIState>((set) => ({
  sidebarView: "explorer",
  setSidebarView: (v) => set({ sidebarView: v }),
  panelOpen: true,
  togglePanel: () =>
    set((s) => ({ panelOpen: !s.panelOpen, panelMaximized: false })),
  panelHeight: 260,
  setPanelHeight: (h) => set({ panelHeight: Math.max(MIN_PANEL, h) }),
  panelMaximized: false,
  togglePanelMax: () =>
    set((s) => ({
      panelMaximized: !s.panelMaximized,
      panelOpen: true,
    })),
}));
