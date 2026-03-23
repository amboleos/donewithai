---
name: api-doc
description: Generate OpenAPI documentation for API routes
disable-model-invocation: true
---

# API Documentation Generator

Generate OpenAPI 3.0 specification for all API routes in the project.

## Usage

```
/api-doc [output-path]
```

- `output-path`: Optional. Defaults to `docs/api.yaml`

## Instructions

1. Scan all route handlers in `src/app/api/`
2. For each route, extract:
   - HTTP methods (GET, POST, PUT, DELETE)
   - Path parameters (e.g., `[id]`)
   - Query parameters
   - Request body schemas (from TypeScript types)
   - Response schemas
   - Authentication requirements (check for `getServerSession` or `verifyToken` imports)
3. Generate OpenAPI 3.0 YAML specification
4. Include:
   - Server URLs (dev and production)
   - Security schemes (Bearer JWT)
   - Error response schemas (401, 403, 404, 500)
5. Write output to specified path

## Patterns to Recognize

### Auth Detection
- `import { getServerSession } from "@/lib/server-auth"` → Requires auth
- `import { verifyToken } from "@/lib/simple-auth"` → Optional auth
- Admin routes check `session.role === "admin"`

### Response Patterns
- `NextResponse.json({ error: "..." }, { status: 400 })` → Error response
- `NextResponse.json(data)` → Success response

### SSE Endpoints
- Routes returning `text/event-stream` → Document as streaming
