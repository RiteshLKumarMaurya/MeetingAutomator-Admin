const CDN_BASE =
  process.env.NEXT_PUBLIC_CDN_URL ?? 'https://media.meetingautomator.com';

export interface MediaResponse {
  publicId: string;

  originalKey: string;
  optimizedKey: string;
  thumbKey: string;

  width: number;
  height: number;

  // Future
  // bannerKey?: string;
  // webpKey?: string;
  // avifKey?: string;
  // mobileKey?: string;
  // desktopKey?: string;
}

const PLACEHOLDER = '/images/placeholder.webp';

export function getCdnUrl(key?: string | null): string {
  if (!key) return PLACEHOLDER;

  if (/^https?:\/\//i.test(key)) {
    return key;
  }

  const normalizedKey = key.replace(/^\/+/, '');
  return `${CDN_BASE.replace(/\/$/, '')}/${normalizedKey}`;
}

type MediaKey = Extract<keyof MediaResponse, `${string}Key`>;

interface GetMediaOptions {
  /**
   * Which key should be used.
   *
   * Example:
   * "thumbKey"
   * "optimizedKey"
   * "originalKey"
   */
  key?: MediaKey;

  /**
   * Automatic fallback order.
   */
  fallback?: MediaKey[];

  /**
   * Override placeholder.
   */
  placeholder?: string;
}

export function getMediaUrl(
  media: Partial<MediaResponse> | null | undefined,
  options: GetMediaOptions = {}
): string {
  const {
    key = 'optimizedKey',
    fallback = ['optimizedKey', 'originalKey', 'thumbKey'],
    placeholder = PLACEHOLDER,
  } = options;

  if (!media) return placeholder;

  // Preferred key
  const preferred = media[key];

  if (typeof preferred === 'string' && preferred.length) {
    return getCdnUrl(preferred);
  }

  // Fallback keys
  for (const k of fallback) {
    const value = media[k];

    if (typeof value === 'string' && value.length) {
      return getCdnUrl(value);
    }
  }

  return placeholder;
}