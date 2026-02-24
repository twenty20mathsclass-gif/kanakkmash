export const dynamic = 'force-dynamic';

export default function AdminBlogCreatePage() {
  return (
    <div className="space-y-8">
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold font-headline">Blog Creation</h1>
                <p className="text-muted-foreground">Create and manage blog posts.</p>
            </div>
        </div>
        <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">
            Blog creation tools are coming soon.
        </div>
    </div>
  );
}
