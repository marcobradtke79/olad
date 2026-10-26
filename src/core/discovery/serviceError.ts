import { children, descendants, textOf } from '../xml';

/**
 * The message of an OGC exception document (`ows:ExceptionReport`, WMS `ServiceExceptionReport`),
 * or `undefined` when `root` is none.
 */
export function serviceException(root: Element): string | undefined {
  if (!/Exception(Report)?$/.test(root.localName)) return undefined;
  const texts = [
    ...descendants(root, 'ExceptionText').map((e) => e.textContent?.trim() ?? ''),
    ...children(root, 'ServiceException').map((e) => e.textContent?.trim() ?? ''),
  ].filter(Boolean);
  return texts.join('; ') || textOf(root, 'Exception') || 'the service answered with an exception';
}
