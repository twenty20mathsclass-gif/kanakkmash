export const dynamic = 'force-dynamic';

export default function AttendancePage() {
  return (
    <div className="space-y-8">
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold font-headline">Students' Attendance</h1>
                <p className="text-muted-foreground">Track your students' attendance.</p>
            </div>
        </div>
        <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">
            Attendance tracking features are coming soon.
        </div>
    </div>
  );
}
