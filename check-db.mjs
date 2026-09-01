import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const clinics = await sql`select id, name, slug, currency, country from clinics`;
console.log("clinics:", clinics.length ? clinics : "(none)");
const members = await sql`select full_name, role, email from members`;
console.log("members:", members.length ? members : "(none)");
const services = await sql`select count(*)::int as n from services`;
console.log("services seeded:", services[0].n);
await sql.end();
