import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

const TSV_ROW_RE = /^.+(?:\t.+)+$/;

function isTsv(text: string): { rows: string[][] } | null {
	const lines = text.replace(/\r\n/g, "\n").split("\n");
	while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
	if (lines.length < 2) return null;
	const rows: string[][] = [];
	let cols = -1;
	for (const line of lines) {
		if (!TSV_ROW_RE.test(line)) return null;
		const cells = line.split("\t");
		if (cols === -1) cols = cells.length;
		if (cells.length !== cols) return null;
		rows.push(cells);
	}
	return { rows };
}

/**
 * If the clipboard is plain-text TSV (e.g. pasted from a terminal-rendered
 * spreadsheet that didn't include `text/html`), build a Tiptap table.
 * The default table extension already handles HTML clipboards from Excel,
 * Sheets, and Notion — this is the fallback for the plain-text case.
 */
export const TsvPaste = Extension.create({
	name: "tsvPaste",

	addProseMirrorPlugins() {
		return [
			new Plugin({
				key: new PluginKey("tsvPaste"),
				props: {
					handlePaste: (view, event) => {
						const clipboard = event.clipboardData;
						if (!clipboard) return false;
						if (clipboard.types.includes("text/html")) return false;
						const text = clipboard.getData("text/plain");
						if (!text) return false;
						const parsed = isTsv(text);
						if (!parsed) return false;

						const { schema } = view.state;
						const tableType = schema.nodes.table;
						const rowType = schema.nodes.tableRow;
						const headerType = schema.nodes.tableHeader;
						const cellType = schema.nodes.tableCell;
						if (!tableType || !rowType || !cellType) return false;

						const buildCell = (type: typeof cellType, value: string) => {
							const text = value.length > 0 ? schema.text(value) : null;
							const paragraph = schema.nodes.paragraph.create(
								null,
								text ? [text] : [],
							);
							return type.create(null, paragraph);
						};

						const rows = parsed.rows.map((cells, rowIndex) => {
							const cellTypeForRow =
								rowIndex === 0 && headerType ? headerType : cellType;
							const cellNodes = cells.map((value) =>
								buildCell(cellTypeForRow, value),
							);
							return rowType.create(null, cellNodes);
						});

						const table = tableType.create(null, rows);
						const tr = view.state.tr.replaceSelectionWith(table);
						view.dispatch(tr.scrollIntoView());
						return true;
					},
				},
			}),
		];
	},
});
