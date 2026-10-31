# Contratos

Todos os caminhos ficam sob `/api`. Corpo e resposta em JSON, exceto o upload de avatar (`multipart/form-data`).
Os esquemas zod estão em `src/shared/api/schemas/` e são validados no cliente a cada resposta.
Autenticação: `Authorization: Bearer <token>`. Carrinho de visitante: `X-Cart-Id: <id>`.

## Valores em ETH

ETH trafega como string decimal com até 18 casas (`"0.0021"`). O cliente converte para `bigint` em wei só para comparar.
A API calcula todos os totais; a interface não recalcula, só formata em pt-BR (`3,00 ETH`).

## Erros

```json
{ "error": { "code": "QUOTE_STALE", "message": "…", "fields": { "campo": "motivo" }, "details": {} }, "requestId": "…" }
```

| Código | HTTP | Quando |
|---|---|---|
| `VALIDATION_ERROR` | 422 | Campos inválidos (`fields`). |
| `UNAUTHENTICATED` | 401 | Sem token ou credenciais erradas. |
| `SESSION_EXPIRED` | 401 | Token expirou. |
| `FORBIDDEN` | 403 | Sem permissão. |
| `NOT_FOUND` | 404 | Recurso inexistente. |
| `EMAIL_TAKEN` | 409 | E-mail já cadastrado. |
| `AVAILABILITY_CONFLICT` | 409 | Estoque insuficiente. |
| `QUOTE_STALE` | 409 | Cotação vencida ou preço mudou. `details.quote` traz a cotação nova. |
| `IDEMPOTENCY_CONFLICT` | 409 | Mesma `Idempotency-Key` com corpo diferente. |
| `TRANSIENT` | 5xx | Falha temporária. O cliente pode tentar de novo. |
| `NETWORK`, `TIMEOUT`, `UNKNOWN` | n/a | Gerados no cliente (sem resposta, tempo limite, resposta fora do contrato). |

## Endpoints

### Sessão
| Método e caminho | Descrição |
|---|---|
| `POST /auth/register` | Cria conta. 409 `EMAIL_TAKEN`. |
| `POST /auth/login` | Devolve `{ token, session: { user, expiresAt } }`. |
| `POST /auth/logout` | Encerra a sessão. |
| `GET /session` | `{ user, expiresAt }`. |

### Catálogo e favoritos
| Método e caminho | Descrição |
|---|---|
| `GET /nfts` | Lista paginada. Query: `page`, `pageSize` (1 a 48, padrão 12), `q`, `collection`, `category`, `minPrice`, `maxPrice`, `availability=available`, `favorites=true`, `sort` (`newest`, `price_asc`, `price_desc`, `name`). Resposta: `items`, `page`, `pageSize`, `total`, `totalPages`, `facets`. |
| `GET /nfts/featured` | `{ items }`. |
| `GET /nfts/:id` | Detalhe, com edições, estoque e `version`. |
| `GET /favorites` | Favoritos do usuário. |
| `PUT /favorites/:nftId` | Favorita (idempotente). |
| `DELETE /favorites/:nftId` | Remove (idempotente). |

### Carrinho
| Método e caminho | Descrição |
|---|---|
| `GET /cart` | Carrinho do usuário ou do visitante. |
| `POST /cart/items` | `{ nftId, editionId, quantity }`. Soma se a linha existe. Máximo de 10 por linha e até o estoque. |
| `PATCH /cart/items/:itemId` | `{ quantity }`. |
| `DELETE /cart/items/:itemId` | Remove a linha. |
| `PUT /cart/coupon` / `DELETE /cart/coupon` | Aplica ou remove cupom. |
| `PUT /cart/network` | `{ network: "ethereum" \| "polygon" \| "base" }`. Taxas: 0,0021, 0,0004, 0,0002 ETH. |
| `POST /cart/merge` | `{ guestCartId }`. Exige token. Soma as linhas do visitante ao carrinho do usuário (limitadas ao estoque), leva o cupom se o usuário não tiver um e apaga o carrinho de visitante. Repetir não duplica. |

Resposta do carrinho: `id`, `items` (`id`, `nftId`, `editionId`, `quantity`, `name`, `image`, `editionLabel`, `unitPriceEth`, `lineTotalEth`, `available`, `nftVersion`), `coupon`, `network`, `summary` (`subtotalEth`, `discountEth`, `networkFeeEth`, `totalEth`), `version`.

### Perfil e carteiras
| Método e caminho | Descrição |
|---|---|
| `GET /profile`, `PATCH /profile` | `name`, `displayName`, `bio` (até 160) e demais campos do perfil. |
| `PUT /profile/avatar` | `multipart`, campo `file`. PNG, JPEG ou WebP, até 1 MB. `DELETE /profile/avatar` remove. |
| `PUT /profile/password` | `{ currentPassword, newPassword }`. |
| `GET /wallets`, `POST /wallets` | Lista (`{ items }`) e cadastra `{ label, address, network, role }` (`0x` + 40 hex; uma principal e uma secundária por usuário, senão 409 `VALIDATION_ERROR`). |
| `PATCH /wallets/:id` | `{ label, address, network }`. Trocar o endereço desconecta a carteira. |
| `POST /wallets/:id/connect`, `/disconnect` | Conexão simulada. Com o cenário `wallet-refused`, a conexão responde 403 `FORBIDDEN`. |

### Pagamento e pedidos
| Método e caminho | Descrição |
|---|---|
| `POST /quotes` | `{ walletId, network }`. Devolve `{ quoteId, version, network, walletId, couponCode, lines, summary, expiresAt }`. |
| `POST /orders` | Header `Idempotency-Key` obrigatório. Corpo `{ quoteId, walletId, network, collector: { name, email, document } }` (`document` é o CPF). 201 cria (`status: pending`). Mesma chave e mesmo corpo devolve o mesmo pedido (200). Corpo diferente é `IDEMPOTENCY_CONFLICT`. |
| `GET /orders/:id` | Pedido: `id`, `status` (`pending`, `confirmed`, `declined`), `version`, `declineReason`, `collector` e `receipt` (cópia das linhas e valores da cotação, `walletAddress`, `snapshotAt`, `txHash` e `confirmedAt` quando confirmado). |

Regras do pedido: `pending` vira `confirmed` ou `declined` e nunca volta. Ao confirmar, o estoque diminui, a `version` do NFT sobe e só as quantidades compradas saem do carrinho.

## Socket.IO

Conexão por WebSocket em `/socket.io`, `auth: { token }` (função, relida a cada reconexão; sem token entra como visitante).
Todo evento usa o mesmo envelope, validado com zod no cliente:

```json
{
  "id": "evt_…", "type": "order.updated", "version": 3, "occurredAt": "2026-…Z",
  "userId": "user-ana",
  "resource": { "kind": "order", "id": "ord_…" },
  "payload": { "status": "confirmed", "declineReason": null }
}
```

| Evento | Destino | `resource` | `payload` |
|---|---|---|---|
| `nft.updated` | Todos (`userId: null`) | `{ kind: "nft", id }` | `{ nft }` com o NFT completo. |
| `order.updated` | Só o dono do pedido | `{ kind: "order", id }` | `{ status, declineReason }` |

`version` é a versão do recurso. O cliente aceita eventos repetidos ou fora de ordem: descarta `id` já visto e `version` menor ou igual à aplicada para aquele recurso, e ignora eventos cujo `userId` não seja o do usuário atual. Estados terminais de pedido nunca regridem.
