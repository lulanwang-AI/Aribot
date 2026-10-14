---
name: Workspace dependency type cache
description: Stale TypeScript build caches after pnpm updates in the remixed workspace.
---

After dependency changes, identical package types can appear incompatible when one import resolves through the preinstalled root dependencies and another through pnpm. Align the declared type dependencies first, then force a TypeScript reference rebuild before editing application code to work around those errors.

**Why:** The remixed workspace retained stale incremental type information after aligning PostgreSQL type packages. A normal reference build kept reporting an incompatible Pool type; a forced reference rebuild cleared it without changing database behavior.

**How to apply:** If dependency alignment appears correct but type errors still compare old root-package types with current pnpm types, run `pnpm exec tsc --build --force` once. Do not suppress the errors with casts or relax type checking.
