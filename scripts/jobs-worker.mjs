const app = process.env.NEXT_PUBLIC_APP_URL;
const secret = process.env.JOB_WORKER_SECRET;

if (!app || !secret) {
  throw new Error('Missing NEXT_PUBLIC_APP_URL or JOB_WORKER_SECRET');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

while (true) {
  try {
    const res = await fetch(`${app.replace(/\/$/, '')}/api/jobs/process`, {
      method: 'POST',
      headers: { 'x-worker-secret': secret },
    });

    const json = await res.json().catch(() => ({}));
    process.stdout.write(`${new Date().toISOString()} ${res.status} ${JSON.stringify(json)}\n`);

    if (json && json.processed) {
      await sleep(200);
    } else {
      await sleep(2000);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    process.stdout.write(`${new Date().toISOString()} worker_error ${msg}\n`);
    await sleep(5000);
  }
}
