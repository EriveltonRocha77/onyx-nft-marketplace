# Arquitetura

Contratos REST e eventos: [docs/CONTRACTS.md](docs/CONTRACTS.md). Instruções de uso: [README.md](README.md).

## Visão geral

```
src/
  app/            roteamento (TanStack Router, rotas por arquivo), providers, layout raiz
  features/       auth, catalog, nft, cart, profile, wallets, checkout (páginas, hooks e chamadas)
  shared/         api (Axios, erros, esquemas zod, chaves de query), realtime, validation, layout, ui
  mocks/          banco, domínio, handlers REST, servidor Socket.IO simulado, cenários, window.__mock
e2e/              Playwright (fluxos, a11y, teclado, layout, regressão visual)
lighthouse/       config e script de medição
```

Cada feature tem seu código de tela e suas chamadas à API. O que é de mais de uma feature fica em `shared/`.

## Mocks

Um único banco em `localStorage` (`onyx:mock:v1`) serve os handlers REST e o handler do socket. O `main.tsx` liga o MSW antes de importar a aplicação, porque o `engine.io-client` guarda `WebSocket` no momento do import.
Mudanças de domínio (preço, estoque, pedido confirmado) passam por um barramento interno (`mocks/domain/events.ts`) que as converte em eventos do Socket.IO. Assim REST e tempo real nunca discordam sobre o mesmo fato.
`window.__mock` controla cenários, latência, falhas pontuais e eventos; veja o README.

## Política de sessão

- Token em `localStorage` (`onyx:token`). O Axios o envia em `Authorization`.
- `SESSION_EXPIRED` em qualquer chamada autenticada dispara um tratamento único (guarda contra rajadas): limpa token e caches do usuário, encerra o socket, avisa e leva ao login com `redirect` para a página de origem.
- Rascunhos (formulário de pagamento, tentativa de pedido) ficam em `sessionStorage` por usuário e sobrevivem à expiração, a recarregamentos e ao tempo limite. Ao sair da conta eles são removidos.
- Limpezas de sessão (socket, caches) se registram com `registerSessionCleanup` e rodam no logout e na expiração.
- Trocar de usuário não reaproveita cache: as chaves de query de dados do usuário incluem o escopo (id do usuário ou do carrinho de visitante).

## Estado do carrinho

- O servidor é a fonte da verdade. O cliente guarda só o identificador do carrinho de visitante (`onyx:cart-id`, enviado em `X-Cart-Id`).
- Visitante e usuário têm carrinhos separados. No login, `POST /cart/merge` une os dois. Se a união falhar no meio (queda, aba fechada), `fetchUserCart` recupera o estado atual e o próximo login tenta de novo; a operação é idempotente.
- Os totais vêm da API. O cliente não soma preços.
- Cada linha traz `available` e `nftVersion`. Se o estoque cai ou o preço muda enquanto o item está no carrinho, a tela mostra o aviso e limita a quantidade.
- Limites: 10 por linha e no máximo o estoque.

## Cache e tentativas (TanStack Query)

| Item | Regra |
|---|---|
| `staleTime` | 30 s. |
| `gcTime` | 5 min. |
| Leituras | Tentam de novo só em `NETWORK`, `TIMEOUT`, `TRANSIENT` e 5xx, com recuo exponencial e no máximo 2 tentativas. 4xx nunca repete. |
| Mutações | Não repetem, com uma exceção: `POST /orders` repete erros transitórios com a mesma `Idempotency-Key`. |
| Listas com filtros | A chave inclui todos os filtros; a URL é a fonte dos filtros. `placeholderData` mantém a lista anterior enquanto carrega a nova. |
| Favoritos | Atualização otimista com retorno ao estado anterior se falhar. |

## Pagamento e pedidos

1. `POST /quotes` gera uma cotação com validade (`expiresAt`). A tela de revisão mostra os valores da cotação.
2. `POST /orders` leva `Idempotency-Key`. O servidor guarda a chave com uma impressão digital de `[quoteId, walletId, network, collector]`: mesma chave e mesma impressão devolvem o mesmo pedido; mesma chave e corpo diferente é `IDEMPOTENCY_CONFLICT`.
3. `QUOTE_STALE` traz a cotação nova em `details.quote`. O cliente mostra a diferença e exige confirmação antes de tentar de novo, com chave nova.
4. `AVAILABILITY_CONFLICT` volta ao carrinho com os itens afetados marcados.
5. O pedido nasce `pending` e vira `confirmed` ou `declined`. Estado terminal não regride, nem por evento atrasado nem por consulta.
6. O recibo é uma cópia (snapshot) da cotação no momento do pedido. Mudanças de preço depois não o alteram.
7. Tempo limite no envio: o cliente guarda chave e corpo no rascunho. "Tentar de novo" reenvia exatamente a mesma tentativa, então não duplica o pedido, mesmo depois de recarregar a página.
8. Um ref impede duplo clique durante o envio.

## Reconciliação REST e Socket.IO

O socket serve para avisar, o REST para ler. Cada evento tem `id` e `version` por recurso.

- `createLedger` descarta eventos com `id` repetido e `version` menor ou igual à última aplicada para o mesmo recurso. Isso cobre duplicatas e eventos fora de ordem.
- `applyEvent` atualiza o cache: `nft.updated` corrige detalhe, listas e destaques, e invalida os carrinhos que contêm o NFT. `order.updated` invalida a consulta do pedido para o REST ter a última palavra.
- Eventos com `userId` diferente do usuário atual são ignorados (defesa em profundidade, além do filtro no servidor simulado).
- Na reconexão, `reconcile` invalida as consultas ativas: tudo o que se perdeu durante a queda é relido por REST.
- A página do pedido também consulta por polling como rede de segurança: a cada 10 s com o socket conectado, 1,5 s sem ele.
- `ConnectionBanner` avisa quando o tempo real está fora e remove o aviso ao voltar.
- Há uma conexão por identidade (id do usuário ou `guest`). Ao trocar de identidade, a anterior é encerrada.
- O socket tem `timeout: 4000` na conexão e reconexão automática.

## Decisões de interface

- Tema escuro sóbrio com um acento lima. Tokens em `@theme` no `src/index.css`.
- Textos em português, centralizados para permitir tradução depois.
- Dinheiro sempre formatado em pt-BR com "ETH" no fim.
- Estados de carregamento são esqueletos com a mesma forma do conteúdo, para evitar saltos (CLS ≈ 0).
- Erros de leitura aparecem no lugar do conteúdo, com "Tentar de novo". Erros de ação aparecem em aviso (toast) ou junto ao campo.
- Formulários validam no cliente com zod e exibem também os erros por campo devolvidos pela API. Ao enviar com erro, o foco vai para o resumo de erros.
- Teclado: tudo é alcançável e operável (testes em `e2e/keyboard.spec.ts`); foco visível; diálogos prendem o foco e devolvem ao gatilho.
- Acessibilidade: axe sem violações nas telas principais (`e2e/a11y.spec.ts`), contraste conferido nos tokens, regiões ao vivo para avisos.
- Responsivo de 320 px a desktop; sem rolagem horizontal (testado).

### Desvios em relação ao Figma

Não há arquivo de Figma entre os materiais do desafio. O visual é original. Nenhuma tela foi ajustada para "parecer" com um layout que não existe, e por isso não há lista de desvios pontuais.

## Limitações conhecidas

- O servidor é simulado: o Socket.IO só funciona com o MSW ativo, só por WebSocket (sem long-polling), sem salas nem namespaces, e sem sincronização entre abas (cada aba tem seu service worker, mas o banco em `localStorage` é compartilhado).
- Pagamentos, carteiras e transações são simulados; não há blockchain.
- O MSW entra no bundle de produção para que o deploy estático funcione. Isso pesa no Lighthouse mobile (ver [docs/LIGHTHOUSE.md](docs/LIGHTHOUSE.md)).
- As imagens de referência do Playwright foram geradas em Linux; em outro sistema pode ser preciso regerá-las.
- Os dados são em português e as páginas não têm troca de idioma pronta na interface (só a estrutura de textos centralizada).
