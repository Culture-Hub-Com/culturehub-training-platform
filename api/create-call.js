// api/create-call.js
// Vercel API route: exchanges your Retell API key for a short-lived access_token

export default async function handler(req, res) {
  // CORS (fine for testing; tighten to same-origin in production)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    return res.status(200).json({ message: 'API endpoint is working!', status: 'ready' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: true, message: 'Method not allowed' });
  }

  if (!process.env.RETELL_API_KEY) {
    return res.status(500).json({ error: true, message: 'RETELL_API_KEY not set' });
  }

  try {
    const { name, company, email, accessCode, agentId, persona, attempt } = req.body || {};
    console.log(`Call requested by ${name} (${email}) @ ${company} | code: ${accessCode} | agent: ${agentId}`);

    const retellResponse = await fetch('https://api.retellai.com/v2/create-web-call', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RETELL_API_KEY}`,
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
          attempt
        }
      })
    });

    const bodyText = await retellResponse.text();

    if (!retellResponse.ok) {
      console.error('Retell error:', retellResponse.status, bodyText);
      return res.status(retellResponse.status).json({
        error: true,
        status: retellResponse.status,
        detail: bodyText
      });
    }

    const data = JSON.parse(bodyText); // { access_token, call_id }
    return res.status(200).json({ access_token: data.access_token, call_id: data.call_id });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({ error: true, message: err.message || 'Internal error' });
  }
}
