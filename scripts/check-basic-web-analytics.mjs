import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';

const live = process.argv.includes('--live');
const browser = await chromium.launch({headless:true});
try {
  const context = await browser.newContext();
  const packets = [], errors = [];
  if (!live) await context.route('https://human-design.wonderelian.com/**', async route => {
    const path = new URL(route.request().url()).pathname;
    try { await route.fulfill({path:`dist${path==='/'?'/index.html':path}`}); }
    catch { await route.abort(); }
  });
  // Inspect transport without adding validation traffic to real reports.
  await context.route(/https:\/\/[^/]*google-analytics\.com\/.*collect/, async route => {
    packets.push({url:route.request().url(),body:route.request().postData()||''});
    await route.fulfill({status:204,body:''});
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('https://human-design.wonderelian.com/?name=PRIVATE_TEST&birth=PRIVATE_TEST',{waitUntil:'networkidle'});
  await page.evaluate(() => {
    const form = document.createElement('form');
    form.id = 'private-birth-form';
    form.innerHTML = '<input name="birth" value="PRIVATE_TEST"><button>PRIVATE_TEST</button>';
    form.addEventListener('submit', event => event.preventDefault());
    document.body.append(form);
    form.querySelector('input').dispatchEvent(new Event('change',{bubbles:true}));
    form.dispatchEvent(new Event('submit',{bubbles:true}));
    window.scrollTo(0,document.body.scrollHeight);
  });
  await page.waitForTimeout(6000);
  const summaries = packets.map(({url,body}) => {
    const q = new URL(url).searchParams;
    return {event:q.get('en')||new URLSearchParams(body).get('en'), consent:q.get('gcs'), location:q.get('dl'), private_data:/PRIVATE_TEST|private-birth-form/.test(url+body)};
  });
  console.log(JSON.stringify({packets:summaries,errors},null,2));
  assert.ok(summaries.some(p=>p.event==='page_view'&&p.consent==='G101'));
  assert.ok(!summaries.some(p=>p.private_data));
  assert.ok(!summaries.some(p=>['scroll','form_start','form_submit','chart_completion'].includes(p.event)));
  assert.equal(await page.locator('#productAnalytics').isChecked(),false);
  assert.equal(errors.length,0);
  console.log(JSON.stringify({surface:live?'production':'local artifact',packets:summaries,errors,product_opt_in:false,collection_intercepted:true},null,2));
} finally { await browser.close(); }
