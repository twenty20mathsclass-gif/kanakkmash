import type { Course, StudentProgress, User, PracticeTopic } from './definitions';

// The hardcoded users array has been removed. User data is now managed by Firebase Authentication and Firestore.
// You can find user data in your Firebase project's console.
// The `mathsadmin@gmail.com` user with password `admin@twenty20` will be created in Firestore on first login.
export const users: User[] = [];

export const courses: Course[] = [
  {
    id: 'algebra-basics',
    title: 'Algebra Basics',
    description: 'Master the fundamentals of algebra, from variables to equations.',
    imageId: 'algebra-basics',
    modules: [
      {
        id: 'ab-m1',
        title: 'Introduction to Variables',
        lessons: [
          { id: 'ab-l1', title: 'What is a Variable?', content: '<p>A variable is a symbol for a number we don\'t know yet. It is usually a letter like x or y.</p>', topicForAI: 'Introduction to algebraic variables' },
          { id: 'ab-l2', title: 'Solving for x', content: '<p>Learn the basic techniques to isolate and solve for a single variable in an equation.</p>', topicForAI: 'Solving single variable linear equations' },
        ],
      },
    ],
  },
  {
    id: 'geometry-fundamentals',
    title: 'Geometry Fundamentals',
    description: 'Explore the world of shapes, angles, and spatial reasoning.',
    imageId: 'geometry-fundamentals',
    modules: [
      {
        id: 'gf-m1',
        title: 'Points, Lines, and Planes',
        lessons: [
          { id: 'gf-l1', title: 'Understanding Points and Lines', content: '<p>A point has no dimension. A line is a straight one-dimensional figure that has no thickness and extends endlessly in both directions.</p>', topicForAI: 'Euclidean points and lines' },
          { id: 'gf-l2', title: 'Introduction to Angles', content: '<p>An angle is the figure formed by two rays, called the sides of the angle, sharing a common endpoint, called the vertex of the angle.</p>', topicForAI: 'Types of angles (acute, obtuse, right)' },
        ],
      },
    ],
  },
   {
    id: 'calculus-essentials',
    title: 'Calculus Essentials',
    description: 'An introduction to derivatives and integrals, the building blocks of calculus.',
    imageId: 'calculus-essentials',
    modules: [
      {
        id: 'ce-m1',
        title: 'Understanding Limits',
        lessons: [
          { id: 'ce-l1', title: 'What are Limits?', content: '<p>In mathematics, a limit is the value that a function approaches as the input approaches some value.</p>', topicForAI: 'Introduction to limits in calculus' },
        ],
      },
    ],
  },
  {
    id: 'statistics-intro',
    title: 'Introduction to Statistics',
    description: 'Learn how to collect, analyze, and interpret data.',
    imageId: 'statistics-intro',
    modules: [
        {
            id: 'si-m1',
            title: 'Core Concepts',
            lessons: [
                {id: 'si-l1', title: 'Mean, Median, and Mode', content: '<p>Understand the central tendencies of data sets.</p>', topicForAI: 'Mean, median, and mode'},
            ]
        }
    ]
  }
];

export const studentProgress: StudentProgress = {
  'algebra-basics': {
    completedLessons: ['ab-l1'],
  },
  'geometry-fundamentals': {
    completedLessons: [],
  },
  'calculus-essentials': {
    completedLessons: [],
  },
  'statistics-intro': {
    completedLessons: [],
  },
};

export const practiceTopics: PracticeTopic[] = courses.flatMap(course => 
    course.modules.flatMap(module => 
        module.lessons.map(lesson => ({
            id: lesson.id,
            title: `${course.title}: ${lesson.title}`,
        }))
    )
);
