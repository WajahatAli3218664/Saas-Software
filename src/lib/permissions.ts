import type { Member, MemberRole } from "@/db/schema";

/**
 * Every capability the app gates on. Adding one here forces every role table
 * below to answer for it, so a new permission can never be silently ungranted.
 */
export const PERMISSIONS = [
  "clinic:manage", // rename clinic, logo, tax, invoice settings
  "billing:manage", // change plan, payment method, cancel
  "staff:manage", // invite, deactivate, change roles and grants
  "service:create", // add a new service to the catalogue
  "service:edit_price", // change the price of an existing service
  "service:delete",
  "patient:create",
  "patient:edit",
  "patient:delete",
  "appointment:manage",
  "invoice:create",
  "invoice:discount", // apply any discount at all
  "invoice:void",
  "payment:record",
  "report:view",
  "settings:print", // edit print templates
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/**
 * Permissions controlled by a grant flag on the member record. These are
 * never part of a role's fixed baseline below — including the owner's —
 * because a flag that a hardcoded baseline overrides is not really a
 * switch. An owner is provisioned with every one of these flags on (see
 * provisionClinic), so a fresh owner still has full access; turning one off
 * is meant to actually take it away, including from themselves.
 */
const GRANT_PERMISSIONS: Array<{
  flag: keyof Member;
  grants: readonly Permission[];
}> = [
  { flag: "canCreateServices", grants: ["service:create"] },
  { flag: "canEditPrices", grants: ["service:edit_price"] },
  { flag: "canGiveDiscount", grants: ["invoice:discount"] },
  { flag: "canVoidInvoice", grants: ["invoice:void"] },
  { flag: "canViewReports", grants: ["report:view"] },
  { flag: "canManageStaff", grants: ["staff:manage"] },
];

const GRANT_CONTROLLED: ReadonlySet<Permission> = new Set(
  GRANT_PERMISSIONS.flatMap((g) => g.grants),
);

/**
 * Fixed role baselines, excluding anything a grant flag controls (see
 * GRANT_PERMISSIONS) — those are resolved separately in resolvePermissions
 * regardless of role, so a flag actually governs the permission it names.
 */
const ROLE_PERMISSIONS: Record<MemberRole, readonly Permission[]> = {
  owner: PERMISSIONS.filter((p) => !GRANT_CONTROLLED.has(p)),
  admin: (
    [
      "clinic:manage",
      "staff:manage",
      "service:create",
      "service:edit_price",
      "service:delete",
      "patient:create",
      "patient:edit",
      "patient:delete",
      "appointment:manage",
      "invoice:create",
      "invoice:discount",
      "invoice:void",
      "payment:record",
      "report:view",
      "settings:print",
    ] as const
  ).filter((p) => !GRANT_CONTROLLED.has(p)),
  manager: (
    [
      "service:create",
      "service:edit_price",
      "patient:create",
      "patient:edit",
      "appointment:manage",
      "invoice:create",
      "invoice:discount",
      "payment:record",
      "report:view",
    ] as const
  ).filter((p) => !GRANT_CONTROLLED.has(p)),
  staff: [
    "patient:create",
    "patient:edit",
    "appointment:manage",
    "invoice:create",
    "payment:record",
  ],
};

export function resolvePermissions(member: Member): Set<Permission> {
  const resolved = new Set<Permission>(ROLE_PERMISSIONS[member.role]);

  for (const { flag, grants } of GRANT_PERMISSIONS) {
    if (member[flag] === true) {
      for (const permission of grants) resolved.add(permission);
    }
  }

  return resolved;
}

export function can(member: Member, permission: Permission): boolean {
  if (!member.isActive) return false;
  return resolvePermissions(member).has(permission);
}

/**
 * Discounts need a ceiling as well as a yes/no. An owner is uncapped; everyone
 * else is held to maxDiscountPercent, where 0 means "no explicit cap set" and
 * therefore falls back to blocking any discount for non-owners.
 */
export function maxDiscountFor(member: Member): number {
  if (!can(member, "invoice:discount")) return 0;
  if (member.role === "owner" || member.role === "admin") {
    const cap = Number(member.maxDiscountPercent);
    return cap > 0 ? cap : 100;
  }
  return Number(member.maxDiscountPercent) || 0;
}

export class PermissionError extends Error {
  constructor(public readonly permission: Permission) {
    super(`Missing permission: ${permission}`);
    this.name = "PermissionError";
  }
}

export function assertCan(member: Member, permission: Permission): void {
  if (!can(member, permission)) throw new PermissionError(permission);
}
