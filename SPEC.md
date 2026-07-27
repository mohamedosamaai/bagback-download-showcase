# Bagback Download — Product Specification v1

## 1. Product Identity

**Product name:** Bagback Download  
**Owner:** Bagback Tech  
**Owner platform:** https://bagbacktech.com  
**Developer:** Mohamed Osama  
**Username:** @Mohamedosamaai  
**Founder website:** https://mohamedosama.me

Arabic identity text:

> صنع بحب للمستخدمين بدون أرباح.  
> من شركة Bagback Tech.  
> بيد المطور Mohamed Osama.

English identity text:

> Made with love for users, without profit.  
> Built by Bagback Tech by developer Mohamed Osama.

## 2. Product Goal

Bagback Download is a free, open-source download manager that helps users download and manage media/files from supported links and sources where they have permission to download.

## 3. Clean-room Requirement

This project must be built from scratch.

Forbidden:

- Copying source code from Seal or other downloader apps.
- Copying UI layouts exactly.
- Copying icons, strings, screenshots, documentation, or internal structure.
- Using the Seal name or brand.
- Presenting this app as an official fork or build of Seal.

Allowed:

- Building a new original app around general download-manager concepts.
- Using legally compatible open-source libraries with attribution.
- Creating original Bagback branding, UI, architecture, and documentation.

## 4. Distribution Plan

### Android

Initial target:

- APK via GitHub Releases.

Later targets:

- F-Droid after license and dependency review.
- Google Play only after policy review.

### iPhone

Initial target:

- PWA installable from Safari using “Add to Home Screen”.

Reason:

- Native iOS downloader apps may face App Store restrictions depending on behavior and supported sources.

### Native iOS

Deferred until a policy-safe scope is confirmed.

## 5. Core Features

### Download Input

- Paste URL.
- Validate URL.
- Show supported resource information.
- Show unsupported/blocked/unsafe link message.

### Media Options

- Video download when supported.
- Audio download when supported.
- Quality selection.
- Format selection.
- Subtitle option only when legally and technically supported.

### Download Manager

- Active downloads.
- Completed downloads.
- Failed downloads.
- Retry failed downloads.
- Delete download record.
- Open local file.
- Share local file.

### Network

- Wi-Fi only setting.
- Concurrent downloads limit.
- Rate limit.
- Retry policy.
- Proxy support later.

### Appearance

- Arabic interface.
- English interface.
- Light theme.
- Dark theme.
- Dynamic color later.

### Advanced Mode

- Custom filename template.
- Custom output folder.
- Engine update screen.
- Advanced command/options screen for experienced users only.

## 6. Settings Structure

- General
- Download Manager
- Audio & Video
- Quality & Formats
- Network & Connection
- Advanced Options
- Appearance
- Interface
- About Bagback Download
- Support
- Contributors

## 7. About Screen Links

- Bagback Tech: https://bagbacktech.com
- Try Elitk: https://elitk.com
- Developer Library: https://ai.bagbacktech.com
- Mohamed Osama: https://mohamedosama.me
- GitHub username: @Mohamedosamaai

## 8. Initial Architecture

```text
bagback-download/
├── apps/
│   ├── android/
│   └── web/
├── packages/
│   ├── core/
│   ├── downloader-engine/
│   └── shared-ui/
├── docs/
└── .github/
```

## 9. MVP Definition

MVP must include:

- App branding.
- URL input screen.
- Download queue UI.
- Settings UI shell.
- About screen with Bagback identity.
- Clean-room policy.
- Legal safe-scope notice.
- PWA starter shell.
- Android starter shell.

Actual downloader engine integration comes after the legal/dependency review.

## 10. Non-goals for MVP

- No copied Seal code.
- No copied Seal UI.
- No hidden copyright-infringement behavior.
- No native iOS App Store submission in MVP.
- No promise that every website is supported.

## 11. Public Positioning

Recommended wording:

> A free, open-source download manager for supported links and user-authorized media.

Avoid wording:

> Download from any website.

## 12. Current Status

Planning and initial scaffold.