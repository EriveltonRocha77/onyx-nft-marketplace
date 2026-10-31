import { socketHandler } from '../socket/handler';
import { authHandlers } from './auth';
import { cartHandlers } from './cart';
import { favoriteHandlers } from './favorites';
import { nftHandlers } from './nfts';
import { profileHandlers } from './profile';

export const handlers = [...authHandlers, ...nftHandlers, ...favoriteHandlers, ...cartHandlers, ...profileHandlers, socketHandler];
