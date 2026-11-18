# API Contract (v1)

Base URL: http://localhost:5000/api/v1. All bodies are JSON. Authentication uses cookies, so Postman and the browser keep them automatically. Every response uses the envelope from BACKEND.md section 7.

## Common
- Pagination query: page (default 1), limit (default 20, max 100), search, sort (for example -createdAt or name).
- Status codes: 200, 201, 400 (validation), 401 (not logged in or token expired), 403 (not allowed), 404 (not found, including other tenants), 409 (duplicate), 429 (rate limited), 500.
- Roles: SUPER_ADMIN, LAB_ADMIN, DOCTOR, RECEPTIONIST.

## Auth

| Method and path | Access | Body | Result |
|---|---|---|---|
| POST /auth/login | Public | { email, password } | 200 { user } and sets 3 cookies. 401 invalid credentials. 403 inactive user or lab |
| POST /auth/refresh | Cookie lms_refresh | none | 200 and new cookies. 401 invalid or expired |
| POST /auth/logout | Any | none | 200 and cookies cleared |
| GET /auth/me | Logged in | none | 200 { user } |

user = { id, name, email, role, tenantId, tenantName, isActive }. Login is rate limited (5 attempts per 15 minutes per IP and email).

## Tenants (SUPER_ADMIN only)

| Method and path | Query or body | Result |
|---|---|---|
| GET /tenants | page, limit, search, status, sort | Paginated list: { id, name, slug, status, contactEmail, contactPhone, userCount, createdAt } |
| POST /tenants | { name, contactEmail, contactPhone?, admin: { name, email, password } } | 201 { tenant, admin }. 409 if the admin email exists |
| GET /tenants/:id | none | Tenant |
| PATCH /tenants/:id | { name?, contactEmail?, contactPhone?, status? } | Updated tenant |

## Users (SUPER_ADMIN, LAB_ADMIN)

| Method and path | Query or body | Result |
|---|---|---|
| GET /users | page, limit, search, role, isActive, sort, tenantId (SUPER_ADMIN only) | Paginated list: { id, name, email, role, isActive, tenantId, tenantName, createdAt } |
| POST /users | { name, email, password, role, tenantId? } | 201 user. LAB_ADMIN may create only DOCTOR or RECEPTIONIST in its own lab. SUPER_ADMIN may also create LAB_ADMIN and must send tenantId |
| GET /users/:id | none | User |
| PATCH /users/:id | { name?, role?, isActive?, password? } | Updated user. A Lab Admin cannot change a role to SUPER_ADMIN or LAB_ADMIN |

## Patients

| Method and path | Access | Query or body | Result |
|---|---|---|---|
| GET /patients | LAB_ADMIN, DOCTOR, RECEPTIONIST | page, limit, search (name or phone), gender, sort | Paginated list: { id, patientCode, name, phone, gender, dateOfBirth, createdAt } |
| POST /patients | LAB_ADMIN, RECEPTIONIST | { name, phone, gender, dateOfBirth, address? } | 201 patient with generated patientCode |
| GET /patients/:id | LAB_ADMIN, DOCTOR, RECEPTIONIST | none | Full patient |
| PATCH /patients/:id | LAB_ADMIN, RECEPTIONIST | any editable field | Updated patient |
| DELETE /patients/:id | LAB_ADMIN | none | 200. Soft delete (isActive false); the patient disappears from lists |

Validation: name 2 to 80 characters; phone 7 to 15 digits (optional leading plus); gender MALE, FEMALE or OTHER; dateOfBirth a past ISO date; address up to 200 characters.

## Dashboard

GET /dashboard/stats (all roles). The shape depends on the role.

```
SUPER_ADMIN:
{ cards: { totalLabs, activeLabs, totalUsers },
  charts: { labsByMonth: [{ month: "2026-06", count }], usersByRole: [{ role, count }] } }

LAB_ADMIN:
{ cards: { totalPatients, patientsToday, totalStaff },
  charts: { registrationsLast7Days: [{ date: "2026-11-09", count }], genderBreakdown: [{ gender, count }] },
  recentPatients: [ up to 5 patients ] }

DOCTOR:
{ cards: { totalPatients, patientsToday },
  charts: { registrationsLast7Days, genderBreakdown }, recentPatients }

RECEPTIONIST:
{ cards: { registeredToday, totalPatients },
  charts: { registrationsLast7Days }, recentPatients }
```
registrationsLast7Days always contains 7 entries (missing days have count 0). labsByMonth contains the last 6 months.

## System
GET /health returns 200 { status: "ok", uptime, db: "connected" } with no authentication.

## Cookies
lms_access (httpOnly, 15 minutes), lms_refresh (httpOnly, 7 days, path /api/v1/auth), lms_session (readable by JavaScript, value 1, 7 days, only a hint that a session may exist).
