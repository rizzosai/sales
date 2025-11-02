const http = require('http');

function post(path, data) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.write(JSON.stringify(data));
    req.end();
  });
}

function get(path) {
  return new Promise((resolve, reject) => {
    http.get({ hostname: 'localhost', port: 3000, path }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    }).on('error', reject);
  });
}





(async () => {
  const randomEmail = `user${Math.floor(Math.random() * 100000)}@example.com`;
  let user = {};

  // 1. Signup
  let signupRes;
  try {
    signupRes = await post('/signup', {
      email: randomEmail,
      domain: 'example.com'
    });
    console.log('\n--- Signup ---');
    console.log(signupRes.body);
    user = JSON.parse(signupRes.body);
  } catch (err) {
    console.log('\n--- Signup error ---');
    console.log(err);
    if (signupRes) console.log('Raw signup response:', signupRes.body);
  }

  // 2. Pay
  let payRes;
  try {
    payRes = await post('/pay', {
      email: user.email,
      domain: user.domain
    });
    console.log('\n--- Pay ---');
    console.log(payRes.body);
  } catch (err) {
    console.log('\n--- Pay error ---');
    console.log(err);
    if (payRes) console.log('Raw pay response:', payRes.body);
  }

  // 3. Referral
  let referralRes;
  try {
    referralRes = await post('/referral', {
      userId: user.id,
      referredEmail: `friend${Math.floor(Math.random() * 100000)}@example.com`
    });
    console.log('\n--- Referral ---');
    console.log(referralRes.body);
  } catch (err) {
    console.log('\n--- Referral error ---');
    console.log(err);
    if (referralRes) console.log('Raw referral response:', referralRes.body);
  }

  // 4. Get user info
  let userRes;
  try {
    userRes = await get(`/user?email=${encodeURIComponent(user.email)}`);
    console.log('\n--- User info ---');
    console.log(userRes.body);
  } catch (err) {
    console.log('\n--- User info error ---');
    console.log(err);
    if (userRes) console.log('Raw user info response:', userRes.body);
  }
})();
