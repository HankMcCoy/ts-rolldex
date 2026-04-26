import { Extension } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";

/**
 * Keep every table's first row populated with `tableHeader` cells. GFM
 * markdown can't represent a header-less table, so without this fix any
 * delete-the-header action (right-click, slash command, manual edit) would
 * cause `tiptap-markdown` to fall back to a `[table]` placeholder and the
 * data would round-trip lossily.
 *
 * Implemented as `appendTransaction`: after any document-changing
 * transaction, scan tables and promote orphaned body rows that ended up
 * sitting at the top of a table.
 */
export const EnforceTableHeader = Extension.create({
	name: "enforceTableHeader",

	addProseMirrorPlugins() {
		return [
			new Plugin({
				key: new PluginKey("enforceTableHeader"),
				appendTransaction: (transactions, _oldState, newState) => {
					if (!transactions.some((t) => t.docChanged)) return null;

					const headerType = newState.schema.nodes.tableHeader;
					const tableType = newState.schema.nodes.table;
					if (!headerType || !tableType) return null;

					const fixes: Array<{ pos: number; row: PMNode }> = [];
					newState.doc.descendants((node, pos) => {
						if (node.type !== tableType) return true;
						const firstRow = node.firstChild;
						if (!firstRow) return false;
						let hasHeader = false;
						firstRow.forEach((cell) => {
							if (cell.type === headerType) hasHeader = true;
						});
						if (!hasHeader) {
							// firstRow lives at table-pos + 1 (just inside the table node).
							fixes.push({ pos: pos + 1, row: firstRow });
						}
						return false;
					});

					if (fixes.length === 0) return null;

					let tr = newState.tr;
					// Apply in reverse so earlier replacements don't shift later positions.
					for (let i = fixes.length - 1; i >= 0; i--) {
						const { pos, row } = fixes[i];
						const newCells: PMNode[] = [];
						row.forEach((cell) => {
							newCells.push(
								headerType.create(cell.attrs, cell.content, cell.marks),
							);
						});
						const newRow = row.type.create(row.attrs, newCells);
						tr = tr.replaceWith(pos, pos + row.nodeSize, newRow);
					}
					return tr;
				},
			}),
		];
	},
});
