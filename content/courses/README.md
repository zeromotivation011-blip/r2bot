# R2BOT video courses (5-course path)

Courses live in `content/courses/<slug>/course.json`, shown in order at /courses:
1. robotics-foundations (videos 1-10)
2. build-your-first-robot-pip (videos 11-20)
3. robot-arms-build-ari (videos 21-30)
4. robot-vision (videos 31-40)
5. robot-intelligence (videos 41-50)

## Adding a video
Each lesson has a `videoNo` (1-50) and an empty `"youtubeId": ""`. Paste the YouTube video ID (the part after `v=`) into `youtubeId`.
Until then the lesson shows "Video coming soon", its quiz stays locked, and the page is hidden from search engines and the sitemap.

## Rules built in
- A lesson counts after 85% of the video is actually played and a quiz score of 70%+ (3 of 4). Quiz answers stay on the server.
- A course certificate is issued when all 10 lessons are passed and the final activity is submitted.
- Final activity answers are stored in `course_assignments` (run migration 0046). Until it runs, the certificate does not wait for the activity.
- Run migration 0043 once so resume tracking and certificates work.

## Quiz review
The 200 quiz questions are drafts written from the lesson descriptions. Check each against its video before publishing, and edit `quiz` in the JSON if a video says something different.
