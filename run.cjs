const https = require('https');
const fs = require('fs');
const qs = require('querystring');
const readline = require('readline');
const PAGE = 'https://www.rop.gov.om/OnlineServices/eTraffic/arabic/default.aspx';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
let cookies = '';

function call(url, method, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const h = { 'User-Agent': UA, 'Accept': 'text/html,image/webp,*/*', 'Accept-Language': 'ar,en;q=0.5' };
    if (cookies) h['Cookie'] = cookies;
    if (body) {
      h['Content-Type'] = 'application/x-www-form-urlencoded';
      h['Content-Length'] = Buffer.byteLength(body);
      h['Referer'] = PAGE;
      h['Origin'] = 'https://www.rop.gov.om';
    }
    const r = https.request({ hostname: u.hostname, path: u.pathname + u.search, method: method || 'GET', headers: h }, res => {
      const c = [];
      res.on('data', d => c.push(d));
      res.on('end', () => {
        if (res.headers['set-cookie']) cookies = (cookies ? cookies + '; ' : '') + res.headers['set-cookie'].map(x => x.split(';')[0]).join('; ');
        resolve({ status: res.statusCode, headers: res.headers, buf: Buffer.concat(c) });
      });
    });
    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}

(async () => {
  const page = await call(PAGE);
  const html = page.buf.toString('utf8');
  const g = re => { const m = html.match(re); return m ? m[1] : null; };
  const vs = g(/id="__VIEWSTATE"\s+value="([^"]*)"/);
  const vsg = g(/id="__VIEWSTATEGENERATOR"\s+value="([^"]*)"/);
  const ev = g(/id="__EVENTVALIDATION"\s+value="([^"]*)"/);
  const vcidName = g(/id="(LBD_VCID_[^"]*?)"/);
  const vcidVal = vcidName ? g(new RegExp('id="' + vcidName + '"\\s+value="([^"]*)"')) : null;
  const cap = g(/class="LBD_CaptchaImage"[^>]*src="([^"]*)"/);
  console.log('page:', page.status, '| captcha:', !!cap);
  if (!cap) process.exit(1);

  const chars = [...html.matchAll(/<select[^>]*ddlVehicleChars[^>]*>([\s\S]*?)<\/select>/i)][0][1]
    .match(/value="([^"]*)"/g).map(s => s.slice(7, -1));

  const plate = process.argv[2] || '36390';
  const idv = process.argv[3] || '30078535';
  const lArg = process.argv[4];
  const letters = lArg && /^\d+$/.test(lArg) ? chars[parseInt(lArg, 10)] : (lArg || '\u0628');
  console.log('letters=' + letters + ' | plate=' + plate + ' | id=' + idv);

  const cu = cap.startsWith('http') ? cap : 'https://www.rop.gov.om' + (cap.startsWith('/') ? '' : '/OnlineServices/eTraffic/arabic/') + cap;
  const img = await call(cu);
  fs.writeFileSync('captcha.jpg', img.buf);
  require('child_process').exec('start "" "C:\\dev\\omanshorta\\captcha.jpg"');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const code = await new Promise(r => rl.question('captcha (من الصورة): ', r));
  rl.close();

  const form = {
    '__EVENTTARGET': '', '__EVENTARGUMENT': '',
    '__VIEWSTATE': vs || '', '__VIEWSTATEGENERATOR': vsg || '', '__EVENTVALIDATION': ev || '',
    'ctl00$ContentPlaceHolder1$ddlVehicleChars': letters,
    'ctl00$ContentPlaceHolder1$txtVehicleNo': plate,
    'ctl00$ContentPlaceHolder1$ddlIDChoice': '1',
    'ctl00$ContentPlaceHolder1$txtIDValue': idv,
    'ctl00$ContentPlaceHolder1$CaptchaCodeTextBox': code.trim(),
    'ctl00$ContentPlaceHolder1$bntEnquire': 'x'
  };
  if (vcidName) form[vcidName] = vcidVal || '';
  const body = qs.stringify(form);

  const p = await call(PAGE, 'POST', body);
  let out = p.buf.toString('utf8');
  console.log('POST:', p.status, '| location:', p.headers.location || '(none)');
  if (p.headers.location) {
    const u = p.headers.location.startsWith('http') ? p.headers.location : 'https://www.rop.gov.om' + p.headers.location;
    const r2 = await call(u);
    out = r2.buf.toString('utf8');
    console.log('RESULTS:', r2.status, 'len:', out.length);
  }
  fs.writeFileSync('raw-results.html', out);
  const has = s => out.includes(s);
  ['divVInfo','validResult','lblError','CaptchaIncorrectLabel','lblSummary','ConfirmPayment','<table>'].forEach(k => console.log('  ' + k + ':', has(k)));
  const err = (out.match(/id="ctl00_ContentPlaceHolder1_lblError"[^>]*>([\s\S]*?)<\/span>/) || [])[1];
  console.log('ERROR TEXT:', err ? err.trim() : '(none)');
})();