'use strict';
/* MemoryRooms – Spaced Repetition & Antwort-Auswertung */

function isDue(it, now = Date.now()) {
  const d = it.stats && it.stats.due;
  return !d || new Date(d).getTime() <= now;
}

function schedule(stats, r) {
  // r: 0=Nochmal, 1=Schwer, 2=Gut, 3=Leicht
  let box = stats.box || 0, days;
  if (r === 0) {
    box = 0;
    days = 0;
  } else if (r === 1) {
    days = box === 0 ? 0 : Math.max(1, Math.round(INTERVALS[box] * 0.5));
  } else if (r === 2) {
    box = Math.min(MAX_BOX, box + 1);
    days = INTERVALS[box];
  } else {
    box = Math.min(MAX_BOX, box + 2);
    days = Math.round(INTERVALS[box] * 1.3);
  }
  return { box, days };
}

function dueAt(days) {
  if (days <= 0) return new Date().toISOString();
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function fmtDays(d) {
  return d <= 0 ? 'gleich nochmal' : d === 1 ? 'in 1 Tag' : d < 30 ? `in ${d} Tagen` : `in ${Math.round(d / 30)} Mon.`;
}

function norm(s) {
  return String(s || '')
    .toLocaleLowerCase('de-DE')
    .replace(/[^a-z0-9äöüß]/gi, '');
}

function lev(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let p = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let c = [i];
    for (let j = 1; j <= n; j++) {
      c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    p = c;
  }
  return p[n];
}

function similar(a, b) {
  a = norm(a);
  b = norm(b);
  if (!a || !b) return false;
  if (a === b) return true;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen < 4) return a === b;
  return lev(a, b) <= Math.max(1, Math.floor(maxLen * 0.2));
}
