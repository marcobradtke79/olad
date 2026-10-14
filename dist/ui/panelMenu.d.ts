import { OlcadDock } from './elements/OlcadDock';
import { OlcadMenu } from './elements/OlcadMenubar';
/**
 * Fill `menu` (for example the host's View menu) with items that show and hide the toolbars
 * and panels of `dock`: Show all, Hide all and one checkbox per named panel that can be
 * toggled, labelled with its heading. The items follow layout changes. Returns a function
 * that removes them again.
 */
export declare function bindPanelMenu(menu: OlcadMenu, dock: OlcadDock): () => void;
