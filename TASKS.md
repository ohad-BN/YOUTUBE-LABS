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
- [ ] Channel preview card — show upload frequency and latest video before tracking

---

## Module 2 — Channel Groups (Folders)

- [X] Create folder with name
- [X] Delete folder
- [X] View channels in folder (thumbnail, name, subs, grade)
- [X] Remove channel from folder
- [X] Delete channel entirely
- [X] Aggregated video feed per folder
- [ ] Sort channels in folder — by subscriber count, average views
- [ ] Channel card: show last upload date
- [ ] Channel card: show average views per video
- [ ] Folder tags — assign tags when creating a folder (model supports it, UI doesn't)

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
- [ ] Growth projections — extend to 180 and 365 days
- [ ] Growth chart day-range toggle — let user switch between 30 and 90 day view
- [X] Upload frequency display — avg videos per week/month (compute from `video_count` + `created_at`)
- [X] Daily gains/losses display — show +/- subs and views per day on the chart
- [ ] Projections guard — require at least 7 days of `ChannelStatsDaily` data before showing projections
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
- [ ] A/B test detection — if title or thumbnail changes within 72h of publish, flag as A/B test and store both versions
- [ ] A/B test display — show before/after thumbnails side-by-side in ViewStats video detail modal
- [ ] "Save to Ideas" shortcut — button on outlier video cards to create an idea pre-linked to that video (research workflow)
- [X] Thumbnail change creates an `Alert` record (currently only writes to `VideoThumbnailHistory`)
- [X] Outlier score recalculated automatically by scheduler (currently only updated when the per-channel endpoint is called)

---

## Module 5 — Keyword & SEO Intelligence

- [X] Video keyword extractor — fetches title + description, returns keyword suggestions
- [X] Keyword extractor UI in VidIQDashboard
- [ ] Saved keyword list — bookmark keywords for later reference (model + UI)
- [ ] `KeywordCache` table — cache keyword lookups with timestamp to avoid re-fetching
- [ ] Related keywords — given a keyword, suggest similar ones (YouTube autocomplete API)
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
- [ ] Inspiration board — show reference video thumbnail alongside each idea
- [ ] Link idea to outlier video from the ViewStats feed

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
- [ ] CORS — restrict `allow_origins` before any public deployment
- [ ] Mobile-responsive layout — sidebar collapses, grid stacks on small screens
- [ ] Split large frontend files into smaller components (enforce file size rule)
- [ ] Loading skeletons — replace `animate-pulse` text with proper skeleton UI
- [ ] Error boundary — catch and display API errors gracefully across all dashboards

---

## Known Technical Debt

- [X] Fake keyword scores — removed
- [X] Hardcoded numbers in UI — eliminated
- [X] Demo user auto-seed — removed
- [X] Hardcoded channel IDs (ViewStats, SocialBlade) — real pickers
- [ ] `alembic upgrade head` — must be run after pulling (automated via `start_backend.bat`)
- [ ] YouTube API hides video tags from public responses — keyword extractor uses title/description (documented, by design)
- [ ] SocialBlade growth chart empty until midnight job runs at least once (by design)
- [ ] `VideoSnapshot` table not implemented — VPH uses simpler delta-per-cycle approach instead (acceptable for now)
