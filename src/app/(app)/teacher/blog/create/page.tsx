
'use client';
import { BlogPostForm } from '@/components/shared/blog-post-form';
import { Reveal } from '@/components/shared/reveal';

export const dynamic = 'force-dynamic';

export default function TeacherBlogCreatePage() {
  return (
    <div className="space-y-8">
        <Reveal>
            <div>
                <h1 className="text-3xl font-bold font-headline">Blog Creation</h1>
                <p className="text-muted-foreground">Write and publish new blog posts.</p>
            </div>
        </Reveal>
        <Reveal delay={0.2}>
            <BlogPostForm />
        </Reveal>
    </div>
  );
}
