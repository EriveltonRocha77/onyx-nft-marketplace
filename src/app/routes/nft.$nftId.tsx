import { createFileRoute } from '@tanstack/react-router';
import { NftDetailPage } from '../../features/nft/NftDetailPage';

export const Route = createFileRoute('/nft/$nftId')({
  component: function NftRoute() {
    return <NftDetailPage nftId={Route.useParams().nftId} />;
  },
});
