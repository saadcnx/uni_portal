# Antigravity Prompt Playbook

Forty-nine small prompts, in order. Paste one prompt at a time, verify it, commit, then continue.

## 1. How to Use
1. Put the docs folder in the project root as /docs and open the project folder as the workspace in Antigravity.
2. Paste one prompt at a time. Every prompt ends with a Verify line: run it, and do not move on until it passes. Commit after every prompt (for example "P10A auth service").
3. Each prompt creates about 5 files or fewer (tiny boilerplate files do not count) and ends with a Stop rule, so the agent never runs ahead to the next step.
4. If your version has Planning and Fast modes, use Planning for the heavier prompts (P08A to P16 and P24 to P33B) and Fast for small ones. Use the strongest model available for the heavy prompts.
5. Start a new conversation at the beginning of each phase to keep the context small. Every prompt names the documents to read, so nothing is lost.
6. If something fails or looks wrong, paste the Fix prompt below instead of asking for a rewrite.
7. Optional: if your Antigravity version supports workspace rules, copy docs/RULES.md into that rules location so it is always loaded. Check your version for the exact folder.

### Fix prompt template
```prompt
The last step has a problem: [paste the error text or describe what is wrong]. Re-read docs/RULES.md and the documents named in the previous prompt. Fix only this problem, do not change unrelated files, run the verify command again, and tell me exactly what you changed.
```

### Prompt numbering
Prompts keep their original numbers. A letter (A, B) means the original step was split into smaller parts. Run A, verify, commit, then run B. Examples: P05A then P05B, P10A then P10B.

## 2. Phases

| Phase | Prompts | Count | Result |
|---|---|---|---|
| 0 Setup | P01, P02 | 2 | Docs read, repository skeleton |
| 1 Backend | P03, P04, P05A, P05B, P06, P07, P08A, P08B, P09, P10A, P10B, P11, P12, P13, P14A, P14B, P15, P16, P17, P18 | 20 | Complete API with tests |
| STOP | Postman checkpoint | - | You test every API in Postman |
| 2 Frontend foundation | P19, P20, P21, P22A, P22B, P23, P24, P25A, P25B, P26 | 10 | Tokens, theme, shared components |
| 3 Auth and shell | P27A, P27B, P28A, P28B | 4 | Login, route guard, sidebar layout |
| 4 Features | P29A, P29B, P30A, P30B, P31A, P31B, P32A, P32B, P33 | 9 | Dashboard, labs, users, patients |
| 5 Quality and delivery | P34, P35, P36, P37 | 4 | Performance, design audit, Docker, final review |

Total: 49 prompts.

## Phase 0: Setup

## P01: Read the documents (no code)
Files the agent reads: every file in /docs.
```prompt
You are going to build a multi-tenant Laboratory Management System with me. Read every file in /docs: README.md, RULES.md, FEATURES.md, ARCHITECTURE.md, BACKEND.md, API_CONTRACT.md, SECURITY.md, FRONTEND.md, DESIGN.md, PERFORMANCE.md and PROMPTS.md. Do not write any code yet.
Reply with: (1) a 10 line summary of the system, (2) the build phases you understand, (3) any conflicts, gaps or questions you found in the documents. Wait for my confirmation before doing anything else.
```

## P02: Repository skeleton
Files the agent reads: docs/RULES.md, docs/ARCHITECTURE.md section 2.
```prompt
Read docs/RULES.md and docs/ARCHITECTURE.md (section 2).
In the project root create the folders frontend and backend (empty), keep /docs as it is, and create: README.md (project name, one paragraph description, a table of the docs, and placeholder run instructions), .gitignore (node_modules, dist, .next, .env, .env.local, coverage, logs, OS files), .editorconfig (UTF-8, LF, 2 spaces). Run git init and make the first commit "chore: repository skeleton".
Do not create any application code.
Verify: git status shows a clean tree and git log shows the commit
Rules for this step: only create or change the files named above (tiny supporting edits such as an export or an import are fine). Do not start the next step. When finished, run the verify command, fix any failure, then reply with: files created or changed, commands run with their results, and anything I should check manually.
```

## Phase 1: Backend

## P03: Backend scaffold and tooling
Files the agent reads: docs/RULES.md, docs/BACKEND.md (sections 1, 3, 11), docs/ARCHITECTURE.md (section 3).
```prompt
Read docs/RULES.md, docs/BACKEND.md (sections 1, 3 and 11) and docs/ARCHITECTURE.md (section 3).
Inside /backend create a strict TypeScript Node project. Create: package.json (scripts: dev using tsx watch, build, start, lint, test, seed), tsconfig.json (strict, ES2022, outDir dist), eslint.config.mjs, .prettierrc, .gitignore, .env.example (every variable from BACKEND.md section 3 with safe example values), vitest.config.ts.
Install dependencies: express@5, mongoose, zod, jsonwebtoken, bcryptjs, cookie-parser, cors, helmet, compression, express-rate-limit, pino, pino-http, @sentry/node, dotenv. Dev dependencies: typescript, tsx, vitest, supertest, mongodb-memory-server, pino-pretty, eslint, typescript-eslint, prettier and all needed @types packages.
Create the empty folder tree from BACKEND.md section 1 with a .gitkeep in every empty folder.
Acceptance: npm run build and npm run lint pass. No application code yet.
Verify: cd backend, then npm run build && npm run lint
Rules for this step: only create or change the files named above (tiny supporting edits such as an export or an import are fine). Do not start the next step. When finished, run the verify command, fix any failure, then reply with: files created or changed, commands run with their results, and anything I should check manually.
```

## P04: Config and logging
Files the agent reads: docs/RULES.md, docs/BACKEND.md (sections 3, 9), docs/PERFORMANCE.md (section 2).
```prompt
Read docs/RULES.md, docs/BACKEND.md (sections 3 and 9) and docs/PERFORMANCE.md (section 2).
Create in /backend/src/config:
1. env.ts: load dotenv, validate every variable with zod (coercing numbers), export a typed frozen env object, and exit with a clear message when validation fails.
2. logger.ts: a pino logger with the redaction rules from BACKEND.md section 9, pino-pretty only when NODE_ENV is development, level from LOG_LEVEL.
3. db.ts: connectDB and disconnectDB using mongoose with maxPoolSize 20, serverSelectionTimeoutMS 5000, autoIndex only outside production, and connection event logging through the logger.
4. sentry.ts: initSentry that does nothing when SENTRY_DSN is empty and exports captureException helper.
Acceptance: typecheck and lint pass. A small script or test shows that missing env values produce a clear error.
Verify: cd backend, then npm run build && npm run lint, and show the clear error produced by a missing env value
Rules for this step: only create or change the files named above (tiny supporting edits such as an export or an import are fine). Do not start the next step. When finished, run the verify command, fix any failure, then reply with: files created or changed, commands run with their results, and anything I should check manually.
```

## P05A: Constants, tenant context, errors and responses
Files the agent reads: docs/RULES.md, docs/BACKEND.md (sections 2, 5, 7), docs/FEATURES.md (section 2), docs/SECURITY.md.
```prompt
Read docs/RULES.md, docs/BACKEND.md (sections 2, 5 and 7), docs/FEATURES.md (section 2) and docs/SECURITY.md.
Create in /backend/src:
- constants/roles.ts: ROLES as const object, Role type, isRole helper.
- constants/permissions.ts: PERMISSIONS map (tenant:manage, user:manage, patient:create, patient:read, patient:update, patient:delete, dashboard:read) matching the permission matrix in FEATURES.md, and hasPermission(role, permission).
- context/tenantContext.ts: AsyncLocalStorage with type TenantContext { tenantId: string | null; userId: string; role: Role; isSuperAdmin: boolean } and helpers runWithTenant and getTenantContext.
- utils/ApiError.ts: class with statusCode, message, errors, and static helpers badRequest, unauthorized, forbidden, notFound, conflict, tooMany.
- utils/apiResponse.ts: sendOk, sendCreated, sendPaginated following the envelope in BACKEND.md section 7.
Add tests/permissions.test.ts covering hasPermission for every role.
Verify: cd backend, then npm run build && npm test
Rules for this step: only create or change the files named above (tiny supporting edits such as an export or an import are fine). Do not start the next step. When finished, run the verify command, fix any failure, then reply with: files created or changed, commands run with their results, and anything I should check manually.
```

## P05B: Pagination, cookies, tokens and Express types
Files the agent reads: docs/RULES.md, docs/BACKEND.md (sections 6, 8), docs/SECURITY.md, docs/API_CONTRACT.md (Cookies).
```prompt
Read docs/RULES.md, docs/BACKEND.md (sections 6 and 8), docs/SECURITY.md and docs/API_CONTRACT.md (Cookies section).
Create in /backend/src:
- utils/paginate.ts: as described in BACKEND.md section 8 (parallel find and count with Promise.all, lean, limit cap 100, defaults page 1 and limit 20) plus an escapeRegex and prefixSearch helper (anchored, case-insensitive, escaped).
- utils/cookies.ts: setAuthCookies and clearAuthCookies for lms_access, lms_refresh and lms_session exactly as in BACKEND.md section 6.
- utils/tokens.ts: signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken, hashToken (sha256).
- types/express.d.ts: augment Request with user and validated.
Add tests/paginate.test.ts for search escaping, limit cap and defaults.
Verify: cd backend, then npm run build && npm test
Rules for this step: only create or change the files named above (tiny supporting edits such as an export or an import are fine). Do not start the next step. When finished, run the verify command, fix any failure, then reply with: files created or changed, commands run with their results, and anything I should check manually.
```

## P06: Middlewares
Files the agent reads: docs/RULES.md, docs/BACKEND.md (sections 2, 7, 9), docs/SECURITY.md.
```prompt
Read docs/RULES.md, docs/BACKEND.md (sections 2, 7 and 9) and docs/SECURITY.md.
Create in /backend/src/middlewares:
- requestId.ts: reuse X-Request-Id or generate a UUID, set it on the response header and on req.id.
- sanitize.ts: remove keys that start with $ or contain a dot from req.body and req.params (recursive). Do not assign to req.query because it is read-only in Express 5.
- validate.ts: validate({ body, query, params }) using zod schemas, store the parsed result in req.validated, and return a 400 with the field errors format from BACKEND.md.
- rateLimiter.ts: apiLimiter (300 per 15 minutes per IP) and loginLimiter (5 per 15 minutes per IP and email) using express-rate-limit, returning the standard error envelope with 429.
- notFound.ts: 404 for unknown routes.
- errorHandler.ts: central handler that maps ApiError, ZodError, Mongoose validation and cast errors, and duplicate key errors (409), logs with the logger, reports 5xx to Sentry, includes requestId, and hides stack traces in production.
Acceptance: typecheck and lint pass; unit tests for sanitize and errorHandler mappings.
Verify: cd backend, then npm run build && npm test
Rules for this step: only create or change the files named above (tiny supporting edits such as an export or an import are fine). Do not start the next step. When finished, run the verify command, fix any failure, then reply with: files created or changed, commands run with their results, and anything I should check manually.
```

## P07: App, server and health route
Files the agent reads: docs/RULES.md, docs/BACKEND.md (sections 1, 2), docs/PERFORMANCE.md (section 3), docs/SECURITY.md.
```prompt
Read docs/RULES.md, docs/BACKEND.md (sections 1 and 2), docs/PERFORMANCE.md (section 3) and docs/SECURITY.md.
Create:
- src/routes/index.ts: an Express router mounted at /api/v1 with a GET /health route returning { status: "ok", uptime, db } using the mongoose connection state.
- src/app.ts: createApp() with, in this order: requestId, pino-http, helmet, cors (origin CLIENT_ORIGIN, credentials true), compression, express.json with a 100kb limit, cookie-parser, sanitize, apiLimiter, routes, notFound, errorHandler. Trust proxy setting from env when in production.
- src/server.ts: init Sentry, connect to MongoDB, start the HTTP server, and implement graceful shutdown on SIGTERM and SIGINT (stop accepting, close the server, disconnect MongoDB, exit). Handle unhandledRejection and uncaughtException by logging and shutting down.
Acceptance: npm run dev starts, GET /api/v1/health returns 200, unknown route returns the 404 envelope.
Verify: cd backend, then npm run dev and call curl http://localhost:5000/api/v1/health
Rules for this step: only create or change the files named above (tiny supporting edits such as an export or an import are fine). Do not start the next step. When finished, run the verify command, fix any failure, then reply with: files created or changed, commands run with their results, and anything I should check manually.
```

## P08A: Tenant plugin and its tests
Files the agent reads: docs/RULES.md, docs/BACKEND.md (section 5), docs/ARCHITECTURE.md (section 4), docs/SECURITY.md.
```prompt
Read docs/RULES.md, docs/BACKEND.md (section 5), docs/ARCHITECTURE.md (section 4) and docs/SECURITY.md.
Create plugins/tenant.plugin.ts: adds a required indexed tenantId field (option allowNull for models such as User where a super admin has null), query hooks for find, findOne, countDocuments, updateOne, updateMany, findOneAndUpdate, deleteOne, and an aggregate hook that prepends a $match. The tenant filter comes from tenantContext and is applied unless there is no context or the user is a super admin. A pre save hook sets tenantId on new documents.
Create tests/tenantPlugin.test.ts using mongodb-memory-server and a throwaway schema defined inside the test. Prove: filtering works for find, count, update, delete and aggregate; no filter for a super admin; no filter without a context; tenantId is set on save.
Verify: cd backend, then npm test
Rules for this step: only create or change the files named above (tiny supporting edits such as an export or an import are fine). Do not start the next step. When finished, run the verify command, fix any failure, then reply with: files created or changed, commands run with their results, and anything I should check manually.
```

## P08B: Tenant, User and RefreshToken models
Files the agent reads: docs/RULES.md, docs/BACKEND.md (section 4), docs/PERFORMANCE.md (section 2).
```prompt
Read docs/RULES.md, docs/BACKEND.md (section 4) and docs/PERFORMANCE.md (section 2).
Create:
- modules/tenants/tenant.model.ts: Tenant with unique slug, status (ACTIVE or INACTIVE), contact fields, timestamps.
- modules/users/user.model.ts: User with every field and index from BACKEND.md section 4, passwordHash with select false, lowercase unique email, the tenant plugin with allowNull.
- modules/auth/refreshToken.model.ts: with a TTL index on expiresAt.
Add a small test that loads the models and checks that the expected indexes exist.
Verify: cd backend, then npm run build && npm test
Rules for this step: only create or change the files named above (tiny supporting edits such as an export or an import are fine). Do not start the next step. When finished, run the verify command, fix any failure, then reply with: files created or changed, commands run with their results, and anything I should check manually.
```

## P09: Authentication and authorization middleware
Files the agent reads: docs/RULES.md, docs/BACKEND.md (sections 5, 6), docs/SECURITY.md, docs/API_CONTRACT.md (Cookies).
```prompt
Read docs/RULES.md, docs/BACKEND.md (sections 5 and 6), docs/SECURITY.md and docs/API_CONTRACT.md.
Create in src/middlewares:
- authenticate.ts: read the lms_access cookie, verify it, load the active user and its tenant status (reject inactive users and inactive labs with 403), set req.user = { id, role, tenantId, isSuperAdmin } and call next inside runWithTenant so the whole request runs in the tenant context. Missing or invalid token returns 401.
- authorize.ts: authorize(permission) that checks hasPermission and returns 403 with a clear message.
Acceptance: Vitest tests with a tiny test router covering no cookie (401), expired token (401), wrong role (403), and correct role (200).
Verify: cd backend, then npm test
Rules for this step: only create or change the files named above (tiny supporting edits such as an export or an import are fine). Do not start the next step. When finished, run the verify command, fix any failure, then reply with: files created or changed, commands run with their results, and anything I should check manually.
```

## P10A: Auth validation and service
Files the agent reads: docs/RULES.md, docs/BACKEND.md (sections 2, 6), docs/API_CONTRACT.md (Auth), docs/SECURITY.md.
```prompt
Read docs/RULES.md, docs/BACKEND.md (sections 2 and 6), docs/API_CONTRACT.md (Auth section) and docs/SECURITY.md.
Create in src/modules/auth: auth.validation.ts (zod schema for login) and auth.service.ts with login, refresh (rotation and reuse detection), logout and getMe. The service must not know about req or res. Follow exactly: lowercase email, generic invalid credentials message, 403 for an inactive user or lab, hashed refresh tokens stored in the database, lastLoginAt update. No routes or controller yet.
Verify: cd backend, then npm run build
Rules for this step: only create or change the files named above (tiny supporting edits such as an export or an import are fine). Do not start the next step. When finished, run the verify command, fix any failure, then reply with: files created or changed, commands run with their results, and anything I should check manually.
```

## P10B: Auth controller, routes and tests
Files the agent reads: docs/RULES.md, docs/BACKEND.md (section 2), docs/API_CONTRACT.md (Auth, Cookies), docs/SECURITY.md.
```prompt
Read docs/RULES.md, docs/BACKEND.md (section 2), docs/API_CONTRACT.md (Auth and Cookies sections) and docs/SECURITY.md.
Create auth.controller.ts (thin, sets and clears cookies with utils/cookies.ts) and auth.routes.ts (POST /login with loginLimiter and validate, POST /refresh, POST /logout, GET /me with authenticate). Mount the router at /api/v1/auth in routes/index.ts.
Create tests/auth.test.ts with Supertest: login success sets 3 cookies, wrong password 401, inactive user 403, refresh rotation, reuse of an old refresh token is rejected, logout clears cookies, /me works with the cookie and fails without it.
Verify: cd backend, then npm test, then start the dev server and call POST /api/v1/auth/login with curl or Postman
Rules for this step: only create or change the files named above (tiny supporting edits such as an export or an import are fine). Do not start the next step. When finished, run the verify command, fix any failure, then reply with: files created or changed, commands run with their results, and anything I should check manually.
```

## P11: Seed script
Files the agent reads: docs/RULES.md, docs/BACKEND.md (sections 3, 11), docs/FEATURES.md.
```prompt
Read docs/RULES.md, docs/BACKEND.md (sections 3 and 11) and docs/FEATURES.md.
Create src/scripts/seed.ts and wire npm run seed. It must be idempotent. It creates the Super Admin from SEED_SUPER_ADMIN_EMAIL and SEED_SUPER_ADMIN_PASSWORD. When NODE_ENV is development it also creates one demo lab "Demo Diagnostics" with a Lab Admin, a Doctor and a Receptionist (password printed once in the console), and 50 demo patients with realistic names, phones and dates of birth spread over the last 10 days. Because the patient module is not built yet, write the patient seeding so it is skipped with a log message if the Patient model does not exist yet; we will re-run it after P14.
Acceptance: npm run seed runs twice without duplicates.
Verify: cd backend, then npm run seed twice and confirm there are no duplicates
Rules for this step: only create or change the files named above (tiny supporting edits such as an export or an import are fine). Do not start the next step. When finished, run the verify command, fix any failure, then reply with: files created or changed, commands run with their results, and anything I should check manually.
```

## P12: Tenants module
Files the agent reads: docs/RULES.md, docs/BACKEND.md, docs/API_CONTRACT.md (Tenants), docs/FEATURES.md (section 5), docs/SECURITY.md.
```prompt
Read docs/RULES.md, docs/BACKEND.md, docs/API_CONTRACT.md (Tenants section), docs/FEATURES.md (section 5) and docs/SECURITY.md.
Create in src/modules/tenants: tenant.validation.ts, tenant.service.ts, tenant.controller.ts, tenant.routes.ts, all protected by authenticate and authorize("tenant:manage"). Endpoints exactly as in API_CONTRACT.md. Creating a tenant also creates its Lab Admin (bcryptjs with BCRYPT_ROUNDS). Do not use database transactions (standalone MongoDB does not support them): if creating the admin fails, delete the tenant just created and return the error. Generate a unique slug from the name. The list includes userCount using one aggregation, supports search by name (anchored prefix), status filter and sort, and uses paginate().
Acceptance: Supertest tests for each endpoint, 403 for non super admins, 409 for duplicate admin email.
Verify: cd backend, then npm test
Rules for this step: only create or change the files named above (tiny supporting edits such as an export or an import are fine). Do not start the next step. When finished, run the verify command, fix any failure, then reply with: files created or changed, commands run with their results, and anything I should check manually.
```

## P13: Users module
Files the agent reads: docs/RULES.md, docs/BACKEND.md, docs/API_CONTRACT.md (Users), docs/FEATURES.md (section 5), docs/SECURITY.md.
```prompt
Read docs/RULES.md, docs/BACKEND.md, docs/API_CONTRACT.md (Users section), docs/FEATURES.md (section 5) and docs/SECURITY.md.
Create in src/modules/users: user.validation.ts, user.service.ts, user.controller.ts, user.routes.ts protected by authenticate and authorize("user:manage"). Endpoints exactly as in API_CONTRACT.md. Rules: a Lab Admin can create only DOCTOR or RECEPTIONIST, always inside its own tenant (tenantId taken from req.user, never from the body); a Super Admin may create LAB_ADMIN users and must send tenantId; a Lab Admin can never assign SUPER_ADMIN or LAB_ADMIN; nobody can deactivate themselves or change their own role; email unique (409). The list supports search (name or email prefix), role and isActive filters, sort, pagination, and includes tenantName for Super Admin through a lean populate or aggregation.
Acceptance: Supertest tests including tenant isolation (a Lab Admin of lab A gets 404 for a user of lab B) and every rule above.
Verify: cd backend, then npm test
Rules for this step: only create or change the files named above (tiny supporting edits such as an export or an import are fine). Do not start the next step. When finished, run the verify command, fix any failure, then reply with: files created or changed, commands run with their results, and anything I should check manually.
```

## P14A: Patient model, validation and service
Files the agent reads: docs/RULES.md, docs/BACKEND.md (sections 4, 5, 8), docs/API_CONTRACT.md (Patients), docs/PERFORMANCE.md (section 2).
```prompt
Read docs/RULES.md, docs/BACKEND.md (sections 4, 5 and 8), docs/API_CONTRACT.md (Patients section) and docs/PERFORMANCE.md (section 2).
Create in src/modules/patients: counter.model.ts, patient.model.ts (indexes from BACKEND.md section 4, tenant plugin), patient.validation.ts (rules from API_CONTRACT.md), patient.service.ts.
patientCode is PT- plus a zero padded 4 digit sequence per tenant, generated with an atomic findOneAndUpdate and $inc on the Counter. Search matches name or phone by anchored escaped prefix. Delete is a soft delete (isActive false) and lists return only isActive true. Set createdBy and updatedBy. No routes yet.
Verify: cd backend, then npm run build
Rules for this step: only create or change the files named above (tiny supporting edits such as an export or an import are fine). Do not start the next step. When finished, run the verify command, fix any failure, then reply with: files created or changed, commands run with their results, and anything I should check manually.
```

## P14B: Patients controller, routes, tests and seed
Files the agent reads: docs/RULES.md, docs/BACKEND.md (section 2), docs/API_CONTRACT.md (Patients), docs/FEATURES.md (section 6).
```prompt
Read docs/RULES.md, docs/BACKEND.md (section 2), docs/API_CONTRACT.md (Patients section) and docs/FEATURES.md (section 6).
Create patient.controller.ts and patient.routes.ts with the per-route permissions from API_CONTRACT.md, and mount at /api/v1/patients. Update the seed script so the 50 demo patients are created, then run it.
Create tests/patients.test.ts: RBAC per role, tenant isolation (404 for another lab), pagination meta, search, sorting, soft delete, and 20 concurrent creations producing 20 unique codes.
Verify: cd backend, then npm test && npm run seed
Rules for this step: only create or change the files named above (tiny supporting edits such as an export or an import are fine). Do not start the next step. When finished, run the verify command, fix any failure, then reply with: files created or changed, commands run with their results, and anything I should check manually.
```

## P15: Dashboard module
Files the agent reads: docs/RULES.md, docs/BACKEND.md, docs/API_CONTRACT.md (Dashboard), docs/FEATURES.md (section 7), docs/PERFORMANCE.md (sections 2, 3).
```prompt
Read docs/RULES.md, docs/BACKEND.md, docs/API_CONTRACT.md (Dashboard section), docs/FEATURES.md (section 7) and docs/PERFORMANCE.md (sections 2 and 3).
Create src/modules/dashboard: dashboard.service.ts, dashboard.controller.ts, dashboard.routes.ts with GET /stats protected by authenticate and authorize("dashboard:read"). Return the exact role-specific shapes in API_CONTRACT.md. Run the independent counts and aggregations in parallel with Promise.all, always $match on tenantId first, fill missing days (always 7 entries) and months (6 entries) in code, and set Cache-Control private max-age 30.
Acceptance: Supertest tests for each role shape, zero-filled days, and tenant isolation of the counts.
Verify: cd backend, then npm test
Rules for this step: only create or change the files named above (tiny supporting edits such as an export or an import are fine). Do not start the next step. When finished, run the verify command, fix any failure, then reply with: files created or changed, commands run with their results, and anything I should check manually.
```

## P16: Backend test suite and coverage gaps
Files the agent reads: docs/RULES.md, docs/BACKEND.md (section 10), docs/SECURITY.md.
```prompt
Read docs/RULES.md, docs/BACKEND.md (section 10) and docs/SECURITY.md.
Review all tests in /backend/tests and fill gaps so these files exist and pass: auth.test.ts, rbac.test.ts (every route group for every role, expected 200 or 403), tenantIsolation.test.ts (Lab A cannot read, list, edit or delete anything of Lab B across users, patients and dashboard counts), patients.test.ts, plus validation and sanitize tests (an operator injection payload such as { "email": { "$ne": null } } must return 400). Use mongodb-memory-server and shared test helpers in tests/helpers.
Acceptance: npm test passes and prints a coverage summary. List any untested risk you see.
Verify: cd backend, then npm test -- --coverage
Rules for this step: only create or change the files named above (tiny supporting edits such as an export or an import are fine). Do not start the next step. When finished, run the verify command, fix any failure, then reply with: files created or changed, commands run with their results, and anything I should check manually.
```

## P17: Backend Dockerfile (optional)
Files the agent reads: docs/RULES.md, docs/ARCHITECTURE.md (section 7 Docker answer), docs/PERFORMANCE.md (section 3).
```prompt
Read docs/RULES.md, docs/ARCHITECTURE.md (section 7) and docs/PERFORMANCE.md (section 3).
Create backend/Dockerfile (multi-stage: build with devDependencies, final stage with production dependencies only, non-root user, node dist/server.js, HEALTHCHECK calling /api/v1/health) and backend/.dockerignore. Create the root docker-compose.yml with services mongo (with a named volume) and api (build ./backend, env from backend/.env, depends on mongo). The web service will be added later.
Acceptance: docker compose up --build starts the API and /api/v1/health returns 200.
Verify: docker compose up --build, then call /api/v1/health
Rules for this step: only create or change the files named above (tiny supporting edits such as an export or an import are fine). Do not start the next step. When finished, run the verify command, fix any failure, then reply with: files created or changed, commands run with their results, and anything I should check manually.
```

## P18: Backend audit against the documents
Files the agent reads: docs/RULES.md, docs/BACKEND.md, docs/API_CONTRACT.md, docs/SECURITY.md, docs/PERFORMANCE.md.
```prompt
Read docs/RULES.md, docs/BACKEND.md, docs/API_CONTRACT.md, docs/SECURITY.md and docs/PERFORMANCE.md.
Audit the whole /backend against these documents and produce a checklist table: requirement, status (done or missing), file. Cover every endpoint and response shape in API_CONTRACT.md, every row of SECURITY.md, the layer rules, index coverage (run explain on the patient list and search queries) and the performance rules. Fix every missing or wrong item, then re-run lint, typecheck and all tests. Finish with the updated checklist.
Verify: cd backend, then npm run lint && npm run build && npm test
Rules for this step: only create or change the files named above (tiny supporting edits such as an export or an import are fine). Do not start the next step. When finished, run the verify command, fix any failure, then reply with: files created or changed, commands run with their results, and anything I should check manually.
```

## STOP: Postman Checkpoint (before any frontend work)
When P18 is done, tell Claude "backend is ready for Postman" and Claude will walk you through the test run. Until then, use this checklist.
1. Start MongoDB and the API (npm run dev) and run npm run seed.
2. In Postman import docs/postman/LMS.postman_collection.json and docs/postman/LMS.postman_environment.json, select the LMS Local environment, and set the seeded emails and passwords in the environment variables.
3. Postman keeps cookies automatically, so log in once per role (use the Auth folder requests) before calling protected routes.
4. Run in this order and check the expected status codes:

| Step | Request | Expected |
|---|---|---|
| 1 | GET /health | 200 |
| 2 | POST /auth/login with wrong password | 401 |
| 3 | POST /auth/login as Super Admin | 200 and 3 cookies |
| 4 | GET /auth/me | 200 and role SUPER_ADMIN |
| 5 | POST /tenants (new lab and its admin) | 201 |
| 6 | GET /tenants?page=1&limit=5&search=dem | 200 with meta |
| 7 | POST /auth/logout then GET /auth/me | 200 then 401 |
| 8 | Login as Lab Admin, POST /users (Doctor) | 201 |
| 9 | Lab Admin POST /users with role LAB_ADMIN | 403 or 400 |
| 10 | Lab Admin POST /tenants | 403 |
| 11 | Login as Receptionist, POST /patients | 201 with patientCode |
| 12 | Receptionist DELETE /patients/:id | 403 |
| 13 | Login as Doctor, GET /patients | 200 |
| 14 | Doctor POST /patients | 403 |
| 15 | GET /patients?search=ali&sort=-createdAt&limit=5 | 200, 5 or fewer rows, meta correct |
| 16 | GET /patients?limit=1000 | limit capped at 100 |
| 17 | Login as a second lab's user and GET /patients/:id of lab 1 | 404 |
| 18 | POST /auth/login with email { "$ne": null } | 400 |
| 19 | GET /dashboard/stats for each role | role-specific shape |
| 20 | Wait 15 minutes or delete lms_access, call GET /auth/me, then POST /auth/refresh | 401 then 200 |

5. Fix any failing item with the agent before starting Phase 2. The frontend must never be built against an API that has not passed this list.

## Phase 2: Frontend Foundation

## P19: Create the Next.js app and install dependencies
Files the agent reads: docs/RULES.md, docs/FRONTEND.md (sections 1, 8, 9), docs/ARCHITECTURE.md (section 3).
```prompt
Read docs/RULES.md, docs/FRONTEND.md (sections 1, 8 and 9) and docs/ARCHITECTURE.md (section 3).
Inside /frontend create a Next.js app (latest stable, App Router, TypeScript, Tailwind CSS, ESLint, src directory, import alias @/*). Initialize shadcn/ui with CSS variables enabled. Install: @tanstack/react-query, @tanstack/react-table, zustand, nuqs, react-hook-form, zod, @hookform/resolvers, next-themes, lucide-react, sonner, date-fns, and @tanstack/react-query-devtools as a dev dependency (recharts comes with the shadcn chart component later).
Create the empty folder tree from FRONTEND.md section 1 with .gitkeep files, .env.local.example (BACKEND_URL and NEXT_PUBLIC_API_BASE) and a prettier config.
Acceptance: npm run dev starts and npm run build passes.
Verify: cd frontend, then npm run build and npm run dev
Rules for this step: only create or change the files named above (tiny supporting edits such as an export or an import are fine). Do not start the next step. When finished, run the verify command, fix any failure, then reply with: files created or changed, commands run with their results, and anything I should check manually.
```

## P20: Design tokens, fonts and theme
Files the agent reads: docs/RULES.md, docs/DESIGN.md (sections 1, 2, 3, 4), docs/FRONTEND.md (section 4).
```prompt
Read docs/RULES.md and docs/DESIGN.md (sections 1 to 4).
1. In src/app/globals.css define the shadcn CSS variables for four blocks exactly with the hex values from the token table in DESIGN.md section 2: :root[data-palette="navy"], :root[data-palette="navy"].dark, :root[data-palette="cream"], :root[data-palette="cream"].dark. Map them to the Tailwind theme (including chart-1 to chart-5, sidebar tokens, and add success, warning and brand tokens as usable Tailwind colors). Set base radius 0.5rem. Set the body text size to 14px, antialiased, and add the tabular-nums utility usage note as a comment.
2. In src/app/layout.tsx load Inter and JetBrains Mono with next/font (CSS variables --font-sans and --font-mono), set html lang, suppressHydrationWarning, and default data-palette="navy". Add a tiny inline script or cookie read so the saved palette is applied before paint with no flash.
3. Create src/providers/theme-provider.tsx using next-themes (attribute class, defaultTheme system, disableTransitionOnChange) and src/lib/palette.ts with getPalette, setPalette and a type Palette = "navy" | "cream" persisted in localStorage.
Acceptance: temporarily render a color swatch page to confirm all four combinations look correct, then remove it. Typecheck and build pass.
Verify: cd frontend, then npm run build, and check the temporary swatch page in all four combinations before deleting it
Rules for this step: only create or change the files named above (tiny supporting edits such as an export or an import are fine). Do not start the next step. When finished, run the verify command, fix any failure, then reply with: files created or changed, commands run with their results, and anything I should check manually.
```

## P21: Install shadcn components
Files the agent reads: docs/RULES.md, docs/FRONTEND.md (section 8), docs/DESIGN.md (sections 6, 7).
```prompt
Read docs/RULES.md, docs/FRONTEND.md (section 8) and docs/DESIGN.md (sections 6 and 7).
Using the shadcn CLI add these components: button, input, label, form, card, table, badge, skeleton, sonner, dialog, alert-dialog, sheet, select, tabs, tooltip, separator, breadcrumb, dropdown-menu, avatar, sidebar, chart, empty, alert, scroll-area, collapsible, switch, spinner, pagination. If a name does not exist in the installed version, use the closest equivalent and tell me. Add the Sonner Toaster to the root layout using position bottom-right, with the card, border and foreground tokens for its styling. Tune the default styles in components/ui only through tokens, not hard-coded colors: buttons h-9, inputs h-9, cards rounded-xl with a border and no shadow, dialogs max-w-lg.
Acceptance: build passes; no component uses a hard-coded hex color.
Verify: cd frontend, then npm run build
Rules for this step: only create or change the files named above (tiny supporting edits such as an export or an import are fine). Do not start the next step. When finished, run the verify command, fix any failure, then reply with: files created or changed, commands run with their results, and anything I should check manually.
```

## P22A: Types, constants and small utilities
Files the agent reads: docs/RULES.md, docs/FRONTEND.md (sections 1, 3, 6), docs/API_CONTRACT.md, docs/FEATURES.md (section 9).
```prompt
Read docs/RULES.md, docs/FRONTEND.md (sections 1, 3 and 6), docs/API_CONTRACT.md and docs/FEATURES.md (section 9).
Create in /frontend/src:
- types/api.ts (ApiSuccess, ApiErrorBody, Paginated, PaginationMeta) and types/user.ts (Role, AuthUser).
- constants/roles.ts, constants/permissions.ts (mirror the backend permission map and a can(role, permission) helper) and constants/navigation.ts (items per role from FEATURES.md section 9 with lucide icons and hrefs).
- lib/utils.ts (cn), lib/format.ts (formatDate, formatDateTime, formatRelative using date-fns, getInitials, formatNumber) and lib/query-keys.ts (key factories for auth, dashboard, labs, users, patients: all, list(params), detail(id)).
Do not create the API client yet.
Verify: cd frontend, then npm run lint && npx tsc --noEmit
Rules for this step: only create or change the files named above (tiny supporting edits such as an export or an import are fine). Do not start the next step. When finished, run the verify command, fix any failure, then reply with: files created or changed, commands run with their results, and anything I should check manually.
```

## P22B: API client, query client and API rewrites
Files the agent reads: docs/RULES.md, docs/FRONTEND.md (sections 2, 5), docs/API_CONTRACT.md, docs/PERFORMANCE.md (section 4).
```prompt
Read docs/RULES.md, docs/FRONTEND.md (sections 2 and 5), docs/API_CONTRACT.md and docs/PERFORMANCE.md (section 4).
Create:
- next.config.ts: rewrites /api/v1/:path* to ${BACKEND_URL}/api/v1/:path*.
- lib/api-client.ts: the single fetch wrapper from FRONTEND.md section 2 (credentials include, envelope unwrapping, typed ApiError class, single-flight refresh on 401 then one retry, redirect to /login with a toast when refresh fails). Export get, post, patch, del and a buildQuery helper that drops empty params.
- lib/query-client.ts: QueryClient with the defaults from PERFORMANCE.md section 4 and a MutationCache onError that shows a Sonner error toast with the server message (skip when meta.silent is true).
With the backend running, prove the rewrite works by calling /api/v1/health through the frontend dev server.
Verify: cd frontend, then npm run lint && npx tsc --noEmit, and open http://localhost:3000/api/v1/health in the browser
Rules for this step: only create or change the files named above (tiny supporting edits such as an export or an import are fine). Do not start the next step. When finished, run the verify command, fix any failure, then reply with: files created or changed, commands run with their results, and anything I should check manually.
```

## P23: Stores, providers and generic hooks
Files the agent reads: docs/RULES.md, docs/FRONTEND.md (sections 3, 4), docs/PERFORMANCE.md (section 5).
```prompt
Read docs/RULES.md, docs/FRONTEND.md (sections 3 and 4) and docs/PERFORMANCE.md (section 5).
Create:
- src/stores/auth.store.ts: Zustand store with user, status ("idle" | "loading" | "authenticated" | "unauthenticated"), setUser, setStatus, clear. Not persisted. Export small selector hooks (useUserRole, useCurrentUser, useAuthStatus) so components subscribe narrowly.
- src/providers/query-provider.tsx: client component that creates the QueryClient once (useState initializer) and renders React Query Devtools only in development.
- src/hooks/use-debounced-value.ts and src/hooks/use-mounted.ts.
Wire NuqsAdapter (nuqs/adapters/next/app), QueryProvider and ThemeProvider into the root layout in a stable order. Provider values must not change between renders.
Acceptance: typecheck passes; add a short comment in each file explaining the re-render reasoning.
Verify: cd frontend, then npm run lint && npx tsc --noEmit
Rules for this step: only create or change the files named above (tiny supporting edits such as an export or an import are fine). Do not start the next step. When finished, run the verify command, fix any failure, then reply with: files created or changed, commands run with their results, and anything I should check manually.
```

## P24: Shared components A (identity and feedback)
Files the agent reads: docs/RULES.md, docs/DESIGN.md (sections 6, 7), docs/FRONTEND.md (section 5).
```prompt
Read docs/RULES.md, docs/DESIGN.md (sections 6 and 7) and docs/FRONTEND.md (section 5).
Create in src/components/shared:
- UserAvatar.tsx: shadcn Avatar with AvatarImage and AvatarFallback showing initials; the fallback color comes from a fixed set of muted token-based tints chosen by a hash of the name; props name, src, size ("sm" 28, "md" 32, "lg" 40).
- StatusBadge.tsx (active or inactive, subtle style with dot) and RoleBadge.tsx (one subtle tint per role).
- EmptyState.tsx: wraps the shadcn Empty component with props icon, title, description, action, size ("sm" for charts, "md" for tables) and variant ("no-data" or "no-results").
- PageHeader.tsx: title, description, actions slot, optional breadcrumb slot.
Build a temporary preview route that shows all of them in light and dark and both palettes, check it, then delete the route.
Acceptance: components use only tokens, are accessible (aria labels), and are server components unless they need client features.
Verify: cd frontend, then npm run lint && npx tsc --noEmit, and check the temporary preview route before deleting it
Rules for this step: only create or change the files named above (tiny supporting edits such as an export or an import are fine). Do not start the next step. When finished, run the verify command, fix any failure, then reply with: files created or changed, commands run with their results, and anything I should check manually.
```

## P25A: Table system: DataTable, pagination, skeleton
Files the agent reads: docs/RULES.md, docs/DESIGN.md (sections 6, 7), docs/FRONTEND.md (sections 3, 4, 5), docs/PERFORMANCE.md (section 5).
```prompt
Read docs/RULES.md, docs/DESIGN.md (sections 6 and 7), docs/FRONTEND.md (sections 3, 4 and 5) and docs/PERFORMANCE.md (section 5).
Create in src/components/shared:
- TableSkeleton.tsx: configurable rows and columns.
- DataTable.tsx: generic component built on TanStack Table and the shadcn Table with manualPagination and manualSorting. Props: columns, data, isLoading, isFetching, isError, onRetry, emptyState (node), sorting, onSortingChange. Shows TableSkeleton on first load, keeps rows at 60 percent opacity with a small spinner while isFetching, shows the Empty state when there is no data, and an Alert with Retry on error. Sticky header, 44px rows, hover tint, bordered rounded-xl container.
- DataTablePagination.tsx: "Showing X to Y of Z", Previous and Next, rows per page select (10, 20, 50), page and limit controlled by props.
Verify: cd frontend, then npm run lint && npx tsc --noEmit
Rules for this step: only create or change the files named above (tiny supporting edits such as an export or an import are fine). Do not start the next step. When finished, run the verify command, fix any failure, then reply with: files created or changed, commands run with their results, and anything I should check manually.
```

## P25B: Search input and URL table params
Files the agent reads: docs/RULES.md, docs/FRONTEND.md (sections 3, 4), docs/PERFORMANCE.md (sections 4, 5).
```prompt
Read docs/RULES.md, docs/FRONTEND.md (sections 3 and 4) and docs/PERFORMANCE.md (sections 4 and 5).
Create:
- src/components/shared/SearchInput.tsx: icon input with its own useState text, 300 ms debounce through use-debounced-value, calls onSearch(value), a clear button, and a small spinner when isFetching.
- src/hooks/use-table-params.ts: uses nuqs to read and write page, limit, search, sort and extra filter keys in the URL, and resets page to 1 when search or a filter changes.
Build a temporary demo route with fake data to test both with DataTable, then delete the route.
Verify: cd frontend, then npm run lint && npx tsc --noEmit, then use the temporary route to confirm that typing in search does not re-render the table container (React Profiler); delete the route afterwards
Rules for this step: only create or change the files named above (tiny supporting edits such as an export or an import are fine). Do not start the next step. When finished, run the verify command, fix any failure, then reply with: files created or changed, commands run with their results, and anything I should check manually.
```

## P26: Shared components C (cards, charts, dialogs, guards)
Files the agent reads: docs/RULES.md, docs/DESIGN.md (sections 6, 7, 8), docs/FRONTEND.md (sections 4, 5, 6).
```prompt
Read docs/RULES.md, docs/DESIGN.md (sections 6, 7 and 8) and docs/FRONTEND.md (sections 4, 5 and 6).
Create in src/components/shared:
- StatCard.tsx (label, value with tabular-nums, optional hint, icon in a muted rounded square) and StatCardSkeleton.tsx.
- ChartCard.tsx: Card with title, description, optional period label, content slot, fixed height, and built-in states: isLoading shows a Skeleton, isEmpty shows EmptyState size "sm", isError shows an Alert with Retry.
- ConfirmDialog.tsx: shadcn AlertDialog with title, description, confirmLabel, destructive option, isPending spinner on the confirm button.
- RoleGuard.tsx: takes allowedRoles or a permission, reads the role with a narrow selector, and renders children or an "Access denied" EmptyState.
Acceptance: all components use tokens only, memoize where it is useful (StatCard, ChartCard), and have no data fetching inside.
Verify: cd frontend, then npm run lint && npx tsc --noEmit
Rules for this step: only create or change the files named above (tiny supporting edits such as an export or an import are fine). Do not start the next step. When finished, run the verify command, fix any failure, then reply with: files created or changed, commands run with their results, and anything I should check manually.
```

## Phase 3: Auth and Shell

## P27A: Login page and auth feature
Files the agent reads: docs/RULES.md, docs/API_CONTRACT.md (Auth), docs/FRONTEND.md (sections 2, 5, 7), docs/DESIGN.md (sections 6, 7).
```prompt
Read docs/RULES.md, docs/API_CONTRACT.md (Auth section), docs/FRONTEND.md (sections 2, 5 and 7) and docs/DESIGN.md (sections 6 and 7).
The backend is running and tested. Create:
- features/auth/api.ts (login, logout, me), features/auth/hooks.ts (useLogin, useLogout as mutations, useMe as a query), features/auth/schemas.ts (zod login schema).
- features/auth/components/LoginForm.tsx: react-hook-form with shadcn Form, email and password with show or hide password, button spinner while pending, inline server error.
- app/(auth)/login/page.tsx: minimal centered card on a subtle background with the logo mark, title, short description and the form. After login redirect to /dashboard with a success toast, and put the user in the auth store.
Verify: cd frontend, then npm run lint && npx tsc --noEmit, then log in with each seeded role in the browser
Rules for this step: only create or change the files named above (tiny supporting edits such as an export or an import are fine). Do not start the next step. When finished, run the verify command, fix any failure, then reply with: files created or changed, commands run with their results, and anything I should check manually.
```

## P27B: Route guard, AuthGate and logout
Files the agent reads: docs/RULES.md, docs/API_CONTRACT.md (Cookies), docs/FRONTEND.md (section 6), docs/DESIGN.md (section 7).
```prompt
Read docs/RULES.md, docs/API_CONTRACT.md (Cookies section), docs/FRONTEND.md (section 6) and docs/DESIGN.md (section 7).
Create:
- features/auth/components/AuthGate.tsx: client component that calls useMe, fills the auth store, shows a layout-sized skeleton while loading, and redirects to /login when unauthenticated.
- src/proxy.ts (use middleware.ts if the installed Next.js version still uses that name): redirect to /login when the lms_session cookie is missing on dashboard routes, and away from /login to /dashboard when it exists. Do not verify tokens here.
- Logout behavior: clear the auth store and the whole query cache, then redirect to /login.
Create a minimal temporary (dashboard)/layout.tsx that wraps children in AuthGate if it does not exist yet.
Verify: cd frontend, then npm run lint && npx tsc --noEmit, then in the browser: refresh keeps the session, logout redirects, protected pages redirect when logged out, deleting only lms_access refreshes silently
Rules for this step: only create or change the files named above (tiny supporting edits such as an export or an import are fine). Do not start the next step. When finished, run the verify command, fix any failure, then reply with: files created or changed, commands run with their results, and anything I should check manually.
```

## P28A: Sidebar and user menu
Files the agent reads: docs/RULES.md, docs/DESIGN.md (sections 5, 6, 9), docs/FRONTEND.md (sections 4, 6), docs/FEATURES.md (section 9).
```prompt
Read docs/RULES.md, docs/DESIGN.md (sections 5, 6 and 9), docs/FRONTEND.md (sections 4 and 6) and docs/FEATURES.md (section 9).
Create in src/components/layout:
- AppSidebar.tsx using the shadcn Sidebar with collapsible="icon": 256px expanded, 56px collapsed with tooltips, logo mark and lab name at the top, navigation built from constants/navigation.ts filtered by the role (read through a narrow selector), active item with the sidebar-accent background and a 2px brand indicator, NavUser in the footer. It becomes a Sheet drawer on mobile.
- NavUser.tsx: UserAvatar (shadcn Avatar), name, RoleBadge, and a DropdownMenu with Theme (Light, Dark, System), Palette (Navy, Cream) and Log out.
These are not mounted yet, so only typecheck them in this step.
Verify: cd frontend, then npm run lint && npx tsc --noEmit
Rules for this step: only create or change the files named above (tiny supporting edits such as an export or an import are fine). Do not start the next step. When finished, run the verify command, fix any failure, then reply with: files created or changed, commands run with their results, and anything I should check manually.
```

## P28B: Header, layout, and route states
Files the agent reads: docs/RULES.md, docs/DESIGN.md (sections 5, 7), docs/FRONTEND.md (sections 1, 4, 5, 6).
```prompt
Read docs/RULES.md, docs/DESIGN.md (sections 5 and 7) and docs/FRONTEND.md (sections 1, 4, 5 and 6).
Create:
- components/layout/AppHeader.tsx: 56px sticky header with SidebarTrigger, Breadcrumbs.tsx (derived from the pathname), a spacer, ThemeToggle.tsx and the avatar dropdown.
- app/(dashboard)/layout.tsx (replace the temporary one): SidebarProvider, AppSidebar, SidebarInset, AppHeader, AuthGate and a main area with page padding and max width 1280. State persists through the shadcn sidebar cookie and Ctrl or Cmd + B toggles it.
- app/(dashboard)/loading.tsx (skeleton), error.tsx (Alert style with Try again), not-found.tsx.
- Placeholder pages with only a PageHeader for dashboard, labs, users, staff and patients, each wrapped in RoleGuard with the right roles.
Acceptance: sidebar collapses and expands smoothly and persists after reload, mobile drawer works, each role sees only its own items, theme and palette switching work, and the sidebar and header do not re-render when a page changes (React Profiler)
Verify: cd frontend, then npm run lint && npx tsc --noEmit, then in the browser
Rules for this step: only create or change the files named above (tiny supporting edits such as an export or an import are fine). Do not start the next step. When finished, run the verify command, fix any failure, then reply with: files created or changed, commands run with their results, and anything I should check manually.
```

## Phase 4: Features

## P29A: Dashboard data and stat cards
Files the agent reads: docs/RULES.md, docs/API_CONTRACT.md (Dashboard), docs/FEATURES.md (section 7), docs/DESIGN.md (sections 6, 8), docs/PERFORMANCE.md (section 4).
```prompt
Read docs/RULES.md, docs/API_CONTRACT.md (Dashboard section), docs/FEATURES.md (section 7), docs/DESIGN.md (sections 6 and 8) and docs/PERFORMANCE.md (section 4).
Create features/dashboard/types.ts (types for every role shape), api.ts and hooks.ts (useDashboardStats with staleTime 60 seconds). Build app/(dashboard)/dashboard/page.tsx so it renders only the stat cards for the logged-in role (StatCard with StatCardSkeleton while loading, Alert with Retry on error). Charts and the recent table come in the next step; leave a clearly marked empty area for them.
Verify: cd frontend, then npm run lint && npx tsc --noEmit, then log in as each role and check the cards
Rules for this step: only create or change the files named above (tiny supporting edits such as an export or an import are fine). Do not start the next step. When finished, run the verify command, fix any failure, then reply with: files created or changed, commands run with their results, and anything I should check manually.
```

## P29B: Dashboard charts and recent patients
Files the agent reads: docs/RULES.md, docs/FEATURES.md (section 7), docs/DESIGN.md (sections 6, 7, 8), docs/PERFORMANCE.md (section 5).
```prompt
Read docs/RULES.md, docs/FEATURES.md (section 7), docs/DESIGN.md (sections 6, 7 and 8) and docs/PERFORMANCE.md (section 5).
Create in features/dashboard/components: RegistrationsBarChart.tsx (shadcn Chart bar chart, 7 days, rounded bars, no vertical grid, tooltip), BreakdownBars.tsx (horizontal bars with label, bar and value, used for gender and for users by role), SuperAdminCharts.tsx (labs per month bar chart and users by role bars), RecentPatientsTable.tsx (avatar, name, patient code in mono font, relative time, EmptyState when empty).
Update the dashboard page: chart row (two thirds and one third) and the recent patients table below the cards, by role. Load chart components with next/dynamic and skeleton fallbacks, use ChartCard for loading, empty and error states.
Acceptance: empty data shows the empty state and there is no layout shift when data arrives
Verify: cd frontend, then npm run lint && npx tsc --noEmit, then check all four roles in the browser
Rules for this step: only create or change the files named above (tiny supporting edits such as an export or an import are fine). Do not start the next step. When finished, run the verify command, fix any failure, then reply with: files created or changed, commands run with their results, and anything I should check manually.
```

## P30A: Labs list page (Super Admin)
Files the agent reads: docs/RULES.md, docs/API_CONTRACT.md (Tenants), docs/FRONTEND.md (sections 2, 3, 4, 5), docs/DESIGN.md (section 6).
```prompt
Read docs/RULES.md, docs/API_CONTRACT.md (Tenants section), docs/FRONTEND.md (sections 2, 3, 4 and 5) and docs/DESIGN.md (section 6).
Create in features/labs: types.ts, api.ts, hooks.ts (useLabs with keepPreviousData, plus useCreateLab and useUpdateLab that invalidate only the labs keys), components/LabColumns.tsx (defined outside any component; columns: name with initials avatar, contact email, phone, user count, status badge, created date, actions menu), components/LabsTable.tsx.
Build app/(dashboard)/labs/page.tsx: PageHeader, SearchInput, status Select filter, DataTable with pagination, all state in the URL through use-table-params. Empty states for no data and no results. The Add lab button and row actions can be inert in this step.
Verify: cd frontend, then npm run lint && npx tsc --noEmit, then check pagination, search, filter and sort in the browser
Rules for this step: only create or change the files named above (tiny supporting edits such as an export or an import are fine). Do not start the next step. When finished, run the verify command, fix any failure, then reply with: files created or changed, commands run with their results, and anything I should check manually.
```

## P30B: Labs form dialog and actions
Files the agent reads: docs/RULES.md, docs/API_CONTRACT.md (Tenants), docs/FEATURES.md (section 5), docs/FRONTEND.md (sections 5, 7).
```prompt
Read docs/RULES.md, docs/API_CONTRACT.md (Tenants section), docs/FEATURES.md (section 5) and docs/FRONTEND.md (sections 5 and 7).
Create features/labs/schemas.ts (zod create and edit schemas matching the API rules) and components/LabFormDialog.tsx (create includes the Lab Admin fields; edit does not; inline field errors; a server 409 maps to the email field). Wire the Add lab button, the Edit action, and Activate or Deactivate through ConfirmDialog in the labs page. Success toasts for every mutation.
Acceptance: pagination, search, filter and sort work through the URL, there is no flicker between pages and a page reload keeps the state
Verify: cd frontend, then npm run lint && npx tsc --noEmit, then create, edit and deactivate a lab in the browser
Rules for this step: only create or change the files named above (tiny supporting edits such as an export or an import are fine). Do not start the next step. When finished, run the verify command, fix any failure, then reply with: files created or changed, commands run with their results, and anything I should check manually.
```

## P31A: Users and Staff list pages
Files the agent reads: docs/RULES.md, docs/API_CONTRACT.md (Users), docs/FRONTEND.md (sections 3, 4, 5), docs/DESIGN.md (section 6).
```prompt
Read docs/RULES.md, docs/API_CONTRACT.md (Users section), docs/FRONTEND.md (sections 3, 4 and 5) and docs/DESIGN.md (section 6).
Create in features/users: types.ts, api.ts, hooks.ts (useUsers, useCreateUser, useUpdateUser), components/UserColumns.tsx (avatar plus name and email, role badge, lab name column only for Super Admin, status badge, created date, actions), components/UsersTable.tsx (prop scope "all" for Super Admin or "lab" for Lab Admin, shared by both pages).
Build app/(dashboard)/users/page.tsx (Super Admin, lab filter and role filter) and app/(dashboard)/staff/page.tsx (Lab Admin, role filter). URL state, search, pagination and empty states as in Labs. No duplicated table code between the two pages. Add buttons and row actions can be inert in this step.
Verify: cd frontend, then npm run lint && npx tsc --noEmit, then open both pages as Super Admin and Lab Admin
Rules for this step: only create or change the files named above (tiny supporting edits such as an export or an import are fine). Do not start the next step. When finished, run the verify command, fix any failure, then reply with: files created or changed, commands run with their results, and anything I should check manually.
```

## P31B: User form dialog and actions
Files the agent reads: docs/RULES.md, docs/API_CONTRACT.md (Users), docs/FEATURES.md (section 5), docs/FRONTEND.md (sections 5, 7).
```prompt
Read docs/RULES.md, docs/API_CONTRACT.md (Users section), docs/FEATURES.md (section 5) and docs/FRONTEND.md (sections 5 and 7).
Create features/users/schemas.ts and components/UserFormDialog.tsx (create and edit; a Lab Admin sees only the Doctor and Receptionist roles; a Super Admin sees a lab Select loaded with useLabs and can pick Lab Admin; edit allows name, role, active status and an optional password reset). Wire create, edit and deactivate (ConfirmDialog) into both pages with toasts. A user cannot deactivate themselves, so hide that action for the current user.
Acceptance: each role sees only what the API allows and forms show the exact validation messages
Verify: cd frontend, then npm run lint && npx tsc --noEmit, then create, edit and deactivate users as both roles
Rules for this step: only create or change the files named above (tiny supporting edits such as an export or an import are fine). Do not start the next step. When finished, run the verify command, fix any failure, then reply with: files created or changed, commands run with their results, and anything I should check manually.
```

## P32A: Patients list page
Files the agent reads: docs/RULES.md, docs/API_CONTRACT.md (Patients), docs/FRONTEND.md (sections 3, 4, 5), docs/DESIGN.md (section 6), docs/PERFORMANCE.md (sections 4, 5).
```prompt
Read docs/RULES.md, docs/API_CONTRACT.md (Patients section), docs/FRONTEND.md (sections 3, 4 and 5), docs/DESIGN.md (section 6) and docs/PERFORMANCE.md (sections 4 and 5).
Create in features/patients: types.ts, api.ts, hooks.ts (usePatients with keepPreviousData and next-page prefetch, usePatient, useCreatePatient, useUpdatePatient, useDeactivatePatient), components/PatientColumns.tsx (outside any component: avatar plus name, code in mono font, phone, gender badge, age from date of birth, registered date, actions menu), components/PatientsTable.tsx.
Build app/(dashboard)/patients/page.tsx: PageHeader, SearchInput (name or phone), gender filter, sort, DataTable with pagination, all in the URL. Row actions are filtered by role (view for all, edit for Lab Admin and Receptionist, deactivate for Lab Admin only). Empty states: "No patients yet" with a register button for allowed roles, and "No results" with a Clear search button. The register and edit buttons can be inert in this step.
Verify: cd frontend, then npm run lint && npx tsc --noEmit, then check the list as each role
Rules for this step: only create or change the files named above (tiny supporting edits such as an export or an import are fine). Do not start the next step. When finished, run the verify command, fix any failure, then reply with: files created or changed, commands run with their results, and anything I should check manually.
```

## P32B: Patient form dialog and row actions
Files the agent reads: docs/RULES.md, docs/API_CONTRACT.md (Patients), docs/FEATURES.md (section 6), docs/FRONTEND.md (sections 5, 7).
```prompt
Read docs/RULES.md, docs/API_CONTRACT.md (Patients section), docs/FEATURES.md (section 6) and docs/FRONTEND.md (sections 5 and 7).
Create features/patients/schemas.ts (zod rules identical to the API_CONTRACT.md validation) and components/PatientFormDialog.tsx (create and edit, two-column grid on desktop, date of birth input, inline errors, server errors mapped with setError). Wire the Register patient button (only when can(role, "patient:create")), the Edit action and the Deactivate action (ConfirmDialog) into the patients page, with toasts.
Acceptance: Doctor sees no create, edit or deactivate controls, typing in search sends one request after 300 ms, changing a page re-renders only the table body (Profiler), and deactivating removes the row after the list refreshes
Verify: cd frontend, then npm run lint && npx tsc --noEmit, then register, edit and deactivate a patient in the browser
Rules for this step: only create or change the files named above (tiny supporting edits such as an export or an import are fine). Do not start the next step. When finished, run the verify command, fix any failure, then reply with: files created or changed, commands run with their results, and anything I should check manually.
```

## P33: Patient details
Files the agent reads: docs/RULES.md, docs/API_CONTRACT.md (Patients), docs/FEATURES.md (section 6), docs/DESIGN.md (sections 6, 7), docs/FRONTEND.md (section 5).
```prompt
Read docs/RULES.md, docs/API_CONTRACT.md (Patients section), docs/FEATURES.md (section 6), docs/DESIGN.md (sections 6 and 7) and docs/FRONTEND.md (section 5).
Create src/features/patients/components/PatientDetails.tsx and src/app/(dashboard)/patients/[id]/page.tsx. Layout: breadcrumb (Patients, patient code), a header card with a large UserAvatar, name, patient code in mono font, status badge and action buttons (Edit through the existing PatientFormDialog, Deactivate through ConfirmDialog, both role-aware), and an information card with a two-column grid (phone, gender, date of birth and age, address, registered by, registered date). Use usePatient with a skeleton fallback; a 404 from the API shows an EmptyState ("Patient not found") with a back button; other errors show an Alert with Retry. After deactivation toast and navigate back to the list.
Acceptance: opening another lab's patient id shows the not found state; Doctor sees no action buttons.
Verify: cd frontend, then npm run lint && npx tsc --noEmit, then open a patient as Lab Admin and as Doctor
Rules for this step: only create or change the files named above (tiny supporting edits such as an export or an import are fine). Do not start the next step. When finished, run the verify command, fix any failure, then reply with: files created or changed, commands run with their results, and anything I should check manually.
```

## Phase 5: Quality and Delivery

## P34: Performance audit and fixes
Files the agent reads: docs/RULES.md, docs/PERFORMANCE.md, docs/FRONTEND.md (section 4).
```prompt
Read docs/RULES.md, docs/PERFORMANCE.md and docs/FRONTEND.md (section 4).
Audit the frontend and backend against PERFORMANCE.md and produce a table of findings (item, status, evidence). Specifically: use the React Profiler to verify that typing in search does not re-render the sidebar, header or stat cards, and that changing pages re-renders only the table body; check every Zustand selector is narrow; check that column definitions and callbacks are stable; confirm charts and dialogs are dynamically imported; run the bundle analyzer and report the largest chunks; run Lighthouse on /dashboard and /patients; seed 100,000 patients into one tenant (add a seed option for this) and measure list and search latency, running explain on the queries. Fix every issue that breaks a budget and re-measure.
Finish with a before and after summary.
Verify: re-run the measurements and show before and after numbers
Rules for this step: only create or change the files named above (tiny supporting edits such as an export or an import are fine). Do not start the next step. When finished, run the verify command, fix any failure, then reply with: files created or changed, commands run with their results, and anything I should check manually.
```

## P35: Design, UX and accessibility audit
Files the agent reads: docs/RULES.md, docs/DESIGN.md, docs/FRONTEND.md (section 5), docs/FEATURES.md (section 8).
```prompt
Read docs/RULES.md, docs/DESIGN.md, docs/FRONTEND.md (section 5) and docs/FEATURES.md (section 8).
Audit every page in light and dark mode and in both palettes (navy and cream), on desktop and mobile widths. Check: no hard-coded colors, spacing on the 4px grid, typography sizes and weights as specified, compact and minimal look (nothing bulky), sidebar collapse and mobile drawer, avatars everywhere a person appears, loading skeletons match final layouts, every table and chart has an empty state, toasts for every mutation, inline form errors, focus rings, aria-labels on icon buttons, keyboard navigation, color contrast of text. Produce a checklist table and fix every failure, then summarize.
Verify: cd frontend, then npm run lint && npm run build
Rules for this step: only create or change the files named above (tiny supporting edits such as an export or an import are fine). Do not start the next step. When finished, run the verify command, fix any failure, then reply with: files created or changed, commands run with their results, and anything I should check manually.
```

## P36: Frontend Docker, compose and README (optional)
Files the agent reads: docs/RULES.md, docs/ARCHITECTURE.md (section 7), docs/FRONTEND.md (section 9).
```prompt
Read docs/RULES.md, docs/ARCHITECTURE.md (section 7) and docs/FRONTEND.md (section 9).
Create frontend/Dockerfile (multi-stage, Next.js standalone output, non-root user) and frontend/.dockerignore, enable output "standalone" in next.config.ts, and extend the root docker-compose.yml with a web service that depends on api and receives BACKEND_URL=http://api:5000. Write the final root README.md: overview, screenshots placeholders, architecture diagram in Mermaid, how to run with and without Docker, environment variables, seed users, test commands, folder structure, and a short "design decisions" section (why Zustand, TanStack Query, tenant plugin, why Redis, microservices and ABAC are deferred).
Acceptance: docker compose up --build runs MongoDB, API and web, and the login flow works.
Verify: docker compose up --build and log in through the browser
Rules for this step: only create or change the files named above (tiny supporting edits such as an export or an import are fine). Do not start the next step. When finished, run the verify command, fix any failure, then reply with: files created or changed, commands run with their results, and anything I should check manually.
```

## P37: Final review against all documents
Files the agent reads: every file in /docs.
```prompt
Read every file in /docs. Do a final review of the whole project against FEATURES.md, ARCHITECTURE.md, BACKEND.md, API_CONTRACT.md, SECURITY.md, FRONTEND.md, DESIGN.md and PERFORMANCE.md. Produce one table with every requirement, its status and the file that implements it. Fix everything missing, run lint, typecheck, tests and a production build for both apps, and run through the demo script: Super Admin creates a lab, Lab Admin creates a Doctor and Receptionist, Receptionist registers patients, Doctor views patients, the second lab cannot see the first lab data. Give me the final checklist and a short demo script I can use with my manager.
Verify: run lint, typecheck, tests and a production build for both apps
Rules for this step: only create or change the files named above (tiny supporting edits such as an export or an import are fine). Do not start the next step. When finished, run the verify command, fix any failure, then reply with: files created or changed, commands run with their results, and anything I should check manually.
```

## Appendix: What to Tell Claude at Each Stage
- After P18, say "backend is ready for Postman" to get the guided API test walkthrough.
- If any prompt result looks wrong, paste the agent's output or error to Claude and ask for a corrected prompt.
- To add a new feature later, ask Claude for a new module prompt that follows the same pattern (API contract first, backend, Postman, then frontend).
