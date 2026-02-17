import type { Agent, Task } from "./types";

// NOTE: In-memory store for hackathon MVP.
// This is enough to demo the ship→test→iterate loop quickly.

const agents: Agent[] = [];
const tasks: Task[] = [];

export function seedAgents(seed: Agent[]) {
  if (agents.length > 0) return;
  agents.push(...seed);
}

export function listAgents() {
  return agents;
}

export function getAgent(id: string) {
  return agents.find((a) => a.id === id) ?? null;
}

export function createTask(t: Omit<Task, "createdAt">) {
  const task: Task = { ...t, createdAt: Date.now() };
  tasks.unshift(task);
  return task;
}

export function listTasks() {
  return tasks;
}

export function getTask(id: string) {
  return tasks.find((t) => t.id === id) ?? null;
}

export function updateTask(id: string, patch: Partial<Task>) {
  const idx = tasks.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  tasks[idx] = { ...tasks[idx], ...patch };
  return tasks[idx]!;
}
