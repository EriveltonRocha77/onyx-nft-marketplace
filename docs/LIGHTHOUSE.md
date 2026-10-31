# Lighthouse

Medição com `pnpm lighthouse` (config em `lighthouse/config.mjs`). Relatórios completos em `lighthouse/reports/` (HTML e JSON de cada execução, `summary.json`, `summary.md`).

- Lighthouse 13.6.0, Chromium 153 (headless), Node 22.
- Linux, 2 CPUs, 8 GB. Build de produção servido por `vite preview`, mocks ligados, cenário `default`.
- Perfis padrão do Lighthouse: mobile (4× CPU, rede 4G lenta simulada) e desktop. 3 execuções por página e perfil; a tabela traz a mediana.

| Página | Perfil | Perf | A11y | BP | SEO | LCP (ms) | CLS | TBT (ms) |
|---|---|---|---|---|---|---|---|---|
| Home | mobile | 73 | 100 | 100 | 100 | 4505 | 0,000 | 429 |
| Home | desktop | 95 | 100 | 100 | 100 | 1567 | 0,005 | 0 |
| Detalhe | mobile | 80 | 100 | 100 | 100 | 4029 | 0,000 | 307 |
| Detalhe | desktop | 98 | 100 | 100 | 100 | 1124 | 0,000 | 0 |

Metas: Performance ≥ 90, Acessibilidade ≥ 95, Boas práticas ≥ 95, SEO ≥ 90.
Todas as metas foram atingidas, exceto Performance no mobile (home 73, detalhe 80).

## Por que o mobile fica abaixo

O CLS é praticamente zero, então o problema é LCP e TBT, e a causa é a mesma nas duas páginas: o runtime do MSW.

- O chunk do MSW tem 475 kB (174 kB gzip) e custa cerca de 1,5 s de CPU no perfil mobile (4× mais lento). É o maior item do tempo de bootup.
- O app só importa o código da interface depois que o service worker dos mocks está ativo (o `engine.io-client` guarda `WebSocket` ao ser importado). Isso encadeia: HTML, script principal, MSW, registro do service worker, chunk da aplicação, chamada à API, imagem. A imagem do LCP só é pedida depois de toda a cadeia: 718 ms de atraso no carregamento do recurso, contra 7 ms de TTFB.
- Num deploy com API real o MSW não existe, a cadeia some.

Não adicionei truques para inflar o número (por exemplo, esconder o conteúdo, tirar imagens ou reduzir a página). Imagens têm `width`/`height`, a do LCP usa `fetchpriority="high"` e não é lazy, as fontes são locais e o JS é dividido por rota.

## Como melhorar depois

1. Rodar com `VITE_MOCKS=off` contra uma API real (o ganho esperado é o maior).
2. Pré-carregar (`modulepreload`) o chunk da aplicação durante o registro do service worker, sem avaliá-lo antes da hora.
3. Carregar o MSW só quando o service worker ainda não estiver ativo.
