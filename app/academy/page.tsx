import type { Metadata } from 'next';
import Link from 'next/link';
import { Nav } from '@/components/Nav';
import { ParticleField } from '@/components/ParticleField';
import { CursorTrail } from '@/components/CursorTrail';
import { CopilotBubble } from '@/components/CopilotBubble';
import { CopilotDrawer } from '@/components/CopilotDrawer';
import { CopilotProvider } from '@/components/CopilotProvider';
import { listCourseSlugs, loadCourse } from '@/lib/academy/content-loader';
import { AcademyHomeClient } from './AcademyHomeClient';

export const metadata: Metadata = {
  title: 'Academy',
  description:
    'Project-based robotics courses for every level. Spark to Edge. Free to start, certificates that mean something.',
};

export default async function AcademyPage() {
  const slugs = listCourseSlugs();
  const courses = slugs
    .map(slug => loadCourse(slug))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  return (
    <CopilotProvider>
      <ParticleField />
      <CursorTrail />
      <Nav />
      <AcademyHomeClient courses={courses} />
      <CopilotBubble />
      <CopilotDrawer />
    </CopilotProvider>
  );
}
