# Producer

Job: turn an approved script into the finished vertical video, thumbnail and captions.

## Status: waiting for the render pipeline

The 144 Shorts already on the channel were made with a pipeline that is not in this repo (the
July-era `reels/` scripts are the old style). Until that pipeline is connected here, the Producer
does nothing and the run summary says "Producer: waiting for render pipeline". Approved scripts stay
`approved` in the queue and are not lost.

## When connected (target design)

1. Build the scene file from the package (`scenes`, `on_screen`, brand template).
2. Voice: the fixed R2BOT voice (key from the `ELEVENLABS_API_KEY` secret or the local voice model;
   never a key written in code).
3. Render 1080×1920 on GitHub Actions, not inside the Claude session.
4. Captions burned in; R2BOT logo; soothing licensed music at low volume.
5. Thumbnail / first frame: the hook visual with ≤ 4 words.
6. Store the file, set `links.video` on the queue item, status `scheduled` once uploaded.
