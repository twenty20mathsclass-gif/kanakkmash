export const dynamic = 'force-dynamic';

export default function TestimonialsPage() {
  return (
    <div className="space-y-8">
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold font-headline">Testimonials</h1>
                <p className="text-muted-foreground">See what our students are saying about us.</p>
            </div>
        </div>
        <div className="p-8 text-center text-muted-foreground border-2 border-dashed rounded-lg">
            Testimonials from our students are coming soon.
        </div>
    </div>
  );
}
