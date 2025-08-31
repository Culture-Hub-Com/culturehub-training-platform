// api/create-call.js
// Clean Vercel endpoint for Retell with better error handling

export default async function handler(req, res) {
  // CORS headers (remove * in production if same-origin)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET for testing
  if (req.method === 'GET') {
    return res.status(200).json({ 
      message: 'API endpoint is working!',
      status: 'ready' 
    });
  }

  // Only POST for actual calls
  if (req.method !== 'POST') {
    return res.status(405).json({ error: true, message: 'Method not allowed' });
  }

  // Fail fast if API key is missing
  if (!process.env.RETELL_API_KEY) {
    return res.status(500).json({ error: true, message: 'RETELL_API_KEY not set' });
  }

  try {
    const { name, company, email, accessCode, agentId, persona, attempt } = req.body;
    
    console.log(`Call requested by ${name} from ${company} with code: ${accessCode}`);

    // Call Retell API
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

    const data = JSON.parse(bodyText);
    
    // Return exactly what we need
    return res.status(200).json({ 
      access_token: data.access_token, 
      call_id: data.call_id 
    });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ 
      error: true,
      message: error.message 
    });
  }
}
