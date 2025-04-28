import { atom } from "jotai";
import { loadFeatureState, saveFeatureState } from "../utils/storage";

interface Song {
  url: string;
  title: string;
  id?: string;
  seqId?: number;
}

// Define the shape of the persisted state
interface MusicPlayerState {
  playlist: Song[];
  currentSongIndex: number;
  isPlaying: boolean;
  isWindowOpen: boolean;
  currentTime: number;
  volume: number;
}

const defaultSongs: Song[] = [
  {
    url: "https://www.youtube.com/watch?v=lTRiuFIWV54",
    title: "Lo-fi Study Session",
    id: "lTRiuFIWV54",
  },
  {
    url: "https://www.youtube.com/watch?v=Fp5ghKduTK8",
    title: "Ghibli Piano",
    id: "Fp5ghKduTK8",
  },
  {
    url: "https://www.youtube.com/watch?v=KxJrYKoTeXA",
    title: "Jazzjeans",
    id: "KxJrYKoTeXA",
  },
  {
    url: "https://www.youtube.com/watch?v=pfU0QORkRpY",
    title: "FKJ Live",
    id: "pfU0QORkRpY",
  },
  {
    url: "https://www.youtube.com/watch?v=ot5UsNymqgQ",
    title: "Cozy Room",
    id: "ot5UsNymqgQ",
  },
];

const FEATURE_KEY = "musicPlayer";

// Default state object
const defaultMusicPlayerState: MusicPlayerState = {
  playlist: defaultSongs,
  currentSongIndex: 0,
  isPlaying: false,
  isWindowOpen: false,
  currentTime: 0,
  volume: 0.7,
};

// Get stored state or use defaults - SAFE INITIALIZATION
const getInitialState = (): MusicPlayerState => {
  // Only access localStorage on the client
  if (typeof window === "undefined") {
    return defaultMusicPlayerState;
  }
  return loadFeatureState<MusicPlayerState>(FEATURE_KEY) ??
    defaultMusicPlayerState;
};

// --- Base Atom ---
// The single source of truth for persisted state, initialized safely
const baseMusicPlayerAtom = atom<MusicPlayerState>(getInitialState());

// --- Persisted State Atom (Handles Reading/Writing to Base and Storage) ---
export const musicPlayerStateAtom = atom(
  (get) => get(baseMusicPlayerAtom),
  (
    get,
    set,
    update: MusicPlayerState | ((prev: MusicPlayerState) => MusicPlayerState),
  ) => {
    const newState = typeof update === "function"
      ? update(get(baseMusicPlayerAtom))
      : update;
    set(baseMusicPlayerAtom, newState);
    // Only save on client
    if (typeof window !== "undefined") {
      saveFeatureState(FEATURE_KEY, newState);
    }
  },
);

// --- Derived Atoms for Component Access ---

// Playlist
export const playlistAtom = atom(
  (get) => get(musicPlayerStateAtom).playlist,
  (get, set, newPlaylist: Song[]) => {
    set(musicPlayerStateAtom, (prev) => ({ ...prev, playlist: newPlaylist }));
  },
);

// Current Song Index
export const currentSongIndexAtom = atom(
  (get) => get(musicPlayerStateAtom).currentSongIndex,
  (get, set, newIndex: number) => {
    const playlist = get(playlistAtom); // Use derived atom getter is fine
    const safeIndex = playlist.length > 0
      ? ((newIndex % playlist.length) + playlist.length) % playlist.length
      : 0;
    set(
      musicPlayerStateAtom,
      (prev) => ({ ...prev, currentSongIndex: safeIndex }),
    );
  },
);

// Playing State
export const playingAtom = atom(
  (get) => get(musicPlayerStateAtom).isPlaying,
  (get, set, isPlaying: boolean) => {
    set(musicPlayerStateAtom, (prev) => ({ ...prev, isPlaying }));
  },
);

// Current Time
export const currentTimeAtom = atom(
  (get) => get(musicPlayerStateAtom).currentTime,
  (get, set, newTime: number) => {
    set(musicPlayerStateAtom, (prev) => ({ ...prev, currentTime: newTime }));
  },
);

// Window Open State
export const isWindowOpenAtom = atom(
  (get) => get(musicPlayerStateAtom).isWindowOpen,
  (get, set, isOpen: boolean) => {
    set(musicPlayerStateAtom, (prev) => ({ ...prev, isWindowOpen: isOpen }));
  },
);

// Volume
export const volumeAtom = atom(
  (get) => get(musicPlayerStateAtom).volume,
  (get, set, newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume)); // Ensure volume is 0-1
    set(musicPlayerStateAtom, (prev) => ({ ...prev, volume: clampedVolume }));
  },
);

// --- Non-persisted atoms for player UI state (remain unchanged) ---
export const durationAtom = atom<number>(0);
export const playedSecondsAtom = atom<number>(0);
export const seekingAtom = atom<boolean>(false);
export const showVideoAtom = atom<boolean>(false);

// --- Derived atoms (remain largely unchanged, use new derived atoms) ---
export const currentSongAtom = atom<Song | null>((get) => {
  const playlist = get(playlistAtom); // Read from derived atom
  const index = get(currentSongIndexAtom); // Read from derived atom

  if (playlist.length === 0) return null;
  // Use the validated index from currentSongIndexAtom logic
  return playlist[index] || null;
});

// --- Persistence Atom (Simplified - now just triggers save on base atom changes) ---
// We can still keep this atom if components rely on it to explicitly trigger saves,
// but the main saving logic is now in musicPlayerStateAtom's write function.
// Let's make it simpler or potentially remove if not strictly needed.
// For now, let's make it just trigger a read/write on the main state atom
// to ensure the save logic runs if needed (though technically setting any
// derived atom already triggers it).
export const persistMusicPlayerState = atom(
  null, // Read function is null
  (get, set, update: Partial<MusicPlayerState>) => {
    set(musicPlayerStateAtom, (prev) => ({ ...prev, ...update }));
  },
);

// --- Action atoms (Need to use the new derived setter atoms) ---

// Now handled by the write function of currentSongIndexAtom
// export const setCurrentSongIndexAtom = atom(...)

export const nextSongAtom = atom(null, (get, set) => {
  const playlist = get(playlistAtom);
  if (playlist.length <= 1) return;
  const currentIndex = get(currentSongIndexAtom);
  set(currentSongIndexAtom, currentIndex + 1); // Setter handles validation and persistence
  set(currentTimeAtom, 0); // Reset time
  set(playingAtom, true); // Usually start playing next
});

export const previousSongAtom = atom(null, (get, set) => {
  const playlist = get(playlistAtom);
  if (playlist.length <= 1) return;
  const currentIndex = get(currentSongIndexAtom);
  set(currentSongIndexAtom, currentIndex - 1); // Setter handles validation and persistence
  set(currentTimeAtom, 0); // Reset time
  set(playingAtom, true); // Usually start playing previous
});

export const addSongAtom = atom(null, (get, set, newSong: Song) => {
  const currentPlaylist = get(playlistAtom);
  // Assign seqId if needed - find max current seqId
  const maxSeqId = Math.max(0, ...currentPlaylist.map((s) => s.seqId ?? 0));
  const songWithId = { ...newSong, seqId: maxSeqId + 1 };
  const newPlaylist = [...currentPlaylist, songWithId];
  set(playlistAtom, newPlaylist); // Use derived setter

  // If this is the first song, select it
  if (currentPlaylist.length === 0) {
    set(currentSongIndexAtom, 0); // Use derived setter
  }
});

export const removeSongAtom = atom(null, (get, set, indexToRemove: number) => {
  const playlist = get(playlistAtom);
  const currentIndex = get(currentSongIndexAtom);

  if (indexToRemove < 0 || indexToRemove >= playlist.length) return;

  const newPlaylist = playlist.filter((_, index) => index !== indexToRemove);
  set(playlistAtom, newPlaylist); // Use derived setter

  // Adjust current index if needed
  if (newPlaylist.length === 0) {
    set(currentSongIndexAtom, 0); // Use derived setter
    set(playingAtom, false); // Use derived setter
  } else if (indexToRemove === currentIndex) {
    // Currently playing song was removed
    // The setter for currentSongIndexAtom handles wrapping/clamping
    set(currentSongIndexAtom, currentIndex); // Re-set to trigger validation
    set(currentTimeAtom, 0); // Reset time
  } else if (indexToRemove < currentIndex) {
    // If we removed a song before the current one, adjust the index
    set(currentSongIndexAtom, currentIndex - 1); // Use derived setter
  }
});

export const updateSongTitleAtom = atom(
  null,
  (get, set, params: { index: number; title: string }) => {
    const { index, title } = params;
    const playlist = get(playlistAtom);

    if (index < 0 || index >= playlist.length) return;

    const updatedPlaylist = [...playlist];
    updatedPlaylist[index] = {
      ...updatedPlaylist[index],
      title: title.trim() || `Song ${index + 1}`, // Fallback if empty
    };

    set(playlistAtom, updatedPlaylist); // Use derived setter
  },
);

// Helper to extract YouTube video ID from URL
export function getYoutubeId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}
