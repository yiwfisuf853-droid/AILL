const http = require('http');
function req(method, path, data) {
  return new Promise((resolve, reject) => {
    const opts = {hostname:'localhost',port:3000,path,method,headers:{'Content-Type':'application/json'}};
    if (data) opts.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(data));
    const r = http.request(opts, res => {
      let d=''; res.on('data',c=>d+=c); res.on('end',()=>{try{resolve({status:res.statusCode,data:JSON.parse(d)})}catch(e){resolve({status:res.statusCode,data:d})}});
    });
    r.on('error', reject);
    if (data) r.write(JSON.stringify(data));
    r.end();
  });
}

async function test() {
  const results = [];
  const pass = (name) => results.push({name, ok:true});
  const fail = (name, err) => results.push({name, ok:false, err});

  // Health
  try { const r = await req('GET','/api/health'); r.status===200 ? pass('Health') : fail('Health','status:'+r.status); } catch(e) { fail('Health',e.message); }

  // Auth
  try { const r = await req('POST','/api/auth/login',{username:'admin',password:'Admin@123456'}); r.status===200 ? pass('Login') : fail('Login','status:'+r.status); } catch(e) { fail('Login',e.message); }

  // Posts
  try { const r = await req('GET','/api/posts?limit=1'); r.data?.list?.length>0 ? pass('Posts List') : fail('Posts List','no data'); } catch(e) { fail('Posts List',e.message); }

  // Rankings
  try { const r = await req('GET','/api/rankings/announcements'); r.data?.list?.length>=0 ? pass('Announcements') : fail('Announcements','no data'); } catch(e) { fail('Announcements',e.message); }
  try { const r = await req('GET','/api/rankings/must-see'); r.data?.total!==undefined ? pass('Must-See') : fail('Must-See','no data'); } catch(e) { fail('Must-See',e.message); }
  try { const r = await req('POST','/api/rankings/rankings/calculate',{rankType:'hot',period:'weekly',targetType:1}); r.data?.success ? pass('Calculate Rankings') : fail('Calculate Rankings','failed'); } catch(e) { fail('Calculate Rankings',e.message); }
  try { const r = await req('GET','/api/rankings/rankings?rankType=hot&period=weekly'); r.data?.list?.length>0 ? pass('Rankings List') : fail('Rankings List','no rankings'); } catch(e) { fail('Rankings List',e.message); }

  // Collections
  try { const r = await req('GET','/api/collections'); r.data?.total!==undefined ? pass('Collections List') : fail('Collections List','no data'); } catch(e) { fail('Collections List',e.message); }
  try { const r = await req('POST','/api/collections',{name:'Test Collection',userId:'admin001'}); r.data?.success ? pass('Create Collection') : fail('Create Collection','failed'); } catch(e) { fail('Create Collection',e.message); }

  // Shop
  try { const r = await req('GET','/api/shop/products'); r.data?.list?.length>0 ? pass('Products List') : fail('Products List','no data'); } catch(e) { fail('Products List',e.message); }
  try { const r = await req('GET','/api/shop/cart/admin001'); r.data?.total!==undefined ? pass('Cart') : fail('Cart','no data'); } catch(e) { fail('Cart',e.message); }

  // Live
  try { const r = await req('GET','/api/live/rooms'); r.data?.total!==undefined ? pass('Live Rooms') : fail('Live Rooms','no data'); } catch(e) { fail('Live Rooms',e.message); }
  try { const r = await req('GET','/api/live/gifts'); r.data?.list?.length>0 ? pass('Live Gifts') : fail('Live Gifts','no data'); } catch(e) { fail('Live Gifts',e.message); }

  // Campaigns
  try { const r = await req('GET','/api/campaigns/'); r.data?.list?.length>0 ? pass('Campaigns List') : fail('Campaigns List','no data'); } catch(e) { fail('Campaigns List',e.message); }
  try { const r = await req('GET','/api/campaigns/achievements/list'); r.data?.list?.length>0 ? pass('Achievements List') : fail('Achievements List','no data'); } catch(e) { fail('Achievements List',e.message); }

  // AI/Themes
  try { const r = await req('GET','/api/ai/themes'); r.data?.list?.length>0 ? pass('Themes List') : fail('Themes List','no data'); } catch(e) { fail('Themes List',e.message); }
  try { const r = await req('GET','/api/ai/profiles/admin001'); r.status===200||r.status===400 ? pass('AI Profile') : fail('AI Profile','status:'+r.status); } catch(e) { fail('AI Profile',e.message); }

  // Security
  try { const r = await req('GET','/api/security/config'); r.data?.list?.length>0 ? pass('Sys Config') : fail('Sys Config','no data'); } catch(e) { fail('Sys Config',e.message); }
  try { const r = await req('GET','/api/security/ip-blacklist'); r.data?.total!==undefined ? pass('IP Blacklist') : fail('IP Blacklist','no data'); } catch(e) { fail('IP Blacklist',e.message); }
  try { const r = await req('GET','/api/security/risk-assessments'); r.data?.total!==undefined ? pass('Risk Assessments') : fail('Risk Assessments','no data'); } catch(e) { fail('Risk Assessments',e.message); }
  try { const r = await req('GET','/api/security/files'); r.data?.total!==undefined ? pass('Files') : fail('Files','no data'); } catch(e) { fail('Files',e.message); }

  // Existing modules
  try { const r = await req('GET','/api/relationships/admin001/followers'); r.data?.total!==undefined ? pass('Followers') : fail('Followers','no data'); } catch(e) { fail('Followers',e.message); }
  try { const r = await req('GET','/api/notifications/admin001'); r.data?.total!==undefined||r.data?.list?.length>=0 ? pass('Notifications') : fail('Notifications','no data'); } catch(e) { fail('Notifications',e.message); }
  try { const r = await req('GET','/api/assets/admin001'); r.data?.list?.length>0 ? pass('Assets') : fail('Assets','no data'); } catch(e) { fail('Assets',e.message); }
  try { const r = await req('GET','/api/dict/types'); r.data?.list?.length>0 ? pass('Dict Types') : fail('Dict Types','no data'); } catch(e) { fail('Dict Types',e.message); }
  try { const r = await req('GET','/api/moderation/rules'); r.data?.list?.length>=0 ? pass('Moderation') : fail('Moderation','no data'); } catch(e) { fail('Moderation',e.message); }
  try { const r = await req('GET','/api/messages/admin001'); r.data?.length>=0||r.data?.total!==undefined ? pass('Messages') : fail('Messages','no data'); } catch(e) { fail('Messages',e.message); }
  try { const r = await req('GET','/api/favorites/admin001/folders'); r.data?.length>=0||r.data?.total!==undefined ? pass('Favorites') : fail('Favorites','no data'); } catch(e) { fail('Favorites',e.message); }
  try { const r = await req('GET','/api/feedback/user/admin001'); r.data?.length>=0||r.data?.total!==undefined ? pass('Feedback') : fail('Feedback','no data'); } catch(e) { fail('Feedback',e.message); }

  // Print results
  const passed = results.filter(r=>r.ok).length;
  const failed = results.filter(r=>!r.ok).length;
  console.log('');
  console.log('==========================================');
  console.log('  AILL API Test Report');
  console.log('==========================================');
  results.forEach(r => console.log(r.ok ? '  PASS' : '  FAIL', r.name + (r.err ? ': '+r.err : '')));
  console.log('------------------------------------------');
  console.log('  Total:', results.length, '| Passed:', passed, '| Failed:', failed);
  console.log('==========================================');
}
test().catch(e => console.error('Fatal:', e.message));
