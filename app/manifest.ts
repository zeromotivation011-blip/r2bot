import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "R2BOT — Learn Robotics, from Zero to Job-Ready",
    short_name: 'R2BOT',
    description:
      "The world's most accessible robotics platform. Every robot, every breakthrough, every concept — explained in plain English.",
    start_url: '/',
    display: 'standalone',
    background_color: '#030712',
    theme_color: '#f59e0b',
    orientation: 'portrait-primary',
    categories: ['education', 'science', 'technology'],
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/favicon.ico', sizes: '32x32', type: 'image/x-icon' },
    ],
  };
}
