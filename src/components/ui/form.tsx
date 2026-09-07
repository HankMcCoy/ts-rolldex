import { type Label as LabelPrimitive, Slot } from "radix-ui";
import * as React from "react";
import {
	Controller,
	type ControllerProps,
	type FieldPath,
	type FieldValues,
	FormProvider,
	useFormContext,
} from "react-hook-form";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const Form = FormProvider;

interface FormFieldContextValue<
	TFieldValues extends FieldValues = FieldValues,
	TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> {
	name: TName;
}

const FormFieldContext = React.createContext<FormFieldContextValue>(
	{} as FormFieldContextValue,
);

function FormField<
	TFieldValues extends FieldValues = FieldValues,
	TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({ ...props }: ControllerProps<TFieldValues, TName>) {
	return (
		<FormFieldContext.Provider value={{ name: props.name }}>
			<Controller {...props} />
		</FormFieldContext.Provider>
	);
}

function useFormField() {
	const fieldContext = React.useContext(FormFieldContext);
	const itemContext = React.useContext(FormItemContext);
	const { getFieldState, formState } = useFormContext();
	const fieldState = getFieldState(fieldContext.name, formState);

	if (!fieldContext) {
		throw new Error("useFormField should be used within <FormField>");
	}

	const { id } = itemContext;

	return {
		id,
		name: fieldContext.name,
		formItemId: `${id}-form-item`,
		formLabelId: `${id}-form-item-label`,
		formDescriptionId: `${id}-form-item-description`,
		formMessageId: `${id}-form-item-message`,
		...fieldState,
	};
}

interface FormItemContextValue {
	id: string;
}

const FormItemContext = React.createContext<FormItemContextValue>(
	{} as FormItemContextValue,
);

function FormItem({ className, ...props }: React.ComponentProps<"div">) {
	const id = React.useId();
	return (
		<FormItemContext.Provider value={{ id }}>
			<div className={cn("grid gap-2", className)} {...props} />
		</FormItemContext.Provider>
	);
}

/**
 * Elements the platform focuses when their label is clicked. Anything else —
 * notably the `contenteditable` div Tiptap renders — has to be focused by
 * hand, since label activation is spec'd only for labelable elements.
 */
const LABELABLE = new Set([
	"BUTTON",
	"INPUT",
	"METER",
	"OUTPUT",
	"PROGRESS",
	"SELECT",
	"TEXTAREA",
]);

function focusIfNotLabelable(id: string) {
	const el = document.getElementById(id);
	if (!el || LABELABLE.has(el.tagName)) return;
	el.focus();
}

function FormLabel({
	className,
	htmlFor,
	onClick,
	...props
}: React.ComponentProps<typeof LabelPrimitive.Root> & { className?: string }) {
	const { error, formItemId, formLabelId } = useFormField();
	// A caller-supplied htmlFor still wins, so resolve the effective target.
	const target = htmlFor ?? formItemId;
	return (
		<Label
			id={formLabelId}
			className={cn(error && "text-destructive", className)}
			htmlFor={target}
			onClick={(event) => {
				onClick?.(event);
				if (event.defaultPrevented) return;
				focusIfNotLabelable(target);
			}}
			{...props}
		/>
	);
}

/**
 * Merges the field's id and ARIA wiring onto its control. This must be a
 * `Slot` and not a wrapping element: `FormLabel` renders `<label for>`
 * pointing at `formItemId`, and a label whose target is a `<div>` is inert —
 * the input gets no accessible name, clicking the label doesn't focus it, and
 * `aria-invalid` / `aria-describedby` end up on the wrapper rather than the
 * field they describe.
 *
 * Slot renders no element of its own, so it requires exactly one child and
 * that child must forward props to a real DOM node.
 */
function FormControl({ ...props }: React.ComponentProps<typeof Slot.Root>) {
	const { error, formItemId, formDescriptionId, formMessageId } =
		useFormField();
	return (
		<Slot.Root
			id={formItemId}
			aria-describedby={
				!error
					? `${formDescriptionId}`
					: `${formDescriptionId} ${formMessageId}`
			}
			aria-invalid={!!error}
			{...props}
		/>
	);
}

function FormDescription({ className, ...props }: React.ComponentProps<"p">) {
	const { formDescriptionId } = useFormField();
	return (
		<p
			id={formDescriptionId}
			className={cn("text-muted-foreground text-sm", className)}
			{...props}
		/>
	);
}

function FormMessage({
	className,
	children,
	...props
}: React.ComponentProps<"p">) {
	const { error, formMessageId } = useFormField();
	const body = error ? String(error?.message ?? "") : children;
	if (!body) return null;
	return (
		<p
			id={formMessageId}
			className={cn("text-destructive text-sm font-medium", className)}
			{...props}
		>
			{body}
		</p>
	);
}

export {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
	useFormField,
};
