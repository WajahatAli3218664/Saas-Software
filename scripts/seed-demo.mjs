/**
 * Fills two clinics with believable demo data for a walkthrough.
 *
 * Safe to run more than once: it clears only the operational rows of the
 * clinics it seeds (patients, invoices, appointments) and leaves every other
 * clinic on the platform untouched.
 *
 *   npx dotenv -e .env.local -- node scripts/seed-demo.mjs
 */
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { max: 3 });

/** Two clinics with distinct identities, so switching between them reads. */
const CLINICS = [
  {
    match: 0, // index into the clinics ordered by creation
    name: "Glow Aesthetic Clinic",
    city: "Lahore",
    phone: "042 3577 1200",
    addressLine: "12-C, MM Alam Road, Gulberg III",
    taxLabel: "NTN",
    taxNumber: "4470182-6",
    invoicePrefix: "GAC",
    invoiceFooter:
      "Thank you for visiting. A follow-up review within 14 days is complimentary.",
    taxPercent: "0",
  },
  {
    match: 1,
    name: "Radiance Skin & Laser",
    city: "Karachi",
    phone: "021 3520 9944",
    addressLine: "Plot 4, Khayaban-e-Shahbaz, DHA Phase 6",
    taxLabel: "NTN",
    taxNumber: "7719340-2",
    invoicePrefix: "RSL",
    invoiceFooter: "Aftercare instructions have been shared on WhatsApp.",
    taxPercent: "0",
  },
];

const FIRST_NAMES = [
  "Ayesha", "Fatima", "Zainab", "Hira", "Sana", "Maryam", "Amna", "Iqra",
  "Rabia", "Noor", "Sadia", "Mehwish", "Ali", "Hassan", "Bilal", "Usman",
];
const LAST_NAMES = [
  "Khan", "Ahmed", "Malik", "Sheikh", "Butt", "Qureshi", "Siddiqui",
  "Chaudhry", "Raza", "Farooq", "Javed", "Nawaz",
];

const CITIES = { Lahore: "Lahore", Karachi: "Karachi" };

const ALLERGIES = [
  null, null, null, null, null,
  "Penicillin",
  "Lidocaine — mild reaction, use alternative",
  "Latex",
];

const NOTES = [
  null, null, null,
  "Prefers afternoon appointments.",
  "Sensitive skin — patch test before any new product.",
  "Referred by Dr. Saleem.",
  "Regular client since 2024.",
];

/** Deterministic pseudo-random so repeated runs look the same. */
let seed = 20260901;
function rnd() {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}
function pick(list) {
  return list[Math.floor(rnd() * list.length)];
}
function between(min, max) {
  return Math.floor(rnd() * (max - min + 1)) + min;
}

function phoneNumber() {
  return `03${between(0, 4)}${between(10, 99)} ${between(1000000, 9999999)}`;
}

async function main() {
  const clinics = await sql`select * from clinics order by created_at`;

  if (clinics.length < 2) {
    console.error(
      `Need at least 2 clinics, found ${clinics.length}. Sign up a second clinic first.`,
    );
    process.exit(1);
  }

  for (const spec of CLINICS) {
    const clinic = clinics[spec.match];
    if (!clinic) continue;

    console.log(`\n── ${spec.name} (${spec.city}) ─────────────`);

    // Identity first, so printed invoices carry a real letterhead.
    await sql`
      update clinics set
        name = ${spec.name},
        city = ${spec.city},
        phone = ${spec.phone},
        address_line = ${spec.addressLine},
        tax_label = ${spec.taxLabel},
        tax_number = ${spec.taxNumber},
        invoice_prefix = ${spec.invoicePrefix},
        invoice_footer = ${spec.invoiceFooter},
        tax_percent = ${spec.taxPercent},
        updated_at = now()
      where id = ${clinic.id}`;
    console.log("   clinic details set");

    // Clear only this clinic's operational history.
    await sql`delete from appointments where clinic_id = ${clinic.id}`;
    await sql`delete from invoices where clinic_id = ${clinic.id}`;
    await sql`delete from patients where clinic_id = ${clinic.id}`;

    const [member] = await sql`
      select * from members where clinic_id = ${clinic.id} limit 1`;

    const services = await sql`
      select * from services where clinic_id = ${clinic.id} and is_active = true`;

    if (!member || services.length === 0) {
      console.log("   skipped — no member or no services");
      continue;
    }

    // Give the second clinic its own price list so the two are visibly
    // different businesses, not one dataset shown twice.
    if (spec.match === 1) {
      for (const service of services) {
        const shifted = Math.round((service.price * between(85, 130)) / 100);
        // Round to the nearest 500 rupees; nobody prices at 23,417.
        const tidy = Math.round(shifted / 50000) * 50000 || service.price;
        await sql`
          update services set price = ${tidy}, updated_at = now()
          where id = ${service.id}`;
        service.price = tidy;
      }
      console.log("   prices adjusted for this clinic");
    }

    // ---- Patients -------------------------------------------------------
    const patientCount = spec.match === 0 ? 14 : 9;
    const patients = [];

    for (let i = 1; i <= patientCount; i++) {
      const fullName = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
      const code = `P-${String(i).padStart(4, "0")}`;
      const daysAgo = between(1, 200);
      const createdAt = new Date(Date.now() - daysAgo * 86400000);

      const [row] = await sql`
        insert into patients (
          clinic_id, code, full_name, phone, gender, city,
          allergies, notes, created_at, updated_at
        ) values (
          ${clinic.id}, ${code}, ${fullName}, ${phoneNumber()},
          ${rnd() > 0.22 ? "female" : "male"}, ${CITIES[spec.city]},
          ${pick(ALLERGIES)}, ${pick(NOTES)}, ${createdAt}, ${createdAt}
        ) returning *`;
      patients.push(row);
    }
    console.log(`   ${patients.length} patients`);

    // ---- Invoices spread over the last 30 days --------------------------
    const invoiceCount = spec.match === 0 ? 26 : 15;
    let sequence = 0;
    let paidCount = 0;
    let unpaidCount = 0;

    for (let i = 0; i < invoiceCount; i++) {
      sequence++;
      const daysAgo = Math.floor(rnd() * 30);
      const hour = between(10, 19);
      const issuedAt = new Date(Date.now() - daysAgo * 86400000);
      issuedAt.setHours(hour, between(0, 59), 0, 0);

      const patient = pick(patients);
      const lineCount = rnd() > 0.62 ? 2 : 1;
      const chosen = [];
      for (let l = 0; l < lineCount; l++) {
        const service = pick(services);
        if (!chosen.find((c) => c.id === service.id)) chosen.push(service);
      }

      let subtotal = 0;
      const lines = chosen.map((service, index) => {
        const quantity = 1;
        const gross = service.price * quantity;
        subtotal += gross;

        // A quarter of lines carry a discount, always inside the cap.
        const discounted = rnd() > 0.75;
        const percent = discounted ? pick([5, 10, 10, 15]) : 0;
        const discountAmount = Math.round((gross * percent) / 100);

        return {
          serviceId: service.id,
          name: service.name,
          unitPrice: service.price,
          quantity,
          discountType: percent ? "percent" : null,
          discountValue: String(percent),
          discountAmount,
          lineTotal: gross - discountAmount,
          sortOrder: index,
        };
      });

      const discountTotal = lines.reduce((s, l) => s + l.discountAmount, 0);
      const total = subtotal - discountTotal;

      // Most bills settle on the day; a few are left outstanding, which is
      // what makes the dashboard's "outstanding" tile meaningful.
      const roll = rnd();
      let amountPaid;
      let status;
      if (roll > 0.82) {
        amountPaid = 0;
        status = "unpaid";
        unpaidCount++;
      } else if (roll > 0.74) {
        amountPaid = Math.round(total / 2 / 100) * 100;
        status = "partial";
        unpaidCount++;
      } else {
        amountPaid = total;
        status = "paid";
        paidCount++;
      }

      const number = `${spec.invoicePrefix}-${String(sequence).padStart(6, "0")}`;

      const [invoice] = await sql`
        insert into invoices (
          clinic_id, number, patient_id, status, subtotal,
          discount_amount, tax_amount, total, amount_paid,
          created_by, discount_approved_by, issued_at, created_at, updated_at
        ) values (
          ${clinic.id}, ${number}, ${patient.id}, ${status}, ${subtotal},
          ${discountTotal}, 0, ${total}, ${amountPaid},
          ${member.id}, ${discountTotal > 0 ? member.id : null},
          ${issuedAt}, ${issuedAt}, ${issuedAt}
        ) returning *`;

      for (const line of lines) {
        await sql`
          insert into invoice_items (
            clinic_id, invoice_id, service_id, name, unit_price, quantity,
            discount_type, discount_value, discount_amount, line_total, sort_order
          ) values (
            ${clinic.id}, ${invoice.id}, ${line.serviceId}, ${line.name},
            ${line.unitPrice}, ${line.quantity}, ${line.discountType},
            ${line.discountValue}, ${line.discountAmount}, ${line.lineTotal},
            ${line.sortOrder}
          )`;
      }

      if (amountPaid > 0) {
        await sql`
          insert into payments (
            clinic_id, invoice_id, amount, method, received_by, received_at
          ) values (
            ${clinic.id}, ${invoice.id}, ${amountPaid},
            ${pick(["cash", "cash", "card", "card", "bank_transfer"])},
            ${member.id}, ${issuedAt}
          )`;
      }
    }
    console.log(
      `   ${invoiceCount} invoices (${paidCount} paid, ${unpaidCount} outstanding)`,
    );

    // ---- Today's appointments -------------------------------------------
    const slots = spec.match === 0
      ? [
          { h: 10, m: 0,  status: "completed" },
          { h: 11, m: 30, status: "completed" },
          { h: 13, m: 0,  status: "in_progress" },
          { h: 14, m: 30, status: "checked_in" },
          { h: 16, m: 0,  status: "confirmed" },
          { h: 17, m: 30, status: "scheduled" },
        ]
      : [
          { h: 11, m: 0,  status: "completed" },
          { h: 12, m: 30, status: "confirmed" },
          { h: 15, m: 0,  status: "scheduled" },
        ];

    for (const slot of slots) {
      const startsAt = new Date();
      startsAt.setHours(slot.h, slot.m, 0, 0);
      const service = pick(services);
      const endsAt = new Date(
        startsAt.getTime() + service.duration_minutes * 60000,
      );

      const [appointment] = await sql`
        insert into appointments (
          clinic_id, patient_id, practitioner_id, starts_at, ends_at,
          status, created_by, created_at, updated_at
        ) values (
          ${clinic.id}, ${pick(patients).id}, ${member.id},
          ${startsAt}, ${endsAt}, ${slot.status}, ${member.id}, now(), now()
        ) returning *`;

      await sql`
        insert into appointment_services (
          clinic_id, appointment_id, service_id, service_name, price, quantity
        ) values (
          ${clinic.id}, ${appointment.id}, ${service.id},
          ${service.name}, ${service.price}, 1
        )`;
    }
    console.log(`   ${slots.length} appointments today`);
  }

  console.log("\nDone.\n");
  await sql.end();
}

main().catch(async (error) => {
  console.error(error);
  await sql.end();
  process.exit(1);
});
