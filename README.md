# Onyx · Marketplace de NFTs

Front-end de um marketplace de NFTs: catálogo, detalhe, favoritos, carrinho, perfil, carteiras, pagamento com cotação, pedidos e tempo real.
Tudo roda no navegador contra uma API simulada (MSW) e um servidor Socket.IO simulado (`@mswjs/socket.io-binding`), que o `socket.io-client` real usa.

Stack: React 19, TypeScript estrito, Vite, TanStack Router e Query, Axios, Socket.IO, Tailwind v4, componentes no estilo shadcn/ui (Radix), MSW, Vitest, Playwright, Lighthouse.

## Começando

Requisitos: Node 22+ e pnpm 10+.

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

O app abre em http://localhost:5173 com os mocks ligados.

## Variáveis de ambiente

| Variável | Padrão | Função |
|---|---|---|
| `VITE_MOCKS` | `on` | Os mocks (MSW, REST e Socket.IO) ficam ligados por padrão. `off` desliga e usa a API real. |
| `VITE_DEFAULT_SCENARIO` | `default` | Cenário inicial dos mocks. |
| `VITE_API_BASE_URL` | `/api` | Base das chamadas REST. |
| `VITE_SOCKET_URL` | vazio | URL do Socket.IO. Vazio usa a origem da página. |
| `VITE_API_TIMEOUT_MS` | `10000` | Tempo limite das requisições. Os testes E2E usam 5000. |
| `PW_CHROMIUM_PATH` | vazio | Caminho de um Chromium para Playwright e Lighthouse (`CHROME_PATH` no Lighthouse). |

## Credenciais fictícias

| E-mail | Senha | Usuário |
|---|---|---|
| `ana@onyx.test` | `Onyx#2026` | `user-ana` (tem favoritos, carteiras e pedidos) |
| `bruno@onyx.test` | `Onyx#2026` | `user-bruno` |

CPF válido para testar o pagamento: `529.982.247-25`. Cupons: `ONYX10` (10%), `WELCOME005` (0,05 ETH), `EXPIRED20` (expirado).

## Comandos

| Comando | O que faz |
|---|---|
| `pnpm dev` | Desenvolvimento com mocks. |
| `pnpm build` | `tsc -b` e build de produção em `dist/`. |
| `pnpm preview` | Serve `dist/` em http://localhost:4173. |
| `pnpm typecheck` | Checagem de tipos. |
| `pnpm lint` | ESLint. |
| `pnpm test` | Testes unitários e de handlers (Vitest). |
| `pnpm check` | Tipos, lint, testes e build. |
| `pnpm test:e2e` | Playwright: E2E, a11y, teclado, layout e regressão visual. |
| `pnpm test:e2e:update` | Regera as imagens de referência. |
| `pnpm test:e2e:report` | Abre o relatório HTML (traces nas falhas). |
| `pnpm lighthouse` | Build, preview e 3 medições por página e perfil. |

### Playwright

Projetos: `desktop` (1440×900), `mobile` (390×844) e `tablet` (768, só os testes marcados `@layout`).
O Playwright sobe o build com mocks sozinho. Em máquinas sem os navegadores do Playwright, aponte um Chromium:

```bash
PW_CHROMIUM_PATH=/caminho/do/chrome pnpm test:e2e
```

As imagens de referência ficam em `e2e/__screenshots__/{projeto}/`. A tolerância é `maxDiffPixelRatio: 0.02`. Elas foram geradas em Linux com o Chromium da máquina de desenvolvimento; em outro sistema, fontes e antialiasing mudam e é normal rodar `pnpm test:e2e:update` uma vez e conferir as imagens a olho.

### Lighthouse

`pnpm lighthouse` faz o build com mocks, sobe o preview, mede home (`/`) e detalhe (`/nft/nft-005`) em mobile e desktop, 3 execuções cada, e grava em `lighthouse/reports/`: HTML e JSON de cada execução, `summary.json` e `summary.md` (medianas, LCP, CLS, TBT, versões e ambiente). A configuração e as metas estão em `lighthouse/config.mjs`. Resultados e justificativas: [docs/LIGHTHOUSE.md](docs/LIGHTHOUSE.md).

## Cenários dos mocks

Escolha pela URL (`/?scenario=slow`, guardado na sessão da aba), por `VITE_DEFAULT_SCENARIO` ou no console:

```js
window.__mock.setScenario('payment-declined')
window.__mock.reset()           // zera o banco e volta ao cenário default
window.__mock.reset('slow')     // zera e já aplica um cenário
```

| Cenário | Efeito |
|---|---|
| `default` | Latência de 80 ms, tudo funciona. |
| `empty` | Catálogo vazio. |
| `slow` | Latência de 2,5 s. |
| `variable-latency` | Latência entre 50 ms e 2,5 s (semente fixa). |
| `network-error` | `GET /api/nfts` falha sem resposta. |
| `server-error` | `GET /api/nfts` (500) e `GET /api/cart` (503). |
| `flaky` | `GET /api/nfts` falha 2 vezes (503) e depois funciona. |
| `forbidden` | `GET /api/wallets` responde 403 e `GET /api/nfts/nft-013` responde 404. |
| `session-expired` | A próxima chamada autenticada responde `SESSION_EXPIRED`. |
| `price-changed` | O preço muda entre a cotação e o pedido (`QUOTE_STALE`). |
| `sold-out` | O estoque acaba entre a cotação e o pedido (`AVAILABILITY_CONFLICT`, uma vez). |
| `order-timeout` | `POST /api/orders` demora 15 s e estoura o tempo limite. |
| `payment-confirmed` / `payment-declined` | Resultado do pagamento (1,5 s depois). |
| `wallet-refused` | A carteira recusa a conexão. |
| `offline` | Todas as chamadas falham como rede fora do ar. |

Outros controles em `window.__mock`: `setLatency`, `delayNext(match, ms)`, `failNext(match, resposta)`, `expireSession()`, `mutateNft(id, patch)`, `emitCurrent`, `emitRaw`, `disconnectSocket({ block })`, `reconnectSocket()`, `resolveOrder(id, resultado)`, `getState()`.
O banco fica em `localStorage` (`onyx:mock:v1`), então sobrevive a recarregamentos.

## Como reproduzir os fluxos de falha

| Fluxo | Como |
|---|---|
| Lista falha e recupera | `/?scenario=flaky` (falha 2 vezes, as tentativas automáticas recuperam) ou `network-error` e use "Tentar de novo". |
| Sessão expira | Entre, rode `__mock.expireSession()` e navegue. O app volta ao login e mantém o rascunho. |
| Preço mudou no pagamento | `?scenario=price-changed`, vá a Pagamento e confirme. Aparece a nova cotação para aceitar. |
| Estoque acabou | `?scenario=sold-out` e confirme o pedido. |
| Pagamento recusado | `?scenario=payment-declined`. A página do pedido termina em "Recusado". |
| Tempo limite no pedido | `?scenario=order-timeout`. Depois do tempo limite o app oferece reenviar com a mesma `Idempotency-Key`, sem duplicar. |
| Carteira recusada | `?scenario=wallet-refused` e clique em Conectar. |
| Tempo real cai | `__mock.disconnectSocket({ block: true })` mostra o aviso de reconexão; `__mock.reconnectSocket()` restaura e o app reconcilia. |
| Item muda no detalhe | `__mock.mutateNft('nft-005', { price: '9.9' })` com a página aberta. |

## Deploy no Cloudflare

O repositório traz `wrangler.jsonc`, que publica `dist/` como site estático. Rotas diretas e refresh funcionam porque `not_found_handling` está em `single-page-application`.

1. No Cloudflare, conecte o repositório em Workers & Pages (Create, Connect to Git).
2. Build command: `pnpm run build`. Deploy command: `npx wrangler deploy`.
3. Nenhuma variável é obrigatória: os mocks já vêm ligados. Se o build reclamar da versão do Node, use `NODE_VERSION=22`.
4. O service worker do MSW (`mockServiceWorker.js`) é servido da raiz do site.

Em Cloudflare Pages com upload direto, suba o conteúdo de `dist/` já compilado e inclua um arquivo `_redirects` com `/* /index.html 200`.

## Documentação

- [ARCHITECTURE.md](ARCHITECTURE.md): decisões, sessão, carrinho, cache, tempo real, limitações.
- [docs/CONTRACTS.md](docs/CONTRACTS.md): endpoints REST, erros e eventos Socket.IO.
- [docs/LIGHTHOUSE.md](docs/LIGHTHOUSE.md): resultados e justificativas.
- [docs/spikes/socketio-binding.md](docs/spikes/socketio-binding.md): o que se descobriu sobre o Socket.IO sobre MSW.
