"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toggleService } from "./actions";

export function ServiceToggle({
  serviceId,
  isActive,
  name,
}: {
  serviceId: string;
  isActive: boolean;
  name: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Switch
          checked={isActive}
          disabled={pending}
          aria-label={`${isActive ? "Hide" : "Show"} ${name}`}
          onCheckedChange={(next) => {
            startTransition(async () => {
              const result = await toggleService(serviceId, next);
              if (!result.ok) {
                toast.error(result.error ?? "Could not update that service.");
                return;
              }
              toast.success(
                next ? `${name} is back on the menu` : `${name} hidden`,
              );
            });
          }}
        />
      </TooltipTrigger>
      <TooltipContent>
        {isActive ? "Hide from billing" : "Show on billing"}
      </TooltipContent>
    </Tooltip>
  );
}
