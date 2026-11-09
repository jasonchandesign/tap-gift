# Demo video: status and what's next

The demo video for the Devpost submission is about 2:50, 1920×1080, 30 fps. It is built from AI shots, real camera shots and screen recordings of the app, with an AI voice-over ("Chris").

## What's done

| File | What it is |
|---|---|
| `media/video/opening-s1.mp4` | The finished opening, 11.8 s, with voice-over. Aisle pan, then a hand reaches for the card on the rack, he reads the back, and the card is peeled off its backing. |
| `media/video/vo-opening.mp3` | The opening voice-over on its own (Chris, `[upbeat]`, sped up 6%). |
| `media/print/card-stickers-bleed.pdf` | Card fronts and backs with 1/8 in bleed. Glue to the card, then trim from the back. Print at 100%. |
| `media/print/card-stickers.pdf` | The same sheet without bleed, with crop marks. |
| `media/print/rack-backing.pdf` | The rack backing (front and back halves). Letter, landscape, print at 100%. |

How the opening was made, in case a shot needs redoing:

- The AI shots are Veo 3.1 Fast, through OpenRouter, with a first and last frame image. Images are from Nano Banana. Veo can't take a package off a peg hook or flip it believably, so the opening avoids both: it cuts just before the lift, and the "reading the back" shot never turns the package.
- No real brand logos may appear anywhere. Generated racks used made-up brands (Fernleaf Books, Pixel Harbor Games, Copperkettle Coffee).

## What's left

1. **Record the app (S2–S9).** On the Mac, see below. This is the next step.
2. **Film the real taps:** the gifter tapping a blank card (S2a), the handoff and Sam tapping (S5), and the closing shot of the card (S9).
3. **Voice-over for S2–S9.** Same voice and settings as the opening: ElevenLabs v4 voice `chris` through OpenRouter (`POST https://openrouter.ai/api/v1/audio/speech`, model `elevenlabs/eleven-v4`), start each line with `[upbeat]`, trim long pauses by about 15%, then `ffmpeg -af atempo=1.06`. Generate one file per shot so the edit can move them.
4. **Edit:** the opening, then S2–S9, then the end card. Add sound effects (NFC tick on each tap, paper tear on S6, a soft chime on the refund) and a low music bed.
5. **Upload** to YouTube (unlisted is fine) and put the link on Devpost.

## Shot list for the rest of the video

Times are targets. VO lines are the script; trim the bracketed parts first if over time.

### S2. Start from a blank card (0:12–0:30)
- **S2a, real:** over the shoulder, the gifter holds the iPhone to the top of a blank card. Tap the NFC banner. Cut on the tap.
- **S2b, screen:** Safari opens the start page. Start a gift, enter Sam, 8, pick a wrap.
- VO: "Every Tap Gift card holds one permanent link. Tap a blank one and you start a gift that lives on that card. There's no app to install."

### S3. Shop with the AI (0:30–1:00)
- Screen: type "loves dinosaurs and building things", wait for the picks, then type "under $30".
- In the edit, speed up the AI's wait 2–4×, keep typing at normal speed, and zoom about 115% on the pick reasons.
- VO: "I tell the AI shopper what Sam loves. It searches real, in-stock products and explains each pick. When I say 'under thirty dollars', that becomes a hard limit in code, not just a suggestion in the prompt. Age rules, blocked categories and stock checks are all enforced in code too[, and we ran an eval to prove it]."

### S4. Cart and PayPal (1:00–1:20)
- Screen: add 2–3 gifts at clearly different prices, check out with PayPal.
- Log in to the PayPal sandbox **before** recording, or cut the login. Never show a password on screen.
- Cut the wait while the AI draws the wrapping paper.
- VO: "I keep a few options at different prices and pay once with PayPal, for the priciest one. The Orders API captures the payment up front."

### S5. Hand the card over (1:20–1:35)
- **S5a, real:** the parent's hands give the card to Sam. Hands and sleeves only is fine.
- **S5b, real:** Sam taps the card on the top edge of a phone, over the shoulder. Tap the NFC banner and cut on the tap.
- Film this **after** S4, so the card holds the paid gift.
- VO: "The gift lives on the card now. I just hand it over, and Sam taps it on my phone."

### S6. Unwrapping (1:35–2:05)
- Screen, on the kid's device: the wrapped gift sways. Flip the tag, then tear the paper slowly with a finger. Hold 2–3 s on one torn paper so the silhouettes read.
- VO: "Sam taps the card and gets a wrapped present. No account and no AI chat on the kid's side. Every gift is torn open by hand, and Claude drew each wrapping paper as a clue: clothing shapes for a hoodie, diggers for a toy truck."

### S7. Choose and say thanks (2:05–2:25)
- Screen: open every gift, keep the cheaper one, pick a color, type a short thank-you.
- VO: "Once everything's open, Sam keeps one, picks a color and sends a thank-you."

### S8. The refund (2:25–2:35)
- Screen, back on the gifter's device: the page refreshes when it comes into focus and shows the choice, the refund and the note. Zoom on the refund line.
- VO: "Sam picked the cheaper gift, so PayPal's Payments API refunds the difference automatically[. It uses a fixed request ID, so a retry can never refund twice]."

### S9. Reuse and close (2:35–2:50)
- Screen: "Give another gift with this card" on the kid's page.
- Real: the card back on its rack backing on a table, same light as before.
- End card: logo, `tap-gift.onrender.com/c/demo`, and the tech list.
- VO: "And the card's ready for the next birthday. Tap Gift is built with the PayPal Server SDK, Claude, Channel3 and Render. Judges without a card can try it at tap-gift.onrender.com/c/demo."

**Never cut:** the real tap and the refund. Those are the moments judges remember.

## Recording on the Mac

### Option A (recommended): a real iPhone, recorded with QuickTime

This captures the real NFC tap and the page opening in one take, so S2 and S5 need no fake cut.

1. Connect the iPhone to the Mac with a cable and trust the Mac on the phone.
2. Open QuickTime Player, then **File → New Movie Recording**.
3. Click the arrow next to the record button and choose the iPhone as both **Camera** and **Microphone**. The phone's screen appears in the window. QuickTime shows a clean status bar (9:41, full battery) while it's mirroring.
4. Press record, do the shot, press stop, then **File → Save**. Name files by shot, e.g. `S3-shop.mov`.
5. Set the phone up first:
   - Light mode, English, Do Not Disturb on, and notifications off.
   - Text size at default, so the layout matches what judges see.
   - Brightness up, and Auto-Lock set to Never while recording.

For the kid's side (S6–S7), use a second phone if you have one, so the gifter and kid have separate Safari state. With one phone, open the kid's link in a Private tab.

### Option B: the iOS Simulator

Use this for screens only. The Simulator can't read NFC, so film each tap with a camera and cut to the Simulator as Safari opens.

```bash
# list running devices and their UDIDs (use UDIDs; with two running, "booted" is ambiguous)
xcrun simctl list devices booted

# clean status bar
xcrun simctl status_bar <UDID> override --time 9:41 --batteryState charged --batteryLevel 100 --wifiBars 3 --cellularBars 4

# show touch circles (restart the Simulator afterwards)
defaults write com.apple.iphonesimulator ShowSingleTouches 1

# record a shot (Ctrl-C to stop)
xcrun simctl io <UDID> recordVideo --codec=h264 S3-shop.mov

# open a card page in place of a tap
xcrun simctl openurl <UDID> https://tap-gift.onrender.com/c/RecordTake01abcd
```

Use two devices (e.g. an iPhone 16 Pro for the gifter and an iPhone 16 for Sam) so the two sides look different on screen.

### Card IDs for recording

- **Real card:** it must be blank. A card holding an unopened gift opens that gift instead. Finish any old gift first, or use "Give another gift with this card".
- **Simulator or a link:** make up a 16-character ID of letters, numbers, `_` or `-` that doesn't start with `demo`, e.g. `RecordTake01abcd`. Use a new one for each full take.
- **Don't use `/c/demo` on camera.** Demo cards show the Demo notes panel on the last page.

### Before each session

- Open https://tap-gift.onrender.com a few minutes early so Render isn't asleep.
- Do one dry run with the same inputs (Sam, 8, "loves dinosaurs and building things", then "under $30") and check that you get 2–3 gifts at clearly different prices.
- Log in to the PayPal sandbox buyer account in Safari first.

### Shooting order

1. S2–S4 in one sitting (gifter).
2. S5 straight after, with the card that now holds the gift.
3. S6–S8 while the gift is still unopened.
4. S9's real shot of the card, in the same light as S5.

## Editing notes

- **Screen recordings:** put the portrait recording in an iPhone frame on a kraft `#b8875a` background, with a short caption on the empty side, e.g. "Hard price limit, enforced in code".
- **Real shots:** use them full frame, and match their colour to the kraft background.
- **Audio:** the voice-over leads; cut the pictures to it. Simulator and QuickTime screen recordings have no useful audio, so mute them.

## Devpost

Sandbox buyer logins for judges go in the Devpost box **"Testing instructions or credentials the judges need to test your project"**, on the Additional info step. That box is only for judges and organizers. Don't put the logins in this repo.
