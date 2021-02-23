const querystring = require('querystring')
const https = require('https')

const postData = querystring.stringify({
  'text': 'Test Env Parameter',
  'desp': 'It comes from nodejs!'
});

const options = {
  hostname: 'sc.ftqq.com',
  port: 443,
  path: '/' + process.env.SC_KEY + '.send',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = https.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    console.log(`BODY: ${chunk}`);
  });
  res.on('end', () => {
    console.log('No more data in response.');
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

// Write data to request body
req.write(postData);
req.end();