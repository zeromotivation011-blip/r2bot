// scripts/atlas/v2-types.ts
// Shared types + body template for the V2 Atlas generator.

export type LegacyCategory =
  | 'sensors'
  | 'actuators'
  | 'control'
  | 'ai-and-perception'
  | 'fundamentals'
  | 'hardware'
  | 'robot-types'
  | 'applications';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export type QuizQ = {
  q: string;
  options: string[];
  answer: number;
  explain: string;
};

export type TermV2 = {
  slug: string;
  title: string;
  description: string; // 140-160 char SEO meta
  bucket: string; // 20-bucket slug
  category: LegacyCategory; // legacy enum
  difficulty: Difficulty;
  tags: string[];
  relatedTerms: string[];
  suggestedLessons?: string[];
  youtubeSearchQuery?: string;
  definition: string;
  howItWorks: string;
  realWorld: string;
  whyItMatters: string;
  tryItYourself: string;
  quiz: [QuizQ, QuizQ, QuizQ];
};

function humanize(slug: string): string {
  return slug.split('-').map((s) => s[0].toUpperCase() + s.slice(1)).join(' ');
}

function escapeQuote(s: string): string {
  return s.replace(/"/g, '\\"');
}

function stripTitleSuffix(title: string): string {
  return title
    .replace(/\s*[—–-]\s*Complete\s+Guide.*$/i, '')
    .replace(/\s*\|\s*R2BOT\s*$/i, '')
    .trim();
}

export function frontmatterFor(t: TermV2): string {
  const today = new Date().toISOString().slice(0, 10);
  const list = (xs: string[]) => xs.map((s) => `  - ${s}`).join('\n');
  const suggested = t.suggestedLessons?.length
    ? `\nsuggestedLessons:\n${list(t.suggestedLessons)}`
    : '';
  const ytq = t.youtubeSearchQuery ? `\nyoutubeSearchQuery: "${escapeQuote(t.youtubeSearchQuery)}"` : '';
  return `---
title: "${escapeQuote(t.title)}"
summary: "${escapeQuote(t.description)}"
category: ${t.category}
bucket: ${t.bucket}
difficulty: ${t.difficulty}
lastReviewed: ${today}
tags:
${list(t.tags)}
relatedTerms:
${list(t.relatedTerms)}
seeAlso:
${list(t.relatedTerms)}${suggested}${ytq}
---`;
}

/** Programming/software buckets get an auto-generated Python snippet placeholder. */
function codeExampleFor(t: TermV2): string {
  const programmingBuckets = ['programming-software', 'control-systems', 'ai-machine-learning', 'computer-vision', 'navigation-localization', 'ros2-ecosystem'];
  if (!programmingBuckets.includes(t.bucket)) return '';
  const safe = stripTitleSuffix(t.title);
  return `

## Code Example

A minimal Python sketch of ${safe} in action:

\`\`\`python
# ${safe} — minimal example
# Run with: python ${t.slug}.py

def main():
    # 1. Initialise the relevant module
    print("Demo: ${safe}")

    # 2. Apply the concept on a tiny dataset
    inputs = [1, 2, 3, 4, 5]
    outputs = [x * 2 for x in inputs]

    # 3. Print the result
    print("Inputs :", inputs)
    print("Outputs:", outputs)

if __name__ == "__main__":
    main()
\`\`\`

Replace the toy logic with the real ${safe} workflow once you have it working. Run \`pip install\` for any libraries you import.`;
}

export function bodyFor(t: TermV2): string {
  const heading = stripTitleSuffix(t.title);
  const quizJson = JSON.stringify(t.quiz, null, 2);
  const relatedLinks = t.relatedTerms
    .map((s) => `- [${humanize(s)}](/atlas/concept/${s})`)
    .join('\n');
  const codeExample = codeExampleFor(t);

  return `# ${heading}

## What is ${heading}?

${t.definition}

## How It Works

${t.howItWorks}

## Real-World Example

${t.realWorld}

## Why It Matters for Robotics

${t.whyItMatters}

## Try It Yourself

${t.tryItYourself}
${codeExample}

## Quick Quiz

\`\`\`quiz
${quizJson}
\`\`\`

## Further Reading

${relatedLinks}

## Ask R2 About This

Open the R2 Co-pilot (press **⌘K** anywhere on R2BOT) and ask: *"Explain ${heading} for a Class 9 student in India, with one real-world Indian example."* You'll get a tailored, sourced answer in seconds.
`;
}

export function mdxFor(t: TermV2): string {
  return `${frontmatterFor(t)}\n\n${bodyFor(t)}`;
}
