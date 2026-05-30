import 'dotenv/config';
import express from 'express';

const cleanEnv = (value) => String(value || '').replace(/["']/g, '').trim();
const NATSUMI_BOT_ID = cleanEnv(process.env.NATSUMI_KOREANBOTS_BOT_ID) || cleanEnv(process.env.KOREANBOTS_BOT_ID) || cleanEnv(process.env.NATSUMI_BOT_ID) || cleanEnv(process.env.NATSUMI_CLIENT_ID) || '905355491708903485';
const YUZUHA_BOT_ID = cleanEnv(process.env.YUZUHA_KOREANBOTS_BOT_ID) || cleanEnv(process.env.KOREANBOTS_BOT_ID) || cleanEnv(process.env.YUZUHA_BOT_ID) || cleanEnv(process.env.YUZUHA_CLIENT_ID) || '1508101246723035196';

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

const originalGet = express.application.get;

express.application.get = function patchedGet(path, ...handlers) {
  if (path !== '/api/heart-status') return originalGet.call(this, path, ...handlers);

  return originalGet.call(this, path, async (req, res) => {
    if (!req.session?.discordUser?.id) {
      return res.status(401).json({ error: 'Discord login required.' });
    }

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
      debug: {
        dashboardOpen: true,
        reason: 'Heart validation is handled before dashboard entry by web shop or dashboard command.',
      },
    });
  });
};