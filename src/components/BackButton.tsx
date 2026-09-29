"use client";
import { useRouter } from "next/navigation";
import { Icon } from "./Icon";

export function BackButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => (history.length > 1 ? router.back() : router.push("/"))}
      aria-label="뒤로 가기"
      className="press flex h-10 w-10 items-center justify-center rounded-full text-ink"
    >
      <Icon name="back" />
    </button>
  );
}
