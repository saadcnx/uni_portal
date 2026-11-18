# Rules for the AI Agent (always follow)

1. Read the documents named in the prompt before writing code. The documents in /docs are the source of truth. If a prompt conflicts with a document, stop and ask.
2. Use TypeScript in strict mode on both sides. No any unless justified with a comment.
3. Follow the folder structures in BACKEND.md and FRONTEND.md exactly. Do not invent new top-level folders.
4. Create only what the current prompt asks for. Do not build future steps early.
5. Do not add dependencies that are not listed in the docs without asking first.
6. Controllers are thin, services hold logic, models hold schema. Components never fetch directly; they use feature hooks.
7. tenantId always comes from the verified token and never from client input.
8. Every list endpoint is server-side paginated with limit capped at 100.
9. Use shadcn/ui components for all UI. Use the design tokens in DESIGN.md. No hard-coded hex colors in components.
10. Every data view needs loading, empty and error states.
11. No useState for server data. Use TanStack Query. Use URL state for search, page and sort.
12. After each step: run typecheck, lint and (where relevant) tests and the dev server, fix problems, then summarize what was created and how to verify it.
13. Keep code small and readable. No dead code, no TODO placeholders left behind, no console.log (use the logger on the backend).
14. Never commit secrets. Keep .env.example up to date.
15. Do not modify files in /docs unless the prompt asks for it.
