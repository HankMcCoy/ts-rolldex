import { Link } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import { EntityAvatar } from "@/components/EntityAvatar";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	BundleMutationError,
	type BundleRelationshipCategory,
	patchAddRelationship,
	patchRemoveRelationship,
	useBundleMutation,
} from "@/lib/queries";
import type {
	CandidateEntity,
	EntityType,
	ExplicitRelationship,
} from "@/lib/relationships";
import { createRelationship, deleteRelationship } from "@/server/relationships";

interface Props {
	campaignId: string;
	current: { id: string; kind: "noun" | "session" };
	related: CandidateEntity[];
	explicit: ExplicitRelationship[];
	candidates: CandidateEntity[];
	categories: BundleRelationshipCategory[];
	labelSuggestions: { categoryId: string; label: string }[];
	canEdit: boolean;
}

type CreateVars = {
	campaignId: string;
	id: string;
	source: Props["current"];
	target: Props["current"];
	category:
		| { kind: "existing"; id: string }
		| {
				kind: "new";
				id: string;
				name: string;
		  };
	forwardLabel?: string;
	reverseLabel?: string;
};

const TYPE_LABELS: Record<EntityType, string> = {
	PERSON: "People",
	PLACE: "Places",
	THING: "Things",
	FACTION: "Factions",
	EVENT: "Events",
	SESSION: "Sessions",
};
const TYPE_ORDER: EntityType[] = [
	"PERSON",
	"PLACE",
	"THING",
	"FACTION",
	"EVENT",
	"SESSION",
];

function EntityLink({
	campaignId,
	entity,
	showSummary = false,
}: {
	campaignId: string;
	entity: CandidateEntity;
	showSummary?: boolean;
}) {
	const link =
		entity.entityType === "SESSION" ? (
			<Link
				to="/campaigns/$campaignId/sessions/$sessionId"
				params={{ campaignId, sessionId: entity.id }}
				className="flex min-w-0 items-center gap-2 text-sm"
			>
				<EntityAvatar
					entityType="SESSION"
					imageUrl={null}
					name={entity.name}
					className="size-6 rounded-md"
				/>
				<span className="truncate">{entity.name}</span>
			</Link>
		) : (
			<Link
				to="/campaigns/$campaignId/nouns/$nounId"
				params={{ campaignId, nounId: entity.id }}
				className="flex min-w-0 items-center gap-2 text-sm"
			>
				<EntityAvatar
					entityType={entity.entityType}
					imageUrl={entity.imageUrl}
					name={entity.name}
					className="size-6 rounded-md"
				/>
				<span className="truncate">{entity.name}</span>
			</Link>
		);
	if (!showSummary || !entity.summary) return link;
	return (
		<Tooltip>
			<TooltipTrigger asChild>{link}</TooltipTrigger>
			<TooltipContent
				side="left"
				className="max-w-56 flex-col items-start gap-1 p-3"
			>
				<p className="font-semibold">{entity.name}</p>
				<p className="font-normal opacity-80">{entity.summary}</p>
			</TooltipContent>
		</Tooltip>
	);
}

export function RelatedEntities({
	campaignId,
	current,
	related,
	explicit,
	candidates,
	categories,
	labelSuggestions,
	canEdit,
}: Props) {
	const available = candidates.filter((c) => c.id !== current.id);
	const [open, setOpen] = useState(false);
	const [lockedTarget, setLockedTarget] = useState(false);
	const [targetId, setTargetId] = useState("");
	const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "new");
	const [categoryName, setCategoryName] = useState("");
	const [forwardLabel, setForwardLabel] = useState("");
	const [reverseLabel, setReverseLabel] = useState("");
	const [error, setError] = useState("");

	const create = useBundleMutation({
		campaignId,
		mutationFn: (data: CreateVars) => createRelationship({ data }),
		patch: (bundle, data) => {
			const now = new Date();
			return patchAddRelationship(
				bundle,
				{
					id: data.id,
					relationshipCategoryId: data.category.id,
					forwardLabel: data.forwardLabel ?? null,
					reverseLabel: data.reverseLabel ?? null,
					sourceNounId: data.source.kind === "noun" ? data.source.id : null,
					sourceSessionId:
						data.source.kind === "session" ? data.source.id : null,
					targetNounId: data.target.kind === "noun" ? data.target.id : null,
					targetSessionId:
						data.target.kind === "session" ? data.target.id : null,
					createdAt: now,
				},
				data.category.kind === "new"
					? {
							id: data.category.id,
							campaignId,
							name: data.category.name,
							createdAt: now,
						}
					: undefined,
			);
		},
	});
	const remove = useBundleMutation({
		campaignId,
		mutationFn: (relationshipId: string) =>
			deleteRelationship({ data: { campaignId, relationshipId } }),
		patch: (bundle, relationshipId) =>
			patchRemoveRelationship(bundle, relationshipId),
	});

	function showDialog(target?: CandidateEntity) {
		setTargetId(target?.id ?? available[0]?.id ?? "");
		setLockedTarget(Boolean(target));
		setCategoryId(categories[0]?.id ?? "new");
		setCategoryName("");
		setForwardLabel("");
		setReverseLabel("");
		setError("");
		setOpen(true);
	}

	async function submit(event: FormEvent) {
		event.preventDefault();
		const target = available.find((c) => c.id === targetId);
		const selectedCategory = categories.find((c) => c.id === categoryId);
		if (!target) return setError("Choose an entity.");
		if (!selectedCategory && !categoryName.trim())
			return setError("Name is required for a new category.");
		try {
			const relationshipId = crypto.randomUUID();
			await create.mutateAsync({
				campaignId,
				id: relationshipId,
				source: current,
				target: {
					kind: target.entityType === "SESSION" ? "session" : "noun",
					id: target.id,
				},
				category: selectedCategory
					? {
							kind: "existing",
							id: selectedCategory.id,
						}
					: {
							kind: "new",
							id: crypto.randomUUID(),
							name: categoryName.trim(),
						},
				forwardLabel: forwardLabel.trim() || undefined,
				reverseLabel: reverseLabel.trim() || undefined,
			});
			setOpen(false);
		} catch (e) {
			setError(
				e instanceof BundleMutationError
					? e.message
					: "Could not save the relationship.",
			);
		}
	}

	const groups = TYPE_ORDER.map((type) => ({
		type,
		items: related.filter((e) => e.entityType === type),
	})).filter((g) => g.items.length);
	const explicitGroups = Array.from(
		explicit.reduce((byCategory, relationship) => {
			const group = byCategory.get(relationship.categoryId);
			if (group) group.items.push(relationship);
			else
				byCategory.set(relationship.categoryId, {
					id: relationship.categoryId,
					name: relationship.categoryName,
					items: [relationship],
				});
			return byCategory;
		}, new Map<
			string,
			{ id: string; name: string; items: ExplicitRelationship[] }
		>()),
	).map(([, group]) => group);
	explicitGroups.sort((a, b) => a.name.localeCompare(b.name));
	const suggestedLabels = Array.from(
		new Set(
			labelSuggestions
				.filter((suggestion) => suggestion.categoryId === categoryId)
				.map((suggestion) => suggestion.label),
		),
	).sort((a, b) => a.localeCompare(b));
	if (available.length === 0 && explicit.length === 0 && related.length === 0)
		return null;
	if (!canEdit && explicit.length === 0 && related.length === 0) return null;

	return (
		<TooltipProvider delayDuration={300}>
			<aside>
				<div className="mb-4 flex items-center justify-between">
					<h2 className="text-xs font-bold tracking-[0.18em] uppercase">
						Related
					</h2>
					{canEdit && available.length > 0 && (
						<Button
							size="icon-sm"
							variant="ghost"
							aria-label="Add relationship"
							onClick={() => showDialog()}
						>
							<Plus />
						</Button>
					)}
				</div>
				{explicitGroups.map((group) => (
					<section key={group.id} className="mb-5">
						<h3 className="mb-2 text-[10px] font-semibold tracking-[0.15em] uppercase text-[var(--sea-ink-soft)]">
							{group.name}
						</h3>
						<ul className="space-y-2">
							{group.items.map((r) => (
								<li key={r.id} className="group">
									{r.label && (
										<p className="text-[10px] text-[var(--sea-ink-soft)]">
											{r.label}
										</p>
									)}
									<div className="flex items-center gap-1">
										<EntityLink campaignId={campaignId} entity={r.target} />
										{canEdit && (
											<button
												type="button"
												aria-label={`Delete relationship with ${r.target.name}`}
												className="ml-auto opacity-0 group-hover:opacity-70 group-focus-within:opacity-70 focus:opacity-100"
												onClick={() => remove.mutate(r.id)}
											>
												<Trash2 className="size-3" />
											</button>
										)}
									</div>
								</li>
							))}
						</ul>
					</section>
				))}
				<div className="space-y-5">
					{groups.length > 0 && explicitGroups.length > 0 && (
						<h3 className="text-[10px] font-semibold tracking-[0.15em] uppercase text-[var(--sea-ink-soft)]">
							Inferred
						</h3>
					)}
					{groups.map(({ type, items }) => (
						<section key={type}>
							<h3 className="mb-2 text-[10px] font-semibold tracking-[0.15em] uppercase text-[var(--sea-ink-soft)]">
								{TYPE_LABELS[type]}
							</h3>
							<ul className="space-y-1.5">
								{items.map((e) => (
									<li key={e.id} className="group flex items-center gap-1">
										<EntityLink
											campaignId={campaignId}
											entity={e}
											showSummary
										/>
										{canEdit && (
											<button
												type="button"
												aria-label={`Declare relationship with ${e.name}`}
												className="ml-auto opacity-0 group-hover:opacity-70 group-focus-within:opacity-70 focus:opacity-100"
												onClick={() => showDialog(e)}
											>
												<Plus className="size-3" />
											</button>
										)}
									</li>
								))}
							</ul>
						</section>
					))}
				</div>

				<Dialog open={open} onOpenChange={setOpen}>
					<DialogContent>
						<form onSubmit={submit} className="space-y-4">
							<DialogHeader>
								<DialogTitle>Add relationship</DialogTitle>
								<DialogDescription>
									Declare how this entry relates to another campaign entry.
								</DialogDescription>
							</DialogHeader>
							<label className="grid gap-1">
								Target
								<select
									aria-label="Relationship target"
									disabled={lockedTarget}
									value={targetId}
									onChange={(e) => setTargetId(e.target.value)}
									className="h-8 rounded-lg border bg-white px-2"
								>
									{available.map((c) => (
										<option key={c.id} value={c.id}>
											{c.name}
										</option>
									))}
								</select>
							</label>
							<label className="grid gap-1">
								Category
								<select
									aria-label="Relationship category"
									value={categoryId}
									onChange={(e) => setCategoryId(e.target.value)}
									className="h-8 rounded-lg border bg-white px-2"
								>
									{categories.map((category) => (
										<option key={category.id} value={category.id}>
											{category.name}
										</option>
									))}
									<option value="new">New category…</option>
								</select>
							</label>
							{categoryId === "new" && (
								<label
									htmlFor="relationship-category-name"
									className="grid gap-1"
								>
									Category name
									<Input
										id="relationship-category-name"
										aria-label="Category name"
										maxLength={80}
										value={categoryName}
										onChange={(e) => setCategoryName(e.target.value)}
									/>
								</label>
							)}
							<label
								htmlFor="relationship-forward-label"
								className="grid gap-1"
							>
								Forward label (optional)
								<Input
									id="relationship-forward-label"
									aria-label="Forward label"
									maxLength={80}
									list="relationship-label-suggestions"
									placeholder="e.g. daughter of"
									value={forwardLabel}
									onChange={(e) => setForwardLabel(e.target.value)}
								/>
							</label>
							<label
								htmlFor="relationship-reverse-label"
								className="grid gap-1"
							>
								Reverse label (optional)
								<Input
									id="relationship-reverse-label"
									aria-label="Reverse label"
									maxLength={80}
									list="relationship-label-suggestions"
									placeholder="e.g. father of"
									value={reverseLabel}
									onChange={(e) => setReverseLabel(e.target.value)}
								/>
							</label>
							<datalist id="relationship-label-suggestions">
								{suggestedLabels.map((label) => (
									<option key={label} value={label} />
								))}
							</datalist>
							{error && (
								<p role="alert" className="text-destructive">
									{error}
								</p>
							)}
							<DialogFooter>
								<Button type="submit" disabled={create.isPending}>
									Save relationship
								</Button>
							</DialogFooter>
						</form>
					</DialogContent>
				</Dialog>
			</aside>
		</TooltipProvider>
	);
}
