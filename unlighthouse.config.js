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

  // BUDGETS ARE DELIBERATELY NOT SET YET.
  //
  // The last budget added to this repo (lighthouse-budget.json) had to be a
  // ratchet above measured reality — homepage script 488 KB against a 350 KB
  // target, TBT 1,245 ms against 300 ms — because a budget invented from
  // aspiration either fails every build or gets quietly raised until it means
  // nothing. The same discipline applies here, and the numbers for 1,700 pages
  // are not known yet.
  //
  // So: the first scheduled run reports and does not fail. Read its summary,
  // then uncomment this with each category set just above what the site truly
  // scores, and tighten it from there. An honest 55 that holds is worth more
  // than a decorative 90 that gets switched off.
  //
  // ci: {
  //   budget: {
  //     'performance': 0,
  //     'accessibility': 0,
  //     'best-practices': 0,
  //     'seo': 0,
  //   },
  // },
}
