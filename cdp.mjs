// Drives headless Edge over the Chrome DevTools Protocol (no deps; Node global WebSocket).
const BASE = 'http://127.0.0.1:9222';
const APP = 'http://localhost:5173';

const targets = await (await fetch(`${BASE}/json/list`)).json();
let page = targets.find((t) => t.type === 'page');
if (!page) { console.log('no page target'); process.exit(1); }

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));

let id = 0;
const pending = new Map();
const consoleLogs = [];
const exceptions = [];

ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); return; }
  if (msg.method === 'Runtime.consoleAPICalled') {
    const text = (msg.params.args || []).map((a) => a.value ?? a.description ?? a.type).join(' ');
    consoleLogs.push(`[${msg.params.type}] ${text}`);
  } else if (msg.method === 'Runtime.exceptionThrown') {
    const d = msg.params.exceptionDetails;
    exceptions.push(d.exception?.description || d.text);
  } else if (msg.method === 'Log.entryAdded') {
    consoleLogs.push(`[${msg.params.entry.level}] ${msg.params.entry.text}`);
  }
};

const send = (method, params = {}) =>
  new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });

const evaluate = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.result?.exceptionDetails) return { __error: r.result.exceptionDetails.text };
  return r.result?.result?.value;
};

await send('Runtime.enable');
await send('Page.enable');
await send('Log.enable');

async function goto(path) {
  const loaded = new Promise((r) => { const h = (ev) => { const m = JSON.parse(ev.data); if (m.method === 'Page.loadEventFired') { ws.removeEventListener('message', h); r(); } }; ws.addEventListener('message', h); });
  await send('Page.navigate', { url: APP + path });
  await loaded;
  await new Promise((r) => setTimeout(r, 1200)); // let Svelte hydrate
}

// ---------- HOME ----------
await goto('/');
const home = await evaluate(`(() => {
  const out = {};
  const btn = document.querySelector('#formules a[href^="/reservation?service="]');
  const cs = btn && getComputedStyle(btn);
  out.reserveButton = btn ? { text: btn.textContent.trim(), background: cs.backgroundColor, color: cs.color, w: btn.offsetWidth, h: btn.offsetHeight } : 'NOT FOUND';

  // Click the first option chip and see if its selected style applies (should turn forest green)
  const chip = document.querySelector('#formules span[role="button"]');
  let chipBefore = null, chipAfter = null;
  if (chip) {
    chipBefore = getComputedStyle(chip).backgroundColor;
    chip.click();
    chipAfter = getComputedStyle(chip).backgroundColor;
    out.chip = { text: chip.textContent.trim(), before: chipBefore, after: chipAfter };
  }

  // About panel opacity check
  const panel = document.querySelector('.glass-panel');
  if (panel) out.glassPanelBg = getComputedStyle(panel).backgroundColor;

  // Info strip background (was a broken bracket-var)
  const strip = document.querySelector('section.bg-\\\\(--color-forest\\\\), section[class*="bg-(--color-forest)"]');
  return out;
})()`);
console.log('=== HOME ===');
console.log(JSON.stringify(home, null, 2));

// ---------- RESERVATION ----------
await goto('/reservation');
const resa = await evaluate(`(() => {
  const out = {};
  const panel = document.querySelector('.glass-panel');
  if (panel) out.stepPanelBg = getComputedStyle(panel).backgroundColor;
  // first service select button
  const svc = panel && panel.querySelector('button');
  if (svc) { const c = getComputedStyle(svc); out.serviceButton = { text: svc.textContent.replace(/\\s+/g,' ').trim().slice(0,60), color: c.color, background: c.backgroundColor }; }
  return out;
})()`);
console.log('=== RESERVATION ===');
console.log(JSON.stringify(resa, null, 2));

console.log('\n=== CONSOLE MESSAGES (' + consoleLogs.length + ') ===');
consoleLogs.forEach((l) => console.log('  ' + l));
console.log('\n=== EXCEPTIONS (' + exceptions.length + ') ===');
exceptions.forEach((l) => console.log('  ' + l));

ws.close();
