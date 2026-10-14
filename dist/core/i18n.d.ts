/**
 * Translatable messages for validation errors. Codes are stable identifiers for hosts;
 * messages are for people. `en` and `de` ship with the library, hosts override single
 * codes through `config.messages`.
 */
export type Locale = 'en' | 'de';
export type MessageCode = 'geometry-type' | 'empty-geometry' | 'too-few-vertices' | 'ring-not-closed' | 'zero-length-segment' | 'self-intersection' | 'layer-unknown' | 'not-editable' | 'feature-without-id' | 'feature-not-in-layer' | 'input-invalid' | 'input-no-tool' | 'input-no-reference' | 'input-not-accepted';
export declare const MESSAGES: Record<Locale, Record<MessageCode, string>>;
export declare const LOCALES: readonly Locale[];
/** Message for `code` in `locale`, host `overrides` first, `{param}` placeholders filled in. */
export declare function formatMessage(locale: Locale, overrides: Record<string, string>, code: MessageCode | string, params?: Record<string, string | number>): string;
