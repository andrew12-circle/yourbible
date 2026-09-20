# Artifact integrity v2

## Scope

This branch replaces destructive artifact analysis with immutable source snapshots, leased section jobs, strict quote validation, whole-source consolidation and atomic publication. Existing claim IDs are reused only for exactly matching statements. Other previous claims are retired, not deleted, so their verdicts, notes and research foreign keys survive. The artifact detail screen displays current findings while the database retains historical findings.

Every nonempty source segment is planned, without a 90-minute cutoff. Inputs above two million characters are rejected explicitly rather than silently truncated. Each extraction section can produce zero findings. All candidates are retained in the run; at most 120 are published after consolidation. The first eight selected findings are displayed as principal findings in the overview, with the full findings view retained.

Quotes must be present in the consecutive segment IDs supplied by the model. Consolidation selects immutable candidate IDs rather than rewriting evidence. Exact quote validation establishes source presence, not theological truth or guaranteed entailment; representative model-output review is still required. Legacy findings without evidence IDs do not receive invented keyword-based source quotes. Scripture cited by a source is not presented as independent verification.

Playback controller handles are stable across renders. Recovery occurs only on a layout transition and stops on pause, blocked autoplay, errors or teardown. The controller waits for player telemetry before reporting playback. Returning from the background never advances by elapsed wall-clock time. Resume snapshots compare update times and retain intentional rewinds, including a seek made while account progress is loading.

## Durable processing

`framework-analyze` authenticates the owner, snapshots and hashes the transcript, creates an idempotent run and dispatches work. `artifact-analysis-worker` accepts only the service credential and acquires one expiring lease. It processes one section or the consolidation phase. Successful checkpoints reset retry attempts; temporary failures back off; exhausted retries or quota failures remain partial until explicitly resumed.

`pg_net` wakes the next worker only after database commit. A one-minute `pg_cron` recovery task redispatches queued or expired work. Credentials are stored in Supabase Vault behind a private configuration schema; clients cannot acquire leases or publish findings. A source or processing-token change prevents a stale worker from publishing. No browser tab is required to continue analysis once the dispatcher is configured.

## Coordinated rollout (not automatic)

1. Run the branch CI, including PostgreSQL preservation/rollback/RLS tests, full unit tests, type-regression comparison and production build.
2. In a staging environment, apply `20260920030000_artifact_analysis_integrity.sql` and `20260920030100_artifact_analysis_dispatcher.sql`. Supabase Vault, pg_net and pg_cron must be supported/enabled. The controller refuses to start an undurable job if they are unavailable.
3. Deploy `artifact-analysis-worker`, then `framework-analyze`, then the matching frontend. Both edge functions retain JWT verification; the worker additionally checks its service credential.
4. Submit a synthetic long transcript, close the tab, and verify checkpoint continuation, quota/error recovery, atomic publication and research retention. Check the scheduled recovery job and credential rotation.
5. Test actual desktop browsers and iPhone/Safari/Capacitor: pause, rapid seek, rewind to zero, inline/floating transition, background suspension, interrupted audio handoff, navigation and account changes. Automated mocked telemetry is not physical-device certification.
6. Do not bulk re-analyze the existing library before these staging checks. Do not deploy an intermediate backend-only commit with the old destructive paste UI.

No production migration, deployment, library re-analysis or main-branch merge is performed merely by committing this branch.

## Remaining integration work

The new run intentionally labels entity/teaching enrichment `not_requested`; it does not claim every optional output is complete. Separate scheduled entity/teaching enrichment, automatic embedding maintenance, and comprehensive active-versus-retired filtering across all library/mind-map consumers must be completed before broad rollout. The artifact detail view already excludes retired findings. Historical claim lookup must remain available for saved research.

Transcript changes archive the old text and invalidate old segment/chunk search data. Starting analysis rebuilds that index before paid model calls. A formatting-only source edit marks derived indexes pending until they are rebuilt. Further index-only editing support should avoid triggering paid extraction just to repair formatting.

To pause rollout, stop the recovery cron and supersede pending runs before changing deployed worker versions. Preserve all run/revision/history tables; do not use destructive rollback migrations.
