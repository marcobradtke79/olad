import e from "ol/Feature";
import { equivalent as t, get as n, getPointResolution as r, transform as i } from "ol/proj";
import a from "ol/geom/GeometryCollection";
import o from "ol/geom/LineString";
import s from "ol/geom/MultiLineString";
import c from "ol/geom/MultiPoint";
import l from "ol/geom/MultiPolygon";
import u from "ol/geom/Point";
import d from "ol/geom/Polygon";
import f from "ol/format/GeoJSON";
import p from "ol/layer/Vector";
import ee from "ol/source/Vector";
import te from "ol/style/Stroke";
import m from "ol/style/Style";
import ne from "ol/format/TopoJSON";
import re from "ol/format/GML2";
import ie from "ol/format/GML3";
import ae from "ol/format/GML32";
import oe from "ol/format/GPX";
import se from "ol/format/KML";
import h from "ol/style/Fill";
import ce from "ol/style/Text";
import { getArea as le, getDistance as ue, offset as de } from "ol/sphere";
import fe from "ol/interaction/Draw";
import { parse as pe } from "ol/xml";
import { boundingExtent as me } from "ol/extent";
//#region src/core/units.ts
var g = [
	{
		id: "m",
		metres: 1,
		symbol: "m",
		label: "Metres",
		system: "metric",
		aliases: [
			"meter",
			"meters",
			"metre",
			"metres"
		]
	},
	{
		id: "km",
		metres: 1e3,
		symbol: "km",
		label: "Kilometres",
		system: "metric",
		aliases: [
			"kilometer",
			"kilometers",
			"kilometre",
			"kilometres"
		]
	},
	{
		id: "cm",
		metres: .01,
		symbol: "cm",
		label: "Centimetres",
		system: "metric",
		aliases: [
			"centimeter",
			"centimeters",
			"centimetre",
			"centimetres"
		]
	},
	{
		id: "mm",
		metres: .001,
		symbol: "mm",
		label: "Millimetres",
		system: "metric",
		aliases: [
			"millimeter",
			"millimeters",
			"millimetre",
			"millimetres"
		]
	},
	{
		id: "ft",
		metres: .3048,
		symbol: "ft",
		label: "Feet",
		system: "imperial",
		aliases: [
			"foot",
			"feet",
			"'"
		]
	},
	{
		id: "us-ft",
		metres: 1200 / 3937,
		symbol: "US ft",
		label: "US survey feet",
		system: "imperial",
		aliases: [
			"usft",
			"ftus",
			"us ft",
			"survey ft",
			"survey feet"
		]
	},
	{
		id: "in",
		metres: .0254,
		symbol: "in",
		label: "Inches",
		system: "imperial",
		aliases: [
			"inch",
			"inches",
			"\""
		]
	},
	{
		id: "yd",
		metres: .9144,
		symbol: "yd",
		label: "Yards",
		system: "imperial",
		aliases: ["yard", "yards"]
	},
	{
		id: "mi",
		metres: 1609.344,
		symbol: "mi",
		label: "Miles",
		system: "imperial",
		aliases: ["mile", "miles"]
	},
	{
		id: "nmi",
		metres: 1852,
		symbol: "nmi",
		label: "Nautical miles",
		system: "imperial",
		aliases: [
			"nm",
			"nautical mile",
			"nautical miles"
		]
	}
], he = new Map(g.map((e) => [e.id, e])), _ = /* @__PURE__ */ new Map();
for (let e of g) for (let t of [
	e.id,
	e.symbol.toLowerCase(),
	...e.aliases
]) _.set(t, e.id);
function ge(e) {
	return typeof e == "string" && he.has(e);
}
function v(e) {
	return he.get(e);
}
function _e(e) {
	return _.get(e.trim().toLowerCase().replace(/\s+/g, " ")) ?? null;
}
function ve() {
	return [..._.keys()].sort((e, t) => t.length - e.length);
}
function ye(e) {
	let t = n(e)?.getUnits();
	return t === "ft" || t === "us-ft" ? t : "m";
}
function be(e, t) {
	return e * v(t).metres;
}
function xe(e, t) {
	return e / v(t).metres;
}
var y = (e, t) => e.toFixed(t);
function Se(e, t = "m") {
	let n = v(t);
	if (t === "m" && e >= 1e3) return `${y(e / 1e3, 3)} km`;
	if ((t === "ft" || t === "us-ft") && e >= 1609.344) return `${y(e / 1609.344, 3)} mi`;
	let r = t === "mm" ? 1 : t === "km" || t === "mi" || t === "nmi" ? 3 : 2;
	return `${y(xe(e, t), r)} ${n.symbol}`;
}
function Ce(e, t = "m") {
	if (v(t).system === "metric") return e >= 1e6 ? `${y(e / 1e6, 3)} km²` : e >= 1e4 ? `${y(e / 1e4, 2)} ha` : `${y(e, 1)} m²`;
	let n = 4046.8564224;
	if (e >= 640 * n) return `${y(e / (640 * n), 3)} mi²`;
	if (e >= n) return `${y(e / n, 2)} ac`;
	let r = t === "us-ft" ? "us-ft" : "ft";
	return `${y(e / v(r).metres ** 2, 1)} ${r === "us-ft" ? "US ft²" : "ft²"}`;
}
//#endregion
//#region src/core/config/validate.ts
var b = class extends Error {
	path;
	constructor(e, t) {
		super(`Invalid config at ${e}: ${t}`), this.name = "ConfigError", this.path = e;
	}
}, x = (e) => typeof e == "object" && !!e && !Array.isArray(e), we = (e, t) => Array.isArray(e) && e.length === t && e.every((e) => typeof e == "number" && Number.isFinite(e));
function S(e, t, n) {
	for (let r of Object.keys(e)) if (!n.includes(r)) throw new b(`${t}.${r}`, `unknown option. Allowed: ${n.join(", ")}`);
}
function C(e) {
	return (t, n) => {
		t !== void 0 && e(t, n);
	};
}
var w = (e, t) => {
	if (typeof e != "string" || e.length === 0) throw new b(t, "expected a non-empty string");
}, T = (e, t) => {
	if (typeof e != "number" || !Number.isFinite(e)) throw new b(t, "expected a finite number");
}, E = (e, t) => {
	if (typeof e != "boolean") throw new b(t, "expected a boolean");
}, Te = (e, t) => {
	if (typeof e != "function") throw new b(t, "expected a function");
}, D = (e, t) => {
	if (!x(e)) throw new b(t, "expected an object");
}, O = (e) => (t, n) => {
	if (!e.includes(t)) throw new b(n, `expected one of ${e.join(", ")}`);
}, k = (e) => (t, n) => {
	if (!Array.isArray(t)) throw new b(n, "expected an array");
	t.forEach((t, r) => e(t, `${n}[${r}]`));
}, Ee = (e, t) => {
	if (e !== null && typeof e != "string") throw new b(t, "expected a string or null");
}, A = (e, t) => {
	if (!x(e) && !(Array.isArray(e) && e.every(x))) throw new b(t, "expected a flat style object or an array of them");
};
function j(e) {
	return (t, r) => {
		if (w(t, r), !e.declaredProjections.has(t) && !n(t)) throw new b(r, `unknown projection "${t}". Declare it under "projections" or use EPSG:3857 / EPSG:4326`);
	};
}
var De = [
	"projection",
	"center",
	"zoom",
	"minZoom",
	"maxZoom",
	"rotation",
	"extent"
];
function Oe(e, t, n) {
	D(e, t);
	let r = e;
	if (S(r, t, De), C(j(n))(r.projection, `${t}.projection`), r.center !== void 0 && !we(r.center, 2)) throw new b(`${t}.center`, "expected [x, y]");
	if (r.extent !== void 0 && !we(r.extent, 4)) throw new b(`${t}.extent`, "expected [minX, minY, maxX, maxY]");
	if (C(T)(r.zoom, `${t}.zoom`), C(T)(r.minZoom, `${t}.minZoom`), C(T)(r.maxZoom, `${t}.maxZoom`), C(T)(r.rotation, `${t}.rotation`), typeof r.minZoom == "number" && typeof r.maxZoom == "number" && r.minZoom > r.maxZoom) throw new b(`${t}.minZoom`, "must not be greater than maxZoom");
}
var ke = [
	"code",
	"def",
	"title"
];
function Ae(e, t) {
	D(e, t);
	let n = e;
	S(n, t, ke), w(n.code, `${t}.code`), w(n.def, `${t}.def`), n.title !== void 0 && w(n.title, `${t}.title`);
}
var M = [
	"id",
	"type",
	"title",
	"visible",
	"attribution"
], je = {
	osm: [...M, "maxZoom"],
	xyz: [
		...M,
		"url",
		"minZoom",
		"maxZoom",
		"tileSize",
		"crossOrigin"
	],
	wms: [
		...M,
		"url",
		"params",
		"tiled",
		"serverType",
		"projection",
		"crossOrigin"
	],
	wmts: [
		...M,
		"capabilitiesUrl",
		"layer",
		"matrixSet",
		"format",
		"style",
		"crossOrigin"
	],
	"vector-tile": [
		...M,
		"url",
		"format",
		"minZoom",
		"maxZoom",
		"projection",
		"style"
	],
	geotiff: [
		...M,
		"sources",
		"normalize",
		"convertToRGB"
	]
}, Me = [
	"url",
	"bands",
	"min",
	"max",
	"nodata"
];
function Ne(e, t) {
	D(e, t);
	let n = e;
	S(n, t, Me), w(n.url, `${t}.url`), C(k(T))(n.bands, `${t}.bands`), C(T)(n.min, `${t}.min`), C(T)(n.max, `${t}.max`), C(T)(n.nodata, `${t}.nodata`);
}
function Pe(e, t, n) {
	D(e, t);
	let r = e;
	w(r.id, `${t}.id`);
	let i = r.type, a = typeof i == "string" ? je[i] : void 0;
	if (!a) throw new b(`${t}.type`, `expected one of ${Object.keys(je).join(", ")}`);
	switch (S(r, t, a), C(w)(r.title, `${t}.title`), C(E)(r.visible, `${t}.visible`), C(w)(r.attribution, `${t}.attribution`), C(T)(r.minZoom, `${t}.minZoom`), C(T)(r.maxZoom, `${t}.maxZoom`), C(Ee)(r.crossOrigin, `${t}.crossOrigin`), C(j(n))(r.projection, `${t}.projection`), i) {
		case "xyz":
			w(r.url, `${t}.url`), C(T)(r.tileSize, `${t}.tileSize`);
			break;
		case "wms": {
			w(r.url, `${t}.url`), D(r.params, `${t}.params`);
			let e = r.params;
			for (let [n, r] of Object.entries(e)) if (![
				"string",
				"number",
				"boolean"
			].includes(typeof r)) throw new b(`${t}.params.${n}`, "expected a string, number or boolean");
			if (!Object.keys(e).some((e) => e.toUpperCase() === "LAYERS")) throw new b(`${t}.params`, "LAYERS is required");
			C(E)(r.tiled, `${t}.tiled`), C(O([
				"mapserver",
				"geoserver",
				"qgis",
				"carmentaserver"
			]))(r.serverType, `${t}.serverType`);
			break;
		}
		case "wmts":
			w(r.capabilitiesUrl, `${t}.capabilitiesUrl`), w(r.layer, `${t}.layer`), C(w)(r.matrixSet, `${t}.matrixSet`), C(w)(r.format, `${t}.format`), C(w)(r.style, `${t}.style`);
			break;
		case "vector-tile":
			w(r.url, `${t}.url`), C(O([
				"mvt",
				"geojson",
				"topojson"
			]))(r.format, `${t}.format`), C(A)(r.style, `${t}.style`);
			break;
		case "geotiff":
			if (k(Ne)(r.sources, `${t}.sources`), r.sources.length === 0) throw new b(`${t}.sources`, "at least one source is required");
			if (C(E)(r.normalize, `${t}.normalize`), r.convertToRGB !== void 0 && typeof r.convertToRGB != "boolean" && r.convertToRGB !== "auto") throw new b(`${t}.convertToRGB`, "expected a boolean or 'auto'");
	}
}
var Fe = [
	"Point",
	"LineString",
	"Polygon",
	"MultiPoint",
	"MultiLineString",
	"MultiPolygon",
	"Any"
], Ie = [
	"geojson",
	"topojson",
	"kml",
	"gpx",
	"wkt",
	"gml",
	"wfs"
], Le = [
	"format",
	"url",
	"data",
	"features",
	"loader",
	"dataProjection",
	"strategy",
	"gmlVersion",
	"typeName",
	"version",
	"outputFormat"
], Re = [
	"insert",
	"update",
	"delete",
	"predicate"
], ze = [
	"string",
	"number",
	"integer",
	"boolean",
	"enum",
	"date"
], Be = [
	"name",
	"type",
	"label",
	"required",
	"readOnly",
	"default",
	"values",
	"min",
	"max",
	"pattern"
], Ve = ["fields"], He = [
	"id",
	"title",
	"visible",
	"source",
	"geometryType",
	"idProperty",
	"editable",
	"snappable",
	"style",
	"schema",
	"minZoom",
	"maxZoom",
	"text"
], Ue = [
	"property",
	"heightProperty",
	"rotationProperty",
	"height",
	"color",
	"haloColor",
	"font"
], We = [
	"Point",
	"MultiPoint",
	"Any"
];
function Ge(e, t) {
	if (typeof e == "boolean") return;
	D(e, t);
	let n = e;
	S(n, t, Ue);
	for (let e of [
		"property",
		"heightProperty",
		"rotationProperty",
		"color",
		"haloColor",
		"font"
	]) C(w)(n[e], `${t}.${e}`);
	if (n.height !== void 0 && (T(n.height, `${t}.height`), !(n.height > 0))) throw new b(`${t}.height`, "must be greater than 0");
}
function Ke(e, t, n) {
	D(e, t);
	let r = e;
	if (S(r, t, Le), C(O(Ie))(r.format, `${t}.format`), [
		"url",
		"data",
		"features",
		"loader"
	].filter((e) => r[e] !== void 0).length !== 1) throw new b(t, "exactly one of url, data, features or loader is required");
	if (r.format === void 0 && r.features === void 0) throw new b(`${t}.format`, "required unless \"features\" is given");
	if (r.features !== void 0 && r.format !== void 0 && r.format !== "geojson") throw new b(`${t}.format`, "\"features\" are GeoJSON; format must be geojson or omitted");
	if (C(w)(r.url, `${t}.url`), r.data !== void 0 && typeof r.data != "string" && !x(r.data)) throw new b(`${t}.data`, "expected a string or an object");
	if (C(k(D))(r.features, `${t}.features`), C(Te)(r.loader, `${t}.loader`), C(j(n))(r.dataProjection, `${t}.dataProjection`), C(O(["all", "bbox"]))(r.strategy, `${t}.strategy`), C(O([
		"2",
		"3",
		"3.2"
	]))(r.gmlVersion, `${t}.gmlVersion`), C(w)(r.typeName, `${t}.typeName`), C(O([
		"1.0.0",
		"1.1.0",
		"2.0.0"
	]))(r.version, `${t}.version`), C(w)(r.outputFormat, `${t}.outputFormat`), r.format === "wfs") {
		if (r.url === void 0 && r.loader === void 0) throw new b(`${t}.url`, "required for format wfs");
		w(r.typeName, `${t}.typeName`);
	}
}
function qe(e, t) {
	if (typeof e == "boolean") return;
	D(e, t);
	let n = e;
	S(n, t, Re), C(E)(n.insert, `${t}.insert`), C(E)(n.update, `${t}.update`), C(E)(n.delete, `${t}.delete`), C(Te)(n.predicate, `${t}.predicate`);
}
function Je(e, t, n) {
	D(e, t);
	let r = e;
	if (S(r, t, Be), w(r.name, `${t}.name`), n.has(r.name)) throw new b(`${t}.name`, `duplicate field "${r.name}"`);
	if (n.add(r.name), O(ze)(r.type, `${t}.type`), C(w)(r.label, `${t}.label`), C(E)(r.required, `${t}.required`), C(E)(r.readOnly, `${t}.readOnly`), r.default !== void 0 && r.default !== null && ![
		"string",
		"number",
		"boolean"
	].includes(typeof r.default)) throw new b(`${t}.default`, "expected a string, number, boolean or null");
	if (r.type === "enum") {
		if (!Array.isArray(r.values) || r.values.length === 0) throw new b(`${t}.values`, "required for type enum");
		r.values.forEach((e, n) => {
			if (typeof e != "string" && typeof e != "number") throw new b(`${t}.values[${n}]`, "expected a string or number");
		});
	} else if (r.values !== void 0) throw new b(`${t}.values`, "only allowed for type enum");
	if (C(T)(r.min, `${t}.min`), C(T)(r.max, `${t}.max`), typeof r.min == "number" && typeof r.max == "number" && r.min > r.max) throw new b(`${t}.min`, "must not be greater than max");
	if (r.pattern !== void 0) {
		w(r.pattern, `${t}.pattern`);
		try {
			new RegExp(r.pattern);
		} catch {
			throw new b(`${t}.pattern`, "not a valid regular expression");
		}
	}
}
function Ye(e, t) {
	D(e, t);
	let n = e;
	if (S(n, t, Ve), !Array.isArray(n.fields)) throw new b(`${t}.fields`, "expected an array");
	let r = /* @__PURE__ */ new Set();
	n.fields.forEach((e, n) => Je(e, `${t}.fields[${n}]`, r));
}
function Xe(e, t, n) {
	D(e, t);
	let r = e;
	if (S(r, t, He), w(r.id, `${t}.id`), C(w)(r.title, `${t}.title`), C(E)(r.visible, `${t}.visible`), Ke(r.source, `${t}.source`, n), O(Fe)(r.geometryType, `${t}.geometryType`), C(w)(r.idProperty, `${t}.idProperty`), C(qe)(r.editable, `${t}.editable`), C(E)(r.snappable, `${t}.snappable`), C(A)(r.style, `${t}.style`), C(Ye)(r.schema, `${t}.schema`), C(T)(r.minZoom, `${t}.minZoom`), C(T)(r.maxZoom, `${t}.maxZoom`), C(Ge)(r.text, `${t}.text`), r.text !== void 0 && r.text !== !1 && !We.includes(r.geometryType)) throw new b(`${t}.text`, "needs geometryType Point, MultiPoint or Any");
}
var Ze = [
	"target",
	"map",
	"view",
	"projections",
	"proj4",
	"basemaps",
	"layers",
	"editMode",
	"cursor",
	"changes",
	"locale",
	"messages",
	"selection",
	"layerHighlight",
	"snapping",
	"grid",
	"curves",
	"units",
	"constraints",
	"draft"
], Qe = [
	"enabled",
	"tolerancePx",
	"modes"
], $e = [
	"vertex",
	"midpoint",
	"perpendicular",
	"tangent"
];
function et(e, t) {
	D(e, t);
	let n = e;
	if (S(n, t, Qe), n.enabled !== void 0 && E(n.enabled, `${t}.enabled`), n.tolerancePx !== void 0 && (T(n.tolerancePx, `${t}.tolerancePx`), n.tolerancePx <= 0)) throw new b(`${t}.tolerancePx`, "expected a positive number");
	if (n.modes !== void 0 && (k(O([...$e]))(n.modes, `${t}.modes`), n.modes.length === 0)) throw new b(`${t}.modes`, "expected at least one snap mode");
}
var tt = [
	"enabled",
	"spacing",
	"origin",
	"visible"
];
function nt(e, t) {
	D(e, t);
	let n = e;
	if (S(n, t, tt), n.enabled !== void 0 && E(n.enabled, `${t}.enabled`), n.visible !== void 0 && E(n.visible, `${t}.visible`), n.spacing !== void 0 && (T(n.spacing, `${t}.spacing`), n.spacing <= 0)) throw new b(`${t}.spacing`, "expected a positive number");
	if (n.origin !== void 0 && (k(T)(n.origin, `${t}.origin`), n.origin.length !== 2)) throw new b(`${t}.origin`, "expected [x, y]");
}
var rt = ["tolerance"], it = ["length"];
function at(e, t) {
	D(e, t);
	let n = e;
	if (S(n, t, it), n.length !== void 0 && n.length !== "auto" && !ge(n.length)) throw new b(`${t}.length`, `expected "auto" or one of ${g.map((e) => e.id).join(", ")}`);
}
function ot(e, t) {
	D(e, t);
	let n = e;
	if (S(n, t, rt), n.tolerance !== void 0 && (T(n.tolerance, `${t}.tolerance`), n.tolerance <= 0)) throw new b(`${t}.tolerance`, "expected a positive number");
}
var st = [
	"enabled",
	"id",
	"title",
	"style"
];
function ct(e, t, n) {
	D(e, t);
	let r = e;
	if (S(r, t, st), r.enabled !== void 0 && E(r.enabled, `${t}.enabled`), r.id !== void 0 && (w(r.id, `${t}.id`), n.includes(r.id))) throw new b(`${t}.id`, `collides with the layer id "${String(r.id)}"`);
	r.title !== void 0 && w(r.title, `${t}.title`), r.style !== void 0 && A(r.style, `${t}.style`);
}
var lt = ["angle"], ut = ["enabled", "step"];
function dt(e, t) {
	D(e, t);
	let n = e;
	if (S(n, t, lt), n.angle === void 0) return;
	let r = `${t}.angle`;
	D(n.angle, r);
	let i = n.angle;
	if (S(i, r, ut), i.enabled !== void 0 && E(i.enabled, `${r}.enabled`), i.step !== void 0 && (T(i.step, `${r}.step`), i.step <= 0 || i.step > 360)) throw new b(`${r}.step`, "expected a number in (0, 360]");
}
var ft = [
	"strokeColor",
	"strokeWidth",
	"fillColor",
	"pointRadius",
	"haloColor",
	"haloWidth",
	"vertexSize",
	"inspect"
];
function pt(e, t) {
	D(e, t);
	let n = e;
	S(n, t, ft), n.strokeColor !== void 0 && w(n.strokeColor, `${t}.strokeColor`), n.fillColor !== void 0 && w(n.fillColor, `${t}.fillColor`), n.haloColor !== void 0 && w(n.haloColor, `${t}.haloColor`), n.inspect !== void 0 && E(n.inspect, `${t}.inspect`);
	for (let e of [
		"strokeWidth",
		"pointRadius",
		"haloWidth",
		"vertexSize"
	]) if (n[e] !== void 0 && (T(n[e], `${t}.${e}`), n[e] < 0)) throw new b(`${t}.${e}`, "expected a non-negative number");
}
var mt = [
	"strokeColor",
	"strokeWidth",
	"fillColor",
	"pointRadius"
];
function ht(e, t) {
	D(e, t);
	let n = e;
	S(n, t, mt), n.strokeColor !== void 0 && w(n.strokeColor, `${t}.strokeColor`), n.fillColor !== void 0 && w(n.fillColor, `${t}.fillColor`);
	for (let e of ["strokeWidth", "pointRadius"]) if (n[e] !== void 0 && (T(n[e], `${t}.${e}`), n[e] < 0)) throw new b(`${t}.${e}`, "expected a non-negative number");
}
var gt = [
	"crs",
	"precision",
	"fullFeatures"
];
function _t(e, t, n) {
	D(e, t);
	let r = e;
	if (S(r, t, gt), r.crs !== void 0 && j(n)(r.crs, `${t}.crs`), r.precision !== void 0 && (T(r.precision, `${t}.precision`), !Number.isInteger(r.precision) || r.precision < 0)) throw new b(`${t}.precision`, "expected a non-negative integer");
	r.fullFeatures !== void 0 && E(r.fullFeatures, `${t}.fullFeatures`);
}
var vt = [
	"crosshair",
	"pickBoxSize",
	"color",
	"pickColor",
	"angle"
];
function yt(e, t) {
	D(e, t);
	let n = e;
	if (S(n, t, vt), n.crosshair !== void 0 && E(n.crosshair, `${t}.crosshair`), n.pickBoxSize !== void 0 && (T(n.pickBoxSize, `${t}.pickBoxSize`), n.pickBoxSize <= 0)) throw new b(`${t}.pickBoxSize`, "expected a positive number");
	n.color !== void 0 && w(n.color, `${t}.color`), n.pickColor !== void 0 && w(n.pickColor, `${t}.pickColor`), n.angle !== void 0 && T(n.angle, `${t}.angle`);
}
function bt(e) {
	let t = /* @__PURE__ */ new Set();
	if (Array.isArray(e.projections)) for (let n of e.projections) x(n) && typeof n.code == "string" && t.add(n.code);
	return { declaredProjections: t };
}
function xt(e, t, n) {
	let r = /* @__PURE__ */ new Set();
	e.forEach((e, i) => {
		let a = x(e) ? e.id : void 0;
		if (typeof a == "string") {
			if (r.has(a)) throw new b(`${t}[${i}].id`, `duplicate ${n} id "${a}"`);
			r.add(a);
		}
	});
}
function St(e, t = "basemap") {
	Pe(e, t, { declaredProjections: /* @__PURE__ */ new Set() });
}
function Ct(e, t = "layer") {
	Xe(e, t, { declaredProjections: /* @__PURE__ */ new Set() });
}
function wt(e) {
	D(e, "config");
	let t = e;
	S(t, "config", Ze);
	let n = t.target !== void 0, r = t.map !== void 0;
	if (n === r) throw new b("config", "exactly one of \"target\" or \"map\" is required");
	if (n && typeof t.target != "string" && !x(t.target)) throw new b("config.target", "expected an element id or an element");
	if (r && !x(t.map)) throw new b("config.map", "expected an OpenLayers Map instance");
	if (t.projections !== void 0) {
		k(Ae)(t.projections, "config.projections");
		let e = /* @__PURE__ */ new Set();
		t.projections.forEach((t, n) => {
			if (e.has(t.code)) throw new b(`config.projections[${n}].code`, `duplicate code "${t.code}"`);
			e.add(t.code);
		});
	}
	if (t.proj4 !== void 0 && typeof t.proj4 != "function") throw new b("config.proj4", "expected the proj4 library");
	if (t.editMode !== void 0 && E(t.editMode, "config.editMode"), t.cursor !== void 0 && yt(t.cursor, "config.cursor"), t.locale !== void 0 && O(["en", "de"])(t.locale, "config.locale"), t.messages !== void 0) {
		D(t.messages, "config.messages");
		for (let [e, n] of Object.entries(t.messages)) w(n, `config.messages.${e}`);
	}
	let i = bt(t);
	if (t.changes !== void 0 && _t(t.changes, "config.changes", i), t.selection !== void 0 && pt(t.selection, "config.selection"), t.layerHighlight !== void 0 && ht(t.layerHighlight, "config.layerHighlight"), t.snapping !== void 0 && et(t.snapping, "config.snapping"), t.grid !== void 0 && nt(t.grid, "config.grid"), t.curves !== void 0 && ot(t.curves, "config.curves"), t.units !== void 0 && at(t.units, "config.units"), t.constraints !== void 0 && dt(t.constraints, "config.constraints"), t.draft !== void 0) {
		let e = Array.isArray(t.layers) ? t.layers.map((e) => typeof e?.id == "string" ? e.id : "") : [];
		ct(t.draft, "config.draft", e);
	}
	if (t.view !== void 0 && Oe(t.view, "config.view", i), t.basemaps !== void 0) {
		if (!Array.isArray(t.basemaps)) throw new b("config.basemaps", "expected an array");
		t.basemaps.forEach((e, t) => Pe(e, `config.basemaps[${t}]`, i)), xt(t.basemaps, "config.basemaps", "basemap");
	}
	if (t.layers !== void 0) {
		if (!Array.isArray(t.layers)) throw new b("config.layers", "expected an array");
		t.layers.forEach((e, t) => Xe(e, `config.layers[${t}]`, i)), xt(t.layers, "config.layers", "layer");
	}
}
//#endregion
//#region src/core/geometry/intersect.ts
function N(e, t, n) {
	return (t[0] - e[0]) * (n[1] - e[1]) - (t[1] - e[1]) * (n[0] - e[0]);
}
function P(e, t, n) {
	return Math.min(e[0], t[0]) <= n[0] && n[0] <= Math.max(e[0], t[0]) && Math.min(e[1], t[1]) <= n[1] && n[1] <= Math.max(e[1], t[1]);
}
function Tt(e, t, n, r) {
	let i = N(n, r, e), a = N(n, r, t), o = N(e, t, n), s = N(e, t, r);
	return !!((i > 0 && a < 0 || i < 0 && a > 0) && (o > 0 && s < 0 || o < 0 && s > 0) || i === 0 && P(n, r, e) || a === 0 && P(n, r, t) || o === 0 && P(e, t, n) || s === 0 && P(e, t, r));
}
function Et(e, t, n, r) {
	let i = t[0] - e[0], a = t[1] - e[1], o = r[0] - n[0], s = r[1] - n[1], c = i * s - a * o;
	if (Math.abs(c) <= 1e-12 * Math.hypot(i, a) * Math.hypot(o, s)) return null;
	let l = n[0] - e[0], u = n[1] - e[1];
	return {
		t: (l * s - u * o) / c,
		u: (l * a - u * i) / c
	};
}
function Dt(e, t, n, r) {
	let i = Et(e, t, n, r);
	return !i || i.t < 0 || i.t > 1 || i.u < 0 || i.u > 1 ? null : {
		point: [e[0] + i.t * (t[0] - e[0]), e[1] + i.t * (t[1] - e[1])],
		t: i.t,
		u: i.u
	};
}
function Ot(e, t, n, r) {
	let i = Et(e, [e[0] + t[0], e[1] + t[1]], n, r);
	return !i || i.t <= 0 || i.u < 0 || i.u > 1 ? null : {
		point: [e[0] + i.t * t[0], e[1] + i.t * t[1]],
		t: i.t,
		u: i.u
	};
}
//#endregion
//#region src/core/geometry/validity.ts
var kt = {
	Point: (e) => e instanceof u,
	LineString: (e) => e instanceof o,
	Polygon: (e) => e instanceof d,
	MultiPoint: (e) => e instanceof c,
	MultiLineString: (e) => e instanceof s,
	MultiPolygon: (e) => e instanceof l
};
function At(e, t) {
	return t === "Any" ? Object.values(kt).some((t) => t(e)) : kt[t](e);
}
var jt = (e, t) => e[0] === t[0] && e[1] === t[1];
function Mt(e, t) {
	return e ? At(e, t) ? e instanceof u ? null : e instanceof c ? e.getCoordinates().length === 0 ? {
		code: "empty-geometry",
		params: {}
	} : null : e instanceof o ? Pt(e.getCoordinates()) : e instanceof s ? Nt(e.getCoordinates(), Pt) : e instanceof d ? Ft(e.getCoordinates()) : e instanceof l ? Nt(e.getCoordinates(), Ft) : null : {
		code: "geometry-type",
		params: {
			expected: t,
			actual: e instanceof a ? "GeometryCollection" : e.getType()
		}
	} : {
		code: "empty-geometry",
		params: {}
	};
}
function Nt(e, t) {
	if (e.length === 0) return {
		code: "empty-geometry",
		params: {}
	};
	for (let n of e) {
		let e = t(n);
		if (e) return e;
	}
	return null;
}
function Pt(e) {
	return e.length === 0 ? {
		code: "empty-geometry",
		params: {}
	} : e.length < 2 ? {
		code: "too-few-vertices",
		params: {
			minimum: 2,
			actual: e.length
		}
	} : Lt(e);
}
function Ft(e) {
	if (e.length === 0) return {
		code: "empty-geometry",
		params: {}
	};
	for (let t of e) {
		let e = It(t);
		if (e) return e;
	}
	return null;
}
function It(e) {
	if (e.length === 0) return {
		code: "empty-geometry",
		params: {}
	};
	if (e.length < 4) return {
		code: "too-few-vertices",
		params: {
			minimum: 4,
			actual: e.length
		}
	};
	if (!jt(e[0], e[e.length - 1])) return {
		code: "ring-not-closed",
		params: {}
	};
	let t = Lt(e);
	if (t) return t;
	let n = e.length - 1;
	for (let t = 0; t < n; t++) for (let r = t + 2; r < n; r++) if ((t !== 0 || r !== n - 1) && Tt(e[t], e[t + 1], e[r], e[r + 1])) return {
		code: "self-intersection",
		params: {
			segment: t,
			other: r
		}
	};
	return null;
}
function Lt(e) {
	for (let t = 1; t < e.length; t++) if (jt(e[t - 1], e[t])) return {
		code: "zero-length-segment",
		params: { segment: t - 1 }
	};
	return null;
}
//#endregion
//#region src/core/changes/commands.ts
var Rt = (e, t, n = {}) => ({
	type: "insert",
	layer: e,
	feature: t,
	...n.template === void 0 ? {} : { template: n.template },
	...n.imported ? { imported: !0 } : {}
}), zt = (e, t) => ({
	type: "updateGeometry",
	feature: e,
	geometry: t
}), Bt = (e, t) => ({
	type: "updateProperties",
	feature: e,
	properties: t
}), Vt = (e) => ({
	type: "delete",
	feature: e
}), Ht = (e, t) => ({
	type: "composite",
	...t === void 0 ? {} : { label: t },
	commands: e
});
function Ut(e) {
	return e.type === "composite" ? e.commands.flatMap(Ut) : [e];
}
//#endregion
//#region src/core/measure/index.ts
function F(e) {
	let t = n(e);
	if (!t) throw Error(`Unknown projection ${String(e)}`);
	return t;
}
function I(e, t) {
	let n = F(e);
	if (n.getUnits() === "degrees") {
		let e = de(t, 1, Math.PI / 2);
		return Math.abs(e[0] - t[0]);
	}
	return 1 / r(n, 1, t, "m");
}
function Wt(e, t, n, r) {
	let i = F(e);
	if (i.getUnits() === "degrees") {
		let e = Math.hypot(n, r);
		return e === 0 ? [t[0], t[1]] : de(t, e, Math.atan2(n, r));
	}
	let a = I(i, t);
	return [t[0] + n * a, t[1] + r * a];
}
function Gt(e, t, n) {
	let r = F(e);
	if (r.getUnits() === "degrees") return ue(t, n);
	let i = [(t[0] + n[0]) / 2, (t[1] + n[1]) / 2];
	return Math.hypot(n[0] - t[0], n[1] - t[1]) / I(r, i);
}
//#endregion
//#region src/core/tools/Tool.ts
var Kt = class {
	readOnly = !1;
	ctx = null;
	interactions = [];
	options = {};
	canActivate(e, t) {
		return !0;
	}
	activate(e, t = {}) {
		this.ctx = e, this.options = { ...t };
		for (let t of this.interactions) e.map.addInteraction(t);
	}
	getOptions() {
		return { ...this.options };
	}
	getPrompt() {
		return null;
	}
	deactivate() {
		this.cancel(), this.removeInteractions();
	}
	removeInteractions() {
		if (this.ctx) for (let e of this.interactions) this.ctx.map.removeInteraction(e);
		this.interactions = [], this.ctx = null;
	}
	cancel() {}
	finish() {}
	removeLastPoint() {
		return !1;
	}
	handleInput(e) {
		return !1;
	}
	handleValue(e) {
		return !1;
	}
	handleLength(e) {
		return !1;
	}
	getInputRequest() {
		return null;
	}
	handleText(e) {
		return !1;
	}
	setSuspended(e) {
		for (let t of this.interactions) t.setActive(!e);
	}
	referencePoint() {
		return null;
	}
};
//#endregion
//#region src/core/tools/draw.ts
function L(e) {
	switch (e) {
		case "Point":
		case "MultiPoint": return "Point";
		case "LineString":
		case "MultiLineString": return "LineString";
		case "Polygon":
		case "MultiPolygon": return "Polygon";
		case "Any": return null;
	}
}
function qt(e, t = {}) {
	let n = e.getActiveLayer() ?? e.getDraftLayer();
	if (n === null || !e.layers.has(n) || !e.layers.canEdit(n, "insert")) return null;
	let r = e.layers.getConfig(n), i = L(r.geometryType);
	return i !== null && t.type !== void 0 && t.type !== i ? null : {
		layerId: n,
		layer: r,
		type: i ?? t.type ?? "Point"
	};
}
function Jt(e, t) {
	let n = e.getActiveLayer() ?? e.getDraftLayer();
	if (n === null || !e.layers.has(n) || !e.layers.canEdit(n, "insert")) return null;
	let r = e.layers.getConfig(n), i = L(r.geometryType);
	return i === t || i === null ? {
		layerId: n,
		layer: r
	} : null;
}
function Yt(e) {
	return Jt(e, "Polygon");
}
function Xt(e) {
	return Jt(e, "LineString");
}
function R(e, t) {
	return t === "MultiPoint" && e instanceof u ? new c([e.getCoordinates()]) : t === "MultiLineString" && e instanceof o ? new s([e.getCoordinates()]) : t === "MultiPolygon" && e instanceof d ? new l([e.getCoordinates()]) : e;
}
function Zt(e) {
	let t = {};
	for (let n of e.schema?.fields ?? []) n.default !== void 0 && (t[n.name] = n.default);
	return t;
}
function Qt(t, n) {
	return new e({
		...Zt(t),
		geometry: R(n, t.geometryType)
	});
}
function $t(e) {
	if (e instanceof o) {
		let t = e.getCoordinates();
		return t.length >= 2 ? t[t.length - 2] : null;
	}
	if (e instanceof d) {
		let t = e.getCoordinates()[0] ?? [];
		return t.length >= 3 ? t[t.length - 3] : null;
	}
	return null;
}
function z(e, t, n, r) {
	let i = Qt(n, r);
	return e.execute(Rt(t, i)) ? (e.selection.set([i]), !0) : !1;
}
var en = class extends Kt {
	id = "draw";
	draw = null;
	sketch = null;
	target = null;
	canActivate(e, t) {
		return qt(e, t) !== null;
	}
	getOptions() {
		return this.target ? {
			...this.options,
			type: this.target.type
		} : { ...this.options };
	}
	activate(e, t) {
		let n = qt(e, t);
		if (!n) throw Error("The draw tool needs a layer that allows inserts");
		let { layerId: r, layer: i } = n, a = new fe({
			type: n.type,
			stopClick: !0
		});
		a.on("drawstart", (e) => {
			this.sketch = e.feature;
		}), a.on("drawabort", () => {
			this.sketch = null;
		}), a.on("drawend", (t) => {
			this.sketch = null;
			let n = t.feature.getGeometry();
			n && z(e, r, i, n);
		}), this.draw = a, this.target = n, this.interactions = [a], super.activate(e, t);
	}
	deactivate() {
		super.deactivate(), this.draw = null, this.sketch = null, this.target = null;
	}
	handleInput(e) {
		if (!this.draw || !this.ctx || !this.target) return !1;
		let { layerId: t, layer: n, type: r } = this.target;
		return r === "Point" ? z(this.ctx, t, n, new u(e)) : (this.draw.appendCoordinates([e]), !0);
	}
	referencePoint() {
		return $t(this.sketch?.getGeometry());
	}
	cancel() {
		this.draw?.abortDrawing();
	}
	finish() {
		this.draw?.finishDrawing();
	}
	removeLastPoint() {
		let e = this.sketch !== null;
		return this.draw?.removeLastPoint(), e;
	}
}, tn = class extends Error {
	path;
	constructor(e, t) {
		super(`${e}: ${t}`), this.name = "StyleError", this.path = e;
	}
}, nn = {
	solid: void 0,
	dashed: [8, 6],
	dotted: [2, 4]
};
function B(e) {
	let t = e === "Point" || e === "MultiPoint" || e === "Any", n = e === "LineString" || e === "MultiLineString", r = e === "Polygon" || e === "MultiPolygon";
	return {
		point: t,
		stroke: n || r || e === "Any",
		fill: r || e === "Any"
	};
}
var rn = {
	white: "#ffffff",
	black: "#000000",
	red: "#ff0000",
	green: "#008000",
	blue: "#0000ff",
	yellow: "#ffff00",
	orange: "#ffa500",
	gray: "#808080",
	grey: "#808080"
};
function V(e) {
	let t = (e) => Math.max(0, Math.min(255, Math.round(e))).toString(16).padStart(2, "0");
	if (Array.isArray(e) && e.length >= 3 && e.every((e) => typeof e == "number")) {
		let [n, r, i, a = 1] = e;
		return {
			hex: `#${t(n)}${t(r)}${t(i)}`,
			alpha: a
		};
	}
	if (typeof e != "string") return null;
	let n = e.trim().toLowerCase();
	if (rn[n]) return {
		hex: rn[n],
		alpha: 1
	};
	let r = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(n);
	return r ? {
		hex: `#${r[1]}${r[1]}${r[2]}${r[2]}${r[3]}${r[3]}`,
		alpha: 1
	} : (r = /^#([0-9a-f]{6})([0-9a-f]{2})?$/.exec(n), r ? {
		hex: `#${r[1]}`,
		alpha: r[2] ? parseInt(r[2], 16) / 255 : 1
	} : (r = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(n), r ? {
		hex: `#${t(Number(r[1]))}${t(Number(r[2]))}${t(Number(r[3]))}`,
		alpha: r[4] === void 0 ? 1 : Number(r[4])
	} : null));
}
function an(e, t) {
	let n = parseInt(e.slice(1), 16);
	return `rgba(${n >> 16 & 255}, ${n >> 8 & 255}, ${n & 255}, ${+t.toFixed(3)})`;
}
function on(e, t) {
	if (Array.isArray(e) || typeof e != "object" || !e) return null;
	let n = e;
	for (let [e, t] of Object.entries(n)) if (e !== "text-value" && Array.isArray(t) && typeof t[0] == "string" && e !== "stroke-line-dash") return null;
	let r = B(t), i = { opacity: 1 };
	if (r.stroke) {
		let e = V(n["stroke-color"]) ?? {
			hex: "#2563eb",
			alpha: 1
		}, t = n["stroke-line-dash"];
		i.stroke = {
			color: e.hex,
			width: typeof n["stroke-width"] == "number" ? n["stroke-width"] : 1.5,
			dash: !t || t.length === 0 ? "solid" : (t[0] ?? 0) <= 2 ? "dotted" : "dashed"
		};
	}
	if (r.fill) {
		let e = V(n["fill-color"]) ?? {
			hex: "#2563eb",
			alpha: 0
		};
		i.fill = {
			color: e.hex,
			opacity: e.alpha
		};
	}
	r.point && (i.point = {
		radius: typeof n["circle-radius"] == "number" ? n["circle-radius"] : 5,
		fill: (V(n["circle-fill-color"]) ?? { hex: "#2563eb" }).hex,
		strokeColor: (V(n["circle-stroke-color"]) ?? { hex: "#ffffff" }).hex,
		strokeWidth: typeof n["circle-stroke-width"] == "number" ? n["circle-stroke-width"] : 1.5
	});
	let a = n["text-value"];
	if (Array.isArray(a) && a[0] === "to-string" && (a = a[1]), Array.isArray(a) && a[0] === "get" && typeof a[1] == "string") {
		let e = /(\d+(?:\.\d+)?)px/.exec(String(n["text-font"] ?? ""));
		i.label = {
			field: a[1],
			size: e ? Number(e[1]) : 12,
			color: (V(n["text-fill-color"]) ?? { hex: "#111827" }).hex,
			halo: (V(n["text-stroke-color"]) ?? { hex: "#ffffff" }).hex
		};
	} else i.label = null;
	return i;
}
function sn(e, t) {
	let n = B(t), r = {};
	if (n.stroke && e.stroke) {
		r["stroke-color"] = e.stroke.color, r["stroke-width"] = e.stroke.width;
		let t = nn[e.stroke.dash];
		t && (r["stroke-line-dash"] = t.map((t) => t * Math.max(1, e.stroke.width / 2)));
	}
	return n.fill && e.fill && (r["fill-color"] = an(e.fill.color, e.fill.opacity)), n.point && e.point && (r["circle-radius"] = e.point.radius, r["circle-fill-color"] = e.point.fill, r["circle-stroke-color"] = e.point.strokeColor, r["circle-stroke-width"] = e.point.strokeWidth), e.label && (r["text-value"] = ["to-string", ["get", e.label.field]], r["text-font"] = `${e.label.size}px sans-serif`, r["text-fill-color"] = e.label.color, r["text-stroke-color"] = e.label.halo, r["text-stroke-width"] = 3, r["text-overflow"] = !0, n.point && !n.stroke && (r["text-offset-y"] = -((e.point?.radius ?? 5) + e.label.size * .7)), !n.point && n.stroke && !n.fill && (r["text-placement"] = "line")), r;
}
function cn(e, t = "style") {
	let n = (e, t) => {
		throw new tn(e, t);
	};
	(!e || typeof e != "object") && n(t, "expected an object");
	let r = e, i = (e, t) => ((typeof e != "string" || !/^#[0-9a-fA-F]{6}$/.test(e)) && n(t, "expected a colour #rrggbb"), e.toLowerCase()), a = (e, t, r, i) => ((typeof e != "number" || !Number.isFinite(e) || e < r || e > i) && n(t, `expected a number from ${r} to ${i}`), e), o = (e, t) => ((!e || typeof e != "object") && n(t, "expected an object"), e), s = { opacity: a(r.opacity ?? 1, `${t}.opacity`, 0, 1) };
	if (r.stroke !== void 0) {
		let e = o(r.stroke, `${t}.stroke`), c = e.dash ?? "solid";
		c !== "solid" && c !== "dashed" && c !== "dotted" && n(`${t}.stroke.dash`, "expected solid, dashed or dotted"), s.stroke = {
			color: i(e.color, `${t}.stroke.color`),
			width: a(e.width, `${t}.stroke.width`, 0, 50),
			dash: c
		};
	}
	if (r.fill !== void 0) {
		let e = o(r.fill, `${t}.fill`);
		s.fill = {
			color: i(e.color, `${t}.fill.color`),
			opacity: a(e.opacity, `${t}.fill.opacity`, 0, 1)
		};
	}
	if (r.point !== void 0) {
		let e = o(r.point, `${t}.point`);
		s.point = {
			radius: a(e.radius, `${t}.point.radius`, 0, 100),
			fill: i(e.fill, `${t}.point.fill`),
			strokeColor: i(e.strokeColor, `${t}.point.strokeColor`),
			strokeWidth: a(e.strokeWidth, `${t}.point.strokeWidth`, 0, 50)
		};
	}
	if (r.label === null || r.label === void 0) s.label = null;
	else {
		let e = o(r.label, `${t}.label`);
		(typeof e.field != "string" || e.field.trim() === "") && n(`${t}.label.field`, "expected an attribute name"), s.label = {
			field: e.field.trim(),
			size: a(e.size, `${t}.label.size`, 4, 96),
			color: i(e.color, `${t}.label.color`),
			halo: i(e.halo, `${t}.label.halo`)
		};
	}
	if (r.text !== void 0) {
		let e = o(r.text, `${t}.text`);
		s.text = {
			color: i(e.color, `${t}.text.color`),
			halo: i(e.halo, `${t}.text.halo`)
		};
	}
	for (let e of ["minZoom", "maxZoom"]) r[e] !== void 0 && r[e] !== null && (s[e] = a(r[e], `${t}.${e}`, 0, 30));
	return s.minZoom !== void 0 && s.maxZoom !== void 0 && s.minZoom >= s.maxZoom && n(`${t}.maxZoom`, "must be greater than minZoom"), s;
}
//#endregion
//#region src/core/export/exportLayers.ts
var ln = [
	{
		id: "geojson",
		label: "GeoJSON",
		mimeType: "application/geo+json",
		extension: "geojson"
	},
	{
		id: "kml",
		label: "KML",
		mimeType: "application/vnd.google-earth.kml+xml",
		extension: "kml",
		crs: "EPSG:4326"
	},
	{
		id: "gml",
		label: "GML 3.2",
		mimeType: "application/gml+xml",
		extension: "gml"
	},
	{
		id: "gpx",
		label: "GPX",
		mimeType: "application/gpx+xml",
		extension: "gpx",
		crs: "EPSG:4326",
		skips: "polygons and multi-points"
	}
], un = "http://www.opengis.net/gml/3.2", dn = "urn:ol-cad:export", fn = /^[A-Za-z_][A-Za-z0-9_.-]*$/;
function pn(e, t, r, i = /* @__PURE__ */ new Date()) {
	if (e.length === 0) throw Error("Nothing to export: no layer chosen");
	let a = ln.find((e) => e.id === t.format);
	if (!a) throw Error(`Unknown export format "${String(t.format)}"`);
	let o = a.crs ?? t.projection ?? "EPSG:4326", s = n(o);
	if (!s) throw Error(`Unknown projection ${o}`);
	let c = {
		dataProjection: o,
		featureProjection: r,
		decimals: t.decimals ?? (s.getUnits() === "degrees" ? 7 : 3)
	}, l, u = 0, d = 0;
	switch (t.format) {
		case "geojson": {
			let t = e.flatMap((e) => e.features.map((t) => {
				let n = H(t);
				return n.set(n.get("layer") === void 0 ? "layer" : "_layer", e.id), n;
			}));
			u = t.length;
			let n = new f().writeFeaturesObject(t, c), r = /^EPSG:(\d+)$/.exec(s.getCode());
			r && r[1] !== "4326" && (n.crs = {
				type: "name",
				properties: { name: `urn:ogc:def:crs:EPSG::${r[1]}` }
			}), l = JSON.stringify(n, null, 2);
			break;
		}
		case "kml": {
			let t = new se({ writeStyles: !1 });
			l = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2"><Document>${e.map((e) => {
				let n = e.features.map((e) => H(e, !0));
				u += n.length;
				let r = t.writeFeatures(n, c);
				return `<Folder><name>${hn(e.title)}</name>${mn(r)}</Folder>`;
			}).join("")}</Document></kml>\n`;
			break;
		}
		case "gml":
			l = `<?xml version="1.0" encoding="UTF-8"?>
<gml:FeatureCollection xmlns:gml="${un}" xmlns:olcad="${dn}" gml:id="export"><gml:featureMembers>${e.map((e) => {
				let t = gn(e.id), n = new ae({
					featureNS: dn,
					featureType: t,
					srsName: o
				}), r = e.features.map((e) => H(e, !0));
				u += r.length;
				let i = n.writeFeatures(r, c);
				return i.slice(i.indexOf(">") + 1, i.lastIndexOf("</")).replace(/ fid="([^"]*)"/g, (e, n) => ` gml:id="${gn(`${t}.${n}`)}"`);
			}).join("")}</gml:featureMembers></gml:FeatureCollection>\n`;
			break;
		case "gpx": {
			let t = {
				Point: 0,
				LineString: 1,
				MultiLineString: 2
			}, n = [];
			for (let r of e) for (let e of r.features) {
				let i = e.getGeometry()?.getType();
				if (i === void 0 || !(i in t)) {
					d++;
					continue;
				}
				let a = H(e);
				a.get("name") === void 0 && a.set("name", `${r.title} ${String(e.getId() ?? n.length + 1)}`), n.push(a);
			}
			n.sort((e, n) => t[e.getGeometry().getType()] - t[n.getGeometry().getType()]), u = n.length, l = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" + new oe().writeFeatures(n, c) + "\n";
			break;
		}
	}
	let p = e.length === 1 ? e[0].title : `export-${i.toISOString().slice(0, 10)}`;
	return {
		content: l,
		mimeType: a.mimeType,
		extension: a.extension,
		filename: `${_n(p)}.${a.extension}`,
		featureCount: u,
		skipped: d
	};
}
function H(t, n = !1) {
	let r = new e(), i = t.getGeometryName();
	for (let [e, a] of Object.entries(t.getProperties())) e !== i && (!n || fn.test(e) && e !== "geometry") && a !== void 0 && r.set(e, n && typeof a == "object" && a ? JSON.stringify(a) : a);
	let a = t.getGeometry();
	a && r.setGeometry(a.clone());
	let o = t.getId();
	return o !== void 0 && r.setId(o), r;
}
function mn(e) {
	let t = e.indexOf("<Placemark"), n = e.lastIndexOf("</Placemark>");
	return t < 0 || n < 0 ? "" : e.slice(t, n + 12);
}
function hn(e) {
	return e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function gn(e) {
	let t = e.replace(/[^A-Za-z0-9_.-]/g, "_");
	return /^[A-Za-z_]/.test(t) ? t : `_${t}`;
}
function _n(e) {
	return e.replace(/[\\/:*?"<>|]+/g, "_").trim() || "export";
}
//#endregion
//#region src/core/import/readImport.ts
var vn = [
	{
		id: "geojson",
		label: "GeoJSON",
		extensions: ["geojson", "json"]
	},
	{
		id: "topojson",
		label: "TopoJSON",
		extensions: ["topojson"]
	},
	{
		id: "kml",
		label: "KML",
		extensions: ["kml"]
	},
	{
		id: "gml",
		label: "GML",
		extensions: ["gml", "xml"]
	},
	{
		id: "gpx",
		label: "GPX",
		extensions: ["gpx"]
	}
], U = class extends Error {
	constructor(e) {
		super(e), this.name = "ImportError";
	}
}, yn = {
	Point: "points",
	MultiPoint: "points",
	LineString: "lines",
	MultiLineString: "lines",
	Polygon: "polygons",
	MultiPolygon: "polygons"
}, bn = {
	points: "Point",
	lines: "LineString",
	polygons: "Polygon"
}, xn = /* @__PURE__ */ new Set([
	"styleUrl",
	"visibility",
	"open"
]), Sn = /^-?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/, Cn = /^[A-Za-z_][A-Za-z0-9_]*$/;
function wn(e, t) {
	let n = t.format ?? Tn(e, t.filename), r = Fn(t.filename), { raw: i, dataProjection: a } = En(n, e, t.viewProjection), o = 0, s = [];
	for (let e of i) {
		let t = /* @__PURE__ */ new Map();
		for (let n of e.features) {
			let e = yn[n.getGeometry()?.getType() ?? ""];
			e ? (t.has(e) || t.set(e, []), t.get(e).push(n)) : o++;
		}
		let i = e.name?.trim() || r;
		for (let [e, r] of t) {
			let a = r.some((e) => e.getGeometry().getType().startsWith("Multi")) ? `Multi${bn[e]}` : bn[e];
			s.push(Dn(String(s.length), t.size > 1 ? `${i} – ${e}` : i, a, r, n !== "geojson" && n !== "topojson"));
		}
	}
	return {
		format: n,
		dataProjection: a,
		groups: s,
		skipped: o
	};
}
function Tn(e, t) {
	let n = t?.toLowerCase().split(".").pop(), r = vn.find((e) => n && e.extensions.includes(n) && n !== "xml");
	if (r) return r.id === "geojson" && /"type"\s*:\s*"Topology"/.test(e) ? "topojson" : r.id;
	let i = e.trimStart();
	if (i.startsWith("{")) return /"type"\s*:\s*"Topology"/.test(e) ? "topojson" : "geojson";
	if (i.startsWith("<")) {
		let e = /<(?:[\w-]+:)?(kml|gpx)[\s>]/.exec(i.replace(/<\?[^>]*\?>|<!--[\s\S]*?-->/g, ""));
		return e?.[1] === "kml" ? "kml" : e?.[1] === "gpx" ? "gpx" : "gml";
	}
	throw new U("Unknown file format: expected GeoJSON, TopoJSON, KML, GML or GPX");
}
function En(e, t, n) {
	let r = (e, t, r) => e.readFeatures(t, {
		dataProjection: r,
		featureProjection: n
	});
	switch (e) {
		case "geojson": {
			let e;
			try {
				e = JSON.parse(t);
			} catch {
				throw new U("The file is not valid JSON");
			}
			let n = e.crs, i = Nn(n?.properties?.name ?? "EPSG:4326");
			return {
				raw: jn(K(() => r(new f(), e, i)), "layer"),
				dataProjection: i
			};
		}
		case "topojson": return {
			raw: jn(K(() => r(new ne({ layerName: "__object" }), t, "EPSG:4326")), "__object"),
			dataProjection: "EPSG:4326"
		};
		case "kml": {
			let e = W(t), n = new se({ extractStyles: !1 }), i = Pn(e.documentElement, "Document") ?? e.documentElement, a = G(i, "Folder"), o = [], s = G(i, "Placemark");
			if (a.length === 0) o.push({
				name: null,
				features: r(n, e, "EPSG:4326")
			});
			else {
				s.length > 0 && o.push({
					name: null,
					features: s.flatMap((e) => r(n, e, "EPSG:4326"))
				});
				for (let e of a) o.push({
					name: Pn(e, "name")?.textContent ?? null,
					features: r(n, e, "EPSG:4326")
				});
			}
			for (let e of o) for (let t of e.features) for (let e of xn) t.unset(e, !0);
			return {
				raw: o,
				dataProjection: "EPSG:4326"
			};
		}
		case "gml": {
			let e = W(t), n = e.documentElement.querySelector("[srsName]")?.getAttribute("srsName"), i = Nn(n ?? "EPSG:4326"), a = t.includes("http://www.opengis.net/gml/3.2") ? ae : /<(?:\w+:)?(pos|posList)[\s>]/.test(t) ? ie : re, o = Mn(e);
			if (o.length === 0) throw new U("No features found in the GML file");
			return {
				raw: o.map(({ ns: t, name: n }) => ({
					name: n,
					features: K(() => r(new a({
						featureNS: t,
						featureType: n
					}), e, i))
				})),
				dataProjection: i
			};
		}
		case "gpx": {
			let e = W(t);
			return {
				raw: [{
					name: null,
					features: r(new oe(), e, "EPSG:4326")
				}],
				dataProjection: "EPSG:4326"
			};
		}
	}
}
function Dn(t, n, r, i, a) {
	let o = /* @__PURE__ */ new Map(), s = /* @__PURE__ */ new Set();
	for (let e of i) for (let t of Object.keys(e.getProperties())) {
		if (t === e.getGeometryName() || o.has(t)) continue;
		let n = t.replace(/[^A-Za-z0-9_]/g, "_");
		Cn.test(n) || (n = `_${n}`), n === "geometry" && (n = "geometry_");
		let r = n;
		for (let e = 2; s.has(r); e++) r = `${n}_${e}`;
		s.add(r), o.set(t, r);
	}
	let c = [], l = /* @__PURE__ */ new Map();
	for (let [e, t] of o) {
		let n = kn(i.map((t) => t.get(e)).filter((e) => e != null && e !== ""), a);
		c.push({
			name: t,
			type: n,
			...t === e ? {} : { label: e }
		}), l.set(e, An(n));
	}
	let u = [], d = 0;
	for (let t of i) {
		let n = R(On(t.getGeometry()), r);
		if (Mt(n, r)) {
			d++;
			continue;
		}
		let i = new e();
		for (let [e, n] of o) {
			let r = t.get(e);
			r != null && r !== "" && i.set(n, l.get(e)(r));
		}
		i.setGeometry(n), u.push(i);
	}
	return {
		key: t,
		name: n,
		geometryType: r,
		features: u,
		fields: c,
		invalid: d
	};
}
function On(e) {
	let t = e.clone();
	if (t.getStride() <= 2) return t;
	let n = (e) => Array.isArray(e) && typeof e[0] == "number" ? e.slice(0, 2) : e.map(n);
	return t.setCoordinates(n(t.getCoordinates()), "XY"), t;
}
function kn(e, t) {
	return e.length === 0 ? "string" : e.every((e) => typeof e == "number" || t && typeof e == "string" && Sn.test(e.trim())) ? e.every((e) => Number.isInteger(Number(e))) ? "integer" : "number" : e.every((e) => typeof e == "boolean" || t && (e === "true" || e === "false")) ? "boolean" : "string";
}
function An(e) {
	switch (e) {
		case "integer":
		case "number": return (e) => Number(e);
		case "boolean": return (e) => e === !0 || e === "true";
		default: return (e) => typeof e == "object" ? JSON.stringify(e) : String(e);
	}
}
function jn(e, t) {
	if (!(e.length > 0 && e.every((e) => typeof e.get(t) == "string"))) return [{
		name: null,
		features: e
	}];
	let n = /* @__PURE__ */ new Map();
	for (let r of e) {
		let e = r.get(t);
		r.unset(t, !0), n.has(e) || n.set(e, []), n.get(e).push(r);
	}
	return [...n].map(([e, t]) => ({
		name: e,
		features: t
	}));
}
function Mn(e) {
	let t = /* @__PURE__ */ new Map(), n = e.getElementsByTagName("*");
	for (let e = 0; e < n.length; e++) {
		let r = n[e], i = r.parentElement?.localName;
		if (i !== "featureMember" && i !== "featureMembers" && i !== "member") continue;
		let a = r.namespaceURI ?? "", o = `${a} ${r.localName}`;
		t.has(o) || t.set(o, {
			ns: a,
			name: r.localName
		});
	}
	return [...t.values()];
}
function Nn(e) {
	let t = /EPSG(?::+|\/|.*#)(\d+)$/i.exec(e.trim()), r = t ? `EPSG:${t[1]}` : e.trim();
	if (/^CRS:?84$/i.test(r) || /OGC.*CRS84$/i.test(r)) return "EPSG:4326";
	if (!n(r)) throw new U(`The file uses the coordinate system ${r}, which is not registered (add it to the projections in the configuration)`);
	return r;
}
function W(e) {
	let t = pe(e);
	if (!t.documentElement || t.getElementsByTagName("parsererror").length > 0) throw new U("The file is not valid XML");
	return t;
}
function G(e, t) {
	return Array.from(e.children).filter((e) => e.localName === t);
}
function Pn(e, t) {
	return G(e, t)[0];
}
function K(e) {
	try {
		return e();
	} catch (e) {
		throw e instanceof U ? e : new U(`The file could not be read: ${e instanceof Error ? e.message : String(e)}`);
	}
}
function Fn(e) {
	return e && e.split(/[\\/]/).pop().replace(/\.[^.]+$/, "") || "Import";
}
//#endregion
//#region src/core/layers/local.ts
var q = [
	"Point",
	"LineString",
	"Polygon",
	"MultiPoint",
	"MultiLineString",
	"MultiPolygon"
], J = class extends Error {
	path;
	constructor(e, t) {
		super(`${e}: ${t}`), this.name = "LocalLayerImportError", this.path = e;
	}
}, In = /^[A-Za-z_][A-Za-z0-9_]*$/, Ln = class {
	definitions = /* @__PURE__ */ new Map();
	counter = 0;
	featureCounter = 0;
	ctx;
	constructor(e) {
		this.ctx = e;
	}
	has(e) {
		return this.definitions.has(e);
	}
	list() {
		return [...this.definitions].map(([e, t]) => this.info(e, t));
	}
	get(e) {
		return this.info(e, this.require(e));
	}
	create(e) {
		let t = Y(e, "definition"), n;
		do
			n = `local-${++this.counter}`;
		while (this.ctx.hasLayer(n));
		return this.add(n, t), this.ctx.emit({
			id: n,
			type: "create"
		}), n;
	}
	rename(e, t) {
		let n = this.require(e), r = t.trim();
		if (!r) throw new b("title", "must not be empty");
		r !== n.title && (n.title = r, this.ctx.setTitle(e, r), this.ctx.emit({
			id: e,
			type: "rename"
		}));
	}
	setFields(e, t, n = {}) {
		let r = this.require(e), i = Y({
			...r,
			fields: t
		}, "definition").fields, a = n.renamed ?? {}, o = new Set(i.map((e) => e.name));
		for (let t of this.ctx.getSource(e).getFeatures()) {
			let e = {};
			for (let [n, r] of Object.entries(a)) n !== r && t.get(n) !== void 0 && (e[r] = t.get(n));
			for (let e of r.fields) !o.has(e.name) && t.get(e.name) !== void 0 && t.unset(e.name, !0);
			for (let [n, r] of Object.entries(a)) n !== r && !o.has(n) && t.unset(n, !0), r in e && t.set(r, e[r], !0);
			t.changed();
		}
		r.fields = i, this.ctx.setFields(e, structuredClone(i)), this.ctx.emit({
			id: e,
			type: "schema"
		});
	}
	remove(e) {
		this.require(e), this.definitions.delete(e), this.ctx.removeLayer(e), this.ctx.emit({
			id: e,
			type: "remove"
		});
	}
	export() {
		let e = new f(), t = this.ctx.getProjection();
		return {
			version: 1,
			layers: [...this.definitions].map(([n, r]) => {
				let i = e.writeFeaturesObject(this.ctx.getSource(n).getFeatures(), {
					dataProjection: "EPSG:4326",
					featureProjection: t
				});
				return {
					id: n,
					...structuredClone(r),
					features: {
						type: "FeatureCollection",
						features: i.features
					}
				};
			})
		};
	}
	import(e) {
		let t = Rn(e);
		for (let e of t) if (this.ctx.hasLayer(e.id) && !this.definitions.has(e.id)) throw new J(`layers[${t.indexOf(e)}].id`, `"${e.id}" is used by another layer`);
		let n = new f(), r = this.ctx.getProjection();
		for (let e of t) {
			this.definitions.has(e.id) && (this.definitions.delete(e.id), this.ctx.removeLayer(e.id)), this.add(e.id, {
				title: e.title,
				geometryType: e.geometryType,
				fields: e.fields
			});
			let t = n.readFeatures(e.features, {
				dataProjection: "EPSG:4326",
				featureProjection: r
			});
			for (let e of t) e.setId(`loc-${++this.featureCounter}`);
			this.ctx.getSource(e.id).addFeatures(t);
			let i = /^local-(\d+)$/.exec(e.id);
			i && (this.counter = Math.max(this.counter, Number(i[1])));
		}
		this.ctx.emit({
			id: null,
			type: "import"
		});
	}
	clear() {
		this.definitions.clear();
	}
	add(e, t) {
		this.ctx.addLayer({
			id: e,
			title: t.title,
			geometryType: t.geometryType,
			source: { features: [] },
			editable: !0,
			snappable: !0,
			schema: { fields: structuredClone(t.fields) }
		}), this.ctx.setLocal(e, !0), this.definitions.set(e, t);
	}
	info(e, t) {
		return {
			id: e,
			...structuredClone(t),
			featureCount: this.ctx.getSource(e).getFeatures().length
		};
	}
	require(e) {
		let t = this.definitions.get(e);
		if (!t) throw Error(`Unknown local layer "${e}"`);
		return t;
	}
};
function Y(e, t) {
	if (!e || typeof e != "object") throw new b(t, "expected an object");
	let n = typeof e.title == "string" ? e.title.trim() : "";
	if (!n) throw new b(`${t}.title`, "must not be empty");
	if (!q.includes(e.geometryType)) throw new b(`${t}.geometryType`, `expected one of ${q.join(", ")}`);
	if (!Array.isArray(e.fields)) throw new b(`${t}.fields`, "expected an array");
	let r = structuredClone(e.fields).map((e, n) => {
		let r = typeof e?.name == "string" ? e.name.trim() : "";
		if (!In.test(r)) throw new b(`${t}.fields[${n}].name`, "expected a name of letters, digits and underscores, not starting with a digit");
		if (r === "geometry") throw new b(`${t}.fields[${n}].name`, "\"geometry\" is reserved");
		let i = {
			...e,
			name: r
		};
		if (typeof i.label == "string") {
			let e = i.label.trim();
			e ? i.label = e : delete i.label;
		}
		return i;
	});
	return Ct({
		id: "local",
		geometryType: e.geometryType,
		source: { features: [] },
		schema: { fields: r }
	}, t), {
		title: n,
		geometryType: e.geometryType,
		fields: r
	};
}
function Rn(e) {
	let t = (e, t) => {
		throw new J(e, t);
	};
	(!e || typeof e != "object") && t("json", "expected an object");
	let n = e;
	n.version !== 1 && t("version", "expected 1"), Array.isArray(n.layers) || t("layers", "expected an array");
	let r = /* @__PURE__ */ new Set();
	return n.layers.map((e, n) => {
		let i = `layers[${n}]`;
		(!e || typeof e != "object") && t(i, "expected an object");
		let a = e;
		(typeof a.id != "string" || !a.id) && t(`${i}.id`, "expected a string"), r.has(a.id) && t(`${i}.id`, `duplicate id "${String(a.id)}"`), r.add(a.id);
		let o;
		try {
			o = Y(a, i);
		} catch (e) {
			throw e instanceof b && t(e.path, e.message.replace(/^Invalid config at [^:]+: /, "")), e;
		}
		let s = a.features;
		return (!s || s.type !== "FeatureCollection" || !Array.isArray(s.features)) && t(`${i}.features`, "expected a GeoJSON FeatureCollection"), {
			id: a.id,
			...o,
			features: s
		};
	});
}
//#endregion
//#region src/core/measure/measurements.ts
var zn = 6378137;
function Bn(e, t) {
	let r = n(e);
	return !r || r.getUnits() !== "m" || Vn(e) ? !1 : Math.abs(I(r, t) - 1) < .01;
}
function Vn(e) {
	let r = n(e), i = n("EPSG:3857");
	return !!r && !!i && t(r, i);
}
function X(e, t) {
	let n = [], r = t.length > 0 && Bn(e, t[0]);
	for (let i = 1; i < t.length; i++) {
		let a = t[i - 1], o = t[i];
		n.push(r ? Math.hypot(o[0] - a[0], o[1] - a[1]) : Gt(e, a, o));
	}
	return {
		total: n.reduce((e, t) => e + t, 0),
		segments: n
	};
}
function Hn(e) {
	let t = zn, n = 0;
	for (let r = 1; r < e.length; r++) {
		let [i, a] = e[r - 1], [o, s] = e[r], c = o - i, l = s - a;
		c !== 0 && (n += Math.abs(l) < 1e-9 ? t * Math.tanh(a / t) * c : c / l * t * t * Math.log(Math.cosh(s / t) / Math.cosh(a / t)));
	}
	return -n;
}
function Un(e, t) {
	let n = t.map((e) => {
		let t = e[0], n = e[e.length - 1];
		return t[0] === n[0] && t[1] === n[1] ? e : [...e, t];
	}), r = n[0] ?? [], i = X(e, r).total;
	if (r.length < 4) return {
		area: 0,
		perimeter: i
	};
	let a = new d(n);
	if (Bn(e, r[0])) return {
		area: a.getArea(),
		perimeter: i
	};
	if (Vn(e)) {
		let [e, ...t] = n, r = Math.abs(Hn(e)) - t.reduce((e, t) => e + Math.abs(Hn(t)), 0);
		return {
			area: Math.max(0, r),
			perimeter: i
		};
	}
	return {
		area: Math.abs(le(a, { projection: e })),
		perimeter: i
	};
}
function Wn(e, t, n) {
	let r = Math.atan2(e[1] - t[1], e[0] - t[0]), i = Math.atan2(n[1] - t[1], n[0] - t[0]), a = Math.abs((i - r) * 180 / Math.PI) % 360;
	return a > 180 && (a = 360 - a), {
		angle: a,
		reflex: 360 - a
	};
}
var Gn = (e, t) => e.toFixed(t);
function Z(e, t = "m") {
	return Se(e, t);
}
function Kn(e, t = "m") {
	return Ce(e, t);
}
function qn(e) {
	return `${Gn(e, 1)}°`;
}
//#endregion
//#region src/core/measure/MeasurementStore.ts
var Jn = "olcad:measure", Yn = {
	distance: "Distance",
	area: "Area",
	angle: "Angle"
}, Xn = {
	distance: 2,
	area: 3,
	angle: 3
}, Zn = "rgba(251, 191, 36, 0.95)", Qn = new te({
	color: Zn,
	width: 2
}), $n = new te({
	color: Zn,
	width: 2,
	lineDash: [6, 4]
}), er = new h({ color: "rgba(251, 191, 36, 0.15)" }), tr = new m({
	stroke: Qn,
	fill: er
}), nr = new m({
	stroke: $n,
	fill: er
}), Q = /* @__PURE__ */ new Map();
function rr(e, t) {
	let n = `${+!!t}${e}`, r = Q.get(n);
	return r || (r = new m({
		text: new ce({
			text: e,
			font: `${t ? "600 " : ""}12px system-ui, sans-serif`,
			fill: new h({ color: "#fff" }),
			backgroundFill: new h({ color: "rgba(17, 24, 39, 0.8)" }),
			padding: [
				2,
				4,
				2,
				4
			],
			offsetY: t ? -14 : 0,
			overflow: !0
		}),
		zIndex: t ? 3 : 2
	}), Q.size > 500 && Q.clear(), Q.set(n, r)), r;
}
function $(e, t, n, r = [], i = "m") {
	if (n.length < Xn[t]) return null;
	let a;
	if (t === "distance") {
		let { total: t, segments: r } = X(e, n);
		a = {
			length: t,
			segments: r
		};
	} else if (t === "area") {
		let { area: t, perimeter: i } = Un(e, [n, ...r]);
		a = {
			area: t,
			perimeter: i
		};
	} else {
		let { angle: e, reflex: t } = Wn(n[0], n[1], n[2]);
		a = {
			angle: e,
			reflex: t
		};
	}
	return {
		values: a,
		label: ir(t, a, i)
	};
}
function ir(e, t, n = "m") {
	return e === "distance" ? Z(t.length ?? 0, n) : e === "area" ? `${Kn(t.area ?? 0, n)} · ${Z(t.perimeter ?? 0, n)}` : qn(t.angle ?? 0);
}
function ar(e) {
	return me(e.coordinates);
}
var or = (e, t) => [(e[0] + t[0]) / 2, (e[1] + t[1]) / 2];
function sr(t, n, r, i, a, s, c = "m") {
	let l = [], f = (t) => {
		let n = new e(t);
		n.setStyle(s ? nr : tr), l.push(n);
	}, p = (t, n, r) => {
		let i = new e(new u(t));
		i.setStyle(rr(n, r)), l.push(i);
	};
	if (n.length < 2) return l;
	if (t === "distance") {
		f(new o(n));
		let e = i?.segments ?? [];
		e.length > 1 && e.forEach((e, t) => p(or(n[t], n[t + 1]), Z(e, c), !1)), a && p(n[n.length - 1], a, !0);
	} else if (t === "area") {
		if (n.length < 3) return f(new o(n)), l;
		let e = new d([[...n, n[0]], ...r.map((e) => [...e, e[0]])]);
		f(e), a && p(e.getInteriorPoint().getCoordinates().slice(0, 2), a, !0);
	} else if (f(new o(n.slice(0, 3))), n.length === 3 && i?.angle !== void 0) {
		let [e, t, r] = n, i = [e, r].map((e) => Math.hypot(e[0] - t[0], e[1] - t[1])), s = Math.min(...i) * .3;
		if (s > 0) {
			let n = Math.atan2(e[1] - t[1], e[0] - t[0]), i = Math.atan2(r[1] - t[1], r[0] - t[0]) - n;
			for (; i > Math.PI;) i -= 2 * Math.PI;
			for (; i < -Math.PI;) i += 2 * Math.PI;
			let c = [];
			for (let e = 0; e <= 24; e++) {
				let r = n + i * e / 24;
				c.push([t[0] + s * Math.cos(r), t[1] + s * Math.sin(r)]);
			}
			f(new o(c)), a && p(c[12], a, !0);
		}
	}
	return l;
}
var cr = class {
	layer;
	source = new ee();
	liveSource = new ee();
	liveLayer;
	items = [];
	counters = {
		distance: 0,
		area: 0,
		angle: 0
	};
	nextId = 1;
	live = null;
	getProjection;
	events;
	getUnit;
	constructor(e, t, n = () => "m") {
		this.getProjection = e, this.events = t, this.getUnit = n;
		let r = {
			zIndex: 1002,
			updateWhileAnimating: !0,
			updateWhileInteracting: !0,
			properties: { [Jn]: !0 }
		};
		this.layer = new p({
			source: this.source,
			...r
		}), this.liveLayer = new p({
			source: this.liveSource,
			...r
		});
	}
	list() {
		return this.items.map((e) => ({ ...e }));
	}
	get(e) {
		let t = this.items.find((t) => t.id === e);
		return t ? { ...t } : void 0;
	}
	add(e, t, n = {}) {
		let r = t.map((e) => [e[0], e[1]]), i = n.holes?.map((e) => e.map((e) => [e[0], e[1]])), a = $(this.getProjection(), e, r, i, this.getUnit());
		if (!a) return null;
		this.counters[e]++;
		let o = {
			id: `m${this.nextId++}`,
			kind: e,
			name: `${Yn[e]} ${this.counters[e]}`,
			coordinates: r,
			...i?.length ? { holes: i } : {},
			values: a.values,
			label: a.label,
			...n.source ? { source: { ...n.source } } : {}
		};
		return this.items.push(o), this.redraw(), this.events.change(this.list()), { ...o };
	}
	remove(e) {
		let t = this.items.findIndex((t) => t.id === e);
		return t < 0 ? !1 : (this.items.splice(t, 1), this.redraw(), this.events.change(this.list()), !0);
	}
	clear() {
		this.items.length !== 0 && (this.items.length = 0, this.redraw(), this.events.change(this.list()));
	}
	setLive(e, t = []) {
		if (this.liveSource.clear(!0), !e || t.length === 0) return this.live && (this.live = null, this.events.live(null)), null;
		let n = $(this.getProjection(), e, t, [], this.getUnit());
		return this.live = {
			id: "live",
			kind: e,
			name: Yn[e],
			coordinates: t.map((e) => [e[0], e[1]]),
			values: n?.values ?? {},
			label: n?.label ?? ""
		}, this.liveSource.addFeatures(sr(e, t, [], n?.values ?? null, n?.label ?? null, !0, this.getUnit())), this.events.live({ ...this.live }), { ...this.live };
	}
	getLive() {
		return this.live ? { ...this.live } : null;
	}
	reproject(e, t) {
		let n = (n) => i(n, e, t);
		for (let e of this.items) e.coordinates = e.coordinates.map(n), e.holes &&= e.holes.map((e) => e.map(n));
		this.setLive(null), this.redraw(), this.items.length && this.events.change(this.list());
	}
	relabel() {
		let e = this.getUnit();
		for (let t of this.items) t.label = ir(t.kind, t.values, e);
		this.live && this.setLive(this.live.kind, this.live.coordinates), this.redraw(), this.items.length && this.events.change(this.list());
	}
	redraw() {
		let e = this.getUnit();
		this.source.clear(!0), this.source.addFeatures(this.items.flatMap((t) => sr(t.kind, t.coordinates, t.holes ?? [], t.values, t.label, !1, e)));
	}
};
//#endregion
export { Se as $, z as A, Rt as B, on as C, Zt as D, en as E, Wt as F, Dt as G, Bt as H, I, wt as J, b as K, Ht as L, R as M, Kt as N, L as O, Gt as P, Ce as Q, Vt as R, an as S, cn as T, Mt as U, zt as V, Ot as W, g as X, Ct as Y, ye as Z, ln as _, qn as a, ve as at, sn as b, Wn as c, q as d, xe as et, J as f, wn as g, U as h, ar as i, _e as it, Yt as j, Xt as k, Un as l, vn as m, cr as n, v as nt, Kn as o, Ln as p, St as q, $ as r, be as rt, Z as s, Xn as t, ge as tt, X as u, pn as v, B as w, V as x, tn as y, Ut as z };

//# sourceMappingURL=MeasurementStore-yIAXsGId.js.map