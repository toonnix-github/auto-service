# AGENTS.md

## Purpose
This document defines how human developers and AI agents must work together in the **auto-service** project.  
It ensures consistent quality, safe development practices, and predictable behavior for all contributors.

---

# 1. Development Principles

## 1.1 Every Commit Must Build Successfully
Before pushing any commit:

```bash
npm run build
```

- Build must not fail  
- Fix warnings and errors before committing  
- Never push code that has not been built locally  

> Cloudflare Pages deploys automatically — a broken build will break production.

---

## 1.2 Every New Feature Must Include Tests
When adding or modifying features:

- Add frontend tests (React + Vitest)  
- Add backend tests (Hono test runner)  

Tests must cover:

- Happy path  
- Error handling  
- Input validation  

> Pull requests without tests will not be accepted.

---

## 1.3 No Manual Production Deploys
Do **not** deploy using:

```
wrangler deploy
```

All deployments must go through:

- Git commit → GitHub → CI → Cloudflare

---

## 1.4 Code Consistency Rules
- Use ESLint + Prettier  
- Functional React components only  
- Cloudflare Worker–compatible code only  
- API response shapes must remain stable  
- IDs must follow project standard (e.g., `p0001`, `g0001`, `srv0001`)  

---

# 2. Repository Responsibilities

## 2.1 Frontend (`/frontend`)
- React 18 + MUI  
- Responsive UI  
- API communication via `/api/*`  

Includes:
- Order list  
- Order detail  
- Order create/edit (WIP)  
- Customer and vehicle flows (future)  

---

## 2.2 Backend (`/api`)
- Hono framework  
- Cloudflare Workers runtime  

Routes:
- `/api/orders`
- `/api/customers`
- `/api/vehicles`
- `/api/goods`
- `/api/parts`
- `/api/services`

---

## 2.3 Database (`/db`)
- D1 schema  
- Seeds  
- Migrations  
- Must match production schema  

---

# 3. Agent Responsibilities

## 3.1 Agents MAY write code only if:
- Code builds successfully  
- Tests are included  
- Conventions in this document are followed  
- Schema changes include migration  

## 3.2 Agents MUST NOT:
- Deploy manually  
- Push to `main`  
- Add new dependencies without approval  
- Modify environment variables  
- Change architecture without confirmation  

## 3.3 Agents MUST:
- Ask for clarification if unsure  
- Produce Cloudflare Worker–compatible code  
- Follow existing UI/UX patterns  
- Keep API behavior consistent  

---

# 4. Workflow Rules

## 4.1 Branch Strategy

```
main      → Production
dev       → Development
feature/* → Feature branches
```

---

## 4.2 Pull Request Requirements
Each PR must include:

- Build passed  
- All new tests included  
- Migration file (if schema changed)  
- Updated documentation (if API/UI changed)  
- No console.log statements  
- Clear description of changes  

---

# 5. Deployment Rules
Deployment must be done **only via GitHub CI/CD**.  
Manual deployment from CLI is not allowed.

---

# 6. Human Developer Responsibilities
- Validate schema changes  
- Manage Cloudflare environment variables  
- Review AI-generated code  
- Ensure correctness of business logic  
- Manage versioning and migration order  

---

# 7. Long-Term Notes
Future enhancements include:

- Complete order creation flow  
- Customer & vehicle auto-suggest  
- Reports (sales, parts usage)  
- Mobile-friendly UI  
- Dashboard widgets  

---

# End of Document
