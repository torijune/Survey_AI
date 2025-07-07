"use client";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    setDark(saved === "dark");
  }, []);

  return (
    <button
      onClick={() => setDark((v) => !v)}
      className="p-2 rounded border bg-muted hover:bg-accent transition-colors"
      aria-label="다크 모드 토글"
      type="button"
    >
      {dark ? "🌙" : "☀️"}
    </button>
  );
} 