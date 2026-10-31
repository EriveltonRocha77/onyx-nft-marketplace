import { createFileRoute } from '@tanstack/react-router';
import { t } from '@/shared/i18n';

export const Route = createFileRoute('/')({
  component: () => (
    <main id="conteudo" className="p-8">
      <h1 className="text-3xl">{t('app.name')}</h1>
      <p className="text-muted">{t('app.tagline')}</p>
    </main>
  ),
});
