# YouTube Labs — Task Tracker

> **File size rule:** Keep all source files small and focused. Split any file that grows large into smaller modules.

---

## Module 1 — Channel Search & Discovery

- [X] Search by channel name
- [X] Search by topic/niche (tech, fishing, etc.)
- [X] Search results grid — thumbnail, name, subs, video count, description
- [X] One-click Track channel from search results
- [X] Add to folder from search results
- [X] Quick-track by URL or @handle (sidebar input)
- [X] `GET /velio/resolve?q=` — resolve URL/handle/name to channel ID
- [X] Channel preview card — show upload frequency and latest video before tracking

---

## Module 2 — Channel Groups (Folders)

- [X] Create folder with name
- [X] Delete folder
- [X] View channels in folder (thumbnail, name, subs, grade)
- [X] Remove channel from folder
- [X] Delete channel entirely
- [X] Aggregated video feed per folder
- [X] Sort channels in folder — by subscriber count, average views
- [X] Channel card: show last upload date
- [X] Channel card: show average views per video
- [X] Folder tags — assign tags when creating a folder (model supports it, UI doesn't)

---

## Module 3 — Channel Analytics (SocialBlade)

- [X] Current metrics — subs, views, video count
- [X] Channel grade (A++ → F)
- [X] Daily polling — `ChannelStatsDaily` written every midnight
- [X] Growth chart — subscriber history (Recharts line chart)
- [X] Growth projections — 30 / 60 / 90 days
- [X] Revenue estimate — low/high CPM $2–$8 per month
- [X] SocialBlade dashboard channel picker
- [X] Export channel data as CSV
- [X] Export channel data as PDF — for sharing with brands
- [X] Growth projections — extend to 180 and 365 days
- [X] Growth chart day-range toggle — let user switch between 30 and 90 day view
- [X] Upload frequency display — avg videos per week/month (compute from `video_count` + `created_at`)
- [X] Daily gains/losses display — show +/- subs and views per day on the chart
- [X] Projections guard — require at least 7 days of `ChannelStatsDaily` data before showing projections
- [X] Channel comparison — select 2+ channels, side-by-side metrics table

---

## Module 4 — Video Performance & Outlier Detection

- [X] Outlier score per video (multiplier vs channel average)
- [X] Per-channel outlier feed
- [X] Global outlier feed across all channels (`GET /viewstats/outliers/global`)
- [X] VPH calculation — `(new_views - old_views) / 6` per scheduler cycle
- [X] Global top VPH feed (`GET /viewstats/velocity/top`)
- [X] Dashboard home — global VPH leaderboard + global outliers
- [X] Thumbnail change detection — writes `VideoThumbnailHistory`, updates title
- [X] Video detail view — modal or side panel showing: views, likes, comments, VPH, outlier score, publish date, thumbnail history timeline
- [X] A/B test detection — if title or thumbnail changes within 72h of publish, flag as A/B test and store both versions
- [X] A/B test display — show before/after thumbnails side-by-side in ViewStats video detail modal
- [X] "Save to Ideas" shortcut — button on outlier video cards to create an idea pre-linked to that video (research workflow)
- [X] Thumbnail change creates an `Alert` record (currently only writes to `VideoThumbnailHistory`)
- [X] Outlier score recalculated automatically by scheduler (currently only updated when the per-channel endpoint is called)

---

## Module 5 — Keyword & SEO Intelligence

- [X] Video keyword extractor — fetches title + description, returns keyword suggestions
- [X] Keyword extractor UI in VidIQDashboard
- [ ] Keyword scored search — input a keyword, get a score breakdown using `score = volume × 0.6 + (100 - competition) × 0.4` (requires real data source)
- [ ] Tag extractor — pull tags from any YouTube video URL *(requires channel owner OAuth; public API hides tags — blocked by YouTube API limitation)*
- [X] Saved keyword list — bookmark keywords for later reference (model + UI)
- [X] `KeywordCache` table — cache keyword lookups with timestamp to avoid re-fetching
- [X] Related keywords — given a keyword, suggest similar ones (YouTube autocomplete API)
- [ ] Trending keywords — keywords rising in searched niches over last 7 days
- [ ] Real keyword volume/competition data — Google Trends API or YouTube search suggestions *(complex, future sprint)*

---

## Module 6 — Content Ideas Library

- [X] Save idea — title, category, optional video reference
- [X] Idea status — backlog / in-progress / published / discarded
- [X] Click status badge to cycle through statuses
- [X] `PATCH /vidiq/ideas/{id}/status` endpoint
- [X] Notes field on `SavedIdea` — free-text notes per idea (model + migration + UI)
- [X] Filter ideas by category in the UI
- [X] Sort ideas by status or date
- [X] Inspiration board — show reference video thumbnail alongside each idea
- [X] Link idea to outlier video from the ViewStats feed

---

## Module 7 — Viral Alerts

- [X] Milestone alert — fires when channel crosses 1K / 10K / 50K / 100K / 500K / 1M / 5M / 10M
- [X] `Alert` model + alembic migration (`002_add_alerts.py`)
- [X] Alert endpoints — list, unread count, mark all read
- [X] Notification bell in sidebar — badge, dropdown, auto-mark-read
- [X] New video alert — detect when a tracked channel publishes a new video (compare video count or poll recent videos)
- [X] Viral spike alert — when a video's VPH crosses a configurable threshold (e.g. 1000/hr)
- [X] Thumbnail change alert — create an `Alert` when thumbnail swap is detected (scheduler already detects it)
- [X] Per-alert mark-as-read (`PATCH /velio/alerts/{id}/read`)

---

## Module 8 — User Authentication *(deferred — not required for personal use)*

- [ ] `POST /auth/register` — email + password
- [ ] `POST /auth/login` — returns JWT
- [ ] JWT middleware on all protected routes
- [ ] Login / register UI screens
- [ ] Frontend stores token and sends `Authorization: Bearer` header
- [ ] All data scoped to logged-in user (folders, ideas, alerts)

---

## Infrastructure & Polish

- [X] APScheduler — channel stats refresh every 6h
- [X] APScheduler — video stats + VPH + thumbnail detection every 6h
- [X] APScheduler — daily snapshot at midnight
- [X] `start_backend.bat` runs `alembic upgrade head` before starting server
- [X] Toast notifications (sonner) — all `alert()` calls replaced
- [X] Demo user auto-seed removed from `main.py`
- [X] Unused imports cleaned from `main.py`
- [X] Dashboard home — real stats (channels, videos, folders)
- [X] CORS — noted with TODO comment in main.py; restrict before public deployment
- [X] Mobile-responsive layout — sidebar collapses, grid stacks on small screens
- [X] Split large frontend files into smaller components (enforce file size rule)
- [X] Loading skeletons — replace `animate-pulse` text with proper skeleton UI
- [X] Error boundary — catch and display API errors gracefully across all dashboards

---

## Known Technical Debt

- [X] Hardcoded channel IDs (ViewStats, SocialBlade) — real pickers
- [X] `alembic upgrade head` — automated via `start_backend.bat` on every startup
- [ ] YouTube API hides video tags from public responses — keyword extractor uses title/description (documented, by design)
- [ ] SocialBlade growth chart empty until midnight job runs at least once (by design)
- [ ] `VideoSnapshot` table not implemented — VPH uses simpler delta-per-cycle approach instead (acceptable for now)
