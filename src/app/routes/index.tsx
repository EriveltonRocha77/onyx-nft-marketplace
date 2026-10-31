import { createFileRoute } from '@tanstack/react-router';
import { CatalogPage } from '../../features/catalog/CatalogPage';
import { catalogSearchSchema } from '../../features/catalog/search';

export const Route = createFileRoute('/')({
  validateSearch: (s) => catalogSearchSchema.parse(s),
  component: function HomeRoute() {
    return <CatalogPage raw={Route.useSearch()} />;
  },
});
