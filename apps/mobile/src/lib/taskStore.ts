import AsyncStorage from "@react-native-async-storage/async-storage";

export type MobileTaskStatus = "inbox" | "done";

export interface MobileTask {
  id: string;
  title: string;
  status: MobileTaskStatus;
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  synced: boolean;
}

const TASKS_KEY = "mobile_tasks_v1";

export async function getTasks(): Promise<MobileTask[]> {
  const raw = await AsyncStorage.getItem(TASKS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as MobileTask[];
  } catch {
    return [];
  }
}

export async function saveTasks(tasks: MobileTask[]): Promise<void> {
  await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

export async function clearTasks(): Promise<void> {
  await AsyncStorage.removeItem(TASKS_KEY);
}

export async function upsertTask(task: MobileTask): Promise<void> {
  const tasks = await getTasks();
  const idx = tasks.findIndex((t) => t.id === task.id);
  if (idx === -1) tasks.push(task);
  else tasks[idx] = task;
  await saveTasks(tasks);
}

export async function toggleTaskDone(taskId: string): Promise<MobileTask | null> {
  const tasks = await getTasks();
  const idx = tasks.findIndex((t) => t.id === taskId);
  if (idx === -1) return null;

  const prev = tasks[idx];
  const now = new Date().toISOString();
  const done = prev.status !== "done";
  const updated: MobileTask = {
    ...prev,
    status: done ? "done" : "inbox",
    completedAt: done ? now : null,
    updatedAt: now,
    synced: false,
  };
  tasks[idx] = updated;
  await saveTasks(tasks);
  return updated;
}

export function newInboxTask(title: string): MobileTask {
  const now = new Date().toISOString();
  return {
    id: `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`,
    title: title.trim(),
    status: "inbox",
    projectId: null,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    synced: false,
  };
}
