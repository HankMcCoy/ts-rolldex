---
status: done
blockedBy: []
---

Clicking the "Notes" or "Private notes" label leaves focus on `<body>` instead
of putting the cursor in the editor. Every other field on the same form focuses
correctly, so one form behaves two different ways.

## Resolution

`FormLabel` now focuses its target on click when that target isn't a labelable
element. It already knew the id, so the shim is contained to the one shared
component and covers any future non-native control — the check is on the
target's tag, not on Tiptap specifically.

Caller-supplied `onClick` still runs first, and a handler that calls
`preventDefault()` suppresses the focus, so opting out stays possible.

Guarded by `e2e/forms.spec.ts`, which asserts the click focuses the editor,
that typing then lands in it, and that native fields still focus through the
same code path. Verified non-vacuous: removing the shim fails that test and
only that test.

## Notes

Left over from [[RDX-11 FormControl puts its id on a wrapper div]]. That fix got
the field's id onto the right element, but the element Tiptap renders is a
`contenteditable` div, and label activation is defined by the HTML spec only for
*labelable* elements — `button`, `input`, `meter`, `output`, `progress`,
`select`, `textarea`. No amount of correct `for` markup makes a div focusable by
label click.

Measured in the browser:

```
labelFor:               "…-form-item"   ← the id is on the right element
targetTag:              "DIV"
targetRole:             "textbox"
accessibleName:         "Notes"

afterLabelClick:        {"tag":"BODY"}  ← nothing focused
afterSummaryLabelClick: "TEXTAREA"      ← native field works
afterTabFromSummary:    {"isEditor":true}
```

So the scope is narrow — only mouse users, only these two fields:

- Screen readers already announce it correctly (`aria-label` + `role="textbox"`
  + `aria-multiline`), so the accessible name is fine.
- Keyboard is fine: Tab from Summary lands in the editor.
- `aria-invalid` / `aria-describedby` do apply; ARIA works on any element.

One wrinkle: during SSR and chunk load the fallback is a real `<textarea>`,
which *is* labelable, so label-click works until Tiptap mounts and then stops.
Same field, different behaviour depending on timing.

The fix is a small shim in `FormLabel`, which already knows the target id: on
click, if the target isn't a labelable element, focus it by hand. Contained in
one shared component, and it covers any future non-native control too.
