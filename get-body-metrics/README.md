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

### 1. Register an app on the Withings developer dashboard

Go to https://developer.withings.com/dashboard/ (sign in with your normal
Withings account — the same one your Body+ scale is linked to), create an app:

- **Name**: anything, e.g. "bike-dashboard"
- **Callback URL**: you'll fill this in *after* deploying (step 3), it must be
  `https://<your-cloud-run-url>/oauth/callback`

Save the **Client ID** and **Client Secret** it gives you — you'll need them below.

### 2. Create the secret + deploy

```bash
gcloud config configurations activate bike-scale-integration

# placeholder value; the real refresh token gets written by step 4
echo -n "placeholder" | gcloud secrets create withings-refresh-token --data-file=-

gcloud run deploy get-body-metrics \
  --source ./get-body-metrics \
  --region europe-west3 \
  --no-allow-unauthenticated \
  --set-env-vars WITHINGS_CLIENT_ID=<your_client_id>,WITHINGS_CLIENT_SECRET=<your_client_secret>

# grant the service's own identity access to read/write the secret
gcloud secrets add-iam-policy-binding withings-refresh-token \
  --member="serviceAccount:$(gcloud run services describe get-body-metrics --region europe-west3 --format='value(spec.template.spec.serviceAccountName)')" \
  --role="roles/secretmanager.secretVersionManager"
```

Note the deployed URL (e.g. `https://get-body-metrics-xxxxx.europe-west3.run.app`).
Set `WITHINGS_REDIRECT_URI` to `<that URL>/oauth/callback` and re-deploy:

```bash
gcloud run services update get-body-metrics --region europe-west3 \
  --set-env-vars WITHINGS_REDIRECT_URI=https://<your-cloud-run-url>/oauth/callback
```

Also go back to the Withings dashboard and set the app's **Callback URL** to
that same value.

### 3. Do the one-time OAuth consent

Since `/oauth/callback` requires the request to be signed in as an authorized
caller (service is `--no-allow-unauthenticated`), the simplest path is to
temporarily allow public access for this one step:

```bash
gcloud run services add-iam-policy-binding get-body-metrics --region europe-west3 \
  --member=allUsers --role=roles/run.invoker
```

Then visit this URL in your browser (replace `client_id` and `redirect_uri`):

```
https://account.withings.com/oauth2_user/authorize2?response_type=code&client_id=<your_client_id>&scope=user.metrics&redirect_uri=<your_redirect_uri>&state=setup
```

Log in, approve access. You'll land on a page saying "Withings account
connected successfully" — that means the refresh token is now in Secret Manager.

**Then revoke public access again**:

```bash
gcloud run services remove-iam-policy-binding get-body-metrics --region europe-west3 \
  --member=allUsers --role=roles/run.invoker
```

### 4. Set up the hourly sync via Cloud Scheduler

```bash
gcloud scheduler jobs create http sync-body-metrics \
  --location europe-west3 \
  --schedule "0 * * * *" \
  --uri "https://<your-cloud-run-url>/" \
  --http-method POST \
  --oidc-service-account-email "$(gcloud run services describe get-body-metrics --region europe-west3 --format='value(spec.template.spec.serviceAccountName)')"
```

## Local testing

```bash
npm install
export WITHINGS_CLIENT_ID=... WITHINGS_CLIENT_SECRET=... WITHINGS_REDIRECT_URI=... GOOGLE_CLOUD_PROJECT=bike-scale-integration
npm start
```
