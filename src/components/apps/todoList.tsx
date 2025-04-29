import React, { useState } from "react";
import { useAtom } from "jotai";
import { TaskItem as TaskItemType, tasksAtom } from "../../atoms/todoListAtom"; // Renamed imported TaskItem to avoid conflict
import { playSound } from "@/lib/utils";
import { ArrowRightIcon } from "lucide-react";
import { ArrowDownIcon } from "lucide-react";
import { XCircle } from "lucide-react";
// Import shadcn/ui Select components
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

const TodoList = () => {
  const [tasks, setTasks] = useAtom(tasksAtom);
  const [newTask, setNewTask] = useState<string>("");
  const [expandedCategories, setExpandedCategories] = useState({
    todo: true,
    inProgress: true,
    done: true,
  });

  // Filter tasks by category
  const todoTasks = tasks.filter((task) => task.category === "todo");
  const inProgressTasks = tasks.filter(
    (task) => task.category === "inProgress",
  );
  const doneTasks = tasks.filter((task) => task.category === "done");

  const handleAddTask = () => {
    if (newTask.trim() !== "") {
      playSound("/sounds/click.mp3");
      setTasks((currentTasks) => [
        ...currentTasks,
        {
          id: crypto.randomUUID(),
          content: newTask.trim(),
          category: "todo" as const,
        },
      ]);
      setNewTask("");
    }
  };

  const handleRemoveTask = (taskId: string) => {
    playSound("/sounds/click.mp3");
    setTasks((currentTasks) =>
      currentTasks.filter((task) => task.id !== taskId)
    );
  };

  const handleMoveTask = (
    taskId: string,
    newCategory: TaskItemType["category"],
  ) => {
    playSound("/sounds/click.mp3");
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === taskId ? { ...task, category: newCategory } : task
      )
    );
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category as keyof typeof prev],
    }));
    playSound("/sounds/click.mp3");
  };

  // Component to render a task item - Updated to use shadcn/ui Select
  const TaskItem = ({ task }: { task: TaskItemType }) => (
    <li className="bg-card p-3 my-1 rounded">
      <div className="flex flex-col justify-center items-start relative w-full">
        <span className="text-sm mr-2 break-words w-full text-card-foreground">
          {task.content}
        </span>
        <div className="flex items-center justify-end w-full mt-2">
          <Select
            value={task.category}
            onValueChange={(value) =>
              handleMoveTask(task.id, value as TaskItemType["category"])}
          >
            <SelectTrigger className="h-7 px-2 py-1 text-xs w-[110px] rounded">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="inProgress">In Progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
          <button onClick={() => handleRemoveTask(task.id)} className="ml-2">
            <div className="relative">
              <XCircle className="h-5 w-5 text-destructive" />
            </div>
          </button>
        </div>
      </div>
    </li>
  );

  // Component to render a category section
  const CategorySection = ({
    title,
    tasks,
    category,
  }: {
    title: string;
    tasks: TaskItemType[];
    category: string;
  }) => (
    <div className="mb-4">
      <div
        className={`bg-muted px-3 py-2 rounded flex justify-between items-center cursor-pointer text-foreground`}
        onClick={() => toggleCategory(category)}
      >
        <h3 className="font-semibold flex items-center text-foreground">
          {title}{" "}
          <span className="ml-2 bg-secondary text-secondary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs">
            {tasks.length}
          </span>
        </h3>
        <span className="text-muted-foreground">
          {expandedCategories[category as keyof typeof expandedCategories]
            ? <ArrowDownIcon className="size-4" />
            : <ArrowRightIcon className="size-4" />}
        </span>
      </div>

      {expandedCategories[category as keyof typeof expandedCategories] && (
        <div className="bg-background">
          {tasks.length > 0
            ? (
            <ul>
                {tasks.map((task) => <TaskItem key={task.id} task={task} />)}
            </ul>
            )
            : (
              <p className="text-muted-foreground text-center italic text-sm py-2">
              No tasks
            </p>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="p-4 flex flex-col h-full bg-background">
      {/* Input */}
      <div className="flex mb-4">
        <input
          type="text"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="Add a new task"
          className="flex-grow bg-input text-foreground p-2 border border-border rounded-l min-w-0"
          onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
        />
        <button
          onClick={handleAddTask}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-r hover:bg-primary/90"
        >
          +
        </button>
      </div>

      {/* Categories */}
      <div className="flex-grow overflow-y-auto">
        <CategorySection
          title="To Do"
          tasks={todoTasks}
          category="todo"
        />

        <CategorySection
          title="In Progress"
          tasks={inProgressTasks}
          category="inProgress"
        />

        <CategorySection
          title="Done"
          tasks={doneTasks}
          category="done"
        />
      </div>
    </div>
  );
};

export default TodoList;
