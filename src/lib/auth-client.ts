import { createAuthClient } from "better-auth/react";

const baseURL = import.meta.env.VITE_APP_URL;
if (!baseURL) throw new Error("VITE_APP_URL is not set");

export const authClient = createAuthClient({ baseURL });

export const { signIn, signOut, signUp, useSession } = authClient;
