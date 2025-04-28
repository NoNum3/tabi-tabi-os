import React, { useCallback, useEffect, useRef, useState } from "react";
import { saveFeatureState } from "../../utils/storage";
import {
  defaultEditorSettings,
  EditorSettings,
  loadEditorContent,
  loadEditorSettings,
  TEXT_EDITOR_SETTINGS_KEY,
  TEXT_EDITOR_STORAGE_KEY,
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
  // State: Use useState for instance-specific state, loaded from storage
  const [content, setContent] = useState<string>("");
  const [editorSettings, setEditorSettings] = useState<EditorSettings>(
    defaultEditorSettings,
  );

  const [statusMessage, setStatusMessage] = useState<string>("");
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [initialLoadDone, setInitialLoadDone] = useState<boolean>(false);

  // Load state on mount
  useEffect(() => {
      const savedSettings = loadEditorSettings(editorId);
        setEditorSettings(savedSettings);
      const savedContent = loadEditorContent(editorId);
    setContent(savedContent || initialContent);
      setInitialLoadDone(true);
  }, [editorId, initialContent]);

  // Show status message utility
  const showStatusMessage = useCallback((message: string) => {
    setStatusMessage(message);
    setTimeout(() => setStatusMessage(""), 2000);
  }, []);

  // Save content effect
  useEffect(() => {
    if (initialLoadDone) {
      saveFeatureState(`${TEXT_EDITOR_STORAGE_KEY}_${editorId}`, content);
    }
  }, [content, editorId, initialLoadDone]);

  // Save settings effect
  useEffect(() => {
    if (initialLoadDone) {
      saveFeatureState(
        `${TEXT_EDITOR_SETTINGS_KEY}_${editorId}`,
        editorSettings,
      );
    }
  }, [editorSettings, editorId, initialLoadDone]);

  // Auto-save effect
  useEffect(() => {
    if (!initialLoadDone || editorSettings.autoSaveInterval <= 0) {
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
      return; // Don't setup if disabled or not loaded
    }

    if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setInterval(() => {
      // Content is already saved on change by the effect above,
      // but we can still show a message for auto-save interval
      // saveFeatureState(`${TEXT_EDITOR_STORAGE_KEY}_${editorId}`, content); // Redundant save?
      showStatusMessage("Auto-saved");
    }, editorSettings.autoSaveInterval * 1000);

    return () => {
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
    };
  }, [
    editorSettings.autoSaveInterval,
    editorId,
    showStatusMessage,
    initialLoadDone,
    // content // removed content dependency as it's saved separately
  ]);

  // Action Handlers (Save, Copy, Clear)
  const handleSaveToFile = useCallback(() => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${editorId}_note.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showStatusMessage("Content saved to file");
  }, [content, editorId, showStatusMessage]);

  const handleCopyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      showStatusMessage("Content copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy text: ", err);
      showStatusMessage("Failed to copy content!");
    }
  }, [content, showStatusMessage]);

  const handleClearText = useCallback(() => {
    if (window.confirm("Clear all text? This cannot be undone.")) {
      setContent("");
      showStatusMessage("All text cleared");
    }
  }, [setContent, showStatusMessage]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        handleSaveToFile();
      }
      if (
        e.ctrlKey && e.key === "c" && window.getSelection()?.toString() === ""
      ) {
        e.preventDefault();
        handleCopyToClipboard();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleSaveToFile, handleCopyToClipboard]);

  // Helper to update a setting
  const updateSetting = useCallback(<K extends keyof EditorSettings>(
    key: K,
    value: EditorSettings[K],
  ) => {
    setEditorSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

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
            <SelectTrigger className="w-[150px] h-8 text-xs">
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
            <SelectTrigger className="w-[70px] h-8 text-xs ml-1">
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

        {/* Text Area - Use Shadcn Textarea */}
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
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

        {/* Status Bar */}
        <div className="w-full p-1 border-t border-border bg-muted text-xs text-muted-foreground text-right h-6 flex items-center justify-end">
          <span>{statusMessage || "Ready"}</span>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default TextEditor;
