export function HorizonWave({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      className={`w-full h-7 block ${className}`}
    >
      <path
        d="M0 18C50 6 100 26 150 16C200 6 250 24 300 14C340 6 370 12 400 8V28H0V18Z"
        fill="var(--color-sand-50)"
      />
    </svg>
  );
}
