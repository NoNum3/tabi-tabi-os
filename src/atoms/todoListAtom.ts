import { atom } from "jotai";
import { loadFeatureState, saveFeatureState } from "../utils/storage";

const FEATURE_KEY = "todoList";

// Define task item type
export type TaskItem = {
  id: string;
  content: string;
  category: "todo" | "inProgress" | "done";
};

// Define the shape of the state
export type TodoListState = TaskItem[];

// Default empty state
const defaultTasksState: TodoListState = [];

// Load initial state safely
const getInitialState = (): TodoListState => {
  // Only access localStorage on the client
  if (typeof window === "undefined") {
    return defaultTasksState;
  }
  return loadFeatureState<TodoListState>(FEATURE_KEY) ?? defaultTasksState;
};

// Create the base atom with safe initialization
const baseTasksAtom = atom<TodoListState>(getInitialState());

// Create a derived atom that saves to localStorage on change
export const tasksAtom = atom(
  (get) => get(baseTasksAtom),
  (
    get,
    set,
    newTasks: TodoListState | ((prevTasks: TodoListState) => TodoListState),
  ) => {
    const updatedTasks = typeof newTasks === "function"
      ? newTasks(get(baseTasksAtom))
      : newTasks;
    set(baseTasksAtom, updatedTasks);
    // Only save on the client
    if (typeof window !== "undefined") {
    saveFeatureState(FEATURE_KEY, updatedTasks);
  }
  },
);

// Optional: Add derived atoms for specific actions if needed (often done in component)
// export const addTaskAtom = atom(null, (get, set, newTask: string) => { ... });
// export const removeTaskAtom = atom(null, (get, set, taskIndex: number) => { ... });
