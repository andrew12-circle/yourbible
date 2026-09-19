# Mind space

Open the framework or journal Mind map and choose **Enter space**. The existing
2D map stays available and returns on Escape / Map. This is a read-only, locally
rendered view of saved graph relationships; it does not generate AI links or
send content to a third party.

## Navigation

- Drag to orbit, scroll/pinch or use +/- to move into/out of the node cloud.
  With the canvas focused, arrow keys rotate and Home resets the camera.
- Clicking a thought recenters its neighborhood. The side panel gives source
  previews, relation labels, and an explicit Open source/entry/passage action.
- Search covers the loaded graph, including records outside the visible cluster.
- Select one, two, or three links of depth, or the overview; group by type or use
  the constellation layout. Type filters also apply to connection tracing.
- Trace connection holds the center while another node is selected. Highlighted
  paths follow saved edges in either direction; they are not semantic similarity,
  proof of agreement, or causal claims. Disconnected nodes stay disconnected.
- Motion and labels can be paused. The OS reduced-motion preference disables
  ambient animation. Drawing stops in hidden tabs and releases resources on close.

## Implementation boundaries

The renderer uses deterministic three-dimensional coordinates and perspective
projection on Canvas 2D, not a WebGL scene engine or VR environment. This provides
depth, animated links, orbit/dolly navigation, and type clusters without adding
Three.js or another runtime dependency. Graph objects are cloned before the
existing force renderer can mutate them. No graph content or search query is
persisted in browser settings.

The scene displays at most 48 nodes (hard helper bound: 80) and 160 links; search
and the DOM thought list remain available. Very long paths retain their full
sequence in the panel. Scope filters are applied without inventing links to the
center. An empty scoped journal must not fall back to account-wide records.

The loader's existing server query limits still apply (600 entries, 400 artifacts,
300 entities, 500 matched claims, 800 mentions; other reads also have server row
limits). “Loaded thoughts” is not a claim that every account record is present.
Encrypted entry previews use the journal's existing decoder and remain hidden
when locked. Account and vault transitions immediately hide stale graph data.
Load errors are visible and retryable instead of being presented as an empty map.

## Validation

`npm test -- src/lib/graph src/hooks/useMindGraphData.test.tsx`

With Playwright installed separately:
`PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/test-mind-space.mjs`

The browser runner uses synthetic records and blocks external requests. It covers
perspective drawing, paused/reduced motion, source navigation, filter reset,
search outside the neighborhood, path tracing, retained 2D canvas, modal focus,
phone portrait/landscape geometry, and account/vault transitions. Screenshots and
JSON results are written to RUNNER_TEMP. It is not a physical iPhone performance
or battery test. No personal journal contents are used in test artifacts.
