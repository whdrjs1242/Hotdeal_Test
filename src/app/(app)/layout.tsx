import { BottomNav } from "@/components/BottomNav";

/** 사용자용 모바일 셸 (최대 폭 448px + 하단 탭바) */
export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app mx-auto min-h-dvh max-w-md bg-canvas shadow-sm">
      <main className="pb-28">{children}</main>
      <BottomNav />
    </div>
  );
}
