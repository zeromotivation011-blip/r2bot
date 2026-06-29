import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getAcademyLesson } from '@/lib/academy';
import { AcademyLessonView } from '@/components/AcademyLessonView';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://r2bot-psi.vercel.app';

export async function generateMetadata(): Promise<Metadata> {
  const lesson = getAcademyLesson('forge', '01');
  if (!lesson) return { title: 'Not found · Academy' };
  const canonical = `${BASE_URL}/academy/forge/01`;
  return {
    title: lesson.title,
    description: lesson.description,
    alternates: { canonical },
    openGraph: { url: canonical, title: lesson.title, description: lesson.description, type: 'article' },
  };
}

export default function ForgeLesson01() {
  const lesson = getAcademyLesson('forge', '01');
  if (!lesson) notFound();
  return <AcademyLessonView lesson={lesson} />;
}
