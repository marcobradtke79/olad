import type { Editor } from '../../core/Editor';

/** Titles of the projections OpenLayers knows without proj4. */
const BUILT_IN_TITLES: Record<string, string> = {
  'EPSG:3857': 'Web Mercator',
  'EPSG:4326': 'WGS 84',
};

/** The codes offered for `editor`: the initial view projection, the built-ins and `projections[]`. */
export function projectionOptions(editor: Editor): { code: string; label: string }[] {
  const titles = new Map<string, string>(Object.entries(BUILT_IN_TITLES));
  for (const { code, title } of editor.config.projections) {
    if (title) titles.set(code, title);
  }
  const codes = new Set<string>([
    editor.config.view.projection,
    ...Object.keys(BUILT_IN_TITLES),
    ...editor.config.projections.map((p) => p.code),
  ]);
  return [...codes].map((code) => {
    const title = titles.get(code);
    return { code, label: title ? `${code} (${title})` : code };
  });
}

/**
 * `<olcad-projection-select>`: a select that switches the view projection
 * (`editor.setProjection`) between the configured projections. Bind with
 * `element.editor = editor`.
 */
export class OlcadProjectionSelect extends HTMLElement {
  private boundEditor: Editor | null = null;
  private unsubscribe: (() => void)[] = [];
  private readonly select: HTMLSelectElement = document.createElement('select');
  private built = false;

  get editor(): Editor | null {
    return this.boundEditor;
  }

  set editor(editor: Editor | null) {
    this.unbind();
    this.boundEditor = editor;
    if (editor) {
      this.unsubscribe.push(
        editor.on('projectionchange', () => this.render()),
        editor.on('destroy', () => {
          this.editor = null;
        }),
      );
    }
    this.render();
  }

  connectedCallback(): void {
    this.classList.add('olcad-projection-select');
    if (!this.built) {
      this.built = true;
      this.select.className = 'olcad-projection-select__select';
      this.select.setAttribute('aria-label', 'Projection');
      this.select.addEventListener('change', () => {
        this.boundEditor?.setProjection(this.select.value);
      });
      this.append(this.select);
    }
    this.render();
  }

  disconnectedCallback(): void {
    this.unbind();
  }

  private render(): void {
    if (!this.built) return;
    const editor = this.boundEditor;
    this.select.disabled = !editor;
    const options = editor ? projectionOptions(editor) : [];
    const current = editor?.getProjection() ?? '';
    const existing = Array.from(this.select.options).map((o) => o.value);
    if (existing.join('\n') !== options.map((o) => o.code).join('\n')) {
      this.select.replaceChildren(
        ...options.map(({ code, label }) => {
          const option = document.createElement('option');
          option.value = code;
          option.textContent = label;
          return option;
        }),
      );
    }
    if (current && !options.some((o) => o.code === current)) {
      // A projection switched to through the API that is not in the list.
      const option = document.createElement('option');
      option.value = current;
      option.textContent = current;
      this.select.append(option);
    }
    this.select.value = current;
  }

  private unbind(): void {
    for (const off of this.unsubscribe) off();
    this.unsubscribe = [];
  }
}
