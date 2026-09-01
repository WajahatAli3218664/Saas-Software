# AesthetIQ

Multi-tenant clinic management, sold as a subscription. One deployment serves
every clinic; each signs up on its own, gets its own staff, catalogue, patients
and invoices, and pays monthly, six-monthly or yearly.

## Stack

| Layer     | Choice                                            |
| --------- | ------------------------------------------------- |
| Framework | Next.js 16 (App Router, Server Actions, Turbopack) |
| Database  | Postgres + Drizzle ORM                             |
| Auth      | Clerk — an organization maps onto a clinic         |
| Billing   | Stripe Subscriptions + Customer Portal             |
| UI        | Tailwind v4, shadcn/ui, Framer Motion              |

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill it in — see below
npm run db:push              # create the tables
npm run dev
```

### Environment

Three services need keys before the app is fully functional. The app builds and
runs without Stripe — billing simply shows plans for reference.

1. **Postgres** — [Neon](https://neon.tech) or any Postgres 15+.
   Set `DATABASE_URL`.
2. **Clerk** — [dashboard.clerk.com](https://dashboard.clerk.com). Create an
   application, **enable Organizations**, then set the publishable and secret
   keys. Add a webhook pointing at `/api/webhooks/clerk` subscribed to
   `organization.*`, `organizationMembership.*` and `user.updated`, and set
   `CLERK_WEBHOOK_SIGNING_SECRET`.
3. **Stripe** — create three products (Starter, Professional, Enterprise) with
   a price for each interval and currency, then paste the price ids into the
   `NEXT_PUBLIC_STRIPE_PRICE_*` variables. Point a webhook at
   `/api/webhooks/stripe` for `checkout.session.completed`,
   `customer.subscription.*` and `invoice.payment_failed`.

## How tenancy works

Every business table carries a `clinic_id`. A Clerk organization id maps onto
exactly one clinic row, and `getTenantSession()` in `src/lib/auth.ts` is the
single door every request goes through — it resolves the clinic, the member and
the subscription once per request and caches the result.

Server actions never trust the client for anything that matters: invoice line
prices are read from the catalogue, and discounts are re-checked against both
the operator's ceiling and the treatment's own cap before a row is written.

## Permissions

A role sets a baseline; per-user grant flags widen it, and can never narrow it.

| Capability      | Owner    | Admin    | Manager | Staff |
| --------------- | -------- | -------- | ------- | ----- |
| Add a service   | ✓        | ✓        | ✓       | grant |
| Change a price  | ✓        | ✓        | ✓       | grant |
| Give a discount | uncapped | uncapped | capped  | grant |
| Void an invoice | ✓        | ✓        | —       | grant |
| Record payment  | ✓        | ✓        | ✓       | ✓     |
| View reports    | ✓        | ✓        | ✓       | grant |
| Manage staff    | ✓        | ✓        | —       | grant |
| Change the plan | ✓        | —        | —       | —     |

Discount permission carries a percentage ceiling alongside the yes/no, set per
person, and each treatment can cap it further.

## Money

Stored as integer minor units — paisa, cents — never floats. Rendered through
`formatMoney` at the edge. Invoice arithmetic applies line discounts first,
then any invoice-level discount on what remains, then tax on the discounted
amount; totals can never go negative.

## Scripts

```bash
npm run dev          # development server
npm run build        # production build
npm run db:generate  # write a migration from schema changes
npm run db:push      # push the schema straight to the database
npm run db:studio    # browse the data
```
