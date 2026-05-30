import 'dotenv/config';
import express from 'express';

const cleanEnv = (value) => String(value || '').replace(/["']/g, '').trim();
const OWNER_USER_ID = cleanEnv(process.env.OWNER_USER_ID || process.env.NATSUMI_OWNER_ID || '1293232804745838733');
const NATSUMI_BOT_ID = cleanEnv(process.env.NATSUMI_KOREANBOTS_BOT_ID) || cleanEnv(process.env.KOREANBOTS_BOT_ID) || cleanEnv(process.env.NATSUMI_BOT_ID) || cleanEnv(process.env.NATSUMI_CLIENT_ID) || '905355491708903485';
const YUZUHA_BOT_ID = cleanEnv(process.env.YUZUHA_KOREANBOTS_BOT_ID) || cleanEnv(process.env.KOREANBOTS_BOT_ID) || cleanEnv(process.env.YUZUHA_BOT_ID) || cleanEnv(process.env.YUZUHA_CLIENT_ID) || '1508101246723035196';
const NATSUMI_TOKEN = cleanEnv(process.env.NATSUMI_KOREANBOTS_TOKEN) || cleanEnv(process.env.KOREANBOTS_TOKEN);
const YUZUHA_TOKEN = cleanEnv(process.env.YUZUHA_KOREANBOTS_TOKEN) || cleanEnv(process.env.KOREANBOTS_TOKEN);

function normalizeBotKey(value) {
  return value === 'yuzuha' ? 'yuzuha' : 'natsumi';
}

function configFor(botKey) {
  const key = normalizeBotKey(botKey);
  const botId = key === 'yuzuha' ? YUZUHA_BOT_ID : NATSUMI_BOT_ID;
  const token = key === 'yuzuha' ? YUZUHA_TOKEN : NATSUMI_TOKEN;
  const heartUrl = key === 'yuzuha'
    ? cleanEnv(process.env.YUZUHA_KOREANBOTS_BOT_PAGE_URL) || cleanEnv(process.env.KOREANBOTS_BOT_PAGE_URL) || `https://koreanbots.dev/bots/${botId}`
    : cleanEnv(process.env.NATSUMI_KOREANBOTS_BOT_PAGE_URL) || cleanEnv(process.env.KOREANBOTS_BOT_PAGE_URL) || `https://koreanbots.dev/bots/${botId}`;
  return { key, botId, token, heartUrl };
}

function parseVoted(payload) {
  const data = payload?.data && typeof payload.data === 'object' ? payload.data : payload;
  const values = [
    data?.voted,
    data?.vote,
    data?.result,
    data?.isVoted,
    data?.hasVoted,
    payload?.voted,
    payload?.result,
  ];
  return values.some((value) => value === true || value === 1 || String(value).toLowerCase() === 'true' || String(value) === '1');
}

async function requestVote({ botId, token, userId, bearer = false }) {
  const url = `https://koreanbots.dev/api/v2/bots/${encodeURIComponent(botId)}/vote?userID=${encodeURIComponent(userId)}`;
  const response = await fetch(url, {
    headers: {
      Authorization: bearer ? `Bearer ${token}` : token,
      'User-Agent': 'NatsumiDashboard/HeartCheck',
    },
    signal: AbortSignal.timeout?.(5000),
  });
  const text = await response.text().catch(() => '');
  let json = {};
  try { json = text ? JSON.parse(text) : {}; } catch {}
  return { response, text, json };
}

async function checkVote(userId, botKey) {
  const config = configFor(botKey);
  const debug = {
    botKey: config.key,
    botId: config.botId,
    tokenConfigured: Boolean(config.token),
    status: null,
    reason: null,
    bodyPreview: null,
  };

  if (!userId) return { ok: false, debug: { ...debug, reason: 'missing_user_id' }, config };
  if (!config.botId) return { ok: false, debug: { ...debug, reason: 'missing_bot_id' }, config };
  if (!config.token) return { ok: false, debug: { ...debug, reason: 'missing_token' }, config };

  try {
    let result = await requestVote({ botId: config.botId, token: config.token, userId, bearer: false });
    if (result.response.status === 401 || result.response.status === 403) {
      result = await requestVote({ botId: config.botId, token: config.token, userId, bearer: true });
      debug.reason = 'retried_with_bearer';
    }

    debug.status = result.response.status;
    debug.bodyPreview = result.text.slice(0, 300);

    if (!result.response.ok) {
      return { ok: false, debug: { ...debug, reason: debug.reason || `http_${result.response.status}` }, config };
    }

    const voted = parseVoted(result.json);
    return { ok: voted, debug: { ...debug, reason: voted ? 'voted' : 'not_voted' }, config };
  } catch (error) {
    return { ok: false, debug: { ...debug, reason: error?.name === 'AbortError' ? 'timeout' : String(error?.message || error) }, config };
  }
}

const originalGet = express.application.get;
express.application.get = function patchedGet(path, ...handlers) {
  if (path !== '/api/heart-status') return originalGet.call(this, path, ...handlers);

  return originalGet.call(this, path, async (req, res) => {
    if (!req.session?.discordUser?.id) return res.status(401).json({ error: 'Discord login required.' });
    const botKey = normalizeBotKey(req.query?.bot || req.body?.bot || 'natsumi');
    const result = await checkVote(req.session.discordUser.id, botKey);
    const ownerBypass = Boolean(OWNER_USER_ID && req.session.discordUser.id === OWNER_USER_ID);
    res.setHeader('Cache-Control', 'no-store');
    return res.json({
      verified: ownerBypass || result.ok,
      heartUrl: result.config.heartUrl,
      botKey,
      botId: result.config.botId,
      tokenConfigured: Boolean(result.config.token),
      debug: { ownerBypass, ...result.debug },
    });
  });
};
