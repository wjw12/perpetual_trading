
const https = require('https')

export function wechat_push(postData) {
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
   req.write(postData);
   req.end();
}

