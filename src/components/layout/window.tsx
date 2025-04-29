import { useEffect, useState } from "react";
import { useAtom } from "jotai"; // Import useAtom
import { windowRegistryAtom } from "../../atoms/windowAtoms"; // Import base registry
import { useAtomValue } from "jotai"; // Use useAtomValue for read-only
import {
  ResizeDirection,
  useWindowManagement,
} from "../../hooks/useWindowManagement";
import { Position, Size } from "../../types"; // Updated path, added Position
import { cn } from "../../lib/utils";
import {
  focusWindowAtom,
  minimizeWindowAtom,
  updateWindowPositionSizeAtom,
} from "../../atoms/windowAtoms"; // Import Jotai atoms
import { Minus, X } from "lucide-react"; // Import Minus icon

interface WindowProps {
  windowId: string; // Unique identifier for this window instance
  title: string;
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  // State now comes from the global atom, passed down from AppsIcons
  initialSize: Size;
  initialPosition: Position;
  minSize?: Size;
  zIndex: number; // Pass zIndex for styling
  // Added isMobileOrTablet prop
  isMobileOrTablet: boolean;
  // Removed defaultSize as initialSize/Position are now required
}

const Window: React.FC<WindowProps> = ({
  windowId,
  title,
  children,
  isOpen,
  onClose,
  initialSize,
  initialPosition,
  minSize,
  zIndex,
  isMobileOrTablet,
}) => {
  // Get the whole registry state
  const registry = useAtomValue(windowRegistryAtom);
  // Find the specific state for this windowId
  const currentWindowState = registry[windowId];
  // Get isMinimized state, default to false if window not found (shouldn't happen if isOpen)
  const isMinimized = currentWindowState?.isMinimized ?? false;

  // Add mounted state to handle hydration issues
  const [isMounted, setIsMounted] = useState(false);

  // State to store window dimensions
  const [windowDimensions, setWindowDimensions] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  });

  // Get Jotai setters for focus and update actions
  const focusWindow = useAtom(focusWindowAtom)[1];
  const updateWindowPositionSize = useAtom(updateWindowPositionSizeAtom)[1];
  const minimizeWindow = useAtom(minimizeWindowAtom)[1];

  // Effect to update dimensions on resize
  useEffect(() => {
    const handleResize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    // Set initial dimensions
    handleResize();

    // Add event listener
    window.addEventListener("resize", handleResize);

    // Clean up
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Effect to handle client-side mounting
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Adjust initial position and size for mobile/tablet
  const adjustedInitialPosition = isMobileOrTablet
    ? {
      // Position the window to match the menubar's position (respecting parent container padding)
      x: 0, // The menubar starts at x:0 relative to its container
      y: 36 + 4, // Menubar height (36px) + 4px gap
    }
    : initialPosition;

  const adjustedInitialSize = isMobileOrTablet
    ? {
      // Match the width of the menubar (full width)
      width: windowDimensions.width - 2 * 16, // Full width minus padding on both sides (p-4 = 16px)
      height: Math.min(
        windowDimensions.height * 0.8,
        windowDimensions.height - (36 + 4 + 16), // Account for menubar + gap + bottom padding
      ),
    }
    : initialSize;

  // Callback for the hook to update global state
  const handleInteractionEnd = (
    id: string,
    newPosition: Position,
    newSize: Size,
  ) => {
    updateWindowPositionSize({ id, position: newPosition, size: newSize });
  };

  // Callback for the hook to focus the window
  const handleFocus = (id: string) => {
    focusWindow(id);
  };

  const { position, size, handleDragStart, handleResizeStart } =
    useWindowManagement({
      windowId,
      initialSize: adjustedInitialSize,
      initialPosition: adjustedInitialPosition,
      minSize,
      onInteractionEnd: handleInteractionEnd, // Pass callback
      onFocus: handleFocus, // Pass focus callback
      // containerRef could be added here if needed
    });

  // Don't render if not mounted (to prevent hydration mismatch) or not open
  if (!isMounted || !isOpen) {
    return null;
  }

  // --- Resize Handles --- (Keep existing handle definitions)
  const handleBaseClass = "absolute z-[1001] select-none"; // zIndex might need adjustment relative to window zIndex
  const cornerHandleClass = `${handleBaseClass} w-5 h-5`;
  const edgeHandleClass = handleBaseClass;

  const handles: {
    className: string;
    direction: ResizeDirection;
    style?: React.CSSProperties;
  }[] = [
    // Corners
    {
      className: cn(cornerHandleClass, "bottom-[-3px] right-[-3px]"),
      direction: "bottom-right",
      style: {
        cursor: "nwse-resize",
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        borderRight: "1px solid rgba(255, 255, 255, 0.1)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
      },
    },
    {
      className: cn(cornerHandleClass, "bottom-[-3px] left-[-3px]"),
      direction: "bottom-left",
      style: {
        cursor: "nesw-resize",
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        borderLeft: "1px solid rgba(255, 255, 255, 0.1)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
      },
    },
    {
      className: cn(cornerHandleClass, "top-[-3px] right-[-3px]"),
      direction: "top-right",
      style: {
        cursor: "nesw-resize",
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        borderRight: "1px solid rgba(255, 255, 255, 0.1)",
        borderTop: "1px solid rgba(255, 255, 255, 0.1)",
      },
    },
    {
      className: cn(cornerHandleClass, "top-[-3px] left-[-3px]"),
      direction: "top-left",
      style: {
        cursor: "nwse-resize",
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        borderLeft: "1px solid rgba(255, 255, 255, 0.1)",
        borderTop: "1px solid rgba(255, 255, 255, 0.1)",
      },
    },
    // Edges
    {
      className: cn(edgeHandleClass, "top-5 bottom-5 right-[-3px] w-[6px]"),
      direction: "right",
      style: { cursor: "ew-resize" },
    },
    {
      className: cn(edgeHandleClass, "top-5 bottom-5 left-[-3px] w-[6px]"),
      direction: "left",
      style: { cursor: "ew-resize" },
    },
    {
      className: cn(edgeHandleClass, "left-5 right-5 bottom-[-3px] h-[6px]"),
      direction: "bottom",
      style: { cursor: "ns-resize" },
    },
    {
      className: cn(edgeHandleClass, "left-5 right-5 top-[-3px] h-[6px]"),
      direction: "top",
      style: { cursor: "ns-resize" },
    },
  ];

  // Bring window to front when clicked anywhere on it
  const handleWindowFocus = () => {
    handleFocus(windowId);
  };

  // Hide resize handles on mobile/tablet
  const shouldShowResizeHandles = !isMobileOrTablet;

  // Mobile-specific styling
  const mobileWindowStyles = isMobileOrTablet
    ? {
      borderRadius: "0.375rem", // Match menubar's rounded-md (0.375rem)
      boxShadow: "0 10px 25px rgba(0, 0, 0, 0.3)",
      transition: "all 0.2s ease-in-out",
      // Add border styling to match menubar
      border: "2px solid var(--secondary)", // Match the menubar's border-secondary border-2
    }
    : {};

  return (
    <div
      className={`absolute bg-background border border-border rounded-lg shadow-xl flex flex-col overflow-hidden ${
        isMobileOrTablet ? "mobile-window" : ""
      }`}
      style={{
        top: `${position.y}px`,
        left: `${position.x}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        minWidth: isMobileOrTablet
          ? undefined
          : minSize?.width
          ? `${minSize.width}px`
          : "150px",
        minHeight: minSize?.height ? `${minSize.height}px` : "100px",
        zIndex: zIndex, // Apply zIndex from global state
        display: isMinimized ? "none" : "flex", // Hide if minimized
        ...mobileWindowStyles,
      }}
      onMouseDown={handleWindowFocus} // Bring window to front on click
    >
      {/* Title Bar */}
      <div
        className={`bg-primary px-3 py-2 border-b border-border flex justify-between items-center select-none h-10 rounded-t-md shadow-md ${
          isMobileOrTablet
            ? "mobile-title-bar px-4 bg-primary rounded-t-[0.375rem]"
            : "cursor-move"
        }`}
        onMouseDown={isMobileOrTablet ? undefined : handleDragStart} // Only allow dragging on desktop
      >
        <h2 className="text-sm font-semibold text-primary-foreground truncate">
          {title}
        </h2>
        <div className="flex items-center space-x-1">
          {/* Minimize Button */}
          <button
            onClick={() => minimizeWindow(windowId)}
            className="p-1 rounded hover:bg-primary/80 text-primary-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            aria-label="Minimize window"
            title="Minimize"
          >
            <Minus size={16} />
          </button>
          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-destructive/90 text-primary-foreground focus:outline-none focus:ring-1 focus:ring-destructive"
            aria-label="Close window"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-grow p-1 overflow-auto bg-background text-foreground">
        {children}
      </div>

      {/* Render Resize Handles only on desktop */}
      {shouldShowResizeHandles &&
        handles.map((handle) => (
          <div
            key={handle.direction}
            className={handle.className}
            style={handle.style}
            data-resize-handle="true"
            // Attach resize handler to the handle itself
            onMouseDown={(e) => {
              e.stopPropagation(); // Prevent window focus handler
              handleResizeStart(e, handle.direction);
            }}
          />
        ))}
    </div>
  );
};

export default Window;
