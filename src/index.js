const express = require('express');
const fetch = require('node-fetch');
// Endpoint to show outbound IP for whitelisting
app.get('/my-ip', async (req, res) => {
  try {
    const ip = await fetch('https://api.ipify.org').then(r => r.text());
    res.send(`Outbound IP: ${ip}`);
  } catch (err) {
    res.status(500).send('Could not fetch IP');
  }
});
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET);
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// NOTE: Static middleware moved below API routes for correct routing

// Serve payment form with domain pre-filled


// Helper: Check domain availability using OpenSRS API
async function isDomainAvailable(domain) {
  try {
    const resp = await opensrs.checkDomainAvailability(domain);
    return resp && resp.available;
  } catch (err) {
    console.error('OpenSRS domain check error:', err);
    return false; // treat as unavailable on error
  }
}

// Serve payment form with domain pre-filled, posts to /create-checkout-session
app.get('/pay', async (req, res) => {
  const domain = req.query.domain || '';
  let errorMsg = '';
  if (domain) {
    const available = await isDomainAvailable(domain);
    if (!available) {
      errorMsg = `<div style="color:#e60000;font-weight:bold;margin-bottom:16px;">Sorry, the domain <b>${domain}</b> is already taken. Please choose another.</div>`;
    }
  }
  res.send(`
    <html>
      <head>
        <title>Payment | RizzosAI Domains</title>
        <link rel="stylesheet" href="/style.css" />
      </head>
      <body style="background:#fff;font-family:sans-serif;">
        <div style="max-width:500px;margin:40px auto;padding:32px 24px;background:#f5f7fa;border-radius:12px;box-shadow:0 0 24px rgba(0,31,91,0.08);border:2px solid #e60000;">
          <h2 style="color:#e60000;">Complete Your Payment</h2>
          ${errorMsg}
          <form method="POST" action="/create-checkout-session">
            <label for="email" style="display:block;margin-bottom:8px;color:#001f5b;font-weight:bold;">Email:</label>
            <input type="email" id="email" name="email" required style="padding:10px;width:100%;margin-bottom:16px;border-radius:6px;border:1px solid #ccc;font-size:1em;" />
            <label for="domain" style="display:block;margin-bottom:8px;color:#001f5b;font-weight:bold;">Domain Name:</label>
            <input type="text" id="domain" name="domain" value="${domain}" required style="padding:10px;width:100%;margin-bottom:16px;border-radius:6px;border:1px solid #ccc;font-size:1em;" />
            <label for="amount" style="display:block;margin-bottom:8px;color:#001f5b;font-weight:bold;">Amount (USD):</label>
            <input type="number" id="amount" name="amount" value="15" min="1" required style="padding:10px;width:100%;margin-bottom:16px;border-radius:6px;border:1px solid #ccc;font-size:1em;" />
            <button type="submit" style="background:#e60000;color:#fff;font-weight:bold;font-size:1.1em;padding:12px 28px;border-radius:8px;border:none;cursor:pointer;">Pay & Claim Domain</button>
          </form>
        </div>
      </body>
    </html>
  `);
});



// Redirect /site/home to ShopCo store
app.get('/site/home', (req, res) => {
  res.redirect('https://rizzosai.shopco.com/site/home');
});
// SQLite DB setup (use Fly.io volume and DATABASE_URL if available)
const dbPath = process.env.DATABASE_URL ? process.env.DATABASE_URL.replace('file://', '') : '/data/sqlite.db';
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    domain TEXT,
    stripe_customer_id TEXT,
    referral_code TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS referrals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    referred_email TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);
});


// '/' will now serve public/index.html automatically

// Placeholder: Stripe, ShopCo, Email, Referral modules will be required here

// Remove duplicate stripe declaration
const opensrs = require('./OpenSRS');
const emailer = require('./email');
const referral = require('./referral');
// Payment and domain registration endpoint
app.post('/pay', async (req, res) => {

  // Only require ShopCo webhook key for API/webhook calls (not browser form submissions)
  const SHOPCO_WEBHOOK_KEY = 'pF4gAasoTPWg2jJF5xyWHETbC9CWSho6SpHGdmsG3wA';
  const incomingKey = req.headers['x-shopco-webhook-key'] || req.body.webhook_key;
  // If the request is from ShopCo (has webhook key), verify it
  if (incomingKey !== undefined && incomingKey !== SHOPCO_WEBHOOK_KEY) {
    return res.status(403).json({
      status: 'failed',
      error: 'Invalid ShopCo webhook key.'
    });
  }

  const { email, domain, amount } = req.body || {};
  if (!email || !domain || !amount) {
    return res.status(400).json({
      id: null,
      email,
      domain,
      amount,
      status: 'failed',
      error: 'Email, domain, and amount are required.'
    });
  }

  try {
    // Create a PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(Number(amount) * 100), // convert dollars to cents
      currency: 'usd',
      receipt_email: email,
      metadata: { domain }
    });

    if (paymentIntent.status === 'requires_payment_method') {
      return res.status(402).json({ email, domain, amount, status: 'failed', error: 'Payment method required.' });
    }

    // Register domain with OpenSRS API
    let opensrsDomainResult = null;
    try {
      opensrsDomainResult = await opensrs.registerDomain(domain, email);
    } catch (err) {
      console.error('OpenSRS registration error:', err);
    }

    // Payment successful, trigger Zapier webhook (user-provided URL)
    axios.post('https://hooks.zapier.com/hooks/catch/25004565/uinghkc', {
      event: 'payment',
      email,
      domain,
      amount,
      timestamp: new Date().toISOString(),
      payment_intent: paymentIntent.id,
      opensrs_result: opensrsDomainResult,
      status: paymentIntent.status
    }).catch(err => console.error('Zapier error:', err));

    res.status(200).json({
      id: paymentIntent.id,
      email,
      domain,
      amount,
      opensrs_result: opensrsDomainResult,
      status: paymentIntent.status
    });
  } catch (err) {
    console.error('Stripe error:', err);
    res.status(500).json({
      id: null,
      email,
      domain,
      amount,
      status: 'failed',
      error: err?.message || 'Payment failed.'
    });
  }
});

// User signup endpoin
app.post('/signup', async (req, res) => {
  const { email, domain, referralCode } = req.body;
  if (!email || !domain) {
    return res.status(400).json({ error: 'Email and domain are required.' });
  }

  // Generate referral code if not provided
  const userReferralCode = referralCode || referral.generateReferralCode();

  // Create Stripe customer (placeholder)
  let stripeCustomerId;
  try {
    stripeCustomerId = await stripe.createCustomer(email);
  } catch (err) {
    return res.status(500).json({ error: 'Stripe customer creation failed.' });
  }

  // Store user in SQLite
  db.run(
    `INSERT INTO users (email, domain, stripe_customer_id, referral_code) VALUES (?, ?, ?, ?)`,
    [email, domain, stripeCustomerId, userReferralCode],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'User creation failed.' });
      }
      res.json({
        id: this.lastID,
        email,
        domain,
        stripeCustomerId,
        referralCode: userReferralCode
      });
    }
  );
});

// Serve static files after all API routes
app.use(express.static(path.join(__dirname, '../public')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

// Track referral for a user
app.post('/referral', async (req, res) => {
  const { userId, referredEmail } = req.body || {};
  if (!userId || !referredEmail) {
    return res.status(400).json({
      referralId: null,
      userId,
      referredEmail,
      message: null,
      error: 'userId and referredEmail are required.'
    });
  }
  db.run(
    `INSERT INTO referrals (user_id, referred_email) VALUES (?, ?)`,
    [userId, referredEmail],
    function (err) {
      if (err) {
        return res.status(500).json({
          referralId: null,
          userId,
          referredEmail,
          message: null,
          error: 'Referral tracking failed.'
        });
      }
      res.status(200).json({ referralId: this.lastID, userId, referredEmail, message: 'Referral tracked!' });

      // Trigger Zapier webhook
      axios.post('https://hooks.zapier.com/hooks/catch/25004565/uicqitu/', {
        event: 'referral',
        referralId: this.lastID,
        userId,
        referredEmail,
        message: 'Referral tracked!'
      }).catch(err => console.error('Zapier error:', err));
    }
  );
});

// Get user info by email or ID
app.get('/user', (req, res) => {
  const { email, id } = req.query;
  let sql, param;
  if (email) {
    sql = 'SELECT * FROM users WHERE email = ?';
    param = email;
  } else if (id) {
    sql = 'SELECT * FROM users WHERE id = ?';
    param = id;
  } else {
    return res.status(400).json({ error: 'Provide email or id.' });
  }
  db.get(sql, [param], (err, user) => {
    if (err || !user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json(user);
  });
});
// Stripe Checkout session creation endpoint

app.post('/create-checkout-session', async (req, res) => {
  const { email, domain, amount } = req.body || {};
  if (!email || !domain || !amount) {
    return res.status(400).send('Email, domain, and amount are required.');
  }
  // Check domain availability before creating Stripe session
  const available = await isDomainAvailable(domain);
  if (!available) {
    return res.status(400).send(`Sorry, the domain ${domain} is already taken. Please choose another.`);
  }
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Domain: ${domain}`,
              description: `Claim your domain: ${domain}`,
            },
            unit_amount: Math.round(Number(amount) * 100),
          },
          quantity: 1,
        },
      ],
      customer_email: email,
      metadata: { domain },
      success_url: `${req.protocol}://${req.get('host')}/success?session_id={CHECKOUT_SESSION_ID}&domain=${encodeURIComponent(domain)}&email=${encodeURIComponent(email)}&amount=${encodeURIComponent(amount)}`,
      cancel_url: `${req.protocol}://${req.get('host')}/pay?domain=${encodeURIComponent(domain)}`,
    });
    // Redirect to Stripe Checkout
    res.redirect(303, session.url);
  } catch (err) {
    console.error('Stripe Checkout error:', err);
    res.status(500).send('Failed to create Stripe Checkout session.');
  }
});

// Success page and post-payment logic
// API endpoint: Check domain availability (OpenSRS)
app.post('/api/domain/check', async (req, res) => {
  console.log('POST /api/domain/check hit!', req.body); // Debug log
  const { domain } = req.body;
  if (!domain) {
    return res.status(400).json({ available: false, error: 'Domain is required.' });
  }
  try {
    const result = await opensrs.checkDomainAvailability(domain);
    res.json(result);
  } catch (err) {
    console.error('Domain check API error:', err);
    res.status(500).json({ available: false, error: 'API error.' });
  }
});
app.get('/success', async (req, res) => {
  const { session_id, domain, email, amount } = req.query;
  if (!session_id || !domain || !email || !amount) {
    return res.status(400).send('Missing payment info.');
  }
  try {
    // Retrieve session and payment status
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session.payment_status !== 'paid') {
      return res.status(402).send('Payment not completed.');
    }
    // Register domain with OpenSRS API
    let opensrsDomainResult = null;
    try {
      opensrsDomainResult = await opensrs.registerDomain(domain, email);
    } catch (err) {
      console.error('OpenSRS registration error:', err);
    }
    // Trigger Zapier webhook
    axios.post('https://hooks.zapier.com/hooks/catch/25004565/uinghkc', {
      event: 'payment',
      email,
      domain,
      amount,
      timestamp: new Date().toISOString(),
      payment_intent: session.payment_intent,
      opensrs_result: opensrsDomainResult,
      status: session.payment_status
    }).catch(err => console.error('Zapier error:', err));
    res.send(`
      <html>
        <head><title>Payment Success</title></head>
        <body style="background:#fff;font-family:sans-serif;">
          <div style="max-width:500px;margin:40px auto;padding:32px 24px;background:#f5f7fa;border-radius:12px;box-shadow:0 0 24px rgba(0,31,91,0.08);border:2px solid #e60000;">
            <h2 style="color:#e60000;">Payment Successful!</h2>
            <p>Thank you for your purchase. Your domain <b>${domain}</b> is being registered.</p>
            <p>Confirmation sent to <b>${email}</b>.</p>
            <p>Domain registration status: <b>${opensrsDomainResult && opensrsDomainResult.success ? 'Success' : 'Failed'}</b></p>
            ${opensrsDomainResult && opensrsDomainResult.error ? `<p style="color:#e60000;">Error: ${opensrsDomainResult.error}</p>` : ''}
          </div>
        </body>
      </html>
    `);
  } catch (err) {
    console.error('Success page error:', err);
    res.status(500).send('Error processing payment.');
  }
});
