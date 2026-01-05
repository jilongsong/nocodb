export function NocoIcon({ className = "", animate = false }: { className?: string; animate?: boolean }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <svg
        className={`w-10 h-10 ${animate ? "animate-pulse" : ""}`}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="40" height="40" rx="8" fill="#3366FF" />
        <path
          d="M12 14h16v2H12v-2zm0 5h16v2H12v-2zm0 5h10v2H12v-2z"
          fill="white"
        />
      </svg>
    </div>
  );
}
