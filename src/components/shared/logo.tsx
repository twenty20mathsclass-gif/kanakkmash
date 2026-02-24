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
          className="fill-foreground"
        />
        <path d="M24 14L8 0V28L24 14Z" className="fill-primary" />
        <path d="M16 14L4 4V24L16 14Z" className="fill-primary opacity-60" />
      </svg>
      <span className="text-xl font-bold font-headline">
        <span className="text-primary">kanakk</span>
        <span className="text-foreground">mash</span>
      </span>
    </Link>
  );
}
