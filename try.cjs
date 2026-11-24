const https = require('https');
const fs = require('fs');
const qs = require('querystring');
const PAGE = 'https://www.rop.gov.om/OnlineServices/eTraffic/arabic/default.aspx';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
let cookies = '';

function call(url, method, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const h = { 'User-Agent': UA, 'Accept': 'text/html,image/webp,*/*', 'Accept-Language': 'ar,en;q=0.5' };
    if (cookies) h['Cookie'] = cookies;
    if (body) { h['Content-Type'] = 'application/x-www-form-urlencoded'; h['Content-Length'] = Buffer.byteLength(body); h['Referer'] = PAGE; h['Origin'] = 'https://www.rop.gov.om'; }
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

function ask(q) {
  process.stdout.write(q);
  return new Promise(res => {
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    const onData = d => {
      process.stdin.pause();
      process.stdin.removeListener('data', onData);
      res(d.toString().replace(/\r?\n$/, ''));
    };
    process.stdin.once('data', onData);
  });
}

(async () => {
  const lArg = process.argv[2];
  const plate = process.argv[3];
  const idv = process.argv[4];
  if (!lArg || !plate || !idv) {
    console.log('usage: node try.cjs <حرف 1-97> <رقم اللوحة> <رقم الهوية>');
    process.exit(1);
  }

  const page = await call(PAGE);
  const html = page.buf.toString('utf8');
  const g = re => { const m = html.match(re); return m ? m[1] : null; };
  const vs = g(/id="__VIEWSTATE"\s+value="([^"]*)"/);
  const vsg = g(/id="__VIEWSTATEGENERATOR"\s+value="([^"]*)"/);
  const ev = g(/id="__EVENTVALIDATION"\s+value="([^"]*)"/);
  const vcidName = g(/id="(LBD_VCID_[^"]*?)"/);
  const vcidVal = vcidName ? g(new RegExp('id="' + vcidName + '"\\s+value="([^"]*)"')) : null;
  const cap = g(/class="LBD_CaptchaImage"[^>]*src="([^"]*)"/);
  const chars = [...html.matchAll(/<select[^>]*ddlVehicleChars[^>]*>([\s\S]*?)<\/select>/i)][0][1].match(/value="([^"]*)"/g).map(s => s.slice(7, -1));
  const letters = /^\d+$/.test(lArg) ? chars[parseInt(lArg, 10)] : lArg;
  console.log('letters=' + letters + ' | plate=' + plate + ' | id=' + idv);

  if (cap) {
    const cu = cap.startsWith('http') ? cap : 'https://www.rop.gov.om' + (cap.startsWith('/') ? '' : '/OnlineServices/eTraffic/arabic/') + cap;
    const img = await call(cu);
    fs.writeFileSync('captcha.jpg', img.buf);
    require('child_process').exec('start "" "C:\\dev\\omanshorta\\captcha.jpg"');
  }
  const code = (await ask('captcha (من الصورة): ')).trim();

  const form = {
    '__EVENTTARGET': '', '__EVENTARGUMENT': '',
    '__VIEWSTATE': vs || '', '__VIEWSTATEGENERATOR': vsg || '', '__EVENTVALIDATION': ev || '',
    'ctl00$ContentPlaceHolder1$ddlVehicleChars': letters,
    'ctl00$ContentPlaceHolder1$txtVehicleNo': plate,
    'ctl00$ContentPlaceHolder1$ddlIDChoice': '1',
    'ctl00$ContentPlaceHolder1$txtIDValue': idv,
    'ctl00$ContentPlaceHolder1$CaptchaCodeTextBox': code,
    'ctl00$ContentPlaceHolder1$bntEnquire': 'x'
  };
  if (vcidName) form[vcidName] = vcidVal || '';

  const p = await call(PAGE, 'POST', qs.stringify(form));
  let out = p.buf.toString('utf8');
  if (p.headers.location) {
    const u = p.headers.location.startsWith('http') ? p.headers.location : 'https://www.rop.gov.om' + p.headers.location;
    const r2 = await call(u);
    out = r2.buf.toString('utf8');
  }
  const err = (out.match(/id="ctl00_ContentPlaceHolder1_lblError"[^>]*>([\s\S]*?)<\/span>/) || [])[1];
  console.log('POST:', p.status, '| divVInfo:', out.includes('divVInfo'), '| error:', err ? err.trim() : '(none)');
  if (out.includes('divVInfo') || out.includes('validResult')) {
    fs.writeFileSync('raw-results.html', out);
    console.log('*** نجاح — raw-results.html ***');
  }
  process.exit(0);
})();