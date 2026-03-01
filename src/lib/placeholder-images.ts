export type ImagePlaceholder = {
  id: string;
  description: string;
  imageUrl: string;
  imageHint: string;
};

const data = {
  "placeholderImages": [
    {
      "id": "algebra-basics",
      "description": "A blackboard with algebraic equations.",
      "imageUrl": "https://images.unsplash.com/photo-1758685848663-784d2f7051d7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw3fHxhbGdlYnJhJTIwYmxhY2tib2FyZHxlbnwwfHx8fDE3NzE5MTgwMjR8MA&ixlib=rb-4.1.0&q=80&w=1080",
      "imageHint": "algebra blackboard"
    },
    {
      "id": "geometry-fundamentals",
      "description": "Geometric shapes and tools on a desk.",
      "imageUrl": "https://images.unsplash.com/photo-1628002580365-f3c0a322d577?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw0fHxnZW9tZXRyeSUyMHRvb2xzfGVufDB8fHx8MTc3MTkxODAyNHww&ixlib=rb-4.1.0&q=80&w=1080",
      "imageHint": "geometry tools"
    },
    {
      "id": "calculus-essentials",
      "description": "Graphs and functions related to calculus.",
      "imageUrl": "https://images.unsplash.com/photo-1727522974735-44251dfe61b3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw5fHxjYWxjdWx1cyUyMGdyYXBofGVufDB8fHx8MTc3MTkxODAyNHww&ixlib=rb-4.1.0&q=80&w=1080",
      "imageHint": "calculus graph"
    },
    {
      "id": "statistics-intro",
      "description": "Charts and graphs representing statistical data.",
      "imageUrl": "https://images.unsplash.com/photo-1762279389020-eeeb69c25813?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw5fHxzdGF0aXN0aWNzJTIwY2hhcnRzfGVufDB8fHx8MTc3MTkxODAyNHww&ixlib=rb-4.1.0&q=80&w=1080",
      "imageHint": "statistics charts"
    },
    {
      "id": "about-hero-woman",
      "description": "A smiling woman in a yellow sweater with social media icons around her.",
      "imageUrl": "https://picsum.photos/seed/about-hero/500/500",
      "imageHint": "smiling woman"
    },
    {
      "id": "about-experience-woman",
      "description": "A smiling woman in a brown sweater with charts and graphs around her.",
      "imageUrl": "https://picsum.photos/seed/about-exp/500/500",
      "imageHint": "woman smiling"
    },
    {
      "id": "about-service-1",
      "description": "A person using a laptop with charts on the screen.",
      "imageUrl": "https://picsum.photos/seed/about-service1/600/400",
      "imageHint": "laptop charts"
    },
    {
      "id": "about-service-2",
      "description": "A person having a video call on a laptop.",
      "imageUrl": "https://picsum.photos/seed/about-service2/600/400",
      "imageHint": "video call"
    },
    {
      "id": "about-service-3",
      "description": "A person writing in a notebook during an online class.",
      "imageUrl": "https://picsum.photos/seed/about-service3/600/400",
      "imageHint": "online class"
    },
    {
      "id": "fida-shirin",
      "description": "A portrait of Fida Shirin G, founder of Kanakkmash.",
      "imageUrl": "https://picsum.photos/seed/fida-shirin/500/500",
      "imageHint": "woman mentor"
    }
  ]
}

export const PlaceHolderImages: ImagePlaceholder[] = data.placeholderImages;
