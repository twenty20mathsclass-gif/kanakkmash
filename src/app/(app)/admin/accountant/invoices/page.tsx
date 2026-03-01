export const dynamic = 'force-dynamic';

export default function AccountantInvoicesPage() {
  return (
    <div className="space-y-8">
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold font-headline">Student Invoices</h1>
                <p className="text-muted-foreground">Generate and track invoices for student fees and purchases.</p>
            </div>
        </div>
        <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">
            Invoice generation and tracking tools are coming soon.
        </div>
    </div>
  );
}
