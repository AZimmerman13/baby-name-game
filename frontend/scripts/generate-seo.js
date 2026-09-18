#!/usr/bin/env node
/**
 * Generates StorkPool's static SEO pages into frontend/public/.
 *
 * Why static HTML instead of React routes: the app is client-rendered, so search
 * engines index it slowly. These pages are plain HTML served straight by nginx
 * (try_files resolves /guides/slug/ -> /guides/slug/index.html).
 *
 * Usage:
 *   node scripts/generate-seo.js              # guides + printables + sitemap
 *   node scripts/generate-seo.js --names PATH # also name pages, from the SSA names.zip
 *                                             # (https://www.ssa.gov/oact/babynames/names.zip)
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const SITE = 'https://storkpool.com';
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const NAME_PAGE_LIMIT = 250; // per sex, by latest-year popularity
const TREND_YEARS = 25;

const pages = []; // { loc, priority, changefreq }

// ─── Layout ──────────────────────────────────────────────────────────────────

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const BEACON = `<script>
(function(){try{if(localStorage.getItem('storkpool_ignore_analytics')==='1')return}catch(e){}
var b=JSON.stringify({name:'pageview',path:location.pathname,referrer:document.referrer||null,
utm_source:new URLSearchParams(location.search).get('utm_source')});
try{navigator.sendBeacon('/api/events',new Blob([b],{type:'application/json'}))}catch(e){}})();
</script>`;

function layout({ slug, title, description, heading, intro, body, cta, jsonLd }) {
  const url = `${SITE}/${slug}/`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="article">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:site_name" content="StorkPool">
<meta name="twitter:card" content="summary_large_image">
<link rel="stylesheet" href="/pages.css?v=${cssVersion()}">
${jsonLd ? `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` : ''}
</head>
<body>
<header class="site-header">
  <a class="brand" href="/">🥚 StorkPool</a>
  <a class="header-cta" href="/?utm_source=guide">Create a free pool</a>
</header>
<main>
  <article class="card">
    <h1>${esc(heading)}</h1>
    <p class="lede">${intro}</p>
    ${body}
    <div class="cta">
      <h2>${esc(cta.heading)}</h2>
      <p>${cta.text}</p>
      <a class="btn" href="/?utm_source=${cta.source}">${esc(cta.button)}</a>
    </div>
  </article>
  <nav class="related card">
    <h2>More baby pool ideas</h2>
    <ul>
      <li><a href="/guides/baby-pool-template/">Baby pool template (free, printable + online)</a></li>
      <li><a href="/guides/office-baby-pool-ideas/">Office baby pool ideas</a></li>
      <li><a href="/guides/virtual-baby-shower-games/">Virtual baby shower games</a></li>
      <li><a href="/guides/baby-due-date-pool/">How to run a due date pool</a></li>
      <li><a href="/printables/baby-prediction-cards/">Printable baby prediction cards</a></li>
    </ul>
  </nav>
</main>
<footer class="site-footer">
  <a href="/">StorkPool</a> · <a href="/faqs">FAQs</a> · Free baby name, due date, and birth stat pools.
</footer>
${BEACON}
</body>
</html>
`;
}

function write(slug, html, { priority = 0.7, changefreq = 'monthly' } = {}) {
  const dir = path.join(PUBLIC_DIR, slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  pages.push({ loc: `${SITE}/${slug}/`, priority, changefreq });
}

// ─── Shared stylesheet ───────────────────────────────────────────────────────

const STYLESHEET = `/* Static SEO/printable pages. Mirrors the app's look without loading React. */
:root {
  --primary: #667eea;
  --secondary: #764ba2;
  --ink: #2d3748;
  --ink-soft: #4a5568;
  --muted: #718096;
  --border: #e2e8f0;
  --surface: #ffffff;
  --surface-alt: #f7fafc;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
  background-attachment: fixed;
  color: var(--ink);
  line-height: 1.65;
  -webkit-font-smoothing: antialiased;
}
.site-header {
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  max-width: 820px; margin: 0 auto; padding: 20px 16px;
}
.brand { color: #fff; font-weight: 700; font-size: 1.25rem; text-decoration: none; }
.header-cta {
  color: #fff; text-decoration: none; font-weight: 600; font-size: 0.95rem;
  border: 2px solid rgba(255,255,255,0.6); border-radius: 8px; padding: 8px 14px;
}
.header-cta:hover { background: rgba(255,255,255,0.15); }
main { max-width: 820px; margin: 0 auto; padding: 0 16px 40px; }
.card {
  background: var(--surface); border-radius: 12px; padding: 32px;
  box-shadow: 0 10px 15px rgba(0,0,0,0.1); margin-bottom: 24px;
}
h1 { font-size: 2rem; line-height: 1.25; margin-bottom: 16px; }
h2 { font-size: 1.35rem; margin: 32px 0 12px; }
h3 { font-size: 1.1rem; margin: 24px 0 8px; }
p, ul, ol, table { margin-bottom: 16px; }
ul, ol { padding-left: 22px; }
li { margin-bottom: 8px; }
.lede { font-size: 1.1rem; color: var(--ink-soft); }
a { color: var(--primary); }
.cta {
  margin-top: 32px; padding: 24px; border-radius: 12px;
  background: var(--surface-alt); border-left: 4px solid var(--primary); text-align: center;
}
.cta h2 { margin-top: 0; }
.btn {
  display: inline-block; margin-top: 8px; padding: 14px 28px; border-radius: 8px;
  background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
  color: #fff; font-weight: 700; text-decoration: none;
}
.btn:hover { filter: brightness(1.05); }
table { width: 100%; border-collapse: collapse; }
th, td { text-align: left; padding: 10px 8px; border-bottom: 1px solid var(--border); }
th { color: var(--muted); font-size: 0.9rem; }
td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
.related ul { list-style: none; padding-left: 0; }
.site-footer { max-width: 820px; margin: 0 auto; padding: 0 16px 40px; color: rgba(255,255,255,0.9); font-size: 0.9rem; }
.site-footer a { color: #fff; }
.chart { width: 100%; height: auto; display: block; margin-bottom: 8px; }
.chart-note { color: var(--muted); font-size: 0.85rem; }
.stat-row { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 24px; }
.stat-box { flex: 1 1 140px; background: var(--surface-alt); border-radius: 8px; padding: 16px; text-align: center; }
.stat-box .v { font-size: 1.8rem; font-weight: 700; color: var(--primary); }
.stat-box .l { color: var(--muted); font-size: 0.85rem; }

/* Printable cards */
.sheet { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 10px 15px rgba(0,0,0,0.1); }
.cards { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.pcard { border: 2px dashed var(--border); border-radius: 10px; padding: 14px; break-inside: avoid; }
.pcard h3 { margin: 0 0 10px; font-size: 1rem; text-align: center; color: var(--primary); }
.pcard .line { display: flex; align-items: baseline; gap: 8px; margin-bottom: 9px; font-size: 0.8rem; color: var(--ink-soft); }
.pcard .line span { white-space: nowrap; }
.pcard .line i { flex: 1; border-bottom: 1px solid var(--border); height: 0.95em; display: block; }
.no-print { }
@media print {
  body { background: #fff; }
  .site-header, .site-footer, .no-print, .related { display: none !important; }
  main { max-width: none; padding: 0; }
  .card, .sheet { box-shadow: none; border-radius: 0; padding: 0; margin: 0; }
  .cards { grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .pcard { border-color: #999; }
}
@media (max-width: 600px) {
  .card { padding: 22px 18px; }
  h1 { font-size: 1.6rem; }
  .cards { grid-template-columns: 1fr; }
}
`;

// Cache-bust the stylesheet: nginx serves .css with a 1-year immutable cache
const cssVersion = () => crypto.createHash('sha1').update(STYLESHEET).digest('hex').slice(0, 8);

// ─── Guides ──────────────────────────────────────────────────────────────────

const faqJsonLd = (faqs) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map(([q, a]) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
});

const GUIDES = [
  {
    slug: 'guides/baby-pool-template',
    title: 'Free Baby Pool Template (Printable + Online) | StorkPool',
    description:
      'A free baby pool template for baby showers: what to include, how scoring works, and a printable card sheet — plus a free online version that scores guesses for you.',
    heading: 'Free baby pool template',
    intro:
      'A baby pool is a friendly guessing game: everyone predicts the name, birth date, weight, and other details, and whoever comes closest wins. Here is a template you can copy, plus a free online version that does the scoring for you.',
    faqs: [
      ['What is a baby pool?', 'A baby pool is a guessing game where guests predict details about a baby — the name, birth date, time, weight, and sex — and the closest guesses win. It is usually played at a baby shower or among coworkers, for fun rather than money.'],
      ['What should a baby pool template include?', 'Space for the guest\'s name, the baby name guess (allow several), birth date, birth time, weight in pounds and ounces, sex, and one custom category like hair color. Leave room to note the due date so guesses are realistic.'],
      ['How do you score a baby pool?', 'Score each category separately and add the results. A common scale: 100 points for an exact date minus 5 per day off, 100 for exact weight minus 10 per pound off, 100 for the correct sex, and a similarity score for how close the name guess was.'],
    ],
    body: `
<h2>What to include on the template</h2>
<p>Keep it to one card per guest. Anything longer and people stop filling them in.</p>
<table>
  <thead><tr><th>Field</th><th>Why it works</th></tr></thead>
  <tbody>
    <tr><td>Guest name</td><td>You need it to announce the winner.</td></tr>
    <tr><td>Baby name guesses (up to 6)</td><td>One guess is a lottery. Several keeps people interested and makes near-misses fun.</td></tr>
    <tr><td>Birth date</td><td>The category everyone has an opinion about. Print the due date on the card.</td></tr>
    <tr><td>Birth time</td><td>Good tiebreaker. Scored to the minute, it almost always separates the leaders.</td></tr>
    <tr><td>Weight (lb + oz)</td><td>Guests love this one, and it is easy to score exactly.</td></tr>
    <tr><td>Sex</td><td>Skip it if the parents already announced.</td></tr>
    <tr><td>One custom category</td><td>Hair color, length, or "who does the baby look like" keeps it personal.</td></tr>
  </tbody>
</table>

<h2>A scoring system that feels fair</h2>
<p>The hard part of a paper pool is deciding who won weeks later. Use a points system and write it on the card before anyone plays:</p>
<ul>
  <li><strong>Birth date:</strong> 100 points, minus 5 for each day off.</li>
  <li><strong>Birth time:</strong> 100 points, minus 1 for every 10 minutes off.</li>
  <li><strong>Weight:</strong> 100 points, minus 10 per pound off (so ounces still matter).</li>
  <li><strong>Sex:</strong> 100 points for correct, 0 otherwise.</li>
  <li><strong>Name:</strong> hardest to score by hand. "Ellie" against "Eleanor" is closer than "Marcus," so judge by spelling and sound rather than an exact match.</li>
</ul>

<h2>Printable version</h2>
<p>Print the <a href="/printables/baby-prediction-cards/">baby prediction card sheet</a> — four cards per page, no email required. Cut them apart and put them on the table with a bowl for finished cards.</p>

<h2>Online version (it scores for you)</h2>
<p>The online version fixes the two annoying parts of paper: collecting cards from people who could not come, and scoring name guesses. You pick the categories, share one link, and every guess stays hidden until you reveal the real details. Name guesses are scored on spelling and pronunciation, so "Ellie" scores well against "Eleanor," and you get a leaderboard you can share the moment the baby arrives.</p>
<p>It is free, and guests do not need an account.</p>
`,
    cta: {
      heading: 'Use the online version',
      text: 'Pick your categories, share one link, and let StorkPool score every guess.',
      button: 'Create a free baby pool',
      source: 'guide_template',
    },
  },
  {
    slug: 'guides/office-baby-pool-ideas',
    title: 'Office Baby Pool Ideas (Free, No Money Involved) | StorkPool',
    description:
      'How to run an office baby pool for a coworker: categories that work in a workplace, how to keep it appropriate and free of gambling, prize ideas, and a link everyone can use.',
    heading: 'Office baby pool ideas',
    intro:
      'An office baby pool is an easy way to celebrate a coworker without organizing an entire party. Here is how to run one that is inclusive, quick to join, and does not turn into workplace gambling.',
    faqs: [
      ['How do you run an office baby pool?', 'Pick the categories (birth date, time, weight, name), share a single link or a printed card with the team, keep every guess hidden until the baby arrives, then announce the closest guesses. Keep it free to enter so it stays a game rather than gambling.'],
      ['Should an office baby pool involve money?', 'No. Paid entries with a cash prize can count as illegal gambling depending on your state, and many employers ban workplace betting outright. Use a small prize like a gift card bought by the organizer, or bragging rights.'],
      ['What are good prizes for an office baby pool?', 'A coffee gift card, the good parking spot for a week, lunch on the team, or a printed "closest guess" certificate. The prize is an excuse to gather, not the point.'],
    ],
    body: `
<h2>Keep it free to enter</h2>
<p>Charging a few dollars per guess and paying out a pot turns a game into gambling. Most workplaces ban that, and in many US states a pay-to-enter prize drawing is illegal for anyone but a licensed nonprofit. A free pool with a small prize from the organizer keeps it fun and uncomplicated.</p>

<h2>Categories that work at work</h2>
<ul>
  <li><strong>Birth date and time</strong> — everyone can guess, nobody needs to know the family.</li>
  <li><strong>Weight</strong> — the category coworkers argue about most.</li>
  <li><strong>Name</strong> — only if the parents are sharing it. Some keep it private until the birth, which actually makes it a better guessing game.</li>
  <li><strong>Custom category</strong> — "how many days late," "hair color," or "who gets the first photo."</li>
</ul>
<p>Skip anything about the parent's body. Weight of the baby is fine; anything else is not.</p>

<h2>Make joining take under a minute</h2>
<p>Anything that needs an account or a login loses half the office. Share one link in Slack or email, let people guess on their phone, and keep the guesses hidden so nobody copies the person above them.</p>

<h3>A message you can paste</h3>
<p><em>"[Name]'s baby is due [date]! Add your guesses for the birth date, weight, and name here — takes 30 seconds, and everything stays hidden until the baby arrives: [link]"</em></p>

<h2>Announcing the winner</h2>
<p>When the baby arrives, enter the real details and share the leaderboard in the same channel. It is a natural moment to congratulate the parents, and it gives everyone who guessed a reason to look.</p>
`,
    cta: {
      heading: 'Start an office pool',
      text: 'One link, no accounts for guests, hidden guesses, automatic scoring.',
      button: 'Create a free pool',
      source: 'guide_office',
    },
  },
  {
    slug: 'guides/virtual-baby-shower-games',
    title: 'Virtual Baby Shower Games That Work Over Video | StorkPool',
    description:
      'Baby shower games that actually work on Zoom: prediction pools, name guessing, price is right, and emoji pictionary — with timings and what to skip.',
    heading: 'Virtual baby shower games',
    intro:
      'Games that work in a living room often fall flat on video: people talk over each other, and anything involving passing objects is out. These work well remotely, and most of them work for guests who can only join for part of it.',
    faqs: [
      ['What are the best virtual baby shower games?', 'Prediction pools (name, date, weight), price is right with baby products, emoji pictionary, and "who knows the parents best." They work because guests play on their own device and results are revealed together.'],
      ['How long should a virtual baby shower be?', 'About 60 to 90 minutes total, with 10 to 15 minutes per game. Attention drops off on video faster than in person, so plan fewer games than you would for an in-person shower.'],
      ['How do you play a baby pool over Zoom?', 'Share a link before the call so guests can submit guesses on their phones, keep every guess hidden, then reveal the leaderboard on screen during the call. The winner is confirmed later, when the baby actually arrives.'],
    ],
    body: `
<h2>1. Prediction pool (10 minutes, plus a payoff weeks later)</h2>
<p>Guests predict the name, birth date, time, and weight. This is the only shower game that keeps going after the party: when the baby arrives, everyone gets a notification-worthy result. Share the link in the calendar invite so guests can guess before the call starts, then show the guesses on screen.</p>

<h2>2. Price is right (10 minutes)</h2>
<p>Show five baby products, guests guess the price, closest without going over wins. Screen sharing makes this easier online than in person.</p>

<h2>3. Emoji pictionary (10 minutes)</h2>
<p>Post emoji combinations in chat and have guests guess baby-related phrases. Works well because chat gives everyone an equal chance to answer, rather than whoever unmutes first.</p>

<h2>4. Who knows the parents best (15 minutes)</h2>
<p>Ask the parents 10 questions beforehand, then have guests guess the answers. The parents read out their real answers live, which produces the best reactions of the call.</p>

<h2>What to skip on video</h2>
<ul>
  <li><strong>Anything timed against other guests</strong> — video lag makes it unfair.</li>
  <li><strong>Guess the belly size</strong> — awkward in person, worse on camera.</li>
  <li><strong>Games needing supplies mailed in advance</strong> — half the guests will not have them.</li>
</ul>

<h2>A running order that works</h2>
<ol>
  <li>10 min — arrivals and hellos</li>
  <li>10 min — show the prediction pool guesses (submitted beforehand)</li>
  <li>15 min — who knows the parents best</li>
  <li>10 min — price is right</li>
  <li>10 min — gift opening</li>
  <li>10 min — open chat, then wrap up</li>
</ol>
`,
    cta: {
      heading: 'Set up the prediction game',
      text: 'Share one link before the call. Guesses stay hidden until you reveal them on screen.',
      button: 'Create a free pool',
      source: 'guide_virtual',
    },
  },
  {
    slug: 'guides/baby-due-date-pool',
    title: 'How to Run a Baby Due Date Pool | StorkPool',
    description:
      'Run a due date pool that is fair and fun: how to score guesses, what the real odds of arriving on the due date are, and how to keep everything hidden until the birth.',
    heading: 'How to run a baby due date pool',
    intro:
      'A due date pool is the simplest version of a baby pool: everyone guesses the day the baby arrives. It works because almost nobody guesses right — only about 4% of babies are born on their due date.',
    faqs: [
      ['How does a due date pool work?', 'Each guest picks a date (and optionally a time and weight). Guesses stay hidden until the baby is born, then the guest closest to the actual birth date wins. Scoring is usually 100 points minus 5 for each day off.'],
      ['What percentage of babies are born on their due date?', 'Roughly 4%. Most babies arrive within a week or two either side, which is what makes a due date pool a real guessing game rather than a coin flip.'],
      ['Can you add other categories to a due date pool?', 'Yes. Birth time, weight, sex, and the baby name are common additions. Scoring each category separately and adding them up keeps ties rare.'],
    ],
    body: `
<h2>Why the due date is a good thing to guess</h2>
<p>A due date is an estimate, not an appointment. Only about 4 in 100 babies arrive on the exact date, and most come within about two weeks either side. That spread is what makes the game work: everyone has a plausible guess, and nobody has an edge.</p>

<h2>Scoring</h2>
<p>Use a scale everyone can check:</p>
<ul>
  <li><strong>100 points</strong> for the exact date</li>
  <li><strong>minus 5 points</strong> for each day off, in either direction</li>
  <li>Add <strong>birth time</strong> (100 points, minus 1 per 10 minutes off) if you expect ties</li>
</ul>
<p>Guessing "one week late" and "one week early" should score the same. Any system that favors going late annoys people.</p>

<h2>Keep the guesses hidden</h2>
<p>If guests can see earlier guesses, the later ones cluster around them and the game gets boring. On paper, use a sealed box. Online, use a tool that hides everything until the reveal.</p>

<h2>Timing</h2>
<p>Open the pool around 4 to 6 weeks before the due date. Earlier and people forget they entered; much later and you miss anyone who arrives early. Close guesses on the due date itself, or when labor starts.</p>

<h2>Adding more categories</h2>
<p>A date-only pool often ends in a tie. Adding weight and time usually separates the top guesses, and adding the name turns it into a longer game, since parents often keep the name secret until the birth.</p>
`,
    cta: {
      heading: 'Run your due date pool online',
      text: 'Hidden guesses, automatic scoring, one link to share. Free, no sign-up for guests.',
      button: 'Create a free pool',
      source: 'guide_duedate',
    },
  },
];

// ─── Printable cards ─────────────────────────────────────────────────────────

function printableCard() {
  const line = (label) => `<div class="line"><span>${label}</span><i></i></div>`;
  const card = `
    <div class="pcard">
      <h3>Baby Predictions</h3>
      ${line('Your name')}
      ${line('Name guess 1')}
      ${line('Name guess 2')}
      ${line('Name guess 3')}
      ${line('Birth date')}
      ${line('Birth time')}
      ${line('Weight (lb / oz)')}
      ${line('Boy / Girl')}
      ${line('Wildcard')}
    </div>`;
  return `<div class="cards">${card.repeat(4)}</div>`;
}

function printablePage() {
  return layout({
    slug: 'printables/baby-prediction-cards',
    title: 'Free Printable Baby Prediction Cards (PDF-Ready) | StorkPool',
    description:
      'Free printable baby prediction cards — four per page, no email required. Print, cut, and pass them around at the shower, or run the same game online for free.',
    heading: 'Printable baby prediction cards',
    intro:
      'Four cards per page, no email required. Print, cut along the dashed lines, and put them out with a pen and a bowl for finished cards.',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: 'Print and use baby prediction cards',
      step: [
        { '@type': 'HowToStep', text: 'Press Print and choose portrait, 100% scale.' },
        { '@type': 'HowToStep', text: 'Cut along the dashed lines — four cards per page.' },
        { '@type': 'HowToStep', text: 'Set them out with pens and a bowl for completed cards.' },
        { '@type': 'HowToStep', text: 'Score the guesses when the baby arrives and announce the winner.' },
      ],
    },
    body: `
<div class="no-print">
  <p><button class="btn" onclick="window.print()" style="border:none;cursor:pointer;font-size:1rem">🖨️ Print these cards</button></p>
  <p class="chart-note">Tip: choose portrait and 100% scale. To save a PDF, pick "Save as PDF" as the printer.</p>
</div>
<div class="sheet">${printableCard()}</div>
<h2>How to score them</h2>
<ul>
  <li><strong>Birth date:</strong> 100 points, minus 5 per day off</li>
  <li><strong>Birth time:</strong> 100 points, minus 1 per 10 minutes off</li>
  <li><strong>Weight:</strong> 100 points, minus 10 per pound off</li>
  <li><strong>Sex:</strong> 100 points if correct</li>
  <li><strong>Name:</strong> judge by how close the spelling and sound are — "Ellie" is close to "Eleanor"</li>
</ul>
<h2>Guests who cannot make it</h2>
<p>Paper cards only reach the people in the room. If family are joining by video or live out of town, run the same game online: one link, guesses hidden until you reveal them, scoring handled for you.</p>
`,
    cta: {
      heading: 'Run it online instead',
      text: 'Same game, no printing, and everyone who cannot attend can still play.',
      button: 'Create a free pool',
      source: 'printable_cards',
    },
  });
}

// ─── Name pages (SSA data) ───────────────────────────────────────────────────

function loadSsaNames(zipPath) {
  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'ssa-'));
  execFileSync('unzip', ['-q', '-o', zipPath, '-d', tmp]);
  const files = fs.readdirSync(tmp).filter((f) => /^yob\d{4}\.txt$/.test(f)).sort();
  if (!files.length) throw new Error('No yobXXXX.txt files found in the archive');

  // name -> sex -> { year: count }, plus per-year totals for "per 100k babies"
  const data = new Map();
  const yearTotals = new Map();
  for (const file of files) {
    const year = parseInt(file.slice(3, 7), 10);
    let total = 0;
    for (const row of fs.readFileSync(path.join(tmp, file), 'utf8').split('\n')) {
      const [name, sex, countRaw] = row.trim().split(',');
      if (!name || !sex || !countRaw) continue;
      const count = parseInt(countRaw, 10);
      total += count;
      const key = `${name}|${sex}`;
      if (!data.has(key)) data.set(key, { name, sex, years: new Map() });
      data.get(key).years.set(year, count);
    }
    yearTotals.set(year, total);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  const latestYear = Math.max(...yearTotals.keys());
  return { data, yearTotals, latestYear };
}

function rankMap(data, year, sex) {
  const rows = [...data.values()]
    .filter((e) => e.sex === sex && e.years.get(year))
    .sort((a, b) => b.years.get(year) - a.years.get(year));
  const ranks = new Map();
  rows.forEach((e, i) => ranks.set(e.name, i + 1));
  return { rows, ranks };
}

// Single-series bar chart: births per 100k babies, by year
function trendChart(points) {
  const width = 720;
  const height = 200;
  const padTop = 18;
  const padBottom = 26;
  const plot = height - padTop - padBottom;
  const max = Math.max(1, ...points.map((p) => p.rate));
  const slot = width / points.length;
  const gap = Math.min(3, slot * 0.25);
  const barW = Math.max(1, slot - gap);
  const r = Math.min(4, barW / 2);
  const bars = points
    .map((p, i) => {
      const h = (p.rate / max) * plot;
      const x = i * slot + gap / 2;
      const y = padTop + plot - h;
      const rr = Math.min(r, h);
      if (h <= 0) return '';
      return `<path d="M${x.toFixed(1)},${padTop + plot} V${(y + rr).toFixed(1)} Q${x.toFixed(1)},${y.toFixed(1)} ${(x + rr).toFixed(1)},${y.toFixed(1)} H${(x + barW - rr).toFixed(1)} Q${(x + barW).toFixed(1)},${y.toFixed(1)} ${(x + barW).toFixed(1)},${(y + rr).toFixed(1)} V${padTop + plot} Z" fill="#667eea"><title>${p.year}: ${p.count.toLocaleString()} babies</title></path>`;
    })
    .join('');
  return `<svg class="chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Popularity by year, ${points[0].year} to ${points[points.length - 1].year}">
<line x1="0" x2="${width}" y1="${padTop}" y2="${padTop}" stroke="#e2e8f0" stroke-dasharray="4 4"/>
<text x="0" y="${padTop - 5}" font-size="11" fill="#718096">${Math.round(max)} per 100k</text>
<line x1="0" x2="${width}" y1="${padTop + plot}" y2="${padTop + plot}" stroke="#e2e8f0"/>
${bars}
<text x="0" y="${height - 7}" font-size="11" fill="#718096">${points[0].year}</text>
<text x="${width}" y="${height - 7}" font-size="11" fill="#718096" text-anchor="end">${points[points.length - 1].year}</text>
</svg>`;
}

function namePage(entry, ctx) {
  const { yearTotals, latestYear, ranks, siblings, other } = ctx;
  const displayName = entry.name;
  const sexWord = entry.sex === 'F' ? 'girls' : 'boys';
  const years = [];
  for (let y = latestYear - TREND_YEARS + 1; y <= latestYear; y++) {
    const count = entry.years.get(y) || 0;
    years.push({ year: y, count, rate: (count / yearTotals.get(y)) * 100000 });
  }
  const latest = years[years.length - 1];
  const rank = ranks.get(displayName);
  const peak = years.reduce((a, b) => (b.rate > a.rate ? b : a));
  // Compare the last 5 years against the 5 before them, so "over the last decade" is literal
  const avg = (arr) => arr.reduce((s, p) => s + p.rate, 0) / (arr.length || 1);
  const recent = avg(years.slice(-5));
  const prior = avg(years.slice(-10, -5));
  const direction = recent > prior * 1.15 ? 'rising' : recent < prior * 0.85 ? 'falling' : 'steady';
  const trendSentence = {
    rising: `${displayName} has been getting <strong>more</strong> common over the last decade.`,
    falling: `${displayName} has been getting <strong>less</strong> common over the last decade.`,
    steady: `${displayName} has held <strong>fairly steady</strong> over the last decade.`,
  }[direction];

  const tableRows = years
    .slice(-10)
    .reverse()
    .map((p) => `<tr><td>${p.year}</td><td class="num">${p.count.toLocaleString()}</td><td class="num">${p.rate.toFixed(1)}</td></tr>`)
    .join('');

  const siblingLinks = siblings
    .map((n) => `<li><a href="/names/${n.toLowerCase()}/">Is ${n} popular?</a></li>`)
    .join('');

  return layout({
    slug: `names/${displayName.toLowerCase()}`,
    title: `How Popular Is the Name ${displayName}? (${latestYear} Data) | StorkPool`,
    description: `${displayName} was given to ${latest.count.toLocaleString()} ${sexWord} in the US in ${latestYear}${rank ? `, ranking #${rank}` : ''}. See the ${TREND_YEARS}-year popularity trend from Social Security Administration data.`,
    heading: `How popular is the name ${displayName}?`,
    intro: `In ${latestYear}, <strong>${latest.count.toLocaleString()}</strong> ${sexWord} in the United States were named ${displayName}${rank ? `, making it the <strong>#${rank}</strong> most common name for ${sexWord} that year` : ''}. ${
      other
        ? `It is also used for ${other.sex === 'F' ? 'girls' : 'boys'} — ${(other.years.get(latestYear) || 0).toLocaleString()} that year. `
        : ''
    }${trendSentence}`,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Dataset',
      name: `Popularity of the name ${displayName} in the United States`,
      description: `Yearly counts of US babies named ${displayName}, from Social Security Administration records.`,
      creator: { '@type': 'GovernmentOrganization', name: 'US Social Security Administration' },
      isAccessibleForFree: true,
    },
    body: `
<div class="stat-row">
  <div class="stat-box"><div class="v">${latest.count.toLocaleString()}</div><div class="l">Babies in ${latestYear}</div></div>
  ${rank ? `<div class="stat-box"><div class="v">#${rank}</div><div class="l">Rank for ${sexWord}</div></div>` : ''}
  <div class="stat-box"><div class="v">${peak.year}</div><div class="l">Peak year (last ${TREND_YEARS})</div></div>
</div>

<h2>Popularity over the last ${TREND_YEARS} years</h2>
${trendChart(years)}
<p class="chart-note">Babies named ${displayName} per 100,000 born, so the trend is not distorted by changes in the birth rate. Source: US Social Security Administration.</p>

<h2>Year by year</h2>
<table>
  <thead><tr><th>Year</th><th class="num">Babies named ${displayName}</th><th class="num">Per 100k</th></tr></thead>
  <tbody>${tableRows}</tbody>
</table>

<h2>Guessing ${displayName} in a baby pool</h2>
<p>If the parents have kept the name secret, popularity data is a reasonable starting point — most parents pick something in the top few hundred. But guessing one name is a long shot. A pool that allows several guesses per person, and scores near-misses (${displayName} against a similar-sounding name) rather than only exact matches, makes for a much better game.</p>

<h2>Similar-popularity names</h2>
<ul>${siblingLinks}</ul>
`,
    cta: {
      heading: `Think the baby will be a ${displayName}?`,
      text: 'Start a free pool, invite the family, and see who guesses closest. Names are scored on spelling and sound, so near-misses still count.',
      button: 'Create a free pool',
      source: 'name_page',
    },
  });
}

// ─── Sitemap ─────────────────────────────────────────────────────────────────

function writeSitemap() {
  const urls = [
    { loc: `${SITE}/`, priority: 1.0, changefreq: 'weekly' },
    { loc: `${SITE}/faqs`, priority: 0.8, changefreq: 'monthly' },
    ...pages,
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority.toFixed(1)}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;
  fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), xml);
  return urls.length;
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  fs.writeFileSync(path.join(PUBLIC_DIR, 'pages.css'), STYLESHEET);

  for (const guide of GUIDES) {
    write(
      guide.slug,
      layout({
        slug: guide.slug,
        title: guide.title,
        description: guide.description,
        heading: guide.heading,
        intro: guide.intro,
        body: guide.body + faqSection(guide.faqs),
        cta: guide.cta,
        jsonLd: faqJsonLd(guide.faqs),
      }),
      { priority: 0.9 }
    );
  }
  write('printables/baby-prediction-cards', printablePage(), { priority: 0.9 });

  const namesFlag = process.argv.indexOf('--names');
  if (namesFlag !== -1) {
    const zipPath = process.argv[namesFlag + 1];
    if (!zipPath || !fs.existsSync(zipPath)) {
      console.error(`Cannot find SSA archive at ${zipPath}`);
      process.exit(1);
    }
    console.log('Reading SSA data…');
    const { data, yearTotals, latestYear } = loadSsaNames(zipPath);
    const ranksBySex = {};
    const chosen = new Map(); // lowercase name -> { entry, other }
    for (const sex of ['F', 'M']) {
      const { rows, ranks } = rankMap(data, latestYear, sex);
      ranksBySex[sex] = ranks;
      for (const entry of rows.slice(0, NAME_PAGE_LIMIT)) {
        const key = entry.name.toLowerCase();
        const existing = chosen.get(key);
        // Unisex names appear in both lists; keep one page for the more common spelling-sex
        if (!existing) {
          chosen.set(key, { entry });
        } else if (entry.years.get(latestYear) > existing.entry.years.get(latestYear)) {
          chosen.set(key, { entry, other: existing.entry });
        } else {
          existing.other = entry;
        }
      }
    }
    const list = [...chosen.values()];
    list.forEach(({ entry, other }, i) => {
      const siblings = [list[i - 2], list[i - 1], list[i + 1], list[i + 2]]
        .filter(Boolean)
        .map((e) => e.entry.name)
        .filter((n) => n !== entry.name);
      write(
        `names/${entry.name.toLowerCase()}`,
        namePage(entry, { yearTotals, latestYear, ranks: ranksBySex[entry.sex], siblings, other }),
        { priority: 0.6 }
      );
    });
    console.log(`Generated ${list.length} name pages (latest year: ${latestYear})`);
  } else {
    // Keep existing name pages in the sitemap even when regenerating without the dataset
    const namesDir = path.join(PUBLIC_DIR, 'names');
    if (fs.existsSync(namesDir)) {
      for (const dir of fs.readdirSync(namesDir)) {
        pages.push({ loc: `${SITE}/names/${dir}/`, priority: 0.6, changefreq: 'monthly' });
      }
    }
  }

  const total = writeSitemap();
  console.log(`Wrote ${pages.length} pages and a sitemap with ${total} URLs.`);
}

function faqSection(faqs) {
  return `
<h2>Common questions</h2>
${faqs.map(([q, a]) => `<h3>${esc(q)}</h3>\n<p>${esc(a)}</p>`).join('\n')}
`;
}

main();
