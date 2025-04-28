import { atom } from "jotai";
import { loadFeatureState, saveFeatureState } from "../utils/storage";

// Define the interface for an ambience sound
export interface AmbienceSound {
  id: string;
  title: string;
  source: string;
}

// Define the shape of the persisted state
interface AmbiencePlayerState {
  currentSoundIndex: number;
  isPlaying: boolean;
  volume: number;
  isWindowOpen: boolean;
  currentTime: number;
}

// Create a list of ambience sounds
export const ambienceSounds: AmbienceSound[] = [
  {
    id: "rain",
    title: "Gentle Rain",
    source: "/sounds/ambience/rain.mp3",
  },
  {
    id: "forest",
    title: "Forest Sounds",
    source: "/sounds/ambience/forest.mp3",
  },
  {
    id: "river",
    title: "Flowing River",
    source: "/sounds/ambience/river.mp3",
  },
  {
    id: "ocean",
    title: "Ocean Waves",
    source: "/sounds/ambience/ocean.mp3",
  },
  {
    id: "thunder",
    title: "Thunderstorm",
    source: "/sounds/ambience/thunder.mp3",
  },
  {
    id: "night",
    title: "Calm Night",
    source: "/sounds/ambience/night.mp3",
  },
  {
    id: "fireplace",
    title: "Fireplace",
    source: "/sounds/ambience/fireplace.mp3",
  },
  {
    id: "cafe",
    title: "Coffee Shop",
    source: "/sounds/ambience/cafe.mp3",
  },
  {
    id: "park",
    title: "Park Ambience",
    source: "/sounds/ambience/park.mp3",
  },
  {
    id: "coffee",
    title: "Making a coffee",
    source: "/sounds/ambience/making-a-coffee-latte.mp3",
  },
];

const FEATURE_KEY = "ambiencePlayer";

// Default state object
const defaultAmbiencePlayerState: AmbiencePlayerState = {
  currentSoundIndex: 0,
  isPlaying: false,
  volume: 0.7,
  isWindowOpen: false,
  currentTime: 0,
};

// Get stored state or use defaults - SAFE INITIALIZATION
const getInitialState = (): AmbiencePlayerState => {
  // Only access localStorage on the client
  if (typeof window === "undefined") {
    return defaultAmbiencePlayerState;
  }
  return loadFeatureState<AmbiencePlayerState>(FEATURE_KEY) ??
    defaultAmbiencePlayerState;
};

// --- Base Atom ---
// The single source of truth for persisted state, initialized safely
const baseAmbiencePlayerAtom = atom<AmbiencePlayerState>(getInitialState());

// --- Persisted State Atom (Handles Reading/Writing to Base and Storage) ---
export const ambiencePlayerStateAtom = atom(
  (get) => get(baseAmbiencePlayerAtom),
  (
    get,
    set,
    update:
      | AmbiencePlayerState
      | ((prev: AmbiencePlayerState) => AmbiencePlayerState),
  ) => {
    const newState = typeof update === "function"
      ? update(get(baseAmbiencePlayerAtom))
      : update;
    set(baseAmbiencePlayerAtom, newState);
    // Only save on client
    if (typeof window !== "undefined") {
      saveFeatureState(FEATURE_KEY, newState);
    }
  },
);

// --- Derived Atoms for Component Access ---

// Current Sound Index
export const currentSoundIndexAtom = atom(
  (get) => get(ambiencePlayerStateAtom).currentSoundIndex,
  (get, set, newIndex: number) => {
    const safeIndex = ambienceSounds.length > 0
      ? ((newIndex % ambienceSounds.length) + ambienceSounds.length) %
        ambienceSounds.length
      : 0;
    set(
      ambiencePlayerStateAtom,
      (prev) => ({ ...prev, currentSoundIndex: safeIndex }),
    );
  },
);

// Playing State
export const isPlayingAtom = atom(
  (get) => get(ambiencePlayerStateAtom).isPlaying,
  (get, set, isPlaying: boolean) => {
    set(ambiencePlayerStateAtom, (prev) => ({ ...prev, isPlaying }));
  },
);

// Volume
export const volumeAtom = atom(
  (get) => get(ambiencePlayerStateAtom).volume,
  (get, set, newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume)); // Ensure volume is 0-1
    set(
      ambiencePlayerStateAtom,
      (prev) => ({ ...prev, volume: clampedVolume }),
    );
  },
);

// Window Open State
export const isWindowOpenAtom = atom(
  (get) => get(ambiencePlayerStateAtom).isWindowOpen,
  (get, set, isOpen: boolean) => {
    set(ambiencePlayerStateAtom, (prev) => ({ ...prev, isWindowOpen: isOpen }));
  },
);

// Current Time
export const currentTimeAtom = atom(
  (get) => get(ambiencePlayerStateAtom).currentTime,
  (get, set, newTime: number) => {
    set(ambiencePlayerStateAtom, (prev) => ({ ...prev, currentTime: newTime }));
  },
);

// --- Derived atoms (Unchanged) ---
export const currentSoundAtom = atom((get) => {
  const currentIndex = get(currentSoundIndexAtom); // Use derived atom
  return ambienceSounds[currentIndex];
});

// --- Persistence Atom (Simplified) ---
export const persistAmbiencePlayerState = atom(
  null, // Read function is null
  (get, set, update: Partial<AmbiencePlayerState>) => {
    set(ambiencePlayerStateAtom, (prev) => ({ ...prev, ...update }));
  },
);
