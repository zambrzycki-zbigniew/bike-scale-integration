import { Firestore } from '@google-cloud/firestore';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import functions from '@google-cloud/functions-framework';

const PROJECT_ID          = process.env.GOOGLE_CLOUD_PROJECT;
const CLIENT_ID           = process.env.WITHINGS_CLIENT_ID;
const CLIENT_SECRET       = process.env.WITHINGS_CLIENT_SECRET;
const REDIRECT_URI        = process.env.WITHINGS_REDIRECT_URI; // e.g. https://get-body-metrics-xxx.run.app/oauth/callback
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET_NAME || 'withings-refresh-token';
const SYNC_SECRET         = process.env.SYNC_SECRET; // optional shared secret gating the public sync trigger

const db = new Firestore();
const secretClient = new SecretManagerServiceClient();

/* meastype -> Firestore field. value is (raw value * 10^unit). */
const MEASTYPES = {
  1:  'weightKg',
  6:  'fatRatioPct',
  76: 'muscleMassKg',
  77: 'hydrationPct',
  88: 'boneMassKg',
};

async function getLatestSecret(name) {
  const [version] = await secretClient.accessSecretVersion({
    name: `projects/${PROJECT_ID}/secrets/${name}/versions/latest`,
  });
  return version.payload.data.toString('utf8');
}

async function addSecretVersion(name, value) {
  const parent = `projects/${PROJECT_ID}/secrets/${name}`;
  const [newVersion] = await secretClient.addSecretVersion({
    parent,
    payload: { data: Buffer.from(value, 'utf8') },
  });

  // Withings rotates the refresh token on every use, so old versions are dead
  // weight - prune them immediately to avoid unbounded Secret Manager costs.
  const [versions] = await secretClient.listSecretVersions({ parent });
  await Promise.all(
    versions
      .filter((v) => v.name !== newVersion.name && v.state !== 'DESTROYED')
      .map((v) =>
        secretClient
          .destroySecretVersion({ name: v.name })
          .catch((err) => console.error(`Failed to prune secret version ${v.name}:`, err.message))
      )
  );
}

async function withingsRequest(url, params) {
  const res = await fetch(url, { method: 'POST', body: new URLSearchParams(params) });
  const json = await res.json();
  if (json.status !== 0) {
    throw new Error(`Withings API error (status ${json.status}): ${JSON.stringify(json)}`);
  }
  return json.body;
}

/* Withings rotates the refresh_token on every use - always persist the new one. */
async function refreshAccessToken() {
  const refreshToken = await getLatestSecret(REFRESH_TOKEN_SECRET);
  const body = await withingsRequest('https://wbsapi.withings.net/v2/oauth2', {
    action: 'requesttoken',
    grant_type: 'refresh_token',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: refreshToken,
  });
  await addSecretVersion(REFRESH_TOKEN_SECRET, body.refresh_token);
  return body.access_token;
}

async function fetchNewMeasurements(accessToken, sinceTs) {
  const res = await fetch('https://wbsapi.withings.net/measure', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: new URLSearchParams({
      action: 'getmeas',
      meastypes: Object.keys(MEASTYPES).join(','),
      category: '1',
      lastupdate: String(sinceTs),
    }),
  });
  const json = await res.json();
  if (json.status !== 0) throw new Error(`getmeas failed (status ${json.status})`);
  return json.body.measuregrps || [];
}

/* ---------- scheduled sync: called periodically by Cloud Scheduler ---------- */
async function handleSync(req, res) {
  // the service must be public for Withings to reach /oauth/callback, so gate
  // this endpoint with a shared secret instead of relying on Cloud Run IAM.
  if (SYNC_SECRET && req.query.key !== SYNC_SECRET) {
    return res.status(403).send('Forbidden');
  }

  const stateRef = db.doc('body-metrics-sync/state');
  const stateSnap = await stateRef.get();
  const sinceTs = stateSnap.exists ? stateSnap.data().lastSync : 0;

  const accessToken = await refreshAccessToken();
  const groups = await fetchNewMeasurements(accessToken, sinceTs);

  let latestTs = sinceTs;
  const batch = db.batch();
  for (const grp of groups) {
    const entry = { date: grp.date };
    for (const m of grp.measures) {
      const field = MEASTYPES[m.type];
      if (field) entry[field] = m.value * 10 ** m.unit;
    }
    batch.set(db.doc(`body-metrics/${grp.grpid}`), entry);
    if (grp.date > latestTs) latestTs = grp.date;
  }
  batch.set(stateRef, { lastSync: latestTs }, { merge: true });
  await batch.commit();

  res.status(200).send(`Synced ${groups.length} measurement group(s).`);
}

/* ---------- one-time OAuth callback: Withings redirects here after user consent ---------- */
async function handleOAuthCallback(req, res) {
  const { code, error } = req.query;
  if (error) return res.status(400).send(`Authorization denied: ${error}`);
  if (!code) return res.status(400).send('Missing code');

  const body = await withingsRequest('https://wbsapi.withings.net/v2/oauth2', {
    action: 'requesttoken',
    grant_type: 'authorization_code',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code: String(code),
    redirect_uri: REDIRECT_URI,
  });

  await addSecretVersion(REFRESH_TOKEN_SECRET, body.refresh_token);
  res.status(200).send('Withings account connected successfully. You can close this tab.');
}

functions.http('main', async (req, res) => {
  try {
    // Withings verifies registered URLs with a plain HTTP HEAD before accepting them.
    if (req.method === 'HEAD') return res.status(200).end();
    if (req.path === '/oauth/callback') return await handleOAuthCallback(req, res);
    return await handleSync(req, res);
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});
