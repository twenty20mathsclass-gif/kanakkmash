import { MetadataRoute } from 'next';
import { courses } from '@/lib/data';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://www.kanakkmash.com';

  const staticPages = [
    { url: '/', priority: 1.0, changeFrequency: 'weekly' },
    { url: '/courses', priority: 0.8, changeFrequency: 'weekly' },
    { url: '/blog', priority: 0.8, changeFrequency: 'weekly' },
    { url: '/materials', priority: 0.8, changeFrequency: 'weekly' },
    { url: '/community', priority: 0.8, changeFrequency: 'weekly' },
    { url: '/practice', priority: 0.7, changeFrequency: 'monthly' },
    { url: '/sign-in', priority: 0.5, changeFrequency: 'monthly' },
    { url: '/sign-up', priority: 0.5, changeFrequency: 'monthly' },
    { url: '/terms-and-conditions', priority: 0.3, changeFrequency: 'yearly' },
  ];

  const staticUrls = staticPages.map((page) => ({
    url: `${baseUrl}${page.url}`,
    lastModified: new Date().toISOString().split('T')[0],
    changeFrequency: page.changeFrequency as 'weekly' | 'monthly' | 'yearly',
    priority: page.priority,
  }));

  const lessonUrls = courses.flatMap((course) =>
    course.modules.flatMap((module) =>
      module.lessons.map((lesson) => ({
        url: `${baseUrl}/courses/${course.id}/lessons/${lesson.id}`,
        lastModified: new Date().toISOString().split('T')[0],
        changeFrequency: 'monthly' as 'monthly',
        priority: 0.6,
      }))
    )
  );

  return [...staticUrls, ...lessonUrls];
}
