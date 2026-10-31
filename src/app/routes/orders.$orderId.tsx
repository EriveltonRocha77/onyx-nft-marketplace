import { createFileRoute } from '@tanstack/react-router';
import { requireAuth } from '../../features/auth/guards';
import { OrderPage } from '../../features/checkout/OrderPage';

export const Route = createFileRoute('/orders/$orderId')({
  beforeLoad: requireAuth,
  component: function OrderRoute() {
    return <OrderPage orderId={Route.useParams().orderId} />;
  },
});
