import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import JsBarcode from "jsbarcode";
import { jsPDF } from "jspdf";
import {
  Barcode,
  Copy,
  Download,
  FileJson,
  Grid3X3,
  Layers,
  Minus,
  Pencil,
  Plus,
  Printer,
  Redo2,
  RotateCw,
  Save,
  Trash2,
  Undo2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type DesignerProduct = {
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
  copies: number;
  extraFields?: { label: string; value: string }[];
};

type ElementType = "text" | "dynamic" | "barcode" | "rectangle" | "line";
type Unit = "mm" | "cm" | "in";

export type LabelElement = {
  id: string;
  type: ElementType;
  field?: string;
  text?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  bold?: boolean;
  color?: string;
  align?: "left" | "center" | "right";
  rotation?: number;
};

export type LabelTemplate = {
  id: string;
  name: string;
  width: number;
  height: number;
  unit: Unit;
  orientation: "portrait" | "landscape";
  elements: LabelElement[];
};

const STORAGE_KEY = "dukaan-label-templates-v1";
const FIELD_OPTIONS = [
  ["name", "Product Name"], ["plu", "PLU Number"], ["code", "Barcode"], ["price", "Price"],
  ["mrp", "MRP"], ["unitPrice", "Unit Price"], ["weight", "Weight"], ["unit", "UOM"],
  ["totalPrice", "Total Price"], ["packedDate", "Packed Date"], ["useByDate", "Use By Date"],
  ["qty", "Quantity"], ["batch", "Batch"], ["packedTime", "Packed Time"],
] as const;

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const mmPerUnit = (unit: Unit) => unit === "cm" ? 10 : unit === "in" ? 25.4 : 1;
const toMm = (value: number, unit: Unit) => value * mmPerUnit(unit);
const formatValue = (field: string, product?: DesignerProduct) => {
  if (!product) return "";
  const custom = product.extraFields?.find((item) => item.label.toLowerCase().replace(/[^a-z0-9]/g, "") === field.toLowerCase().replace(/[^a-z0-9]/g, ""));
  const value = custom?.value ?? (product as unknown as Record<string, unknown>)[field];
  if (value === undefined || value === null || value === "") return "";
  if (["price", "mrp", "unitPrice", "totalPrice"].includes(field)) return `₹${Number(value || 0).toLocaleString("en-IN")}`;
  return String(value);
};

const resolveText = (text: string, product?: DesignerProduct) => text.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_match, token: string) => {
  const formula = token.replace(/\s+/g, "").toLowerCase();
  if (formula === "weight*unitprice") return `₹${((product?.weight || 0) * (product?.unitPrice || 0)).toLocaleString("en-IN")}`;
  if (formula === "price-discount") return String((product?.price || 0) - Number((product as unknown as Record<string, unknown>)?.discount || 0));
  if (formula === "price+tax") return String((product?.price || 0) + Number((product as unknown as Record<string, unknown>)?.tax || 0));
  const field = FIELD_OPTIONS.find(([key, label]) => key.toLowerCase() === formula || label.toLowerCase().replace(/[^a-z0-9]/g, "") === formula)?.[0] || token;
  return formatValue(field, product);
});

const defaultElements = (): LabelElement[] => [
  { id: makeId(), type: "dynamic", field: "name", x: 3, y: 3, width: 48, height: 6, fontSize: 13, bold: true, color: "#101b2d", align: "center" },
  { id: makeId(), type: "dynamic", field: "mrp", x: 3, y: 10, width: 23, height: 7, fontSize: 15, bold: true, color: "#101b2d", align: "left" },
  { id: makeId(), type: "barcode", field: "code", x: 4, y: 19, width: 46, height: 8, fontSize: 7, color: "#101b2d", align: "center" },
  { id: makeId(), type: "dynamic", field: "weight", x: 3, y: 29, width: 23, height: 3, fontSize: 7, color: "#526176", align: "left" },
  { id: makeId(), type: "dynamic", field: "totalPrice", x: 28, y: 29, width: 23, height: 3, fontSize: 7, color: "#526176", align: "right" },
  { id: makeId(), type: "dynamic", field: "packedDate", x: 3, y: 33, width: 23, height: 2, fontSize: 5.5, color: "#718094", align: "left" },
  { id: makeId(), type: "dynamic", field: "useByDate", x: 28, y: 33, width: 23, height: 2, fontSize: 5.5, color: "#718094", align: "right" },
];

const builtInTemplate = (): LabelTemplate => ({ id: "essae-retail-54x37", name: "Essae Retail 54×37 mm", width: 54, height: 37, unit: "mm", orientation: "portrait", elements: defaultElements() });
const blankTemplate = (name = "My new label"): LabelTemplate => ({ id: makeId(), name, width: 54, height: 37, unit: "mm", orientation: "portrait", elements: [] });

function loadTemplates() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as LabelTemplate[];
    return saved.length ? saved : [builtInTemplate()];
  } catch { return [builtInTemplate()]; }
}

function saveTemplates(templates: LabelTemplate[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

function renderElementValue(element: LabelElement, product?: DesignerProduct) {
  if (element.type === "text") return element.text || "Text";
  if (element.type === "dynamic") return formatValue(element.field || "name", product);
  return "";
}

export default function LabelDesigner({ products }: { products: DesignerProduct[] }) {
  const [templates, setTemplates] = useState<LabelTemplate[]>(loadTemplates);
  const [selectedId, setSelectedId] = useState("essae-retail-54x37");
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [history, setHistory] = useState<LabelTemplate[][]>([]);
  const [future, setFuture] = useState<LabelTemplate[][]>([]);
  const [clipboard, setClipboard] = useState<LabelElement | null>(null);
  const [dragging, setDragging] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const importRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const template = templates.find((item) => item.id === selectedId) || templates[0];
  const product = products[previewIndex] || products[0];
  const selectedElement = template?.elements.find((item) => item.id === selectedElementId);
  const fieldOptions = useMemo(() => {
    const custom = Array.from(new Set(products.flatMap((item) => item.extraFields?.map((field) => field.label) || []))).map((field) => [field, field] as const);
    return [...FIELD_OPTIONS, ...custom];
  }, [products]);
  const selectedLabel = template ? `${template.width} × ${template.height} ${template.unit}` : "54 × 37 mm";

  useEffect(() => { if (template) saveTemplates(templates); }, [templates, template]);
  useEffect(() => { if (!dragging) return; const move = (event: PointerEvent) => { const rect = canvasRef.current?.getBoundingClientRect(); if (!rect || !template) return; const nextX = ((event.clientX - rect.left) / rect.width) * template.width - dragging.offsetX; const nextY = ((event.clientY - rect.top) / rect.height) * template.height - dragging.offsetY; updateElement(dragging.id, { x: Math.max(0, Math.min(template.width - 2, nextX)), y: Math.max(0, Math.min(template.height - 2, nextY)) }, false); }; const up = () => setDragging(null); window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); }; });

  const mutateTemplates = (next: LabelTemplate[]) => { setHistory((current) => [...current.slice(-24), templates]); setFuture([]); setTemplates(next); };
  const updateTemplate = (patch: Partial<LabelTemplate>) => mutateTemplates(templates.map((item) => item.id === template.id ? { ...item, ...patch } : item));
  const updateElement = (id: string, patch: Partial<LabelElement>, record = true) => { const next = templates.map((item) => item.id === template.id ? { ...item, elements: item.elements.map((element) => element.id === id ? { ...element, ...patch } : element) } : item); if (record) mutateTemplates(next); else setTemplates(next); };
  const addElement = (type: ElementType, field?: string) => { const element: LabelElement = { id: makeId(), type, field, text: type === "text" ? "Your text" : undefined, x: Math.max(2, template.width / 2 - 18), y: Math.max(2, template.height / 2 - 3), width: type === "barcode" ? Math.min(46, template.width - 6) : Math.min(34, template.width - 6), height: type === "barcode" ? 8 : 5, fontSize: type === "barcode" ? 7 : 9, bold: type === "text" || type === "dynamic", color: "#101b2d", align: "left" }; mutateTemplates(templates.map((item) => item.id === template.id ? { ...item, elements: [...item.elements, element] } : item)); setSelectedElementId(element.id); };
  const deleteElement = () => { if (!selectedElementId) return; mutateTemplates(templates.map((item) => item.id === template.id ? { ...item, elements: item.elements.filter((element) => element.id !== selectedElementId) } : item)); setSelectedElementId(null); };
  const duplicateElement = () => { if (!selectedElement) return; const copy = { ...selectedElement, id: makeId(), x: selectedElement.x + 2, y: selectedElement.y + 2 }; mutateTemplates(templates.map((item) => item.id === template.id ? { ...item, elements: [...item.elements, copy] } : item)); setSelectedElementId(copy.id); };
  useEffect(() => { const onKeyDown = (event: KeyboardEvent) => { if (!selectedElement) return; if (event.key === "Delete") { event.preventDefault(); deleteElement(); } else if (event.ctrlKey && event.key.toLowerCase() === "c") { event.preventDefault(); setClipboard(selectedElement); } else if (event.ctrlKey && event.key.toLowerCase() === "v" && clipboard) { event.preventDefault(); const copy = { ...clipboard, id: makeId(), x: clipboard.x + 2, y: clipboard.y + 2 }; mutateTemplates(templates.map((item) => item.id === template.id ? { ...item, elements: [...item.elements, copy] } : item)); setSelectedElementId(copy.id); } else if (event.ctrlKey && event.key.toLowerCase() === "d") { event.preventDefault(); duplicateElement(); } else if (event.key.startsWith("Arrow")) { event.preventDefault(); const delta = event.shiftKey ? 2 : 0.5; const patch = event.key === "ArrowLeft" ? { x: Math.max(0, selectedElement.x - delta) } : event.key === "ArrowRight" ? { x: selectedElement.x + delta } : event.key === "ArrowUp" ? { y: Math.max(0, selectedElement.y - delta) } : { y: selectedElement.y + delta }; updateElement(selectedElement.id, patch); } }; window.addEventListener("keydown", onKeyDown); return () => window.removeEventListener("keydown", onKeyDown); }, [selectedElement, clipboard, templates, template]);
  const duplicateTemplate = () => { const copy = { ...template, id: makeId(), name: `${template.name} - Copy`, elements: template.elements.map((element) => ({ ...element, id: makeId() })) }; mutateTemplates([...templates, copy]); setSelectedId(copy.id); toast.success("Label duplicated"); };
  const createTemplate = () => { const next = blankTemplate(); mutateTemplates([...templates, next]); setSelectedId(next.id); setSelectedElementId(null); };
  const renameTemplate = () => { const name = window.prompt("Label name", template.name)?.trim(); if (name) updateTemplate({ name }); };
  const deleteTemplate = () => { if (templates.length <= 1) return toast.error("Keep at least one label template."); const next = templates.filter((item) => item.id !== template.id); setTemplates(next); setSelectedId(next[0].id); setSelectedElementId(null); toast.success("Label deleted"); };
  const saveAsNewSize = () => { const copy = { ...template, id: makeId(), name: `${template.name} - ${template.width}×${template.height}`, elements: template.elements.map((element) => ({ ...element, id: makeId() })) }; mutateTemplates([...templates, copy]); setSelectedId(copy.id); toast.success("Saved as a new size"); };
  const undo = () => { const previous = history.at(-1); if (!previous) return; setFuture((current) => [...current, templates]); setHistory((current) => current.slice(0, -1)); setTemplates(previous); };
  const redo = () => { const next = future.at(-1); if (!next) return; setHistory((current) => [...current, templates]); setFuture((current) => current.slice(0, -1)); setTemplates(next); };
  const exportTemplate = () => { downloadText(JSON.stringify(template, null, 2), `${template.name.replace(/[^a-z0-9]+/gi, "-")}.dukaanlabel.json`, "application/json"); toast.success("Label template exported"); };
  const importTemplate = (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { try { const imported = JSON.parse(String(reader.result)) as LabelTemplate; if (!imported.name || !imported.width || !imported.height || !Array.isArray(imported.elements)) throw new Error("unsupported"); const safe = { ...imported, id: makeId() }; mutateTemplates([...templates, safe]); setSelectedId(safe.id); toast.success("Label template imported"); } catch { toast.error("This label format is not currently supported."); } }; reader.readAsText(file); event.target.value = ""; };

  const printTemplate = () => {
    if (!template || !products.length) return toast.error("Upload product data before printing.");
    const widthMm = toMm(template.width, template.unit); const heightMm = toMm(template.height, template.unit);
    const pdf = new jsPDF({ orientation: template.orientation, unit: "mm", format: [widthMm, heightMm] });
    const printProducts = products.flatMap((item) => Array.from({ length: item.copies || 1 }, () => item));
    printProducts.forEach((item, index) => { if (index) pdf.addPage([widthMm, heightMm], template.orientation); template.elements.forEach((element) => { const x = toMm(element.x, template.unit); const y = toMm(element.y, template.unit); const w = toMm(element.width, template.unit); const h = toMm(element.height, template.unit); const color = element.color || "#101b2d"; if (element.type === "rectangle") { pdf.setDrawColor(color); pdf.rect(x, y, w, h); return; } if (element.type === "line") { pdf.setDrawColor(color); pdf.line(x, y, x + w, y + h); return; } if (element.type === "barcode") { const canvas = document.createElement("canvas"); try { JsBarcode(canvas, formatValue(element.field || "code", item) || "0", { format: "CODE128", width: 2, height: 40, displayValue: false, margin: 0, lineColor: color, background: "#ffffff" }); pdf.addImage(canvas.toDataURL("image/png"), "PNG", x, y, w, h); } catch { /* invalid barcode remains blank */ } return; } const value = resolveText(element.type === "text" ? element.text || "" : `{{${element.field || "name"}}}`, item); if (!value) return; pdf.setTextColor(color); pdf.setFont("helvetica", element.bold ? "bold" : "normal"); pdf.setFontSize(Math.max(4, element.fontSize)); const align = element.align || "left"; pdf.text(pdf.splitTextToSize(value, w), align === "right" ? x + w : align === "center" ? x + w / 2 : x, y + Math.min(h, element.fontSize / 2), { align }); }); });
    pdf.save(`${template.name.replace(/[^a-z0-9]+/gi, "-")}.pdf`); toast.success(`Print PDF generated at ${widthMm.toFixed(1)} × ${heightMm.toFixed(1)} mm`);
  };

  const browserPrint = () => {
    if (!template || !products.length) return toast.error("Upload product data before printing.");
    const widthMm = toMm(template.width, template.unit); const heightMm = toMm(template.height, template.unit); const printWindow = window.open("", "_blank");
    if (!printWindow) return toast.error("Allow pop-ups to open the browser print preview.");
    const safe = (value: string) => value.replace(/[<>&]/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[character] || character));
    const labels = products.flatMap((item) => Array.from({ length: item.copies || 1 }, () => item)).map((item) => `<article class="thermal-label">${template.elements.map((element) => { const style = `left:${(element.x / template.width) * 100}%;top:${(element.y / template.height) * 100}%;width:${(element.width / template.width) * 100}%;height:${(element.height / template.height) * 100}%;font-size:${Math.max(4, element.fontSize)}px;color:${element.color || "#101b2d"};font-weight:${element.bold ? 700 : 400};text-align:${element.align || "left"};`; if (element.type === "barcode") return `<svg class="barcode-element" data-value="${safe(formatValue(element.field || "code", item) || "0")}" style="${style}"></svg>`; if (element.type === "rectangle") return `<div class="rectangle-element" style="${style}"></div>`; if (element.type === "line") return `<div class="line-element" style="${style}"></div>`; return `<div class="text-element" style="${style}">${safe(resolveText(element.type === "text" ? element.text || "" : `{{${element.field || "name"}}}`, item))}</div>`; }).join("")}</article>`).join("");
    printWindow.document.write(`<!doctype html><html><head><title>${safe(template.name)}</title><style>@page{size:${widthMm}mm ${heightMm}mm;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff}.thermal-label{position:relative;width:${widthMm}mm;height:${heightMm}mm;page-break-after:always;overflow:hidden;background:#fff}.text-element,.barcode-element,.rectangle-element,.line-element{position:absolute;overflow:hidden;padding:0 1mm;line-height:1.05;white-space:pre-wrap}.barcode-element{padding:0}.rectangle-element{border:1px solid currentColor}.line-element{border-top:1px solid currentColor;height:1px!important;padding:0}@media screen{body{background:#e8ece6;padding:12mm}.thermal-label{margin:0 auto 12mm;box-shadow:0 2mm 8mm #0002}}</style></head><body>${labels}<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script><script>window.onload=function(){document.querySelectorAll('.barcode-element').forEach(function(svg){JsBarcode(svg,svg.dataset.value,{format:'CODE128',width:1.4,height:38,displayValue:false,margin:0,lineColor:'#101b2d',background:'transparent'});});setTimeout(function(){window.print();},350);};<\/script></body></html>`); printWindow.document.close(); toast.success("Browser print preview opened");
  };
  const displayScale = useMemo(() => Math.min(1, 520 / Math.max(1, toMm(template.width, template.unit))), [template]);
  if (!template) return null;

  return <section className="designer-section anchor-section" id="labels">
    <div className="designer-heading"><div><div className="section-kicker section-kicker--coral"><span className="kicker-dot" />MY LABELS</div><h2>Design once. Print whenever you need.</h2><p>Save your own physical-size label templates, reuse them with new Excel files, and print without redesigning.</p></div><div className="designer-actions"><Button className="button button--dark button--small" onClick={createTemplate}><Plus size={15} />Create label</Button><Button className="button button--outline button--small" onClick={() => importRef.current?.click()}><Upload size={15} />Import label</Button><input ref={importRef} className="sr-only" type="file" accept=".dukaanlabel.json,.json" onChange={importTemplate} /></div></div>
    <div className="designer-layout">
      <aside className="template-library"><div className="panel-title"><span>MY LABELS</span><Badge variant="outline">{templates.length}</Badge></div><div className="template-list">{templates.map((item) => <button key={item.id} className={item.id === template.id ? "template-item template-item--active" : "template-item"} onClick={() => { setSelectedId(item.id); setSelectedElementId(null); }}><span className="template-thumb" style={{ aspectRatio: `${item.width}/${item.height}` }}><span /></span><span className="template-item__copy"><strong>{item.name}</strong><small>{item.width} × {item.height} {item.unit}</small></span></button>)}</div><div className="template-library__footer"><button onClick={renameTemplate}><Pencil size={14} />Rename</button><button onClick={duplicateTemplate}><Copy size={14} />Duplicate</button><button onClick={deleteTemplate}><Trash2 size={14} />Delete</button></div></aside>
      <div className="designer-main"><div className="designer-toolbar"><div className="toolbar-group"><button onClick={undo} disabled={!history.length} aria-label="Undo"><Undo2 size={16} /></button><button onClick={redo} disabled={!future.length} aria-label="Redo"><Redo2 size={16} /></button><span className="toolbar-divider" /><button onClick={exportTemplate}><Download size={15} />Export</button><button onClick={saveAsNewSize}><Copy size={15} />Save as new size</button></div><div className="toolbar-group"><Badge className="badge-soft"><Grid3X3 size={13} />Snap grid</Badge><Badge variant="outline">{selectedLabel}</Badge></div></div><div className="designer-canvas-wrap"><div className="designer-canvas" ref={canvasRef} style={{ width: `${Math.max(220, Math.min(560, toMm(template.width, template.unit) * displayScale))}px`, aspectRatio: `${template.width}/${template.height}`, transform: template.orientation === "landscape" ? "rotate(0deg)" : undefined }}><div className="canvas-grid" />{template.elements.map((element) => { const selected = element.id === selectedElementId; const value = renderElementValue(element, product); return <div key={element.id} className={`canvas-element canvas-element--${element.type} ${selected ? "canvas-element--selected" : ""}`} style={{ left: `${(element.x / template.width) * 100}%`, top: `${(element.y / template.height) * 100}%`, width: `${(element.width / template.width) * 100}%`, height: `${(element.height / template.height) * 100}%`, color: element.color, fontSize: `${Math.max(6, element.fontSize * displayScale)}px`, fontWeight: element.bold ? 700 : 400, textAlign: element.align || "left", transform: `rotate(${element.rotation || 0}deg)` }} onPointerDown={(event) => { event.stopPropagation(); const rect = canvasRef.current?.getBoundingClientRect(); if (!rect) return; setSelectedElementId(element.id); setDragging({ id: element.id, offsetX: ((event.clientX - rect.left) / rect.width) * template.width - element.x, offsetY: ((event.clientY - rect.top) / rect.height) * template.height - element.y }); }}>{element.type === "barcode" ? <Barcode className="canvas-barcode-icon" size={22} /> : element.type === "rectangle" ? null : element.type === "line" ? null : value || <span className="canvas-placeholder">{element.field || element.text || "Dynamic field"}</span>}</div>; })}</div></div><div className="designer-preview-nav"><button onClick={() => setPreviewIndex((current) => Math.max(0, current - 1))} disabled={!products.length || previewIndex === 0}>Previous product</button><span>{products.length ? `Product ${previewIndex + 1} of ${products.length}` : "Upload data to preview"}</span><button onClick={() => setPreviewIndex((current) => Math.min(products.length - 1, current + 1))} disabled={!products.length || previewIndex >= products.length - 1}>Next product</button></div></div>
      <aside className="designer-inspector"><div className="panel-title"><span>DESIGN LABEL</span><Layers size={15} /></div><div className="inspector-section"><label>Label name</label><div className="inspector-inline"><Input value={template.name} onChange={(event) => updateTemplate({ name: event.target.value })} /><button onClick={() => toast.success("Template saved locally")} aria-label="Save template"><Save size={15} /></button></div></div><div className="inspector-section"><label>Physical size</label><div className="size-grid"><Input type="number" min="1" value={template.width} onChange={(event) => updateTemplate({ width: Number(event.target.value) || 1 })} /><Input type="number" min="1" value={template.height} onChange={(event) => updateTemplate({ height: Number(event.target.value) || 1 })} /><select value={template.unit} onChange={(event) => updateTemplate({ unit: event.target.value as Unit })}><option value="mm">mm</option><option value="cm">cm</option><option value="in">inch</option></select></div><div className="preset-row">{[[54,37],[40,30],[50,30],[60,40],[70,50],[100,50]].map(([width,height]) => <button key={`${width}-${height}`} onClick={() => updateTemplate({ width, height, unit: "mm" })}>{width}×{height}</button>)}</div></div><div className="inspector-section"><label>Orientation</label><div className="orientation-row"><button className={template.orientation === "portrait" ? "active" : ""} onClick={() => updateTemplate({ orientation: "portrait" })}>Portrait</button><button className={template.orientation === "landscape" ? "active" : ""} onClick={() => updateTemplate({ orientation: "landscape" })}>Landscape</button></div></div><div className="inspector-section"><label>Add element</label><div className="element-palette">{fieldOptions.map(([field, label]) => <button key={field} onClick={() => addElement("dynamic", field)}><Plus size={12} />{label}</button>)}<button onClick={() => addElement("text")}><Plus size={12} />Static text</button><button onClick={() => addElement("barcode", "code")}><Barcode size={12} />Barcode</button><button onClick={() => addElement("rectangle")}><Plus size={12} />Rectangle</button><button onClick={() => addElement("line")}><Plus size={12} />Line</button></div></div>{selectedElement && <div className="inspector-section"><label>Selected element</label><div className="selected-element-title"><span>{selectedElement.type === "dynamic" ? `{{${selectedElement.field}}}` : selectedElement.type}</span><div><button onClick={duplicateElement} aria-label="Duplicate element"><Copy size={14} /></button><button onClick={deleteElement} aria-label="Delete element"><Trash2 size={14} /></button></div></div><div className="size-grid"><Input type="number" value={selectedElement.x} onChange={(event) => updateElement(selectedElement.id, { x: Number(event.target.value) })} /><Input type="number" value={selectedElement.y} onChange={(event) => updateElement(selectedElement.id, { y: Number(event.target.value) })} /><Input type="number" value={selectedElement.width} onChange={(event) => updateElement(selectedElement.id, { width: Number(event.target.value) })} /><Input type="number" value={selectedElement.height} onChange={(event) => updateElement(selectedElement.id, { height: Number(event.target.value) })} /></div><div className="inspector-control-row"><label>Font size</label><Input type="number" value={selectedElement.fontSize} onChange={(event) => updateElement(selectedElement.id, { fontSize: Number(event.target.value) })} /><button onClick={() => updateElement(selectedElement.id, { bold: !selectedElement.bold })} className={selectedElement.bold ? "active" : ""}>B</button><button onClick={() => updateElement(selectedElement.id, { align: selectedElement.align === "center" ? "left" : "center" })}>Align</button><button onClick={() => updateElement(selectedElement.id, { rotation: (selectedElement.rotation || 0) + 90 })}><RotateCw size={13} /></button></div>{selectedElement.type === "text" && <Input value={selectedElement.text || ""} onChange={(event) => updateElement(selectedElement.id, { text: event.target.value })} placeholder="Static text" />}{selectedElement.type === "dynamic" && <select value={selectedElement.field || "name"} onChange={(event) => updateElement(selectedElement.id, { field: event.target.value })}>{fieldOptions.map(([field, label]) => <option key={field} value={field}>{label}</option>)}</select>}</div>}<div className="inspector-footer"><Button className="button button--dark button--full" onClick={printTemplate} disabled={!products.length}><Printer size={15} />Print selected label · {selectedLabel}</Button><span><FileJson size={13} />Saved locally in this browser</span></div></aside>
    </div>
  </section>;
}

function downloadText(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
}
