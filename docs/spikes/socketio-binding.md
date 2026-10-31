# Spike: Socket.IO real sobre MSW (`@mswjs/socket.io-binding`)

Resultado: **funciona** no navegador (Chromium) com `socket.io-client` real.
Prova: `e2e/spike-socket.spec.ts` conecta, recebe `nft.updated`, sofre desconexão, reconecta sozinho e volta a receber.

## Achados que viraram regras do projeto

1. **Os mocks sobem antes do `socket.io-client`.** O `engine.io-client` guarda `globalThis.WebSocket` ao ser importado.
   Se for importado antes de `startMocks()`, ele usa o WebSocket nativo e fica preso em "opening". Por isso `main.tsx`
   inicia o MSW e só então importa a aplicação (`import('./app/App')`).
2. **O MSW remove `/socket.io/` do caminho antes de comparar com a URL do handler.** `ws.link('*/socket.io/')` nunca casa.
   O handler usa `ws.link('*')` e filtra pelo caminho no listener; outros WebSockets (HMR do Vite) seguem para o servidor real.
3. **`toSocketIo()` envia o handshake ao ser chamado.** Se for chamado antes do evento `open` do cliente, a mensagem se perde.
   O handler adia a chamada em 10 ms.
4. **O binding não envia pings Engine.IO.** Sem ping, o cliente derruba a conexão após `pingInterval + pingTimeout`.
   O handler envia `2` a cada 20 s.
5. **A autenticação** (`auth.token`) chega no pacote `40{...}`. O handler lê o token e associa a conexão ao usuário.
6. **Vitest/jsdom não serve para este teste.** O build Node do `engine.io-client` usa o pacote `ws`, que o MSW não intercepta.
   Os testes que passam pelo socket rodam no Playwright (navegador real).

## Limitações do transporte simulado (documentadas também no ARCHITECTURE.md)

- Só existe no navegador, com o MSW ativo. Transporte somente WebSocket (`transports: ['websocket']`, sem long-polling).
- Sem sincronização entre abas: cada aba tem seu service worker e seus clientes.
- O binding não implementa rooms, namespaces nem broadcast. O isolamento por usuário é feito pelo handler, que só entrega
  eventos de pedido ao dono, e de novo no cliente.
