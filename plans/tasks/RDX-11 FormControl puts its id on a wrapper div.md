---
status: done
blockedBy: []
---

`FormControl` sets `id={formItemId}` on a wrapping `<div>` instead of forwarding
it to the input, so every `<label for>` in the app points at an element that
can't be labelled.

## Resolution

Fixed: `FormControl` now renders `Slot.Root`, so the field's id and ARIA
wiring land on the control itself. `FormLabel` also gained an id, and
`MarkdownEditor` accepts and forwards `id` / `aria-describedby` /
`aria-invalid` to both the textarea fallback and the Tiptap editable (which
also now declares `role="textbox"` and `aria-multiline`).

Guarded by `e2e/forms.spec.ts`, which checks label association across Input,
native select, Textarea and both Tiptap editors, that clicking a label focuses
its field, and that `aria-invalid` lands on the input.

Note the Tiptap editable is a contenteditable div, which is not a labelable
element — `<label for>` can't name it. Its accessible name comes from the
`ariaLabel` prop, which every call site already passes.

## Notes

`src/components/ui/form.tsx`:

```tsx
function FormControl({ ...props }: React.ComponentProps<"div">) {
	const { error, formItemId, formDescriptionId, formMessageId } = useFormField();
	return <div id={formItemId} aria-describedby={…} aria-invalid={!!error} {...props} />;
}
```

Upstream shadcn renders a Radix `<Slot>` here, which merges the props onto the
child input. Rendering a `div` instead breaks three things at once:

- Inputs have **no accessible name**. Their only name is the placeholder, so a
  field with no placeholder is anonymous to a screen reader.
- Clicking a label doesn't focus its field.
- `aria-invalid` and `aria-describedby` land on the wrapper, so validation
  errors aren't announced against the field they belong to.

Found while writing browser tests: `page.getByLabel("Name")` matches nothing on
`/register`, and the accessibility snapshot renders the labels as `generic`
rather than associating them.

Affects every form in the app — auth, campaigns, nouns, sessions, maps,
templates, calendar.

The fix is to import `Slot` from `radix-ui` and render
`<Slot id={formItemId} … />`, but check each call site: anything relying on the
current `div` for layout or spacing will need its classes moved, since Slot
renders no element of its own.

When this lands, switch `e2e/helpers/auth.ts` back to `getByLabel` — the
placeholder-based locators there exist only because of this bug.
