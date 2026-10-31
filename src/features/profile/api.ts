import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, parse } from '../../shared/api/client';
import { toApiError, type ApiError } from '../../shared/api/errors';
import { queryKeys } from '../../shared/api/queryKeys';
import { profileSchema, type Profile, type Session } from '../../shared/api/schemas';
import { useSession } from '../auth/api';

export const AVATAR_MAX_BYTES = 1024 * 1024;
export const AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export function validateAvatar(file: File): string | null {
  if (!AVATAR_TYPES.includes(file.type)) return 'Use uma imagem PNG, JPEG ou WebP.';
  if (file.size > AVATAR_MAX_BYTES) return 'A imagem deve ter no máximo 1 MB.';
  return null;
}

export function useProfile() {
  const { user } = useSession();
  return useQuery({
    queryKey: queryKeys.user(user?.id ?? 'anon').profile(),
    queryFn: async ({ signal }) => parse(profileSchema, (await api.get('/profile', { signal })).data),
    enabled: Boolean(user),
  });
}

function useProfileMutation<V>(call: (v: V) => Promise<unknown>) {
  const qc = useQueryClient();
  const { user } = useSession();
  return useMutation<Profile, ApiError, V>({
    mutationFn: async (v) => {
      try { return parse(profileSchema, await call(v)); } catch (e) { throw toApiError(e); }
    },
    onSuccess: (profile) => {
      if (!user) return;
      qc.setQueryData(queryKeys.user(user.id).profile(), profile);
      qc.setQueryData<Session>(queryKeys.session(), (old) => old && { ...old, user: { ...old.user, name: profile.name, displayName: profile.displayName, avatarUrl: profile.avatarUrl } });
    },
  });
}

export interface ProfileInput { name: string; displayName: string; bio: string }
export const useUpdateProfile = () => useProfileMutation<ProfileInput>(async (v) => (await api.patch('/profile', v)).data);
export const useUploadAvatar = () => useProfileMutation<File>(async (file) => {
  const body = new FormData();
  body.append('file', file);
  return (await api.put('/profile/avatar', body)).data;
});
export const useRemoveAvatar = () => useProfileMutation<void>(async () => (await api.delete('/profile/avatar')).data);

export function useChangePassword() {
  return useMutation<void, ApiError, { currentPassword: string; newPassword: string }>({
    mutationFn: async (v) => {
      try { await api.put('/profile/password', v); } catch (e) { throw toApiError(e); }
    },
  });
}
