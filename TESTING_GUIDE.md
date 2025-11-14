# TESTING_GUIDE.md

## Purpose
This guide defines the testing standards for the **auto-service** project, covering both frontend (React + MUI) and backend (Hono on Cloudflare Workers).  
All contributors must follow these guidelines to ensure code reliability and consistent behavior.

---

# 1. Test Requirements

### ✔ All new features MUST include tests  
If you add or modify a feature, you must also add tests for:

- Happy path  
- Input validation  
- Common failure cases  
- Edge cases  

### ✔ Tests must pass before any PR is merged  
Run:
```bash
npm run test
```

---

# 2. Types of Tests

The project uses two categories:

---

## 2.1 Backend Tests (Hono + Cloudflare Workers)

Located at:

```
/api/tests/
```

### Tools:
- `vitest`
- `hono/testing`
- In-memory D1 (stub)

### Test Cases MUST cover:
- Route reachable  
- Correct HTTP status code  
- JSON shape validation  
- Missing required fields  
- Invalid values  
- DB error handling  

### Example Test: Order Creation

```js
import { describe, it, expect } from "vitest";
import app from "../index";
import { unstable_dev } from "wrangler";

describe("POST /api/orders", () => {
  it("creates an order successfully", async () => {
    const worker = await unstable_dev("index.js");

    const res = await worker.fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order: {
          customerId: "c1",
          vehicleId: "v1",
          vatRate: 0.07
        },
        items: [
          { sourceId: "g0001", type: "goods", qty: 1, unitPrice: 500 }
        ]
      })
    });

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.order).toBeDefined();
  });
});
```

---

## 2.2 Frontend Tests (React + Vitest + Testing Library)

Located at:

```
/frontend/tests/
```

### Tools:
- `vitest`
- `@testing-library/react`
- `@testing-library/user-event`

### What must be tested:
- Component renders without errors  
- Required props checked  
- API calls mocked  
- User interactions:
  - Button click  
  - Form validation  
  - Table filters  
- Redirects (React Router)  
- Component state changes  

### Example Test: OrderList renders

```jsx
import { render, screen } from "@testing-library/react";
import OrderList from "../src/pages/OrderList";

describe("OrderList page", () => {
  it("renders page title", () => {
    render(<OrderList />);
    expect(screen.getByText(/รายการใบงาน/i)).toBeInTheDocument();
  });
});
```

---

# 3. Mocking API Calls

### Backend mocking (Workers)
Use:
```js
unstable_dev()
```

### Frontend mocking
Use:
```js
vi.spyOn(global, "fetch").mockResolvedValue(...)
```

Example:

```js
vi.spyOn(global, "fetch").mockResolvedValue({
  json: async () => ({ rows: [] }),
  ok: true,
});
```

---

# 4. Test Naming Convention

```
<module>.<action>.<expected behavior>.test.js
```

Examples:
- `orders.create.success.test.js`
- `orders.create.validation-error.test.js`
- `customers.list.empty.test.js`

---

# 5. Required Coverage

Minimum recommended coverage:

| Layer | Coverage |
|-------|----------|
| Backend logic | 80% |
| API endpoints | 70% |
| UI components | 60% |
| Critical flows (order create) | 100% |

---

# 6. When Tests Are Required

Tests are required when:

- Adding new routes  
- Modifying backend validation  
- Introducing new UI components  
- Changing business logic  
- Fixing bugs  

---

# 7. When Tests Are NOT Required

- Text changes  
- Static styling (CSS-only)  
- README / docs updates  
- Non-breaking refactoring (case-by-case)  

---

# 8. Running All Tests

### Frontend:
```bash
cd frontend
npm run test
```

### Backend:
```bash
cd api
npm run test
```

### Root (if configured):
```bash
npm run test
```

---

# 9. CI / GitHub Actions Requirements

A pull request **will NOT be merged** unless:

- All tests pass  
- Coverage does not decrease  
- Build is clean  
- No unused mock code  
- No console.log  

---

# End of Document
