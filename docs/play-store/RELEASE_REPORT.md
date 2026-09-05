# Google Play Store — Release Readiness Report

**Branch:** `playstore-release`  
**App:** Jagiri's Kutumbam (`com.jagiris.app`)  
**Date:** 5 September 2026  
**Privacy Policy (public):** https://jagiris-family.vercel.app/privacy-policy  
**Production API:** https://jagiris-family.onrender.com  

This document is the Phase 1 audit + Phases 15–18 listing/checklist output.  
Minimum safe production fixes landed on this branch (see **FILES CHANGED**).

---

## Current Status

| Area | Status | Problem | Required Action |
| ---- | ------ | ------- | --------------- |
| Android build | READY | `frontend/android/` is local/gitignored | Keep regenerating via `npm run build:android` |
| Release build | NEEDS ACTION | Signing requires local `keystore.properties` | Copy `frontend/release/keystore.properties.example` → `frontend/android/keystore.properties` and fill passwords |
| AAB | NEEDS ACTION | Must run signed `bundleRelease` | `npm run aab:release` after signing config |
| App icon (device) | READY | 1024 sources + mipmaps | Optional: regenerate with `npm run icons:android` |
| Play listing icon | READY | Generated 512×512 | Upload `docs/play-store/assets/play-icon-512.png` |
| Splash screen | READY | Capacitor splash assets | No change required |
| Package name | READY | `com.jagiris.app` | Keep forever (cannot change after publish) |
| Version | READY | `versionCode 5` / `versionName 1.2.2` | Bump both for each Play upload |
| Backend | READY | Express + Postgres on Render | Redeploy this branch; set `JWT_SECRET`, `NODE_ENV=production`, `CORS_ORIGINS` |
| Database | READY | PostgreSQL | Ensure `DATABASE_URL` with SSL on Render |
| Authentication | READY | JWT + bcrypt | Confirm `JWT_SECRET` set on Render (weak default blocked in production) |
| Privacy Policy | READY | Public SPA route | Confirm Vercel redeploy shows latest policy text |
| Data deletion | READY | Account & privacy → delete with password | Shared family records retained (disclosed in policy) |
| Permissions | READY | INTERNET, camera, photos, notifications | Declare accurately in Data Safety |
| HTTPS | READY | Capacitor `androidScheme: https`, cleartext off | Rebuild APK/AAB after sync |
| Secrets | READY | Keystore/env gitignored | Never commit `.env` / keystore / passwords |
| Play Store compliance | NEEDS ACTION | Listing + Data Safety + AAB upload are manual | Follow Console checklist below |

---

## Architecture (audit summary)

| Layer | Technology |
| ----- | ---------- |
| Frontend | React 18 + Vite + Tailwind |
| Mobile shell | Capacitor 8 (Android) |
| Backend | Node.js + Express |
| Database | PostgreSQL (`pg`) |
| Auth | JWT Bearer + bcrypt password hashes |
| Hosting | Vercel (web) + Render (API) |
| Images | Local `/uploads` and/or Cloudinary |
| Push | Firebase Cloud Messaging (optional; gated by `VITE_ENABLE_PUSH`) |

---

## Data Safety table (from code — use in Play Console)

| Data Type | Collected | Shared | Stored | Encrypted in transit | Required | Reason |
| --------- | --------- | ------ | ------ | -------------------- | -------- | ------ |
| Name | Yes | With family members | Yes (users + family_members) | HTTPS | Yes (account) | Account + family profiles |
| Email | Yes | Family / admin as entered | Yes | HTTPS | Yes | Account login + profiles |
| Phone | Yes (optional) | Family workspace | Yes | HTTPS | No | Profile / wishes |
| Date of birth | Yes | Family workspace | Yes | HTTPS | No | Profiles, birthday alerts |
| Gender | Yes (optional) | Family workspace | Yes | HTTPS | No | Profile |
| Photos | Yes | Family workspace | Yes (DB path + Cloudinary/disk) | HTTPS | No | Gallery, profiles, events, chat |
| Family relationships | Yes | Family workspace | Yes | HTTPS | App core | Tree / spouses / parents |
| Approximate location (city/village) | Yes (optional) | Family workspace | Yes | HTTPS | No | Profile fields |
| Precise location (lat/lng) | Yes (places) | Family workspace | Yes | HTTPS | No | Places map pins |
| User IDs | Yes | Internally | Yes | HTTPS | Yes | Auth / memberships |
| Device tokens (FCM) | Yes if push enabled | Firebase | Yes | HTTPS | No | Push notifications |
| Blood group | Yes (optional) | Family workspace | Yes | HTTPS | No | Member health field — declare as Health |
| Messages (chat) | Yes | Conversation members | Yes | HTTPS | No | Private chat |
| App diagnostics | Minimal server logs | Hosting provider | Logs | HTTPS | Ops | Security / troubleshooting |
| Ads / analytics SDKs | No | No | No | — | — | None in app |

**Ads declaration:** No ads.  
**Data sold:** No.  
**Children:** Accounts for adults; children’s profiles may be entered by family (see Privacy Policy). Target audience: 18+.

---

## Permissions audit

| Permission | Why | Required? |
| ---------- | --- | --------- |
| `INTERNET` | API + maps tiles | Yes |
| `POST_NOTIFICATIONS` | Birthday/event alerts (Android 13+) | Yes if push/in-app alerts |
| `WAKE_LOCK` | FCM delivery | Keep if push plugin present |
| `CAMERA` | Chat camera capture (`@capacitor/camera`) | Yes for chat camera |
| `READ_MEDIA_IMAGES` | Gallery / chat image pick | Yes |
| `READ/WRITE_EXTERNAL_STORAGE` (legacy maxSdk) | Older Android photo access | Keep for API ≤32 |

No Contacts / Microphone / precise GPS runtime permission beyond map coordinates stored as place data.

---

## Store listing copy

### App name
Jagiri's Kutumbam

### Short description (≤80 chars)
Private family tree, events, photos, and memories for your Kutumbam.

### Full description
Jagiri's Kutumbam is a private family workspace for the Jagiri family and invited members. Keep your shared family tree, member profiles, events, photo albums, places, and important memories in one secure app.

**Features**
- Interactive family tree and member profiles
- Add, edit, and organize family records
- Events calendar with reminders
- Photo gallery albums
- Places and map pins for family locations
- In-app notifications for birthdays, anniversaries, and events
- Private messaging between family members
- Dark mode and mobile-friendly design
- Account & privacy controls, including data export (admin) and account deletion

**Privacy**
Your data stays in your family workspace. We do not sell personal information and we do not show ads. See our Privacy Policy: https://jagiris-family.vercel.app/privacy-policy

**Note**
This app requires an account. Access is for authorized family members.

### Category
Lifestyle (or Social)

### Contact email
nithun018@gmail.com

### Privacy Policy URL
https://jagiris-family.vercel.app/privacy-policy

### Screenshots to capture (do this manually)
1. Login screen  
2. Dashboard (birthdays / upcoming)  
3. Family Tree  
4. Family Members list  
5. Member profile  
6. Events list  
7. Photo Gallery  
8. Places map  
9. Notifications bell open  
10. Account & privacy (show delete account exists)

Phone screenshots: portrait, crisp, no debug banners. Prefer 1080×1920 or similar 9:16.

---

## Google Play Console checklist (manual)

1. Play Console developer account (one-time fee)
2. Create app → App name: Jagiri's Kutumbam → default language English (India) or English
3. App or game: App → Free
4. Store listing: short + full description
5. Upload app icon `docs/play-store/assets/play-icon-512.png`
6. Upload feature graphic `docs/play-store/assets/feature-graphic-1024x500.png`
7. Upload phone screenshots (min 2)
8. Contact details + Privacy Policy URL
9. Data Safety form using the table above
10. Content rating questionnaire
11. Target audience: 18+ / not designed for children
12. Ads: No
13. App access: provide test username/password for reviewers if registration is invite-only
14. Account deletion: declare in-app path (Account & privacy) + email
15. Upload signed AAB (`app-release.aab`)
16. Release notes
17. Start with Internal testing → Closed testing → Production
18. Submit for review
19. Monitor crashes / ANRs after launch

---

## RELEASE READINESS

| Category | Status |
| -------- | ------ |
| Code | READY (with this branch) |
| Android configuration | READY after keystore.properties |
| Backend | NEEDS ACTION — redeploy + env vars |
| Database | READY |
| Security | READY (JWT fail-fast, CORS allow-list, auth rate limits) |
| Privacy Policy | READY (redeploy Vercel if text is stale) |
| Data Safety | READY (fill Console from table) |
| Account deletion | READY |
| App icon | READY |
| Store graphics | READY (icon + feature graphic generated) |
| AAB | NEEDS ACTION — sign + build locally |
| Testing | NEEDS ACTION — smoke test signed build |
| Play Console | NEEDS ACTION — manual |

### BLOCKERS (must do before production upload)

1. Create `frontend/android/keystore.properties` with real store/key passwords (alias `jagiris-upload`).
2. Build signed AAB: `npm run aab:release`.
3. On Render: set `NODE_ENV=production`, strong `JWT_SECRET`, `CORS_ORIGINS=https://jagiris-family.vercel.app`, redeploy backend from this branch.
4. Redeploy Vercel frontend so `/privacy-policy` shows the latest text.
5. Complete Play Console Data Safety + listing assets + reviewer access.

### RECOMMENDED IMPROVEMENTS (non-blocking)

- Add `google-services.json` only if shipping FCM push in production.
- Tighten FileProvider paths.
- Purge Cloudinary profile photo on account delete.
- Remove hardcoded admin username privilege long-term.
- Stronger password policy (min 8+).

---

## FILES CHANGED

| File | Why |
| ---- | --- |
| `frontend/capacitor.config.json` | HTTPS WebView, no cleartext |
| `frontend/package.json` | Version 1.2.2 + `aab:release` + playstore assets script |
| `.gitignore` | Ignore keystores, APKs, AABs, keystore.properties |
| `backend/lib/jwtConfig.js` | Require JWT_SECRET in production |
| `backend/lib/corsConfig.js` | Restrict CORS origins |
| `backend/middleware/rateLimit.js` | Auth / delete-account rate limits |
| `backend/middleware/auth.js` | Use shared JWT secret |
| `backend/controllers/authController.js` | Use shared JWT config |
| `backend/controllers/accountController.js` | Use shared JWT config |
| `backend/lib/socketServer.js` | Shared JWT + CORS origins |
| `backend/server.js` | CORS allow-list + early JWT load |
| `backend/routes/auth.js` | Rate limit auth routes |
| `backend/routes/account.js` | Rate limit account deletion |
| `backend/.env.example` | Document NODE_ENV, CORS, Cloudinary |
| `frontend/release/keystore.properties.example` | Signing template |
| `frontend/resources/_generate_play_store_assets.py` | 512 / feature graphic generator |
| `docs/play-store/assets/*` | Listing graphics |
| `docs/play-store/RELEASE_REPORT.md` | This report |
| Local only: `frontend/android/...` | versionCode 5, signingConfigs, cleartext off, allowBackup false |

---

## BUILD COMMAND

```bash
cd frontend
# 1) One-time: copy signing template and fill passwords
copy release\keystore.properties.example android\keystore.properties
# edit android\keystore.properties

# 2) Ensure production API is set
# frontend/.env.capacitor → VITE_BACKEND_ORIGIN=https://jagiris-family.onrender.com

# 3) Build signed AAB
npm run aab:release
```

## AAB LOCATION

```
frontend/android/app/build/outputs/bundle/release/app-release.aab
```

(Also copy to a safe backup outside the repo; `*.aab` is gitignored.)
