# HTTP routes (this feature)

| Route | Provider | Behaviour |
|---|---|---|
| `GET /auth/login` | Auth0 SDK via `proxy.ts` | Redirect to Universal Login. 404 when Auth0 unconfigured. |
| `GET /auth/callback` | Auth0 SDK | Creates session; non-@uwo.ca → `/auth/logout?returnTo=<base>/?denied=uwo` |
| `GET /auth/logout` | Auth0 SDK | Clears session, returns to `/` (or `returnTo`). |
| `GET /auth/profile` | Auth0 SDK | 200 `{ email, name, picture, ... }` when signed in; 401/204 when not; 404 when unconfigured. |
| `GET /manifest.webmanifest`, `/icon-192.png`, `/icon-512.png`, `/apple-icon` | Next | Static PWA assets. |

Query `?denied=uwo` on `/` → Profile sheet opens with "Only @uwo.ca accounts can sign in."
