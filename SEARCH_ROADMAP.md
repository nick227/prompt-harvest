# Search Roadmap

Status: Phases 1–2 implemented; local migration applied; production shadow rollout pending  
Scope: site-wide image search on the main gallery  
Last reviewed: 2026-08-02

## Executive summary

Prompt Harvest currently has a capable but internally inconsistent search implementation. The browser provides debounced, URL-addressable, infinite-scroll search with cancellation, retries, filtering, and result-state UI. The server protects image visibility correctly and separates validation, query construction, persistence, scoring, and response transformation into focused modules.

The core correctness problem is that the database paginates candidates before the application ranks and filters them. The API fetches a recent slice of substring matches, scores only that slice in JavaScript, removes low-scoring results, and then reports totals from the larger unscored database set. Page windows also overlap because each page skips `limit` rows but fetches `limit * 2`. As a result:

- a highly relevant older image can never reach the scorer;
- later pages can repeat candidates from earlier pages;
- `total` and `hasMore` can describe results the user will never see;
- result counts change meaning between the API and the rendered DOM;
- post-fetch tag and score filters can create short or empty pages;
- default scoring admits only exact or prefix prompt/tag matches even though retrieval uses broad substring matching.

The recommended path is not to begin with an external search engine. First establish a correct, observable search contract using MySQL full-text search and server-side filtering/ranking, backed by a normalized searchable document. Replace offset pagination with a stable cursor. Once relevance is measurable, add typo tolerance and optional semantic retrieval behind the same API contract. This gives the site substantially better search without introducing avoidable operational complexity.

## Goals

The search system should:

1. return the best authorized results, not merely the best results inside a recent database slice;
2. make totals, pagination, and filters internally consistent;
3. support natural multi-word prompt search, tags, provider, model, and ownership filters;
4. remain fast as the image collection grows;
5. expose enough telemetry to tune relevance using evidence;
6. preserve shareable `?q=` URLs and the existing gallery experience;
7. provide a clean upgrade path to typo-tolerant and semantic search.

## Non-goals

- Searching admin users, blog posts, terms, queue logs, or word suggestions. Those are separate search surfaces.
- Replacing the gallery/feed rendering system as part of the first search release.
- Introducing a hosted search vendor before database-backed search is measured and shown to be insufficient.
- Allowing relevance logic to weaken access-control rules.

## Current user experience

The main page contains one search input. Typing waits 300 ms and starts a search; Enter forces a refresh and Escape clears it. The active query is stored in the `q` URL parameter, so searches are reloadable and shareable. Results replace the gallery feed and continue loading through the existing infinite-scroll signal. The active public/private view and tag selections are applied to rendered result elements.

The browser also provides:

- request cancellation and stale-response protection;
- a 30-second request timeout and retry with exponential backoff;
- a five-minute, 50-entry in-memory LRU cache;
- client-side result deduplication;
- loading, empty, error, active-search, and result-count states;
- browser back/forward integration.

This is a stronger UX foundation than the ranking layer beneath it. Most roadmap work can preserve the visible behavior while simplifying its implementation.

## Current system

### Request flow

```text
Search input
  -> 300 ms debounce / Enter
  -> SearchManager and SearchCoordinator
  -> GET /api/search/images?q=<query>&page=<page>
  -> optional JWT authentication
  -> SearchController
  -> SearchService
       -> SearchValidator
       -> SearchQueryBuilder
       -> SearchRepository (Prisma/MySQL)
       -> SearchScoringService (in-process JavaScript)
       -> SearchResultTransformer
  -> browser cache, deduplication, DOM rendering, owner/tag filtering
  -> infinite-scroll request for the next page
```

### API contract

`GET /api/search/images` accepts:

| Parameter | Current behavior |
|---|---|
| `q` | Required; trimmed and lowercased; maximum 500 characters |
| `page` | Offset page, minimum 1 |
| `limit` | Defaults to 50; capped at 100 |
| `minScore` | Parsed by the controller and applied after retrieval |
| `tagFilter` | Supports `any`, `with`, `without`, and `specific`; applied after retrieval |
| `tags` | Parsed as an array and applied after retrieval |
| `exactOnly` | Parsed by the controller but dropped during option validation, so it has no effect |

The browser currently sends only `q` and `page`. Its owner and selected-tag filters are applied to result DOM elements rather than included in the API request.

### Authorization and visibility

The endpoint uses optional JWT authentication:

- anonymous visitors can retrieve public, non-hidden, non-deleted images;
- authenticated users can retrieve their own images plus public images;
- hidden and deleted images are excluded in both cases.

This access predicate is built before the content predicate and should remain a non-negotiable part of every future retrieval strategy, including semantic search.

### Candidate retrieval

The query is split on whitespace. Every word is searched with a Prisma `contains` predicate across `prompt`, `original`, `provider`, and `model`. All word/field conditions are joined with OR, so a multi-word query needs to match only one word in one field.

Tags are not part of database candidate retrieval because `Image.tags` is JSON. Despite the endpoint documentation, an image that matches only by tag is not discoverable. Tag scoring occurs only if the image was already retrieved through another field.

Candidates are ordered newest-first. For a requested `limit`, the repository skips `(page - 1) * limit` rows but takes `limit * 2` rows. The database count is calculated against the broad substring predicate.

### Ranking and filtering

The server scores the retrieved candidates in JavaScript. Each query word can contribute points for prompt equality/prefix/containment, an original-prompt match, tags, provider, and model. It then applies score and tag filters, sorts by score, and returns at most `limit` images.

The configured production defaults differ from the scorer's internal fallback weights:

- exact prompt: 100;
- prompt prefix: 100;
- exact tag: 70;
- tag prefix: 40;
- prompt/tag containment, provider/model, and original-prompt contributions: 0;
- default minimum score: 50.

Consequently, the database may retrieve a substring match that is later assigned a score of zero and discarded. `matchType` is declared and validated but is not used by the query builder or scorer.

### Response and display

The API removes the internal score, aliases `imageUrl` to `url`, and returns items, page metadata, `hasMore`, query metadata, a request ID, and duration. The browser accepts several historical response shapes, validates IDs, caches pages, renders through the feed image handler, and deduplicates repeated IDs.

Public/private and active tag filters are then applied in the DOM. Counts shown in the search indicator describe loaded/rendered results, while the API total describes all broad database candidates. They are therefore not the same measure.

## What works well

- Visibility rules are explicit and applied in the database query.
- The backend is separated into controller, validation, query, repository, scoring, and transformation responsibilities.
- Search has a stable endpoint and a response envelope compatible with the gallery.
- The UI supports debounce, cancellation, stale-request protection, retries, timeout, empty/error states, deep links, and back/forward navigation.
- Search results reuse the established image renderer rather than maintaining a second card implementation.
- Query and pagination limits are validated.
- Request IDs and duration are already available, providing a base for observability.

## Problems and risks

### P0: correctness

#### Ranking happens after pagination

Only a newest-first candidate window is scored. Relevance is therefore local to that window rather than global to the authorized corpus. This is the largest quality defect.

#### Page windows overlap

With a limit of 50, page 1 fetches database rows 0–99 and page 2 fetches rows 50–149. Client-side deduplication hides some symptoms but can produce short pages and cannot restore skipped results.

#### Pagination metadata describes a different set

`total` counts broad database candidates before scoring and post-fetch filters. `hasMore` compares that total with the number of returned, filtered images. It can remain true after all displayable matches are exhausted or be misleading when pages are sparse.

#### Documented features do not work as described

- tag-only matches cannot enter the candidate set;
- `exactOnly` is parsed and then discarded;
- `matchType` is accepted internally but ignored;
- the browser does not send its active tag or owner filters to the endpoint.

### P1: relevance and performance

#### Substring predicates do not scale well

`contains` across MySQL text fields generally cannot use the existing B-tree indexes to satisfy leading-wildcard text search. The current indexes primarily support feed visibility/order predicates, not relevance retrieval.

#### Multi-word semantics are overly broad

`red fox forest` matches any single word in any field. There is no phrase boost, all-terms mode, token normalization, stop-word handling, or explicit AND/OR behavior.

#### Recency and engagement are not controlled ranking signals

Newest-first affects which candidates are eligible, but recency is not an intentional, tunable tie-breaker. Rating and likes do not influence ranking. This makes relevance hard to explain or tune.

#### JSON tags are a search dead end

JSON is convenient for display but weak for indexed tag lookup, tag facets, counts, and joins. The separate legacy `tags` model does not currently participate in this image search pipeline.

### P1: maintainability

The frontend search surface is about 3,700 lines across more than 20 global-script classes. The input, URL router, state manager, coordinators, cache, retry strategy, pagination, feed integration, DOM filtering, UI managers, and display managers have overlapping responsibilities. Examples include:

- a cache that is cleared for the query at the start of every normal search, reducing its value;
- both cancellation and request-ID stale-result handling;
- DOM polling every 500 ms to hide feed images during active search;
- result counts derived from DOM state rather than response state;
- multiple compatibility response formats and initialization polling loops;
- unconditional DOM-search diagnostic logging in a helper.

The abstractions are individually understandable, but the total coordination cost makes behavioral changes risky.

### P2: product and operations

- There are no search-specific unit, integration, relevance, or end-to-end tests.
- There are no query analytics, zero-result metrics, click-through metrics, or relevance judgments.
- There is no stated latency or quality service-level objective.
- Search logging includes query strings, which may contain user-sensitive prompt text; retention and redaction rules are not defined.
- A 500-character interactive query limit is much larger than the useful search-query range and increases query cost.

## Proposed superior system

### Design principles

1. Apply authorization, filtering, ranking, and pagination to one logical result set.
2. Rank in the retrieval layer, not after offset pagination.
3. Make the API the source of truth for totals, facets, and filters; use the DOM only for rendering.
4. Keep exact metadata filters separate from free-text relevance.
5. Measure search quality before adding more sophisticated retrieval.
6. Keep one contract while allowing retrieval implementations to evolve.

### Target architecture

```text
Search UI
  -> SearchController (typed query contract)
  -> SearchService
       -> QueryParser
       -> AccessPolicy
       -> SearchRepository
            -> MySQL FULLTEXT ranked retrieval
            -> exact owner/provider/model/tag filters
            -> stable cursor pagination
       -> ResultMapper
       -> SearchTelemetry
  -> items + nextCursor + optional total/facets + request metadata
```

Later, `SearchRepository` can become a hybrid retriever that combines lexical and vector candidates without changing the browser contract.

### Search document

Create a normalized search representation for each image. Two viable implementations are:

1. **Recommended initial implementation:** add materialized normalized text columns to `images`, such as `searchPrompt` and `searchMetadata`, and maintain them when an image or its tags change. Add MySQL FULLTEXT indexes to the searchable text.
2. Create a dedicated one-to-one `ImageSearchDocument` table containing image ID, normalized prompt/original/tags/provider/model text, timestamps, and optional embedding metadata.

The dedicated table offers a cleaner future indexing boundary; materialized columns require less initial plumbing. Choose based on migration size, but expose both through the same repository interface.

Normalize tags into a relational model (`Tag` plus `ImageTag`) or an equivalent indexed association. Retain JSON tags temporarily for response compatibility, but make the association the queryable source of truth. Backfill idempotently and dual-write during migration.

### Lexical retrieval and ranking

Use MySQL FULLTEXT search in boolean/natural-language mode through a parameterized raw query or a database view/repository adapter. A practical first ranking function is:

```text
lexical score
  = prompt full-text relevance * promptWeight
  + original-prompt relevance * originalWeight
  + exact tag match * exactTagBoost
  + tag text relevance * tagWeight
  + exact provider/model match * metadataBoost
  + bounded recency decay * recencyWeight
  + bounded quality signal * qualityWeight
```

Important details:

- exact phrase and exact tag matches should receive explicit boosts;
- all query terms should be preferred by default, with a documented relaxed fallback when strict retrieval returns too few results;
- metadata filters should constrain the query rather than merely add score;
- recency and quality boosts must be bounded so they cannot overwhelm text relevance;
- every tie must have deterministic secondary ordering, such as `createdAt DESC, id DESC`;
- internal score explanations may be returned only in development/admin diagnostics, not the public payload.

### API v2 contract

Evolve the existing endpoint without an abrupt browser migration:

```http
GET /api/search/images?q=red+fox&limit=30&cursor=<opaque>&scope=public&tags=forest&provider=openai&model=dall-e
```

Recommended parameters:

| Parameter | Meaning |
|---|---|
| `q` | Free text; normalized server-side; suggested maximum 200 characters |
| `limit` | Page size, default 30, maximum 100 |
| `cursor` | Opaque continuation token containing stable sort values and query fingerprint |
| `scope` | `public`, `mine`, or `all-visible`; authorized and validated server-side |
| `tags` | Repeated or comma-separated exact tag filters |
| `tagMode` | `any` or `all` |
| `provider`, `model` | Exact metadata filters |
| `sort` | `relevance` by default; optionally `newest`, `oldest`, `top-rated` |

Recommended response:

```json
{
  "success": true,
  "data": {
    "items": [],
    "page": {
      "nextCursor": null,
      "hasMore": false,
      "returned": 0,
      "total": 0,
      "totalRelation": "exact"
    },
    "facets": {
      "providers": [],
      "models": [],
      "tags": []
    },
    "query": {
      "raw": "red fox",
      "normalized": "red fox",
      "mode": "lexical"
    }
  },
  "requestId": "...",
  "durationMs": 18
}
```

Exact totals can be expensive at scale. The contract should allow `totalRelation: "lower-bound"` or omission of `total` later without breaking pagination. `durationMs` should be numeric instead of a formatted string.

### Cursor pagination

Replace page offsets with a signed or otherwise tamper-resistant opaque cursor containing the score/tie-break values and a hash of the normalized query and filters. Cursor pagination:

- eliminates the current overlap bug;
- remains stable when new images are inserted;
- avoids increasingly expensive large offsets;
- makes `hasMore` derive from fetching `limit + 1` matching rows.

During migration, the endpoint can accept `page` for the legacy client while the new client uses `cursor`. Do not combine offset and cursor semantics in one request.

### Frontend simplification

Consolidate the search browser code around four responsibilities:

1. `SearchClient`: builds requests, owns abort behavior, validates the one response shape.
2. `SearchStore`: query, filters, items, cursor, loading, error, and request generation.
3. `SearchView`: renders state and delegates image cards to the existing feed renderer.
4. `SearchURLState`: serializes/deserializes query and filters using `history.replaceState` while typing and `pushState` on committed searches.

Owner and tag filters should trigger a server request and be included in the URL/cache key. Remove DOM-derived totals, feed-hiding polling, historical response parsing, initialization retry loops where bootstrap ordering can be explicit, and redundant coordinator wrappers. Keep cancellation, stale-response protection, accessible status messaging, infinite scroll, and a small cache only if telemetry shows repeated-query benefit.

### Typo tolerance and semantic retrieval

After lexical search is correct and measured:

- add query suggestions from known tags, providers, and models;
- add spelling correction only when confidence is high and always show what was searched;
- consider n-gram/prefix support for short terms if MySQL FULLTEXT token rules are insufficient;
- add embeddings for prompts and tags as a second candidate source for conceptual queries;
- combine lexical and vector ranks using reciprocal rank fusion, then apply the same access and metadata filters;
- fall back to lexical search if the embedding service or vector store is unavailable.

Do not make semantic retrieval the only search path. Exact tags, model names, and quoted phrases are better served by lexical/exact matching, and embeddings add cost, privacy considerations, reindexing, and operational dependencies.

## Delivery roadmap

### Authoritative implementation order

The following order is intentional. Each item depends on the preceding search contract becoming truthful and testable:

1. rank the complete authorized match set before pagination;
2. eliminate overlapping page windows and verify gap-free traversal;
3. calculate `total` and `hasMore` from the ranked, filtered result set;
4. implement `exactOnly` and `matchType` end-to-end, or remove them from the public contract;
5. make tag-only queries participate in candidate retrieval;
6. move owner and tag filters from DOM-only filtering into the API query;
7. preserve cached non-forced searches instead of clearing them at search start;
8. build the normalized search document, MySQL FULLTEXT retrieval, and cursor pagination, then shadow-test v2 against v1.

Phases 0 and 1 establish correctness. Phase 2 replaces the potentially expensive v1 global in-process ranking path with an indexed implementation that preserves the same semantics at scale.

Implementation update (2026-08-02): the Phase 1 code path now performs complete-set ranking before slicing pages, returns totals and `hasMore` from the final filtered set, supports `exactOnly` and `matchType`, retrieves tag-only candidates, sends owner/tag filters to the server, binds filters into browser cache keys, and retains cached non-forced searches. A focused eight-test regression suite passes. Production-like MySQL load testing remains required because v1 intentionally trades candidate-query cost for correctness until Phase 2.

Runway check (2026-08-02): the configured local `images` table contains 0 non-deleted rows and no creation history. This confirms local behavior but cannot estimate production runway. Before enabling v2 shadow traffic, collect the same total plus 7/30/90-day creation aggregates from production. Until those figures exist, treat Phase 2 as operationally important rather than assuming v1 has ample runway.

Production runway update (2026-08-02): production contains 1,795 active images, including 1,707 public and 1,625 tagged images. It added 0 images in the last 7 days, 43 in 30 days, and 184 in 90 days. Growth is modest, but 90.5% of the corpus is tagged; the Phase 1 tag-candidate fallback can therefore make a typical search retrieve and score roughly 1,625 rows before pagination. Phase 2 is justified by current per-query amplification rather than forecast table growth. Production's five repository migrations are already applied and its deployed schema has zero drift, so production does not require the local baseline repair. The next production deploy should apply the Phase 2 migration as the ordinary sixth repository migration.

### Phase 0 — Baseline and contract tests (1–2 weeks)

Deliverables:

- define a versioned search contract and expected multi-word semantics;
- add a seeded relevance corpus containing public, private, hidden, deleted, tagged, old, new, and similarly worded images;
- add unit tests for validation, authorization predicates, query parsing, and option handling;
- add integration tests that prove no duplicates/skips and consistent `hasMore` behavior;
- add Playwright coverage for typing, Enter, Escape, deep links, back/forward, filters, no results, errors, and infinite scroll;
- instrument latency, result count, zero-result rate, and result clicks with privacy-safe query handling;
- capture the current P50/P95 latency, zero-result rate, click-through rate, and top zero-result queries.

Exit criteria:

- known current defects are reproduced by tests;
- a relevance judgment set of at least 50 representative queries exists;
- dashboards can distinguish server retrieval time from browser render time.

### Phase 1 — Correctness patch on the current stack (1 week)

This phase makes the existing contract truthful before the new index is built. On the current stack, that means retrieving the complete authorized candidate set for a query, applying search-option and owner/tag filters, scoring the surviving candidates, sorting them deterministically, and only then taking the requested page. This is an interim correctness implementation and must be load-tested because its cost grows with the candidate set. Do not reintroduce a newest-first candidate cap: that would preserve the defect where relevant older results cannot surface.

Deliverables:

1. **Rank before pagination.** Refactor the v1 service/repository boundary so scoring and filtering operate on the complete authorized match set. Apply pagination with `slice(skip, skip + limit)` only after deterministic relevance ordering.
2. **Fix page traversal.** Remove the `skip limit, take limit * 2` behavior. Prove that sequential pages contain neither duplicate IDs nor gaps relative to an unpaginated reference result.
3. **Make pagination metadata truthful.** Set `total` to the number of ranked results remaining after all search and API filters. Derive `hasMore` from `skip + returned < total` over that same set.
4. **Resolve accepted options.** Wire `exactOnly` and `matchType` through validation, candidate matching, and scoring with contract tests. If either behavior cannot be defined unambiguously, remove the parameter from controller documentation and parsing rather than silently accepting it.
5. **Retrieve tag-only matches.** Include the JSON `tags` field in v1 candidate retrieval using the supported MySQL/Prisma JSON predicates or a safe parameterized SQL adapter. A result matching only an exact or configured partial tag must be eligible for ranking.
6. **Move visible filters to the API.** Send the active owner scope and tags with every initial and continuation request. Apply them in the authorized server query, include them in the URL and cache key, and stop using DOM filtering as the source of result membership or totals.
7. **Preserve useful cache entries.** Call `clearCacheFor(query)` only for an explicit forced refresh or data invalidation event. Non-forced repeated searches should reuse unexpired entries.
8. Remove unconditional diagnostic logging and add deterministic tie-breaking for equal scores.

Exit criteria:

- an older high-relevance fixture ranks ahead of newer weak matches and appears on the correct page;
- concatenating all pages produces exactly the same ordered IDs as the unpaginated reference result;
- `total` equals the number of results visible under the same query, authorization, owner, and tag predicates;
- `hasMore` becomes false immediately after the final ranked result;
- tag-only fixtures are discoverable;
- every accepted parameter has tested behavior and no ignored option remains;
- a repeated non-forced search produces a cache hit, while forced refresh bypasses or invalidates it;
- the interim global-ranking path meets an explicitly agreed latency/candidate-volume safety threshold until Phase 2 ships.

### Phase 2 — Indexed lexical search (2–4 weeks)

Phase 2 preserves the Phase 1 result semantics while moving retrieval, ranking, filtering, and continuation into an indexed database path.

Implementation update (2026-08-02): an additive migration creates and backfills `image_search_documents`, adds a five-column MySQL FULLTEXT index, and installs insert/update synchronization triggers. `/api/search/images/v2` provides signed query-bound cursor pagination, exact totals, access/tag filtering, and deterministic ordering. `SEARCH_V2_SHADOW_PERCENT` enables privacy-safe v1/v2 comparison logs and defaults to 0. A database-to-schema diff confirmed that the only missing object was the new search-document table. The five historical migrations were then baselined, the Phase 2 migration was applied successfully to the configured local database, and Prisma now reports the database as up to date. Structural verification confirmed the table, five indexed FULLTEXT columns, two synchronization triggers, matching image/document counts, and a successful real v2 query. Production must repeat the diff-and-baseline procedure independently; local migration history does not establish production state.

Deliverables:

- add the search document representation and idempotent backfill;
- normalize tags into an indexed association and introduce dual-write consistency checks;
- add MySQL FULLTEXT indexes and repository queries;
- execute access filters, metadata filters, ranking, and pagination in one retrieval query;
- ship cursor pagination and the v2 response contract;
- shadow-run v2 beside v1 for a percentage of requests without changing visible results;
- compare ordered result overlap, top-result agreement, zero-result divergence, authorization, latency, and judged relevance against v1;
- record expected differences caused by improved FULLTEXT semantics rather than requiring byte-for-byte result equality.

Exit criteria:

- zero unauthorized results in automated access-matrix tests;
- zero duplicate/skipped results while traversing an unchanged result set;
- P95 server search latency at or below 300 ms at expected production corpus size;
- judged NDCG@10 improves by at least 20% over baseline, or reaches an agreed absolute target;
- backfill and dual-write drift are observable and recoverable.

### Phase 3 — Browser migration and simplification (2–3 weeks)

Deliverables:

- migrate the UI to cursor pagination and server-owned filters/facets;
- use a single response schema and query/filter-aware cache key;
- consolidate frontend search responsibilities;
- preserve accessible live status, URL state, cancellation, empty/error states, and infinite scrolling;
- remove legacy modules only after telemetry shows v2 adoption and equivalent behavior.

Exit criteria:

- browser tests pass across mobile and desktop view modes;
- search startup has no polling dependency on global initialization timing;
- clearing search restores the prior feed without a redundant full refresh where feasible;
- production client error rate does not regress.

### Phase 4 — Relevance iteration (ongoing)

Deliverables:

- tune field weights from judgments and click data;
- add phrase boosts, controlled recency decay, and bounded rating/engagement signals;
- add suggestions and high-confidence typo correction;
- provide a small admin-only relevance debugger for query, matched fields, rank, and filters;
- establish a recurring search-quality review using top, rising, and zero-result queries.

Exit criteria:

- relevance changes pass an offline regression suite before release;
- online experiments have a declared primary metric and guardrails;
- no ranking signal can bypass authorization or hidden/deleted status.

### Phase 5 — Optional hybrid semantic search (only if justified, 3–6 weeks)

Trigger this phase only when query analysis shows a material class of conceptual searches that lexical tuning cannot solve.

Deliverables:

- generate versioned embeddings for searchable image documents;
- add an access-filterable vector retrieval store or compatible database capability;
- retrieve lexical and semantic candidates in parallel and fuse ranks;
- add cost, latency, drift, re-embedding, deletion, and outage controls;
- A/B test hybrid retrieval against lexical search.

Exit criteria:

- statistically credible improvement in success/click metrics and judged relevance;
- P95 latency remains within the agreed budget;
- semantic service failure cleanly falls back to lexical retrieval;
- deletion and visibility changes propagate within a defined maximum delay.

## Measurement plan

### Primary quality metrics

- Search success rate: a result click, image open, like, or prompt reuse within the search session.
- Zero-result rate, segmented by authenticated/anonymous and active filters.
- Reformulation rate within 60 seconds.
- NDCG@10 and Recall@20 on the judgment set.
- First-result click-through rate and mean reciprocal rank.

### Reliability and performance metrics

- P50/P95/P99 server duration and database duration.
- Client time to first rendered result.
- Error, timeout, abort, and retry rates.
- Duplicate IDs and cursor validation failures.
- Index/document lag, backfill progress, and tag dual-write drift.
- Search requests and cache hit rate per active user.

### Privacy

Treat queries as potentially sensitive user content. Prefer normalized query hashes for aggregation, short retention for raw queries, access-controlled debugging, and explicit redaction of email addresses, URLs, secrets, and other high-risk patterns. Do not send private prompt text to a third-party search or embedding service without an approved data-handling decision.

## Test strategy

### Unit tests

- normalization, tokenization, quoted phrases, and maximum length;
- option validation with no silently ignored parameter;
- access policy for anonymous, owner, other authenticated user, hidden, and deleted images;
- cursor encode/decode, tamper rejection, query/filter binding, and expiry if used;
- deterministic ranking tie-breaks;
- cache keys include every query-affecting input.

### Integration tests

- exact, prefix, substring/full-text, tag-only, provider, model, phrase, and multi-word cases;
- `scope`, tags, provider, model, and sort combinations;
- page traversal contains no duplicates and matches a single unpaginated reference query;
- changes to public/private, hidden, deleted, prompts, and tags update search promptly;
- totals/facets use the same access and search predicate as items;
- malformed query parameters and cursors return stable 4xx errors;
- database query plans use the intended full-text/access indexes at production-like scale.

### End-to-end tests

- debounce does not render stale results after fast typing;
- Enter commits/refreshes and Escape clears;
- URL reload and browser navigation restore query and filters;
- owner/tag/provider/model filters update results and URL state;
- infinite scroll terminates correctly;
- empty, offline, 4xx, 5xx, timeout, retry, and recovery states are accessible;
- no private image is exposed to anonymous users in cards, counts, facets, or cached responses.

## Rollout and migration safety

1. Add the new schema without removing JSON tags or old query paths.
2. Backfill in bounded batches with progress checkpoints and reconciliation counts.
3. Dual-write and monitor drift.
4. Shadow-query v2 and record comparison metrics without logging sensitive result content.
5. Enable v2 for internal/admin users, then a small percentage of production traffic.
6. Increase rollout only while authorization, latency, error, and relevance guardrails hold.
7. Keep an instant server-side flag to return the browser to v1 during migration.
8. Remove v1 code, offset pagination, and obsolete frontend modules after a stable observation window.

## Prioritized backlog

| Priority | Item | Impact | Effort |
|---|---|---:|---:|
| P0 | Add access and pagination integration tests | Very high | Medium |
| P0 | Rank and filter the complete authorized result set before pagination | Very high | Large |
| P0 | Fix overlapping database page windows and prove gap-free traversal | Very high | Medium |
| P0 | Derive `total` and `hasMore` from the final visible result set | Very high | Medium |
| P0 | Implement or remove `exactOnly` and `matchType` | High | Small |
| P0 | Add tag-only candidate retrieval | High | Medium |
| P0 | Move owner/tag filters from DOM filtering to the API | Very high | Medium |
| P0 | Retain cache entries for non-forced repeated searches | Medium | Small |
| P0 | Establish a relevance judgment set and baseline | Very high | Medium |
| P1 | Add normalized search documents and MySQL FULLTEXT indexes | Very high | Large |
| P1 | Add cursor pagination and shadow-test v2 against v1 | Very high | Large |
| P1 | Add privacy-safe search telemetry | High | Medium |
| P1 | Consolidate browser search state/client/view modules | High | Large |
| P2 | Add facets, phrase boosts, and controlled ranking signals | Medium | Medium |
| P2 | Add suggestions and typo tolerance | Medium | Medium |
| P3 | Evaluate hybrid semantic retrieval | Conditional | Large |

## Decisions needed

Before Phase 2 begins, the team should decide:

1. whether the search document lives on `images` or in a dedicated table;
2. whether tag normalization will replace JSON tags or run alongside them long-term;
3. the default multi-word behavior (all terms preferred with fallback is recommended);
4. which ownership scopes should be exposed in the UI;
5. whether exact totals are a product requirement;
6. raw-query retention and access policy;
7. the production corpus size and growth rate used for load testing;
8. the latency and relevance thresholds required for rollout.

## Code map reviewed

Backend:

- [`src/routes/search.js`](src/routes/search.js)
- [`src/controllers/SearchController.js`](src/controllers/SearchController.js)
- [`src/services/search/SearchService.js`](src/services/search/SearchService.js)
- [`src/services/search/SearchQueryBuilder.js`](src/services/search/SearchQueryBuilder.js)
- [`src/services/search/SearchRepository.js`](src/services/search/SearchRepository.js)
- [`src/services/search/SearchScoringService.js`](src/services/search/SearchScoringService.js)
- [`src/services/search/SearchOptions.js`](src/services/search/SearchOptions.js)
- [`src/services/search/SearchValidator.js`](src/services/search/SearchValidator.js)
- [`src/services/search/SearchResultTransformer.js`](src/services/search/SearchResultTransformer.js)
- [`src/middleware/authMiddleware.js`](src/middleware/authMiddleware.js)
- [`prisma/schema.prisma`](prisma/schema.prisma)

Frontend:

- [`public/index.html`](public/index.html)
- [`public/js/modules/search.js`](public/js/modules/search.js)
- [`public/js/modules/search/`](public/js/modules/search/)
- [`public/js/utils/search-router.js`](public/js/utils/search-router.js)
- [`public/css/modules/search-ui.css`](public/css/modules/search-ui.css)

## Recommended next action

Begin with one seeded integration suite that defines the expected complete ordered result set. Use it to refactor v1 so ranking/filtering happen before pagination, then implement the remaining Phase 1 items in the authoritative order above. Once v1 is correct and measured, build the normalized search document, MySQL FULLTEXT retrieval, and cursor contract behind the repository boundary and shadow-test v2 before changing visible production results.
