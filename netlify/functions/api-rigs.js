const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

exports.handler = async function () {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'SUPABASE_URL or SUPABASE_KEY not configured' }),
    };
  }

  const fields = [
    'id', 'rig_name', 'contractor', 'rig_type', 'year_built',
    'current_status', 'current_customer', 'current_location', 'region',
    'report_date',
    'contracts(customer,end_date,day_rate,day_rate_disclosed)',
  ].join(',');

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/rigs?select=${encodeURIComponent(fields)}&order=rig_name.asc`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    }
  );

  if (!res.ok) {
    return {
      statusCode: res.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Supabase query failed' }),
    };
  }

  const data = await res.json();

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=60',
    },
    body: JSON.stringify(data),
  };
};
