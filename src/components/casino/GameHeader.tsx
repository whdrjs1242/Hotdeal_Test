import Link from "next/link";

export function GameHeader({ title }: { title: string }) {
  return (
    <div className="flex h-14 items-center gap-2 px-3">
      <Link href="/casino" aria-label="라운지로" className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-xl">
        ‹
      </Link>
      <h1 className="font-display text-xl text-[#ffd666]">{title}</h1>
    </div>
  );
}
