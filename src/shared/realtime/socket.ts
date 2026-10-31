import { io, type Socket } from 'socket.io-client';

export interface CreateSocketOptions {
  /** Origem do servidor. Vazio usa a origem da página (mocks via MSW). */
  url?: string;
  token: string;
}

export function createSocket({ url, token }: CreateSocketOptions): Socket {
  const options = {
    path: '/socket.io/',
    transports: ['websocket'],
    auth: { token },
    reconnection: true,
    reconnectionDelay: 400,
    reconnectionDelayMax: 2000,
  };
  return url ? io(url, options) : io(options);
}
