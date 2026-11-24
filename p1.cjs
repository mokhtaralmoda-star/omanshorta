const https = require('https');
const fs = require('fs');
const PAGE = 'https://www.rop.gov.om/OnlineServices/eTraffic/arabic/default.aspx';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
let cookies = '';
function get(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const h = { 'User-Agent': UA, 'Accept': 'text/html,image/webp,*/*', 'Accept-Language': 'ar,en;q=0.5' };
    if (cookies) h['Cookie'] = cookies;
    https.get({ hostname: u.hostname, path: u.pathname + u.search, headers: h }, res => {
      const c = [];
      res.on('data', d => c.push(d));
      res.on('end', () => {
        if (res.headers['set-cookie']) cookies = (cookies ? cookies + '; ' : '') + res.headers['set-cookie'].map(x => x.split(';')[0]).join('; ');
        resolve({ status: res.statusCode, headers: res.headers, buf: Buffer.concat(c) });
      });
    }).on('error', reject);
  });
}
(async () => {
  const page = await get(PAGE);
  const html = page.buf.toString('utf8');
  const g = re => { const m = html.match(re); return m ? m[1] : null; };
  const st = {
    cookies,
    vs: g(/id="__VIEWSTATE"\s+value="([^"]*)"/),
    vsg: g(/id="__VIEWSTATEGENERATOR"\s+value="([^"]*)"/),
    ev: g(/id="__EVENTVALIDATION"\s+value="([^"]*)"/),
    vcidName: g(/id="(LBD_VCID_[^"]*?)"/)
  };
  st.vcidVal = st.vcidName ? g(new RegExp('id="' + st.vcidName + '"\\s+value="([^"]*)"')) : null;
  const cap = g(/class="LBD_CaptchaImage"[^>]*src="([^"]*)"/);
  if (!cap) { console.log('NO CAPTCHA FOUND'); process.exit(1); }
  const url = cap.startsWith('http') ? cap : 'https://www.rop.gov.om' + (cap.startsWith('/') ? '' : '/OnlineServices/eTraffic/arabic/') + cap;
  const img = await get(url);
  fs.writeFileSync('captcha.jpg', img.buf);
  fs.writeFileSync('state.json', JSON.stringify(st));
  console.log('page:', page.status, '| captcha:', img.status, img.headers['content-type'], img.buf.length);
  console.log('SAVED: C:\\dev\\omanshorta\\captcha.jpg');
  require('child_process').exec('start "" "C:\\dev\\omanshorta\\captcha.jpg"');
})();