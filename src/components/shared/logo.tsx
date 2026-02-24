import Link from 'next/link';

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2" prefetch={false}>
      <svg
        className="h-7 w-7"
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M4 0C1.79086 0 0 1.79086 0 4V24C0 26.2091 1.79086 28 4 28H8V0H4Z"
          fill="#f4f4f5"
        />
        <path d="M24 14L8 0V28L24 14Z" fill="#2CDD84" />
        <path d="M16 14L4 4V24L16 14Z" fill="#2CDD84" fillOpacity="0.6" />
      </svg>
      <span className="text-xl font-bold font-headline">
        <span style={{ color: '#2CDD84' }}>kanakk</span>
        <span className="text-foreground">mash</span>
      </span>
    </Link>
  );
}
