// api/create-call.js
// Validates an access code in Airtable, creates the Retell web call if valid,
// then increments Used_Count for that code.

export default async function handler(req, res) {
  // CORS (leave * for now since you’re calling from your public site)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    return res.status(200).json({ message: 'create-call is up', status: 'ready' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    name = '',
    company = '',
    email = '',
    accessCode = '',
    agentId,
    persona,
    attempt
  } = req.body || {};

  if (!accessCode || !agentId) {
    return res.status(400).json({ error: 'Missing required fields (accessCode, agentId)' });
  }

  try {
    // ---- 1) Look up the access code in Airtable
    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
    const AIRTABLE_TABLE_ID = process.env.AIRTABLE_TABLE_ID; // table id OR name
    const RETELL_API_KEY   = process.env.RETELL_API_KEY;

    const formula = `AND({Code}='${escapeForFormula(accessCode)}'`;
    const url =
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_ID)}` +
      `?maxRecords=1&filterByFormula=${encodeURIComponent(formula)}`;

    const findResp = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` }
    });

    if (!findResp.ok) {
      const t = await findResp.text();
      console.error('Airtable lookup error', findResp.status, t);
      return res.status(502).json({ error: 'Airtable lookup failed' });
    }

    const findData = await findResp.json();
    if (!findData.records || findData.records.length === 0) {
      return res.status(403).json({ error: 'Invalid or inactive code' });
    }

    const record = findData.records[0];
    const fields = record.fields || {};
    const used = toInt(fields.Used_Count);
    const max  = toInt(fields.Max_Uses);

    // If you have a Remaining_Uses formula field we’ll prefer it; else compute
    const remaining =
      fields.Remaining_Uses !== undefined
        ? toInt(fields.Remaining_Uses)
        : (Number.isFinite(max) && Number.isFinite(used) ? (max - used) : 0);

    if (!(remaining > 0)) {
      return res.status(403).json({ error: 'This code has no remaining uses' });
    }

    // ---- 2) Create the Retell web call (only after validation)
    const retellResp = await fetch('https://api.retellai.com/v2/create-web-call', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RETELL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        agent_id: agentId,
        metadata: {
          participant_name: name,
          company,
          email,
          scenario: 'feedback',
          persona,
          attempt,
          access_code: accessCode
        }
      })
    });

    const retellText = await retellResp.text();
    if (!retellResp.ok) {
      console.error('Retell error', retellResp.status, retellText);
      return res.status(retellResp.status).json({ error: 'Retell create failed', detail: retellText });
    }

    const retellData = JSON.parse(retellText);

    // ---- 3) Increment Used_Count in Airtable
    // (Safe enough for your current volume; if you ever need strict atomicity we can add a retry/compare step.)
    const newUsed = used + 1;
    const patchUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(
      AIRTABLE_TABLE_ID
    )}/${record.id}`;

    const patchResp = await fetch(patchUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: { Used_Count: newUsed }
      })
    });

    if (!patchResp.ok) {
      const pTxt = await patchResp.text();
      // Do NOT fail the call for the user—log and still return their Retell token
      console.error('Airtable increment failed', patchResp.status, pTxt);
    }

    // ---- 4) Return Retell tokens back to the web page
    return res.status(200).json({
      access_token: retellData.access_token,
      call_id: retellData.call_id
    });
  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: 'Server error', detail: err?.message });
  }
}

/** Helpers */
function toInt(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function escapeForFormula(s) {
  // Airtable formula strings escape single quotes by doubling them
  return String(s).replace(/'/g, "''");
}
