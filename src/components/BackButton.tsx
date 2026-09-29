"use client";
import { useRouter } from "next/navigation";

export function BackButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => (history.length > 1 ? router.back() : router.push("/"))}
      aria-label="뒤로"
      className="flex h-10 w-10 items-center justify-center rounded-full text-xl active:bg-canvas"
    >
      ‹
    </button>
  );
}
