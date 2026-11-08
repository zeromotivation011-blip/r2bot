// Site-wide Lighthouse, accessibility and SEO auditing — github.com/harlan-zw/unlighthouse (MIT)
//
// WHY THIS TOOL, AND WHY NOW
//
// Everything that guards this site measures whether a page EXISTS. The sitemap
// check counts URLs. lychee proves links resolve. The Lighthouse budget in
// quality.yml scores ONE page, the homepage. On 8 Nov 2026 all 512 Atlas pages
// served a blank husk for hours and every one of those checks stayed green.
//
// CLAUDE.md §3 sets three bars that nothing currently measures across the site:
//   - Lighthouse > 90 on core pages  (measured on the homepage only)
//   - WCAG AA accessibility          (measured nowhere at all)
//   - best-in-class SEO per page     (measured nowhere at all)
//
// Unlighthouse reads the sitemap, crawls, and runs the full Lighthouse suite —
// performance, accessibility, SEO, best-practices — on every template. It is the
// difference between "the page is there" and "the page is good".
//
// NO BUNDLE IMPACT: this is a CI-only global CLI, deliberately NOT a dependency
// in package.json. Nothing here ships to a visitor.
//
// Scanning options live as flags in .github/workflows/site-audit.yml, not here,
// so this file holds only the two things whose shape is documented and stable.
module.exports = {
  site: 'https://www.r2bot.in',

  // MEASURED, then set. Run 42510930736 (8 Nov 2026), 23 URLs, one per
  // template, mobile, zero pages skipped:
  //
  //   category        average   worst page
  //   performance        91     66  /atlas/person/rodney-brooks
  //                             71  /daily-life
  //                             75  /robots/nao
  //   accessibility      89     85  /atlas
  //                             86  /visualizer
  //                             87  every Atlas entry template
  //   seo               100     91  /academy/spark
  //   best-practices     99     96  /academy/spark/01
  //
  // These are REGRESSION FLOORS, set just under the worst real page — not the
  // §3 target. They exist to catch a page getting worse, and they are the
  // honest version: the earlier lighthouse-budget.json had to be a ratchet
  // above measured reality for the same reason. Raise them only with a fresh
  // measurement and a note, never to turn a build green.
  //
  // Performance gets wider clearance than the rest because Lighthouse
  // performance is genuinely noisy run to run; accessibility is rule-based and
  // barely moves, so its floor sits at the measured worst.
  //
  // §3 wants Lighthouse > 90 and WCAG AA. Neither is met yet: performance
  // reaches 66 at worst and accessibility sits at 85–89 site-wide. Note that
  // every Atlas entry template scores the same 87, which points at one shared
  // component rather than 512 separate problems — one fix, broad payoff.
  ci: {
    budget: {
      'performance': 60,
      'accessibility': 85,
      'best-practices': 95,
      'seo': 90,
    },
  },
}
