/**
 * Translatable messages for validation errors. Codes are stable identifiers for hosts;
 * messages are for people. `en` and `de` ship with the library, hosts override single
 * codes through `config.messages`.
 */

export type Locale = 'en' | 'de';

export type MessageCode =
  | 'geometry-type'
  | 'empty-geometry'
  | 'too-few-vertices'
  | 'ring-not-closed'
  | 'zero-length-segment'
  | 'self-intersection'
  | 'layer-unknown'
  | 'not-editable'
  | 'feature-without-id'
  | 'feature-not-in-layer'
  | 'input-invalid'
  | 'input-no-tool'
  | 'input-no-reference'
  | 'input-not-accepted'
  | 'dimension-type'
  | 'dimension-points'
  | 'dimension-value';

export const MESSAGES: Record<Locale, Record<MessageCode, string>> = {
  en: {
    'geometry-type': 'Expected a {expected} geometry, got {actual}.',
    'empty-geometry': 'The geometry is empty.',
    'too-few-vertices': 'At least {minimum} vertices are required, got {actual}.',
    'ring-not-closed': 'The ring is not closed.',
    'zero-length-segment': 'Segment {segment} has zero length.',
    'self-intersection': 'The ring intersects itself (segments {segment} and {other}).',
    'layer-unknown': 'Unknown layer "{layer}".',
    'not-editable': 'Layer "{layer}" does not allow {operation}.',
    'feature-without-id': 'The feature has no id and cannot be updated or deleted.',
    'feature-not-in-layer': 'The feature does not belong to an editor layer.',
    'input-invalid':
      'Not a coordinate or length: use x,y · @dx,dy · @distance<angle · distance; lengths may carry a unit (5 ft, 2.5 m).',
    'input-no-tool': 'No tool takes input: switch on edit mode and start drawing.',
    'input-no-reference': 'No previous point: type an absolute x,y first.',
    'input-not-accepted': 'The active tool did not accept the input.',
    'dimension-type': 'Unknown dimension type "{type}".',
    'dimension-points': 'A dimension needs {expected} distinct points, got {actual}.',
    'dimension-value': 'The dimension property "{property}" is invalid.',
  },
  de: {
    'geometry-type': 'Erwartet wurde eine {expected}-Geometrie, erhalten {actual}.',
    'empty-geometry': 'Die Geometrie ist leer.',
    'too-few-vertices': 'Mindestens {minimum} Stützpunkte sind nötig, erhalten {actual}.',
    'ring-not-closed': 'Der Ring ist nicht geschlossen.',
    'zero-length-segment': 'Segment {segment} hat die Länge null.',
    'self-intersection': 'Der Ring schneidet sich selbst (Segmente {segment} und {other}).',
    'layer-unknown': 'Unbekannter Layer "{layer}".',
    'not-editable': 'Layer "{layer}" erlaubt {operation} nicht.',
    'feature-without-id': 'Das Objekt hat keine Id und kann nicht geändert oder gelöscht werden.',
    'feature-not-in-layer': 'Das Objekt gehört zu keinem Editor-Layer.',
    'input-invalid':
      'Keine Koordinate oder Länge: x,y · @dx,dy · @Abstand<Winkel · Abstand; Längen auch mit Einheit (5 ft, 2.5 m).',
    'input-no-tool': 'Kein Werkzeug nimmt Eingaben an: Bearbeitungsmodus einschalten und zeichnen.',
    'input-no-reference': 'Kein vorheriger Punkt: zuerst ein absolutes x,y eingeben.',
    'input-not-accepted': 'Das aktive Werkzeug hat die Eingabe nicht übernommen.',
    'dimension-type': 'Unbekannter Bemaßungstyp "{type}".',
    'dimension-points': 'Eine Bemaßung braucht {expected} verschiedene Punkte, erhalten {actual}.',
    'dimension-value': 'Die Bemaßungseigenschaft "{property}" ist ungültig.',
  },
};

export const LOCALES: readonly Locale[] = ['en', 'de'];

/** Message for `code` in `locale`, host `overrides` first, `{param}` placeholders filled in. */
export function formatMessage(
  locale: Locale,
  overrides: Record<string, string>,
  code: MessageCode | string,
  params: Record<string, string | number> = {},
): string {
  const template =
    overrides[code] ??
    MESSAGES[locale][code as MessageCode] ??
    MESSAGES.en[code as MessageCode] ??
    code;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in params ? String(params[key]) : match,
  );
}
