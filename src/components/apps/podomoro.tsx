"use client";

import React, { useEffect, useRef, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import {
  decrementPodomoroTimeAtom,
  DurationSetting,
  handlePodomoroTickCompletionAtom,
  podomoroAtom,
  resetPodomoroAtom,
  setCustomDurationAtom,
  setDurationSettingAtom,
  startPausePodomoroAtom,
  switchToModeAtom,
} from "../../atoms/podomoroAtom";
import { playSound } from "@/lib/utils";
// Import Tabs components
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button"; // Keep Button import
import { ScrollArea } from "@/components/ui/scroll-area"; // Import ScrollArea for laps
import { Input } from "@/components/ui/input"; // Import Input for timer duration
// import { BellRing } from "lucide-react"; // Removed unused import
// Import date-fns-tz and Select
import { formatInTimeZone } from "date-fns-tz";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// Import stopwatchStateAtom
import { stopwatchStateAtom } from "../../atoms/stopwatchAtom";

// Global Timer Runner Component
export const GlobalPodomoroTimer = () => {
  // Read necessary state values
  const { isRunning, timeRemaining } = useAtomValue(podomoroAtom);
  // Get action setters
  const decrementTime = useAtom(decrementPodomoroTimeAtom)[1];
  const handleCompletion = useAtom(handlePodomoroTickCompletionAtom)[1];

  // Ref to prevent multiple completion calls
  const completionHandledRef = useRef(false);

  // Effect 1: Handle the timer interval for decrementing time
  useEffect(() => {
    if (!isRunning) {
      return; // Do nothing if not running
    }

    // Start the interval when isRunning becomes true
    const intervalId = setInterval(() => {
      // Directly call the decrement action atom.
      // It should handle its own logic based on the current state.
      decrementTime();
    }, 1000);

    // Cleanup function to clear the interval when isRunning becomes false or component unmounts
    return () => {
      clearInterval(intervalId);
    };
  }, [isRunning, decrementTime]); // Re-run only if isRunning or decrementTime changes

  // Effect 2: Handle the completion logic when time runs out
  useEffect(() => {
    // Check if the timer is running and time has reached zero
    if (isRunning && timeRemaining <= 0) {
      // Ensure completion is handled only once per cycle
      if (!completionHandledRef.current) {
        completionHandledRef.current = true;
        playSound("/sounds/timeup.mp3");
        // Call the completion action atom. It should set isRunning to false.
        handleCompletion();
      }
    } else if (isRunning && timeRemaining > 0) {
      // Reset the completion flag if the timer is running but time is not yet zero
      // (e.g., after a reset or mode switch while running)
      completionHandledRef.current = false;
    } else if (!isRunning) {
      // Reset the completion flag if the timer is stopped/paused
      completionHandledRef.current = false;
    }
  }, [isRunning, timeRemaining, handleCompletion]); // Re-run when these values change

  // This component doesn't render anything itself
  return null;
};

// List of common IANA Timezones
const commonTimezones = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Dubai",
  "Australia/Sydney",
];

// Rename component to ClockApp
const ClockApp: React.FC = () => {
  // === Pomodoro State and Logic (Keep for Pomodoro Tab) ===
  const [podomoroState] = useAtom(podomoroAtom);
  const {
    mode,
    timeRemaining,
    isRunning,
    workSessionsCompleted,
    durationSetting,
    customDurationMinutes,
  } = podomoroState;

  // Get setter functions for actions
  const startPause = useAtom(startPausePodomoroAtom)[1];
  const reset = useAtom(resetPodomoroAtom)[1];
  const setSetting = useAtom(setDurationSettingAtom)[1];
  const setCustomTime = useAtom(setCustomDurationAtom)[1];
  const switchMode = useAtom(switchToModeAtom)[1];

  // Local state for the custom input field and title
  const [localCustomMinutes, setLocalCustomMinutes] = useState<string>(
    customDurationMinutes.toString(),
  );
  const [customTitle, setCustomTitle] = useState<string>("Custom");

  // Update local state when global state changes
  useEffect(() => {
    setLocalCustomMinutes(customDurationMinutes.toString());
  }, [customDurationMinutes]);

  const handleStartPause = () => {
    playSound("/sounds/click.mp3");
    startPause();
  };

  const handleReset = () => {
    playSound("/sounds/click.mp3");
    reset();
  };

  const handleSettingChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newSetting = event.target.value as DurationSetting;
    setSetting(newSetting);

    // When changing to a specific mode, also switch the timer mode appropriately
    if (newSetting === "work25") {
      switchMode("work");
    } else if (newSetting === "short5") {
      switchMode("shortBreak");
    } else if (newSetting === "long15") {
      switchMode("longBreak");
    }

    playSound("/sounds/click.mp3");
  };

  const handleCustomTimeChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setLocalCustomMinutes(event.target.value);
  };

  const handleCustomTitleChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setCustomTitle(event.target.value);
  };

  const updateGlobalCustomTime = () => {
    const newMinutes = parseInt(localCustomMinutes, 10);
    if (!isNaN(newMinutes) && newMinutes !== customDurationMinutes) {
      setCustomTime(newMinutes);
      playSound("/sounds/click.mp3");
    } else if (isNaN(newMinutes)) {
      setLocalCustomMinutes(customDurationMinutes.toString());
    }
  };

  const handleCustomTimeKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Enter") {
      updateGlobalCustomTime();
      (event.target as HTMLInputElement).blur();
    }
  };

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${
      secs
        .toString()
        .padStart(2, "0")
    }`;
  };

  // Get the display title based on mode and setting
  const getDisplayTitle = (): string => {
    if (durationSetting === "custom") {
      return customTitle;
    }

    switch (mode) {
      case "work":
        return "Work";
      case "shortBreak":
        return "Short Break";
      case "longBreak":
        return "Long Break";
      default:
        return "Timer";
    }
  };

  // Duration setting options with descriptive labels
  const durationOptions: {
    value: DurationSetting;
    label: string;
    description: string;
  }[] = [
    {
      value: "work25",
      label: "Work (25min)",
      description: "Focus time for maximum productivity",
    },
    {
      value: "short5",
      label: "Short Break (5min)",
      description: "Quick refreshment between work sessions",
    },
    {
      value: "long15",
      label: "Long Break (15min)",
      description: "Extended rest after multiple work sessions",
    },
    {
      value: "custom",
      label: "Custom Timer",
      description: "Set your own timer duration and title",
    },
  ];
  // === End Pomodoro Logic ===

  // === Stopwatch State & Logic ===
  const [stopwatchState, setStopwatchState] = useAtom(stopwatchStateAtom);
  const { time: stopwatchTime, isRunning: stopwatchRunning, laps } =
    stopwatchState;

  const stopwatchIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastStopwatchTimeRef = useRef<number>(0);

  useEffect(() => {
    if (stopwatchRunning) {
      lastStopwatchTimeRef.current = Date.now() - stopwatchTime;
      stopwatchIntervalRef.current = setInterval(() => {
        setStopwatchState((prev) => ({
          ...prev,
          time: Date.now() - lastStopwatchTimeRef.current,
        }));
      }, 10);
    } else {
      if (stopwatchIntervalRef.current) {
        clearInterval(stopwatchIntervalRef.current);
      }
    }
    return () => {
      if (stopwatchIntervalRef.current) {
        clearInterval(stopwatchIntervalRef.current);
      }
    };
  }, [stopwatchRunning, setStopwatchState, stopwatchTime]);

  const handleStopwatchStartPause = () => {
    setStopwatchState((prev) => ({ ...prev, isRunning: !prev.isRunning }));
  };

  const handleStopwatchReset = () => {
    setStopwatchState({
      time: 0,
      isRunning: false,
      laps: [],
    });
  };

  const handleStopwatchLap = () => {
    if (stopwatchRunning) {
      const lastLapTime = laps.length > 0 ? laps.reduce((a, b) => a + b, 0) : 0;
      const currentLapTime = stopwatchTime - lastLapTime;
      if (currentLapTime > 0) {
        setStopwatchState((prev) => ({
          ...prev,
          laps: [currentLapTime, ...prev.laps],
        }));
      }
    }
  };

  const formatStopwatchTime = (timeMs: number): string => {
    const totalSeconds = Math.floor(timeMs / 1000);
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    const milliseconds = Math.floor((timeMs % 1000) / 10).toString().padStart(
      2,
      "0",
    );
    return `${minutes}:${seconds}.${milliseconds}`;
  };
  // === End Stopwatch Logic ===

  // === Timer State & Logic ===
  const [timerDuration, setTimerDuration] = useState<number>(300); // Default: 5 minutes (300 seconds)
  const [timerRemaining, setTimerRemaining] = useState<number>(timerDuration);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const [inputMinutes, setInputMinutes] = useState<string>("5");
  const [inputSeconds, setInputSeconds] = useState<string>("00");
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerAudioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize timer audio
  useEffect(() => {
    if (typeof Audio !== "undefined") {
      timerAudioRef.current = new Audio("/sounds/timeup.mp3");
    }
    return () => {
      timerAudioRef.current = null; // Cleanup
    };
  }, []);

  // Update remaining time when duration changes (and not running)
  useEffect(() => {
    if (!timerRunning) {
      setTimerRemaining(timerDuration);
    }
  }, [timerDuration, timerRunning]);

  // Timer countdown logic
  useEffect(() => {
    if (timerRunning && timerRemaining > 0) {
      timerIntervalRef.current = setInterval(() => {
        setTimerRemaining((prev) => {
          const nextTime = prev - 1;
          if (nextTime <= 0) {
            clearInterval(timerIntervalRef.current!);
            setTimerRunning(false);
            // Play sound
            timerAudioRef.current?.play().catch((e) =>
              console.error("Error playing timer sound:", e)
            );
            return 0;
          }
          return nextTime;
        });
      }, 1000);
    } else if (!timerRunning && timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [timerRunning, timerRemaining]);

  const handleTimerStartPause = () => {
    if (timerRemaining > 0) { // Only start if time is left
      setTimerRunning(!timerRunning);
    }
  };

  const handleTimerReset = () => {
    setTimerRunning(false);
    setTimerRemaining(timerDuration); // Reset to current set duration
  };

  const handleDurationChange = () => {
    const minutes = parseInt(inputMinutes, 10) || 0;
    const seconds = parseInt(inputSeconds, 10) || 0;
    const newDuration = Math.max(0, minutes * 60 + seconds); // Ensure non-negative
    setTimerDuration(newDuration);
    // Reset remaining time only if not running
    if (!timerRunning) {
      setTimerRemaining(newDuration);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<string>>,
    maxLength: number,
  ) => {
    const value = e.target.value.replace(/\D/g, ""); // Remove non-digits
    if (value.length <= maxLength) {
      setter(value);
    }
  };

  // Format timer remaining time MM:SS
  const formatTimerTime = (timeSeconds: number): string => {
    const minutes = Math.floor(timeSeconds / 60).toString().padStart(2, "0");
    const seconds = (timeSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  // === End Timer Logic ===

  // === Clock State & Logic ===
  const [currentTimeDate, setCurrentTimeDate] = useState(new Date());
  // Add state for selected timezone, default to user's local
  const [selectedTimezone, setSelectedTimezone] = useState<string>(
    () =>
      typeof Intl !== "undefined"
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : "UTC",
  );
  const [localTimezone, setLocalTimezone] = useState<string>(
    () =>
      typeof Intl !== "undefined"
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : "UTC",
  );

  // Update local timezone if it changes (e.g., system settings)
  useEffect(() => {
    const currentLocal = typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "UTC";
    setLocalTimezone(currentLocal);
  }, []);

  // Update time every second
  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentTimeDate(new Date());
    }, 1000);
    return () => clearInterval(intervalId);
  }, []);

  // Formatters using local time
  const formatClockTimeLocal = (date: Date): string => {
    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };
  const formatClockDateLocal = (date: Date): string => {
    return date.toLocaleDateString([], {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Formatter using selected timezone (using date-fns-tz)
  const formatInSelectedTimezone = (
    date: Date,
    formatString: string,
  ): string => {
    try {
      return formatInTimeZone(date, selectedTimezone, formatString);
    } catch (error) {
      console.error("Error formatting date in timezone:", error);
      // Fallback or indicate error
      return "Invalid Timezone";
    }
  };

  // === End Clock Logic ===

  return (
    <Tabs defaultValue="clock" className="w-full h-full flex flex-col p-1">
      <TabsList className="grid w-full grid-cols-4 mb-1">
        <TabsTrigger value="clock">Clock</TabsTrigger>
        <TabsTrigger value="pomodoro">Pomodoro</TabsTrigger>
        <TabsTrigger value="stopwatch">Stopwatch</TabsTrigger>
        <TabsTrigger value="timer">Timer</TabsTrigger>
      </TabsList>

      <TabsContent
        value="clock"
        className="flex-grow p-4 bg-muted/30 rounded flex flex-col items-center justify-start gap-6"
      >
        {/* Local Time Display */}
        <div className="text-center mt-8">
          <div className="text-7xl font-bold text-foreground tabular-nums mb-1">
            {formatClockTimeLocal(currentTimeDate)}
          </div>
          <div className="text-lg text-muted-foreground">
            {formatClockDateLocal(currentTimeDate)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            ({localTimezone})
          </div>
        </div>

        {/* Timezone Selector */}
        <div className="w-full max-w-xs">
          <Select value={selectedTimezone} onValueChange={setSelectedTimezone}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select timezone..." />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Common Timezones</SelectLabel>
                {commonTimezones.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectGroup>
              {/* Optionally add user's local timezone if not in common list */}
              {!commonTimezones.includes(localTimezone) && (
                <SelectGroup>
                  <SelectLabel>Local</SelectLabel>
                  <SelectItem value={localTimezone}>
                    {localTimezone.replace(/_/g, " ")}
                  </SelectItem>
                </SelectGroup>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Selected Timezone Display */}
        {selectedTimezone !== localTimezone && (
          <div className="text-center mt-4 p-4 border border-border rounded-lg bg-background/50 w-full max-w-xs">
            <div className="text-3xl font-semibold text-foreground tabular-nums mb-1">
              {formatInSelectedTimezone(currentTimeDate, "p")} {/* h:mm:ss a */}
            </div>
            <div className="text-sm text-muted-foreground">
              {formatInSelectedTimezone(currentTimeDate, "eeee, MMMM d, yyyy")}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              ({selectedTimezone.replace(/_/g, " ")})
            </div>
          </div>
        )}
      </TabsContent>

      <TabsContent value="pomodoro" className="flex-grow overflow-y-auto">
        {/* Existing Pomodoro UI - Moved here */}
        <div className="flex flex-col items-center justify-between text-foreground h-full p-4">
          {/* Timer Display Area */}
          <div className="flex flex-col items-center mb-6">
            <h2 className="text-xl font-semibold mb-2 text-foreground">
              {getDisplayTitle()}
            </h2>
            <div className="text-6xl font-mono mb-4 tabular-nums text-foreground">
              {formatTime(timeRemaining)}
            </div>
            <div className="flex space-x-4">
              <Button
                onClick={handleStartPause}
                className={`px-4 py-2 rounded transition w-20 ${
                  isRunning
                    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
              >
                {isRunning ? "Pause" : "Start"}
              </Button>
              <Button
                onClick={handleReset}
                className="px-4 py-2 bg-muted text-muted-foreground rounded hover:bg-muted/80 transition w-20"
              >
                Reset
              </Button>
            </div>
          </div>

          {/* Settings Area */}
          <div className="w-full border-t border-border pt-4">
            <h3 className="text-sm font-medium mb-2 text-center text-foreground">
              Timer Settings
            </h3>
            <div className="flex flex-col gap-2">
              {durationOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex items-start p-2 cursor-pointer rounded hover:bg-muted/50"
                >
                  <input
                    type="radio"
                    name="durationSetting"
                    value={option.value}
                    checked={durationSetting === option.value}
                    onChange={handleSettingChange}
                    className="mt-1 cursor-pointer accent-primary"
                  />
                  <div className="ml-2 w-full">
                    <div className="font-medium text-sm text-foreground">
                      {option.label}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {option.description}
                    </div>

                    {/* Custom Time & Title Input - appears only when custom is selected */}
                    {option.value === "custom" &&
                      durationSetting === "custom" && (
                      <div className="flex flex-col mt-2 space-y-2">
                        <div className="flex items-center space-x-2">
                          <label
                            htmlFor="customTitle"
                            className="text-xs text-muted-foreground"
                          >
                            Title:
                          </label>
                          <input
                            id="customTitle"
                            type="text"
                            value={customTitle}
                            onChange={handleCustomTitleChange}
                            className="flex-1 px-2 py-0.5 border border-border rounded text-foreground bg-input text-xs"
                            placeholder="Custom Timer Title"
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <label
                            htmlFor="customTime"
                            className="text-xs text-muted-foreground"
                          >
                            Minutes:
                          </label>
                          <input
                            id="customTime"
                            type="number"
                            min="1"
                            value={localCustomMinutes}
                            onChange={handleCustomTimeChange}
                            onBlur={updateGlobalCustomTime}
                            onKeyDown={handleCustomTimeKeyDown}
                            className="w-16 px-1 py-0.5 border border-border rounded text-foreground bg-input text-center text-xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Footer Info */}
          <div className="w-full text-center mt-4 text-sm text-muted-foreground">
            <div>Completed Sessions: {workSessionsCompleted}</div>

            <div className="mt-3 text-xs text-muted-foreground border-t border-border pt-2">
              <p className="font-medium mb-1">Pomodoro Method (25/5/15)</p>
              <p>
                25min work, 5min short break, 15min long break every 4 cycles
              </p>
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent
        value="stopwatch"
        className="flex-grow p-4 bg-muted/30 rounded flex flex-col items-center justify-between"
      >
        {/* Stopwatch Display */}
        <div className="text-6xl font-mono mb-6 text-center text-foreground tabular-nums">
          {formatStopwatchTime(stopwatchTime)}
        </div>

        {/* Stopwatch Controls */}
        <div className="flex w-full justify-around mb-4">
          <Button
            variant="outline"
            className="w-20 h-20 rounded-full text-lg"
            onClick={stopwatchRunning
              ? handleStopwatchLap
              : handleStopwatchReset}
            disabled={!stopwatchRunning && stopwatchTime === 0}
          >
            {stopwatchRunning ? "Lap" : "Reset"}
          </Button>
          <Button
            variant="outline"
            className={`w-20 h-20 rounded-full text-lg ${
              stopwatchRunning
                ? "text-red-500 border-red-500 hover:bg-red-500/10"
                : "text-green-500 border-green-500 hover:bg-green-500/10"
            }`}
            onClick={handleStopwatchStartPause}
          >
            {stopwatchRunning ? "Stop" : "Start"}
          </Button>
        </div>

        {/* Laps Display */}
        <ScrollArea className="w-full h-32 border border-border rounded bg-background/50 p-2">
          {laps.length === 0
            ? (
              <p className="text-sm text-muted-foreground text-center italic">
                No laps recorded
              </p>
            )
            : (
              <ul className="space-y-1 text-sm text-foreground">
                {laps.map((lapTime, index) => (
                  <li
                    key={index}
                    className="flex justify-between px-1 border-b border-border/50 py-0.5 tabular-nums"
                  >
                    <span>Lap {laps.length - index}</span>
                    <span>{formatStopwatchTime(lapTime)}</span>
                  </li>
                ))}
              </ul>
            )}
        </ScrollArea>
      </TabsContent>

      <TabsContent
        value="timer"
        className="flex-grow p-4 bg-muted/30 rounded flex flex-col items-center justify-between"
      >
        {/* Timer Display */}
        <div className="text-6xl font-mono mb-6 text-center text-foreground tabular-nums">
          {formatTimerTime(timerRemaining)}
        </div>

        {/* Timer Duration Input */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <Input
            type="text"
            value={inputMinutes}
            onChange={(e) => handleInputChange(e, setInputMinutes, 2)}
            onBlur={handleDurationChange}
            onKeyDown={(e) => e.key === "Enter" && handleDurationChange()}
            className="w-16 h-10 text-center text-lg bg-input border-border"
            maxLength={2}
            placeholder="MM"
          />
          <span className="text-xl font-semibold text-muted-foreground">:</span>
          <Input
            type="text"
            value={inputSeconds}
            onChange={(e) => handleInputChange(e, setInputSeconds, 2)}
            onBlur={handleDurationChange}
            onKeyDown={(e) => e.key === "Enter" && handleDurationChange()}
            className="w-16 h-10 text-center text-lg bg-input border-border"
            maxLength={2}
            placeholder="SS"
          />
        </div>

        {/* Timer Controls */}
        <div className="flex w-full justify-around mb-4">
          <Button
            variant="outline"
            className="w-20 h-20 rounded-full text-lg"
            onClick={handleTimerReset}
            disabled={timerRunning && timerRemaining === timerDuration} // Disable reset only if running AND at start?
          >
            Reset
          </Button>
          <Button
            variant="outline"
            className={`w-20 h-20 rounded-full text-lg ${
              timerRunning
                ? "text-red-500 border-red-500 hover:bg-red-500/10"
                : "text-green-500 border-green-500 hover:bg-green-500/10"
            }`}
            onClick={handleTimerStartPause}
            disabled={timerRemaining === 0} // Disable start/pause if time is up
          >
            {timerRunning ? "Pause" : "Start"}
          </Button>
        </div>
        {/* Add some spacing at the bottom */}
        <div className="h-10"></div>
      </TabsContent>
    </Tabs>
  );
};

export default ClockApp;
