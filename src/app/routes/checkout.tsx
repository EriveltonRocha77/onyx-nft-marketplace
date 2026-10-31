import { createFileRoute } from '@tanstack/react-router';
import { requireAuth } from '../../features/auth/guards';
import { CheckoutPage } from '../../features/checkout/CheckoutPage';

export const Route = createFileRoute('/checkout')({ beforeLoad: requireAuth, component: CheckoutPage });
