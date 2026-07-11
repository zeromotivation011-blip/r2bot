import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getAcademyLesson, getLessonsForTrack } from '@/lib/academy';
import { AcademyLessonView } from '@/components/AcademyLessonView';

const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in');

const VALID_TRACKS = ['spark', 'wire', 'forge', 'edge'] as const;
type ValidTrack = (typeof VALID_TRACKS)[number];

type Params = Promise<{ track: string; lesson: string }>;

export async function generateStaticParams() {
  const all: { track: string; lesson: string }[] = [];
  for (const t of VALID_TRACKS) {
    for (const l of getLessonsForTrack(t)) {
      all.push({ track: t, lesson: l.slug });
    }
  }
  return all;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { track, lesson: slug } = await params;
  if (!VALID_TRACKS.includes(track as ValidTrack)) return { title: 'Not found · Academy' };
  const lesson = getAcademyLesson(track as ValidTrack, slug);
  if (!lesson) return { title: 'Not found · Academy' };
  const canonical = `${BASE_URL}/academy/${track}/${slug}`;
  return {
    title: lesson.title,
    description: lesson.description,
    alternates: { canonical },
    openGraph: {
      url: canonical,
      title: lesson.title,
      description: lesson.description,
      type: 'article',
    },
  };
}

export default async function DynamicAcademyLessonPage({ params }: { params: Params }) {
  const { track, lesson: slug } = await params;
  if (!VALID_TRACKS.includes(track as ValidTrack)) notFound();
  const lesson = getAcademyLesson(track as ValidTrack, slug);
  if (!lesson) notFound();
  return <AcademyLessonView lesson={lesson} />;
}
