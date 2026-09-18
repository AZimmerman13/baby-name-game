// Generates 1000x1500 Pinterest pin SVGs. Run: node pin.js
const fs = require('fs');
const W = 1000, H = 1500;

// Rendered on a square canvas (qlmanage scales to width and clips a tall canvas);
// export-pins.sh crops the padding back off to a true 1000x1500 pin.
const base = (inner, { top = '#667eea', bottom = '#764ba2' } = {}) => `<svg xmlns="http://www.w3.org/2000/svg" width="${H}" height="${H}" viewBox="${(W - H) / 2} 0 ${H} ${H}" font-family="Helvetica, Arial, sans-serif">
  <rect x="${(W - H) / 2}" y="0" width="${H}" height="${H}" fill="#ffffff"/>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${top}"/><stop offset="100%" stop-color="${bottom}"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="18" flood-color="#000" flood-opacity="0.18"/>
    </filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  ${inner}
  <text x="${W / 2}" y="${H - 58}" text-anchor="middle" font-size="34" font-weight="700" fill="#ffffff" opacity="0.95">storkpool.com</text>
</svg>`;

const title = (lines, y0, size = 74) => lines.map((t, i) =>
  `<text x="${W / 2}" y="${y0 + i * (size + 14)}" text-anchor="middle" font-size="${size}" font-weight="700" fill="#ffffff">${t}</text>`).join('\n  ');

const sub = (t, y, size = 36) =>
  `<text x="${W / 2}" y="${y}" text-anchor="middle" font-size="${size}" fill="#ffffff" opacity="0.92">${t}</text>`;

const cardLines = (labels, x, y, w, lineGap = 52) => labels.map((l, i) => `
    <text x="${x + 34}" y="${y + 70 + i * lineGap}" font-size="27" fill="#4a5568">${l}</text>
    <line x1="${x + 34 + 250}" y1="${y + 76 + i * lineGap}" x2="${x + w - 34}" y2="${y + 76 + i * lineGap}" stroke="#e2e8f0" stroke-width="3"/>`).join('');

// 1 — printable cards
const card = (x, y, w, h) => `
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="22" fill="#ffffff" filter="url(#shadow)"/>
  <text x="${x + w / 2}" y="${y + 52}" text-anchor="middle" font-size="32" font-weight="700" fill="#667eea">Baby Predictions</text>
  ${cardLines(['Your name', 'Name guess', 'Birth date', 'Birth time', 'Weight', 'Boy / Girl'], x, y + 30, w)}`;

fs.writeFileSync('pin-printable-cards.svg', base(`
  ${title(['Free printable', 'baby prediction', 'cards'], 190)}
  ${sub('No email required', 480)}
  ${card(150, 580, 700, 500)}
  ${sub('Print 4 per page — or play online free', 1200, 34)}
`));

// 2 — name guessing game
fs.writeFileSync('pin-name-game.svg', base(`
  ${title(['The baby name', 'guessing game', 'for your shower'], 200)}
  ${sub('Everyone guesses. Nobody peeks.', 500)}
  <rect x="150" y="580" width="700" height="600" rx="22" fill="#ffffff" filter="url(#shadow)"/>
  <text x="500" y="660" text-anchor="middle" font-size="30" fill="#718096">The baby's name is...</text>
  <text x="500" y="740" text-anchor="middle" font-size="76" font-weight="700" fill="#667eea">Eleanor</text>
  <line x1="200" y1="790" x2="800" y2="790" stroke="#e2e8f0" stroke-width="3"/>
  <text x="230" y="860" font-size="34" fill="#2d3748">🥇  Grandma Jo</text><text x="770" y="860" text-anchor="end" font-size="34" font-weight="700" fill="#667eea">98.5</text>
  <text x="230" y="940" font-size="34" fill="#2d3748">🥈  Aunt Rachel</text><text x="770" y="940" text-anchor="end" font-size="34" font-weight="700" fill="#667eea">86.0</text>
  <text x="230" y="1020" font-size="34" fill="#2d3748">🥉  Cousin Dev</text><text x="770" y="1020" text-anchor="end" font-size="34" font-weight="700" fill="#667eea">72.5</text>
  <text x="500" y="1120" text-anchor="middle" font-size="28" fill="#718096">Close guesses score too — "Ellie" beats "Marcus"</text>
  ${sub('Free · no sign-up for guests', 1290, 34)}
`, { top: '#7f7fe8', bottom: '#8d5fb0' }));

// 3 — due date pool
fs.writeFileSync('pin-due-date-pool.svg', base(`
  ${title(['Guess the', 'due date'], 220, 92)}
  ${sub('Only 4% of babies arrive on time', 470)}
  <rect x="150" y="560" width="700" height="620" rx="22" fill="#ffffff" filter="url(#shadow)"/>
  <text x="500" y="640" text-anchor="middle" font-size="30" fill="#718096">Due March 14</text>
  <g>
    ${[0, 1, 2, 3, 4, 5, 6].map((i) => {
      const heights = [40, 90, 150, 210, 160, 100, 45];
      const x = 210 + i * 90;
      const h = heights[i];
      return `<rect x="${x}" y="${920 - h}" width="60" height="${h}" rx="8" fill="${i === 3 ? '#667eea' : '#c3cbf5'}"/>`;
    }).join('\n    ')}
  </g>
  <line x1="190" y1="925" x2="830" y2="925" stroke="#e2e8f0" stroke-width="3"/>
  <text x="500" y="985" text-anchor="middle" font-size="28" fill="#718096">Mar 11        Mar 14        Mar 17</text>
  <text x="500" y="1075" text-anchor="middle" font-size="36" font-weight="700" fill="#2d3748">Who gets closest?</text>
  <text x="500" y="1130" text-anchor="middle" font-size="28" fill="#718096">Date · time · weight · name</text>
  ${sub('Free baby pool — one link to share', 1300, 34)}
`, { top: '#6aa8ea', bottom: '#764ba2' }));

console.log('Wrote 3 pin SVGs');
