/**
 * DocAvail — Live HTTP Verification of ALL Manifest URLs + Deep Manifest-vs-Dataset Field Parity Check
 */
const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '..', 'src', 'data', 'facility_evidence_manifest.json');
const samplePath = path.join(__dirname, '..', 'src', 'data', 'sample_facilities.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const samples = JSON.parse(fs.readFileSync(samplePath, 'utf8'));

function extractUrls(str) {
  if (!str) return [];
  return [...str.matchAll(/https?:\/\/[^\s,]+/g)].map(m => m[0].replace(/[.,;)]+$/, ''));
}

async function checkUrl(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    const ct = res.headers.get('content-type') || '';
    let title = ct.includes('pdf') ? '[PDF Document]' : '(No title)';
    if (ct.includes('html')) {
      const text = await res.text();
      const m = text.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (m) title = m[1].replace(/\s+/g, ' ').trim();
    }
    return { url, status: res.status, lastModified: res.headers.get('last-modified') || 'N/A', title, ok: res.ok };
  } catch (err) {
    return { url, status: 'ERR', error: err.message, ok: false };
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  console.log('=== 1. DEEP MANIFEST vs SAMPLE_FACILITIES FIELD PARITY CHECK ===');
  if (manifest.length !== 12 || samples.length !== 12) {
    throw new Error(`Count mismatch: manifest=${manifest.length}, samples=${samples.length}`);
  }
  let parityErrors = 0;
  for (let i = 0; i < 12; i++) {
    const m = manifest[i];
    const s = samples[i];
    if (m.facilityName !== s.name) { console.error(`Name mismatch at ${i}`); parityErrors++; }
    if (m.district !== s.district || m.division !== s.division) { console.error(`Geo mismatch at ${i}`); parityErrors++; }
    if (m.directSourceUrl !== s.sourceReference) { console.error(`SourceRef mismatch at ${i}`); parityErrors++; }
    if (m.verificationFlags.sourceVerified !== s.sourceVerified ||
        m.verificationFlags.locationVerified !== s.locationVerified ||
        m.verificationFlags.operationalVerified !== s.operationalVerified) {
      console.error(`Flag mismatch at ${i} (${s.name})`);
      parityErrors++;
    }
    // Verify OSM coordinates are explicitly labelled community-sourced and never government-verified
    if (s.latitude !== null || s.longitude !== null) {
      if (!s.sourceAttribution.includes('OpenStreetMap contributors') ||
          !s.sourceAttribution.includes('community-sourced') ||
          s.metadata?.governmentGisVerified !== false ||
          !String(s.metadata?.coordinateSource || '').includes('Community-sourced (OpenStreetMap)') ||
          !String(s.metadata?.coordinateSource || '').includes('NOT government-verified')) {
        console.error(`Missing explicit non-gov OSM community label at ${i} (${s.name})`);
        parityErrors++;
      }
    }
    // Verify operational review policy & disclaimer fields are present
    if (!s.metadata?.serviceAvailabilityDisclaimer || s.metadata?.operationalReviewPeriodDays !== 180) {
      console.error(`Missing operational review/disclaimer metadata at ${i} (${s.name})`);
      parityErrors++;
    }
    // Ensure every unsupported field key listed in manifest is null or false in sample
    for (const u of m.unsupportedFields) {
      const baseKey = u.split(' ')[0];
      if (baseKey in s && s[baseKey] !== null && s[baseKey] !== false) {
        console.error(`Unsupported field '${baseKey}' is non-null/true in ${s.name}: ${s[baseKey]}`);
        parityErrors++;
      }
    }
  }
  console.log(`Parity & Policy check completed: 12/12 facilities audited, ${parityErrors} discrepancies.\n`);
  if (parityErrors > 0) process.exit(1);

  console.log('=== 2. LIVE HTTP 200 CHECK OF ALL UNIQUE MANIFEST URLS ===');
  const urls = new Set();
  for (const m of manifest) {
    for (const u of extractUrls(m.directSourceUrl)) urls.add(u);
    for (const u of extractUrls(m.operationalEvidenceUrl)) urls.add(u);
  }
  let failed = 0;
  for (const u of urls) {
    const r = await checkUrl(u);
    console.log(`[${r.status}] ${r.url} | Last-Mod: ${r.lastModified} | ${r.title || r.error}`);
    if (!r.ok) failed++;
  }
  console.log(`\nURL Audit Summary: ${urls.size - failed}/${urls.size} URLs returned HTTP 200 OK.`);
  if (failed > 0) process.exit(1);
}

main();
