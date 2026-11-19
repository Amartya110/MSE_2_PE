<<<<<<< HEAD
# DSPAA

## Local setup

1. Copy `.env.example` to `.env`.
2. Set `MONGODB_URI` and replace `JWT_SECRET` with a random value of at least 32 bytes.
3. Optionally add an account username to `ADMIN_USERNAMES` before registering it. Admin accounts can curate the shared problem bank.
4. Start MongoDB, then run `npm install`.
5. Run `npm run dev` to start Express and Next.js together.

The Next.js server proxies `/api/*` to `API_SERVER_URL` (default `http://localhost:4000`). Keep `JWT_SECRET` server-side; do not use `NEXT_PUBLIC_` prefixes for secrets.

## Stage 4 routes

- `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, and `GET /api/auth/me` manage sessions using an HTTP-only, SameSite=Strict cookie.
- Profile sync and personal weak-tag/recommendation endpoints require authentication and use the signed-in username as the profile owner. The request body cannot select another owner.
- `GET /api/users/:username` is a public, credential-free profile view. `/u/:username` renders it with server-side rendering.
- `/problems` is statically generated from `data/problemCatalog.js`. Shared problem-bank writes require an admin account.
- The Problemset page builds a deterministic 10-week practice plan from the signed-in user's weak tags and up to 100 rated, unsolved problems. Weak-tag matches are prioritized; additional problems are selected from a wider rating range when available.
- `POST /api/executions/run` runs bounded sample/custom tests in the configured Judge0 sandbox. It requires a session and is rate-limited to five runs per minute. Supported languages are C++17, Python 3, Java 17, and JavaScript. Source is limited to 20 KB; requests may contain at most three test cases; each input/output is limited to 4 KB. Temporary source files are permission-restricted and removed after each run.

The problem-sheet catalog is a bundled static list; personalized recommendations use MongoDB's `problemBank` collection.

Run `npm run seed:problems` once after configuring MongoDB to insert the bundled starter problems into `problemBank`. To add rated Codeforces coverage, run `npm run import:codeforces`; it imports problem metadata from the official Codeforces problemset API in batches. Both operations are idempotent and only insert missing platform/problem pairs; they do not overwrite existing admin-curated records.

## Code execution sandbox

Set `JUDGE0_API_URL` to a trusted HTTPS Judge0 deployment and, if it requires authentication, configure `JUDGE0_API_KEY` on the backend only. HTTP is accepted only for loopback development. Do not execute submitted source with local compilers or Node child processes. Judge0 must be deployed with its normal isolated, resource-limited worker configuration; do not expose an unauthenticated sandbox or enable worker network access.

## LeetCode workflow and observability

The workspace does not collect or replay `LEETCODE_SESSION` or `csrftoken` values, and does not automate LeetCode's undocumented run/submit endpoints. For LeetCode problems, use **Copy for LeetCode** and **View original** to paste and submit directly on LeetCode. The in-app **Run** action remains an isolated Judge0 sample/custom test; platform verdicts and solved status come from the normal profile sync.

The API emits JSON request logs with a request ID, method, status, and duration; request bodies, cookies, and authorization headers are not logged. Browser execution telemetry records only run metadata (problem/platform/language/status/duration), never source code, input, or output, and is written to the browser console. The API returns the correlation ID in `X-Request-ID`. Render collects backend stdout/stderr in its service logs; browser console events are not automatically ingested by Vercel. Local sync-file logs and caches are ephemeral in hosted containers.

## Production deployment

**Render API:** Create a Blueprint from `render.yaml`. Provide a production MongoDB connection string and Judge0 key through Render's environment settings. The template creates a fresh `JWT_SECRET` and enables one trusted reverse-proxy hop for client IP-aware rate limiting. Keep MongoDB network access restricted to the Render service. The included rate limiter uses in-memory storage; keep a single API instance unless you replace it with a shared store before scaling horizontally.

**Vercel frontend:** Import this repository as a Next.js project. Use `npm run build` as the build command (or the detected default), and set the server-side `API_SERVER_URL` environment variable to the HTTPS Render API origin, for example `https://your-api.onrender.com`. Do not set `NEXT_PUBLIC_API_BASE_URL` for production secrets or configure backend secrets on Vercel. Deploy frontend and backend over HTTPS so the HTTP-only session cookie remains secure. The frontend calls the API through the existing same-origin rewrite.

Store MongoDB/Judge0/JWT credentials only in the backend's secret environment settings, never in source control or browser-visible variables.
=======

>>>>>>> 1c651f31f8524aec730d1b69dd135fd441dd38ae
