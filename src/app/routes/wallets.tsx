import { createFileRoute } from '@tanstack/react-router';
import { requireAuth } from '../../features/auth/guards';
import { WalletsPage } from '../../features/wallets/WalletsPage';

export const Route = createFileRoute('/wallets')({ beforeLoad: requireAuth, component: WalletsPage });
