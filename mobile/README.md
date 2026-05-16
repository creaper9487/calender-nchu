# 夠咪亭 mobile (Flutter)

A native iOS/Android client for [中興夠咪亭](../). Reuses the Next.js
backend at `/api/*` — does NOT do schedule extraction (still a desktop
bookmarklet step).

## What it does

- Pick up your `studentId` from local storage (set on first use).
- **Match** — enter studentIds (chips), see common free blocks.
- **Group** — create or join a 6-char group code, live-poll the
  members and shared free slots.
- Open the desktop schedule import flow in an in-app browser when
  needed (`/startup?group=...`).

## Setup

The `lib/` source is committed; the platform scaffolding (`android/`,
`ios/`, etc.) is intentionally not, so it stays small. To bootstrap:

```bash
cd mobile
flutter create --org tw.edu.nchu --project-name calender_nchu \
  --platforms=ios,android .   # fills in platform folders; will NOT
                              # overwrite our pubspec / lib
pnpm exec flutter pub get      # or just `flutter pub get`
flutter run                    # on a device or simulator
```

If `flutter create` complains about overwriting files, accept the
prompts only for platform/template files; keep `pubspec.yaml`,
`analysis_options.yaml`, `lib/`, `README.md` as-is.

## Configuration

API base URL is read from `--dart-define=API_BASE_URL=...`.

```bash
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000      # Android emulator → host
flutter run --dart-define=API_BASE_URL=http://localhost:3000     # iOS simulator
flutter run --dart-define=API_BASE_URL=https://gomeeting.example # prod
```

Default: `http://localhost:3000`.

## Architecture

```
lib/
  main.dart                 — app entry, route table
  api/api_client.dart       — typed HTTP wrapper around /api/*
  models/                   — DTOs mirroring lib/schedule-types.ts
  storage/local_store.dart  — shared_preferences wrapper for studentId
  screens/
    home_screen.dart        — landing
    match_screen.dart       — chip input + ranked blocks
    group_screen.dart       — code, members, polled blocks
    join_group_screen.dart  — enter a code to open group
```

Only one external dep beyond Flutter itself: `http` and
`shared_preferences`. No state management library — `setState` is
sufficient for the surface area here.

## Status

- ✅ Match flow (chip input → /api/match → list)
- ✅ Group create / join / view with 5s polling
- ✅ studentId persistence
- ⏳ Schedule import (still desktop-only via bookmarklet; mobile pops
     `/startup?group=...` in a webview when user lacks a schedule)
- ⏳ Push notification when group fills (deferred until backend has
     realtime / webhooks)
- ⏳ Calendar export (.ics) of common free slots
