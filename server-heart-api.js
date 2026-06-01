import 'dotenv/config';
import express from 'express';
import mongoose, { Schema, model } from 'mongoose';

const cleanEnv = (value) => String(value || '').replace(/["']/g, '').trim();
const NATSUMI_BOT_ID = cleanEnv(process.env.NATSUMI_KOREANBOTS_BOT_ID) || cleanEnv(process.env.KOREANBOTS_BOT_ID) || cleanEnv(process.env.NATSUMI_BOT_ID) || cleanEnv(process.env.NATSUMI_CLIENT_ID) || '905355491708903485';
const YUZUHA_BOT_ID = cleanEnv(process.env.YUZUHA_KOREANBOTS_BOT_ID) || cleanEnv(process.env.KOREANBOTS_BOT_ID) || cleanEnv(process.env.YUZUHA_BOT_ID) || cleanEnv(process.env.YUZUHA_CLIENT_ID) || '1508101246723035196';
const OWNER_USER_ID = cleanEnv(process.env.OWNER_USER_ID) || cleanEnv(process.env.NATSUMI_OWNER_ID) || '1293232804745838733';
const DISCORD_ADMINISTRATOR = 0x8n;
const DISCORD_MANAGE_GUILD = 0x20n;

const DashboardSettings = mongoose.models.DashboardSettings || model('DashboardSettings', new Schema({
  guildId: { type: String, required: true, unique: true, index: true },
  bots: { type: Schema.Types.Mixed, default: {} },
  disabledCommands: { type: [String], default: [] },
  features: { type: Schema.Types.Mixed, default: {} },
  welcome: { type: Schema.Types.Mixed, default: {} },
  yuzuha: { type: Schema.Types.Mixed, default: {} },
  notice: { type: Schema.Types.Mixed, default: {} },
  tts: { type: Schema.Types.Mixed, default: {} },
  emojiUpscale: { type: Schema.Types.Mixed, default: {} },
  moderation: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true }));

const EmojiUpscaleChannelSetting = mongoose.models.EmojiUpscaleChannelSetting || model('EmojiUpscaleChannelSetting', new Schema({
  guildId: { type: String, required: true, index: true },
  channelId: { type: String, required: true, index: true },
  enabled: { type: Boolean, default: true },
  webhookName: { type: String, default: 'Natsumi Emoji Upscaler' },
  updatedBy: { type: String, default: 'dashboard' },
}, { timestamps: true }).index({ guildId: 1, channelId: 1 }, { unique: true }));

function normalizeBotKey(value) {
  return value === 'yuzuha' ? 'yuzuha' : 'natsumi';
}

function configFor(botKey) {
  const key = normalizeBotKey(botKey);
  const botId = key === 'yuzuha' ? YUZUHA_BOT_ID : NATSUMI_BOT_ID;
  const heartUrl = key === 'yuzuha'
    ? cleanEnv(process.env.YUZUHA_KOREANBOTS_BOT_PAGE_URL) || cleanEnv(process.env.KOREANBOTS_BOT_PAGE_URL) || `https://koreanbots.dev/bots/${botId}`
    : cleanEnv(process.env.NATSUMI_KOREANBOTS_BOT_PAGE_URL) || cleanEnv(process.env.KOREANBOTS_BOT_PAGE_URL) || `https://koreanbots.dev/bots/${botId}`;
  return { key, botId, heartUrl };
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

async function canManageGuild(req, guildId) {
  if (isOwner(req)) return true;
  const guilds = await fetchUserGuilds(req);
  return guilds.some((guild) => guild.id === guildId && isGuildAdmin(guild));
}

async function requireGuildAdminLocal(req, res, next) {
  if (!req.session?.discordUser?.id) return res.status(401).json({ error: 'Discord login required.' });
  if (await canManageGuild(req, req.params.guildId)) return next();
  return res.status(403).json({ error: 'Only server administrators can change this setting.' });
}

const originalGet = express.application.get;
const originalPatch = express.application.patch;

express.application.get = function patchedGet(path, ...handlers) {
  if (path === '/api/heart-status') {
    return originalGet.call(this, path, async (req, res) => {
      if (!req.session?.discordUser?.id) return res.status(401).json({ error: 'Discord login required.' });
      const botKey = normalizeBotKey(req.query?.bot || req.body?.bot || 'natsumi');
      const config = configFor(botKey);
      res.setHeader('Cache-Control', 'no-store');
      return res.json({
        verified: true,
        heartUrl: config.heartUrl,
        botKey,
        botId: config.botId,
        source: 'external_gate_open_dashboard',
        expiresAt: null,
        debug: { dashboardOpen: true, reason: 'Heart validation is handled before dashboard entry by web shop or dashboard command.' },
      });
    });
  }

  if (path === '/api/dashboard/guilds/:guildId/emoji-upscale/channels') {
    return originalGet.call(this, path, requireGuildAdminLocal, async (req, res) => {
      const guildId = req.params.guildId;
      const rows = await EmojiUpscaleChannelSetting.find({ guildId }).lean().catch(() => []);
      const settings = await DashboardSettings.findOne({ guildId }).lean().catch(() => null);
      const botKey = normalizeBotKey(req.query?.bot || req.body?.bot || 'natsumi');
      const scoped = settings?.bots?.[botKey];
      const base = botKey === 'natsumi' ? settings : scoped;
      const globalEnabled = Boolean(base?.features?.emojiUpscale || base?.emojiUpscale?.enabled || settings?.features?.emojiUpscale || settings?.emojiUpscale?.enabled);
      res.setHeader('Cache-Control', 'no-store');
      return res.json({
        ok: true,
        guildId,
        globalEnabled,
        webhookName: base?.emojiUpscale?.webhookName || settings?.emojiUpscale?.webhookName || 'Natsumi Emoji Upscaler',
        channels: rows.map((row) => ({
          channelId: row.channelId,
          enabled: row.enabled !== false,
          webhookName: row.webhookName || 'Natsumi Emoji Upscaler',
          updatedBy: row.updatedBy || 'dashboard',
          updatedAt: row.updatedAt,
        })),
      });
    });
  }

  return originalGet.call(this, path, ...handlers);
};

express.application.patch = function patchedPatch(path, ...handlers) {
  if (path === '/api/dashboard/guilds/:guildId/emoji-upscale/channels') {
    return originalPatch.call(this, path, requireGuildAdminLocal, async (req, res) => {
      const guildId = req.params.guildId;
      const botKey = normalizeBotKey(req.query?.bot || req.body?.bot || 'natsumi');
      const channels = Array.isArray(req.body?.channels) ? req.body.channels : [];
      const globalEnabled = req.body?.globalEnabled === undefined ? undefined : req.body.globalEnabled === true;
      const webhookName = String(req.body?.webhookName || 'Natsumi Emoji Upscaler').trim().slice(0, 80) || 'Natsumi Emoji Upscaler';
      const safeRows = channels
        .map((row) => ({
          channelId: String(row.channelId || '').trim(),
          enabled: row.enabled !== false,
          webhookName: String(row.webhookName || webhookName).trim().slice(0, 80) || webhookName,
        }))
        .filter((row) => /^\d{15,25}$/.test(row.channelId));

      await Promise.all(safeRows.map((row) => EmojiUpscaleChannelSetting.findOneAndUpdate(
        { guildId, channelId: row.channelId },
        { guildId, channelId: row.channelId, enabled: row.enabled, webhookName: row.webhookName, updatedBy: req.session.discordUser.id },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )));

      if (req.body?.replace === true) {
        await EmojiUpscaleChannelSetting.deleteMany({ guildId, channelId: { $nin: safeRows.map((row) => row.channelId) } }).catch(() => {});
      }

      if (globalEnabled !== undefined) {
        const set = {
          'features.emojiUpscale': globalEnabled,
          'emojiUpscale.enabled': globalEnabled,
          'emojiUpscale.webhookName': webhookName,
          [`bots.${botKey}.features.emojiUpscale`]: globalEnabled,
          [`bots.${botKey}.emojiUpscale.enabled`]: globalEnabled,
          [`bots.${botKey}.emojiUpscale.webhookName`]: webhookName,
        };
        await DashboardSettings.findOneAndUpdate({ guildId }, { $set: { guildId, ...set } }, { upsert: true, new: true }).catch(() => null);
      }

      const [rows, settings] = await Promise.all([
        EmojiUpscaleChannelSetting.find({ guildId }).lean().catch(() => []),
        DashboardSettings.findOne({ guildId }).lean().catch(() => null),
      ]);
      const base = botKey === 'natsumi' ? settings : settings?.bots?.[botKey];
      return res.json({
        ok: true,
        guildId,
        globalEnabled: Boolean(base?.features?.emojiUpscale || base?.emojiUpscale?.enabled || settings?.features?.emojiUpscale || settings?.emojiUpscale?.enabled),
        channels: rows,
      });
    });
  }

  return originalPatch.call(this, path, ...handlers);
};
