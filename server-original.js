import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import mongoose, { Schema, model } from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

for (const envFile of [
  '../primary-hosting-secrets.env',
  '../natsumi-koreanbots-token.env',
  '../natsumi-dashboard-vortexa-secrets.env',
  '../natsumi-automation-secrets.env',
  '../yuzuha-vortexa-secrets.env',
]) {
  const filePath = path.resolve(__dirname, envFile);
  if (!fs.existsSync(filePath)) continue;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

const PORT = Number(process.env.SERVER_PORT || process.env.PORT || process.env.WEB_PORT || 25901);
const HTTP_PUBLIC_HOSTS = new Set([
  'natsumidashboard.kro.kr',
  'natsumi-game.kro.kr',
  'api.natsumidashboard.kro.kr',
  'api.natsumi-game.kro.kr',
]);
function normalizePublicServiceUrl(value, fallback) {
  const raw = String(value || fallback).trim();
  try {
    const url = new URL(raw);
    if (HTTP_PUBLIC_HOSTS.has(url.hostname)) url.protocol = 'http:';
    return url.toString();
  } catch {
    return fallback;
  }
}
const DASHBOARD_URL = normalizePublicServiceUrl(process.env.DASHBOARD_URL, 'http://natsumidashboard.kro.kr/').replace(/\/$/, '') + '/';
const SITE_URL = (process.env.SITE_URL || 'http://natsumi-site.kro.kr/').replace(/\/$/, '') + '/';
const GAME_URL = normalizePublicServiceUrl(process.env.GAME_URL, 'http://natsumi-game.kro.kr/').replace(/\/$/, '') + '/';
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || '';
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || '';
const NATSUMI_BOT_TOKEN = process.env.NATSUMI_BOT_TOKEN || process.env.DISCORD_BOT_TOKEN || process.env.TOKEN || '';
const YUZUHA_BOT_TOKEN = process.env.YUZUHA_BOT_TOKEN || process.env.YUZUHA_TOKEN || '';
const NATSUMI_BOT_ID = process.env.NATSUMI_BOT_ID || process.env.NATSUMI_CLIENT_ID || process.env.DISCORD_CLIENT_ID || '905355491708903485';
const YUZUHA_BOT_ID = process.env.YUZUHA_BOT_ID || process.env.YUZUHA_CLIENT_ID || '1508101246723035196';
const BOT_STATUS_URL = process.env.BOT_STATUS_URL || process.env.NATSUMI_BOT_STATUS_URL || process.env.BOT_API_URL || '';
const OWNER_USER_ID = process.env.OWNER_USER_ID || process.env.NATSUMI_OWNER_ID || '1293232804745838733';
const DEVELOPER_NOTICE_CHANNEL_ID = process.env.DEVELOPER_NOTICE_CHANNEL_ID || '1371675674393448528';
const cleanEnv = (value) => String(value || '').replace(/['"]/g, '').trim();
const KOREANBOTS_TOKEN = cleanEnv(process.env.KOREANBOTS_TOKEN);
const KOREANBOTS_BOT_ID = cleanEnv(process.env.KOREANBOTS_BOT_ID) || DISCORD_CLIENT_ID || '905355491708903485';
const BOT_PROFILES = {
  natsumi: { key: 'natsumi', name: 'Natsumi', botId: NATSUMI_BOT_ID, token: NATSUMI_BOT_TOKEN },
  yuzuha: { key: 'yuzuha', name: 'Yuzuha', botId: YUZUHA_BOT_ID, token: YUZUHA_BOT_TOKEN },
};

function firstEnv(...names) {
  for (const name of names) {
    const value = cleanEnv(process.env[name]);
    if (value) return value;
  }
  return '';
}

function hostingConfig(botKey = 'natsumi') {
  const key = normalizeBotKey(botKey);
  const upper = key.toUpperCase();
  const apiBase = firstEnv(`${upper}_PRIMARY_API_BASE`, 'PRIMARY_HOSTING_API_BASE', 'PRIMARY_HOSTING_PANEL_URL', 'VORTEXA_PANEL_URL', 'PANEL_URL').replace(/\/$/, '');
  const apiKey = firstEnv(`${upper}_PRIMARY_API_KEY`, `${upper}_VORTEXA_API_KEY`, key === 'yuzuha' ? 'YUZUHA_PRIMARY_API_KEY' : 'NATSUMI_PRIMARY_API_KEY', 'PRIMARY_HOSTING_API_KEY', 'VORTEXA_API_KEY');
  const serverId = firstEnv(`${upper}_PRIMARY_SERVER_ID`, `${upper}_VORTEXA_SERVER_ID`, `${upper}_SERVER_ID`, key === 'yuzuha' ? 'YUZUHA_SERVER_ID' : 'NATSUMI_SERVER_ID', 'PRIMARY_HOSTING_SERVER_ID', key === 'natsumi' ? 'VORTEXA_SERVER_ID' : '');
  return { apiBase, apiKey, serverId, botKey: key };
}

const hostingServerCache = new Map();

function coredLabExternalBase(apiBase = '') {
  const base = String(apiBase || '').replace(/\/$/, '');
  if (!base) return '';
  if (base.endsWith('/api/external')) return base;
  if (base.includes('host.coredlabgame.cloud')) return `${base}/api/external`;
  return '';
}

async function discoverHostingServerId(config) {
  if (!config.apiBase || !config.apiKey) return '';
  if (config.serverId) return config.serverId;
  const cacheKey = `${config.apiBase}:${config.botKey}`;
  const cached = hostingServerCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.serverId;

  const endpoints = ['/api/client', '/api/client/servers'];
  const nameHints = config.botKey === 'yuzuha'
    ? ['yuzuha', '유즈하']
    : ['natsumi', '나츠미'];
  for (const endpoint of endpoints) {
    try {
      const response = await fetchWithTimeout(`${config.apiBase}${endpoint}`, {
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          Accept: 'application/json',
        },
      }, 6500);
      if (!response.ok) continue;
      const json = await response.json();
      const rows = Array.isArray(json?.data) ? json.data : [];
      const matched = rows.find((row) => {
        const attrs = row?.attributes || {};
        const name = String(attrs.name || '').toLowerCase();
        return nameHints.some((hint) => name.includes(hint.toLowerCase()));
      }) || rows[0];
      const id = matched?.attributes?.identifier || matched?.attributes?.uuid || '';
      if (id) {
        hostingServerCache.set(cacheKey, { serverId: id, expiresAt: Date.now() + 5 * 60 * 1000 });
        return id;
      }
    } catch {
      continue;
    }
  }
  return '';
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchRuntimeStatusCandidates(botKey = 'natsumi') {
  const upper = normalizeBotKey(botKey).toUpperCase();
  const urls = [
    firstEnv(`${upper}_BOT_STATUS_URL`),
    botKey === 'natsumi' ? firstEnv('NATSUMI_BOT_STATUS_URL') : firstEnv('YUZUHA_BOT_STATUS_URL'),
    firstEnv('BOT_STATUS_URL', 'BOT_API_URL'),
  ].filter(Boolean);
  for (const base of urls) {
    try {
      const statusUrl = base.endsWith('/api/status') ? base : `${base.replace(/\/$/, '')}/api/status`;
      const response = await fetchWithTimeout(statusUrl, {}, 4500);
      if (!response.ok) continue;
      const status = await response.json();
      return { ok: true, status, source: statusUrl };
    } catch {
      continue;
    }
  }
  return { ok: false, status: null, source: '' };
}

async function fetchHostingResources(botKey = 'natsumi') {
  const config = hostingConfig(botKey);
  const coredLabBase = coredLabExternalBase(config.apiBase);
  if (coredLabBase && config.apiKey) {
    try {
      const response = await fetchWithTimeout(`${coredLabBase}/server`, {
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          Accept: 'application/json',
        },
      }, 6500);
      if (!response.ok) return { ok: false, configured: true, state: null, status: response.status };
      const json = await response.json();
      const server = json?.server || {};
      return {
        ok: Boolean(json?.success),
        configured: true,
        state: server.status || null,
        memoryMb: null,
        serverId: server.serverIdentifier || null,
      };
    } catch (error) {
      return { ok: false, configured: true, state: null, error: error?.name || 'fetch_failed' };
    }
  }
  const serverId = await discoverHostingServerId(config);
  if (!config.apiBase || !config.apiKey || !serverId) {
    return { ok: false, configured: false, state: null, memoryMb: null };
  }
  try {
    const response = await fetchWithTimeout(`${config.apiBase}/api/client/servers/${serverId}/resources`, {
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        Accept: 'application/json',
      },
    }, 6500);
    if (!response.ok) return { ok: false, configured: true, state: null, status: response.status };
    const json = await response.json();
    const attrs = json?.attributes || {};
    return {
      ok: true,
      configured: true,
      state: attrs.current_state || null,
      memoryMb: attrs.resources?.memory_bytes ? Math.round(attrs.resources.memory_bytes / 1024 / 1024) : null,
    };
  } catch (error) {
    return { ok: false, configured: true, state: null, error: error?.name || 'fetch_failed' };
  }
}

async function sendHostingPowerSignal(botKey = 'natsumi', signal = 'restart') {
  const config = hostingConfig(botKey);
  const coredLabBase = coredLabExternalBase(config.apiBase);
  const safeSignal = ['start', 'stop', 'restart', 'kill'].includes(signal) ? signal : 'restart';
  if (coredLabBase && config.apiKey) {
    try {
      const response = await fetchWithTimeout(`${coredLabBase}/power`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ signal: safeSignal }),
      }, 6500);
      return { ok: response.ok || response.status === 204, configured: true, status: response.status, signal: safeSignal };
    } catch (error) {
      return { ok: false, configured: true, error: error?.name || 'fetch_failed', signal: safeSignal };
    }
  }
  const serverId = await discoverHostingServerId(config);
  if (!config.apiBase || !config.apiKey || !serverId) {
    return { ok: false, configured: false, error: 'hosting server id is not configured' };
  }
  try {
    const response = await fetchWithTimeout(`${config.apiBase}/api/client/servers/${serverId}/power`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ signal: safeSignal }),
    }, 6500);
    return { ok: response.ok || response.status === 204, configured: true, status: response.status, signal: safeSignal };
  } catch (error) {
    return { ok: false, configured: true, error: error?.name || 'fetch_failed', signal: safeSignal };
  }
}

function koreanBotsConfig(botKey = 'natsumi') {
  const key = normalizeBotKey(botKey);
  const botId = key === 'yuzuha'
    ? cleanEnv(process.env.YUZUHA_KOREANBOTS_BOT_ID) || KOREANBOTS_BOT_ID || YUZUHA_BOT_ID
    : cleanEnv(process.env.NATSUMI_KOREANBOTS_BOT_ID) || KOREANBOTS_BOT_ID || NATSUMI_BOT_ID;
  const token = key === 'yuzuha'
    ? cleanEnv(process.env.YUZUHA_KOREANBOTS_TOKEN) || KOREANBOTS_TOKEN
    : cleanEnv(process.env.NATSUMI_KOREANBOTS_TOKEN) || KOREANBOTS_TOKEN;
  const heartUrl = key === 'yuzuha'
    ? cleanEnv(process.env.YUZUHA_KOREANBOTS_BOT_PAGE_URL) || cleanEnv(process.env.KOREANBOTS_BOT_PAGE_URL) || cleanEnv(process.env.HANDIRI_HEART_URL) || cleanEnv(process.env.HEART_URL) || `https://koreanbots.dev/bots/${botId}`
    : cleanEnv(process.env.NATSUMI_KOREANBOTS_BOT_PAGE_URL) || cleanEnv(process.env.KOREANBOTS_BOT_PAGE_URL) || cleanEnv(process.env.HANDIRI_HEART_URL) || cleanEnv(process.env.HEART_URL) || `https://koreanbots.dev/bots/${botId}`;
  return { botId, token, heartUrl };
}
const DISCORD_ADMINISTRATOR = 0x8n;
const DISCORD_MANAGE_GUILD = 0x20n;
const DISCORD_VIEW_CHANNEL = 0x400n;
const DISCORD_SEND_MESSAGES = 0x800n;
const DISCORD_CONNECT = 0x100000n;
const DISCORD_SPEAK = 0x200000n;
const distDir = path.join(__dirname, 'dist');
mongoose.set('bufferCommands', false);
app.disable('x-powered-by');

const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 180);
const AUTH_RATE_LIMIT_MAX = Number(process.env.AUTH_RATE_LIMIT_MAX || 35);
const rateBuckets = new Map();

function clientIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req.socket.remoteAddress || 'unknown';
}

function rateLimit(maxRequests = RATE_LIMIT_MAX) {
  return (req, res, next) => {
    const now = Date.now();
    const key = `${clientIp(req)}:${req.path.startsWith('/auth') ? 'auth' : 'site'}`;
    const bucket = rateBuckets.get(key);
    if (!bucket || now - bucket.startedAt > RATE_LIMIT_WINDOW_MS) {
      rateBuckets.set(key, { startedAt: now, count: 1 });
      return next();
    }
    bucket.count += 1;
    if (bucket.count > maxRequests) {
      res.setHeader('Retry-After', String(Math.ceil((RATE_LIMIT_WINDOW_MS - (now - bucket.startedAt)) / 1000)));
      return res.status(429).json({ error: 'Too many requests. Please slow down.' });
    }
    return next();
  };
}

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of rateBuckets.entries()) {
    if (now - bucket.startedAt > RATE_LIMIT_WINDOW_MS * 2) rateBuckets.delete(key);
  }
}, RATE_LIMIT_WINDOW_MS).unref?.();

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  next();
});
app.use(rateLimit());
app.use('/auth', rateLimit(AUTH_RATE_LIMIT_MAX));
app.use('/api', rateLimit(Number(process.env.API_RATE_LIMIT_MAX || RATE_LIMIT_MAX)));

const DashboardSettings = mongoose.models.DashboardSettings || model('DashboardSettings', new Schema({
  guildId: { type: String, required: true, unique: true, index: true },
  bots: { type: Schema.Types.Mixed, default: {} },
  disabledCommands: { type: [String], default: [] },
  features: {
    welcome: { type: Boolean, default: false },
    notice: { type: Boolean, default: true },
    ticket: { type: Boolean, default: true },
    tts: { type: Boolean, default: false },
    ai: { type: Boolean, default: true },
    shop: { type: Boolean, default: true },
    emojiUpscale: { type: Boolean, default: false },
    level: { type: Boolean, default: false },
    moderation: { type: Boolean, default: false },
  },
  welcome: { type: Schema.Types.Mixed, default: {} },
  yuzuha: { type: Schema.Types.Mixed, default: {} },
  notice: { type: Schema.Types.Mixed, default: {} },
  tts: { type: Schema.Types.Mixed, default: {} },
  emojiUpscale: { type: Schema.Types.Mixed, default: {} },
  moderation: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true }));

function normalizeBotKey(value) {
  return value === 'yuzuha' ? 'yuzuha' : 'natsumi';
}

function requestedBotKey(req) {
  return normalizeBotKey(req.query?.bot || req.body?.bot || 'natsumi');
}

function baseSettingsFromDoc(doc) {
  return {
    disabledCommands: doc?.disabledCommands || [],
    features: doc?.features || {},
    welcome: doc?.welcome || {},
    yuzuha: doc?.yuzuha || {},
    notice: doc?.notice || {},
    tts: doc?.tts || {},
    emojiUpscale: doc?.emojiUpscale || {},
    moderation: doc?.moderation || {},
  };
}

function settingsForBot(doc, botKey) {
  const scoped = doc?.bots?.[botKey];
  if (scoped && typeof scoped === 'object') return scoped;
  if (botKey === 'natsumi') return baseSettingsFromDoc(doc);
  return {};
}

const DashboardNotice = mongoose.models.DashboardNotice || model('DashboardNotice', new Schema({
  guildId: String,
  channelId: String,
  message: String,
  authorId: String,
  authorName: String,
  sentMessageId: String,
  createdAt: { type: Date, default: Date.now },
}));

const DashboardQuestion = mongoose.models.DashboardQuestion || model('DashboardQuestion', new Schema({
  guildId: String,
  userId: String,
  username: String,
  question: String,
  answer: String,
  createdAt: { type: Date, default: Date.now },
  answeredAt: Date,
}));

const NatsumiAnonIdentity = mongoose.models.NatsumiAnonIdentity || model('NatsumiAnonIdentity', new Schema({
  guildId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  anonIp: { type: String, required: true, index: true },
  updatedAt: Date,
}, { timestamps: true }));

const DeveloperAnnouncement = mongoose.models.DeveloperAnnouncement || model('DeveloperAnnouncement', new Schema({
  authorId: String,
  authorName: String,
  title: String,
  subtitle: String,
  message: String,
  imageUrl: String,
  mentionMode: String,
  mentionTarget: String,
  channelId: String,
  status: { type: String, default: 'stored' },
  webhookId: String,
  discordMessageId: String,
  error: String,
  createdAt: { type: Date, default: Date.now },
}));

app.set('trust proxy', 1);
app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
  const allowed = (process.env.ALLOWED_ORIGINS || `${DASHBOARD_URL},${SITE_URL},${GAME_URL}`)
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
  const origin = req.headers.origin?.replace(/\/$/, '');
  if (origin && allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
  } else if (!origin && allowed[0]) {
    res.setHeader('Access-Control-Allow-Origin', allowed[0]);
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(session({
  secret: process.env.SESSION_SECRET || 'change-this-natsumi-dashboard-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 14,
    sameSite: 'lax',
    secure: 'auto',
  },
}));

function publicBaseUrl(req) {
  if (process.env.PUBLIC_BASE_URL) return normalizePublicServiceUrl(process.env.PUBLIC_BASE_URL, DASHBOARD_URL).replace(/\/$/, '');
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  return normalizePublicServiceUrl(`${proto}://${req.headers.host}`, DASHBOARD_URL).replace(/\/$/, '');
}

function requireLogin(req, res, next) {
  if (req.session?.discordUser?.id) return next();
  return res.status(401).json({
    ok: false,
    error: 'login_required',
    message: '디스코드 로그인이 필요합니다.',
    loginUrl: '/auth/discord/dashboard',
  });
}

function isOwner(req) {
  return Boolean(OWNER_USER_ID && req.session?.discordUser?.id === OWNER_USER_ID);
}

async function checkKoreanBotsVote(userId, botKey = 'natsumi') {
  const config = koreanBotsConfig(botKey);
  if (!userId || !config.botId) return false;
  const urls = [
    `https://koreanbots.dev/api/v2/bots/${config.botId}/vote?userID=${userId}`,
    `https://koreanbots.dev/api/v2/bots/${config.botId}/votes?userID=${userId}`,
  ];
  for (const url of urls) {
    for (const authorization of [config.token, config.token ? `Bearer ${config.token}` : ''].filter(Boolean)) {
      try {
        const res = await fetch(url, {
          headers: authorization ? { Authorization: authorization, 'User-Agent': 'NatsumiDashboard/1.0' } : {},
          signal: AbortSignal.timeout?.(5000),
        });
        if (!res.ok) continue;
        const data = await res.json();
        if (Boolean(data?.data?.voted || data?.voted || data?.vote || data?.result)) return true;
      } catch {}
    }
  }
  return false;
}

function requireOwner(req, res, next) {
  if (isOwner(req)) return next();
  return res.status(403).json({ error: 'Developer only.' });
}

function isGuildAdmin(row) {
  try {
    const permissions = BigInt(row.permissions || 0);
    return (permissions & DISCORD_ADMINISTRATOR) === DISCORD_ADMINISTRATOR
      || (permissions & DISCORD_MANAGE_GUILD) === DISCORD_MANAGE_GUILD;
  } catch {
    return false;
  }
}

async function fetchUserGuilds(req) {
  const token = req.session?.discordAccessToken;
  if (!token) return [];
  const res = await fetch('https://discord.com/api/v10/users/@me/guilds', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  return res.json();
}

async function userCanManageGuild(req, guildId) {
  if (isOwner(req)) return true;
  const guilds = await fetchUserGuilds(req);
  return guilds.some((guild) => guild.id === guildId && isGuildAdmin(guild));
}

async function requireGuildAdmin(req, res, next) {
  if (await userCanManageGuild(req, req.params.guildId)) return next();
  return res.status(403).json({ error: 'Only server administrators can change this setting.' });
}

async function fetchDiscordBot(pathname, botKey = 'natsumi') {
  const token = BOT_PROFILES[normalizeBotKey(botKey)]?.token;
  if (!token) return null;
  const res = await fetch(`https://discord.com/api/v10${pathname}`, {
    headers: { Authorization: `Bot ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

function computeBasePermissions(guild, member, roles) {
  let permissions = BigInt(guild.permissions || 0);
  const everyone = roles.find((role) => role.id === guild.id);
  if (everyone?.permissions) permissions |= BigInt(everyone.permissions);
  for (const roleId of member?.roles || []) {
    const role = roles.find((item) => item.id === roleId);
    if (role?.permissions) permissions |= BigInt(role.permissions);
  }
  if ((permissions & DISCORD_ADMINISTRATOR) === DISCORD_ADMINISTRATOR) return "ADMIN";
  return permissions;
}

function applyChannelOverwrites(basePermissions, channel, member, guildId) {
  if (basePermissions === "ADMIN") return basePermissions;
  let permissions = basePermissions;
  const overwrites = channel.permission_overwrites || [];
  const everyone = overwrites.find((item) => item.id === guildId);
  if (everyone) {
    permissions &= ~BigInt(everyone.deny || 0);
    permissions |= BigInt(everyone.allow || 0);
  }
  let roleAllow = 0n;
  let roleDeny = 0n;
  for (const overwrite of overwrites) {
    if (overwrite.type !== 0 || !member?.roles?.includes(overwrite.id)) continue;
    roleDeny |= BigInt(overwrite.deny || 0);
    roleAllow |= BigInt(overwrite.allow || 0);
  }
  permissions &= ~roleDeny;
  permissions |= roleAllow;
  const memberOverwrite = overwrites.find((item) => item.type === 1 && item.id === member?.user?.id);
  if (memberOverwrite) {
    permissions &= ~BigInt(memberOverwrite.deny || 0);
    permissions |= BigInt(memberOverwrite.allow || 0);
  }
  return permissions;
}

function canUseChannel(permissions, type) {
  if (permissions === "ADMIN") return true;
  if ((permissions & DISCORD_VIEW_CHANNEL) !== DISCORD_VIEW_CHANNEL) return false;
  if (type === 'text') return (permissions & DISCORD_SEND_MESSAGES) === DISCORD_SEND_MESSAGES;
  if (type === 'voice') return (permissions & DISCORD_CONNECT) === DISCORD_CONNECT && (permissions & DISCORD_SPEAK) === DISCORD_SPEAK;
  return true;
}

async function fetchBotGuildChannels(guild, userId, botKey = 'natsumi') {
  const guildId = guild.id;
  const token = BOT_PROFILES[normalizeBotKey(botKey)]?.token;
  if (!token) return null;
  const [channels, roles, member] = await Promise.all([
    fetchDiscordBot(`/guilds/${guildId}/channels`, botKey),
    fetchDiscordBot(`/guilds/${guildId}/roles`, botKey),
    fetchDiscordBot(`/guilds/${guildId}/members/${userId}`, botKey),
  ]);
  if (!Array.isArray(channels)) return [];
  const basePermissions = computeBasePermissions(guild, member, Array.isArray(roles) ? roles : []);
  return channels.map((channel) => ({
    id: channel.id,
    name: channel.name,
    parentId: channel.parent_id || null,
    type: channel.type === 0 ? 'text' : channel.type === 2 ? 'voice' : channel.type === 4 ? 'category' : 'other',
    manageable: canUseChannel(applyChannelOverwrites(basePermissions, channel, member, guildId), channel.type === 0 ? 'text' : channel.type === 2 ? 'voice' : 'category'),
  })).filter((channel) => channel.type !== 'other');
}

async function sendGuildNoticeMessage(channelId, message, botKey = 'natsumi') {
  const token = BOT_PROFILES[normalizeBotKey(botKey)]?.token;
  if (!token || !channelId || !message) return { ok: false, error: 'missing channel or token' };
  const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      embeds: [{
        title: 'NATSUMI 공지',
        description: message,
        color: 0xff6d92,
        timestamp: new Date().toISOString(),
      }],
    }),
  });
  if (!res.ok) return { ok: false, error: `Discord ${res.status}` };
  const data = await res.json();
  return { ok: true, messageId: data.id };
}

async function sendDeveloperAnnouncement(row) {
  if (!NATSUMI_BOT_TOKEN || !DEVELOPER_NOTICE_CHANNEL_ID) return { ok: false, error: 'missing Discord token or channel' };
  const headers = { Authorization: `Bot ${NATSUMI_BOT_TOKEN}`, 'Content-Type': 'application/json' };
  const payload = {
    username: 'NATSUMI 공지',
    avatar_url: `${DASHBOARD_URL}natsumi-profile-03.jpg`,
    embeds: [{
      title: `📢 ${row.title || '나츠미 지원서버 공지'}`,
      description: row.message,
      color: 0xff6d92,
      footer: { text: 'NATSUMI Developer Notice' },
      timestamp: new Date(row.createdAt || Date.now()).toISOString(),
    }],
  };
  const res = await fetch(`https://discord.com/api/v10/channels/${DEVELOPER_NOTICE_CHANNEL_ID}/messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ embeds: payload.embeds }),
  });
  if (!res.ok) return { ok: false, error: `Discord ${res.status}` };
  const message = await res.json();
  return { ok: true, discordMessageId: message.id };
}

function startDiscordAuth(req, res, returnTo, redirectUri) {
  if (!DISCORD_CLIENT_ID) return res.status(500).send('DISCORD_CLIENT_ID is required.');
  const state = Math.random().toString(36).slice(2);
  req.session.oauthState = state;
  req.session.oauthReturnTo = returnTo || DASHBOARD_URL;
  req.session.oauthRedirectUri = redirectUri;
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'identify guilds',
    state,
  });
  return res.redirect(`https://discord.com/api/oauth2/authorize?${params.toString()}`);
}

async function finishDiscordAuth(req, res, redirectUri) {
  const expectedRedirectUri = req.session.oauthRedirectUri || redirectUri;
  if (!req.query.code || req.query.state !== req.session.oauthState) return res.status(400).send('OAuth state mismatch.');
  const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: DISCORD_CLIENT_ID,
      client_secret: DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code: String(req.query.code),
      redirect_uri: expectedRedirectUri,
    }),
  });
  const token = await tokenRes.json();
  if (!token.access_token) return res.status(400).json(token);
  const userRes = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  const user = await userRes.json();
  req.session.discordAccessToken = token.access_token;
  req.session.discordUser = { id: user.id, username: user.username, globalName: user.global_name, avatar: user.avatar };
  const returnTo = req.session.oauthReturnTo || DASHBOARD_URL;
  delete req.session.oauthReturnTo;
  delete req.session.oauthRedirectUri;
  return res.redirect(returnTo);
}

app.get('/auth/discord', (req, res) => startDiscordAuth(req, res, `${publicBaseUrl(req)}/`, `${publicBaseUrl(req)}/auth/discord/callback`));
app.get('/auth/discord/callback', (req, res) => finishDiscordAuth(req, res, `${publicBaseUrl(req)}/auth/discord/callback`));
app.get('/auth/discord/dashboard', (req, res) => startDiscordAuth(req, res, `${publicBaseUrl(req)}/`, `${publicBaseUrl(req)}/auth/discord/dashboard/callback`));
app.get('/auth/discord/dashboard/callback', (req, res) => finishDiscordAuth(req, res, `${publicBaseUrl(req)}/auth/discord/dashboard/callback`));
app.post('/auth/logout', (req, res) => req.session.destroy(() => res.json({ ok: true })));
app.get('/api/auth/me', (req, res) => res.json({
  user: req.session?.discordUser || null,
  isOwner: isOwner(req),
  canUseDashboard: Boolean(req.session?.discordUser?.id),
}));
app.get('/api/heart-status', requireLogin, async (req, res) => {
  const botKey = requestedBotKey(req);
  const config = koreanBotsConfig(botKey);
  const verified = isOwner(req) || await checkKoreanBotsVote(req.session.discordUser.id, botKey);
  res.json({
    ok: true,
    verified,
    heartUrl: config.heartUrl,
    botKey,
    configured: Boolean(config.botId && config.token),
  });
});
app.get('/api/bot-status', async (req, res) => {
  const botKey = requestedBotKey(req);
  const profile = BOT_PROFILES[botKey];
  let bot = null;
  let botReady = false;
  if (profile?.token) {
    try {
      const botRes = await fetchWithTimeout('https://discord.com/api/v10/users/@me', {
        headers: { Authorization: `Bot ${profile.token}` },
      }, 4500);
      if (botRes.ok) {
        bot = await botRes.json();
        botReady = Boolean(bot?.id);
      }
    } catch {
      botReady = false;
    }
  }

  const [runtime, hosting] = await Promise.all([
    fetchRuntimeStatusCandidates(botKey),
    fetchHostingResources(botKey),
  ]);
  const status = runtime.status || {};
  const configuredGuildCount = Number(process.env.BOT_GUILD_COUNT || process.env.NATSUMI_GUILD_COUNT || 0);
  const liveGuildCount = Number(status.guilds || status.botServers || 0) || null;
  const guildCount = liveGuildCount || (Number.isFinite(configuredGuildCount) && configuredGuildCount > 0 ? configuredGuildCount : null);

  res.json({
    apiOk: true,
    botKey,
    botId: bot?.id || profile?.botId || null,
    botReady,
    botName: bot?.username || profile?.name || 'BOT',
    botApiOk: runtime.ok,
    botRuntimeStatus: status.status || null,
    botStatusSource: runtime.source || null,
    hostingConfigured: hosting.configured,
    hostingOk: hosting.ok,
    hostingState: hosting.state,
    hostingMemoryMb: hosting.memoryMb,
    panelStatus: hosting.ok ? 'ok' : (hosting.configured ? 'retry_later' : 'not_configured'),
    guildCount,
    checkedAt: new Date().toISOString(),
  });
});

app.post('/api/bot-power', requireLogin, async (req, res) => {
  if (!isOwner(req)) return res.status(403).json({ error: 'Only the developer can control bot power.' });
  const botKey = requestedBotKey(req);
  const signal = String(req.body?.signal || 'restart').toLowerCase();
  const result = await sendHostingPowerSignal(botKey, signal);
  if (!result.configured) return res.status(400).json({ ok: false, error: 'Hosting API is configured, but server id is missing.' });
  res.status(result.ok ? 200 : 502).json({ ...result, botKey });
});
app.get('/api/dashboard/session', (req, res) => res.json({
  user: req.session?.discordUser || null,
  isOwner: isOwner(req),
  canUseDashboard: Boolean(req.session?.discordUser?.id),
}));
app.get('/api/dashboard/bots', (_req, res) => {
  res.json({
    bots: Object.values(BOT_PROFILES).map((bot) => ({
      key: bot.key,
      name: bot.name,
      botId: bot.botId,
      enabled: Boolean(bot.botId),
      configured: Boolean(bot.token),
    })),
  });
});
app.get('/api/developer-announcements', async (_req, res) => {
  const rows = await DeveloperAnnouncement.find().sort({ createdAt: -1 }).limit(10).lean();
  res.json({ announcements: rows.map((row) => ({
    id: row._id,
    title: row.title,
    subtitle: row.subtitle,
    message: row.message,
    imageUrl: row.imageUrl,
    status: row.status,
    createdAt: row.createdAt,
  })) });
});
app.post('/api/developer-announcements', requireLogin, requireOwner, async (req, res) => {
  return res.status(410).json({ error: 'Developer notices are posted from the Discord bot only.' });
  const title = String(req.body?.title || '나츠미 지원서버 공지').trim().slice(0, 120);
  const message = String(req.body?.message || '').trim().slice(0, 1800);
  if (!message) return res.status(400).json({ error: '공지 내용이 비어 있어.' });
  const row = await DeveloperAnnouncement.create({
    authorId: req.session.discordUser.id,
    authorName: req.session.discordUser.globalName || req.session.discordUser.username,
    title,
    message,
    channelId: DEVELOPER_NOTICE_CHANNEL_ID,
    status: 'stored',
  });
  const sent = await sendDeveloperAnnouncement(row);
  row.status = sent.ok ? 'sent' : 'stored';
  row.discordMessageId = sent.discordMessageId;
  row.error = sent.error;
  await row.save();
  res.json({ ok: true, announcement: row, sent: sent.ok, error: sent.ok ? undefined : sent.error });
});

app.get('/api/dashboard/guilds', requireLogin, async (req, res) => {
  const botKey = requestedBotKey(req);
  const botProfile = BOT_PROFILES[botKey];
  const botConfigured = Boolean(botProfile?.token);
  const manageable = (await fetchUserGuilds(req)).filter(isGuildAdmin);
  const guilds = await Promise.all(manageable.map(async (guild) => {
    const channels = await fetchBotGuildChannels(guild, req.session.discordUser.id, botKey);
    return {
      id: guild.id,
      name: guild.name,
      icon: guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128` : '',
      manageable: true,
      botPresent: channels === null ? null : channels.length > 0,
      botConfigured,
      channels: channels || [],
    };
  }));
  res.json({ guilds, bot: { key: botKey, botId: botProfile?.botId || null, name: botProfile?.name || 'Bot', configured: botConfigured } });
});

app.get('/api/dashboard/guilds/:guildId/settings', requireLogin, requireGuildAdmin, async (req, res) => {
  const botKey = requestedBotKey(req);
  const settings = await DashboardSettings.findOneAndUpdate(
    { guildId: req.params.guildId },
    { $setOnInsert: { guildId: req.params.guildId } },
    { upsert: true, new: true }
  ).lean();
  res.json({ botKey, settings: settingsForBot(settings, botKey) });
});

app.patch('/api/dashboard/guilds/:guildId/settings', requireLogin, requireGuildAdmin, async (req, res) => {
  const botKey = requestedBotKey(req);
  const next = req.body?.settings || {};
  const update = { [`bots.${botKey}`]: next, guildId: req.params.guildId };
  if (botKey === 'natsumi') {
    update.disabledCommands = next.disabledCommands || [];
    update.features = next.features || {};
    update.welcome = next.welcome || {};
    update.yuzuha = next.yuzuha || {};
    update.notice = next.notice || {};
    update.tts = next.tts || {};
    update.emojiUpscale = next.emojiUpscale || {};
    update.moderation = next.moderation || {};
  }
  await DashboardSettings.findOneAndUpdate(
    { guildId: req.params.guildId },
    { $set: update },
    { upsert: true, new: true }
  ).lean();
  res.json({ ok: true, botKey, settings: next });
});

app.post('/api/dashboard/guilds/:guildId/notice', requireLogin, requireGuildAdmin, async (req, res) => {
  const botKey = requestedBotKey(req);
  const message = String(req.body?.notice?.message || '').trim().slice(0, 1800);
  const channelId = String(req.body?.notice?.channelId || '').trim();
  if (!message) return res.status(400).json({ error: '공지 내용이 비어 있어.' });
  if (!channelId) return res.status(400).json({ error: '공지 채널을 선택해줘.' });
  const row = await DashboardNotice.create({
    guildId: req.params.guildId,
    channelId,
    message,
    authorId: req.session.discordUser.id,
    authorName: req.session.discordUser.globalName || req.session.discordUser.username,
  });
  const sent = await sendGuildNoticeMessage(channelId, message, botKey);
  if (sent.ok) await DashboardNotice.updateOne({ _id: row._id }, { $set: { sentMessageId: sent.messageId } });
  res.json({ ok: sent.ok, notice: row, messageId: sent.messageId, error: sent.error });
});

app.get('/api/dashboard/guilds/:guildId/anonymous/lookup', requireLogin, requireGuildAdmin, async (req, res) => {
  const anonIp = String(req.query?.ip || '').trim();
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(anonIp)) return res.status(400).json({ error: '유동 IP 형식으로 입력해줘. 예: 123.45.67.89' });
  const row = await NatsumiAnonIdentity.findOne({ guildId: req.params.guildId, anonIp }).lean();
  if (!row) return res.status(404).json({ error: '해당 유동 IP 기록을 찾지 못했어.' });
  const member = await fetchDiscordBot(`/guilds/${req.params.guildId}/members/${row.userId}`, requestedBotKey(req)).catch(() => null);
  res.json({
    anonIp,
    userId: row.userId,
    username: member?.user?.global_name || member?.user?.username || null,
    avatar: member?.user?.avatar
      ? `https://cdn.discordapp.com/avatars/${row.userId}/${member.user.avatar}.png?size=128`
      : '',
    updatedAt: row.updatedAt || row.updatedAt,
  });
});

app.get('/api/dashboard/guilds/:guildId/questions', requireLogin, requireGuildAdmin, async (req, res) => {
  const rows = await DashboardQuestion.find({ guildId: req.params.guildId }).sort({ createdAt: -1 }).limit(50).lean();
  res.json({ questions: rows });
});

app.post('/api/dashboard/guilds/:guildId/questions', requireLogin, requireGuildAdmin, async (req, res) => {
  const question = String(req.body?.question || '').trim().slice(0, 1000);
  if (!question) return res.status(400).json({ error: '질문 내용이 비어 있어.' });
  const row = await DashboardQuestion.create({
    guildId: req.params.guildId,
    userId: req.session.discordUser.id,
    username: req.session.discordUser.globalName || req.session.discordUser.username,
    question,
  });
  res.json({ ok: true, question: row });
});

app.post('/api/dashboard/guilds/:guildId/questions/:id/answer', requireLogin, requireGuildAdmin, async (req, res) => {
  const answer = String(req.body?.answer || '').trim().slice(0, 1800);
  if (!answer) return res.status(400).json({ error: '답변 내용이 비어 있어.' });
  const row = await DashboardQuestion.findOneAndUpdate(
    { _id: req.params.id, guildId: req.params.guildId },
    { $set: { answer, answeredAt: new Date() } },
    { new: true }
  ).lean();
  res.json({ ok: true, question: row });
});

app.use(express.static(distDir, {
  maxAge: '1h',
  etag: true,
}));

app.get('*', (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

const mongoUri = process.env.MONGO_URI || process.env.MONGOOSE || process.env.MONGODB_URI || '';

async function startServer() {
  if (mongoUri) {
    try {
      await mongoose.connect(mongoUri);
      console.log('MongoDB connected for Natsumi dashboard.');
    } catch (error) {
      console.warn(`MongoDB connection failed; dashboard will still serve login UI: ${error.message}`);
    }
  } else {
    console.warn('MONGO_URI is missing; dashboard settings persistence is disabled until it is configured.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Natsumi dashboard listening on ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Dashboard startup failed:', error);
  process.exit(1);
});
