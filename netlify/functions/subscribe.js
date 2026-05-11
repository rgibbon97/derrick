const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const ALLOWED_ORIGINS = ['https://drillodoro.com', 'http://localhost:8888'];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const origin = event.headers.origin;
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden' }) };
  }

  let email, source;
  try {
    ({ email, source } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  if (!email || !EMAIL_RE.test(email)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Valid email required' }) };
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server configuration error' }) };
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/subscribers`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      email: email.toLowerCase().trim(),
      source: source || 'homepage',
    }),
  });

  // 409 = duplicate email — treat as success so we don't leak whether an address is registered
  if (res.status === 409 || res.ok) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true }),
    };
  }

  return {
    statusCode: 500,
    body: JSON.stringify({ error: 'Could not save your email. Try again shortly.' }),
  };
};
