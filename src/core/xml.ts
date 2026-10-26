import { parse } from 'ol/xml';

/**
 * XML helpers for the readers of server documents (capabilities, schemas) and imported files.
 * Elements are matched by `localName`, never by prefix, so any namespace prefix works.
 */

/** Parse an XML document; throws for text that is not well-formed XML. */
export function parseXml(text: string): Document {
  const doc = parse(text);
  if (!doc.documentElement || doc.getElementsByTagName('parsererror').length > 0) {
    throw new Error('not valid XML');
  }
  return doc;
}

/** The child elements of `parent` named `name`. */
export function children(parent: Element, name: string): Element[] {
  return Array.from(parent.children).filter((c) => c.localName === name);
}

/** The first child element of `parent` named `name`. */
export function firstChild(parent: Element, name: string): Element | undefined {
  return children(parent, name)[0];
}

/** The first child element at the end of a path of local names. */
export function childAt(parent: Element, ...path: string[]): Element | undefined {
  let el: Element | undefined = parent;
  for (const name of path) {
    el = el && firstChild(el, name);
    if (!el) return undefined;
  }
  return el;
}

/** The trimmed text of the child `name`, or `undefined` when it is missing or empty. */
export function textOf(parent: Element, name: string): string | undefined {
  const text = firstChild(parent, name)?.textContent?.trim();
  return text ? text : undefined;
}

/** The descendants of `parent` named `name`, in document order. */
export function descendants(parent: Element, name: string): Element[] {
  return Array.from(parent.getElementsByTagName('*')).filter((e) => e.localName === name);
}

/** The local part of a qualified name (`gml:PointPropertyType` → `PointPropertyType`). */
export function localPart(qname: string): string {
  const colon = qname.indexOf(':');
  return colon < 0 ? qname : qname.slice(colon + 1);
}

/** An `xlink:href` attribute, read by namespace or by its prefixed name. */
export function xlinkHref(el: Element): string | undefined {
  return (
    el.getAttributeNS('http://www.w3.org/1999/xlink', 'href') ??
    el.getAttribute('xlink:href') ??
    undefined
  );
}
