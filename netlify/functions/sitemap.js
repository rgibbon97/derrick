const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const SITE_URL     = 'https://drillodoro.com';

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function supabase(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}`);
  return res.json();
}

function url(loc, changefreq, priority, lastmod) {
  return [
    '  <url>',
    `    <loc>${loc}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    '  </url>',
  ].filter(Boolean).join('\n');
}

exports.handler = async function () {
  try {
    const rigs = await supabase('rigs?select=rig_name,contractor,report_date&order=rig_name.asc');

    const contractors = [...new Set(rigs.map(r => r.contractor))].sort();

    const staticPages = [
      url(`${SITE_URL}/`,               'monthly', '1.0'),
      url(`${SITE_URL}/rigs`,           'daily',   '0.9'),
      url(`${SITE_URL}/news.html`,      'daily',   '0.6'),
      url(`${SITE_URL}/derrick.html`,   'monthly', '0.5'),
      url(`${SITE_URL}/timer.html`,     'monthly', '0.4'),
      url(`${SITE_URL}/converter.html`, 'monthly', '0.4'),
      url(`${SITE_URL}/calculator.html`,'monthly', '0.4'),
      url(`${SITE_URL}/acronyms.html`,  'monthly', '0.4'),
      url(`${SITE_URL}/wellcontrol.html`,'monthly','0.4'),
    ];

    const rigPages = rigs.map(r =>
      url(
        `${SITE_URL}/rigs/${slugify(r.rig_name)}`,
        'weekly',
        '0.8',
        r.report_date || null
      )
    );

    const contractorPages = contractors.map(c =>
      url(`${SITE_URL}/contractors/${slugify(c)}`, 'weekly', '0.7')
    );

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...staticPages,
      ...contractorPages,
      ...rigPages,
      '</urlset>',
    ].join('\n');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600',
      },
      body: xml,
    };

  } catch (err) {
    console.error('sitemap error:', err);
    return { statusCode: 500, body: 'Sitemap generation failed' };
  }
};
