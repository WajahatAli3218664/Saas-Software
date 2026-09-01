"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
import type { Member, MemberRole } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { updateMemberGrants } from "../actions";

const GRANTS = [
  {
    key: "canCreateServices",
    label: "Add and edit services",
    help: "Put new treatments on the menu",
  },
  {
    key: "canEditPrices",
    label: "Change prices",
    help: "Reprice anything in the catalogue",
  },
  {
    key: "canGiveDiscount",
    label: "Give discounts",
    help: "Up to the ceiling set below",
  },
  {
    key: "canVoidInvoice",
    label: "Void invoices",
    help: "Cancel a bill already issued",
  },
  {
    key: "canViewReports",
    label: "See takings and reports",
    help: "Revenue figures across the clinic",
  },
  {
    key: "canManageStaff",
    label: "Manage staff",
    help: "Invite people and set their access",
  },
] as const;

type GrantKey = (typeof GRANTS)[number]["key"];

export function StaffRow({
  member,
  isSelf,
  editable,
}: {
  member: Member;
  isSelf: boolean;
  editable: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [role, setRole] = useState<MemberRole>(member.role);
  const [grants, setGrants] = useState<Record<GrantKey, boolean>>({
    canCreateServices: member.canCreateServices,
    canEditPrices: member.canEditPrices,
    canGiveDiscount: member.canGiveDiscount,
    canVoidInvoice: member.canVoidInvoice,
    canViewReports: member.canViewReports,
    canManageStaff: member.canManageStaff,
  });
  const [maxDiscount, setMaxDiscount] = useState(
    String(Number(member.maxDiscountPercent)),
  );
  const [isActive, setIsActive] = useState(member.isActive);

  function save() {
    startTransition(async () => {
      const result = await updateMemberGrants(member.id, {
        role,
        ...grants,
        maxDiscountPercent: Number(maxDiscount) || 0,
        isActive,
      });

      if (!result.ok) {
        toast.error(result.error ?? "Could not save those permissions.");
        return;
      }

      toast.success(`${member.fullName}'s access updated`);
      setOpen(false);
    });
  }

  const initials = member.fullName
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="border-b last:border-0">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <Avatar className="size-8">
          {member.avatarUrl && <AvatarImage src={member.avatarUrl} alt="" />}
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "truncate font-medium",
                !member.isActive && "text-muted-foreground line-through",
              )}
            >
              {member.fullName}
            </span>
            {isSelf && (
              <span className="text-muted-foreground text-xs">(you)</span>
            )}
          </div>
          <div className="text-muted-foreground truncate text-xs">
            {member.email}
          </div>
        </div>

        <span className="bg-muted rounded-full px-2 py-0.5 text-xs font-medium capitalize">
          {member.role}
        </span>

        {editable && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            Access
            <ChevronDown
              className={cn(
                "size-3.5 transition-transform",
                open && "rotate-180",
              )}
              aria-hidden
            />
          </Button>
        )}
      </div>

      {open && editable && (
        <div className="bg-muted/30 flex flex-col gap-5 border-t px-4 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor={`role-${member.id}`}>Role</Label>
              <Select
                value={role}
                onValueChange={(v) => setRole(v as MemberRole)}
                disabled={member.role === "owner"}
              >
                <SelectTrigger id={`role-${member.id}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {member.role === "owner" && (
                    <SelectItem value="owner">Owner</SelectItem>
                  )}
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                The role sets a baseline. The switches below can only widen it.
              </p>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor={`discount-${member.id}`}>
                Largest discount they may give (%)
              </Label>
              <Input
                id={`discount-${member.id}`}
                type="number"
                min={0}
                max={100}
                value={maxDiscount}
                onChange={(e) => setMaxDiscount(e.target.value)}
                disabled={!grants.canGiveDiscount}
                className="tabular-nums"
              />
              <p className="text-muted-foreground text-xs">
                A treatment&apos;s own limit still applies on top of this.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {GRANTS.map((grant) => (
              <div
                key={grant.key}
                className="flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <Label
                    htmlFor={`${grant.key}-${member.id}`}
                    className="font-normal"
                  >
                    {grant.label}
                  </Label>
                  <p className="text-muted-foreground text-xs">{grant.help}</p>
                </div>
                <Switch
                  id={`${grant.key}-${member.id}`}
                  checked={grants[grant.key]}
                  onCheckedChange={(next) =>
                    setGrants((current) => ({ ...current, [grant.key]: next }))
                  }
                />
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            <div className="flex items-center gap-2">
              <Switch
                id={`active-${member.id}`}
                checked={isActive}
                onCheckedChange={setIsActive}
                disabled={isSelf}
              />
              <Label htmlFor={`active-${member.id}`} className="font-normal">
                Account active
              </Label>
            </div>

            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={save} disabled={pending}>
                {pending ? "Saving…" : "Save access"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
