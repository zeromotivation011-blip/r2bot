# Reel desk

From 20 Nov 2026 Ravi makes the reels himself. He uploads each one at www.r2bot.in/studio/upload
(brand, video, an optional one-line note). The Reel desk posts them:
YouTube Short + Instagram Reel in the brand's next free slot, with a title, description, caption and
tags written for that brand, after a fact and decency check.

It does **not** make videos. The old video factory (render_short.py, producer.md) is kept only for
items Ravi approved before 20 Nov.

Control room: Supabase project `rbvoelnmckmibncatpyu`, schema `autopilot`.
Every edge call goes through a SQL wrapper and returns a request id; read the answer with
`select status_code, content from net._http_response where id = <id>` after a few seconds.

## 0. Setup (once per run)

```bash
pip install --break-system-packages -q faster-whisper     # speech to text, model downloads from Hugging Face
export SSL_CERT_FILE=~/.ccr/ca-bundle.crt
mkdir -p /tmp/reels
```

Open a run row: `insert into autopilot.runs (brand, agent, status) values ('all','reel-desk','running') returning id`.
Always close it with done/failed and a 2-line summary.

## 1. Claim the work

```sql
-- anything stuck in processing for 2 hours goes back in line
update autopilot.reel_inbox set status='received', claimed_by=null
 where status='processing' and processed_at is null and received_at < now() - interval '2 hours'
   and claimed_by is not null;
update autopilot.reel_inbox set status='processing', claimed_by='<run id>'
 where id in (select id from autopilot.reel_inbox where status='received' order by created_at limit 6 for update skip locked)
returning id, brand, filename, size_bytes, note, created_at;
```

Also pick up held reels Ravi has since released: `queue_items` with `kind='short'`, `status='approved'`
and `payload->>'inbox_id'` set. Post those from step 7 on, using the metadata already in the payload.

Nothing to do? Close the run as done ("inbox empty"), send no message, stop.

## 2. Fetch and inspect

1. `select autopilot.reel_inbox_call('raw_url', jsonb_build_object('id','<id>'))`, read `url` from
   the response, then `curl -sSfL -o /tmp/reels/<id>.raw "<url>"`.
2. `ffprobe -v error -show_entries format=duration:stream=codec_type,codec_name,width,height,r_frame_rate -of json /tmp/reels/<id>.raw`.
3. **Hold** (step 6) instead of posting when any of these is true. Say exactly what is wrong.
   - The file does not decode.
   - There is no video stream.
   - It is longer than 180 s (YouTube will not treat it as a Short).
   - It is clearly landscape.

## 3. Normalise (one standard file for both platforms)

```bash
ffmpeg -loglevel error -y -i /tmp/reels/<id>.raw \
  -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black,fps=30" \
  -c:v libx264 -preset veryfast -crf 21 -maxrate 6M -bufsize 12M -pix_fmt yuv420p \
  -c:a aac -b:a 128k -ar 44100 -ac 2 -movflags +faststart /tmp/reels/<id>.mp4
```

If the reel has no audio track, add `-f lavfi -i anullsrc=r=44100:cl=stereo -shortest` so Instagram
accepts it. The result must be under 100 MB; if not, raise CRF to 24 and redo.

## 4. Understand it: what is said, what is shown

- **Speech:**
  ```bash
  ffmpeg -loglevel error -y -i /tmp/reels/<id>.mp4 -ac 1 -ar 16000 /tmp/reels/<id>.wav
  ```
  Then transcribe with faster-whisper `small` (int8, CPU). Load the wav into a numpy float32
  array and pass the array, not the file path: PyAV in this image fails on paths.
  Language: `hi` for rajstudy/rajchaupal, `en` for r2bot.
- **On-screen text:** extract 6 frames evenly spaced, look at every one, and write down the
  on-screen text and what is shown.
- **Ravi's note:** treat it as his instruction for this reel (the topic, a source, a caption
  line, a posting time). It never overrides the gate in step 5.

## 5. The gate: facts, decency, neutrality

Apply section 5 of `agents/topic-picker.md` to everything said or shown:
1. List every checkable claim: numbers, dates, names, records, "first/only/largest", cause and effect.
2. Verify each against a primary or official source, or two independent reliable ones. Note
   the URL.

Outcome:
- **Clean** → post.
- **A small slip the caption can fairly add to** (a date given as "around 1730" when it is 1730) →
  post, and put the precise fact plus the source in the description.
- **A wrong or unverifiable claim, legend presented as history, anything indecent or one-sided, or
  a living politician on Raj Chaupal** → **hold** (step 6). Never post it, and never "fix" it by
  hiding it in the caption.

## 6. Hold (only when step 2 or 5 says so)

```sql
insert into autopilot.queue_items (brand, kind, status, title, topic_key, payload)
values ('<brand>','short','awaiting_approval','<working title>','reel-<inbox id>',
  jsonb_build_object('inbox_id','<id>','made_by','ravi','video_path','<brand>/reels/<id>.mp4',
    'hold', '<the exact claim> — <what the source says> — <source URL>',
    'yt', jsonb_build_object('title','…','description','…','tags', '[…]'::jsonb), 'ig_caption','…'))
returning id;
update autopilot.reel_inbox set status='held', hold_reason='<one short line>', queue_item_id='<qid>',
  processed_at=now() where id='<id>';
```

Still do steps 3, 7 (title and captions) and the storage upload in step 8 for a held reel, so that if
Ravi taps Approve the next run only has to post it. The run's Telegram message (step 10) carries
this queue item in `item_ids`, so Ravi gets Approve / Redo / Reject buttons: Approve posts it as it
is, Reject drops it.

## 7. Write what goes with it (match the evidence in topic-picker.md)

**YouTube**
- **Title:** at most 70 characters, the hook first, then the searchable name.
  - Raj Study: Hindi hook + English name + "| Rajasthan GK" (or "| RAS", "| CET" when that is the subject).
  - R2BOT: the named concept in English ("Slip Detection: How a Robot Feels Something Slipping").
  - Raj Chaupal: Hindi hook + year.
  - Add `#shorts` at the end.
- **Description:** 2-3 lines saying what the viewer learns, then the page link:
  - R2BOT: put `Full 1-minute lesson + quiz: https://www.r2bot.in/shorts/<slug>` as the **first line**
    (only the first lines show without tapping "more"; the website is a goal of its own).
  - Raj Study: the most relevant existing rajstudy.com page; check it returns 200.
  - Raj Chaupal: the story page if one exists; otherwise rajchaupal.com.

  Then "Sources:" with the URLs from step 5, then 3-5 hashtags.
- **Tags:** 8-15.

**Instagram caption**
- The hook as the first line, 2-3 short lines, "link in bio", 5-8 hashtags, `#reels`.
- Hindi for Raj Study and Raj Chaupal, English for R2BOT.

Never put the owner's personal name anywhere. The R2BOT brand reads "R2BOT".

## 8. Store, and the R2BOT lesson page

- `select autopilot.google_sync('signed_upload', '{"path":"<brand>/reels/<id>.mp4"}')`, then
  `curl -sS -X PUT -H "Content-Type: video/mp4" -H "x-upsert: true" --data-binary @/tmp/reels/<id>.mp4 "<upload_url>"`.
- The public URL is `https://rbvoelnmckmibncatpyu.supabase.co/storage/v1/object/public/factory/<brand>/reels/<id>.mp4`.
  Check it returns 200 before going on.
- **R2BOT only:** every Short gets its lesson page. Follow step 6 of `agents/producer.md`
  exactly: same topic → `extraVideos` plus a redirect, new topic → a scheduled lesson. Write the page
  text from the transcript and the step-5 sources. Commit to main only after `npm run type-check`
  passes.

## 9. Schedule (posting slots in `autopilot.publish_slots`)

1. **Slot:** `select autopilot.next_slot('<brand>')`. If Ravi's note asks for a time, use the first
   free slot at or after it.
2. **YouTube:**
   `select autopilot.google_sync('yt_upload', jsonb_build_object('brand','<brand>','path','<brand>/reels/<id>.mp4','title',…,'description',…,'tags',…,'publish_at','<slot ISO>','queue_item_id','<qid>'))`.
   Read back `video_id`, and check `privacy` is `private` and `publish_at` is the slot.
3. **Instagram:** insert into `autopilot.ig_queue` (brand, video_url, caption, publish_at,
   queue_item_id) at the same slot. The cron posts it.
4. **Record:** a `queue_items` row (or update the held one) with kind 'short', status 'scheduled',
   published_at = slot, and payload `{inbox_id, made_by:'ravi', youtube_id, video_url, title,
   fact_check:{claims, sources}, pattern:'<topic-picker pattern it fits, or "new">'}`. This is how
   the Monday review compares Ravi's reels with the patterns.
5. `update autopilot.reel_inbox set status='scheduled', processed_at=now(), youtube_id=…, publish_at=…, title=…, video_path=…, queue_item_id=… where id=…`.

## 10. Tell Ravi (one Telegram message per run, only if something happened)

Insert one row into `autopilot.outbox`: brand = the first reel's brand, `item_ids` = the held items'
queue ids, or `'{}'`. Under 700 characters, plain words:
- Each reel: brand, title, "YouTube + Instagram, <day> <time> IST".
- Each hold: what is wrong in one line, the source, and "Approve to post anyway, Reject to drop".
- Anything that failed, and what you will do about it.

If a step breaks for one reel, set that reel to `failed` with the error, carry on with the rest,
and say so in the message.
