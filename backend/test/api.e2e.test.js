import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { after, before, test } from 'node:test';

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const serverFile = path.join(backendDir, 'src', 'server.js');
let dataDir;
let baseUrl;
let serverProcess;
let serverOutput = '';

async function reservePort() {
  const probe = createServer();
  await new Promise((resolve, reject) => probe.listen(0, '127.0.0.1', (error) => error ? reject(error) : resolve()));
  const { port } = probe.address();
  await new Promise((resolve, reject) => probe.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function startServer() {
  serverProcess = spawn(process.execPath, [serverFile], {
    cwd: backendDir,
    env: {
      ...process.env,
      PORT: String(new URL(baseUrl).port),
      SAFETOGETHER_DATA_DIR: dataDir,
      SAFETOGETHER_SECRET: 'api-e2e-secret-that-is-long-enough-for-tests',
      SAFETOGETHER_AUTHORITY_ID: 'authority-e2e',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  serverProcess.stdout.setEncoding('utf8').on('data', (chunk) => { serverOutput += chunk; });
  serverProcess.stderr.setEncoding('utf8').on('data', (chunk) => { serverOutput += chunk; });

  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (serverProcess.exitCode !== null) throw new Error(`API server exited early.\n${serverOutput}`);
    try {
      const response = await fetch(`${baseUrl}/v1/health`);
      if (response.ok) return;
    } catch { /* The listener may not be ready yet. */ }
    await delay(100);
  }
  throw new Error(`API server did not become ready.\n${serverOutput}`);
}

async function stopServer() {
  if (!serverProcess || serverProcess.exitCode !== null) return;
  const exit = once(serverProcess, 'exit');
  serverProcess.kill();
  await Promise.race([exit, delay(3000)]);
  if (serverProcess.exitCode === null) serverProcess.kill('SIGKILL');
}

async function call(route, { token, method = 'GET', body, rawBody, headers = {} } = {}) {
  const requestHeaders = { ...headers };
  if (token) requestHeaders.authorization = `Bearer ${token}`;
  if (body !== undefined) requestHeaders['content-type'] = 'application/json';
  const response = await fetch(`${baseUrl}/v1${route}`, {
    method,
    headers: requestHeaders,
    body: rawBody ?? (body === undefined ? undefined : JSON.stringify(body)),
  });
  const payload = response.status === 204 ? undefined : await response.json();
  return { status: response.status, payload, data: payload?.data };
}

async function login(id) {
  const response = await call('/auth/id/login', { method: 'POST', body: { id } });
  assert.equal(response.status, 200, JSON.stringify(response.payload));
  return { token: response.payload.token, user: response.payload.user, created: response.payload.created };
}

function auth(token) { return { token }; }
function assertStatus(response, status) {
  assert.equal(response.status, status, JSON.stringify(response.payload));
}
function approximateLocation(label = 'Central district', latitude = 52.231234, longitude = 21.012346) {
  return { label, precision: 'neighborhood', latitude, longitude };
}

before(async () => {
  dataDir = await mkdtemp(path.join(tmpdir(), 'safetogether-api-e2e-'));
  const port = await reservePort();
  baseUrl = `http://127.0.0.1:${port}`;
  await startServer();
});

after(async () => {
  await stopServer();
  if (dataDir) await rm(dataDir, { recursive: true, force: true });
});

test('SafeTogether API end-to-end', async (t) => {
  const alice = await login('resident-alice');
  const bob = await login('resident-bob');
  const outsider = await login('resident-outsider');
  const authority = await login('authority-e2e');

  await t.test('health, ID sign-in, session identity, and authentication boundaries', async () => {
    const health = await call('/health');
    assertStatus(health, 200);
    assert.equal(health.payload.status, 'ok');

    assert.equal(alice.created, true);
    assert.equal(alice.user.name, 'resident-alice');
    assert.equal(alice.user.role, 'resident');
    assert.equal(authority.user.role, 'authority');

    const repeat = await login('resident-alice');
    assert.equal(repeat.created, false);
    assert.equal(repeat.user.id, alice.user.id);

    const me = await call('/auth/me', auth(alice.token));
    assertStatus(me, 200);
    assert.equal(me.payload.user.id, alice.user.id);
    assertStatus(await call('/map'), 401);
    assertStatus(await call('/map', { token: 'invalid.token' }), 401);
    assertStatus(await call('/auth/id/login', { method: 'POST', body: { id: '   ' } }), 400);

    const preflight = await fetch(`${baseUrl}/v1/map`, { method: 'OPTIONS' });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-methods').includes('GET'), true);
  });

  let incidentId;
  await t.test('personal help reports validate, stay private to the reporter, and can be deleted', async () => {
    const invalidCategory = await call('/incidents', {
      ...auth(alice.token), method: 'POST', body: { category: 'Riot', approximateLocation: approximateLocation() },
    });
    assertStatus(invalidCategory, 400);

    const malformedJson = await call('/incidents', {
      ...auth(alice.token), method: 'POST', rawBody: '{', headers: { 'content-type': 'application/json' },
    });
    assertStatus(malformedJson, 400);

    const created = await call('/incidents', {
      ...auth(alice.token), method: 'POST',
      body: { category: 'Stranded', description: 'Needs a safe ride', approximateLocation: approximateLocation('Riverside', 52.231234, 21.012346) },
    });
    assertStatus(created, 201);
    incidentId = created.data.id;
    assert.equal(created.data.approximateLocation.latitude, 52.23123);
    assert.equal(created.data.approximateLocation.longitude, 21.01235);

    const ownList = await call('/incidents', auth(alice.token));
    assert.equal(ownList.data.some((item) => item.id === incidentId), true);
    const ownMap = await call('/map', auth(alice.token));
    assert.equal(ownMap.data.incidents.some((item) => item.id === incidentId), false);
    assert.equal(ownMap.data.helpFeed.some((item) => item.id === incidentId), false);

    const publicList = await call('/incidents', auth(bob.token));
    const publicIncident = publicList.data.find((item) => item.id === incidentId);
    assert.ok(publicIncident);
    assert.equal('reporterId' in publicIncident, false);
    assert.equal(publicIncident.reporterName, alice.user.name);
    const publicMap = await call('/map', auth(bob.token));
    assert.equal(publicMap.data.incidents.some((item) => item.id === incidentId), true);
    const incidentFeedItem = publicMap.data.helpFeed.find((item) => item.id === incidentId);
    assert.equal(incidentFeedItem.isMine, false);

    assertStatus(await call(`/incidents/${incidentId}`, { ...auth(bob.token), method: 'DELETE' }), 403);
    assertStatus(await call(`/incidents/${incidentId}`, { ...auth(alice.token), method: 'DELETE' }), 204);
    assertStatus(await call(`/incidents/${incidentId}`, { ...auth(alice.token), method: 'DELETE' }), 204);
  });

  let requestId;
  await t.test('resource requests appear in other users’ feeds and support chat, updates, and withdrawal', async () => {
    const request = await call('/help-requests', {
      ...auth(bob.token), method: 'POST',
      body: { kind: 'resource', title: 'Transport', categories: ['Transport'], description: 'Ride to the shelter', approximateLocation: approximateLocation() },
    });
    assertStatus(request, 201);
    requestId = request.data.id;
    assert.equal(request.data.isMine, true);
    assert.equal(request.data.approximateLocation.latitude, 52.23123);

    const ownerFeed = await call('/help-feed', auth(bob.token));
    assert.equal(ownerFeed.data.some((item) => item.id === requestId), false);
    const helperFeed = await call('/help-feed', auth(alice.token));
    const helpItem = helperFeed.data.find((item) => item.id === requestId);
    assert.ok(helpItem);
    assert.equal(helpItem.isMine, false);
    assert.equal(helpItem.approximateLocation.longitude, 21.01235);

    const kindList = await call('/help-requests?kind=resource', auth(alice.token));
    assert.equal(kindList.data.some((item) => item.id === requestId), true);
    const map = await call('/map', auth(alice.token));
    const mapRequest = map.data.helpRequests.find((item) => item.id === requestId);
    assert.ok(mapRequest);
    assert.equal(mapRequest.approximateLocation.latitude, 52.23123);

    assertStatus(await call(`/conversations/${requestId}/messages`, auth(outsider.token)), 403);
    const message = await call(`/conversations/${requestId}/messages`, {
      ...auth(alice.token), method: 'POST', body: { text: 'I can pick you up at the east gate.' },
    });
    assertStatus(message, 201);
    assert.equal(message.data.isMine, true);
    assert.equal((await call(`/conversations/${requestId}/messages`, auth(bob.token))).data[0].isMine, false);
    assertStatus(await call(`/conversations/${requestId}/messages`, auth(outsider.token)), 403);

    assertStatus(await call(`/help-requests/${requestId}`, { ...auth(alice.token), method: 'PATCH', body: { status: 'withdrawn' } }), 403);
    const updated = await call(`/help-requests/${requestId}`, {
      ...auth(bob.token), method: 'PATCH', body: { title: 'Transport for two', description: 'Updated meeting point' },
    });
    assertStatus(updated, 200);
    assert.equal(updated.data.title, 'Transport for two');
    assert.equal((await call('/help-feed', auth(alice.token))).data.find((item) => item.id === requestId).title, 'Transport for two');
    assertStatus(await call(`/help-requests/${requestId}`, { ...auth(bob.token), method: 'PATCH', body: { status: 'withdrawn' } }), 200);
    assert.equal((await call('/help-feed', auth(alice.token))).data.some((item) => item.id === requestId), false);
  });

  let offerId;
  await t.test('offers can be created, edited, chatted on, and withdrawn by their owner', async () => {
    const offer = await call('/offers', {
      ...auth(alice.token), method: 'POST',
      body: { categories: ['Food and water', 'Shelter'], description: 'Water and a spare room', approximateLocation: approximateLocation() },
    });
    assertStatus(offer, 201);
    offerId = offer.data.id;
    assert.equal(offer.data.isMine, true);
    assert.deepEqual(offer.data.categories, ['Food and water', 'Shelter']);

    const otherView = await call('/offers', auth(bob.token));
    assert.equal(otherView.data.find((item) => item.id === offerId).isMine, false);
    assert.equal((await call('/help-feed', auth(alice.token))).data.some((item) => item.id === offerId), true);

    assertStatus(await call(`/offers/${offerId}`, { ...auth(bob.token), method: 'PATCH', body: { status: 'withdrawn' } }), 403);
    const edited = await call(`/offers/${offerId}`, {
      ...auth(alice.token), method: 'PATCH', body: { categories: ['Transport'], description: 'One seat available' },
    });
    assertStatus(edited, 200);
    assert.equal(edited.data.title, 'Transport');

    const message = await call(`/conversations/${offerId}/messages`, {
      ...auth(bob.token), method: 'POST', body: { text: 'Is the ride still available?' },
    });
    assertStatus(message, 201);
    assert.equal((await call(`/conversations/${offerId}/messages`, auth(alice.token))).data[0].text, 'Is the ride still available?');

    assertStatus(await call(`/offers/${offerId}`, { ...auth(alice.token), method: 'PATCH', body: { status: 'withdrawn' } }), 200);
    assert.equal((await call('/offers', auth(bob.token))).data.some((item) => item.id === offerId), false);
    assert.equal((await call('/help-feed', auth(bob.token))).data.some((item) => item.id === offerId), false);
    assertStatus(await call(`/conversations/${offerId}/messages`, { ...auth(bob.token), method: 'POST', body: { text: 'Too late' } }), 404);
  });

  await t.test('authority-only incident review updates the aggregate heatmap', async () => {
    const created = await call('/incidents', {
      ...auth(bob.token), method: 'POST',
      body: { category: 'Injured', description: 'Needs first aid', approximateLocation: approximateLocation('East station', 52.24567, 21.03456) },
    });
    assertStatus(created, 201);
    incidentId = created.data.id;
    assertStatus(await call(`/incidents/${incidentId}`, { ...auth(alice.token), method: 'PATCH', body: { status: 'verified' } }), 404);
    const reviewed = await call(`/incidents/${incidentId}`, { ...auth(authority.token), method: 'PATCH', body: { status: 'verified' } });
    assertStatus(reviewed, 200);
    assert.equal(reviewed.data.verificationStatus, 'verified');
    assert.equal((await call('/heatmap', auth(alice.token))).data.some((cell) => cell.label === 'East station' && cell.count === 1), true);
    assertStatus(await call('/authority/incidents', auth(alice.token)), 403);
    assert.equal((await call('/authority/incidents', auth(authority.token))).data.some((item) => item.id === incidentId), true);
    const audit = await call('/authority/audit', auth(authority.token));
    assert.equal(audit.data.some((entry) => entry.targetId === incidentId && entry.action === 'incident_updated'), true);
  });

  await t.test('authority notices, rendezvous points, sites, and danger zones publish to the map', async () => {
    const noticePayload = { title: 'Road closed', body: 'Use the west entrance.', status: 'published' };
    assertStatus(await call('/notices', { ...auth(alice.token), method: 'POST', body: noticePayload }), 404);
    const notice = await call('/notices', { ...auth(authority.token), method: 'POST', body: noticePayload });
    assertStatus(notice, 201);
    assert.equal((await call('/notices', auth(bob.token))).data.some((item) => item.id === notice.data.id), true);
    assert.equal((await call('/map', auth(bob.token))).data.notices.some((item) => item.id === notice.data.id), true);
    assertStatus(await call(`/notices/${notice.data.id}`, { ...auth(authority.token), method: 'PATCH', body: { status: 'withdrawn' } }), 200);
    assert.equal((await call('/notices', auth(bob.token))).data.some((item) => item.id === notice.data.id), false);

    const rendezvousPayload = { title: 'West gate', instructions: 'Bring water', location: approximateLocation('West gate') };
    assertStatus(await call('/rendezvous', { ...auth(alice.token), method: 'POST', body: rendezvousPayload }), 404);
    const rendezvous = await call('/rendezvous', { ...auth(authority.token), method: 'POST', body: rendezvousPayload });
    assertStatus(rendezvous, 201);
    assert.equal((await call('/map', auth(bob.token))).data.rendezvousPoints.some((item) => item.id === rendezvous.data.id), true);
    assertStatus(await call(`/rendezvous/${rendezvous.data.id}`, { ...auth(authority.token), method: 'PATCH', body: { status: 'completed' } }), 200);
    assert.equal((await call('/rendezvous', auth(bob.token))).data.some((item) => item.id === rendezvous.data.id), false);

    const sitePayload = { kind: 'shelter', title: 'Community hall', summary: 'Water inside', coordinate: { latitude: 52.2, longitude: 21.0 } };
    assertStatus(await call('/emergency-sites', { ...auth(alice.token), method: 'POST', body: sitePayload }), 404);
    const site = await call('/emergency-sites', { ...auth(authority.token), method: 'POST', body: sitePayload });
    assertStatus(site, 201);
    assert.equal((await call('/map', auth(bob.token))).data.emergencySites.some((item) => item.id === site.data.id), true);
    assertStatus(await call(`/emergency-sites/${site.data.id}`, { ...auth(authority.token), method: 'PATCH', body: { status: 'withdrawn' } }), 200);
    assert.equal((await call('/emergency-sites', auth(bob.token))).data.some((item) => item.id === site.data.id), false);

    const zonePayload = { kind: 'flooding', title: 'Flooded underpass', summary: 'Avoid crossing.', coordinate: { latitude: 52.21, longitude: 21.02 }, radius: 0, severity: 'high' };
    assertStatus(await call('/danger-zones', { ...auth(alice.token), method: 'POST', body: zonePayload }), 404);
    const zone = await call('/danger-zones', { ...auth(authority.token), method: 'POST', body: zonePayload });
    assertStatus(zone, 201);
    assert.equal(zone.data.radius, 25);
    assert.equal((await call('/map', auth(bob.token))).data.dangerZones.some((item) => item.id === zone.data.id), true);
    assertStatus(await call(`/danger-zones/${zone.data.id}`, { ...auth(authority.token), method: 'PATCH', body: { status: 'withdrawn' } }), 200);
    assert.equal((await call('/danger-zones', auth(bob.token))).data.some((item) => item.id === zone.data.id), false);
  });

  await t.test('location visibility respects privacy and accepted connections', async () => {
    const location = approximateLocation('North park', 52.22222, 21.01111);
    assertStatus(await call('/location', { ...auth(alice.token), method: 'PUT', body: { location, visibility: 'private' } }), 200);
    assert.equal((await call('/locations', auth(bob.token))).data.some((person) => person.userId === alice.user.id), false);
    assert.equal((await call('/locations', auth(alice.token))).data.some((person) => person.userId === alice.user.id), true);

    assertStatus(await call('/location', { ...auth(alice.token), method: 'PUT', body: { location, visibility: 'connections' } }), 200);
    const connection = await call('/connections', { ...auth(bob.token), method: 'POST', body: { userId: alice.user.id } });
    assertStatus(connection, 201);
    assert.equal((await call('/locations', auth(bob.token))).data.some((person) => person.userId === alice.user.id), false);
    assertStatus(await call(`/connections/${connection.data.id}`, { ...auth(alice.token), method: 'PATCH', body: { status: 'accepted' } }), 200);
    assert.equal((await call('/locations', auth(bob.token))).data.some((person) => person.userId === alice.user.id), true);
    assert.equal((await call('/connections', auth(alice.token))).data.some((item) => item.id === connection.data.id && item.status === 'accepted'), true);

    assertStatus(await call('/location', { ...auth(alice.token), method: 'PUT', body: { location, visibility: 'everyone' } }), 200);
    assert.equal((await call('/locations', auth(outsider.token))).data.some((person) => person.userId === alice.user.id), true);
    assertStatus(await call('/location', { ...auth(alice.token), method: 'DELETE' }), 204);
    assert.equal((await call('/locations', auth(bob.token))).data.some((person) => person.userId === alice.user.id), false);
  });

  await t.test('legacy credentials, validation errors, and persistent storage survive a restart', async () => {
    const registered = await call('/auth/register', {
      method: 'POST', body: { name: 'Legacy User', email: 'legacy@example.test', password: 'long-test-password' },
    });
    assertStatus(registered, 201);
    assertStatus(await call('/auth/register', {
      method: 'POST', body: { name: 'Duplicate', email: 'legacy@example.test', password: 'long-test-password' },
    }), 409);
    const legacyLogin = await call('/auth/login', {
      method: 'POST', body: { email: 'LEGACY@example.test', password: 'long-test-password' },
    });
    assertStatus(legacyLogin, 200);
    assert.equal(legacyLogin.payload.user.id, registered.payload.user.id);
    assertStatus(await call('/auth/login', { method: 'POST', body: { email: 'legacy@example.test', password: 'wrong-password' } }), 401);

    assertStatus(await call('/help-requests', { ...auth(alice.token), method: 'POST', body: { kind: 'event', title: 'A riot' } }), 400);
    assertStatus(await call('/offers', { ...auth(alice.token), method: 'POST', body: { categories: ['Invalid'], approximateLocation: approximateLocation() } }), 400);
    assertStatus(await call('/not-a-route', auth(alice.token)), 404);

    await stopServer();
    await startServer();
    const persistedResident = await call('/auth/me', auth(alice.token));
    assertStatus(persistedResident, 200);
    assert.equal(persistedResident.payload.user.id, alice.user.id);
    assert.equal((await call('/auth/me', auth(authority.token))).payload.user.role, 'authority');
    assert.equal((await call('/authority/audit', auth(authority.token))).status, 200);
  });
});
