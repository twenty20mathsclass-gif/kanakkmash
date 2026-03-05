
'use client';
import { BlogPostForm } from '@/components/shared/blog-post-form';
import { Reveal } from '@/components/shared/reveal';

export const dynamic = 'force-dynamic';

export default function AdminBlogCreatePage() {
  return (
    <div className="space-y-8">
        <Reveal>
            <div>
                <h1 className="text-3xl font-bold font-headline">Blog Creator</h1>
                <p className="text-muted-foreground">Craft a new post for the community.</p>
            </div>
        </Reveal>
        <Reveal delay={0.2}>
            <BlogPostForm />
        </Reveal>
    </div>
  );
}
