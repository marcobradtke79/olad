import { $ as e, A as t, B as n, C as r, D as i, E as a, F as o, G as s, H as c, I as l, J as u, K as d, L as f, M as p, N as m, O as h, P as g, Q as _, R as v, S as ee, T as y, U as b, V as x, W as te, X as S, Y as ne, Z as re, _ as ie, a as ae, at as oe, b as se, c as ce, d as le, et as ue, f as de, g as fe, h as pe, it as me, j as C, k as he, l as ge, m as _e, n as ve, nt as ye, o as be, p as xe, q as Se, r as Ce, rt as we, s as Te, t as Ee, tt as De, u as Oe, v as ke, w as Ae, x as je, y as w, z as Me } from "./MeasurementStore-yIAXsGId.js";
import T from "ol/Feature";
import Ne from "ol/Map";
import Pe from "ol/View";
import { get as E, transform as Fe, transformExtent as Ie } from "ol/proj";
import Le from "ol/geom/GeometryCollection";
import D from "ol/geom/LineString";
import O from "ol/geom/MultiLineString";
import k from "ol/geom/MultiPoint";
import A from "ol/geom/MultiPolygon";
import j from "ol/geom/Point";
import M from "ol/geom/Polygon";
import N from "ol/format/GeoJSON";
import P from "ol/layer/Vector";
import F from "ol/source/Vector";
import I from "ol/style/Stroke";
import L from "ol/style/Style";
import { squaredDistance as Re, squaredDistanceToSegment as ze } from "ol/coordinate";
import Be from "ol/geom/LinearRing";
import R from "ol/layer/Tile";
import Ve from "ol/layer/Image";
import He from "ol/layer/VectorTile";
import Ue from "ol/layer/WebGLTile";
import We from "ol/source/OSM";
import Ge from "ol/source/XYZ";
import Ke from "ol/source/TileWMS";
import qe from "ol/source/ImageWMS";
import Je, { optionsFromCapabilities as Ye } from "ol/source/WMTS";
import Xe from "ol/source/VectorTile";
import Ze from "ol/source/GeoTIFF";
import Qe from "ol/format/WMTSCapabilities";
import $e from "ol/format/MVT";
import et from "ol/format/TopoJSON";
import tt from "ol/format/GML2";
import nt from "ol/format/GML3";
import rt from "ol/format/GML32";
import it from "ol/format/GPX";
import at from "ol/format/KML";
import ot from "ol/format/WFS";
import st from "ol/format/WKT";
import { all as ct, bbox as lt } from "ol/loadingstrategy";
import { flatStylesToStyleFunction as ut, rulesToStyleFunction as dt } from "ol/render/canvas/style";
import z from "ol/style/Fill";
import ft from "ol/style/Text";
import B from "ol/style/Circle";
import { register as pt } from "ol/proj/proj4";
import mt from "ol/Collection";
import ht from "ol/geom/Geometry";
import gt from "ol/style/RegularShape";
import { getVectorContext as _t } from "ol/render";
import vt from "ol/interaction/Interaction";
import { boundingExtent as yt, buffer as bt, extend as xt, getCenter as St, getHeight as Ct, getWidth as wt } from "ol/extent";
import { platformModifierKeyOnly as Tt, shiftKeyOnly as Et } from "ol/events/condition";
import Dt from "ol/interaction/DragBox";
import Ot from "ol/interaction/Select";
import kt from "ol/interaction/Pointer";
var At = [0, 0];
function jt(e) {
	return {
		...e,
		title: e.title ?? e.id,
		visible: e.visible ?? !1
	};
}
function Mt(e) {
	return e === !0 ? {
		insert: !0,
		update: !0,
		delete: !0
	} : e ? {
		insert: e.insert ?? !1,
		update: e.update ?? !1,
		delete: e.delete ?? !1,
		...e.predicate ? { predicate: e.predicate } : {}
	} : {
		insert: !1,
		update: !1,
		delete: !1
	};
}
var Nt = {
	property: "text",
	heightProperty: "textHeight",
	rotationProperty: "textRotation",
	height: 2.5,
	color: "#111827",
	haloColor: "rgba(255, 255, 255, 0.85)",
	font: "sans-serif"
};
function Pt(e) {
	if (e) return {
		...Nt,
		...e === !0 ? {} : e
	};
}
function Ft(e) {
	let t = e.source.format ?? "geojson", n = t === "wfs" || e.source.loader ? "bbox" : "all", { text: r, ...i } = e, a = Pt(r);
	return {
		...i,
		title: e.title ?? e.id,
		visible: e.visible ?? !0,
		editable: Mt(e.editable),
		snappable: e.snappable ?? !0,
		source: {
			...e.source,
			format: t,
			strategy: e.source.strategy ?? n
		},
		...a ? { text: a } : {}
	};
}
function It(e) {
	let t = (e.basemaps ?? []).map(jt);
	return t.length > 0 && !t.some((e) => e.visible) && (t[0].visible = !0), {
		...e.target === void 0 ? {} : { target: e.target },
		...e.map === void 0 ? {} : { map: e.map },
		...e.proj4 === void 0 ? {} : { proj4: e.proj4 },
		view: {
			...e.view,
			projection: e.view?.projection ?? "EPSG:3857",
			center: e.view?.center ?? At,
			zoom: e.view?.zoom ?? 2
		},
		projections: (e.projections ?? []).map((e) => ({ ...e })),
		basemaps: t,
		layers: (e.layers ?? []).map(Ft),
		editMode: e.editMode ?? !1,
		cursor: {
			crosshair: !0,
			pickBoxSize: 8,
			color: "#1f2933",
			pickColor: "#facc15",
			angle: 0,
			...e.cursor
		},
		changes: {
			fullFeatures: !1,
			...e.changes
		},
		locale: e.locale ?? "en",
		messages: { ...e.messages },
		selection: {
			strokeColor: "#22d3ee",
			strokeWidth: 3,
			fillColor: "rgba(34, 211, 238, 0.15)",
			pointRadius: 8,
			haloColor: "rgba(255, 255, 255, 0.6)",
			haloWidth: 3,
			vertexSize: 6,
			inspect: !0,
			...e.selection
		},
		layerHighlight: {
			strokeColor: "#f59e0b",
			strokeWidth: 3,
			fillColor: "rgba(245, 158, 11, 0.2)",
			pointRadius: 7,
			...e.layerHighlight
		},
		snapping: {
			enabled: !0,
			tolerancePx: 12,
			modes: [
				"vertex",
				"midpoint",
				"perpendicular"
			],
			...e.snapping
		},
		grid: {
			enabled: !1,
			spacing: 10,
			visible: !0,
			...e.grid,
			origin: e.grid?.origin ? [e.grid.origin[0], e.grid.origin[1]] : [0, 0]
		},
		curves: {
			tolerance: .01,
			...e.curves
		},
		units: {
			length: "auto",
			...e.units
		},
		constraints: { angle: {
			enabled: !1,
			step: 90,
			...e.constraints?.angle
		} },
		draft: {
			enabled: !0,
			id: "draft",
			title: "Draft",
			...e.draft
		}
	};
}
//#endregion
//#region src/core/i18n.ts
var Lt = {
	en: {
		"geometry-type": "Expected a {expected} geometry, got {actual}.",
		"empty-geometry": "The geometry is empty.",
		"too-few-vertices": "At least {minimum} vertices are required, got {actual}.",
		"ring-not-closed": "The ring is not closed.",
		"zero-length-segment": "Segment {segment} has zero length.",
		"self-intersection": "The ring intersects itself (segments {segment} and {other}).",
		"layer-unknown": "Unknown layer \"{layer}\".",
		"not-editable": "Layer \"{layer}\" does not allow {operation}.",
		"feature-without-id": "The feature has no id and cannot be updated or deleted.",
		"feature-not-in-layer": "The feature does not belong to an editor layer.",
		"input-invalid": "Not a coordinate or length: use x,y · @dx,dy · @distance<angle · distance; lengths may carry a unit (5 ft, 2.5 m).",
		"input-no-tool": "No tool takes input: switch on edit mode and start drawing.",
		"input-no-reference": "No previous point: type an absolute x,y first.",
		"input-not-accepted": "The active tool did not accept the input."
	},
	de: {
		"geometry-type": "Erwartet wurde eine {expected}-Geometrie, erhalten {actual}.",
		"empty-geometry": "Die Geometrie ist leer.",
		"too-few-vertices": "Mindestens {minimum} Stützpunkte sind nötig, erhalten {actual}.",
		"ring-not-closed": "Der Ring ist nicht geschlossen.",
		"zero-length-segment": "Segment {segment} hat die Länge null.",
		"self-intersection": "Der Ring schneidet sich selbst (Segmente {segment} und {other}).",
		"layer-unknown": "Unbekannter Layer \"{layer}\".",
		"not-editable": "Layer \"{layer}\" erlaubt {operation} nicht.",
		"feature-without-id": "Das Objekt hat keine Id und kann nicht geändert oder gelöscht werden.",
		"feature-not-in-layer": "Das Objekt gehört zu keinem Editor-Layer.",
		"input-invalid": "Keine Koordinate oder Länge: x,y · @dx,dy · @Abstand<Winkel · Abstand; Längen auch mit Einheit (5 ft, 2.5 m).",
		"input-no-tool": "Kein Werkzeug nimmt Eingaben an: Bearbeitungsmodus einschalten und zeichnen.",
		"input-no-reference": "Kein vorheriger Punkt: zuerst ein absolutes x,y eingeben.",
		"input-not-accepted": "Das aktive Werkzeug hat die Eingabe nicht übernommen."
	}
};
function Rt(e, t, n, r = {}) {
	return (t[n] ?? Lt[e][n] ?? Lt.en[n] ?? n).replace(/\{(\w+)\}/g, (e, t) => t in r ? String(r[t]) : e);
}
//#endregion
//#region src/core/changes/ChangeTracker.ts
function V(e) {
	let t = { ...e.getProperties() };
	return delete t[e.getGeometryName()], t;
}
function zt(e, t) {
	if (!e || !t) return !e && !t;
	if (e.getType() !== t.getType()) return !1;
	let n = e.getCoordinates?.(), r = t.getCoordinates?.();
	return n === void 0 || r === void 0 ? e === t : JSON.stringify(n) === JSON.stringify(r);
}
function Bt(e, t) {
	return e === t ? !0 : e === void 0 || t === void 0 || e === null || t === null ? !1 : typeof e == "object" && typeof t == "object" && JSON.stringify(e) === JSON.stringify(t);
}
var Vt = class {
	entries = /* @__PURE__ */ new Map();
	entry(e) {
		return this.entries.get(e);
	}
	touch(e, t) {
		let n = this.entries.get(e);
		return n || (n = {
			layer: t,
			inserted: !1,
			deleted: !1,
			snapshot: {
				geometry: e.getGeometry()?.clone() ?? null,
				properties: V(e)
			}
		}, this.entries.set(e, n)), n;
	}
	markInserted(e, t, n) {
		let r = this.touch(e, t);
		r.inserted = !0, r.deleted = !1, r.tempId = n;
	}
	unmarkInserted(e) {
		this.entries.delete(e);
	}
	markDeleted(e, t) {
		this.touch(e, t).deleted = !0;
	}
	unmarkDeleted(e) {
		let t = this.entries.get(e);
		t && (t.deleted = !1);
	}
	netOperation(e) {
		let t = this.entries.get(e);
		return t ? t.inserted ? t.deleted ? null : "insert" : t.deleted ? "delete" : this.changedKeys(e).length > 0 ? "update" : null : null;
	}
	changedKeys(e) {
		let t = this.entries.get(e);
		if (!t) return [];
		let n = [];
		zt(t.snapshot.geometry, e.getGeometry()) || n.push("geometry");
		let r = V(e), i = /* @__PURE__ */ new Set([...Object.keys(t.snapshot.properties), ...Object.keys(r)]);
		for (let e of i) Bt(t.snapshot.properties[e], r[e]) || n.push(e);
		return n;
	}
	isTouched(e) {
		return this.entries.has(e);
	}
	isGeometryModified(e) {
		let t = this.entries.get(e);
		return t ? t.inserted || !zt(t.snapshot.geometry, e.getGeometry()) : !1;
	}
	isDeletedId(e, t) {
		for (let [n, r] of this.entries) if (r.layer === e && r.deleted && !r.inserted && n.getId() === t) return !0;
		return !1;
	}
	all() {
		return [...this.entries];
	}
	hasChanges() {
		for (let e of this.entries.keys()) if (this.netOperation(e)) return !0;
		return !1;
	}
	restore(e) {
		let t = this.entries.get(e);
		if (t) {
			e.setGeometry(t.snapshot.geometry?.clone() ?? void 0);
			for (let n of Object.keys(V(e))) n in t.snapshot.properties || e.unset(n);
			e.setProperties({ ...t.snapshot.properties });
		}
	}
	reproject(e, t) {
		for (let n of this.entries.values()) n.snapshot.geometry?.transform(e, t);
	}
	dropLayer(e) {
		for (let [t, n] of this.entries) n.layer === e && this.entries.delete(t);
	}
	clear() {
		this.entries.clear();
	}
};
//#endregion
//#region src/core/changes/exportChangeSet.ts
function Ht(e) {
	return JSON.parse(JSON.stringify(e));
}
function Ut(e) {
	let t = new N(), n = (n, r) => {
		let i = n.getGeometry();
		return i ? t.writeGeometryObject(i, {
			dataProjection: r,
			featureProjection: e.viewProjection,
			decimals: e.options.precision
		}) : null;
	}, r = [];
	for (let [t, i] of e.tracker.all()) {
		let a = e.tracker.netOperation(t);
		if (!a) continue;
		let o = e.options.crs ?? e.dataProjection(i.layer), s = {
			layer: i.layer,
			crs: o
		};
		if (a === "insert") r.push({
			op: a,
			...s,
			tempId: i.tempId,
			geometry: n(t, o),
			properties: Ht(V(t))
		});
		else if (a === "delete") r.push({
			op: a,
			...s,
			id: t.getId()
		});
		else {
			let i = e.tracker.changedKeys(t), c = V(t), l = e.options.fullFeatures ? Object.keys(c) : i.filter((e) => e !== "geometry"), u = {};
			for (let e of l) u[e] = c[e] === void 0 ? null : c[e];
			let d = {
				op: a,
				...s,
				id: t.getId(),
				changed: i
			};
			(e.options.fullFeatures || i.includes("geometry")) && (d.geometry = n(t, o)), (e.options.fullFeatures || l.length > 0) && (d.properties = Ht(u)), r.push(d);
		}
	}
	let i = {
		version: 1,
		changes: r
	}, a = r[0]?.crs;
	return a !== void 0 && r.every((e) => e.crs === a) && (i.crs = a), i;
}
//#endregion
//#region src/core/changes/Editing.ts
var Wt = {
	insert: "insert",
	updateGeometry: "update",
	updateProperties: "update",
	delete: "delete"
}, Gt = class {
	tracker = new Vt();
	undoStack = [];
	redoStack = [];
	layers;
	options;
	tempCounter = 0;
	constructor(e) {
		this.options = e, this.layers = e.layers;
	}
	execute(e) {
		let t = Me(e);
		for (let n of t) {
			let t = this.validate(n, e);
			if (t) return this.options.events.validationerror(t), !1;
		}
		let n = e.type === "composite" ? {
			type: "composite",
			records: t.map((e) => this.apply(e))
		} : this.apply(e);
		this.undoStack.push(n), this.redoStack.length = 0, this.notify();
		for (let e of t) e.type === "insert" && this.options.events.featureinsert({
			layer: e.layer,
			feature: e.feature,
			...e.template === void 0 ? {} : { template: e.template },
			...e.imported ? { imported: !0 } : {}
		});
		return !0;
	}
	canUndo() {
		return this.undoStack.length > 0;
	}
	canRedo() {
		return this.redoStack.length > 0;
	}
	undo() {
		let e = this.undoStack.pop();
		return e ? (this.revert(e), this.redoStack.push(e), this.notify(), !0) : !1;
	}
	redo() {
		let e = this.redoStack.pop();
		return e ? (this.reapply(e), this.undoStack.push(e), this.notify(), !0) : !1;
	}
	getChangeSet() {
		return Ut({
			tracker: this.tracker,
			dataProjection: (e) => this.layers.dataProjection(e),
			viewProjection: this.options.getProjection(),
			options: this.options.changes
		});
	}
	hasChanges() {
		return this.tracker.hasChanges();
	}
	accept(e = {}) {
		let t = this.options.getProjection();
		for (let [n, r] of this.tracker.all()) {
			if (r.deleted) {
				this.layers.originals.delete(n);
				continue;
			}
			if (r.inserted && r.tempId !== void 0) {
				let t = e.idMap?.[r.tempId];
				t !== void 0 && n.setId(t);
			}
			let i = n.getGeometry();
			if (i) {
				let e = this.layers.dataProjection(r.layer);
				this.layers.originals.set(n, e, i.clone().transform(t, e));
			}
		}
		this.reset();
	}
	discard() {
		for (let [e, t] of this.tracker.all()) {
			let n = this.layers.getSource(t.layer);
			t.inserted ? n.hasFeature(e) && n.removeFeature(e) : (this.tracker.restore(e), t.deleted && !n.hasFeature(e) && n.addFeature(e));
		}
		this.reset();
	}
	reproject(e, t) {
		this.tracker.reproject(e, t);
		let n = (r) => {
			r.type === "updateGeometry" ? (r.before?.transform(e, t), r.after.transform(e, t)) : r.type === "composite" && r.records.forEach(n);
		};
		this.undoStack.forEach(n), this.redoStack.forEach(n);
	}
	dropLayer(e) {
		this.tracker.dropLayer(e), this.undoStack.length = 0, this.redoStack.length = 0, this.notify();
	}
	canEdit(e, t) {
		let n = this.layers.layerOf(t) ?? this.tracker.entry(t)?.layer;
		return n === void 0 ? !1 : e !== "insert" && this.tracker.entry(t)?.inserted ? !0 : this.layers.canEdit(n, e, t);
	}
	shouldLoad(e, t) {
		return !this.tracker.isDeletedId(e, t);
	}
	reset() {
		this.tracker.clear(), this.undoStack.length = 0, this.redoStack.length = 0, this.notify();
	}
	notify() {
		this.options.events.historychange({
			canUndo: this.canUndo(),
			canRedo: this.canRedo()
		}), this.options.events.change(this.getChangeSet());
	}
	validate(e, t) {
		let n = (e, n = {}, r, i) => ({
			code: e,
			message: Rt(this.options.locale, this.options.messages, e, n),
			command: t,
			...r === void 0 ? {} : { layer: r },
			...i === void 0 ? {} : { featureId: i }
		}), r = Wt[e.type], i, a = e.feature;
		if (e.type === "insert") {
			if (i = e.layer, !this.layers.has(i)) return n("layer-unknown", { layer: i });
		} else {
			if (i = this.layers.layerOf(a) ?? this.tracker.entry(a)?.layer, i === void 0) return n("feature-not-in-layer");
			if (a.getId() === void 0) return n("feature-without-id", {}, i);
		}
		let o = a.getId();
		if (!(e.type === "insert" ? this.layers.canEdit(i, "insert") : this.canEdit(r, a))) return n("not-editable", {
			layer: i,
			operation: r
		}, i, o);
		let s = e.type === "insert" ? a.getGeometry() : e.type === "updateGeometry" ? e.geometry : void 0;
		if (e.type === "insert" || e.type === "updateGeometry") {
			let e = b(s, this.layers.getConfig(i).geometryType);
			if (e) return n(e.code, e.params, i, o);
		}
		return null;
	}
	apply(e) {
		switch (e.type) {
			case "insert": {
				let t = `tmp-${++this.tempCounter}`, n = {
					type: "insert",
					layer: e.layer,
					feature: e.feature,
					tempId: t
				};
				return this.reapply(n), n;
			}
			case "updateGeometry": {
				let { feature: t } = e, n = {
					type: "updateGeometry",
					feature: t,
					before: t.getGeometry()?.clone(),
					after: e.geometry.clone()
				};
				return this.reapply(n), n;
			}
			case "updateProperties": {
				let { feature: t } = e, n = V(t), r = {};
				for (let t of Object.keys(e.properties)) r[t] = n[t];
				let i = {
					type: "updateProperties",
					feature: t,
					before: r,
					after: { ...e.properties }
				};
				return this.reapply(i), i;
			}
			case "delete": {
				let t = {
					type: "delete",
					layer: this.layers.layerOf(e.feature),
					feature: e.feature
				};
				return this.reapply(t), t;
			}
		}
	}
	isTracked(e) {
		return this.options.isTracked?.(e) ?? !0;
	}
	reapply(e) {
		switch (e.type) {
			case "insert":
				e.feature.setId(e.tempId), this.layers.getSource(e.layer).addFeature(e.feature), this.isTracked(e.layer) && this.tracker.markInserted(e.feature, e.layer, e.tempId);
				break;
			case "updateGeometry": {
				let t = this.layerOf(e.feature);
				this.isTracked(t) && this.tracker.touch(e.feature, t), e.feature.setGeometry(e.after.clone());
				break;
			}
			case "updateProperties": {
				let t = this.layerOf(e.feature);
				this.isTracked(t) && this.tracker.touch(e.feature, t), Kt(e.feature, e.after);
				break;
			}
			case "delete":
				this.isTracked(e.layer) && this.tracker.markDeleted(e.feature, e.layer), this.layers.getSource(e.layer).removeFeature(e.feature);
				break;
			case "composite": for (let t of e.records) this.reapply(t);
		}
	}
	revert(e) {
		switch (e.type) {
			case "insert":
				this.layers.getSource(e.layer).removeFeature(e.feature), this.isTracked(e.layer) && this.tracker.unmarkInserted(e.feature);
				break;
			case "updateGeometry":
				e.feature.setGeometry(e.before?.clone());
				break;
			case "updateProperties":
				Kt(e.feature, e.before);
				break;
			case "delete":
				this.layers.getSource(e.layer).addFeature(e.feature), this.isTracked(e.layer) && this.tracker.unmarkDeleted(e.feature);
				break;
			case "composite": for (let t of [...e.records].reverse()) this.revert(t);
		}
	}
	layerOf(e) {
		return this.layers.layerOf(e) ?? this.tracker.entry(e).layer;
	}
};
function Kt(e, t) {
	for (let [n, r] of Object.entries(t)) r === void 0 ? e.unset(n) : e.set(n, r);
}
//#endregion
//#region src/core/crosshair.ts
var qt = "olcad-crosshair", Jt = 1e4, Yt = [
	"h-left",
	"h-right",
	"v-top",
	"v-bottom",
	"box",
	"snap"
], Xt = class {
	element;
	viewport;
	pivot;
	parts;
	options;
	position = null;
	picking = !1;
	snapPixel = null;
	constructor(e, t) {
		this.viewport = e, this.options = { ...t };
		let n = e.ownerDocument;
		this.element = n.createElement("div"), this.element.className = qt, Object.assign(this.element.style, {
			position: "absolute",
			inset: "0",
			pointerEvents: "none",
			zIndex: "1000",
			overflow: "hidden",
			display: "none"
		}), this.pivot = n.createElement("div"), this.pivot.className = `${qt}__pivot`, Object.assign(this.pivot.style, {
			position: "absolute",
			left: "0",
			top: "0"
		}), this.element.append(this.pivot), this.parts = {};
		for (let e of Yt) {
			let t = n.createElement("div");
			t.className = `${qt}__${e}`, t.style.position = "absolute", t.style.boxSizing = "border-box", this.pivot.append(t), this.parts[e] = t;
		}
		this.applyOptions(), e.append(this.element), e.addEventListener("pointermove", this.onPointerMove), e.addEventListener("pointerenter", this.onPointerMove), e.addEventListener("pointerleave", this.onLeave);
	}
	setOptions(e) {
		this.options = {
			...this.options,
			...e
		}, this.applyOptions(), this.position && this.moveTo(this.position[0], this.position[1]);
	}
	setPicking(e) {
		this.picking = e, this.element.classList.toggle(`${qt}--picking`, e), this.applyOptions();
	}
	onLeave = () => {
		this.setSnap(null), this.hide();
	};
	get visible() {
		return this.element.style.display !== "none";
	}
	moveTo(e, t) {
		this.position = [e, t];
		let [n, r] = this.snapPixel ?? [e, t];
		this.pivot.style.transform = `translate(${n}px, ${r}px) rotate(${-this.options.angle}deg)`, this.element.style.display = "";
	}
	setSnap(e, t) {
		this.snapPixel = e;
		let n = this.parts.snap;
		e && t ? n.dataset.mode = t : delete n.dataset.mode, this.applyOptions(), this.position && this.moveTo(this.position[0], this.position[1]);
	}
	get drawnAt() {
		return this.snapPixel ?? this.position;
	}
	hide = () => {
		this.element.style.display = "none", this.position = null;
	};
	destroy() {
		this.viewport.removeEventListener("pointermove", this.onPointerMove), this.viewport.removeEventListener("pointerenter", this.onPointerMove), this.viewport.removeEventListener("pointerleave", this.onLeave), this.element.remove();
	}
	applyOptions() {
		let { color: e, pickBoxSize: t, pickColor: n } = this.options, r = t / 2, { parts: i } = this, a = (e) => `${e}px`, o = Jt;
		Object.assign(i["h-left"].style, {
			left: a(-1e4),
			width: a(o - r),
			top: "0",
			height: "1px",
			background: e
		}), Object.assign(i["h-right"].style, {
			left: a(r),
			width: a(o),
			top: "0",
			height: "1px",
			background: e
		}), Object.assign(i["v-top"].style, {
			top: a(-1e4),
			height: a(o - r),
			left: "0",
			width: "1px",
			background: e
		}), Object.assign(i["v-bottom"].style, {
			top: a(r),
			height: a(o),
			left: "0",
			width: "1px",
			background: e
		}), Object.assign(i.box.style, {
			left: a(-r),
			top: a(-r),
			width: a(t),
			height: a(t),
			border: `1px solid ${this.picking ? n : e}`,
			background: "transparent"
		});
		let s = t + 6, c = i.snap, l = c.dataset.mode;
		c.style.borderRadius = l === "grid" || l === "tangent" ? "50%" : "0", l === "midpoint" ? Object.assign(c.style, {
			left: a(-s / 2),
			top: a(-s / 2),
			width: "0",
			height: "0",
			border: "none",
			borderLeft: `${s / 2}px solid transparent`,
			borderRight: `${s / 2}px solid transparent`,
			borderBottom: `${s}px solid ${n}`,
			background: "transparent",
			opacity: "0.7"
		}) : l === "perpendicular" ? Object.assign(c.style, {
			left: a(-s / 2),
			top: a(-s / 2),
			width: a(s),
			height: a(s),
			border: "none",
			borderLeft: `2px solid ${n}`,
			borderRight: "none",
			borderBottom: `2px solid ${n}`,
			background: "transparent",
			opacity: "1"
		}) : Object.assign(c.style, {
			left: a(-s / 2),
			top: a(-s / 2),
			width: a(s),
			height: a(s),
			border: `2px solid ${n}`,
			borderTop: `${l === "tangent" ? 4 : 2}px solid ${n}`,
			borderLeft: `2px solid ${n}`,
			borderRight: `2px solid ${n}`,
			borderBottom: `2px solid ${n}`,
			background: "transparent",
			opacity: "1"
		}), c.style.display = l ? "" : "none";
	}
	onPointerMove = (e) => {
		if (e.target?.closest?.(".ol-control")) {
			this.hide();
			return;
		}
		let t = this.viewport.getBoundingClientRect();
		this.moveTo(e.clientX - t.left, e.clientY - t.top);
	};
}, H = /* @__PURE__ */ new WeakMap();
function Zt(e, t) {
	if (t) {
		if (H.has(e)) return;
		H.set(e, e.style.cursor), e.style.cursor = "none";
	} else {
		if (!H.has(e)) return;
		e.style.cursor = H.get(e) ?? "", H.delete(e);
	}
}
//#endregion
//#region src/core/geometry/segments.ts
function Qt(e) {
	return e instanceof D || e instanceof Be ? [e.getCoordinates()] : e instanceof O || e instanceof M ? e.getCoordinates() : e instanceof A ? e.getCoordinates().flat() : e instanceof Le ? e.getGeometriesArray().flatMap(Qt) : [];
}
function $t(e) {
	let t = [];
	for (let n of Qt(e)) for (let e = 1; e < n.length; e++) t.push([n[e - 1], n[e]]);
	return t;
}
function en(e, t) {
	let n, r = Infinity;
	for (let i of $t(e)) {
		let e = ze(t, i);
		e < r && (r = e, n = i);
	}
	return n;
}
function U(e, t, n) {
	let r = n[0] - t[0], i = n[1] - t[1], a = r * r + i * i;
	if (a === 0) return {
		foot: [t[0], t[1]],
		t: 0
	};
	let o = ((e[0] - t[0]) * r + (e[1] - t[1]) * i) / a;
	return {
		foot: [t[0] + o * r, t[1] + o * i],
		t: o
	};
}
function tn(e) {
	let t = e % 360;
	return t < 0 ? t + 360 : t;
}
function nn(e, t) {
	let n = t[0] - e[0], r = t[1] - e[1], i = tn(Math.atan2(-r, n) * 180 / Math.PI) % 180;
	return Object.is(i, -0) ? 0 : i;
}
//#endregion
//#region src/core/events.ts
var rn = class {
	listeners = /* @__PURE__ */ new Map();
	on(e, t) {
		let n = this.listeners.get(e);
		return n || (n = /* @__PURE__ */ new Set(), this.listeners.set(e, n)), n.add(t), () => this.off(e, t);
	}
	off(e, t) {
		this.listeners.get(e)?.delete(t);
	}
	emit(e, t) {
		let n = this.listeners.get(e);
		if (n) for (let e of [...n]) e(t);
	}
	clear() {
		this.listeners.clear();
	}
}, an = "olcad:basemap";
function on(e) {
	switch (e) {
		case "geojson": return new N();
		case "topojson": return new et();
		default: return new $e();
	}
}
async function sn(e, t, n) {
	let r = await fetch(t.capabilitiesUrl);
	if (!r.ok) throw Error(`GetCapabilities failed: ${r.status} ${r.statusText}`);
	let i = new Qe().read(await r.text()), a = {
		layer: t.layer,
		matrixSet: t.matrixSet,
		format: t.format,
		style: t.style,
		crossOrigin: t.crossOrigin
	}, o = Ye(i, {
		...a,
		projection: n.getProjection()
	}) ?? Ye(i, a);
	if (!o) throw Error(`layer "${t.layer}" not found in capabilities`);
	e.setSource(new Je({
		...o,
		attributions: t.attribution ?? o.attributions
	}));
}
function cn(e, t) {
	let n;
	try {
		n = ln(e, t);
	} catch (r) {
		n = new R(), t.onError(e.id, r instanceof Error ? r : Error(String(r)));
	}
	return n.setVisible(e.visible), n.set(an, e.id), n;
}
function ln(e, t) {
	let n = e.attribution, r;
	switch (e.type) {
		case "osm":
			r = new R({ source: new We({
				attributions: n,
				maxZoom: e.maxZoom
			}) });
			break;
		case "xyz":
			r = new R({ source: new Ge({
				url: e.url,
				attributions: n,
				minZoom: e.minZoom,
				maxZoom: e.maxZoom,
				tileSize: e.tileSize,
				crossOrigin: e.crossOrigin
			}) });
			break;
		case "wms": {
			let t = {
				url: e.url,
				params: e.params,
				attributions: n,
				serverType: e.serverType,
				projection: e.projection,
				crossOrigin: e.crossOrigin
			};
			r = e.tiled === !1 ? new Ve({ source: new qe(t) }) : new R({ source: new Ke(t) });
			break;
		}
		case "wmts": {
			let n = new R();
			r = n, sn(n, e, t).catch((n) => t.onError(e.id, n));
			break;
		}
		case "vector-tile":
			r = new He({
				source: new Xe({
					url: e.url,
					format: on(e.format),
					attributions: n,
					minZoom: e.minZoom,
					maxZoom: e.maxZoom,
					projection: e.projection
				}),
				...e.style ? { style: e.style } : {}
			});
			break;
		case "geotiff": r = new Ue({ source: new Ze({
			sources: e.sources.map((e) => ({
				url: e.url,
				bands: e.bands,
				min: e.min,
				max: e.max,
				nodata: e.nodata
			})),
			normalize: e.normalize,
			convertToRGB: e.convertToRGB,
			...n ? { attributions: n } : {}
		}) });
	}
	return r;
}
var un = 2e3;
function dn(e) {
	return Array.isArray(e) ? e.length > 0 && "style" in e[0] ? dt(e) : ut(e) : ut([e]);
}
function fn(e, t) {
	let n = e.get(t.property);
	if (n == null || n === "") return null;
	let r = e.getGeometry();
	return r instanceof j || r instanceof k ? String(n) : null;
}
function pn(e, t, n, r) {
	return new L({ text: new ft({
		text: e,
		font: `${t}px ${r.font}`,
		fill: new z({ color: r.color }),
		stroke: new I({
			color: r.haloColor,
			width: Math.max(1, Math.min(4, t / 8))
		}),
		rotation: -n * Math.PI / 180,
		rotateWithView: !0,
		textAlign: "left",
		textBaseline: "alphabetic",
		overflow: !0
	}) });
}
function mn(e, t, n) {
	let r = dn(t), i = /* @__PURE__ */ new Map();
	return (t, a) => {
		let o = fn(t, e);
		if (o === null) return r(t, a);
		let s = Number(t.get(e.heightProperty) ?? e.height), c = Number(t.get(e.rotationProperty) ?? 0) || 0, u = t.getGeometry(), d = u instanceof j ? u.getCoordinates() : u.getCoordinates()[0];
		if (!d || !(s > 0) || !(a > 0)) return;
		let f = s * l(n(), d) / a;
		if (f < 1) return;
		let p = Math.round(Math.min(f, un) * 10) / 10, m = `${p}|${c}|${o}`, h = i.get(m);
		return h || (i.size > 1e3 && i.clear(), h = pn(o, p, c, e), i.set(m, h)), h;
	};
}
//#endregion
//#region src/core/layers/vector.ts
var hn = "olcad:layer", gn = "olcad:dataProjection", _n = {
	Point: {
		"circle-radius": 5,
		"circle-fill-color": "#2563eb",
		"circle-stroke-color": "#fff",
		"circle-stroke-width": 1.5
	},
	MultiPoint: {
		"circle-radius": 5,
		"circle-fill-color": "#2563eb",
		"circle-stroke-color": "#fff",
		"circle-stroke-width": 1.5
	},
	LineString: {
		"stroke-color": "#2563eb",
		"stroke-width": 2
	},
	MultiLineString: {
		"stroke-color": "#2563eb",
		"stroke-width": 2
	},
	Polygon: {
		"stroke-color": "#2563eb",
		"stroke-width": 1.5,
		"fill-color": "rgba(37, 99, 235, 0.15)"
	},
	MultiPolygon: {
		"stroke-color": "#2563eb",
		"stroke-width": 1.5,
		"fill-color": "rgba(37, 99, 235, 0.15)"
	},
	Any: {
		"circle-radius": 5,
		"circle-fill-color": "#f59e0b",
		"circle-stroke-color": "#fff",
		"circle-stroke-width": 1.5,
		"stroke-color": "#f59e0b",
		"stroke-width": 2,
		"stroke-line-dash": [6, 4],
		"fill-color": "rgba(245, 158, 11, 0.15)"
	}
};
function vn(e) {
	switch (e) {
		case "2": return new tt();
		case "3.2": return new rt();
		default: return new nt();
	}
}
function yn(e) {
	switch (e.features ? "geojson" : e.format) {
		case "topojson": return new et();
		case "kml": return new at({
			extractStyles: !1,
			showPointNames: !1
		});
		case "gpx": return new it();
		case "wkt": return new st({ splitCollection: !0 });
		case "gml": return vn(e.gmlVersion);
		case "wfs": return bn(e.outputFormat) ? new N() : new ot({
			version: e.version,
			gmlFormat: vn(e.gmlVersion ?? (e.version === "2.0.0" ? "3.2" : "3"))
		});
		default: return new N();
	}
}
var bn = (e) => !!e && /json/i.test(e);
function xn(e, t, n) {
	let r = e.version ?? "1.1.0", i = new URL(e.url, globalThis.location?.href ?? "http://localhost/");
	return i.searchParams.set("service", "WFS"), i.searchParams.set("version", r), i.searchParams.set("request", "GetFeature"), i.searchParams.set(r === "2.0.0" ? "typeNames" : "typeName", e.typeName), i.searchParams.set("srsName", n), e.outputFormat && i.searchParams.set("outputFormat", e.outputFormat), t && t.every(Number.isFinite) && i.searchParams.set("bbox", `${t.join(",")},${n}`), i.toString();
}
function Sn(e) {
	if (!e) return;
	let t = /EPSG:{1,2}(\d+)$|epsg\.xml#(\d+)$|EPSG\/0\/(\d+)$/i.exec(e), n = t?.[1] ?? t?.[2] ?? t?.[3];
	return n && E(`EPSG:${n}`) ? `EPSG:${n}` : E(e)?.getCode();
}
function Cn(e, t, n, r) {
	if (e.dataProjection) return e.dataProjection;
	switch (e.features ? "geojson" : e.format) {
		case "wfs": return r;
		case "gml": return typeof n == "string" && /\bsrsName="([^"]+)"/.exec(n)?.[1] || "EPSG:4326";
		case "kml":
		case "gpx": return "EPSG:4326";
		default: return t.readProjection(n)?.getCode() ?? "EPSG:4326";
	}
}
function wn(e, t, n, r, i) {
	let a = e.source, o = t instanceof N || t instanceof et, s = typeof n == "string" || o ? n : JSON.stringify(n), c = Sn(Cn(a, t, s, r));
	if (!c) throw Error(`layer "${e.id}": unknown data projection`);
	let l = t.readFeatures(s, { dataProjection: c });
	for (let t of l) {
		if (t.getId() === void 0 && e.idProperty) {
			let n = t.get(e.idProperty);
			n != null && t.setId(n);
		}
		let n = t.getGeometry();
		n && (i.set(t, c, n.clone()), c !== r && n.transform(c, r));
	}
	return {
		features: l,
		dataProjection: c
	};
}
async function Tn(e, t, n, r) {
	let i = e.source;
	if (i.features) return {
		type: "FeatureCollection",
		features: i.features
	};
	if (i.data !== void 0) return i.data;
	if (i.loader) return i.loader({
		extent: t,
		resolution: n,
		projection: r
	});
	let a = i.format === "wfs" ? xn(i, i.strategy === "bbox" ? t : void 0, i.dataProjection ?? r) : i.url, o = await fetch(a);
	if (!o.ok) throw Error(`${o.status} ${o.statusText} for ${a}`);
	return o.text();
}
function En(e, t, n = {}) {
	let r = n.flat ?? e.style ?? _n[e.geometryType];
	return e.text ? mn(n.text ? {
		...e.text,
		color: n.text.color,
		haloColor: n.text.halo
	} : e.text, r, t) : r;
}
function Dn(e, t) {
	let n = yn(e.source), r = new F({
		strategy: e.source.strategy === "bbox" ? lt : ct,
		loader: (a, o, s, c, l) => {
			let u = t.getProjection();
			Tn(e, a, o, u).then((a) => {
				let { features: o, dataProjection: s } = wn(e, n, a, u, t.originals);
				i.set(gn, s);
				let l = o.filter((n) => {
					let i = n.getId();
					return i === void 0 ? !0 : r.getFeatureById(i) ? !1 : t.shouldLoad?.(e.id, i) ?? !0;
				});
				r.addFeatures(l), t.onLoad(e.id, l), c?.(l);
			}).catch((n) => {
				t.onError(e.id, n), l?.();
			});
		}
	}), i = new P({
		source: r,
		style: En(e, t.getProjection),
		visible: e.visible,
		minZoom: e.minZoom,
		maxZoom: e.maxZoom
	});
	return i.set(hn, e.id), i;
}
//#endregion
//#region src/core/templates/TemplateStore.ts
var W = "EPSG:4326", On = new N(), G = class extends Error {
	path;
	constructor(e, t) {
		super(`${e}: ${t}`), this.name = "TemplateImportError", this.path = e;
	}
}, kn = class {
	templates = /* @__PURE__ */ new Map();
	nextId = 1;
	onChange;
	constructor(e = () => {}) {
		this.onChange = e;
	}
	list() {
		return [...this.templates.values()].map(jn);
	}
	get(e) {
		return this.templates.get(e);
	}
	suggestName() {
		let e = new Set([...this.templates.values()].map((e) => e.name)), t = 1;
		for (; e.has(`Template ${t}`);) t++;
		return `Template ${t}`;
	}
	create(e, t, n) {
		if (e.length === 0) throw Error("A template needs at least one object");
		let r = [];
		for (let { feature: t, layer: n, idProperty: i } of e) {
			let e = t.getGeometry();
			e && r.push({
				layer: n,
				geometry: e.clone(),
				properties: An(t, i)
			});
		}
		if (r.length === 0) throw Error("A template needs at least one object with a geometry");
		let i = this.freshId(), a = n?.trim();
		return this.templates.set(i, {
			id: i,
			name: a || this.suggestName(),
			base: [t[0], t[1]],
			features: r
		}), this.onChange({
			id: i,
			type: "add"
		}), i;
	}
	rename(e, t) {
		let n = this.require(e), r = t.trim();
		if (!r) throw Error("A template name must not be empty");
		n.name !== r && (n.name = r, this.onChange({
			id: e,
			type: "rename"
		}));
	}
	remove(e) {
		this.require(e), this.templates.delete(e), this.onChange({
			id: e,
			type: "remove"
		});
	}
	clear() {
		this.templates.clear();
	}
	reproject(e, t) {
		for (let n of this.templates.values()) {
			n.base = Fe(n.base, e, t);
			for (let r of n.features) r.geometry.transform(e, t);
		}
	}
	placed(e, t, n) {
		let [r, i] = e.base, a = l(n, t) / l(n, e.base);
		return e.features.map(({ geometry: e }) => {
			let n = e.clone();
			return n.translate(t[0] - r, t[1] - i), Number.isFinite(a) && Math.abs(a - 1) > 1e-12 && n.scale(a, a, t), n;
		});
	}
	export(e) {
		return [...this.templates.values()].map((t) => {
			let [n, r] = Fe(t.base, e, W);
			return {
				version: 1,
				id: t.id,
				name: t.name,
				crs: W,
				base: [n, r],
				features: t.features.map(({ layer: t, geometry: n, properties: r }) => ({
					layer: t,
					geometry: On.writeGeometryObject(n, {
						dataProjection: W,
						featureProjection: e
					}),
					properties: Nn(r)
				}))
			};
		});
	}
	import(e, t) {
		if (!Array.isArray(e)) throw new G("templates", "expected an array");
		let n = [], r = [];
		e.forEach((e, i) => {
			let a = `templates[${i}]`;
			if (!Mn(e)) throw new G(a, "expected an object");
			if (e.version !== 1) throw new G(`${a}.version`, "expected 1");
			if (typeof e.name != "string" || !e.name.trim()) throw new G(`${a}.name`, "expected a non-empty string");
			if (e.crs !== void 0 && e.crs !== W) throw new G(`${a}.crs`, `expected '${W}'`);
			let o = e.base;
			if (!Array.isArray(o) || o.length !== 2 || !o.every((e) => Number.isFinite(e))) throw new G(`${a}.base`, "expected [lon, lat]");
			if (!Array.isArray(e.features) || e.features.length === 0) throw new G(`${a}.features`, "expected a non-empty array");
			let s = e.features.map((e, n) => {
				let r = `${a}.features[${n}]`;
				if (!Mn(e)) throw new G(r, "expected an object");
				if (typeof e.layer != "string") throw new G(`${r}.layer`, "expected a string");
				if (e.properties !== void 0 && !Mn(e.properties)) throw new G(`${r}.properties`, "expected an object");
				let i;
				try {
					i = On.readGeometry(e.geometry, {
						dataProjection: W,
						featureProjection: t
					});
				} catch {
					throw new G(`${r}.geometry`, "expected a GeoJSON geometry");
				}
				if (!i) throw new G(`${r}.geometry`, "expected a GeoJSON geometry");
				return {
					layer: e.layer,
					geometry: i,
					properties: Nn(e.properties ?? {})
				};
			});
			n.push({
				name: e.name.trim(),
				base: Fe(o, W, t),
				features: s
			}), r.push(e.id);
		});
		let i = n.map((e, t) => {
			let n = r[t], i = typeof n == "string" && n && !this.templates.has(n) ? n : this.freshId();
			return this.templates.set(i, {
				id: i,
				...e
			}), i;
		});
		return this.onChange({
			id: null,
			type: "import"
		}), i;
	}
	freshId() {
		let e;
		do
			e = `tpl-${this.nextId++}`;
		while (this.templates.has(e));
		return e;
	}
	require(e) {
		let t = this.templates.get(e);
		if (!t) throw Error(`Unknown template "${e}"`);
		return t;
	}
};
function An(e, t) {
	let n = { ...e.getProperties() };
	return delete n[e.getGeometryName()], t && delete n[t], Nn(n);
}
function jn(e) {
	return {
		id: e.id,
		name: e.name,
		featureCount: e.features.length,
		layers: [...new Set(e.features.map((e) => e.layer))]
	};
}
function Mn(e) {
	return typeof e == "object" && !!e && !Array.isArray(e);
}
function Nn(e) {
	try {
		return structuredClone(e);
	} catch {
		return e;
	}
}
//#endregion
//#region src/core/templates/insert.ts
function Pn(e, t) {
	let n = h(t.geometry.getType()), r = (t) => {
		if (!t || !e.layers.has(t) || !e.layers.canEdit(t, "insert")) return null;
		let r = e.layers.getConfig(t), i = h(r.geometryType);
		return i === null || i === n ? {
			layerId: t,
			layer: r
		} : null;
	};
	return r(t.layer) ?? r(e.getActiveLayer()) ?? r(e.getDraftLayer());
}
function Fn(e, t) {
	return t.features.some((t) => Pn(e, t) !== null);
}
function In(e, t, r, a) {
	let o = t.placed(r, a, e.getProjection()), s = [], c = [];
	return r.features.forEach((t, a) => {
		let l = Pn(e, t);
		if (!l) return;
		let u = p(o[a], l.layer.geometryType), d = new T({
			...i(l.layer),
			...Ln(t.properties),
			geometry: u
		});
		c.push(d), s.push(n(l.layerId, d, { template: r.id }));
	}), s.length === 0 ? null : {
		command: f(s, "template"),
		features: c
	};
}
function Ln(e) {
	try {
		return structuredClone(e);
	} catch {
		return { ...e };
	}
}
//#endregion
//#region src/core/layers/draft.ts
function Rn(e, t) {
	if (e === "Any") return !0;
	let n = t.getType();
	return n === e || `Multi${n}` === e;
}
function zn(e, t) {
	let n = e.getDraftLayer(), r = t.getGeometry();
	return !n || !r || e.layers.layerOf(t) !== n ? [] : e.layers.list().map((e) => e.id).filter((t) => t !== n && e.layers.canEdit(t, "insert") && Rn(e.layers.getConfig(t).geometryType, r));
}
function Bn(e, t, r) {
	let a = t.filter((t) => zn(e, t).includes(r));
	if (a.length === 0) return null;
	let o = e.getDraftLayer(), s = e.layers.getConfig(o).idProperty, c = e.layers.getConfig(r), l = a.map((e) => new T({
		...i(c),
		...An(e, s),
		geometry: p(e.getGeometry().clone(), c.geometryType)
	}));
	return {
		command: f([...a.map(v), ...l.map((e) => n(r, e))], "move draft"),
		features: l,
		sources: a
	};
}
//#endregion
//#region src/core/layers/highlight.ts
var Vn = "olcad:layer-highlight", Hn = 999;
function Un(e) {
	let t = new I({
		color: e.strokeColor,
		width: e.strokeWidth
	}), n = new z({ color: e.fillColor });
	return new L({
		stroke: t,
		fill: n,
		image: new B({
			radius: e.pointRadius,
			stroke: t,
			fill: n
		})
	});
}
function Wn(e, t, n) {
	return new P({
		source: e,
		style: Un(t),
		zIndex: 999,
		visible: n,
		updateWhileAnimating: !0,
		updateWhileInteracting: !0,
		properties: { [Vn]: !0 }
	});
}
//#endregion
//#region src/core/layers/originals.ts
var Gn = class {
	originals = /* @__PURE__ */ new WeakMap();
	set(e, t, n) {
		this.originals.set(e, {
			projection: t,
			geometry: n
		});
	}
	get(e) {
		return this.originals.get(e);
	}
	delete(e) {
		this.originals.delete(e);
	}
}, Kn = {
	strokeColor: "#f59e0b",
	strokeWidth: 3,
	fillColor: "rgba(245, 158, 11, 0.2)",
	pointRadius: 7
}, qn = 1, Jn = class {
	originals = new Gn();
	entries = /* @__PURE__ */ new Map();
	activeId = null;
	localIds = /* @__PURE__ */ new Set();
	order = [];
	orderCustomized = !1;
	pendingStyles = /* @__PURE__ */ new Map();
	pendingOrder = [];
	map;
	getProjection;
	events;
	highlightConfig;
	constructor(e, t, n, r = Kn) {
		this.map = e, this.getProjection = t, this.events = n, this.highlightConfig = r;
	}
	add(e) {
		if (ne(e), this.entries.has(e.id)) throw Error(`Layer "${e.id}" already exists`);
		let t = Ft(e), n = Dn(t, {
			getProjection: this.getProjection,
			originals: this.originals,
			onLoad: (e, t) => this.events.onLoad({
				id: e,
				features: t
			}),
			onError: (e, t) => this.events.onError({
				id: e,
				error: t
			}),
			shouldLoad: (e, t) => this.events.shouldLoad?.(e, t) ?? !0
		});
		this.entries.set(e.id, {
			config: t,
			layer: n
		}), this.order.push(e.id), this.map.addLayer(n), this.events.onChange({
			id: e.id,
			type: "add"
		});
		let r = this.pendingStyles.get(e.id);
		r && (this.pendingStyles.delete(e.id), this.setStyle(e.id, r)), this.pendingOrder.includes(e.id) ? this.setOrder(this.pendingOrder, !0) : this.applyZIndex();
	}
	remove(e) {
		let t = this.require(e);
		this.map.removeLayer(t.layer), t.highlight && this.map.removeLayer(t.highlight), this.entries.delete(e), this.localIds.delete(e), this.order = this.order.filter((t) => t !== e), this.applyZIndex(), this.activeId === e && this.setActive(null), this.events.onChange({
			id: e,
			type: "remove"
		});
	}
	getActive() {
		return this.activeId;
	}
	setActive(e) {
		e !== null && this.require(e), e !== this.activeId && (this.activeId = e, this.events.onActiveChange({ id: e }));
	}
	has(e) {
		return this.entries.has(e);
	}
	ids() {
		return [...this.order];
	}
	setOrder(e, t = !1) {
		let n = e.filter((t, n) => this.entries.has(t) && e.indexOf(t) === n);
		this.pendingOrder = t && n.length < e.length ? [...e] : [], this.order = [...n, ...this.order.filter((e) => !n.includes(e))], this.orderCustomized = this.order.join("\n") !== [...this.entries.keys()].join("\n"), this.applyZIndex(), this.events.onChange({
			id: n[0] ?? "",
			type: "order"
		});
	}
	moveLayer(e, t) {
		this.require(e);
		let n = this.order.filter((t) => t !== e), r = Math.max(0, Math.min(n.length, Math.round(t)));
		n.splice(r, 0, e), this.setOrder(n);
	}
	resetOrder() {
		this.pendingOrder = [], this.setOrder([...this.entries.keys()]);
	}
	isOrderCustomized() {
		return this.orderCustomized;
	}
	applyZIndex() {
		this.order.forEach((e, t) => this.entries.get(e)?.layer.setZIndex(1 + t));
	}
	getStyle(e) {
		let { config: t, layer: n, style: i } = this.require(e);
		if (i) return structuredClone(i);
		let a = r(t.style ?? _n[t.geometryType], t.geometryType) ?? r(_n[t.geometryType], t.geometryType);
		return a.opacity = n.getOpacity(), t.minZoom !== void 0 && (a.minZoom = t.minZoom), t.maxZoom !== void 0 && (a.maxZoom = t.maxZoom), t.text && (a.text = {
			color: Yn(t.text.color),
			halo: Yn(t.text.haloColor)
		}), a;
	}
	hasExpressionStyle(e) {
		let { config: t } = this.require(e);
		return t.style !== void 0 && r(t.style, t.geometryType) === null;
	}
	isStyleCustomized(e) {
		return this.require(e).style !== void 0;
	}
	setStyle(e, t) {
		let n = this.require(e), r = y(t);
		n.style = r;
		let { config: i, layer: a } = n;
		a.setStyle(En(i, this.getProjection, {
			flat: se(r, i.geometryType),
			...r.text ? { text: r.text } : {}
		})), a.setOpacity(r.opacity), a.setMinZoom(r.minZoom ?? i.minZoom ?? -Infinity), a.setMaxZoom(r.maxZoom ?? i.maxZoom ?? Infinity), this.events.onChange({
			id: e,
			type: "style"
		});
	}
	resetStyle(e) {
		let t = this.require(e);
		if (this.pendingStyles.delete(e), !t.style) return;
		delete t.style;
		let { config: n, layer: r } = t;
		r.setStyle(En(n, this.getProjection)), r.setOpacity(1), r.setMinZoom(n.minZoom ?? -Infinity), r.setMaxZoom(n.maxZoom ?? Infinity), this.events.onChange({
			id: e,
			type: "style"
		});
	}
	exportStyles() {
		let e = Object.fromEntries(this.pendingStyles);
		for (let [t, n] of this.entries) n.style && (e[t] = n.style);
		let t = this.orderCustomized ? [...this.order] : [];
		return this.pendingOrder.length && (t = Xn(this.order, this.pendingOrder)), {
			version: 1,
			order: t,
			styles: structuredClone(e)
		};
	}
	importStyles(e) {
		if (!e || typeof e != "object") throw new w("styles", "expected an object");
		let t = e;
		if (t.version !== 1) throw new w("styles.version", "expected 1");
		let n = t.order ?? [];
		if (!Array.isArray(n) || n.some((e) => typeof e != "string")) throw new w("styles.order", "expected an array of layer ids");
		let r = t.styles ?? {};
		if (typeof r != "object" || !r) throw new w("styles.styles", "expected an object");
		let i = Object.entries(r).map(([e, t]) => [e, y(t, `styles.styles.${e}`)]);
		for (let [e, t] of i) this.entries.has(e) ? this.setStyle(e, t) : this.pendingStyles.set(e, t);
		n.length && this.setOrder(n, !0);
	}
	resetStyles() {
		this.pendingStyles.clear();
		for (let e of this.order) this.resetStyle(e);
		this.resetOrder();
	}
	list() {
		return this.ids().map((e) => this.info(e));
	}
	info(e) {
		let t = this.require(e), { config: n, layer: r } = t, { insert: i, update: a, delete: o } = n.editable;
		return {
			id: e,
			title: n.title,
			visible: r.getVisible(),
			geometryType: n.geometryType,
			editable: {
				insert: i,
				update: a,
				delete: o
			},
			snappable: n.snappable,
			featureCount: r.getSource()?.getFeatures().length ?? 0,
			active: this.activeId === e,
			highlighted: t.highlight !== void 0,
			dataProjection: this.dataProjection(e),
			local: this.localIds.has(e)
		};
	}
	setLocal(e, t) {
		this.require(e), t ? this.localIds.add(e) : this.localIds.delete(e);
	}
	isLocal(e) {
		return this.localIds.has(e);
	}
	setTitle(e, t) {
		let n = this.require(e);
		n.config.title !== t && (n.config.title = t, this.events.onChange({
			id: e,
			type: "title"
		}));
	}
	setFields(e, t) {
		let n = this.require(e);
		n.config.schema = { fields: t }, this.events.onChange({
			id: e,
			type: "schema"
		});
	}
	getConfig(e) {
		return this.require(e).config;
	}
	dataProjection(e) {
		let { config: t, layer: n } = this.require(e);
		return t.source.dataProjection ?? n.get("olcad:dataProjection") ?? "EPSG:4326";
	}
	getOlLayer(e) {
		return this.require(e).layer;
	}
	getSource(e) {
		return this.require(e).layer.getSource();
	}
	layerOf(e) {
		for (let [t, n] of this.entries) if (n.layer.getSource()?.hasFeature(e)) return t;
	}
	setVisible(e, t) {
		let n = this.require(e);
		n.layer.getVisible() !== t && (n.layer.setVisible(t), n.highlight?.setVisible(t), n.config.visible = t, this.events.onChange({
			id: e,
			type: "visible"
		}));
	}
	isHighlighted(e) {
		return this.require(e).highlight !== void 0;
	}
	setHighlighted(e, t) {
		let n = this.require(e);
		n.highlight !== void 0 !== t && (t ? (n.highlight = Wn(n.layer.getSource(), this.highlightConfig, n.layer.getVisible()), this.map.addLayer(n.highlight)) : (this.map.removeLayer(n.highlight), delete n.highlight), this.events.onChange({
			id: e,
			type: "highlight"
		}));
	}
	setEditable(e, t) {
		let n = this.require(e);
		n.config.editable = Mt(t), this.events.onChange({
			id: e,
			type: "editable"
		});
	}
	setSnappable(e, t) {
		let n = this.require(e);
		n.config.snappable !== t && (n.config.snappable = t, this.events.onChange({
			id: e,
			type: "snappable"
		}));
	}
	getEditable(e) {
		return this.require(e).config.editable;
	}
	canEdit(e, t, n) {
		let r = this.require(e).config.editable;
		return r[t] ? t !== "insert" && n && r.predicate ? r.predicate(n, t) : !0 : !1;
	}
	snappableIds() {
		return this.ids().filter((e) => this.require(e).config.snappable);
	}
	reproject(e, t, n = () => !1, r = () => !1) {
		let i = (r) => {
			let i = r.getGeometry();
			if (!i) return;
			let a = n(r) ? void 0 : this.originals.get(r);
			a ? r.setGeometry(a.geometry.clone().transform(a.projection, t)) : i.transform(e, t);
		};
		for (let { config: e, layer: t } of this.entries.values()) {
			let n = t.getSource();
			if (e.source.strategy === "bbox") {
				let e = n.getFeatures().filter(r);
				n.clear(!0);
				for (let t of e) i(t);
				n.addFeatures(e);
			} else for (let e of n.getFeatures()) i(e);
		}
	}
	destroy() {
		for (let { layer: e, highlight: t } of this.entries.values()) this.map.removeLayer(e), t && this.map.removeLayer(t);
		this.entries.clear();
	}
	require(e) {
		let t = this.entries.get(e);
		if (!t) throw Error(`Unknown layer "${e}"`);
		return t;
	}
};
function Yn(e) {
	return je(e)?.hex ?? "#000000";
}
function Xn(e, t) {
	let n = [...e];
	return t.forEach((e, r) => {
		if (n.includes(e)) return;
		let i = t.slice(0, r).reverse().find((e) => n.includes(e));
		n.splice(i === void 0 ? 0 : n.indexOf(i) + 1, 0, e);
	}), n;
}
//#endregion
//#region src/core/projections/register.ts
function Zn(e, t) {
	if (e.length === 0) return;
	let n = t ?? globalThis.proj4;
	if (!n) throw new d("config.projections", "proj4 is required to register projections: pass it as config.proj4 or load it as a global");
	for (let { code: t, def: r } of e) n.defs(t, r);
	pt(n);
	for (let { code: t } of e) if (!E(t)) throw new d("config.projections", `projection "${t}" could not be registered`);
}
//#endregion
//#region src/core/selection/Selection.ts
var Qn = "olcad:highlight";
function $n(e) {
	if (!e || e instanceof j) return null;
	let t = [], n = (e) => {
		if (e instanceof Le) {
			e.getGeometriesArray().forEach(n);
			return;
		}
		if (e instanceof j) {
			t.push(e.getCoordinates());
			return;
		}
		if (e instanceof k) {
			t.push(...e.getCoordinates());
			return;
		}
		let r = e.getType(), i = e.getCoordinates();
		if (r === "LineString") t.push(...i);
		else if (r === "MultiLineString" || r === "Polygon") for (let e of i) t.push(...er(e, r));
		else if (r === "MultiPolygon") for (let e of i) for (let n of e) t.push(...er(n, "Polygon"));
	};
	return n(e), t.length ? new k(t) : null;
}
function er(e, t) {
	return t === "Polygon" ? e.slice(0, -1) : e;
}
function tr(e) {
	let t = new I({
		color: e.strokeColor,
		width: e.strokeWidth
	}), n = new z({ color: e.fillColor }), r = e.haloWidth > 0 ? new I({
		color: e.haloColor,
		width: e.strokeWidth + 2 * e.haloWidth
	}) : null, i = [];
	return r && i.push(new L({
		stroke: r,
		image: new B({
			radius: e.pointRadius + e.haloWidth,
			fill: new z({ color: e.haloColor })
		}),
		zIndex: 0
	})), i.push(new L({
		stroke: t,
		fill: n,
		image: new B({
			radius: e.pointRadius,
			stroke: t,
			fill: n
		}),
		zIndex: 1
	})), e.vertexSize > 0 && i.push(new L({
		image: new gt({
			points: 4,
			radius: e.vertexSize / Math.SQRT2,
			angle: Math.PI / 4,
			fill: new z({ color: e.strokeColor }),
			stroke: new I({
				color: e.haloColor,
				width: 1
			})
		}),
		geometry: (e) => {
			let t = e.getGeometry();
			return (t instanceof ht ? $n(t) : null) ?? void 0;
		},
		zIndex: 2
	})), i;
}
var nr = class {
	collection = new mt();
	layer;
	map;
	onChange;
	pending = !1;
	constructor(e, t, n) {
		this.map = e, this.onChange = n, this.layer = new P({
			source: new F({ features: this.collection }),
			style: tr(t),
			zIndex: 1e3,
			updateWhileAnimating: !0,
			updateWhileInteracting: !0,
			properties: { [Qn]: !0 }
		}), e.addLayer(this.layer), this.collection.on("add", () => this.schedule()), this.collection.on("remove", () => this.schedule());
	}
	get() {
		return this.collection.getArray().slice();
	}
	has(e) {
		return this.collection.getArray().includes(e);
	}
	set(e) {
		this.collection.clear();
		for (let t of e) this.has(t) || this.collection.push(t);
	}
	add(e) {
		this.has(e) || this.collection.push(e);
	}
	remove(e) {
		this.collection.remove(e);
	}
	clear() {
		this.collection.clear();
	}
	prune(e) {
		for (let t of this.get()) e(t) || this.collection.remove(t);
	}
	destroy() {
		this.clear(), this.map.removeLayer(this.layer);
	}
	schedule() {
		this.pending || (this.pending = !0, queueMicrotask(() => {
			this.pending = !1, this.onChange(this.get());
		}));
	}
};
//#endregion
//#region src/core/geometry/grid.ts
function rr(e, t, n = [0, 0]) {
	let r = (e, n) => n + Math.round((e - n) / t) * t;
	return [r(e[0], n[0]), r(e[1], n[1])];
}
function ir(e, t, n = [0, 0], r = Infinity) {
	let [i, a, o, s] = e, c = (e, n) => Math.ceil((e - n) / t), l = (e, n) => Math.floor((e - n) / t), u = c(i, n[0]), d = l(o, n[0]), f = c(a, n[1]), p = l(s, n[1]);
	if (d < u || p < f) return [];
	if ((d - u + 1) * (p - f + 1) > r) return null;
	let m = [];
	for (let e = f; e <= p; e++) for (let r = u; r <= d; r++) m.push([n[0] + r * t, n[1] + e * t]);
	return m;
}
function ar(e, t, n = 20) {
	let r = e.length;
	if (r < 3) return [];
	let i = r > 3 && e[0][0] === e[r - 1][0] && e[0][1] === e[r - 1][1], a = i ? r - 1 : r, o = +!i, s = i ? a - 1 : a - 2, c = n * Math.PI / 180, l = [];
	for (let n = o; n <= s; n++) {
		let r = e[n], i = e[(n - 1 + a) % a], o = e[(n + 1) % a], s = r[0] - t[0], u = r[1] - t[1];
		if (s === 0 && u === 0) continue;
		let d = r[0] - i[0], f = r[1] - i[1], p = o[0] - r[0], m = o[1] - r[1];
		if (d === 0 && f === 0 || p === 0 && m === 0 || Math.abs(Math.atan2(d * m - f * p, d * p + f * m)) > c) continue;
		let h = s * (i[1] - t[1]) - u * (i[0] - t[0]), g = s * (o[1] - t[1]) - u * (o[0] - t[0]);
		h !== 0 && g !== 0 && h > 0 == g > 0 && l.push([r[0], r[1]]);
	}
	return l;
}
//#endregion
//#region src/core/snapping/SnapEngine.ts
var or = {
	tangent: 0,
	vertex: 1,
	midpoint: 2,
	perpendicular: 3
};
function sr(e, t, n = null) {
	let r = [];
	if (t.includes("vertex")) for (let t of cr(e)) r.push({
		coordinate: t,
		mode: "vertex"
	});
	let i = t.includes("midpoint"), a = t.includes("perpendicular") && n !== null;
	if (i || a) {
		for (let [t, o] of $t(e)) if (i && r.push({
			coordinate: [(t[0] + o[0]) / 2, (t[1] + o[1]) / 2],
			mode: "midpoint"
		}), a) {
			let { foot: e, t: i } = U(n, t, o);
			i >= 0 && i <= 1 && r.push({
				coordinate: e,
				mode: "perpendicular"
			});
		}
	}
	if (t.includes("tangent") && n !== null) for (let t of Qt(e)) for (let e of ar(t, n)) r.push({
		coordinate: e,
		mode: "tangent"
	});
	return r;
}
function cr(e) {
	let t = e.getCoordinates?.(), n = [], r = (e) => {
		if (Array.isArray(e)) {
			if (typeof e[0] == "number") n.push(e);
			else for (let t of e) r(t);
		}
	};
	return r(t), n;
}
var lr = class {
	layers;
	getConfig;
	getGrid;
	constructor(e, t, n = () => ({
		enabled: !1,
		spacing: 1,
		origin: [0, 0],
		visible: !1
	})) {
		this.layers = e, this.getConfig = t, this.getGrid = n;
	}
	snap(e, t, n, r, i = null) {
		return this.snapGeometry(e, t, n, r, i) ?? this.snapGrid(e, r);
	}
	snapGrid(e, t) {
		let { enabled: n, spacing: r, origin: i } = this.getGrid();
		if (!n) return null;
		let a = rr(e, r, i);
		return {
			coordinate: a,
			pixel: t(a),
			mode: "grid"
		};
	}
	snapGeometry(e, t, n, r, i) {
		let { enabled: a, tolerancePx: o, modes: s } = this.getConfig();
		if (!a || s.length === 0) return null;
		let c = o * n, l = [
			e[0] - c,
			e[1] - c,
			e[0] + c,
			e[1] + c
		], u = null, d = Infinity;
		for (let e of this.layers.snappableIds()) this.layers.getOlLayer(e).getVisible() && this.layers.getSource(e).forEachFeatureInExtent(l, (n) => {
			let a = n.getGeometry();
			if (a) for (let c of sr(a, s, i)) {
				let i = r(c.coordinate), a = Math.hypot(i[0] - t[0], i[1] - t[1]);
				a > o || (a < d || a === d && u !== null && or[c.mode] < or[u.mode]) && (d = a, u = {
					coordinate: c.coordinate,
					pixel: i,
					mode: c.mode,
					layer: e,
					feature: n
				});
			}
		});
		return u;
	}
}, ur = 2e4, dr = class {
	layer = new P({ source: new F() });
	getConfig;
	style;
	map = null;
	constructor(e, t) {
		this.getConfig = e, this.style = new L({ image: new B({
			radius: 1.5,
			fill: new z({ color: t })
		}) }), this.layer.on("postrender", this.draw);
	}
	attach(e) {
		e !== this.map && (this.map = e, this.layer.setMap(e));
	}
	refresh() {
		this.layer.changed(), this.map?.render();
	}
	draw = (e) => {
		let { visible: t, spacing: n, origin: r } = this.getConfig(), i = e.frameState;
		if (!t || !i) return;
		let { extent: a, viewState: o } = i;
		if (!a || n / o.resolution < 8) return;
		let s = ir(a, n, r, ur);
		if (!s || s.length === 0) return;
		let c = _t(e);
		c.setStyle(this.style), c.drawGeometry(new k(s));
	};
}, fr = /* @__PURE__ */ new Set([
	"pointerdown",
	"pointerup",
	"pointermove",
	"pointerdrag",
	"click",
	"singleclick",
	"dblclick"
]), pr = class extends vt {
	options;
	current = null;
	pointer = null;
	constructor(e) {
		super(), this.options = e;
	}
	handleEvent(e) {
		if (!fr.has(e.type)) return !0;
		let t = this.getMap(), n = null;
		if (t && this.options.isActive()) {
			let r = (e) => t.getPixelFromCoordinate(e), { engine: i } = this.options;
			if (n = i.snapGeometry(e.coordinate, e.pixel, t.getView().getResolution() ?? 1, r, this.options.getReference()), !n) {
				let t = this.options.constrain(e.coordinate);
				t ? (e.coordinate = t.slice(), e.pixel = r(t)) : n = i.snapGrid(e.coordinate, r);
			}
		}
		return n && (e.coordinate = n.coordinate.slice(), e.pixel = n.pixel.slice()), this.pointer = e.coordinate.slice(), mr(this.current, n) || (this.current = n, this.options.onSnap(n)), !0;
	}
	getPointerCoordinate() {
		return this.pointer;
	}
	reset() {
		this.current && (this.current = null, this.options.onSnap(null));
	}
};
function mr(e, t) {
	return !e || !t ? e === t : e.mode === t.mode && e.coordinate[0] === t.coordinate[0] && e.coordinate[1] === t.coordinate[1];
}
//#endregion
//#region src/core/constraints/angle.ts
function hr(e, t, n) {
	return tn(t + Math.round((e - t) / n) * n);
}
function gr(e, t, n, r) {
	let i = e[0] - t[0], a = e[1] - t[1];
	if (Math.hypot(i, a) === 0) return {
		coordinate: [t[0], t[1]],
		angle: tn(n)
	};
	let o = hr(Math.atan2(a, i) * 180 / Math.PI, n, r), s = o * Math.PI / 180, c = i * Math.cos(s) + a * Math.sin(s);
	return {
		coordinate: [t[0] + c * Math.cos(s), t[1] + c * Math.sin(s)],
		angle: o
	};
}
//#endregion
//#region src/core/input/parse.ts
var _r = String.raw`[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?`, vr = `(?:${oe().map((e) => e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(?![A-Za-z])`, yr = String.raw`(${_r})\s*(${vr})?`, br = new RegExp(String.raw`^${yr}\s*(?:[,;]|\s)\s*${yr}$`, "i"), xr = new RegExp(String.raw`^${yr}\s*<\s*(${_r})$`, "i"), Sr = RegExp(`^${yr}$`, "i");
function Cr(e, t = "m") {
	let n = e.trim();
	if (n.length === 0) return null;
	let r = n.startsWith("@"), i = (r ? n.slice(1) : n).trim(), a = (e) => e === void 0 ? null : me(e), o = (e, n) => we(Number(e), a(n) ?? t), s = xr.exec(i);
	if (s) return r ? {
		kind: "polar",
		distance: o(s[1], s[2]),
		angle: Number(s[3])
	} : null;
	let c = br.exec(i);
	if (c) return r ? {
		kind: "relative",
		dx: o(c[1], c[2]),
		dy: o(c[3], c[4])
	} : c[2] !== void 0 || c[4] !== void 0 ? null : {
		kind: "absolute",
		x: Number(c[1]),
		y: Number(c[3])
	};
	let l = Sr.exec(i);
	if (l) {
		if (r) return null;
		let e = a(l[2]);
		return {
			kind: "length",
			distance: o(l[1], l[2]),
			value: Number(l[1]),
			unit: e
		};
	}
	return null;
}
//#endregion
//#region src/core/import/applyImport.ts
function wr(e, t) {
	return e.listLayers().map((e) => e.id).filter((n) => {
		if (!e.canInsert(n)) return !1;
		let r = e.getConfig(n).geometryType;
		return r === t.geometryType || r === "Any" || r === `Multi${t.geometryType}`;
	});
}
function Tr(e, t, r = {}) {
	let a = {
		created: [],
		inserted: 0,
		skipped: t.skipped,
		droppedAttributes: []
	}, o = /* @__PURE__ */ new Set(), s = [], c = t.groups.map((e) => ({
		group: e,
		target: r[e.key] ?? { type: "new" }
	}));
	for (let { group: t, target: n } of c) if (n.type === "layer" && !wr(e, t).includes(n.id)) throw Error(`Layer "${n.id}" cannot take the ${t.geometryType} objects of "${t.name}"`);
	try {
		for (let { group: t, target: r } of c) if (a.skipped += t.invalid, r.type === "skip" || t.features.length === 0) a.skipped += r.type === "skip" ? t.features.length : 0;
		else if (r.type === "new") {
			let i = e.createLocalLayer({
				title: r.title?.trim() || t.name,
				geometryType: t.geometryType,
				fields: t.fields.map((e) => ({ ...e }))
			});
			a.created.push(i);
			for (let e of t.features) s.push(n(i, Er(e), { imported: !0 }));
		} else {
			let a = e.getConfig(r.id), c = new Map((a.schema?.fields ?? []).map((e) => [e.name, e]));
			for (let e of t.features) {
				let t = new T(i(a));
				for (let [n, r] of Object.entries(e.getProperties())) {
					if (n === e.getGeometryName()) continue;
					let i = c.get(n);
					i ? t.set(n, Dr(r, i)) : o.add(n);
				}
				t.setGeometry(p(e.getGeometry().clone(), a.geometryType)), s.push(n(r.id, t, { imported: !0 }));
			}
		}
		if (s.length > 0) {
			let t = s.length === 1 ? s[0] : f(s, "import");
			if (!e.execute(t)) throw Error("The import was rejected by validation");
		}
	} catch (t) {
		for (let t of a.created) e.removeLocalLayer(t);
		throw t;
	}
	return a.inserted = s.length, a.droppedAttributes = [...o], a;
}
function Er(e) {
	let t = e.clone();
	return t.setId(void 0), t;
}
function Dr(e, t) {
	if ((t.type === "number" || t.type === "integer") && typeof e == "string") {
		let t = Number(e);
		return e.trim() !== "" && Number.isFinite(t) ? t : e;
	}
	if (t.type === "boolean" && typeof e == "string") {
		if (e === "true") return !0;
		if (e === "false") return !1;
	}
	return e;
}
//#endregion
//#region src/core/tools/ToolManager.ts
var Or = class {
	tools = /* @__PURE__ */ new Map();
	active = null;
	activeOptions = {};
	suspended = !1;
	ctx;
	events;
	constructor(e, t) {
		this.ctx = e, this.events = t;
	}
	register(e) {
		if (this.tools.has(e.id)) throw Error(`Tool "${e.id}" is already registered`);
		this.tools.set(e.id, e);
	}
	list() {
		return [...this.tools.keys()];
	}
	has(e) {
		return this.tools.has(e);
	}
	getActive() {
		return this.active?.id ?? null;
	}
	isReadOnly(e = this.getActive()) {
		return e !== null && this.tools.get(e)?.readOnly === !0;
	}
	getActiveOptions() {
		return this.active?.getOptions?.() ?? { ...this.activeOptions };
	}
	getPrompt() {
		return (this.active?.getPrompt?.() ?? null)?.replace(/\{unit\}/g, ye(this.ctx.getLengthUnit()).symbol) ?? null;
	}
	getInputRequest() {
		return this.active?.getInputRequest?.() ?? null;
	}
	canActivate(e, t = {}) {
		let n = this.tools.get(e);
		return n !== void 0 && n.canActivate(this.ctx, t);
	}
	activate(e, t = {}) {
		let n = this.tools.get(e);
		if (!n) throw Error(`Unknown tool "${e}"`);
		return n.canActivate(this.ctx, t) ? (this.active &&= (this.active.deactivate(), null), n.activate(this.ctx, t), this.suspended && n.setSuspended(!0), this.active = n, this.activeOptions = { ...t }, this.events.onToolChange(n.id, this.getActiveOptions()), !0) : !1;
	}
	deactivate() {
		this.active && (this.active.deactivate(), this.active = null, this.activeOptions = {}, this.events.onToolChange(null, {}));
	}
	cancel() {
		this.active?.cancel();
	}
	finish() {
		this.active?.finish();
	}
	removeLastPoint() {
		return this.active?.removeLastPoint() ?? !1;
	}
	handleInput(e) {
		return this.active?.handleInput(e) ?? !1;
	}
	handleValue(e) {
		return this.active?.handleValue(e) ?? !1;
	}
	handleLength(e) {
		return this.active?.handleLength?.(e) ?? !1;
	}
	handleText(e) {
		return this.active?.handleText?.(e) ?? !1;
	}
	referencePoint() {
		return this.active?.referencePoint() ?? null;
	}
	suspend(e) {
		this.suspended = e, this.active?.setSuspended(e);
	}
};
//#endregion
//#region src/core/tools/layerFilter.ts
function kr(e) {
	return e.get(hn) !== void 0;
}
//#endregion
//#region src/core/tools/select.ts
function K(e) {
	return new Ot({
		features: e.selection.collection,
		style: null,
		layers: kr,
		hitTolerance: e.hitTolerance,
		toggleCondition: Et,
		multi: !1,
		filter: (e) => e instanceof T
	});
}
function q(e) {
	let t = new Dt({ condition: Tt });
	return t.on("boxend", () => {
		let n = t.getGeometry().getExtent();
		e.selection.set(jr(e, n));
	}), t;
}
var Ar = class extends m {
	id = "select";
	activate(e) {
		this.interactions = [K(e), q(e)], super.activate(e);
	}
	cancel() {
		this.ctx?.selection.clear();
	}
	deactivate() {
		this.removeInteractions();
	}
};
function jr(e, t) {
	let n = [];
	for (let r of e.layers.list()) r.visible && e.layers.getSource(r.id).forEachFeatureIntersectingExtent(t, (e) => {
		n.push(e);
	});
	return n;
}
//#endregion
//#region src/core/geometry/vertices.ts
function Mr(e) {
	return e instanceof j || e instanceof k || e instanceof D || e instanceof O || e instanceof M || e instanceof A;
}
function Nr(e) {
	return e instanceof j ? [{
		prefix: [],
		coordinates: [e.getCoordinates()],
		closed: !1,
		segments: !1
	}] : e instanceof k ? [{
		prefix: [],
		coordinates: e.getCoordinates(),
		closed: !1,
		segments: !1
	}] : e instanceof D ? [{
		prefix: [],
		coordinates: e.getCoordinates(),
		closed: !1,
		segments: !0
	}] : e instanceof O ? e.getCoordinates().map((e, t) => ({
		prefix: [t],
		coordinates: e,
		closed: !1,
		segments: !0
	})) : e instanceof M ? e.getCoordinates().map((e, t) => ({
		prefix: [t],
		coordinates: e,
		closed: !0,
		segments: !0
	})) : e instanceof A ? e.getCoordinates().flatMap((e, t) => e.map((e, n) => ({
		prefix: [t, n],
		coordinates: e,
		closed: !0,
		segments: !0
	}))) : [];
}
function Pr(e) {
	if (e instanceof j) return [{
		coordinate: e.getCoordinates(),
		path: []
	}];
	let t = [];
	for (let n of Nr(e)) {
		let e = n.closed ? n.coordinates.length - 1 : n.coordinates.length;
		for (let r = 0; r < e; r++) t.push({
			coordinate: n.coordinates[r],
			path: [...n.prefix, r]
		});
	}
	return t;
}
function Fr(e, t, n) {
	let r = null, i = n * n;
	for (let n of Pr(e)) {
		let e = Re(n.coordinate, t);
		e <= i && (i = e, r = n);
	}
	return r;
}
function Ir(e, t, n) {
	let r = null, i = n * n;
	for (let n of Nr(e)) if (n.segments) for (let e = 0; e < n.coordinates.length - 1; e++) {
		let a = n.coordinates[e], o = n.coordinates[e + 1], { foot: s, t: c } = U(t, a, o), l = c <= 0 ? a : c >= 1 ? o : s, u = Re(l, t);
		u <= i && (i = u, r = {
			path: [...n.prefix, e],
			foot: [l[0], l[1]]
		});
	}
	return r;
}
function Lr(e, t, n) {
	return Br(e, t, (e, t) => {
		e[t] = n.slice();
	});
}
function Rr(e, t, n) {
	return Br(e, t, (e, t) => {
		e.splice(t + 1, 0, n.slice());
	});
}
function zr(e, t) {
	return Br(e, t, (e, t) => {
		e.splice(t, 1);
	});
}
function Br(e, t, n) {
	if (!Mr(e)) return e.clone();
	let r = e.clone();
	if (r instanceof j) {
		let e = [r.getCoordinates()];
		return n(e, 0), e[0] && r.setCoordinates(e[0]), r;
	}
	let i = r.getCoordinates(), a = i;
	for (let e of t.slice(0, -1)) a = a[e];
	let o = a, s = t[t.length - 1], c = r instanceof M || r instanceof A;
	return n(o, s), c && o.length > 0 && (o[o.length - 1] = o[0].slice()), r.setCoordinates(i), r;
}
//#endregion
//#region src/core/tools/pointer.ts
var J = class extends kt {
	handlers;
	constructor(e) {
		super(), this.handlers = e;
	}
	handleEvent(e) {
		if (e.type === "click") {
			let t = !!e.originalEvent?.altKey;
			return this.handlers.click(e.coordinate.slice(), Vr(e), t), !1;
		}
		return e.type === "dblclick" || e.type === "singleclick" ? !1 : (e.type === "pointermove" && this.handlers.move(e.coordinate.slice(), Vr(e)), !0);
	}
};
function Vr(e) {
	let t = e.originalEvent;
	return t && typeof e.map?.getEventCoordinate == "function" ? e.map.getEventCoordinate(t) : e.coordinate.slice();
}
function Hr(e) {
	let t = e.map.getView().getResolution() ?? 1;
	return Math.max(10, e.hitTolerance) * t;
}
//#endregion
//#region src/core/tools/preview.ts
var Ur = "olcad:preview", Y = "olcad:vertex", Wr = "rgba(34, 211, 238, 0.8)", Gr = new I({
	color: Wr,
	width: 2,
	lineDash: [6, 4]
}), Kr = new L({
	stroke: Gr,
	image: new B({
		radius: 5,
		stroke: Gr,
		fill: new z({ color: "rgba(34, 211, 238, 0.2)" })
	})
}), qr = new L({
	image: new B({
		radius: 7,
		stroke: new I({
			color: Wr,
			width: 2
		})
	}),
	zIndex: 1
}), Jr = new L({
	image: new B({
		radius: 6,
		fill: new z({ color: Wr }),
		stroke: new I({
			color: "rgba(255, 255, 255, 0.9)",
			width: 1.5
		})
	}),
	zIndex: 2
});
function X(e) {
	return new P({
		source: e,
		style: (e) => {
			let t = e.get(Y);
			return t === "picked" ? Jr : t === "hover" ? qr : Kr;
		},
		zIndex: 1001,
		updateWhileAnimating: !0,
		updateWhileInteracting: !0,
		properties: { [Ur]: !0 }
	});
}
//#endregion
//#region src/core/tools/modify.ts
var Yr = {
	select: "Select the object to edit: click it",
	idle: "Click a vertex to move it or a segment to insert one; Alt+click removes a vertex; Enter finishes",
	placing: "New position: click on the map, or type x,y · @dx,dy · @distance<angle · distance; Escape drops the vertex"
};
function Xr(e, t) {
	let n = new T(new j(e));
	return n.set(Y, t), n;
}
var Zr = class extends m {
	id = "modify";
	step = "select";
	feature = null;
	pick = null;
	hovered = null;
	select = null;
	pointer = null;
	preview = null;
	previewSource = new F();
	suspended = !1;
	canActivate() {
		return !0;
	}
	getPrompt() {
		return Yr[this.step];
	}
	activate(e, t) {
		e.selection.collection.on("add", this.onSelectionChange), e.selection.collection.on("remove", this.onSelectionChange), this.select = K(e), this.pointer = new J({
			click: (e, t, n) => this.onClick(e, t, n),
			move: (e, t) => this.onMove(e, t)
		}), this.preview = X(this.previewSource), e.map.addLayer(this.preview), this.interactions = [this.select, this.pointer], super.activate(e, t), this.feature = this.target(), this.goTo(this.feature ? "idle" : "select");
	}
	deactivate() {
		let e = this.ctx;
		e && (e.selection.collection.un("add", this.onSelectionChange), e.selection.collection.un("remove", this.onSelectionChange), this.preview && e.map.removeLayer(this.preview)), this.watchGeometry(null), this.previewSource.clear(), this.removeInteractions(), this.select = null, this.pointer = null, this.preview = null, this.feature = null, this.pick = null, this.hovered = null, this.step = "select";
	}
	finish() {
		this.step !== "select" && (this.feature = null, this.goTo("select"), this.ctx?.selection.clear());
	}
	cancel() {
		this.step === "placing" ? this.goTo("idle") : this.step === "idle" ? this.finish() : this.ctx?.selection.clear();
	}
	removeLastPoint() {
		return this.step === "placing" ? (this.goTo("idle"), !0) : this.step === "idle" && this.hovered ? (this.remove(this.hovered), !0) : !1;
	}
	handleInput(e) {
		return this.step === "placing" && (this.place(e), !0);
	}
	referencePoint() {
		return this.step === "placing" && this.pick ? this.pick.origin.slice() : null;
	}
	setSuspended(e) {
		this.suspended = e, this.applyActivity();
	}
	target() {
		let e = this.ctx;
		if (!e) return null;
		let t = e.selection.get();
		return t.length === 1 && e.canUpdate(t[0]) ? t[0] : null;
	}
	tolerance() {
		return this.ctx ? Hr(this.ctx) : 0;
	}
	onClick(e, t, n) {
		if (this.step === "placing") {
			this.place(e);
			return;
		}
		let r = this.feature?.getGeometry();
		if (this.step !== "idle" || !r) return;
		let i = this.tolerance(), a = Fr(r, t, i);
		if (a) {
			n ? this.remove(a) : this.pickUp({
				path: a.path,
				origin: a.coordinate.slice(),
				working: r.clone()
			}, e);
			return;
		}
		if (n) return;
		let o = Ir(r, t, i);
		if (o) {
			let t = [...o.path.slice(0, -1), o.path[o.path.length - 1] + 1];
			this.pickUp({
				path: t,
				origin: o.foot,
				working: Rr(r, o.path, o.foot)
			}, e);
		}
	}
	onMove(e, t) {
		if (this.step === "placing") {
			this.updatePreview(e);
			return;
		}
		let n = this.feature?.getGeometry();
		this.step === "idle" && n && (this.hovered = Fr(n, t, this.tolerance()), this.previewSource.clear(!0), this.hovered && this.previewSource.addFeature(Xr(this.hovered.coordinate, "hover")));
	}
	pickUp(e, t) {
		this.pick = e, this.goTo("placing"), this.updatePreview(t);
	}
	place(e) {
		let { pick: t, feature: n, ctx: r } = this;
		this.goTo("idle"), t && n && r && r.execute(x(n, Lr(t.working, t.path, e)));
	}
	remove(e) {
		let t = this.feature?.getGeometry();
		t && this.feature && this.ctx && (Pr(t).length <= 1 || (this.hovered = null, this.previewSource.clear(!0), this.ctx.execute(x(this.feature, zr(t, e.path)))));
	}
	updatePreview(e) {
		this.pick && (this.previewSource.clear(!0), this.previewSource.addFeatures([new T(Lr(this.pick.working, this.pick.path, e)), Xr(e, "picked")]));
	}
	onSelectionChange = () => {
		queueMicrotask(() => {
			if (!this.ctx) return;
			let e = this.target();
			e !== this.feature && (this.feature = e, this.goTo(e ? "idle" : "select"));
		});
	};
	onGeometryChange = () => {
		this.step === "placing" && this.goTo("idle");
	};
	watched = null;
	watchGeometry(e) {
		this.watched !== e && (this.watched?.un("change:geometry", this.onGeometryChange), this.watched = e, e?.on("change:geometry", this.onGeometryChange));
	}
	goTo(e) {
		this.step = e, e !== "placing" && (this.pick = null), e !== "idle" && (this.hovered = null), this.previewSource.clear(!0), this.watchGeometry(e === "placing" ? this.feature : null), this.applyActivity(), this.ctx?.promptChanged();
	}
	applyActivity() {
		this.select?.setActive(!this.suspended && this.step === "select"), this.pointer?.setActive(!this.suspended && this.step !== "select");
	}
};
function Qr(e) {
	return new Map(e.map((e) => [e, e.getGeometry()?.clone()]));
}
function $r(e, t, n) {
	let r = [];
	for (let e of t) {
		let t = e.getGeometry()?.clone(), i = n.get(e);
		t && (e.setGeometry(i?.clone()), r.push(x(e, t)));
	}
	return n.clear(), r.length !== 0 && e.execute(r.length === 1 ? r[0] : f(r, "modify"));
}
//#endregion
//#region src/core/tools/editableSelection.ts
function ei(e) {
	let t = new mt(), n = () => {
		t.clear();
		for (let n of e.selection.get()) e.canUpdate(n) && t.push(n);
	};
	n();
	let r = e.selection.collection;
	return r.on("add", n), r.on("remove", n), {
		collection: t,
		dispose: () => {
			r.un("add", n), r.un("remove", n), t.clear();
		}
	};
}
//#endregion
//#region src/core/tools/move.ts
var ti = {
	select: "Select the objects to move: click, Shift+click adds, Ctrl / Cmd+drag for a box; Enter continues",
	base: "Base point: click on the map or type x,y",
	target: "Second point: click on the map, or type @dx,dy · @distance<angle · distance; Escape goes back"
};
function ni(e, t, n) {
	for (let r of e) r.getGeometry()?.translate(t, n);
}
var ri = class extends m {
	id = "move";
	step = "select";
	base = null;
	editable = null;
	selectInteractions = [];
	pointer = null;
	preview = null;
	previewSource = new F();
	suspended = !1;
	canActivate() {
		return !0;
	}
	getPrompt() {
		return ti[this.step];
	}
	activate(e, t) {
		this.editable = ei(e), e.selection.collection.on("add", this.onSelectionChange), e.selection.collection.on("remove", this.onSelectionChange), this.selectInteractions = [K(e), q(e)], this.pointer = new J({
			click: (e) => this.takePoint(e),
			move: (e) => this.onPointerMove(e)
		}), this.preview = X(this.previewSource), e.map.addLayer(this.preview), this.interactions = [...this.selectInteractions, this.pointer], super.activate(e, t), this.goTo(this.editable.collection.getLength() > 0 ? "base" : "select");
	}
	deactivate() {
		let e = this.ctx;
		e && (e.selection.collection.un("add", this.onSelectionChange), e.selection.collection.un("remove", this.onSelectionChange), this.preview && e.map.removeLayer(this.preview)), this.previewSource.clear(), this.removeInteractions(), this.editable?.dispose(), this.editable = null, this.selectInteractions = [], this.pointer = null, this.preview = null, this.base = null, this.step = "select";
	}
	finish() {
		this.step === "select" && this.hasEditable() && this.goTo("base");
	}
	cancel() {
		this.step === "target" ? this.goTo("base") : this.step === "base" ? (this.ctx?.selection.clear(), this.goTo("select")) : this.ctx?.selection.clear();
	}
	removeLastPoint() {
		return this.step === "target" && (this.cancel(), !0);
	}
	handleInput(e) {
		return this.step !== "select" && (this.takePoint(e), !0);
	}
	referencePoint() {
		return this.step === "target" ? this.base : null;
	}
	setSuspended(e) {
		this.suspended = e, this.applyActivity();
	}
	takePoint(e) {
		this.step === "base" ? (this.base = e, this.goTo("target")) : this.step === "target" && this.base && this.applyMove(e);
	}
	applyMove(e) {
		let t = this.ctx, n = this.base, r = this.editable?.collection.getArray().slice() ?? [];
		if (!t || !n || r.length === 0) {
			this.goTo("select");
			return;
		}
		let i = Qr(r);
		ni(r, e[0] - n[0], e[1] - n[1]), $r(t, r, i), t.selection.clear(), this.goTo("select");
	}
	onPointerMove(e) {
		if (this.step !== "target" || !this.base) return;
		let [t, n] = [e[0] - this.base[0], e[1] - this.base[1]];
		this.previewSource.clear(!0);
		let r = (this.editable?.collection.getArray() ?? []).flatMap((e) => {
			let r = e.getGeometry()?.clone();
			return r ? (r.translate(t, n), [new T(r)]) : [];
		});
		this.previewSource.addFeatures([...r, new T(new D([this.base, e]))]);
	}
	onSelectionChange = () => {
		queueMicrotask(() => {
			this.ctx && this.step !== "select" && !this.hasEditable() && this.goTo("select");
		});
	};
	hasEditable() {
		return (this.editable?.collection.getLength() ?? 0) > 0;
	}
	goTo(e) {
		this.step = e, e !== "target" && (this.base = null, this.previewSource.clear(!0)), this.applyActivity(), this.ctx?.promptChanged();
	}
	applyActivity() {
		let e = !this.suspended && this.step === "select";
		for (let t of this.selectInteractions) t.setActive(e);
		this.pointer?.setActive(!this.suspended && this.step !== "select");
	}
};
//#endregion
//#region src/core/geometry/rectangle.ts
function ii(e, t, n) {
	let r = n * Math.PI / 180, i = [Math.cos(r), Math.sin(r)], a = [-i[1], i[0]], o = t[0] - e[0], s = t[1] - e[1], c = o * i[0] + s * i[1], l = o * a[0] + s * a[1], u = 1e-9 * Math.hypot(o, s);
	if (Math.abs(c) <= u || Math.abs(l) <= u) return null;
	let d = (t, n) => [e[0] + t * i[0] + n * a[0], e[1] + t * i[1] + n * a[1]], f = [
		[e[0], e[1]],
		d(c, 0),
		d(c, l),
		d(0, l)
	];
	if (c * l < 0 && f.reverse(), f.push([e[0], e[1]]), f[0][0] !== e[0] || f[0][1] !== e[1]) {
		for (f.pop(); f[0][0] !== e[0] || f[0][1] !== e[1];) f.push(f.shift());
		f.push([e[0], e[1]]);
	}
	return new M([f]);
}
//#endregion
//#region src/core/tools/rectangle.ts
var ai = {
	first: "First corner: click on the map or type x,y",
	second: "Opposite corner: click on the map, or type x,y · @dx,dy · @distance<angle · distance; Escape drops the first corner"
};
function oi(e) {
	return C(e);
}
var si = class extends m {
	id = "rectangle";
	step = "first";
	first = null;
	pointer = null;
	preview = null;
	previewSource = new F();
	canActivate(e) {
		return oi(e) !== null;
	}
	getPrompt() {
		return ai[this.step];
	}
	activate(e, t) {
		this.pointer = new J({
			click: (e) => this.takePoint(e),
			move: (e) => this.onPointerMove(e)
		}), this.preview = X(this.previewSource), e.map.addLayer(this.preview), this.interactions = [this.pointer], super.activate(e, t), this.goTo("first");
	}
	deactivate() {
		this.ctx && this.preview && this.ctx.map.removeLayer(this.preview), this.previewSource.clear(), this.removeInteractions(), this.pointer = null, this.preview = null, this.first = null, this.step = "first";
	}
	cancel() {
		this.removeLastPoint();
	}
	removeLastPoint() {
		return this.step === "second" && (this.goTo("first"), !0);
	}
	handleInput(e) {
		return this.takePoint(e), !0;
	}
	referencePoint() {
		return this.step === "second" ? this.first : null;
	}
	takePoint(e) {
		if (this.step === "first") {
			this.first = e, this.goTo("second");
			return;
		}
		let n = this.ctx, r = this.first;
		if (!n || !r) return;
		let i = ii(r, e, n.getStraightedgeAngle());
		if (!i) return;
		let a = oi(n);
		this.goTo("first"), a && t(n, a.layerId, a.layer, i);
	}
	onPointerMove(e) {
		let t = this.ctx;
		if (this.step !== "second" || !this.first || !t) return;
		this.previewSource.clear(!0);
		let n = ii(this.first, e, t.getStraightedgeAngle());
		n && this.previewSource.addFeature(new T(n));
	}
	goTo(e) {
		this.step = e, e === "first" && (this.first = null), this.previewSource.clear(!0), this.ctx?.promptChanged();
	}
}, ci = 1024;
function li(e, t, n) {
	let r = t[0] - e[0], i = t[1] - e[1], a = n[0] - e[0], o = n[1] - e[1], s = 2 * (r * o - i * a), c = Math.hypot(r, i) * Math.hypot(a, o);
	if (c === 0 || Math.abs(s) <= 1e-9 * c) return null;
	let l = r * r + i * i, u = a * a + o * o, d = (o * l - i * u) / s, f = (r * u - a * l) / s;
	return {
		center: [e[0] + d, e[1] + f],
		radius: Math.hypot(d, f)
	};
}
function ui(e, t, n = 24, r = ci) {
	if (!(e > 0) || !(t > 0) || t >= e) return n;
	let i = Math.ceil(Math.PI / Math.acos(1 - t / e));
	return Math.min(r, Math.max(n, Number.isFinite(i) ? i : r));
}
function di(e, t, n) {
	let r = ui(t, n), i = [];
	for (let n = 0; n < r; n++) {
		let a = 2 * Math.PI * n / r;
		i.push([Math.round((e[0] + t * Math.cos(a)) * 1e9) / 1e9 + 0, Math.round((e[1] + t * Math.sin(a)) * 1e9) / 1e9 + 0]);
	}
	return i.push([i[0][0], i[0][1]]), new M([i]);
}
//#endregion
//#region src/core/tools/circle.ts
var fi = [
	"centre-radius",
	"centre-point",
	"three-point"
], pi = "centre-radius", mi = {
	centre: "Centre: click on the map or type x,y",
	radius: "Radius: type the radius in {unit}, or click a point on the circle; Escape drops the centre",
	point: "Point on the circle: click on the map, or type x,y · @dx,dy · @distance<angle · distance relative to the centre; Escape drops the centre",
	first: "First point on the circle: click on the map or type x,y",
	second: "Second point on the circle: click or type (relative to the first point); Escape drops the first point",
	third: "Third point on the circle: click or type (relative to the second point); Escape drops the second point"
};
function hi(e = {}) {
	return e.method === void 0 ? pi : fi.includes(e.method) ? e.method : null;
}
function gi(e, t) {
	let n = new T(new j(e));
	return n.set(Y, t), n;
}
var _i = class extends m {
	id = "circle";
	method = pi;
	step = "centre";
	points = [];
	pointer = null;
	preview = null;
	previewSource = new F();
	canActivate(e, t) {
		return hi(t) !== null && C(e) !== null;
	}
	getOptions() {
		return {
			...this.options,
			method: this.method
		};
	}
	getInputRequest() {
		return this.step === "radius" ? "value" : null;
	}
	getPrompt() {
		return mi[this.step];
	}
	activate(e, t) {
		this.method = hi(t) ?? "centre-radius", this.pointer = new J({
			click: (e) => this.takePoint(e),
			move: (e) => this.onPointerMove(e)
		}), this.preview = X(this.previewSource), e.map.addLayer(this.preview), this.interactions = [this.pointer], super.activate(e, t), this.points = [], this.goTo(this.stepFor(0));
	}
	deactivate() {
		this.ctx && this.preview && this.ctx.map.removeLayer(this.preview), this.previewSource.clear(), this.removeInteractions(), this.pointer = null, this.preview = null, this.points = [], this.step = this.stepFor(0);
	}
	cancel() {
		this.removeLastPoint();
	}
	removeLastPoint() {
		return this.points.length !== 0 && (this.points.pop(), this.goTo(this.stepFor(this.points.length)), !0);
	}
	handleInput(e) {
		return this.takePoint(e), !0;
	}
	referencePoint() {
		return this.points[this.points.length - 1] ?? null;
	}
	stepFor(e) {
		return this.method === "three-point" ? e === 0 ? "first" : e === 1 ? "second" : "third" : e === 0 ? "centre" : this.method === "centre-radius" ? "radius" : "point";
	}
	takePoint(e) {
		let n = this.method === "three-point" ? 3 : 2;
		if (this.points.length < n - 1) {
			this.points.push(e), this.goTo(this.stepFor(this.points.length));
			return;
		}
		let r = this.ctx, i = this.circleThrough(e);
		if (!r || !i) return;
		let a = C(r);
		this.points = [], this.goTo(this.stepFor(0)), a && t(r, a.layerId, a.layer, this.polygon(r, i));
	}
	circleThrough(e) {
		if (this.method === "three-point") {
			let [t, n] = this.points;
			return t && n ? li(t, n, e) : null;
		}
		let t = this.points[0];
		if (!t) return null;
		let n = Math.hypot(e[0] - t[0], e[1] - t[1]);
		return n > 0 ? {
			center: t,
			radius: n
		} : null;
	}
	polygon(e, t) {
		let n = e.getCurveTolerance() * l(e.getProjection(), t.center);
		return di(t.center, t.radius, n);
	}
	onPointerMove(e) {
		let t = this.ctx;
		if (!t || this.points.length === 0) return;
		this.previewSource.clear(!0);
		let n = this.points.map((e) => gi(e, "picked")), r = this.circleThrough(e);
		r && n.push(new T(this.polygon(t, r))), this.method === "centre-radius" ? n.push(new T(new D([this.points[0], e]))) : this.method === "centre-point" ? n.push(gi(e, "hover")) : r || n.push(new T(new D([...this.points, e]))), this.previewSource.addFeatures(n);
	}
	goTo(e) {
		this.step = e, this.previewSource.clear(!0), this.ctx?.promptChanged();
	}
};
//#endregion
//#region src/core/geometry/ellipse.ts
function vi(e, t, n) {
	let r = e[0] - t[0], i = e[1] - t[1];
	return Math.abs(-r * Math.sin(n) + i * Math.cos(n));
}
function yi(e, t, n) {
	let r = Math.hypot(t[0] - e[0], t[1] - e[1]);
	if (r === 0) return null;
	let i = Math.atan2(t[1] - e[1], t[0] - e[0]), a = vi(n, e, i);
	return a > 1e-9 * r ? {
		center: [e[0], e[1]],
		a: r,
		b: a,
		rotation: i
	} : null;
}
function bi(e, t, n) {
	return yi([(e[0] + t[0]) / 2, (e[1] + t[1]) / 2], t, n);
}
function xi(e, t, n) {
	let r = n * Math.PI / 180, i = t[0] - e[0], a = t[1] - e[1], o = i * Math.cos(r) + a * Math.sin(r), s = -i * Math.sin(r) + a * Math.cos(r), c = 1e-9 * Math.hypot(i, a);
	return Math.abs(o) <= c || Math.abs(s) <= c ? null : {
		center: [(e[0] + t[0]) / 2, (e[1] + t[1]) / 2],
		a: Math.abs(o) / 2,
		b: Math.abs(s) / 2,
		rotation: r
	};
}
function Si(e, t) {
	let { center: n, a: r, b: i, rotation: a } = e, o = ui(Math.max(r, i), t), s = Math.cos(a), c = Math.sin(a), l = [];
	for (let e = 0; e < o; e++) {
		let t = 2 * Math.PI * e / o, a = r * Math.cos(t), u = i * Math.sin(t);
		l.push([Math.round((n[0] + a * s - u * c) * 1e9) / 1e9 + 0, Math.round((n[1] + a * c + u * s) * 1e9) / 1e9 + 0]);
	}
	return l.push([l[0][0], l[0][1]]), new M([l]);
}
//#endregion
//#region src/core/tools/ellipse.ts
var Ci = [
	"centre-axis",
	"axis",
	"box"
], wi = "centre-axis", Ti = {
	centre: "Centre: click on the map or type x,y",
	"axis-end": "End of the first axis: click on the map, or type x,y · @dx,dy · @distance<angle · distance relative to the centre; Escape drops the centre",
	first: "First end of the axis: click on the map or type x,y",
	second: "Second end of the axis: click or type (relative to the first end); Escape drops the first end",
	"half-axis": "Other half-axis: type its length in {unit}, or click a point at that distance from the axis; Escape goes back",
	corner: "First corner of the box: click on the map or type x,y",
	opposite: "Opposite corner: click or type (relative to the first corner); the box follows the straightedge; Escape drops the first corner"
}, Ei = {
	"centre-axis": [
		"centre",
		"axis-end",
		"half-axis"
	],
	axis: [
		"first",
		"second",
		"half-axis"
	],
	box: ["corner", "opposite"]
};
function Di(e = {}) {
	return e.method === void 0 ? wi : Ci.includes(e.method) ? e.method : null;
}
function Oi(e, t) {
	let n = new T(new j(e));
	return n.set(Y, t), n;
}
var ki = class extends m {
	id = "ellipse";
	method = wi;
	points = [];
	pointer = null;
	preview = null;
	previewSource = new F();
	canActivate(e, t) {
		return Di(t) !== null && C(e) !== null;
	}
	getOptions() {
		return {
			...this.options,
			method: this.method
		};
	}
	getInputRequest() {
		return this.step() === "half-axis" ? "value" : null;
	}
	getPrompt() {
		return Ti[this.step()];
	}
	activate(e, t) {
		this.method = Di(t) ?? "centre-axis", this.pointer = new J({
			click: (e) => this.takePoint(e),
			move: (e) => this.onPointerMove(e)
		}), this.preview = X(this.previewSource), e.map.addLayer(this.preview), this.interactions = [this.pointer], super.activate(e, t), this.reset([]);
	}
	deactivate() {
		this.ctx && this.preview && this.ctx.map.removeLayer(this.preview), this.previewSource.clear(), this.removeInteractions(), this.pointer = null, this.preview = null, this.points = [];
	}
	cancel() {
		this.removeLastPoint();
	}
	removeLastPoint() {
		return this.points.length !== 0 && (this.reset(this.points.slice(0, -1)), !0);
	}
	handleInput(e) {
		return this.takePoint(e), !0;
	}
	handleLength(e) {
		let t = this.ctx, n = this.centre();
		if (!t || this.step() !== "half-axis" || !n) return !1;
		if (!(Number.isFinite(e) && e > 0)) return !0;
		let r = this.points[1], i = Math.hypot(r[0] - n[0], r[1] - n[1]), a = Math.atan2(r[1] - n[1], r[0] - n[0]), o = e * l(t.getProjection(), n);
		return this.insert({
			center: n,
			a: i,
			b: o,
			rotation: a
		}), !0;
	}
	referencePoint() {
		return this.step() === "half-axis" ? this.centre() : this.points[this.points.length - 1] ?? null;
	}
	step() {
		let e = Ei[this.method];
		return e[Math.min(this.points.length, e.length - 1)];
	}
	centre() {
		if (this.method === "box" || this.points.length < 2) return null;
		let [e, t] = this.points;
		return this.method === "axis" ? [(e[0] + t[0]) / 2, (e[1] + t[1]) / 2] : e;
	}
	takePoint(e) {
		let t = Ei[this.method].length;
		if (this.points.length < t - 1) {
			let t = this.points[this.points.length - 1];
			if (t && t[0] === e[0] && t[1] === e[1]) return;
			this.reset([...this.points, e]);
			return;
		}
		let n = this.ellipseThrough(e);
		n && this.insert(n);
	}
	ellipseThrough(e) {
		let [t, n] = this.points;
		return t ? this.method === "box" ? xi(t, e, this.ctx?.getStraightedgeAngle() ?? 0) : n ? this.method === "axis" ? bi(t, n, e) : yi(t, n, e) : null : null;
	}
	insert(e) {
		let n = this.ctx;
		if (!n) return;
		let r = C(n);
		this.reset([]), r && t(n, r.layerId, r.layer, this.polygon(n, e));
	}
	polygon(e, t) {
		return Si(t, e.getCurveTolerance() * l(e.getProjection(), t.center));
	}
	onPointerMove(e) {
		let t = this.ctx;
		if (!t || this.points.length === 0) return;
		this.previewSource.clear(!0);
		let n = this.points.map((e) => Oi(e, "picked")), [r, i] = this.points;
		if (this.method === "box") {
			let i = ii(r, e, t.getStraightedgeAngle());
			i && n.push(new T(i));
		} else if (!i) n.push(new T(new D([r, e])));
		else {
			let e = this.method === "axis" ? r : i, t = this.method === "axis" ? i : this.reflect(r, i);
			n.push(new T(new D([e, t])));
		}
		let a = this.points.length === Ei[this.method].length - 1 ? this.ellipseThrough(e) : null;
		a && n.push(new T(this.polygon(t, a))), n.push(Oi(e, "hover")), this.previewSource.addFeatures(n);
	}
	reflect(e, t) {
		return [2 * e[0] - t[0], 2 * e[1] - t[1]];
	}
	reset(e) {
		this.points = e, this.previewSource.clear(!0), this.ctx?.promptChanged();
	}
};
function Ai(e) {
	return Number.isInteger(e) && e >= 3 && e <= 1024;
}
function ji(e, t, n) {
	let r = t[0] - e[0], i = t[1] - e[1], a = Math.hypot(r, i);
	if (!(a > 0) || !Ai(n)) return null;
	let o = Math.atan2(i, r), s = [];
	for (let t = 0; t < n; t++) {
		let r = o + 2 * Math.PI * t / n;
		s.push([Math.round((e[0] + a * Math.cos(r)) * 1e9) / 1e9 + 0, Math.round((e[1] + a * Math.sin(r)) * 1e9) / 1e9 + 0]);
	}
	return s.push([s[0][0], s[0][1]]), new M([s]);
}
var Mi = {
	sides: "Number of sides <{sides}>: type 3 or more, Enter keeps {sides}; a click sets the centre with {sides} sides",
	centre: "Centre: click on the map or type x,y; Escape returns to the number of sides",
	vertex: "Vertex: click on the map, or type x,y · @dx,dy · @distance<angle · distance (the circumradius in {unit}) relative to the centre; Escape drops the centre"
};
function Ni(e, t) {
	let n = new T(new j(e));
	return n.set(Y, t), n;
}
var Pi = class extends m {
	id = "regular-polygon";
	sides = 6;
	step = "sides";
	centre = null;
	pointer = null;
	preview = null;
	previewSource = new F();
	canActivate(e, t) {
		return t?.sides !== void 0 && !Ai(t.sides) ? !1 : C(e) !== null;
	}
	getInputRequest() {
		return this.step === "sides" ? "value" : null;
	}
	getPrompt() {
		return Mi[this.step].replaceAll("{sides}", String(this.sides));
	}
	getSides() {
		return this.sides;
	}
	activate(e, t) {
		this.pointer = new J({
			click: (e) => this.takePoint(e),
			move: (e) => this.onPointerMove(e)
		}), this.preview = X(this.previewSource), e.map.addLayer(this.preview), this.interactions = [this.pointer], super.activate(e, t), this.centre = null;
		let n = t?.sides;
		n !== void 0 && Ai(n) ? (this.sides = n, this.goTo("centre")) : this.goTo("sides");
	}
	deactivate() {
		this.ctx && this.preview && this.ctx.map.removeLayer(this.preview), this.previewSource.clear(), this.removeInteractions(), this.pointer = null, this.preview = null, this.centre = null, this.step = "sides";
	}
	cancel() {
		this.removeLastPoint();
	}
	removeLastPoint() {
		return this.step === "vertex" ? (this.centre = null, this.goTo("centre"), !0) : this.step === "centre" && (this.goTo("sides"), !0);
	}
	finish() {
		this.step === "sides" && this.goTo("centre");
	}
	handleValue(e) {
		return this.step !== "sides" || !Ai(e) ? !1 : (this.sides = e, this.goTo("centre"), !0);
	}
	handleInput(e) {
		return this.takePoint(e), !0;
	}
	referencePoint() {
		return this.step === "vertex" ? this.centre : null;
	}
	takePoint(e) {
		if (this.step !== "vertex") {
			this.centre = e, this.goTo("vertex");
			return;
		}
		let n = this.ctx, r = this.centre ? ji(this.centre, e, this.sides) : null;
		if (!n || !r) return;
		let i = C(n);
		this.centre = null, this.goTo("centre"), i && t(n, i.layerId, i.layer, r);
	}
	onPointerMove(e) {
		if (!this.ctx || this.step !== "vertex" || !this.centre) return;
		this.previewSource.clear(!0);
		let t = [Ni(this.centre, "picked"), Ni(e, "hover")], n = ji(this.centre, e, this.sides);
		n && t.push(new T(n)), t.push(new T(new D([this.centre, e]))), this.previewSource.addFeatures(t);
	}
	goTo(e) {
		this.step = e, this.previewSource.clear(!0), this.ctx?.promptChanged();
	}
}, Fi = {
	select: "Select the objects to rotate: click, Shift+click adds, Ctrl / Cmd+drag for a box; Enter continues",
	center: "Centre of rotation: click on the map or type x,y",
	start: "First point of the angle: click on the map, or type x,y · @dx,dy · @distance<angle; Escape goes back",
	end: "Second point of the angle: click on the map, or type x,y · @dx,dy · @distance<angle · distance; Escape goes back"
};
function Ii(e, t, n) {
	return Math.atan2(n[1] - e[1], n[0] - e[0]) - Math.atan2(t[1] - e[1], t[0] - e[0]);
}
function Li(e, t, n) {
	for (let r of e) r.getGeometry()?.rotate(t, n);
}
var Ri = class extends m {
	id = "rotate";
	step = "select";
	center = null;
	start = null;
	editable = null;
	selectInteractions = [];
	pointer = null;
	preview = null;
	previewSource = new F();
	suspended = !1;
	canActivate() {
		return !0;
	}
	getPrompt() {
		return Fi[this.step];
	}
	activate(e, t) {
		this.editable = ei(e), e.selection.collection.on("add", this.onSelectionChange), e.selection.collection.on("remove", this.onSelectionChange), this.selectInteractions = [K(e), q(e)], this.pointer = new J({
			click: (e) => this.takePoint(e),
			move: (e) => this.onPointerMove(e)
		}), this.preview = X(this.previewSource), e.map.addLayer(this.preview), this.interactions = [...this.selectInteractions, this.pointer], super.activate(e, t), this.goTo(this.editable.collection.getLength() > 0 ? "center" : "select");
	}
	deactivate() {
		let e = this.ctx;
		e && (e.selection.collection.un("add", this.onSelectionChange), e.selection.collection.un("remove", this.onSelectionChange), this.preview && e.map.removeLayer(this.preview)), this.previewSource.clear(), this.removeInteractions(), this.editable?.dispose(), this.editable = null, this.selectInteractions = [], this.pointer = null, this.preview = null, this.center = null, this.start = null, this.step = "select";
	}
	finish() {
		this.step === "select" && this.hasEditable() && this.goTo("center");
	}
	cancel() {
		this.step === "end" ? this.goTo("start") : this.step === "start" ? this.goTo("center") : this.step === "center" ? (this.ctx?.selection.clear(), this.goTo("select")) : this.ctx?.selection.clear();
	}
	removeLastPoint() {
		return this.step !== "start" && this.step !== "end" ? !1 : (this.cancel(), !0);
	}
	handleInput(e) {
		return this.step !== "select" && (this.takePoint(e), !0);
	}
	referencePoint() {
		return this.step === "start" || this.step === "end" ? this.center : null;
	}
	setSuspended(e) {
		this.suspended = e, this.applyActivity();
	}
	takePoint(e) {
		if (this.step === "center") this.center = e, this.goTo("start");
		else if (this.step === "start" && this.center) {
			if (zi(e, this.center)) return;
			this.start = e, this.goTo("end");
		} else this.step === "end" && this.center && this.start && this.applyRotation(e);
	}
	applyRotation(e) {
		let { ctx: t, center: n, start: r } = this, i = this.editable?.collection.getArray().slice() ?? [];
		if (!t || !n || !r || i.length === 0) {
			this.goTo("select");
			return;
		}
		let a = Qr(i);
		Li(i, Ii(n, r, e), n), $r(t, i, a), t.selection.clear(), this.goTo("select");
	}
	onPointerMove(e) {
		let { center: t, start: n } = this;
		if (!t || this.step === "select" || this.step === "center") return;
		if (this.previewSource.clear(!0), this.step === "start") {
			this.previewSource.addFeature(new T(new D([t, e])));
			return;
		}
		if (!n) return;
		let r = Ii(t, n, e), i = (this.editable?.collection.getArray() ?? []).flatMap((e) => {
			let n = e.getGeometry()?.clone();
			return n ? (n.rotate(r, t), [new T(n)]) : [];
		});
		this.previewSource.addFeatures([
			...i,
			new T(new D([t, n])),
			new T(new D([t, e]))
		]);
	}
	onSelectionChange = () => {
		queueMicrotask(() => {
			this.ctx && this.step !== "select" && !this.hasEditable() && this.goTo("select");
		});
	};
	hasEditable() {
		return (this.editable?.collection.getLength() ?? 0) > 0;
	}
	goTo(e) {
		this.step = e, (e === "select" || e === "center") && (this.center = null), e !== "end" && (this.start = null), this.previewSource.clear(!0), this.applyActivity(), this.ctx?.promptChanged();
	}
	applyActivity() {
		let e = !this.suspended && this.step === "select";
		for (let t of this.selectInteractions) t.setActive(e);
		this.pointer?.setActive(!this.suspended && this.step !== "select");
	}
};
function zi(e, t) {
	return e[0] === t[0] && e[1] === t[1];
}
//#endregion
//#region src/core/geometry/bezier.ts
var Bi = 1024, Vi = (e) => Math.round(e * 1e9) / 1e9 + 0;
function Hi(e, t) {
	let n = 1 - t, r = n * n * n, i = 3 * n * n * t, a = 3 * n * t * t, o = t * t * t, { start: s, startHandle: c, endHandle: l, end: u } = e;
	return [r * s[0] + i * c[0] + a * l[0] + o * u[0], r * s[1] + i * c[1] + a * l[1] + o * u[1]];
}
function Ui(e, t, n = 1, r = Bi) {
	let { start: i, startHandle: a, endHandle: o, end: s } = e, c = Math.max(Math.hypot(i[0] - 2 * a[0] + o[0], i[1] - 2 * a[1] + o[1]), Math.hypot(a[0] - 2 * o[0] + s[0], a[1] - 2 * o[1] + s[1]));
	if (!(c > 0) || !(t > 0)) return n;
	let l = Math.ceil(Math.sqrt(.75 * c / t));
	return Math.min(r, Math.max(n, Number.isFinite(l) ? l : r));
}
function Wi(e, t) {
	let n = Ui(e, t), r = [[e.start[0], e.start[1]]];
	for (let t = 1; t < n; t++) {
		let [i, a] = Hi(e, t / n);
		r.push([Vi(i), Vi(a)]);
	}
	return r.push([e.end[0], e.end[1]]), new D(r);
}
function Gi(e, t) {
	let n = t[0] - e[0], r = t[1] - e[1];
	return {
		startHandle: [e[0] + n / 3, e[1] + r / 3],
		endHandle: [t[0] - n / 3, t[1] - r / 3]
	};
}
//#endregion
//#region src/core/tools/curve.ts
var Ki = {
	start: "Start point: click on the map or type x,y",
	end: "End point: click on the map, or type x,y · @dx,dy · @distance<angle · distance relative to the start; Escape drops the start",
	shape: "Click a handle to change the entry or exit angle; Enter inserts the curve; Escape drops the end point",
	handle: "Handle: click where it goes, or type x,y · @dx,dy · @distance<angle · distance relative to its end point; Escape puts it back"
};
function Z(e, t) {
	let n = new T(new j(e));
	return t && n.set(Y, t), n;
}
var qi = class extends m {
	id = "curve";
	step = "start";
	start = null;
	end = null;
	handles = null;
	picked = null;
	pickedFrom = null;
	hovered = null;
	pointer = null;
	preview = null;
	previewSource = new F();
	canActivate(e) {
		return he(e) !== null;
	}
	getPrompt() {
		return Ki[this.step];
	}
	activate(e, t) {
		this.pointer = new J({
			click: (e, t) => this.onClick(e, t),
			move: (e, t) => this.onPointerMove(e, t)
		}), this.preview = X(this.previewSource), e.map.addLayer(this.preview), this.interactions = [this.pointer], super.activate(e, t), this.reset(), this.goTo("start");
	}
	deactivate() {
		this.ctx && this.preview && this.ctx.map.removeLayer(this.preview), this.previewSource.clear(), this.removeInteractions(), this.pointer = null, this.preview = null, this.reset(), this.step = "start";
	}
	finish() {
		let e = this.ctx;
		if (!e || !this.start || !this.end || !this.handles) return;
		this.step === "handle" && this.placeHandle(this.currentHandle() ?? this.handles.start);
		let n = he(e);
		if (!n) return;
		let r = this.curve(), i = e.getCurveTolerance() * l(e.getProjection(), r.start);
		t(e, n.layerId, n.layer, Wi(r, i)) && (this.reset(), this.goTo("start"));
	}
	cancel() {
		this.removeLastPoint();
	}
	removeLastPoint() {
		return this.step === "handle" ? (this.picked && this.pickedFrom && this.handles && (this.handles[this.picked] = this.pickedFrom), this.picked = null, this.pickedFrom = null, this.goTo("shape"), !0) : this.step === "shape" ? (this.end = null, this.handles = null, this.goTo("end"), !0) : this.step === "end" && (this.start = null, this.goTo("start"), !0);
	}
	handleInput(e) {
		return this.step !== "shape" && (this.takePoint(e), !0);
	}
	referencePoint() {
		return this.step === "end" ? this.start : this.step === "handle" && this.picked ? this.picked === "start" ? this.start : this.end : null;
	}
	curve() {
		return !this.start || !this.end || !this.handles ? null : {
			start: this.start,
			startHandle: this.handles.start,
			endHandle: this.handles.end,
			end: this.end
		};
	}
	reset() {
		this.start = null, this.end = null, this.handles = null, this.picked = null, this.pickedFrom = null, this.hovered = null;
	}
	currentHandle() {
		return this.picked && this.handles ? this.handles[this.picked] : null;
	}
	onClick(e, t) {
		if (this.step === "shape") {
			let e = this.handleAt(t);
			if (!e || !this.handles) return;
			this.picked = e, this.pickedFrom = this.handles[e], this.goTo("handle");
		} else this.takePoint(e);
	}
	takePoint(e) {
		if (this.step === "start") this.start = e, this.goTo("end");
		else if (this.step === "end") {
			let t = this.start;
			if (e[0] === t[0] && e[1] === t[1]) return;
			this.end = e;
			let { startHandle: n, endHandle: r } = Gi(t, e);
			this.handles = {
				start: n,
				end: r
			}, this.goTo("shape");
		} else this.step === "handle" && (this.placeHandle(e), this.goTo("shape"));
	}
	placeHandle(e) {
		this.picked && this.handles && (this.handles[this.picked] = e), this.picked = null, this.pickedFrom = null;
	}
	handleAt(e) {
		if (!this.ctx || !this.handles) return null;
		let t = Hr(this.ctx), n = (t) => Math.hypot(t[0] - e[0], t[1] - e[1]);
		return ["start", "end"].map((e) => ({
			handle: e,
			distance: n(this.handles[e])
		})).filter((e) => e.distance <= t).sort((e, t) => e.distance - t.distance)[0]?.handle ?? null;
	}
	onPointerMove(e, t) {
		this.step === "end" && this.start ? (this.previewSource.clear(!0), this.previewSource.addFeatures([Z(this.start, "picked"), new T(new D([this.start, e]))])) : this.step === "handle" && this.picked && this.handles ? (this.handles[this.picked] = e, this.renderShape()) : this.step === "shape" && (this.hovered = this.handleAt(t), this.renderShape());
	}
	renderShape() {
		let e = this.ctx, t = this.curve();
		if (this.previewSource.clear(!0), !e || !t) return;
		let n = e.getCurveTolerance() * l(e.getProjection(), t.start), r = this.picked ?? this.hovered;
		this.previewSource.addFeatures([
			new T(Wi(t, n)),
			new T(new D([t.start, t.startHandle])),
			new T(new D([t.end, t.endHandle])),
			Z(t.start, "picked"),
			Z(t.end, "picked"),
			Z(t.startHandle, r === "start" ? "hover" : null),
			Z(t.endHandle, r === "end" ? "hover" : null)
		]);
	}
	goTo(e) {
		this.step = e, this.hovered = null, this.previewSource.clear(!0), (e === "shape" || e === "handle") && this.renderShape(), this.ctx?.promptChanged();
	}
}, Ji = (e) => Math.round(e * 1e9) / 1e9 + 0, Q = (e, t) => e[0] === t[0] && e[1] === t[1];
function Yi(e) {
	let t = [];
	for (let n of e) (t.length === 0 || !Q(t[t.length - 1], n)) && t.push(n);
	return t;
}
function Xi(e) {
	let t = 0;
	for (let n = 0; n < e.length; n++) {
		let r = e[n], i = e[(n + 1) % e.length];
		t += r[0] * i[1] - i[0] * r[1];
	}
	return t;
}
function Zi(e, t) {
	let n = e.dx * t.dy - e.dy * t.dx;
	if (Math.abs(n) <= 1e-12 * Math.hypot(e.dx, e.dy) * Math.hypot(t.dx, t.dy)) return null;
	let r = ((t.a[0] - e.a[0]) * t.dy - (t.a[1] - e.a[1]) * t.dx) / n;
	return [e.a[0] + r * e.dx, e.a[1] + r * e.dy];
}
function Qi(e, t, n) {
	let r = Yi(e);
	if (n && r.length > 1 && Q(r[0], r[r.length - 1]) && (r = r.slice(0, -1)), r.length < (n ? 3 : 2) || !(Math.abs(t) > 0)) return null;
	let i = n ? r.length : r.length - 1, a = [];
	for (let e = 0; e < i; e++) {
		let n = r[e], i = r[(e + 1) % r.length], o = i[0] - n[0], s = i[1] - n[1], c = Math.hypot(o, s), l = -s / c * t, u = o / c * t;
		a.push({
			a: [n[0] + l, n[1] + u],
			b: [i[0] + l, i[1] + u],
			dx: o,
			dy: s
		});
	}
	let o = (e, n, r) => {
		let i = e.dx * n.dx + e.dy * n.dy, a = Zi(e, n);
		return a ? Math.hypot(a[0] - r[0], a[1] - r[1]) > 4 * Math.abs(t) ? [e.b, n.a] : [a] : i > 0 ? [n.a] : [e.b, n.a];
	}, s = [];
	for (let e = 0; e < i; e++) {
		let t = a[(e - 1 + i) % i];
		s.push(e === 0 && !n ? [a[0].a] : o(t, a[e], r[e]));
	}
	for (let e = 0; e < i; e++) {
		let t = s[e][s[e].length - 1], r = e === i - 1 && !n ? a[e].b : s[(e + 1) % i][0], { dx: o, dy: c } = a[e];
		if ((r[0] - t[0]) * o + (r[1] - t[1]) * c <= 0) return null;
	}
	let c = s.flat();
	n || c.push(a[i - 1].b);
	let l = Yi(c.map(([e, t]) => [Ji(e), Ji(t)]));
	return n && l.length > 1 && Q(l[0], l[l.length - 1]) && l.pop(), l.length < (n ? 3 : 2) ? null : (n && l.push([l[0][0], l[0][1]]), l);
}
var $i = (e, t, n, r) => e * r - t * n;
function ea(e, t, n) {
	let r = Yi(e);
	if (n && r.length > 1 && Q(r[0], r[r.length - 1]) && (r = r.slice(0, -1)), r.length < (n ? 3 : 2) || !(Math.abs(t) > 0)) return null;
	let i = n ? r.length : r.length - 1, a = [];
	for (let e = 0; e < i; e++) {
		let n = r[e], i = r[(e + 1) % r.length], o = i[0] - n[0], s = i[1] - n[1], c = Math.hypot(o, s), l = -s / c * t, u = o / c * t;
		a.push({
			a: [n[0] + l, n[1] + u],
			b: [i[0] + l, i[1] + u],
			dx: o,
			dy: s,
			oa: n,
			ob: i
		});
	}
	let o = (e, n) => {
		let r = $i(e.dx, e.dy, n.dx, n.dy), i = Zi(e, n);
		return i ? r * t > 0 ? [i] : Math.hypot(i[0] - e.ob[0], i[1] - e.ob[1]) > 4 * Math.abs(t) ? [e.b, n.a] : [i] : e.dx * n.dx + e.dy * n.dy > 0 ? [n.a] : [e.b, n.a];
	}, s = n ? 3 : 1;
	for (let e = 0; e <= i * 2; e++) {
		if (a.length < s) return null;
		let e = a.length, t = n ? e : e - 1, i = -1;
		for (let n = 0; n < t && e > 1; n++) {
			let t = a[n], r = a[(n + 1) % e];
			if (Zi(t, r) || t.dx * r.dx + t.dy * r.dy >= 0) continue;
			let o = $i(t.dx, t.dy, r.oa[0] - t.oa[0], r.oa[1] - t.oa[1]), s = $i(t.dx, t.dy, r.a[0] - t.a[0], r.a[1] - t.a[1]);
			if (o !== 0 && Math.sign(o) !== Math.sign(s)) {
				i = n;
				break;
			}
		}
		if (i >= 0) {
			let t = (i + 1) % e;
			a = a.filter((e, n) => n !== i && n !== t);
			continue;
		}
		let c = [];
		for (let t = 0; t < e; t++) c.push(t === 0 && !n ? [a[0].a] : o(a[(t - 1 + e) % e], a[t]));
		let l = -1;
		for (let t = 0; t < e; t++) {
			let r = c[t][c[t].length - 1], i = t === e - 1 && !n ? a[t].b : c[(t + 1) % e][0], { dx: o, dy: s } = a[t];
			if ((i[0] - r[0]) * o + (i[1] - r[1]) * s <= 0) {
				l = t;
				break;
			}
		}
		if (l >= 0) {
			a = a.filter((e, t) => t !== l);
			continue;
		}
		let u = c.flat();
		n || u.push(a[e - 1].b);
		let d = Yi(u.map(([e, t]) => [Ji(e), Ji(t)]));
		if (n && d.length > 1 && Q(d[0], d[d.length - 1]) && d.pop(), d.length < (n ? 3 : 2)) return null;
		if (n) {
			if (Math.sign(Xi(d)) !== Math.sign(Xi(r))) return null;
			d.push([d[0][0], d[0][1]]);
		}
		return d;
	}
	return null;
}
function ta(e, t, n) {
	let r = Xi(e.slice(0, -1));
	return r === 0 ? null : Qi(e, (r > 0 === n ? 1 : -1) * t, !0);
}
function na(e, t) {
	let n = e[0] ? ta(e[0], t, !1) : null;
	if (!n) return null;
	let r = [n];
	for (let n of e.slice(1)) {
		let e = ta(n, t, !0);
		e && r.push(e);
	}
	return r;
}
function ra(e, t) {
	if (e instanceof D) {
		let n = Qi(e.getCoordinates(), t, !1);
		return n ? new D(n) : null;
	}
	if (e instanceof O) {
		let n = e.getCoordinates().map((e) => Qi(e, t, !1)).filter((e) => e !== null);
		return n.length ? new O(n) : null;
	}
	if (e instanceof M) {
		let n = na(e.getCoordinates(), t);
		return n ? new M(n) : null;
	}
	if (e instanceof A) {
		let n = e.getCoordinates().map((e) => na(e, t)).filter((e) => e !== null);
		return n.length ? new A(n) : null;
	}
	return null;
}
function ia(e, t) {
	if (e instanceof M || e instanceof A) return e.intersectsCoordinate(t) ? -1 : 1;
	if (e instanceof D || e instanceof O) {
		let n = en(e, t);
		if (!n) return null;
		let [r, i] = n, a = (i[0] - r[0]) * (t[1] - r[1]) - (i[1] - r[1]) * (t[0] - r[0]);
		return a > 0 ? 1 : a < 0 ? -1 : null;
	}
	return null;
}
//#endregion
//#region src/core/geometry/trim.ts
function aa(e) {
	let t = [0];
	for (let n = 1; n < e.length; n++) t.push(t[n - 1] + Math.hypot(e[n][0] - e[n - 1][0], e[n][1] - e[n - 1][1]));
	return t;
}
function oa(e, t) {
	let n = aa(e), r = 0, i = Infinity;
	for (let a = 1; a < e.length; a++) {
		let o = e[a - 1], s = e[a], c = Math.min(1, Math.max(0, U(t, o, s).t)), l = [o[0] + c * (s[0] - o[0]), o[1] + c * (s[1] - o[1])], u = Math.hypot(t[0] - l[0], t[1] - l[1]);
		u < i && (i = u, r = n[a - 1] + c * (n[a] - n[a - 1]));
	}
	return r;
}
function sa(e, t, n, r, i) {
	let a = n ?? {
		s: 0,
		point: e[0]
	}, o = r ?? {
		s: t[t.length - 1],
		point: e[e.length - 1]
	}, s = [[a.point[0], a.point[1]]];
	for (let n = 0; n < e.length; n++) t[n] > a.s + i && t[n] < o.s - i && s.push([e[n][0], e[n][1]]);
	return s.push([o.point[0], o.point[1]]), s;
}
function ca(e, t, n) {
	if (e.length < 2) return null;
	let r = aa(e), i = r[r.length - 1];
	if (!(i > 0)) return null;
	let a = 1e-9 * i, o = [];
	for (let n = 1; n < e.length; n++) for (let [i, a] of t) {
		let t = s(e[n - 1], e[n], i, a);
		t && o.push({
			s: r[n - 1] + t.t * (r[n] - r[n - 1]),
			point: t.point
		});
	}
	let c = oa(e, n), l = null, u = null;
	for (let e of o) e.s < c - a && (!l || e.s > l.s) && (l = e), e.s > c + a && (!u || e.s < u.s) && (u = e);
	if (!l && !u) return null;
	let d = [];
	return l && l.s > a && d.push(sa(e, r, null, l, a)), u && u.s < i - a && d.push(sa(e, r, u, null, a)), d.length === 0 ? null : {
		kept: d,
		removed: sa(e, r, l, u, a)
	};
}
function la(e, t, n) {
	if (e.length < 2) return null;
	let r = aa(e), i = r[r.length - 1];
	if (!(i > 0)) return null;
	let a = oa(e, n) <= i / 2, o = a ? 0 : e.length - 1, s = e[o], c = a ? 1 : -1, l;
	for (let t = o + c; t >= 0 && t < e.length; t += c) if (e[t][0] !== s[0] || e[t][1] !== s[1]) {
		l = e[t];
		break;
	}
	if (!l) return null;
	let u = (1e-9 * i) ** 2;
	if (t.some((e) => ze(s, e) <= u)) return null;
	let d = [s[0] - l[0], s[1] - l[1]], f = null, p = Infinity;
	for (let [e, n] of t) {
		let t = te(s, d, e, n);
		t && t.t < p && (p = t.t, f = t.point);
	}
	if (!f) return null;
	let m = e.map((e) => [e[0], e[1]]);
	return m[o] = f, {
		line: m,
		added: [[s[0], s[1]], f]
	};
}
//#endregion
//#region src/core/geometry/parallel.ts
function ua(e) {
	return e instanceof D ? [{
		coords: e.getCoordinates(),
		closed: !1
	}] : e instanceof O ? e.getCoordinates().map((e) => ({
		coords: e,
		closed: !1
	})) : e instanceof M ? e.getCoordinates().map((e) => ({
		coords: e,
		closed: !0
	})) : e instanceof A ? e.getCoordinates().flatMap((e) => e.map((e) => ({
		coords: e,
		closed: !0
	}))) : [];
}
function da(e, t) {
	let n = null;
	for (let r = 1; r < e.length; r++) {
		let i = e[r - 1], a = e[r];
		if (i[0] === a[0] && i[1] === a[1]) continue;
		let o = Math.min(1, Math.max(0, U(t, i, a).t)), s = Math.hypot(t[0] - (i[0] + o * (a[0] - i[0])), t[1] - (i[1] + o * (a[1] - i[1])));
		(!n || s < n.d) && (n = {
			a: i,
			b: a,
			d: s
		});
	}
	return n;
}
function fa(e, t) {
	let n = ua(e), r = null;
	for (let e of n) {
		let n = da(e.coords, t);
		n && (!r || n.d < r.d) && (r = {
			base: e,
			...n
		});
	}
	if (!r) return "unsupported";
	let { base: i, a, b: o } = r, s = Math.hypot(o[0] - a[0], o[1] - a[1]), c = ((o[0] - a[0]) * (t[1] - a[1]) - (o[1] - a[1]) * (t[0] - a[0])) / s;
	if (Math.abs(c) <= 1e-9 * s) {
		let e = i.coords.map((e) => [e[0], e[1]]);
		return i.closed && (e[0][0] !== e.at(-1)[0] || e[0][1] !== e.at(-1)[1]) && e.push([e[0][0], e[0][1]]), {
			path: e,
			closed: i.closed,
			distance: 0
		};
	}
	let l = ea(i.coords, c, i.closed);
	if (!l) return "collapsed";
	let u = ga(l, i.closed, pa(n), Math.abs(c), t);
	return typeof u == "string" ? u : {
		...u,
		distance: c
	};
}
function pa(e) {
	let t = [];
	for (let { coords: n } of e) for (let e = 1; e < n.length; e++) {
		let r = n[e - 1], i = n[e];
		(r[0] !== i[0] || r[1] !== i[1]) && t.push([r, i]);
	}
	return t;
}
function ma(e, t, n, r) {
	let i = t[0] - e[0], a = t[1] - e[1], o = r[0] - n[0], s = r[1] - n[1], c = i * s - a * o;
	if (Math.abs(c) <= 1e-12 * Math.hypot(i, a) * Math.hypot(o, s)) return null;
	let l = n[0] - e[0], u = n[1] - e[1], d = (l * s - u * o) / c, f = (l * a - u * i) / c;
	return d < -1e-12 || d > 1.000000000001 || f < -1e-12 || f > 1.000000000001 ? null : {
		t: d,
		u: f
	};
}
function ha(e, t, n) {
	for (let [r, i] of t) {
		let t = i[0] - r[0], a = i[1] - r[1], o = t * t + a * a, s = ((e[0] - r[0]) * t + (e[1] - r[1]) * a) / o;
		if (!(s <= 1e-9 || s >= 1 - 1e-9) && Math.abs(t * (e[1] - r[1]) - a * (e[0] - r[0])) / Math.sqrt(o) < n * (1 - 1e-6)) return !0;
	}
	return !1;
}
function ga(e, t, n, r, i) {
	let a = e, o = 0;
	if (t) {
		let t = ya(e, i), n = $(e, !0, t, t + va(e));
		if (!n) return "collapsed";
		a = n;
	} else o = ya(e, i);
	let s = _a(a), c = s.at(-1), l = 1e-7 * c + 1e-9, u = a.length - 1, d = [0, c], f = [], p = (e, t) => s[e] + t * (s[e + 1] - s[e]);
	for (let e = 0; e < u; e++) for (let n = e + 2; n < u; n++) {
		if (t && e === 0 && n === u - 1) continue;
		let r = ma(a[e], a[e + 1], a[n], a[n + 1]);
		if (!r) continue;
		let i = p(e, r.t), o = p(n, r.u);
		o - i <= l || (d.push(i, o), f.push([i, o]));
	}
	for (let [e, t] of n) {
		let n = Math.hypot(t[0] - e[0], t[1] - e[1]), i = -(t[1] - e[1]) / n * r, o = (t[0] - e[0]) / n * r, s = (e) => [e[0] + i, e[1] + o], c = (e) => [e[0] - i, e[1] - o], l = [
			[s(e), s(t)],
			[c(e), c(t)],
			[c(e), s(e)],
			[c(t), s(t)]
		];
		for (let e = 0; e < u; e++) for (let [t, n] of l) {
			let r = ma(a[e], a[e + 1], t, n);
			r && d.push(p(e, r.t));
		}
	}
	d.sort((e, t) => e - t);
	let m = [];
	for (let e of d) (m.length === 0 || e - m[m.length - 1] > l) && m.push(e);
	m[m.length - 1] = c;
	let h = [];
	for (let e = 1; e < m.length; e++) {
		let t = m[e - 1], i = m[e];
		h.push({
			a: t,
			b: i,
			valid: !ha(ba(a, s, (t + i) / 2), n, r)
		});
	}
	let g = t ? h[0] : ((e) => {
		let t = h.filter((t) => t.a - l <= e && e <= t.b + l);
		return t.find((e) => e.valid) ?? t[0];
	})(o);
	if (!g?.valid) return "too-close";
	let _ = [[g.a, g.b]], v = h.indexOf(g);
	for (;;) {
		let e = h[v].b, t = h[v + 1];
		if (!t) break;
		if (t.valid) {
			_[_.length - 1][1] = t.b, v++;
			continue;
		}
		let n = f.filter(([t, n]) => Math.abs(t - e) <= l && n > e + l).map(([, e]) => h.findIndex((t) => Math.abs(t.a - e) <= l)).find((e) => e > v && h[e].valid);
		if (n === void 0) break;
		v = n, _.push([h[v].a, h[v].b]);
	}
	let ee = h[v].b, y = t ? h.length : h.indexOf(g), b = [], x = t ? ee : -Infinity;
	for (;;) {
		let e = y === h.length ? c : h[y].a, t = h[y - 1];
		if (!t || t.a < x - l) break;
		if (t.valid) {
			b.length && Math.abs(b[0][0] - e) <= l ? b[0][0] = t.a : b.unshift([t.a, t.b]), y--;
			continue;
		}
		let n = f.filter(([t, n]) => Math.abs(n - e) <= l && t < e - l).map(([e]) => h.findIndex((t) => Math.abs(t.b - e) <= l)).find((e) => e >= 0 && e < y && h[e].valid && h[e].a >= x - l);
		if (n === void 0) break;
		b.unshift([h[n].a, h[n].b]), y = n;
	}
	if (t && _.length === 1 && _[0][0] <= l && _[0][1] >= c - l) return {
		path: e,
		closed: !0
	};
	let te = [...b, ..._];
	if (!t && b.length && _.length) {
		let e = b[b.length - 1];
		Math.abs(e[1] - _[0][0]) <= l && te.splice(b.length - 1, 2, [e[0], _[0][1]]);
	}
	let S = [];
	for (let [e, t] of te) for (let n of $(a, !1, e, t) ?? []) {
		let e = S[S.length - 1];
		(!e || Math.hypot(n[0] - e[0], n[1] - e[1]) > l) && S.push(n);
	}
	return S.length >= 2 ? {
		path: S,
		closed: !1
	} : "too-close";
}
function _a(e) {
	let t = [0];
	for (let n = 1; n < e.length; n++) t.push(t[n - 1] + Math.hypot(e[n][0] - e[n - 1][0], e[n][1] - e[n - 1][1]));
	return t;
}
function va(e) {
	return _a(e).at(-1) ?? 0;
}
function ya(e, t) {
	return oa(e, t);
}
function ba(e, t, n) {
	if (n <= 0) return [e[0][0], e[0][1]];
	for (let r = 1; r < e.length; r++) if (n <= t[r]) {
		let i = t[r] - t[r - 1], a = i > 0 ? (n - t[r - 1]) / i : 0, o = e[r - 1], s = e[r];
		return [o[0] + a * (s[0] - o[0]), o[1] + a * (s[1] - o[1])];
	}
	let r = e[e.length - 1];
	return [r[0], r[1]];
}
function $(e, t, n, r) {
	if (e.length < 2) return null;
	if (r < n) return $(e, t, r, n)?.reverse() ?? null;
	let i = e, a = _a(e), o = a.at(-1);
	if (!(o > 0)) return null;
	let s = 1e-9 * o;
	if (t) {
		let t = Math.floor(n / o);
		n -= t * o, r = Math.min(r - t * o, n + o), i = [...e, ...e.slice(1)], a = [...a, ...a.slice(1).map((e) => e + o)];
	} else n = Math.min(Math.max(n, 0), o), r = Math.min(Math.max(r, 0), o);
	if (r - n <= s) return null;
	let c = [ba(i, a, n)];
	for (let e = 0; e < i.length; e++) a[e] > n + s && a[e] < r - s && c.push([i[e][0], i[e][1]]);
	return c.push(ba(i, a, r)), c;
}
//#endregion
//#region src/core/tools/offset.ts
var xa = {
	select: "Select the object to offset: click a line or polygon",
	distance: "Offset distance: type the distance in {unit} (or with a unit: 5 ft); Escape goes back",
	distanceAgain: "Offset distance <{distance}>: type the distance in {unit} (or with its unit: 5 ft), Enter keeps {distance}; Escape goes back",
	side: "Side: click on the side the offset goes to (inside or outside of a polygon); Escape goes back"
}, Sa = /* @__PURE__ */ new Set([
	"LineString",
	"MultiLineString",
	"Polygon",
	"MultiPolygon"
]);
function Ca(e) {
	let t = e.getGeometry();
	return t !== void 0 && Sa.has(t.getType());
}
function wa(e, t, n) {
	let r = h(n.getType()), i = (t) => {
		if (!t || !e.layers.has(t) || !e.layers.canEdit(t, "insert")) return null;
		let n = e.layers.getConfig(t), i = h(n.geometryType);
		return i === null || i === r ? {
			layerId: t,
			layer: n
		} : null;
	};
	return i(t) ?? i(e.getActiveLayer()) ?? i(e.getDraftLayer());
}
var Ta = class extends m {
	id = "offset";
	step = "select";
	distance = null;
	select = null;
	pointer = null;
	preview = null;
	previewSource = new F();
	suspended = !1;
	canActivate() {
		return !0;
	}
	getInputRequest() {
		return this.step === "distance" ? "value" : null;
	}
	getPrompt() {
		return this.step === "distance" && this.distance !== null ? xa.distanceAgain.replaceAll("{distance}", this.ctx ? this.ctx.formatLength(this.distance) : `${this.distance} m`) : xa[this.step];
	}
	getDistance() {
		return this.distance;
	}
	activate(e, t) {
		e.selection.collection.on("add", this.onSelectionChange), e.selection.collection.on("remove", this.onSelectionChange), this.select = K(e), this.pointer = new J({
			click: (e) => this.takeSide(e),
			move: (e) => this.onPointerMove(e)
		}), this.preview = X(this.previewSource), e.map.addLayer(this.preview), this.interactions = [this.select, this.pointer], super.activate(e, t), this.goTo(this.source() ? "distance" : "select");
	}
	deactivate() {
		let e = this.ctx;
		e && (e.selection.collection.un("add", this.onSelectionChange), e.selection.collection.un("remove", this.onSelectionChange), this.preview && e.map.removeLayer(this.preview)), this.previewSource.clear(), this.removeInteractions(), this.select = null, this.pointer = null, this.preview = null, this.step = "select";
	}
	finish() {
		this.step === "distance" && this.distance !== null && this.goTo("side");
	}
	cancel() {
		this.step === "side" ? this.goTo("distance") : this.step === "distance" ? (this.ctx?.selection.clear(), this.goTo("select")) : this.ctx?.selection.clear();
	}
	removeLastPoint() {
		return this.step !== "select" && (this.cancel(), !0);
	}
	handleLength(e) {
		return this.step !== "distance" || !(e > 0) || !Number.isFinite(e) ? !1 : (this.distance = e, this.goTo("side"), !0);
	}
	handleInput(e) {
		return this.step === "side" && (this.takeSide(e), !0);
	}
	setSuspended(e) {
		this.suspended = e, this.applyActivity();
	}
	source() {
		let e = this.ctx?.selection.get() ?? [];
		return e.length === 1 && Ca(e[0]) ? e[0] : null;
	}
	offsetFor(e) {
		let t = this.ctx, n = this.source()?.getGeometry();
		if (!t || !n || this.distance === null) return null;
		let r = ia(n, e);
		if (r === null) return null;
		let i = n.getClosestPoint(e);
		return ra(n, r * (this.distance * l(t.getProjection(), i)));
	}
	takeSide(e) {
		let n = this.ctx, r = this.source(), i = this.offsetFor(e);
		if (!n || !r || !i) return;
		let a = wa(n, n.layers.layerOf(r), i);
		a && t(n, a.layerId, a.layer, i) && this.goTo("select");
	}
	onPointerMove(e) {
		if (this.step !== "side") return;
		this.previewSource.clear(!0);
		let t = this.offsetFor(e);
		t && this.previewSource.addFeature(new T(t));
	}
	onSelectionChange = () => {
		queueMicrotask(() => {
			if (!this.ctx) return;
			let e = this.source();
			this.step === "select" && e ? this.goTo("distance") : this.step !== "select" && !e && this.goTo("select");
		});
	};
	applyActivity() {
		this.select?.setActive(!this.suspended && this.step === "select"), this.pointer?.setActive(!this.suspended && this.step === "side");
	}
	goTo(e) {
		this.step = e, this.previewSource.clear(!0), this.applyActivity(), this.ctx?.promptChanged(), e === "select" && this.source() && this.goTo("distance");
	}
}, Ea = {
	select: "Select the line or polygon to draw parallel to: click it",
	start: "Start point of the parallel: click or type x,y; Escape picks another object",
	end: "End of the parallel: move along the object and click, or type its length in {unit}, or x,y; Escape drops the start point"
}, Da = {
	collapsed: "No parallel at this distance: the object bends too tightly.",
	"too-close": "Too close to another part of the object for this distance."
};
function Oa(e, t) {
	let n = new T(new j(e));
	return n.set(Y, t), n;
}
var ka = class extends m {
	id = "parallel";
	step = "select";
	reference = null;
	run = null;
	notice = null;
	select = null;
	pointer = null;
	preview = null;
	previewSource = new F();
	suspended = !1;
	canActivate(e) {
		return he(e) !== null;
	}
	getPrompt() {
		let e = Ea[this.step];
		return this.notice ? `${this.notice} ${e}` : e;
	}
	activate(e, t) {
		e.selection.collection.on("add", this.onSelectionChange), e.selection.collection.on("remove", this.onSelectionChange), this.select = K(e), this.pointer = new J({
			click: (e) => this.takePoint(e),
			move: (e) => this.onPointerMove(e)
		}), this.preview = X(this.previewSource), e.map.addLayer(this.preview), this.interactions = [this.select, this.pointer], super.activate(e, t), this.reference = null, this.goTo("select");
	}
	deactivate() {
		let e = this.ctx;
		e && (e.selection.collection.un("add", this.onSelectionChange), e.selection.collection.un("remove", this.onSelectionChange), this.preview && e.map.removeLayer(this.preview)), this.previewSource.clear(), this.removeInteractions(), this.select = null, this.pointer = null, this.preview = null, this.reference = null, this.run = null, this.notice = null, this.step = "select";
	}
	cancel() {
		this.step === "end" ? this.goTo("start") : this.step === "start" ? (this.reference = null, this.ctx?.selection.clear(), this.goTo("select")) : this.ctx?.selection.clear();
	}
	removeLastPoint() {
		return this.step !== "select" && (this.cancel(), !0);
	}
	handleLength(e) {
		let { ctx: t, run: n } = this;
		if (!t || this.step !== "end" || !n) return !1;
		if (!(Number.isFinite(e) && e > 0)) return !0;
		let r = e * l(t.getProjection(), n.start), i = n.to < n.from ? -1 : 1;
		return this.finishAt(this.clamp(n, n.from + i * r)), !0;
	}
	handleInput(e) {
		return this.step !== "select" && (this.takePoint(e), !0);
	}
	referencePoint() {
		return this.step === "end" ? this.run?.start ?? null : null;
	}
	setSuspended(e) {
		this.suspended = e, this.applyActivity();
	}
	selectedReference() {
		let e = this.ctx?.selection.get() ?? [];
		return e.length === 1 && Ca(e[0]) ? e[0] : null;
	}
	takePoint(e) {
		if (this.step === "start") {
			let t = this.reference?.getGeometry();
			if (!t) return;
			let n = fa(t, e);
			if (typeof n == "string") {
				if (n === "unsupported") return;
				this.notice = Da[n], this.ctx?.promptChanged();
				return;
			}
			let r = ya(n.path, e);
			this.run = {
				path: n.path,
				closed: n.closed,
				length: va(n.path),
				start: e,
				from: r,
				to: r
			}, this.goTo("end");
		} else this.step === "end" && this.run && this.finishAt(this.follow(this.run, e));
	}
	follow(e, t) {
		let n = ya(e.path, t);
		if (!e.closed) return n;
		let r = e.length, i = n - (e.to % r + r) % r;
		return i > r / 2 ? i -= r : i <= -r / 2 && (i += r), this.clamp(e, e.to + i);
	}
	clamp(e, t) {
		return e.closed ? Math.min(Math.max(t, e.from - e.length), e.from + e.length) : Math.min(Math.max(t, 0), e.length);
	}
	finishAt(e) {
		let { ctx: n, run: r } = this;
		if (!n || !r) return;
		let i = $(r.path, r.closed, r.from, e);
		if (!i) return;
		let a = he(n);
		a && (this.goTo("start"), t(n, a.layerId, a.layer, new D(i)));
	}
	onPointerMove(e) {
		let t = this.run;
		if (this.step !== "end" || !t) return;
		t.to = this.follow(t, e), this.previewSource.clear(!0);
		let n = [Oa(t.start, "picked")], r = $(t.path, t.closed, t.from, t.to);
		r && n.push(new T(new D(r)), Oa(r[r.length - 1], "hover")), this.previewSource.addFeatures(n);
	}
	onSelectionChange = () => {
		queueMicrotask(() => {
			if (!this.ctx || this.step !== "select") return;
			let e = this.selectedReference();
			e && (this.reference = e, this.goTo("start"));
		});
	};
	applyActivity() {
		this.select?.setActive(!this.suspended && this.step === "select"), this.pointer?.setActive(!this.suspended && this.step !== "select");
	}
	goTo(e) {
		if (this.step = e, this.notice = null, e !== "end" && (this.run = null), this.previewSource.clear(!0), this.applyActivity(), this.ctx?.promptChanged(), e === "select") {
			let e = this.selectedReference();
			e && (this.reference = e, this.goTo("start"));
		}
	}
}, Aa = {
	distance: {
		first: "First point of the distance: click or type x,y; Alt+click a line or polygon to measure it",
		next: "Next point: click or type x,y · @dx,dy · @distance<angle; Enter finishes, Backspace removes the last point, Escape drops the distance"
	},
	area: {
		first: "First corner of the area: click or type x,y; Alt+click a polygon to measure it",
		next: "Next corner: click or type x,y · @dx,dy · @distance<angle; Enter finishes (3 corners or more), Backspace removes the last corner, Escape drops the area"
	},
	angle: {
		first: "First point of the angle: click or type x,y",
		vertex: "Vertex of the angle: click or type x,y · @dx,dy · @distance<angle; Escape drops the angle",
		second: "Second point of the angle: click or type x,y · @dx,dy · @distance<angle; Escape drops the angle"
	}
}, ja = {
	distance: "Alt+click a line or polygon to measure it.",
	area: "Alt+click a polygon to measure its area.",
	angle: ""
}, Ma = class extends m {
	id;
	readOnly = !0;
	points = [];
	notice = null;
	pointer = null;
	suspended = !1;
	kind;
	constructor(e) {
		super(), this.kind = e, this.id = `measure-${e}`;
	}
	canActivate() {
		return !0;
	}
	getPrompt() {
		let e = Aa[this.kind][this.step()] ?? "";
		return this.notice ? `${this.notice} ${e}` : e;
	}
	activate(e, t) {
		this.pointer = new J({
			click: (e, t, n) => this.click(e, t, n),
			move: (e) => this.showLive(e)
		}), this.interactions = [this.pointer], super.activate(e, t), this.reset();
	}
	deactivate() {
		this.ctx?.measurements.setLive(null), this.removeInteractions(), this.pointer = null, this.points = [], this.notice = null;
	}
	finish() {
		this.kind !== "angle" && this.store();
	}
	cancel() {
		this.reset();
	}
	removeLastPoint() {
		return this.points.length !== 0 && (this.points.pop(), this.notice = null, this.ctx?.measurements.setLive(this.points.length ? this.kind : null, this.points), this.ctx?.promptChanged(), !0);
	}
	handleInput(e) {
		return this.addPoint(e), !0;
	}
	referencePoint() {
		return this.points[this.points.length - 1] ?? null;
	}
	setSuspended(e) {
		this.suspended = e, this.pointer?.setActive(!e);
	}
	step() {
		return this.points.length === 0 ? "first" : this.kind === "angle" ? this.points.length === 1 ? "vertex" : "second" : "next";
	}
	click(e, t, n) {
		this.suspended || (n && this.points.length === 0 && this.kind !== "angle" ? this.pick(t) : this.addPoint(e));
	}
	addPoint(e) {
		let t = this.points[this.points.length - 1];
		t && t[0] === e[0] && t[1] === e[1] || (this.points.push([e[0], e[1]]), this.notice = null, this.kind === "angle" && this.points.length === 3 ? this.store() : (this.ctx?.measurements.setLive(this.kind, this.points), this.ctx?.promptChanged()));
	}
	showLive(e) {
		this.points.length !== 0 && this.ctx?.measurements.setLive(this.kind, [...this.points, e]);
	}
	store() {
		this.points.length < Ee[this.kind] || (this.ctx?.measurements.add(this.kind, this.points), this.reset());
	}
	reset() {
		this.points = [], this.notice = null, this.ctx?.measurements.setLive(null), this.ctx?.promptChanged();
	}
	pick(e) {
		let t = this.ctx;
		if (!t) return;
		let n = Hr(t), r = null;
		for (let i of t.layers.list()) if (i.visible) for (let a of t.layers.getSource(i.id).getFeatures()) {
			let t = this.pickable(a, i.id, e);
			if (!t) continue;
			let o = a.getGeometry(), s = (o instanceof M || o instanceof A) && o.intersectsCoordinate(e), c = o.getClosestPoint(e), l = s ? 0 : Math.hypot(c[0] - e[0], c[1] - e[1]);
			l <= n && (!r || l < r.distance) && (r = {
				picked: t,
				distance: l
			});
		}
		r ? (t.measurements.add(this.kind, r.picked.coordinates, r.picked.extras), this.reset()) : (this.notice = ja[this.kind], t.promptChanged());
	}
	pickable(e, t, n) {
		let r = e.getGeometry();
		if (!r) return null;
		let i = e.getId(), a = {
			layer: t,
			...i === void 0 ? {} : { featureId: i }
		}, o = Na(r, n, "polygon");
		if (o) {
			let [e, ...t] = o.getCoordinates();
			return this.kind === "area" ? {
				coordinates: e.slice(0, -1),
				extras: {
					holes: t.map((e) => e.slice(0, -1)),
					source: a
				}
			} : {
				coordinates: e,
				extras: { source: a }
			};
		}
		if (this.kind !== "distance") return null;
		let s = Na(r, n, "line");
		return s ? {
			coordinates: s.getCoordinates(),
			extras: { source: a }
		} : null;
	}
};
function Na(e, t, n) {
	let r = n === "polygon" ? e instanceof M ? [e] : e instanceof A ? e.getPolygons() : [] : e instanceof D ? [e] : e instanceof O ? e.getLineStrings() : [], i = null, a = Infinity;
	for (let e of r) {
		let n = e instanceof M && e.intersectsCoordinate(t), r = e.getClosestPoint(t), o = n ? 0 : Math.hypot(r[0] - t[0], r[1] - t[1]);
		o < a && (a = o, i = e);
	}
	return i;
}
//#endregion
//#region src/core/tools/text.ts
var Pa = {
	point: "Insert point of the text: click or type x,y",
	height: "Text height <{height}>: type a value in {unit} (or with its unit: 2 m), Enter keeps it; Escape goes back",
	text: "Text: type it and press Enter; Escape goes back"
}, Fa = "The text height must be greater than 0.";
function Ia(e) {
	let t = e.getActiveLayer() ?? e.getDraftLayer();
	if (t === null || !e.layers.has(t) || !e.layers.canEdit(t, "insert")) return null;
	let n = e.layers.getConfig(t);
	if (!n.text) return null;
	let r = h(n.geometryType);
	return r === "Point" || r === null ? {
		layerId: t,
		layer: n
	} : null;
}
var La = class extends m {
	id = "text";
	step = "point";
	point = null;
	height = null;
	lastHeight = null;
	notice = null;
	pointer = null;
	preview = null;
	previewSource = new F();
	canActivate(e) {
		return Ia(e) !== null;
	}
	getInputRequest() {
		return this.step === "height" ? "value" : this.step === "text" ? "text" : null;
	}
	getPrompt() {
		let e = this.offeredHeight(), t = Pa[this.step].replace("{height}", this.ctx ? this.ctx.formatLength(e) : `${e} m`);
		return this.notice ? `${this.notice} ${t}` : t;
	}
	getHeight() {
		return this.offeredHeight();
	}
	activate(e, t) {
		this.pointer = new J({
			click: (e) => this.takePoint(e),
			move: () => {}
		}), this.preview = X(this.previewSource), e.map.addLayer(this.preview), this.interactions = [this.pointer], super.activate(e, t), this.goTo("point");
	}
	deactivate() {
		this.ctx && this.preview && this.ctx.map.removeLayer(this.preview), this.previewSource.clear(), this.removeInteractions(), this.pointer = null, this.preview = null, this.point = null, this.height = null, this.notice = null, this.step = "point";
	}
	finish() {
		this.step === "height" && (this.height = this.offeredHeight(), this.goTo("text"));
	}
	cancel() {
		this.step === "text" ? this.goTo("height") : this.step === "height" && this.goTo("point");
	}
	removeLastPoint() {
		return this.step !== "point" && (this.cancel(), !0);
	}
	handleLength(e) {
		return this.step === "height" && (Number.isFinite(e) && e > 0 ? (this.height = e, this.goTo("text")) : (this.notice = Fa, this.ctx?.promptChanged()), !0);
	}
	handleText(e) {
		if (this.step !== "text") return !1;
		let t = e.trim();
		return t ? (this.insert(t), !0) : !1;
	}
	handleInput(e) {
		return this.step === "point" && (this.takePoint(e), !0);
	}
	referencePoint() {
		return null;
	}
	offeredHeight() {
		return this.lastHeight === null ? this.ctx && Ia(this.ctx)?.layer.text.height || 2.5 : this.lastHeight;
	}
	takePoint(e) {
		this.step === "point" && (this.point = [e[0], e[1]], this.goTo("height"));
	}
	insert(e) {
		let { ctx: t, point: r } = this, a = t ? Ia(t) : null;
		if (!t || !r || !a) return;
		let o = this.height ?? this.offeredHeight(), { text: s } = a.layer, c = new T({
			...i(a.layer),
			[s.property]: e,
			[s.heightProperty]: o,
			[s.rotationProperty]: t.getStraightedgeAngle(),
			geometry: p(new j(r), a.layer.geometryType)
		});
		t.execute(n(a.layerId, c)) && (this.lastHeight = o, t.selection.set([c]), this.goTo("point"));
	}
	showPreview() {
		this.previewSource.clear(!0);
		let { ctx: e, point: t } = this;
		if (!e || !t) return;
		let n = new T(new j(t));
		n.set(Y, "picked"), this.previewSource.addFeature(n);
		let r = Ia(e), i = e.map.getView?.()?.getResolution?.();
		if (this.step !== "text" || !r || !i) return;
		let a = (this.height ?? this.offeredHeight()) * l(e.getProjection(), t) / i;
		if (!(a >= 1)) return;
		let o = new T(new j(t));
		o.setStyle(pn("Text", Math.min(a, 2e3), e.getStraightedgeAngle(), {
			...r.layer.text,
			color: "rgba(34, 211, 238, 0.8)"
		})), this.previewSource.addFeature(o);
	}
	goTo(e) {
		this.step = e, this.notice = null, e === "point" && (this.point = null, this.height = null), e === "height" && (this.height = null), this.showPreview(), this.ctx?.promptChanged();
	}
};
//#endregion
//#region src/core/tools/boundary.ts
function Ra(e) {
	return e instanceof D ? [e.getCoordinates()] : e.getCoordinates();
}
var za = class extends m {
	step = "boundary";
	boundary = [];
	notice = null;
	select = null;
	pointer = null;
	preview = null;
	previewSource = new F();
	hoverSource = new F();
	hoverLayer = null;
	suspended = !1;
	canActivate() {
		return !0;
	}
	getPrompt() {
		let e = this.prompts[this.step];
		return this.notice ? `${this.prompts[this.notice]} ${e}` : e;
	}
	getBoundary() {
		return this.boundary.slice();
	}
	activate(e, t) {
		e.selection.collection.on("add", this.onSelectionChange), e.selection.collection.on("remove", this.onSelectionChange), this.select = K(e), this.pointer = new J({
			click: (e, t) => this.onClick(t),
			move: (e, t) => this.onMove(t)
		}), this.preview = X(this.previewSource), this.hoverLayer = X(this.hoverSource), e.map.addLayer(this.preview), e.map.addLayer(this.hoverLayer), this.interactions = [this.select, this.pointer], super.activate(e, t), this.takeBoundary();
	}
	deactivate() {
		let e = this.ctx;
		e && (e.selection.collection.un("add", this.onSelectionChange), e.selection.collection.un("remove", this.onSelectionChange), this.preview && e.map.removeLayer(this.preview), this.hoverLayer && e.map.removeLayer(this.hoverLayer)), this.previewSource.clear(), this.hoverSource.clear(), this.removeInteractions(), this.select = null, this.pointer = null, this.preview = null, this.hoverLayer = null, this.boundary = [], this.notice = null, this.step = "boundary";
	}
	finish() {
		this.step === "target" && this.reset();
	}
	cancel() {
		this.step === "target" ? this.reset() : this.ctx?.selection.clear();
	}
	removeLastPoint() {
		return this.step !== "boundary" && (this.reset(), !0);
	}
	setSuspended(e) {
		this.suspended = e, this.applyActivity();
	}
	reset() {
		this.ctx?.selection.clear(), this.goTo("boundary");
	}
	takeBoundary() {
		let e = this.ctx;
		if (!e) return;
		let t = e.selection.get().filter((e) => {
			let t = e.getGeometry();
			return t !== void 0 && $t(t).length > 0;
		});
		t.length === 0 ? this.goTo("boundary") : (this.boundary = t, this.goTo("target"));
	}
	cutters() {
		return this.boundary.flatMap((e) => {
			let t = e.getGeometry();
			return t ? $t(t) : [];
		});
	}
	hit(e, t) {
		let n = Hr(e), r = bt(yt([t]), n), i = null, a = n;
		for (let n of e.layers.list()) n.visible && e.layers.getSource(n.id).forEachFeatureInExtent(r, (e) => {
			let r = e.getGeometry();
			(r instanceof D || r instanceof O) && (this.boundary.includes(e) || Ra(r).forEach((o, s) => {
				if (o.length < 2) return;
				let c = new D(o).getClosestPoint(t), l = Math.hypot(c[0] - t[0], c[1] - t[1]);
				l <= a && (a = l, i = {
					feature: e,
					layerId: n.id,
					geometry: r,
					partIndex: s,
					part: o
				});
			}));
		});
		return i;
	}
	evaluate(e) {
		let t = this.ctx;
		if (!t || this.step !== "target") return null;
		let n = this.hit(t, e);
		return n ? t.canUpdate(n.feature) ? {
			target: n,
			outcome: this.outcome(t, n, this.cutters(), e)
		} : {
			target: n,
			outcome: { failure: "readOnly" }
		} : null;
	}
	onClick(e) {
		let t = this.ctx;
		if (!t || this.step !== "target") return;
		let n = this.evaluate(e), r;
		n ? "failure" in n.outcome ? r = n.outcome.failure : t.execute(n.outcome.command) ? (r = null, t.selection.clear()) : r = "rejected" : r = "miss", this.hoverSource.clear(!0), this.setNotice(r);
	}
	onMove(e) {
		this.hoverSource.clear(!0);
		let t = this.evaluate(e);
		if (t && "preview" in t.outcome) for (let e of t.outcome.preview) this.hoverSource.addFeature(new T(e));
	}
	onSelectionChange = () => {
		queueMicrotask(() => {
			this.ctx && this.step === "boundary" && this.takeBoundary();
		});
	};
	setNotice(e) {
		e !== this.notice && (this.notice = e, this.ctx?.promptChanged());
	}
	applyActivity() {
		this.select?.setActive(!this.suspended && this.step === "boundary"), this.pointer?.setActive(!this.suspended && this.step === "target");
	}
	goTo(e) {
		this.step = e, this.notice = null, e === "boundary" && (this.boundary = []), this.previewSource.clear(!0), this.hoverSource.clear(!0);
		for (let e of this.boundary) {
			let t = e.getGeometry();
			t && this.previewSource.addFeature(new T(t.clone()));
		}
		this.applyActivity(), this.ctx?.promptChanged();
	}
}, Ba = {
	boundary: "Select the boundary: click the line or polygon to trim at",
	target: "Click the part of a line to remove; Enter or Escape picks a new boundary",
	miss: "No line there.",
	readOnly: "That line cannot be changed.",
	noResult: "The boundary does not cut that part of the line.",
	noInsert: "Cutting out the middle needs a new object, and the layer does not allow inserts.",
	rejected: "The trimmed line is not valid."
}, Va = class extends za {
	id = "trim";
	prompts = Ba;
	outcome(e, t, r, i) {
		let a = ca(t.part, r, i);
		if (!a) return { failure: "noResult" };
		let o = [new D(a.removed)], { feature: s, geometry: c, partIndex: l } = t;
		if (c instanceof O) {
			let e = c.getCoordinates();
			return e.splice(l, 1, ...a.kept), {
				command: x(s, new O(e)),
				preview: o
			};
		}
		let [u, d] = a.kept;
		if (!d) return {
			command: x(s, new D(u)),
			preview: o
		};
		if (!e.layers.canEdit(t.layerId, "insert")) return { failure: "noInsert" };
		let p = { ...s.getProperties() };
		delete p[s.getGeometryName()];
		let m = e.layers.getConfig(t.layerId).idProperty;
		m && delete p[m];
		let h = new T({
			...p,
			geometry: new D(d)
		});
		return {
			command: f([x(s, new D(u)), n(t.layerId, h)], "trim"),
			preview: o
		};
	}
}, Ha = {
	boundary: "Select the boundary: click the line or polygon to extend to",
	target: "Click a line near the end to extend; Enter or Escape picks a new boundary",
	miss: "No line there.",
	readOnly: "That line cannot be changed.",
	noResult: "That end does not reach the boundary when extended.",
	noInsert: "The layer does not allow inserts.",
	rejected: "The extended line is not valid."
}, Ua = class extends za {
	id = "extend";
	prompts = Ha;
	outcome(e, t, n, r) {
		let i = la(t.part, n, r);
		if (!i) return { failure: "noResult" };
		let a = [new D(i.added)], { feature: o, geometry: s, partIndex: c } = t;
		if (s instanceof O) {
			let e = s.getCoordinates();
			return e[c] = i.line, {
				command: x(o, new O(e)),
				preview: a
			};
		}
		return {
			command: x(o, new D(i.line)),
			preview: a
		};
	}
}, Wa = {
	select: "Select the objects to copy (Shift+click adds, Ctrl+drag a box), then press Enter",
	base: "Base point: click on the map or type x,y; Escape goes back",
	name: "Template name <{name}>: type a name, Enter keeps it; Escape goes back",
	stored: "Template \"{name}\" stored."
}, Ga = class extends m {
	id = "template-copy";
	step = "select";
	base = null;
	stored = null;
	selectInteractions = [];
	pointer = null;
	suspended = !1;
	canActivate() {
		return !0;
	}
	getInputRequest() {
		return this.step === "name" ? "text" : null;
	}
	getPrompt() {
		let e = this.ctx, t = Wa[this.step];
		return this.step === "name" && e && (t = t.replaceAll("{name}", e.templates.suggestName())), this.stored !== null && this.step === "select" ? `${Wa.stored.replaceAll("{name}", this.stored)} ${t}` : t;
	}
	activate(e, t) {
		e.selection.collection.on("add", this.onSelectionChange), e.selection.collection.on("remove", this.onSelectionChange), this.selectInteractions = [K(e), q(e)], this.pointer = new J({
			click: (e) => this.takeBase(e),
			move: () => {}
		}), this.interactions = [...this.selectInteractions, this.pointer], super.activate(e, t), this.stored = null, this.goTo(e.selection.get().length > 0 ? "base" : "select");
	}
	deactivate() {
		let e = this.ctx;
		e && (e.selection.collection.un("add", this.onSelectionChange), e.selection.collection.un("remove", this.onSelectionChange)), this.removeInteractions(), this.selectInteractions = [], this.pointer = null, this.step = "select", this.base = null, this.stored = null;
	}
	finish() {
		this.step === "select" && (this.ctx?.selection.get().length ?? 0) > 0 ? this.goTo("base") : this.step === "name" && this.store();
	}
	cancel() {
		this.step === "name" ? this.goTo("base") : this.step === "base" ? (this.ctx?.selection.clear(), this.goTo("select")) : this.ctx?.selection.clear();
	}
	removeLastPoint() {
		return this.step !== "select" && (this.cancel(), !0);
	}
	handleInput(e) {
		return this.step === "base" && (this.takeBase(e), !0);
	}
	handleText(e) {
		if (this.step !== "name") return !1;
		let t = e.trim();
		return t ? (this.store(t), !0) : !1;
	}
	setSuspended(e) {
		this.suspended = e, this.applyActivity();
	}
	takeBase(e) {
		this.step === "base" && (this.base = e.slice(), this.goTo("name"));
	}
	store(e) {
		let t = this.ctx;
		if (!t || !this.base) return;
		let n = [];
		for (let e of t.selection.get()) {
			let r = t.layers.layerOf(e);
			r && e.getGeometry() && n.push({
				feature: e,
				layer: r,
				idProperty: t.layers.getConfig(r).idProperty
			});
		}
		if (n.length === 0) {
			this.goTo("select");
			return;
		}
		let r = t.templates.create(n, this.base, e);
		this.stored = t.templates.get(r)?.name ?? e ?? null, t.selection.clear(), this.goTo("select");
	}
	onSelectionChange = () => {
		queueMicrotask(() => {
			this.ctx && this.step !== "select" && this.ctx.selection.get().length === 0 && this.goTo("select");
		});
	};
	applyActivity() {
		for (let e of this.selectInteractions) e.setActive(!this.suspended && this.step === "select");
		this.pointer?.setActive(!this.suspended && this.step === "base");
	}
	goTo(e) {
		e !== "select" && (this.stored = null), this.step = e, e !== "name" && (this.base = null), this.applyActivity(), this.ctx?.promptChanged();
	}
}, Ka = {
	place: "Insert \"{name}\": click the insertion point or type x,y; Escape ends",
	rejected: "The copy could not be inserted."
}, qa = class extends m {
	id = "template-insert";
	templateId = null;
	last = null;
	rejected = !1;
	pointer = null;
	preview = null;
	previewSource = new F();
	canActivate(e, t) {
		let n = this.lookup(e, t);
		return n !== void 0 && Fn(e, n);
	}
	getPrompt() {
		let e = this.template();
		if (!e) return null;
		let t = Ka.place.replaceAll("{name}", e.name);
		return this.rejected ? `${Ka.rejected} ${t}` : t;
	}
	activate(e, t) {
		this.templateId = typeof t?.template == "string" ? t.template : null, this.pointer = new J({
			click: (e) => this.place(e),
			move: (e) => this.onPointerMove(e)
		}), this.preview = X(this.previewSource), e.map.addLayer(this.preview), this.interactions = [this.pointer], super.activate(e, t), this.last = null, this.rejected = !1, e.promptChanged();
	}
	deactivate() {
		this.ctx && this.preview && this.ctx.map.removeLayer(this.preview), this.previewSource.clear(), this.removeInteractions(), this.pointer = null, this.preview = null, this.templateId = null, this.last = null;
	}
	cancel() {
		this.ctx?.done();
	}
	finish() {
		this.ctx?.done();
	}
	removeLastPoint() {
		return this.ctx?.done(), !0;
	}
	handleInput(e) {
		return this.place(e), !0;
	}
	referencePoint() {
		let e = this.ctx;
		return this.last && e && this.last.projection === e.getProjection() ? this.last.point : null;
	}
	lookup(e, t) {
		let n = t?.template;
		return typeof n == "string" ? e.templates.get(n) : void 0;
	}
	template() {
		return this.ctx && this.templateId ? this.ctx.templates.get(this.templateId) : void 0;
	}
	place(e) {
		let t = this.ctx, n = this.template();
		if (!t || !n) return;
		let r = In(t, t.templates, n, e), i = r !== null && t.execute(r.command);
		i && (t.selection.set(r.features), this.last = {
			point: e.slice(),
			projection: t.getProjection()
		}), this.rejected !== !i && (this.rejected = !i, t.promptChanged());
	}
	onPointerMove(e) {
		let t = this.ctx, n = this.template();
		this.previewSource.clear(!0), t && n && t.templates.placed(n, e, t.getProjection()).forEach((e, r) => {
			Pn(t, n.features[r]) && this.previewSource.addFeature(new T(e));
		});
	}
};
//#endregion
//#region src/core/geometry/mirror.ts
function Ja(e, t, n) {
	let { foot: r } = U(e, t, n);
	return [2 * r[0] - e[0], 2 * r[1] - e[1]];
}
function Ya(e, t, n) {
	if (t[0] === n[0] && t[1] === n[1]) throw Error("The mirror line needs two distinct points");
	let r = (e) => Ja(e, t, n), i = (e) => e.map(r), a = (e) => i(e).reverse(), o = (e) => e.map(a);
	if (e instanceof Le) return new Le(e.getGeometriesArray().map((e) => Ya(e, t, n)));
	let s = e.clone();
	if (s instanceof j) s.setCoordinates(r(s.getCoordinates()));
	else if (s instanceof k) s.setCoordinates(i(s.getCoordinates()));
	else if (s instanceof Be) s.setCoordinates(a(s.getCoordinates()));
	else if (s instanceof D) s.setCoordinates(i(s.getCoordinates()));
	else if (s instanceof O) s.setCoordinates(s.getCoordinates().map(i));
	else if (s instanceof M) s.setCoordinates(o(s.getCoordinates()));
	else if (s instanceof A) s.setCoordinates(s.getCoordinates().map(o));
	else throw Error(`Cannot mirror a ${e.getType()}`);
	return s;
}
//#endregion
//#region src/core/tools/mirror.ts
var Xa = {
	select: "Select the objects to mirror: click, Shift+click adds, Ctrl / Cmd+drag for a box; Enter continues",
	first: "First point of the mirror line: click on the map or type x,y; Escape goes back",
	second: "Second point of the mirror line: click on the map, or type x,y · @dx,dy · @distance<angle; Escape goes back",
	copy: "Create a copy? [y/N]: y keeps the originals, Enter mirrors them; Escape goes back"
}, Za = /* @__PURE__ */ new Set([
	"y",
	"yes",
	"j",
	"ja"
]), Qa = /* @__PURE__ */ new Set([
	"n",
	"no",
	"nein"
]), $a = class extends m {
	id = "mirror";
	step = "select";
	first = null;
	second = null;
	notice = null;
	selectInteractions = [];
	pointer = null;
	preview = null;
	previewSource = new F();
	suspended = !1;
	canActivate() {
		return !0;
	}
	getInputRequest() {
		return this.step === "copy" ? "text" : null;
	}
	getPrompt() {
		let e = Xa[this.step];
		return this.notice ? `${this.notice} ${e}` : e;
	}
	activate(e, t) {
		e.selection.collection.on("add", this.onSelectionChange), e.selection.collection.on("remove", this.onSelectionChange), this.selectInteractions = [K(e), q(e)], this.pointer = new J({
			click: (e) => this.takePoint(e),
			move: (e) => this.onPointerMove(e)
		}), this.preview = X(this.previewSource), e.map.addLayer(this.preview), this.interactions = [...this.selectInteractions, this.pointer], super.activate(e, t), this.notice = null, this.goTo(this.objects().length > 0 ? "first" : "select");
	}
	deactivate() {
		let e = this.ctx;
		e && (e.selection.collection.un("add", this.onSelectionChange), e.selection.collection.un("remove", this.onSelectionChange), this.preview && e.map.removeLayer(this.preview)), this.previewSource.clear(), this.removeInteractions(), this.selectInteractions = [], this.pointer = null, this.preview = null, this.step = "select", this.first = null, this.second = null, this.notice = null;
	}
	finish() {
		this.step === "select" && this.objects().length > 0 ? this.goTo("first") : this.step === "copy" && this.apply(!1);
	}
	cancel() {
		this.step === "copy" ? this.goTo("second") : this.step === "second" ? this.goTo("first") : (this.ctx?.selection.clear(), this.goTo("select"));
	}
	removeLastPoint() {
		return this.step !== "select" && (this.cancel(), !0);
	}
	handleInput(e) {
		return this.step !== "first" && this.step !== "second" ? !1 : (this.takePoint(e), !0);
	}
	handleText(e) {
		if (this.step !== "copy") return !1;
		let t = e.trim().toLowerCase();
		if (Za.has(t)) this.apply(!0);
		else if (Qa.has(t)) this.apply(!1);
		else return !1;
		return !0;
	}
	referencePoint() {
		return this.step === "second" ? this.first : null;
	}
	setSuspended(e) {
		this.suspended = e, this.applyActivity();
	}
	objects() {
		return (this.ctx?.selection.get() ?? []).filter((e) => e.getGeometry() !== void 0);
	}
	takePoint(e) {
		if (this.step === "first") this.first = e.slice(), this.goTo("second");
		else if (this.step === "second" && this.first) {
			if (e[0] === this.first[0] && e[1] === this.first[1]) return;
			this.second = e.slice(), this.goTo("copy");
		} else this.step === "copy" && this.apply(!1);
	}
	apply(e) {
		let { ctx: t, first: r, second: a } = this;
		if (!t || !r || !a) return;
		let o = this.objects(), s = [], c = 0;
		for (let l of o) {
			let o = Ya(l.getGeometry(), r, a);
			if (!e) {
				t.canUpdate(l) ? s.push(x(l, o)) : c++;
				continue;
			}
			let u = t.layers.layerOf(l), d = Pn(t, {
				layer: u ?? "",
				geometry: o
			});
			if (!d) {
				c++;
				continue;
			}
			let f = u ? t.layers.getConfig(u).idProperty : void 0, m = new T({
				...i(d.layer),
				...An(l, f),
				geometry: p(o, d.layer.geometryType)
			});
			s.push(n(d.layerId, m));
		}
		let l = c === 0 ? null : e ? `${c} ${c === 1 ? "object has" : "objects have"} no layer to be copied into.` : `${c} ${c === 1 ? "object" : "objects"} could not be changed (read-only).`;
		if (s.length === 0) {
			this.notice = l, t.selection.clear(), this.goTo("select");
			return;
		}
		let u = s.length === 1 ? s[0] : f(s, "mirror");
		t.execute(u) ? (this.notice = l, t.selection.clear(), this.goTo("select")) : (this.notice = "The mirrored objects are not valid.", t.promptChanged());
	}
	onPointerMove(e) {
		this.step === "second" && this.updatePreview(e);
	}
	updatePreview(e) {
		let t = this.first;
		if (this.previewSource.clear(!0), !t || e[0] === t[0] && e[1] === t[1]) return;
		let n = this.objects(), r = n.map((n) => new T(Ya(n.getGeometry(), t, e))), i = yt([t, e]);
		for (let e of [...n, ...r]) xt(i, e.getGeometry().getExtent());
		let a = Math.hypot(wt(i), Ct(i)) / 2 || 1, o = St(i), s = e[0] - t[0], c = e[1] - t[1], l = Math.hypot(s, c), u = s / l, d = c / l, f = (o[0] - t[0]) * u + (o[1] - t[1]) * d, p = [t[0] + f * u, t[1] + f * d], m = Math.max(a, Math.abs(f) + l), h = new D([[p[0] - m * u, p[1] - m * d], [p[0] + m * u, p[1] + m * d]]);
		this.previewSource.addFeatures([...r, new T(h)]);
	}
	onSelectionChange = () => {
		queueMicrotask(() => {
			this.ctx && this.step !== "select" && this.objects().length === 0 && this.goTo("select");
		});
	};
	applyActivity() {
		for (let e of this.selectInteractions) e.setActive(!this.suspended && this.step === "select");
		this.pointer?.setActive(!this.suspended && this.step !== "select");
	}
	goTo(e) {
		e !== "select" && (this.notice = null), this.step = e, (e === "select" || e === "first") && (this.first = null), e !== "copy" && (this.second = null), e === "copy" && this.second ? this.updatePreview(this.second) : e !== "second" && this.previewSource.clear(!0), this.applyActivity(), this.ctx?.promptChanged();
	}
};
//#endregion
//#region src/core/geometry/scale.ts
function eo(e, t, n) {
	let r = Math.hypot(t[0] - e[0], t[1] - e[1]);
	return r === 0 ? null : Math.hypot(n[0] - e[0], n[1] - e[1]) / r;
}
function to(e, t, n) {
	if (!Number.isFinite(t) || t <= 0) throw Error("The scale factor must be a number greater than 0");
	let r = e.clone();
	return r.scale(t, t, n), r;
}
//#endregion
//#region src/core/tools/scale.ts
var no = {
	select: "Select the objects to scale: click, Shift+click adds, Ctrl / Cmd+drag for a box; Enter continues",
	base: "Base point: click on the map or type x,y",
	factor: "Scale factor: type a factor (2 doubles, 0.5 halves), or click a reference point; Escape goes back",
	target: "Target point: click on the map, or type x,y · @dx,dy · @distance<angle · distance; Escape goes back"
}, ro = "The scale factor must be greater than 0.", io = class extends m {
	id = "scale";
	step = "select";
	base = null;
	reference = null;
	notice = null;
	editable = null;
	selectInteractions = [];
	pointer = null;
	preview = null;
	previewSource = new F();
	suspended = !1;
	canActivate() {
		return !0;
	}
	getInputRequest() {
		return this.step === "factor" ? "value" : null;
	}
	getPrompt() {
		let e = no[this.step];
		return this.notice ? `${this.notice} ${e}` : e;
	}
	activate(e, t) {
		this.editable = ei(e), e.selection.collection.on("add", this.onSelectionChange), e.selection.collection.on("remove", this.onSelectionChange), this.selectInteractions = [K(e), q(e)], this.pointer = new J({
			click: (e) => this.takePoint(e),
			move: (e) => this.onPointerMove(e)
		}), this.preview = X(this.previewSource), e.map.addLayer(this.preview), this.interactions = [...this.selectInteractions, this.pointer], super.activate(e, t), this.goTo(this.editable.collection.getLength() > 0 ? "base" : "select");
	}
	deactivate() {
		let e = this.ctx;
		e && (e.selection.collection.un("add", this.onSelectionChange), e.selection.collection.un("remove", this.onSelectionChange), this.preview && e.map.removeLayer(this.preview)), this.previewSource.clear(), this.removeInteractions(), this.editable?.dispose(), this.editable = null, this.selectInteractions = [], this.pointer = null, this.preview = null, this.base = null, this.reference = null, this.notice = null, this.step = "select";
	}
	finish() {
		this.step === "select" && this.hasEditable() && this.goTo("base");
	}
	cancel() {
		this.step === "target" ? this.goTo("factor") : this.step === "factor" ? this.goTo("base") : this.step === "base" ? (this.ctx?.selection.clear(), this.goTo("select")) : this.ctx?.selection.clear();
	}
	removeLastPoint() {
		return this.step !== "factor" && this.step !== "target" ? !1 : (this.cancel(), !0);
	}
	handleValue(e) {
		return this.step === "factor" && (Number.isFinite(e) && e > 0 ? this.applyScale(e) : (this.notice = ro, this.ctx?.promptChanged()), !0);
	}
	handleInput(e) {
		return this.step !== "select" && (this.takePoint(e), !0);
	}
	referencePoint() {
		return this.step === "factor" || this.step === "target" ? this.base : null;
	}
	setSuspended(e) {
		this.suspended = e, this.applyActivity();
	}
	takePoint(e) {
		if (this.step === "base") this.base = e, this.goTo("factor");
		else if (this.step === "factor" && this.base) {
			if (ao(e, this.base)) return;
			this.reference = e, this.goTo("target");
		} else if (this.step === "target" && this.base && this.reference) {
			let t = eo(this.base, this.reference, e);
			if (t === null || t <= 0) {
				this.notice = ro, this.ctx?.promptChanged();
				return;
			}
			this.applyScale(t);
		}
	}
	applyScale(e) {
		let { ctx: t, base: n } = this, r = this.editable?.collection.getArray().slice() ?? [];
		if (!t || !n || r.length === 0) {
			this.goTo("select");
			return;
		}
		let i = [];
		for (let t of r) {
			let r = t.getGeometry();
			r && i.push(x(t, to(r, e, n)));
		}
		i.length > 0 && t.execute(i.length === 1 ? i[0] : f(i, "scale")), t.selection.clear(), this.goTo("select");
	}
	onPointerMove(e) {
		let { base: t, reference: n } = this;
		if (!t || this.step !== "factor" && this.step !== "target") return;
		if (this.previewSource.clear(!0), this.step === "factor" || !n) {
			this.previewSource.addFeature(new T(new D([t, e])));
			return;
		}
		let r = eo(t, n, e), i = r === null || r <= 0 ? [] : (this.editable?.collection.getArray() ?? []).flatMap((e) => {
			let n = e.getGeometry();
			return n ? [new T(to(n, r, t))] : [];
		});
		this.previewSource.addFeatures([
			...i,
			new T(new D([t, n])),
			new T(new D([t, e]))
		]);
	}
	onSelectionChange = () => {
		queueMicrotask(() => {
			this.ctx && this.step !== "select" && !this.hasEditable() && this.goTo("select");
		});
	};
	hasEditable() {
		return (this.editable?.collection.getLength() ?? 0) > 0;
	}
	goTo(e) {
		this.step = e, this.notice = null, (e === "select" || e === "base") && (this.base = null), e !== "target" && (this.reference = null), this.previewSource.clear(!0), this.applyActivity(), this.ctx?.promptChanged();
	}
	applyActivity() {
		let e = !this.suspended && this.step === "select";
		for (let t of this.selectInteractions) t.setActive(e);
		this.pointer?.setActive(!this.suspended && this.step !== "select");
	}
};
function ao(e, t) {
	return e[0] === t[0] && e[1] === t[1];
}
//#endregion
//#region src/core/Editor.ts
var oo = "olcad-edit-mode", so = [
	"draw",
	"rectangle",
	"circle",
	"ellipse",
	"regular-polygon",
	"curve",
	"parallel",
	"text"
], co = class {
	map;
	config;
	basemaps;
	layers;
	straightedge;
	changes;
	tools;
	selection;
	snapping;
	grid;
	constraints;
	templates;
	measurements;
	localLayers;
	import;
	units;
	editing;
	localLayerStore;
	measurementStore = new ve(() => this.getProjection(), {
		change: (e) => this.emitter.emit("measurechange", { measurements: e }),
		live: (e) => this.emitter.emit("measure", { measurement: e })
	}, () => this.lengthUnit());
	snapInteraction;
	inspectInteraction;
	selectionManager;
	toolManager;
	emitter = new rn();
	templateStore = new kn((e) => this.emitter.emit("templatechange", e));
	ownsMap;
	basemapLayers = /* @__PURE__ */ new Map();
	layerManager;
	crosshair = null;
	gridLayer = null;
	pickHandler = null;
	pickHoverHandler = null;
	pickHighlight = null;
	destroyed = !1;
	constructor(t, n) {
		this.config = t, this.ownsMap = t.map === void 0, t.map ? (this.map = t.map, n.explicitView && this.map.setView(this.createView(t.view.projection))) : this.map = new Ne({
			target: t.target,
			view: this.createView(t.view.projection),
			layers: []
		}), t.basemaps.forEach((e, t) => this.insertBasemap(e.id, t)), t.editMode && this.reflectEditMode(!0), this.layerManager = new Jn(this.map, () => this.getProjection(), {
			onChange: (e) => this.emitter.emit("layerchange", e),
			onLoad: (e) => this.emitter.emit("layerload", e),
			onError: (e) => this.emitter.emit("layererror", e),
			onActiveChange: (e) => this.emitter.emit("activelayerchange", e),
			shouldLoad: (e, t) => this.editing.shouldLoad(e, t)
		}, t.layerHighlight), this.selectionManager = new nr(this.map, t.selection, (e) => this.emitter.emit("selectionchange", { features: e })), this.editing = new Gt({
			layers: this.layerManager,
			getProjection: () => this.getProjection(),
			locale: t.locale,
			messages: t.messages,
			changes: t.changes,
			isTracked: (e) => (!t.draft.enabled || e !== t.draft.id) && !this.layerManager.isLocal(e),
			events: {
				change: (e) => {
					this.selectionManager.prune((e) => this.layerManager.layerOf(e) !== void 0), this.emitter.emit("change", e);
				},
				validationerror: (e) => this.emitter.emit("validationerror", e),
				historychange: (e) => this.emitter.emit("historychange", e),
				featureinsert: (e) => this.emitter.emit("featureinsert", e)
			}
		});
		for (let e of t.layers) this.layerManager.add(e);
		t.draft.enabled && this.layerManager.add({
			id: t.draft.id,
			title: t.draft.title,
			source: { features: [] },
			geometryType: "Any",
			editable: !0,
			snappable: !0,
			text: !0,
			visible: !0,
			...t.draft.style ? { style: t.draft.style } : {}
		}), this.toolManager = new Or({
			map: this.map,
			layers: this.layerManager,
			selection: this.selectionManager,
			execute: (e) => this.editing.execute(e),
			getActiveLayer: () => this.layerManager.getActive(),
			getDraftLayer: () => this.getDraftLayer(),
			hitTolerance: Math.ceil(t.cursor.pickBoxSize / 2),
			canUpdate: (e) => this.editing.canEdit("update", e),
			promptChanged: () => this.emitter.emit("toolprompt", {
				id: this.toolManager.getActive(),
				text: this.toolManager.getPrompt(),
				input: this.toolManager.getInputRequest()
			}),
			getStraightedgeAngle: () => this.config.cursor.angle,
			getProjection: () => this.getProjection(),
			getCurveTolerance: () => this.config.curves.tolerance,
			getLengthUnit: () => this.lengthUnit(),
			formatLength: (t) => e(t, this.lengthUnit()),
			templates: this.templateStore,
			done: () => this.toolManager.deactivate(),
			measurements: this.measurementStore
		}, { onToolChange: (e, t) => this.emitter.emit("toolchange", {
			id: e,
			options: t
		}) });
		let r = [
			new Ar(),
			new a(),
			new si(),
			new _i(),
			new ki(),
			new Pi(),
			new qi(),
			new ka(),
			new La(),
			new Zr(),
			new ri(),
			new Ri(),
			new io(),
			new Ta(),
			new Va(),
			new Ua(),
			new $a(),
			new Ga(),
			new qa(),
			new Ma("distance"),
			new Ma("area"),
			new Ma("angle")
		];
		for (let e of r) this.toolManager.register(e);
		this.tools = {
			list: () => this.toolManager.list(),
			getActive: () => this.toolManager.getActive(),
			getActiveOptions: () => this.toolManager.getActiveOptions(),
			getPrompt: () => this.toolManager.getPrompt(),
			getInputRequest: () => this.toolManager.getInputRequest(),
			canActivate: (e, n) => (t.editMode || this.toolManager.isReadOnly(e)) && this.toolManager.canActivate(e, n),
			activate: (e, n) => {
				if (!t.editMode && !this.toolManager.isReadOnly(e)) throw Error("Tools require edit mode");
				return this.toolManager.activate(e, n);
			},
			deactivate: () => this.toolManager.deactivate(),
			cancel: () => this.toolManager.cancel(),
			finish: () => this.toolManager.finish(),
			removeLastPoint: () => this.toolManager.removeLastPoint()
		}, this.inspectInteraction = K({
			selection: this.selectionManager,
			hitTolerance: Math.ceil(t.cursor.pickBoxSize / 2)
		}), this.updateInspect(), this.map.addInteraction(this.inspectInteraction), this.map.addLayer(this.measurementStore.layer), this.map.addLayer(this.measurementStore.liveLayer);
		let i = this.measurementStore;
		this.measurements = {
			list: () => i.list(),
			get: (e) => i.get(e),
			add: (e, t, n) => i.add(e, t, n),
			remove: (e) => i.remove(e),
			clear: () => i.clear(),
			getLive: () => i.getLive()
		};
		let o = this.selectionManager;
		this.selection = {
			get: () => o.get(),
			set: (e) => o.set(e),
			add: (e) => o.add(e),
			remove: (e) => o.remove(e),
			clear: () => o.clear()
		};
		let s = new lr(this.layerManager, () => t.snapping, () => t.grid);
		this.snapInteraction = new pr({
			engine: s,
			isActive: () => (t.editMode || this.toolManager.isReadOnly()) && (t.snapping.enabled || t.grid.enabled || t.constraints.angle.enabled),
			onSnap: (e) => {
				this.crosshair?.setSnap(e ? [e.pixel[0], e.pixel[1]] : null, e?.mode), this.emitter.emit("snap", e);
			},
			getReference: () => this.toolManager.referencePoint(),
			constrain: (e) => {
				let { enabled: n, step: r } = t.constraints.angle;
				if (!n) return null;
				let i = this.toolManager.referencePoint();
				return i ? gr(e, i, t.cursor.angle, r).coordinate : null;
			}
		}), this.map.addInteraction(this.snapInteraction);
		let c = () => this.emitter.emit("snappingchange", { ...t.snapping });
		this.snapping = {
			isEnabled: () => t.snapping.enabled,
			setEnabled: (e) => {
				t.snapping.enabled !== e && (t.snapping.enabled = e, e || this.snapInteraction.reset(), c());
			},
			getTolerance: () => t.snapping.tolerancePx,
			setTolerance: (e) => {
				if (!(e > 0)) throw Error("Snap tolerance must be positive");
				t.snapping.tolerancePx !== e && (t.snapping.tolerancePx = e, c());
			},
			getModes: () => t.snapping.modes.slice(),
			setModes: (e) => {
				if (e.length === 0) throw Error("At least one snap mode is required");
				t.snapping.modes = e.slice(), c();
			},
			snap: (e) => s.snap(e, this.map.getPixelFromCoordinate(e), this.map.getView().getResolution() ?? 1, (e) => this.map.getPixelFromCoordinate(e), this.toolManager.referencePoint())
		};
		let l = () => {
			this.gridLayer?.refresh(), this.emitter.emit("gridchange", {
				...t.grid,
				origin: [...t.grid.origin]
			});
		}, u = () => this.emitter.emit("constraintschange", { angle: { ...t.constraints.angle } }), d = this.templateStore, f = {
			layers: this.layerManager,
			getActiveLayer: () => this.layerManager.getActive(),
			getDraftLayer: () => this.getDraftLayer(),
			getProjection: () => this.getProjection()
		};
		this.templates = {
			list: () => d.list(),
			get: (e) => d.get(e),
			create: (e, t, n) => d.create(e.map((e) => {
				let t = this.layerManager.layerOf(e);
				if (!t) throw Error("Template objects must belong to a layer");
				return {
					feature: e,
					layer: t,
					idProperty: this.layerManager.getConfig(t).idProperty
				};
			}), t, n),
			rename: (e, t) => d.rename(e, t),
			remove: (e) => d.remove(e),
			suggestName: () => d.suggestName(),
			canInsert: (e) => {
				let t = d.get(e);
				return t !== void 0 && Fn(f, t);
			},
			insert: (e, t) => {
				let n = d.get(e);
				if (!n) throw Error(`Unknown template "${e}"`);
				let r = In(f, d, n, t);
				return !r || !this.editing.execute(r.command) ? null : r.features;
			},
			export: () => d.export(this.getProjection()),
			import: (e) => d.import(e, this.getProjection())
		}, this.constraints = {
			isAngleLocked: () => t.constraints.angle.enabled,
			setAngleLocked: (e) => {
				t.constraints.angle.enabled !== e && (t.constraints.angle.enabled = e, e || this.snapInteraction.reset(), u());
			},
			getAngleStep: () => t.constraints.angle.step,
			setAngleStep: (e) => {
				if (!(e > 0 && e <= 360)) throw Error("Angle step must be in (0, 360]");
				t.constraints.angle.step !== e && (t.constraints.angle.step = e, u());
			}
		}, this.grid = {
			isEnabled: () => t.grid.enabled,
			setEnabled: (e) => {
				t.grid.enabled !== e && (t.grid.enabled = e, e || this.snapInteraction.reset(), l());
			},
			getSpacing: () => t.grid.spacing,
			setSpacing: (e) => {
				if (!(e > 0)) throw Error("Grid spacing must be positive");
				t.grid.spacing !== e && (t.grid.spacing = e, l());
			},
			getOrigin: () => [...t.grid.origin],
			setOrigin: (e) => {
				if (!Number.isFinite(e[0]) || !Number.isFinite(e[1])) throw Error("Grid origin must be two finite numbers");
				t.grid.origin = [e[0], e[1]], l();
			},
			isVisible: () => t.grid.visible,
			setVisible: (e) => {
				t.grid.visible !== e && (t.grid.visible = e, l());
			}
		}, this.emitter.on("toolchange", () => {
			this.map.removeInteraction(this.snapInteraction), this.map.addInteraction(this.snapInteraction), this.updateInspect();
		}), this.emitter.on("activelayerchange", () => {
			let e = this.toolManager.getActive();
			if (!e || !so.includes(e)) return;
			let t = this.toolManager.getActiveOptions();
			this.toolManager.activate(e, t) || this.toolManager.activate(e) || this.toolManager.deactivate();
		}), this.changes = {
			get: () => this.editing.getChangeSet(),
			hasChanges: () => this.editing.hasChanges(),
			accept: (e) => this.editing.accept(e),
			discard: () => this.editing.discard()
		}, this.basemaps = {
			list: () => t.basemaps.map((e) => ({
				id: e.id,
				title: e.title,
				active: this.basemapLayers.get(e.id)?.getVisible() ?? !1
			})),
			getActive: () => this.basemaps.list().find((e) => e.active)?.id ?? null,
			setActive: (e) => {
				if (!this.basemapLayers.has(e)) throw Error(`Unknown basemap "${e}"`);
				if (this.basemaps.getActive() !== e) {
					for (let [t, n] of this.basemapLayers) n.setVisible(t === e);
					this.emitter.emit("basemapchange", {
						id: e,
						type: "activate"
					});
				}
			},
			add: (e) => {
				if (Se(e), this.basemapLayers.has(e.id)) throw Error(`Basemap "${e.id}" already exists`);
				let n = jt(e), r = n.visible;
				n.visible = !1, t.basemaps.push(n), this.insertBasemap(n.id, t.basemaps.length - 1), this.emitter.emit("basemapchange", {
					id: n.id,
					type: "add"
				}), (r || this.basemaps.getActive() === null) && this.basemaps.setActive(n.id);
			},
			remove: (e) => {
				let n = this.basemapLayers.get(e);
				if (!n) throw Error(`Unknown basemap "${e}"`);
				let r = n.getVisible();
				this.map.removeLayer(n), this.basemapLayers.delete(e), t.basemaps.splice(t.basemaps.findIndex((t) => t.id === e), 1), this.emitter.emit("basemapchange", {
					id: e,
					type: "remove"
				});
				let i = t.basemaps[0];
				r && i && this.basemaps.setActive(i.id);
			}
		}, this.straightedge = {
			getAngle: () => t.cursor.angle,
			setAngle: (e) => {
				let n = tn(e);
				n !== t.cursor.angle && (t.cursor.angle = n, this.crosshair?.setOptions({ angle: n }), this.emitter.emit("straightedgechange", {
					angle: n,
					color: t.cursor.color
				}));
			},
			getColor: () => t.cursor.color,
			setColor: (e) => {
				e !== t.cursor.color && (t.cursor.color = e, this.crosshair?.setOptions({ color: e }), this.emitter.emit("straightedgechange", {
					angle: t.cursor.angle,
					color: e
				}));
			},
			pick: () => this.startPick(),
			cancelPick: () => this.endPick(),
			isPicking: () => this.pickHandler !== null
		};
		let p = this.layerManager;
		this.layers = {
			list: () => p.list(),
			get: (e) => p.info(e),
			getConfig: (e) => p.getConfig(e),
			getActive: () => p.getActive(),
			getDraft: () => this.getDraftLayer(),
			setActive: (e) => p.setActive(e),
			add: (e) => {
				p.add(e);
				let n = p.getConfig(e.id);
				t.layers.push(n);
			},
			remove: (e) => {
				this.selectionManager.prune((t) => p.layerOf(t) !== e), this.editing.dropLayer(e), p.remove(e);
				let n = t.layers.findIndex((t) => t.id === e);
				n >= 0 && t.layers.splice(n, 1);
			},
			setVisible: (e, t) => p.setVisible(e, t),
			setEditable: (e, t) => p.setEditable(e, t),
			setSnappable: (e, t) => p.setSnappable(e, t),
			setHighlighted: (e, t) => p.setHighlighted(e, t),
			getStyle: (e) => p.getStyle(e),
			setStyle: (e, t) => p.setStyle(e, t),
			resetStyle: (e) => p.resetStyle(e),
			isStyleCustomized: (e) => p.isStyleCustomized(e),
			hasExpressionStyle: (e) => p.hasExpressionStyle(e),
			setOrder: (e) => p.setOrder(e),
			moveLayer: (e, t) => p.moveLayer(e, t),
			resetOrder: () => p.resetOrder(),
			isOrderCustomized: () => p.isOrderCustomized(),
			exportStyles: () => p.exportStyles(),
			importStyles: (e) => p.importStyles(e),
			resetStyles: () => p.resetStyles(),
			isHighlighted: (e) => p.isHighlighted(e),
			canEdit: (e, t, n) => p.canEdit(e, t, n),
			getFeatures: (e) => p.getSource(e).getFeatures(),
			layerOf: (e) => p.layerOf(e),
			getOriginalGeometry: (e) => p.originals.get(e),
			draftTargets: (e) => zn(this.draftContext(), e),
			moveDrafts: (e, t) => {
				let n = Bn(this.draftContext(), e, t);
				return !n || !this.editing.execute(n.command) ? [] : (this.selectionManager.set(n.features), this.emitter.emit("draftmove", {
					layer: t,
					features: n.features,
					sources: n.sources
				}), n.features);
			},
			moveDraft: (e, t) => this.layers.moveDrafts([e], t)[0] ?? null
		};
		let m = new xe({
			addLayer: (e) => this.layers.add(e),
			removeLayer: (e) => this.layers.remove(e),
			hasLayer: (e) => p.has(e),
			getSource: (e) => p.getSource(e),
			setTitle: (e, t) => p.setTitle(e, t),
			setFields: (e, t) => p.setFields(e, t),
			setLocal: (e, t) => p.setLocal(e, t),
			getProjection: () => this.getProjection(),
			emit: (e) => this.emitter.emit("locallayerchange", e)
		});
		this.localLayerStore = m, this.localLayers = {
			list: () => m.list(),
			get: (e) => m.get(e),
			has: (e) => m.has(e),
			create: (e) => m.create(e),
			rename: (e, t) => m.rename(e, t),
			setFields: (e, t, n) => m.setFields(e, t, n),
			remove: (e) => m.remove(e),
			export: () => m.export(),
			import: (e) => m.import(e)
		};
		let h = {
			listLayers: () => p.list(),
			getConfig: (e) => p.getConfig(e),
			canInsert: (e) => p.canEdit(e, "insert"),
			createLocalLayer: (e) => m.create(e),
			removeLocalLayer: (e) => m.remove(e),
			execute: (e) => this.editing.execute(e)
		};
		this.units = {
			getLength: () => this.lengthUnit(),
			getLengthSetting: () => this.config.units.length,
			setLength: (e) => {
				if (e !== "auto" && !ye(e)) throw Error(`Unknown length unit "${String(e)}"`);
				e !== this.config.units.length && (this.config.units.length = e, this.unitsChanged());
			},
			toMetres: (e, t) => we(e, t ?? this.lengthUnit()),
			fromMetres: (e, t) => ue(e, t ?? this.lengthUnit()),
			formatLength: (t) => e(t, this.lengthUnit()),
			formatArea: (e) => _(e, this.lengthUnit())
		}, this.import = {
			read: (e, t = {}) => fe(e, {
				...t,
				viewProjection: this.getProjection()
			}),
			targetsFor: (e) => wr(h, e),
			apply: (e, t) => {
				let n = Tr(h, e, t);
				return this.emitter.emit("import", n), n;
			}
		};
	}
	execute(e) {
		return this.editing.execute(e);
	}
	exportLayers(e, t) {
		let n = e.map((e) => ({
			id: e,
			title: this.layerManager.getConfig(e).title,
			features: this.layerManager.getSource(e).getFeatures()
		}));
		return ke(n, t, this.getProjection());
	}
	draftContext() {
		return {
			layers: this.layerManager,
			getDraftLayer: () => this.getDraftLayer()
		};
	}
	canEdit(e, t) {
		return this.editing.canEdit(e, t);
	}
	deleteSelection() {
		let e = this.selectionManager.get().filter((e) => this.editing.canEdit("delete", e));
		if (e.length === 0) return !1;
		let t = e.length === 1 ? v(e[0]) : f(e.map(v), "delete selection");
		return this.editing.execute(t);
	}
	undo() {
		return this.editing.undo();
	}
	redo() {
		return this.editing.redo();
	}
	input(e) {
		let t = this.resolveInput(e);
		return this.emitter.emit("input", t), t;
	}
	resolveInput(e) {
		let t = (t) => ({
			ok: !1,
			text: e,
			code: t,
			error: Rt(this.config.locale, this.config.messages, t)
		});
		if (this.toolsRunnable() && this.toolManager.getActive() !== null && this.toolManager.handleText(e)) return {
			ok: !0,
			text: e,
			kind: "text"
		};
		let n = Cr(e, this.lengthUnit());
		if (!n) return t("input-invalid");
		if (!this.toolsRunnable() || this.toolManager.getActive() === null) return t("input-no-tool");
		if (n.kind === "length") {
			if (n.unit === null && this.toolManager.handleValue(n.value)) return {
				ok: !0,
				text: e,
				value: n.value
			};
			if (this.toolManager.handleLength(n.distance)) return {
				ok: !0,
				text: e,
				length: n.distance
			};
		}
		let r = this.getProjection(), i = this.config.cursor.angle, a;
		if (n.kind === "absolute") a = [n.x, n.y];
		else {
			let e = this.toolManager.referencePoint();
			if (!e) return t("input-no-reference");
			if (n.kind === "relative") a = o(r, e, n.dx, n.dy);
			else if (n.kind === "polar") {
				let t = (i + n.angle) * Math.PI / 180;
				a = o(r, e, n.distance * Math.cos(t), n.distance * Math.sin(t));
			} else {
				let t = this.snapInteraction.getPointerCoordinate(), s = i * Math.PI / 180;
				if (t && (t[0] !== e[0] || t[1] !== e[1])) {
					let { enabled: n, step: r } = this.config.constraints.angle, a = n ? gr(t, e, i, r).coordinate : t;
					s = Math.atan2(a[1] - e[1], a[0] - e[0]);
				}
				a = o(r, e, n.distance * Math.cos(s), n.distance * Math.sin(s));
			}
		}
		return this.toolManager.handleInput(a) ? {
			ok: !0,
			text: e,
			coordinate: a
		} : t("input-not-accepted");
	}
	canUndo() {
		return this.editing.canUndo();
	}
	canRedo() {
		return this.editing.canRedo();
	}
	getProjection() {
		return this.map.getView().getProjection().getCode();
	}
	getDraftLayer() {
		let { draft: e } = this.config;
		return e.enabled && this.layerManager.has(e.id) ? e.id : null;
	}
	setProjection(e) {
		if (!E(e)) throw Error(`Unknown projection "${e}"`);
		let t = this.getProjection(), n = E(e).getCode();
		if (t === n) return;
		this.emitter.emit("beforeprojectionchange", {
			from: t,
			to: n
		});
		let r = this.map.getView(), i = this.map.getSize(), a = i ? r.calculateExtent(i) : void 0, o = this.createView(n), s = r.getCenter();
		s && o.setCenter(Ie([
			s[0],
			s[1],
			s[0],
			s[1]
		], t, n).slice(0, 2)), this.map.setView(o), a && i && o.fit(Ie(a, t, n), { size: i }), this.editing.reproject(t, n), this.templateStore.reproject(t, n), this.measurementStore.reproject(t, n), this.layerManager.reproject(t, n, (e) => this.editing.tracker.isGeometryModified(e), (e) => this.editing.tracker.isTouched(e)), this.config.view.projection = n, this.emitter.emit("projectionchange", {
			from: t,
			to: n
		}), this.config.units.length === "auto" && re(t) !== re(n) && this.unitsChanged();
	}
	lengthUnit() {
		let e = this.config.units.length;
		return e === "auto" ? re(this.getProjection()) : e;
	}
	unitsChanged() {
		this.measurementStore.relabel(), this.toolManager.getActive() !== null && this.emitter.emit("toolprompt", {
			id: this.toolManager.getActive(),
			text: this.toolManager.getPrompt(),
			input: this.toolManager.getInputRequest()
		}), this.emitter.emit("unitschange", {
			length: this.lengthUnit(),
			setting: this.config.units.length
		});
	}
	isEditMode() {
		return this.config.editMode;
	}
	setEditMode(e) {
		this.config.editMode !== e && (this.config.editMode = e, e || (this.endPick(), this.toolManager.isReadOnly() || this.toolManager.deactivate(), this.snapInteraction.reset()), this.updateInspect(), this.reflectEditMode(e), this.emitter.emit("editmodechange", { editMode: e }));
	}
	toolsRunnable() {
		return this.config.editMode || this.toolManager.isReadOnly();
	}
	updateInspect() {
		this.inspectInteraction.setActive(!this.config.editMode && this.config.selection.inspect && !this.toolManager.isReadOnly());
	}
	reflectEditMode(e) {
		let t = this.map.getViewport(), { cursor: n } = this.config;
		t && e && n.crosshair ? (this.crosshair ??= new Xt(t, n), Zt(t, !0)) : t && !e && (this.crosshair?.destroy(), this.crosshair = null, Zt(t, !1)), e ? (this.gridLayer ??= new dr(() => this.config.grid, n.color), this.gridLayer.attach(this.map)) : this.gridLayer?.attach(null), this.map.getTargetElement()?.classList.toggle(oo, e);
	}
	segmentAtPixel(e, t) {
		return this.map.forEachFeatureAtPixel(e, (e) => {
			let n = e instanceof T ? e.getGeometry() : void 0;
			return n ? en(n, t) : void 0;
		}, {
			hitTolerance: Math.max(8, Math.ceil(this.config.cursor.pickBoxSize / 2)),
			layerFilter: (e) => e.get(hn) !== void 0
		});
	}
	startPick() {
		if (!this.config.editMode) throw Error("Straightedge reference pick requires edit mode");
		if (this.pickHandler) return;
		let e = this.ensurePickHighlight();
		this.pickHandler = (e) => {
			let t = this.segmentAtPixel(e.pixel, e.coordinate);
			if (!t) return;
			let n = nn(this.map.getPixelFromCoordinate(t[0]), this.map.getPixelFromCoordinate(t[1]));
			this.endPick(), this.straightedge.setAngle(n);
		}, this.pickHoverHandler = (t) => {
			let n = this.segmentAtPixel(t.pixel, t.coordinate), r = e.getSource();
			r.clear(!0), n && r.addFeature(new T(new D([n[0], n[1]])));
		}, this.map.on("singleclick", this.pickHandler), this.map.on("pointermove", this.pickHoverHandler), this.toolManager.suspend(!0), this.crosshair?.setPicking(!0), this.emitter.emit("straightedgepick", { picking: !0 });
	}
	ensurePickHighlight() {
		return this.pickHighlight || (this.pickHighlight = new P({
			source: new F(),
			style: new L({ stroke: new I({
				color: this.config.cursor.pickColor,
				width: 4
			}) }),
			zIndex: 1e3
		}), this.pickHighlight.setMap(this.map)), this.pickHighlight;
	}
	endPick() {
		this.pickHandler && (this.map.un("singleclick", this.pickHandler), this.pickHandler = null, this.pickHoverHandler &&= (this.map.un("pointermove", this.pickHoverHandler), null), this.pickHighlight?.getSource()?.clear(!0), this.toolManager.suspend(!1), this.crosshair?.setPicking(!1), this.emitter.emit("straightedgepick", { picking: !1 }));
	}
	on = (e, t) => this.emitter.on(e, t);
	off = (e, t) => this.emitter.off(e, t);
	destroy() {
		if (!this.destroyed) {
			this.destroyed = !0, this.emitter.emit("destroy", void 0), this.endPick(), this.map.removeInteraction(this.snapInteraction), this.map.removeInteraction(this.inspectInteraction), this.pickHighlight?.setMap(null), this.pickHighlight = null, this.toolManager.deactivate(), this.selectionManager.destroy(), this.templateStore.clear(), this.localLayerStore.clear(), this.map.removeLayer(this.measurementStore.layer), this.map.removeLayer(this.measurementStore.liveLayer), this.emitter.clear(), this.reflectEditMode(!1), this.layerManager.destroy();
			for (let e of this.basemapLayers.values()) this.map.removeLayer(e);
			this.basemapLayers.clear(), this.ownsMap && (this.map.setTarget(void 0), this.map.dispose());
		}
	}
	createView(e) {
		let { view: t } = this.config;
		return new Pe({
			projection: e,
			center: t.center,
			zoom: t.zoom,
			minZoom: t.minZoom,
			maxZoom: t.maxZoom,
			rotation: t.rotation,
			extent: t.extent
		});
	}
	insertBasemap(e, t) {
		let n = cn(this.config.basemaps.find((t) => t.id === e), {
			getProjection: () => this.getProjection(),
			onError: (e, t) => this.emitter.emit("basemaperror", {
				id: e,
				error: t
			})
		});
		n.set(an, e), this.basemapLayers.set(e, n), this.map.getLayers().insertAt(t, n);
	}
};
function lo(e) {
	u(e);
	let t = It(e);
	return Zn(t.projections, t.proj4), new co(t, { explicitView: e.view !== void 0 });
}
//#endregion
export { m as BaseTool, d as ConfigError, oo as EDIT_MODE_CLASS, ie as EXPORT_FORMATS, Qn as HIGHLIGHT_LAYER_PROPERTY, _e as IMPORT_FORMATS, pe as ImportError, Vn as LAYER_HIGHLIGHT_PROPERTY, Hn as LAYER_HIGHLIGHT_Z_INDEX, qn as LAYER_Z_INDEX_BASE, S as LENGTH_UNITS, le as LOCAL_GEOMETRY_TYPES, de as LocalLayerImportError, Ee as MEASUREMENT_MIN_POINTS, Lt as MESSAGES, w as StyleError, Nt as TEXT_DEFAULTS, G as TemplateImportError, Tr as applyImport, f as composite, Ce as computeMeasurement, gr as constrainToAngleStep, lo as createEditor, tr as createHighlightStyle, Un as createLayerHighlightStyle, re as crsLengthUnit, v as deleteFeature, g as distanceMetres, bi as ellipseFromAxis, yi as ellipseFromCentre, xi as ellipseFromCorners, Si as ellipsePolygon, ke as exportLayers, fn as featureText, se as flatFromStyle, ae as formatAngle, be as formatArea, Te as formatLength, Rt as formatMessage, ue as fromMetres, wr as importTargets, n as insertFeature, De as isLengthUnit, ye as lengthUnitInfo, ce as measureAngle, ge as measureArea, Oe as measureLength, Ya as mirrorGeometry, hr as nearestAllowedAngle, o as offsetMetres, fa as parallelPath, je as parseColor, Cr as parseInput, va as pathLength, fe as readImport, Ja as reflectPoint, ee as rgba, eo as scaleFactor, to as scaleGeometry, ya as stationOf, r as styleFromFlat, Ae as styleSections, $ as subPath, pn as textStyle, mn as textStyleFunction, we as toMetres, me as unitFromText, l as unitsPerMetre, x as updateGeometry, c as updateProperties, Se as validateBasemapConfig, u as validateConfig, b as validateGeometry, ne as validateLayerConfig, y as validateStyle, $n as vertexPoints };

//# sourceMappingURL=index.js.map