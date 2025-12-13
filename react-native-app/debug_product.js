
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
        console.log('Login Status:', loginRes.status);
        const loginData = JSON.parse(loginRes.body);
        const token = loginData.token;
        if (!token) {
            console.error('No token found:', loginRes.body);
            return;
        }

        console.log('Fetching Product...');
        const productRes = await fetchJson('https://api.barovainventura.sk/api/product/get-by-ean', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ean: "3217690014263" })
        });
        console.log('Product Status:', productRes.status);
        console.log('Product Body:', productRes.body);

    } catch (e) {
        console.error('Error:', e);
    }
})();
