# get-bike-metrics

HTTP telemetry ingest + session finalizer for the stationary bike, deployed as a
Cloud Run service (built from source with Buildpacks via `@google-cloud/functions-framework`,
target function: `telemetry`).

- Receives one HTTP request per pulse from the ESP32 (`?p=<pulses>&t=<unix-seconds>`),
  appends it to `bike-sessions/current/pulses`, and schedules a Cloud Tasks job
  ~61s later to finalize the session if no further pulses arrive.
- On `?finalize=1` (called by Cloud Tasks), rolls up `bike-sessions/current` into
  a permanent `bike-sessions/{startEpoch}` document with aggregated stats
  (`samples`, `imp`, `distKm`, `durationSec`, `avgKmh`), or deletes it if too short.

## Runtime identity — no key files

In production this service runs *as* the `firebase-adminsdk-fbsvc@bike-scale-integration.iam.gserviceaccount.com`
service account (Cloud Run attached identity). The Firestore/Cloud Tasks clients
use Application Default Credentials automatically — there is no service account
key to manage or leak.

## Required environment variables

| Var            | Purpose                                              | Current value |
|----------------|-------------------------------------------------------|----------------|
| `TASKS_REGION` | Cloud Tasks queue region                              | `europe-west3` |
| `TASKS_QUEUE`  | Cloud Tasks queue name                                | `finalize-queue` |
| `SERVICE_URL`  | Public URL of this service (used as the finalize callback target) | `https://get-bike-metrics-504294436171.europe-west3.run.app` |
| `SA_EMAIL`     | Service account used for the OIDC token on the scheduled Cloud Tasks callback | `firebase-adminsdk-fbsvc@bike-scale-integration.iam.gserviceaccount.com` |

## Local development

```bash
npm install
# export the vars above, or use `functions-framework`'s --port etc. flags
npm start
```

## Deploy

```bash
gcloud config configurations activate bike-scale-integration   # personal account + project
gcloud run deploy get-bike-metrics \
  --source . \
  --region europe-west3 \
  --allow-unauthenticated   # required: the ESP32 posts pulses with no auth token
```

`gcloud run deploy --source .` re-uses the existing service's env vars, service
account and settings unless you override them with `--set-env-vars` / `--service-account`.

> Note: the service is currently reachable by anyone who knows the URL (`allUsers`
> has `roles/run.invoker`) since the ESP32 can't easily do OAuth. Acceptable for
> a hobby project, but worth knowing — a bad actor with the URL could post fake
> pulses. Consider a shared-secret query param/header check in `index.js` if this
> ever becomes a concern.
