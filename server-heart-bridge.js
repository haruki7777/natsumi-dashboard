import 'dotenv/config';
import express from 'express';
import mongoose, { Schema, model } from 'mongoose';

const cleanEnv = (value) => String(value || '').replace(/["']/g, '').trim();
const HEART_BRIDGE_SECRET = cleanEnv(process.env.HEART_BRIDGE_SECRET || process.env.DASHBOARD_HEART_BRIDGE_SECRET);
const DEFAULT_PASS_MS = Number(process.env.PREMIUM_HEART_PASS_MS || 12 * 60 * 60 * 1000);

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

function bearerToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

async function heartBridgeHandler(req, res) {
  if (!HEART_BRIDGE_SECRET) return res.status(503).json({ error: 'HEART_BRIDGE_SECRET is not configured.' });
  if (bearerToken(req) !== HEART_BRIDGE_SECRET) return res.status(401).json({ error: 'Invalid bridge token.' });

  const userId = String(req.body?.userId || '').trim();
  const botKey = normalizeBotKey(req.body?.botKey || 'natsumi');
  const expiresAt = req.body?.expiresAt ? new Date(req.body.expiresAt) : new Date(Date.now() + DEFAULT_PASS_MS);

  if (!userId || Number.isNaN(expiresAt.getTime())) return res.status(400).json({ error: 'Invalid heart pass payload.' });

  const pass = await PremiumHeartPass.findOneAndUpdate(
    { userId, botKey },
    { userId, botKey, lastVerifiedAt: new Date(), expiresAt, source: req.body?.source || 'discord_bot_bridge' },
    { upsert: true, new: true }
  ).lean();

  res.setHeader('Cache-Control', 'no-store');
  return res.json({ ok: true, userId, botKey, expiresAt: pass.expiresAt, source: pass.source });
}

const originalListen = express.application.listen;
express.application.listen = function patchedListen(...args) {
  if (!this.__natsumiHeartBridgeRouteRegistered) {
    this.post('/api/internal/heart-pass', heartBridgeHandler);
    this.__natsumiHeartBridgeRouteRegistered = true;
  }
  return originalListen.apply(this, args);
};
