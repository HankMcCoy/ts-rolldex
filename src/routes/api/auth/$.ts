import { createFileRoute } from "@tanstack/react-router";
import { getRequest } from "@tanstack/react-start/server";
import { auth } from "@/lib/auth";

export const Route = createFileRoute("/api/auth/$")({
	server: {
		handlers: {
			GET: async () => {
				const request = getRequest();
				return auth.handler(request);
			},
			POST: async () => {
				const request = getRequest();
				return auth.handler(request);
			},
		},
	},
});
