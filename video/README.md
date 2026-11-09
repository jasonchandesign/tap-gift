# Demo video

The 2:38 demo video ([YouTube](https://youtu.be/fh6QKQtwcVo)) is edited in code with [Remotion](https://www.remotion.dev). It is 1920×1080 at 30 fps.

```bash
npm install
npm run render   # writes out/tap-gift-demo.mp4
npm run studio   # live preview
```

## Story

Uncle James shops for his nephew Sam, 13, who skates and is getting into photography. James adds a skate jacket ($100), an Instax camera bundle ($89.95) and a yellow skate jacket ($49.14), and pays $107.25. Sam unwraps all three on his phone, flips through the camera's colors and keeps the yellow jacket. Its price, shipping and tax come to $58.69, and $48.56 goes back to James.

| Start | Scene | Phone |
| --- | --- | --- |
| 0:00 | Intro card | none |
| 0:05 | Opening: the card on a store rack (AI-generated) | none |
| 0:17 | S2: tap a blank card, start a gift | James, left |
| 0:28 | S3: shop with the AI | James, left |
| 0:56 | S4: checkout with shipping and tax, PayPal | James, left |
| 1:17 | S5: James hands Sam the card (AI-generated), tap | Sam, right |
| 1:29 | S6: unwrap | Sam, right |
| 1:44 | S7: try colors, keep one, thank-you | Sam, right |
| 2:07 | S8: receipt and refund | James, left |
| 2:18 | S9: clear the card for next time | Sam, right |
| 2:26 | End card | none |

## How it's put together

- **`src/timeline.ts` is the edit as data.** For each scene it holds the caption, the voice-over text and `pieces`: source clips with trims, speeds and zooms. Optional `cues` start later sentences on the right moment. To recut or retime, change the numbers there.
- **`src/Demo.tsx` draws it:**
  - the kraft background and phone frame, which slides sides when the card changes hands;
  - captions and closed captions;
  - a drawn address bar over Safari's orange automation bar;
  - the card-tap animation (the card touches the phone, the NFC banner drops in, Safari opens);
  - the intro and end cards.
- **Screen recordings** come from headless iOS Simulators driven over WebDriver (`safaridriver`). They're converted to 30 fps (`ffmpeg -vf fps=30`) and kept out of git, so `public/*.mp4` has to be recreated to render on another machine:
  - `take1-gifter-S2-S4`, `take2-sam-S5-S9` and `take3-gifter-S8`, from `media/video/screen/*.mov`;
  - `opening-s1.mp4`, from `media/video/`;
  - `s5a-handoff-1.mp4`, the AI handoff shot.
- **Voice-over:** ElevenLabs v4, voice `chris`, through OpenRouter. It needs `OPENROUTER_API_KEY` in `../.env.local`.
  - `node --env-file=../.env.local scripts/vo.mjs S4,S8` regenerates the named lines from the text in `timeline.ts`.
  - `node scripts/vo-process.mjs [tempo]` then trims, sets the speed and splits cued lines, with no API cost.
- **Music:** `public/music/a-acoustic.mp3`, an instrumental from Google Lyria 3 (`scripts/music.mjs`), longer than the video so it never loops. The `MUSIC` volume in `timeline.ts` is 0.08.
- **AI shots:** Veo 3.1 Fast with first and last frames from Gemini 3 Pro Image (`scripts/s5a.mjs`).
