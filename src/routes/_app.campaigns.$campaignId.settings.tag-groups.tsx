import { createFileRoute } from "@tanstack/react-router";
import {
	ChevronDown,
	ChevronRight,
	Layers,
	MoreHorizontal,
	Plus,
	Search,
	Tag,
	X,
} from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { useState } from "react";
import { Page } from "@/components/Page";
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
	BundleMutationError,
	patchRemoveTagGroup,
	patchSaveTagGroup,
	useBundleMutation,
	useCampaign,
	useNouns,
	useTagGroups,
	useTags,
} from "@/lib/queries";
import {
	MAX_TAGS_PER_ENTITY,
	normalizeTagName,
	resolveTagRefs,
	TAG_MAX_LENGTH,
	type TagRef,
	tagKey,
} from "@/lib/tags";
import {
	createTagGroup,
	deleteTagGroup,
	updateTagGroup,
} from "@/server/tag-groups";

export const Route = createFileRoute(
	"/_app/campaigns/$campaignId/settings/tag-groups",
)({
	head: () => ({ meta: [{ title: "Tag groups - Rolldex" }] }),
	component: TagGroupsPage,
});
type Editor = { kind: "group"; id?: string } | { kind: "tag"; id: string };

function TagGroupsPage() {
	const { campaignId } = Route.useParams();
	const { campaign, accessLevel } = useCampaign(campaignId);
	const groups = useTagGroups(campaignId);
	const tags = useTags(campaignId);
	const usedTagIds = new Set(useNouns(campaignId).flatMap((n) => n.tagIds));
	const [expanded, setExpanded] = useState<Set<string>>(new Set());
	const [search, setSearch] = useState("");
	const [editor, setEditor] = useState<Editor | null>(null);
	const [name, setName] = useState("");
	const [error, setError] = useState<string | null>(null);
	const save = useBundleMutation({
		campaignId,
		mutationFn: (vars: {
			id: string;
			name: string;
			tags: TagRef[];
			updating: boolean;
		}) =>
			(vars.updating ? updateTagGroup : createTagGroup)({
				data: { campaignId, ...vars },
			}),
		patch: (bundle, vars) =>
			patchSaveTagGroup(bundle, { id: vars.id, name: vars.name }, vars.tags),
	});
	const remove = useBundleMutation({
		campaignId,
		mutationFn: (id: string) => deleteTagGroup({ data: { campaignId, id } }),
		patch: patchRemoveTagGroup,
	});
	const pending = save.isPending || remove.isPending;
	const groupTags = (id: string) => tags.filter((t) => t.groupId === id);
	const editedGroup = groups.find((g) => g.id === editor?.id);
	const query = tagKey(search);
	const visibleGroups = groups.filter(
		(g) =>
			tagKey(g.name).includes(query) ||
			groupTags(g.id).some((t) => tagKey(t.name).includes(query)),
	);
	function showEditor(next: Editor) {
		setEditor(next);
		setName(
			next.kind === "group"
				? (groups.find((g) => g.id === next.id)?.name ?? "")
				: "",
		);
		setError(null);
	}
	function report(e: unknown) {
		setError(
			e instanceof BundleMutationError
				? e.message
				: "Could not save tag groups. Please try again.",
		);
	}
	async function removeGroup(id: string, groupName: string) {
		if (
			!confirm(
				`Delete group "${groupName}"? Assigned tags will be kept as ungrouped tags. Unused tags will be removed.`,
			)
		)
			return;
		setError(null);
		try {
			await remove.mutateAsync(id);
		} catch (e) {
			report(e);
		}
	}
	const breadcrumbs = [
		{
			label: campaign.name,
			to: "/campaigns/$campaignId" as const,
			params: { campaignId },
		},
		{
			label: "Settings",
			to: "/campaigns/$campaignId/settings" as const,
			params: { campaignId },
		},
	];
	return (
		<Page title="Tag groups" breadcrumbs={breadcrumbs}>
			{accessLevel !== "ADMIN" ? (
				<p>You don't have permission to manage tag groups.</p>
			) : (
				<div className="max-w-3xl space-y-5">
					<p className="text-sm text-muted-foreground">
						Organize related tags into groups. Choose one tag per group on an
						entity or session.
					</p>
					<div className="flex items-center gap-3">
						<div className="relative min-w-0 flex-1">
							<Search className="pointer-events-none absolute top-2.5 left-3 size-3.5 text-muted-foreground" />
							<Input
								aria-label="Filter tag groups"
								className="pl-9"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								placeholder="Filter groups and tags…"
							/>
						</div>
						<Button
							size="sm"
							onClick={() => showEditor({ kind: "group" })}
							disabled={pending}
						>
							<Plus className="size-3.5" />
							New group
						</Button>
					</div>
					{error && !editor && (
						<p role="alert" className="text-sm text-destructive">
							{error}
						</p>
					)}
					<div className="overflow-hidden rounded-xl border border-[var(--line)] bg-white/70">
						<div className="border-b border-[var(--line)] px-4 py-2.5 text-xs text-muted-foreground">
							{groups.length} {groups.length === 1 ? "group" : "groups"}
						</div>
						{visibleGroups.length === 0 && (
							<div className="px-6 py-12 text-center">
								<Layers className="mx-auto mb-3 size-6 text-muted-foreground" />
								<p className="text-sm font-medium">
									{query ? "No matching groups" : "Group related tags"}
								</p>
								<p className="mt-1 text-sm text-muted-foreground">
									{query
										? "Try a different group or tag name."
										: "Try Status with Active, Paused, and Complete."}
								</p>
								{!query && (
									<Button
										variant="outline"
										size="sm"
										className="mt-4"
										onClick={() => showEditor({ kind: "group" })}
									>
										Create a group
									</Button>
								)}
							</div>
						)}
						{visibleGroups.map((group) => {
							const children = groupTags(group.id);
							const isOpen = expanded.has(group.id) || Boolean(query);
							const shownTags =
								query && !tagKey(group.name).includes(query)
									? children.filter((t) => tagKey(t.name).includes(query))
									: children;
							return (
								<section
									key={group.id}
									className="border-b border-[var(--line)] last:border-b-0"
									aria-label={`${group.name} group`}
								>
									<div className="flex items-center gap-1 px-2 py-1 hover:bg-muted/50">
										<button
											type="button"
											aria-expanded={isOpen}
											aria-controls={`group-${group.id}`}
											onClick={() =>
												setExpanded((previous) => {
													const next = new Set(previous);
													if (next.has(group.id)) next.delete(group.id);
													else next.add(group.id);
													return next;
												})
											}
											className="flex min-w-0 flex-1 items-center gap-2 rounded px-2 py-2 text-left text-sm focus-visible:outline-2 focus-visible:outline-ring"
										>
											{isOpen ? (
												<ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
											) : (
												<ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
											)}
											<Layers className="size-4 shrink-0 text-muted-foreground" />
											<span className="truncate font-medium">{group.name}</span>
											<span className="text-xs text-muted-foreground">
												{children.length}
											</span>
										</button>
										<span className="mr-2 hidden text-xs text-muted-foreground sm:block">
											{group.isEntityType
												? "Required entity type"
												: "Single choice"}
										</span>
										<Button
											variant="ghost"
											size="icon-sm"
											aria-label={`Add tag to ${group.name}`}
											disabled={
												pending || children.length >= MAX_TAGS_PER_ENTITY
											}
											onClick={() => showEditor({ kind: "tag", id: group.id })}
										>
											<Plus className="size-3.5" />
										</Button>
										<DropdownMenu.Root>
											<DropdownMenu.Trigger asChild>
												<Button
													variant="ghost"
													size="icon-sm"
													aria-label={`Actions for ${group.name}`}
													disabled={pending}
												>
													<MoreHorizontal className="size-4" />
												</Button>
											</DropdownMenu.Trigger>
											<DropdownMenu.Portal>
												<DropdownMenu.Content
													align="end"
													sideOffset={4}
													className="z-50 min-w-40 rounded-lg border bg-popover p-1 text-sm shadow-md"
												>
													<DropdownMenu.Item
														className="cursor-pointer rounded px-2 py-1.5 outline-none data-highlighted:bg-muted"
														onSelect={() =>
															showEditor({ kind: "group", id: group.id })
														}
													>
														Rename group
													</DropdownMenu.Item>
													<DropdownMenu.Item
														className="cursor-pointer rounded px-2 py-1.5 text-destructive outline-none data-highlighted:bg-muted data-disabled:opacity-40 data-disabled:pointer-events-none"
														disabled={group.isEntityType}
														onSelect={() =>
															void removeGroup(group.id, group.name)
														}
													>
														Delete group
													</DropdownMenu.Item>
												</DropdownMenu.Content>
											</DropdownMenu.Portal>
										</DropdownMenu.Root>
									</div>
									{isOpen && (
										<div id={`group-${group.id}`} className="pb-2">
											{shownTags.map((tag) => (
												<div
													key={tag.id}
													className="group flex items-center gap-2 py-1 pr-3 pl-14 hover:bg-muted/40"
												>
													<Tag className="size-3.5 shrink-0 text-muted-foreground" />
													<span className="min-w-0 flex-1 truncate text-sm">
														{tag.name}
													</span>
													<Button
														variant="ghost"
														size="icon-sm"
														aria-label={`Remove ${tag.name} from ${group.name}`}
														title={
															group.isEntityType
																? "Reassign entities before removing a type"
																: "Remove from group; keep existing assignments"
														}
														disabled={
															pending ||
															(group.isEntityType &&
																(usedTagIds.has(tag.id) ||
																	children.length === 1))
														}
														onClick={async () => {
															setError(null);
															try {
																await save.mutateAsync({
																	...group,
																	tags: children.filter((t) => t.id !== tag.id),
																	updating: true,
																});
															} catch (e) {
																report(e);
															}
														}}
													>
														<X className="size-3 text-muted-foreground" />
													</Button>
												</div>
											))}
											<button
												type="button"
												disabled={
													pending || children.length >= MAX_TAGS_PER_ENTITY
												}
												onClick={() =>
													showEditor({ kind: "tag", id: group.id })
												}
												className="flex w-full items-center gap-2 py-2 pr-4 pl-14 text-left text-sm text-muted-foreground hover:bg-muted/40 hover:text-foreground disabled:opacity-50"
											>
												<Plus className="size-3.5" />
												{children.length >= MAX_TAGS_PER_ENTITY
													? "Group limit reached"
													: "Add tag"}
											</button>
										</div>
									)}
								</section>
							);
						})}
					</div>
					<Dialog
						open={editor !== null}
						onOpenChange={(open) => {
							if (!open && !pending) {
								setEditor(null);
								setError(null);
							}
						}}
					>
						<DialogContent showCloseButton={!pending}>
							<DialogHeader>
								<DialogTitle>
									{editor?.kind === "tag"
										? `Add tag to ${editedGroup?.name ?? "group"}`
										: editor?.id
											? "Rename group"
											: "New tag group"}
								</DialogTitle>
								<DialogDescription>
									{editor?.kind === "tag"
										? "Enter a new tag or choose an existing ungrouped tag."
										: "Group related tags so only one can be selected at a time."}
								</DialogDescription>
							</DialogHeader>
							<form
								className="space-y-4"
								onSubmit={async (e) => {
									e.preventDefault();
									if (!editor) return;
									setError(null);
									const id = editor.id ?? crypto.randomUUID();
									try {
										if (editor.kind === "tag") {
											if (!editedGroup) return;
											await save.mutateAsync({
												...editedGroup,
												tags: resolveTagRefs(tags, [
													...groupTags(id).map((t) => t.name),
													name,
												]),
												updating: true,
											});
										} else
											await save.mutateAsync({
												id,
												name: normalizeTagName(name),
												tags: editor.id ? groupTags(id) : [],
												updating: Boolean(editor.id),
											});
										setExpanded((previous) => new Set([...previous, id]));
										setEditor(null);
										setName("");
									} catch (e) {
										report(e);
									}
								}}
							>
								<div className="space-y-2">
									<label
										htmlFor="tag-group-name"
										className="text-sm font-medium"
									>
										{editor?.kind === "tag" ? "Tag name" : "Group name"}
									</label>
									<Input
										id="tag-group-name"
										required
										maxLength={editor?.kind === "tag" ? TAG_MAX_LENGTH : 100}
										value={name}
										onChange={(e) => setName(e.target.value)}
										disabled={pending}
										placeholder={
											editor?.kind === "tag" ? "e.g. Active" : "e.g. Status"
										}
										list={editor?.kind === "tag" ? "ungrouped-tags" : undefined}
									/>
									<datalist id="ungrouped-tags">
										{tags
											.filter((t) => !t.groupId)
											.map((t) => (
												<option key={t.id} value={t.name} />
											))}
									</datalist>
								</div>
								{error && (
									<p role="alert" className="text-sm text-destructive">
										{error}
									</p>
								)}
								<DialogFooter>
									<Button
										type="button"
										variant="outline"
										disabled={pending}
										onClick={() => {
											setEditor(null);
											setError(null);
										}}
									>
										Cancel
									</Button>
									<Button type="submit" disabled={pending || !name.trim()}>
										{save.isPending
											? "Saving…"
											: editor?.kind === "tag"
												? "Add tag"
												: editor?.id
													? "Save name"
													: "Create group"}
									</Button>
								</DialogFooter>
							</form>
						</DialogContent>
					</Dialog>
				</div>
			)}
		</Page>
	);
}
