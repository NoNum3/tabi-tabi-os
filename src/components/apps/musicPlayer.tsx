"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAtom } from "jotai";
import ReactPlayer from "react-player/youtube";
import {
  Check,
  Pause,
  Pencil,
  Play,
  SkipBack,
  SkipForward,
  Trash2,
  Video,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

import {
  currentSongIndexAtom,
  currentTimeAtom,
  getYoutubeId,
  isWindowOpenAtom,
  persistMusicPlayerState,
  playingAtom,
  playlistAtom,
  volumeAtom,
} from "../../atoms/musicPlayerAtom";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

// Define an extended Song interface with a sequence ID
interface Song {
  id: string; // YouTube video ID
  url: string; // YouTube URL
  title: string; // Song title
  seqId: number; // Sequential ID for navigation
}

// Define a YouTube player interface for type safety
interface YouTubePlayerWithMethods {
  playVideo: () => void;
  pauseVideo: () => void;
  setVolume: (volume: number) => void;
  [key: string]: unknown; // Replace any with unknown for better type safety
}

// Create a global reference to ensure playback continues when window is closed
let globalYoutubePlayer: YouTubePlayerWithMethods | null = null;

// Flag to track if we're in a page unload state
let isPageUnloading = false;

// Set up beforeunload handler to prevent zombie audio
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    isPageUnloading = true;
    if (globalYoutubePlayer) {
      // Stop any playing audio when the page is about to unload
      try {
        if (typeof globalYoutubePlayer.pauseVideo === "function") {
          globalYoutubePlayer.pauseVideo();
        }
      } catch (e) {
        console.error("Error stopping YouTube playback on page unload:", e);
      }
    }
  });
}

const MusicPlayer: React.FC = () => {
  // Global state
  const [playlist, setPlaylist] = useAtom(playlistAtom);
  const [currentSongIndex, setCurrentSongIndex] = useAtom(currentSongIndexAtom);
  const [playing, setPlaying] = useAtom(playingAtom);
  const [isWindowOpen, setIsWindowOpen] = useAtom(isWindowOpenAtom);
  const [currentTime, setCurrentTime] = useAtom(currentTimeAtom);
  const [, persistState] = useAtom(persistMusicPlayerState);
  const [volume, setVolume] = useAtom(volumeAtom);

  // Local state
  const [duration, setDuration] = useState(0);
  const [playedSeconds, setPlayedSeconds] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [newSongUrl, setNewSongUrl] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [nextSeqId, setNextSeqId] = useState(1); // Track the next sequential ID to assign
  const [isLoading, setIsLoading] = useState(false);
  const [initialSyncDone, setInitialSyncDone] = useState(false);
  // Volume related state
  const [isMuted, setIsMuted] = useState(false);
  const [prevVolume, setPrevVolume] = useState(volume);

  // Refs
  const playerRef = useRef<ReactPlayer>(null);
  const ignoreEvents = useRef(false);
  const timeUpdateInterval = useRef<NodeJS.Timeout | null>(null);

  // Initialize the playlist with sequential IDs if they don't exist
  useEffect(() => {
    if (playlist.length > 0 && !("seqId" in playlist[0])) {
      const updatedPlaylist = playlist.map((song, index) => ({
        ...song,
        seqId: index + 1,
      }));
      setPlaylist(updatedPlaylist);
      setNextSeqId(playlist.length + 1);
    } else if (playlist.length === 0) {
      setNextSeqId(1);
    } else {
      // Find the highest seqId to set the nextSeqId correctly
      const maxId = Math.max(
        ...playlist.map((song) => ("seqId" in song ? (song as Song).seqId : 0)),
      );
      setNextSeqId(maxId + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Current song - derived state
  const currentSong = playlist[currentSongIndex] || null;

  // Get the current song's sequential ID
  const currentSeqId = currentSong && "seqId" in currentSong
    ? (currentSong as Song).seqId
    : 0;

  // Initial setup: register player cleanup on mount once
  useEffect(() => {
    const cleanup = () => {
      if (
        globalYoutubePlayer &&
        typeof globalYoutubePlayer.pauseVideo === "function"
      ) {
        try {
          // Ensure we persist the state one last time
          if (playerRef.current) {
            const newTime = playerRef.current.getCurrentTime() || 0;
            persistState({ currentTime: newTime });
          }

          // If we're actually unloading the page, stop the player
          if (isPageUnloading) {
            globalYoutubePlayer.pauseVideo();
            globalYoutubePlayer = null;
          }
        } catch (e) {
          console.error("Error during cleanup:", e);
        }
      }
    };

    window.addEventListener("pagehide", cleanup);
    return () => {
      window.removeEventListener("pagehide", cleanup);
    };
  }, [persistState]);

  // Mark window as open when component mounts and closed when unmounted
  useEffect(() => {
    setIsWindowOpen(true);
    persistState({ isWindowOpen: true });

    return () => {
      setIsWindowOpen(false);
      persistState({ isWindowOpen: false });
      // Don't stop playback on unmount - audio will continue in background
    };
  }, [setIsWindowOpen, persistState]);

  // Set up reference to the YouTube player instance
  useEffect(() => {
    const updatePlayerRef = () => {
      if (playerRef.current) {
        const player = playerRef.current.getInternalPlayer();
        if (player) {
          globalYoutubePlayer = player as YouTubePlayerWithMethods;

          // Apply volume settings when player is ready
          if (
            globalYoutubePlayer &&
            typeof globalYoutubePlayer.setVolume === "function"
          ) {
            globalYoutubePlayer.setVolume(isMuted ? 0 : volume * 100);
          }
        }
      }
    };

    // Try immediately
    updatePlayerRef();

    // Also try after a delay to ensure player is ready
    const timer = setTimeout(() => {
      updatePlayerRef();
    }, 1000);

    return () => clearTimeout(timer);
  }, [initialSyncDone, volume, isMuted]);

  // Apply volume changes to the player
  useEffect(() => {
    if (
      globalYoutubePlayer &&
      typeof globalYoutubePlayer.setVolume === "function"
    ) {
      const volumeToSet = isMuted ? 0 : volume * 100;
      globalYoutubePlayer.setVolume(volumeToSet);
    }
  }, [volume, isMuted]);

  // Extract sync logic into a useCallback function
  const syncPlayerState = useCallback(() => {
    if (
      !playerRef.current ||
      isPageUnloading ||
      initialSyncDone ||
      !currentSong
    ) {
      return;
    }

    try {
      setInitialSyncDone(true);
      setIsLoading(true);
      ignoreEvents.current = true;

      // If we have a saved position, seek to it
      if (currentTime > 0) {
        playerRef.current?.seekTo(currentTime, "seconds");
      }

      // Apply volume settings
      const player = playerRef.current
        ?.getInternalPlayer() as YouTubePlayerWithMethods;
      if (player && typeof player.setVolume === "function") {
        player.setVolume(isMuted ? 0 : volume * 100);
      }

      // Update playing state based on saved state - but with a delay
      setTimeout(() => {
        try {
          const player = playerRef.current
            ?.getInternalPlayer() as YouTubePlayerWithMethods;
          if (player) {
            if (playing) {
              player.playVideo();
            } else {
              player.pauseVideo();
            }
          }

          setIsLoading(false);
          ignoreEvents.current = false;
        } catch (error) {
          console.error("Error applying play/pause state:", error);
          setIsLoading(false);
          ignoreEvents.current = false;
        }
      }, 1000); // Keep delay as it was
    } catch (error) {
      console.error("Error syncing player state:", error);
      setIsLoading(false);
      ignoreEvents.current = false;
    }
  }, [
    currentSong,
    currentTime,
    playing,
    initialSyncDone,
    isMuted,
    volume,
  ]);

  // Refactored sync effect to just call the function if needed
  // (Or potentially remove this effect if onReady is sufficient)
  // For now, let's keep it but make it simpler
  useEffect(() => {
    if (
      playerRef.current &&
      currentSong &&
      !initialSyncDone
    ) {
      // Maybe call syncPlayerState here too after a delay?
      // Or rely solely on onReady? Let's rely on onReady for now.
      // console.log("Effect triggered, initialSyncDone:", initialSyncDone);
    }
  }, [currentSong, initialSyncDone, syncPlayerState]);

  // Set up position tracking interval
  useEffect(() => {
    if (!playerRef.current) return;

    // Save current position function
    const saveCurrentPosition = () => {
      if (playerRef.current && !seeking && playing) {
        const newTime = playerRef.current.getCurrentTime() || 0;
        if (Math.abs(newTime - currentTime) > 1) {
          setCurrentTime(newTime);
          // persistState({ currentTime: newTime }); // Persist during interval
        }
      }
    };

    // Set up an interval to periodically save the current playback position
    timeUpdateInterval.current = setInterval(() => {
      if (playing) {
        saveCurrentPosition();
      }
    }, 5000);

    return () => {
      if (timeUpdateInterval.current) {
        clearInterval(timeUpdateInterval.current);
      }
      // Ensure no state persistence happens in this specific cleanup
    };
    // Read currentTime here to avoid stale closures in saveCurrentPosition
  }, [playing, currentTime, setCurrentTime, seeking]);

  // Handle visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && !isWindowOpen) {
        // Removed persistState from here as well - rely on pagehide/beforeunload
        // if (playerRef.current) {
        //   const newTime = playerRef.current.getCurrentTime() || 0;
        //   setCurrentTime(newTime);
        //   persistState({ currentTime: newTime });
        // }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
    // Read isWindowOpen here
  }, [isWindowOpen /* removed persistState, setCurrentTime */]);

  // Handlers
  const handlePlayPause = () => {
    if (ignoreEvents.current) return;

    // Set state immediately
    const newPlayingState = !playing;
    setPlaying(newPlayingState);
    persistState({ isPlaying: newPlayingState });

    // Control player directly after state update
    // Add a small delay AFTER setting state to ensure player might be ready
    setTimeout(() => {
      try {
        const player = playerRef.current
          ?.getInternalPlayer() as YouTubePlayerWithMethods;
        if (player) {
          if (newPlayingState) {
            console.log("handlePlayPause: Calling playVideo");
            player.playVideo();
          } else {
            console.log("handlePlayPause: Calling pauseVideo");
            player.pauseVideo();
          }
        }
      } catch (error) {
        console.error("Error toggling play state in handlePlayPause:", error);
      }
    }, 50); // Keep a small delay
  };

  const handleNext = () => {
    if (playlist.length <= 1) return;

    // Find songs with higher seqId, sort by seqId, and take the first one
    const nextSongs = playlist
      .filter((song) => "seqId" in song && (song as Song).seqId > currentSeqId)
      .sort((a, b) => (a as Song).seqId - (b as Song).seqId);

    if (nextSongs.length > 0) {
      // Play the next song in sequence
      const nextSongIndex = playlist.findIndex(
        (song) =>
          "seqId" in song &&
          (song as Song).seqId === (nextSongs[0] as Song).seqId,
      );
      setCurrentSongIndex(nextSongIndex);
      persistState({ currentSongIndex: nextSongIndex, currentTime: 0 });
    } else {
      // Cycle back to the lowest seqId if at the end
      const firstSong = [...playlist].sort(
        (a, b) => (a as Song).seqId - (b as Song).seqId,
      )[0];

      const firstSongIndex = playlist.findIndex(
        (song) =>
          "seqId" in song && (song as Song).seqId === (firstSong as Song).seqId,
      );
      setCurrentSongIndex(firstSongIndex);
      persistState({ currentSongIndex: firstSongIndex, currentTime: 0 });
    }

    // Ensure it starts playing
    setPlaying(true);
    persistState({ isPlaying: true });
  };

  const handlePrevious = () => {
    if (playlist.length <= 1) return;

    // Find songs with lower seqId, sort by seqId (descending), and take the first one
    const prevSongs = playlist
      .filter((song) => "seqId" in song && (song as Song).seqId < currentSeqId)
      .sort((a, b) => (b as Song).seqId - (a as Song).seqId);

    if (prevSongs.length > 0) {
      // Play the previous song in sequence
      const prevSongIndex = playlist.findIndex(
        (song) =>
          "seqId" in song &&
          (song as Song).seqId === (prevSongs[0] as Song).seqId,
      );
      setCurrentSongIndex(prevSongIndex);
      persistState({ currentSongIndex: prevSongIndex, currentTime: 0 });
    } else {
      // Cycle to the highest seqId if at the beginning
      const lastSong = [...playlist].sort(
        (a, b) => (b as Song).seqId - (a as Song).seqId,
      )[0];

      const lastSongIndex = playlist.findIndex(
        (song) =>
          "seqId" in song && (song as Song).seqId === (lastSong as Song).seqId,
      );
      setCurrentSongIndex(lastSongIndex);
      persistState({ currentSongIndex: lastSongIndex, currentTime: 0 });
    }

    // Ensure it starts playing
    setPlaying(true);
    persistState({ isPlaying: true });
  };

  const handleProgress = (state: { playedSeconds: number }) => {
    if (!seeking) {
      setPlayedSeconds(state.playedSeconds);
    }
  };

  const handleDuration = (duration: number) => {
    setDuration(duration);
  };

  const handleAddSong = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newSongUrl.trim()) return;

    if (ReactPlayer.canPlay(newSongUrl)) {
      const videoId = getYoutubeId(newSongUrl);

      if (videoId) {
        const title = `YouTube Song (${videoId})`;

        // Create new song with a sequential ID
        const newSong = {
          url: newSongUrl,
          title: title,
          id: videoId,
          seqId: nextSeqId,
        };

        setPlaylist([...playlist, newSong]);
        setNewSongUrl("");
        setNextSeqId((prev) => prev + 1);

        // If first song, select it
        if (playlist.length === 0) {
          setCurrentSongIndex(0);
          persistState({ currentSongIndex: 0 });
        }
      } else {
        alert("Could not extract YouTube video ID");
      }
    } else {
      alert("Invalid or unsupported URL");
    }
  };

  const handleRemoveSong = (e: React.MouseEvent, indexToRemove: number) => {
    e.stopPropagation();

    if (indexToRemove < 0 || indexToRemove >= playlist.length) return;

    const removedSeqId = "seqId" in playlist[indexToRemove]
      ? (playlist[indexToRemove] as Song).seqId
      : 0;

    const newPlaylist = playlist.filter((_, index) => index !== indexToRemove);
    setPlaylist(newPlaylist);

    // Handle index adjustment when the current song is removed
    if (newPlaylist.length === 0) {
      setCurrentSongIndex(0);
      setPlaying(false);
      persistState({ currentSongIndex: 0, isPlaying: false });
    } else if (indexToRemove === currentSongIndex) {
      // Find the next closest song by seqId
      const remainingSeqIds = newPlaylist
        .filter((song) => "seqId" in song)
        .map((song) => (song as Song).seqId);

      if (remainingSeqIds.length > 0) {
        // Find next higher seqId or the lowest if none higher
        const nextHigher = Math.min(
          ...remainingSeqIds.filter((id) => id > removedSeqId),
        );
        const lowestId = Math.min(...remainingSeqIds);

        const targetSeqId = nextHigher !== Infinity ? nextHigher : lowestId;
        const newIndex = newPlaylist.findIndex(
          (song) => "seqId" in song && (song as Song).seqId === targetSeqId,
        );

        const updatedIndex = newIndex >= 0 ? newIndex : 0;
        setCurrentSongIndex(updatedIndex);
        persistState({ currentSongIndex: updatedIndex, currentTime: 0 });
      } else {
        setCurrentSongIndex(0);
        persistState({ currentSongIndex: 0, currentTime: 0 });
      }
    } else if (indexToRemove < currentSongIndex) {
      // Adjust current index
      const updatedIndex = currentSongIndex - 1;
      setCurrentSongIndex(updatedIndex);
      persistState({ currentSongIndex: updatedIndex });
    }
  };

  const handleSelectSong = (index: number) => {
    // Don't select if editing
    if (editingIndex !== null) return;

    if (index !== currentSongIndex) {
      setCurrentSongIndex(index);
      setPlaying(true);
      persistState({
        currentSongIndex: index,
        isPlaying: true,
        currentTime: 0,
      });
    } else {
      const newPlayingState = !playing;
      setPlaying(newPlayingState);
      persistState({ isPlaying: newPlayingState });
    }
  };

  const startEditingTitle = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    setEditingIndex(index);
    setEditingTitle(playlist[index].title);
  };

  const saveEditedTitle = () => {
    if (editingIndex === null) return;

    const updatedPlaylist = [...playlist];
    updatedPlaylist[editingIndex] = {
      ...updatedPlaylist[editingIndex],
      title: editingTitle.trim() || `Song ${editingIndex + 1}`,
    };

    setPlaylist(updatedPlaylist);
    setEditingIndex(null);
    setEditingTitle("");
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    setEditingTitle("");
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      saveEditedTitle();
    } else if (e.key === "Escape") {
      cancelEditing();
    }
  };

  const toggleVideoDisplay = () => {
    setShowVideo(!showVideo);
  };

  // Helper to format time (MM:SS)
  const formatTime = (seconds: number) => {
    const date = new Date(seconds * 1000);
    const hh = date.getUTCHours();
    const mm = date.getUTCMinutes();
    const ss = date.getUTCSeconds().toString().padStart(2, "0");
    if (hh) {
      return `${hh}:${mm.toString().padStart(2, "0")}:${ss}`;
    }
    return `${mm}:${ss}`;
  };

  // Handlers for volume control
  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    persistState({ volume: newVolume });

    // Also update the YouTube player volume directly
    if (
      globalYoutubePlayer &&
      typeof globalYoutubePlayer.setVolume === "function"
    ) {
      globalYoutubePlayer.setVolume(newVolume * 100);
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      // Unmute
      setIsMuted(false);
      const newVolume = prevVolume > 0 ? prevVolume : 0.5;
      setVolume(newVolume);
      persistState({ volume: newVolume });

      // Also update the YouTube player volume directly
      if (
        globalYoutubePlayer &&
        typeof globalYoutubePlayer.setVolume === "function"
      ) {
        globalYoutubePlayer.setVolume(newVolume * 100);
      }
    } else {
      // Mute
      setPrevVolume(volume);
      setIsMuted(true);
      persistState({ volume });

      // Also update the YouTube player volume directly
      if (
        globalYoutubePlayer &&
        typeof globalYoutubePlayer.setVolume === "function"
      ) {
        globalYoutubePlayer.setVolume(0);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      {/* Top Section: Add Song */}
      <form
        onSubmit={handleAddSong}
        className="p-2 border-b border-border bg-muted flex gap-2"
      >
        <input
          type="text"
          value={newSongUrl}
          onChange={(e) => setNewSongUrl(e.target.value)}
          placeholder="Paste YouTube URL here"
          // Use theme classes for input
          className="flex-grow p-2 rounded bg-input text-foreground placeholder:text-muted-foreground border border-border text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <Button
          type="submit"
          disabled={isLoading}
          // Use theme classes for button
          className="bg-primary text-primary-foreground hover:bg-primary/90 text-sm px-3"
        >
          {isLoading ? "Adding..." : "Add"}
        </Button>
      </form>

      {/* Current Song Display */}
      <div className="p-3 bg-muted border-b border-border min-h-[60px]">
        {currentSong
          ? (
            <div>
              <p className="text-sm font-semibold text-foreground truncate">
                {currentSong.title}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatTime(playedSeconds)} / {formatTime(duration)}
              </p>
            </div>
          )
          : (
            <p className="text-sm text-muted-foreground">
              Playlist empty. Add a YouTube URL.
            </p>
          )}
      </div>

      {/* Video Player & Controls Wrapper */}
      <div className="flex flex-col flex-grow relative">
        {/* Video Player (conditionally rendered) */}
        {showVideo && (
          <div className="aspect-video bg-black">
            {currentSong && (
              <ReactPlayer
                ref={playerRef}
                url={currentSong.url}
                playing={playing}
                volume={isMuted ? 0 : volume}
                onPlay={() => !ignoreEvents.current && setPlaying(true)}
                onPause={() => !ignoreEvents.current && setPlaying(false)}
                onEnded={handleNext}
                onProgress={handleProgress}
                onDuration={handleDuration}
                width="100%"
                height="100%"
                onError={(e) => console.error("ReactPlayer Error:", e)}
                onReady={() => {
                  // Call the defined sync function
                  if (!initialSyncDone) {
                    syncPlayerState();
                  }
                }}
              />
            )}
          </div>
        )}

        {/* Invisible player for background playback */}
        {!showVideo && currentSong && (
          <div style={{ display: "none" }}>
            <ReactPlayer
              ref={playerRef}
              url={currentSong.url}
              playing={playing}
              volume={isMuted ? 0 : volume}
              onPlay={() => !ignoreEvents.current && setPlaying(true)}
              onPause={() => !ignoreEvents.current && setPlaying(false)}
              onEnded={handleNext}
              onProgress={handleProgress}
              onDuration={handleDuration}
              onError={(e) => console.error("ReactPlayer Error:", e)}
              onReady={() => {
                // Call the defined sync function
                if (!initialSyncDone) {
                  syncPlayerState();
                }
              }}
            />
          </div>
        )}

        {/* Controls Area */}
        <div className="p-3 bg-muted border-t border-border mt-auto">
          {/* Progress Bar - Now uses onValueChange and onValueCommit directly */}
          <Slider
            value={[playedSeconds]}
            max={duration}
            step={1}
            onValueChange={(value) => {
              setSeeking(true);
              setPlayedSeconds(value[0]);
            }}
            onValueCommit={(value) => {
              setSeeking(false);
              const newTime = value[0];
              if (playerRef.current) {
                playerRef.current.seekTo(newTime, "seconds");
                setCurrentTime(newTime);
                persistState({ currentTime: newTime });
              }
            }}
            className="w-full h-2 mb-2"
            disabled={!currentSong}
          />

          <div className="flex items-center justify-between">
            {/* Volume Control */}
            <div className="flex items-center w-1/4">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMute}
                className="text-foreground hover:bg-muted/50 mr-1 h-8 w-8 p-1"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted || volume === 0
                  ? <VolumeX size={18} />
                  : <Volume2 size={18} />}
              </Button>
              <Slider
                value={[isMuted ? 0 : volume]}
                max={1}
                step={0.01}
                onValueChange={handleVolumeChange}
                className="w-full h-2"
              />
            </div>

            {/* Main Controls */}
            <div className="flex items-center justify-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrevious}
                disabled={!currentSong || playlist.length < 2}
                className="text-foreground hover:bg-muted/50 h-8 w-8 p-1"
                title="Previous"
              >
                <SkipBack size={20} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePlayPause}
                disabled={!currentSong}
                className="text-foreground hover:bg-muted/50 h-10 w-10 p-1 rounded-full"
                title={playing ? "Pause" : "Play"}
              >
                {playing ? <Pause size={24} /> : <Play size={24} />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNext}
                disabled={!currentSong || playlist.length < 2}
                className="text-foreground hover:bg-muted/50 h-8 w-8 p-1"
                title="Next"
              >
                <SkipForward size={20} />
              </Button>
            </div>

            {/* Show/Hide Video Button */}
            <div className="flex justify-end w-1/4">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleVideoDisplay}
                className="text-foreground hover:bg-muted/50 h-8 w-8 p-1"
                title={showVideo ? "Hide Video" : "Show Video"}
              >
                <Video size={18} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Playlist Area */}
      <div className="flex-grow overflow-y-auto bg-background border-t border-border">
        {playlist.length === 0
          ? (
            <p className="p-4 text-center text-muted-foreground text-sm">
              Playlist is empty
            </p>
          )
          : (
            <ul className="space-y-1">
              {playlist.map((song, index) => (
                <li
                  // Use optional chaining and fallback to index if song.id is missing
                  key={song?.id ?? index}
                  className={cn(
                    "p-2 flex items-center justify-between cursor-pointer border-b border-border",
                    "hover:bg-muted",
                    index === currentSongIndex &&
                      "bg-primary text-primary-foreground", // Use primary for selection
                    editingIndex === index && "bg-muted", // Different background for editing row
                  )}
                  onClick={() =>
                    editingIndex !== index && handleSelectSong(index)}
                >
                  {editingIndex === index
                    ? (
                      <div className="flex-grow flex items-center">
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={handleTitleKeyDown}
                          // Use theme classes
                          className="flex-grow bg-input text-foreground border border-border rounded px-2 py-1 text-sm mr-2"
                          autoFocus
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={saveEditedTitle}
                          className="text-primary hover:bg-muted/50 h-6 w-6 p-1 mr-1"
                          title="Save Title"
                        >
                          <Check size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={cancelEditing}
                          className="text-destructive hover:bg-muted/50 h-6 w-6 p-1"
                          title="Cancel Edit"
                        >
                          <X size={16} />
                        </Button>
                      </div>
                    )
                    : (
                      <div className="flex-grow flex items-center overflow-hidden mr-2">
                        <span className="text-xs w-5 text-center mr-2 text-muted-foreground">
                          {(song as Song).seqId || index + 1}
                        </span>
                        <span
                          className={cn(
                            "text-sm truncate",
                            // If not selected, use standard text color
                            index !== currentSongIndex && "text-foreground",
                            // If selected, text color is already primary-foreground from parent
                          )}
                        >
                          {song.title}
                        </span>
                      </div>
                    )}
                  {editingIndex !== index && (
                    <div className="flex items-center flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => startEditingTitle(e, index)}
                        // Use theme text color, adjust if needed when selected
                        className={cn(
                          "hover:bg-muted/50 h-6 w-6 p-1 mr-1",
                          index === currentSongIndex
                            ? "text-primary-foreground/80 hover:text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                        title="Edit Title"
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleRemoveSong(e, index)}
                        // Use destructive text color
                        className={cn(
                          "text-destructive/80 hover:text-destructive hover:bg-destructive/10 h-6 w-6 p-1",
                          index === currentSongIndex &&
                            "text-destructive-foreground/80 hover:text-destructive-foreground",
                        )}
                        title="Remove Song"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
      </div>
    </div>
  );
};

export default MusicPlayer;
