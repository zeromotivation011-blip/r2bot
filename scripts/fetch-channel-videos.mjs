#!/usr/bin/env node
// scripts/fetch-channel-videos.mjs
//
// Dumps every video on the R2BOT channel — public, unlisted and scheduled —
// so lesson pages can be built before a Short goes live.
//
// WHY THIS EXISTS
// The growth loop is one Short, one lesson page, with the page live BEFORE the
// Short publishes and its URL in the description and pinned comment. 31 Shorts
// are scheduled for 17-22 Nov. A scheduled video is not public, so nothing in
// a cloud session can see it: YouTube answers "Sign in to confirm you're not a
// bot" to datacentre IPs, and a plain API key cannot read private or scheduled
// videos at all. It has to run on the machine that is signed in — yours.
//
// USAGE (on your Mac)
//
//   brew install yt-dlp                       # once
//   node scripts/fetch-channel-videos.mjs     # uses your Chrome cookies
//   node scripts/fetch-channel-videos.mjs --browser safari
//
// Writes channel-videos.json next to the repo root and prints a summary table.
// Send me that file (or paste the table) and I build the lesson pages.
//
// If yt-dlp cannot see the scheduled ones even with cookies — YouTube moves
// this around — fall back to --manual, which prints the exact format to paste:
//
//   node scripts/fetch-channel-videos.mjs --manual
//
// Nothing here publishes, edits or deletes anything on the channel. It reads.

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { writeFile } from 'node:fs/promises'

const run = promisify(execFile)
const args = process.argv.slice(2)
const browser = (() => {
  const i = args.indexOf('--browser')
  return i >= 0 ? args[i + 1] : 'chrome'
})()

const CHANNEL = 'https://www.youtube.com/@R2BOTINDIA'

if (args.includes('--manual')) {
  console.log(`
Paste one line per Short, in this exact format:

  VIDEOID | Title of the Short | scheduled YYYY-MM-DD

For example:

  dQw4w9WgXcQ | What is a servo? | scheduled 2026-11-17
  abc123XYZ_1 | How LiDAR sees   | scheduled 2026-11-17

Get them from YouTube Studio -> Content -> Shorts, with the filter set to
"Scheduled". The video id is the last part of each video's URL.
`)
  process.exit(0)
}

/** Ask yt-dlp for a tab, flat (no per-video network calls), as JSON lines. */
async function dumpTab(path) {
  const { stdout } = await run(
    'yt-dlp',
    [
      '--flat-playlist',
      '--no-warnings',
      `--cookies-from-browser=${browser}`,
      '--print',
      '%(id)s\t%(title)s\t%(availability)s\t%(release_timestamp)s\t%(duration)s',
      `${CHANNEL}/${path}`,
    ],
    { maxBuffer: 32 * 1024 * 1024 },
  )
  return stdout
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [id, title, availability, release, duration] = l.split('\t')
      return {
        id,
        title,
        availability: availability === 'NA' ? null : availability,
        releaseTimestamp: release && release !== 'NA' ? Number(release) : null,
        durationSec: duration && duration !== 'NA' ? Number(duration) : null,
      }
    })
}

const tabs = ['videos', 'shorts', 'streams']
const seen = new Map()

for (const tab of tabs) {
  try {
    for (const v of await dumpTab(tab)) if (!seen.has(v.id)) seen.set(v.id, { ...v, tab })
    console.log(`  ${tab}: ok`)
  } catch (err) {
    const msg = String(err.stderr || err.message).split('\n').pop()
    console.log(`  ${tab}: skipped (${msg.slice(0, 90)})`)
  }
}

const all = [...seen.values()]
const scheduled = all.filter((v) => v.releaseTimestamp && v.releaseTimestamp * 1000 > Date.now())

await writeFile(
  'channel-videos.json',
  `${JSON.stringify({ fetched: new Date().toISOString(), count: all.length, videos: all }, null, 2)}\n`,
)

console.log(`\n${all.length} videos found, ${scheduled.length} scheduled for the future.`)
console.log('wrote channel-videos.json\n')

if (scheduled.length) {
  console.log('Scheduled:')
  for (const v of scheduled.sort((a, b) => a.releaseTimestamp - b.releaseTimestamp)) {
    const when = new Date(v.releaseTimestamp * 1000).toISOString().slice(0, 10)
    console.log(`  ${v.id}  ${when}  ${v.title.slice(0, 60)}`)
  }
} else {
  console.log(
    'No scheduled videos visible. YouTube does not always expose them to yt-dlp\n' +
      'even with cookies. Run with --manual for the paste format instead.',
  )
}
