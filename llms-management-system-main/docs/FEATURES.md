# LMS Features

## 1. Scope
The Laboratory Management System (LMS) is a multi-tenant web application. Many labs (tenants) use one application and one database, and each lab only ever sees its own data. The MVP has four features. They are intentionally small so the focus stays on structure, performance and scalability.

## 2. Roles and Permissions

| Capability | Super Admin | Lab Admin | Doctor | Receptionist |
|---|---|---|---|---|
| Manage labs (tenants) | Yes | No | No | No |
| Create a Lab Admin for a lab | Yes | No | No | No |
| Manage lab staff (Doctor, Receptionist) | Yes | Yes (own lab) | No | No |
| Register patient | No | Yes | No | Yes |
| View patients | No | Yes | Yes | Yes |
| Edit patient | No | Yes | No | Yes |
| Deactivate patient | No | Yes | No | No |
| Dashboard | Platform stats | Lab stats | Patient stats | Daily stats |

## 3. End-to-End Flow
1. The Super Admin creates a Lab (tenant) and, in the same step, its first Lab Admin.
2. The Lab Admin logs in and creates Doctors and Receptionists for the lab.
3. A Receptionist registers patients.
4. A Doctor views patients (read only).
5. Every lab only sees its own data. Lab A can never read Lab B.

## 4. Feature 1: Authentication
- Login with email and password, logout, silent session refresh, and a "current user" endpoint.
- Access token (15 minutes) and refresh token (7 days) are stored in httpOnly cookies.
- Refresh tokens are stored hashed in the database and rotated on every refresh.
- Email is globally unique, so the user does not choose a lab at login.
- After login the user lands on the dashboard for their role. Unauthenticated users are redirected to /login.
- A user whose account or lab is inactive cannot log in (403).

Acceptance: wrong password gives 401; inactive user or lab gives 403; after 15 minutes the session continues silently through refresh; logout clears all cookies.

## 5. Feature 2: Lab (Tenant) and Staff Management
**Super Admin: Labs**
- Create a lab (name, contact email, contact phone) together with its Lab Admin (name, email, password).
- Edit a lab and set it active or inactive. Inactive labs cannot log in.
- Labs list with server-side pagination, search and status filter.

**Lab Admin: Staff**
- Create a Doctor or Receptionist (name, email, password, role). The tenant is taken from the logged-in user, never from the request.
- Edit staff, reset a password, activate or deactivate (no hard delete).
- Staff list with pagination, search and role filter.

Acceptance: a Lab Admin can never create a Super Admin or another Lab Admin; a Lab Admin never sees users of another lab (404 on direct access).

## 6. Feature 3: Patients
- Register a patient: name, phone, gender, date of birth, address (optional).
- Each patient gets a unique patient code inside the lab (for example PT-0001).
- Patients list: server-side pagination, search by name or phone, sort by created date or name, filter by gender.
- Edit a patient. Deactivate a patient (soft delete, Lab Admin only).
- Patient details view (read only for the Doctor).
- Buttons for actions the role cannot perform are not rendered, and the API also returns 403.

Acceptance: list loads one page at a time; search is debounced (300 ms) and stored in the URL; changing pages never flashes an empty table; a patient of another lab returns 404.

## 7. Feature 4: Role-Based Dashboard
One endpoint, `GET /dashboard/stats`, returns data for the caller's role.

| Role | Stat cards | Charts and bars | Table |
|---|---|---|---|
| Super Admin | Total labs, Active labs, Total users | Bar chart: labs created per month (last 6); horizontal bars: users by role | None |
| Lab Admin | Total patients, Patients today, Total staff | Bar chart: registrations last 7 days; horizontal bars: gender breakdown | Recent patients (5) |
| Doctor | Total patients, Patients today | Bar chart: registrations last 7 days; horizontal bars: gender breakdown | Recent patients (5) |
| Receptionist | Registered by me today, Total patients | Bar chart: registrations last 7 days | Recent patients (5) |

Loading shows skeleton cards and chart placeholders. Empty data shows the "no data" empty state inside the chart card.

## 8. Cross-Cutting UX
- Server-side pagination, search and sorting on every list.
- Skeletons for content loading, spinners only on buttons and small indicators.
- Toasts (shadcn Sonner) for success and error messages; inline messages for form fields.
- Empty states (shadcn Empty) inside tables and charts when there is no data.
- Collapsible sidebar (icon-only mode), persistent across reloads; mobile drawer.
- Light and dark mode; modern, minimal, sleek design.

## 9. Sidebar by Role

| Role | Items |
|---|---|
| Super Admin | Dashboard, Labs, Users |
| Lab Admin | Dashboard, Staff, Patients |
| Doctor | Dashboard, Patients |
| Receptionist | Dashboard, Patients |

## 10. Out of Scope for Now
Test orders and results, sample tracking, invoices, report PDFs, notifications, audit log UI, ABAC rules, Redis caching, background jobs. The structure is ready for them (see ARCHITECTURE.md roadmap).
