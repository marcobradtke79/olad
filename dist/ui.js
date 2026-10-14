import { H as e, X as t, Z as n, _ as r, a as i, d as a, i as o, l as s, m as c, nt as l, u, w as d } from "./MeasurementStore-yIAXsGId.js";
//#region src/ui/icons.ts
var f = "xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"olcad-icon\" aria-hidden=\"true\" focusable=\"false\"", p = (e) => `<svg ${f}>${e}</svg>`, m = {
	edit: p("<path d=\"M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z\"/><path d=\"m13.5 6.5 3 3\"/>"),
	undo: p("<path d=\"M9 14 4 9l5-5\"/><path d=\"M4 9h10a6 6 0 0 1 0 12h-3\"/>"),
	redo: p("<path d=\"m15 14 5-5-5-5\"/><path d=\"M20 9H10a6 6 0 0 0 0 12h3\"/>"),
	select: p("<path d=\"M5 3l14 9-6 1.5L10.5 20 5 3Z\"/>"),
	drawPoint: p("<circle cx=\"12\" cy=\"12\" r=\"3\" fill=\"currentColor\" stroke=\"none\"/><path d=\"M12 3v4M12 17v4M3 12h4M17 12h4\"/>"),
	drawLine: p("<path d=\"M4 18 10 7l5 8 5-10\"/><circle cx=\"4\" cy=\"18\" r=\"1.6\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"10\" cy=\"7\" r=\"1.6\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"15\" cy=\"15\" r=\"1.6\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"20\" cy=\"5\" r=\"1.6\" fill=\"currentColor\" stroke=\"none\"/>"),
	drawPolygon: p("<path d=\"M12 3 20 9l-3 10H7L4 9Z\"/><circle cx=\"12\" cy=\"3\" r=\"1.6\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"20\" cy=\"9\" r=\"1.6\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"17\" cy=\"19\" r=\"1.6\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"7\" cy=\"19\" r=\"1.6\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"4\" cy=\"9\" r=\"1.6\" fill=\"currentColor\" stroke=\"none\"/>"),
	drawRectangle: p("<rect x=\"4\" y=\"6\" width=\"16\" height=\"12\"/><circle cx=\"4\" cy=\"6\" r=\"1.6\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"20\" cy=\"18\" r=\"1.6\" fill=\"currentColor\" stroke=\"none\"/>"),
	drawCircle: p("<circle cx=\"12\" cy=\"12\" r=\"8\"/><circle cx=\"12\" cy=\"12\" r=\"1.6\" fill=\"currentColor\" stroke=\"none\"/><path d=\"M12 12h8\"/>"),
	drawCirclePoint: p("<circle cx=\"12\" cy=\"12\" r=\"8\"/><circle cx=\"12\" cy=\"12\" r=\"1.6\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"17.66\" cy=\"6.34\" r=\"1.6\" fill=\"currentColor\" stroke=\"none\"/>"),
	drawEllipse: p("<ellipse cx=\"12\" cy=\"12\" rx=\"9\" ry=\"5.5\"/><circle cx=\"12\" cy=\"12\" r=\"1.6\" fill=\"currentColor\" stroke=\"none\"/><path d=\"M12 12h9\"/>"),
	drawEllipseAxis: p("<ellipse cx=\"12\" cy=\"12\" rx=\"9\" ry=\"5.5\"/><path d=\"M3 12h18\"/><circle cx=\"3\" cy=\"12\" r=\"1.6\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"21\" cy=\"12\" r=\"1.6\" fill=\"currentColor\" stroke=\"none\"/>"),
	drawEllipseBox: p("<rect x=\"3\" y=\"6.5\" width=\"18\" height=\"11\" stroke-dasharray=\"2 2\"/><ellipse cx=\"12\" cy=\"12\" rx=\"9\" ry=\"5.5\"/><circle cx=\"3\" cy=\"6.5\" r=\"1.6\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"21\" cy=\"17.5\" r=\"1.6\" fill=\"currentColor\" stroke=\"none\"/>"),
	drawCircleThreePoints: p("<circle cx=\"12\" cy=\"12\" r=\"8\"/><circle cx=\"12\" cy=\"4\" r=\"1.6\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"5.07\" cy=\"16\" r=\"1.6\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"18.93\" cy=\"16\" r=\"1.6\" fill=\"currentColor\" stroke=\"none\"/>"),
	drawRegularPolygon: p("<path d=\"M19 12l-3.5 6.06h-7L5 12l3.5-6.06h7z\"/><circle cx=\"12\" cy=\"12\" r=\"1.6\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"19\" cy=\"12\" r=\"1.6\" fill=\"currentColor\" stroke=\"none\"/>"),
	offset: p("<path d=\"M4 18l5-9 5 4 6-8\"/><path d=\"M4 9l5-5 5 4 6-6\" stroke-dasharray=\"2 2\" transform=\"translate(0 2)\"/>"),
	trim: p("<path d=\"M14 3v18\"/><path d=\"M3 12h11\"/><path d=\"M14 12h7\" stroke-dasharray=\"2 2\"/>"),
	extend: p("<path d=\"M20 3v18\"/><path d=\"M3 12h9\"/><path d=\"M12 12h8\" stroke-dasharray=\"2 2\"/><path d=\"m16 9 3 3-3 3\"/>"),
	drawCurve: p("<path d=\"M4 18c6-14 10 14 16-6\"/><path d=\"M4 18l4-7M20 12l-3 5\" stroke-dasharray=\"2 2\"/><circle cx=\"8\" cy=\"11\" r=\"1.6\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"17\" cy=\"17\" r=\"1.6\" fill=\"currentColor\" stroke=\"none\"/>"),
	drawParallel: p("<path d=\"M3 15h8l6-8h4\"/><path d=\"M3 20h10l6-8h2\" stroke-dasharray=\"2 2\"/><circle cx=\"3\" cy=\"20\" r=\"1.6\" fill=\"currentColor\" stroke=\"none\"/>"),
	drawText: p("<path d=\"M5 6V4h12v2\"/><path d=\"M11 4v14\"/><path d=\"M8 18h6\"/><path d=\"M17 20h4M19 18v4\" />"),
	vertices: p("<path d=\"M5 18 12 6l7 12\"/><rect x=\"3\" y=\"16\" width=\"4\" height=\"4\"/><rect x=\"10\" y=\"4\" width=\"4\" height=\"4\"/><rect x=\"17\" y=\"16\" width=\"4\" height=\"4\"/>"),
	move: p("<path d=\"M12 3v18M3 12h18\"/><path d=\"m9 6 3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3\"/>"),
	rotate: p("<path d=\"M20 12a8 8 0 1 1-2.34-5.66\"/><path d=\"M20 3v5h-5\"/><circle cx=\"12\" cy=\"12\" r=\"1.2\" fill=\"currentColor\" stroke=\"none\"/>"),
	scale: p("<rect x=\"3\" y=\"13\" width=\"8\" height=\"8\"/><path d=\"M3 9V3h18v18h-6\" stroke-dasharray=\"2 2\"/><path d=\"m10 14 8-8M13 6h5v5\"/>"),
	delete: p("<path d=\"M4 7h16\"/><path d=\"M10 11v6M14 11v6\"/><path d=\"M6 7l1 13h10l1-13\"/><path d=\"M9 7V4h6v3\"/>"),
	zoomIn: p("<circle cx=\"11\" cy=\"11\" r=\"7\"/><path d=\"m20 20-4-4\"/><path d=\"M11 8v6M8 11h6\"/>"),
	zoomOut: p("<circle cx=\"11\" cy=\"11\" r=\"7\"/><path d=\"m20 20-4-4\"/><path d=\"M8 11h6\"/>"),
	snap: p("<path d=\"M6 4v8a6 6 0 0 0 12 0V4\"/><path d=\"M6 4h4v8a2 2 0 0 0 4 0V4h4\"/><path d=\"M6 8h4M14 8h4\"/>"),
	snapVertex: p("<path d=\"M3 18 12 6l9 12\"/><rect x=\"9\" y=\"3\" width=\"6\" height=\"6\" fill=\"currentColor\" stroke=\"none\"/>"),
	snapMidpoint: p("<path d=\"M3 17 21 7\"/><circle cx=\"12\" cy=\"12\" r=\"3\" fill=\"currentColor\" stroke=\"none\"/>"),
	snapPerpendicular: p("<path d=\"M3 18h18\"/><path d=\"M12 18V5\"/><path d=\"M12 13h5v5\"/>"),
	snapTangent: p("<circle cx=\"12\" cy=\"14\" r=\"6\"/><path d=\"M3 8h18\"/>"),
	grid: p("<circle cx=\"5\" cy=\"5\" r=\"1.4\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"12\" cy=\"5\" r=\"1.4\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"19\" cy=\"5\" r=\"1.4\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"5\" cy=\"12\" r=\"1.4\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"12\" cy=\"12\" r=\"1.4\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"19\" cy=\"12\" r=\"1.4\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"5\" cy=\"19\" r=\"1.4\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"12\" cy=\"19\" r=\"1.4\" fill=\"currentColor\" stroke=\"none\"/><circle cx=\"19\" cy=\"19\" r=\"1.4\" fill=\"currentColor\" stroke=\"none\"/>"),
	eye: p("<path d=\"M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>"),
	eyeOff: p("<path d=\"M2 12s4-7 10-7c2 0 3.8.8 5.3 1.8M22 12s-4 7-10 7c-2 0-3.8-.8-5.3-1.8\"/><path d=\"M9.9 9.9a3 3 0 0 0 4.2 4.2\"/><path d=\"M3 3l18 18\"/>"),
	addLayer: p("<path d=\"m12 4 8 4-8 4-8-4 8-4Z\"/><path d=\"m4 12 8 4 4-2\"/><path d=\"M19 14v6M16 17h6\"/>"),
	settings: p("<circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8\"/>"),
	arrowUp: p("<path d=\"M12 19V5\"/><path d=\"m6 11 6-6 6 6\"/>"),
	arrowDown: p("<path d=\"M12 5v14\"/><path d=\"m6 13 6 6 6-6\"/>"),
	palette: p("<path d=\"M12 3a9 9 0 1 0 0 18c1.1 0 1.5-.8 1.2-1.6-.4-1 .3-2.4 1.6-2.4H17a4 4 0 0 0 4-4c0-5.5-4-10-9-10Z\"/><circle cx=\"7.5\" cy=\"11\" r=\"1\"/><circle cx=\"10\" cy=\"7\" r=\"1\"/><circle cx=\"14.5\" cy=\"7\" r=\"1\"/>"),
	table: p("<rect x=\"3\" y=\"4\" width=\"18\" height=\"16\" rx=\"1.5\"/><path d=\"M3 9h18M3 14.5h18M9 9v11\"/>"),
	close: p("<path d=\"M6 6l12 12M18 6 6 18\"/>"),
	info: p("<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 11v6\"/><path d=\"M12 7.5v.5\"/>"),
	highlight: p("<path d=\"m9 11-5 5v4h4l5-5\"/><path d=\"m9 11 6-6 4 4-6 6z\"/><path d=\"M14 20h6\"/>"),
	mirror: p("<path d=\"M12 3v18\" stroke-dasharray=\"2 2\"/><path d=\"M9 7 3 17h6z\"/><path d=\"m15 7 6 10h-6z\"/>"),
	moveToLayer: p("<path d=\"m12 13 8-4-8-4-8 4z\"/><path d=\"m4 13 8 4 8-4\"/><path d=\"m4 17 8 4 8-4\"/><path d=\"M12 1v6M9.5 4.5 12 7l2.5-2.5\"/>"),
	measureDistance: p("<path d=\"M3 16 16 3l5 5L8 21z\"/><path d=\"m7 12 2 2M10 9l2 2M13 6l2 2\"/>"),
	measureArea: p("<path d=\"M4 6 13 3l7 7-4 10H6z\" stroke-dasharray=\"2 2\"/><path d=\"M9 10h6M9 14h6\"/>"),
	measureAngle: p("<path d=\"M4 20 18 4\"/><path d=\"M4 20h16\"/><path d=\"M11 20a7 7 0 0 0-2.4-5.3\"/>"),
	measureClear: p("<path d=\"M3 16 12 7l5 5-9 9H3z\"/><path d=\"m14 4 6 6\"/><path d=\"m15 15 6 6M21 15l-6 6\"/>"),
	copy: p("<rect x=\"8\" y=\"8\" width=\"12\" height=\"12\" rx=\"1.5\"/><path d=\"M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8\"/>"),
	stamp: p("<path d=\"M9 13V9.5a3 3 0 1 1 6 0V13\"/><path d=\"M5 13h14v4H5z\"/><path d=\"M5 20h14\"/>"),
	rename: p("<path d=\"M4 7h10M4 12h6\"/><path d=\"M13 20h3l5-5a1.4 1.4 0 0 0-2-2l-5 5z\"/>"),
	angleLock: p("<path d=\"M4 20h16\"/><path d=\"M4 20 16 6\"/><path d=\"M11 20a7 7 0 0 0-2-5\"/><rect x=\"15\" y=\"12\" width=\"6\" height=\"5\" rx=\"1\"/><path d=\"M16.5 12v-1.5a1.5 1.5 0 0 1 3 0V12\"/>"),
	straightedge: p("<path d=\"M3 17 17 3l4 4L7 21l-4-4Z\"/><path d=\"m8 12 2 2M11 9l2 2M14 6l2 2\"/>"),
	reset: p("<path d=\"M4 10a8 8 0 1 1 2 7\"/><path d=\"M4 4v6h6\"/>"),
	alignSegment: p("<path d=\"M3 19 21 5\"/><path d=\"m8 15 1.5 1.5\"/><path d=\"M11 10l6 6-2.5 1-1.5 3.5L11 10Z\" fill=\"currentColor\"/>")
};
function h(e, t = document) {
	return t.createRange().createContextualFragment(m[e]).firstElementChild;
}
//#endregion
//#region src/ui/tooltip.ts
var g = 400, _ = 6, v = /* @__PURE__ */ new WeakMap();
function y(e = document) {
	let t = v.get(e);
	if (t) return t;
	let n = null, r = null, i = null, a = () => (n || (n = e.createElement("div"), n.className = "olcad-tooltip", n.setAttribute("role", "tooltip"), n.hidden = !0, e.body.append(n)), n), o = () => {
		r && clearTimeout(r), r = null, i = null, n && (n.hidden = !0);
	}, s = (t) => {
		let n = t.getAttribute("data-tooltip") ?? "", r = t.getAttribute("aria-label") ?? "";
		if (!n && !r) return;
		let i = a();
		if (i.replaceChildren(), r) {
			let t = e.createElement("strong");
			t.className = "olcad-tooltip__label", t.textContent = r, i.append(t);
		}
		if (n && n !== r) {
			let t = e.createElement("span");
			t.className = "olcad-tooltip__text", t.textContent = n, i.append(t);
		}
		i.hidden = !1, b(i, t, e);
	}, c = (e) => {
		e !== i && (o(), i = e, r = setTimeout(() => {
			r = null, i === e && e.isConnected && s(e);
		}, 400));
	}, l = (e) => e.target?.closest?.("[data-tooltip]") ?? null, u = (e) => {
		let t = l(e);
		t && c(t);
	}, d = (e) => {
		let t = l(e), n = e.relatedTarget;
		t && t === i && !(n && t.contains(n)) && o();
	}, f = (e) => {
		let t = l(e);
		t && c(t);
	}, p = (e) => {
		l(e) === i && o();
	}, m = () => o(), h = (e) => {
		e.key === "Escape" && o();
	};
	e.addEventListener("pointerover", u), e.addEventListener("pointerout", d), e.addEventListener("focusin", f), e.addEventListener("focusout", p), e.addEventListener("pointerdown", m, !0), e.addEventListener("keydown", h, !0);
	let g = () => {
		o(), e.removeEventListener("pointerover", u), e.removeEventListener("pointerout", d), e.removeEventListener("focusin", f), e.removeEventListener("focusout", p), e.removeEventListener("pointerdown", m, !0), e.removeEventListener("keydown", h, !0), n?.remove(), n = null, v.delete(e);
	};
	return v.set(e, g), g;
}
function b(e, t, n) {
	let r = n.defaultView, i = t.getBoundingClientRect(), a = e.getBoundingClientRect(), o = r?.innerWidth ?? 0, s = r?.innerHeight ?? 0, c = i.bottom + _;
	s && c + a.height > s && i.top - _ - a.height >= 0 && (c = i.top - _ - a.height);
	let l = i.left + i.width / 2 - a.width / 2;
	o && (l = Math.min(Math.max(_, l), o - a.width - _)), e.style.left = `${Math.max(0, Math.round(l))}px`, e.style.top = `${Math.max(0, Math.round(c))}px`;
}
//#endregion
//#region src/ui/elements/controls.ts
function x(e, t, n, r) {
	e.replaceChildren(h(t, e.ownerDocument)), e.classList.add("olcad-icon-button"), e.setAttribute("aria-label", n), e.setAttribute("data-tooltip", r ?? n), e.removeAttribute("title"), y(e.ownerDocument);
}
function S(e, t = document) {
	let n = t.createElement("span");
	return n.className = "olcad-visually-hidden", n.textContent = e, n;
}
//#endregion
//#region src/ui/elements/OlcadPanel.ts
var C = [
	"top",
	"right",
	"bottom",
	"left",
	"floating"
], w = "olcad-dockchange", T = "olcad-flyouttoggle", ee = 4, te = 10, ne = {
	top: "Dock top",
	right: "Dock right",
	bottom: "Dock bottom",
	left: "Dock left",
	floating: "Float"
}, E = class extends HTMLElement {
	static get observedAttributes() {
		return [
			"dock",
			"x",
			"y",
			"heading",
			"flyout",
			"open",
			"compact"
		];
	}
	get defaultDock() {
		return "floating";
	}
	get defaultHeading() {
		return "Panel";
	}
	get defaultCompact() {
		return !1;
	}
	content = document.createElement("div");
	header = document.createElement("div");
	grip = document.createElement("button");
	titleEl = document.createElement("span");
	menuButton = document.createElement("button");
	menu = document.createElement("div");
	built = !1;
	drag = null;
	suppressEvents = !1;
	compactRole = !1;
	get name() {
		return this.getAttribute("name") ?? "";
	}
	get heading() {
		return this.getAttribute("heading") ?? this.defaultHeading;
	}
	set heading(e) {
		this.setAttribute("heading", e);
	}
	get dock() {
		let e = this.getAttribute("dock");
		return C.includes(e) ? e : this.defaultDock;
	}
	set dock(e) {
		this.setAttribute("dock", e);
	}
	get x() {
		return Number(this.getAttribute("x")) || 0;
	}
	set x(e) {
		this.setAttribute("x", String(Math.round(e)));
	}
	get y() {
		return Number(this.getAttribute("y")) || 0;
	}
	set y(e) {
		this.setAttribute("y", String(Math.round(e)));
	}
	get toggleable() {
		return !this.hasAttribute("no-toggle");
	}
	get placement() {
		let e = {
			dock: this.dock,
			x: this.x,
			y: this.y
		};
		return this.toggleable && this.hidden && (e.hidden = !0), e;
	}
	set placement(e) {
		this.suppressEvents = !0, this.toggleable && (this.hidden = e.hidden === !0), this.x = e.x, this.y = e.y, this.suppressEvents = !1, this.dock = e.dock, this.applyPlacement(), this.emitDockChange();
	}
	get orientation() {
		let e = this.dock;
		return e === "left" || e === "right" ? "vertical" : "horizontal";
	}
	get flyout() {
		return this.hasAttribute("flyout");
	}
	set flyout(e) {
		this.toggleAttribute("flyout", e);
	}
	get open() {
		return this.hasAttribute("open");
	}
	set open(e) {
		this.toggleAttribute("open", e);
	}
	get isFlyout() {
		return this.flyout && this.orientation === "vertical";
	}
	get compact() {
		let e = this.getAttribute("compact");
		return e === null ? this.defaultCompact : e !== "false";
	}
	set compact(e) {
		this.setAttribute("compact", String(e));
	}
	get isCompact() {
		return this.compact && !this.isFlyout;
	}
	toggleFlyout(e = !this.open) {
		if (e) for (let e of this.parentElement?.querySelectorAll(".olcad-panel[data-flyout][open]") ?? []) e !== this && (e.open = !1);
		this.open = e;
	}
	connectedCallback() {
		this.classList.add("olcad-panel"), this.built || this.build(), this.applyPlacement(), y(this.ownerDocument);
		let e = this.dockHost();
		e && this.parentElement?.dataset.zone !== this.dock && e.adopt(this);
	}
	attributeChangedCallback(e) {
		this.built && (e === "heading" ? (this.titleEl.textContent = this.heading, this.grip.setAttribute("aria-label", `Move ${this.heading}`), this.applyCompact()) : e === "flyout" || e === "compact" ? (this.applyFlyout(), this.applyCompact()) : e === "open" ? (this.applyFlyout(), this.dispatchEvent(new CustomEvent(T, {
			bubbles: !0,
			composed: !0,
			detail: {
				name: this.name,
				open: this.open
			}
		}))) : (this.applyPlacement(), this.suppressEvents || this.emitDockChange()));
	}
	dockHost() {
		let e = this.closest("olcad-dock");
		return e && "adopt" in e ? e : null;
	}
	build() {
		this.built = !0, this.content.className = "olcad-panel__content", this.content.append(...Array.from(this.childNodes)), this.header.className = "olcad-panel__header", this.grip.type = "button", this.grip.className = "olcad-panel__grip", this.grip.setAttribute("aria-label", `Move ${this.heading}`), this.grip.setAttribute("data-tooltip", "Drag to move, arrow keys to nudge"), this.grip.innerHTML = "<span aria-hidden=\"true\">⠿</span>", this.titleEl.className = "olcad-panel__title", this.titleEl.textContent = this.heading, this.menuButton.type = "button", this.menuButton.className = "olcad-panel__menu-button", this.menuButton.setAttribute("aria-haspopup", "menu"), this.menuButton.setAttribute("aria-expanded", "false"), this.menuButton.setAttribute("aria-label", "Dock position"), this.menuButton.innerHTML = "<span aria-hidden=\"true\">▾</span>", this.menu.className = "olcad-panel__menu", this.menu.setAttribute("role", "menu"), this.menu.hidden = !0;
		for (let e of C) {
			let t = document.createElement("button");
			t.type = "button", t.className = "olcad-panel__menu-item", t.setAttribute("role", "menuitemradio"), t.dataset.dock = e, t.textContent = ne[e], t.addEventListener("click", () => {
				this.dock = e, this.closeMenu(), this.menuTrigger().focus();
			}), this.menu.append(t);
		}
		this.header.append(this.grip, this.titleEl, this.menuButton, this.menu), this.append(this.header, this.content), this.content.id ||= `olcad-panel-content-${Math.random().toString(36).slice(2, 8)}`, this.titleEl.addEventListener("click", () => {
			this.isFlyout && this.toggleFlyout();
		}), this.titleEl.addEventListener("keydown", (e) => {
			!this.isFlyout || e.key !== "Enter" && e.key !== " " || (e.preventDefault(), this.toggleFlyout(), this.open && this.focusContent());
		}), this.addEventListener("keydown", (e) => {
			e.key === "Escape" && !e.defaultPrevented && this.isFlyout && this.open && (e.preventDefault(), e.stopPropagation(), this.toggleFlyout(!1), this.titleEl.focus());
		}), this.grip.addEventListener("pointerdown", this.onPointerDown), this.grip.addEventListener("pointermove", this.onPointerMove), this.grip.addEventListener("pointerup", this.onPointerUp), this.grip.addEventListener("pointercancel", this.onPointerCancel), this.grip.addEventListener("keydown", this.onGripKeyDown), this.grip.addEventListener("contextmenu", (e) => {
			this.isCompact && (e.preventDefault(), this.toggleMenu());
		}), this.menuButton.addEventListener("click", () => this.toggleMenu()), this.menu.addEventListener("keydown", this.onMenuKeyDown), this.addEventListener("focusout", (e) => {
			this.contains(e.relatedTarget) || this.closeMenu();
		});
	}
	applyPlacement() {
		let e = this.dock;
		this.setAttribute("data-dock", e), this.setAttribute("orientation", this.orientation), this.style.setProperty("--olcad-panel-x", `${this.x}px`), this.style.setProperty("--olcad-panel-y", `${this.y}px`);
		for (let t of this.menu.querySelectorAll("[data-dock]")) t.setAttribute("aria-checked", String(t.dataset.dock === e));
		this.applyFlyout(), this.applyCompact();
	}
	applyCompact() {
		let e = this.isCompact;
		this.toggleAttribute("data-compact", e), this.grip.setAttribute("data-tooltip", e ? `${this.heading}: drag to move, click for the dock position` : "Drag to move, arrow keys to nudge"), e ? (this.content.setAttribute("aria-label", this.heading), this.content.hasAttribute("role") || (this.content.setAttribute("role", "group"), this.compactRole = !0)) : this.compactRole &&= (this.content.removeAttribute("role"), this.content.removeAttribute("aria-label"), !1);
	}
	applyFlyout() {
		let e = this.isFlyout;
		this.toggleAttribute("data-flyout", e), e ? (this.titleEl.setAttribute("role", "button"), this.titleEl.tabIndex = 0, this.titleEl.setAttribute("aria-expanded", String(this.open)), this.titleEl.setAttribute("aria-controls", this.content.id), this.titleEl.title = this.open ? `Hide ${this.heading}` : `Show ${this.heading}`) : (this.titleEl.removeAttribute("role"), this.titleEl.removeAttribute("tabindex"), this.titleEl.removeAttribute("aria-expanded"), this.titleEl.removeAttribute("aria-controls"), this.titleEl.removeAttribute("title"));
	}
	focusContent() {
		this.content.querySelector("button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex=\"0\"]")?.focus();
	}
	emitDockChange() {
		this.dispatchEvent(new CustomEvent(w, {
			bubbles: !0,
			composed: !0,
			detail: {
				name: this.name,
				...this.placement
			}
		}));
	}
	onPointerDown = (e) => {
		if (e.button !== 0) return;
		let t = this.getBoundingClientRect();
		this.drag = {
			pointerId: e.pointerId,
			startX: e.clientX,
			startY: e.clientY,
			offsetX: e.clientX - t.left,
			offsetY: e.clientY - t.top,
			previous: this.placement,
			moved: !1
		}, this.grip.setPointerCapture?.(e.pointerId), e.preventDefault();
	};
	onPointerMove = (e) => {
		let t = this.drag;
		if (!t || e.pointerId !== t.pointerId || !t.moved && Math.hypot(e.clientX - t.startX, e.clientY - t.startY) < ee) return;
		t.moved = !0, this.classList.add("olcad-panel--dragging");
		let n = this.dockHost(), r = (n ?? this.offsetParent ?? document.body).getBoundingClientRect();
		this.suppressEvents = !0, this.x = e.clientX - t.offsetX - r.left, this.y = e.clientY - t.offsetY - r.top, this.dock !== "floating" && (this.dock = "floating"), this.suppressEvents = !1, this.applyPlacement(), this.emitDockChange(), n?.highlightZone(n.dropZoneAt(e.clientX, e.clientY));
	};
	onPointerUp = (e) => {
		let t = this.drag;
		if (!t || e.pointerId !== t.pointerId) return;
		if (this.drag = null, this.classList.remove("olcad-panel--dragging"), !t.moved) {
			this.isCompact && this.toggleMenu();
			return;
		}
		let n = this.dockHost(), r = n?.dropZoneAt(e.clientX, e.clientY) ?? null;
		n?.highlightZone(null), r ? this.dock = r : this.clampToHost(n);
	};
	onPointerCancel = () => {
		this.cancelDrag();
	};
	cancelDrag() {
		let e = this.drag;
		e && (this.drag = null, this.classList.remove("olcad-panel--dragging"), this.dockHost()?.highlightZone(null), e.moved && (this.placement = e.previous));
	}
	clampToHost(e) {
		if (!e) return;
		let t = e.getBoundingClientRect();
		if (t.width === 0 || t.height === 0) return;
		let n = this.getBoundingClientRect(), r = Math.max(0, t.width - n.width), i = Math.max(0, t.height - n.height), a = Math.min(Math.max(0, this.x), r), o = Math.min(Math.max(0, this.y), i);
		(a !== this.x || o !== this.y) && (this.placement = {
			dock: "floating",
			x: a,
			y: o
		});
	}
	onGripKeyDown = (e) => {
		if (e.key === "Escape" && this.drag) {
			this.cancelDrag(), e.preventDefault();
			return;
		}
		if (this.isCompact && (e.key === "Enter" || e.key === " " || e.key === "ContextMenu")) {
			e.preventDefault(), this.toggleMenu();
			return;
		}
		let t = e.shiftKey ? 50 : te, n = {
			ArrowLeft: [-t, 0],
			ArrowRight: [t, 0],
			ArrowUp: [0, -t],
			ArrowDown: [0, t]
		}[e.key];
		n && (e.preventDefault(), this.dock === "floating" && (this.placement = {
			dock: "floating",
			x: this.x + n[0],
			y: this.y + n[1]
		}, this.clampToHost(this.dockHost())));
	};
	menuTrigger() {
		return this.isCompact ? this.grip : this.menuButton;
	}
	toggleMenu() {
		this.menu.hidden ? this.openMenu() : this.closeMenu();
	}
	openMenu() {
		this.menu.hidden = !1, this.menuButton.setAttribute("aria-expanded", "true"), (this.menu.querySelector("[aria-checked=\"true\"]") ?? this.menu.querySelector("[data-dock]"))?.focus();
	}
	closeMenu() {
		this.menu.hidden || (this.menu.hidden = !0, this.menuButton.setAttribute("aria-expanded", "false"));
	}
	onMenuKeyDown = (e) => {
		let t = Array.from(this.menu.querySelectorAll("[data-dock]")), n = t.indexOf(document.activeElement), r = (e) => t[(e + t.length) % t.length]?.focus();
		switch (e.key) {
			case "Escape":
				this.closeMenu(), this.menuTrigger().focus();
				break;
			case "ArrowDown":
				r(n + 1);
				break;
			case "ArrowUp":
				r(n - 1);
				break;
			case "Home":
				r(0);
				break;
			case "End":
				r(t.length - 1);
				break;
			default: return;
		}
		e.preventDefault();
	};
}, D = [90, 45], O = class extends E {
	boundEditor = null;
	unsubscribe = [];
	toggle = document.createElement("button");
	presets = /* @__PURE__ */ new Map();
	step = document.createElement("input");
	controlsBuilt = !1;
	get defaultDock() {
		return "top";
	}
	get defaultHeading() {
		return "Angle";
	}
	get defaultCompact() {
		return !0;
	}
	get editor() {
		return this.boundEditor;
	}
	set editor(e) {
		this.unbind(), this.boundEditor = e, e && this.unsubscribe.push(e.on("constraintschange", () => this.render()), e.on("destroy", () => {
			this.editor = null;
		})), this.render();
	}
	connectedCallback() {
		super.connectedCallback(), this.classList.add("olcad-angle-lock"), this.controlsBuilt || this.buildControls(), this.render();
	}
	disconnectedCallback() {
		this.unbind();
	}
	buildControls() {
		this.controlsBuilt = !0, this.toggle.type = "button", this.toggle.className = "olcad-toolbar__button olcad-angle-lock__toggle", x(this.toggle, "angleLock", "Lock angle", "Only draw in directions that are multiples of the step from the straightedge angle"), this.toggle.addEventListener("click", () => {
			let e = this.boundEditor;
			e && e.constraints.setAngleLocked(!e.constraints.isAngleLocked());
		});
		let e = document.createElement("span");
		e.className = "olcad-angle-lock__presets", e.setAttribute("role", "group"), e.setAttribute("aria-label", "Angle step presets");
		for (let t of D) {
			let n = document.createElement("button");
			n.type = "button", n.className = "olcad-toolbar__button olcad-angle-lock__preset", n.dataset.step = String(t), n.textContent = `${t}°`, n.setAttribute("aria-label", `Step of ${t} degrees`), n.setAttribute("data-tooltip", `Angle step of ${t} degrees`), n.addEventListener("click", () => this.boundEditor?.constraints.setAngleStep(t)), this.presets.set(t, n), e.append(n);
		}
		let t = `olcad-angle-${Math.random().toString(36).slice(2, 8)}`, n = document.createElement("label");
		n.className = "olcad-angle-lock__label", n.htmlFor = t, n.append(S("Step")), this.step.setAttribute("data-tooltip", "Angle step in degrees"), this.step.id = t, this.step.type = "number", this.step.min = "0", this.step.max = "360", this.step.step = "any", this.step.className = "olcad-straightedge__input olcad-angle-lock__step", this.step.setAttribute("aria-label", "Angle step in degrees");
		let r = () => {
			let e = Number(this.step.value);
			this.boundEditor && Number.isFinite(e) && e > 0 && e <= 360 && this.boundEditor.constraints.setAngleStep(e), this.render();
		};
		this.step.addEventListener("change", r), this.step.addEventListener("keydown", (e) => {
			e.key === "Enter" && (r(), e.preventDefault());
		});
		let i = document.createElement("span");
		i.className = "olcad-angle-lock__unit", i.textContent = "°", this.content.append(this.toggle, e, n, this.step, i);
	}
	render() {
		if (!this.controlsBuilt) return;
		let e = this.boundEditor, t = e?.constraints.isAngleLocked() ?? !1, n = e?.constraints.getAngleStep();
		this.toggle.disabled = !e, this.toggle.setAttribute("aria-pressed", String(t)), this.toggleAttribute("locked", t);
		for (let [t, r] of this.presets) r.disabled = !e, r.setAttribute("aria-pressed", String(n === t));
		this.step.disabled = !e, e && document.activeElement !== this.step && (this.step.value = String(n));
	}
	unbind() {
		for (let e of this.unsubscribe) e();
		this.unsubscribe = [];
	}
}, re = class extends HTMLElement {
	boundEditor = null;
	unsubscribe = [];
	subject = null;
	error = null;
	popupQueue = [];
	popupTotal = 0;
	dialog = null;
	get popup() {
		return this.hasAttribute("popup");
	}
	get reveal() {
		return this.hasAttribute("reveal");
	}
	get editor() {
		return this.boundEditor;
	}
	set editor(e) {
		if (this.unbind(), this.boundEditor = e, e) {
			let t = () => this.render();
			this.unsubscribe.push(e.on("selectionchange", ({ features: t }) => {
				this.error = null, this.render(!0), this.reveal && !this.popup && t.length === 1 && !e.isEditMode() && this.revealPanel();
			}), e.on("change", t), e.on("draftmove", () => {
				this.popup || (this.render(!0), this.reveal && this.revealPanel(), this.ownerDocument.querySelector("dialog[open]") || this.querySelector("input:not([disabled]), select:not([disabled])")?.focus());
			}), e.on("featureinsert", ({ layer: t, feature: n, template: r, imported: i }) => {
				this.popup && r === void 0 && !i && (e.layers.getConfig(t).schema?.fields ?? []).length !== 0 && (this.popupQueue.includes(n) || (this.popupQueue.push(n), this.popupTotal++, this.popupQueue.length > 1 || (this.error = null), this.render(!0)));
			}), e.on("layerchange", t), e.on("editmodechange", t), e.on("validationerror", ({ message: e, command: t }) => {
				t.type === "updateProperties" && t.feature === this.subject && (this.error = e, this.render(!0));
			}), e.on("destroy", () => {
				this.editor = null;
			}));
		}
		this.render(!0);
	}
	connectedCallback() {
		this.classList.add("olcad-attribute-form"), this.render(!0);
	}
	disconnectedCallback() {
		this.unbind();
	}
	unbind() {
		for (let e of this.unsubscribe) e();
		this.unsubscribe = [];
	}
	revealPanel() {
		let e = this.closest("olcad-panel");
		e?.isFlyout && !e.hasAttribute("open") && e.toggleFlyout?.(!0);
	}
	currentSubject() {
		let e = this.boundEditor;
		if (!e) return null;
		let t;
		if (this.popup) {
			for (; this.popupQueue.length > 0 && !e.layers.layerOf(this.popupQueue[0]);) this.popupQueue.shift();
			this.popupQueue.length === 0 && (this.popupTotal = 0), t = this.popupQueue[0];
		} else {
			let n = e.selection.get();
			n.length === 1 && (t = n[0]);
		}
		if (!t) return null;
		let n = e.layers.layerOf(t);
		return n === void 0 ? null : {
			feature: t,
			layer: n
		};
	}
	closePopup() {
		this.popupQueue.shift(), this.popupQueue.length === 0 && (this.popupTotal = 0), this.error = null, this.render(!0);
	}
	closeAll() {
		this.popupQueue = [], this.popupTotal = 0, this.error = null, this.render(!0);
	}
	render(e = !1) {
		let t = this.currentSubject(), n = t?.feature === this.subject;
		if (!e && n && this.contains(document.activeElement)) return;
		this.subject = t?.feature ?? null;
		let r = this.boundEditor;
		if (this.popup) {
			let e = this.ensureDialog();
			if (e.replaceChildren(), !r || !t) {
				e.open && ae(e);
				return;
			}
			this.renderInto(e, r, t.feature, t.layer), e.open || ie(e), e.contains(document.activeElement) || e.querySelector("input:not([disabled]), select:not([disabled])")?.focus();
		} else this.replaceChildren(), !r || !t ? this.append(k(r ? "Select one feature to edit its attributes." : "")) : this.renderInto(this, r, t.feature, t.layer);
	}
	ensureDialog() {
		return this.dialog || (this.dialog = document.createElement("dialog"), this.dialog.className = "olcad-attribute-form__dialog", this.dialog.addEventListener("close", () => {
			this.popupQueue = [], this.popupTotal = 0;
		})), this.dialog.isConnected || this.append(this.dialog), this.dialog;
	}
	renderInto(e, t, n, r) {
		let i = t.layers.getConfig(r), a = t.layers.get(r), o = document.createElement("div");
		if (o.className = "olcad-attribute-form__title", o.textContent = `${a.title} #${String(n.getId() ?? "?")}`, this.popup && this.popupTotal > 1) {
			let e = document.createElement("span");
			e.className = "olcad-attribute-form__progress", e.textContent = `${this.popupTotal - this.popupQueue.length + 1} of ${this.popupTotal}`, o.append(" ", e);
		}
		if (e.append(o), r === t.layers.getDraft()) {
			e.append(k("A draft object. Move it to a layer in the Layers panel to add its attributes."));
			return;
		}
		let s = i.schema?.fields ?? [];
		if (s.length === 0) {
			e.append(k(`No attributes configured for ${a.title}.`)), this.popup && e.append(this.laterButton("Close"));
			return;
		}
		let c = t.isEditMode() && t.canEdit("update", n), l = document.createElement("form");
		l.className = "olcad-attribute-form__form", l.noValidate = !1;
		for (let e of s) l.append(this.renderField(e, n, c));
		let u = document.createElement("div");
		u.className = "olcad-attribute-form__actions";
		let d = document.createElement("button");
		d.type = "submit", d.className = "olcad-toolbar__button olcad-attribute-form__apply", d.textContent = this.popup ? "Save" : "Apply", d.disabled = !c;
		let f = document.createElement("button");
		if (f.type = "button", f.className = "olcad-toolbar__button olcad-attribute-form__reset", f.textContent = "Reset", f.addEventListener("click", () => {
			this.error = null, this.render(!0);
		}), u.append(d, f), this.popup && u.append(this.laterButton("Later")), l.append(u), c || l.append(k(t.isEditMode() ? `${a.title} does not allow updates.` : "Switch on edit mode to change attributes.")), this.error) {
			let e = document.createElement("div");
			e.className = "olcad-attribute-form__error", e.setAttribute("role", "alert"), e.textContent = this.error, l.append(e);
		}
		l.addEventListener("submit", (e) => {
			e.preventDefault(), l.reportValidity() && this.apply(l, s, n);
		}), e.append(l);
	}
	laterButton(e) {
		let t = document.createElement("button");
		return t.type = "button", t.className = "olcad-toolbar__button olcad-attribute-form__later", t.textContent = e, t.addEventListener("click", () => this.closePopup()), t;
	}
	renderField(e, t, n) {
		let r = document.createElement("label");
		r.className = "olcad-attribute-form__field", r.dataset.field = e.name;
		let i = document.createElement("span");
		i.className = "olcad-attribute-form__label", i.textContent = (e.label ?? e.name) + (e.required ? " *" : "");
		let a = oe(e, t.get(e.name));
		return a.name = e.name, a.disabled = !n || e.readOnly === !0, e.required && (a.required = !0), r.append(i, a), r;
	}
	apply(t, n, r) {
		let i = this.boundEditor;
		if (!i) return;
		let a = {};
		for (let e of n) {
			if (e.readOnly) continue;
			let n = se(e, t.elements.namedItem(e.name)), i = r.get(e.name);
			(e.type !== "boolean" || n !== !1 || i != null) && (ce(i, n) || (a[e.name] = n));
		}
		this.error = null, (Object.keys(a).length === 0 || i.execute(e(r, a))) && this.popup ? this.closePopup() : this.render(!0);
	}
};
function ie(e) {
	typeof e.showModal == "function" ? e.showModal() : e.setAttribute("open", "");
}
function ae(e) {
	typeof e.close == "function" ? e.close() : e.removeAttribute("open");
}
function k(e) {
	let t = document.createElement("p");
	return t.className = "olcad-attribute-form__hint", t.textContent = e, t;
}
function oe(e, t) {
	if (e.type === "enum") {
		let n = document.createElement("select");
		n.className = "olcad-attribute-form__control", e.required || n.append(new Option("", ""));
		for (let t of e.values ?? []) n.append(new Option(String(t), String(t)));
		return n.value = t == null ? "" : String(t), n;
	}
	let n = document.createElement("input");
	switch (n.className = "olcad-attribute-form__control", e.type) {
		case "boolean":
			n.type = "checkbox", n.checked = t === !0;
			break;
		case "number":
		case "integer":
			n.type = "number", n.step = e.type === "integer" ? "1" : "any", e.min !== void 0 && (n.min = String(e.min)), e.max !== void 0 && (n.max = String(e.max)), n.value = t == null ? "" : String(t);
			break;
		case "date":
			n.type = "date", n.value = typeof t == "string" ? t.slice(0, 10) : "";
			break;
		default: n.type = "text", e.pattern && (n.pattern = e.pattern), n.value = t == null ? "" : String(t);
	}
	return n;
}
function se(e, t) {
	if (e.type === "boolean") return t.checked;
	let n = t.value;
	if (n !== "") return e.type === "number" || e.type === "integer" ? Number(n) : e.type === "enum" ? (e.values ?? []).find((e) => String(e) === n) ?? n : n;
}
function ce(e, t) {
	let n = e == null, r = t == null;
	return n || r ? n && r : e === t;
}
//#endregion
//#region src/ui/elements/OlcadDock.ts
var A = "olcad-layoutchange", le = [
	"top",
	"right",
	"bottom",
	"left"
], j = "olcad-dock__zone", ue = class extends HTMLElement {
	static get observedAttributes() {
		return ["storage-key"];
	}
	dropThreshold = 40;
	zones = /* @__PURE__ */ new Map();
	observer = new MutationObserver((e) => {
		for (let t of e) for (let e of t.addedNodes) e instanceof Element && !e.classList.contains(j) && this.place(e);
	});
	built = !1;
	adopted = /* @__PURE__ */ new WeakSet();
	defaults = /* @__PURE__ */ new WeakMap();
	applying = !1;
	get storageKey() {
		return this.getAttribute("storage-key");
	}
	connectedCallback() {
		this.classList.add("olcad-dock"), this.built || this.build(), customElements.upgrade(this), this.addEventListener(w, this.onDockChange);
		for (let e of Array.from(this.children)) e.classList.contains(j) || this.place(e);
		this.observer.observe(this, { childList: !0 });
	}
	disconnectedCallback() {
		this.observer.disconnect(), this.removeEventListener(w, this.onDockChange);
	}
	attributeChangedCallback() {
		this.built && this.setLayout(this.storedLayout());
	}
	adopt(e) {
		if (!this.adopted.has(e)) {
			this.adopted.add(e), this.defaults.set(e, e.placement);
			let t = e.name ? this.storedLayout()[e.name] : void 0;
			if (t) {
				this.applying = !0;
				try {
					e.placement = t;
				} finally {
					this.applying = !1;
				}
			}
		}
		this.place(e);
	}
	panels() {
		return Array.from(this.querySelectorAll("*")).filter((e) => e instanceof E);
	}
	getLayout() {
		let e = {};
		for (let t of this.panels()) t.name && (e[t.name] = t.placement);
		return e;
	}
	setLayout(e) {
		this.apply((t) => t.name ? e[t.name] : void 0);
	}
	defaultLayout() {
		let e = {};
		for (let t of this.panels()) {
			let n = this.defaults.get(t);
			t.name && n && (e[t.name] = n);
		}
		return e;
	}
	listPanels() {
		return this.panels().filter((e) => e.name && e.toggleable).map((e) => ({
			name: e.name,
			heading: e.heading,
			hidden: e.hidden
		}));
	}
	setPanelVisible(e, t) {
		this.apply((n) => n.name === e && n.toggleable ? {
			...n.placement,
			hidden: !t
		} : void 0);
	}
	setAllPanelsVisible(e) {
		this.apply((t) => t.toggleable ? {
			...t.placement,
			hidden: !e
		} : void 0);
	}
	resetLayout() {
		return this.apply((e) => this.defaults.get(e)), this.getLayout();
	}
	apply(e) {
		this.applying = !0;
		try {
			for (let t of this.panels()) {
				let n = e(t);
				n && (t.placement = n);
			}
		} finally {
			this.applying = !1;
		}
		this.saveLayout(), this.dispatchEvent(new CustomEvent(A, { detail: this.getLayout() }));
	}
	dropZoneAt(e, t) {
		let n = this.getBoundingClientRect();
		if (e < n.left || e > n.right || t < n.top || t > n.bottom) return null;
		let r = {
			left: e - n.left,
			right: n.right - e,
			top: t - n.top,
			bottom: n.bottom - t
		}, i = null;
		for (let e of le) {
			let t = r[e];
			t <= this.dropThreshold && (i === null || t < r[i]) && (i = e);
		}
		return i;
	}
	highlightZone(e) {
		e ? this.setAttribute("data-drop", e) : this.removeAttribute("data-drop");
	}
	build() {
		this.built = !0;
		for (let e of [
			"top",
			"left",
			"center",
			"right",
			"bottom",
			"floating"
		]) {
			let t = document.createElement("div");
			t.className = `${j} ${j}--${e}`, t.dataset.zone = e, this.zones.set(e, t), this.append(t);
		}
	}
	place(e) {
		if (customElements.upgrade(e), e instanceof E && !this.adopted.has(e)) {
			this.adopt(e);
			return;
		}
		let t = e instanceof E ? e.dock : "center", n = this.zones.get(t);
		e.parentElement !== n && n.append(e);
	}
	onDockChange = (e) => {
		let t = e.target;
		t instanceof E && (this.place(t), !this.applying && (this.saveLayout(), this.dispatchEvent(new CustomEvent(A, { detail: this.getLayout() }))));
	};
	saveLayout() {
		let e = this.storageKey;
		if (e) try {
			localStorage.setItem(e, JSON.stringify(this.getLayout()));
		} catch {}
	}
	storedLayout() {
		let e = this.storageKey;
		if (!e) return {};
		try {
			let t = localStorage.getItem(e);
			return t ? JSON.parse(t) : {};
		} catch {
			return {};
		}
	}
};
//#endregion
//#region src/ui/elements/OlcadGridSettings.ts
function de(e) {
	switch (e) {
		case "m": return "m";
		case "degrees": return "°";
		case "ft": return "ft";
		case "us-ft": return "ft (US)";
		default: return e ?? "";
	}
}
var fe = class extends E {
	boundEditor = null;
	unsubscribe = [];
	toggle = document.createElement("button");
	spacing = document.createElement("input");
	unit = document.createElement("span");
	show = document.createElement("input");
	controlsBuilt = !1;
	get defaultDock() {
		return "top";
	}
	get defaultHeading() {
		return "Grid";
	}
	get defaultCompact() {
		return !0;
	}
	get editor() {
		return this.boundEditor;
	}
	set editor(e) {
		this.unbind(), this.boundEditor = e, e && this.unsubscribe.push(e.on("gridchange", () => this.render()), e.on("projectionchange", () => this.render()), e.on("destroy", () => {
			this.editor = null;
		})), this.render();
	}
	connectedCallback() {
		super.connectedCallback(), this.classList.add("olcad-grid-settings"), this.controlsBuilt || this.buildControls(), this.render();
	}
	disconnectedCallback() {
		this.unbind();
	}
	buildControls() {
		this.controlsBuilt = !0, this.toggle.type = "button", this.toggle.className = "olcad-toolbar__button olcad-grid-settings__toggle", x(this.toggle, "grid", "Grid snap", "Snap the cursor to the nearest grid point"), this.toggle.addEventListener("click", () => {
			let e = this.boundEditor;
			e && e.grid.setEnabled(!e.grid.isEnabled());
		});
		let e = `olcad-grid-${Math.random().toString(36).slice(2, 8)}`, t = document.createElement("label");
		t.className = "olcad-grid-settings__label", t.htmlFor = e, t.append(S("Spacing")), this.spacing.setAttribute("data-tooltip", "Grid spacing in map units"), this.spacing.id = e, this.spacing.type = "number", this.spacing.min = "0", this.spacing.step = "any", this.spacing.className = "olcad-straightedge__input olcad-grid-settings__spacing", this.spacing.setAttribute("aria-label", "Grid spacing in map units");
		let n = () => {
			let e = Number(this.spacing.value);
			this.boundEditor && Number.isFinite(e) && e > 0 && this.boundEditor.grid.setSpacing(e), this.render();
		};
		this.spacing.addEventListener("change", n), this.spacing.addEventListener("keydown", (e) => {
			e.key === "Enter" && (n(), e.preventDefault());
		}), this.unit.className = "olcad-grid-settings__unit", this.unit.setAttribute("data-tooltip", "Unit of the view projection");
		let r = document.createElement("label");
		r.className = "olcad-grid-settings__show olcad-icon-toggle", r.setAttribute("data-tooltip", "Draw the grid as dots while edit mode is on"), this.show.type = "checkbox", this.show.setAttribute("aria-label", "Show grid"), this.show.addEventListener("change", () => {
			this.boundEditor?.grid.setVisible(this.show.checked);
		}), r.append(this.show, h("eye"), S("Show")), this.content.append(this.toggle, t, this.spacing, this.unit, r);
	}
	render() {
		if (!this.controlsBuilt) return;
		let e = this.boundEditor, t = e?.grid.isEnabled() ?? !1;
		this.toggle.disabled = !e, this.toggle.setAttribute("aria-pressed", String(t)), this.toggleAttribute("grid", t), this.spacing.disabled = !e, e && document.activeElement !== this.spacing && (this.spacing.value = String(e.grid.getSpacing())), this.unit.textContent = e ? de(e.map.getView().getProjection().getUnits()) : "", this.show.disabled = !e, this.show.checked = e?.grid.isVisible() ?? !1, this.show.parentElement?.classList.toggle("olcad-icon-toggle--on", this.show.checked);
	}
	unbind() {
		for (let e of this.unsubscribe) e();
		this.unsubscribe = [];
	}
}, pe = {
	draw: "Click or type a point (x,y · @dx,dy · @d<a · d); Enter finishes, Escape cancels",
	select: "Click a feature, Shift+click to add, Ctrl / Cmd+drag for a box",
	rectangle: "First corner, then the opposite corner (click or type); the sides follow the straightedge",
	circle: "Centre and radius, centre and a point on the circle, or three points on the circle (click or type)",
	ellipse: "Centre and axes, both ends of one axis and the other half-axis, or two corners of a box (click or type)",
	"regular-polygon": "Number of sides, then the centre and one vertex of the regular polygon (click or type)",
	curve: "Start and end point, then adjust the handles at both ends; Enter inserts the curve",
	text: "Insert point, then the text height and the text (command line)",
	parallel: "Pick a line or polygon, a start point beside it, then follow it with the crosshair and click",
	modify: "Click an object, then a vertex to move it or a segment to insert one; Alt+click deletes",
	move: "Select the objects to move, then a base point and a second point",
	rotate: "Select the objects to rotate, then the centre and two points spanning the angle",
	offset: "Select a line or polygon, type the offset distance, then click the side of the copy"
}, me = "Switch on edit mode and choose a tool", M = "x,y · @dx,dy · @d<a · d", he = {
	text: "Type the text and press Enter",
	value: "Type a value and press Enter"
}, N = class extends E {
	boundEditor = null;
	unsubscribe = [];
	output = document.createElement("output");
	input = document.createElement("input");
	controlsBuilt = !1;
	awaiting = null;
	get defaultDock() {
		return "bottom";
	}
	get defaultHeading() {
		return "Command line";
	}
	get defaultCompact() {
		return !0;
	}
	get editor() {
		return this.boundEditor;
	}
	set editor(e) {
		this.unbind(), this.boundEditor = e, e && this.unsubscribe.push(e.on("toolchange", () => this.showPrompt()), e.on("toolprompt", () => this.showPrompt()), e.on("editmodechange", () => this.showPrompt()), e.on("input", (e) => this.showResult(e)), e.on("validationerror", ({ message: e }) => this.show(e, "error")), e.on("projectionchange", ({ to: e }) => this.show(`Projection: ${e}`, "info")), e.on("unitschange", ({ length: e, setting: t }) => this.show(`Length unit: ${e}${t === "auto" ? " (from the CRS)" : ""}`, "info")), e.on("featureinsert", ({ layer: t }) => {
			let n = e.layers.get(t).title;
			this.show(`Inserted into ${n}`, "info");
		}), e.on("destroy", () => {
			this.editor = null;
		})), this.render(), this.showPrompt();
	}
	get message() {
		return this.output.textContent ?? "";
	}
	show(e, t = "info") {
		this.output.textContent = e, this.output.dataset.kind = t;
	}
	connectedCallback() {
		super.connectedCallback(), this.classList.add("olcad-input-bar"), this.controlsBuilt || this.buildControls(), this.render();
	}
	disconnectedCallback() {
		this.unbind();
	}
	buildControls() {
		this.controlsBuilt = !0, this.output.className = "olcad-input-bar__output", this.output.setAttribute("role", "status"), this.output.setAttribute("aria-live", "polite"), this.input.type = "text", this.input.className = "olcad-input-bar__input", this.input.placeholder = M, this.input.autocomplete = "off", this.input.spellcheck = !1, this.input.setAttribute("aria-label", "Numeric input"), this.input.addEventListener("keydown", (e) => {
			let t = this.boundEditor;
			if (t) {
				if (e.key === "Enter") {
					e.preventDefault();
					let n = this.input.value.trim();
					if (n.length === 0) {
						t.tools.finish();
						return;
					}
					t.input(n).ok && (this.input.value = "");
				} else e.key === "Escape" && (e.preventDefault(), this.input.value = "", t.tools.cancel());
			}
		}), this.content.append(this.output, this.input);
	}
	render() {
		this.controlsBuilt && (this.input.disabled = !this.boundEditor);
	}
	showPrompt() {
		let e = this.boundEditor;
		if (!e) {
			this.show("", "prompt");
			return;
		}
		let t = e.tools.getActive(), n = t ? e.tools.getPrompt() : null;
		this.show(n ?? (t ? pe[t] ?? `Tool: ${t}` : me), "prompt"), this.applyInputRequest(t ? e.tools.getInputRequest?.() ?? null : null);
	}
	applyInputRequest(e) {
		if (!this.controlsBuilt) return;
		let t = this.awaiting;
		if (this.awaiting = e, this.classList.toggle("olcad-input-bar--awaiting", e !== null), e) {
			this.dataset.input = e, this.input.placeholder = he[e];
			let t = this.ownerDocument, n = t.activeElement, r = n !== null && n !== this.input && !this.contains(n) && (n.isContentEditable || [
				"INPUT",
				"TEXTAREA",
				"SELECT"
			].includes(n.tagName));
			!t.querySelector("dialog[open]") && !r && !this.input.disabled && (this.input.focus({ preventScroll: !0 }), this.input.select());
		} else delete this.dataset.input, this.input.placeholder = M, t && this.ownerDocument.activeElement === this.input && this.input.blur();
	}
	showResult(e) {
		if (!e.ok) {
			this.show(e.error, "error");
			return;
		}
		if ("kind" in e) {
			this.showPrompt();
			return;
		}
		let t = this.boundEditor;
		if ("length" in e) {
			let n = t ? t.units.formatLength(e.length) : `${e.length} m`;
			this.show(`${e.text} → ${n}`, "info");
			return;
		}
		if (!("coordinate" in e)) {
			this.show(`${e.text} → ${e.value}`, "info");
			return;
		}
		let n = t?.map.getView().getProjection().getUnits() === "degrees" ? 6 : 2, [r, i] = e.coordinate;
		this.show(`${e.text} → ${r.toFixed(n)}, ${i.toFixed(n)}`, "info");
	}
	unbind() {
		for (let e of this.unsubscribe) e();
		this.unsubscribe = [];
	}
}, P = {
	"EPSG:3857": "Web Mercator",
	"EPSG:4326": "WGS 84"
};
function F(e) {
	let t = new Map(Object.entries(P));
	for (let { code: n, title: r } of e.config.projections) r && t.set(n, r);
	return [.../* @__PURE__ */ new Set([
		e.config.view.projection,
		...Object.keys(P),
		...e.config.projections.map((e) => e.code)
	])].map((e) => {
		let n = t.get(e);
		return {
			code: e,
			label: n ? `${e} (${n})` : e
		};
	});
}
var I = class extends HTMLElement {
	boundEditor = null;
	unsubscribe = [];
	select = document.createElement("select");
	built = !1;
	get editor() {
		return this.boundEditor;
	}
	set editor(e) {
		this.unbind(), this.boundEditor = e, e && this.unsubscribe.push(e.on("projectionchange", () => this.render()), e.on("destroy", () => {
			this.editor = null;
		})), this.render();
	}
	connectedCallback() {
		this.classList.add("olcad-projection-select"), this.built || (this.built = !0, this.select.className = "olcad-projection-select__select", this.select.setAttribute("aria-label", "Projection"), this.select.addEventListener("change", () => {
			this.boundEditor?.setProjection(this.select.value);
		}), this.append(this.select)), this.render();
	}
	disconnectedCallback() {
		this.unbind();
	}
	render() {
		if (!this.built) return;
		let e = this.boundEditor;
		this.select.disabled = !e;
		let t = e ? F(e) : [], n = e?.getProjection() ?? "";
		if (Array.from(this.select.options).map((e) => e.value).join("\n") !== t.map((e) => e.code).join("\n") && this.select.replaceChildren(...t.map(({ code: e, label: t }) => {
			let n = document.createElement("option");
			return n.value = e, n.textContent = t, n;
		})), n && !t.some((e) => e.code === n)) {
			let e = document.createElement("option");
			e.value = n, e.textContent = n, this.select.append(e);
		}
		this.select.value = n;
	}
	unbind() {
		for (let e of this.unsubscribe) e();
		this.unsubscribe = [];
	}
}, L = class extends HTMLElement {
	boundEditor = null;
	unsubscribe = [];
	select = document.createElement("select");
	built = !1;
	get editor() {
		return this.boundEditor;
	}
	set editor(e) {
		this.unbind(), this.boundEditor = e, e && this.unsubscribe.push(e.on("unitschange", () => this.render()), e.on("projectionchange", () => this.render()), e.on("destroy", () => {
			this.editor = null;
		})), this.render();
	}
	connectedCallback() {
		this.classList.add("olcad-unit-select"), this.built || (this.built = !0, this.select.className = "olcad-unit-select__select", this.select.setAttribute("aria-label", "Length unit"), this.select.addEventListener("change", () => {
			this.boundEditor?.units.setLength(this.select.value);
		}), this.append(this.select)), this.render();
	}
	disconnectedCallback() {
		this.unbind();
	}
	render() {
		if (!this.built) return;
		let e = this.boundEditor;
		this.select.disabled = !e;
		let r = [["auto", `Auto (${e ? l(n(e.getProjection())).symbol : "m"})`], ...t.map((e) => [e.id, `${e.label} (${e.symbol})`])];
		this.select.replaceChildren(...r.map(([e, t]) => new Option(t, e))), this.select.value = e?.units.getLengthSetting() ?? "auto";
	}
	unbind() {
		for (let e of this.unsubscribe) e();
		this.unsubscribe = [];
	}
}, R = /* @__PURE__ */ new Map(), z = /* @__PURE__ */ new Set();
function B() {
	for (let e of z) e();
}
function ge(e) {
	return [...R.get(e) ?? []];
}
function _e(e) {
	return z.add(e), () => z.delete(e);
}
function V(e) {
	return e == null ? "" : typeof e == "boolean" ? e ? "yes" : "no" : String(e);
}
function ve(e, t) {
	if (!e) return null;
	switch (e.getType()) {
		case "LineString": return {
			kind: "length",
			value: u(t, e.getCoordinates()).total
		};
		case "MultiLineString": return {
			kind: "length",
			value: e.getCoordinates().reduce((e, n) => e + u(t, n).total, 0)
		};
		case "Polygon": return {
			kind: "area",
			value: s(t, e.getCoordinates()).area
		};
		case "MultiPolygon": return {
			kind: "area",
			value: e.getCoordinates().reduce((e, n) => e + s(t, n).area, 0)
		};
		default: return null;
	}
}
var ye = class extends HTMLElement {
	static get observedAttributes() {
		return ["layer"];
	}
	boundEditor = null;
	unsubscribe = [];
	changeSet = null;
	sort = null;
	filter = "";
	anchor = null;
	selecting = !1;
	built = !1;
	title_ = document.createElement("span");
	count = document.createElement("span");
	filterInput = document.createElement("input");
	closeButton = document.createElement("button");
	body = document.createElement("div");
	get layer() {
		return this.getAttribute("layer");
	}
	set layer(e) {
		e ? this.setAttribute("layer", e) : this.removeAttribute("layer");
	}
	get editor() {
		return this.boundEditor;
	}
	set editor(e) {
		if (this.unbind(), this.boundEditor = e, e) {
			R.has(e) || R.set(e, /* @__PURE__ */ new Set()), R.get(e).add(this), this.changeSet = e.changes.get();
			let t = () => this.render();
			this.unsubscribe.push(e.on("change", (e) => {
				this.changeSet = e, this.render();
			}), e.on("layerchange", t), e.on("layerload", t), e.on("projectionchange", t), e.on("unitschange", t), e.on("selectionchange", () => {
				this.render(), this.selecting || this.scrollToSelection();
			}), e.on("destroy", () => {
				this.editor = null;
			}));
		}
		this.render(), B();
	}
	show(e) {
		this.layer = e;
		let t = this.closest("olcad-panel");
		t?.isFlyout && !t.hasAttribute("open") && t.toggleFlyout?.(!0);
	}
	close() {
		this.layer = null;
	}
	connectedCallback() {
		this.classList.add("olcad-feature-table"), this.build(), this.render();
	}
	disconnectedCallback() {
		this.unbind();
	}
	attributeChangedCallback() {
		this.filter = "", this.filterInput.value = "", this.sort = null, this.anchor = null, this.render(), B();
	}
	unbind() {
		for (let e of this.unsubscribe) e();
		this.unsubscribe = [], this.boundEditor && (R.get(this.boundEditor)?.delete(this), R.get(this.boundEditor)?.size === 0 && R.delete(this.boundEditor), B());
	}
	build() {
		if (this.built) return;
		this.built = !0;
		let e = document.createElement("div");
		e.className = "olcad-feature-table__header", this.title_.className = "olcad-feature-table__title", this.count.className = "olcad-feature-table__count", this.filterInput.type = "search", this.filterInput.className = "olcad-feature-table__filter", this.filterInput.placeholder = "Filter", this.filterInput.setAttribute("aria-label", "Filter rows"), this.filterInput.addEventListener("input", () => {
			this.filter = this.filterInput.value, this.render();
		}), this.closeButton.type = "button", this.closeButton.className = "olcad-feature-table__close", this.closeButton.dataset.action = "close", x(this.closeButton, "close", "Close table"), this.closeButton.addEventListener("click", () => this.close()), e.append(this.title_, this.count, this.filterInput, this.closeButton), this.body.className = "olcad-feature-table__body", this.append(e, this.body);
	}
	setHidden(e) {
		let t = this.closest("olcad-panel");
		t?.setAttribute("no-toggle", ""), (t ?? this).hidden = e;
	}
	render() {
		if (!this.isConnected) return;
		this.build();
		let e = this.boundEditor, t = this.layer, n = e && t ? e.layers.list().find((e) => e.id === t) : void 0;
		if (!e || !t || !n) {
			this.body.replaceChildren(), this.setHidden(!0), e && t && !n && this.close();
			return;
		}
		this.setHidden(!1);
		let r = this.ownerDocument.activeElement, i = r && this.body.contains(r) ? {
			sort: r.dataset.sort,
			row: r.dataset.row
		} : null, a = this.columns(e, t), o = e.layers.getFeatures(t), s = this.visibleRows(o, a), c = this.rowStates(t), l = new Set(e.selection.get());
		this.title_.textContent = n.title, this.count.textContent = s.length === o.length ? `${o.length} object${o.length === 1 ? "" : "s"}` : `${s.length} of ${o.length}`;
		let u = document.createElement("table");
		u.className = "olcad-feature-table__table", u.setAttribute("aria-label", `Objects of ${n.title}`), u.setAttribute("aria-multiselectable", "true");
		let d = document.createElement("thead"), f = document.createElement("tr");
		for (let e of a) {
			let t = document.createElement("th");
			t.scope = "col";
			let n = this.sort?.key === e.key ? this.sort.direction : 0;
			t.setAttribute("aria-sort", n === 1 ? "ascending" : n === -1 ? "descending" : "none");
			let r = document.createElement("button");
			r.type = "button", r.className = "olcad-feature-table__sort", r.dataset.sort = e.key, r.textContent = e.label + (n === 1 ? " ▲" : n === -1 ? " ▼" : ""), r.addEventListener("click", () => this.cycleSort(e.key)), t.append(r), f.append(t);
		}
		d.append(f);
		let p = document.createElement("tbody");
		if (s.forEach((e, t) => {
			let n = document.createElement("tr");
			n.className = "olcad-feature-table__row", n.tabIndex = 0, n.dataset.row = String(e.getId() ?? `#${t}`), n.setAttribute("aria-selected", String(l.has(e)));
			let r = c.get(String(e.getId()));
			r && (n.dataset.state = r);
			for (let t of a) {
				let r = document.createElement("td");
				r.textContent = t.text(e), n.append(r);
			}
			n.addEventListener("click", (t) => this.select(e, s, t)), n.addEventListener("dblclick", () => this.zoomTo(e)), n.addEventListener("keydown", (t) => {
				t.key === "Enter" && (t.preventDefault(), t.stopPropagation(), t.shiftKey ? this.zoomTo(e) : this.select(e, s, t));
			}), p.append(n);
		}), u.append(d, p), s.length === 0) {
			let e = document.createElement("p");
			e.className = "olcad-feature-table__empty", e.textContent = o.length === 0 ? "No objects in this layer." : "No row matches the filter.", this.body.replaceChildren(u, e);
		} else this.body.replaceChildren(u);
		i && Array.from(this.body.querySelectorAll("[data-sort], [data-row]")).find((e) => i.sort ? e.dataset.sort === i.sort : e.dataset.row === i.row)?.focus();
	}
	columns(e, t) {
		let n = e.layers.getConfig(t), r = e.getProjection(), i = [{
			key: "#id",
			label: n.idProperty ?? "Id",
			text: (e) => V(e.getId()),
			sortValue: (e) => e.getId() ?? null
		}], a = /* @__PURE__ */ new Set();
		for (let e of n.schema?.fields ?? []) a.add(e.name), i.push({
			key: e.name,
			label: e.label ?? e.name,
			text: (t) => V(t.get(e.name)),
			sortValue: (t) => {
				let n = t.get(e.name);
				return n == null || n === "" ? null : typeof n == "number" ? n : V(n);
			}
		});
		if (n.text) {
			let { property: t, heightProperty: r } = n.text;
			a.has(t) || i.push({
				key: t,
				label: "Text",
				text: (e) => V(e.get(t)),
				sortValue: (e) => e.get(t) ?? null
			}), a.has(r) || i.push({
				key: r,
				label: "Height",
				text: (t) => {
					let n = t.get(r);
					return typeof n == "number" ? e.units.formatLength(n) : V(n);
				},
				sortValue: (e) => e.get(r) ?? null
			});
		}
		return i.push({
			key: "#geometry",
			label: "Geometry",
			text: (t) => {
				let n = t.getGeometry();
				if (!n) return "";
				let i = ve(n, r);
				if (!i) return n.getType();
				let a = i.kind === "length" ? e.units.formatLength(i.value) : e.units.formatArea(i.value);
				return `${n.getType()} · ${a}`;
			},
			sortValue: (e) => ve(e.getGeometry(), r)?.value ?? null
		}), i;
	}
	visibleRows(e, t) {
		let n = this.filter.trim().toLowerCase(), r = n ? e.filter((e) => t.some((t) => t.text(e).toLowerCase().includes(n))) : [...e], i = this.sort, a = i && t.find((e) => e.key === i.key);
		if (i && a) {
			let e = r.map((e) => ({
				feature: e,
				value: a.sortValue(e)
			}));
			e.sort((e, t) => e.value === null ? t.value === null ? 0 : 1 : t.value === null ? -1 : (typeof e.value == "number" && typeof t.value == "number" ? e.value - t.value : String(e.value).localeCompare(String(t.value), void 0, { numeric: !0 })) * i.direction), r = e.map((e) => e.feature);
		}
		return r;
	}
	rowStates(e) {
		let t = /* @__PURE__ */ new Map();
		for (let n of this.changeSet?.changes ?? []) n.layer === e && (n.op === "insert" ? t.set(String(n.tempId), "inserted") : n.op === "update" && t.set(String(n.id), "updated"));
		return t;
	}
	cycleSort(e) {
		let t = this.sort?.key === e ? this.sort.direction : 0;
		this.sort = t === 0 ? {
			key: e,
			direction: 1
		} : t === 1 ? {
			key: e,
			direction: -1
		} : null, this.render();
	}
	select(e, t, n) {
		let r = this.boundEditor;
		if (r) {
			this.selecting = !0;
			try {
				if (n.ctrlKey || n.metaKey) r.selection.get().includes(e) ? r.selection.remove(e) : r.selection.add(e), this.anchor = e;
				else if (n.shiftKey && this.anchor && t.includes(this.anchor)) {
					let n = t.indexOf(this.anchor), i = t.indexOf(e);
					r.selection.set(t.slice(Math.min(n, i), Math.max(n, i) + 1));
				} else r.selection.set([e]), this.anchor = e;
			} finally {
				this.selecting = !1;
			}
		}
	}
	zoomTo(e) {
		let t = e.getGeometry(), n = this.boundEditor;
		if (!t || !n) return;
		let r = n.map.getView();
		r.fit(t.getExtent(), {
			padding: [
				48,
				48,
				48,
				48
			],
			maxZoom: Math.max(r.getZoom() ?? 18, 18),
			duration: 250
		});
	}
	scrollToSelection() {
		this.body.querySelector("tr[aria-selected=\"true\"]")?.scrollIntoView?.({ block: "nearest" });
	}
}, be = class extends HTMLElement {
	boundEditor = null;
	unsubscribe = [];
	expanded = /* @__PURE__ */ new Set();
	layerEditor = null;
	get reveal() {
		return this.hasAttribute("reveal");
	}
	get editor() {
		return this.boundEditor;
	}
	set editor(e) {
		if (this.unbind(), this.boundEditor = e, e) {
			let t = () => this.render();
			this.unsubscribe.push(e.on("basemapchange", t), e.on("layerchange", t), e.on("layerload", t), e.on("change", t), e.on("activelayerchange", t), e.on("editmodechange", t), e.on("locallayerchange", t), _e(t), e.on("selectionchange", ({ features: t }) => {
				this.render(), this.reveal && t.some((t) => xe(e, t)) && this.revealPanel();
			}), e.on("destroy", () => {
				this.editor = null;
			}));
		}
		this.render();
	}
	connectedCallback() {
		this.classList.add("olcad-layer-list"), this.render();
	}
	disconnectedCallback() {
		this.unbind();
	}
	unbind() {
		for (let e of this.unsubscribe) e();
		this.unsubscribe = [];
	}
	revealPanel() {
		let e = this.closest("olcad-panel");
		e?.isFlyout && !e.hasAttribute("open") && e.toggleFlyout?.(!0);
	}
	render() {
		let e = this.ownerDocument.activeElement, t = e && this.contains(e) && e.dataset.action ? {
			action: e.dataset.action,
			layer: e.closest("[data-layer-id]")?.dataset.layerId
		} : null;
		for (let e of Array.from(this.children)) e !== this.layerEditor && e.remove();
		let n = this.boundEditor;
		n && (this.renderBasemaps(n), this.renderLayers(n), t?.layer && Array.from(this.querySelectorAll("[data-layer-id]")).find((e) => e.dataset.layerId === t.layer)?.querySelector(`[data-action="${t.action}"]`)?.focus());
	}
	heading(e, t) {
		let n = document.createElement("div");
		return n.className = "olcad-layer-list__heading", n.id = `${this.sectionId()}-${t}`, n.textContent = e, n;
	}
	renderBasemaps(e) {
		let t = e.basemaps.list();
		if (t.length === 0) return;
		let n = this.heading("Basemaps", "basemaps");
		this.append(n);
		let r = document.createElement("div");
		r.className = "olcad-layer-list__group", r.setAttribute("role", "radiogroup"), r.setAttribute("aria-labelledby", n.id);
		for (let n of t) {
			let t = document.createElement("button");
			t.type = "button", t.className = "olcad-layer-list__item", t.setAttribute("role", "radio"), t.setAttribute("aria-checked", String(n.active)), t.dataset.basemapId = n.id, t.textContent = n.title, t.addEventListener("click", () => e.basemaps.setActive(n.id)), r.append(t);
		}
		this.append(r);
	}
	renderLayers(e) {
		let t = e.layers.list();
		for (let e of this.expanded) t.some((t) => t.id === e) || this.expanded.delete(e);
		let n = this.heading("Layers", "layers"), r = document.createElement("button");
		r.type = "button", r.className = "olcad-layer-list__new", r.dataset.action = "new-layer", x(r, "addLayer", "New layer", "Create a layer in this browser"), r.addEventListener("click", () => this.openLayerEditor(e, null));
		let i = document.createElement("div");
		if (i.className = "olcad-layer-list__heading-row", i.append(n, r), this.append(i), t.length === 0) return;
		let a = document.createElement("div");
		a.className = "olcad-layer-list__group", a.setAttribute("role", "group"), a.setAttribute("aria-labelledby", n.id);
		let o = e.selection.get().filter((t) => xe(e, t));
		for (let n of t) a.append(this.renderLayer(e, n, o));
		this.append(a);
	}
	renderLayer(e, t, n) {
		let r = document.createElement("div");
		r.className = "olcad-layer-list__layer", r.classList.toggle("olcad-layer-list__layer--active", t.active), r.classList.toggle("olcad-layer-list__layer--hidden", !t.visible), r.dataset.layerId = t.id;
		let i = (e, t) => {
			let n = document.createElement("button");
			return n.type = "button", n.className = `olcad-layer-list__${t}`, n.dataset.action = e, n;
		}, a = i("visible", "visible");
		x(a, t.visible ? "eye" : "eyeOff", `Visible: ${t.title}`, t.visible ? "Hide this layer" : "Show this layer"), a.setAttribute("aria-pressed", String(t.visible)), a.addEventListener("click", () => e.layers.setVisible(t.id, !t.visible));
		let o = document.createElement("span");
		o.className = "olcad-layer-list__title", o.textContent = t.title;
		let s = i("highlight", "highlight");
		x(s, "highlight", `Highlight ${t.title}`, t.highlighted ? "Stop highlighting the objects of this layer" : "Highlight all objects of this layer"), s.setAttribute("aria-pressed", String(t.highlighted)), s.addEventListener("click", () => e.layers.setHighlighted(t.id, !t.highlighted));
		let c = ge(e), l = c.filter((e) => e.layer === t.id), u = i("table", "table");
		x(u, "table", `Table of ${t.title}`, c.length === 0 ? "No table panel on this page" : l.length > 0 ? "Hide the table" : "Show the objects of this layer as a table"), u.setAttribute("aria-pressed", String(l.length > 0)), u.disabled = c.length === 0, u.addEventListener("click", () => {
			if (l.length > 0) for (let e of l) e.close();
			else c[0]?.show(t.id);
		});
		let d = [
			"insert",
			"update",
			"delete"
		].filter((e) => t.editable[e]), f = i("edit", "edit");
		x(f, "edit", `Edit ${t.title}`, d.length === 0 ? "Read-only layer" : t.active ? "Stop editing this layer" : e.isEditMode() ? "Edit this layer" : "Switch on edit mode and edit this layer"), f.setAttribute("aria-pressed", String(t.active)), f.disabled = d.length === 0 && !t.active, f.addEventListener("click", () => {
			t.active ? e.layers.setActive(null) : (e.isEditMode() || e.setEditMode(!0), e.layers.setActive(t.id));
		});
		let p = this.expanded.has(t.id), m = `${this.sectionId()}-details-${t.id}`, h = i("info", "info-toggle");
		x(h, "info", `Details of ${t.title}`, p ? "Hide details" : "Show details"), h.setAttribute("aria-expanded", String(p)), h.setAttribute("aria-controls", m), h.addEventListener("click", () => {
			this.expanded.has(t.id) ? this.expanded.delete(t.id) : this.expanded.add(t.id), this.render();
		});
		let g = document.createElement("dl");
		g.className = "olcad-layer-list__details", g.id = m, g.hidden = !p;
		let _ = (e, t, n) => {
			let r = document.createElement("div");
			r.className = "olcad-layer-list__detail", r.dataset.detail = e;
			let i = document.createElement("dt");
			i.textContent = t;
			let a = document.createElement("dd");
			a.textContent = n, r.append(i, a), g.append(r);
		};
		_("geometry", "Geometry", t.geometryType), _("editable", "Editing", d.length ? d.join(" ") : "read-only"), _("features", "Objects", String(t.featureCount)), _("snappable", "Snap target", t.snappable ? "yes" : "no"), _("projection", "Data projection", t.dataProjection), _("id", "Id", t.id), t.local && _("storage", "Storage", "this browser");
		let v = n.filter((n) => e.layers.draftTargets(n).includes(t.id)), y = null;
		v.length > 0 && (y = i("move-draft", "move-draft"), x(y, "moveToLayer", v.length === 1 ? `Move selected draft to ${t.title}` : `Move ${v.length} selected drafts to ${t.title}`, e.isEditMode() ? v.length === 1 ? "Move the selected draft into this layer" : `Move the ${v.length} selected drafts into this layer` : "Switch on edit mode to move drafts"), y.disabled = !e.isEditMode(), y.addEventListener("click", () => e.layers.moveDrafts(v, t.id)));
		let b = null;
		return t.local && (r.classList.add("olcad-layer-list__layer--local"), o.title = "Local layer, kept in this browser", b = i("settings", "settings"), x(b, "settings", `Settings of ${t.title}`, "Name, attributes or delete this local layer"), b.addEventListener("click", () => this.openLayerEditor(e, t.id))), r.append(a, o, s, u, f, ...y ? [y] : [], ...b ? [b] : [], h, g), r;
	}
	openLayerEditor(e, t) {
		this.layerEditor || (this.layerEditor = document.createElement("olcad-layer-editor"), this.prepend(this.layerEditor)), this.layerEditor.editor !== e && (this.layerEditor.editor = e), this.layerEditor.open(t);
	}
	sectionId() {
		return this.id ||= `olcad-layer-list-${Math.random().toString(36).slice(2, 8)}`, this.id;
	}
};
function xe(e, t) {
	let n = e.layers.getDraft();
	return n !== null && e.layers.layerOf(t) === n;
}
//#endregion
//#region src/ui/elements/OlcadLayerEditor.ts
var Se = [
	"string",
	"number",
	"integer",
	"boolean",
	"enum",
	"date"
], Ce = {
	Point: "Point",
	LineString: "Line",
	Polygon: "Polygon",
	MultiPoint: "Multi-point",
	MultiLineString: "Multi-line",
	MultiPolygon: "Multi-polygon"
}, we = class extends HTMLElement {
	boundEditor = null;
	offDestroy = null;
	dialog = null;
	layerId = null;
	confirmingDelete = !1;
	get editor() {
		return this.boundEditor;
	}
	set editor(e) {
		this.offDestroy?.(), this.offDestroy = null, this.boundEditor = e, e ? this.offDestroy = e.on("destroy", () => this.editor = null) : this.close();
	}
	get isOpen() {
		return this.dialog?.open ?? !1;
	}
	connectedCallback() {
		this.classList.add("olcad-layer-editor");
	}
	open(e = null) {
		let t = this.boundEditor;
		if (!t) return;
		if (e !== null && !t.localLayers.has(e)) throw Error(`Unknown local layer "${e}"`);
		this.layerId = e, this.confirmingDelete = !1;
		let n = this.ensureDialog();
		this.render(n, t), n.open || (typeof n.showModal == "function" ? n.showModal() : n.setAttribute("open", "")), n.querySelector("[name=\"title\"]")?.focus();
	}
	close() {
		let e = this.dialog;
		e?.open && (typeof e.close == "function" ? e.close() : e.removeAttribute("open"));
	}
	ensureDialog() {
		return this.dialog || (this.dialog = document.createElement("dialog"), this.dialog.className = "olcad-layer-editor__dialog"), this.dialog.isConnected || this.append(this.dialog), this.dialog;
	}
	render(e, t) {
		let n = this.layerId ? t.localLayers.get(this.layerId) : null, r = document.createElement("form");
		r.className = "olcad-layer-editor__form", r.noValidate = !0;
		let i = document.createElement("h2");
		i.className = "olcad-layer-editor__heading", i.id = `olcad-layer-editor-${Math.random().toString(36).slice(2, 8)}`, i.textContent = n ? `Layer settings: ${n.title}` : "New layer", e.setAttribute("aria-labelledby", i.id);
		let o = document.createElement("input");
		o.name = "title", o.className = "olcad-layer-editor__control", o.required = !0, o.value = n?.title ?? "", o.placeholder = "Layer name";
		let s = document.createElement("select");
		s.name = "geometryType", s.className = "olcad-layer-editor__control";
		for (let e of a) {
			let t = document.createElement("option");
			t.value = e, t.textContent = Ce[e], s.append(t);
		}
		s.value = n?.geometryType ?? "Polygon", s.disabled = n !== null;
		let c = document.createElement("div");
		c.className = "olcad-layer-editor__basics", c.append(Te("Name", o), Te("Geometry", s));
		let l = document.createElement("fieldset");
		l.className = "olcad-layer-editor__fields";
		let u = document.createElement("legend");
		u.textContent = "Attributes";
		let d = document.createElement("div");
		d.className = "olcad-layer-editor__rows";
		let f = document.createElement("div");
		f.className = "olcad-layer-editor__row olcad-layer-editor__row--head", f.setAttribute("aria-hidden", "true");
		for (let e of [
			"Name",
			"Type",
			"Label",
			"Required",
			"Values (enum)",
			"Default",
			""
		]) f.append(Object.assign(document.createElement("span"), { textContent: e }));
		d.append(f);
		for (let e of n?.fields ?? []) d.append(Ee(e));
		let p = document.createElement("button");
		p.type = "button", p.className = "olcad-toolbar__button olcad-layer-editor__add", p.textContent = "Add attribute", p.addEventListener("click", () => {
			let e = Ee(null);
			d.append(e), e.querySelector("[data-part=\"name\"]")?.focus();
		}), l.append(u, d, p);
		let m = document.createElement("p");
		m.className = "olcad-layer-editor__error", m.setAttribute("role", "alert"), m.hidden = !0;
		let h = document.createElement("div");
		if (h.className = "olcad-layer-editor__actions", n) {
			let e = document.createElement("button");
			e.type = "button", e.className = "olcad-toolbar__button olcad-layer-editor__delete", e.dataset.action = "delete", e.textContent = "Delete layer", e.addEventListener("click", () => {
				this.confirmingDelete ? (t.localLayers.remove(n.id), this.close()) : (this.confirmingDelete = !0, e.textContent = `Delete ${n.featureCount} object${n.featureCount === 1 ? "" : "s"} and the layer?`, e.classList.add("olcad-layer-editor__delete--confirm"));
			}), h.append(e);
		}
		let g = document.createElement("span");
		g.className = "olcad-layer-editor__spacer";
		let _ = document.createElement("button");
		_.type = "button", _.className = "olcad-toolbar__button", _.dataset.action = "cancel", _.textContent = "Cancel", _.addEventListener("click", () => this.close());
		let v = document.createElement("button");
		v.type = "submit", v.className = "olcad-toolbar__button olcad-layer-editor__save", v.dataset.action = "save", v.textContent = n ? "Save" : "Create layer", h.append(g, _, v), r.append(i, c, l, m, h), r.addEventListener("submit", (e) => {
			e.preventDefault();
			try {
				let { fields: e, renamed: r } = De(d);
				n ? (t.localLayers.rename(n.id, o.value), t.localLayers.setFields(n.id, e, { renamed: r })) : t.localLayers.create({
					title: o.value,
					geometryType: s.value,
					fields: e
				}), this.close();
			} catch (e) {
				m.textContent = Oe(e), m.hidden = !1;
			}
		}), e.replaceChildren(r);
	}
};
function Te(e, t) {
	let n = document.createElement("label");
	n.className = "olcad-layer-editor__label";
	let r = document.createElement("span");
	return r.textContent = e, n.append(r, t), n;
}
function Ee(e) {
	let t = document.createElement("div");
	t.className = "olcad-layer-editor__row", e && (t.dataset.original = e.name);
	let n = (e, t, n = "") => {
		let r = document.createElement("input");
		return r.className = "olcad-layer-editor__control", r.dataset.part = e, r.setAttribute("aria-label", t), r.value = n, r;
	}, r = n("name", "Attribute name", e?.name ?? ""), i = document.createElement("select");
	i.className = "olcad-layer-editor__control", i.dataset.part = "type", i.setAttribute("aria-label", "Attribute type");
	for (let e of Se) i.append(new Option(e, e));
	i.value = e?.type ?? "string";
	let a = n("label", "Attribute label", e?.label ?? ""), o = document.createElement("input");
	o.type = "checkbox", o.className = "olcad-layer-editor__control", o.dataset.part = "required", o.setAttribute("aria-label", "Required"), o.checked = e?.required ?? !1;
	let s = n("values", "Enum values, comma-separated", (e?.values ?? []).join(", ")), c = n("default", "Default value", e?.default === void 0 || e.default === null ? "" : String(e.default)), l = () => {
		s.disabled = i.value !== "enum", c.disabled = i.value === "boolean";
	};
	i.addEventListener("change", l), l();
	let u = document.createElement("button");
	return u.type = "button", u.className = "olcad-layer-editor__remove", u.dataset.action = "remove-field", x(u, "delete", "Remove attribute"), u.addEventListener("click", () => t.remove()), t.append(r, i, a, o, s, c, u), t;
}
function De(e) {
	let t = [], n = {};
	return e.querySelectorAll(".olcad-layer-editor__row:not(.olcad-layer-editor__row--head)").forEach((e) => {
		let r = (t) => e.querySelector(`[data-part="${t}"]`), i = r("name").value.trim(), a = r("type").value;
		if (!i && !e.dataset.original) return;
		let o = {
			name: i,
			type: a
		}, s = r("label").value.trim();
		s && (o.label = s), r("required").checked && (o.required = !0), a === "enum" && (o.values = r("values").value.split(",").map((e) => e.trim()).filter(Boolean));
		let c = r("default").value.trim();
		if (c && a !== "boolean") {
			if (a === "number" || a === "integer") {
				let e = Number(c);
				if (!Number.isFinite(e) || a === "integer" && !Number.isInteger(e)) throw Error(`Attribute "${i}": the default must be ${a === "integer" ? "an integer" : "a number"}`);
				o.default = e;
			} else o.default = c;
		}
		e.dataset.original && e.dataset.original !== i && (n[e.dataset.original] = i), t.push(o);
	}), {
		fields: t,
		renamed: n
	};
}
function Oe(e) {
	if (!(e instanceof Error)) return String(e);
	let t = /^Invalid config at ([^:]+): (.*)$/.exec(e.message);
	if (!t) return e.message;
	let [, n, r] = t, i = /fields\[(\d+)\]\.(\w+)/.exec(n);
	return i ? `Attribute ${Number(i[1]) + 1}, ${i[2]}: ${r}` : n.endsWith(".title") ? `Name: ${r}` : `${n}: ${r}`;
}
//#endregion
//#region src/ui/elements/OlcadLayerStyleDialog.ts
var ke = class extends HTMLElement {
	boundEditor = null;
	unsubscribe = [];
	dialog = null;
	selected = null;
	applying = !1;
	dragged = null;
	list = document.createElement("ol");
	form = document.createElement("form");
	error = document.createElement("p");
	get editor() {
		return this.boundEditor;
	}
	set editor(e) {
		for (let e of this.unsubscribe) e();
		this.unsubscribe = [], this.boundEditor = e, e ? this.unsubscribe.push(e.on("layerchange", ({ type: e }) => {
			this.isOpen && (e === "style" && this.applying || this.render());
		}), e.on("destroy", () => {
			this.editor = null;
		})) : this.close();
	}
	get isOpen() {
		return this.dialog?.open ?? !1;
	}
	connectedCallback() {
		this.classList.add("olcad-layer-style-dialog");
	}
	open(e) {
		let t = this.boundEditor;
		if (!t) return;
		this.dialog || this.build();
		let n = t.layers.list().map((e) => e.id);
		this.selected = e && n.includes(e) ? e : n[n.length - 1] ?? null, this.dialog.isConnected || this.append(this.dialog), this.render(), this.dialog.open || (typeof this.dialog.showModal == "function" ? this.dialog.showModal() : this.dialog.setAttribute("open", ""));
	}
	close() {
		let e = this.dialog;
		e?.open && (typeof e.close == "function" ? e.close() : e.removeAttribute("open"));
	}
	build() {
		let e = document.createElement("dialog");
		e.className = "olcad-layer-style-dialog__dialog";
		let t = document.createElement("h2");
		t.className = "olcad-layer-style-dialog__heading", t.id = `olcad-layer-style-${Math.random().toString(36).slice(2, 8)}`, t.textContent = "Layer styles", e.setAttribute("aria-labelledby", t.id);
		let n = document.createElement("p");
		n.className = "olcad-layer-style-dialog__hint", n.textContent = "Top of the list is drawn on top. Drag a layer or use the arrows to reorder.", this.list.className = "olcad-layer-style-dialog__layers", this.list.setAttribute("aria-label", "Layers in drawing order, top first");
		let r = document.createElement("div");
		r.className = "olcad-layer-style-dialog__side", r.append(n, this.list), this.form.className = "olcad-layer-style-dialog__form", this.form.noValidate = !0, this.form.addEventListener("submit", (e) => e.preventDefault());
		let i = document.createElement("div");
		i.className = "olcad-layer-style-dialog__body", i.append(r, this.form), this.error.className = "olcad-layer-style-dialog__error", this.error.setAttribute("role", "alert"), this.error.hidden = !0;
		let a = document.createElement("div");
		a.className = "olcad-layer-style-dialog__actions";
		let o = (e, t, n) => {
			let r = document.createElement("button");
			return r.type = "button", r.className = "olcad-toolbar__button", r.dataset.action = t, r.textContent = e, r.addEventListener("click", n), r;
		}, s = document.createElement("span");
		s.className = "olcad-layer-style-dialog__spacer", a.append(o("Reset layer", "reset-layer", () => {
			this.selected && this.boundEditor?.layers.resetStyle(this.selected);
		}), o("Reset all", "reset-all", () => this.boundEditor?.layers.resetStyles()), s, o("Close", "close", () => this.close())), e.append(t, i, this.error, a), this.dialog = e;
	}
	render() {
		this.renderList(), this.renderForm();
	}
	renderList() {
		let e = this.boundEditor;
		if (!e) return;
		let t = this.ownerDocument.activeElement, n = t && this.list.contains(t) ? {
			id: t.closest("[data-layer-id]")?.dataset.layerId,
			action: t.dataset.action
		} : null, r = e.layers.list().slice().reverse();
		if (r.some((e) => e.id === this.selected) || (this.selected = r[0]?.id ?? null), this.list.replaceChildren(...r.map((t, n) => {
			let i = document.createElement("li");
			i.className = "olcad-layer-style-dialog__layer", i.dataset.layerId = t.id, i.draggable = !0, i.setAttribute("aria-selected", String(t.id === this.selected));
			let a = document.createElement("span");
			a.className = "olcad-layer-style-dialog__grip", a.setAttribute("aria-hidden", "true"), a.textContent = "⠿";
			let o = document.createElement("button");
			o.type = "button", o.className = "olcad-layer-style-dialog__name", o.dataset.action = "select", o.textContent = t.title, e.layers.isStyleCustomized(t.id) && o.classList.add("olcad-layer-style-dialog__name--custom"), o.addEventListener("click", () => {
				this.selected = t.id, this.render();
			});
			let s = document.createElement("button");
			s.type = "button", s.dataset.action = "up", x(s, "arrowUp", `Move ${t.title} up`, "Draw above the layer before it"), s.disabled = n === 0, s.addEventListener("click", () => this.move(t.id, 1));
			let c = document.createElement("button");
			return c.type = "button", c.dataset.action = "down", x(c, "arrowDown", `Move ${t.title} down`, "Draw below the layer after it"), c.disabled = n === r.length - 1, c.addEventListener("click", () => this.move(t.id, -1)), i.addEventListener("dragstart", (e) => {
				this.dragged = t.id, e.dataTransfer?.setData("text/plain", t.id), i.classList.add("olcad-layer-style-dialog__layer--dragging");
			}), i.addEventListener("dragend", () => {
				this.dragged = null, i.classList.remove("olcad-layer-style-dialog__layer--dragging");
			}), i.addEventListener("dragover", (e) => {
				this.dragged && this.dragged !== t.id && e.preventDefault();
			}), i.addEventListener("drop", (e) => {
				e.preventDefault(), this.dragged && this.dropAbove(this.dragged, t.id);
			}), i.append(a, o, s, c), i;
		})), n?.id) {
			let e = Array.from(this.list.querySelectorAll("[data-layer-id]")).find((e) => e.dataset.layerId === n.id), t = e?.querySelector(`[data-action="${n.action}"]`);
			(t && !t.disabled ? t : e?.querySelector("[data-action=\"select\"]"))?.focus();
		}
	}
	move(e, t) {
		let n = this.boundEditor;
		if (!n) return;
		let r = n.layers.list().map((e) => e.id);
		n.layers.moveLayer(e, r.indexOf(e) + t);
	}
	dropAbove(e, t) {
		let n = this.boundEditor;
		if (!n) return;
		let r = n.layers.list().map((e) => e.id).filter((t) => t !== e);
		n.layers.moveLayer(e, r.indexOf(t) + 1);
	}
	renderForm() {
		let e = this.boundEditor, t = this.selected;
		if (this.error.hidden = !0, !e || !t) {
			this.form.replaceChildren();
			return;
		}
		let n = e.layers.get(t), r = e.layers.getConfig(t), i = e.layers.getStyle(t), a = d(n.geometryType), o = [], s = document.createElement("h3");
		if (s.className = "olcad-layer-style-dialog__title", s.textContent = n.title, o.push(s), e.layers.hasExpressionStyle(t) && !e.layers.isStyleCustomized(t)) {
			let e = document.createElement("p");
			e.className = "olcad-layer-style-dialog__note", e.textContent = "This layer has a computed style; a change here replaces it with a simple style.", o.push(e);
		}
		let c = () => this.apply(t);
		a.stroke && i.stroke && o.push(H("Line", [
			U("Colour", G("stroke-color", i.stroke.color, c)),
			U("Width", K("stroke-width", i.stroke.width, 0, 50, .5, c)),
			U("Pattern", Ne("stroke-dash", i.stroke.dash, [
				["solid", "Solid"],
				["dashed", "Dashed"],
				["dotted", "Dotted"]
			], c))
		])), a.fill && i.fill && o.push(H("Fill", [U("Colour", G("fill-color", i.fill.color, c)), U("Opacity", je("fill-opacity", i.fill.opacity, c))])), a.point && i.point && o.push(H("Points", [
			U("Radius", K("point-radius", i.point.radius, 0, 100, .5, c)),
			U("Fill", G("point-fill", i.point.fill, c)),
			U("Outline", G("point-stroke", i.point.strokeColor, c)),
			U("Outline width", K("point-stroke-width", i.point.strokeWidth, 0, 50, .5, c))
		])), i.text && o.push(H("Texts", [U("Colour", G("text-color", i.text.color, c)), U("Halo", G("text-halo", i.text.halo, c))]));
		let l = i.label ?? null, u = r.schema?.fields.map((e) => e.name) ?? [], f = u.length ? Ne("label-field", l?.field ?? "", [["", "None"], ...u.map((e) => [e, e])], c) : Me("label-field", l?.field ?? "", "Attribute name, empty for none", c);
		o.push(H("Label", [
			U("Attribute", f),
			U("Size", K("label-size", l?.size ?? 12, 4, 96, 1, c)),
			U("Colour", G("label-color", l?.color ?? "#111827", c)),
			U("Halo", G("label-halo", l?.halo ?? "#ffffff", c))
		])), o.push(H("Layer", [
			U("Opacity", je("opacity", i.opacity, c)),
			U("From zoom", Ae("min-zoom", i.minZoom, c)),
			U("To zoom", Ae("max-zoom", i.maxZoom, c))
		])), this.form.replaceChildren(...o);
	}
	apply(e) {
		let t = this.boundEditor;
		if (!t) return;
		let n = (e) => this.form.querySelector(`[name="${e}"]`)?.value, r = (e) => Number(n(e)), i = t.layers.getStyle(e), a = { opacity: r("opacity") };
		n("stroke-color") !== void 0 && (a.stroke = {
			color: n("stroke-color"),
			width: r("stroke-width"),
			dash: n("stroke-dash")
		}), n("fill-color") !== void 0 && (a.fill = {
			color: n("fill-color"),
			opacity: r("fill-opacity")
		}), n("point-radius") !== void 0 && (a.point = {
			radius: r("point-radius"),
			fill: n("point-fill"),
			strokeColor: n("point-stroke"),
			strokeWidth: r("point-stroke-width")
		}), i.text && (a.text = {
			color: n("text-color"),
			halo: n("text-halo")
		});
		let o = n("label-field")?.trim();
		a.label = o ? {
			field: o,
			size: r("label-size"),
			color: n("label-color"),
			halo: n("label-halo")
		} : null;
		let s = n("min-zoom"), c = n("max-zoom");
		s && (a.minZoom = Number(s)), c && (a.maxZoom = Number(c)), this.applying = !0;
		try {
			t.layers.setStyle(e, a), this.error.hidden = !0, this.renderList();
		} catch (e) {
			this.error.textContent = e instanceof Error ? e.message : String(e), this.error.hidden = !1;
		} finally {
			this.applying = !1;
		}
	}
};
function H(e, t) {
	let n = document.createElement("fieldset");
	n.className = "olcad-layer-style-dialog__section";
	let r = document.createElement("legend");
	return r.textContent = e, n.append(r, ...t), n;
}
function U(e, t) {
	let n = document.createElement("label");
	n.className = "olcad-layer-style-dialog__field";
	let r = document.createElement("span");
	return r.textContent = e, n.append(r, t), n;
}
function W(e, t, n, r) {
	let i = document.createElement("input");
	return i.type = e, i.name = t, i.className = "olcad-layer-style-dialog__control", i.value = n, i.addEventListener(e === "text" || e === "number" ? "change" : "input", r), i;
}
function G(e, t, n) {
	return W("color", e, t, n);
}
function K(e, t, n, r, i, a) {
	let o = W("number", e, String(t), a);
	return o.min = String(n), o.max = String(r), o.step = String(i), o;
}
function Ae(e, t, n) {
	let r = K(e, 0, 0, 30, 1, n);
	return r.value = t === void 0 ? "" : String(t), r.placeholder = "any", r;
}
function je(e, t, n) {
	let r = W("range", e, String(t), n);
	return r.min = "0", r.max = "1", r.step = "0.05", r.value = String(t), r;
}
function Me(e, t, n, r) {
	let i = W("text", e, t, r);
	return i.placeholder = n, i;
}
function Ne(e, t, n, r) {
	let i = document.createElement("select");
	i.name = e, i.className = "olcad-layer-style-dialog__control";
	for (let [e, t] of n) i.append(new Option(t, e));
	return i.value = t, i.addEventListener("change", r), i;
}
//#endregion
//#region src/ui/layerStyleStorage.ts
function Pe(e, t = {}) {
	let n = t.key ?? "olcad-layer-styles", r = t.storage;
	if (!r) try {
		r = globalThis.localStorage;
	} catch {
		r = void 0;
	}
	let i = !1;
	try {
		let t = r?.getItem(n);
		t && (i = !0, e.layers.importStyles(JSON.parse(t)));
	} catch (e) {
		console.warn("ol-cad: stored layer styles ignored:", e);
	} finally {
		i = !1;
	}
	return e.on("layerchange", ({ type: t }) => {
		if (!(i || t !== "style" && t !== "order")) try {
			r?.setItem(n, JSON.stringify(e.layers.exportStyles()));
		} catch {}
	});
}
//#endregion
//#region src/ui/download.ts
function Fe(e, t, n, r = document) {
	let i = URL.createObjectURL(new Blob([e], { type: `${n};charset=utf-8` })), a = r.createElement("a");
	a.href = i, a.download = t, a.hidden = !0, r.body.append(a), a.click(), a.remove(), setTimeout(() => URL.revokeObjectURL(i), 0);
}
//#endregion
//#region src/ui/elements/OlcadExportDialog.ts
var Ie = "olcad-export", Le = class extends HTMLElement {
	boundEditor = null;
	offDestroy = null;
	dialog = null;
	format = "geojson";
	projection = "EPSG:4326";
	get editor() {
		return this.boundEditor;
	}
	set editor(e) {
		this.offDestroy?.(), this.offDestroy = null, this.boundEditor = e, e ? this.offDestroy = e.on("destroy", () => this.editor = null) : this.close();
	}
	get isOpen() {
		return this.dialog?.open ?? !1;
	}
	connectedCallback() {
		this.classList.add("olcad-export-dialog");
	}
	open() {
		let e = this.boundEditor;
		e && (this.dialog || (this.dialog = document.createElement("dialog"), this.dialog.className = "olcad-export-dialog__dialog"), this.dialog.isConnected || this.append(this.dialog), this.render(this.dialog, e), this.dialog.open || (typeof this.dialog.showModal == "function" ? this.dialog.showModal() : this.dialog.setAttribute("open", "")), this.dialog.querySelector("input[type=\"checkbox\"]:checked, input")?.focus());
	}
	close() {
		let e = this.dialog;
		e?.open && (typeof e.close == "function" ? e.close() : e.removeAttribute("open"));
	}
	render(e, t) {
		let n = document.createElement("form");
		n.className = "olcad-export-dialog__form", n.noValidate = !0;
		let i = document.createElement("h2");
		i.className = "olcad-export-dialog__heading", i.id = `olcad-export-dialog-${Math.random().toString(36).slice(2, 8)}`, i.textContent = "Export", e.setAttribute("aria-labelledby", i.id);
		let a = Re("Layers"), o = document.createElement("div");
		o.className = "olcad-export-dialog__layers";
		let s = [];
		for (let e of t.layers.list()) {
			let t = document.createElement("input");
			t.type = "checkbox", t.name = "layer", t.value = e.id, t.checked = e.featureCount > 0, s.push(t);
			let n = document.createElement("label");
			n.className = "olcad-export-dialog__layer";
			let r = document.createElement("span");
			r.className = "olcad-export-dialog__count", r.textContent = String(e.featureCount), n.append(t, ` ${e.title}`, r), o.append(n);
		}
		let c = document.createElement("div");
		c.className = "olcad-export-dialog__quick";
		let l = ze("All", "all"), u = ze("None", "none");
		c.append(l, u), a.append(c, o);
		let d = Re("Format"), f = document.createElement("div");
		f.className = "olcad-export-dialog__formats";
		let p = r.map((e) => {
			let t = document.createElement("input");
			t.type = "radio", t.name = "format", t.value = e.id, t.checked = e.id === this.format;
			let n = document.createElement("label");
			return n.append(t, ` ${e.label}`), f.append(n), t;
		}), m = document.createElement("select");
		m.name = "projection", m.className = "olcad-export-dialog__control";
		let h = [{
			code: "EPSG:4326",
			label: "EPSG:4326 (WGS 84)"
		}, ...F(t)], g = /* @__PURE__ */ new Set();
		for (let e of h) g.has(e.code) || (g.add(e.code), m.append(new Option(e.label, e.code)));
		m.value = g.has(this.projection) ? this.projection : "EPSG:4326";
		let _ = document.createElement("label");
		_.className = "olcad-export-dialog__crs", _.append("Coordinate system ", m);
		let v = document.createElement("p");
		v.className = "olcad-export-dialog__note", d.append(f, _, v);
		let y = document.createElement("p");
		y.className = "olcad-export-dialog__error", y.setAttribute("role", "alert"), y.hidden = !0;
		let b = document.createElement("div");
		b.className = "olcad-export-dialog__actions";
		let x = document.createElement("button");
		x.type = "button", x.className = "olcad-toolbar__button", x.dataset.action = "cancel", x.textContent = "Cancel", x.addEventListener("click", () => this.close());
		let S = document.createElement("button");
		S.type = "submit", S.className = "olcad-toolbar__button olcad-export-dialog__export", S.dataset.action = "export", S.textContent = "Export", b.append(x, S);
		let C = () => {
			let e = r.find((e) => e.id === this.format);
			m.disabled = e.crs !== void 0, e.crs ? m.value = e.crs : m.value = this.projection;
			let t = [];
			e.crs && t.push(`${e.label} is always written in ${e.crs}.`), e.skips && t.push(`${e.label} cannot hold ${e.skips}; they are skipped.`), v.textContent = t.join(" "), v.hidden = t.length === 0, S.disabled = !s.some((e) => e.checked);
		};
		for (let e of p) e.addEventListener("change", () => {
			this.format = e.value, C();
		});
		m.addEventListener("change", () => {
			this.projection = m.value;
		});
		for (let e of s) e.addEventListener("change", C);
		l.addEventListener("click", () => {
			for (let e of s) e.checked = !0;
			C();
		}), u.addEventListener("click", () => {
			for (let e of s) e.checked = !1;
			C();
		}), C(), n.addEventListener("submit", (e) => {
			e.preventDefault();
			let n = s.filter((e) => e.checked).map((e) => e.value), r;
			try {
				r = t.exportLayers(n, {
					format: this.format,
					...m.disabled ? {} : { projection: m.value }
				});
			} catch (e) {
				y.textContent = e instanceof Error ? e.message : String(e), y.hidden = !1;
				return;
			}
			Fe(r.content, r.filename, r.mimeType, this.ownerDocument), this.close(), this.dispatchEvent(new CustomEvent(Ie, {
				detail: r,
				bubbles: !0
			}));
		}), n.append(i, a, d, y, b), e.replaceChildren(n);
	}
};
function Re(e) {
	let t = document.createElement("fieldset");
	t.className = "olcad-export-dialog__fieldset";
	let n = document.createElement("legend");
	return n.textContent = e, t.append(n), t;
}
function ze(e, t) {
	let n = document.createElement("button");
	return n.type = "button", n.className = "olcad-toolbar__button", n.dataset.action = t, n.textContent = e, n;
}
//#endregion
//#region src/ui/elements/OlcadImportDialog.ts
var Be = "olcad-import", Ve = c.flatMap((e) => e.extensions.map((e) => `.${e}`)).join(","), He = {
	Point: "Points",
	MultiPoint: "Multi-points",
	LineString: "Lines",
	MultiLineString: "Multi-lines",
	Polygon: "Polygons",
	MultiPolygon: "Multi-polygons"
}, Ue = class extends HTMLElement {
	boundEditor = null;
	offDestroy = null;
	dialog = null;
	preview = null;
	filename = "";
	error = "";
	get editor() {
		return this.boundEditor;
	}
	set editor(e) {
		this.offDestroy?.(), this.offDestroy = null, this.boundEditor = e, e ? this.offDestroy = e.on("destroy", () => this.editor = null) : this.close();
	}
	get isOpen() {
		return this.dialog?.open ?? !1;
	}
	connectedCallback() {
		this.classList.add("olcad-import-dialog");
	}
	open() {
		this.boundEditor && (this.preview = null, this.filename = "", this.error = "", this.dialog || (this.dialog = document.createElement("dialog"), this.dialog.className = "olcad-import-dialog__dialog"), this.dialog.isConnected || this.append(this.dialog), this.render(), this.dialog.open || (typeof this.dialog.showModal == "function" ? this.dialog.showModal() : this.dialog.setAttribute("open", "")));
	}
	close() {
		let e = this.dialog;
		e?.open && (typeof e.close == "function" ? e.close() : e.removeAttribute("open"));
	}
	async load(e) {
		this.loadText(await e.text(), e.name);
	}
	loadText(e, t) {
		let n = this.boundEditor;
		if (n) {
			this.filename = t;
			try {
				this.preview = n.import.read(e, { filename: t }), this.error = this.preview.groups.length === 0 ? "The file holds no objects to import." : "";
			} catch (e) {
				this.preview = null, this.error = e instanceof Error ? e.message : String(e);
			}
			this.render();
		}
	}
	render() {
		let e = this.dialog, t = this.boundEditor;
		if (!e || !t) return;
		let n = document.createElement("form");
		n.className = "olcad-import-dialog__form", n.noValidate = !0;
		let r = document.createElement("h2");
		r.className = "olcad-import-dialog__heading", r.id = `olcad-import-dialog-${Math.random().toString(36).slice(2, 8)}`, r.textContent = "Import", e.setAttribute("aria-labelledby", r.id);
		let i = document.createElement("label");
		i.className = "olcad-import-dialog__drop";
		let a = document.createElement("input");
		a.type = "file", a.name = "file", a.accept = Ve, a.addEventListener("change", () => {
			let e = a.files?.[0];
			e && this.load(e);
		});
		let o = document.createElement("span");
		o.textContent = this.filename ? `File: ${this.filename}` : `Choose or drop a file: ${c.map((e) => e.label).join(", ")}`, i.append(o, a), i.addEventListener("dragover", (e) => {
			e.preventDefault(), i.classList.add("olcad-import-dialog__drop--over");
		}), i.addEventListener("dragleave", () => i.classList.remove("olcad-import-dialog__drop--over")), i.addEventListener("drop", (e) => {
			e.preventDefault(), i.classList.remove("olcad-import-dialog__drop--over");
			let t = e.dataTransfer?.files[0];
			t && this.load(t);
		});
		let s = document.createElement("p");
		s.className = "olcad-import-dialog__error", s.setAttribute("role", "alert"), s.textContent = this.error, s.hidden = !this.error, n.append(r, i);
		let l = [], u = this.preview;
		if (u && u.groups.length > 0) {
			let e = c.find((e) => e.id === u.format).label, r = document.createElement("p");
			r.className = "olcad-import-dialog__summary";
			let i = u.groups.reduce((e, t) => e + t.features.length, 0);
			r.textContent = `${e} in ${u.dataProjection}: ${i} object${i === 1 ? "" : "s"}` + (u.skipped ? `, ${u.skipped} without usable geometry` : "");
			let a = document.createElement("table");
			a.className = "olcad-import-dialog__groups";
			let o = a.createTHead().insertRow();
			for (let e of [
				"Layer name",
				"Geometry",
				"Objects",
				"Import into"
			]) {
				let t = document.createElement("th");
				t.textContent = e, o.append(t);
			}
			let s = a.createTBody();
			for (let e of u.groups) {
				let n = s.insertRow();
				n.dataset.group = e.key;
				let r = document.createElement("input");
				r.className = "olcad-import-dialog__control", r.value = e.name, r.setAttribute("aria-label", `Name of the new layer for ${e.name}`);
				let i = document.createElement("select");
				i.className = "olcad-import-dialog__control", i.setAttribute("aria-label", `Target of ${e.name}`), i.append(new Option("New local layer", "new"));
				for (let n of t.import.targetsFor(e)) i.append(new Option(`Into ${t.layers.get(n).title}`, `layer:${n}`));
				i.append(new Option("Skip", "skip")), i.addEventListener("change", () => {
					r.disabled = i.value !== "new", m();
				});
				let a = `${e.features.length}` + (e.invalid ? ` (+${e.invalid} invalid)` : "");
				n.insertCell().append(r), n.insertCell().textContent = He[e.geometryType] ?? e.geometryType, n.insertCell().textContent = a, n.insertCell().append(i), l.push({
					key: e.key,
					name: r,
					target: i
				});
			}
			n.append(r, a);
		}
		let d = document.createElement("div");
		d.className = "olcad-import-dialog__actions";
		let f = document.createElement("button");
		f.type = "button", f.className = "olcad-toolbar__button", f.dataset.action = "cancel", f.textContent = "Cancel", f.addEventListener("click", () => this.close());
		let p = document.createElement("button");
		p.type = "submit", p.className = "olcad-toolbar__button olcad-import-dialog__import", p.dataset.action = "import", p.textContent = "Import", d.append(f, p);
		let m = () => {
			p.disabled = !l.some((e) => e.target.value !== "skip");
		};
		m(), n.addEventListener("submit", (e) => {
			if (e.preventDefault(), !this.preview) return;
			let n = {};
			for (let { key: e, name: t, target: r } of l) n[e] = r.value === "new" ? {
				type: "new",
				title: t.value
			} : r.value === "skip" ? { type: "skip" } : {
				type: "layer",
				id: r.value.slice(6)
			};
			let r;
			try {
				r = t.import.apply(this.preview, n);
			} catch (e) {
				s.textContent = e instanceof Error ? e.message : String(e), s.hidden = !1;
				return;
			}
			this.close(), this.dispatchEvent(new CustomEvent(Be, {
				detail: r,
				bubbles: !0
			}));
		}), n.append(s, d), e.replaceChildren(n);
	}
};
//#endregion
//#region src/ui/panelMenu.ts
function We(e, t) {
	let n = e.ownerDocument, r = [], i = /* @__PURE__ */ new Map(), a = (e, r, i) => {
		let a = n.createElement("button");
		return a.type = "button", a.dataset.panelAction = r, a.textContent = e, a.addEventListener("click", () => t.setAllPanelsVisible(i)), a;
	}, o = () => {
		for (let e of r) e.remove();
		r.length = 0, i.clear(), r.push(n.createElement("hr"), a("Show all toolbars and panels", "show-all", !0), a("Hide all toolbars and panels", "hide-all", !1));
		let o = t.listPanels(), s = /* @__PURE__ */ new Map();
		for (let { heading: e } of o) s.set(e, (s.get(e) ?? 0) + 1);
		for (let e of o) {
			let a = e.heading;
			if (s.get(a) > 1) {
				let n = Array.from(t.querySelectorAll("[name]")).find((t) => t.getAttribute("name") === e.name);
				a += n?.localName === "olcad-toolbar" ? " (toolbar)" : " (panel)";
			}
			let o = n.createElement("label"), c = n.createElement("input");
			c.type = "checkbox", c.dataset.panel = e.name, c.checked = !e.hidden, c.addEventListener("change", () => t.setPanelVisible(e.name, c.checked)), i.set(e.name, c), o.append(c, ` ${a}`), r.push(o);
		}
		(e.popup ?? e).append(...r), e.refresh?.();
	}, s = () => {
		let n = t.listPanels();
		if (!(n.length === i.size && n.every((e) => i.has(e.name)))) o();
		else {
			for (let e of n) i.get(e.name).checked = !e.hidden;
			e.refresh?.();
		}
	};
	return o(), t.addEventListener(A, s), () => {
		t.removeEventListener(A, s);
		for (let e of r) e.remove();
		r.length = 0, i.clear();
	};
}
//#endregion
//#region src/ui/localLayerStorage.ts
var q = "layers";
function Ge(e) {
	return new Promise((t, n) => {
		e.onsuccess = () => t(e.result), e.onerror = () => n(e.error ?? /* @__PURE__ */ Error("IndexedDB request failed"));
	});
}
function Ke(e = {}) {
	let t = e.dbName ?? "olcad-local-layers", n = e.key ?? "layers", r = null, i = () => {
		if (!r) {
			if (typeof indexedDB > "u") return Promise.reject(/* @__PURE__ */ Error("IndexedDB is not available"));
			let e = indexedDB.open(t, 1);
			e.onupgradeneeded = () => {
				e.result.objectStoreNames.contains(q) || e.result.createObjectStore(q);
			}, r = Ge(e);
		}
		return r;
	};
	return {
		async load() {
			return Ge((await i()).transaction(q, "readonly").objectStore(q).get(n));
		},
		async save(e) {
			let t = (await i()).transaction(q, "readwrite");
			t.objectStore(q).put(e, n), await new Promise((e, n) => {
				t.oncomplete = () => e(), t.onerror = () => n(t.error ?? /* @__PURE__ */ Error("IndexedDB write failed"));
			});
		}
	};
}
function qe(e, t = Ke(), n = {}) {
	let r = n.delay ?? 300, i = n.onError ?? ((e) => console.error("ol-cad local layers:", e)), a = null, o = !1, s = !1, c = !1, l = [], u = async () => {
		if (a && clearTimeout(a), a = null, o && c) {
			c = !1;
			try {
				await t.save(e.localLayers.export());
			} catch (e) {
				i(e);
			}
		}
	}, d = () => {
		s || (c = !0, a && clearTimeout(a), a = setTimeout(() => void u(), r));
	}, f = t.load().then((t) => {
		t != null && e.localLayers.import(t);
	}).catch(i).finally(() => {
		o = !0, c && d();
	});
	l.push(e.on("locallayerchange", ({ type: e }) => {
		e !== "import" && d();
	}), e.on("change", () => {
		(e.localLayers.list().length > 0 || c) && d();
	}), e.on("destroy", () => void h()));
	let p = e.map.getTargetElement()?.ownerDocument, m = () => {
		p?.visibilityState === "hidden" && u();
	};
	p?.addEventListener("visibilitychange", m), l.push(() => p?.removeEventListener("visibilitychange", m));
	let h = async () => {
		if (!s) {
			s = !0;
			for (let e of l) e();
			await u();
		}
	};
	return {
		ready: f,
		flush: u,
		stop: h
	};
}
//#endregion
//#region src/ui/elements/OlcadTemplateList.ts
var Je = class extends HTMLElement {
	boundEditor = null;
	unsubscribe = [];
	renaming = null;
	get editor() {
		return this.boundEditor;
	}
	set editor(e) {
		if (this.unbind(), this.boundEditor = e, e) {
			let t = () => this.render();
			this.unsubscribe.push(e.on("templatechange", t), e.on("toolchange", t), e.on("editmodechange", t), e.on("activelayerchange", t), e.on("layerchange", t), e.on("destroy", () => {
				this.editor = null;
			}));
		}
		this.render();
	}
	connectedCallback() {
		this.classList.add("olcad-template-list"), this.render();
	}
	disconnectedCallback() {
		this.unbind();
	}
	unbind() {
		for (let e of this.unsubscribe) e();
		this.unsubscribe = [];
	}
	render() {
		let e = this.ownerDocument.activeElement, t = e && this.contains(e) && e.dataset.action ? {
			action: e.dataset.action,
			template: e.closest("[data-template-id]")?.dataset.templateId
		} : null;
		this.replaceChildren();
		let n = this.boundEditor;
		if (!n) return;
		let r = n.templates.list();
		this.renaming && !r.some((e) => e.id === this.renaming) && (this.renaming = null);
		let i = document.createElement("button");
		i.type = "button", i.className = "olcad-template-list__copy", i.dataset.action = "copy", x(i, "copy", "Copy to template", "Select objects, pick a base point and name the template"), i.setAttribute("aria-pressed", String(n.tools.getActive() === "template-copy")), i.addEventListener("click", () => {
			n.isEditMode() && n.tools.getActive() === "template-copy" ? n.tools.deactivate() : (n.isEditMode() || n.setEditMode(!0), n.tools.activate("template-copy"));
		});
		let a = document.createElement("div");
		a.className = "olcad-template-list__header";
		let o = document.createElement("span");
		if (o.className = "olcad-template-list__count", o.textContent = r.length === 1 ? "1 template" : `${r.length} templates`, a.append(i, o), this.append(a), r.length === 0) {
			let e = document.createElement("p");
			e.className = "olcad-template-list__empty", e.textContent = "No templates yet: select objects and use Copy to template.", this.append(e);
		} else {
			let e = document.createElement("ul");
			e.className = "olcad-template-list__list", e.setAttribute("aria-label", "Templates");
			for (let t of r) e.append(this.renderRow(n, t));
			this.append(e);
		}
		t && (t.template ? Array.from(this.querySelectorAll("[data-template-id]")).find((e) => e.dataset.templateId === t.template) : this)?.querySelector(`[data-action="${t.action}"]`)?.focus();
	}
	renderRow(e, t) {
		let n = document.createElement("li");
		n.className = "olcad-template-list__template", n.dataset.templateId = t.id;
		let r = (e) => {
			let t = document.createElement("button");
			return t.type = "button", t.className = `olcad-template-list__${e}`, t.dataset.action = e, t;
		}, i = document.createElement("div");
		if (i.className = "olcad-template-list__text", this.renaming === t.id) i.append(this.renameInput(e, t));
		else {
			let e = document.createElement("span");
			e.className = "olcad-template-list__name", e.textContent = t.name, e.title = t.name, i.append(e);
		}
		let a = document.createElement("span");
		a.className = "olcad-template-list__meta", a.textContent = `${t.featureCount} ${t.featureCount === 1 ? "object" : "objects"} · ${t.layers.join(", ")}`, i.append(a);
		let o = e.tools.getActiveOptions(), s = e.isEditMode() && e.tools.getActive() === "template-insert" && o.template === t.id, c = e.templates.canInsert(t.id), l = r("insert");
		x(l, "stamp", `Insert ${t.name}`, c ? s ? "Stop inserting" : "Insert copies: click the insertion points on the map" : "No layer can take these objects"), l.setAttribute("aria-pressed", String(s)), l.disabled = !c && !s, l.addEventListener("click", () => {
			s ? e.tools.deactivate() : (e.isEditMode() || e.setEditMode(!0), e.tools.activate("template-insert", { template: t.id }));
		});
		let u = r("rename");
		x(u, "rename", `Rename ${t.name}`), u.addEventListener("click", () => {
			this.renaming = t.id, this.render(), this.querySelector(".olcad-template-list__name-input")?.focus();
		});
		let d = r("remove");
		return x(d, "delete", `Remove ${t.name}`), d.addEventListener("click", () => {
			s && e.tools.deactivate(), e.templates.remove(t.id);
		}), n.append(i, l, u, d), n;
	}
	renameInput(e, t) {
		let n = document.createElement("input");
		n.type = "text", n.className = "olcad-template-list__name-input", n.value = t.name, n.setAttribute("aria-label", `Name of ${t.name}`);
		let r = !1, i = (i) => {
			if (r) return;
			r = !0, this.renaming = null;
			let a = n.value.trim();
			i && a && a !== t.name ? e.templates.rename(t.id, a) : this.render(), this.querySelector(`[data-template-id="${t.id}"] [data-action="rename"]`)?.focus();
		};
		return n.addEventListener("keydown", (e) => {
			e.key === "Enter" ? (e.preventDefault(), i(!0)) : e.key === "Escape" && (e.preventDefault(), e.stopPropagation(), i(!1));
		}), n.addEventListener("blur", () => i(!0)), n;
	}
}, Ye = {
	distance: "measureDistance",
	area: "measureArea",
	angle: "measureAngle"
};
function Xe(e, t) {
	let { values: n } = t, { formatLength: r, formatArea: a } = e.units;
	if (t.kind === "distance") {
		let e = n.segments?.length ?? 0;
		return `${r(n.length ?? 0)} · ${e} segment${e === 1 ? "" : "s"}`;
	}
	return t.kind === "area" ? `${a(n.area ?? 0)} · perimeter ${r(n.perimeter ?? 0)}` : `${i(n.angle ?? 0)} · reflex ${i(n.reflex ?? 0)}`;
}
var Ze = class extends HTMLElement {
	boundEditor = null;
	unsubscribe = [];
	get editor() {
		return this.boundEditor;
	}
	set editor(e) {
		if (this.unbind(), this.boundEditor = e, e) {
			let t = () => this.render();
			this.unsubscribe.push(e.on("measurechange", t), e.on("measure", t), e.on("unitschange", t), e.on("destroy", () => {
				this.editor = null;
			}));
		}
		this.render();
	}
	connectedCallback() {
		this.classList.add("olcad-measure-results"), this.render();
	}
	disconnectedCallback() {
		this.unbind();
	}
	unbind() {
		for (let e of this.unsubscribe) e();
		this.unsubscribe = [];
	}
	render() {
		let e = this.ownerDocument.activeElement, t = e && this.contains(e) && e.dataset.action ? {
			action: e.dataset.action,
			id: e.closest("[data-measurement-id]")?.dataset.measurementId
		} : null;
		this.replaceChildren();
		let n = this.boundEditor;
		if (!n) return;
		let r = n.measurements.list(), i = n.measurements.getLive(), a = document.createElement("div");
		a.className = "olcad-measure-results__header";
		let o = document.createElement("span");
		o.className = "olcad-measure-results__count", o.textContent = r.length === 1 ? "1 measurement" : `${r.length} measurements`;
		let s = document.createElement("button");
		if (s.type = "button", s.className = "olcad-toolbar__button olcad-measure-results__clear", s.dataset.action = "clear", s.textContent = "Clear all", s.disabled = r.length === 0, s.addEventListener("click", () => n.measurements.clear()), a.append(o, s), this.append(a), i && i.label && this.append(this.renderLive(i)), r.length === 0) {
			let e = document.createElement("p");
			e.className = "olcad-measure-results__empty", e.textContent = "No measurements. Pick a measure tool and click on the map.", this.append(e);
		} else {
			let e = document.createElement("ul");
			e.className = "olcad-measure-results__list";
			for (let t of r) e.append(this.renderRow(n, t));
			this.append(e);
		}
		t && (t.id ? this.querySelector(`[data-measurement-id="${t.id}"] [data-action="${t.action}"]`) : this.querySelector(`[data-action="${t.action}"]`))?.focus();
	}
	renderLive(e) {
		let t = document.createElement("div");
		return t.className = "olcad-measure-results__live", t.setAttribute("role", "status"), t.append(h(Ye[e.kind]), `${e.name} (measuring): ${e.label}`), t;
	}
	renderRow(e, t) {
		let n = document.createElement("li");
		n.className = "olcad-measure-results__item", n.dataset.measurementId = t.id, n.dataset.kind = t.kind;
		let r = document.createElement("button");
		r.type = "button", r.className = "olcad-measure-results__show", r.dataset.action = "show", r.title = "Zoom to this measurement";
		let i = document.createElement("span");
		i.className = "olcad-measure-results__name", i.textContent = t.name;
		let a = document.createElement("span");
		a.className = "olcad-measure-results__value", a.textContent = Xe(e, t);
		let s = document.createElement("span");
		s.className = "olcad-measure-results__text", s.append(i, a), r.append(h(Ye[t.kind]), s), r.addEventListener("click", () => {
			let n = e.map.getView();
			n.fit(o(t), {
				padding: [
					48,
					48,
					48,
					48
				],
				maxZoom: n.getZoom() === void 0 ? 18 : Math.max(n.getZoom(), 18),
				duration: 250
			});
		});
		let c = document.createElement("button");
		return c.type = "button", c.className = "olcad-measure-results__remove", c.dataset.action = "remove", x(c, "delete", `Remove ${t.name}`, "Remove this measurement"), c.addEventListener("click", () => e.measurements.remove(t.id)), n.append(r, c), n;
	}
}, Qe = "[role=\"menuitem\"], [role=\"menuitemcheckbox\"]";
function $e(e) {
	return e instanceof HTMLButtonElement ? e.disabled : e.querySelector("input")?.disabled ?? e.getAttribute("aria-disabled") === "true";
}
var J = class extends HTMLElement {
	static get observedAttributes() {
		return ["label"];
	}
	button = document.createElement("button");
	popup = document.createElement("div");
	built = !1;
	get label() {
		return this.getAttribute("label") ?? "Menu";
	}
	set label(e) {
		this.setAttribute("label", e);
	}
	get open() {
		return !this.popup.hidden;
	}
	attributeChangedCallback() {
		this.built && (this.button.textContent = this.label);
	}
	connectedCallback() {
		this.classList.add("olcad-menu"), this.built || this.build();
	}
	show(e = !1) {
		if (this.menubar()?.closeAll(this), this.popup.hidden = !1, this.button.setAttribute("aria-expanded", "true"), e) {
			let t = this.items();
			(e === "first" ? t[0] : t[t.length - 1])?.focus();
		}
	}
	hide(e = !1) {
		this.popup.hidden || (this.popup.hidden = !0, this.button.setAttribute("aria-expanded", "false"), e && this.button.focus());
	}
	items() {
		return Array.from(this.popup.querySelectorAll(Qe)).filter((e) => !$e(e));
	}
	menubar() {
		let e = this.closest("olcad-menubar");
		return e instanceof Y ? e : null;
	}
	build() {
		this.built = !0, this.button.type = "button", this.button.className = "olcad-menu__button", this.button.textContent = this.label, this.button.setAttribute("role", "menuitem"), this.button.setAttribute("aria-haspopup", "menu"), this.button.setAttribute("aria-expanded", "false"), this.popup.className = "olcad-menu__popup", this.popup.setAttribute("role", "menu"), this.popup.setAttribute("aria-label", this.label), this.popup.hidden = !0, this.popup.append(...Array.from(this.childNodes)), this.decorateItems(), this.append(this.button, this.popup), this.button.addEventListener("click", () => {
			this.open ? this.hide() : this.show();
		}), this.button.addEventListener("keydown", (e) => {
			e.key === "ArrowDown" || e.key === "Enter" || e.key === " " ? (e.preventDefault(), this.show("first")) : e.key === "ArrowUp" && (e.preventDefault(), this.show("last"));
		}), this.button.addEventListener("pointerenter", () => {
			let e = this.menubar();
			e && e.openMenu() && e.openMenu() !== this && this.show();
		}), this.popup.addEventListener("click", (e) => {
			let t = e.target.closest(Qe);
			t && this.popup.contains(t) && (t.getAttribute("role") === "menuitemcheckbox" ? this.syncChecked(t) : queueMicrotask(() => this.hide(!0)));
		}), this.popup.addEventListener("change", (e) => {
			let t = e.target.closest("[role=\"menuitemcheckbox\"]");
			t && this.syncChecked(t);
		}), this.popup.addEventListener("keydown", this.onPopupKeyDown);
	}
	refresh() {
		this.decorateItems();
	}
	decorateItems() {
		for (let e of Array.from(this.popup.children)) e instanceof HTMLButtonElement ? (e.setAttribute("role", "menuitem"), e.classList.add("olcad-menu__item"), e.tabIndex = -1) : e instanceof HTMLLabelElement && e.querySelector("input[type=checkbox]") ? (e.setAttribute("role", "menuitemcheckbox"), e.classList.add("olcad-menu__item", "olcad-menu__item--checkbox"), e.tabIndex = -1, this.syncChecked(e)) : e instanceof HTMLHRElement && (e.setAttribute("role", "separator"), e.classList.add("olcad-menu__separator"));
	}
	syncChecked(e) {
		let t = e.querySelector("input[type=checkbox]");
		t && e.setAttribute("aria-checked", String(t.checked));
	}
	onPopupKeyDown = (e) => {
		let t = this.items(), n = t.indexOf(document.activeElement), r = (e) => t[(e + t.length) % t.length]?.focus();
		switch (e.key) {
			case "ArrowDown":
				r(n + 1);
				break;
			case "ArrowUp":
				r(n - 1);
				break;
			case "Home":
				r(0);
				break;
			case "End":
				r(t.length - 1);
				break;
			case "Escape":
				this.hide(!0);
				break;
			case "Enter":
			case " ": {
				let e = document.activeElement;
				if (!e || !t.includes(e)) return;
				if (e.getAttribute("role") === "menuitemcheckbox") {
					let t = e.querySelector("input[type=checkbox]");
					t && (t.checked = !t.checked, t.dispatchEvent(new Event("change", { bubbles: !0 })));
				} else e.click();
				break;
			}
			case "Tab":
				this.hide();
				return;
			default: {
				if (e.key.length !== 1 || e.altKey || e.ctrlKey || e.metaKey) return;
				let r = e.key.toLowerCase(), i = [...t.slice(n + 1), ...t.slice(0, n + 1)].find((e) => (e.textContent ?? "").trim().toLowerCase().startsWith(r));
				if (!i) return;
				i.focus();
			}
		}
		e.preventDefault();
	};
}, Y = class extends HTMLElement {
	connectedCallback() {
		this.classList.add("olcad-menubar"), this.setAttribute("role", "menubar"), this.hasAttribute("aria-label") || this.setAttribute("aria-label", "Main menu"), this.addEventListener("keydown", this.onKeyDown), this.addEventListener("focusout", this.onFocusOut), this.ownerDocument.addEventListener("pointerdown", this.onDocumentPointerDown);
	}
	disconnectedCallback() {
		this.removeEventListener("keydown", this.onKeyDown), this.removeEventListener("focusout", this.onFocusOut), this.ownerDocument.removeEventListener("pointerdown", this.onDocumentPointerDown);
	}
	menus() {
		return Array.from(this.children).filter((e) => e instanceof J);
	}
	openMenu() {
		return this.menus().find((e) => e.open) ?? null;
	}
	closeAll(e) {
		for (let t of this.menus()) t !== e && t.hide();
	}
	onKeyDown = (e) => {
		if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
		let t = this.menus();
		if (t.length === 0) return;
		let n = e.target, r = t.findIndex((e) => e.contains(n));
		if (r === -1) return;
		let i = t[(r + (e.key === "ArrowRight" ? 1 : -1) + t.length) % t.length];
		t[r].open ? i.show("first") : i.button.focus(), e.preventDefault();
	};
	onFocusOut = (e) => {
		let t = e.relatedTarget;
		t && this.contains(t) || this.closeAll();
	};
	onDocumentPointerDown = (e) => {
		this.contains(e.target) || this.closeAll();
	};
}, et = [
	{
		mode: "vertex",
		label: "Points",
		title: "Snap to existing vertices and points",
		icon: "snapVertex"
	},
	{
		mode: "midpoint",
		label: "Midpoints",
		title: "Snap to the middle of segments",
		icon: "snapMidpoint"
	},
	{
		mode: "perpendicular",
		label: "Perpendicular",
		title: "Snap onto a line at a right angle from the last vertex of the drawing",
		icon: "snapPerpendicular"
	},
	{
		mode: "tangent",
		label: "Tangent",
		title: "Snap to the point where a line from the last vertex of the drawing touches a circle or curve",
		icon: "snapTangent"
	}
], X = class extends E {
	boundEditor = null;
	unsubscribe = [];
	toggle = document.createElement("button");
	tolerance = document.createElement("input");
	modeInputs = /* @__PURE__ */ new Map();
	controlsBuilt = !1;
	get defaultDock() {
		return "top";
	}
	get defaultHeading() {
		return "Snap";
	}
	get defaultCompact() {
		return !0;
	}
	get editor() {
		return this.boundEditor;
	}
	set editor(e) {
		this.unbind(), this.boundEditor = e, e && this.unsubscribe.push(e.on("snappingchange", () => this.render()), e.on("destroy", () => {
			this.editor = null;
		})), this.render();
	}
	connectedCallback() {
		super.connectedCallback(), this.classList.add("olcad-snap-settings"), this.controlsBuilt || this.buildControls(), this.render();
	}
	disconnectedCallback() {
		this.unbind();
	}
	buildControls() {
		this.controlsBuilt = !0, this.toggle.type = "button", this.toggle.className = "olcad-toolbar__button olcad-snap-settings__toggle", x(this.toggle, "snap", "Snap", "Snap the cursor to nearby geometry"), this.toggle.addEventListener("click", () => {
			let e = this.boundEditor;
			e && e.snapping.setEnabled(!e.snapping.isEnabled());
		});
		let e = `olcad-snap-${Math.random().toString(36).slice(2, 8)}`, t = document.createElement("label");
		t.className = "olcad-snap-settings__label", t.htmlFor = e, t.append(S("Radius")), this.tolerance.setAttribute("data-tooltip", "Snap radius in pixels"), this.tolerance.id = e, this.tolerance.type = "number", this.tolerance.min = "1", this.tolerance.step = "1", this.tolerance.className = "olcad-straightedge__input olcad-snap-settings__tolerance", this.tolerance.setAttribute("aria-label", "Snap radius in pixels");
		let n = () => {
			let e = Number(this.tolerance.value);
			this.boundEditor && Number.isFinite(e) && e > 0 && this.boundEditor.snapping.setTolerance(e), this.render();
		};
		this.tolerance.addEventListener("change", n), this.tolerance.addEventListener("keydown", (e) => {
			e.key === "Enter" && (n(), e.preventDefault());
		});
		let r = document.createElement("span");
		r.className = "olcad-snap-settings__unit", r.textContent = "px";
		let i = document.createElement("span");
		i.className = "olcad-snap-settings__modes", i.setAttribute("role", "group"), i.setAttribute("aria-label", "Snap modes");
		for (let { mode: e, label: t, title: n, icon: r } of et) {
			let a = document.createElement("label");
			a.className = "olcad-snap-settings__mode olcad-icon-toggle", a.dataset.mode = e, a.setAttribute("data-tooltip", n);
			let o = document.createElement("input");
			o.type = "checkbox", o.addEventListener("change", () => {
				let t = this.boundEditor;
				if (!t) return;
				let n = new Set(t.snapping.getModes());
				o.checked ? n.add(e) : n.delete(e), n.size === 0 ? o.checked = !0 : t.snapping.setModes(et.map((e) => e.mode).filter((e) => n.has(e)));
			}), this.modeInputs.set(e, o), o.setAttribute("aria-label", t), a.append(o, h(r), S(t)), i.append(a);
		}
		this.content.append(this.toggle, t, this.tolerance, r, i);
	}
	render() {
		if (!this.controlsBuilt) return;
		let e = this.boundEditor, t = e?.snapping.isEnabled() ?? !1;
		this.toggle.disabled = !e, this.toggle.setAttribute("aria-pressed", String(t)), this.toggleAttribute("snapping", t), this.tolerance.disabled = !e, e && document.activeElement !== this.tolerance && (this.tolerance.value = String(e.snapping.getTolerance()));
		let n = new Set(e?.snapping.getModes() ?? []);
		for (let [t, r] of this.modeInputs) r.disabled = !e, r.checked = n.has(t), r.parentElement?.classList.toggle("olcad-icon-toggle--on", r.checked);
	}
	unbind() {
		for (let e of this.unsubscribe) e();
		this.unsubscribe = [];
	}
}, tt = class extends E {
	boundEditor = null;
	unsubscribe = [];
	input = document.createElement("input");
	resetButton = document.createElement("button");
	pickButton = document.createElement("button");
	hint = document.createElement("span");
	controlsBuilt = !1;
	get defaultDock() {
		return "top";
	}
	get defaultHeading() {
		return "Straightedge";
	}
	get defaultCompact() {
		return !0;
	}
	get editor() {
		return this.boundEditor;
	}
	set editor(e) {
		if (this.unbind(), this.boundEditor = e, e) {
			let t = () => this.render();
			this.unsubscribe.push(e.on("straightedgechange", t), e.on("straightedgepick", t), e.on("editmodechange", t), e.on("destroy", () => {
				this.editor = null;
			}));
		}
		this.render();
	}
	connectedCallback() {
		super.connectedCallback(), this.classList.add("olcad-straightedge"), this.controlsBuilt || this.buildControls(), this.render();
	}
	disconnectedCallback() {
		this.unbind(), document.removeEventListener("keydown", this.onKeyDown);
	}
	buildControls() {
		this.controlsBuilt = !0;
		let e = `olcad-straightedge-${Math.random().toString(36).slice(2, 8)}`, t = document.createElement("label");
		t.className = "olcad-straightedge__label", t.htmlFor = e, t.setAttribute("data-tooltip", "Straightedge: angle of the X axis"), t.append(h("straightedge"), S("X axis angle")), this.input.id = e, this.input.type = "number", this.input.step = "any", this.input.min = "0", this.input.max = "360", this.input.className = "olcad-straightedge__input", this.input.setAttribute("aria-label", "X axis angle in degrees"), this.input.addEventListener("change", () => this.applyInput()), this.input.addEventListener("keydown", (e) => {
			e.key === "Enter" && (this.applyInput(), e.preventDefault());
		});
		let n = document.createElement("span");
		n.className = "olcad-straightedge__unit", n.textContent = "°", this.resetButton.type = "button", this.resetButton.className = "olcad-toolbar__button olcad-straightedge__reset", x(this.resetButton, "reset", "Reset", "Straightedge back to 0°"), this.resetButton.addEventListener("click", () => this.boundEditor?.straightedge.setAngle(0)), this.pickButton.type = "button", this.pickButton.className = "olcad-toolbar__button olcad-straightedge__pick", x(this.pickButton, "alignSegment", "Align to segment", "Click a line or polygon on the map to align the straightedge with it"), this.pickButton.addEventListener("click", () => {
			let e = this.boundEditor;
			e && (e.straightedge.isPicking() ? e.straightedge.cancelPick() : (e.isEditMode() || e.setEditMode(!0), e.straightedge.pick()));
		}), this.hint.className = "olcad-straightedge__hint", this.hint.setAttribute("aria-live", "polite"), this.hint.hidden = !0, this.content.append(t, this.input, n, this.resetButton, this.pickButton, this.hint);
	}
	applyInput() {
		let e = Number(this.input.value);
		!this.boundEditor || this.input.value === "" || !Number.isFinite(e) || this.boundEditor.straightedge.setAngle(e), this.render();
	}
	render() {
		if (!this.controlsBuilt) return;
		let e = this.boundEditor, t = e?.straightedge.isPicking() ?? !1;
		this.input.disabled = !e, this.resetButton.disabled = !e, this.pickButton.disabled = !e, this.pickButton.setAttribute("aria-pressed", String(t)), this.toggleAttribute("picking", t), this.hint.hidden = !t, this.hint.textContent = t ? "Click a line or polygon on the map (Esc cancels)" : "", e && document.activeElement !== this.input && (this.input.value = nt(e.straightedge.getAngle())), t ? document.addEventListener("keydown", this.onKeyDown) : document.removeEventListener("keydown", this.onKeyDown);
	}
	onKeyDown = (e) => {
		if (e.key !== "Escape") return;
		let t = this.boundEditor;
		t?.straightedge.isPicking() && (t.straightedge.cancelPick(), e.preventDefault());
	};
	unbind() {
		for (let e of this.unsubscribe) e();
		this.unsubscribe = [];
	}
};
function nt(e) {
	return String(Math.round(e * 100) / 100);
}
//#endregion
//#region src/ui/keyboard.ts
var rt = [
	"draw",
	"rectangle",
	"circle",
	"ellipse",
	"regular-polygon",
	"curve",
	"parallel",
	"text",
	"move",
	"modify",
	"rotate",
	"scale",
	"offset",
	"trim",
	"extend",
	"mirror",
	"template-copy",
	"template-insert",
	"measure-distance",
	"measure-area",
	"measure-angle"
];
function it(e, t = document) {
	let n = (t) => {
		let n = t;
		if (st(n.target) || ot(n.target)) return;
		let r = n.ctrlKey || n.metaKey, i = !0;
		if (r && n.key.toLowerCase() === "z") n.shiftKey ? e.redo() : e.undo();
		else if (r && n.key.toLowerCase() === "y") e.redo();
		else if (r) i = !1;
		else if (n.key === "Escape") e.tools.getActive() === null ? e.selection.clear() : e.tools.cancel();
		else if (n.key === "Enter") {
			if (at(n.target)) return;
			e.tools.finish();
		} else if (n.key === "Backspace") {
			let t = e.tools.getActive();
			t && rt.includes(t) ? e.tools.removeLastPoint() : e.deleteSelection();
		} else n.key === "Delete" ? e.tools.getActive() === "modify" && e.tools.removeLastPoint() || e.deleteSelection() : i = !1;
		i && n.preventDefault();
	};
	return t.addEventListener("keydown", n), () => t.removeEventListener("keydown", n);
}
function at(e) {
	if (!(e instanceof HTMLElement)) return !1;
	let t = e.tagName;
	return t === "BUTTON" || t === "A" || t === "SUMMARY" || e.hasAttribute("role");
}
function ot(e) {
	return e instanceof Element && e.closest("dialog[open]") !== null;
}
function st(e) {
	if (!(e instanceof HTMLElement)) return !1;
	if (e.isContentEditable) return !0;
	let t = e.tagName;
	return t === "INPUT" || t === "TEXTAREA" || t === "SELECT";
}
var Z = {
	select: {
		label: "Select",
		title: "Click, Shift+click toggles, Ctrl/Cmd+drag for a box",
		icon: "select"
	},
	"draw-point": {
		label: "Draw point",
		title: "Place points into the active layer, or into the draft layer when none is selected",
		icon: "drawPoint",
		tool: "draw",
		options: { type: "Point" }
	},
	"draw-line": {
		label: "Draw line",
		title: "Draw lines into the active layer, or into the draft layer when none is selected: click vertices, double-click or Enter to finish, Escape to abort",
		icon: "drawLine",
		tool: "draw",
		options: { type: "LineString" }
	},
	"draw-polygon": {
		label: "Draw polygon",
		title: "Draw polygons into the active layer, or into the draft layer when none is selected: click vertices, double-click or Enter to close, Escape to abort",
		icon: "drawPolygon",
		tool: "draw",
		options: { type: "Polygon" }
	},
	rectangle: {
		label: "Draw rectangle",
		title: "Draw a rectangle into the active layer, or into the draft layer when none is selected: first corner, then the opposite corner; the sides follow the straightedge",
		icon: "drawRectangle"
	},
	circle: {
		label: "Draw circle",
		title: "Draw a circle into the active layer, or into the draft layer when none is selected; the triangle opens the construction variants",
		icon: "drawCircle",
		variants: [
			{
				id: "centre-radius",
				label: "Circle: centre and radius",
				title: "Draw a circle: click the centre, then type the radius or click a point on the circle",
				icon: "drawCircle",
				options: { method: "centre-radius" }
			},
			{
				id: "centre-point",
				label: "Circle: centre and point",
				title: "Draw a circle: click the centre, then a point on the circle",
				icon: "drawCirclePoint",
				options: { method: "centre-point" }
			},
			{
				id: "three-point",
				label: "Circle: three points",
				title: "Draw a circle through three points on it",
				icon: "drawCircleThreePoints",
				options: { method: "three-point" }
			}
		]
	},
	ellipse: {
		label: "Draw ellipse",
		title: "Draw an ellipse into the active layer, or into the draft layer when none is selected; the triangle opens the construction variants",
		icon: "drawEllipse",
		variants: [
			{
				id: "centre-axis",
				label: "Ellipse: centre and axes",
				title: "Draw an ellipse: click the centre and the end of one axis, then type the other half-axis or click a point at that distance",
				icon: "drawEllipse",
				options: { method: "centre-axis" }
			},
			{
				id: "axis",
				label: "Ellipse: axis ends and half-axis",
				title: "Draw an ellipse: click both ends of one axis, then type the other half-axis or click a point at that distance",
				icon: "drawEllipseAxis",
				options: { method: "axis" }
			},
			{
				id: "box",
				label: "Ellipse: box corners",
				title: "Draw an ellipse filling a box: click two opposite corners; the box follows the straightedge",
				icon: "drawEllipseBox",
				options: { method: "box" }
			}
		]
	},
	"regular-polygon": {
		label: "Draw regular polygon",
		title: "Draw a regular polygon into the active layer, or into the draft layer when none is selected: type the number of sides, click the centre, then one vertex",
		icon: "drawRegularPolygon"
	},
	curve: {
		label: "Draw curve",
		title: "Draw a curve into the active layer, or into the draft layer when none is selected: start, end, then adjust the handles; Enter inserts",
		icon: "drawCurve"
	},
	parallel: {
		label: "Draw parallel",
		title: "Draw a line parallel to an object: click the object, a start point beside it, then follow it with the crosshair and click",
		icon: "drawParallel"
	},
	text: {
		label: "Draw text",
		title: "Place a text into the active text layer, or the draft layer: click the insert point, type the height, then the text; it follows the straightedge angle",
		icon: "drawText"
	},
	modify: {
		label: "Vertices",
		title: "Edit vertices: click an object, click a vertex to move it, click a segment to add one, Alt+click to delete",
		icon: "vertices"
	},
	move: {
		label: "Move",
		title: "Move objects: select them, pick a base point, then a second point or a typed distance",
		icon: "move"
	},
	rotate: {
		label: "Rotate",
		title: "Rotate objects: select them, pick the centre, then two points that span the angle",
		icon: "rotate"
	},
	scale: {
		label: "Scale",
		title: "Scale objects: select them, pick a base point, then type a factor or click a reference and a target point",
		icon: "scale"
	},
	offset: {
		label: "Offset",
		title: "Offset an object: click a line or polygon, type the distance, then click the side the copy goes to",
		icon: "offset"
	},
	trim: {
		label: "Trim",
		title: "Trim lines: select the boundary, then click the parts of lines to remove",
		icon: "trim"
	},
	extend: {
		label: "Extend",
		title: "Extend lines: select the boundary, then click lines near the end to extend to it",
		icon: "extend"
	},
	mirror: {
		label: "Mirror",
		title: "Mirror objects: select them, draw the mirror line, then Enter (or y for a copy)",
		icon: "mirror"
	},
	"template-copy": {
		label: "Copy to template",
		title: "Copy objects to a named template: select them, pick the base point, type a name; insert copies from the Templates panel",
		icon: "copy"
	},
	"measure-distance": {
		label: "Measure distance",
		title: "Measure a distance: click points along the way, Enter finishes; Alt+click a line or polygon to measure it (works without edit mode)",
		icon: "measureDistance"
	},
	"measure-area": {
		label: "Measure area",
		title: "Measure an area: click its corners, Enter finishes; Alt+click a polygon to measure it (works without edit mode)",
		icon: "measureArea"
	},
	"measure-angle": {
		label: "Measure angle",
		title: "Measure an angle: click a first point, the vertex, then a second point (works without edit mode)",
		icon: "measureAngle"
	},
	"measure-clear": {
		label: "Clear measurements",
		title: "Remove all measurements from the map",
		icon: "measureClear"
	},
	delete: {
		label: "Delete",
		title: "Delete the selected features (Delete key)",
		icon: "delete"
	}
};
function ct(e) {
	let t = (e ?? Object.keys(Z).join(" ")).split(/\s+/).flatMap((e) => e === "draw" ? [
		"draw-point",
		"draw-line",
		"draw-polygon"
	] : [e]);
	return t.filter((e, n) => e in Z && t.indexOf(e) === n);
}
var lt = [
	"edit",
	"layer",
	"history"
];
function ut(e) {
	if (e === null) return [...lt];
	let t = e.split(/\s+/);
	return lt.filter((e) => t.includes(e));
}
var Q = /* @__PURE__ */ new WeakMap();
function dt(e) {
	let t = Q.get(e) ?? {
		count: 0,
		unbind: it(e)
	};
	t.count += 1, Q.set(e, t);
	let n = !1;
	return () => {
		n || (n = !0, --t.count, t.count === 0 && (t.unbind(), Q.delete(e)));
	};
}
function $(e, t) {
	return Object.entries(e ?? {}).every(([e, n]) => t[e] === n);
}
function ft() {
	let e = document.createElement("span");
	return e.className = "olcad-toolbar__separator", e.setAttribute("role", "separator"), e.setAttribute("aria-orientation", "vertical"), e;
}
var pt = class extends E {
	boundEditor = null;
	unsubscribe = [];
	unbindKeyboard = null;
	editToggle = document.createElement("button");
	activeLayer = document.createElement("span");
	undoButton = document.createElement("button");
	redoButton = document.createElement("button");
	toolButtons = /* @__PURE__ */ new Map();
	flyouts = /* @__PURE__ */ new Map();
	openFlyoutId = null;
	rendered = !1;
	get defaultDock() {
		return "top";
	}
	get defaultHeading() {
		return "Tools";
	}
	get defaultCompact() {
		return !0;
	}
	get editor() {
		return this.boundEditor;
	}
	set editor(e) {
		this.unbind(), this.boundEditor = e, e && (this.unsubscribe.push(e.on("editmodechange", () => this.renderEditMode()), e.on("activelayerchange", () => this.renderActiveLayer()), e.on("layerchange", () => this.renderActiveLayer()), e.on("historychange", () => this.renderHistory()), e.on("toolchange", () => this.renderTools()), e.on("selectionchange", () => this.renderTools()), e.on("measurechange", () => this.renderTools()), e.on("destroy", () => {
			this.editor = null;
		})), this.hasAttribute("no-keyboard") || (this.unbindKeyboard = dt(e))), this.renderEditMode(), this.renderActiveLayer(), this.renderHistory(), this.renderTools();
	}
	connectedCallback() {
		if (super.connectedCallback(), this.classList.add("olcad-toolbar"), this.content.setAttribute("role", "toolbar"), this.content.setAttribute("aria-label", this.heading), !this.rendered) {
			this.rendered = !0, this.editToggle.type = "button", this.editToggle.className = "olcad-toolbar__button olcad-toolbar__edit-toggle", x(this.editToggle, "edit", "Edit mode", "Switch edit mode on or off"), this.editToggle.addEventListener("click", () => {
				let e = this.boundEditor;
				e && e.setEditMode(!e.isEditMode());
			}), this.activeLayer.className = "olcad-toolbar__active-layer", this.activeLayer.setAttribute("aria-live", "polite"), this.undoButton.type = "button", this.undoButton.className = "olcad-toolbar__button olcad-toolbar__undo", x(this.undoButton, "undo", "Undo", "Undo (Ctrl+Z)"), this.undoButton.addEventListener("click", () => this.boundEditor?.undo()), this.redoButton.type = "button", this.redoButton.className = "olcad-toolbar__button olcad-toolbar__redo", x(this.redoButton, "redo", "Redo", "Redo (Shift+Ctrl+Z)"), this.redoButton.addEventListener("click", () => this.boundEditor?.redo());
			let e = [];
			for (let t of ct(this.getAttribute("tools"))) {
				let n = document.createElement("button");
				n.type = "button", n.className = `olcad-toolbar__button olcad-toolbar__tool olcad-toolbar__tool--${t}`;
				let r = Z[t], { icon: i, label: a, title: o, tool: s, options: c, variants: l } = r;
				n.dataset.tool = s ?? t, typeof c?.type == "string" && (n.dataset.type = c.type), x(n, i, a, o), n.addEventListener("click", () => this.onToolClick(t)), this.toolButtons.set(t, n), e.push(l?.length ? this.createFlyout(t, r, n, l) : n);
			}
			let t = ut(this.getAttribute("controls")), n = [], r = [];
			t.includes("edit") && r.push(this.editToggle), t.includes("layer") && r.push(this.activeLayer), r.length && n.push(r), t.includes("history") && n.push([this.undoButton, this.redoButton]), e.length && n.push(e), this.content.prepend(...n.flatMap((e, t) => t === 0 ? e : [ft(), ...e])), this.content.addEventListener("keydown", this.onToolbarKeyDown);
		}
		this.renderEditMode(), this.renderActiveLayer(), this.renderHistory(), this.renderTools();
	}
	currentVariant(e) {
		return this.flyouts.get(e)?.current;
	}
	isFlyoutOpen(e) {
		return this.openFlyoutId === e;
	}
	buttonOptions(e) {
		return this.flyouts.get(e)?.current.options ?? Z[e].options;
	}
	onToolClick(e) {
		let t = this.flyouts.get(e);
		if (t?.suppressClick) {
			t.suppressClick = !1;
			return;
		}
		let n = this.boundEditor;
		if (!n) return;
		if (e === "delete") {
			n.deleteSelection();
			return;
		}
		if (e === "measure-clear") {
			n.measurements.clear();
			return;
		}
		let r = Z[e].tool ?? e;
		this.isPressed(n, e) ? n.tools.deactivate() : n.tools.activate(r, this.buttonOptions(e));
	}
	isPressed(e, t) {
		let n = Z[t].tool ?? t;
		return e.tools.getActive() === n ? this.flyouts.has(t) ? !0 : $(Z[t].options, e.tools.getActiveOptions()) : !1;
	}
	renderTools() {
		let e = this.boundEditor;
		for (let [t, n] of this.toolButtons) {
			if (t === "delete") {
				n.disabled = !(e?.isEditMode() && e.selection.get().length > 0);
				continue;
			}
			if (t === "measure-clear") {
				n.disabled = !e || e.measurements.list().length === 0;
				continue;
			}
			let r = Z[t].tool ?? t, i = e ? this.isPressed(e, t) : !1;
			i && e && this.mirrorVariant(t, e.tools.getActiveOptions()), n.disabled = !e?.tools.canActivate(r, this.buttonOptions(t)) && !i, n.setAttribute("aria-pressed", String(i));
		}
	}
	mirrorVariant(e, t) {
		let n = this.flyouts.get(e);
		if (!n) return;
		let r = n.variants.find((e) => $(e.options, t));
		r && r !== n.current && this.setVariant(e, r);
	}
	createFlyout(e, t, n, r) {
		let i = document.createElement("span");
		i.className = `olcad-toolbar__flyout olcad-toolbar__flyout--${e}`;
		let a = document.createElement("button");
		a.type = "button", a.className = "olcad-toolbar__flyout-toggle", a.tabIndex = -1, a.setAttribute("aria-haspopup", "menu"), a.setAttribute("aria-expanded", "false"), a.setAttribute("aria-label", `${t.label} variants`);
		let o = document.createElement("div");
		o.className = "olcad-toolbar__flyout-menu", o.setAttribute("role", "menu"), o.setAttribute("aria-label", `${t.label} variants`), o.hidden = !0;
		let s = r.map((t) => {
			let n = document.createElement("button");
			n.type = "button", n.className = "olcad-toolbar__flyout-item", n.tabIndex = -1, n.setAttribute("role", "menuitemradio"), n.dataset.variant = t.id;
			let r = document.createElement("span");
			return r.className = "olcad-toolbar__flyout-label", r.textContent = t.label, n.append(h(t.icon, document), r), n.addEventListener("click", () => this.chooseVariant(e, t)), n;
		});
		o.append(...s), i.append(n, a, o);
		let c = {
			wrapper: i,
			button: n,
			toggle: a,
			menu: o,
			items: s,
			variants: r,
			current: r[0],
			suppressClick: !1
		};
		this.flyouts.set(e, c), this.setVariant(e, c.current), a.addEventListener("click", () => {
			this.openFlyoutId === e ? this.hideFlyout(e, !0) : this.showFlyout(e);
		}), a.addEventListener("keydown", (t) => {
			t.key === "ArrowDown" && (t.preventDefault(), t.stopPropagation(), this.showFlyout(e));
		}), n.addEventListener("contextmenu", (t) => {
			t.preventDefault(), this.showFlyout(e);
		});
		let l = null, u = () => {
			l !== null && clearTimeout(l), l = null;
		};
		n.addEventListener("pointerdown", (t) => {
			t.button !== 0 || n.disabled || (u(), l = setTimeout(() => {
				l = null, c.suppressClick = !0, this.showFlyout(e);
			}, 400));
		});
		for (let e of [
			"pointerup",
			"pointerleave",
			"pointercancel"
		]) n.addEventListener(e, u);
		return o.addEventListener("keydown", (t) => this.onFlyoutKeyDown(e, t)), i.addEventListener("focusout", (t) => {
			if (this.openFlyoutId !== e) return;
			let n = t.relatedTarget;
			n instanceof Node && i.contains(n) || this.hideFlyout(e, !1);
		}), i;
	}
	setVariant(e, t) {
		let n = this.flyouts.get(e);
		if (n) {
			n.current = t, x(n.button, t.icon, t.label, t.title), n.button.dataset.variant = t.id, typeof t.options.method == "string" && (n.button.dataset.method = t.options.method);
			for (let e of n.items) e.setAttribute("aria-checked", String(e.dataset.variant === t.id));
		}
	}
	chooseVariant(e, t) {
		this.setVariant(e, t), this.hideFlyout(e, !0);
		let n = this.boundEditor;
		n && (n.tools.activate(Z[e].tool ?? e, t.options), this.renderTools());
	}
	showFlyout(e) {
		let t = this.flyouts.get(e);
		t && (this.openFlyoutId !== null && this.openFlyoutId !== e && this.hideFlyout(this.openFlyoutId, !1), this.openFlyoutId = e, t.menu.hidden = !1, t.toggle.setAttribute("aria-expanded", "true"), t.wrapper.setAttribute("data-open", ""), document.addEventListener("pointerdown", this.onDocumentPointerDown, !0), (t.items.find((e) => e.getAttribute("aria-checked") === "true") ?? t.items[0])?.focus());
	}
	hideFlyout(e, t) {
		let n = this.flyouts.get(e);
		n && this.openFlyoutId === e && (this.openFlyoutId = null, n.menu.hidden = !0, n.toggle.setAttribute("aria-expanded", "false"), n.wrapper.removeAttribute("data-open"), document.removeEventListener("pointerdown", this.onDocumentPointerDown, !0), t && n.button.focus());
	}
	onDocumentPointerDown = (e) => {
		let t = this.openFlyoutId;
		if (t === null) return;
		let n = e.target;
		n instanceof Node && this.flyouts.get(t).wrapper.contains(n) || this.hideFlyout(t, !1);
	};
	onFlyoutKeyDown(e, t) {
		let n = this.flyouts.get(e);
		if (!n) return;
		let { items: r } = n, i = r.indexOf(document.activeElement), a = (e) => r[(e + r.length) % r.length]?.focus();
		switch (t.key) {
			case "ArrowDown":
			case "ArrowRight":
				a(i + 1);
				break;
			case "ArrowUp":
			case "ArrowLeft":
				a(i - 1);
				break;
			case "Home":
				a(0);
				break;
			case "End":
				a(r.length - 1);
				break;
			case "Escape":
				this.hideFlyout(e, !0);
				break;
			case "Tab":
				this.hideFlyout(e, !1);
				return;
			default: return;
		}
		t.preventDefault(), t.stopPropagation();
	}
	renderHistory() {
		let e = this.boundEditor;
		this.undoButton.disabled = !e?.canUndo(), this.redoButton.disabled = !e?.canRedo();
	}
	applyPlacement() {
		super.applyPlacement(), this.content.setAttribute("aria-orientation", this.orientation);
	}
	disconnectedCallback() {
		this.openFlyoutId !== null && this.hideFlyout(this.openFlyoutId, !1), this.unbind();
	}
	unbind() {
		for (let e of this.unsubscribe) e();
		this.unsubscribe = [], this.unbindKeyboard?.(), this.unbindKeyboard = null;
	}
	renderEditMode() {
		let e = this.boundEditor, t = e?.isEditMode() ?? !1;
		this.editToggle.disabled = !e, this.editToggle.setAttribute("aria-pressed", String(t)), this.toggleAttribute("edit-mode", t), this.renderTools();
	}
	renderActiveLayer() {
		let e = this.boundEditor, t = e?.layers.list().find((e) => e.active);
		this.activeLayer.textContent = t ? `Layer: ${t.title}` : "No layer selected", this.activeLayer.hidden = !e, this.renderTools();
	}
	onToolbarKeyDown = (e) => {
		let t = this.orientation === "horizontal", n = t ? "ArrowRight" : "ArrowDown", r = t ? "ArrowLeft" : "ArrowUp";
		if (e.key !== n && e.key !== r) return;
		let i = Array.from(this.content.querySelectorAll("button:not([disabled]):not(.olcad-toolbar__flyout-toggle):not(.olcad-toolbar__flyout-item), [tabindex=\"0\"]")), a = i.indexOf(document.activeElement);
		a !== -1 && (i[(a + (e.key === n ? 1 : -1) + i.length) % i.length]?.focus(), e.preventDefault());
	};
}, mt = [
	["olcad-panel", E],
	["olcad-toolbar", pt],
	["olcad-straightedge", tt],
	["olcad-snap-settings", X],
	["olcad-grid-settings", fe],
	["olcad-angle-lock", O],
	["olcad-input-bar", N],
	["olcad-projection-select", I],
	["olcad-unit-select", L],
	["olcad-menu", J],
	["olcad-menubar", Y],
	["olcad-layer-list", be],
	["olcad-layer-editor", we],
	["olcad-layer-style-dialog", ke],
	["olcad-export-dialog", Le],
	["olcad-import-dialog", Ue],
	["olcad-feature-table", ye],
	["olcad-template-list", Je],
	["olcad-measure-results", Ze],
	["olcad-attribute-form", re],
	["olcad-dock", ue]
];
function ht() {
	for (let [e, t] of mt) customElements.get(e) || customElements.define(e, t);
	y();
}
//#endregion
export { D as ANGLE_PRESETS, w as DOCK_CHANGE_EVENT, Ie as EXPORT_EVENT, T as FLYOUT_TOGGLE_EVENT, m as ICONS, Be as IMPORT_EVENT, A as LAYOUT_CHANGE_EVENT, O as OlcadAngleLock, re as OlcadAttributeForm, ue as OlcadDock, Le as OlcadExportDialog, ye as OlcadFeatureTable, fe as OlcadGridSettings, Ue as OlcadImportDialog, N as OlcadInputBar, we as OlcadLayerEditor, be as OlcadLayerList, ke as OlcadLayerStyleDialog, Ze as OlcadMeasureResults, J as OlcadMenu, Y as OlcadMenubar, E as OlcadPanel, I as OlcadProjectionSelect, X as OlcadSnapSettings, tt as OlcadStraightedge, Je as OlcadTemplateList, pt as OlcadToolbar, L as OlcadUnitSelect, g as TOOLTIP_DELAY_MS, Z as TOOL_BUTTONS, it as bindKeyboard, We as bindPanelMenu, ht as defineElements, Fe as downloadFile, ge as featureTablesOf, S as hiddenText, h as icon, Ke as indexedDbStorage, y as installTooltips, _e as onFeatureTableChange, $ as optionsMatch, Pe as persistLayerStyles, qe as persistLocalLayers, F as projectionOptions, x as setIconButton, ct as toolButtonIds, ut as toolbarControls };

//# sourceMappingURL=ui.js.map