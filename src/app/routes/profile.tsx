import { createFileRoute } from '@tanstack/react-router';
import { requireAuth } from '../../features/auth/guards';
import { ProfilePage } from '../../features/profile/ProfilePage';

export const Route = createFileRoute('/profile')({ beforeLoad: requireAuth, component: ProfilePage });
