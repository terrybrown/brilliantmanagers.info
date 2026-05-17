export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-label="Brilliant Managers">
      <rect width="32" height="32" rx="7" fill="#f59e0b" />
      <path
        d="M5,24 C9,22 13,12 17,15 C21,18 23,7 27,6 L27,27 L5,27 Z"
        fill="#0f172a"
        opacity="0.25"
      />
      <path
        d="M5,24 C9,22 13,12 17,15 C21,18 23,7 27,6"
        fill="none"
        stroke="#0f172a"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="27" cy="6" r="2.5" fill="#0f172a" />
    </svg>
  )
}
