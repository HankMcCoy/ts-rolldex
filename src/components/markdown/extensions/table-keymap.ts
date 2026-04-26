import { Extension } from "@tiptap/core";

/**
 * Press Enter at the end of the last cell of a table to add a new row.
 * Default Tiptap table behaviour leaves Enter as a hard-break inside the
 * cell, which means typing tabular data feels more like a form than a
 * spreadsheet. This shortcut adds the spreadsheet escape hatch without
 * changing in-cell newline behaviour anywhere else.
 */
export const TableKeymap = Extension.create({
	name: "tableKeymap",

	addKeyboardShortcuts() {
		return {
			Enter: ({ editor }) => {
				const { selection } = editor.state;
				const { $from } = selection;

				let inCell = false;
				let cellDepth = -1;
				for (let depth = $from.depth; depth > 0; depth--) {
					const node = $from.node(depth);
					if (
						node.type.name === "tableCell" ||
						node.type.name === "tableHeader"
					) {
						inCell = true;
						cellDepth = depth;
						break;
					}
				}
				if (!inCell) return false;

				const cellNode = $from.node(cellDepth);
				const cellEnd = $from.end(cellDepth);
				if ($from.pos !== cellEnd) return false;

				const rowDepth = cellDepth - 1;
				const tableDepth = cellDepth - 2;
				if (rowDepth < 1 || tableDepth < 1) return false;

				const row = $from.node(rowDepth);
				const table = $from.node(tableDepth);
				const rowIndexInTable = $from.index(tableDepth);
				const cellIndexInRow = $from.index(rowDepth);

				const isLastCell = cellIndexInRow === row.childCount - 1;
				const isLastRow = rowIndexInTable === table.childCount - 1;
				if (!isLastCell || !isLastRow) return false;

				// Avoid swallowing Enter when the cell still has content the user
				// might want to break in two — only fire when the cell ends on its
				// last paragraph and the cursor is at the very end of that block.
				if (cellNode.lastChild?.type.name !== "paragraph") return false;

				return editor.chain().focus().addRowAfter().run();
			},
		};
	},
});
