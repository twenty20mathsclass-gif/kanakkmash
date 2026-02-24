import { AddUserDialog } from "@/components/admin/add-user-dialog";

export default function TeacherStudentsPage() {
  return (
    <div className="space-y-8">
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold font-headline">Student Management</h1>
                <p className="text-muted-foreground">Add new students to the platform.</p>
            </div>
            <AddUserDialog creatorRole="teacher" />
        </div>
        <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">
            Student listing and detailed management features are coming soon.
        </div>
    </div>
  );
}
