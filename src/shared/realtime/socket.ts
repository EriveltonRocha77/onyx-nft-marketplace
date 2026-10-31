import { io, type Socket } from 'socket.io-client';

export interface CreateSocketOptions {
  /** Origem do servidor. Vazio usa a origem da página (mocks via MSW). */
  url?: string;
  /** Lido a cada (re)conexão, para nunca reutilizar um token antigo. */
  getToken: () => string | null;
}

export function createSocket({ url, getToken }: CreateSocketOptions): Socket {
  const options = {
    path: '/socket.io/',
    transports: ['websocket'],
    auth: (cb: (data: { token: string }) => void) => cb({ token: getToken() ?? '' }),
    // tentativas sem handshake são descartadas rápido, para a reconexão acontecer logo que o servidor volta
    timeout: 4000,
    reconnection: true,
    reconnectionDelay: 400,
    reconnectionDelayMax: 2000,
  };
  return url ? io(url, options) : io(options);
}
