// pages/api/access-check.js
// Validates an access code and (optionally) consumes one use.
// Requires these ENV VARS (you already added them in Vercel):
// - AIRTABLE_API_KEY
// - AIRTABLE_BASE_ID
// - AIRTABLE_TABLE_ID
//
// Airtable fields expected in the "Access_Codes" table:
// - Code (single line text)
// - Active (checkbox, true/false)  -> optional but recommended
// - Max_Uses (number)
// - Used_Count (number)
// - Expires_At (date)              -> optional

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, message: 'Method not allowed' });
    }

    const { code, consume = true } = req.body || {};
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ ok: false, message: 'No code provided.' });
    }

    const apiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;
    const tableId = process.env.AIRTABLE_TABLE_ID;

    if (!apiKey || !baseId || !tableId) {
      return res.status(500).json({ ok: false, message: 'Server config missing.' });
    }

    // 1) Find matching record by Code (exact match) and Active = true (if present)
    // Note: filterByFormula must escape quotes properly.
    const formula = `AND({Code} = "${code.replace(/"/g, '\\"')}", OR({Active} = 1, {Active} = ""))`;

    const listUrl = new URL(`https://api.airtable.com/v0/${baseId}/${tableId}`);
    listUrl.searchParams.set('filterByFormula', formula);
    listUrl.searchParams.set('maxRecords', '1');

    const listResp = await fetch(listUrl.toString(), {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!listResp.ok) {
      const text = await listResp.text();
      return res.status(502).json({ ok: false, message: 'Airtable lookup failed', detail: text });
    }

    const { records = [] } = await listResp.json();

    if (!records.length) {
      return res.status(404).json({ ok: false, message: 'Invalid or inactive access code.' });
    }

    const record = records[0];
    const fields = record.fields || {};
    const maxUses = Number(fields.Max_Uses ?? 0);
    const used = Number(fields.Used_Count ?? 0);

    // Optional expiry check if you have an Expires_At column
    if (fields.Expires_At) {
      const now = new Date();
      const exp = new Date(fields.Expires_At);
      if (!isNaN(exp.getTime()) && now > exp) {
        return res.status(403).json({ ok: false, message: 'This code has expired.' });
      }
    }

    // If Max_Uses is 0, treat as unlimited; otherwise enforce remaining > 0
    if (maxUses > 0 && used >= maxUses) {
      return res.status(403).json({ ok: false, message: 'This code has no uses left.' });
    }

    // If consume=false, just validate (useful if you ever want a “check” without spending a use)
    if (!consume) {
      return res.status(200).json({
        ok: true,
        message: 'Code is valid.',
        recordId: record.id,
        remaining: maxUses > 0 ? maxUses - used : null,
      });
    }

    // 2) Consume one use (atomic update)
    const newUsed = used + 1;

    const patchResp = await fetch(
      `https://api.airtable.com/v0/${baseId}/${tableId}/${record.id}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: {
            Used_Count: newUsed,
          },
        }),
      }
    );

    if (!patchResp.ok) {
      const text = await patchResp.text();
      return res.status(502).json({ ok: false, message: 'Failed to consume code.', detail: text });
    }

    // Success
    return res.status(200).json({
      ok: true,
      message: 'Code validated and consumed.',
      recordId: record.id,
      usedCount: newUsed,
      // Remaining_Uses will update via your Airtable formula automatically.
    });
  } catch (err) {
    return res.status(500).json({ ok: false, message: 'Server error', error: String(err) });
  }
}
