# Architecture

Bagback Download uses a clean monorepo structure.

## Apps

### apps/web

Installable PWA for iPhone and desktop browsers.

### apps/android

Native Android app planned for the next implementation stage.

## Packages

### packages/core

Shared types, app links, and platform-neutral models.

### packages/downloader-engine

Adapter layer for URL analysis and future engine integration.

No third-party engine is added until licensing and distribution requirements are reviewed.

## Current Flow

1. User enters a link.
2. The app validates the link format.
3. The engine adapter returns support status.
4. Execution is disabled until source and dependency review is complete.

## Design Principles

- Clean-room implementation.
- Original Bagback UI.
- Arabic and English support.
- PWA first for iPhone.
- Native Android first for APK distribution.
- Public, documented, reviewable open-source code.