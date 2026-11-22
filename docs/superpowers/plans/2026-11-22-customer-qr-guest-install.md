# Customer QR Guest and Install Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** QR visitors browse a real shop as guests and receive an optional, respectful install invitation.
**Architecture:** Existing App/StoreInfoScreen remain. Pure link/auth-return policy plus reusable install-event store and menu-scoped engagement controller.
**Tech Stack:** React, TypeScript, Vite PWA; existing Node tests/esbuild.
**Spec:** docs/superpowers/specs/2026-11-22-customer-qr-guest-install-design.md

## Global Constraints
- PR #125 is an explicit unmerged dependency; Production untouched.
- No anonymous sign-in, GPS fabrication, radius widening, real orders, notification prompts or settings changes.
- Retain original cart/UI and server authority. Install choice does not imply notification consent.

## Review Focus
- QR refresh/auth hydration must retain selected shop.
- Sign-in cancellation or auth failure must preserve cart and not unlock ordering.
- Private browsing/storage failure cannot crash or repeatedly interrupt.
- Installed state/event must hide invite/help immediately; prompt acceptance is not installation proof.
- Distinct menu engagement and dismissal must not create timers or notification calls.

### Task 1: QR and checkout return
- [x] Add failing behavior tests for validated shopId, safe URL cleanup, non-anonymous identity and one-shot return destination.
- [x] Implement services/customerEntry.ts and App QR/auth-return wiring; preserve query/hash and cart.
- [x] Route guest checkout to existing LoginScreen; resume checkout after confirmed sign-in, including success screens. Reject anonymous token use for pickup.
- [x] Run focused startup/profile/storefront/checkout tests.

### Task 2: Optional installation
- [x] Add failing tests for two distinct item selections, seven-day cooldown, corrupt/blocked storage, installed/dismissed/native prompt handling.
- [x] Reuse and test installation helpers; add CustomerInstall component inside original menu, no fixed overlay/timer.
- [x] Wire original StoreInfoScreen selections to engagement, with manual install entry and guest label.
- [x] Verify platform instructions and rendered installed/guest states.

### Task 3: Verify and review
- [x] Run relevant tests, TypeScript, production build, diff and added-line secret checks.
- [x] Update AGENTS/master functionality documentation; keep publication excluded until review.
- [x] Independent review; fix actual important findings. Commit locally; no Production merge/deploy.

## Execution record
Native execution requested by owner ('lets do your preferences'); prior conversational scope is the approved design. Current branch feature/customer-qr-guest-install-20261122, based on PR #125 ac1f993; prior worktrees/branches preserved.

Review result: independent reviewer caught auth screens retained behind checkout; fixed with tested stack replacement and delayed-callback guard. Re-review found no remaining important/critical defects. Browser fixtures used no GPS or live providers. Publication remains development-only; no Production merge/deploy.
