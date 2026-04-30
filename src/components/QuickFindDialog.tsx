import { useNavigate } from "@tanstack/react-router";
import { PlusIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import { useNouns, useSessions } from "@/lib/queries";

interface Props {
	campaignId: string;
	accessLevel: "ADMIN" | "READ_ONLY";
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

const RESULT_LIMIT = 5;

export function QuickFindDialog({ campaignId, accessLevel }: Props) {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");

	const navigate = useNavigate();
	const allNouns = useNouns(campaignId);
	const allSessions = useSessions(campaignId);

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
		if (!open) setQuery("");
	}, [open]);

	const results = useMemo<{
		nouns: NounResult[];
		sessions: SessionResult[];
	}>(() => {
		const q = query.trim().toLowerCase();
		if (!q) return { nouns: [], sessions: [] };
		const matchedNouns: NounResult[] = [];
		for (const n of allNouns) {
			if (n.name.toLowerCase().includes(q)) {
				matchedNouns.push({
					id: n.id,
					name: n.name,
					nounType: n.nounType,
					imageUrl: n.imageUrl,
				});
				if (matchedNouns.length >= RESULT_LIMIT) break;
			}
		}
		const matchedSessions: SessionResult[] = [];
		for (const s of allSessions) {
			if (s.name.toLowerCase().includes(q)) {
				matchedSessions.push({ id: s.id, name: s.name });
				if (matchedSessions.length >= RESULT_LIMIT) break;
			}
		}
		return { nouns: matchedNouns, sessions: matchedSessions };
	}, [query, allNouns, allSessions]);

	function handleSelectNoun(nounId: string) {
		setOpen(false);
		navigate({
			to: "/campaigns/$campaignId/nouns/$nounId",
			params: { campaignId, nounId },
		});
	}

	function handleSelectSession(sessionId: string) {
		setOpen(false);
		navigate({
			to: "/campaigns/$campaignId/sessions/$sessionId",
			params: { campaignId, sessionId },
		});
	}

	function handleCreateEntity(name: string) {
		setOpen(false);
		navigate({
			to: "/campaigns/$campaignId/nouns/new",
			params: { campaignId },
			search: { name },
		});
	}

	const hasResults = results.nouns.length > 0 || results.sessions.length > 0;
	const trimmedQuery = query.trim();
	const showCreate = accessLevel === "ADMIN" && trimmedQuery.length > 0;

	return (
		<CommandDialog open={open} onOpenChange={setOpen} title="Quick find">
			<Command shouldFilter={false}>
				<CommandInput
					placeholder="Search entities and sessions…"
					value={query}
					onValueChange={setQuery}
				/>
				<CommandList>
					{query && !hasResults && !showCreate && (
						<CommandEmpty>No results found.</CommandEmpty>
					)}
					{results.nouns.length > 0 && (
						<CommandGroup heading="Entities">
							{results.nouns.map((n) => (
								<CommandItem key={n.id} onSelect={() => handleSelectNoun(n.id)}>
									<EntityAvatar
										entityType={n.nounType}
										imageUrl={n.imageUrl}
										name={n.name}
										className="size-6 rounded-md"
									/>
									<span className="flex-1 truncate">{n.name}</span>
									<span className="text-xs text-muted-foreground">
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
									onSelect={() => handleSelectSession(s.id)}
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
					{showCreate && hasResults && <CommandSeparator />}
					{showCreate && (
						<CommandGroup heading="Create">
							<CommandItem
								key={`create-${trimmedQuery}`}
								onSelect={() => handleCreateEntity(trimmedQuery)}
							>
								<span className="flex size-6 items-center justify-center rounded-md border border-[var(--line)] bg-white/90 text-muted-foreground">
									<PlusIcon className="size-4" />
								</span>
								<span className="flex-1 truncate">
									Create entity “{trimmedQuery}”
								</span>
							</CommandItem>
						</CommandGroup>
					)}
				</CommandList>
			</Command>
		</CommandDialog>
	);
}
