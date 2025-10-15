import { create, type StateCreator } from 'zustand';
import { devtools } from 'zustand/middleware';

export type NavigationVariant = 'expanded' | 'collapsed';

export type UiState = {
  navigation: NavigationVariant;
  isQueryDevtoolsVisible: boolean;
  setNavigation: (variant: NavigationVariant) => void;
  toggleNavigation: () => void;
  setQueryDevtoolsVisibility: (visible: boolean) => void;
  toggleQueryDevtools: () => void;
};

type UiStateCreator = StateCreator<UiState, [['zustand/devtools', never]]>;

const createUiStore: UiStateCreator = (set) => ({
  navigation: 'expanded',
  isQueryDevtoolsVisible: false,
  setNavigation: (variant: NavigationVariant) => set({ navigation: variant }),
  toggleNavigation: () =>
    set((state) => ({ navigation: state.navigation === 'expanded' ? 'collapsed' : 'expanded' })),
  setQueryDevtoolsVisibility: (visible: boolean) => set({ isQueryDevtoolsVisible: visible }),
  toggleQueryDevtools: () =>
    set((state) => ({ isQueryDevtoolsVisible: !state.isQueryDevtoolsVisible })),
});

// Enable devtools only in development and only if Redux DevTools extension is present
const devtoolsEnabled =
  import.meta.env.DEV &&
  typeof window !== 'undefined' &&
  !!(window as unknown as Record<string, unknown>).__REDUX_DEVTOOLS_EXTENSION__;

export const useUiStore = create<UiState>()(
  devtools(createUiStore, { name: 'ui-store', enabled: devtoolsEnabled }),
);
