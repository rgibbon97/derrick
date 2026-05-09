const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const SITE_URL     = 'https://drillodoro.com';

const STATUS_DOT_CSS = {
  'Contracted':    'color:#88ff88',
  'Available':     'color:#00d4ff',
  'Warm Stacked':  'color:#e8d44d',
  'Cold Stacked':  'color:#ff6b35',
  'Held for Sale': 'color:#aaaaaa',
  'Sold':          'color:#ff4444',
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

function navHtml() {
  return `<a href="/">&#9654; HOME</a>
    <a href="/news.html">&#9654; NEWS</a>
    <a href="/rigs" aria-current="page">&#9654; FLEET STATUS</a>
    <a href="/automation.html">&#9654; AUTOMATION</a>
    <div class="nav-dropdown">
      <button class="nav-dropdown__toggle" type="button">&#9654; TOOLS &#9660;</button>
      <div class="nav-dropdown__menu">
        <a href="/">Ask Derrick</a>
        <a href="/timer.html">Drill-o-doro</a>
        <a href="/converter.html">Unit Converter</a>
        <a href="/calculator.html">Drilling Calculator</a>
        <a href="/acronyms.html">Acronym Lookup</a>
        <a href="/wellcontrol.html">Well Control</a>
      </div>
    </div>`;
}

function getCurrentContract(rig) {
  if (!rig.contracts || rig.contracts.length === 0) return null;
  if (rig.current_customer) {
    const m = rig.contracts.find(c => c.customer === rig.current_customer);
    if (m) return m;
  }
  return rig.contracts[rig.contracts.length - 1];
}

function renderContractorPage(contractor, rigs) {
  const contractorSlug = slugify(contractor);

  // Fleet stats
  const stats = { Contracted: 0, Available: 0, 'Warm Stacked': 0, 'Cold Stacked': 0, 'Held for Sale': 0, Sold: 0 };
  const byType = {};
  let latestReport = '';

  for (const r of rigs) {
    stats[r.current_status] = (stats[r.current_status] || 0) + 1;
    byType[r.rig_type]      = (byType[r.rig_type] || 0) + 1;
    if (!latestReport || r.report_date > latestReport) latestReport = r.report_date;
  }

  const stacked = (stats['Warm Stacked'] || 0) + (stats['Cold Stacked'] || 0);

  const summaryCards = [
    ['TOTAL', rigs.length, 'var(--gold)'],
    ['CONTRACTED',   stats['Contracted']   || 0, '#88ff88'],
    ['AVAILABLE',    stats['Available']    || 0, '#00d4ff'],
    ['STACKED',      stacked,                    '#ff6b35'],
    ['HELD FOR SALE', stats['Held for Sale'] || 0, '#aaaaaa'],
    ['SOLD',         stats['Sold']          || 0, '#ff4444'],
  ].map(([label, val, color]) => `
    <div class="stat-card">
      <div class="stat-card__label">${label}</div>
      <div class="stat-card__value" style="color:${color}">${val}</div>
    </div>`).join('');

  const typeBreakdown = Object.entries(byType)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => `
    <div class="type-row">
      <span class="type-name">${esc(type)}</span>
      <span class="type-count">${count}</span>
    </div>`).join('');

  const tableRows = [...rigs]
    .sort((a, b) => a.rig_name.localeCompare(b.rig_name))
    .map(r => {
      const contract   = getCurrentContract(r);
      const endDate    = contract?.end_date ?? '—';
      const dotStyle   = STATUS_DOT_CSS[r.current_status] || 'color:#aaaaaa';
      const drDisplay  = contract?.day_rate_disclosed && contract?.day_rate
        ? `<span style="color:var(--green-glow);font-family:'Courier New',monospace">$${Number(contract.day_rate).toLocaleString()}/d</span>`
        : `<span style="color:var(--subtle)">${contract?.day_rate_disclosed === false ? 'Undisclosed' : '—'}</span>`;

      return `
    <tr>
      <td><a href="/rigs/${slugify(r.rig_name)}" style="color:var(--gold);text-decoration:none">${esc(r.rig_name)}</a></td>
      <td style="color:var(--muted);font-size:12px">${esc(r.rig_type)}</td>
      <td><span style="display:inline-flex;align-items:center;gap:6px">
        <span style="${dotStyle};font-size:10px">■</span>${esc(r.current_status)}
      </span></td>
      <td>${esc(r.current_customer || '—')}</td>
      <td style="color:var(--muted);font-size:12px">${esc(r.current_location || '—')}</td>
      <td style="color:var(--muted);font-size:12px">${esc(r.region || '—')}</td>
      <td style="color:var(--muted);font-size:12px">${esc(endDate)}</td>
      <td>${drDisplay}</td>
    </tr>`;
    }).join('');

  const pageTitle = `${contractor} Fleet Status — DERRICK`;
  const pageDesc  = `${contractor} operates ${rigs.length} offshore drilling rigs. ${stats['Contracted'] || 0} contracted, ${stats['Available'] || 0} available, ${stacked} stacked. Track their full fleet on DERRICK.`;

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
  <link rel="canonical" href="${SITE_URL}/contractors/${contractorSlug}">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap">
  <link rel="stylesheet" href="/style.css">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "${esc(contractor)}",
    "description": "${esc(pageDesc)}"
  }
  </script>
  <style>
    body { padding: 0 20px 80px; justify-content: flex-start; align-items: center; }
    .page-shell { max-width: 1100px; width: 100%; margin: 0 auto; display: flex; flex-direction: column; }
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
    .breadcrumb {
      margin: 24px 0 8px; font-family: var(--font-pixel); font-size: 6px;
      color: var(--muted); letter-spacing: 1px; display: flex; gap: 8px;
    }
    .breadcrumb a { color: var(--gold); text-decoration: none; }
    .contractor-heading {
      font-family: var(--font-pixel); font-size: 20px; color: var(--orange);
      text-shadow: 3px 3px 0 var(--orange-shadow); letter-spacing: 3px;
      margin: 12px 0 6px; line-height: 1.5;
    }
    .contractor-sub {
      font-family: var(--font-pixel); font-size: 7px; color: var(--muted);
      letter-spacing: 1px; margin-bottom: 28px;
    }
    .fleet-summary { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 28px; }
    .stat-card {
      background: var(--bg-card); border: 2px solid var(--border-dim);
      padding: 14px 16px; min-width: 90px; display: flex;
      flex-direction: column; gap: 8px;
    }
    .stat-card__label { font-family: var(--font-pixel); font-size: 6px; color: var(--subtle); letter-spacing: 1px; }
    .stat-card__value { font-family: 'Courier New', monospace; font-size: 20px; }
    .breakdown-section { margin-bottom: 28px; }
    .breakdown-section h3 {
      font-family: var(--font-pixel); font-size: 8px; color: var(--orange);
      letter-spacing: 2px; margin: 0 0 12px; padding-bottom: 8px;
      border-bottom: 2px solid var(--border-dim);
    }
    .type-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 8px 0; border-bottom: 1px solid var(--row-divider);
    }
    .type-name { font-family: var(--font-prose); font-size: 14px; color: #b8b8cc; }
    .type-count { font-family: var(--font-pixel); font-size: 9px; color: var(--gold); }
    .fleet-table-section h3 {
      font-family: var(--font-pixel); font-size: 8px; color: var(--orange);
      letter-spacing: 2px; margin: 0 0 12px; padding-bottom: 8px;
      border-bottom: 2px solid var(--border-dim);
    }
    .table-wrap { overflow-x: auto; border: 2px solid var(--border-dim); margin-bottom: 36px; }
    .fleet-table { width: 100%; border-collapse: collapse; min-width: 800px; }
    .fleet-table th {
      font-family: var(--font-pixel); font-size: 6px; color: var(--gold);
      letter-spacing: 1px; padding: 10px 10px; background: var(--bg-card);
      border-bottom: 2px solid var(--border-dim); text-align: left; white-space: nowrap;
    }
    .fleet-table td {
      font-family: var(--font-prose); font-size: 13px; color: #b8b8cc;
      padding: 10px 10px; border-bottom: 1px solid var(--row-divider); vertical-align: middle;
    }
    .fleet-table tr:hover td { background: var(--bg-input); }
    .report-date { font-family: var(--font-pixel); font-size: 6px; color: var(--subtle); letter-spacing: 1px; margin-bottom: 40px; }
    @media (max-width: 620px) {
      .contractor-heading { font-size: 14px; letter-spacing: 2px; }
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
    <span>${esc(contractor)}</span>
  </div>

  <h1 class="contractor-heading">${esc(contractor)}</h1>
  <p class="contractor-sub">OFFSHORE DRILLING CONTRACTOR &mdash; ${rigs.length} RIGS</p>

  <div class="fleet-summary">
    ${summaryCards}
  </div>

  <div class="breakdown-section">
    <h3>FLEET BY TYPE</h3>
    ${typeBreakdown}
  </div>

  <div class="fleet-table-section">
    <h3>ALL RIGS</h3>
    <div class="table-wrap">
      <table class="fleet-table">
        <thead><tr>
          <th>RIG NAME</th><th>TYPE</th><th>STATUS</th><th>CUSTOMER</th>
          <th>LOCATION</th><th>REGION</th><th>CONTRACT END</th><th>DAY RATE</th>
        </tr></thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </div>
  </div>

  ${latestReport ? `<p class="report-date">MOST RECENT REPORT: ${esc(latestReport)}</p>` : ''}

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
  <title>Contractor Not Found — DERRICK</title>
  <meta name="robots" content="noindex">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap">
  <link rel="stylesheet" href="/style.css">
  <style>
    body { padding: 0 20px 80px; }
    .page-shell { max-width: 720px; margin: 0 auto; }
    .top-nav { display: flex; gap: 2px; flex-wrap: wrap; padding: 20px 0 24px; border-bottom: 2px solid var(--border-dim); }
    .top-nav a { font-family: var(--font-pixel); font-size: 7px; color: var(--muted); text-decoration: none; letter-spacing: 1px; padding: 7px 11px; border: 2px solid transparent; }
    .top-nav a:hover { color: var(--gold); border-color: var(--gold); }
    .not-found { padding: 60px 0; text-align: center; }
  </style>
</head>
<body>
<div class="page-shell">
  <nav class="top-nav">${navHtml()}</nav>
  <div class="not-found">
    <h1 style="font-size:14px;color:var(--orange);margin-bottom:24px">CONTRACTOR NOT FOUND</h1>
    <p style="font-family:var(--font-pixel);font-size:7px;color:var(--muted);letter-spacing:1px;line-height:2.5">
      No contractor found for <strong style="color:var(--gold)">${esc(slug)}</strong>.<br>
      <a href="/rigs" style="color:var(--gold)">&#9654; BACK TO FLEET HUB</a>
    </p>
  </div>
</div>
</body>
</html>`;
}

exports.handler = async function (event) {
  const pathMatch = (event.path || '').match(/^\/contractors\/([^/]+)/);
  const slug = pathMatch?.[1] || event.queryStringParameters?.slug || '';

  if (!slug) {
    return { statusCode: 302, headers: { Location: '/rigs' } };
  }

  try {
    // Fetch rigs for this contractor — match slug against all distinct contractors
    const fields = 'rig_name,contractor,rig_type,current_status,current_customer,current_location,region,report_date,contracts(customer,end_date,day_rate,day_rate_disclosed)';
    const allRigs = await supabase(`rigs?select=${encodeURIComponent(fields)}&order=rig_name.asc`);

    // Find contractor name by slugifying each unique contractor
    const contractorName = [...new Set(allRigs.map(r => r.contractor))]
      .find(c => slugify(c) === slug);

    if (!contractorName) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
        body: render404(slug),
      };
    }

    const rigs = allRigs.filter(r => r.contractor === contractorName);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      },
      body: renderContractorPage(contractorName, rigs),
    };

  } catch (err) {
    console.error('contractor-page error:', err);
    return { statusCode: 500, body: 'Internal server error' };
  }
};
