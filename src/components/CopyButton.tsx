"use client";
import { useState } from "react";

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={async () => {
        if (navigator.share && /Mobi/.test(navigator.userAgent)) {
          try {
            await navigator.share({ url: text });
            return;
          } catch {}
        }
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className="mt-3 h-11 w-full truncate rounded-xl bg-ink px-3 text-sm font-bold text-surface"
    >
      {done ? "✅ 복사됐어요" : label}
    </button>
  );
}
