const { createCanvas } = require('@napi-rs/canvas');
const { AttachmentBuilder } = require('discord.js');
const makeEmbed = require('./embed');
const cooldown = require('./cooldown');
const { aiScanChat, aiCheckChannels, aiThreshold, aiMinTextLength } = require('../config');

const FONT = '"DejaVu Sans", Arial, sans-serif';
const GREEN = '#2ecc71';
const RED = '#e74c3c';

// ---------- detection ----------
async function fetchJson(url, opts = {}) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 15000);
  try {
    const r = await fetch(url, { ...opts, signal: ctl.signal });
    const body = await r.text();
    if (!r.ok) throw new Error(`${r.status} ${body.slice(0, 120)}`);
    return JSON.parse(body);
  } finally {
    clearTimeout(timer);
  }
}

// images: Sightengine (SIGHTENGINE_USER + SIGHTENGINE_SECRET in .env) -> 0-100
async function scoreImage(url) {
  const params = new URLSearchParams({
    url,
    models: 'genai',
    api_user: process.env.SIGHTENGINE_USER,
    api_secret: process.env.SIGHTENGINE_SECRET,
  });
  const j = await fetchJson(`https://api.sightengine.com/1.0/check.json?${params}`);
  if (j.status && j.status !== 'success') throw new Error(j.error?.message || 'sightengine failed');
  const s = j.type?.ai_generated ?? j.ai_generated;
  if (typeof s !== 'number') throw new Error('sightengine: no score in response');
  return s * 100;
}

// text: AI or Not (AIORNOT_API_KEY in .env) -> 0-100
async function scoreText(text) {
  const j = await fetchJson('https://api.aiornot.com/v2/text/sync', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.AIORNOT_API_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ text }).toString(),
  });
  const c = j.report?.ai_text?.confidence;
  if (typeof c !== 'number') throw new Error('aiornot: no score in response');
  return c * 100;
}

// ---------- the wheel ----------
async function gauge(score, label, name) {
  score = Math.max(0, Math.min(100, score));
  const W = 600, H = 380, cx = 300, cy = 235, R = 165, LW = 36;
  const canvas = createCanvas(W, H);
  const g = canvas.getContext('2d');

  g.fillStyle = '#0a1a2b';
  g.fillRect(0, 0, W, H);

  g.textAlign = 'center';
  g.fillStyle = '#7fb8e6';
  g.font = `bold 22px ${FONT}`;
  g.fillText(`AI CHECK - ${label.toUpperCase()}`, cx, 42);

  const ang = (s) => Math.PI + (s / 100) * Math.PI; // 0 = left, 100 = right, over the top
  const arc = (from, to, color) => {
    g.beginPath();
    g.arc(cx, cy, R, ang(from), ang(to));
    g.lineWidth = LW;
    g.lineCap = 'butt';
    g.strokeStyle = color;
    g.stroke();
  };

  // dim track (green = human zone, red = AI zone) then the bright filled part
  arc(0, aiThreshold, '#15402f');
  arc(aiThreshold, 100, '#4a1d24');
  if (score > 0) arc(0, Math.min(score, aiThreshold), GREEN);
  if (score > aiThreshold) arc(aiThreshold, score, RED);

  // threshold tick + label
  const ta = ang(aiThreshold);
  g.beginPath();
  g.moveTo(cx + Math.cos(ta) * (R - LW / 2 - 6), cy + Math.sin(ta) * (R - LW / 2 - 6));
  g.lineTo(cx + Math.cos(ta) * (R + LW / 2 + 6), cy + Math.sin(ta) * (R + LW / 2 + 6));
  g.lineWidth = 3;
  g.strokeStyle = '#ffffff';
  g.stroke();
  g.fillStyle = '#ffffff';
  g.font = `bold 18px ${FONT}`;
  g.fillText(String(aiThreshold), cx + Math.cos(ta) * (R + LW / 2 + 26), cy + Math.sin(ta) * (R + LW / 2 + 26) + 6);

  // 0 / 100 labels
  g.fillStyle = '#7fb8e6';
  g.font = `16px ${FONT}`;
  g.fillText('0', cx - R, cy + 32);
  g.fillText('100', cx + R, cy + 32);

  // needle
  const a = ang(score);
  g.beginPath();
  g.moveTo(cx, cy);
  g.lineTo(cx + Math.cos(a) * (R - LW / 2 - 10), cy + Math.sin(a) * (R - LW / 2 - 10));
  g.lineWidth = 6;
  g.lineCap = 'round';
  g.strokeStyle = '#ffffff';
  g.stroke();
  g.beginPath();
  g.arc(cx, cy, 13, 0, Math.PI * 2);
  g.fillStyle = '#ffffff';
  g.fill();

  // score + verdict
  const isAi = score > aiThreshold;
  g.fillStyle = '#ffffff';
  g.font = `bold 60px ${FONT}`;
  g.fillText(`${Math.round(score)}%`, cx, 312);
  g.fillStyle = isAi ? RED : GREEN;
  g.font = `bold 24px ${FONT}`;
  g.fillText(isAi ? 'LIKELY AI' : 'LIKELY HUMAN', cx, 350);

  return new AttachmentBuilder(await canvas.encode('png'), { name });
}

// ---------- main ----------
const cleanText = (s) => s.replace(/https?:\/\/\S+/g, '').replace(/<[^>\s]+>/g, '').trim();

module.exports = async (msg) => {
  if (!aiScanChat) return;
  if (aiCheckChannels.length && !aiCheckChannels.includes(msg.channel.id)) return;

  const jobs = [];
  if (process.env.SIGHTENGINE_USER && process.env.SIGHTENGINE_SECRET) {
    [...msg.attachments.values()]
      .filter((a) => /^image\/(png|jpe?g|webp)/.test(a.contentType || '') && a.size <= 10 * 1024 * 1024)
      .slice(0, 3)
      .forEach((a) => jobs.push({ kind: 'Image', run: () => scoreImage(a.url) }));
  }
  const text = cleanText(msg.content || '');
  if (process.env.AIORNOT_API_KEY && text.length >= aiMinTextLength)
    jobs.push({ kind: 'Text', run: () => scoreText(text) });

  if (!jobs.length) return;
  if (cooldown(`ai:${msg.author.id}`, 8000)) return; // only counts when there is something to check

  const results = await Promise.allSettled(jobs.map((j) => j.run()));
  const embeds = [];
  const files = [];

  for (let n = 0; n < jobs.length; n++) {
    if (results[n].status !== 'fulfilled') {
      console.error(`ai check (${jobs[n].kind}) failed:`, results[n].reason?.message);
      continue;
    }
    const score = results[n].value;
    const name = `ai-${n + 1}.png`;
    const isAi = score > aiThreshold;
    files.push(await gauge(score, jobs[n].kind, name));
    embeds.push(
      makeEmbed(' - AI detection is not 100% accurate')
        .setColor(isAi ? 0xe74c3c : 0x2ecc71)
        .setTitle(`AI Check - ${jobs[n].kind}`)
        .setDescription(`**${Math.round(score)}%** - ${isAi ? 'Likely AI generated' : 'Likely human'}`)
        .setImage(`attachment://${name}`)
    );
  }

  if (!embeds.length) return;
  await msg.reply({ embeds, files, allowedMentions: { repliedUser: false } });
};

// used by the applications system
module.exports.scoreText = scoreText;
module.exports.gauge = gauge;
