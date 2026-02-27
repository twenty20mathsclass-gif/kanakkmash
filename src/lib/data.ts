import type { Course, StudentProgress, User, PracticeTopic } from './definitions';

// The hardcoded users array has been removed. User data is now managed by Firebase Authentication and Firestore.
// You can find user data in your Firebase project's console.
// The `mathsadmin@gmail.com` user with password `admin@twenty20` will be created in Firestore on first login.
export const users: User[] = [];

export const courses: Course[] = [
  {
    id: 'advanced-math-framework',
    title: 'Advanced Math Framework',
    description: 'An advanced look at modern mathematical frameworks and methodologies, from limits to series.',
    imageId: 'algebra-basics',
    modules: [
      {
        id: 'amf-m1',
        title: 'Introduction to Calculus',
        lessons: [
          { id: 'amf-l1', title: 'Introduction to Limits', content: '<p>A limit is the value that a function approaches as the input approaches some value.</p>', topicForAI: 'Introduction to limits in calculus' },
          { id: 'amf-l2', title: 'Evaluating Limits', content: '<p>Learn various techniques to evaluate the limits of functions.</p>', topicForAI: 'Evaluating limits of functions' },
        ],
      },
      {
        id: 'amf-m2',
        title: 'Derivatives',
        lessons: [
          { id: 'amf-l3', title: 'The Derivative as a Function', content: '<p>Understand the definition of a derivative and how it represents a rate of change.</p>', topicForAI: 'Definition of the derivative' },
        ],
      },
      {
        id: 'amf-m3',
        title: 'Integration',
        lessons: [],
      },
      {
        id: 'amf-m4',
        title: 'Differential Equations',
        lessons: [],
      },
      {
        id: 'amf-m5',
        title: 'Sequences and Series',
        lessons: [],
      },
      {
        id: 'amf-m6',
        title: 'Applications of Calculus',
        lessons: [],
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
  'advanced-math-framework': {
    completedLessons: ['amf-l1'],
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
