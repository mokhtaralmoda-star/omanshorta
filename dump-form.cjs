const https = require('https');
const fs = require('fs');
const PAGE = 'https://www.rop.gov.om/OnlineServices/eTraffic/arabic/default.aspx';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
https.get(PAGE, { headers: { 'User-Agent': UA, 'Accept-Language': 'ar,en;q=0.5' } }, res => {
  const c = [];
  res.on('data', d => c.push(d));
  res.on('end', () => {
    const h = Buffer.concat(c).toString('utf8');
    fs.writeFileSync('form.html', h);
    console.log('status len:', h.length);
    for (const s of h.matchAll(/<select[^>]*name="([^"]+)"[^>]*>([\s\S]*?)<\/select>/gi)) {
      console.log('\nSELECT: ' + s[1]);
      for (const o of s[2].matchAll(/<option[^>]*value="([^"]*)"[^>]*>([\s\S]*?)<\/option>/gi)) {
        console.log('   ' + o[1] + ' = ' + o[2].replace(/<[^>]+>/g, '').trim());
      }
    }
    console.log('\nINPUTS:');
    for (const i of h.matchAll(/<input[^>]*name="(ctl00[^"]*)"[^>]*>/gi)) console.log('   ' + i[1]);
  });
});