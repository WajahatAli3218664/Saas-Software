"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { removeLogo, setLogoUrl } from "./actions";

/**
 * Two ways in, because a self-hosted deployment may have no blob storage
 * configured: upload a file if the server accepts it, and paste a link if it
 * does not. The link field only appears once an upload has come back saying
 * uploads are switched off, so the common path stays a single button.
 */
export function LogoUploader({ logoUrl }: { logoUrl: string | null }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showUrlField, setShowUrlField] = useState(false);
  const [url, setUrl] = useState("");
  const [pending, startTransition] = useTransition();

  async function onFile(file: File) {
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/upload/logo", { method: "POST", body });
      const data = (await response.json()) as { url?: string; error?: string };

      if (!response.ok) {
        // 501 means the deployment has no blob storage — offer the paste
        // route rather than leaving the user stuck.
        if (response.status === 501) setShowUrlField(true);
        toast.error(data.error ?? "Could not upload that image.");
        return;
      }

      toast.success("Logo updated");
      router.refresh();
    } catch {
      toast.error("Could not upload that image.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function saveUrl() {
    startTransition(async () => {
      const result = await setLogoUrl(url);
      if (result.ok) {
        toast.success("Logo updated");
        setUrl("");
        router.refresh();
        return;
      }
      toast.error(result.error ?? "Could not save that link.");
    });
  }

  function clear() {
    startTransition(async () => {
      const result = await removeLogo();
      if (result.ok) {
        toast.success("Logo removed");
        router.refresh();
        return;
      }
      toast.error(result.error ?? "Could not remove the logo.");
    });
  }

  return (
    <section className="bg-card flex flex-col gap-4 rounded-lg border p-4">
      <div>
        <h2 className="font-medium">Clinic logo</h2>
        <p className="text-muted-foreground text-sm">
          Printed at the top of every invoice. A square PNG works best.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="bg-muted grid size-20 shrink-0 place-items-center overflow-hidden rounded-lg border">
          {logoUrl ? (
            // Not next/image: the URL is whatever the clinic pasted or
            // uploaded, so it cannot be in the configured remote patterns.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt="Your clinic logo"
              className="size-full object-contain"
            />
          ) : (
            <ImagePlus className="text-muted-foreground size-7" aria-hidden />
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void onFile(file);
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <ImagePlus className="size-4" aria-hidden />
            )}
            {uploading
              ? "Uploading…"
              : logoUrl
                ? "Replace logo"
                : "Upload a logo"}
          </Button>

          {logoUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={clear}
            >
              <Trash2 className="size-4" aria-hidden />
              Remove
            </Button>
          )}
        </div>
      </div>

      {showUrlField && (
        <div className="grid gap-1.5 rounded-md border border-dashed p-3">
          <Label htmlFor="logoUrl">Paste a link to your logo instead</Label>
          <p className="text-muted-foreground text-xs">
            File uploads are not switched on for this installation. Any public
            image link will work.
          </p>
          <div className="flex gap-2">
            <Input
              id="logoUrl"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://…"
            />
            <Button
              type="button"
              size="sm"
              disabled={pending || !url.trim()}
              onClick={saveUrl}
            >
              Save
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
