# Bagback Download — Interface Showcase & Public Contracts

<p align="center">
  <b>Official Public Architecture, TypeScript Contracts & API Specification for Bagback Download</b><br>
  Built by <a href="https://bagbacktech.com">Bagback Digital Solutions</a> & <a href="https://mohamedosama.me">Mohamed Osama</a>
</p>

---

## 🌟 Overview

This repository is the public interface and contracts showcase for **Bagback Download**, the universal open-source media download platform.

It exposes the TypeScript definitions, client contracts, architectural designs, and Clean-Room specifications for integrating with the Bagback Download ecosystem.

## 🏗️ Architecture

```mermaid
graph TB
    subgraph Client ["Client Integration"]
        Web["Web Frontend (PWA)"]
        Ext["Browser Extension"]
        SDK["Showcase SDK / Mock Client"]
    end

    subgraph Contracts ["Public Contracts Layer"]
        Core["@bagback-download/core"]
        Engine["@bagback-download/downloader-engine"]
    end

    subgraph Service ["Bagback Download Service"]
        API["REST & SSE Endpoints"]
    end

    SDK --> Core
    Web --> Contracts
    Contracts --> API
```

## 📦 Packages & Contracts

- [`packages/core`](./packages/core): Central TypeScript definitions (`Job`, `JobStatus`, `FormatInfo`, `AppLink`, `UrlAnalysisResult`).
- [`packages/downloader-engine`](./packages/downloader-engine): Modular downloader engine abstraction interfaces.
- [`docs/api-reference.md`](./docs/api-reference.md): Complete REST & SSE API specification.
- [`docs/architecture.md`](./docs/architecture.md): Monorepo and clean-room architectural overview.
- [`examples/mock-client.ts`](./examples/mock-client.ts): Example client contract usage.

## 🚀 Live Product

Experience the full live product at: [https://download.bagbacktech.com](https://download.bagbacktech.com)

## 📄 License

MIT License — Copyright (c) 2026 Mohamed Osama / Bagback Digital Solutions
