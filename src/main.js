import rCode from './analysis.R?raw';

const $ = (id) => document.getElementById(id);
let webR = null, csvText = null, usingSample = false;
// True values used to simulate the example data (for validation only)
const TRUTH = { no_inhibitor: { Vmax: 100, Km: 2.0 }, inhibitor_10uM: { Vmax: 100, Km: 5.0 } };

async function startR() {
  const { WebR } = await import('https://webr.r-wasm.org/v0.5.4/webr.mjs');
  webR = new WebR();
  await webR.init();
  $('status').textContent = 'R is ready. Load a CSV file or use the example data.';
  if (csvText) $('run').disabled = false;
}

function setData(text, name) {
  csvText = text.trim() + '\n';
  const lines = csvText.trim().split(/\r?\n/);
  $('preview').innerHTML = `<p class="preview"><b>${name}</b> — ${lines.length - 1} data rows. First rows:</p>
    <pre>${lines.slice(0, 6).join('\n')}</pre>`;
  $('run').disabled = !webR;
}

$('file').addEventListener('change', async (e) => {
  const f = e.target.files[0]; if (!f) return;
  usingSample = false; setData(await f.text(), f.name);
});
$('sample').addEventListener('click', async () => {
  const t = await (await fetch('/enzyme_kinetics.csv')).text();
  usingSample = true; setData(t, 'enzyme_kinetics.csv (simulated: true Vmax = 100 µM/min; Km = 2.0 mM without, 5.0 mM with inhibitor)');
});

const fp = (p) => (p == null ? '—' : p < 0.0001 ? '< 0.0001' : '= ' + Number(p).toFixed(4));
const f = (x, d = 3) => (x == null || isNaN(x) ? '—' : Number(x).toFixed(d));

$('run').addEventListener('click', async () => {
  $('run').disabled = true; $('status').textContent = 'Running nls() in R…';
  try {
    await webR.FS.writeFile('/tmp/kinetics.csv', new TextEncoder().encode(csvText));
    const shelter = await new webR.Shelter();
    const cap = await shelter.captureR(rCode, { captureGraphics: { width: 1000, height: 430 } });
    $('console').textContent = cap.output.filter(o => o.type === 'stdout' || o.type === 'stderr').map(o => o.data).join('\n');
    const plots = $('plots'); plots.innerHTML = '<h3>Figures (drawn by R)</h3>';
    for (const img of cap.images) {
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      c.getContext('2d').drawImage(img, 0, 0); plots.appendChild(c);
    }
    const out = JSON.parse(await webR.evalRString('out_json'));
    shelter.purge();
    render(out);
    $('status').textContent = 'Done.';
  } catch (err) {
    $('status').innerHTML = `<span class="warn">R error: ${err.message}</span>`;
  }
  $('run').disabled = false;
});

function render(out) {
  $('results').classList.remove('hidden');
  $('rcode').textContent = rCode;
  // Sanity checks the scientist should see before trusting the numbers
  const checks = [];
  const dropped = out.n_raw - out.n_used;
  checks.push(dropped === 0
    ? `<li class="ok">✓ All ${out.n_raw} rows used — no rows silently dropped.</li>`
    : `<li class="warn">⚠ ${dropped} of ${out.n_raw} rows dropped (missing / non-numeric / negative). Check your file.</li>`);
  for (const r of out.res) {
    checks.push(r.S_max_over_Km >= 5
      ? `<li class="ok">✓ ${r.condition}: highest [S] is ${f(r.S_max_over_Km, 1)}× Km — enough to approach saturation.</li>`
      : `<li class="warn">⚠ ${r.condition}: highest [S] is only ${f(r.S_max_over_Km, 1)}× Km — Vmax is an extrapolation; add higher [S].</li>`);
    if (r.Km_SE / r.Km > 0.25) checks.push(`<li class="warn">⚠ ${r.condition}: Km has large relative SE (${f(100 * r.Km_SE / r.Km, 0)}%).</li>`);
  }
  $('checks').innerHTML = `<h3>Data checks</h3><ul class="checks">${checks.join('')}</ul>`;

  const truthCols = usingSample;
  let html = `<h3>Fitted parameters (nls, ± standard error)</h3><table><tr><th>Condition</th><th>n</th>
    <th>V<sub>max</sub> (µM/min)</th><th>K<sub>m</sub> (mM)</th><th>R²</th>
    <th>LB V<sub>max</sub>*</th><th>LB K<sub>m</sub>*</th>${truthCols ? '<th>True V<sub>max</sub></th><th>True K<sub>m</sub></th>' : ''}</tr>`;
  for (const r of out.res) {
    const t = TRUTH[r.condition];
    html += `<tr><td>${r.condition}</td><td>${r.n}</td><td>${f(r.Vmax, 1)} ± ${f(r.Vmax_SE, 1)}</td>
      <td>${f(r.Km, 2)} ± ${f(r.Km_SE, 2)}</td><td>${f(r.R2, 4)}</td><td>${f(r.LB_Vmax, 1)}</td><td>${f(r.LB_Km, 2)}</td>
      ${truthCols ? `<td>${t ? t.Vmax : '—'}</td><td>${t ? t.Km : '—'}</td>` : ''}</tr>`;
  }
  html += `</table><p class="preview">* Lineweaver–Burk (1/v vs 1/[S]) shown for comparison only. It distorts the errors at low [S], so the nls() values are the ones to report.</p>`;
  $('table').innerHTML = html;

  let msg = '';
  if (out.res.length === 2 && out.pV != null) {
    const [a, b] = out.res;
    const sameV = out.pV > 0.05, sameK = out.pK > 0.05;
    let type = 'unclear — inspect the plot';
    if (sameV && !sameK && b.Km > a.Km) type = '<b>competitive</b> (Km rises, Vmax unchanged)';
    else if (!sameV && sameK) type = '<b>non-competitive</b> (Vmax falls, Km unchanged)';
    else if (!sameV && !sameK) type = '<b>mixed or uncompetitive</b> (both change)';
    else if (sameV && sameK) type = '<b>no significant effect</b>';
    const ratio = b.Km / a.Km;
    const m = b.condition.match(/(\d+(?:\.\d+)?)\s*u[Mm]/); const conc = m ? Number(m[1]) : null;
    msg = `<div class="interp"><b>Interpretation (check it yourself):</b> Comparing <i>${b.condition}</i> with <i>${a.condition}</i>:
      Vmax ${f(a.Vmax, 1)} → ${f(b.Vmax, 1)} µM/min (F-test for same Vmax, p ${fp(out.pV)});
      Km ${f(a.Km, 2)} → ${f(b.Km, 2)} mM (F-test for same Km, p ${fp(out.pK)}).
      Pattern suggests ${type} inhibition.
      ${sameV && !sameK ? `If competitive, Km,app/Km = 1 + [I]/Ki = ${f(ratio, 2)}, so Ki ≈ [I]/${f(ratio - 1, 2)}${conc ? ` = ${f(conc / (ratio - 1), 1)} µM (using [I] = ${conc} µM from the condition name)` : ''}.` : ''}</div>`;
  }
  $('interp').innerHTML = msg;
}

startR().catch((e) => ($('status').innerHTML = `<span class="warn">Could not start webR: ${e.message}</span>`));
