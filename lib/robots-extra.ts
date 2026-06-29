// lib/robots-extra.ts
// Sidecar enrichment for Robot entries — tags, family-tree, parsed YouTube ID.
// Keep robots-data.ts as the source of truth for the main profile; this file adds
// the data needed by the 2026 voting/compare/tag-filter/family-tree UI.

import { ROBOTS, type Robot } from './robots-data';

export interface FamilyTreeEntry {
  name: string;
  slug?: string; // if known in /robots, this is the slug
  year?: number;
  isCurrent?: boolean;
}

export interface RobotExtra {
  tags: string[];
  videoId: string | null;
  familyTree: FamilyTreeEntry[] | null;
}

function parseYouTubeId(url?: string): string | null {
  if (!url) return null;
  const m = url.match(/(?:v=|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}

/** Per-slug enrichment table. Tags use lowercase, kebab. */
const EXTRAS: Record<string, Omit<RobotExtra, 'videoId'>> = {
  spot: {
    tags: ['quadruped', 'inspection', 'usa', 'commercial', 'iconic'],
    familyTree: [
      { name: 'BigDog', year: 2005 },
      { name: 'LittleDog', year: 2007 },
      { name: 'Cheetah', year: 2012 },
      { name: 'SpotMini', slug: 'spot-mini', year: 2016 },
      { name: 'Spot', slug: 'spot', year: 2019, isCurrent: true },
      { name: 'Spot Arm', year: 2021 },
    ],
  },
  atlas: {
    tags: ['humanoid', 'bipedal', 'research', 'usa', 'parkour', 'factory'],
    familyTree: [
      { name: 'BigDog', year: 2005 },
      { name: 'Petman', year: 2011 },
      { name: 'Atlas DRC', year: 2013 },
      { name: 'Atlas (hydraulic)', year: 2016 },
      { name: 'Atlas (electric)', slug: 'atlas', year: 2024, isCurrent: true },
    ],
  },
  curiosity: {
    tags: ['space', 'mars-rover', 'usa', 'nasa', 'planetary'],
    familyTree: [
      { name: 'Sojourner', year: 1997 },
      { name: 'Spirit', year: 2004 },
      { name: 'Opportunity', year: 2004 },
      { name: 'Curiosity', slug: 'curiosity', year: 2012, isCurrent: true },
      { name: 'Perseverance', slug: 'perseverance', year: 2021 },
    ],
  },
  roomba: {
    tags: ['consumer', 'home', 'usa', 'vacuum', 'iconic'],
    familyTree: [
      { name: 'Roomba 400', year: 2002 },
      { name: 'Roomba 700', year: 2011 },
      { name: 'Roomba 900', year: 2015 },
      { name: 'Roomba j7', year: 2021 },
      { name: 'Roomba (current)', slug: 'roomba', year: 2024, isCurrent: true },
    ],
  },
  'da-vinci': {
    tags: ['medical', 'surgical', 'usa', 'teleoperation'],
    familyTree: [
      { name: 'da Vinci Standard', year: 2000 },
      { name: 'da Vinci S', year: 2006 },
      { name: 'da Vinci Si', year: 2009 },
      { name: 'da Vinci Xi', year: 2014 },
      { name: 'da Vinci SP', slug: 'da-vinci', year: 2018, isCurrent: true },
      { name: 'da Vinci 5', year: 2024 },
    ],
  },
  asimo: {
    tags: ['humanoid', 'bipedal', 'japan', 'retired', 'iconic'],
    familyTree: [
      { name: 'E0', year: 1986 },
      { name: 'P2', year: 1996 },
      { name: 'P3', year: 1997 },
      { name: 'ASIMO 2000', year: 2000 },
      { name: 'ASIMO 2011', slug: 'asimo', year: 2011, isCurrent: true },
    ],
  },
  optimus: {
    tags: ['humanoid', 'bipedal', 'usa', 'commercial', 'factory'],
    familyTree: [
      { name: 'Tesla Bot concept', year: 2021 },
      { name: 'Optimus Gen 1', year: 2022 },
      { name: 'Optimus Gen 2', slug: 'optimus', year: 2023, isCurrent: true },
      { name: 'Optimus Gen 3', year: 2024 },
    ],
  },
  sophia: {
    tags: ['humanoid', 'social', 'hong-kong', 'media'],
    familyTree: [
      { name: 'Han', year: 2015 },
      { name: 'Sophia', slug: 'sophia', year: 2016, isCurrent: true },
      { name: 'Little Sophia', year: 2019 },
      { name: 'Grace', year: 2021 },
    ],
  },
  perseverance: {
    tags: ['space', 'mars-rover', 'usa', 'nasa', 'planetary'],
    familyTree: [
      { name: 'Sojourner', year: 1997 },
      { name: 'Spirit', year: 2004 },
      { name: 'Curiosity', slug: 'curiosity', year: 2012 },
      { name: 'Perseverance', slug: 'perseverance', year: 2021, isCurrent: true },
    ],
  },
  'figure-02': {
    tags: ['humanoid', 'bipedal', 'usa', 'factory', 'llm-powered'],
    familyTree: [
      { name: 'Figure 01', year: 2023 },
      { name: 'Figure 02', slug: 'figure-02', year: 2024, isCurrent: true },
    ],
  },
  aibo: {
    tags: ['companion', 'consumer', 'japan', 'pet'],
    familyTree: [
      { name: 'AIBO ERS-110', year: 1999 },
      { name: 'AIBO ERS-210', year: 2001 },
      { name: 'AIBO ERS-7', year: 2003 },
      { name: 'AIBO ERS-1000', slug: 'aibo', year: 2018, isCurrent: true },
    ],
  },
  pepper: {
    tags: ['humanoid', 'service', 'japan', 'social', 'retail'],
    familyTree: [
      { name: 'NAO', slug: 'nao', year: 2008 },
      { name: 'Pepper', slug: 'pepper', year: 2014, isCurrent: true },
    ],
  },
  nao: {
    tags: ['humanoid', 'educational', 'france', 'research'],
    familyTree: [
      { name: 'NAO V1', year: 2008 },
      { name: 'NAO V5', year: 2014 },
      { name: 'NAO V6', slug: 'nao', year: 2018, isCurrent: true },
    ],
  },
  paro: {
    tags: ['medical', 'companion', 'japan', 'therapy'],
    familyTree: [
      { name: 'PARO Gen 1', year: 2001 },
      { name: 'PARO Gen 8', slug: 'paro', year: 2014, isCurrent: true },
    ],
  },
  vyommitra: {
    tags: ['humanoid', 'space', 'india', 'isro'],
    familyTree: [
      { name: 'Vyommitra', slug: 'vyommitra', year: 2020, isCurrent: true },
    ],
  },
  'grey-orange-butler': {
    tags: ['warehouse', 'amr', 'india', 'commercial'],
    familyTree: [
      { name: 'Butler v1', year: 2014 },
      { name: 'Butler XL', year: 2018 },
      { name: 'Butler PickPal', year: 2022 },
      { name: 'Butler 2026', slug: 'grey-orange-butler', year: 2026, isCurrent: true },
    ],
  },
  'drdo-daksh': {
    tags: ['military', 'eod', 'india', 'tracked', 'defence'],
    familyTree: [
      { name: 'Daksh Mk-1', year: 2009 },
      { name: 'Daksh Mk-2', slug: 'drdo-daksh', year: 2017, isCurrent: true },
    ],
  },
  'spot-mini': {
    tags: ['quadruped', 'usa', 'retired', 'precursor'],
    familyTree: [
      { name: 'BigDog', year: 2005 },
      { name: 'SpotMini', slug: 'spot-mini', year: 2016, isCurrent: true },
      { name: 'Spot', slug: 'spot', year: 2019 },
    ],
  },
  ur5: {
    tags: ['cobot', 'industrial', 'denmark', 'commercial'],
    familyTree: [
      { name: 'UR5', slug: 'ur5', year: 2009, isCurrent: true },
      { name: 'UR10', year: 2012 },
      { name: 'UR3', year: 2015 },
      { name: 'UR16e', year: 2019 },
      { name: 'UR20', year: 2022 },
    ],
  },
  'kuka-kr': {
    tags: ['industrial', 'germany', 'arm', 'iconic'],
    familyTree: [
      { name: 'FAMULUS', year: 1973 },
      { name: 'KR 16', year: 1996 },
      { name: 'KR QUANTEC', year: 2010 },
      { name: 'KR AGILUS', slug: 'kuka-kr', year: 2020, isCurrent: true },
    ],
  },
};

/** Get extra (tags, videoId, familyTree) for a given robot. */
export function getRobotExtra(robot: Robot): RobotExtra {
  const e = EXTRAS[robot.slug];
  return {
    tags: e?.tags ?? [],
    videoId: parseYouTubeId(robot.videoUrl),
    familyTree: e?.familyTree ?? null,
  };
}

/** All unique tags across the catalogue, sorted by frequency descending. */
export function getAllTags(): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const r of ROBOTS) {
    for (const t of EXTRAS[r.slug]?.tags ?? []) {
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => ({ tag, count }));
}

/** Friendly display label for a tag. */
export function tagLabel(t: string): string {
  return t
    .split('-')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}
