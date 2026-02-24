export const dynamic = 'force-dynamic';

export default function AdminMockTestCreatePage() {
  return (
    <div className="space-y-8">
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold font-headline">Mock Test Creator</h1>
                <p className="text-muted-foreground">Create and manage mock tests.</p>
            </div>
        </div>
        <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">
            Mock test creation tools are coming soon.
        </div>
    </div>
  );
}
