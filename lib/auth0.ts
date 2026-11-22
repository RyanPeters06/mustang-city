import { Auth0Client } from "@auth0/nextjs-auth0/server";
import { NextResponse } from "next/server";

const { AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, AUTH0_SECRET, APP_BASE_URL } = process.env;

export const isUwoEmail = (email?: string | null) => !!email && email.toLowerCase().endsWith("@uwo.ca");

/**
 * Auth0 client, or null when this deployment has no Auth0 config (the app keeps working
 * without sign-in — Constitution IV). The primary @uwo.ca gate is the Auth0 Login Action in
 * auth0/uwo-only-action.js; this callback re-checks in case the Action is missing.
 */
export const auth0 =
  AUTH0_DOMAIN && AUTH0_CLIENT_ID && AUTH0_CLIENT_SECRET && AUTH0_SECRET
    ? new Auth0Client({
        domain: AUTH0_DOMAIN,
        clientId: AUTH0_CLIENT_ID,
        clientSecret: AUTH0_CLIENT_SECRET,
        secret: AUTH0_SECRET,
        appBaseUrl: APP_BASE_URL,
        authorizationParameters: { scope: "openid profile email" },
        async onCallback(error, ctx, session) {
          const base = APP_BASE_URL ?? "";
          if (error) return NextResponse.redirect(new URL("/?denied=uwo", base));
          if (session && !isUwoEmail(session.user.email)) {
            // Auth0 matches logout URLs exactly (query string included), so return to the bare site
            // URL — already in "Allowed Logout URLs" — and carry the notice in a one-shot cookie.
            const returnTo = new URL(base).origin;
            const res = NextResponse.redirect(new URL(`/auth/logout?returnTo=${encodeURIComponent(returnTo)}`, base));
            res.cookies.set("mc_denied", "uwo", { path: "/", maxAge: 120, sameSite: "lax" });
            return res;
          }
          return NextResponse.redirect(new URL(ctx.returnTo ?? "/", base));
        },
      })
    : null;
