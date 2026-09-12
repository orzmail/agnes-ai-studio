const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

// ---- 设置 ----
const modal = $('#modal');
async function loadConfig() {
  const r = await fetch('/api/config');
  const d = await r.json();
  const dot = $('#status-dot');
  if (d.hasKey) { dot.className = 'dot green'; dot.title = '已配置'; }
  else { dot.className = 'dot gray'; dot.title = '未配置'; }
  $('#set-base').value = d.baseUrl || '';
}
$('#btn-settings').onclick = () => modal.classList.remove('hidden');
$('#set-cancel').onclick = () => modal.classList.add('hidden');
$('#set-save').onclick = async () => {
  const baseUrl = $('#set-base').value.trim();
  const apiKey = $('#set-key').value.trim();
  const r = await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ baseUrl, apiKey }) });
  const d = await r.json();
  if (d.ok) { modal.classList.add('hidden'); loadConfig(); alert('已保存'); }
  else alert('保存失败: ' + (d.error || ''));
};

// ---- Tabs ----
$$('.tab').forEach(t => t.onclick = () => {
  $$('.tab').forEach(x => x.classList.remove('active'));
  $$('.panel').forEach(x => x.classList.remove('active'));
  t.classList.add('active');
  $('#' + t.dataset.tab).classList.add('active');
  if (t.dataset.tab === 'gallery') renderGallery();
});

// ---- 画廊 (localStorage) ----
function addToGallery(item) {
  const g = JSON.parse(localStorage.getItem('agnes_gallery') || '[]');
  g.unshift(item);
  localStorage.setItem('agnes_gallery', JSON.stringify(g.slice(0, 100)));
}
function renderGallery() {
  const g = JSON.parse(localStorage.getItem('agnes_gallery') || '[]');
  const grid = $('#gallery-grid');
  if (!g.length) { grid.innerHTML = '<p class="muted">暂无生成记录</p>'; return; }
  grid.innerHTML = g.map(it => {
    if (it.type === 'video') return `<div class="card"><video src="${it.url}" controls></video><p>${esc(it.prompt)}</p></div>`;
    return `<div class="card"><img src="${it.url}" alt=""><p>${esc(it.prompt)}</p></div>`;
  }).join('');
}
function esc(s) { return (s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

// ---- 文生图 ----
$('#t2i-go').onclick = async () => {
  const prompt = $('#t2i-prompt').value.trim();
  if (!prompt) { alert('请输入提示词'); return; }
  const btn = $('#t2i-go'); btn.disabled = true; btn.textContent = '生成中...';
  try {
    const r = await fetch('/api/image/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'agnes-image-2.1-flash', prompt, n: +$('#t2i-n').value, size: $('#t2i-size').value }) });
    const d = await r.json();
    if (d.error) { $('#t2i-result').innerHTML = `<p class="err">${esc(d.error)}</p>`; }
    else {
      const urls = extractUrls(d);
      $('#t2i-result').innerHTML = urls.map(u => `<img src="${u}" alt=""><a href="${u}" target="_blank">打开</a>`).join('') || `<pre>${esc(JSON.stringify(d, null, 2))}</pre>`;
      urls.forEach(u => addToGallery({ type: 'image', url: u, prompt }));
    }
  } catch (e) { $('#t2i-result').innerHTML = `<p class="err">${esc(e.message)}</p>`; }
  finally { btn.disabled = false; btn.textContent = '生成'; }
};

// ---- 图生图 ----
let i2iDataUrl = null;
$('#i2i-file').onchange = e => {
  const f = e.target.files[0]; if (!f) return;
  const rd = new FileReader();
  rd.onload = () => { i2iDataUrl = rd.result; $('#i2i-preview').innerHTML = `<img src="${i2iDataUrl}">`; };
  rd.readAsDataURL(f);
};
$('#i2i-go').onclick = async () => {
  const prompt = $('#i2i-prompt').value.trim();
  if (!prompt || !i2iDataUrl) { alert('请上传参考图并输入提示词'); return; }
  const btn = $('#i2i-go'); btn.disabled = true; btn.textContent = '生成中...';
  try {
    const r = await fetch('/api/image/edit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'agnes-image-2.1-flash', prompt, image: i2iDataUrl, n: +$('#i2i-n').value, size: $('#i2i-size').value }) });
    const d = await r.json();
    if (d.error) { $('#i2i-result').innerHTML = `<p class="err">${esc(d.error)}</p>`; }
    else {
      const urls = extractUrls(d);
      $('#i2i-result').innerHTML = urls.map(u => `<img src="${u}" alt=""><a href="${u}" target="_blank">打开</a>`).join('') || `<pre>${esc(JSON.stringify(d, null, 2))}</pre>`;
      urls.forEach(u => addToGallery({ type: 'image', url: u, prompt }));
    }
  } catch (e) { $('#i2i-result').innerHTML = `<p class="err">${esc(e.message)}</p>`; }
  finally { btn.disabled = false; btn.textContent = '生成'; }
};

// ---- 文生视频 ----
$('#t2v-go').onclick = async () => {
  const prompt = $('#t2v-prompt').value.trim();
  if (!prompt) { alert('请输入提示词'); return; }
  const btn = $('#t2v-go'); btn.disabled = true; btn.textContent = '提交中...';
  try {
    const r = await fetch('/api/video/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: $('#t2v-model').value, prompt, seconds: String($('#t2v-seconds').value), ratio: $('#t2v-ratio').value }) });
    const d = await r.json();
    if (d.error) { $('#t2v-result').innerHTML = `<p class="err">${esc(d.error)}</p>`; btn.disabled = false; btn.textContent = '生成视频'; return; }
    const vid = d.video_id || findKey(d, 'video_id');
    if (!vid) { $('#t2v-result').innerHTML = `<pre>${esc(JSON.stringify(d, null, 2))}</pre>`; btn.disabled = false; btn.textContent = '生成视频'; return; }
    $('#t2v-result').innerHTML = `<p class="muted">视频生成中 (id: ${esc(vid)}) ...</p>`;
    pollVideo(vid, prompt);
  } catch (e) { $('#t2v-result').innerHTML = `<p class="err">${esc(e.message)}</p>`; btn.disabled = false; btn.textContent = '生成视频'; }
};
async function pollVideo(vid, prompt) {
  const btn = $('#t2v-go');
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const r = await fetch('/api/video/status?video_id=' + encodeURIComponent(vid));
    const d = await r.json();
    if (d.error) { $('#t2v-result').innerHTML = `<p class="err">${esc(d.error)}</p>`; btn.disabled = false; btn.textContent = '生成视频'; return; }
    const url = findMp4(d) || (d.url && String(d.url).endsWith('.mp4') ? d.url : null);
    if (url) { $('#t2v-result').innerHTML = `<video src="${url}" controls></video><a href="${url}" target="_blank">打开</a>`; addToGallery({ type: 'video', url, prompt }); btn.disabled = false; btn.textContent = '生成视频'; return; }
    $('#t2v-result').innerHTML = `<p class="muted">视频生成中 (${i + 1}/60) ...</p><pre class="muted">${esc(JSON.stringify(d).slice(0, 200))}</pre>`;
  }
  $('#t2v-result').innerHTML += `<p class="err">轮询超时，请稍后在画廊或手动查询</p>`;
  btn.disabled = false; btn.textContent = '生成视频';
}

// ---- 工具 ----
function extractUrls(d) {
  const out = [];
  (function walk(o) {
    if (!o || typeof o !== 'object') return;
    for (const k in o) { const v = o[k]; if (typeof v === 'string' && /^https?:\/\//.test(v)) out.push(v); else if (typeof v === 'object') walk(v); }
  })(d);
  return out;
}
function findKey(o, key) {
  let r = null;
  (function walk(x) { if (!x || typeof x !== 'object') return; for (const k in x) { if (k === key) { r = x[k]; return; } if (typeof x[k] === 'object') walk(x[k]); } })(o);
  return r;
}
function findMp4(o) {
  let r = null;
  (function walk(x) { if (!x || typeof x !== 'object') return; for (const k in x) { const v = x[k]; if (typeof v === 'string' && v.includes('.mp4')) { r = v; return; } if (typeof v === 'object') walk(v); } })(o);
  return r;
}

loadConfig();
