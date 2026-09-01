"use client";

/**
 * Renders the on-screen invoice sheet to a PDF and saves it under the
 * invoice's own name — sidesteps the OS print dialog entirely, since
 * "Microsoft Print to PDF" (the Windows system printer, as opposed to
 * Chrome/Edge's own "Save as PDF" destination) ignores the page title and
 * always prompts for a filename regardless of what document.title says.
 */
export async function downloadInvoicePdf(filename: string): Promise<void> {
  const element = document.getElementById("invoice-sheet");
  if (!element) throw new Error("Could not find the invoice to export.");

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas-pro"),
    import("jspdf"),
  ]);

  // Rendered against the page's own background so a dark-theme viewer still
  // gets a normal white receipt — that's what the printed original assumes.
  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
  });

  const imgData = canvas.toDataURL("image/png");

  // A4 in points, matching the print stylesheet's own paper size.
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 24;

  const pdf = new jsPDF({ unit: "pt", format: "a4" });

  const contentWidth = pageWidth - margin * 2;
  const imgHeight = (canvas.height * contentWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = margin;

  pdf.addImage(imgData, "PNG", margin, position, contentWidth, imgHeight);
  heightLeft -= pageHeight - margin * 2;

  // Long invoices (many line items) span more than one A4 page — each
  // subsequent page repeats the same image shifted up, which is how jsPDF's
  // own docs handle a canvas taller than one page.
  while (heightLeft > 0) {
    position = heightLeft - imgHeight - margin;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", margin, position, contentWidth, imgHeight);
    heightLeft -= pageHeight - margin * 2;
  }

  pdf.save(`${filename}.pdf`);
}

/** Strips characters Windows and macOS both refuse in a filename. */
export function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "-").trim();
}
