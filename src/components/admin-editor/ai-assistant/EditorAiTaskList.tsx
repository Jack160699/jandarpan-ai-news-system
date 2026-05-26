"use client";

import { Check, Circle, Loader2 } from "lucide-react";
import type { AiTask } from "./types";

type EditorAiTaskListProps = {
  tasks: AiTask[];
};

export function EditorAiTaskList({ tasks }: EditorAiTaskListProps) {
  if (tasks.length === 0) return null;

  return (
    <ul className="jd-ai-tasks" aria-live="polite">
      {tasks.map((task) => (
        <li
          key={task.id}
          className={`jd-ai-tasks__item jd-ai-tasks__item--${task.status}`}
        >
          <span className="jd-ai-tasks__icon" aria-hidden>
            {task.status === "done" ? (
              <Check size={14} />
            ) : task.status === "running" ? (
              <Loader2 size={14} className="spin" />
            ) : (
              <Circle size={14} />
            )}
          </span>
          <span>{task.label}</span>
        </li>
      ))}
    </ul>
  );
}
