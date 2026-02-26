"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { DbTask } from "@/lib/supabase";
import { ClipboardCheckIcon, PlusIcon, XIcon } from "@/components/icons";

interface Task {
  id: string;
  title: string;
  completed: boolean;
}

export default function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchTasks() {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, completed")
        .order("created_at", { ascending: true })
        .returns<DbTask[]>();

      if (!error && data) {
        setTasks(
          data.map((row) => ({
            id: row.id,
            title: row.title,
            completed: row.completed,
          }))
        );
      }
      setLoading(false);
    }
    fetchTasks();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;

    setAdding(true);
    const { data, error } = await supabase
      .from("tasks")
      .insert({ title })
      .select("id, title, completed")
      .returns<DbTask[]>();

    if (!error && data) {
      setTasks((prev) => [
        ...prev,
        { id: data[0].id, title: data[0].title, completed: data[0].completed },
      ]);
      setNewTitle("");
      inputRef.current?.focus();
    }
    setAdding(false);
  }

  async function handleToggle(id: string, completed: boolean) {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !completed } : t))
    );

    const { error } = await supabase
      .from("tasks")
      .update({ completed: !completed })
      .eq("id", id);

    if (error) {
      // Revert on failure
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, completed } : t))
      );
    }
  }

  async function handleDelete(id: string) {
    const prev = tasks;
    setTasks((t) => t.filter((task) => task.id !== id));

    const { error } = await supabase.from("tasks").delete().eq("id", id);

    if (error) {
      setTasks(prev);
    }
  }

  function startEditing(task: Task) {
    setEditingId(task.id);
    setEditingTitle(task.title);
    setTimeout(() => editInputRef.current?.focus(), 0);
  }

  async function handleRename(id: string) {
    const title = editingTitle.trim();
    setEditingId(null);
    if (!title) return;

    const prev = tasks;
    setTasks((t) => t.map((task) => (task.id === id ? { ...task, title } : task)));

    const { error } = await supabase
      .from("tasks")
      .update({ title })
      .eq("id", id);

    if (error) {
      setTasks(prev);
    }
  }

  return (
    <div className="p-5">
      <header className="flex items-start justify-between gap-4 mb-4">
        <div className="flex flex-col gap-[3px] min-w-0">
          <h2 className="text-[15px] font-semibold text-text-primary flex items-center gap-1.5">
            <ClipboardCheckIcon width={15} height={15} className="text-accent" />
            Tasks
          </h2>
          <p className="text-xs text-text-3">Home project to-dos</p>
        </div>
      </header>

      {/* Add task form */}
      <form onSubmit={handleAdd} className="flex gap-2 mb-3">
        <input
          ref={inputRef}
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add a task..."
          className="flex-1 px-3 py-2 rounded-[var(--radius-md)] border border-border bg-surface text-[14px] text-text-primary placeholder:text-text-4 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-all"
        />
        <button
          type="submit"
          disabled={adding || !newTitle.trim()}
          aria-label="Add task"
          className="w-9 h-9 shrink-0 inline-flex items-center justify-center rounded-full bg-accent text-white hover:opacity-90 transition-opacity duration-[120ms] disabled:opacity-40"
        >
          <PlusIcon width={16} height={16} />
        </button>
      </form>

      {loading ? (
        <p className="text-[14px] text-text-3 py-4">Loading...</p>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 px-4 text-center">
          <div className="w-10 h-10 rounded-full bg-accent-light flex items-center justify-center">
            <ClipboardCheckIcon width={18} height={18} className="text-accent" />
          </div>
          <p className="text-[14px] text-text-3">
            No tasks yet. Add one above!
          </p>
        </div>
      ) : (
        <ul className="flex flex-col -mx-5" role="list" aria-label="Task list">
          {tasks.map((task) => (
            <li key={task.id} className="relative flex items-center gap-3 pl-5 pr-10 py-[9px] border-t border-border hover:bg-surface-hover transition-[background] duration-[120ms]">
              <button
                type="button"
                onClick={() => handleToggle(task.id, task.completed)}
                aria-label={task.completed ? `Unmark "${task.title}" as done` : `Mark "${task.title}" as done`}
                className="shrink-0"
              >
                {task.completed ? (
                  <span className="block w-[18px] h-[18px] rounded-full bg-accent border-2 border-accent flex items-center justify-center text-white">
                    <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                ) : (
                  <span className="block w-[18px] h-[18px] rounded-full border-2 border-border-strong hover:border-accent transition-colors duration-[120ms]" />
                )}
              </button>
              {editingId === task.id ? (
                <input
                  ref={editInputRef}
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onBlur={() => handleRename(task.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRename(task.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="flex-1 min-w-0 text-[14px] text-text-primary bg-transparent border-none py-0"
                />
              ) : (
                <span
                  onClick={() => startEditing(task)}
                  className={`text-[14px] truncate cursor-text flex-1 min-w-0 ${task.completed ? "text-text-3 line-through" : "text-text-primary"}`}
                >
                  {task.title}
                </span>
              )}
              <button
                type="button"
                aria-label={`Delete task: ${task.title}`}
                onClick={() => handleDelete(task.id)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-text-3 hover:text-text-primary hover:bg-border transition-colors duration-[120ms]"
              >
                <XIcon width={12} height={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
