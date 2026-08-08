"use client";

import { useState } from "react";
import { SunIcon, MoonIcon, MonitorIcon } from "./icons";

type Theme = "light" | "dark" | "system";

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem("theme");
  return stored === "dark" || stored === "light" ? stored : "system";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  if (theme !== "system") root.classList.add(theme);
  localStorage.setItem("theme", theme);
}

const OPTIONS: { value: Theme; label: string; Icon: typeof SunIcon }[] = [
  { value: "light", label: "Light theme", Icon: SunIcon },
  { value: "dark", label: "Dark theme", Icon: MoonIcon },
  { value: "system", label: "System theme", Icon: MonitorIcon },
];

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getStoredTheme);

  function select(next: Theme) {
    setTheme(next);
    applyTheme(next);
  }

  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-full border border-border bg-surface p-0.5"
      suppressHydrationWarning
    >
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          aria-label={label}
          aria-pressed={theme === value}
          onClick={() => select(value)}
          suppressHydrationWarning
          className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
            theme === value
              ? "bg-accent text-accent-foreground"
              : "text-muted hover:text-foreground"
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}
