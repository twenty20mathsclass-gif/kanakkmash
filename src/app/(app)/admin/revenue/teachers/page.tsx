export const dynamic = 'force-dynamic';

export default function AdminRevenueTeachersPage() {
  return (
    <div className="space-y-8">
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold font-headline">Revenue Paid to Teachers</h1>
                <p className="text-muted-foreground">Track payments to teachers.</p>
            </div>
        </div>
        <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">
            Teacher payment tracking is coming soon.
        </div>
    </div>
  );
}
