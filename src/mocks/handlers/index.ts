import { socketHandler } from '../socket/handler';
import { authHandlers } from './auth';
import { nftHandlers } from './nfts';

export const handlers = [...authHandlers, ...nftHandlers, socketHandler];
