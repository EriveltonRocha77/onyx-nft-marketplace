// Configuração versionada do Lighthouse. Alterar metas ou páginas aqui.
export const RUNS = 3;

export const TARGETS = { performance: 90, accessibility: 95, 'best-practices': 95, seo: 90 };

export const PAGES = [
  { id: 'home', path: '/' },
  { id: 'detalhe', path: '/nft/nft-005' },
];

export const FORM_FACTORS = ['mobile', 'desktop'];

// Perfis padrão do Lighthouse (mobile: Moto G Power + 4x CPU + Slow 4G; desktop: sem throttling de CPU extra).
export const settingsFor = (formFactor) => ({
  onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
  formFactor,
  screenEmulation:
    formFactor === 'mobile'
      ? { mobile: true, width: 412, height: 823, deviceScaleFactor: 1.75, disabled: false }
      : { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false },
  throttlingMethod: 'simulate',
  ...(formFactor === 'desktop'
    ? { throttling: { rttMs: 40, throughputKbps: 10 * 1024, cpuSlowdownMultiplier: 1, requestLatencyMs: 0, downloadThroughputKbps: 0, uploadThroughputKbps: 0 } }
    : {}),
  locale: 'pt-BR',
});

export const PORT = 4173;
export const CHROME_FLAGS = ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'];
