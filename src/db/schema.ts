import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  numeric,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/* ---------------------------------------------------------------------------
 * Enums
 * ------------------------------------------------------------------------- */

export const planTierEnum = pgEnum("plan_tier", [
  "trial",
  "starter",
  "professional",
  "enterprise",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "trialing",
  "active",
  "past_due",
  "canceled",
  "paused",
]);

export const billingIntervalEnum = pgEnum("billing_interval", [
  "monthly",
  "biannual",
  "annual",
]);

export const memberRoleEnum = pgEnum("member_role", [
  "owner",
  "admin",
  "manager",
  "staff",
]);

export const appointmentStatusEnum = pgEnum("appointment_status", [
  "scheduled",
  "confirmed",
  "checked_in",
  "in_progress",
  "completed",
  "cancelled",
  "no_show",
]);

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "unpaid",
  "partial",
  "paid",
  "refunded",
  "void",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "cash",
  "card",
  "bank_transfer",
  "wallet",
  "other",
]);

export const genderEnum = pgEnum("gender", ["male", "female", "other"]);

export const discountTypeEnum = pgEnum("discount_type", ["percent", "fixed"]);

/* ---------------------------------------------------------------------------
 * Tenancy — every business-domain table carries clinicId.
 * ------------------------------------------------------------------------- */

export const clinics = pgTable(
  "clinics",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // Clerk organization id — the bridge between auth and tenancy.
    clerkOrgId: text("clerk_org_id").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    logoUrl: text("logo_url"),
    email: text("email"),
    phone: text("phone"),
    addressLine: text("address_line"),
    city: text("city"),
    country: text("country").notNull().default("PK"),
    // ISO-4217. Drives every money field rendered for this tenant.
    currency: text("currency").notNull().default("PKR"),
    timezone: text("timezone").notNull().default("Asia/Karachi"),
    // Printed on invoices: NTN / VAT / tax registration number.
    taxLabel: text("tax_label"),
    taxNumber: text("tax_number"),
    taxPercent: numeric("tax_percent", { precision: 5, scale: 2 })
      .notNull()
      .default("0"),
    invoicePrefix: text("invoice_prefix").notNull().default("INV"),
    invoiceFooter: text("invoice_footer"),
    onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("clinics_clerk_org_id_key").on(t.clerkOrgId),
    uniqueIndex("clinics_slug_key").on(t.slug),
  ],
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    tier: planTierEnum("tier").notNull().default("trial"),
    status: subscriptionStatusEnum("status").notNull().default("trialing"),
    interval: billingIntervalEnum("interval").notNull().default("monthly"),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    stripePriceId: text("stripe_price_id"),
    // Denormalised from Stripe so the paywall never needs a network call.
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    seatsPurchased: integer("seats_purchased").notNull().default(3),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("subscriptions_clinic_id_key").on(t.clinicId),
    index("subscriptions_stripe_sub_idx").on(t.stripeSubscriptionId),
  ],
);

export const members = pgTable(
  "members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    clerkUserId: text("clerk_user_id").notNull(),
    email: text("email").notNull(),
    fullName: text("full_name").notNull(),
    avatarUrl: text("avatar_url"),
    role: memberRoleEnum("role").notNull().default("staff"),
    // Per-user grants the boss asked for by name. Role sets the baseline;
    // these override it for one individual.
    canCreateServices: boolean("can_create_services").notNull().default(false),
    canEditPrices: boolean("can_edit_prices").notNull().default(false),
    canGiveDiscount: boolean("can_give_discount").notNull().default(false),
    // Ceiling on a single discount, in percent. 0 = no cap beyond the flag.
    maxDiscountPercent: numeric("max_discount_percent", {
      precision: 5,
      scale: 2,
    })
      .notNull()
      .default("0"),
    canVoidInvoice: boolean("can_void_invoice").notNull().default(false),
    canViewReports: boolean("can_view_reports").notNull().default(false),
    canManageStaff: boolean("can_manage_staff").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("members_clinic_user_key").on(t.clinicId, t.clerkUserId),
    index("members_clinic_idx").on(t.clinicId),
  ],
);

/* ---------------------------------------------------------------------------
 * Catalogue
 * ------------------------------------------------------------------------- */

export const serviceCategories = pgTable(
  "service_categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    colorHex: text("color_hex").notNull().default("#6366f1"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("service_categories_clinic_idx").on(t.clinicId)],
);

export const services = pgTable(
  "services",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => serviceCategories.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    description: text("description"),
    // Minor units (paisa/cents) — integers only, never floats for money.
    price: integer("price").notNull().default(0),
    durationMinutes: integer("duration_minutes").notNull().default(30),
    // Optional per-service cap so staff cannot discount a loss-leader.
    maxDiscountPercent: numeric("max_discount_percent", {
      precision: 5,
      scale: 2,
    })
      .notNull()
      .default("100"),
    isActive: boolean("is_active").notNull().default(true),
    createdBy: uuid("created_by").references(() => members.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("services_clinic_idx").on(t.clinicId),
    index("services_clinic_active_idx").on(t.clinicId, t.isActive),
  ],
);

/* ---------------------------------------------------------------------------
 * Patients & scheduling
 * ------------------------------------------------------------------------- */

export const patients = pgTable(
  "patients",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    // Human-facing sequential id, unique per clinic (e.g. P-0042).
    code: text("code").notNull(),
    fullName: text("full_name").notNull(),
    phone: text("phone"),
    email: text("email"),
    gender: genderEnum("gender"),
    dateOfBirth: timestamp("date_of_birth", { withTimezone: false }),
    addressLine: text("address_line"),
    city: text("city"),
    // Free-form clinical notes; aesthetic clinics keep allergies here.
    notes: text("notes"),
    allergies: text("allergies"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("patients_clinic_code_key").on(t.clinicId, t.code),
    index("patients_clinic_idx").on(t.clinicId),
    index("patients_clinic_phone_idx").on(t.clinicId, t.phone),
  ],
);

export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    // The staff member performing the treatment.
    practitionerId: uuid("practitioner_id").references(() => members.id, {
      onDelete: "set null",
    }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    status: appointmentStatusEnum("status").notNull().default("scheduled"),
    notes: text("notes"),
    createdBy: uuid("created_by").references(() => members.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("appointments_clinic_starts_idx").on(t.clinicId, t.startsAt),
    index("appointments_patient_idx").on(t.patientId),
  ],
);

export const appointmentServices = pgTable(
  "appointment_services",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    appointmentId: uuid("appointment_id")
      .notNull()
      .references(() => appointments.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id").references(() => services.id, {
      onDelete: "set null",
    }),
    // Snapshot: the catalogue may change after the appointment is booked.
    serviceName: text("service_name").notNull(),
    price: integer("price").notNull(),
    quantity: integer("quantity").notNull().default(1),
  },
  (t) => [index("appointment_services_appt_idx").on(t.appointmentId)],
);

/* ---------------------------------------------------------------------------
 * Billing
 * ------------------------------------------------------------------------- */

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    // Rendered number, e.g. INV-000123. Unique within the clinic.
    number: text("number").notNull(),
    patientId: uuid("patient_id").references(() => patients.id, {
      onDelete: "set null",
    }),
    appointmentId: uuid("appointment_id").references(() => appointments.id, {
      onDelete: "set null",
    }),
    status: invoiceStatusEnum("status").notNull().default("unpaid"),
    // All money in minor units. subtotal - discount + tax = total.
    subtotal: integer("subtotal").notNull().default(0),
    discountType: discountTypeEnum("discount_type"),
    discountValue: numeric("discount_value", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    discountAmount: integer("discount_amount").notNull().default(0),
    taxAmount: integer("tax_amount").notNull().default(0),
    total: integer("total").notNull().default(0),
    amountPaid: integer("amount_paid").notNull().default(0),
    notes: text("notes"),
    issuedAt: timestamp("issued_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // Who authorised the discount — the audit trail the boss implied.
    discountApprovedBy: uuid("discount_approved_by").references(
      () => members.id,
      { onDelete: "set null" },
    ),
    createdBy: uuid("created_by").references(() => members.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("invoices_clinic_number_key").on(t.clinicId, t.number),
    index("invoices_clinic_issued_idx").on(t.clinicId, t.issuedAt),
    index("invoices_patient_idx").on(t.patientId),
  ],
);

export const invoiceItems = pgTable(
  "invoice_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    serviceId: uuid("service_id").references(() => services.id, {
      onDelete: "set null",
    }),
    // Snapshot of name and price at the moment of sale.
    name: text("name").notNull(),
    unitPrice: integer("unit_price").notNull(),
    quantity: integer("quantity").notNull().default(1),
    discountType: discountTypeEnum("discount_type"),
    discountValue: numeric("discount_value", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    discountAmount: integer("discount_amount").notNull().default(0),
    lineTotal: integer("line_total").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("invoice_items_invoice_idx").on(t.invoiceId)],
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    method: paymentMethodEnum("method").notNull().default("cash"),
    reference: text("reference"),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    receivedBy: uuid("received_by").references(() => members.id, {
      onDelete: "set null",
    }),
  },
  (t) => [
    index("payments_invoice_idx").on(t.invoiceId),
    index("payments_clinic_received_idx").on(t.clinicId, t.receivedAt),
  ],
);

/* ---------------------------------------------------------------------------
 * Printing — browser-print templates, saved per clinic.
 * ------------------------------------------------------------------------- */

export const printTemplates = pgTable(
  "print_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // "a4" | "a5" | "thermal_80" | "thermal_58"
    paperSize: text("paper_size").notNull().default("a4"),
    showLogo: boolean("show_logo").notNull().default(true),
    showTax: boolean("show_tax").notNull().default(true),
    headerText: text("header_text"),
    footerText: text("footer_text"),
    // Reserved for per-template layout tweaks without a migration.
    settings: jsonb("settings").$type<Record<string, unknown>>(),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("print_templates_clinic_idx").on(t.clinicId)],
);

/* ---------------------------------------------------------------------------
 * Audit trail
 * ------------------------------------------------------------------------- */

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id, { onDelete: "cascade" }),
    memberId: uuid("member_id").references(() => members.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("audit_logs_clinic_created_idx").on(t.clinicId, t.createdAt)],
);

/* ---------------------------------------------------------------------------
 * Relations
 * ------------------------------------------------------------------------- */

export const clinicsRelations = relations(clinics, ({ one, many }) => ({
  subscription: one(subscriptions),
  members: many(members),
  services: many(services),
  patients: many(patients),
  invoices: many(invoices),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  clinic: one(clinics, {
    fields: [subscriptions.clinicId],
    references: [clinics.id],
  }),
}));

export const membersRelations = relations(members, ({ one }) => ({
  clinic: one(clinics, {
    fields: [members.clinicId],
    references: [clinics.id],
  }),
}));

export const serviceCategoriesRelations = relations(
  serviceCategories,
  ({ one, many }) => ({
    clinic: one(clinics, {
      fields: [serviceCategories.clinicId],
      references: [clinics.id],
    }),
    services: many(services),
  }),
);

export const servicesRelations = relations(services, ({ one }) => ({
  clinic: one(clinics, {
    fields: [services.clinicId],
    references: [clinics.id],
  }),
  category: one(serviceCategories, {
    fields: [services.categoryId],
    references: [serviceCategories.id],
  }),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  clinic: one(clinics, {
    fields: [patients.clinicId],
    references: [clinics.id],
  }),
  appointments: many(appointments),
  invoices: many(invoices),
}));

export const appointmentsRelations = relations(
  appointments,
  ({ one, many }) => ({
    clinic: one(clinics, {
      fields: [appointments.clinicId],
      references: [clinics.id],
    }),
    patient: one(patients, {
      fields: [appointments.patientId],
      references: [patients.id],
    }),
    practitioner: one(members, {
      fields: [appointments.practitionerId],
      references: [members.id],
    }),
    services: many(appointmentServices),
  }),
);

export const appointmentServicesRelations = relations(
  appointmentServices,
  ({ one }) => ({
    appointment: one(appointments, {
      fields: [appointmentServices.appointmentId],
      references: [appointments.id],
    }),
    service: one(services, {
      fields: [appointmentServices.serviceId],
      references: [services.id],
    }),
  }),
);

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  clinic: one(clinics, {
    fields: [invoices.clinicId],
    references: [clinics.id],
  }),
  patient: one(patients, {
    fields: [invoices.patientId],
    references: [patients.id],
  }),
  appointment: one(appointments, {
    fields: [invoices.appointmentId],
    references: [appointments.id],
  }),
  items: many(invoiceItems),
  payments: many(payments),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
  service: one(services, {
    fields: [invoiceItems.serviceId],
    references: [services.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  invoice: one(invoices, {
    fields: [payments.invoiceId],
    references: [invoices.id],
  }),
}));

/* ---------------------------------------------------------------------------
 * Inferred types
 * ------------------------------------------------------------------------- */

export type Clinic = typeof clinics.$inferSelect;
export type NewClinic = typeof clinics.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type Member = typeof members.$inferSelect;
export type NewMember = typeof members.$inferInsert;
export type Service = typeof services.$inferSelect;
export type NewService = typeof services.$inferInsert;
export type ServiceCategory = typeof serviceCategories.$inferSelect;
export type Patient = typeof patients.$inferSelect;
export type NewPatient = typeof patients.$inferInsert;
export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;
export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type PrintTemplate = typeof printTemplates.$inferSelect;
export type MemberRole = (typeof memberRoleEnum.enumValues)[number];
export type PlanTier = (typeof planTierEnum.enumValues)[number];
