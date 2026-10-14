import type { Editor } from '../../core/Editor';
import type { TemplateInfo } from '../../core/templates/TemplateStore';
import { setIconButton } from './controls';

type RowAction = 'insert' | 'rename' | 'remove';

/**
 * `<olcad-template-list>`: the named templates of `editor.templates`. A **Copy to template**
 * button starts the copy tool; each row shows the name, the object count and icon buttons to
 * insert copies (starts the `template-insert` tool, pressed while it runs), rename the template
 * in place and remove it. Bind with `element.editor = editor`. Renders into light DOM.
 */
export class OlcadTemplateList extends HTMLElement {
  private boundEditor: Editor | null = null;
  private unsubscribe: (() => void)[] = [];
  /** The template whose name is being edited. */
  private renaming: string | null = null;

  get editor(): Editor | null {
    return this.boundEditor;
  }

  set editor(editor: Editor | null) {
    this.unbind();
    this.boundEditor = editor;
    if (editor) {
      const rerender = () => this.render();
      this.unsubscribe.push(
        editor.on('templatechange', rerender),
        editor.on('toolchange', rerender),
        editor.on('editmodechange', rerender),
        editor.on('activelayerchange', rerender), // the draft / active fallback decides insertability
        editor.on('layerchange', rerender),
        editor.on('destroy', () => {
          this.editor = null;
        }),
      );
    }
    this.render();
  }

  connectedCallback(): void {
    this.classList.add('olcad-template-list');
    this.render();
  }

  disconnectedCallback(): void {
    this.unbind();
  }

  private unbind(): void {
    for (const off of this.unsubscribe) off();
    this.unsubscribe = [];
  }

  private render(): void {
    // A rebuild would drop the focus: remember the focused control and restore it.
    const focused = this.ownerDocument.activeElement as HTMLElement | null;
    const focus =
      focused && this.contains(focused) && focused.dataset.action
        ? {
            action: focused.dataset.action,
            template: focused.closest<HTMLElement>('[data-template-id]')?.dataset.templateId,
          }
        : null;
    this.replaceChildren();
    const editor = this.boundEditor;
    if (!editor) return;
    const templates = editor.templates.list();
    if (this.renaming && !templates.some((t) => t.id === this.renaming)) this.renaming = null;

    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'olcad-template-list__copy';
    copy.dataset.action = 'copy';
    setIconButton(
      copy,
      'copy',
      'Copy to template',
      'Select objects, pick a base point and name the template',
    );
    copy.setAttribute('aria-pressed', String(editor.tools.getActive() === 'template-copy'));
    copy.addEventListener('click', () => {
      if (editor.isEditMode() && editor.tools.getActive() === 'template-copy') {
        editor.tools.deactivate();
        return;
      }
      if (!editor.isEditMode()) editor.setEditMode(true);
      editor.tools.activate('template-copy');
    });
    const header = document.createElement('div');
    header.className = 'olcad-template-list__header';
    const label = document.createElement('span');
    label.className = 'olcad-template-list__count';
    label.textContent = templates.length === 1 ? '1 template' : `${templates.length} templates`;
    header.append(copy, label);
    this.append(header);

    if (templates.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'olcad-template-list__empty';
      empty.textContent = 'No templates yet: select objects and use Copy to template.';
      this.append(empty);
    } else {
      const list = document.createElement('ul');
      list.className = 'olcad-template-list__list';
      list.setAttribute('aria-label', 'Templates');
      for (const template of templates) list.append(this.renderRow(editor, template));
      this.append(list);
    }

    if (focus) {
      const scope = focus.template
        ? Array.from(this.querySelectorAll<HTMLElement>('[data-template-id]')).find(
            (el) => el.dataset.templateId === focus.template,
          )
        : this;
      scope?.querySelector<HTMLElement>(`[data-action="${focus.action}"]`)?.focus();
    }
  }

  private renderRow(editor: Editor, template: TemplateInfo): HTMLElement {
    const row = document.createElement('li');
    row.className = 'olcad-template-list__template';
    row.dataset.templateId = template.id;

    const button = (action: RowAction): HTMLButtonElement => {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = `olcad-template-list__${action}`;
      el.dataset.action = action;
      return el;
    };

    const text = document.createElement('div');
    text.className = 'olcad-template-list__text';
    if (this.renaming === template.id) {
      text.append(this.renameInput(editor, template));
    } else {
      const name = document.createElement('span');
      name.className = 'olcad-template-list__name';
      name.textContent = template.name;
      name.title = template.name;
      text.append(name);
    }
    const meta = document.createElement('span');
    meta.className = 'olcad-template-list__meta';
    meta.textContent = `${template.featureCount} ${template.featureCount === 1 ? 'object' : 'objects'} · ${template.layers.join(', ')}`;
    text.append(meta);

    const options = editor.tools.getActiveOptions();
    const inserting =
      editor.isEditMode() &&
      editor.tools.getActive() === 'template-insert' &&
      options.template === template.id;
    const insertable = editor.templates.canInsert(template.id);
    const insert = button('insert');
    setIconButton(
      insert,
      'stamp',
      `Insert ${template.name}`,
      !insertable
        ? 'No layer can take these objects'
        : inserting
          ? 'Stop inserting'
          : 'Insert copies: click the insertion points on the map',
    );
    insert.setAttribute('aria-pressed', String(inserting));
    insert.disabled = !insertable && !inserting;
    insert.addEventListener('click', () => {
      if (inserting) {
        editor.tools.deactivate();
        return;
      }
      if (!editor.isEditMode()) editor.setEditMode(true);
      editor.tools.activate('template-insert', { template: template.id });
    });

    const rename = button('rename');
    setIconButton(rename, 'rename', `Rename ${template.name}`);
    rename.addEventListener('click', () => {
      this.renaming = template.id;
      this.render();
      this.querySelector<HTMLInputElement>('.olcad-template-list__name-input')?.focus();
    });

    const remove = button('remove');
    setIconButton(remove, 'delete', `Remove ${template.name}`);
    remove.addEventListener('click', () => {
      if (inserting) editor.tools.deactivate();
      editor.templates.remove(template.id);
    });

    row.append(text, insert, rename, remove);
    return row;
  }

  /** Inline name editing: Enter or leaving the field saves, Escape cancels. */
  private renameInput(editor: Editor, template: TemplateInfo): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'olcad-template-list__name-input';
    input.value = template.name;
    input.setAttribute('aria-label', `Name of ${template.name}`);
    let done = false;
    const finish = (save: boolean) => {
      if (done) return;
      done = true;
      this.renaming = null;
      const name = input.value.trim();
      if (save && name && name !== template.name) {
        editor.templates.rename(template.id, name); // re-renders through templatechange
      } else {
        this.render();
      }
      this.querySelector<HTMLElement>(
        `[data-template-id="${template.id}"] [data-action="rename"]`,
      )?.focus();
    };
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        finish(true);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation(); // keep the editor's Escape shortcut out of it
        finish(false);
      }
    });
    input.addEventListener('blur', () => finish(true));
    return input;
  }
}
