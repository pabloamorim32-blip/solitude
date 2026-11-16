/* Função serverless do Netlify: recebe o texto preparado pelo diário e pede uma reflexão à API da Anthropic.
   A chave NUNCA vai para o navegador: configure ANTHROPIC_API_KEY em Site configuration → Environment variables.
   Variáveis opcionais: ACCESS_CODE (código de acesso, recomendado) e AI_MODEL. O conteúdo do diário não é registrado. */
import { createHash, timingSafeEqual } from 'node:crypto';

const MODEL = process.env.AI_MODEL || 'claude-sonnet-5-5';
const MAX_PROMPT = 12000;

const SYSTEM = [
  'Você acompanha uma pessoa na reflexão sobre uma entrada do próprio diário de prática (solitude escolhida, equanimidade, autonomia).',
  'Responda em português, em até 250 palavras, com tom calmo e curioso. Não faça diagnóstico, não conclua sobre a personalidade a partir de um único dia e não trate solitude, pouca interação ou emoções como metas ou falhas.',
  'Responda somente sobre o registro enviado; recuse educadamente qualquer outro pedido.',
  'Se o texto indicar desejo de morrer, risco imediato ou sofrimento intenso, priorize acolher e incentivar apoio humano e ajuda urgente (no Brasil: CVV 188, 24 horas; SAMU 192 em emergência).'
].join(' ');

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const digest = (value) => createHash('sha256').update(String(value)).digest();

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return json({ error: 'not_configured' }, 503);

  const origin = req.headers.get('origin');
  if (origin) {
    try { if (new URL(origin).host !== new URL(req.url).host) return json({ error: 'forbidden' }, 403); }
    catch { return json({ error: 'forbidden' }, 403); }
  }

  const required = process.env.ACCESS_CODE;
  if (required) {
    const given = req.headers.get('x-access-code') || '';
    if (!timingSafeEqual(digest(given), digest(required))) return json({ error: 'unauthorized' }, 401);
  }

  let prompt;
  try { ({ prompt } = await req.json()); } catch { return json({ error: 'bad_request' }, 400); }
  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > MAX_PROMPT) return json({ error: 'bad_request' }, 400);

  let upstream;
  try {
    upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: 700, system: SYSTEM, messages: [{ role: 'user', content: prompt }] }),
      signal: AbortSignal.timeout(24000)
    });
  } catch {
    return json({ error: 'upstream_unreachable' }, 504);
  }
  if (!upstream.ok) return json({ error: 'upstream_error', status: upstream.status }, 502);

  const data = await upstream.json();
  const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
  if (!text) return json({ error: 'empty' }, 502);
  return json({ text });
};

export const config = { path: '/api/analisar' };
