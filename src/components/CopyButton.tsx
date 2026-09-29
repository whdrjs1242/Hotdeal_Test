"use client";
import { useState } from "react";
import { Icon } from "./Icon";

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className="press mt-3 flex h-11 w-full items-center justify-center gap-1.5 truncate rounded-xl bg-fill px-3 text-[14px] font-semibold"
    >
      <Icon name={done ? "check" : "link"} size={18} />
      {done ? "복사했어요" : label}
    </button>
  );
}
