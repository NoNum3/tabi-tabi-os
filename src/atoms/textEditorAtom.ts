import { atom } from "jotai";
import { loadFeatureState, saveFeatureState } from "../utils/storage";

// Define keys for storage
export const TEXT_EDITOR_CONTENT_FEATURE_KEY = "textEditorContent";
export const TEXT_EDITOR_SETTINGS_FEATURE_KEY = "textEditorSettings";

// Define types
export interface EditorSettings {
  fontSize: number;
  fontFamily: string;
  textAlign: "left" | "center" | "right" | "justify";
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  lineHeight: number;
  textColor: string;
  backgroundColor: string;
  tabSize: number;
  wordWrap: boolean;
  autoSaveInterval: number; // in seconds, 0 = disabled
}

// Default settings
export const defaultEditorSettings: EditorSettings = {
  fontSize: 14,
  fontFamily: "monospace",
  textAlign: "left",
  isBold: false,
  isItalic: false,
  isUnderline: false,
  lineHeight: 1.5,
  textColor: "#333333",
  backgroundColor: "#ffffff",
  tabSize: 2,
  wordWrap: true,
  autoSaveInterval: 30,
};

// Default content
const defaultEditorContent: string = "";

// --- Safe Initialization --- //

// Only using a default instance ID for the global atoms, components load their own.
const defaultInstanceId = "default";

const getContentInitialState = (): string => {
  if (typeof window === "undefined") {
    return defaultEditorContent;
  }
  return loadFeatureState<string>(
    `${TEXT_EDITOR_CONTENT_FEATURE_KEY}_${defaultInstanceId}`,
  ) ?? defaultEditorContent;
};

const getSettingsInitialState = (): EditorSettings => {
  if (typeof window === "undefined") {
    return defaultEditorSettings;
  }
  return loadFeatureState<EditorSettings>(
    `${TEXT_EDITOR_SETTINGS_FEATURE_KEY}_${defaultInstanceId}`,
  ) ?? defaultEditorSettings;
};

// --- Base Atoms (for default instance only) --- //

const baseEditorContentAtom = atom<string>(getContentInitialState());
const baseEditorSettingsAtom = atom<EditorSettings>(getSettingsInitialState());

// --- Derived Atoms (for default instance only, with saving) --- //

export const textEditorContentAtom = atom(
  (get) => get(baseEditorContentAtom),
  (get, set, newContent: string) => {
    set(baseEditorContentAtom, newContent);
    if (typeof window !== "undefined") {
      saveFeatureState(
        `${TEXT_EDITOR_CONTENT_FEATURE_KEY}_${defaultInstanceId}`,
        newContent,
      );
    }
  },
);

export const textEditorSettingsAtom = atom(
  (get) => get(baseEditorSettingsAtom),
  (
    get,
    set,
    newSettings: EditorSettings | ((prev: EditorSettings) => EditorSettings),
  ) => {
    const updatedSettings = typeof newSettings === "function"
      ? newSettings(get(baseEditorSettingsAtom))
      : newSettings;
    set(baseEditorSettingsAtom, updatedSettings);
    if (typeof window !== "undefined") {
      saveFeatureState(
        `${TEXT_EDITOR_SETTINGS_FEATURE_KEY}_${defaultInstanceId}`,
        updatedSettings,
      );
    }
  },
);

// --- Functions for managing specific editor instances (Unchanged) --- //

// Utility function to create a unique ID for each text editor instance
let nextId = 1;
export const getNextTextEditorId = () => `textEditor_${nextId++}`;

// Helper function to get editor settings for a specific instance
export const loadEditorSettings = (editorId: string): EditorSettings => {
  if (typeof window === "undefined") return defaultEditorSettings;
  return loadFeatureState<EditorSettings>(
    `${TEXT_EDITOR_SETTINGS_FEATURE_KEY}_${editorId}`,
  ) ?? defaultEditorSettings;
};

// Helper function to get editor content for a specific instance
export const loadEditorContent = (editorId: string): string => {
  if (typeof window === "undefined") return defaultEditorContent;
  return loadFeatureState<string>(
    `${TEXT_EDITOR_CONTENT_FEATURE_KEY}_${editorId}`,
  ) ?? defaultEditorContent;
};

// Helper function to save editor settings for a specific instance
export const saveEditorSettings = (
  editorId: string,
  settings: EditorSettings,
): void => {
  if (typeof window !== "undefined") {
    saveFeatureState(
      `${TEXT_EDITOR_SETTINGS_FEATURE_KEY}_${editorId}`,
      settings,
    );
  }
};

// Helper function to save editor content for a specific instance
export const saveEditorContent = (editorId: string, content: string): void => {
  if (typeof window !== "undefined") {
    saveFeatureState(`${TEXT_EDITOR_CONTENT_FEATURE_KEY}_${editorId}`, content);
  }
};
