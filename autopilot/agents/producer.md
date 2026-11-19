# Producer

Job: turn an approved script into a finished vertical video, put it on YouTube at the brand's next
posting slot, queue the same video for Instagram, and give it its lesson page. Works for all three
brands (`r2bot`, `rajstudy`, `rajchaupal`). Connected 19 Nov 2026.

## How it works

```
approved queue item  ->  render_short.py (this session)  ->  Supabase Storage `factory` bucket
   ->  google-sync yt_upload (scheduled at autopilot.next_slot)  ->  autopilot.ig_queue (posted by cron)
```

Everything after the render is a database call, so no key ever appears in a shell or a file.

## Steps, for each `kind='short'` item with `status='approved'` (max 4 a night)

1. **Setup (once per run)**
   ```bash
   pip install --break-system-packages -q edge-tts
   mkdir -p ~/.fonts && cd ~/.fonts
   curl -sSfL -o NotoSansDevanagari.ttf "https://raw.githubusercontent.com/google/fonts/main/ofl/notosansdevanagari/NotoSansDevanagari%5Bwdth,wght%5D.ttf"
   curl -sSfL -o Inter.ttf "https://raw.githubusercontent.com/google/fonts/main/ofl/inter/Inter%5Bopsz,wght%5D.ttf"
   fc-cache -f; [ -f ~/.ccr/ca-bundle.crt ] && export SSL_CERT_FILE=~/.ccr/ca-bundle.crt
   ```
   Keys come from Vault (SQL, then `export` in the same shell; never write them to a file):
   `select name, decrypted_secret from vault.decrypted_secrets where name in ('pexels_api_key','elevenlabs_api_key');`
   `PEXELS_API_KEY` is required. `ELEVENLABS_API_KEY` is used only when it is not `PLACEHOLDER`
   and a voice id is set (`ELEVEN_VOICE_<BRAND>`); otherwise the free Edge neural voice is used
   (R2BOT: en-US-AndrewMultilingualNeural, Hindi brands: hi-IN-MadhurNeural).

2. **Package.** Write the item's `payload` to `/tmp/<slug>.json`. Every scene needs a `broll` field:
   2-4 plain English words a stock library would have ("delivery robot", "golf course",
   "satellite orbit earth"). If the writer left it out, add it now. Avoid words that pull in people
   doing something unrelated (a "camera" search returned someone taping over CCTV).

3. **Render.** `python3 autopilot/factory/render_short.py /tmp/<slug>.json <brand> /tmp/<slug>.mp4`
   (about 90 s). It writes `<slug>.mp4.json` with duration, voice and the Pexels clips used.

4. **Look at it before it goes anywhere.** Pull 4 frames
   (`ffmpeg -ss <t> -i x.mp4 -frames:v 1 -vf scale=270:-1 f<t>.jpg`, stack with `hstack=4`) and read
   the image. Reject and re-render (change that scene's `broll`) if a clip contradicts the script,
   shows a recognisable person doing something off-topic, shows a *different* named place than the
   caption (a Delhi stepwell under "Chand Baori"), or text is unreadable. Duration must be 20-90 s.
   To fix one scene, search Pexels yourself, look at the candidates, and pin the one you want with
   `"broll_id": <pexels video id>` on that scene; it overrides the keyword search. If no footage of the
   real place exists, use honest generic footage (region, landscape, carving) rather than a look-alike.

5. **Store.** `select autopilot.google_sync('signed_upload', '{"path":"<brand>/shorts/<slug>.mp4"}')`,
   read `upload_url` from `net._http_response` (wait ~3 s), then
   `curl -X PUT -H "Content-Type: video/mp4" -H "x-upsert: true" --data-binary @/tmp/<slug>.mp4 "<upload_url>"`.
   Public URL: `https://rbvoelnmckmibncatpyu.supabase.co/storage/v1/object/public/factory/<brand>/shorts/<slug>.mp4`.

6. **Lesson page first (R2BOT).** First check the topic is new: `grep -rn "title:" lib/shorts*.ts` for the same
   subject. If a lesson already teaches it, attach the video to that lesson in `SCHEDULED_EXTRA_VIDEOS`
   and add a 308 in `next.config.mjs` from the slug in the description to the existing lesson (one topic,
   one URL; this happened with robot-lawn-mower on 19 Nov). Otherwise: The description links to `r2bot.in/shorts/<slug>`. Add the lesson
   to `lib/shorts-scheduled.ts` with `publishAt` = the slot and `ids` = the YouTube id from step 7
   (do step 7, then commit the lesson in the same run). See the `r2bot-short-to-lesson` skill.
   Raj Study: the description links to an existing page; Raj Chaupal: to the kissa page.

7. **YouTube.** Slot: `select autopilot.next_slot('<brand>')`. Then
   `select autopilot.google_sync('yt_upload', jsonb_build_object('brand',…,'path',…,'title',…,
   'description',…,'tags',…,'publish_at',<slot>,'queue_item_id',<id>))` and read the result
   (wait ~20 s): `{ok, video_id, publish_at}`. Failures are in `autopilot.uploads`.

8. **Instagram.** `insert into autopilot.ig_queue (brand, video_url, caption, publish_at, queue_item_id)`
   with the public URL, a caption (title, hook, "link in bio", 5-8 hashtags, `#reels` not `#shorts`)
   and the same slot. The `autopilot-ig-publish` cron posts it when due. All three accounts are
   connected (Raj Study since 19 Nov 2026, through its Facebook Page "Rajstudy RAS"). A brand with
   no row in `autopilot.ig_accounts` is skipped.

9. **Mark it.** `update autopilot.queue_items set status='scheduled', published_at=<slot>,
   payload = payload || {youtube_id, video_url, render:{voice, seconds}}`. That is what counts as
   a video made on the scorecard.

## Posting slots (IST, in `autopilot.publish_slots`)

R2BOT 08:30 and 20:30 · Raj Study 07:00 and 19:00 · Raj Chaupal 07:15 and 19:15.
