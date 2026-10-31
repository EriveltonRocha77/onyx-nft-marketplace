import { createFileRoute } from '@tanstack/react-router';
import { requireAuth } from '../../features/auth/guards';

export const Route = createFileRoute('/checkout')({ beforeLoad: requireAuth, component: () => <div>Pagamento (em construção)</div> });
