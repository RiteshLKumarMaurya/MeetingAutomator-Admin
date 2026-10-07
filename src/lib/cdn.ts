const MEDIA_BASE =
  process.env.NEXT_PUBLIC_MEDIA_BASE_URL ?? 'https://media.meetingautomator.com';

export interface MediaResponse {
  publicId: string;
  objectKey?: string | null;
  url?: string | null;
  width?: number | null;
  height?: number | null;
}

const PLACEHOLDER = '/images/placeholder.webp';

export function getCdnUrl(key?: string | null): string {
  if (!key) return PLACEHOLDER;
  if (/^https?:\/\//i.test(key)) return key;
  const normalizedKey = key.replace(/^\/+/, '');
  return `${MEDIA_BASE.replace(/\/$/, '')}/${normalizedKey}`;
}

export function getMediaUrl(media: Partial<MediaResponse> | null | undefined): string {
  if (!media) return PLACEHOLDER;
  return media.url || getCdnUrl(media.objectKey);
}
