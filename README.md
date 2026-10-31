# Onyx · Marketplace de NFTs

Setup rápido (a documentação completa é escrita na fase 6):

```bash
pnpm install
cp .env.example .env.local
pnpm dev          # desenvolvimento com mocks (MSW)
pnpm check        # tipos, lint, testes unitários e build
```

Credenciais fictícias: `ana@onyx.test` e `bruno@onyx.test`, senha `Onyx#2026`.
Cenário inicial: `?scenario=<nome>` na URL ou `window.__mock.setScenario('<nome>')` no console.
