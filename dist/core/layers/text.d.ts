import { FeatureLike } from 'ol/Feature';
import { FlatStyleLike } from 'ol/style/flat';
import { default as Style, StyleFunction } from 'ol/style/Style';
import { ResolvedTextConfig } from '../config/types';
/** Texts smaller than this many pixels are not drawn; larger ones are capped. */
export declare const MIN_TEXT_PIXELS = 1;
export declare const MAX_TEXT_PIXELS = 2000;
/** A flat style (one, several, or rules) as a style function. */
export declare function flatStyleFunction(style: FlatStyleLike): StyleFunction;
/** The text of a feature drawn as text: a non-empty text property on a point geometry. */
export declare function featureText(feature: FeatureLike, text: ResolvedTextConfig): string | null;
/**
 * The style of one text: `value` at `pixels` font size, rotated by `rotation` degrees
 * counter-clockwise (the straightedge convention), left-aligned on its baseline at the point.
 */
export declare function textStyle(value: string, pixels: number, rotation: number, text: Pick<ResolvedTextConfig, 'color' | 'haloColor' | 'font'>): Style;
/**
 * The style function of a text layer: a point feature with a text is drawn as that text,
 * `heightProperty` metres high on the ground (converted to pixels at the point in the current
 * view projection) and rotated by `rotationProperty`; every other feature uses the layer's
 * flat style.
 */
export declare function textStyleFunction(text: ResolvedTextConfig, base: FlatStyleLike, getProjection: () => string): StyleFunction;
