# LMS Architecture

## 1. Overview and Goals
A multi-tenant, role-based Laboratory Management System built as a modular monolith with a separate Next.js frontend and an Express API.
- Clean structure: module-based backend, feature-based frontend.
- Correct state management and no unnecessary re-renders.
- Reusable components and a single source of truth for data.
- Strong tenant isolation and security.
- Scalable: more users and data must not require a rewrite.

## 2. Repository Layout
```
lms/
  frontend/            Next.js app (own package.json)
  backend/             Express API (own package.json)
  docs/                Specification files (read by the AI agent)
  docker-compose.yml   Optional: mongo + api + web
  README.md
```
Frontend and backend are separate folders because their dependencies, builds and deployments differ. A shared types package can be added later if needed.

## 3. Technology Stack and Why

| Layer | Technology | Why |
|---|---|---|
| Language | TypeScript (both sides) | Type safety, fewer bugs, better editor support |
| Frontend framework | Next.js App Router | Server Components, file routing, layouts, loading.tsx and error.tsx, route protection |
| Styling | Tailwind CSS | Consistent design tokens, small CSS |
| UI | shadcn/ui | Own the component code, accessible (Radix), themeable, has Table, Sidebar, Chart, Empty, Sonner, Skeleton |
| Server state | TanStack Query | Caching, loading and error states, deduplication, keepPreviousData. This is the central data store |
| Tables | TanStack Table | Headless, manual server-side pagination and sorting |
| Client state | Zustand | Tiny, narrow selectors, no provider re-render problem |
| URL state | nuqs | Search, page and sort live in the URL; typed and minimal re-render |
| Forms | react-hook-form + zod | Uncontrolled inputs, shared validation schemas |
| Backend | Node.js + Express 5 | Simple, mature; native async error handling in v5 |
| Database | MongoDB + Mongoose | Flexible documents, schemas, plugins (tenant isolation), indexes, sharding later by tenantId |
| Validation | zod | One library on frontend and backend |
| Auth | JWT + bcrypt (bcryptjs), httpOnly cookies | Stateless, load-balancer friendly, tokens hidden from JavaScript |
| Security | helmet, cors, express-rate-limit, custom sanitizer | Headers, origins, brute force, NoSQL injection |
| Logging | pino | Fast structured logs: what is happening |
| Error tracking | Sentry | What is breaking, with stack traces |
| Quality | ESLint, Prettier, Vitest, Supertest | Consistency and tests on critical paths |
| DevOps | Docker + compose (optional) | Reproducible environment, one-command demo |

## 4. Multi-Tenancy Design
Strategy: one database, every tenant-owned document has a tenantId.
- tenantId comes only from the verified JWT, never from the body, URL or query.
- A Mongoose tenant plugin automatically adds tenantId to every find, count, update and delete, and sets it on save.
- The current tenant is carried through the request using AsyncLocalStorage.
- Every index on tenant data starts with tenantId.
- Super Admin has tenantId null and bypasses the tenant filter for tenant and user management only.
- Isolation test: Lab A requesting a Lab B record must receive 404.

## 5. Scalability Measures Implemented Now

| Technique | Problem it solves |
|---|---|
| Server-side pagination with limit capped at 100 | Large lists never load at once |
| Compound indexes starting with tenantId | Queries stay fast as data grows |
| lean() and field projection | Less memory and CPU per query |
| Stateless API (JWT, no in-memory sessions) | Any number of API instances can serve any request |
| Load balancer ready (Nginx or cloud LB) | Horizontal scaling without code changes |
| Connection pooling | No new database connection per request |
| TanStack Query cache and staleTime | Fewer API calls |
| Server Components, dynamic imports | Less JavaScript in the browser |
| Debounced search | No request per keystroke |
| Compression and rate limiting | Lower bandwidth, abuse protection |
| Central error handler and request IDs | Faster production debugging |
| Health endpoint and graceful shutdown | Safe deploys and load-balancer checks |
| API versioning (/api/v1) | Non-breaking evolution |
| Modular monolith | New module equals new folder; modules can be extracted later |
| Soft delete and timestamps | Recovery and auditability |

Future scaling: MongoDB read replicas, and sharding on tenantId (a natural shard key because every query includes it).

## 6. Observability
- pino: structured JSON logs with request ID, userId, tenantId, status and duration. Secrets and patient data are redacted.
- Sentry: unhandled errors in the API and in Next.js.
- Every request has an X-Request-Id header that also appears in logs and error responses.

## 7. Decisions and FAQ

### Why Docker, and is it required?
Not required. The project runs with plain npm scripts and MongoDB (local or Atlas free tier). Docker is recommended because one command starts MongoDB, API and web; every machine gets the same environment; and the same image can be deployed and run as several instances behind a load balancer. Recommendation: develop normally, then add Dockerfiles and docker-compose at the end (about 30 minutes). It is optional if time is short.

### Why are Redis, microservices and ABAC on the roadmap and not in the MVP?
Each has a real cost, and none is needed yet. Adding them without measurement is over-engineering.

| Technology | What it is | Why not now | Add when |
|---|---|---|---|
| Redis | In-memory store for caching, shared counters, queues | Data is small and MongoDB indexes plus pagination are enough. It is one more service to run, monitor and invalidate | Repeated heavy queries, several API instances needing shared rate limits or token blacklists, background jobs |
| Microservices | Many independently deployed services | Network calls, distributed transactions, deployment and monitoring overhead for a small app | A module (reports, notifications) needs independent scaling, or separate teams own services |
| ABAC | Access decisions from user, resource and context attributes | RBAC covers every current requirement; ABAC needs extra data and a policy layer | Rules such as "doctor sees only assigned patients", shift-based access, branches |

The design is ready for all three: permission checks live in one place, modules are independent folders, and tenant filtering is already an attribute check.

### What do we use instead of Redis right now?

| Redis use | Current approach |
|---|---|
| Caching repeated reads | TanStack Query cache (staleTime) on the client; MongoDB indexes, lean() and projection on the server |
| Session storage | Not needed: stateless JWT. Hashed refresh tokens in MongoDB with a TTL index for expiry |
| Rate-limit counters | express-rate-limit in-memory store (per instance). With several instances, switch to a Redis store |
| Faster dashboard counts | countDocuments on indexed fields plus a 60 second client staleTime |
| Background jobs | None yet. BullMQ (Redis based) later |

### Is the project limited? Will it scale?
Features are small, the architecture is not. A new module is a new folder, tenant isolation and indexes keep data safe and fast, the API is stateless, and the frontend caches and renders narrowly.

## 8. Roadmap

| Phase | Items | Trigger |
|---|---|---|
| 1 (now) | Auth, tenants, users, patients, dashboard, RBAC, tenant plugin, pino, helmet, pagination, loading, toast and empty states, Sentry, optional Docker | Core demo |
| 2 | Test orders and results, sample tracking, doctor notes, report PDF, audit log UI, email notifications | Business features |
| 3 | Redis cache and shared rate limits, BullMQ jobs, Nginx load balancer with several API instances | Traffic growth, heavy jobs |
| 4 | ABAC policies, CI/CD, Playwright end-to-end tests, read replicas | Complex access rules, team growth |
| 5 | Extract heavy modules as services, tenant sharding | Independent scaling needs |

## 9. What the Manager Should See

| Area | Proof |
|---|---|
| Structure | Module-based backend, feature-based frontend, shared reusable components |
| State | TanStack Query for server data, Zustand narrow selectors, URL state for filters, Context only for theme |
| Rendering | Server Components shell, keepPreviousData, targeted invalidation, no wasted renders |
| Multi-tenancy | tenantId from JWT, Mongoose plugin, compound indexes, isolation test |
| Security | helmet, CORS, rate limit, injection protection, bcrypt, httpOnly cookies, RBAC |
| UX | Skeletons, button spinners, Sonner toasts, empty and error states, collapsible sidebar |
| Scalability | Server pagination, indexes, stateless API, Docker, documented roadmap |
| Maturity | Redis, microservices and ABAC deliberately deferred with clear triggers |
