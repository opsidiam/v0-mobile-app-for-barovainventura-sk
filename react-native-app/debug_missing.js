
const https = require('https');

async function fetchJson(url, options) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: data }));
        });
        req.on('error', reject);
        if (options.body) req.write(options.body);
        req.end();
    });
}

(async () => {
    try {
        console.log('Logging in...');
        const loginRes = await fetchJson('https://api.barovainventura.sk/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: "8156",
                password: "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4"
            })
        });
        const loginData = JSON.parse(loginRes.body);
        const token = loginData.token;

        console.log('Fetching Missing Products...');
        const missingRes = await fetchJson('https://api.barovainventura.sk/api/product/get-missing-products', {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            }
        });
        console.log('Missing Products Status:', missingRes.status);
        console.log('Missing Products Body:', missingRes.body);

    } catch (e) {
        console.error('Error:', e);
    }
})();
