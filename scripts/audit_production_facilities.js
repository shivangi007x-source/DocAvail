/**
 * DocAvail — Strict Read-Only Audit of All 12 Production HealthcareFacility Rows
 */
const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const prodUrlStr = process.env.DIRECT_URL || process.env.DATABASE_URL;

async function main() {
  const client = new Client({
    connectionString: prodUrlStr,
    ssl: { rejectUnauthorized: false },
    statement_timeout: 10000,
  });

  try {
    await client.connect();
    await client.query('SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY;');
    await client.query('BEGIN READ ONLY;');

    const res = await client.query(`
      SELECT id, name, "facilityType", district, division, "contactNumber", email,
             latitude, longitude, "emergencyServices", "operationalStatus",
             "operationalVerified", "locationVerified", "sourceVerified", metadata
      FROM "HealthcareFacility"
      ORDER BY division ASC, district ASC, name ASC;
    `);

    console.log(`Production HealthcareFacility Rows: ${res.rows.length}`);
    for (const r of res.rows) {
      console.log(JSON.stringify({
        id: r.id,
        name: r.name,
        type: r.facilityType,
        district: r.district,
        division: r.division,
        coords: r.latitude !== null ? `${r.latitude}, ${r.longitude}` : null,
        phone: r.contactNumber,
        email: r.email,
        emergencyServices: r.emergencyServices,
        opStatus: r.operationalStatus,
        flags: { src: r.sourceVerified, loc: r.locationVerified, op: r.operationalVerified },
        expiresAt: r.metadata?.operationalVerificationExpiresAt || null,
        govGisVerified: r.metadata?.governmentGisVerified ?? null,
      }));
    }

    const affRes = await client.query('SELECT count(*)::int AS cnt FROM "DoctorFacilityAffiliation";');
    console.log(`Production DoctorFacilityAffiliation count: ${affRes.rows[0].cnt}`);

    await client.query('ROLLBACK;');
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('Audit failed:', e);
  process.exit(1);
});
