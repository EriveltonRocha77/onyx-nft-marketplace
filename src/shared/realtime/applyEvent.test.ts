import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { buildNfts } from '../../mocks/fixtures/nfts';
import { queryKeys } from '../api/queryKeys';
import type { Cart, Nft, NftListResponse, Order, RealtimeEvent } from '../api/schemas';
import { applyEvent } from './applyEvent';

const base = buildNfts()[0]!;
const bump = (n: Nft, version: number, price?: string): Nft => ({ ...n, version, editions: n.editions.map((e, i) => (i === 0 && price ? { ...e, priceEth: price } : e)) });
const nftEvent = (nft: Nft): RealtimeEvent => ({ id: `e${nft.version}`, type: 'nft.updated', resource: { kind: 'nft', id: nft.id }, version: nft.version, occurredAt: '', userId: null, payload: { nft } });

describe('applyEvent', () => {
  it('atualiza detalhe, lista e destaques com versão mais nova', () => {
    const qc = new QueryClient();
    const v2 = bump(base, base.version + 1, '7.000000000000000000');
    qc.setQueryData(queryKeys.nfts.detail(base.id), base);
    qc.setQueryData(queryKeys.nfts.list({ page: '1' }), { items: [base], page: 1, pageSize: 12, total: 1, totalPages: 1, facets: { collections: [], categories: [], priceRange: { minEth: '0', maxEth: '0' } } } satisfies NftListResponse);
    qc.setQueryData(queryKeys.nfts.featured(), [base]);
    applyEvent(qc, nftEvent(v2), null);
    expect(qc.getQueryData<Nft>(queryKeys.nfts.detail(base.id))?.version).toBe(v2.version);
    expect(qc.getQueryData<NftListResponse>(queryKeys.nfts.list({ page: '1' }))?.items[0]?.version).toBe(v2.version);
    expect(qc.getQueryData<Nft[]>(queryKeys.nfts.featured())?.[0]?.version).toBe(v2.version);
  });
  it('não regride um estado mais recente', () => {
    const qc = new QueryClient();
    const v5 = bump(base, base.version + 4);
    qc.setQueryData(queryKeys.nfts.detail(base.id), v5);
    applyEvent(qc, nftEvent(bump(base, base.version + 1, '1.000000000000000000')), null);
    expect(qc.getQueryData<Nft>(queryKeys.nfts.detail(base.id))?.version).toBe(v5.version);
  });
  it('não cria cache para NFT que ninguém abriu', () => {
    const qc = new QueryClient();
    applyEvent(qc, nftEvent(bump(base, base.version + 1)), null);
    expect(qc.getQueryData(queryKeys.nfts.detail(base.id))).toBeUndefined();
  });
  it('invalida só carrinhos que contêm o NFT', () => {
    const qc = new QueryClient();
    const cart = (nftId: string): Cart => ({ id: 'c', items: [{ id: 'i', nftId, editionId: 'e', quantity: 1, name: 'n', image: '/x', editionLabel: 'l', unitPriceEth: '1', lineTotalEth: '1', available: 3, nftVersion: 1 }], coupon: null, network: 'ethereum', summary: { subtotalEth: '1', discountEth: '0', networkFeeEth: '0', totalEth: '1' }, version: 1 });
    qc.setQueryData(queryKeys.user('u1').cart(), cart(base.id));
    qc.setQueryData(queryKeys.guest.cart('g'), cart('outro'));
    applyEvent(qc, nftEvent(bump(base, base.version + 1)), 'u1');
    expect(qc.getQueryState(queryKeys.user('u1').cart())?.isInvalidated).toBe(true);
    expect(qc.getQueryState(queryKeys.guest.cart('g'))?.isInvalidated).toBe(false);
  });
  it('pedido terminal em cache não é reaberto por evento', () => {
    const qc = new QueryClient();
    const confirmed = { id: 'o1', status: 'confirmed', version: 3 } as Order;
    qc.setQueryData(queryKeys.user('u1').order('o1'), confirmed);
    const ev: RealtimeEvent = { id: 'x', type: 'order.updated', resource: { kind: 'order', id: 'o1' }, version: 2, occurredAt: '', userId: 'u1', payload: { status: 'pending', declineReason: null } };
    applyEvent(qc, ev, 'u1');
    expect(qc.getQueryState(queryKeys.user('u1').order('o1'))?.isInvalidated).toBe(false);
    expect(qc.getQueryData<Order>(queryKeys.user('u1').order('o1'))?.status).toBe('confirmed');
  });
  it('pedido pendente é recarregado da API quando o evento chega', () => {
    const qc = new QueryClient();
    qc.setQueryData(queryKeys.user('u1').order('o1'), { id: 'o1', status: 'pending', version: 1 } as Order);
    applyEvent(qc, { id: 'y', type: 'order.updated', resource: { kind: 'order', id: 'o1' }, version: 2, occurredAt: '', userId: 'u1', payload: { status: 'confirmed', declineReason: null } }, 'u1');
    expect(qc.getQueryState(queryKeys.user('u1').order('o1'))?.isInvalidated).toBe(true);
  });
});
