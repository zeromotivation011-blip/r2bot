import type { AtlasType } from '@/lib/atlas';
import { getAtlasEntryMerged } from '@/lib/atlas-db';

// The enrichment fields one Atlas entry carries (plain explanation, analogy,
// quiz, connections…). The /atlas hub's term drawer loads these on open rather
// than shipping them for all 500+ entries in the page HTML.
export const revalidate = 86400;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ type: string; slug: string }> },
) {
  const { type, slug } = await params;
  const e = await getAtlasEntryMerged(type as AtlasType, slug);
  if (!e) return Response.json({ error: 'not found' }, { status: 404 });
  return Response.json(
    {
      slug: e.slug,
      type: e.type,
      title: e.title,
      summary: e.summary || '',
      oneLiner: e.oneLiner || '',
      difficultyLevel: e.difficultyLevel ?? 3,
      difficultyLabel: e.difficultyLabel ?? 'Classroom',
      laymanExplanation: e.laymanExplanation || '',
      analogy: e.analogy || '',
      indianExample: e.indianExample || '',
      realRobotsThatUseThis: e.realRobotsThatUseThis ?? [],
      relatedTerms: [...(e.relatedTerms ?? []), ...(e.seeAlso ?? [])],
      prerequisiteTerms: e.prerequisiteTerms ?? [],
      unlocksTerms: e.unlocksTerms ?? [],
      mindBlowingFact: e.mindBlowingFact || '',
      youtubeId: e.youtubeId || '',
      industryApplications: e.industryApplications ?? [],
      whyItMatters: e.whyItMatters || '',
      technicalDefinition: e.technicalDefinition || e.summary || '',
      quizQuestion: e.quizQuestion ?? null,
    },
    { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' } },
  );
}
