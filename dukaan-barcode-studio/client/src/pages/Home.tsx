import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import JsBarcode from "jsbarcode";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import {
  ArrowRight,
  BadgeIndianRupee,
  Barcode,
  BookOpen,
  ChevronDown,
  CircleHelp,
  CloudUpload,
  Download,
  FileSpreadsheet,
  FileText,
  IndianRupee,
  Languages,
  LayoutGrid,
  Minus,
  MoreHorizontal,
  Plus,
  Printer,
  ScanLine,
  Scale,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import LabelDesigner from "@/components/LabelDesigner";

interface Product {
  id: number;
  name: string;
  code: string;
  price: number;
  mrp?: number;
  qty?: number;
  unit?: string;
  plu?: string;
  unitPrice?: number;
  weight?: number;
  totalPrice?: number;
  packedDate?: string;
  useByDate?: string;
  labelTemplate?: string;
  extraFields?: { label: string; value: string }[];
  copies: number;
}

type Language = "en" | "hi";
type LabelMode = "pc" | "weight";

const copy = {
  en: {
    navStudio: "Studio",
    navGuide: "How it works",
    navPricing: "Pricing",
    navHelp: "Help",
    launch: "Open workspace",
    heroEyebrow: "Built for Indian retail",
    heroTitle: "Create Barcodes & Product Labels in Minutes",
    heroBody: "Upload your Excel or CSV product list, generate Code-128 barcodes, print A4 sheets, create MRP stickers, and export PLU data for weighing scales.",
    heroTagline: "Create Barcodes. Print Labels. Manage Your Products.",
    heroHindiTagline: "Barcode banayein, labels print karein, aur products manage karein — aasani se.",
    importProducts: "Import products",
    seeSample: "See sample data",
    uploadTitle: "Bring your product list",
    uploadBody: "Drop an Excel or CSV file. Common fields are mapped automatically and custom columns are preserved.",
    browse: "Browse files",
    sample: "Download sample",
    products: "Products",
    rowsReady: "rows ready",
    preview: "Preview",
    barcodeSheet: "Barcode sheet",
    pluExport: "PLU export",
    mrpPdf: "MRP sticker PDF",
    product: "Product",
    barcode: "Barcode",
    price: "Price",
    labels: "Labels",
    action: "Action",
    generate: "Generate sheet",
    export: "Export PLU CSV",
    sticker: "Generate MRP PDF",
    labelType: "Label type",
    pcLabel: "PC / piece label",
    weightLabel: "Weight label",
    mappedFields: "Mapped fields",
    emptyTitle: "Your workspace is ready",
    emptyBody: "Import your Excel or CSV file to preview your products and print labels.",
    workflowTitle: "Everything you need between shelf and scanner.",
    workflowBody: "A focused workflow for shop owners, distributors, and billing teams. No spreadsheet gymnastics.",
    step1: "Import",
    step1Body: "Upload your product list in Excel or CSV. Column matching is automatic.",
    step2: "Review",
    step2Body: "Check names, prices, codes, and the exact number of labels you need.",
    step3: "Print & export",
    step3Body: "Print an A4 sheet or export an Essae-compatible PLU CSV.",
    footer: "Made for the rhythm of Indian retail.",
  },
  hi: {
    navStudio: "स्टूडियो",
    navGuide: "कैसे काम करता है",
    navPricing: "प्लान",
    navHelp: "मदद",
    launch: "वर्कस्पेस खोलें",
    heroEyebrow: "भारतीय रिटेल के लिए",
    heroTitle: "मिनटों में Barcode और Product Labels बनाएं",
    heroBody: "अपनी प्रोडक्ट लिस्ट से Code-128 बारकोड, Essae के लिए PLU फाइल और MRP स्टिकर शीट मिनटों में बनाएं।",
    heroTagline: "Create Barcodes. Print Labels. Manage Your Products.",
    heroHindiTagline: "Barcode banayein, labels print karein, aur products manage karein — aasani se.",
    importProducts: "प्रोडक्ट इम्पोर्ट करें",
    seeSample: "सैंपल देखें",
    uploadTitle: "अपनी प्रोडक्ट लिस्ट लाएं",
    uploadBody: "Excel या CSV फाइल डालें। आम फ़ील्ड अपने आप मैप होंगे और बाकी कॉलम भी सुरक्षित रहेंगे।",
    browse: "फाइल चुनें",
    sample: "सैंपल डाउनलोड करें",
    products: "प्रोडक्ट",
    rowsReady: "रो तैयार",
    preview: "प्रीव्यू",
    barcodeSheet: "बारकोड शीट",
    pluExport: "PLU एक्सपोर्ट",
    mrpPdf: "MRP स्टिकर PDF",
    product: "प्रोडक्ट",
    barcode: "बारकोड",
    price: "कीमत",
    labels: "लेबल",
    action: "एक्शन",
    generate: "शीट बनाएं",
    export: "PLU CSV एक्सपोर्ट",
    sticker: "MRP PDF बनाएं",
    labelType: "लेबल प्रकार",
    pcLabel: "PC / पीस लेबल",
    weightLabel: "वजन लेबल",
    mappedFields: "मैप किए गए फ़ील्ड",
    emptyTitle: "आपका वर्कस्पेस तैयार है",
    emptyBody: "अपनी Excel या CSV फाइल इम्पोर्ट करके प्रोडक्ट और लेबल प्रीव्यू करें।",
    workflowTitle: "शेल्फ और स्कैनर के बीच सब कुछ।",
    workflowBody: "दुकानदार, डिस्ट्रीब्यूटर और बिलिंग टीम के लिए आसान वर्कफ्लो।",
    step1: "इम्पोर्ट",
    step1Body: "Excel या CSV में प्रोडक्ट लिस्ट डालें। कॉलम अपने आप पहचानें जाएंगे।",
    step2: "जांचें",
    step2Body: "नाम, कीमत, कोड और लेबल की संख्या चेक करें।",
    step3: "प्रिंट और एक्सपोर्ट",
    step3Body: "A4 शीट प्रिंट करें या Essae-compatible PLU CSV एक्सपोर्ट करें।",
    footer: "भारतीय रिटेल की रफ्तार के लिए बनाया गया।",
  },
} as const;

function formatPrice(price: number) {
  return `₹${price.toLocaleString("en-IN")}`;
}

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function BarcodeMark({ value, compact = false }: { value: string; compact?: boolean }) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: "CODE128",
          width: compact? 1.25 : 1.45,
          height: compact? 28 : 42,
          displayValue: false,
          margin: 0,
          lineColor: "#101b2d",
          background: "transparent",
        });
      } catch {
        // Invalid codes are kept visible in the table and simply do not render bars.
      }
    }
  }, [value, compact]);

  return <svg ref={svgRef} className={compact? "barcode-svg barcode-svg--compact" : "barcode-svg"} aria-label={`Barcode ${value}`} />;
}

function Logo() {
  return (
    <div className="brand-lockup">
      <div className="brand-mark" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      <div>
        <div className="brand-name">dukaan</div>
        <div className="brand-product">BARCODE STUDIO</div>
      </div>
    </div>
  );
}

function SectionKicker({ children, tone = "lime" }: { children: ReactNode; tone?: "lime" | "coral" }) {
  return <div className={`section-kicker section-kicker--${tone}`}><span className="kicker-dot" />{children}</div>;
}

function StepCard({ number, icon: Icon, title, body }: { number: string; icon: typeof Upload; title: string; body: string }) {
  return (
    <div className="step-card">
      <div className="step-topline">
        <div className="step-icon"><Icon size={18} strokeWidth={2.2} /></div>
        <span>{number}</span>
      </div>
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  );
}

export default function Home() {
  const [language, setLanguage] = useState<Language>("en");
  const [products, setProducts] = useState<Product[]>([]);
  const [activeSection, setActiveSection] = useState("studio");
  const [isDragging, setIsDragging] = useState(false);
  const [labelMode, setLabelMode] = useState<LabelMode>("pc");
  const [mappedFields, setMappedFields] = useState<string[]>(["Name", "Code", "Price", "MRP", "Qty", "Unit"]);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const t = copy[language];

  const labelCount = useMemo(() => products.reduce((total, item) => total + item.copies, 0), [products]);
  const uniqueCount = products.length;

  const updateProduct = (id: number, field: keyof Product, value: string | number) => {
    setProducts((current) => current.map((product) => product.id === id? {...product, [field]: value } : product));
  };

  const normalizeHeader = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
  const numberValue = (value: unknown) => Number(String(value?? "").replace(/[^0-9.]/g, "")) || 0;

  // ==================== UNIVERSAL PARSER - FIXED FOR CSV + XLSX ====================
  // First row is ALWAYS treated as headers and shown in Mapped fields
  const parseWorkbook = (file: File) => {
    const isCSV = file.name.toLowerCase().endsWith(".csv");

    if (isCSV) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = String(event.target?.result || "");
          const lines = text.split(/\r?\n/).filter((l) => l.trim()!== "");
          if (!lines.length) {
            toast.error("CSV is empty");
            return;
          }
          const headers = lines[0].split(",").map((h) => h.trim());
          // SHOW FIRST ROW IN MAPPED FIELDS - AS YOU ASKED
          setMappedFields(headers);

          const rows = lines.slice(1).map((line) => {
            const cols = line.split(",");
            const obj: Record<string, unknown> = {};
            headers.forEach((h, i) => {
              obj[normalizeHeader(h)] = cols[i]?.trim()?? "";
            });
            return obj;
          });

          const get = (row: Record<string, unknown>, keys: string[]) => {
            for (const k of keys) {
              const nk = normalizeHeader(k);
              if (row[nk]!== undefined && String(row[nk]).trim()!== "") return row[nk];
              const found = Object.keys(row).find((rk) => rk.includes(nk) || nk.includes(rk));
              if (found && String(row[found]).trim()!== "") return row[found];
            }
            return "";
          };

          const mapped = rows
           .map((row, index) => {
              const name = get(row, ["pluname", "item name", "itemname", "product name", "name", "product", "item"]);
              const code = get(row, ["plucode", "barcode", "item code", "code", "sku"]);
              const price = get(row, ["unitprice", "price", "mrp", "rate"]);
              const qty = get(row, ["qty", "quantity"]);
              const plu = get(row, ["plu no", "plu number", "pluno", "plu"]);
              const unit = get(row, ["uom", "unit"]);
              const prodDate = get(row, ["production date", "packed date"]);
              const expDate = get(row, ["usebydate", "expiry date"]);

              const qtyNum = numberValue(qty) || 1;

              return {
                id: Date.now() + index,
                name: String(name).trim() || `Product ${index + 1}`,
                code: String(code).trim() || String(plu).trim() || `CODE${index + 1}`,
                price: numberValue(price),
                mrp: numberValue(price),
                qty: qtyNum,
                unit: String(unit || "pc").trim(),
                plu: String(plu || "").trim(),
                unitPrice: numberValue(price),
                weight: 0,
                totalPrice: numberValue(price),
                packedDate: String(prodDate || "").trim(),
                useByDate: String(expDate || "").trim(),
                labelTemplate: labelMode === "pc"? "1" : "2",
                extraFields: [],
                copies: Math.max(1, Math.min(20, Math.floor(qtyNum) || 1)),
              };
            })
           .filter((item) => item.name && item.code);

          if (!mapped.length) {
            toast.error(`We couldn't find product rows. Headers found: ${headers.join(", ")}`);
            return;
          }

          setProducts(mapped);
          toast.success(`${mapped.length} products imported from ${file.name}`);
          setActiveSection("studio");
        } catch (err) {
          console.error(err);
          toast.error("That file could not be read. Please upload a CSV or Excel file.");
        }
      };
      reader.readAsText(file);
      return;
    }

    // XLSX / XLS handling - also shows first row
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const workbook = XLSX.read(event.target?.result, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json<any[]>(firstSheet, { header: 1, defval: "" }) as any[][];

        if (!rawData.length) {
          toast.error("We couldn't find product rows. Use Name, Price, and Code columns.");
          return;
        }

        let headerIdx = 0;
        for (let i = 0; i < Math.min(5, rawData.length); i++) {
          const joined = rawData[i].join(" ").toLowerCase();
          if (joined.includes("name") || joined.includes("plu") || joined.includes("barcode") || joined.includes("item") || joined.includes("qty") || joined.includes("code")) {
            headerIdx = i;
            break;
          }
        }

        const originalHeaders = rawData[headerIdx].map((h: any) => String(h).trim()).filter((h: string) => h!== "");
        setMappedFields(originalHeaders);

        const dataRows = rawData.slice(headerIdx + 1).filter((r) => r.some((c) => String(c).trim()!== ""));

        const get = (row: Record<string, unknown>, keys: string[]) => {
          for (const k of keys) {
            const nk = normalizeHeader(k);
            if (row[nk]!== undefined && String(row[nk]).trim()!== "") return row[nk];
            const found = Object.keys(row).find((rk) => rk.includes(nk) || nk.includes(rk));
            if (found && String(row[found]).trim()!== "") return row[found];
          }
          return "";
        };

        const mapped = dataRows
         .map((r, index) => {
            const obj: Record<string, unknown> = {};
            originalHeaders.forEach((orig) => {
              const realIdx = rawData[headerIdx].findIndex((h: any) => String(h).trim() === orig);
              obj[normalizeHeader(orig)] = r[realIdx];
            });

            const name = get(obj, ["pluname", "item name", "itemname", "product name", "name"]);
            const code = get(obj, ["plucode", "barcode", "code"]);
            const price = get(obj, ["unitprice", "price", "mrp"]);
            const qty = get(obj, ["qty", "quantity"]);
            const plu = get(obj, ["plu no", "pluno", "plu"]);
            const unit = get(obj, ["uom", "unit"]);
            const prodDate = get(obj, ["production date", "packed date"]);
            const expDate = get(obj, ["usebydate", "expiry date"]);

            const qtyNum = numberValue(qty) || 1;

            return {
              id: Date.now() + index,
              name: String(name).trim() || `Product ${index + 1}`,
              code: String(code).trim() || String(plu).trim() || `CODE${index + 1}`,
              price: numberValue(price),
              mrp: numberValue(price),
              qty: qtyNum,
              unit: String(unit || "pc").trim(),
              plu: String(plu || "").trim(),
              unitPrice: numberValue(price),
              weight: 0,
              totalPrice: numberValue(price),
              packedDate: String(prodDate || "").trim(),
              useByDate: String(expDate || "").trim(),
              labelTemplate: labelMode === "pc"? "1" : "2",
              extraFields: [],
              copies: Math.max(1, Math.min(20, Math.floor(qtyNum) || 1)),
            };
          })
         .filter((item) => item.name && item.code);

        if (!mapped.length) {
          toast.error("We couldn't find product rows. Use Name, Price, and Code columns.");
          return;
        }

        setProducts(mapped);
        toast.success(`${mapped.length} products imported from ${file.name}`);
        setActiveSection("studio");
      } catch {
        toast.error("That file could not be read. Please upload a CSV or Excel file.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFile = (file?: File) => {
    if (!file) return;
    const isSupported = /\.(csv|xlsx|xls)$/i.test(file.name);
    if (!isSupported) {
      toast.error("Please choose a CSV, XLSX, or XLS file.");
      return;
    }
    parseWorkbook(file);
  };

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    handleFile(event.target.files?.[0]);
    event.target.value = "";
  };

  const exportPLU = () => {
    if (!products.length) {
      toast.error("Add at least one product before exporting.");
      return;
    }
    const rows = [["PLU No", "Barcode", "Name", "Price"],...products.map((product, index) => [product.plu || String(index + 1).padStart(4, "0"), product.code, `"${product.name.replaceAll('"', '""')}"`, product.price.toFixed(2)])];
    downloadBlob(rows.map((row) => row.join(",")).join("\n"), "dukaan-essae-plu.csv", "text/csv;charset=utf-8");
    toast.success("Essae PLU CSV exported");
  };

  const generatePDF = (mrp = false) => {
    if (!products.length) {
      toast.error("Add at least one product before generating a PDF.");
      return;
    }
    try {
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = 210;
      const pageHeight = 297;
      const marginX = 12;
      const marginY = 14;
      const gapX = 5;
      const gapY = 5;
      const columns = 3;
      const labelWidth = (pageWidth - marginX * 2 - gapX * (columns - 1)) / columns;
      const labelHeight = 50;
      const rowsPerPage = Math.floor((pageHeight - marginY * 2 + gapY) / (labelHeight + gapY));
      const perPage = columns * rowsPerPage;
      const labels = products.flatMap((product) => Array.from({ length: product.copies }, () => product));

      labels.forEach((product, index) => {
        const isWeightLabel = product.labelTemplate === "2" || (product.labelTemplate!== "1" && labelMode === "weight");
        const pageIndex = Math.floor(index / perPage);
        const pagePosition = index % perPage;
        if (index > 0 && pagePosition === 0) pdf.addPage();
        const col = pagePosition % columns;
        const row = Math.floor(pagePosition / columns);
        const x = marginX + col * (labelWidth + gapX);
        const y = marginY + row * (labelHeight + gapY);

        pdf.setDrawColor(213, 220, 214);
        pdf.setFillColor(255, 255, 255);
        pdf.roundedRect(x, y, labelWidth, labelHeight, 2, 2, "FD");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(6);
        pdf.setTextColor(111, 127, 146);
        pdf.text(isWeightLabel? "WEIGHT LABEL" : (mrp? "MRP STICKER" : "PC LABEL"), x + 4, y + 5);
        pdf.setTextColor(230, 94, 71);
        pdf.text("CODE-128", x + labelWidth - 4, y + 5, { align: "right" });
        pdf.setTextColor(16, 27, 45);
        pdf.setFontSize(9);
        const safeName = product.name.length > 24? `${product.name.slice(0, 23)}…` : product.name;
        pdf.text(safeName, x + 4, y + 12);
        pdf.setFontSize(13);
        pdf.text(formatPrice(isWeightLabel? (product.totalPrice || product.price) : (product.mrp || product.price)), x + 4, y + 19);

        const canvas = document.createElement("canvas");
        JsBarcode(canvas, product.code || "0", { format: "CODE128", width: 2, height: 35, displayValue: false, margin: 0, lineColor: "#101b2d", background: "#ffffff" });
        pdf.addImage(canvas.toDataURL("image/png"), "PNG", x + 4, y + 21, labelWidth - 8, 8);
        if (isWeightLabel) {
          pdf.setFontSize(6);
          pdf.setTextColor(82, 97, 118);
          pdf.text(`Unit price: ${formatPrice(product.unitPrice || product.price)} / ${product.unit || "kg"}`, x + 4, y + 26);
          pdf.text(`Weight: ${product.weight || "—"} ${product.unit || "kg"}`, x + labelWidth - 4, y + 26, { align: "right" });
          pdf.text(`Packed: ${product.packedDate || "—"}`, x + 4, y + 30);
          pdf.text(`Use by: ${product.useByDate || "—"}`, x + labelWidth - 4, y + 30, { align: "right" });
        }
        const coreFields = [
          `Qty: ${product.qty || "—"}`,
          `Unit: ${product.unit || "—"}`,
          `MRP: ${formatPrice(product.mrp || product.price)}`,
          product.plu? `PLU: ${product.plu}` : "",
          product.totalPrice? `Total: ${formatPrice(product.totalPrice)}` : "",
          product.extraFields?.map((field) => `${field.label}: ${field.value}`).join(" | ") || "",
        ].filter(Boolean).join(" • ");
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(4.5);
        pdf.setTextColor(82, 97, 118);
        pdf.text(product.code, x + labelWidth / 2, y + (isWeightLabel? 34 : 33), { align: "center" });
        const fieldLines = pdf.splitTextToSize(coreFields, labelWidth - 8);
        pdf.text(fieldLines, x + 4, y + 39, { maxWidth: labelWidth - 8, lineHeightFactor: 1.25 });
        void pageIndex;
      });

      const filename = labelMode === "weight"? "dukaan-weight-labels.pdf" : (mrp? "dukaan-mrp-stickers.pdf" : "dukaan-pc-labels.pdf");
      pdf.save(filename);
      toast.success(`${labelMode === "weight"? "Weight" : (mrp? "MRP" : "PC")} label PDF downloaded`);
    } catch {
      toast.error("PDF generation failed. Try again or use print preview.");
    }
  };

  const printSheet = (mrp = false) => {
    if (!products.length) {
      toast.error("Add at least one product before printing.");
      return;
    }
    const labelMarkup = products.flatMap((product) => Array.from({ length: product.copies }, () => `
      <article class="print-label ${mrp? "print-label--mrp" : ""}">
        <div class="print-label__top"><span>DUKAAN</span><strong>${mrp? "MRP" : "BARCODE"}</strong><span>QTY:${product.qty}</span></div>
        <div class="print-label__name">${product.name.replace(/[<>&]/g, "")}</div>
        <div class="print-label__price">₹${product.price.toLocaleString("en-IN")}</div>
        <svg class="print-barcode" data-value="${product.code.replace(/[^0-9A-Za-z]/g, "")}"></svg>
        <div class="print-label__code">${product.code} | PLU:${product.plu || "-"} | ${product.packedDate || ""}→${product.useByDate || ""}</div>
      </article>`)).join("");
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Allow pop-ups to open the print preview.");
      return;
    }
    printWindow.document.write(`<!doctype html><html><head><title>${mrp? "MRP Stickers" : "Barcode Sheet"} — Dukaan</title><style>
      @page { size: A4; margin: 12mm; }
      * { box-sizing: border-box; } body { margin: 0; font-family: Arial, sans-serif; color: #101b2d; background: white; }
     .sheet { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8mm 6mm; align-items: start; }
     .print-label { border: 1px solid #d9dde4; border-radius: 6px; padding: 5mm 4mm 4mm; min-height: 42mm; break-inside: avoid; background: white; }
     .print-label--mrp { border-color: #b8c4d4; }
     .print-label__top { display: flex; justify-content: space-between; align-items: center; color: #708097; font-size: 7px; letter-spacing:.14em; font-weight: 700; }
     .print-label__top strong { color: #e65e47; font-size: 7px; }
     .print-label__name { font-size: 12px; font-weight: 700; margin-top: 4mm; min-height: 9mm; line-height: 1.15; }
     .print-label__price { font-size: 19px; font-weight: 800; margin-top: 2mm; }
     .print-barcode { width: 100%; height: 12mm; margin-top: 3mm; }
     .print-label__code { text-align: center; font-size: 8px; letter-spacing:.14em; margin-top: 1mm; color: #526176; }
     .print-hint { color: #708097; text-align: center; font-size: 11px; margin: 0 0 8mm; }
      @media print {.print-hint { display: none; } }
    </style></head><body><p class="print-hint">${mrp? "MRP sticker sheet" : "Code-128 barcode sheet"} · ${labelCount} labels · Save as PDF or print on A4</p><main class="sheet">${labelMarkup}</main><script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script><script>window.onload=function(){document.querySelectorAll('.print-barcode').forEach(function(svg){JsBarcode(svg,svg.dataset.value,{format:'CODE128',width:1.3,height:44,displayValue:false,margin:0,lineColor:'#101b2d',background:'transparent'});});setTimeout(function(){window.print();},350);};<\/script></body></html>`);
    printWindow.document.close();
    toast.success(`${mrp? "MRP sticker" : "Barcode"} print preview opened`);
  };

  const scrollTo = (id: string) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="site-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand-link" href="#top" aria-label="Dukaan Barcode Studio home"><Logo /></a>
          <nav className="main-nav" aria-label="Main navigation">
            <button className={activeSection === "studio"? "nav-link nav-link--active" : "nav-link"} onClick={() => scrollTo("studio")}>{t.navStudio}</button>
            <button className={activeSection === "labels"? "nav-link nav-link--active" : "nav-link"} onClick={() => scrollTo("labels")}>My Labels</button>
            <button className={activeSection === "guide"? "nav-link nav-link--active" : "nav-link"} onClick={() => scrollTo("guide")}>{t.navGuide}</button>
          </nav>
          <div className="topbar-actions">
            <button className="language-toggle" onClick={() => setLanguage(language === "en"? "hi" : "en")} aria-label="Switch language">
              <Languages size={16} /> <span>{language === "en"? "हिंदी" : "English"}</span> <ChevronDown size={14} />
            </button>
            <Button className="button button--dark button--small" onClick={() => scrollTo("studio")}>{t.launch}<ArrowRight size={15} /></Button>
          </div>
        </div>
      </header>

      <main id="top">
        <section className="hero-section">
          <div className="hero-inner">
            <div className="hero-copy">
              <SectionKicker>{t.heroEyebrow}</SectionKicker>
              <h1>{t.heroTitle}</h1>
              <p>{t.heroBody}</p>
              <div className="hero-tagline"><strong>{t.heroTagline}</strong><span>{t.heroHindiTagline}</span></div>
              <div className="hero-actions">
                <Button className="button button--lime" onClick={() => scrollTo("studio")}>{t.importProducts}<ArrowRight size={17} /></Button>
                <span className="free-usage-note">Free forever · No registration</span>
              </div>
              <div className="hero-proof"><div className="proof-avatars"><span>PC</span><span>WT</span><span>XL</span></div><span>Free browser workflow · No registration</span></div>
            </div>
            <div className="hero-art" aria-hidden="true">
              <div className="art-paper art-paper--one"><div className="art-paper__head"><span>PC LABEL</span><strong>01</strong></div><div className="art-paper__title">PRODUCT NAME</div><div className="art-paper__price">MRP</div><div className="art-bars bars-one" /></div>
              <div className="art-paper art-paper--two"><div className="art-paper__head"><span>WEIGHT</span><strong>02</strong></div><div className="art-paper__title">UNIT PRICE</div><div className="art-paper__price">TOTAL</div><div className="art-bars bars-two" /></div>
              <div className="art-scanner"><ScanLine size={25} /><span>SCAN READY</span></div>
              <div className="art-orbit art-orbit--lime" /><div className="art-orbit art-orbit--coral" />
            </div>
          </div>
          <div className="hero-bottom-note"><span>01 / 03</span><span>From product list to shelf-ready in a few clicks</span><span className="note-line" /></div>
        </section>

        <section id="studio" className="studio-section anchor-section">
          <div className="studio-header">
            <div><SectionKicker tone="coral">{t.navStudio}</SectionKicker><h2>{t.uploadTitle}</h2><p>{t.uploadBody}</p></div>
            <div className="format-badges"><Badge variant="outline"><FileSpreadsheet size={14} />.XLSX</Badge><Badge variant="outline"><FileText size={14} />.CSV</Badge></div>
          </div>
          <div className={`upload-zone ${isDragging? "upload-zone--active" : ""}`} onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={(event) => { event.preventDefault(); setIsDragging(false); handleFile(event.dataTransfer.files[0]); }}>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileInput} className="sr-only" />
            <div className="upload-icon"><CloudUpload size={27} /></div>
            <div className="upload-copy"><strong>{isDragging? "Drop it here" : "Drag & drop your file here"}</strong><span>We map common columns automatically and keep custom fields for label printing.</span></div>
            <div className="upload-actions"><Button className="button button--dark" onClick={() => fileRef.current?.click()}><Upload size={16} />{t.browse}</Button><span className="free-usage-note">Free · Unlimited labels</span></div>
          </div>

          <div className="label-config-row">
            <div className="label-config-copy"><span className="config-label">{t.labelType}</span><strong>{labelMode === "pc"? t.pcLabel : t.weightLabel}</strong><small>{labelMode === "pc"? "For piece-count products: name, MRP, barcode and quantity." : "Essae-style layout: unit price, weight, total price, packed date and use-by date."}</small></div>
            <div className="label-mode-toggle" role="group" aria-label={t.labelType}><button className={labelMode === "pc"? "label-mode-button label-mode-button--active" : "label-mode-button"} onClick={() => setLabelMode("pc")}><Barcode size={16} />{t.pcLabel}</button><button className={labelMode === "weight"? "label-mode-button label-mode-button--active" : "label-mode-button"} onClick={() => setLabelMode("weight")}><Scale size={16} />{t.weightLabel}</button></div>
            <div className="mapped-fields"><span>{t.mappedFields}</span>{mappedFields.slice(0, 8).map((field) => <Badge key={field} variant="outline">{field}</Badge>)}</div>
          </div>

          <div className="workspace-card">
            <div className="workspace-topline"><div className="workspace-title"><div className="workspace-icon"><LayoutGrid size={16} /></div><div><h3>{t.preview}</h3><p><span className="status-dot" />{uniqueCount} {t.rowsReady} · {labelCount} {t.labels.toLowerCase()}</p></div></div><div className="workspace-menu"><Badge className="badge-soft"><Sparkles size={13} /> Code-128</Badge><button className="icon-button" aria-label="More options"><MoreHorizontal size={20} /></button></div></div>
            <Separator />
            {products.length? <div className="product-table-wrap"><table className="product-table"><thead><tr><th>QTY</th><th>{t.product}</th><th>{t.barcode}</th><th>{t.price}</th><th>{t.labels}</th><th><span className="sr-only">{t.action}</span></th></tr></thead><tbody>{products.map((product, index) => <tr key={product.id}><td><Badge variant="outline">{product.qty}</Badge></td><td><div className="product-cell"><span className="row-number">{String(index + 1).padStart(2, "0")}</span><div><Input value={product.name} onChange={(event) => updateProduct(product.id, "name", event.target.value)} className="table-input table-input--name" aria-label={`${t.product} name`} /><span className="subtle-label">Label {product.labelTemplate || "1"} · {product.unit || "pc"} · PLU {product.plu || "-"}</span></div></div></td><td><div className="barcode-cell"><BarcodeMark value={product.code} compact /><Input value={product.code} onChange={(event) => updateProduct(product.id, "code", event.target.value)} className="table-input table-input--code" aria-label={`${t.barcode} value`} /></div></td><td><div className="price-input-wrap"><IndianRupee size={14} /><Input type="number" value={product.price} onChange={(event) => updateProduct(product.id, "price", Number(event.target.value))} className="table-input table-input--price" aria-label={`${t.price} value`} /></div></td><td><div className="copy-stepper"><button onClick={() => updateProduct(product.id, "copies", Math.max(1, product.copies - 1))} aria-label="Remove label"><Minus size={14} /></button><span>{product.copies}</span><button onClick={() => updateProduct(product.id, "copies", Math.min(20, product.copies + 1))} aria-label="Add label"><Plus size={14} /></button></div></td><td><button className="delete-button" onClick={() => { setProducts((current) => current.filter((item) => item.id!== product.id)); toast.success("Product removed"); }} aria-label={`Remove ${product.name}`}><X size={16} /></button></td></tr>)}</tbody></table></div> : <div className="empty-state"><div className="empty-state__icon"><Barcode size={26} /></div><h3>{t.emptyTitle}</h3><p>{t.emptyBody}</p></div>}
            <div className="workspace-footer"><div className="footer-stats"><div><span className="stat-number">{uniqueCount}</span><span className="stat-label">{t.products}</span></div><div><span className="stat-number">{labelCount}</span><span className="stat-label">{t.labels}</span></div><div><span className="stat-number">A4</span><span className="stat-label">print size</span></div></div><div className="workspace-actions"><Button className="button button--outline" onClick={() => generatePDF(false)} disabled={!products.length}><Printer size={16} />{t.generate}</Button><Button className="button button--outline button--coral" onClick={exportPLU} disabled={!products.length}><Download size={16} />{t.export}</Button><Button className="button button--dark" onClick={() => generatePDF(true)} disabled={!products.length}><BadgeIndianRupee size={16} />{t.sticker}</Button></div></div>
          </div>
          <div className="studio-caption"><ShieldCheck size={15} /><span>Your files stay in your browser. Nothing is uploaded to a server.</span></div>
        </section>

        <LabelDesigner products={products} />

        <section id="guide" className="guide-section anchor-section">
          <div className="guide-heading"><div><SectionKicker>{t.navGuide}</SectionKicker><h2>{t.workflowTitle}</h2></div><p>{t.workflowBody}</p></div>
          <div className="steps-grid"><StepCard number="01" icon={CloudUpload} title={t.step1} body={t.step1Body} /><StepCard number="02" icon={LayoutGrid} title={t.step2} body={t.step2Body} /><StepCard number="03" icon={Printer} title={t.step3} body={t.step3Body} /></div>
          <div className="guide-callout"><div className="callout-icon"><CircleHelp size={19} /></div><div><strong>Every imported field stays available.</strong><p>Choose label 1 for PC or label 2 for weight. All mapped and custom Excel values are printed into the selected label layout.</p></div><span className="callout-link">Free for everyone</span></div>
        </section>
      </main>
      <footer className="footer"><div className="footer-inner"><Logo /><span>{t.footer}</span><span className="developer-credit">Developed by <strong>Aditya Softwares</strong></span><div className="footer-links"><button onClick={() => toast.info("Dukaan Barcode Studio keeps your data local in this browser.")}>{t.navHelp}</button><button onClick={() => scrollTo("studio")}>Free forever</button></div></div></footer>
    </div>
  );
}
