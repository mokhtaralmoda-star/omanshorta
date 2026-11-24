const https = require('https');
const fs = require('fs');
const qs = require('querystring');
const PAGE = 'https://www.rop.gov.om/OnlineServices/eTraffic/arabic/default.aspx';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const st = JSON.parse(fs.readFileSync('state.json', 'utf8'));
const code = process.argv[2];
if (!code) { console.log('usage: node p2.cjs CAPTCHA'); process.exit(1); }
const form = {
  '__EVENTTARGET': '', '__EVENTARGUMENT': '',
  '__VIEWSTATE': st.vs || '', '__VIEWSTATEGENERATOR': st.vsg || '', '__EVENTVALIDATION': st.ev || '',
  'ctl00$ContentPlaceHolder1$ddlVehicleChars': 'ب',
  'ctl00$ContentPlaceHolder1$txtVehicleNo': '36390',
  'ctl00$ContentPlaceHolder1$ddlIDChoice': '1',
  'ctl00$ContentPlaceHolder1$txtIDValue': '30078535',
  'ctl00$ContentPlaceHolder1$CaptchaCodeTextBox': code,
  'ctl00$ContentPlaceHolder1$bntEnquire': 'x'
};
if (st.vcidName) form[st.vcidName] = st.vcidVal || '';
const body = qs.stringify(form);
function post(url, data, cookies) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const h = { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(data), 'User-Agent': UA, 'Accept': 'text/html,*/*', 'Accept-Language': 'ar,en;q=0.5', 'Referer': url, 'Origin': 'https://www.rop.gov.om', 'Cookie': cookies || '' };
    const r = https.request({ hostname: u.hostname, path: u.pathname + u.search, method: 'POST', headers: h }, res => {
      const c = [];
      res.on('data', d => c.push(d));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, buf: Buffer.concat(c) }));
    });
    r.on('error', reject);
    r.write(data); r.end();
  });
}
function get(url, cookies) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    https.get({ hostname: u.hostname, path: u.pathname + u.search, headers: { 'User-Agent': UA, 'Cookie': cookies || '' } }, res => {
      const c = [];
      res.on('data', d => c.push(d));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, buf: Buffer.concat(c) }));
    }).on('error', reject);
  });
}
(async () => {
  const p = await post(PAGE, body, st.cookies);
  console.log('POST:', p.status, '| location:', p.headers.location || '(none)');
  let html = p.buf.toString('utf8');
  let cookies = st.cookies;
  if (p.headers['set-cookie']) cookies += '; ' + p.headers['set-cookie'].map(x => x.split(';')[0]).join('; ');
  if (p.headers.location) {
    const u = p.headers.location.startsWith('http') ? p.headers.location : 'https://www.rop.gov.om' + p.headers.location;
    const r = await get(u, cookies);
    html = r.buf.toString('utf8');
    console.log('RESULTS:', r.status, 'len:', html.length);
  }
  fs.writeFileSync('raw-results.html', html);
  const has = s => html.includes(s);
  ['divVInfo','validResult','lblError','CaptchaIncorrectLabel','lblSummary','ConfirmPayment','<table>'].forEach(k => console.log(k + ':', has(k)));
  const err = (html.match(/id="ctl00_ContentPlaceHolder1_lblError"[^>]*>([\s\S]*?)<\/span>/) || [])[1];
  if (err) console.log('ERR TEXT:', err.trim());
})();