# Security Specification

| Item | Implementation | Protects against |
|---|---|---|
| helmet | Secure HTTP headers | Clickjacking, MIME sniffing, header-based attacks |
| CORS | Only CLIENT_ORIGIN, credentials true | Unknown sites calling the API |
| Rate limiting | Login: 5 per 15 minutes per IP and email. General API: 300 per 15 minutes per IP | Brute force, abuse |
| NoSQL injection | Custom sanitize middleware removes keys starting with $ or containing a dot from body and params; strict zod schemas on body, query and params; strict Mongoose schemas; escaped search regex. MongoDB has no SQL injection, but operator injection such as { "$ne": null } is the equivalent risk | Operator injection |
| Input validation | zod on every route | Bad data and injection |
| Password hashing | bcrypt with 12 rounds | Database leaks |
| Cookies | httpOnly, secure in production, sameSite lax | Token theft through XSS |
| Refresh token rotation | Hashed storage, rotation, reuse detection | Stolen refresh tokens |
| Tenant isolation | JWT tenantId, Mongoose plugin, compound indexes, automated isolation test | Cross-tenant leaks |
| RBAC | authorize(permission) on every route; permissions map in constants/permissions.ts | Unauthorized actions |
| Self-protection | A user cannot deactivate themselves or change their own role | Lockouts, privilege escalation |
| Pagination cap | limit max 100 | Oversized responses |
| Error handling | No stack traces in production; generic login errors | Information disclosure |
| Env validation | zod check at startup; secrets never committed | Misconfiguration |
| Logging hygiene | Redact cookies, authorization header, passwords, patient personal data | Sensitive data in logs |
| Audit fields | createdBy, updatedBy, timestamps | Traceability (important for medical data) |
| Dependencies | npm audit in CI; lock files committed | Vulnerable packages |

Frontend rules: no tokens in localStorage or sessionStorage; no dangerouslySetInnerHTML; hide UI that a role cannot use, but never rely on it. The backend is the only real enforcement point.
