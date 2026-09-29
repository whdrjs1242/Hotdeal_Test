/**
 * 줍줍 라인 아이콘 세트 (24px, 1.8px 선). UI 크롬의 아이콘은 모두 여기서 가져온다.
 */
const P: Record<string, React.ReactNode> = {
  home: <path d="M3.5 10.5 12 3.5l8.5 7V20a1 1 0 0 1-1 1h-5v-6h-5v6h-5a1 1 0 0 1-1-1z" />,
  target: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="0.8" fill="currentColor" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  gift: (
    <>
      <rect x="3.5" y="8.5" width="17" height="4" rx="1" />
      <path d="M5 12.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7.5M12 8.5V21" />
      <path d="M12 8.5S10.5 4 8 4.5 6.5 8.5 12 8.5zM12 8.5S13.5 4 16 4.5 17.5 8.5 12 8.5z" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.5" r="4" />
      <path d="M4.5 20.5c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  bell: (
    <>
      <path d="M6 16.5V11a6 6 0 1 1 12 0v5.5l1.5 2h-15z" />
      <path d="M10 20.5a2 2 0 0 0 4 0" />
    </>
  ),
  back: <path d="M15 5 8 12l7 7" />,
  chevron: <path d="m9 5 7 7-7 7" />,
  down: <path d="m5 9 7 7 7-7" />,
  share: (
    <>
      <path d="M12 3.5v12M7.5 8 12 3.5 16.5 8" />
      <path d="M5 13v6a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-6" />
    </>
  ),
  up: <path d="M7.5 10.5 12 5l4.5 5.5M12 5.5V19" />,
  thumbUp: <path d="M8 10.5v9.5H4.5v-9.5zM8 10.5l3.5-6.5c1.5 0 2.5 1 2.2 2.6L13.2 10h5.3a2 2 0 0 1 2 2.3l-1.1 6a2 2 0 0 1-2 1.7H8" />,
  thumbDown: <path d="M8 13.5V4H4.5v9.5zM8 13.5l3.5 6.5c1.5 0 2.5-1 2.2-2.6l-.5-3.4h5.3a2 2 0 0 0 2-2.3l-1.1-6a2 2 0 0 0-2-1.7H8" />,
  comment: <path d="M4 5.5h16v11H9l-5 4z" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  link: <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  pencil: <path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" />,
  question: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.6 9.4A2.5 2.5 0 0 1 14.5 10c0 1.7-2.5 2-2.5 3.5" />
      <circle cx="12" cy="16.8" r="0.6" fill="currentColor" />
    </>
  ),
  bag: (
    <>
      <path d="M5 8h14l-1 12.5H6z" />
      <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
    </>
  ),
  trophy: (
    <>
      <path d="M8 4.5h8v5a4 4 0 0 1-8 0z" />
      <path d="M8 6H4.5v1.5A3 3 0 0 0 8 10.5M16 6h3.5v1.5a3 3 0 0 1-3.5 3M12 13.5V17M8.5 20h7M9.5 17h5v3h-5z" />
    </>
  ),
  chart: <path d="M4 20h16M7 16v-4M12 16V7M17 16v-6" />,
  calendar: (
    <>
      <rect x="4" y="5.5" width="16" height="14.5" rx="2" />
      <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
    </>
  ),
  game: (
    <>
      <rect x="3.5" y="7.5" width="17" height="10" rx="4" />
      <path d="M8 10.5v4M6 12.5h4" />
      <circle cx="15.5" cy="11.5" r="0.9" fill="currentColor" />
      <circle cx="17.5" cy="13.8" r="0.9" fill="currentColor" />
    </>
  ),
  shirt: <path d="M9 4 4 6.5l1.5 4 2-1V20h9V9.5l2 1 1.5-4L15 4c-.5 1.5-1.6 2.3-3 2.3S9.5 5.5 9 4z" />,
  flag: <path d="M5.5 21V4.5M5.5 4.5h11l-2 4 2 4h-11" />,
  trend: <path d="M4 16.5 9.5 11l3.5 3.5L20 7.5M15 7.5h5v5" />,
  coin: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v10M9.5 9.5c0-1 1.1-1.8 2.5-1.8s2.5.8 2.5 1.8-1 1.5-2.5 1.8-2.5.8-2.5 1.9 1.1 1.8 2.5 1.8 2.5-.8 2.5-1.8" />
    </>
  ),
  refresh: <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4" />,
  more: (
    <>
      <circle cx="6" cy="12" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="18" cy="12" r="1" fill="currentColor" />
    </>
  ),
};

export type IconName = keyof typeof P;

export function Icon({ name, size = 24, className = "", strokeWidth = 1.8 }: { name: string; size?: number; className?: string; strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-hidden
    >
      {P[name]}
    </svg>
  );
}
