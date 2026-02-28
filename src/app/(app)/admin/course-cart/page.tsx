export const dynamic = 'force-dynamic';

export default function AdminCourseCartPage() {
  return (
    <div className="space-y-8">
        <div>
            <h1 className="text-3xl font-bold font-headline">Course Cart Management</h1>
            <p className="text-muted-foreground">Manage the content displayed on the student's course cart page.</p>
        </div>

        <div className="space-y-8">
            <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                <h2 className="text-xl font-bold mb-2">Offers Section</h2>
                <p>Functionality to list courses with offers is coming soon.</p>
            </div>
            <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                 <h2 className="text-xl font-bold mb-2">Categories Section</h2>
                <p>Functionality to list course categories is coming soon.</p>
            </div>
            <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">
                 <h2 className="text-xl font-bold mb-2">Popular Courses Section</h2>
                <p>Functionality to list popular courses is coming soon.</p>
            </div>
        </div>
    </div>
  );
}
