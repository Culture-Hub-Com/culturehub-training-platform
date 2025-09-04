// pages/api/validate-access.js
// Validates an access code against Airtable (Remaining_Uses > 0, optional expiry)

export default async function handler(req, res) {
  // CORS (safe for same-origin front-end)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ valid: false, message: 'Method not allowed' });
  }

  const { code } = req.body || {};
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ valid: false, message: 'Missing or invalid code' });
  }

  const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
  const AIRTABLE_TABLE_ID_OR_NAME = process.env.AIRTABLE_TABLE_ID_OR_NAME; // e.g. tblFUNGrX9M2n7Ies or 'Access_Codes'

  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE_ID_OR_NAME) {
    return res.status(500).json({
      valid: false,
      message: 'Airtable env vars missing. Set AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_TABLE_ID_OR_NAME.',
    });
  }

  try {
    // 1) Find record by Access_Code (case-sensitive match).
    // We *only* use formula to find; we’ll check Remaining_Uses & expiry in JS to avoid formula quirks.
    const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_ID_OR_NAME)}`);
    const formula = `{Access_Code}='${code.replace(/'/g, "\\'")}'`;
    url.searchParams.set('filterByFormula', formula);
    url.searchParams.set('maxRecords', '1');

    const atRes = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const payload = await atRes.json();
    if (!atRes.ok) {
      // Bubble Airtable API error text to help debug
      return res.status(502).json({ valid: false, message: `Airtable error: ${JSON.stringify(payload)}` });
    }

    if (!payload.records || payload.records.length === 0) {
      return res.status(200).json({ valid: false, message: 'Code not found' });
    }

    const record = payload.records[0];
    const f = record.fields || {};

    // 2) Remaining uses
    const remainingUses = Number(f.Remaining_Uses ?? 0);
    if (!Number.isFinite(remainingUses) || remainingUses <= 0) {
      return res.status(200).json({
        valid: false,
        message: 'This code has no remaining uses',
        recordId: record.id,
      });
    }

    // 3) Optional: Expiry check if you added an "Expires_At" date field (ISO or date)
    if (f.Expires_At) {
      const now = new Date();
      const expiresAt = new Date(f.Expires_At);
      if (!isNaN(expiresAt.getTime()) && now > expiresAt) {
        return res.status(200).json({
          valid: false,
          message: 'This code is expired',
          recordId: record.id,
        });
      }
    }

    // If we get here, the code is valid for use
    return res.status(200).json({
      valid: true,
      recordId: record.id,
      remainingUses,
      message: 'Code is valid',
    });
  } catch (err) {
    console.error('validate-access error:', err);
    return res.status(500).json({ valid: false, message: 'Server error validating code' });
  }
}
