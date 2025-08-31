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

    // TESTING MODE: Accept ANY access code
    // Just log it so we can see what people are using
    console.log(`Training session requested by ${name} from ${company} with code: ${accessCode}`);

    // Call Retell API to create the web call
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
          company: company,
          email: email,
          scenario: 'feedback',
          persona: persona,
          attempt: attempt
        }
      })
    });

    if (!retellResponse.ok) {
      const error = await retellResponse.text();
      console.error('Retell API error:', error);
      throw new Error('Failed to create call with Retell');
    }

    const data = await retellResponse.json();
    console.log('Retell response:', data);

    // Send back the access token to start the call
    // IMPORTANT: The field is called "access_token" in the response
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
