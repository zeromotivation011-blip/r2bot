# Adding a video course

1. Upload each lesson to YouTube (Unlisted is fine). Copy the video ID (the part after `v=`).
2. Copy `sample-how-robots-work/` to `content/courses/<your-slug>/` and edit `course.json`.
3. For each lesson set `id` (e.g. `01-intro`), `title`, `summary`, `youtubeId`, `durationMin`, and 3-5 quiz questions
   (`answer` is the index of the correct option, starting at 0).
4. Keep `"status": "draft"` while testing (drafts are hidden in production), then change it to `"published"`.
5. Merge. The course appears at /courses, in the sitemap, and gets its own certificate.

Rules built in: a lesson counts after 85% of the video is actually played and a quiz score of 70%+. Quiz answers stay on the server.
Run migration `supabase/migrations/0043_video_courses.sql` once so resume-position tracking and certificates work.
