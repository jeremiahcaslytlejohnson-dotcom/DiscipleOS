#!/usr/bin/env bash
set -euo pipefail

# This is invoked by Replit's Scheduled Deployment. It runs the reminder
# delivery service directly, avoiding an HTTP server and session store
# startup in the background job.

runner="artifacts/api-server/dist/jobs/send-reminders.mjs"

if [[ ! -f "$runner" ]]; then
  echo "Scheduled reminder runner is missing. Build @workspace/api-server before running this job." >&2
  exit 1
fi

exec node --enable-source-maps "$runner"