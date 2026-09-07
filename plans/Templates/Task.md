<%*
const PREFIX = "RDX";
const FOLDER = "tasks";

const raw = await tp.system.prompt("Task title", "", true);
const title = raw.replace(/[\\/:*?"<>|#^\[\]]/g, " ").replace(/\s+/g, " ").trim();
if (!title) throw new Error("A task title is required");

const next = tp.app.vault.getMarkdownFiles()
  .filter((f) => f.path.startsWith(FOLDER + "/"))
  .reduce((max, f) => {
    const hit = f.basename.match(new RegExp("^" + PREFIX + "-(\\d+)"));
    return hit ? Math.max(max, parseInt(hit[1], 10)) : max;
  }, 0) + 1;

const id = PREFIX + "-" + String(next).padStart(2, "0");
await tp.file.move(FOLDER + "/" + id + " " + title);
-%>
---
status: todo
blockedBy: []
---

One or two sentences on the problem, in the language of the user, not the code.

## Notes
