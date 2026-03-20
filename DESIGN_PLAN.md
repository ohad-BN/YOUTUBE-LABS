# YouTube Labs — Design Plan

**Version:** 0.1 (March 2026)
**Status:** Early development — core scaffolding exists, most features are stubs

---

## 1. What Is This Project?

YouTube Labs is a personal research and analytics tool for YouTubers. The goal is to combine the most useful features from four paid tools — **SocialBlade**, **Velio**, **VidIQ**, and **ViewStats** — into a single, self-hosted app.

The target user is a creator who wants to:
- Spy on competing channels without paying for multiple subscriptions
- Understand what kinds of videos go viral in their niche
- Organize video ideas and research in one place
- Track their own channel's growth over time

---

## 2. What Each Inspiration Tool Actually Does

Understanding the real tools clarifies what we are actually trying to build.

### SocialBlade
A **public stats tracker**. No login required. Shows subscriber counts, view counts, daily gains/losses, growth grades (F to A++), global channel rankings, and simple growth projections for any YouTube channel. It also estimates monthly ad revenue, though those estimates are rough. Its killer feature is that it works on any public channel without that channel needing to share access. It also does cross-platform tracking (Twitch, TikTok, Instagram).

### Velio
A **pre-production research tool**. Its purpose is answering: *"What should I make next?"* It searches across 179 million YouTube videos to find viral content, lets you filter by niche, tracks competitor channels and alerts you when one of them publishes a video that takes off, and provides a saved research hub (folders, tags, notes). The focus is on the planning phase — before you film — not after you publish.

### VidIQ
The most comprehensive of the four. It is a **YouTube SEO and growth suite**. It overlays real-time data directly on YouTube via a browser extension, scores keywords (search volume vs. competition), audits your own channel's health, gives a per-video SEO scorecard (15 checkpoints), tracks views-per-hour to detect viral momentum, and uses AI to generate titles, descriptions, tags, and even script outlines. It also flags keywords that risk demonetization.

### ViewStats
A **performance analysis tool** co-founded by MrBeast's team. Its signature feature is **outlier detection**: it identifies which videos on a channel dramatically outperformed that channel's average, and by how much. It also archives real A/B tests that creators ran on their thumbnails and titles so you can see what actually worked for other channels. It tracks thumbnail change history over time.

---

## 3. Current State of the Project

The project has a solid technical foundation: FastAPI backend, PostgreSQL database, React frontend with a clean UI theme. The structure correctly mirrors the four tools above — there is a dashboard and API routes for each one.

However, most features are **stubs or simulations**, not real implementations.

### What Works (Partially)

| Feature | Status | Note |
|---|---|---|
| YouTube Data API connection | Partial | Client exists but may not be called consistently |
| Channel tracking (store a channel) | Partial | Endpoint exists, model exists |
| Folder/group management | Partial | Create folders, add channels to them |
| Video feed per folder | Partial | Endpoint exists |
| Outlier detection | Stub | Score is calculated from stored data, but no real-time data refresh |
| Views-per-hour tracking | Stub | Field exists in DB, not populated automatically |
| Growth projections | Stub | Simple linear formula, needs real historical data to be meaningful |
| Keyword scoring | Fake | Uses a seeded random number, not real data |
| Saved ideas library | Partial | CRUD endpoints exist |
| Thumbnail change history | Stub | Model exists, nothing writes to it |
| User authentication | Stub | JWT models exist, no login flow in the UI |

### What Is Missing Entirely

- Channel search by name (the original goal — user can't look up a channel by typing a name)
- Channel grade / ranking display (like SocialBlade's A++ system)
- Estimated revenue display
- Side-by-side channel comparison
- Viral alerts / notifications
- A/B thumbnail test tracking (detecting when a creator changes a thumbnail)
- Keyword trend data (real search volume, not fake)
- Browser extension
- Any chart or graph for historical data
- Automatic data refresh (polling/scheduling to keep stats current)
- Proper user login and registration UI
- A way to actually delete a channel or folder

---

## 4. Feature Specification (What to Build)

This section defines every feature the app should have, grouped by module.

---

### Module 1 — Channel Search & Discovery
**Inspired by:** SocialBlade, Velio, ViewStats

This is the entry point to everything. Without being able to find and add channels, nothing else works.

**Features:**
- **Search by channel name** — type a channel name (e.g., "MrBeast", "Linus Tech Tips") and get a list of matching YouTube channels with thumbnail, subscriber count, and video count
- **Search by topic/niche** — type a topic keyword (e.g., "tech", "fishing", "cooking") to find channels publishing in that niche. Same underlying YouTube search API, different intent: instead of looking for a specific channel you know, you are discovering channels in a space you want to research. Example use cases: a creator in the fishing niche types "fishing" to find their competition; a tech creator types "linux" to find channels in an adjacent niche they want to monitor.
- **Channel preview card** — before adding to tracking, show a summary: name, avatar, subscribers, total views, upload frequency, latest video
- **Add to tracking** — one-click to start tracking a channel
- **Add to folder** — add a channel directly to an existing folder from the search result

**What's needed technically:**
- YouTube Data API search endpoint (`search.list` with `type=channel`)
- A search results UI component
- Connection between search results and the folder/tracking system

---

### Module 2 — Channel Groups (Folders)
**Inspired by:** Velio's competitor tracking hub

This is the organizational layer. A creator should be able to group channels by niche, competitor set, or inspiration list.

**Features:**
- **Create folder** — name it, optionally add tags (e.g., "competitors", "inspiration", "tech niche")
- **View folder** — see all channels in the folder with their current stats
- **Channel card in folder** — shows: thumbnail, name, subscriber count, total views, grade, last upload date, average views per video
- **Remove channel from folder**
- **Delete folder**
- **Sort channels** — by subscriber count, growth rate, average views
- **Aggregated video feed** — a combined, chronological feed of the latest videos from every channel in a folder, with thumbnails

**Currently missing:**
- Delete operations (no delete endpoint for folders or channels)
- Sorting
- Channel card with all the listed fields
- Grade/rank display

---

### Module 3 — Channel Analytics (SocialBlade-style)
**Inspired by:** SocialBlade

Per-channel stats view. Works on any public channel, no connection from the channel owner required.

**Features:**
- **Current metrics** — subscriber count, total views, video count, upload frequency
- **Daily gains/losses** — how many subscribers and views the channel gained or lost each day (requires daily polling)
- **Channel grade** — assign a letter grade based on growth rate and engagement (A++ down to F)
- **Growth chart** — a line chart showing subscriber and view count over the last 30/90 days
- **Growth projections** — estimated subscriber and view counts in 30, 60, 90, 180, and 365 days based on recent trend
- **Estimated monthly revenue range** — based on views and a typical CPM range (e.g., $2–$8 per 1000 views)
- **Upload frequency** — average videos per week/month
- **Channel comparison** — select two or more channels and view their metrics side-by-side in a table or chart

**Currently missing:**
- Daily data polling (the projections are a formula but there is nothing feeding real daily data into the database regularly)
- Charts (no charting library is installed)
- Revenue estimate calculation and display
- Grade calculation logic
- Channel comparison view

---

### Module 4 — Video Performance & Outlier Detection
**Inspired by:** ViewStats

The core analytical feature. Identifies which videos beat expectations and by how much.

**Features:**
- **Outlier score** — each video gets a multiplier: if a channel averages 100K views and a video got 500K, its score is 5x. Videos above 2x are "outliers."
- **Outlier feed** — a list of the biggest outlier videos across all tracked channels
- **Views-per-hour (VPH)** — real-time velocity metric. High VPH in the first 24–48 hours predicts viral momentum.
- **Top VPH feed** — show the fastest-rising videos across all tracked channels right now
- **Video detail view** — for any video: views, likes, comments, VPH, outlier score, publish date, thumbnail history
- **Thumbnail change tracker** — detect when a creator swaps their thumbnail (requires polling video metadata periodically)
- **A/B test detection** — if a title or thumbnail changes within 72 hours of publishing, flag it as a likely A/B test and record both versions

**Currently missing:**
- Automatic data refresh (VPH requires frequent polling — at minimum every few hours for new videos)
- Thumbnail change detection logic (the model exists but nothing populates it)
- A/B test detection
- Video detail view in the UI
- Outlier feed UI that shows channels alongside the videos

---

### Module 5 — Keyword & SEO Intelligence
**Inspired by:** VidIQ

Helps the creator figure out what topics have high search demand and low competition.

**Features:**
- **Keyword search** — enter a keyword, get a score breakdown
- **Volume estimate** — approximate monthly search volume (requires a data source; see note below)
- **Competition score** — how many well-established channels are targeting this keyword
- **Overall keyword score** — combined metric (current formula: `score = volume × 0.6 + (100 - competition) × 0.4`)
- **Related keywords** — similar terms ranked by score
- **Trending keywords** — keywords rising quickly in the past 7 days within tracked niches
- **Tag extractor** — pull all tags from any YouTube video to see what keywords competitors are targeting
- **Saved keyword list** — bookmark keywords for later reference

> **Important note on data:** Real keyword volume data requires either a paid API (like Google Trends, Ahrefs, or SemRush) or scraping (against terms of service). The current implementation generates fake scores. For a self-hosted tool, using Google Trends API (free but limited) or YouTube's own search suggestion API is a realistic low-cost approach. The keyword score formula is fine; the input data is what needs to be real.

**Currently missing:**
- Real keyword data source
- Related keywords feature
- Trending keywords
- Tag extractor
- Saved keyword list UI

---

### Module 6 — Content Ideas Library
**Inspired by:** Velio, VidIQ

A personal workspace for saving and organizing video ideas.

**Features:**
- **Save idea** — title, category, notes, linked reference video (optional)
- **Idea list** — view all saved ideas, filter by category
- **Idea status** — mark ideas as "backlog", "in progress", "published", "discarded"
- **Link to outlier video** — attach an idea to an outlier video that inspired it
- **Inspiration board** — display saved ideas alongside their reference video thumbnails

**Currently missing:**
- Idea status field (only title, category, and reference video ID exist currently)
- Inspiration board / thumbnail display
- Filter and sort in the UI

---

### Module 7 — Viral Alerts
**Inspired by:** Velio

Proactive notifications when something interesting happens in tracked channels.

**Features:**
- **New video alert** — when a tracked channel publishes a new video
- **Viral spike alert** — when a video from a tracked channel is gaining views unusually fast (high VPH)
- **Thumbnail change alert** — when a creator swaps a thumbnail (likely an A/B test)
- **Milestone alert** — when a tracked channel crosses a subscriber or view milestone
- **Alert log** — a feed of all recent alerts in the app

> **Implementation note:** Alerts require a background scheduler. The recommended approach is APScheduler (Python) running inside the FastAPI backend. A simple polling job every 2–4 hours is enough to catch viral spikes and thumbnail swaps.

**Currently missing:** This entire module does not exist yet.

---

### Module 8 — User Authentication
**Inspired by:** (basic requirement for any multi-user app)

Currently there is a hardcoded `demo@youtubelabs.com` user. A real login system is needed.

**Features:**
- **Register** — email + password
- **Login** — returns a JWT token
- **Protected routes** — all data endpoints require a valid token
- **User-specific data** — folders, ideas, and alerts are per-user

**Currently missing:**
- Login / register UI screens
- Frontend token storage and auth headers
- Route protection in the frontend

---

## 5. Build Priority Order

For a new developer, tackling everything at once is overwhelming. Here is a sensible order:

### Phase 1 — Make the Core Loop Work (Foundation)
These are the things needed for the app to do anything useful at all.

1. **Channel search by name** — this was the original stated goal and nothing works without it
2. **User login UI** — so data is not all shared under one demo account
3. **Real YouTube data fetching** — make sure channels and videos are actually pulled from the API when you add a channel
4. **Add a charting library** — install Recharts or Chart.js so data can be visualized (currently there are no charts at all)

### Phase 2 — Core Analytics
5. **Daily stats polling** — a background job that refreshes channel metrics every 24 hours
6. **Growth charts** — display subscriber/view history as a line chart
7. **Channel grade calculation** — implement the A/F grading logic
8. **Outlier score calculation** — make this run automatically when videos are refreshed, not on-demand

### Phase 3 — Power Features
9. **Thumbnail change detection** — poll video metadata, detect changes
10. **VPH tracking** — record view snapshots every few hours to calculate velocity
11. **Revenue estimate display**
12. **Channel comparison view**

### Phase 4 — Intelligence Features
13. **Viral alerts system** — background scheduler + alert feed UI
14. **Real keyword data** — connect to Google Trends or YouTube suggestions
15. **Tag extractor** — pull tags from any video URL
16. **Idea status tracking**

### Phase 5 — Polish
17. **Delete operations** — allow removing channels and folders
18. **Mobile-responsive layout**
19. **Export** — download channel data as CSV or PDF for sharing with brands

---

## 6. Technical Gaps to Fix

These are problems in the current code that will cause issues even before adding new features.

| Problem | Description | Fix |
|---|---|---|
| No background scheduler | Stats are only fetched when a user manually triggers an endpoint. Data gets stale immediately. | Add APScheduler to the FastAPI backend to poll channels every 6–24 hours |
| Keyword scores are fake | `vidiq.py` generates scores from a seeded random number, not real data | Replace with Google Trends API or YouTube search suggestion scraping |
| No charts installed | The frontend has no charting library | Install Recharts (`npm install recharts`) |
| No login UI | Auth JWT logic exists in the backend but there is no login screen | Build a login/register page |
| CORS allows all origins | `allow_origins=["*"]` is fine for dev, dangerous for production | Restrict to the app's actual domain before deploying |
| Demo user on startup | The app creates a demo user every time it starts | Remove this and use proper user registration |
| No delete endpoints | You can add channels and folders but not remove them | Add DELETE routes for all main resources |
| Projections with no history | Growth projections show immediately even with no daily data | Guard the projection endpoint to require at least 7 days of data |

---

## 7. Data Model — What Needs to Change

The existing database models are mostly correct. The additions needed:

| New Field / Table | Where | Why |
|---|---|---|
| `grade` field on `TrackedChannel` | Already exists | Needs a function to calculate and update it |
| `status` field on `SavedIdea` | Missing | For tracking idea pipeline (backlog/in-progress/published) |
| `Alert` table | Missing | Stores viral alerts and milestone notifications |
| `KeywordCache` table | Missing | Cache keyword scores with a timestamp so the same keyword is not re-fetched on every search |
| `ThumbnailHistory` | Already exists | Needs to be populated by a polling job |
| `VideoSnapshot` table | Missing | Stores periodic view counts per video to calculate VPH accurately |

---

## 8. What Would Make This Better Than the Paid Tools

The paid tools all cost money and cover general creators. A self-hosted personal tool has advantages:

- **No subscription cost** — once set up, it runs free (only YouTube API quota costs apply)
- **Custom niche focus** — track exactly the channels that matter, with custom tags and folders
- **Combined view** — all four tools in one interface instead of switching tabs
- **Private data** — research stays on your own machine
- **Extensible** — you can add features the paid tools do not have, like custom scoring formulas or linking ideas to specific video inspirations

The biggest opportunity is the **research workflow**: an end-to-end flow from "discover a competitor video" → "detect it's an outlier" → "save it as an idea" → "track keyword" → "publish and measure" — all in one place. None of the paid tools cover the full cycle.

---

## 9. YouTube API Quota Considerations

The YouTube Data API has a daily quota of 10,000 units (free tier). Some operations cost more than others:

| Operation | Cost |
|---|---|
| Search channels by name | 100 units |
| Get channel stats | 1 unit |
| Get video list for a channel | 1–100 units |
| Get stats for a single video | 1 unit |

For a personal tool tracking 50 channels with daily refreshes, the free quota is sufficient. If tracking hundreds of channels with frequent polling, a paid quota increase may be needed.

**Strategy:** Cache aggressively. Store stats in the database and only re-fetch from the API when the cached data is older than a threshold (e.g., 6 hours for videos, 24 hours for channel stats).

---

*End of document*
