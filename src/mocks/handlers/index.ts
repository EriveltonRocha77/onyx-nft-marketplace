import { socketHandler } from '../socket/handler';
import { authHandlers } from './auth';
import { cartHandlers } from './cart';
import { favoriteHandlers } from './favorites';
import { nftHandlers } from './nfts';
import { orderHandlers } from './orders';
import { profileHandlers } from './profile';
import { walletHandlers } from './wallets';

export const handlers = [...authHandlers, ...nftHandlers, ...favoriteHandlers, ...cartHandlers, ...profileHandlers, ...walletHandlers, ...orderHandlers, socketHandler];
