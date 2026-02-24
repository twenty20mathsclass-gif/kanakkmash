
import Link from 'next/link'
import { Button } from '@/components/ui/button'

// This page is rendered dynamically to ensure Firebase initializes correctly,
// as it would otherwise be pre-rendered at build time without the necessary API keys.
export const dynamic = 'force-dynamic'
 
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
      <div className="space-y-4">
        <h1 className="text-6xl font-bold font-headline text-primary">404</h1>
        <h2 className="text-3xl font-bold">Page Not Found</h2>
        <p className="text-muted-foreground">
          Sorry, the page you are looking for could not be found.
        </p>
        <Button asChild className="mt-4">
          <Link href="/">Return to Home</Link>
        </Button>
      </div>
    </div>
  )
}
