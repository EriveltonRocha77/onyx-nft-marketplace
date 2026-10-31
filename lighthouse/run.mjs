// Uso: pnpm lighthouse  (faz o build com mocks ligados, sobe o preview e mede)
// Env: CHROME_PATH para escolher o Chromium; LH_SKIP_BUILD=1 para reaproveitar dist/.
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import os from 'node:os';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import { RUNS, TARGETS, PAGES, FORM_FACTORS, settingsFor, PORT, CHROME_FLAGS } from './config.mjs';

const OUT = 'lighthouse/reports';
mkdirSync(OUT, { recursive: true });
const base = `http://localhost:${PORT}`;
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

if (!process.env.LH_SKIP_BUILD) {
  const r = spawnSync('pnpm', ['exec', 'vite', 'build'], {
    stdio: 'inherit',
    env: { ...process.env, VITE_MOCKS: 'on', VITE_DEFAULT_SCENARIO: 'default' },
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

const server = spawn('pnpm', ['exec', 'vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' });
const stop = () => server.kill();
process.on('exit', stop);
for (let i = 0; i < 60; i++) {
  try { if ((await fetch(base)).ok) break; } catch {}
  await new Promise((r) => setTimeout(r, 500));
}

const lhVersion = JSON.parse(readFileSync('node_modules/lighthouse/package.json', 'utf8')).version;
const rows = [];
let chromeVersion = '';

for (const page of PAGES) {
  for (const ff of FORM_FACTORS) {
    const runs = [];
    for (let i = 1; i <= RUNS; i++) {
      const chrome = await chromeLauncher.launch({ chromeFlags: CHROME_FLAGS, chromePath: process.env.CHROME_PATH });
      try {
        const res = await lighthouse(base + page.path, { port: chrome.port, output: ['json', 'html'], logLevel: 'error' }, {
          extends: 'lighthouse:default',
          settings: settingsFor(ff),
        });
        const lhr = res.lhr;
        chromeVersion = lhr.environment.hostUserAgent;
        const stem = `${OUT}/${page.id}-${ff}-run${i}`;
        writeFileSync(`${stem}.json`, res.report[0]);
        writeFileSync(`${stem}.html`, res.report[1]);
        const c = lhr.categories;
        runs.push({
          performance: Math.round(c.performance.score * 100),
          accessibility: Math.round(c.accessibility.score * 100),
          'best-practices': Math.round(c['best-practices'].score * 100),
          seo: Math.round(c.seo.score * 100),
          lcp: lhr.audits['largest-contentful-paint'].numericValue,
          cls: lhr.audits['cumulative-layout-shift'].numericValue,
          tbt: lhr.audits['total-blocking-time'].numericValue,
          fcp: lhr.audits['first-contentful-paint'].numericValue,
        });
      } finally {
        await chrome.kill();
      }
    }
    const keys = Object.keys(runs[0]);
    const med = Object.fromEntries(keys.map((k) => [k, median(runs.map((r) => r[k]))]));
    rows.push({ page: page.id, formFactor: ff, runs, median: med });
    console.log(page.id, ff, JSON.stringify(med));
  }
}
stop();

const summary = {
  generatedAt: new Date().toISOString(),
  tools: { lighthouse: lhVersion, chrome: chromeVersion, node: process.version },
  environment: { os: `${os.type()} ${os.release()}`, cpus: os.cpus().length, memoryGB: Math.round(os.totalmem() / 2 ** 30), app: 'vite build + preview, mocks ligados (cenário default)' },
  runsPerPage: RUNS,
  targets: TARGETS,
  results: rows,
};
writeFileSync(`${OUT}/summary.json`, JSON.stringify(summary, null, 2));

const f = (v, d = 0) => v.toFixed(d);
let md = `# Resultados Lighthouse\n\nGerado em ${summary.generatedAt}. Mediana de ${RUNS} execuções por página e perfil.\n\n`;
md += `- Lighthouse ${lhVersion}\n- ${chromeVersion}\n- Node ${process.version}\n- ${summary.environment.os}, ${summary.environment.cpus} CPUs, ${summary.environment.memoryGB} GB\n- Alvo: ${summary.environment.app}\n\n`;
md += `| Página | Perfil | Perf | A11y | BP | SEO | LCP (ms) | CLS | TBT (ms) | Metas |\n|---|---|---|---|---|---|---|---|---|---|\n`;
for (const r of rows) {
  const m = r.median;
  const miss = Object.entries(TARGETS).filter(([k, t]) => m[k] < t).map(([k]) => k);
  md += `| ${r.page} | ${r.formFactor} | ${m.performance} | ${m.accessibility} | ${m['best-practices']} | ${m.seo} | ${f(m.lcp)} | ${f(m.cls, 3)} | ${f(m.tbt)} | ${miss.length ? 'abaixo: ' + miss.join(', ') : 'ok'} |\n`;
}
writeFileSync(`${OUT}/summary.md`, md);
console.log('\n' + md);
