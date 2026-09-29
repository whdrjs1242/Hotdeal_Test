import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md bg-surface px-6 py-32 text-center">
      <p className="text-[17px] font-bold">페이지를 찾을 수 없어요</p>
      <p className="mt-1 text-[14px] text-sub">딜이 삭제됐거나 주소가 바뀌었을 수 있어요.</p>
      <Link href="/" className="press mt-6 inline-flex h-12 items-center rounded-xl bg-ink px-6 text-[15px] font-semibold text-surface">
        홈으로 가기
      </Link>
    </div>
  );
}
