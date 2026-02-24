import Link from 'next/link';
import Image from 'next/image';

export function Logo() {
  return (
    <Link href="/" className="flex items-center" prefetch={false}>
      <Image
        src="/Asset 2@4x.webp"
        alt="kanakkmash logo"
        width={160}
        height={40}
        priority
      />
    </Link>
  );
}
