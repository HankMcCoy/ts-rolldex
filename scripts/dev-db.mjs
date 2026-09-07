/**
 * Manages the local Postgres container so `pnpm dev` is the only command
 * anyone has to remember. Only the database is containerised — the app keeps
 * running on the host under Vite.
 *
 * Usage: node scripts/dev-db.mjs [up|down|reset]   (default: up)
 *
 * Credentials come from DATABASE_URL rather than being duplicated in
 * docker-compose.yml, which is why every mode goes through here: `docker
 * compose` on its own has no POSTGRES_* values to interpolate and refuses to
 * run.
 */
import { spawnSync } from "node:child_process";
import { createServer } from "node:net";

const MODES = new Set(["up", "down", "reset"]);
const mode = process.argv[2] ?? "up";
if (!MODES.has(mode)) {
	fail(`Unknown mode "${mode}". Expected one of: ${[...MODES].join(", ")}.`);
}

function fail(message) {
	console.error(`\n[db] ${message}\n`);
	process.exit(1);
}

function run(command, args, options = {}) {
	return spawnSync(command, args, { stdio: "inherit", ...options });
}

const url = process.env.DATABASE_URL;
if (!url) {
	fail("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
}

let parsed;
try {
	parsed = new URL(url);
} catch {
	fail(`DATABASE_URL is not a valid URL: ${url}`);
}

// Pointing at a hosted database is a legitimate setup — don't fight it.
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", ""]);
if (!LOCAL_HOSTS.has(parsed.hostname)) {
	console.log(
		`[db] DATABASE_URL points at ${parsed.hostname}; skipping the local container.`,
	);
	process.exit(0);
}

if (!parsed.password) {
	fail(
		"DATABASE_URL has no password. The postgres image requires one — use\n" +
			"      postgres://postgres:postgres@localhost:5432/rolldex for local dev.",
	);
}

const dockerRunning = run("docker", ["info"], { stdio: "ignore" }).status === 0;
if (!dockerRunning) {
	// Nothing to stop is a success, not an error.
	if (mode !== "up") {
		console.log("[db] Docker isn't running — nothing to stop.");
		process.exit(0);
	}
	fail(
		"Docker isn't running, so the Postgres container can't start.\n\n" +
			"      Start Docker Desktop and try again:\n" +
			"        open -a Docker\n\n" +
			"      Or point DATABASE_URL at a database you're already running.",
	);
}

// docker-compose.yml reads these; keeping them derived means there is exactly
// one place (.env) where the connection details live.
const env = {
	...process.env,
	POSTGRES_USER: decodeURIComponent(parsed.username),
	POSTGRES_PASSWORD: decodeURIComponent(parsed.password),
	POSTGRES_DB: parsed.pathname.replace(/^\//, ""),
	POSTGRES_PORT: parsed.port || "5432",
};

function compose(args, errorMessage) {
	if (run("docker", ["compose", ...args], { env }).status !== 0) {
		fail(errorMessage);
	}
}

if (mode === "down") {
	console.log("[db] stopping postgres…");
	compose(["down"], "Failed to stop the container.");
	process.exit(0);
}

if (mode === "reset") {
	console.log("[db] destroying postgres and its data…");
	compose(["down", "-v"], "Failed to tear the container down.");
}

console.log("[db] starting postgres…");
compose(
	["up", "-d", "--wait"],
	"Postgres failed to become healthy. `docker compose logs postgres` has the detail.",
);

console.log("[db] applying migrations…");
if (run("node", ["scripts/migrate.mjs"], { env }).status !== 0) {
	fail("Migrations failed.");
}

/**
 * Vite's response to a busy port is a single line and a silent move to the
 * next one, which is easy to miss in a wall of startup output — you then load
 * :3000, get whatever stale server is squatting there, and conclude the app
 * didn't start. Fail loudly instead, and say what to kill.
 */
const appPort = Number(
	new URL(process.env.APP_URL ?? "http://localhost:3000").port || 3000,
);

const inUse = await new Promise((resolve) => {
	const probe = createServer();
	probe.once("error", (e) => resolve(e.code === "EADDRINUSE"));
	probe.once("listening", () => probe.close(() => resolve(false)));
	probe.listen(appPort, "127.0.0.1");
});

if (inUse) {
	const lsof = spawnSync("lsof", ["-nP", `-iTCP:${appPort}`, "-sTCP:LISTEN"], {
		encoding: "utf8",
	});
	fail(
		`Port ${appPort} is already in use, so Vite would quietly start on another\n` +
			"      port and :3000 would serve a stale process.\n\n" +
			`${(lsof.stdout ?? "").trim() || "      (could not identify the process)"}\n\n` +
			`      Free it with:\n        kill $(lsof -nP -iTCP:${appPort} -sTCP:LISTEN -t)`,
	);
}

console.log(`[db] ready — starting vite on :${appPort}…`);
