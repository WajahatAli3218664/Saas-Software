"use client";

/** Paper sizes a clinic can set up a printer for, in PDF points. */
const PAPER: Record<string, { width: number; height: number; margin: number }> = {
  // A4 and A5 keep a normal document margin.
  a4: { width: 595.28, height: 841.89, margin: 24 },
  a5: { width: 419.53, height: 595.28, margin: 18 },
  // Receipt rolls are continuous, so height is a per-page slice rather than a
  // real sheet, and the margin is small because the paper is narrow to start
  // with.
  thermal_80: { width: 226.77, height: 1000, margin: 8 },
  thermal_58: { width: 164.41, height: 1000, margin: 6 },
};

/**
 * Renders the on-screen invoice sheet to a PDF and saves it under the
 * invoice's own name — sidesteps the OS print dialog entirely, since
 * "Microsoft Print to PDF" (the Windows system printer, as opposed to
 * Chrome/Edge's own "Save as PDF" destination) ignores the page title and
 * always prompts for a filename regardless of what document.title says.
 *
 * `paperSize` comes from the clinic's chosen printer; an unknown value falls
 * back to A4 rather than failing, since a saved template could name a size
 * this build no longer knows about.
 */
export async function downloadInvoicePdf(
  filename: string,
  paperSize = "a4",
): Promise<void> {
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
  const paper = PAPER[paperSize] ?? PAPER.a4;
  const { width: pageWidth, height: pageHeight, margin } = paper;

  const pdf = new jsPDF({
    unit: "pt",
    format: [pageWidth, pageHeight],
  });

  const contentWidth = pageWidth - margin * 2;
  const imgHeight = (canvas.height * contentWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = margin;

  pdf.addImage(imgData, "PNG", margin, position, contentWidth, imgHeight);
  heightLeft -= pageHeight - margin * 2;

  // Long invoices (many line items) span more than one page — each subsequent
  // page repeats the same image shifted up, which is how jsPDF's own docs
  // handle a canvas taller than one page.
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
