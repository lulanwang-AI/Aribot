---
name: Aribots and Ari AMR route separation
description: Product boundary between the Aribots V4 experience and the Ari AMR stewardship product.
---

Keep Aribots V4 and Ari AMR as separate experiences within the same web artifact. Aribots owns the main public site, its clinician login, and its original authenticated application. Ari AMR has its own public product page, login, and stewardship workspace.

**Why:** The user explicitly requires Aribots V4 to remain available and does not want its login or authenticated experience replaced by Ari AMR.

**How to apply:** When changing navigation, authentication, landing pages, or app shells, verify both product paths independently and avoid sharing redirects that send Aribots users into the AMR workspace.