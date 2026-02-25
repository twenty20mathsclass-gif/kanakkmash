import { MetadataRoute } from 'next';
import { courses } from '@/lib/data';

const BASE_URL = 'https://www.kanakkmash.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    {
      url: `${BASE_URL}/`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 1,
    },
    {
      url: `${BASE_URL}/courses`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/materials`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
        url: `${BASE_URL}/community`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.5,
    },
    {
      url: `${BASE_URL}/sign-in`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/sign-up`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
        url: `${BASE_URL}/terms-and-conditions`,
        lastModified: new Date(),
        changeFrequency: 'yearly',
        priority: 0.3,
    },
    {
        url: `${BASE_URL}/practice`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.7,
    }
  ];

  const courseLessonRoutes = courses.flatMap((course) =>
    course.modules.flatMap((module) =>
      module.lessons.map((lesson) => ({
        url: `${BASE_URL}/courses/${course.id}/lessons/${lesson.id}`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.6,
      }))
    )
  );

  return [
      ...staticRoutes,
      ...courseLessonRoutes
    ];
}
