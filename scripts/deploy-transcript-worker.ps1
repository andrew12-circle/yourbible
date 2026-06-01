# Deploy the YouTube transcript worker to Render (one-time setup).
# Prerequisites: Render account connected to this GitHub repo.
#
# 1. Push render.yaml to your repo (root of repo).
# 2. Render Dashboard → New → Blueprint → connect repo → Deploy.
# 3. Copy the worker public URL and WORKER_TOKEN from Render env vars.
# 4. Add to .env:
#      TRANSCRIPT_WORKER_URL=https://youtube-transcript-worker.onrender.com
#      TRANSCRIPT_WORKER_TOKEN=<same as Render WORKER_TOKEN>
# 5. Run: powershell -ExecutionPolicy Bypass -File scripts/sync-transcript-secrets.ps1
# 6. Redeploy: npx supabase functions deploy framework-fetch-transcript --project-ref itmcsyrnpcnrwviigppe
#
# Optional CLI (after `render login` or RENDER_API_KEY set):
#   render blueprints validate render.yaml
#   render blueprint launch

Write-Host "Worker source: worker/youtube-transcript/"
Write-Host "Blueprint: render.yaml at repo root"
Write-Host "TRANSCRIPT_WORKER_TOKEN is already in Supabase if you ran sync-transcript-secrets.ps1."
Write-Host ""
Write-Host "Open Render Blueprint setup:"
Write-Host "  https://dashboard.render.com/blueprints"
