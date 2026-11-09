# Demo video: status and how it's built

The demo video for the Devpost submission is **2:30**, 1920×1080, 30 fps (it must stay under 3:00). It's edited in code with [Remotion](https://www.remotion.dev) in `video/`. It combines the AI-shot opening, an AI handoff shot, Simulator recordings of the app, an AI voice-over ("Chris") with closed captions, and a music bed.

Render it with `cd video && npm install && npm run render`. The output is `video/out/tap-gift-demo.mp4`. `npm run studio` opens a live preview.

## What's left

1. **Upload** to YouTube (unlisted is fine) and put the link on Devpost.
2. Optional: sound effects (an NFC tick on each card tap, a paper tear in S6).

## The story

**Uncle James** (the voice-over, "I") shops for his nephew **Sam Rivera, 13**, who skates, is getting into photography and has his own phone. James adds three gifts at different prices, picking the size of each as he adds it, and pays for the priciest. Sam unwraps each gift on his phone, flips through its colors and keeps the yellow skate jacket. James gets the difference refunded.

## The cut

Each scene's start time, on-screen caption and voice-over. The phone is on the left for James's scenes and on the right for Sam's.

| Start | Scene | Caption / detail | Voice-over |
|---|---|---|---|
| 0:00 | Intro | Card art, Tap Gift logo, "A gift they get to choose." | "Today, we introduce Tap Gift. It's a gift they get to choose." |
| 0:05 | S1 Opening | AI shot: store aisle, the card on the rack, peeled off its backing | (in the clip) |
| 0:17 | S2 James | Tap a blank card / No app. The card holds one permanent link. | "Every Tap Gift card holds one permanent link. Tap a blank one and you start a gift that lives on that card. There's no app to install." |
| 0:28 | S3 James | Shop with the AI / Browse from unlimited options. Real, in-stock products. | "I tell the AI shopper what Sam's into. I can tap an idea or type my own. It searches real, in-stock products and explains each pick." · *(as he picks size M)* "I choose the size as I add things, so Sam only picks colors." · *(as he types "under $50")* "I can add a price limit or any other preference by typing it, or with the built-in voice input." |
| 0:53 | S4 James | Pay once with PayPal / Orders API captures the priciest gift up front. | "I keep a few options at different prices and pay once with PayPal, for the priciest one. The Orders API captures the payment up front, and the balance comes back once Sam chooses." |
| 1:11 | S5 Sam | Hand over the card / The gift lives on the card now. | *(over the AI handoff shot and card tap)* "The gift lives on the card now. I hand it to Sam, and he taps it with his phone." · *(on "Unwrap all 3 / Pick 1 to keep")* "Sam sees instructions to unwrap all three gifts and pick one to keep." |
| 1:23 | S6 Sam | Unwrap every surprise / No account. No AI chat on the kid's side. | "Sam gets a wrapped present for each gift. No account and no AI chat on his side. Every gift is torn open by hand, and Claude drew each wrapping paper as a clue to what's inside." |
| 1:38 | S7 Sam | Try colors, keep one / Then send a thank-you. | "After each one, Sam can flip through the colors, and the photo changes with them." · *(on "Pick 1 to keep", after all three are open)* "Once everything's open, he keeps his favorite, the yellow skate jacket, and sends Uncle James a thank-you." |
| 2:01 | S8 James | The difference comes back / PayPal Payments API refund, with a fixed request ID. | "Sam picked a cheaper gift, so PayPal's Payments API refunds the difference automatically. It uses a fixed request ID, so a retry can never refund twice." |
| 2:12 | S9 Sam | Cleared and reused / One card for every occasion. | "To be environmentally friendly, the card can be cleared and reused for another gift, for another occasion." |
| 2:18 | End card | Card art, Tap Gift logo, `tap-gift.onrender.com/c/demo`, tech list | "Tap Gift is built with the PayPal Server SDK, Claude, Channel3 and Render. Judges without a card can try it at tap-gift dot onrender dot com slash c slash demo." |

**Never cut:** the card taps and the refund. Those are the moments judges remember.

## How the edit works

Everything lives in `video/src/`:

- **`timeline.ts` is the whole edit as data.** For each scene it holds:
  - the side the phone is on, the caption and the voice-over text;
  - optional `cues`, which start later sentences at set times so a line lands on its moment;
  - `pieces`, the source clips and their trims, speeds and zooms.

  It also holds the intro, the end card, the music and the address bar overrides. To retime or recut something, change the numbers there.
- **`Demo.tsx` draws it:**
  - the kraft background and the phone frame, which slides between sides at S5;
  - the caption column and the closed captions, which appear as each line is spoken;
  - the speed badge on sped-up clips;
  - a drawn address bar over Safari's orange automation bar;
  - the card-tap animation (described below);
  - the full-frame handoff shot, and the intro and end cards, which use the site's logo from `src/app/logo.tsx` in Inter ExtraBold.
- **The card tap** is drawn, not filmed:
  1. The phone sits on its home screen.
  2. The card (`video/public/card-front.png`, from the print art) comes down and touches the top of the phone.
  3. NFC rings pulse, the "Website NFC Tag" banner drops in and the tap circle hits it.
  4. Safari zooms open from the banner in about a quarter second, like a real iPhone.

### Voice-over

- **Voice:** ElevenLabs v4, voice `chris`, through OpenRouter (`POST https://openrouter.ai/api/v1/audio/speech`, model `elevenlabs/eleven-v4`). Each line is prefixed with `[upbeat]`. The opening's voice-over was made the same way but sped up 6%; S2 onward plays at natural speed.
- **Generating:** `node --env-file=../.env.local scripts/vo.mjs S3,S5` (from `video/`) generates the named lines straight from the text in `timeline.ts`. It keeps the raw take as `public/vo/<id>-raw.mp3`.
- **Processing:** `node scripts/vo-process.mjs [tempo]` rebuilds every line from the raw takes, with no API cost.
  - It trims silence at the ends only, keeping natural pauses.
  - It applies the tempo (1.0 is natural speed).
  - It splits cued lines at the pause nearest each sentence boundary into `S3-1.mp3`, `S3-2.mp3` and so on.
  - It writes the durations to `src/vo.json`.

  Always run it after `vo.mjs`.
- **Changing a line:** edit the text in `timeline.ts`, regenerate that scene and re-run `vo-process.mjs`. The closed captions follow the text automatically.
- **Cost:** a scene's line costs a few cents.

### Music

- **Track:** `video/public/music/a-acoustic.mp3`, a 2:44 instrumental made with Google Lyria 3 Pro ($0.08 a track, `scripts/music.mjs`). It's warm acoustic pop with fingerpicked guitar, glockenspiel and brushed drums at about 95 BPM.
- **No looping:** it's longer than the video, so it never repeats.
- **Level:** it plays at `volume: 0.08`, set by `MUSIC` in `timeline.ts`. That is about 22 dB under the voice. It fades in over the first second and out over the last 2.5 seconds.
- **New options:** `node --env-file=../.env.local scripts/music.mjs <name> "<style>"`. The script adds "instrumental, even, no build-ups, no ending" to every prompt.

### S5a, the handoff (AI shot)

- **What's used:** `media/video/s5a/handoff-1.mp4` (the AI experiments in `media/video/s5a/` aren't in git), trimmed to its first 3.0 s, because the camera drifts after 3.25 s. It's copied to `video/public/s5a-handoff-1.mp4`. Over James's shoulder, Sam takes the card and grins.
- **How it was made:** Veo 3.1 Fast through OpenRouter, with first and last frames from Gemini 3 Pro Image. The script is `scripts/s5a.mjs`.
- **Known flaw:** the card's back is wrong, but it's never shown long enough to read.
- **What didn't work:** the image models couldn't draw the card's real design at its real size. Pasting the card art onto the frames tracked badly and looked jagged. A second shot, of Sam taking out his phone, was dropped.

### Files

| File | What it is |
|---|---|
| `media/video/opening-s1.mp4` | The finished opening, 11.8 s, with voice-over. Aisle pan, a hand reaches for the card on the rack, he reads the back, and the card is peeled off its backing. |
| `media/video/vo-opening.mp3` | The opening voice-over on its own. |
| `media/video/screen/take1-gifter-S2-S4.mov` | Raw Simulator take, James's phone, 3:38 (not in git). |
| `media/video/screen/take2-sam-S5-S9.mov` | Raw Simulator take, Sam's phone, 2:01 (not in git). |
| `media/video/screen/take3-gifter-S8.mov` | Raw Simulator take, James's phone, 0:08: the refund page (not in git). |
| `video/public/*.mp4` | The clips the edit reads (not in git). The takes are converted to 30 fps (`ffmpeg -i take.mov -vf fps=30 …`, because Simulator recordings have a variable frame rate). The folder also holds `opening-s1.mp4` and `s5a-handoff-1.mp4`. |
| `video/public/home-*.png`, `card-*.png` | Home screens for the card tap, and the card art. |
| `video/public/vo/`, `video/public/music/` | Voice-over (processed and raw) and the music bed. |
| `media/print/card-stickers-bleed.pdf`, `card-stickers.pdf`, `rack-backing.pdf` | Print files for the card and the rack backing. Print at 100%. |

To render on another machine, recreate `video/public/*.mp4`: convert the three takes to 30 fps, and copy in the opening and the handoff clip.

## What was recorded (Nov 9)

- **S2:** James's phone opens a blank card, starts a gift for Sam Rivera, 13, boy.
- **S3:**
  1. Tapped the **Skateboards** chip.
  2. Typed "Also a cool jacket he can wear skating" and added the **Nike SB Skate Jacket, $100**, size M.
  3. Typed "He's also getting into photography" and added the **Fujifilm Instax Mini 12, $124.99**, which comes in 5 colors.
  4. Typed "Anything cool under $50?", tapped **More like these** and added the **Nike SB yellow skate jacket, $49.14**.
- **S4:** cart, message, address, then James pays **$124.99**. PayPal remembered the sandbox login, so no login is on screen.
- **S5–S7:**
  - The tag flips to "You have 3 surprises! Unwrap all 3 / Pick 1 to keep", and Sam tears each gift with a swipe.
  - On the Instax he taps Pastel Blue, Mint Green, Lilac Purple and Clay White, and the photo changes each time.
  - He keeps the **yellow jacket** and sends a thank-you.
- **S8:** "Sam chose Nike SB … Jacket Yellow. You paid $124.99. **$75.85 is going back to your PayPal.**" The refund line appears at about 7.75 s into take 3, so the edit holds on it as a freeze.
- **S9:** "Give another gift with this card" opens **Clear this card?**, which is left unconfirmed.

## Recording in the Simulator

The Simulator can't read NFC, so the card taps are animated, and everything in Safari is recorded straight from the Simulator. This Mac's Xcode has no Simulator.app, so the devices run headless.

| Role | Simulator | UDID |
|---|---|---|
| Gifter (S2–S4, S8) | `TapGift Gifter`, iOS 27 | `01998BA2-148E-4983-8C25-A575A4D45277` |
| Sam (S5–S7, S9) | `TapGift Sam`, iPhone 17, iOS 27 | `A067FB5C-0FB0-404F-A88C-20FDE8725A9B` |

Set the status bar and light mode after every boot:

```bash
xcrun simctl status_bar <UDID> override --time 9:41 --dataNetwork wifi --wifiMode active --wifiBars 3 --cellularMode active --cellularBars 4 --batteryState charged --batteryLevel 100
xcrun simctl ui <UDID> appearance light
```

Keep only these two booted: more Simulators pushed the load past 500 and broke recording.

### Driving a take

- Safari is driven over WebDriver: run `safaridriver -p 4446`, then start a session with `platformName: iOS`, `safari:useSimulator: true` and `safari:deviceUDID`.
- `xcrun simctl io <UDID> recordVideo --codec=h264 <file>` records at the phone's full resolution.
- **Clicks:** click with JavaScript `el.click()`. WebDriver's own click acts as a long press on links, which opens a link preview and freezes Safari.
- **Typing:** WebDriver typing does nothing here. Instead, set the value through the native setter and fire an `input` event, one character at a time.
- **Tap indicator:** before each tap, the script draws a soft circle on the page where the finger lands, so it's in the recording itself.
- **Card IDs:** use a made-up 16-character ID that doesn't start with `demo`, e.g. `RecordTake01abcd`, and a new one for each full take. **Don't use `/c/demo` on camera**, because demo cards show the Demo notes panel.

### Before a session

- Open https://tap-gift.onrender.com a few minutes early so Render isn't asleep.
- Dry run the S3 turns the same day. The AI's results change from run to run.
- The shop allows 10 new gifts and 40 chat turns an hour per IP, and 20 turns per gift. Leave room for retakes.
- Sizes are chosen by James when adding to the cart. Sam only picks colors.

## Devpost

Sandbox buyer logins for judges go in the Devpost box **"Testing instructions or credentials the judges need to test your project"**, on the Additional info step. That box is only for judges and organizers. Don't put the logins in this repo.
