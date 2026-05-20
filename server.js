import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import mongoose, { Schema, model } from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

const PORT = Number(process.env.SERVER_PORT || process.env.PORT || 3000);
const DASHBOARD_URL = (process.env.DASHBOARD_URL || 'https://natsumidashboard.kro.kr/').replace(/\/$/, '') + '/';
const SITE_URL = (process.env.SITE_URL || 'https://natsumi-site.kro.kr/').replace(/\/$/, '') + '/';
const GAME_URL = (process.env.GAME_URL || 'https://natsumi-game.kro.kr/').replace(/\/$/, '') + '/';
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || '';
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || '';
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || process.env.TOKEN || '';
const OWNER_USER_ID = process.env.OWNER_USER_ID || process.env.NATSUMI_OWNER_ID || '1293232804745838733';
const DEVELOPER_NOTICE_CHANNEL_ID = process.env.DEVELOPER_NOTICE_CHANNEL_ID || '1371675674393448528';
const DISCORD_ADMINISTRATOR = 0x8n;
const DISCORD_MANAGE_GUILD = 0x20n;
const distDir = path.join(__dirname, 'dist');

const DashboardSettings = model('DashboardSettings', new Schema({
  guildId: { type: String, required: true, unique: true, index: true },
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
  },
  welcome: { type: Schema.Types.Mixed, default: {} },
  notice: { type: Schema.Types.Mixed, default: {} },
  tts: { type: Schema.Types.Mixed, default: {} },
  emojiUpscale: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true }));

const DashboardNotice = model('DashboardNotice', new Schema({
  guildId: String,
  channelId: String,
  message: String,
  authorId: String,
  authorName: String,
  sentMessageId: String,
  createdAt: { type: Date, default: Date.now },
}));

const DashboardQuestion = model('DashboardQuestion', new Schema({
  guildId: String,
  userId: String,
  username: String,
  question: String,
  answer: String,
  createdAt: { type: Date, default: Date.now },
  answeredAt: Date,
}));

const DeveloperAnnouncement = model('DeveloperAnnouncement', new Schema({
  authorId: String,
  authorName: String,
  title: String,
  message: String,
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
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, '');
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  return `${proto}://${req.headers.host}`.replace(/\/$/, '');
}

function requireLogin(req, res, next) {
  if (req.session?.discordUser?.id) return next();
  return res.status(401).json({ error: 'Discord login required.' });
}

function isOwner(req) {
  return Boolean(OWNER_USER_ID && req.session?.discordUser?.id === OWNER_USER_ID);
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

async function fetchBotGuildChannels(guildId) {
  if (!DISCORD_BOT_TOKEN) return [];
  const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
    headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` },
  });
  if (!res.ok) return [];
  const channels = await res.json();
  return channels.map((channel) => ({
    id: channel.id,
    name: channel.name,
    parentId: channel.parent_id || null,
    type: channel.type === 0 ? 'text' : channel.type === 2 ? 'voice' : channel.type === 4 ? 'category' : 'other',
  })).filter((channel) => channel.type !== 'other');
}

async function sendGuildNoticeMessage(channelId, message) {
  if (!DISCORD_BOT_TOKEN || !channelId || !message) return { ok: false, error: 'missing channel or token' };
  const res = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}`, 'Content-Type': 'application/json' },
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
  if (!DISCORD_BOT_TOKEN || !DEVELOPER_NOTICE_CHANNEL_ID) return { ok: false, error: 'missing Discord token or channel' };
  const headers = { Authorization: `Bot ${DISCORD_BOT_TOKEN}`, 'Content-Type': 'application/json' };
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

app.get('/auth/discord', (req, res) => startDiscordAuth(req, res, DASHBOARD_URL, `${publicBaseUrl(req)}/auth/discord/callback`));
app.get('/auth/discord/callback', (req, res) => finishDiscordAuth(req, res, `${publicBaseUrl(req)}/auth/discord/callback`));
app.get('/auth/discord/dashboard', (req, res) => startDiscordAuth(req, res, DASHBOARD_URL, `${publicBaseUrl(req)}/auth/discord/dashboard/callback`));
app.get('/auth/discord/dashboard/callback', (req, res) => finishDiscordAuth(req, res, `${publicBaseUrl(req)}/auth/discord/dashboard/callback`));
app.post('/auth/logout', (req, res) => req.session.destroy(() => res.json({ ok: true })));

app.get('/api/dashboard/session', (req, res) => res.json({ user: req.session?.discordUser || null, isOwner: isOwner(req) }));
app.get('/api/developer-announcements', async (_req, res) => {
  const rows = await DeveloperAnnouncement.find().sort({ createdAt: -1 }).limit(10).lean();
  res.json({ announcements: rows.map((row) => ({
    id: row._id,
    title: row.title,
    message: row.message,
    status: row.status,
    createdAt: row.createdAt,
  })) });
});
app.post('/api/developer-announcements', requireLogin, async (req, res) => {
  if (!isOwner(req)) return res.status(403).json({ error: 'Only the developer can post announcements.' });
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
  const manageable = (await fetchUserGuilds(req)).filter(isGuildAdmin);
  const guilds = await Promise.all(manageable.map(async (guild) => ({
    id: guild.id,
    name: guild.name,
    icon: guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128` : '',
    manageable: true,
    channels: await fetchBotGuildChannels(guild.id),
  })));
  res.json({ guilds });
});

app.get('/api/dashboard/guilds/:guildId/settings', requireLogin, requireGuildAdmin, async (req, res) => {
  const settings = await DashboardSettings.findOneAndUpdate(
    { guildId: req.params.guildId },
    { $setOnInsert: { guildId: req.params.guildId } },
    { upsert: true, new: true }
  ).lean();
  res.json({ settings });
});

app.patch('/api/dashboard/guilds/:guildId/settings', requireLogin, requireGuildAdmin, async (req, res) => {
  const next = req.body?.settings || {};
  const settings = await DashboardSettings.findOneAndUpdate(
    { guildId: req.params.guildId },
    { $set: { ...next, guildId: req.params.guildId } },
    { upsert: true, new: true }
  ).lean();
  res.json({ ok: true, settings });
});

app.post('/api/dashboard/guilds/:guildId/notice', requireLogin, requireGuildAdmin, async (req, res) => {
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
  const sent = await sendGuildNoticeMessage(channelId, message);
  if (sent.ok) await DashboardNotice.updateOne({ _id: row._id }, { $set: { sentMessageId: sent.messageId } });
  res.json({ ok: sent.ok, notice: row, messageId: sent.messageId, error: sent.error });
});

app.get('/api/dashboard/guilds/:guildId/questions', requireLogin, requireGuildAdmin, async (req, res) => {
  const rows = await DashboardQuestion.find({ guildId: req.params.guildId }).sort({ createdAt: -1 }).limit(50).lean();
  res.json({ questions: rows });
});

app.post('/api/dashboard/guilds/:guildId/questions', requireLogin, async (req, res) => {
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

app.post('/api/dashboard/guilds/:guildId/questions/:id/answer', requireLogin, async (req, res) => {
  if (!isOwner(req)) return res.status(403).json({ error: '개발자만 답변할 수 있어.' });
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

mongoose.connect(process.env.MONGO_URI || process.env.MONGOOSE || '').then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Natsumi dashboard listening on ${PORT}`);
  });
}).catch((error) => {
  console.error('MongoDB connection failed:', error.message);
  process.exit(1);
});
