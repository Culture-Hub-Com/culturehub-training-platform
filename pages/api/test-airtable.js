// pages/api/test-airtable.js
export default async function handler(req, res) {
  // Check environment variables
  const config = {
    hasApiKey: !!process.env.AIRTABLE_API_KEY,
    apiKeyStart: process.env.AIRTABLE_API_KEY?.substring(0, 7),
    hasBaseId: !!process.env.AIRTABLE_BASE_ID,
    baseId: process.env.AIRTABLE_BASE_ID,
    hasTableId: !!process.env.AIRTABLE_TABLE_ID,
    tableId: process.env.AIRTABLE_TABLE_ID,
  };

  // Try to fetch from Airtable
  if (config.hasApiKey && config.hasBaseId && config.hasTableId) {
    try {
      const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${encodeURIComponent(process.env.AIRTABLE_TABLE_ID)}?maxRecords=1`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${process.env.AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        data = responseText;
      }

      return res.status(200).json({
        config,
        airtableStatus: response.status,
        airtableStatusText: response.statusText,
        airtableResponse: data,
        testUrl: url,
      });
    } catch (error) {
      return res.status(200).json({
        config,
        error: error.message,
      });
    }
  }

  return res.status(200).json({ config });
}
