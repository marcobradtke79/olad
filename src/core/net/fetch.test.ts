import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchInit, fetchText, ogcUrl } from './fetch';

afterEach(() => vi.unstubAllGlobals());

describe('ogcUrl', () => {
  it('keeps existing parameters, replaces the same keys and skips undefined', () => {
    const url = new URL(
      ogcUrl('https://example.org/wfs?fail=1&service=X', {
        service: 'WFS',
        bbox: undefined,
        count: 20,
      }),
    );
    expect(url.searchParams.get('fail')).toBe('1');
    expect(url.searchParams.get('service')).toBe('WFS');
    expect(url.searchParams.get('count')).toBe('20');
    expect(url.searchParams.has('bbox')).toBe(false);
  });

  it('resolves a relative base against the page', () => {
    expect(ogcUrl('/wfs', { a: true })).toMatch(/^http:\/\/localhost\/wfs\?a=true$/);
  });
});

describe('fetchInit / fetchText', () => {
  it('passes credentials, headers and the signal', () => {
    const controller = new AbortController();
    expect(fetchInit(undefined)).toEqual({});
    expect(
      fetchInit(
        { credentials: 'include', headers: { Authorization: 'Bearer x' } },
        controller.signal,
      ),
    ).toEqual({
      credentials: 'include',
      headers: { Authorization: 'Bearer x' },
      signal: controller.signal,
    });
  });

  it('returns the text of an OK response and throws for others', async () => {
    const fetch = vi.fn(async (url: string) =>
      url.endsWith('ok')
        ? { ok: true, status: 200, statusText: 'OK', text: async () => 'body' }
        : { ok: false, status: 503, statusText: 'Unavailable', text: async () => '' },
    );
    vi.stubGlobal('fetch', fetch);
    await expect(fetchText('https://x/ok', { credentials: 'omit' })).resolves.toBe('body');
    expect(fetch).toHaveBeenCalledWith('https://x/ok', { credentials: 'omit' });
    await expect(fetchText('https://x/down')).rejects.toThrow('503 Unavailable for https://x/down');
  });
});
