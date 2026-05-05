exports.handler = async function (event) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const apiKey     = process.env.NOTION_API_KEY;
  const databaseId = process.env.NOTION_DATABASE_ID;

  if (!apiKey || !databaseId) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'NOTION_API_KEY or NOTION_DATABASE_ID not configured' }),
    };
  }

  try {
    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: {
        Authorization:    `Bearer ${apiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type':   'application/json',
      },
      body: JSON.stringify({
        sorts:     [{ property: 'Relevance', direction: 'descending' }],
        page_size: 50,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return { statusCode: response.status, body: JSON.stringify({ error: err }) };
    }

    const data = await response.json();

    const articles = data.results.map(page => {
      const p = page.properties;
      return {
        title:     p.Title?.title?.map(t => t.plain_text).join('') ?? '',
        summary:   p.Summary?.rich_text?.map(t => t.plain_text).join('') ?? '',
        source:    p.Source?.rich_text?.map(t => t.plain_text).join('') ?? '',
        relevance: p.Relevance?.number ?? null,
        url:       p.URL?.url ?? null,
      };
    }).filter(a => a.title && a.url);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'max-age=300' },
      body: JSON.stringify({ articles }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
