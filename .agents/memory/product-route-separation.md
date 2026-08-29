---
name: Aribots product routing
description: Product boundaries and hub relationship across ARIbots, Ari AMR, and Ari EMR.
---

Use the ARIbots V4 public site as the shared product hub, with clear connections to three distinct applications. ARIbots keeps its own clinician login and authenticated community/assistant experience. Ari AMR keeps its own product page, login, and antimicrobial stewardship workspace. Ari EMR remains a standalone application with its own server and clinical data model.

**Why:** The user explicitly wants one website that connects all three applications while preserving each product’s routes, login boundaries, purpose, and application shell.

**How to apply:** When changing navigation, authentication, landing pages, APIs, or app shells, verify all three product paths independently. Do not share redirects or API paths in ways that move users or data into another product.