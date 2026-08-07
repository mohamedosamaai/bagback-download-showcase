# Bagback Download 🚀

**Free, Open-Source Universal Media & File Download Manager**

Architected with pride by **Mohamed Osama**  
*Digital Transformation Architect (DDT) & Founder @ Bagback Digital Solutions*

---

<p align="center">
  <img src="https://raw.githubusercontent.com/mohamedosamaai/bagback-download/main/apps/web/public/apple-icon.png" alt="Bagback Download Logo" width="120" height="120" />
</p>

<p align="center">
  <a href="https://img.shields.io/badge/CI%2FCD-🟢%20Passing-success?style=for-the-badge&logo=github-actions&logoColor=white">
    <img src="https://img.shields.io/badge/CI%2FCD-🟢%20Passing-success?style=for-the-badge&logo=github-actions&logoColor=white" alt="CI/CD Status" />
  </a>
  <a href="https://img.shields.io/badge/Security-CodeQL%20🛡️-blue?style=for-the-badge">
    <img src="https://img.shields.io/badge/Security-CodeQL%20🛡️-blue?style=for-the-badge" alt="Security CodeQL" />
  </a>
  <a href="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge">
    <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" alt="License MIT" />
  </a>
  <a href="https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js&logoColor=white">
    <img src="https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js 15" />
  </a>
  <a href="https://img.shields.io/badge/TypeScript-Strict-blue?style=for-the-badge&logo=typescript&logoColor=white">
    <img src="https://img.shields.io/badge/TypeScript-Strict-blue?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  </a>
  <a href="https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react&logoColor=white">
    <img src="https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react&logoColor=white" alt="React 19" />
  </a>
  <a href="https://img.shields.io/badge/PostgreSQL-Latest-blue?style=for-the-badge&logo=postgresql&logoColor=white">
    <img src="https://img.shields.io/badge/PostgreSQL-Latest-blue?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  </a>
  <a href="https://img.shields.io/badge/Drizzle%20ORM-Active-orange?style=for-the-badge">
    <img src="https://img.shields.io/badge/Drizzle%20ORM-Active-orange?style=for-the-badge" alt="Drizzle ORM" />
  </a>
  <a href="https://img.shields.io/badge/Docker-Ready-blue?style=for-the-badge&logo=docker&logoColor=white">
    <img src="https://img.shields.io/badge/Docker-Ready-blue?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
  </a>
  <a href="https://img.shields.io/badge/Gemini%20API-Enabled-violet?style=for-the-badge&logo=google-gemini&logoColor=white">
    <img src="https://img.shields.io/badge/Gemini%20API-Enabled-violet?style=for-the-badge&logo=google-gemini&logoColor=white" alt="Gemini API" />
  </a>
</p>

---

## 🚀 Live Interactive Demo

Experience the full power of Bagback Download directly in your browser. Thanks to the type-safe client-side mock engine, you can search, analyze metadata, select resolution profiles, and track active downloads with realistic progress simulation—all without setting up a backend server.

### [🚀 Launch Live Interactive Demo](https://demo-link-placeholder.com)

---

## 🌟 Executive System Overview

**Bagback Download** is an enterprise-ready, blazing-fast universal file and media manager. It targets the common web bottleneck by providing a clean, self-hosted option for downloading files from video channels, audio streaming platforms, and major media engines. 

Designed under a strict **Clean-Room Engineering** mandate, the application ensures 100% privacy with zero tracker integrations, zero invasive cookies, and temporary filesystem caching that wipes downloaded files upon completion.

---

## 🏗️ Architectural & Technical Highlights

This project utilizes a modern monorepo layout divided into clean application layouts and reusable core packages.

- **Clean Architecture & Folder Isolation**:
  - `src/app/` - Handles the application configuration and root routing layout.
  - `src/components/` - Segmented into reusable layouts, styling controls, and core user-facing features.
  - `src/lib/` - Houses translation hooks and unified service clients.
  - `src/types/` - Holds strict TypeScript type definitions for domain entities.
  - `src/mocks/` - Core mock engines that simulate API endpoints for serverless environments.
- **Type-Safe Mock Strategy**: Swaps automatically from production Express endpoints to local mock engines when deployed on static environments or when queried via `?mock=true`.
- **Zero Secrets Leakage**: Hardcoded credentials and keys are strictly forbidden. System configurations use environmental schemas defined in `.env.example`.
- **i18n Translation & RTL/LTR Compliance**: Supports seamless switching between Arabic and English without violating UI code structure guidelines (Arabic strings are parsed strictly through dynamic translation mapping).

---

## 🚀 Quickstart Guide (Local Development)

### Prerequisites
- Node.js (v22+)
- Python 3 (For `yt-dlp` integration)
- FFmpeg (Installed on system PATH)

### 1. Project Initialization
```bash
# Clone the repository
git clone https://github.com/mohamedosamaai/bagback-download.git
cd bagback-download

# Install monorepo dependencies
npm install
```

### 2. Environment Configuration
```bash
# Setup environment parameters
cp .env.example .env
```

### 3. Launch Development Environments
```bash
# Start frontend web client (dev mode)
npm run web:dev

# Build and execute the backend server
cd apps/server
npm run build
npm start
```
- The frontend will be served at `http://localhost:5173`.
- The backend server operates at `http://localhost:4000`.

---

## 🐳 Docker Deployment (Production)

To containerize the service, execute the unified multi-stage build:
```bash
docker compose up -d --build
```
This spawns a container prepackaged with Python, node running the express API, and static frontend files served directly via Express.

---

## 📄 License

Distributed under the **Apache License 2.0**. See [LICENSE](file:///d:/%D8%AA%D8%AD%D8%AF%D9%8A%D8%AB%20%D8%AC%D9%8A%D8%AA%20%D9%87%D8%A8/LICENSE) for more details.

*Copyright © 2026 Mohamed Osama & Bagback Digital Solutions*
