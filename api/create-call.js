// api/create-call.js
// This file runs on Vercel's servers and keeps your API key secure

export default async function handler(req, res) {
  // Enable CORS so your website can call this API
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS request (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the data from your form
    const { name, company, email, accessCode, agentId, persona, attempt } = req.body;

    // For now, accept any access code (we'll add validation later)
    console.log(`Training session requested by ${name} from ${company}`);

    // Call Retell API to create the web call
    const retellResponse = await fetch('https://api.retellai.com/v2/create-web-call', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RETELL_API_KEY}`, // Uses the key from Vercel Environment Variables
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        agent_id: agentId,
        metadata: {
          participant_name: name,
          company: company,
          email: email,
          scenario: 'feedback',
          persona: persona,
          attempt: attempt
        },
        custom_data: {
          participant_name: name
        }
      })
    });

    if (!retellResponse.ok) {
      const error = await retellResponse.text();
      console.error('Retell API error:', error);
      throw new Error('Failed to create call with Retell');
    }

    const data = await retellResponse.json();

    // Send back the access token to start the call
    res.status(200).json({
      success: true,
      access_token: data.access_token,
      call_id: data.call_id
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: 'Failed to start training session',
      message: error.message 
    });
  }
}
