<div align="center">
  <a href="https://github.com/mohamedosamaai">
    <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=24&pause=1000&color=2E86C1&center=true&vCenter=true&width=600&height=60&lines=Welcome+to+Bagback+Download+Showcase!🚀;Universal+Media+%26+File+Download+Manager;Architected+by+Mohamed+Osama" alt="Typing SVG" />
  </a>
</div>

<p align="center">
  <img src="https://raw.githubusercontent.com/mohamedosamaai/bagback-download-showcase/main/apps/web/public/apple-icon.png" alt="Bagback Download Logo" width="120" height="120" />
</p>

# Bagback Download Showcase 🚀

**An Enterprise-Grade, Open-Source Universal Media & File Download Manager**

Architected with precision by **Mohamed Osama**  
*Digital Transformation Architect (DDT) & Founder @ Bagback Digital Solutions*

---

<p align="center">
  <a href="https://img.shields.io/badge/CI%2FCD-🟢%20Passing-success?style=for-the-badge&logo=github-actions&logoColor=white">
    <img src="https://img.shields.io/badge/CI%2FCD-🟢%20Passing-success?style=for-the-badge&logo=github-actions&logoColor=white" alt="CI/CD Status" />
  </a>
  <a href="https://img.shields.io/badge/Security-Hardened%20🛡️-blue?style=for-the-badge">
    <img src="https://img.shields.io/badge/Security-Hardened%20🛡️-blue?style=for-the-badge" alt="Security Hardened" />
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
  <a href="https://img.shields.io/badge/Docker-Ready-blue?style=for-the-badge&logo=docker&logoColor=white">
    <img src="https://img.shields.io/badge/Docker-Ready-blue?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
  </a>
</p>

---

## 🌟 Executive System Overview

**Bagback Download Showcase** is a modern, high-performance universal file and media manager. It solves common web bottlenecks by offering a robust, self-hosted solution to securely extract and download media from numerous global video platforms, streaming services, and media engines, leveraging the full capability of `yt-dlp`.

Designed strictly for **Security and Privacy**, this showcase repository demonstrates how to manage background downloading securely. It utilizes native binary integrations and real-time Server-Sent Events (SSE) while keeping operations strictly in-memory and temporary storage, ensuring no residual data retention.

## 🏗️ Architectural & Technical Highlights

This project utilizes a modern monorepo layout dividing operations into clean application targets:

- **Clean Architecture & Folder Isolation**:
  - `apps/web/` - Next.js frontend application, offering a beautiful, responsive, and RTL-compliant UI with real-time download status integration.
  - `apps/server/` - Robust Express.js backend that orchestrates the execution of raw `yt-dlp` binaries, streams logs to connected clients, and securely cleans up post-download.
- **Real-Time Job Tracking (SSE)**: The backend exposes Server-Sent Events endpoints for seamless, zero-polling real-time updates directly to the Next.js UI.
- **Robust Security Practices**: 
  - Dynamic CORS enforcement.
  - Rate Limiting and strict URL input validation to prevent arbitrary execution or Server-Side Request Forgery (SSRF).
  - No sensitive environment data bundled into the client build.
- **i18n Translation & RTL/LTR Compliance**: Supports seamless switching between Arabic and English without violating UI code structure guidelines (Arabic strings are handled cleanly via translation).

---

## 🚀 Quickstart Guide (Local Development)

### Prerequisites
- Node.js (v20+)
- Python 3+ (For `yt-dlp` integration)
- FFmpeg (Installed on system PATH for media merging/conversion)

### 1. Project Initialization
```bash
# Clone the repository
git clone https://github.com/mohamedosamaai/bagback-download-showcase.git
cd bagback-download-showcase

# Install dependencies (Installs backend/frontend packages & downloads yt-dlp binary)
npm install
```

### 2. Launch Development Environments
Open two separate terminal instances:

**Terminal 1 (Backend API Server)**:
```bash
cd apps/server
npm run dev
```
*(The backend server operates on `http://localhost:4000`)*

**Terminal 2 (Frontend Web Client)**:
```bash
cd apps/web
npm run dev
```
*(The frontend operates on `http://localhost:5173`)*

---

## 🔒 Security Posture

As a publicly showcased project, Bagback Download places a high priority on security:
- We routinely audit our `npm` packages.
- Dependencies are tightly controlled to mitigate supply chain attacks.
- Execution parameters for `yt-dlp` are strictly sanitized to prevent injection attacks.

Please see the [SECURITY.md](SECURITY.md) file for more information on our vulnerability disclosure program and secure configuration.

---

## 📄 License

Distributed under the **MIT License**.

*Copyright © 2026 Mohamed Osama & Bagback Digital Solutions*
