"use client";
import { useState } from "react";

/** 외부 상품 이미지: 불러오지 못하면 깨진 아이콘 대신 빈 바탕을 보여준다 */
export function Img({ src, alt = "", className = "", lazy = true }: { src: string | null | undefined; alt?: string; className?: string; lazy?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading={lazy ? "lazy" : undefined} onError={() => setFailed(true)} className={className} />;
}
