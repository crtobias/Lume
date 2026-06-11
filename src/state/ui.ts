import { create } from "zustand";

export type SidebarView = "explorer" | "search" | "scm";
export type Overlay = "palette" | "settings" | null;

interface UIState {
  sidebarView: SidebarView;
  setSidebarView: (v: SidebarView) => void;
  sidebarVisible: boolean;
  toggleSidebar: () => void;
  panelOpen: boolean;
  togglePanel: () => void;
  panelHeight: number;
  setPanelHeight: (h: number) => void;
  panelMaximized: boolean;
  togglePanelMax: () => void;
  overlay: Overlay;
  setOverlay: (o: Overlay) => void;
  toggleOverlay: (o: Exclude<Overlay, null>) => void;
}

const MIN_PANEL = 80;

export const useUIStore = create<UIState>((set) => ({
  sidebarView: "explorer",
  setSidebarView: (v) => set({ sidebarView: v }),
  sidebarVisible: true,
  toggleSidebar: () => set((s) => ({ sidebarVisible: !s.sidebarVisible })),
  panelOpen: true,
  togglePanel: () =>
    set((s) => ({ panelOpen: !s.panelOpen, panelMaximized: false })),
  panelHeight: 198,
  setPanelHeight: (h) => set({ panelHeight: Math.max(MIN_PANEL, h) }),
  panelMaximized: false,
  togglePanelMax: () =>
    set((s) => ({
      panelMaximized: !s.panelMaximized,
      panelOpen: true,
    })),
  overlay: null,
  setOverlay: (o) => set({ overlay: o }),
  toggleOverlay: (o) => set((s) => ({ overlay: s.overlay === o ? null : o })),
}));
