export const dynamic = 'force-dynamic';

export default function PurchasedCoursesPage() {
  return (
    <div className="space-y-8">
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold font-headline">Payment History</h1>
                <p className="text-muted-foreground">Review your purchased courses and payment history.</p>
            </div>
        </div>
        <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">
            Your payment history will appear here.
        </div>
    </div>
  );
}
