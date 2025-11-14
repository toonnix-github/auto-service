# CONTRIBUTING.md

## Introduction
Thank you for contributing to **auto-service**.  
This guide outlines the workflow, coding standards, and quality checks required before sending any pull requests.

Please read this document fully before contributing.

---

# 1. Branching Strategy

### Main branches:
```
main      → Production
dev       → Development
feature/* → Feature branches
```

### Creating a feature:
```
git checkout dev
git pull
git checkout -b feature/<short-description>
```

Examples:
- `feature/customer-search`
- `feature/order-create-flow`
- `feature/api-services-crud`

---

# 2. Commit Rules

### ✔ Every commit must:
- Build successfully  
- Pass lint  
- Include tests for any new feature  

### ✔ Commit message format:
```
<type>: <short description>

[optional body]
```

**Types:**
- `feat:` new feature  
- `fix:` bug fix  
- `docs:` documentation  
- `refactor:` non-breaking cleanup  
- `chore:` CI / config  
- `test:` add/update tests  

**Example:**
```
feat: add customer search API
```

---

# 3. Build Requirements

Before pushing any branch, run:

```bash
npm install
npm run lint
npm run build
npm run test
```

### The following is **not allowed**:
- Pushing code that was not built locally  
- Pushing code that breaks the frontend or backend  
- Pushing warnings/errors  

---

# 4. Pull Request Requirements

All PRs **must follow**:

### ✔ Must target `dev`  
No direct PR to `main`.

### ✔ Build must pass in GitHub Actions

### ✔ Tests included for new features

### ✔ Include screenshots for UI changes (if relevant)

### ✔ Include migration file if DB schema changed

Migration files stored in:
```
/db/migrations
```

### ✔ PR description must include:
- What feature is added  
- What tests are included  
- Any breaking change  
- Steps to reproduce / verify  

---

# 5. Database Rules

### ✔ Never modify existing tables directly  
Instead, create a new migration file:

```
/db/migrations/00x_change_name.sql
```

### ✔ Local and production schema must always match

### ✔ Seed data goes into:
```
/db/seed.sql
```

---

# 6. Coding Style

### Frontend (React + MUI)
- Functional components only  
- Use hooks responsibly (no conditional rendering of hooks)  
- Avoid over-nesting components  
- Use axios/fetch wrappers for API calls  
- Use consistent naming:  
  - `OrderList.jsx`  
  - `OrderDetail.jsx`  
  - `CustomerSelector.jsx`  

---

### Backend (Hono + Cloudflare Workers)
- Use `c.req.json()` for parsing  
- No Node.js built-ins (fs, path, Buffer, etc.)  
- All responses JSON  
- Validate all inputs  
- Consistent error structure:
```json
{ "message": "Error message", "details": "…" }
```

---

### API Status Codes
- `200` Success  
- `201` Created  
- `400` Validation error  
- `404` Not found  
- `409` Conflict  
- `500` Server error  

---

# 7. Testing

Tests must exist if:
- A new route is added  
- A new UI flow is added  
- Validation logic is added  
- A bug fix is made  

See **TESTING_GUIDE.md** for details.

---

# 8. Review Process

### PR will be rejected if:
- No tests  
- Build fails  
- PR description missing  
- Migration missing while schema changed  

### PR will be accepted when:
- Everything builds clean  
- Tests pass  
- Code readable  
- Naming consistent  
- No unused code  

---

# 9. Deployment

Deployment is **automatic** through GitHub CI.  
**Do NOT manually deploy using `wrangler deploy`.**

---

# End of Document
