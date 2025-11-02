// OpenSRS domain registration logic
const axios = require('axios');
require('dotenv').config();

// Check domain availability with OpenSRS XML API
// Returns: { available: true } or { available: false }
async function checkDomainAvailability(domain) {
  try {
  const username = process.env.OPENSRS_USERNAME || 'rizzosai';
  const apiKey = process.env.OPENSRS_API_KEY;
  const endpoint = process.env.OPENSRS_API_URL || 'https://rr-n1-tor.opensrs.net:55443/';
  // Log environment variables for debugging (mask API key)
  console.log('[OpenSRS] ENV username:', username);
  console.log('[OpenSRS] ENV apiKey:', apiKey ? apiKey.substring(0, 8) + '...' : 'undefined');
  console.log('[OpenSRS] ENV endpoint:', endpoint);

    // Build XML payload for domain availability
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<OPS_envelope>
  <header>
    <version>0.9</version>
    <msg_id>123456</msg_id>
    <sender>${username}</sender>
    <recipient>OpenSRS</recipient>
    <security_key>${apiKey}</security_key>
  </header>
  <body>
    <data_block>
      <dt_assoc>
        <item key="protocol">XCP</item>
        <item key="action">lookup</item>
        <item key="object">domain</item>
        <item key="attributes">
          <dt_assoc>
            <item key="domain">${domain}</item>
          </dt_assoc>
        </item>
      </dt_assoc>
    </data_block>
  </body>
</OPS_envelope>`;

    // Generate X-Signature header (HMAC-SHA1 of XML payload with API key)
    const crypto = require('crypto');
    const signature = crypto.createHmac('sha1', apiKey).update(xml).digest('hex');
    const resp = await axios.post(endpoint, xml, {
      headers: {
        'Content-Type': 'text/xml',
        'X-Username': username,
        'X-Signature': signature
      }
    });
    // Parse XML response to check availability
    const available = resp.data.includes('<item key="status">available</item>');
    console.log('OpenSRS API response (raw):', resp.data);
    if (resp.data.match(/<item key="status">(.*?)<\/item>/)) {
      const status = resp.data.match(/<item key="status">(.*?)<\/item>/)[1];
      console.log('Parsed OpenSRS status:', status);
    } else {
      console.log('No <item key="status"> found in OpenSRS response.');
    }
    if (!available) {
      console.error('OpenSRS domain NOT available. Full response:', resp.data);
    }
    return { available };
  } catch (err) {
    if (err && err.response && err.response.data) {
      console.error('OpenSRS API error response:', err.response.data);
    } else {
      console.error('OpenSRS API error:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
    }
    if (err && err.config) {
      console.error('Request config:', err.config);
    }
    if (err && err.request) {
      console.error('Request details:', err.request);
    }
    return { available: false };
  }
}

// Register domain with OpenSRS XML API
async function registerDomain(domain, userEmail) {
  try {
  const username = process.env.OPENSRS_USERNAME || 'rizzosai';
  const apiKey = process.env.OPENSRS_API_KEY;
  const endpoint = process.env.OPENSRS_API_URL || 'https://rr-n1-tor.opensrs.net:55443/';
  // Log environment variables for debugging (mask API key)
  console.log('[OpenSRS] ENV username:', username);
  console.log('[OpenSRS] ENV apiKey:', apiKey ? apiKey.substring(0, 8) + '...' : 'undefined');
  console.log('[OpenSRS] ENV endpoint:', endpoint);

    // Build XML payload for domain registration
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<OPS_envelope>
  <header>
    <version>0.9</version>
    <msg_id>123457</msg_id>
    <sender>${username}</sender>
    <recipient>OpenSRS</recipient>
    <security_key>${apiKey}</security_key>
  </header>
  <body>
    <data_block>
      <dt_assoc>
        <item key="protocol">XCP</item>
        <item key="action">sw_register</item>
        <item key="object">domain</item>
        <item key="attributes">
          <dt_assoc>
            <item key="domain">${domain}</item>
            <item key="reg_username">${userEmail}</item>
            <item key="reg_password">TempPass123!</item>
            <item key="period">1</item>
            <item key="reg_type">new</item>
            <item key="contact_set">
              <dt_assoc>
                <item key="owner">
                  <dt_assoc>
                    <item key="first_name">Domain</item>
                    <item key="last_name">Buyer</item>
                    <item key="email">${userEmail}</item>
                    <item key="country">US</item>
                  </dt_assoc>
                </item>
              </dt_assoc>
            </item>
          </dt_assoc>
        </item>
      </dt_assoc>
    </data_block>
  </body>
</OPS_envelope>`;

    // Generate X-Signature header (HMAC-SHA1 of XML payload with API key)
    const crypto = require('crypto');
    const signature = crypto.createHmac('sha1', apiKey).update(xml).digest('hex');
    const resp = await axios.post(endpoint, xml, {
      headers: {
        'Content-Type': 'text/xml',
        'X-Username': username,
        'X-Signature': signature
      }
    });
    // Parse XML response for registration result
    if (resp.data.includes('<item key="is_success">1</item>')) {
      return { success: true, domain };
    } else {
      const match = resp.data.match(/<item key="error">(.*?)<\/item>/);
      const error = match ? match[1] : 'Unknown error';
      return { success: false, error };
    }
  } catch (err) {
    console.error('OpenSRS registration error:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
    return { success: false, error: 'API error' };
  }
}

module.exports = {
  checkDomainAvailability,
  registerDomain
};
