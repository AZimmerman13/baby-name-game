# Pinterest playbook

Pins keep working for months, which is why this is the first channel. Everything here is
ready to paste. Images live in `marketing/pins/` (regenerate with `./marketing/pins/export-pins.sh`).

## Setup (once)

1. Create a **Pinterest business account** (free) — personal accounts have no analytics.
2. **Claim storkpool.com** in Settings → Claimed accounts. Claimed sites get attribution on
   every pin that links to them, and unlock per-pin outbound click stats.
3. Create these boards, each with a keyword-rich description:
   - **Baby Shower Games** — "Games for baby showers: prediction pools, printables, virtual shower ideas."
   - **Baby Name Ideas** — "Baby name inspiration, popularity trends, and name guessing games."
   - **Baby Pool & Predictions** — "Due date pools, baby prediction cards, and office baby pools."

## Cadence

3–5 pins a week beats 20 in one day. Pinterest surfaces pins over weeks, so spread them out
and repin the same image to a different board no more than once a month.

## The pins

Each entry: image → destination → title (≤100 chars) → description (≤500, keywords early) → alt text.

### Pin 1 — Printable prediction cards
- **Image:** `pins/pin-printable-cards.png`
- **Link:** `https://storkpool.com/printables/baby-prediction-cards/?utm_source=pinterest&utm_campaign=printable_cards`
- **Title:** Free Printable Baby Prediction Cards (No Email Required)
- **Description:** Free printable baby prediction cards for your baby shower — four per page, no
  email sign-up. Guests guess the baby name, birth date, birth time, and weight, and the closest
  guess wins. Print them at home, or run the same baby pool online free so family who cannot
  attend can still play. Includes a simple scoring system so you can announce a winner when the
  baby arrives.
- **Alt text:** A printable baby prediction card with blanks for name, birth date, time, and weight.

### Pin 2 — Name guessing game
- **Image:** `pins/pin-name-game.png`
- **Link:** `https://storkpool.com/guides/baby-pool-template/?utm_source=pinterest&utm_campaign=name_game`
- **Title:** The Baby Name Guessing Game for Your Shower
- **Description:** Turn baby name guessing into a game everyone can play. Each guest submits up to
  six name guesses, every guess stays hidden until the reveal, and close guesses still score — so
  "Ellie" beats "Marcus" when the baby is named Eleanor. Free baby shower game, no sign-up for
  guests, works on phones. Perfect for showers, office pools, and family group chats.
- **Alt text:** A baby pool leaderboard showing guests ranked by how close their name guesses were.

### Pin 3 — Due date pool
- **Image:** `pins/pin-due-date-pool.png`
- **Link:** `https://storkpool.com/guides/baby-due-date-pool/?utm_source=pinterest&utm_campaign=due_date`
- **Title:** Guess the Due Date — Free Baby Pool Everyone Can Join
- **Description:** Only about 4% of babies arrive on their due date, which makes a due date pool a
  real guessing game. Guests predict the birth date, time, and weight, guesses stay hidden until
  the baby is born, and scoring is automatic. Free to run, one link to share with family,
  coworkers, and anyone who cannot make the shower.
- **Alt text:** A chart of guessed birth dates clustered around a due date of March 14.

## Writing more pins

- **Titles** promise one specific thing. "Free printable baby prediction cards" beats "Baby shower fun."
- **Descriptions** put the keywords people search in the first sentence: baby shower game, baby
  pool, due date pool, baby name game, printable.
- **Images**: 1000×1500 (2:3). Text large enough to read in a phone-sized thumbnail — headline
  around 70px on a 1000px canvas. Keep the important part in the top half.
- **Seasonality** is mild for baby content, but January and September are strong for shower planning.

## Measuring

Every link above carries `utm_source=pinterest`, so `/admin/stats` shows Pinterest visitors and
how many pools they create. Pinterest's own analytics show impressions and outbound clicks; the
StorkPool stats page shows what happened after the click, which is the number that matters.

Give it 4–6 weeks. Pins routinely take a month to start showing traffic.
