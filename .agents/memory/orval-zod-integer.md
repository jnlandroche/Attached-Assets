---
name: Orval + Zod v3 integer type conflict
description: Orval 8.23.0 generates zod.int() for OpenAPI integer types, but the workspace uses Zod v3 which doesn't have that method.
---

**Rule:** Never use `type: integer` (or `type: ["integer", "null"]`) in `lib/api-spec/openapi.yaml`. Always use `type: number` (or `type: ["number", "null"]`).

**Why:** Orval 8.23.0 maps OpenAPI `integer` types to `zod.int()`, which is a Zod v4 API. The workspace catalog pins `zod: ^3.25.76`. Using `integer` in the spec causes `typecheck:libs` to fail with "Property 'int' does not exist on type 'typeof zod'".

**How to apply:** Any time the OpenAPI spec needs an integer field (IDs, sortOrder, occupancy, counts), declare it as `type: number` in the spec. The DB still stores proper integers; only the spec/codegen layer uses `number`.
