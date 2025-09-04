// pages/api/validate-access.js
export default async function handler(req, res) {
  // TEMPORARY DEBUG - Remove after testing
  if (req.method === 'GET') {
    return res.status(200).json({ 
      message: 'Validate endpoint is working',
      method: req.method,
      env: {
        hasApiKey: !!process.env.AIRTABLE_API_KEY,
        hasBaseId: !!process.env.AIRTABLE_BASE_ID,
        hasTableId: !!process.env.AIRTABLE_TABLE_ID,
        tableId: process.env.AIRTABLE_TABLE_ID
      }
    });
  }

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  
  if (req.method !== 'POST') {
    return res.status(405).json({ valid: false, message: 'Method not allowed' });
  }

  const { accessCode } = req.body || {};
  
  if (!accessCode || typeof accessCode !== 'string') {
    return res.status(400).json({ valid: false, message: 'Missing or invalid access code' });
  }

  const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
  const AIRTABLE_TABLE_ID = process.env.AIRTABLE_TABLE_ID;

  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !AIRTABLE_TABLE_ID) {
    return res.status(500).json({
      valid: false,
      message: 'Server configuration missing',
      debug: {
        hasApiKey: !!AIRTABLE_API_KEY,
        hasBaseId: !!AIRTABLE_BASE_ID,
        hasTableId: !!AIRTABLE_TABLE_ID
      }
    });
  }

  try {
    // Build the Airtable API URL
    const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Access_Codes`);
    
    // Escape single quotes properly for Airtable formula
    const escaped = accessCode.replace(/'/g, "''");
    const formula = `{Code}='${escaped}'`;
    
    url.searchParams.set('filterByFormula', formula);
    url.searchParams.set('maxRecords', '1');

    console.log('Fetching from:', url.toString());
    console.log('Looking for code:', accessCode);

    const atRes = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const responseText = await atRes.text();
    console.log('Airtable response status:', atRes.status);
    console.log('Airtable response:', responseText);

    if (!atRes.ok) {
      return res.status(502).json({ 
        valid: false, 
        message: 'Airtable error',
        debug: {
          status: atRes.status,
          response: responseText
        }
      });
    }

    let payload;
    try {
      payload = JSON.parse(responseText);
    } catch (e) {
      return res.status(502).json({ 
        valid: false, 
        message: 'Invalid JSON from Airtable',
        debug: responseText
      });
    }

    if (!payload.records || payload.records.length === 0) {
      return res.status(200).json({ 
        valid: false, 
        message: 'Code not found' 
      });
    }

    const record = payload.records[0];
    const fields = record.fields || {};
    
    // Check Remaining_Uses
    const remainingUses = Number(fields.Remaining_Uses ?? 0);

    if (!Number.isFinite(remainingUses) || remainingUses <= 0) {
      return res.status(200).json({
        valid: false,
        message: 'This code has no remaining uses',
        debug: {
          remainingUses,
          fields: Object.keys(fields)
        }
      });
    }

    // Check expiry if Expires_At field exists
    if (fields.Expires_At) {
      const now = new Date();
      const expiresAt = new Date(fields.Expires_At);
      if (!isNaN(expiresAt.getTime()) && now > expiresAt) {
        return res.status(200).json({
          valid: false,
          message: 'This code is expired'
        });
      }
    }

    // Code is valid!
    return res.status(200).json({
      valid: true,
      message: 'Code is valid',
      remainingUses
    });

  } catch (err) {
    console.error('validate-access error:', err);
    return res.status(500).json({ 
      valid: false, 
      message: 'Server error',
      debug: err.message
    });
  }
}
