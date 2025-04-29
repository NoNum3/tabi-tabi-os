import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  defaultEditorSettings,
  EditorSettings,
  loadEditorContent,
  loadEditorSettings,
} from "../../atoms/textEditorAtom";

// Shadcn UI Imports
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Textarea } from "../ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import {
  Toolbar,
  ToolbarButton,
  ToolbarSeparator,
  ToolbarToggleGroup,
  ToolbarToggleItem,
} from "../ui/toolbar"; // Assuming toolbar is available
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";

// Lucide Icons
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Copy,
  Italic,
  Palette,
  Save,
  Trash2,
  Underline,
  WrapText,
} from "lucide-react";

interface TextEditorProps {
  initialContent?: string;
  editorId?: string;
}

const TextEditor: React.FC<TextEditorProps> = ({
  initialContent = "",
  editorId = "default",
}) => {
  // State: Only keep settings state managed by React for the toolbar
  const [content, setContent] = useState<string>(""); // Keep for initial load & blur sync
  const [editorSettings, setEditorSettings] = useState<EditorSettings>(
    defaultEditorSettings,
  );
  const [initialLoadDone, setInitialLoadDone] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null); // Ref for the textarea

  // Load state on mount
  useEffect(() => {
      const savedSettings = loadEditorSettings(editorId);
        setEditorSettings(savedSettings);
      const savedContent = loadEditorContent(editorId);
    setContent(savedContent || initialContent); // Set initial content state

    // Set initial value directly on the ref *after* mount if needed,
    // but defaultValue should handle the initial render.
    // We might need this if content is loaded async later, but let's rely on defaultValue first.
    // if (textareaRef.current) {
    //   textareaRef.current.value = savedContent || initialContent;
    // }

      setInitialLoadDone(true);
  }, [editorId, initialContent]); // Rerun if editorId changes

  // Action Handlers (Save, Copy, Clear) - Read from ref
  const handleSaveToFile = useCallback(() => {
    const currentContent = textareaRef.current?.value ?? ""; // Read from ref
    const blob = new Blob([currentContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${editorId}_note.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [editorId]);

  const handleCopyToClipboard = useCallback(async () => {
    const currentContent = textareaRef.current?.value ?? ""; // Read from ref
    if (!currentContent) return; // Don't copy if empty
    try {
      await navigator.clipboard.writeText(currentContent);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  }, []);

  const handleClearText = useCallback(() => {
    if (window.confirm("Clear all text? This cannot be undone.")) {
      if (textareaRef.current) {
        textareaRef.current.value = ""; // Clear DOM element directly
      }
      setContent(""); // Also clear React state
    }
  }, [setContent]);

  // Sync React state when focus leaves the textarea
  const handleBlur = () => {
    if (textareaRef.current) {
      const currentDOMValue = textareaRef.current.value;
      // Only update state if it's different, to avoid unnecessary re-renders
      if (currentDOMValue !== content) {
        setContent(currentDOMValue);
        // If we wanted to re-introduce saving on blur, it would go here:
        // saveFeatureState(`${TEXT_EDITOR_CONTENT_FEATURE_KEY}_${editorId}`, currentDOMValue);
      }
    }
  };

  // Keyboard Shortcuts - Read from ref if needed, but save uses ref now
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        handleSaveToFile(); // Uses ref
      }
      // Copy shortcut might accidentally trigger if text is selected,
      // let's remove the check for empty selection for simplicity now.
      // if (e.ctrlKey && e.key === "c") {
      //   e.preventDefault();
      //   handleCopyToClipboard(); // Uses ref
      // }
    };
    // Add listener to the textarea itself if possible, otherwise document is okay
    const currentTextarea = textareaRef.current;
    currentTextarea?.addEventListener("keydown", handleKeyDown);
    // document.addEventListener("keydown", handleKeyDown); // Fallback
    return () => {
      currentTextarea?.removeEventListener("keydown", handleKeyDown);
      // document.removeEventListener("keydown", handleKeyDown); // Fallback
    };
  }, [handleSaveToFile]); // Removed handleCopyToClipboard from deps

  // Helper to update a setting (remains the same)
  const updateSetting = useCallback(<K extends keyof EditorSettings>(
    key: K,
    value: EditorSettings[K],
  ) => {
    setEditorSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
    // If we wanted settings persistence, trigger save here:
    // const newSettings = { ...editorSettings, [key]: value };
    // saveFeatureState(`${TEXT_EDITOR_SETTINGS_FEATURE_KEY}_${editorId}`, newSettings);
  }, [/* editorSettings, editorId */]); // Removed dependencies if not saving settings

  // Available Fonts
  const fontOptions = [
    { value: "monospace", label: "Monospace" },
    { value: "sans-serif", label: "Sans Serif" },
    { value: "serif", label: "Serif" },
    { value: "Arial, sans-serif", label: "Arial" },
    { value: "Georgia, serif", label: "Georgia" },
    { value: "'Times New Roman', serif", label: "Times New Roman" },
    { value: "'Courier New', monospace", label: "Courier New" },
  ];

  // Font sizes
  const fontSizes = [10, 12, 14, 16, 18, 20, 24, 30, 36];

  // Don't render until initial content/settings are loaded
  if (!initialLoadDone) {
    return <div>Loading Editor...</div>; // Or some placeholder
  }

  return (
    <TooltipProvider delayDuration={100}>
      <div className="w-full h-full flex flex-col bg-background">
        {/* Improved Toolbar */}
        <Toolbar className="border-b border-border bg-muted p-1 flex-wrap h-auto">
          {/* File Actions */}
          <Tooltip>
            <TooltipTrigger asChild>
              <ToolbarButton onClick={handleSaveToFile}>
                <Save className="h-4 w-4" />
              </ToolbarButton>
            </TooltipTrigger>
            <TooltipContent>
              <p>Save as .txt (Ctrl+S)</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <ToolbarButton onClick={handleCopyToClipboard}>
                <Copy className="h-4 w-4" />
              </ToolbarButton>
            </TooltipTrigger>
            <TooltipContent>
              <p>Copy All (Ctrl+C)</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <ToolbarButton onClick={handleClearText}>
                <Trash2 className="h-4 w-4" />
              </ToolbarButton>
            </TooltipTrigger>
            <TooltipContent>
              <p>Clear All Text</p>
            </TooltipContent>
          </Tooltip>

          <ToolbarSeparator />

          {/* Font Selection */}
          <Select
            value={editorSettings.fontFamily}
            onValueChange={(value) => updateSetting("fontFamily", value)}
          >
            <SelectTrigger
              className="w-[150px] h-8 text-xs"
              id={`${editorId}-fontFamilySelect`}
              aria-label="Select font family"
            >
              <SelectValue placeholder="Font" />
            </SelectTrigger>
            <SelectContent>
              {fontOptions.map((font) => (
                <SelectItem
                  key={font.value}
                  value={font.value}
                  className="text-xs"
                >
                  {font.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Font Size */}
          <Select
            value={editorSettings.fontSize.toString()}
            onValueChange={(value) =>
              updateSetting("fontSize", parseInt(value))}
          >
            <SelectTrigger
              className="w-[70px] h-8 text-xs ml-1"
              id={`${editorId}-fontSizeSelect`}
              aria-label="Select font size"
            >
              <SelectValue placeholder="Size" />
            </SelectTrigger>
            <SelectContent>
              {fontSizes.map((size) => (
                <SelectItem
                  key={size}
                  value={size.toString()}
                  className="text-xs"
                >
                  {size}px
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <ToolbarSeparator />

          {/* Text Styles */}
          <ToolbarToggleGroup
            type="multiple"
            value={[
              editorSettings.isBold ? "bold" : "",
              editorSettings.isItalic ? "italic" : "",
              editorSettings.isUnderline ? "underline" : "",
            ].filter(Boolean)}
            onValueChange={(values) => {
              updateSetting("isBold", values.includes("bold"));
              updateSetting("isItalic", values.includes("italic"));
              updateSetting("isUnderline", values.includes("underline"));
            }}
            className="h-8"
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <ToolbarToggleItem
                  value="bold"
                  aria-label="Bold"
                  className="w-8 h-8 p-0"
                >
                  <Bold className="h-4 w-4" />
                </ToolbarToggleItem>
              </TooltipTrigger>
              <TooltipContent>
                <p>Bold</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <ToolbarToggleItem
                  value="italic"
                  aria-label="Italic"
                  className="w-8 h-8 p-0"
                >
                  <Italic className="h-4 w-4" />
                </ToolbarToggleItem>
              </TooltipTrigger>
              <TooltipContent>
                <p>Italic</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <ToolbarToggleItem
                  value="underline"
                  aria-label="Underline"
                  className="w-8 h-8 p-0"
                >
                  <Underline className="h-4 w-4" />
                </ToolbarToggleItem>
              </TooltipTrigger>
              <TooltipContent>
                <p>Underline</p>
              </TooltipContent>
            </Tooltip>
          </ToolbarToggleGroup>

          <ToolbarSeparator />

          {/* Text Align */}
          <ToolbarToggleGroup
            type="single"
            value={editorSettings.textAlign}
            onValueChange={(value) =>
              updateSetting(
                "textAlign",
                value as EditorSettings["textAlign"] || "left",
              )}
            className="h-8"
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <ToolbarToggleItem
                  value="left"
                  aria-label="Align Left"
                  className="w-8 h-8 p-0"
                >
                  <AlignLeft className="h-4 w-4" />
                </ToolbarToggleItem>
              </TooltipTrigger>
              <TooltipContent>
                <p>Align Left</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <ToolbarToggleItem
                  value="center"
                  aria-label="Align Center"
                  className="w-8 h-8 p-0"
                >
                  <AlignCenter className="h-4 w-4" />
                </ToolbarToggleItem>
              </TooltipTrigger>
              <TooltipContent>
                <p>Align Center</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <ToolbarToggleItem
                  value="right"
                  aria-label="Align Right"
                  className="w-8 h-8 p-0"
                >
                  <AlignRight className="h-4 w-4" />
                </ToolbarToggleItem>
              </TooltipTrigger>
              <TooltipContent>
                <p>Align Right</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <ToolbarToggleItem
                  value="justify"
                  aria-label="Align Justify"
                  className="w-8 h-8 p-0"
                >
                  <AlignJustify className="h-4 w-4" />
                </ToolbarToggleItem>
              </TooltipTrigger>
              <TooltipContent>
                <p>Justify</p>
              </TooltipContent>
            </Tooltip>
          </ToolbarToggleGroup>

          <ToolbarSeparator />

          {/* Color Pickers - Simple Input Type Color */}
          <div className="flex items-center space-x-2 mx-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Label
                  htmlFor="textColorPicker"
                  className="cursor-pointer p-1 rounded hover:bg-accent"
                >
                  <Palette className="h-4 w-4" />
                </Label>
              </TooltipTrigger>
              <TooltipContent>
                <p>Text Color</p>
              </TooltipContent>
            </Tooltip>
            <input
              id="textColorPicker"
              type="color"
              value={editorSettings.textColor}
              onChange={(e) => updateSetting("textColor", e.target.value)}
              className="w-6 h-6 border-none cursor-pointer bg-transparent"
              title="Text Color"
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Label
                  htmlFor="bgColorPicker"
                  className="cursor-pointer p-1 rounded hover:bg-accent"
                >
                  <Palette className="h-4 w-4 opacity-50" />{" "}
                  {/* Slightly different look maybe? */}
                </Label>
              </TooltipTrigger>
              <TooltipContent>
                <p>Background Color</p>
              </TooltipContent>
            </Tooltip>
            <input
              id="bgColorPicker"
              type="color"
              value={editorSettings.backgroundColor}
              onChange={(e) => updateSetting("backgroundColor", e.target.value)}
              className="w-6 h-6 border-none cursor-pointer bg-transparent"
              title="Background Color"
            />
        </div>

          <ToolbarSeparator />

          {/* Word Wrap */}
          <div className="flex items-center space-x-2 mx-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Label
                  htmlFor="wordWrapToggle"
                  className="cursor-pointer p-1 rounded hover:bg-accent"
                >
                  <WrapText className="h-4 w-4" />
                </Label>
              </TooltipTrigger>
              <TooltipContent>
                <p>Toggle Word Wrap</p>
              </TooltipContent>
            </Tooltip>
            <Switch
              id="wordWrapToggle"
              checked={editorSettings.wordWrap}
              onCheckedChange={(checked) => updateSetting("wordWrap", checked)}
              className="w-8 h-4 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input"
            />
            </div>
        </Toolbar>

        {/* Text Area - Now uncontrolled */}
        <Textarea
          ref={textareaRef} // Assign the ref
          key={editorId} // Ensure it resets if ID changes
          id={`${editorId}-mainContent`}
          defaultValue={content} // Set initial value ONLY
          onBlur={handleBlur} // Sync state on blur
          className={cn(
            "flex-grow w-full p-3 text-sm rounded-none border-none focus:outline-none focus:ring-0 resize-none",
            editorSettings.wordWrap
              ? "whitespace-pre-wrap break-words"
              : "whitespace-pre",
            "font-mono", // Default to mono, specific font set by style
        )}
        style={{
            fontFamily: editorSettings.fontFamily,
            fontSize: `${editorSettings.fontSize}px`,
            lineHeight: editorSettings.lineHeight,
            fontWeight: editorSettings.isBold ? "bold" : "normal",
            fontStyle: editorSettings.isItalic ? "italic" : "normal",
            textDecoration: editorSettings.isUnderline ? "underline" : "none",
            textAlign: editorSettings.textAlign,
            color: editorSettings.textColor,
            backgroundColor: editorSettings.backgroundColor,
            tabSize: editorSettings.tabSize,
          }}
          placeholder="Start typing here..."
          wrap={editorSettings.wordWrap ? "soft" : "off"}
        />

        {/* Status Bar - REMOVED */}
        {
          /* <div className="w-full p-1 border-t border-border bg-muted text-xs text-muted-foreground text-right h-6 flex items-center justify-end">
          <span>{statusMessage || "Ready"}</span>
        </div> */
        }
    </div>
    </TooltipProvider>
  );
};

export default TextEditor;
