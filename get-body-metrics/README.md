# get-body-metrics

Pulls weight/body-composition data from a Withings Body+ scale into Firestore,
so it can be shown on the bike dashboard. Deployed as a Cloud Run service,
synced hourly by Cloud Scheduler (polling — simple, and well within Withings'
120 req/min rate limit for a scale that updates a few times a day).

Stores one document per measurement group in `body-metrics/{grpid}`:
`{ date, weightKg, fatRatioPct, muscleMassKg, hydrationPct, boneMassKg }`
(fields only present if your scale reported that metric).

## No key files, but one real secret

Unlike `get-bike-metrics`, this service needs a genuine long-lived credential:
a Withings **refresh token**, tied to your personal Withings account. It's
stored in **Secret Manager**, never in a file or committed to git.
Everything else (Firestore, the Cloud Run identity) still uses no keys at all.

## One-time setup

Withings requires registered URLs (OAuth `redirect_uri`) to already be
publicly reachable via a plain HTTP HEAD request *before* it will accept them
— so the service must be deployed first, and the app registered second.

### 1. Deploy the service (public) to get its URL

```bash
gcloud config configurations activate bike-scale-integration

# placeholder value; the real refresh token gets written in step 3
echo -n "placeholder" | gcloud secrets create withings-refresh-token --data-file=-

gcloud run deploy get-body-metrics \
  --source ./get-body-metrics \
  --region europe-west3 \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_CLOUD_PROJECT=bike-scale-integration

# grant the service's own identity access to read/write the secret
# NOTE: secretVersionManager alone is NOT enough - it covers add/get/list/etc.
# but NOT reading the payload. secretAccessor is required too, or you'll hit
# "PERMISSION_DENIED: Permission 'secretmanager.versions.access' denied".
gcloud secrets add-iam-policy-binding withings-refresh-token \
  --member="serviceAccount:$(gcloud run services describe get-body-metrics --region europe-west3 --format='value(spec.template.spec.serviceAccountName)')" \
  --role="roles/secretmanager.secretVersionManager"
gcloud secrets add-iam-policy-binding withings-refresh-token \
  --member="serviceAccount:$(gcloud run services describe get-body-metrics --region europe-west3 --format='value(spec.template.spec.serviceAccountName)')" \
  --role="roles/secretmanager.secretAccessor"
```

> **Note**: unlike Cloud Functions, Cloud Run does NOT auto-inject a
> `GOOGLE_CLOUD_PROJECT` env var — it must always be set explicitly (as above),
> or Secret Manager calls fail with `PERMISSION_DENIED: projects/undefined`.
> A plain `gcloud run deploy --source` with `--set-env-vars` *replaces* all env
> vars, so always include the full set (see step 3) on any redeploy.

> **Note**: when testing the sync endpoint manually (e.g. with `curl -X POST`
> and no body), Google's frontend rejects it with `411 Length Required` unless
> you add `-H "Content-Length: 0"`. Cloud Scheduler's HTTP jobs handle this
> correctly on their own, so this only matters for manual testing.

Cloud Run URLs for this project follow the pattern
`https://<service>-<project-number>.<region>.run.app` — for this project
(`bike-scale-integration`, project number `504294436171`) that's:

```
https://get-body-metrics-504294436171.europe-west3.run.app
```

The service is `--allow-unauthenticated` (public) because Withings must be
able to reach `/oauth/callback` directly, with no Google auth. The scheduled
sync route is instead gated by a shared secret (see step 4) rather than IAM.

### 2. Register the app on the Withings developer dashboard

Go to https://developer.withings.com/dashboard/ (sign in with your normal
Withings account — the same one your Body+ scale is linked to), create an app,
and under **Registered URLs** enter:

```
https://get-body-metrics-504294436171.europe-west3.run.app/oauth/callback
```

Withings will HEAD-check that URL before accepting it — it should succeed
immediately since the service is already deployed and public.

Save the **Client ID** and **Client Secret** it gives you.

### 3. Set the real env vars and do the one-time OAuth consent

```bash
gcloud run services update get-body-metrics --region europe-west3 \
  --update-env-vars \
WITHINGS_CLIENT_ID=<your_client_id>,\
WITHINGS_CLIENT_SECRET=<your_client_secret>,\
WITHINGS_REDIRECT_URI=https://get-body-metrics-504294436171.europe-west3.run.app/oauth/callback,\
SYNC_SECRET=<a-long-random-string-you-make-up>
```

Then visit this URL in your browser (fill in your real `client_id`):

```
https://account.withings.com/oauth2_user/authorize2?response_type=code&client_id=<your_client_id>&scope=user.metrics&redirect_uri=https://get-body-metrics-504294436171.europe-west3.run.app/oauth/callback&state=setup
```

Log in, approve access. You'll land on a page saying "Withings account
connected successfully" — that means the refresh token is now in Secret Manager.

### 4. Set up the daily sync via Cloud Scheduler

Include the `SYNC_SECRET` from step 3 as a query param so random internet
traffic can't trigger syncs (the service itself is public). Once a day is
plenty for a scale you step on at most a couple of times daily:

```bash
gcloud scheduler jobs create http sync-body-metrics \
  --location europe-west3 \
  --schedule "0 6 * * *" \
  --uri "https://get-body-metrics-504294436171.europe-west3.run.app/?key=<same-sync-secret>" \
  --http-method POST
```


## Local testing

```bash
npm install
export WITHINGS_CLIENT_ID=... WITHINGS_CLIENT_SECRET=... WITHINGS_REDIRECT_URI=... GOOGLE_CLOUD_PROJECT=bike-scale-integration
npm start
```
