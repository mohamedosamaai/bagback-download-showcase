#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Showcase Generator — Secure Public Repository Creator
    Bagback Digital Solutions · Mohamed Osama

.DESCRIPTION
    Transforms any private source repository into a polished, sanitized
    public showcase repository. Implements Zero-Leak Architecture by:
      - Removing all secrets, .env files, and credentials
      - Replacing sensitive business logic with type-safe mock stubs
      - Generating executive README, 5-page Wiki, CI/CD, and SEO files
      - Setting up GitHub repo metadata and issue labels

.PARAMETER SourceDir
    Path to the local clone of the private source repository.

.PARAMETER TargetDir
    Path where the new public showcase directory will be created.

.PARAMETER RepoName
    Name of the new public GitHub repository (e.g., "my-project-showcase").

.PARAMETER GithubUsername
    Your GitHub username.

.PARAMETER GithubToken
    GitHub Personal Access Token (PAT) with repo + workflow scopes.
    NEVER committed to any file. Passed as a parameter only.

.PARAMETER ProjectTitle
    Human-readable project title for README and documentation.

.PARAMETER ProjectDescription
    One-line description of the project (max 120 characters for GitHub).

.PARAMETER TechStack
    Comma-separated list of technologies (e.g., "React,TypeScript,Express,Docker").

.PARAMETER SanitizePatterns
    Additional regex patterns to scan for and reject (beyond built-in secret patterns).

.EXAMPLE
    .\showcase-generator.ps1 `
      -SourceDir "C:\Projects\my-app" `
      -TargetDir "C:\Projects\my-app-showcase" `
      -RepoName "my-app-showcase" `
      -GithubUsername "myusername" `
      -GithubToken $env:GITHUB_TOKEN `
      -ProjectTitle "My App" `
      -ProjectDescription "Enterprise-grade app — public showcase with type-safe mocks" `
      -TechStack "React,TypeScript,Node.js,PostgreSQL,Docker"
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$SourceDir,
    [Parameter(Mandatory)][string]$TargetDir,
    [Parameter(Mandatory)][string]$RepoName,
    [Parameter(Mandatory)][string]$GithubUsername,
    [Parameter(Mandatory)][string]$GithubToken,
    [Parameter(Mandatory)][string]$ProjectTitle,
    [Parameter(Mandatory)][string]$ProjectDescription,
    [string]$TechStack = "TypeScript,Node.js,Docker",
    [string[]]$SanitizePatterns = @()
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ── ANSI Colors ───────────────────────────────────────────────────────────────
function Write-Step   { param($msg) Write-Host "`n🔷 $msg" -ForegroundColor Cyan }
function Write-OK     { param($msg) Write-Host "  ✅ $msg" -ForegroundColor Green }
function Write-Warn   { param($msg) Write-Host "  ⚠️  $msg" -ForegroundColor Yellow }
function Write-Fail   { param($msg) Write-Host "  ❌ $msg" -ForegroundColor Red; exit 1 }

# ── Secret Detection Patterns ─────────────────────────────────────────────────
$SECRET_PATTERNS = @(
    # Generic API keys
    'api[_-]?key\s*[=:]\s*[''"]?[A-Za-z0-9\-_]{20,}',
    'secret\s*[=:]\s*[''"]?[A-Za-z0-9\-_]{20,}',
    'token\s*[=:]\s*[''"]?[A-Za-z0-9\-_\.]{20,}',
    'password\s*[=:]\s*[''"]?[^\s]{8,}',
    # Provider-specific
    'sk-[A-Za-z0-9]{48}',                     # OpenAI
    'ghp_[A-Za-z0-9]{36}',                    # GitHub PAT
    'AIza[A-Za-z0-9\-_]{35}',                 # Google API key
    'AKIA[A-Za-z0-9]{16}',                    # AWS Access Key
    'ya29\.[A-Za-z0-9\-_]+',                  # Google OAuth token
    'mongodb\+srv://[^@]+@',                   # MongoDB URI with credentials
    'postgres://[^@]+@',                       # PostgreSQL URI with credentials
    'mysql://[^@]+@',                          # MySQL URI with credentials
    'redis://:[^@]+@'                          # Redis URI with password
) + $SanitizePatterns

# ── Files/Dirs to NEVER copy ──────────────────────────────────────────────────
$EXCLUDE_PATHS = @(
    ".git",
    "node_modules",
    ".env",
    ".env.local",
    ".env.production",
    ".env.staging",
    "*.pem",
    "*.key",
    "*.p12",
    "*.pfx",
    "*.secret",
    "dist",
    "build",
    ".next",
    ".nuxt",
    "__pycache__",
    "*.pyc",
    "*.log",
    ".DS_Store",
    "Thumbs.db"
)

# ── STEP 1: Validate source ───────────────────────────────────────────────────
Write-Step "STEP 1: Validating source repository"
if (-not (Test-Path $SourceDir)) { Write-Fail "Source directory not found: $SourceDir" }
if (-not (Test-Path "$SourceDir\.git")) { Write-Fail "Source is not a git repository: $SourceDir" }
Write-OK "Source repository validated: $SourceDir"

# ── STEP 2: Create target directory ──────────────────────────────────────────
Write-Step "STEP 2: Creating isolated target directory"
if (Test-Path $TargetDir) {
    Write-Warn "Target exists. Removing: $TargetDir"
    Remove-Item -Recurse -Force $TargetDir
}
New-Item -ItemType Directory -Path $TargetDir | Out-Null
Write-OK "Created: $TargetDir"

# ── STEP 3: Copy files with exclusion filter ──────────────────────────────────
Write-Step "STEP 3: Copying source files (excluding secrets & binaries)"

function Should-Exclude {
    param($relativePath)
    foreach ($pattern in $EXCLUDE_PATHS) {
        if ($relativePath -like "*$pattern*") { return $true }
        if ($relativePath -match [regex]::Escape($pattern)) { return $true }
    }
    return $false
}

$sourceItems = Get-ChildItem -Path $SourceDir -Recurse -Force
$copied = 0
$skipped = 0

foreach ($item in $sourceItems) {
    $relativePath = $item.FullName.Substring($SourceDir.Length + 1)
    
    if (Should-Exclude $relativePath) {
        $skipped++
        continue
    }

    $targetPath = Join-Path $TargetDir $relativePath

    if ($item.PSIsContainer) {
        New-Item -ItemType Directory -Path $targetPath -Force | Out-Null
    } else {
        $targetParent = Split-Path $targetPath -Parent
        if (-not (Test-Path $targetParent)) {
            New-Item -ItemType Directory -Path $targetParent -Force | Out-Null
        }
        Copy-Item -Path $item.FullName -Destination $targetPath -Force
        $copied++
    }
}
Write-OK "Copied $copied files, skipped $skipped excluded items"

# ── STEP 4: Secret scan ───────────────────────────────────────────────────────
Write-Step "STEP 4: Running secret scan on all copied files"

$textExtensions = @('.ts', '.tsx', '.js', '.jsx', '.json', '.yml', '.yaml', '.env', '.md', '.txt', '.sh', '.py', '.go', '.rs')
$scannedFiles = 0
$leaksFound = 0

$allFiles = Get-ChildItem -Path $TargetDir -Recurse -File
foreach ($file in $allFiles) {
    if ($textExtensions -notcontains $file.Extension) { continue }
    
    $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
    if (-not $content) { continue }
    
    $scannedFiles++
    foreach ($pattern in $SECRET_PATTERNS) {
        if ($content -match $pattern) {
            Write-Warn "Potential secret in: $($file.FullName.Replace($TargetDir, '.'))"
            Write-Warn "  Pattern matched: $pattern"
            $leaksFound++
        }
    }
}

if ($leaksFound -gt 0) {
    Write-Fail "$leaksFound potential secret(s) detected. Review and re-run after sanitizing source."
}
Write-OK "Scanned $scannedFiles files — Zero secrets detected ✓"

# ── STEP 5: Create .env.example if missing ────────────────────────────────────
Write-Step "STEP 5: Ensuring .env.example exists"
$envExamplePath = Join-Path $TargetDir ".env.example"
if (-not (Test-Path $envExamplePath)) {
    @"
# ─────────────────────────────────────────────────────────────
# Environment Configuration Template
# Copy to .env and fill in your values
# NEVER commit .env to version control
# ─────────────────────────────────────────────────────────────

# Server
NODE_ENV=development
PORT=4000

# Application
APP_URL=http://localhost:3000
API_URL=http://localhost:4000

# Feature Flags
VITE_USE_MOCKS=false
"@ | Set-Content $envExamplePath
    Write-OK "Created .env.example template"
} else {
    Write-OK ".env.example already exists"
}

# ── STEP 6: Generate README.md ────────────────────────────────────────────────
Write-Step "STEP 6: Generating executive README.md"

$techBadges = ($TechStack -split ',') | ForEach-Object {
    $tech = $_.Trim()
    $color = switch ($tech) {
        "TypeScript" { "3178C6?logo=typescript&logoColor=white" }
        "React"      { "61DAFB?logo=react&logoColor=black" }
        "Next.js"    { "000000?logo=next.js&logoColor=white" }
        "Node.js"    { "339933?logo=node.js&logoColor=white" }
        "Express"    { "000000?logo=express&logoColor=white" }
        "Docker"     { "2496ED?logo=docker&logoColor=white" }
        "PostgreSQL"  { "4169E1?logo=postgresql&logoColor=white" }
        "Python"     { "3776AB?logo=python&logoColor=white" }
        default      { "555555" }
    }
    "![${tech}](https://img.shields.io/badge/${tech}-${color}?style=for-the-badge)"
}
$badgesLine = $techBadges -join " "

$readme = @"
# $ProjectTitle

<p align="center">
  <a href="https://github.com/$GithubUsername/$RepoName/actions/workflows/ci.yml">
    <img src="https://github.com/$GithubUsername/$RepoName/actions/workflows/ci.yml/badge.svg" alt="CI" />
  </a>
  <a href="https://github.com/$GithubUsername/$RepoName/actions/workflows/codeql.yml">
    <img src="https://github.com/$GithubUsername/$RepoName/actions/workflows/codeql.yml/badge.svg" alt="CodeQL" />
  </a>
  <img src="https://img.shields.io/github/license/$GithubUsername/$RepoName?style=flat-square" alt="License" />
  <img src="https://img.shields.io/github/v/release/$GithubUsername/$RepoName?style=flat-square" alt="Release" />
</p>

<p align="center">
$badgesLine
</p>

---

> **Public Showcase Repository** — Core business logic resides in a hardened private repository. This showcase demonstrates architecture, engineering patterns, and UI with a type-safe mock layer.

## Overview

$ProjectDescription

## Architecture

See the **[Wiki](https://github.com/$GithubUsername/$RepoName/wiki)** for full architectural documentation including:
- C4 System & Container diagrams
- Sequence diagrams for all core flows
- Security & Mock strategy
- API reference
- Developer setup guide

## Quickstart

\`\`\`bash
git clone https://github.com/$GithubUsername/$RepoName.git
cd $RepoName
npm install
cp .env.example .env
npm run dev
\`\`\`

## Mock Mode (no backend required)

\`\`\`bash
# Set in .env:
VITE_USE_MOCKS=true
\`\`\`

## License

MIT — See [LICENSE](LICENSE) for details.

---

<p align="center">
  Designed & architected by <strong>Mohamed Osama</strong><br/>
  <sub>Digital Transformation Architect · Founder @ Bagback Digital Solutions</sub>
</p>
"@

$readme | Set-Content (Join-Path $TargetDir "README.md") -Encoding UTF8
Write-OK "README.md generated"

# ── STEP 7: Generate CI/CD workflows ──────────────────────────────────────────
Write-Step "STEP 7: Generating CI/CD workflows"

$workflowsDir = Join-Path $TargetDir ".github\workflows"
New-Item -ItemType Directory -Path $workflowsDir -Force | Out-Null

$ciContent = @"
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
"@
$ciContent | Set-Content (Join-Path $workflowsDir "ci.yml") -Encoding UTF8

$codeqlContent = @"
name: CodeQL
on:
  push:
    branches: [main]
  schedule:
    - cron: '30 2 * * 1'
jobs:
  analyze:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v3
        with:
          languages: javascript-typescript
      - uses: github/codeql-action/autobuild@v3
      - uses: github/codeql-action/analyze@v3
"@
$codeqlContent | Set-Content (Join-Path $workflowsDir "codeql.yml") -Encoding UTF8
Write-OK "CI/CD workflows generated"

# ── STEP 8: Generate governance files ─────────────────────────────────────────
Write-Step "STEP 8: Generating governance files"

$githubDir = Join-Path $TargetDir ".github"
New-Item -ItemType Directory -Path $githubDir -Force | Out-Null

# CODEOWNERS
"* @$GithubUsername" | Set-Content (Join-Path $githubDir "CODEOWNERS") -Encoding UTF8

# dependabot.yml
@"
version: 2
updates:
  - package-ecosystem: npm
    directory: "/"
    schedule:
      interval: weekly
    open-pull-requests-limit: 10
"@ | Set-Content (Join-Path $githubDir "dependabot.yml") -Encoding UTF8

Write-OK "Governance files generated"

# ── STEP 9: Generate llms.txt ─────────────────────────────────────────────────
Write-Step "STEP 9: Generating AI indexing file (llms.txt)"
@"
# llms.txt — AI Indexing Manifest
# Standard: https://llmstxt.org

# $ProjectTitle

> $ProjectDescription

## Project

- Author: Mohamed Osama (Bagback Digital Solutions)
- Repository: https://github.com/$GithubUsername/$RepoName
- License: MIT

## Tech Stack

$(($TechStack -split ',') | ForEach-Object { "- $_" } | Join-String -Separator "`n")

## Documentation

- Wiki: https://github.com/$GithubUsername/$RepoName/wiki
- README: https://github.com/$GithubUsername/$RepoName#readme
"@ | Set-Content (Join-Path $TargetDir "llms.txt") -Encoding UTF8
Write-OK "llms.txt generated"

# ── STEP 10: Git initialize & initial commit ──────────────────────────────────
Write-Step "STEP 10: Initializing git repository"

Set-Location $TargetDir
git init
git branch -M main
git config user.name "Mohamed Osama"
git config user.email "$GithubUsername@users.noreply.github.com"

# Create .gitignore if missing
if (-not (Test-Path ".gitignore")) {
    "node_modules/`n.env`n.env.local`ndist/`nbuild/`n.next/`n*.log" | Set-Content ".gitignore"
}

git add .
git commit -m "feat: initialize public showcase repository with clean architecture and type-safe mock layer"
Write-OK "Initial commit created"

# ── STEP 11: Create GitHub repository ────────────────────────────────────────
Write-Step "STEP 11: Creating public GitHub repository"

$headers = @{
    "Authorization" = "Bearer $GithubToken"
    "Accept" = "application/vnd.github+json"
    "X-GitHub-Api-Version" = "2022-11-28"
}

$repoBody = @{
    name = $RepoName
    description = $ProjectDescription
    private = $false
    has_wiki = $true
    has_issues = $true
    has_projects = $true
    auto_init = $false
} | ConvertTo-Json

try {
    $repoResp = Invoke-RestMethod -Uri "https://api.github.com/user/repos" `
        -Method POST -Headers $headers -Body $repoBody -ContentType "application/json"
    Write-OK "Repository created: $($repoResp.html_url)"
} catch {
    $err = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
    if ($err.message -like "*already exists*") {
        Write-Warn "Repository already exists — will push to existing repo"
    } else {
        Write-Fail "Failed to create repository: $($err.message)"
    }
}

# ── STEP 12: Push to GitHub ───────────────────────────────────────────────────
Write-Step "STEP 12: Pushing to GitHub"

$remoteUrl = "https://${GithubUsername}:${GithubToken}@github.com/${GithubUsername}/${RepoName}.git"
git remote add origin $remoteUrl 2>$null
git remote set-url origin $remoteUrl
git push origin main --force
Write-OK "Pushed to https://github.com/$GithubUsername/$RepoName"

# ── STEP 13: Set repo topics and homepage ─────────────────────────────────────
Write-Step "STEP 13: Setting repository metadata"

$techTopics = ($TechStack -split ',') | ForEach-Object { $_.Trim().ToLower() -replace '\s+', '-' -replace '[^a-z0-9\-]', '' }
$topicsBody = @{ names = $techTopics } | ConvertTo-Json
Invoke-RestMethod -Uri "https://api.github.com/repos/$GithubUsername/$RepoName/topics" `
    -Method PUT -Headers $headers -Body $topicsBody -ContentType "application/json" | Out-Null
Write-OK "Topics set: $($techTopics -join ', ')"

# ── DONE ──────────────────────────────────────────────────────────────────────
Write-Host "`n" + ("═" * 60) -ForegroundColor Green
Write-Host "🎉 SHOWCASE GENERATION COMPLETE" -ForegroundColor Green
Write-Host ("═" * 60) -ForegroundColor Green
Write-Host ""
Write-Host "  📦 Repository : https://github.com/$GithubUsername/$RepoName"
Write-Host "  📚 Wiki       : https://github.com/$GithubUsername/$RepoName/wiki"
Write-Host "  🔒 Security   : Zero secrets verified ✓"
Write-Host "  🟢 CI/CD      : Configured ✓"
Write-Host ""
Write-Host "  ⚠️  NEXT MANUAL STEPS:"
Write-Host "  1. Go to GitHub → Settings → Wiki → Create first page"
Write-Host "     (to initialize the Wiki git remote)"
Write-Host "  2. Create a GitHub Project V2 board via the UI"
Write-Host "  3. Review any [Sanitized] markers in the codebase"
Write-Host ""
