// api/send.js — заявка с формы -> Telegram (plain text). Секреты ТОЛЬКО в env Vercel.

// ponytail: rate limit in-memory — живёт в пределах одного тёплого инстанса Vercel,
// сбрасывается на холодном старте и НЕ общий между параллельными инстансами.
// Это speed bump против одиночного флуда, не строгий лимит.
// Апгрейд при реальном абьюзе: Upstash Redis / Vercel KV, ключ по IP.
const HITS = new Map(); // ip -> number[] (timestamps)
const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 3;

const ALLOWED_HOSTS = ['triumph-digital.ru', 'www.triumph-digital.ru'];

function clientIp(req) {
  // Vercel ставит x-real-ip = настоящий IP клиента, ему и доверяем.
  // Левый токен x-forwarded-for задаёт сам клиент (спуфится), поэтому он только запасной.
  const real = req.headers['x-real-ip'];
  if (real) return String(real).trim();
  const xff = req.headers['x-forwarded-for'];
  if (xff) return String(xff).split(',')[0].trim();
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}

function rateLimited(ip) {
  const now = Date.now();
  const arr = (HITS.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  arr.push(now);
  HITS.set(ip, arr);
  if (HITS.size > 5000) HITS.clear(); // грубая уборка, чтобы Map не рос бесконечно
  return arr.length > MAX_PER_WINDOW;
}

function originAllowed(req) {
  const src = req.headers.origin || req.headers.referer || '';
  if (!src) return false;
  try {
    return ALLOWED_HOSTS.includes(new URL(src).hostname);
  } catch (e) {
    return false;
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  // 1. Origin/Referer allowlist — режет браузерный абьюз с чужих сайтов и наивных ботов.
  if (!originAllowed(req)) {
    return res.status(403).json({ ok: false, error: 'Forbidden' });
  }

  // 2. Rate limit по IP.
  if (rateLimited(clientIp(req))) {
    return res.status(429).json({ ok: false, error: 'Too many requests' });
  }

  const body = req.body || {};

  // 3. Honeypot: скрытое поле должно быть пустым. Заполнено = бот. Отдаём "успех", чтобы не подбирал обход.
  if (body.company) {
    return res.status(200).json({ ok: true });
  }

  // 4. Валидация текста.
  const text = String(body.text || '').trim().slice(0, 2000);
  if (text.length < 5) {
    return res.status(400).json({ ok: false, error: 'No text' });
  }

  // 5. Секреты — только из env; без них тихий отказ без утечки.
  const token = process.env.BOT_TOKEN;
  const chatId = process.env.CHAT_ID;
  if (!token || !chatId) {
    return res.status(500).json({ ok: false, error: 'Server misconfigured' });
  }

  // 6. Отправка в Telegram. Без parse_mode = plain text (нет Markdown/HTML-инъекции).
  //    disable_web_page_preview — чужие ссылки не разворачиваются. AbortController — инстанс не висит.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
      signal: ctrl.signal,
    });
    if (!r.ok) {
      return res.status(502).json({ ok: false, error: 'Telegram API error' });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(502).json({ ok: false, error: 'Upstream error' });
  } finally {
    clearTimeout(timer);
  }
};
