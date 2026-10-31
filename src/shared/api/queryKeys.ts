export const queryKeys = {
  session: () => ['session'] as const,
  nfts: {
    all: () => ['nfts'] as const,
    list: (params: Record<string, string>) => ['nfts', 'list', params] as const,
    detail: (id: string) => ['nfts', 'detail', id] as const,
    featured: () => ['nfts', 'featured'] as const,
  },
  guest: {
    cart: (cartId: string) => ['guest', 'cart', cartId] as const,
  },
  user: (userId: string) => ({
    all: () => ['user', userId] as const,
    favorites: () => ['user', userId, 'favorites'] as const,
    cart: () => ['user', userId, 'cart'] as const,
    profile: () => ['user', userId, 'profile'] as const,
    wallets: () => ['user', userId, 'wallets'] as const,
    order: (id: string) => ['user', userId, 'order', id] as const,
  }),
};
