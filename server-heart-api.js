import 'dotenv/config';
import express from 'express';
import mongoose, { Schema, model } from 'mongoose';

const cleanEnv = (value) => String(value || '').replace(/["']/g, '').trim();
const OWNER_USER_ID = cleanEnv(process.env.OWNER_USER_ID || process.env.NATSUMI_OWNER_ID || '1293232804745838733');
const NATSUMI_BOT_ID = cleanEnv(process.env.NATSUMI_KOREANBOTS_BOT_ID) || cleanEnv(process.env.KOREANBOTS_BOT_ID) || cleanEnv(process.env.NATSUMI_BOT_ID) || cleanEnv(process.env.NATSUMI_CLIENT_ID) || '905355491708903485';
const YUZUHA_BOT_ID = cleanEnv(process.env.YUZUHA_KOREANBOTS_BOT_ID) || cleanEnv(process.env.KOREANBOTS_BOT_ID) || cleanEnv(process.env.YUZUHA_BOT_ID) || cleanEnv(process.env.YUZUHA_CLIENT_ID) || '1508101246723035196';

const PremiumHeartPass = mongoose.models.PremiumHeartPass || model('PremiumHeartPass', new Schema({
  userId: { type: String, required: true, index: true },
  botKey: { type: String, default: 'natsumi', index: true },
  lastVerifiedAt: Date,
  expiresAt: { type: Date, required: true, index: true },
  source: { type: String, default: 'koreanbots' },
}, { timestamps: true }));

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

async function findStoredHeartPass(userId, botKey) {
  const key = normalizeBotKey(botKey);
  const now = new Date();

  const pass = await PremiumHeartPass.findOne({
    userId,
    expiresAt: { $gt: now },
    $or: [
      { botKey: key },
      { botKey: { $exists: false } },
      { botKey: null },
    ],
  }).lean();

  if (pass) return pass;

  // Old bot versions saved only one global pass per user.
  return PremiumHeartPass.findOne({
    userId,
    expiresAt: { $gt: now },
  }).lean();
}

const originalGet = express.application.get;
express.application.get = function patchedGet(path, ...handlers) {
  if (path !== '/api/heart-status') return originalGet.call(this, path, ...handlers);

  return originalGet.call(this, path, async (req, res) => {
    if (!req.session?.discordUser?.id) return res.status(401).json({ error: 'Discord login required.' });

    const botKey = normalizeBotKey(req.query?.bot || req.body?.bot || 'natsumi');
    const config = configFor(botKey);
    const userId = req.session.discordUser.id;
    const ownerBypass = Boolean(OWNER_USER_ID && userId === OWNER_USER_ID);
    const pass = ownerBypass ? null : await findStoredHeartPass(userId, botKey);
    const verified = ownerBypass || Boolean(pass);

    res.setHeader('Cache-Control', 'no-store');
    return res.json({
      verified,
      heartUrl: config.heartUrl,
      botKey,
      botId: config.botId,
      source: ownerBypass ? 'owner_bypass' : (pass ? 'discord_bot_pass' : 'none'),
      expiresAt: pass?.expiresAt || null,
      debug: {
        ownerBypass,
        userId,
        passFound: Boolean(pass),
        passBotKey: pass?.botKey || null,
        passSource: pass?.source || null,
      },
    });
  });
};
