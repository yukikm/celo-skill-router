import puppeteer from 'puppeteer';
import { mkdirSync } from 'fs';
import { execSync } from 'child_process';

const BASE = 'https://celo-skill-router-web2.vercel.app';
const FRAMES_DIR = '/tmp/demo-frames';
mkdirSync(FRAMES_DIR, { recursive: true });

const browser = await puppeteer.launch({
  headless: true,
  executablePath: '/usr/bin/chromium-browser',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });

let frame = 0;
async function snap(label) {
  const padded = String(frame++).padStart(3, '0');
  const path = `${FRAMES_DIR}/frame_${padded}.png`;
  await page.screenshot({ path });
  console.log(`[${padded}] ${label}`);
  // Hold each frame for ~2 seconds in the video (we'll duplicate)
}

async function wait(ms) {
  await new Promise(r => setTimeout(r, ms));
}

// 1. Home page
console.log('--- Recording demo ---');
await page.setContent('<html><body style="background:#0b0b0d;display:flex;align-items:center;justify-content:center;height:100vh;font-family:Inter,sans-serif"><div style="text-align:center;color:#f3f3f5"><h1 style="font-size:48px;margin:0">Skill Router</h1><p style="color:#34d399;font-size:24px;margin-top:12px">Agent-to-Agent Marketplace on Celo</p><p style="color:#a1a1aa;font-size:16px;margin-top:8px">Demo Walkthrough</p></div></body></html>');
await snap('Title card');
await snap('Title card (hold)');

await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 15000 });
await wait(1000);
await snap('Home page');
await snap('Home page (hold)');

// 2. Seed
try {
  await page.evaluate(() => fetch('/api/_seed', { method: 'POST' }));
  await wait(500);
  await snap('Seeded data');
} catch { }

// 3. Tasks page
await page.goto(`${BASE}/tasks`, { waitUntil: 'networkidle2', timeout: 10000 });
await wait(1000);
await snap('Tasks list');
await snap('Tasks list (hold)');

// 4. Click first task
const taskLinks = await page.$$('a[href*="/tasks/task_"]');
if (taskLinks.length > 0) {
  await taskLinks[0].click();
  await wait(2000);
  await snap('Task detail - OPEN');
  await snap('Task detail (hold)');

  // 5. Auto-route
  const routeBtn = await page.$('button');
  if (routeBtn) {
    const text = await routeBtn.evaluate(el => el.textContent);
    if (text.includes('Auto-route') || text.includes('Route')) {
      await routeBtn.click();
      await wait(2000);
      await snap('Task routed to agent');
      await snap('Task routed (hold)');
    }
  }
}

// 6. Agents page
await page.goto(`${BASE}/agents`, { waitUntil: 'networkidle2', timeout: 10000 });
await wait(1000);
await snap('Agents list');
await snap('Agents list (hold)');

// 7. Register page
await page.goto(`${BASE}/agents/register`, { waitUntil: 'networkidle2', timeout: 10000 });
await wait(500);
await snap('Register agent');

// 8. Post task page
await page.goto(`${BASE}/tasks/new`, { waitUntil: 'networkidle2', timeout: 10000 });
await wait(500);
await snap('Post task form');
await snap('Post task (hold)');

// 9. Docs
await page.goto(`${BASE}/docs`, { waitUntil: 'networkidle2', timeout: 10000 });
await wait(500);
await snap('Docs - How it works');
await snap('Docs (hold)');

// 10. Getting started
await page.goto(`${BASE}/getting-started`, { waitUntil: 'networkidle2', timeout: 10000 });
await wait(500);
await snap('Getting started guide');
await snap('Getting started (hold)');

// 11. End card
await page.setContent('<html><body style="background:#0b0b0d;display:flex;align-items:center;justify-content:center;height:100vh;font-family:Inter,sans-serif"><div style="text-align:center;color:#f3f3f5"><h1 style="font-size:40px;margin:0">Skill Router</h1><p style="color:#34d399;font-size:20px;margin-top:12px">celo-skill-router-web2.vercel.app</p><p style="color:#a1a1aa;font-size:14px;margin-top:16px">GitHub: yukikm/celo-skill-router</p><p style="color:#a1a1aa;font-size:14px">ERC-8004 agentId #134 • SelfClaw verified</p><p style="color:#34d399;font-size:18px;margin-top:20px">Built by 0xOpenClaw</p></div></body></html>');
await snap('End card');
await snap('End card (hold)');
await snap('End card (hold 2)');

await browser.close();

// Generate mp4 from frames (each frame = 2 seconds, 0.5fps input → 30fps output)
const outPath = '/root/.openclaw/workspace/repos/celo-tabless/demo.mp4';
console.log('\n--- Generating video ---');
execSync(`ffmpeg -y -framerate 0.5 -i ${FRAMES_DIR}/frame_%03d.png -vf "scale=1280:800,format=yuv420p" -c:v libx264 -r 30 -pix_fmt yuv420p ${outPath}`, { stdio: 'inherit' });
console.log(`\n✅ Video: ${outPath}`);
