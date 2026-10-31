import { createServer } from 'node:http';
import { randomUUID, randomBytes, scryptSync, timingSafeEqual, createHmac } from 'node:crypto';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = process.env.SAFETOGETHER_DATA_DIR || path.join(ROOT, 'data');
const DB_FILE = path.join(DATA_DIR, 'store.json');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const PORT = Number(process.env.PORT || 8787);
const SECRET = process.env.SAFETOGETHER_SECRET || randomBytes(32).toString('hex');
const MAX_BODY = 7 * 1024 * 1024;
const emptyDb = () => ({ users: [], sessions: [], incidents: [], offers: [], helpRequests: [], messages: [], notices: [], rendezvousPoints: [], emergencySites: [], dangerZones: [], connections: [], locations: [], audit: [] });
let db = emptyDb();
let writes = Promise.resolve();

async function persist() {
  const snapshot = JSON.stringify(db, null, 2);
  writes = writes.then(async () => {
    const temp = `${DB_FILE}.${process.pid}.tmp`;
    await writeFile(temp, snapshot, { mode: 0o600 });
    await rename(temp, DB_FILE);
  });
  return writes;
}

async function init() {
  await mkdir(UPLOAD_DIR, { recursive: true });
  try { db = { ...emptyDb(), ...JSON.parse(await readFile(DB_FILE, 'utf8')) }; }
  catch (error) { if (error.code !== 'ENOENT') throw error; await persist(); }
  const authorityLoginId = clean(process.env.SAFETOGETHER_AUTHORITY_ID, 100);
  if (authorityLoginId && !findByLoginId(authorityLoginId)) {
    const user = { id: id('usr'), name: authorityLoginId, role: 'authority', loginId: authorityLoginId, createdAt: now() };
    db.users.push(user);
    await persist();
  }
  const authorityEmail = process.env.SAFETOGETHER_AUTHORITY_EMAIL?.trim().toLowerCase();
  const authorityPassword = process.env.SAFETOGETHER_AUTHORITY_PASSWORD;
  if (authorityEmail && authorityPassword && !db.users.some((u) => u.email === authorityEmail)) {
    const salt = randomBytes(16).toString('hex');
    db.users.push({ id: id('usr'), email: authorityEmail, name: 'Authority operator', role: 'authority', salt, passwordHash: scryptSync(authorityPassword, salt, 64).toString('hex'), createdAt: now() });
    await persist();
  }
}

const now = () => new Date().toISOString();
const id = (prefix) => `${prefix}_${randomUUID()}`;
const clean = (v, max = 500) => typeof v === 'string' ? v.trim().slice(0, max) : '';
const fail = (status, message) => Object.assign(new Error(message), { status });
const publicUser = ({ id: userId, name, role, createdAt }) => ({ id: userId, name, role, createdAt });
const audit = (actorId, action, targetType, targetId, details = {}) => db.audit.unshift({ id: id('aud'), actorId, action, targetType, targetId, details, createdAt: now() });
const loginIdDigest = (value) => createHmac('sha256', SECRET).update(value).digest('hex');
function findByLoginId(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const loginId = value.trim();
  const directMatch = db.users.find((user) => user.loginId === loginId);
  if (directMatch) return directMatch;
  const supplied = Buffer.from(loginIdDigest(loginId), 'hex');
  return db.users.find((user) => {
    if (!user.loginIdHash) return false;
    const stored = Buffer.from(user.loginIdHash, 'hex');
    return stored.length === supplied.length && timingSafeEqual(stored, supplied);
  }) || null;
}
function tokenFor(userId) {
  const payload = Buffer.from(JSON.stringify({ sub: userId, exp: Date.now() + 7 * 86400000 })).toString('base64url');
  return `${payload}.${createHmac('sha256', SECRET).update(payload).digest('base64url')}`;
}
function auth(req, roles) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) throw fail(401, 'Sign-in required');
  const [payload, signature] = token.split('.');
  if (!payload || !signature) throw fail(401, 'Invalid session');
  const expected = createHmac('sha256', SECRET).update(payload).digest();
  let supplied;
  try { supplied = Buffer.from(signature, 'base64url'); } catch { throw fail(401, 'Invalid session'); }
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw fail(401, 'Invalid session');
  let claims;
  try { claims = JSON.parse(Buffer.from(payload, 'base64url').toString()); } catch { throw fail(401, 'Invalid session'); }
  if (claims.exp < Date.now()) throw fail(401, 'Session expired');
  const user = db.users.find((u) => u.id === claims.sub);
  if (!user) throw fail(401, 'Unknown account');
  if (roles && !roles.includes(user.role)) throw fail(403, 'Insufficient role');
  return user;
}
function privateUser(userId) { return db.users.find((u) => u.id === userId); }
function getLocation(user, viewer) {
  const record = db.locations.find((x) => x.userId === user.id);
  if (!record) return null;
  const connected = db.connections.some((c) => c.status === 'accepted' && ((c.fromUserId === viewer?.id && c.toUserId === user.id) || (c.toUserId === viewer?.id && c.fromUserId === user.id)));
  const canSee = user.id === viewer?.id || record.visibility === 'everyone' || (record.visibility === 'connections' && connected) || (record.visibility === 'connections_authorities' && (connected || viewer?.role === 'authority'));
  if (!canSee) return null;
  return { userId: user.id, location: record.location, precision: record.precision, updatedAt: record.updatedAt };
}

async function readBody(req) {
  const chunks = []; let size = 0;
  for await (const chunk of req) { size += chunk.length; if (size > MAX_BODY) throw fail(413, 'Request body too large'); chunks.push(chunk); }
  try { return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}; }
  catch { throw fail(400, 'Body must be valid JSON'); }
}
function send(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'access-control-allow-origin': process.env.CORS_ORIGIN || '*', 'access-control-allow-headers': 'content-type, authorization', 'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS' });
  res.end(status === 204 ? undefined : JSON.stringify(body));
}
function approximate(location) {
  if (typeof location === 'string') location = { label: location, precision: 'neighborhood' };
  if (!location || typeof location !== 'object') throw fail(400, 'Approximate location is required');
  const label = clean(location.label, 120); const precision = ['neighborhood', 'district', 'landmark'].includes(location.precision) ? location.precision : 'neighborhood';
  const result = { label, precision };
  if (!label) throw fail(400, 'Location label is required');
  if (Number.isFinite(location.latitude) && Number.isFinite(location.longitude) && Math.abs(location.latitude) <= 90 && Math.abs(location.longitude) <= 180) {
    // Reduce precision before persistence and public delivery.
    result.latitude = Number(location.latitude.toFixed(2)); result.longitude = Number(location.longitude.toFixed(2));
  }
  return result;
}
function mapCoordinate(value) {
  if (!value || !Number.isFinite(value.latitude) || !Number.isFinite(value.longitude) || Math.abs(value.latitude) > 90 || Math.abs(value.longitude) > 180) throw fail(400, 'Valid latitude and longitude are required');
  return { latitude: Number(value.latitude.toFixed(5)), longitude: Number(value.longitude.toFixed(5)) };
}

const HELP_CATEGORIES = ['Shelter', 'Food and water', 'Transport', 'Qualified first aid', 'Supplies', 'Other practical help'];
const HELP_ICONS = { 'Shelter': 'home', 'Food and water': 'water', 'Transport': 'bus', 'Qualified first aid': 'medkit', 'Supplies': 'cube', 'Other practical help': 'hand-left' };
function normalizeHelpKind(value) {
  return ({ resource: 'resource', 'Request resources': 'resource', emergency: 'emergency', Emergency: 'emergency', event: 'event', 'Report an event': 'event' })[value] || null;
}
function helpCategories(body) {
  const requested = Array.isArray(body.categories) ? body.categories : body.category ? [body.category] : [];
  const categories = [...new Set(requested.map((value) => clean(value, 60)))];
  if (!categories.length || categories.some((value) => !HELP_CATEGORIES.includes(value))) throw fail(400, 'Choose at least one valid help category');
  return categories;
}
function requestCategories(body) {
  if (body.categories !== undefined && !Array.isArray(body.categories)) throw fail(400, 'Categories must be a list');
  const source = Array.isArray(body.categories) ? body.categories : body.category ? [body.category] : [];
  const categories = [...new Set(source.map((value) => clean(value, 100)).filter(Boolean))].slice(0, 5);
  return categories;
}
function optionalLocation(location) { return location ? approximate(location) : null; }
function publicAttachment(attachment) { return { id: attachment.id, mimeType: attachment.mimeType, url: `/v1/attachments/${attachment.id}` }; }
function displayName(userId) { return db.users.find((u) => u.id === userId)?.name || 'Community member'; }
function publicOffer(offer, viewerId) {
  const categories = offer.categories || [offer.category];
  return {
    id: offer.id, type: 'offer', categories, icon: HELP_ICONS[categories[0]] || 'hand-left', title: categories.join(' · '),
    author: displayName(offer.ownerId), distance: offer.approximateLocation?.label || 'Location not shared', tags: categories,
    approximateLocation: offer.approximateLocation || null,
    description: offer.description || undefined, photos: (offer.attachments || []).filter((item) => item.approved).map((item) => publicAttachment(item).url),
    isMine: offer.ownerId === viewerId, status: offer.status, createdAt: offer.createdAt,
  };
}
function publicHelpRequest(request) {
  return {
    id: request.id, type: 'request', kind: request.kind, icon: request.icon || 'hand-left', title: request.title,
    author: displayName(request.requesterId), distance: request.approximateLocation?.label || 'Location not shared',
    tags: request.tags, description: request.description || undefined, status: request.status, createdAt: request.createdAt,
  };
}
function publicIncident(incident) {
  const { attachments = [], exactLocation, reporterId, shareWithAuthorities, ...safe } = incident;
  return { ...safe, attachments: incident.status === 'verified' ? attachments.filter((item) => item.approved).map(publicAttachment) : [] };
}
function helpFeed(viewerId) {
  return [
    ...db.helpRequests.filter((request) => request.status === 'active' && request.kind === 'resource').map(publicHelpRequest),
    ...db.offers.filter((offer) => offer.status === 'active').map((offer) => publicOffer(offer, viewerId)),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
async function storeImage(data) {
  const match = typeof data === 'string' && data.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw fail(400, 'Image must be a base64 JPEG, PNG, or WebP data URL');
  const bytes = Buffer.from(match[2], 'base64');
  if (!bytes.length || bytes.length > 5 * 1024 * 1024) throw fail(413, 'Photo limit is 5 MB');
  const signatures = { 'image/jpeg': bytes[0] === 0xff && bytes[1] === 0xd8, 'image/png': bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])), 'image/webp': bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP' };
  if (!signatures[match[1]]) throw fail(400, 'Image content does not match its declared format');
  const attachment = { id: id('img'), mimeType: match[1], size: bytes.length, uploadedAt: now(), approved: false };
  await writeFile(path.join(UPLOAD_DIR, attachment.id), bytes, { flag: 'wx', mode: 0o600 });
  return attachment;
}

async function route(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  const method = req.method;
  if (method === 'OPTIONS') return send(res, 204, {});
  if (parts[0] !== 'v1') throw fail(404, 'Route not found');
  const resource = parts[1]; const recordId = parts[2];
  if (method === 'GET' && resource === 'health') return send(res, 200, { status: 'ok', time: now() });

  if (resource === 'auth' && method === 'POST' && parts[2] === 'id' && parts[3] === 'login') {
    const body = await readBody(req); const loginId = clean(body.id, 100);
    if (!loginId) throw fail(400, 'ID is required');
    let user = findByLoginId(loginId);
    const created = !user;
    if (!user) {
      user = { id: id('usr'), name: loginId, role: 'resident', loginId, createdAt: now() };
      db.users.push(user); await persist();
    } else if (user.loginId !== loginId) {
      // Migrate IDs created by the prior hash-only storage implementation.
      user.loginId = loginId;
      user.name = loginId;
      delete user.loginIdHash;
      await persist();
    }
    return send(res, 200, { token: tokenFor(user.id), user: publicUser(user), created });
  }

  if (resource === 'auth' && method === 'POST' && parts[2] === 'register') {
    const body = await readBody(req); const email = clean(body.email, 254).toLowerCase(); const name = clean(body.name, 80); const password = typeof body.password === 'string' ? body.password : '';
    if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 10 || !name) throw fail(400, 'Name, valid email, and password (at least 10 characters) are required');
    if (db.users.some((u) => u.email === email)) throw fail(409, 'Email is already registered');
    const salt = randomBytes(16).toString('hex'); const user = { id: id('usr'), email, name, role: 'resident', salt, passwordHash: scryptSync(password, salt, 64).toString('hex'), createdAt: now() };
    db.users.push(user); await persist(); return send(res, 201, { token: tokenFor(user.id), user: publicUser(user) });
  }
  if (resource === 'auth' && method === 'POST' && parts[2] === 'login') {
    const body = await readBody(req); const user = db.users.find((u) => u.email === clean(body.email, 254).toLowerCase());
    if (!user || typeof body.password !== 'string' || !timingSafeEqual(scryptSync(body.password, user.salt, 64), Buffer.from(user.passwordHash, 'hex'))) throw fail(401, 'Email or password is incorrect');
    return send(res, 200, { token: tokenFor(user.id), user: publicUser(user) });
  }

  if (resource === 'attachments' && method === 'GET' && recordId) {
    const incident = db.incidents.find((row) => (row.attachments || []).some((item) => item.id === recordId));
    const offer = db.offers.find((row) => (row.attachments || []).some((item) => item.id === recordId));
    const attachment = (incident?.attachments || []).find((item) => item.id === recordId) || (offer?.attachments || []).find((item) => item.id === recordId);
    if (!attachment) throw fail(404, 'Attachment not found');
    const publiclyVisible = attachment.approved && ((incident && incident.status === 'verified') || (offer && offer.status === 'active'));
    let viewer = null;
    if (req.headers.authorization) viewer = auth(req);
    const owner = viewer && (incident?.reporterId === viewer.id || offer?.ownerId === viewer.id);
    if (!publiclyVisible && !owner && viewer?.role !== 'authority') throw fail(404, 'Attachment not found');
    const bytes = await readFile(path.join(UPLOAD_DIR, attachment.id));
    res.writeHead(200, { 'content-type': attachment.mimeType, 'content-length': bytes.length, 'cache-control': publiclyVisible ? 'public, max-age=300' : 'private, no-store', 'x-content-type-options': 'nosniff', 'access-control-allow-origin': process.env.CORS_ORIGIN || '*' }); res.end(bytes); return;
  }

  const user = auth(req);
  if (resource === 'auth' && method === 'GET' && parts[2] === 'me') return send(res, 200, { user: publicUser(user) });

  if (resource === 'map' && method === 'GET') {
    const incidents = db.incidents.filter((item) => item.status !== 'rejected').map(publicIncident);
    const notices = db.notices.filter((item) => item.status === 'published' && (!item.expiresAt || item.expiresAt > now()));
    const rendezvousPoints = db.rendezvousPoints.filter((item) => item.status === 'active');
    const emergencySites = db.emergencySites.filter((item) => item.status === 'active');
    const dangerZones = db.dangerZones.filter((item) => item.status === 'active' && (!item.expiresAt || item.expiresAt > now()));
    const people = db.locations.map((item) => privateUser(item.userId)).filter(Boolean).map((person) => getLocation(person, user)).filter(Boolean);
    const heat = new Map();
    for (const incident of db.incidents.filter((item) => ['verified','in_progress','assigned'].includes(item.status))) {
      const location = incident.approximateLocation; const key = location.label.toLowerCase(); const cell = heat.get(key) || { label: location.label, latitude: location.latitude, longitude: location.longitude, count: 0 };
      cell.count += 1; heat.set(key, cell);
    }
    const helpRequests = db.helpRequests.filter((item) => item.status === 'active').map(publicHelpRequest);
    return send(res, 200, { data: { incidents, notices, rendezvousPoints, emergencySites, dangerZones, people, heatmap: [...heat.values()], helpFeed: helpFeed(user.id), helpRequests } });
  }

  if (resource === 'help-feed' && method === 'GET') return send(res, 200, { data: helpFeed(user.id) });

  if (resource === 'help-requests' && method === 'GET' && parts.length === 2) {
    const requestedKind = url.searchParams.get('kind');
    const rows = db.helpRequests.filter((item) => item.status === 'active' && (!requestedKind || item.kind === normalizeHelpKind(requestedKind))).map(publicHelpRequest);
    return send(res, 200, { data: rows });
  }
  if (resource === 'help-requests' && method === 'POST' && !recordId) {
    const body = await readBody(req); const kind = normalizeHelpKind(body.kind) || 'resource';
    const categories = requestCategories(body);
    const description = clean(body.description, 1000); const title = clean(body.title, 120) || categories.join(' · ') || (kind === 'emergency' ? 'Emergency assistance' : kind === 'event' ? 'Report an event' : 'Help requested');
    if (!title) throw fail(400, 'Request title is required');
    const row = { id: id('req'), kind, title, categories, tags: Array.isArray(body.tags) ? body.tags.map((item) => clean(item, 40)).filter(Boolean).slice(0, 8) : categories, description, approximateLocation: optionalLocation(body.approximateLocation), status: 'active', requesterId: user.id, participants: [user.id], createdAt: now(), updatedAt: now() };
    db.helpRequests.unshift(row); audit(user.id, 'help_request_created', 'help_request', row.id); await persist();
    return send(res, 201, { data: publicHelpRequest(row) });
  }
  if (resource === 'help-requests' && method === 'PATCH' && recordId && parts.length === 3) {
    const row = db.helpRequests.find((item) => item.id === recordId); if (!row) throw fail(404, 'Help request not found');
    if (row.requesterId !== user.id && user.role !== 'authority') throw fail(403, 'Only the requester or an authority can manage this request');
    const body = await readBody(req);
    if (['active','resolved','withdrawn','expired'].includes(body.status)) row.status = body.status;
    if (body.title !== undefined) row.title = clean(body.title, 120);
    if (body.description !== undefined) row.description = clean(body.description, 1000);
    if (body.approximateLocation !== undefined) row.approximateLocation = optionalLocation(body.approximateLocation);
    row.updatedAt = now(); audit(user.id, 'help_request_updated', 'help_request', row.id, { status: row.status }); await persist();
    return send(res, 200, { data: publicHelpRequest(row) });
  }
  if (resource === 'help-requests' && method === 'GET' && recordId && parts[3] === 'messages') {
    const row = db.helpRequests.find((item) => item.id === recordId); if (!row) throw fail(404, 'Help request not found');
    if (!row.participants?.includes(user.id) && row.requesterId !== user.id && user.role !== 'authority') throw fail(403, 'Join the conversation by sending a message first');
    return send(res, 200, { data: db.messages.filter((message) => message.requestId === row.id).map((message) => ({ ...message, isMine: message.senderId === user.id, sentAt: message.createdAt })) });
  }
  if (resource === 'help-requests' && method === 'POST' && recordId && parts[3] === 'messages') {
    const row = db.helpRequests.find((item) => item.id === recordId); if (!row || row.status !== 'active') throw fail(404, 'Active help request not found');
    const body = await readBody(req); const text = clean(body.text, 1000); if (!text) throw fail(400, 'Message text is required');
    if (row.participants && !row.participants.includes(user.id)) row.participants.push(user.id);
    const message = { id: id('msg'), requestId: row.id, senderId: user.id, senderName: user.name, text, createdAt: now() };
    db.messages.push(message); row.updatedAt = now(); audit(user.id, 'help_message_sent', 'help_request', row.id); await persist();
    return send(res, 201, { data: { ...message, isMine: true, sentAt: message.createdAt } });
  }

  if (resource === 'incidents' && method === 'GET') {
    const rows = db.incidents.filter((x) => x.status !== 'rejected' && (!url.searchParams.get('status') || x.status === url.searchParams.get('status'))).map(publicIncident);
    return send(res, 200, { data: rows });
  }
  if (resource === 'incidents' && method === 'POST' && !recordId) {
    const body = await readBody(req); const category = clean(body.category, 60); const description = clean(body.description, 1000);
    if (!category || description.length < 5) throw fail(400, 'Category and description (at least 5 characters) are required');
    const row = { id: id('inc'), category, description, approximateLocation: approximate(body.approximateLocation), submittedAt: now(), updatedAt: now(), source: 'community', verificationStatus: 'awaiting_review', status: 'new', reporterId: user.id, attachments: [], shareWithAuthorities: body.shareWithAuthorities !== false };
    db.incidents.unshift(row); audit(user.id, 'incident_submitted', 'incident', row.id); await persist();
    return send(res, 201, { data: { id: row.id, category, description, approximateLocation: row.approximateLocation, submittedAt: row.submittedAt, status: row.status, verificationStatus: row.verificationStatus } });
  }
  if (resource === 'incidents' && method === 'POST' && recordId && parts[3] === 'attachments') {
    const incident = db.incidents.find((x) => x.id === recordId);
    if (!incident) throw fail(404, 'Incident not found');
    if (incident.reporterId !== user.id && user.role !== 'authority') throw fail(403, 'Only the reporter or an authority can attach photos');
    const body = await readBody(req); const attachment = await storeImage(body.data);
    incident.attachments.push(attachment); incident.updatedAt = now(); await persist();
    return send(res, 201, { data: { id: attachment.id, moderation: 'pending' } });
  }
  if (resource === 'incidents' && method === 'PATCH' && recordId && user.role === 'authority') {
    const row = db.incidents.find((x) => x.id === recordId); if (!row) throw fail(404, 'Incident not found');
    const body = await readBody(req);
    if (['new','under_review','verified','assigned','in_progress','resolved','rejected'].includes(body.status)) { row.status = body.status; row.verificationStatus = body.status === 'verified' ? 'verified' : body.status === 'rejected' ? 'rejected' : row.verificationStatus; }
    if (Array.isArray(body.approvedAttachmentIds)) for (const a of row.attachments) a.approved = body.approvedAttachmentIds.includes(a.id);
    row.updatedAt = now(); audit(user.id, 'incident_updated', 'incident', row.id, { status: row.status }); await persist(); return send(res, 200, { data: row });
  }

  if (resource === 'offers' && method === 'GET' && parts.length === 2) return send(res, 200, { data: db.offers.filter((o) => o.status === 'active').map((offer) => publicOffer(offer, user.id)) });
  if (resource === 'offers' && method === 'POST' && recordId && parts[3] === 'attachments') {
    const offer = db.offers.find((item) => item.id === recordId); if (!offer) throw fail(404, 'Offer not found');
    if (offer.ownerId !== user.id && user.role !== 'authority') throw fail(403, 'Only the offer owner or an authority can attach photos');
    if ((offer.attachments || []).length >= 3) throw fail(409, 'An offer can have up to 3 photos');
    const body = await readBody(req); const attachment = await storeImage(body.data);
    offer.attachments ||= []; offer.attachments.push(attachment); offer.updatedAt = now(); await persist();
    return send(res, 201, { data: { id: attachment.id, moderation: 'pending' } });
  }
  if (resource === 'offers' && method === 'POST' && parts.length === 2) {
    const body = await readBody(req); const categories = helpCategories(body); const description = clean(body.description, 1000);
    const row = { id: id('off'), categories, category: categories[0], description, approximateLocation: optionalLocation(body.approximateLocation), availability: clean(body.availability, 100), capacity: clean(body.capacity, 100), status: 'active', createdAt: now(), updatedAt: now(), ownerId: user.id, attachments: [] };
    db.offers.unshift(row); audit(user.id, 'offer_created', 'help_offer', row.id); await persist(); return send(res, 201, { data: publicOffer(row, user.id) });
  }
  if (resource === 'offers' && method === 'PATCH' && recordId) {
    const row = db.offers.find((o) => o.id === recordId); if (!row) throw fail(404, 'Offer not found');
    if (row.ownerId !== user.id && user.role !== 'authority') throw fail(403, 'Only the offer owner can manage it');
    const body = await readBody(req);
    if (body.categories !== undefined || body.category !== undefined) { row.categories = helpCategories(body); row.category = row.categories[0]; }
    if (body.description !== undefined) row.description = clean(body.description, 1000);
    if (body.approximateLocation !== undefined) row.approximateLocation = optionalLocation(body.approximateLocation);
    if (body.availability !== undefined) row.availability = clean(body.availability, 100);
    if (body.capacity !== undefined) row.capacity = clean(body.capacity, 100);
    if (['active','withdrawn','expired'].includes(body.status)) row.status = body.status;
    if (user.role === 'authority' && Array.isArray(body.approvedPhotoIds)) for (const photo of row.attachments || []) photo.approved = body.approvedPhotoIds.includes(photo.id);
    row.updatedAt = now(); audit(user.id, 'offer_updated', 'help_offer', row.id, { status: row.status }); await persist();
    return send(res, 200, { data: publicOffer(row, user.id) });
  }

  if (resource === 'notices' && method === 'GET') return send(res, 200, { data: db.notices.filter((n) => n.status === 'published' && (!n.expiresAt || n.expiresAt > now())) });
  if (resource === 'notices' && method === 'POST' && user.role === 'authority') {
    const body = await readBody(req); if (!clean(body.title, 120) || !clean(body.body, 2000)) throw fail(400, 'Title and body are required');
    const row = { id: id('not'), title: clean(body.title, 120), body: clean(body.body, 2000), status: body.status === 'published' ? 'published' : 'draft', createdAt: now(), publishedAt: body.status === 'published' ? now() : null, expiresAt: body.expiresAt || null, authorId: user.id };
    db.notices.unshift(row); audit(user.id, row.status === 'published' ? 'notice_published' : 'notice_drafted', 'notice', row.id); await persist(); return send(res, 201, { data: row });
  }
  if (resource === 'notices' && method === 'PATCH' && recordId && user.role === 'authority') {
    const row = db.notices.find((n) => n.id === recordId); if (!row) throw fail(404, 'Notice not found'); const body = await readBody(req);
    if (['draft','published','withdrawn','expired'].includes(body.status)) row.status = body.status;
    if (row.status === 'published' && !row.publishedAt) row.publishedAt = now(); if (body.title) row.title = clean(body.title, 120); if (body.body) row.body = clean(body.body, 2000);
    audit(user.id, `notice_${row.status}`, 'notice', row.id); await persist(); return send(res, 200, { data: row });
  }

  if (resource === 'rendezvous' && method === 'GET') return send(res, 200, { data: db.rendezvousPoints.filter((p) => p.status === 'active') });
  if (resource === 'rendezvous' && method === 'POST' && user.role === 'authority') {
    const body = await readBody(req); const row = { id: id('rv'), title: clean(body.title, 120), instructions: clean(body.instructions, 1000), location: approximate(body.location), status: 'active', createdAt: now(), authorId: user.id, expiresAt: body.expiresAt || null };
    if (!row.title) throw fail(400, 'Rendezvous point title is required'); db.rendezvousPoints.unshift(row); audit(user.id, 'rendezvous_published', 'rendezvous', row.id); await persist(); return send(res, 201, { data: row });
  }
  if (resource === 'rendezvous' && method === 'PATCH' && recordId && user.role === 'authority') {
    const row = db.rendezvousPoints.find((p) => p.id === recordId); if (!row) throw fail(404, 'Rendezvous point not found'); const body = await readBody(req); if (['active','withdrawn','completed'].includes(body.status)) row.status = body.status; await persist(); return send(res, 200, { data: row });
  }

  if (resource === 'emergency-sites' && method === 'GET') return send(res, 200, { data: db.emergencySites.filter((site) => site.status === 'active') });
  if (resource === 'emergency-sites' && method === 'POST' && user.role === 'authority') {
    const body = await readBody(req); const kind = ['shelter','safe_zone','aid'].includes(body.kind) ? body.kind : null;
    const row = { id: id('site'), kind, title: clean(body.title, 120), summary: clean(body.summary, 1000), coordinate: mapCoordinate(body.coordinate), capacity: clean(body.capacity, 120) || undefined, status: 'active', createdAt: now(), authorId: user.id, expiresAt: body.expiresAt || null };
    if (!kind || !row.title) throw fail(400, 'A valid site kind and title are required');
    db.emergencySites.unshift(row); audit(user.id, 'emergency_site_published', 'emergency_site', row.id); await persist(); return send(res, 201, { data: row });
  }
  if (resource === 'emergency-sites' && method === 'PATCH' && recordId && user.role === 'authority') {
    const row = db.emergencySites.find((site) => site.id === recordId); if (!row) throw fail(404, 'Emergency site not found'); const body = await readBody(req);
    if (['active','withdrawn','completed'].includes(body.status)) row.status = body.status;
    await persist(); return send(res, 200, { data: row });
  }
  if (resource === 'danger-zones' && method === 'GET') return send(res, 200, { data: db.dangerZones.filter((zone) => zone.status === 'active' && (!zone.expiresAt || zone.expiresAt > now())) });
  if (resource === 'danger-zones' && method === 'POST' && user.role === 'authority') {
    const body = await readBody(req); const kind = ['attack','fire','flooding'].includes(body.kind) ? body.kind : null;
    const severity = ['critical','high','medium'].includes(body.severity) ? body.severity : null;
    const coordinate = mapCoordinate(body.coordinate); const radius = Number(body.radius);
    const row = { id: id('zone'), kind, title: clean(body.title, 120), summary: clean(body.summary, 1000), coordinate, radius: Number.isFinite(radius) ? Math.max(25, Math.min(50000, radius)) : 500, severity, status: 'active', createdAt: now(), authorId: user.id, expiresAt: body.expiresAt || null };
    if (!kind || !severity || !row.title) throw fail(400, 'A valid kind, severity, title, and coordinate are required');
    db.dangerZones.unshift(row); audit(user.id, 'danger_zone_published', 'danger_zone', row.id); await persist(); return send(res, 201, { data: row });
  }
  if (resource === 'danger-zones' && method === 'PATCH' && recordId && user.role === 'authority') {
    const row = db.dangerZones.find((zone) => zone.id === recordId); if (!row) throw fail(404, 'Danger zone not found'); const body = await readBody(req);
    if (['active','withdrawn','expired'].includes(body.status)) row.status = body.status;
    if (body.expiresAt !== undefined) row.expiresAt = body.expiresAt || null;
    await persist(); return send(res, 200, { data: row });
  }

  if (resource === 'location' && method === 'PUT') {
    const body = await readBody(req); const visibility = ['connections','connections_authorities','everyone','private'].includes(body.visibility) ? body.visibility : 'connections';
    const record = { userId: user.id, location: approximate(body.location), precision: body.precision === 'district' ? 'district' : 'neighborhood', visibility, updatedAt: now() };
    db.locations = db.locations.filter((x) => x.userId !== user.id); db.locations.push(record); await persist(); return send(res, 200, { data: { visibility, updatedAt: record.updatedAt } });
  }
  if (resource === 'location' && method === 'DELETE') { db.locations = db.locations.filter((x) => x.userId !== user.id); await persist(); return send(res, 204, {}); }
  if (resource === 'locations' && method === 'GET') {
    const people = db.locations.map((x) => privateUser(x.userId)).filter(Boolean).map((person) => getLocation(person, user)).filter(Boolean);
    return send(res, 200, { data: people });
  }
  if (resource === 'connections' && method === 'GET') {
    const data = db.connections.filter((c) => c.fromUserId === user.id || c.toUserId === user.id).map((c) => ({ id: c.id, status: c.status, user: publicUser(privateUser(c.fromUserId === user.id ? c.toUserId : c.fromUserId)) })); return send(res, 200, { data });
  }
  if (resource === 'connections' && method === 'POST') {
    const body = await readBody(req); const target = db.users.find((u) => u.id === clean(body.userId, 100)) || db.users.find((u) => u.email && u.email === clean(body.email, 254).toLowerCase());
    if (!target || target.id === user.id) throw fail(404, 'Account not found');
    if (db.connections.some((c) => [c.fromUserId,c.toUserId].includes(user.id) && [c.fromUserId,c.toUserId].includes(target.id))) throw fail(409, 'Connection already exists');
    const row = { id: id('con'), fromUserId: user.id, toUserId: target.id, status: 'pending', createdAt: now() }; db.connections.push(row); await persist(); return send(res, 201, { data: { id: row.id, status: row.status } });
  }
  if (resource === 'connections' && method === 'PATCH' && recordId) {
    const row = db.connections.find((c) => c.id === recordId); if (!row || row.toUserId !== user.id) throw fail(404, 'Connection request not found');
    const body = await readBody(req); if (body.status === 'accepted' || body.status === 'rejected') row.status = body.status; await persist(); return send(res, 200, { data: { id: row.id, status: row.status } });
  }

  if (resource === 'heatmap' && method === 'GET') {
    const counts = new Map();
    for (const incident of db.incidents.filter((x) => ['verified','in_progress','assigned'].includes(x.status))) {
      const location = incident.approximateLocation; const key = location.label.toLowerCase(); const cell = counts.get(key) || { label: location.label, latitude: location.latitude, longitude: location.longitude, count: 0, categories: {} };
      cell.count += 1; cell.categories[incident.category] = (cell.categories[incident.category] || 0) + 1; counts.set(key, cell);
    }
    return send(res, 200, { data: [...counts.values()] });
  }
  if (resource === 'authority' && method === 'GET' && parts[2] === 'incidents') {
    auth(req, ['authority']); return send(res, 200, { data: db.incidents });
  }
  if (resource === 'authority' && method === 'GET' && parts[2] === 'audit') {
    auth(req, ['authority']); return send(res, 200, { data: db.audit });
  }
  throw fail(404, 'Route not found');
}

await init();
createServer(async (req, res) => {
  try { await route(req, res); }
  catch (error) { send(res, error.status || 500, { error: error.status ? error.message : 'Internal server error' }); if (!error.status) console.error(error); }
}).listen(PORT, '0.0.0.0', () => console.log(`SafeTogether API listening on http://localhost:${PORT}`));
