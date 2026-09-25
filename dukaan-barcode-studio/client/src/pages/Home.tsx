import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import JsBarcode from "jsbarcode";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import {
  ArrowRight,
  BadgeIndianRupee,
  Barcode,
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
  Store,
  Factory,
  Eye,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import LabelDesigner from "@/components/LabelDesigner";
import type { LabelTemplate } from "@/components/LabelDesigner";

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
  expiryDays?: number;
  labelTemplate?: string;
  extraFields?: { label: string; value: string }[];
  copies: number;
  type?: "store" | "production";
}
type Language = "en" | "hi";
type LabelMode = "pc" | "weight";
type ActiveTab = "store" | "production";

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
      } catch {}
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
  return (
    <div className={`section-kicker section-kicker--${tone}`}>
      <span className="kicker-dot" />
      {children}
    </div>
  );
}
function StepCard({ number, icon: Icon, title, body }: { number: string; icon: typeof Upload; title: string; body: string }) {
  return (
    <div className="step-card">
      <div className="step-topline">
        <div className="step-icon">
          <Icon size={18} strokeWidth={2.2} />
        </div>
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
  const [storeProducts, setStoreProducts] = useState<Product[]>([]);
  const [prodProducts, setProdProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>("store");
  const [activeSection, setActiveSection] = useState("studio");
  const [isDragging, setIsDragging] = useState(false);
  const [labelMode, setLabelMode] = useState<LabelMode>("pc");
  const [mappedFields, setMappedFields] = useState<string[]>(["Name", "Code", "Price", "MRP", "Qty", "Unit"]);
  const [printSetting, setPrintSetting] = useState({
    width: 54,
    height: 37,
    margin: 0,
    orientation: "portrait" as "portrait" | "landscape",
  });
  const [showPreview, setShowPreview] = useState(false);
  const [previewIdx, setPreviewIdx] = useState(0);
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<"all" | "1" | "2">("all");
  const fileRef = useRef<HTMLInputElement | null>(null);
  const t = copy[language];
  const labelCount = useMemo(() => products.reduce((total, item) => total + item.copies, 0), [products]);
  const uniqueCount = products.length;

  useEffect(() => {
    if (activeTab === "store") setProducts(storeProducts);
    else setProducts(prodProducts);
  }, [activeTab, storeProducts, prodProducts]);

  const updateProduct = (id: number, field: keyof Product, value: string | number) => {
    const updater = (list: Product[]) => list.map((product) => (product.id === id? {...product, [field]: value } : product));
    if (activeTab === "store") {
      setStoreProducts(updater);
      setProducts(updater);
    } else {
      setProdProducts(updater);
      setProducts(updater);
    }
  };

  const normalizeHeader = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
  const numberValue = (value: unknown) => Number(String(value?? "").replace(/[^0-9.]/g, "")) || 0;

  const parseWorkbook = (file: File) => {
    const isCSV = file.name.toLowerCase().endsWith(".csv");
    const isLFT = file.name.toLowerCase().endsWith(".lft") || file.name.toLowerCase().endsWith(".txt");
    if (isLFT) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = String(event.target?.result || "");
        localStorage.setItem("dukaan-lft-last", text);
        toast.success("LFT loaded - Designer updated");
        setTimeout(() => window.location.reload(), 500);
      };
      reader.readAsText(file);
      return;
    }
    if (isCSV) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const text = String(event.target?.result || "");
          if (text.includes("~S,")) {
            localStorage.setItem("dukaan-lft-last", text);
            toast.success("LFT loaded - Designer updated");
            setTimeout(() => window.location.reload(), 500);
            return;
          }
          const lines = text.split(/\r?\n/).filter((l) => l.trim()!== "");
          if (!lines.length) {
            toast.error("CSV is empty");
            return;
          }
          const headers = lines[0].split(",").map((h) => h.trim());
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
          const today = new Date();
          const mapped = rows
           .map((row, index) => {
              const name = get(row, ["pluname", "item name", "itemname", "product name", "name"]);
              const code = get(row, ["plucode", "barcode", "item code", "code", "sku"]);
              const price = get(row, ["unitprice", "price", "mrp", "rate"]);
              const plu = get(row, ["plu no", "plu number", "pluno", "plu"]);
              const uomRaw = get(row, ["uom", "unit"]);
              const useBy = get(row, ["usebydate", "expiry date"]);
              const link = get(row, ["labellinkno", "label"]);
              const uom = String(uomRaw) === "0"? "PC" : String(uomRaw) === "1"? "GRM" : String(uomRaw || "PC").trim();
              const days = parseInt(String(useBy)) || 1;
              const packed = today.toLocaleDateString("en-GB");
              const exp = new Date();
              exp.setDate(today.getDate() + days);
              return {
                id: Date.now() + index,
                name: String(name).trim() || `Product ${index + 1}`,
                code: String(code).trim() || String(plu).trim() || `CODE${index + 1}`,
                price: numberValue(price),
                mrp: numberValue(price),
                qty: 1,
                unit: uom,
                plu: String(plu || "").trim(),
                unitPrice: numberValue(price),
                weight: 1,
                totalPrice: numberValue(price),
                packedDate: packed,
                useByDate: exp.toLocaleDateString("en-GB"),
                expiryDays: days,
                labelTemplate: String(link || "1"),
                extraFields: [],
                copies: 1,
                type: "store" as const,
              };
            })
           .filter((item) => item.name && item.code);
          setStoreProducts(mapped);
          if (activeTab === "store") setProducts(mapped);
                    // AUTO TEMPLATE BANANA - STORE
          try {
            const key = "dukaan-label-templates-v1";
            const existing = JSON.parse(localStorage.getItem(key) || "[]");
            const newTemplate = {
              id: "auto-store-" + Date.now(),
              name: `STORE Auto ${mapped.length} items`,
              width: 54, height: 37,
              elements: [
                { id: "e1", type: "text", x: 2, y: 2, width: 50, height: 5, field: "name", dataSource: "name", fontSize: 8, bold: true, color: "#000", align: "center", text: "" },
                { id: "e2", type: "barcode", x: 5, y: 8, width: 44, height: 12, field: "code", dataSource: "code", fontSize: 8, bold: false, color: "#000", align: "center", text: "" },
                { id: "e3", type: "text", x: 2, y: 21, width: 50, height: 3, field: "code", dataSource: "code", fontSize: 5, bold: false, color: "#000", align: "center", text: "" },
                { id: "e4", type: "text", x: 2, y: 25, width: 16, height: 3, field: "packeddate", dataSource: "packeddate", fontSize: 5, bold: false, color: "#000", align: "left", text: "", displayFormat: "Packed: {{value}}" },
                { id: "e5", type: "text", x: 19, y: 25, width: 16, height: 3, field: "uom", dataSource: "uom", fontSize: 6, bold: true, color: "#000", align: "center", text: "", displayFormat: "UOM: {{value}}" },
                { id: "e6", type: "text", x: 36, y: 25, width: 16, height: 3, field: "usebydate", dataSource: "usebydate", fontSize: 5, bold: false, color: "#000", align: "right", text: "", displayFormat: "Exp: {{value}}" },
                { id: "e7", type: "text", x: 2, y: 29, width: 15, height: 3, field: "plu", dataSource: "plu", fontSize: 6, bold: true, color: "#000", align: "left", text: "", displayFormat: "Link: {{value}}" },
                { id: "e8", type: "text", x: 19, y: 29, width: 16, height: 3, field: "expiry", dataSource: "expiry", fontSize: 6, bold: true, color: "#000", align: "center", text: "" },
                { id: "e9", type: "text", x: 36, y: 29, width: 16, height: 6, field: "unitprice", dataSource: "unitprice", fontSize: 9, bold: true, color: "#000", align: "right", text: "", displayFormat: "CDF {{value}}" },
              ]
            };
            const filtered = existing.filter((t:any)=>!t.id.startsWith("auto-"));
            filtered.unshift(newTemplate);
            localStorage.setItem(key, JSON.stringify(filtered));
            window.dispatchEvent(new Event("templates-updated"));
          } catch {}
          toast.success(`${mapped.length} STORE products imported`);
          setActiveSection("studio");
        } catch (err) {
          console.error(err);
          toast.error("That file could not be read.");
        }
      };
      reader.readAsText(file);
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const workbook = XLSX.read(event.target?.result, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json<any[]>(firstSheet, { header: 1, defval: "" }) as any[][];
        if (!rawData.length) {
          toast.error("We couldn't find product rows.");
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
        const mapped = dataRows
         .map((r, index) => {
            const obj: Record<string, unknown> = {};
            originalHeaders.forEach((orig) => {
              const realIdx = rawData[headerIdx].findIndex((h: any) => String(h).trim() === orig);
              obj[normalizeHeader(orig)] = r[realIdx];
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
            const name = get(obj, ["item name", "name"]);
            const code = get(obj, ["barcode", "code"]);
            const qty = get(obj, ["qty", "quantity"]);
            const prod = get(obj, ["production date", "packed date"]);
            const exp = get(obj, ["expiry date", "usebydate"]);
                        const parseDate = (d: any) => {
              if (!d) return new Date().toLocaleDateString("en-GB");
              if (typeof d === 'number') {
                const date = new Date((d - 25569) * 86400 * 1000);
                if (!isNaN(date.getTime())) return date.toLocaleDateString("en-GB");
              }
              if (typeof d === 'string' && d.includes('/')) return d.split(" ")[0];
              try {
                const dt = new Date(d);
                if (!isNaN(dt.getTime()) && dt.getFullYear() > 1971) return dt.toLocaleDateString("en-GB");
                return String(d).split(" ")[0] || new Date().toLocaleDateString("en-GB");
              } catch { return new Date().toLocaleDateString("en-GB"); }
            };
            return {
              id: Date.now() + index + 10000,
              name: String(name).trim() || `Product ${index + 1}`,
              code: String(code).trim() || `CODE${index + 1}`,
              price: 0,
              mrp: 0,
              qty: numberValue(qty) || 1,
              unit: "PC",
              plu: String(code).trim(),
              unitPrice: 0,
              weight: 1,
              totalPrice: 0,
              packedDate: parseDate(prod),
              useByDate: parseDate(exp),
              expiryDays: 3,
              labelTemplate: "1",
              extraFields: [],
              copies: 1,
              type: "production" as const,
            };
          })
         .filter((item) => item.name && item.code);
        setProdProducts(mapped);
        if (activeTab === "production") setProducts(mapped);
                  // AUTO TEMPLATE BANANA - PRODUCTION - Price 0 nahi QTY ayega
          try {
            const key = "dukaan-label-templates-v1";
            const existing = JSON.parse(localStorage.getItem(key) || "[]");
            const newTemplate = {
              id: "auto-prod-" + Date.now(),
              name: `PRODUCTION Auto ${mapped.length} items`,
              width: 54, height: 37,
              elements: [
                { id: "e1", type: "text", x: 2, y: 2, width: 50, height: 5, field: "itemname", dataSource: "name", fontSize: 8, bold: true, color: "#000", align: "center", text: "" },
                { id: "e2", type: "barcode", x: 5, y: 8, width: 44, height: 12, field: "barcode", dataSource: "code", fontSize: 8, bold: false, color: "#000", align: "center", text: "" },
                { id: "e3", type: "text", x: 2, y: 21, width: 50, height: 3, field: "code", dataSource: "code", fontSize: 5, bold: false, color: "#000", align: "center", text: "" },
                { id: "e4", type: "text", x: 2, y: 25, width: 16, height: 3, field: "productiondate", dataSource: "packeddate", fontSize: 5, bold: false, color: "#000", align: "left", text: "", displayFormat: "Prod: {{value}}" },
                { id: "e5", type: "text", x: 19, y: 25, width: 16, height: 3, field: "qty", dataSource: "qty", fontSize: 7, bold: true, color: "#000", align: "center", text: "", displayFormat: "QTY: {{value}}" },
                { id: "e6", type: "text", x: 36, y: 25, width: 16, height: 3, field: "expirydate", dataSource: "usebydate", fontSize: 5, bold: false, color: "#000", align: "right", text: "", displayFormat: "Exp: {{value}}" },
                { id: "e7", type: "text", x: 2, y: 29, width: 50, height: 6, field: "qty", dataSource: "qty", fontSize: 10, bold: true, color: "#000", align: "center", text: "", displayFormat: "QTY: {{value}} PCS" },
              ]
            };
            const filtered = existing.filter((t:any)=>!t.id.startsWith("auto-"));
            filtered.unshift(newTemplate);
            localStorage.setItem(key, JSON.stringify(filtered));
            window.dispatchEvent(new Event("templates-updated"));
          } catch {}
        toast.success(`${mapped.length} PRODUCTION products imported`);
        setActiveSection("studio");
      } catch {
        toast.error("That file could not be read.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFile = (file?: File) => {
    if (!file) return;
    const isSupported = /\.(csv|xlsx|xls|lft|txt)$/i.test(file.name);
    if (!isSupported) {
      toast.error("Please choose a CSV, XLSX, XLS, LFT file.");
      return;
    }
    parseWorkbook(file);
  };
  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    handleFile(event.target.files?.[0]);
    event.target.value = "";
  };
  const filteredProducts = useMemo(() => {
    let list = products;
    if (activeTab === "store" && selectedType!== "all") list = list.filter((p) => (p.labelTemplate || "1") === selectedType);
    if (search) list = list.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.code.includes(search) || (p.plu || "").includes(search));
    return list;
  }, [products, selectedType, search, activeTab]);

  const exportPLU = () => {
    if (!products.length) {
      toast.error("Add at least one product before exporting.");
      return;
    }
    const rows = [
      ["PLU No", "Barcode", "Name", "Price"],
     ...products.map((product, index) => [product.plu || String(index + 1).padStart(4, "0"), product.code, `"${product.name.replaceAll('"', '""')}"`, product.price.toFixed(2)]),
    ];
    downloadBlob(rows.map((row) => row.join(",")).join("\n"), "dukaan-essae-plu.csv", "text/csv;charset=utf-8");
    toast.success("Essae PLU CSV exported");
  };

  const printThermalFromDesigner = async (template?: LabelTemplate) => {
    if (!filteredProducts.length) {
      toast.error("Upload Excel first");
      return;
    }
    let tmpl = template;
    if (!tmpl) {
      try {
        const saved = JSON.parse(localStorage.getItem("dukaan-label-templates-v1") || "[]");
        tmpl = saved.find((t: any) => activeTab === "store"? t.id.includes("store") || t.id.includes("wt") : t.id.includes("prod")) || saved[0];
      } catch {}
    }
    if (!tmpl) {
      toast.error("My Labels me label select karo");
      return;
    }

    // Tumhara roll 54x37 gap wala - isko lock kiya hai
    const pw = 54;
    const ph = 37;

    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;left:-99999px;top:-99999px;width:0;height:0;border:0";
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    const items = filteredProducts.flatMap((p) => Array.from({ length: (p.copies || 1) * (activeTab === "production"? p.qty || 1 : 1) }, () => p));

    let html = "";
    html += "<html><head><meta charset='utf-8'><style>";
    html += "@page{size:54mm 37mm;margin:0!important}";
    html += "html,body{width:54mm;margin:0!important;padding:0!important;background:white}";
    html += "*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial;-webkit-print-color-adjust:exact;print-color-adjust:exact}";
    html += ".label{width:54mm;height:37mm;position:relative;page-break-after:always;overflow:hidden;background:white;border:0}";
    html += ".label:last-child{page-break-after:auto}.el{position:absolute;overflow:hidden;line-height:1.1;white-space:nowrap;font-family:Arial}";
    html += "</style></head><body>";

    items.forEach(function (p) {
      html += '<div class="label">';
      tmpl.elements.forEach(function (el:any) {
        const k = (el.dataSource || el.field || "").toLowerCase();
        let v = "";
        if (el.type === "static") v = el.text || "";
        else {
          if (activeTab === "store") {
            const map: any = { name: p.name, code: p.code, plu: p.plu, price: Math.round(p.price).toString(), unitprice: Math.round(p.unitPrice || p.price).toString(), totalprice: Math.round(p.totalPrice || p.price).toString(), packeddate: p.packedDate, usebydate: p.useByDate, expiry: (p.expiryDays || 3) + " Days", uom: p.unit, qty: String(p.qty || 1) };
            v = map[k] || "";
            if (k.indexOf("price") >= 0 && v) v = "CDF " + v;
          } else {
            const map: any = { name: p.name, code: p.code, barcode: p.code, plu: p.plu, qty: String(p.qty || 1), itemname: p.name, productiondate: p.packedDate, expirydate: p.useByDate, packeddate: p.packedDate, usebydate: p.useByDate };
            v = map[k] || "";
          }
          if (el.displayFormat) v = el.displayFormat.replace("{{value}}", v);
        }
        if (el.type === "barcode") {
          html += '<div class="el" style="left:' + el.x + 'mm;top:' + el.y + 'mm;width:' + el.width + 'mm;height:' + el.height + 'mm;display:flex;align-items:center;justify-content:center;background:white"><svg class="bc" data-code="' + p.code + '" style="width:100%;height:100%"></svg></div>';
        } else {
          html += '<div class="el" style="left:' + el.x + 'mm;top:' + el.y + 'mm;width:' + el.width + 'mm;height:' + el.height + 'mm;font-size:' + el.fontSize + 'pt;font-weight:' + (el.bold? 700 : 400) + ';color:' + el.color + ';text-align:' + el.align + ';display:flex;align-items:center;' + (el.align==='center'?'justify-content:center':el.align==='right'?'justify-content:flex-end':'justify-content:flex-start') + '">' + v + '</div>';
        }
      });
      html += "</div>";
    });

    html += '<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></scr' + 'ipt>';
    html += "<script>setTimeout(function(){document.querySelectorAll('.bc').forEach(function(s){try{JsBarcode(s,s.dataset.code,{format:'CODE128',displayValue:true,margin:0,width:1.4,height:22,fontSize:9,textMargin:1});}catch(e){}});setTimeout(function(){window.focus();window.print();},600)},500);</scr" + "ipt>";
    html += "</body></html>";

    doc.open(); doc.write(html); doc.close();
    toast.success(items.length + " labels - 54x37 Gap - Excel se barcode auto");
    setTimeout(function () { try { document.body.removeChild(iframe); } catch {} }, 15000);
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
        pdf.text(isWeightLabel? "WEIGHT LABEL" : mrp? "MRP STICKER" : "PC LABEL", x + 4, y + 5);
        pdf.setTextColor(230, 94, 71);
        pdf.text("CODE-128", x + labelWidth - 4, y + 5, { align: "right" });
        pdf.setTextColor(16, 27, 45);
        pdf.setFontSize(9);
        const safeName = product.name.length > 24? `${product.name.slice(0, 23)}…` : product.name;
        pdf.text(safeName, x + 4, y + 12);
        pdf.setFontSize(13);
        pdf.text(formatPrice(isWeightLabel? product.totalPrice || product.price : product.mrp || product.price), x + 4, y + 19);
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
        const coreFields = [`Qty: ${product.qty || "—"}`, `Unit: ${product.unit || "—"}`, `MRP: ${formatPrice(product.mrp || product.price)}`, product.plu? `PLU: ${product.plu}` : "", product.totalPrice? `Total: ${formatPrice(product.totalPrice)}` : ""].filter(Boolean).join(" • ");
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(4.5);
        pdf.setTextColor(82, 97, 118);
        pdf.text(product.code, x + labelWidth / 2, y + (isWeightLabel? 34 : 33), { align: "center" });
        const fieldLines = pdf.splitTextToSize(coreFields, labelWidth - 8);
        pdf.text(fieldLines, x + 4, y + 39, { maxWidth: labelWidth - 8, lineHeightFactor: 1.25 });
        void pageIndex;
      });
      const filename = labelMode === "weight"? "dukaan-weight-labels.pdf" : mrp? "dukaan-mrp-stickers.pdf" : "dukaan-pc-labels.pdf";
      pdf.save(filename);
      toast.success(`${labelMode === "weight"? "Weight" : mrp? "MRP" : "PC"} label PDF downloaded`);
    } catch {
      toast.error("PDF generation failed. Try again or use print preview.");
    }
  };

  const scrollTo = (id: string) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="site-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand-link" href="#top" aria-label="Dukaan Barcode Studio home">
            <Logo />
          </a>
          <nav className="main-nav" aria-label="Main navigation">
            <button className={activeSection === "studio"? "nav-link nav-link--active" : "nav-link"} onClick={() => scrollTo("studio")}>
              {t.navStudio}
            </button>
            <button className={activeSection === "labels"? "nav-link nav-link--active" : "nav-link"} onClick={() => scrollTo("labels")}>
              My Labels
            </button>
            <button className={activeSection === "guide"? "nav-link nav-link--active" : "nav-link"} onClick={() => scrollTo("guide")}>
              {t.navGuide}
            </button>
          </nav>
          <div className="topbar-actions">
            <button className="language-toggle" onClick={() => setLanguage(language === "en"? "hi" : "en")} aria-label="Switch language">
              <Languages size={16} /> <span>{language === "en"? "हिंदी" : "English"}</span> <ChevronDown size={14} />
            </button>
            <Button className="button button--dark button--small" onClick={() => scrollTo("studio")}>
              {t.launch}
              <ArrowRight size={15} />
            </Button>
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
              <div className="hero-tagline">
                <strong>{t.heroTagline}</strong>
                <span>{t.heroHindiTagline}</span>
              </div>
              <div className="hero-actions">
                <Button className="button button--lime" onClick={() => scrollTo("studio")}>
                  {t.importProducts}
                  <ArrowRight size={17} />
                </Button>
                <span className="free-usage-note">Free forever · No registration</span>
              </div>
              <div className="hero-proof">
                <div className="proof-avatars">
                  <span>PC</span>
                  <span>WT</span>
                  <span>XL</span>
                </div>
                <span>Free browser workflow · No registration</span>
              </div>
            </div>
            <div className="hero-art" aria-hidden="true">
              <div className="art-paper art-paper--one">
                <div className="art-paper__head">
                  <span>PC LABEL</span>
                  <strong>01</strong>
                </div>
                <div className="art-paper__title">PRODUCT NAME</div>
                <div className="art-paper__price">MRP</div>
                <div className="art-bars bars-one" />
              </div>
              <div className="art-paper art-paper--two">
                <div className="art-paper__head">
                  <span>WEIGHT</span>
                  <strong>02</strong>
                </div>
                <div className="art-paper__title">UNIT PRICE</div>
                <div className="art-paper__price">TOTAL</div>
                <div className="art-bars bars-two" />
              </div>
              <div className="art-scanner">
                <ScanLine size={25} />
                <span>SCAN READY</span>
              </div>
              <div className="art-orbit art-orbit--lime" />
              <div className="art-orbit art-orbit--coral" />
            </div>
          </div>
        </section>

        <section id="studio" className="studio-section anchor-section">
          <div className="studio-header">
            <div>
              <SectionKicker tone="coral">{t.navStudio}</SectionKicker>
              <h2>{t.uploadTitle}</h2>
              <p>{t.uploadBody}</p>
            </div>
            <div className="format-badges">
              <Badge variant="outline">
                <FileSpreadsheet size={14} />.XLSX
              </Badge>
              <Badge variant="outline">
                <FileText size={14} />.CSV
              </Badge>
              <Badge variant="outline">LFT</Badge>
            </div>
          </div>

          {/* FIX 1 - TABS NO OVERFLOW */}
          <div className="bg-white rounded-xl p-2 flex gap-2 border shadow-sm mb-3 flex-wrap items-center">
            <Button onClick={() => { setActiveTab("store"); setProducts(storeProducts); }} className={activeTab === "store"? "bg-black text-white text-xs px-3 h-8" : "bg-gray-100 text-black text-xs px-3 h-8"} title="STORE CSV: plu no,pluname,plucode,uom,unitprice,labellinkno,usebydate">
              <Store size={14} /> STORE ({storeProducts.length})
            </Button>
            <Button onClick={() => { setActiveTab("production"); setProducts(prodProducts); }} className={activeTab === "production"? "bg-black text-white text-xs px-3 h-8" : "bg-gray-100 text-black text-xs px-3 h-8"} title="PRODUCTION XLSX: QTY, ITEM NAME, BARCODE, Production Date, Expiry Date">
              <Factory size={14} /> PRODUCTION ({prodProducts.length})
            </Button>
            <div className="ml-auto flex gap-2 items-center flex-wrap">
              <Badge variant="outline" className="text-[10px]">54x37 Thermal - No Cut</Badge>
              <Badge className={activeTab === "store"? "bg-green-600 text-[10px]" : "bg-orange-600 text-[10px]"}>{activeTab.toUpperCase()}</Badge>
            </div>
            <div className="w-full text-[9px] text-gray-400 mt-1 hidden md:block">
              {activeTab === "store"? "STORE fields: plu no, pluname, plucode, uom (0=PC/1=GRM), unitprice, labellinkno, usebydate (days)" : "PRODUCTION fields: QTY, ITEM NAME, BARCODE, Production Date, Expiry Date"}
            </div>
          </div>

          <div className={`upload-zone ${isDragging? "upload-zone--active" : ""}`} onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={(event) => { event.preventDefault(); setIsDragging(false); handleFile(event.dataTransfer.files[0]); }}>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.lft,.txt" onChange={handleFileInput} className="sr-only" />
            <div className="upload-icon">
              <CloudUpload size={27} />
            </div>
            <div className="upload-copy">
              <strong>{isDragging? "Drop it here" : `Drag & drop your ${activeTab.toUpperCase()} file here`}</strong>
              <span>{activeTab === "store"? "STORE CSV: plu no, pluname, plucode, uom (0=PC/1=GRM), unitprice, labellinkno, usebydate (days) - Expiry auto calculate" : "PRODUCTION XLSX: QTY, ITEM NAME, BARCODE, Production Date, Expiry Date - Qty ke hisab se copies"}</span>
            </div>
            <div className="upload-actions">
              <Button className="button button--dark" onClick={() => fileRef.current?.click()}>
                <Upload size={16} />
                {t.browse} {activeTab}
              </Button>
              <span className="free-usage-note">Thermal 54x37 - No Cut - Preview Before Print</span>
            </div>
          </div>

          <div className="label-config-row" style={{ flexWrap: "wrap", gap: "12px" }}>
            <div className="label-config-copy">
              <span className="config-label">{t.labelType} + Label Setting at Print Time</span>
              <strong>{labelMode === "pc"? t.pcLabel : t.weightLabel} - {activeTab.toUpperCase()}</strong>
              <small>Width, Height resize + Portrait/Landscape + Margin - Preview karke print karo</small>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              <div className="flex gap-1 items-center"><label className="text-[10px] font-bold">W mm</label><Input type="number" value={printSetting.width} onChange={(e) => setPrintSetting((s) => ({...s, width: Number(e.target.value) }))} className="w-16 h-8 text-xs" /></div>
              <div className="flex gap-1 items-center"><label className="text-[10px] font-bold">H mm</label><Input type="number" value={printSetting.height} onChange={(e) => setPrintSetting((s) => ({...s, height: Number(e.target.value) }))} className="w-16 h-8 text-xs" /></div>
              <div className="flex gap-1 items-center"><label className="text-[10px] font-bold">Margin</label><Input type="number" step={0.5} value={printSetting.margin} onChange={(e) => setPrintSetting((s) => ({...s, margin: Number(e.target.value) }))} className="w-14 h-8 text-xs" /></div>
              <select value={printSetting.orientation} onChange={(e) => setPrintSetting((s) => ({...s, orientation: e.target.value as any }))} className="border rounded h-8 px-2 text-xs">
                <option value="portrait">Portrait Vertical 54x37</option>
                <option value="landscape">Landscape Horizontal 37x54</option>
              </select>
              <Button size="sm" variant="outline" onClick={() => setShowPreview(true)}><Eye size={14} /> Preview Verify</Button>
              <Button size="sm" className="bg-green-600 text-white" onClick={() => printThermalFromDesigner()}><Printer size={14} /> Thermal Print {printSetting.width}x{printSetting.height} {printSetting.orientation}</Button>
            </div>
            <div className="label-mode-toggle" role="group" aria-label={t.labelType}>
              <button className={labelMode === "pc"? "label-mode-button label-mode-button--active" : "label-mode-button"} onClick={() => setLabelMode("pc")}><Barcode size={16} />{t.pcLabel}</button>
              <button className={labelMode === "weight"? "label-mode-button label-mode-button--active" : "label-mode-button"} onClick={() => setLabelMode("weight")}><Scale size={16} />{t.weightLabel}</button>
            </div>
            <div className="mapped-fields">
              <span>{t.mappedFields} - {activeTab}</span>
              {mappedFields.slice(0, 10).map((field) => (<Badge key={field} variant="outline">{field}</Badge>))}
            </div>
            <div className="flex gap-2 items-center flex-wrap">
              <div className="relative"><Search size={12} className="absolute left-2 top-2.5 text-gray-400" /><Input placeholder="Search PLU / Name / Barcode" value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 w-48 text-xs pl-6" /></div>
              {activeTab === "store" && (<select value={selectedType} onChange={(e) => setSelectedType(e.target.value as any)} className="border rounded h-8 px-2 text-xs"><option value="all">All</option><option value="1">PC Link1</option><option value="2">WT Link2</option></select>)}
              <Badge variant="outline">{filteredProducts.length} filtered</Badge>
              <Badge className="bg-blue-600 text-white">Total Copies: {filteredProducts.reduce((a, b) => a + (b.copies || 1) * (activeTab === "production"? b.qty || 1 : 1), 0)}</Badge>
            </div>
          </div>

          <div className="workspace-card">
            <div className="workspace-topline">
              <div className="workspace-title">
                <div className="workspace-icon"><LayoutGrid size={16} /></div>
                <div><h3>{t.preview} - {activeTab.toUpperCase()} - {filteredProducts.length} items</h3><p><span className="status-dot" />{uniqueCount} {t.rowsReady} · {labelCount} {t.labels.toLowerCase()} · {printSetting.width}x{printSetting.height}mm {printSetting.orientation}</p></div>
              </div>
              <div className="workspace-menu"><Badge className="badge-soft"><Sparkles size={13} /> Code-128 - Thermal No Cut - 2 Tabs</Badge><button className="icon-button" aria-label="More options"><MoreHorizontal size={20} /></button></div>
            </div>
            <Separator />
            {filteredProducts.length? (
              <div className="product-table-wrap">
                <table className="product-table">
                  <thead><tr><th>QTY</th><th>{t.product}</th><th>{t.barcode}</th><th>{t.price}</th><th>{t.labels}</th><th>Preview</th><th><span className="sr-only">{t.action}</span></th></tr></thead>
                  <tbody>
                    {filteredProducts.slice(0, 300).map((product, index) => (
                      <tr key={product.id}>
                        <td><Badge variant="outline">{activeTab === "production"? product.qty : 1}</Badge></td>
                        <td><div className="product-cell"><span className="row-number">{String(index + 1).padStart(2, "0")}</span><div><Input value={product.name} onChange={(event) => updateProduct(product.id, "name", event.target.value)} className="table-input table-input--name" aria-label={`${t.product} name`} /><span className="subtle-label">Label {product.labelTemplate || "1"} · {product.unit || "pc"} · PLU {product.plu || "-"} · {activeTab === "store"? `${product.expiryDays} Days` : `${product.packedDate}→${product.useByDate}`}</span></div></div></td>
                        <td><div className="barcode-cell"><BarcodeMark value={product.code} compact /><Input value={product.code} onChange={(event) => updateProduct(product.id, "code", event.target.value)} className="table-input table-input--code" aria-label={`${t.barcode} value`} /></div></td>
                        <td><div className="price-input-wrap"><IndianRupee size={14} /><Input type="number" value={product.price || product.unitPrice || 0} onChange={(event) => updateProduct(product.id, "price", Number(event.target.value))} className="table-input table-input--price" aria-label={`${t.price} value`} /></div></td>
                        <td><div className="copy-stepper"><button onClick={() => updateProduct(product.id, "copies", Math.max(1, product.copies - 1))} aria-label="Remove label"><Minus size={14} /></button><span>{product.copies}</span><button onClick={() => updateProduct(product.id, "copies", Math.min(20, product.copies + 1))} aria-label="Add label"><Plus size={14} /></button></div></td>
                        <td><Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => { setPreviewIdx(index); setShowPreview(true); }}><Eye size={12} /> View</Button></td>
                        <td><button className="delete-button" onClick={() => { if (activeTab === "store") { setStoreProducts((current) => current.filter((item) => item.id!== product.id)); setProducts((current) => current.filter((item) => item.id!== product.id)); } else { setProdProducts((current) => current.filter((item) => item.id!== product.id)); setProducts((current) => current.filter((item) => item.id!== product.id)); } toast.success("Product removed"); }} aria-label={`Remove ${product.name}`}><X size={16} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state"><div className="empty-state__icon"><Barcode size={26} /></div><h3>{t.emptyTitle} - {activeTab.toUpperCase()}</h3><p>{activeTab === "store"? "Upload STORE CSV: plu no,pluname,plucode,uom,unitprice,labellinkno,usebydate" : "Upload PRODUCTION XLSX: QTY, ITEM NAME, BARCODE, Production Date, Expiry Date"}</p></div>
            )}
            <div className="workspace-footer">
              <div className="footer-stats"><div><span className="stat-number">{uniqueCount}</span><span className="stat-label">{t.products}</span></div><div><span className="stat-number">{labelCount}</span><span className="stat-label">{t.labels}</span></div><div><span className="stat-number">{printSetting.width}x{printSetting.height}</span><span className="stat-label">{printSetting.orientation}</span></div></div>
              <div className="workspace-actions">
                <Button className="button button--outline" onClick={() => setShowPreview(true)} disabled={!products.length}><Eye size={16} /> Preview Verify</Button>
                <Button className="button button--outline" onClick={() => printThermalFromDesigner()} disabled={!products.length}><Printer size={16} /> Thermal {printSetting.width}x{printSetting.height}</Button>
                <Button className="button button--outline" onClick={() => generatePDF(false)} disabled={!products.length}><Printer size={16} />{t.generate} A4</Button>
                <Button className="button button--outline button--coral" onClick={exportPLU} disabled={!products.length}><Download size={16} />{t.export}</Button>
                <Button className="button button--dark" onClick={() => generatePDF(true)} disabled={!products.length}><BadgeIndianRupee size={16} />{t.sticker}</Button>
              </div>
            </div>
          </div>
          <div className="studio-caption"><ShieldCheck size={15} /><span>Your files stay in your browser. Nothing is uploaded to a server. Thermal 54x37 - No Cut - Preview Before Print - Resizable - Horizontal/Vertical - Same label design</span></div>
        </section>

        <LabelDesigner products={products} />

        <section id="guide" className="guide-section anchor-section">
          <div className="guide-heading"><div><SectionKicker>{t.navGuide}</SectionKicker><h2>{t.workflowTitle}</h2></div><p>{t.workflowBody}</p></div>
          <div className="steps-grid"><StepCard number="01" icon={CloudUpload} title={t.step1} body={t.step1Body} /><StepCard number="02" icon={LayoutGrid} title={t.step2} body={t.step2Body} /><StepCard number="03" icon={Printer} title={t.step3} body={t.step3Body} /></div>
          <div className="guide-callout"><div className="callout-icon"><CircleHelp size={19} /></div><div><strong>Store + Production 2 Tabs - Same Label 54x37 - Preview Verify - No Cut</strong><p>STORE: plu no,pluname,plucode,uom,unitprice,labellinkno,usebydate (days) - PRODUCTION: QTY, ITEM NAME, BARCODE, Production Date, Expiry Date - Label Setting at Print Time - Width/Height Resizable - Horizontal/Vertical</p></div><span className="callout-link">Free for everyone</span></div>
        </section>
      </main>

      {/* FIX 2 - PREVIEW ACTUAL SIZE + REAL BARCODE - NO LABEL SETTING TEXT */}
      {showPreview && filteredProducts[previewIdx] && (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-3" onClick={() => setShowPreview(false)}>
          <div className="bg-white rounded-xl p-4 w-full max-w-[540px]" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <b className="text-[11px] leading-tight">PREVIEW VERIFY - {activeTab.toUpperCase()} - Actual {printSetting.width}x{printSetting.height}mm {printSetting.orientation} - Thermal No Cut</b>
              <Button size="sm" variant="outline" onClick={() => setShowPreview(false)}>X</Button>
            </div>
            <div className="bg-gray-200 p-6 rounded flex justify-center items-center">
                           <div className="bg-white border-2 border-black shadow-lg relative overflow-hidden" style={{ width: (printSetting.orientation === "portrait"? printSetting.width : printSetting.height) * 3.78 + "px", height: (printSetting.orientation === "portrait"? printSetting.height : printSetting.width) * 3.78 + "px" }}>
                <div className="absolute inset-0 p-1.5 flex flex-col justify-between">
                  <div className="font-bold text-center leading-tight truncate" style={{ fontSize: "9px" }}>{filteredProducts[previewIdx].name}</div>
                  <div className="flex justify-center bg-white py-1"><BarcodeMark value={filteredProducts[previewIdx].code} /></div>
                  <div className="text-center font-mono" style={{ fontSize: "6px" }}>{filteredProducts[previewIdx].code}</div>
                  <div className="grid grid-cols-3 gap-1 border-t border-gray-100 pt-1" style={{ fontSize: "6px" }}>
                    <div>Packed: {filteredProducts[previewIdx].packedDate}</div>
                    <div className="text-center font-bold">
                      {filteredProducts[previewIdx].unit === "PC" || String(filteredProducts[previewIdx].labelTemplate) === "1"? "UOM: PC" : "UOM: WT"}
                    </div>
                    <div className="text-right">Exp: {filteredProducts[previewIdx].useByDate}</div>
                  </div>
                                    <div className="grid grid-cols-3 gap-1 font-bold bg-gray-50 -mx-1.5 px-1.5 py-1 mt-1" style={{ fontSize: "7px" }}>
                    <div>Link: {filteredProducts[previewIdx].labelTemplate} {String(filteredProducts[previewIdx].labelTemplate) === "1"? "PC" : "WT"}</div>
                    <div className="text-center">{filteredProducts[previewIdx].expiryDays} Days</div>
                    {activeTab==="store"? (
                      <div className="text-right text-[9px]">CDF {filteredProducts[previewIdx].unitPrice || filteredProducts[previewIdx].price}</div>
                    ) : (
                      <div className="text-right text-[9px] font-bold">QTY: {filteredProducts[previewIdx].qty} PCS</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-3 text-[10px] bg-gray-50 p-2 rounded border">
              <div>Product: <b>{filteredProducts[previewIdx].name}</b> - Actual {printSetting.width}x{printSetting.height}mm</div>
              <div className="text-[9px] text-gray-600 mt-1">Code: {filteredProducts[previewIdx].code} | {activeTab === "store"? `PLU ${filteredProducts[previewIdx].plu} | ${filteredProducts[previewIdx].unit} | Link ${filteredProducts[previewIdx].labelTemplate} | ${filteredProducts[previewIdx].expiryDays} Days` : `Qty ${filteredProducts[previewIdx].qty} | Prod ${filteredProducts[previewIdx].packedDate} | Exp ${filteredProducts[previewIdx].useByDate}`}</div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button className="flex-1 bg-green-600 text-white h-10" onClick={() => { setShowPreview(false); setTimeout(() => printThermalFromDesigner(), 200); }}><Printer size={14} /> Sahi Hai, Print Karo - {activeTab}</Button>
              <Button variant="outline" className="flex-1 h-10" onClick={() => setShowPreview(false)}>Edit Karo</Button>
            </div>
          </div>
        </div>
      )}

      <footer className="footer">
        <div className="footer-inner"><Logo /><span>{t.footer}</span><span className="developer-credit">Developed by <strong>Aditya Softwares</strong> - Store + Production Tabs - 54x37 Thermal - Preview Verify</span><div className="footer-links"><button onClick={() => toast.info("Dukaan Barcode Studio keeps your data local in this browser.")}>{t.navHelp}</button><button onClick={() => scrollTo("studio")}>Free forever</button></div></div>
      </footer>
    </div>
  );
}
