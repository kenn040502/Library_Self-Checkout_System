import type { YouTubeAsset } from './types';

const minutes = (value: number) => value * 60;

export const sampleYouTubeAssets: YouTubeAsset[] = [
  {
    urn: 'yt:video:library-self-service',
    title: 'How Self-Checkout Systems Work in Modern Libraries',
    description:
      'Explore the technology behind library self-service stations — from barcode and RFID scanning to patron authentication and real-time inventory updates.',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    imageUrl:
      'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    durationInSeconds: minutes(12),
    durationFormatted: '12m',
    skillLevel: 'BEGINNER',
    releasedAt: '2024-03-12T00:00:00Z',
    topics: ['library technology', 'self-checkout', 'rfid'],
    authors: [{ name: 'Library Tech Explained' }],
    contentType: 'VIDEO',
    channelTitle: 'Library Tech Explained',
  },
  {
    urn: 'yt:video:python-beginners',
    title: 'Python Tutorial for Beginners — Full Course (2024)',
    description:
      'Learn Python from scratch in this comprehensive beginner-friendly course. Covers variables, loops, functions, OOP, and real-world projects.',
    url: 'https://www.youtube.com/watch?v=rfscVS0vtbw',
    imageUrl:
      'https://i.ytimg.com/vi/rfscVS0vtbw/hqdefault.jpg',
    durationInSeconds: minutes(268),
    durationFormatted: '4h 28m',
    skillLevel: 'BEGINNER',
    releasedAt: '2024-01-15T00:00:00Z',
    topics: ['python', 'programming', 'software development'],
    authors: [{ name: 'freeCodeCamp.org' }],
    contentType: 'VIDEO',
    channelTitle: 'freeCodeCamp.org',
  },
  {
    urn: 'yt:video:machine-learning-intro',
    title: 'Machine Learning Crash Course — Google',
    description:
      'Fast-paced introduction to machine learning concepts including supervised learning, neural networks, and TensorFlow basics.',
    url: 'https://www.youtube.com/watch?v=GwIo3gDZCVQ',
    imageUrl:
      'https://i.ytimg.com/vi/GwIo3gDZCVQ/hqdefault.jpg',
    durationInSeconds: minutes(45),
    durationFormatted: '45m',
    skillLevel: 'INTERMEDIATE',
    releasedAt: '2024-07-18T00:00:00Z',
    topics: ['machine learning', 'data science', 'artificial intelligence'],
    authors: [{ name: 'Google Developers' }],
    contentType: 'VIDEO',
    channelTitle: 'Google Developers',
  },
  {
    urn: 'yt:video:data-analytics-powerbi',
    title: 'Data Analytics with Power BI — Complete Tutorial',
    description:
      'Translate raw data into actionable dashboards and KPIs using Microsoft Power BI. Covers data modelling, DAX, and report publishing.',
    url: 'https://www.youtube.com/watch?v=3u7MQz1EyPY',
    imageUrl:
      'https://i.ytimg.com/vi/3u7MQz1EyPY/hqdefault.jpg',
    durationInSeconds: minutes(68),
    durationFormatted: '1h 8m',
    skillLevel: 'ADVANCED',
    releasedAt: '2024-05-10T00:00:00Z',
    topics: ['data analytics', 'power bi', 'reporting'],
    authors: [{ name: 'Alex The Analyst' }],
    contentType: 'VIDEO',
    channelTitle: 'Alex The Analyst',
  },
  {
    urn: 'yt:video:web-dev-roadmap',
    title: 'Web Development Roadmap 2024 — Everything You Need to Know',
    description:
      'A complete guide to becoming a web developer in 2024. Covers HTML, CSS, JavaScript, React, Node.js, and career advice.',
    url: 'https://www.youtube.com/watch?v=pEfrdAtAmqk',
    imageUrl:
      'https://i.ytimg.com/vi/pEfrdAtAmqk/hqdefault.jpg',
    durationInSeconds: minutes(37),
    durationFormatted: '37m',
    skillLevel: 'BEGINNER',
    releasedAt: '2024-02-20T00:00:00Z',
    topics: ['web development', 'javascript', 'react'],
    authors: [{ name: 'Fireship' }],
    contentType: 'VIDEO',
    channelTitle: 'Fireship',
  },
  {
    urn: 'yt:video:cloud-computing',
    title: 'Cloud Computing Full Course — AWS, Azure, GCP',
    description:
      'Understand cloud platforms, deployment models, containers, CI/CD pipelines, and infrastructure as code in this comprehensive course.',
    url: 'https://www.youtube.com/watch?v=M988_fsOSWo',
    imageUrl:
      'https://i.ytimg.com/vi/M988_fsOSWo/hqdefault.jpg',
    durationInSeconds: minutes(195),
    durationFormatted: '3h 15m',
    skillLevel: 'INTERMEDIATE',
    releasedAt: '2023-11-05T00:00:00Z',
    topics: ['cloud computing', 'AWS', 'DevOps'],
    authors: [{ name: 'TechWorld with Nana' }],
    contentType: 'VIDEO',
    channelTitle: 'TechWorld with Nana',
  },
];
