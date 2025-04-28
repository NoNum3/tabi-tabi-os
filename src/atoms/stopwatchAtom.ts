// import { atomWithStorage, createJSONStorage } from "jotai/utils"; // No longer using atomWithStorage directly
import { atom } from "jotai";
import { loadFeatureState, saveFeatureState } from "@/utils/storage"; // Use your storage utils

const FEATURE_KEY = "stopwatchState"; // Use the same key as before

// Define the shape of the stopwatch state
interface StopwatchState {
    time: number; // Time in milliseconds
    isRunning: boolean;
    laps: number[];
}

// Default state
const defaultStopwatchState: StopwatchState = {
    time: 0,
    isRunning: false,
    laps: [],
};

// Get stored state or use defaults - SAFE INITIALIZATION
const getInitialState = (): StopwatchState => {
    // Only access localStorage on the client
    if (typeof window === "undefined") {
        return defaultStopwatchState;
    }
    return loadFeatureState<StopwatchState>(FEATURE_KEY) ??
        defaultStopwatchState;
};

// --- Base Atom ---
// The single source of truth for persisted state, initialized safely
const baseStopwatchAtom = atom<StopwatchState>(getInitialState());

// --- Persisted State Atom (Handles Reading/Writing to Base and Storage) ---
export const stopwatchStateAtom = atom(
    (get) => get(baseStopwatchAtom),
    (
        get,
        set,
        update: StopwatchState | ((prev: StopwatchState) => StopwatchState),
    ) => {
        const newState = typeof update === "function"
            ? update(get(baseStopwatchAtom))
            : update;
        set(baseStopwatchAtom, newState);
        // Only save on client
        if (typeof window !== "undefined") {
            saveFeatureState(FEATURE_KEY, newState);
        }
    },
);

// Derived atoms are no longer strictly necessary as the component
// now reads/writes the whole stopwatchStateAtom object.
// You could re-add them if needed for other components later.

// export const stopwatchTimeAtom = atom(...);
// export const stopwatchIsRunningAtom = atom(...);
// export const stopwatchLapsAtom = atom(...);
