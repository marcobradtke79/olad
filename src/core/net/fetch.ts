import type { FetchConfig } from '../config/types';

/** `RequestInit` for one of the library's own `fetch` calls: credentials mode, headers, signal. */
export function fetchInit(config?: FetchConfig, signal?: AbortSignal): RequestInit {
  const init: RequestInit = {};
  if (config?.credentials) init.credentials = config.credentials;
  if (config?.headers) init.headers = { ...config.headers };
  if (signal) init.signal = signal;
  return init;
}

/** Fetch a text resource; a response that is not OK throws `<status> <statusText> for <url>`. */
export async function fetchText(
  url: string,
  config?: FetchConfig,
  signal?: AbortSignal,
): Promise<string> {
  const response = await fetch(url, fetchInit(config, signal));
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
  return response.text();
}

/**
 * `base` with `params` on its query string: parameters the base already carries are kept,
 * the same keys are replaced, `undefined` values are skipped. A relative base resolves
 * against the page.
 */
export function ogcUrl(
  base: string,
  params: Record<string, string | number | boolean | undefined>,
): string {
  const url = new URL(base, globalThis.location?.href ?? 'http://localhost/');
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url.toString();
}
