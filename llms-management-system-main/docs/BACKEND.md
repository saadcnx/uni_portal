# Backend Specification

Stack: Node.js, Express 5, TypeScript, MongoDB, Mongoose, zod, JWT, pino.

## 1. Folder Structure
```
backend/
  src/
    config/        env.ts (zod validated), db.ts, logger.ts, sentry.ts
    constants/     roles.ts, permissions.ts
    context/       tenantContext.ts (AsyncLocalStorage)
    middlewares/   requestId.ts, authenticate.ts, authorize.ts, validate.ts,
                   sanitize.ts, rateLimiter.ts, notFound.ts, errorHandler.ts
    plugins/       tenant.plugin.ts
    modules/
      auth/        auth.routes.ts, auth.controller.ts, auth.service.ts, auth.validation.ts, refreshToken.model.ts
      tenants/     tenant.routes.ts, tenant.controller.ts, tenant.service.ts, tenant.model.ts, tenant.validation.ts
      users/       user.routes.ts, user.controller.ts, user.service.ts, user.model.ts, user.validation.ts
      patients/    patient.routes.ts, patient.controller.ts, patient.service.ts, patient.model.ts, patient.validation.ts, counter.model.ts
      dashboard/   dashboard.routes.ts, dashboard.controller.ts, dashboard.service.ts
    routes/        index.ts (mounts all routers under /api/v1)
    utils/         ApiError.ts, apiResponse.ts, paginate.ts, cookies.ts, tokens.ts
    types/         express.d.ts (req.user, req.validated)
    scripts/       seed.ts
    app.ts
    server.ts
  tests/           auth.test.ts, rbac.test.ts, tenantIsolation.test.ts, patients.test.ts
  .env.example, Dockerfile, package.json, tsconfig.json, eslint.config.mjs, .prettierrc
```

## 2. Layer Rules

| Layer | Responsibility | Rules |
|---|---|---|
| Route | URL, method, middleware chain | No logic |
| Middleware | Auth, RBAC, validation, rate limit, errors | Reusable across modules |
| Controller | Read validated input, call service, send response | Thin. Never touches models directly |
| Service | Business logic and database access | Does not know req or res. Easy to unit test |
| Model | Mongoose schema, indexes, plugins | Structure and constraints only |
| Utils | ApiError, paginate, cookies, tokens | Written once, reused |

Express 5 forwards rejected promises to the error handler, so no asyncHandler wrapper is needed. In Express 5 req.query is read-only: the validate middleware must not assign to it. It parses body, query and params with zod and stores the result in req.validated = { body, query, params }.

## 3. Environment Variables
NODE_ENV, PORT (5000), MONGODB_URI, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, ACCESS_TOKEN_TTL (15m), REFRESH_TOKEN_TTL (7d), BCRYPT_ROUNDS (12), CLIENT_ORIGIN (http://localhost:3000), COOKIE_DOMAIN (optional), LOG_LEVEL (info), SENTRY_DSN (optional), SEED_SUPER_ADMIN_EMAIL, SEED_SUPER_ADMIN_PASSWORD. The app must fail fast at startup if env validation fails.

## 4. Data Models

**Tenant**: name, slug (unique), status (ACTIVE or INACTIVE), contactEmail, contactPhone, timestamps.

**User**: tenantId (null for SUPER_ADMIN), name, email (lowercase, globally unique), passwordHash (select false), role (SUPER_ADMIN, LAB_ADMIN, DOCTOR, RECEPTIONIST), isActive, lastLoginAt, createdBy, timestamps. Indexes: unique email; { tenantId, role }; { tenantId, createdAt: -1 }.

**Patient**: tenantId, patientCode (PT-0001 format, unique per tenant), name, phone, gender (MALE, FEMALE, OTHER), dateOfBirth, address, isActive, createdBy, updatedBy, timestamps. Indexes: { tenantId, patientCode } unique; { tenantId, createdAt: -1 }; { tenantId, name }; { tenantId, phone }.

**Counter**: tenantId, key, seq. patientCode is generated with an atomic findOneAndUpdate using $inc, so two simultaneous registrations never share a code.

**RefreshToken**: userId, tokenHash, expiresAt, revokedAt, replacedBy. TTL index on expiresAt.

The tenant plugin is applied to User and Patient (and Counter). It is not applied to Tenant or RefreshToken.

## 5. Tenant Plugin and Context
- authenticate verifies the access token, loads req.user = { id, role, tenantId, isSuperAdmin } and runs the rest of the request inside tenantContext.run(...).
- The plugin hooks find, findOne, countDocuments, updateOne, findOneAndUpdate, deleteOne and aggregate: if a context exists and the user is not a super admin, it adds tenantId to the filter (for aggregate, a leading $match). On save of a new document it sets tenantId.
- Login runs without a tenant context (the user is not known yet). All other tenant data access runs with one.
- A query for a record of another tenant returns nothing, which the service turns into a 404.

## 6. Authentication Details
- Login: lowercase the email, load the user with passwordHash, compare with bcrypt, check isActive and the tenant status, then issue tokens. Use the same generic message for wrong email and wrong password.
- Cookies (set by utils/cookies.ts): lms_access (httpOnly, 15m), lms_refresh (httpOnly, 7d, path /api/v1/auth), lms_session (not httpOnly, value 1, 7d, a hint for the frontend route guard; it carries no secret). All use sameSite lax and secure in production.
- Refresh: read lms_refresh, find the hashed token, reject if missing, revoked or expired, revoke it and issue a new pair (rotation). If a revoked token is presented again, revoke all tokens of that user.
- Logout: revoke the refresh token and clear all three cookies.
- Passwords: minimum 8 characters, at least one letter and one number.

## 7. Response and Error Format
```
Success:   { "success": true, "data": ..., "meta": { "total": 240, "page": 2, "limit": 20, "totalPages": 12 } }
Error:     { "success": false, "message": "Validation failed", "requestId": "...", "errors": [{ "field": "email", "message": "Invalid email" }] }
```
meta appears only on paginated lists. Production errors never include stack traces. Mongo duplicate key errors map to 409. ApiError carries statusCode, message and optional errors.

## 8. Pagination Helper
paginate(model, filter, { page, limit, sort, select }) runs find and countDocuments in parallel with Promise.all, uses lean(), caps limit at 100, defaults to page 1 and limit 20, and returns { data, meta }. Search uses an anchored, escaped, case-insensitive prefix regex on indexed fields (name, phone) so regex injection is impossible and indexes can be used.

## 9. Logging
pino with pino-http. Log requestId, method, url, status, duration, userId, tenantId. Redact req.headers.authorization, req.headers.cookie, body.password, and any patient personal fields. pino-pretty only in development. Sentry captures 5xx errors with the requestId.

## 10. Testing (Vitest, Supertest, mongodb-memory-server)
Must cover: login success and failure; refresh rotation; RBAC per role on every route group; tenant isolation (Lab A cannot read, edit or list Lab B data); patient code uniqueness under concurrent creation; pagination limits and meta.

## 11. Scripts
dev (tsx watch), build, start, lint, test, seed. The seed script creates the Super Admin from env and, in development only, a demo lab with one user per role and 50 demo patients.
