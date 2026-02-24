export const dynamic = 'force-dynamic';

export default function CreateClassPage() {
  return (
    <div className="space-y-8">
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold font-headline">Create Class</h1>
                <p className="text-muted-foreground">Set up a new class for your students.</p>
            </div>
        </div>
        <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">
            Class creation tools are coming soon.
        </div>
    </div>
  );
}
