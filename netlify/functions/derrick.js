const SYSTEM_PROMPT = `You are Derrick, a veteran drilling engineer with 30 years of experience across the North Sea, Gulf of Mexico and Middle East. You only answer questions related to drilling, well control, oil and gas operations and IWCF exam preparation. You are direct, experienced and occasionally gruff but always helpful. You always prioritise safety. If someone asks something outside drilling and oil and gas, tell them that is not your area and to ask someone else. Never make up information you are not sure about — tell them to consult their IWCF manual or a certified instructor instead.`;

const MAX_MESSAGES   = 20;
const MAX_MSG_CHARS  = 4000;
const MAX_BODY_BYTES = 50_000;
const ALLOWED_ORIGINS = ['https://drillodoro.com', 'http://localhost:8888'];

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // Block cross-origin requests from domains other than our own
  const origin = event.headers.origin;
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden' }) };
  }

  // Reject oversized payloads before parsing
  if (event.body && event.body.length > MAX_BODY_BYTES) {
    return { statusCode: 413, body: JSON.stringify({ error: 'Payload too large' }) };
  }

  let messages;
  try {
    ({ messages } = JSON.parse(event.body));
    if (!Array.isArray(messages) || messages.length === 0) throw new Error('invalid');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Request body must include a messages array' }) };
  }

  // Cap conversation length and validate each message
  if (messages.length > MAX_MESSAGES) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Too many messages in conversation' }) };
  }

  for (const msg of messages) {
    if (!['user', 'assistant'].includes(msg.role)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid message role' }) };
    }
    if (typeof msg.content !== 'string' || msg.content.length > MAX_MSG_CHARS) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Message content too long' }) };
    }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server configuration error' }) };
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages,
    }),
  });

  if (!response.ok) {
    return { statusCode: 502, body: JSON.stringify({ error: 'AI service unavailable. Try again in a moment.' }) };
  }

  const data = await response.json();
  const text = data.content?.[0]?.text ?? '';

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ response: text }),
  };
};
