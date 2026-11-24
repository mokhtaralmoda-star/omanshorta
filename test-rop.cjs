const https = require('https');
const fs = require('fs');
const readline = require('readline');
const qs = require('querystring');
const PAGE = 'https://www.rop.gov.om/OnlineServices/eTraffic/arabic/default.aspx';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
let cookies = '';

function req(url, opts = {}, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const headers = { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8', 'Accept-Language': 'ar,en;q=0.5' };
    Object.assign(headers, opts.headers || {});
    if (cookies) headers['Cookie'] = cookies;
    const r = https.request({ hostname: u.hostname, path: u.pathname + u.search, method: opts.method || 'GET', headers }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        if (res.headers['set-cookie']) cookies = (cookies ? cookies + '; ' : '') + res.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
        resolve({ status: res.statusCode, headers: res.headers, buf: Buffer.concat(chunks) });
      });
    });
    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}

function opts(html, name) {
  const re = new RegExp('<select[^>]*name="' + name.replace(/\$/g, '\\$') + '"[^>]*>([\\s\\S]*?)</select>', 'i');
  const m = html.match(re);
  const out = [];
  if (!m) return out;
  for (const o of m[1].matchAll(/<option[^>]*value="([^"]*)"[^>]*>([\s\S]*?)<\/option>/gi)) out.push({ value: o[1], label: o[2].replace(/<[^>]+>/g, '').trim() });
  return out;
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = q => new Promise(r => rl.question(q, r));

(async () => {
  const page = await req(PAGE);
  const html = page.buf.toString('utf8');
  fs.writeFileSync('raw-form.html', html);
  console.log('page status:', page.status, 'len:', html.length);

  const grab = re => { const m = html.match(re); return m ? m[1] : null; };
  const vs = grab(/id="__VIEWSTATE"\s+value="([^"]*)"/);
  const vsg = grab(/id="__VIEWSTATEGENERATOR"\s+value="([^"]*)"/);
  const ev = grab(/id="__EVENTVALIDATION"\s+value="([^"]*)"/);
  const vcidName = grab(/id="(LBD_VCID_[^"]*?)"/);
  const vcidVal = vcidName ? grab(new RegExp('id="' + vcidName + '"\\s+value="([^"]*)"')) : null;
  const capSrc = grab(/class="LBD_CaptchaImage"[^>]*src="([^"]*)"/);
  console.log('VIEWSTATE:', !!vs, '| EVENTVALIDATION:', !!ev, '| VCID:', vcidName);

  if (capSrc) {
    const capUrl = capSrc.startsWith('http') ? capSrc : 'https://www.rop.gov.om' + (capSrc.startsWith('/') ? '' : '/OnlineServices/eTraffic/arabic/') + capSrc;
    const img = await req(capUrl);
    fs.writeFileSync('captcha.jpg', img.buf);
    console.log('captcha saved:', img.status, img.headers['content-type'], img.buf.length);
    require('child_process').exec('start "" captcha.jpg');
    await ask('>>> open captcha.jpg then press Enter <<<');
  }

  const chars = opts(html, 'ctl00$ContentPlaceHolder1$ddlVehicleChars');
  console.log('\n=== plate letters ===');
  chars.forEach((o, i) => { if (i) console.log(' ' + i + ') ' + o.label); });
  let ci = parseInt(await ask('choose plate letters number: '), 10);
  while (!(ci > 0 && ci < chars.length)) ci = parseInt(await ask('invalid, choose 1-' + (chars.length - 1) + ': '), 10);

  const vehicleNo = await ask('plate number: ');

  const ids = opts(html, 'ctl00$ContentPlaceHolder1$ddlIDChoice');
  console.log('\n=== id type ===');
  ids.forEach((o, i) => { if (i) console.log(' ' + i + ') ' + o.label); });
  let ii = parseInt(await ask('choose id type number: '), 10);
  while (!(ii > 0 && ii < ids.length)) ii = parseInt(await ask('invalid, choose 1-' + (ids.length - 1) + ': '), 10);

  const idValue = await ask('id value: ');
  const captchaCode = await ask('captcha code: ');

  const form = {
    '__EVENTTARGET': '', '__EVENTARGUMENT': '',
    '__VIEWSTATE': vs || '', '__VIEWSTATEGENERATOR': vsg || '', '__EVENTVALIDATION': ev || '',
    'ctl00$ContentPlaceHolder1$ddlVehicleChars': chars[ci].value,
    'ctl00$ContentPlaceHolder1$txtVehicleNo': vehicleNo,
    'ctl00$ContentPlaceHolder1$ddlIDChoice': ids[ii].value,
    'ctl00$ContentPlaceHolder1$txtIDValue': idValue,
    'ctl00$ContentPlaceHolder1$CaptchaCodeTextBox': captchaCode,
    'ctl00$ContentPlaceHolder1$bntEnquire': 'x'
  };
  if (vcidName) form[vcidName] = vcidVal || '';

  const body = qs.stringify(form);
  console.log('\nPOSTing...');
  const post = await req(PAGE, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body), 'Referer': PAGE, 'Origin': 'https://www.rop.gov.om' } }, body);
  fs.writeFileSync('raw-post.html', post.buf.toString('utf8'));
  console.log('POST status:', post.status, '| location:', post.headers.location || '(none)');

  let finalHtml = post.buf.toString('utf8');
  if (post.headers.location) {
    const u = post.headers.location.startsWith('http') ? post.headers.location : 'https://www.rop.gov.om' + post.headers.location;
    const r2 = await req(u);
    finalHtml = r2.buf.toString('utf8');
    fs.writeFileSync('raw-results.html', finalHtml);
    console.log('results status:', r2.status, 'len:', finalHtml.length);
  }

  const has = s => finalHtml.includes(s);
  console.log('--- MARKERS ---');
  ['divVInfo','validResult','lblError','CaptchaIncorrectLabel','lblSummary','ConfirmPayment','<table>'].forEach(k => console.log(k + ':', has(k)));
  console.log('arabic present:', /[\u0600-\u06FF]/.test(finalHtml));
  rl.close();
})();