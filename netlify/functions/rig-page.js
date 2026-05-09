const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const SITE_URL     = 'https://drillodoro.com';

const STATUS_COLORS = {
  'Contracted':    '#88ff88',
  'Available':     '#00d4ff',
  'Warm Stacked':  '#e8d44d',
  'Cold Stacked':  '#ff6b35',
  'Held for Sale': '#aaaaaa',
  'Sold':          '#ff4444',
};

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function supabase(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${path}`);
  return res.json();
}

function formatDayRate(c) {
  if (!c) return '—';
  if (c.day_rate_disclosed && c.day_rate)    return `$${Number(c.day_rate).toLocaleString()}/d`;
  if (c.day_rate_disclosed === false)         return 'Undisclosed';
  return '—';
}

function navHtml() {
  return `<a href="/">&#9654; HOME</a>
    <a href="/news.html">&#9654; NEWS</a>
    <a href="/rigs" aria-current="page">&#9654; FLEET STATUS</a>
    <a href="/automation.html">&#9654; AUTOMATION</a>
    <div class="nav-dropdown">
      <button class="nav-dropdown__toggle" type="button">&#9654; TOOLS &#9660;</button>
      <div class="nav-dropdown__menu">
        <a href="/ask.html">Ask Derrick</a>
        <a href="/timer.html">Drill-o-doro</a>
        <a href="/converter.html">Unit Converter</a>
        <a href="/calculator.html">Drilling Calculator</a>
        <a href="/acronyms.html">Acronym Lookup</a>
        <a href="/wellcontrol.html">Well Control</a>
      </div>
    </div>`;
}

function renderRigPage(rig, contracts) {
  const rigSlug        = slugify(rig.rig_name);
  const contractorSlug = slugify(rig.contractor);
  const statusColor    = STATUS_COLORS[rig.current_status] || '#aaaaaa';

  const pageTitle = `${rig.rig_name} | ${rig.rig_type}${rig.current_location ? ' | ' + rig.current_location : ''} — DERRICK`;
  const pageDesc  = [
    `${rig.rig_name} is a ${rig.rig_type}`,
    rig.design_class ? `(${rig.design_class})` : null,
    rig.year_built ? `built in ${rig.year_built}.` : '.',
    `Currently ${rig.current_status}`,
    rig.current_customer ? `working for ${rig.current_customer}` : null,
    rig.current_location ? `in ${rig.current_location}.` : '.',
    'Track offshore rig fleet status on DERRICK.',
  ].filter(Boolean).join(' ');

  const detailCells = [
    rig.current_customer && ['CUSTOMER', rig.current_customer, 'var(--gold)'],
    rig.current_location && ['LOCATION', rig.current_location, null],
    rig.region           && ['REGION',   rig.region,           null],
    rig.contractor       && ['CONTRACTOR', rig.contractor, null, `/contractors/${contractorSlug}`],
    rig.rig_type         && ['TYPE',     rig.rig_type,         null],
    rig.design_class     && ['DESIGN CLASS', rig.design_class,  null],
    rig.year_built       && ['YEAR BUILT', String(rig.year_built), null],
  ].filter(Boolean);

  const detailGrid = detailCells.map(([label, value, color, href]) => {
    const valHtml = href
      ? `<a href="${href}" style="color:var(--gold);text-decoration:none">${esc(value)}</a>`
      : `<span style="${color ? `color:${color}` : ''}">${esc(value)}</span>`;
    return `
    <div class="detail-cell">
      <div class="detail-label">${esc(label)}</div>
      <div class="detail-value">${valHtml}</div>
    </div>`;
  }).join('');

  const contractRows = contracts.map(c => {
    const drHtml = c.day_rate_disclosed && c.day_rate
      ? `<span style="color:var(--green-glow);font-family:'Courier New',monospace">$${Number(c.day_rate).toLocaleString()}/d</span>`
      : `<span style="color:var(--subtle)">${esc(formatDayRate(c))}</span>`;
    return `
    <tr>
      <td>${esc(c.customer || '—')}</td>
      <td>${esc(c.location || '—')}</td>
      <td>${esc(c.start_date || '—')}</td>
      <td>${esc(c.end_date || '—')}</td>
      <td>${drHtml}</td>
      <td>${esc(c.total_contract_value || '—')}</td>
      <td style="font-size:11px;color:var(--subtle)">${esc(c.options || '—')}</td>
    </tr>`;
  }).join('');

  const contractsSection = contracts.length === 0
    ? '<p style="font-family:Georgia,serif;color:var(--subtle);font-size:14px;margin-bottom:40px">No contract history on record.</p>'
    : `<div class="contracts-wrap">
    <table class="contracts-table">
      <thead><tr>
        <th>CUSTOMER</th><th>LOCATION</th><th>START</th><th>END</th>
        <th>DAY RATE</th><th>TOTAL VALUE</th><th>OPTIONS</th>
      </tr></thead>
      <tbody>${contractRows}</tbody>
    </table>
  </div>`;

  const oosSection = rig.out_of_service_days ? `
  <div class="oos-box">
    <h3>OUT OF SERVICE</h3>
    <div class="detail-grid" style="border:none;background:transparent">
      <div class="detail-cell" style="background:transparent">
        <div class="detail-label">PERIOD</div>
        <div class="detail-value">${esc(rig.out_of_service_period || '—')}</div>
      </div>
      <div class="detail-cell" style="background:transparent">
        <div class="detail-label">DURATION</div>
        <div class="detail-value">${rig.out_of_service_days} days</div>
      </div>
      <div class="detail-cell" style="background:transparent">
        <div class="detail-label">REASON</div>
        <div class="detail-value">${esc(rig.out_of_service_reason || '—')}</div>
      </div>
    </div>
  </div>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(pageTitle)}</title>
  <meta name="description" content="${esc(pageDesc)}">
  <meta property="og:title" content="${esc(pageTitle)}">
  <meta property="og:description" content="${esc(pageDesc)}">
  <meta property="og:type" content="website">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${SITE_URL}/rigs/${rigSlug}">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap">
  <link rel="stylesheet" href="/style.css">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "${esc(rig.rig_name)}",
    "description": "${esc(pageDesc)}",
    "brand": { "@type": "Brand", "name": "${esc(rig.contractor)}" },
    "category": "${esc(rig.rig_type)}"
  }
  </script>
  <style>
    body { padding: 0 20px 80px; justify-content: flex-start; align-items: center; }
    .page-shell { max-width: 960px; width: 100%; margin: 0 auto; display: flex; flex-direction: column; }
    .top-nav {
      width: 100%; display: flex; gap: 2px; flex-wrap: wrap;
      padding: 20px 0 24px; border-bottom: 2px solid var(--border-dim);
    }
    .top-nav a {
      font-family: var(--font-pixel); font-size: 7px; color: var(--muted);
      text-decoration: none; letter-spacing: 1px; padding: 7px 11px;
      border: 2px solid transparent; text-transform: uppercase;
      transition: color 0.1s, border-color 0.1s;
    }
    .top-nav a:hover { color: var(--gold); border-color: var(--gold); }
    .top-nav a[aria-current="page"] { color: var(--orange); border-color: var(--orange); }
    .breadcrumb {
      margin: 24px 0 8px; font-family: var(--font-pixel); font-size: 6px;
      color: var(--muted); letter-spacing: 1px; display: flex; align-items: center;
      gap: 8px; flex-wrap: wrap;
    }
    .breadcrumb a { color: var(--gold); text-decoration: none; }
    .breadcrumb a:hover { color: var(--orange); }
    .rig-heading {
      font-family: var(--font-pixel); font-size: 22px; color: var(--orange);
      text-shadow: 3px 3px 0 var(--orange-shadow); letter-spacing: 3px;
      margin: 12px 0 10px; line-height: 1.5; text-align: left;
    }
    .rig-meta {
      font-family: var(--font-pixel); font-size: 7px; color: var(--muted);
      letter-spacing: 1px; margin-bottom: 20px; display: flex; gap: 16px;
      flex-wrap: wrap; align-items: center;
    }
    .rig-meta strong { color: var(--gold); }
    .status-badge {
      display: inline-block; font-family: var(--font-pixel); font-size: 8px;
      letter-spacing: 1px; padding: 8px 14px; text-transform: uppercase;
      margin-bottom: 28px; color: #0a0a1a; background: ${statusColor};
    }
    .detail-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 1px; background: var(--border-dim); border: 2px solid var(--border-dim);
      margin-bottom: 36px;
    }
    .detail-cell {
      background: var(--bg-card); padding: 16px;
      display: flex; flex-direction: column; gap: 8px;
    }
    .detail-label {
      font-family: var(--font-pixel); font-size: 6px; color: var(--subtle);
      letter-spacing: 2px;
    }
    .detail-value {
      font-family: var(--font-prose); font-size: 14px; color: #b8b8cc; line-height: 1.4;
    }
    h3 {
      font-family: var(--font-pixel); font-size: 8px; color: var(--orange);
      letter-spacing: 2px; margin: 0 0 16px;
      padding-bottom: 8px; border-bottom: 2px solid var(--border-dim);
    }
    .contracts-wrap { overflow-x: auto; margin-bottom: 36px; }
    .contracts-table { width: 100%; border-collapse: collapse; min-width: 720px; }
    .contracts-table th {
      font-family: var(--font-pixel); font-size: 6px; color: var(--gold);
      letter-spacing: 1px; padding: 10px 12px; border-bottom: 2px solid var(--border-dim);
      text-align: left; white-space: nowrap; background: var(--bg-card);
    }
    .contracts-table td {
      font-family: var(--font-prose); font-size: 13px; color: #b8b8cc;
      padding: 10px 12px; border-bottom: 1px solid var(--row-divider);
      vertical-align: top; line-height: 1.5;
    }
    .contracts-table tr:hover td { background: var(--bg-input); }
    .oos-box {
      border: 2px solid var(--orange); background: var(--bg-card);
      padding: 20px; margin-bottom: 36px;
    }
    .oos-box h3 { border-bottom-color: var(--orange); }
    .last-updated {
      font-family: var(--font-pixel); font-size: 6px; color: var(--subtle);
      letter-spacing: 1px; margin-bottom: 40px;
    }
    @media (max-width: 620px) {
      .rig-heading { font-size: 15px; letter-spacing: 2px; }
      .detail-grid { grid-template-columns: 1fr 1fr; }
    }
  </style>
</head>
<body>

<div class="page-shell">

  <nav class="top-nav" aria-label="Site navigation">
    ${navHtml()}
  </nav>

  <div class="breadcrumb">
    <a href="/rigs">FLEET HUB</a>
    <span style="color:var(--subtle)">&#9654;</span>
    <a href="/contractors/${contractorSlug}">${esc(rig.contractor)}</a>
    <span style="color:var(--subtle)">&#9654;</span>
    <span>${esc(rig.rig_name)}</span>
  </div>

  <h1 class="rig-heading">${esc(rig.rig_name)}</h1>

  <div class="rig-meta">
    <span>&#9654; <strong>${esc(rig.rig_type)}</strong></span>
    ${rig.design_class ? `<span>&#9654; <strong>${esc(rig.design_class)}</strong></span>` : ''}
    ${rig.year_built   ? `<span>&#9654; BUILT <strong>${rig.year_built}</strong></span>` : ''}
  </div>

  <div class="status-badge">${esc(rig.current_status)}</div>

  <div class="detail-grid">
    ${detailGrid}
  </div>

  <h3>CONTRACT HISTORY</h3>
  ${contractsSection}

  ${oosSection}

  <p class="last-updated">LAST UPDATED: ${esc(rig.report_date || 'Unknown')}</p>

  <div class="support-bar">
    <a href="https://www.buymeacoffee.com/rgibbon97o" target="_blank" id="bmc-btn" title="Buy Me a Coffee">
      <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee">
    </a>
    <a href="https://www.linkedin.com/in/ross-gibbon-506a2316a/" target="_blank" class="linkedin-btn" title="LinkedIn">
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-label="LinkedIn">
        <path d="M20.447 20.452H17.01v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.583V9h3.296v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a1.914 1.914 0 1 1 0-3.828 1.914 1.914 0 0 1 0 3.828zm1.658 13.019H3.68V9h3.315v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    </a>
  </div>

  <footer class="site-footer">
    Started because I needed it. Kept going because others might too.
  </footer>

</div>

</body>
</html>`;
}

function render404(slug) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rig Not Found — DERRICK</title>
  <meta name="robots" content="noindex">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap">
  <link rel="stylesheet" href="/style.css">
  <style>
    body { padding: 0 20px 80px; justify-content: flex-start; align-items: center; }
    .page-shell { max-width: 720px; width: 100%; margin: 0 auto; }
    .top-nav { width: 100%; display: flex; gap: 2px; flex-wrap: wrap; padding: 20px 0 24px; border-bottom: 2px solid var(--border-dim); }
    .top-nav a { font-family: var(--font-pixel); font-size: 7px; color: var(--muted); text-decoration: none; letter-spacing: 1px; padding: 7px 11px; border: 2px solid transparent; text-transform: uppercase; }
    .top-nav a:hover { color: var(--gold); border-color: var(--gold); }
    .not-found { padding: 60px 0; text-align: center; }
    .not-found h1 { font-size: 14px; color: var(--orange); margin-bottom: 24px; }
    .not-found p { font-family: var(--font-pixel); font-size: 7px; color: var(--muted); letter-spacing: 1px; line-height: 2.5; }
    .not-found a { color: var(--gold); }
  </style>
</head>
<body>
<div class="page-shell">
  <nav class="top-nav">${navHtml()}</nav>
  <div class="not-found">
    <h1>RIG NOT FOUND</h1>
    <p>No rig found for <strong style="color:var(--gold)">${esc(slug)}</strong>.<br>
    <a href="/rigs">&#9654; BACK TO FLEET HUB</a></p>
  </div>
</div>
</body>
</html>`;
}

exports.handler = async function (event) {
  // event.path is the original request path (e.g. /rigs/valaris-ds-9).
  // Query params from the rewrite rule are unreliable in status=200 rewrites,
  // so parse the slug from the path and fall back to the query param.
  const pathMatch = (event.path || '').match(/^\/rigs\/([^/]+)/);
  const slug = pathMatch?.[1] || event.queryStringParameters?.slug || '';

  if (!slug) {
    return { statusCode: 302, headers: { Location: '/rigs' } };
  }

  try {
    // Fetch all rig names to find slug match (small payload, ~100-200 rows)
    const allRigs = await supabase('rigs?select=id,rig_name&order=rig_name.asc');
    const match   = allRigs.find(r => slugify(r.rig_name) === slug);

    if (!match) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
        body: render404(slug),
      };
    }

    const [rigArr, contracts] = await Promise.all([
      supabase(`rigs?id=eq.${match.id}&select=*`),
      supabase(`contracts?rig_id=eq.${match.id}&select=*&order=id.asc`),
    ]);

    const rig = rigArr[0];
    if (!rig) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
        body: render404(slug),
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      },
      body: renderRigPage(rig, contracts),
    };

  } catch (err) {
    console.error('rig-page error:', err);
    return { statusCode: 500, body: 'Internal server error' };
  }
};
