import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { EntityAvatar } from "@/components/EntityAvatar";
import {
	Command,
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
} from "@/components/ui/command";
import { NOUN_TYPE_LABELS, type NounType } from "@/lib/noun-types";
import { quickFind } from "@/server/search";

interface Props {
	campaignId: string;
}

interface NounResult {
	id: string;
	name: string;
	nounType: NounType;
	imageUrl: string | null;
}

interface SessionResult {
	id: string;
	name: string;
}

export function QuickFindDialog({ campaignId }: Props) {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [results, setResults] = useState<{
		nouns: NounResult[];
		sessions: SessionResult[];
	}>({ nouns: [], sessions: [] });

	const navigate = useNavigate();
	const find = useServerFn(quickFind);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		function onKey(e: KeyboardEvent) {
			if ((e.metaKey || e.ctrlKey) && e.key === "k") {
				e.preventDefault();
				setOpen((o) => !o);
			}
		}
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, []);

	useEffect(() => {
		if (!open) {
			setQuery("");
			setResults({ nouns: [], sessions: [] });
		}
	}, [open]);

	function handleQueryChange(value: string) {
		setQuery(value);
		if (debounceRef.current) clearTimeout(debounceRef.current);
		if (!value.trim()) {
			setResults({ nouns: [], sessions: [] });
			return;
		}
		debounceRef.current = setTimeout(async () => {
			const data = await find({ data: { campaignId, query: value } });
			setResults(data);
		}, 150);
	}

	function handleSelect(href: string) {
		setOpen(false);
		navigate({ href });
	}

	const hasResults = results.nouns.length > 0 || results.sessions.length > 0;

	return (
		<CommandDialog open={open} onOpenChange={setOpen} title="Quick find">
			<Command shouldFilter={false}>
				<CommandInput
					placeholder="Search entities and sessions…"
					value={query}
					onValueChange={handleQueryChange}
				/>
				<CommandList>
					{query && !hasResults && (
						<CommandEmpty>No results found.</CommandEmpty>
					)}
					{results.nouns.length > 0 && (
						<CommandGroup heading="Entities">
							{results.nouns.map((n) => (
								<CommandItem
									key={n.id}
									onSelect={() =>
										handleSelect(`/campaigns/${campaignId}/nouns/${n.id}`)
									}
								>
									<EntityAvatar
										entityType={n.nounType}
										imageUrl={n.imageUrl}
										name={n.name}
										className="size-6 rounded-md"
									/>
									<span>{n.name}</span>
									<span className="ml-auto text-xs text-muted-foreground">
										{NOUN_TYPE_LABELS[n.nounType]}
									</span>
								</CommandItem>
							))}
						</CommandGroup>
					)}
					{results.nouns.length > 0 && results.sessions.length > 0 && (
						<CommandSeparator />
					)}
					{results.sessions.length > 0 && (
						<CommandGroup heading="Sessions">
							{results.sessions.map((s) => (
								<CommandItem
									key={s.id}
									onSelect={() =>
										handleSelect(`/campaigns/${campaignId}/sessions/${s.id}`)
									}
								>
									<EntityAvatar
										entityType="SESSION"
										imageUrl={null}
										name={s.name}
										className="size-6 rounded-md"
									/>
									{s.name}
								</CommandItem>
							))}
						</CommandGroup>
					)}
				</CommandList>
			</Command>
		</CommandDialog>
	);
}
