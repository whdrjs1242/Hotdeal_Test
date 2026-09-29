import Link from "next/link";

export default function NotFound() {
  return (
    <div className="px-6 pt-32 text-center">
      <div className="text-5xl">🧺</div>
      <h1 className="mt-4 text-xl font-black">찾는 페이지가 없어요</h1>
      <p className="mt-2 text-sm text-sub">딜이 삭제됐거나 주소가 바뀌었을 수 있어요.</p>
      <Link href="/" className="mt-6 inline-block rounded-xl bg-brand px-6 py-3 font-bold text-white">
        오늘의 핫딜 보러가기
      </Link>
    </div>
  );
}
