import { MetadataRoute } from 'next';
import { courses } from '@/lib/data';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://www.kanakkmash.com';

  const staticPages = [
    { url: '/', priority: 1.0 },
    { url: '/courses', priority: 0.8 },
    { url: '/blog', priority: 0.7 },
    { url: '/materials', priority: 0.7 },
    { url: '/community', priority: 0.7 },
    { url: '/practice', priority: 0.7 },
    { url: '/sign-in', priority: 0.5 },
    { url: '/sign-up', priority: 0.5 },
    { url: '/terms-and-conditions', priority: 0.3 },
  ];

  const staticUrls = staticPages.map((page) => ({
    url: `${baseUrl}${page.url}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as 'weekly',
    priority: page.priority,
  }));

  const lessonUrls = courses.flatMap((course) =>
    course.modules.flatMap((module) =>
      module.lessons.map((lesson) => ({
        url: `${baseUrl}/courses/${course.id}/lessons/${lesson.id}`,
        lastModified: new Date(),
        changeFrequency: 'monthly' as 'monthly',
        priority: 0.6,
      }))
    )
  );

  return [...staticUrls, ...lessonUrls];
}
