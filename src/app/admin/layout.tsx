/** 관리자 대시보드는 모바일 셸 밖에서 넓게 렌더 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="dash min-h-dvh">{children}</div>;
}
