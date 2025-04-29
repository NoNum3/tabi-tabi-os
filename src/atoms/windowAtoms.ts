import { atom } from "jotai";
import { loadFeatureState, saveFeatureState } from "../utils/storage";
import { Position, Size } from "../types"; // Assuming types are defined here
import { appRegistry } from "@/config/appRegistry"; // Import appRegistry for icons

const FEATURE_KEY = "windows";

// Define the shape of a single window's state
export interface WindowState {
  id: string; // Unique ID for each window instance
  appId: string; // Identifier for the type of app (e.g., 'podomoro', 'todoList')
  title: string;
  position: Position;
  size: Size;
  minSize?: Size;
  isOpen: boolean; // To track if the window should be rendered (visible)
  isMinimized: boolean; // NEW: To track minimized state for the taskbar
  zIndex: number; // To manage stacking order
}

// Define the shape of the overall window management state
export type WindowRegistryState = {
  [id: string]: WindowState; // Store windows in an object for easier access by ID
};

// --- Helper Functions ---

// Function to get the next highest zIndex
const getNextZIndex = (registry: WindowRegistryState): number => {
  const zIndexes = Object.values(registry).map((win) => win.zIndex);
  return zIndexes.length > 0 ? Math.max(...zIndexes) + 1 : 1000; // Start z-index from 1000
};

// --- Atoms ---

// Default state, ensuring new fields have defaults
const getDefaultWindowState = (): WindowRegistryState => ({});

// Create initial state atom with safe client-side initialization
const getInitialState = (): WindowRegistryState => {
  if (typeof window === "undefined") {
    return getDefaultWindowState();
  }
  const loaded = loadFeatureState<WindowRegistryState>(FEATURE_KEY);
  // Ensure loaded state includes the isMinimized flag
  if (loaded) {
    Object.keys(loaded).forEach((key) => {
      if (loaded[key].isMinimized === undefined) {
        loaded[key].isMinimized = false;
      }
    });
  }
  return loaded ?? getDefaultWindowState();
};

// Create the base atom with proper initialization
const baseWindowsAtom = atom<WindowRegistryState>(getInitialState());

// Create a derived atom that saves to localStorage on change
export const windowRegistryAtom = atom(
  (get) => get(baseWindowsAtom),
  (
    get,
    set,
    newRegistry:
      | WindowRegistryState
      | ((prevRegistry: WindowRegistryState) => WindowRegistryState),
  ) => {
    const updatedRegistry = typeof newRegistry === "function"
      ? newRegistry(get(baseWindowsAtom))
      : newRegistry;
    set(baseWindowsAtom, updatedRegistry);
    if (typeof window !== "undefined") {
      saveFeatureState(FEATURE_KEY, updatedRegistry);
    }
  },
);

// Atom to get an array of currently VISIBLE windows, sorted by zIndex
export const openWindowsAtom = atom(
  (get) =>
    Object.values(get(windowRegistryAtom))
      .filter((win) => win.isOpen && !win.isMinimized) // Only show open AND not minimized windows
      .sort((a, b) => a.zIndex - b.zIndex),
);

// NEW: Atom to get info for ALL registered windows (for taskbar)
// Includes minimized windows, excludes closed ones (removed from registry)
export const taskbarAppsAtom = atom((get) => {
  const registry = get(windowRegistryAtom);
  const highestZIndex = getNextZIndex(registry) - 1;
  // Filter first: Only include windows that are open OR minimized
  return Object.values(registry)
    .filter((win) => win.isOpen || win.isMinimized)
    // Add icon source and active status
    .map((win) => ({
      ...win,
      iconSrc: appRegistry[win.appId]?.src || "/icons/settings.png", // Fallback icon
      // isActive is true only if the window is the top-most AND not minimized
      isActive: win.zIndex === highestZIndex && win.isOpen && !win.isMinimized,
    }))
    .sort((a, b) => a.zIndex - b.zIndex); // Consider sorting by open order or app ID?
});

// --- Window Management Action Atoms (Write-only) ---

// Atom to open/create a new window or bring an existing one to front
export const openWindowAtom = atom(
  null,
  (
    get,
    set,
    windowConfig:
      & Omit<
        WindowState,
        "isOpen" | "zIndex" | "position" | "size" | "isMinimized"
      >
      & { initialPosition?: Position; initialSize: Size },
  ) => {
    const currentRegistry = get(windowRegistryAtom);
    const existingWindow = currentRegistry[windowConfig.id];

    if (existingWindow) {
      // If window exists, bring it to front and ensure it's open and not minimized
      set(windowRegistryAtom, (prev) => ({
        ...prev,
        [existingWindow.id]: {
          ...existingWindow,
          isOpen: true,
          isMinimized: false, // Ensure not minimized when opened/focused
          zIndex: getNextZIndex(prev),
        },
      }));
    } else {
      // If window doesn't exist, create it
      const nextZIndex = getNextZIndex(currentRegistry);
      const defaultPosition = windowConfig.initialPosition ??
        { x: 50 + Math.random() * 100, y: 50 + Math.random() * 100 };
      const newWindow: WindowState = {
        ...windowConfig,
        position: defaultPosition,
        size: windowConfig.initialSize,
        isOpen: true,
        isMinimized: false, // Ensure not minimized initially
        zIndex: nextZIndex,
      };
      set(windowRegistryAtom, (prev) => ({
        ...prev,
        [newWindow.id]: newWindow,
      }));
    }
  },
);

// Atom to close a window (removes it from state)
export const closeWindowAtom = atom(null, (get, set, windowId: string) => {
  set(windowRegistryAtom, (prev) => {
    const newState = { ...prev };
    delete newState[windowId]; // Remove completely
    return newState;
  });
});

// Atom to bring a window to the front
export const focusWindowAtom = atom(null, (get, set, windowId: string) => {
  set(windowRegistryAtom, (prev) => {
    const windowToFocus = prev[windowId];
    if (!windowToFocus) return prev; // Window doesn't exist

    const maxZIndex = getNextZIndex(prev) - 1;

    // Bring to front and ensure it's visible and not minimized
    if (
      windowToFocus.zIndex < maxZIndex || !windowToFocus.isOpen ||
      windowToFocus.isMinimized
    ) {
      return {
        ...prev,
        [windowId]: {
          ...windowToFocus,
          isOpen: true, // Ensure open
          isMinimized: false, // Ensure not minimized
          zIndex: maxZIndex + 1, // Assign new highest zIndex
        },
      };
    }
    return prev; // No change needed if already top, open, and not minimized
  });
});

// NEW: Atom to minimize a window
export const minimizeWindowAtom = atom(null, (get, set, windowId: string) => {
  set(windowRegistryAtom, (prev) => {
    const windowToMinimize = prev[windowId];
    if (!windowToMinimize || windowToMinimize.isMinimized) return prev; // Already minimized or doesn't exist

    return {
      ...prev,
      [windowId]: {
        ...windowToMinimize,
        isMinimized: true,
        // Keep zIndex, position, size
      },
    };
  });
});

// NEW: Atom to handle taskbar icon clicks (toggle minimize/focus)
export const toggleTaskbarAtom = atom(null, (get, set, windowId: string) => {
  const registry = get(windowRegistryAtom);
  const windowState = registry[windowId];
  if (!windowState) return; // Should not happen

  const maxZIndex = getNextZIndex(registry) - 1;
  const isTopWindow = windowState.zIndex === maxZIndex && windowState.isOpen &&
    !windowState.isMinimized;

  if (isTopWindow) {
    // If it's the top, visible window -> minimize it
    set(minimizeWindowAtom, windowId);
  } else {
    // If it's minimized OR just not the top window -> focus it (which also unminimizes)
    set(focusWindowAtom, windowId);
  }
});

// Atom to update a window's position and size (e.g., after drag/resize)
export const updateWindowPositionSizeAtom = atom(
  null,
  (
    get,
    set,
    { id, position, size }: { id: string; position: Position; size: Size },
  ) => {
    set(windowRegistryAtom, (prev) => {
      const windowToUpdate = prev[id];
      if (!windowToUpdate) return prev;
      // Ensure it's not minimized when moved/resized?
      // No, let minimized windows keep their state.
      return {
        ...prev,
        [id]: { ...windowToUpdate, position, size },
      };
    });
  },
);
