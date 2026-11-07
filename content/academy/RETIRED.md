# Retired: the `/academy/c/*` course system

The JSON curricula in `spark-foundations/`, `wire-arduino-robotics/`, `forge-ros2/`
and `edge-ai-robotics/` belonged to a second Academy that was retired on
8 Nov 2026.

Why it went: it duplicated the Spark MDX lessons, and its other three courses
were "Coming Soon — notify me at launch" pages with no lessons. `/start` sent
beginners straight into those waitlists, so the recommended path for a new
visitor ended on an email form for a course that did not exist.

There is now one Academy: `content/academy/<track>/<nn>.mdx`, served at
`/academy/<track>/<lesson>`. All `/academy/c/*` URLs 308 to the matching track.

These JSON files are kept because the Spark block content was genuinely
authored, and the interactive block format may be worth reviving inside the
single Academy. Nothing serves them today.
