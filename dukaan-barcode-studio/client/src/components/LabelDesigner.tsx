import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import JsBarcode from "jsbarcode";
import QRCode from "qrcode";
import { jsPDF } from "jspdf";
import {
  Barcode,
  Copy,
  Download,
  FileJson,
  Grid3X3,
  Layers,
  Plus,
  Printer,
  RotateCw,
  Save,
  Trash2,
  Undo2,
  Redo2,
  Upload,
  Pencil,
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

type ElementType = "text" | "dynamic" | "barcode" | "qrcode" | "price" | "number" | "date" | "time" | "formula" | "image" | "static" | "rectangle" | "line";
type Unit = "mm" | "cm" | "in";

export type LabelElement = {
  id: string;
  type: ElementType;
  field?: string;
  dataSource?: string;
  displayFormat?: string;
  formula?: string;
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

const FIELD_TYPE_OPTIONS = [
  { value: "dynamic", label: "Dynamic Data" },
  { value: "text", label: "Text" },
  { value: "static", label: "Static Value" },
  { value: "price", label: "Price" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "time", label: "Time" },
  { value: "barcode", label: "Barcode" },
  { value: "qrcode", label: "QR Code" },
  { value: "formula", label: "Formula" },
] as const;

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const mmPerUnit = (unit: Unit) => unit === "cm"? 10 : unit === "in"? 25.4 : 1;
const toMm = (value: number, unit: Unit) => value * mmPerUnit(unit);

const formatValue = (el: LabelElement, product?: DesignerProduct) => {
  if (!product) return "";
  const key = el.dataSource || el.field || "name";
  const custom = product.extraFields?.find((item) => item.label.toLowerCase() === key.toLowerCase() || item.label === key);
  let value: any = custom?.value?? (product as unknown as Record<string, unknown>)[key]?? "";
  if (el.type === "formula" && el.formula) {
    try {
      const fn = new Function('weight','unitPrice','price','qty','mrp',`return ${el.formula}`);
      value = fn(product.weight||0, product.unitPrice||0, product.price||0, product.qty||1, product.mrp||0);
    } catch {}
  }
  if (value === "" || value === null || value === undefined) return "";
  let display = String(value);
  if (["price","mrp","unitPrice","totalPrice"].includes(key) || el.type === "price") {
    display = `₹${Number(value || 0).toLocaleString("en-IN")}`;
  }
  const fmt = el.displayFormat || "{{value}}";
  return fmt.replaceAll("{{value}}", display).replaceAll(`{{${key}}}`, display);
};

const defaultElements = (): LabelElement[] => [
  { id: makeId(), type: "dynamic", field: "name", dataSource: "name", displayFormat: "{{value}}", x: 3, y: 3, width: 48, height: 6, fontSize: 13, bold: true, color: "#101b2d", align: "center" },
  { id: makeId(), type: "price", field: "mrp", dataSource: "mrp", displayFormat: "₹{{value}}", x: 3, y: 10, width: 23, height: 7, fontSize: 15, bold: true, color: "#101b2d", align: "left" },
  { id: makeId(), type: "barcode", field: "code", dataSource: "code", x: 4, y: 19, width: 46, height: 8, fontSize: 7, color: "#101b2d", align: "center" },
];

const builtInTemplate = (): LabelTemplate => ({ id: "essae-retail-54x37", name: "Essae Retail 54×37 mm", width: 54, height: 37, unit: "mm", orientation: "portrait", elements: defaultElements() });
const blankTemplate = (name = "My new label"): LabelTemplate => ({ id: makeId(), name, width: 54, height: 37, unit: "mm", orientation: "portrait", elements: [] });
function loadTemplates() { try { const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as LabelTemplate[]; return saved.length? saved : [builtInTemplate()]; } catch { return [builtInTemplate()]; } }
function saveTemplates(templates: LabelTemplate[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(templates)); }

export default function LabelDesigner({ products }: { products: DesignerProduct[] }) {
  const [templates, setTemplates] = useState<LabelTemplate[]>(loadTemplates);
  const [selectedId, setSelectedId] = useState("essae-retail-54x37");
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [history, setHistory] = useState<LabelTemplate[][]>([]);
  const [future, setFuture] = useState<LabelTemplate[][]>([]);
  const [dragging, setDragging] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [showAddField, setShowAddField] = useState(false);
  const [newFieldType, setNewFieldType] = useState<ElementType>("dynamic");
  const [newFieldSource, setNewFieldSource] = useState("name");
  const [newFieldFormat, setNewFieldFormat] = useState("{{value}}");
  const [newFormula, setNewFormula] = useState("weight*unitPrice");
  const importRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const template = templates.find((item) => item.id === selectedId) || templates[0];
  const product = products[previewIndex] || products[0];
  const selectedElement = template?.elements.find((item) => item.id === selectedElementId);
  const fieldOptions = useMemo(() => {
    const custom = Array.from(new Set(products.flatMap((item) => item.extraFields?.map((field) => field.label) || []))).map((field) => [field, field] as const);
    return [...FIELD_OPTIONS,...custom];
  }, [products]);

  useEffect(() => { if (template) saveTemplates(templates); }, [templates, template]);
  useEffect(() => { if (!dragging) return; const move = (event: PointerEvent) => { const rect = canvasRef.current?.getBoundingClientRect(); if (!rect ||!template) return; const nextX = ((event.clientX - rect.left) / rect.width) * template.width - dragging.offsetX; const nextY = ((event.clientY - rect.top) / rect.height) * template.height - dragging.offsetY; updateElement(dragging.id, { x: Math.max(0, Math.min(template.width - 2, nextX)), y: Math.max(0, Math.min(template.height - 2, nextY)) }, false); }; const up = () => setDragging(null); window.addEventListener("pointermove", move); window.addEventListener("pointerup", up); return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); }; });

  const mutateTemplates = (next: LabelTemplate[]) => { setHistory((current) => [...current.slice(-24), templates]); setFuture([]); setTemplates(next); };
  const updateTemplate = (patch: Partial<LabelTemplate>) => mutateTemplates(templates.map((item) => item.id === template.id? {...item,...patch } : item));
  const updateElement = (id: string, patch: Partial<LabelElement>, record = true) => { const next = templates.map((item) => item.id === template.id? {...item, elements: item.elements.map((element) => element.id === id? {...element,...patch } : element) } : item); if (record) mutateTemplates(next); else setTemplates(next); };
  const addElement = (type: ElementType, field?: string) => { const element: LabelElement = { id: makeId(), type, field, dataSource: field||"name", displayFormat: type==="price"?"₹{{value}}":"{{value}}", formula: type==="formula"?"weight*unitPrice":undefined, text: type === "text"? "Your text" : undefined, x: Math.max(2, template.width / 2 - 18), y: Math.max(2, template.height / 2 - 3), width: type === "barcode" || type==="qrcode"? Math.min(30, template.width - 6) : Math.min(34, template.width - 6), height: type === "barcode" || type==="qrcode"? 8 : 5, fontSize: type === "barcode"? 7 : 9, bold: true, color: "#101b2d", align: "left" }; mutateTemplates(templates.map((item) => item.id === template.id? {...item, elements: [...item.elements, element] } : item)); setSelectedElementId(element.id); };
  const addCustomField = () => { const element: LabelElement = { id: makeId(), type: newFieldType, field: newFieldSource, dataSource: newFieldSource, displayFormat: newFieldFormat, formula: newFieldType==="formula"?newFormula:undefined, text: newFieldType==="static"?newFieldFormat:undefined, x: template.width/2-15, y: template.height/2-3, width: newFieldType==="barcode"||newFieldType==="qrcode"?28:32, height: 6, fontSize: 9, bold: true, color: "#101b2d", align: "left" }; mutateTemplates(templates.map((item) => item.id === template.id? {...item, elements: [...item.elements, element] } : item)); setShowAddField(false); setSelectedElementId(element.id); toast.success(`Added ${newFieldType}: ${newFieldSource}`); };
  const deleteElement = () => { if (!selectedElementId) return; mutateTemplates(templates.map((item) => item.id === template.id? {...item, elements: item.elements.filter((element) => element.id!== selectedElementId) } : item)); setSelectedElementId(null); };
  const duplicateElement = () => { if (!selectedElement) return; const copy = {...selectedElement, id: makeId(), x: selectedElement.x + 2, y: selectedElement.y + 2 }; mutateTemplates(templates.map((item) => item.id === template.id? {...item, elements: [...item.elements, copy] } : item)); setSelectedElementId(copy.id); };
  const undo = () => { const previous = history.at(-1); if (!previous) return; setFuture((current) => [...current, templates]); setHistory((current) => current.slice(0, -1)); setTemplates(previous); };
  const redo = () => { const next = future.at(-1); if (!next) return; setHistory((current) => [...current, templates]); setFuture((current) => current.slice(0, -1)); setTemplates(next); };

  const printTemplate = async () => {
    if (!template ||!products.length) return toast.error("Upload product data before printing.");
    const widthMm = toMm(template.width, template.unit); const heightMm = toMm(template.height, template.unit);
    const pdf = new jsPDF({ orientation: template.orientation, unit: "mm", format: [widthMm, heightMm] });
    const printProducts = products.flatMap((item) => Array.from({ length: item.copies || 1 }, () => item));
    for (let index=0; index<printProducts.length; index++) {
      const item = printProducts[index];
      if (index) pdf.addPage([widthMm, heightMm], template.orientation);
      for (const element of template.elements) {
        const x = toMm(element.x, template.unit); const y = toMm(element.y, template.unit); const w = toMm(element.width, template.unit); const h = toMm(element.height, template.unit); const color = element.color || "#101b2d";
        if (element.type === "rectangle") { pdf.setDrawColor(color); pdf.rect(x, y, w, h); continue; }
        if (element.type === "line") { pdf.setDrawColor(color); pdf.line(x, y, x + w, y + h); continue; }
        if (element.type === "barcode") { const canvas = document.createElement("canvas"); try { JsBarcode(canvas, formatValue(element, item) || "0", { format: "CODE128", width: 2, height: 40, displayValue: false, margin: 0, lineColor: color, background: "#ffffff" }); pdf.addImage(canvas.toDataURL("image/png"), "PNG", x, y, w, h); } catch {} continue; }
        if (element.type === "qrcode") { try { const val = formatValue(element, item) || "0"; const url = await QRCode.toDataURL(val, { margin: 1, width: 200 }); pdf.addImage(url, "PNG", x, y, w, h); } catch {} continue; }
        const value = element.type === "text" || element.type==="static"? (element.text || "") : formatValue(element, item);
        if (!value) continue; pdf.setTextColor(color); pdf.setFont("helvetica", element.bold? "bold" : "normal"); pdf.setFontSize(Math.max(4, element.fontSize)); const align = element.align || "left"; pdf.text(pdf.splitTextToSize(value, w), align === "right"? x + w : align === "center"? x + w / 2 : x, y + Math.min(h, element.fontSize / 2), { align });
      }
    }
    pdf.save(`${template.name.replace(/[^a-z0-9]+/gi, "-")}.pdf`); toast.success(`Print PDF ${widthMm.toFixed(1)} × ${heightMm.toFixed(1)} mm`);
  };

  const displayScale = useMemo(() => Math.min(1, 520 / Math.max(1, toMm(template.width, template.unit))), [template]);
  if (!template) return null;

  return <section className="designer-section anchor-section" id="labels">
    <div className="designer-heading"><div><div className="section-kicker section-kicker--coral"><span className="kicker-dot" />MY LABELS</div><h2>Design once. Print whenever you need.</h2><p>Dynamic Field Creator: Choose Field Type, Data Source (Excel columns) and Display Format.</p></div><div className="designer-actions"><Button className="button button--dark button--small" onClick={()=>{const next={...blankTemplate(), id:makeId()}; mutateTemplates([...templates,next]); setSelectedId(next.id);}}><Plus size={15} />Create label</Button></div></div>
    <div className="designer-layout">
      <aside className="template-library"><div className="panel-title"><span>MY LABELS</span><Badge variant="outline">{templates.length}</Badge></div><div className="template-list">{templates.map((item) => <button key={item.id} className={item.id === template.id? "template-item template-item--active" : "template-item"} onClick={() => { setSelectedId(item.id); setSelectedElementId(null); }}><span className="template-item__copy"><strong>{item.name}</strong><small>{item.width} × {item.height} {item.unit}</small></span></button>)}</div></aside>
      <div className="designer-main"><div className="designer-toolbar"><div className="toolbar-group"><button onClick={undo} disabled={!history.length}><Undo2 size={16} /></button><button onClick={redo} disabled={!future.length}><Redo2 size={16} /></button><span className="toolbar-divider" /><Badge className="badge-soft"><Grid3X3 size={13} />Snap grid</Badge><Badge variant="outline">{template.width} × {template.height} {template.unit}</Badge></div></div><div className="designer-canvas-wrap"><div className="designer-canvas" ref={canvasRef} style={{ width: `${Math.max(220, Math.min(560, toMm(template.width, template.unit) * displayScale))}px`, aspectRatio: `${template.width}/${template.height}` }}><div className="canvas-grid" />{template.elements.map((element) => { const selected = element.id === selectedElementId; const value = element.type==="text"||element.type==="static"? element.text : formatValue(element, product); return <div key={element.id} className={`canvas-element canvas-element--${element.type} ${selected? "canvas-element--selected" : ""}`} style={{ left: `${(element.x / template.width) * 100}%`, top: `${(element.y / template.height) * 100}%`, width: `${(element.width / template.width) * 100}%`, height: `${(element.height / template.height) * 100}%`, color: element.color, fontSize: `${Math.max(6, element.fontSize * displayScale)}px`, fontWeight: element.bold? 700 : 400, textAlign: element.align || "left", transform: `rotate(${element.rotation || 0}deg)` }} onPointerDown={(event) => { event.stopPropagation(); const rect = canvasRef.current?.getBoundingClientRect(); if (!rect) return; setSelectedElementId(element.id); setDragging({ id: element.id, offsetX: ((event.clientX - rect.left) / rect.width) * template.width - element.x, offsetY: ((event.clientY - rect.top) / rect.height) * template.height - element.y }); }}>{element.type === "barcode"? <Barcode size={22} /> : element.type==="qrcode"? <span style={{fontSize:10, fontWeight:700}}>QR:{formatValue(element, product).slice(0,10)}</span> : element.type === "rectangle" || element.type==="line"? null : value || <span className="canvas-placeholder">{element.dataSource||element.field}</span>}</div>; })}</div></div><div className="designer-preview-nav"><button onClick={() => setPreviewIndex((current) => Math.max(0, current - 1))} disabled={!products.length || previewIndex === 0}>Previous</button><span>{products.length? `Product ${previewIndex + 1} of ${products.length}` : "Upload data to preview"}</span><button onClick={() => setPreviewIndex((current) => Math.min(products.length - 1, current + 1))} disabled={!products.length || previewIndex >= products.length - 1}>Next</button></div></div>
      <aside className="designer-inspector">
        <div className="panel-title"><span>DESIGN LABEL</span><Layers size={15} /></div>
        <div className="inspector-section"><label>Label name</label><div className="inspector-inline"><Input value={template.name} onChange={(event) => updateTemplate({ name: event.target.value })} /><button onClick={() => toast.success("Saved locally")}><Save size={15} /></button></div></div>
        <div className="inspector-section"><label>Physical size</label><div className="size-grid"><Input type="number" min="1" value={template.width} onChange={(event) => updateTemplate({ width: Number(event.target.value) || 1 })} /><Input type="number" min="1" value={template.height} onChange={(event) => updateTemplate({ height: Number(event.target.value) || 1 })} /><select value={template.unit} onChange={(event) => updateTemplate({ unit: event.target.value as Unit })}><option value="mm">mm</option><option value="cm">cm</option><option value="in">inch</option></select></div></div>

        <div className="inspector-section" style={{background:"#101b2d", color:"#fff", padding:12, borderRadius:10}}>
          <label style={{color:"#d4ff32", fontWeight:700}}>+ Add Field - Dynamic Creator</label>
          {!showAddField? <Button onClick={()=>setShowAddField(true)} style={{width:"100%", marginTop:8, background:"#d4ff32", color:"#000"}}><Plus size={14}/> Add New Field</Button> :
          <div style={{marginTop:10, background:"#fff", color:"#000", padding:10, borderRadius:8}}>
            <label>Field Type</label>
            <select value={newFieldType} onChange={(e)=>setNewFieldType(e.target.value as any)} style={{width:"100%", padding:6, border:"1px solid #ddd", borderRadius:6, marginBottom:8}}>
              {FIELD_TYPE_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <label>Data Source (Excel Column)</label>
            <select value={newFieldSource} onChange={(e)=>setNewFieldSource(e.target.value)} style={{width:"100%", padding:6, border:"1px solid #ddd", borderRadius:6, marginBottom:8}}>
              {fieldOptions.map(([f,l])=><option key={f} value={f}>{l} ({f})</option>)}
            </select>
            {newFieldType==="formula" && <><label>Formula</label><Input value={newFormula} onChange={(e)=>setNewFormula(e.target.value)} placeholder="weight*unitPrice" style={{marginBottom:8}}/></>}
            <label>Display Format</label>
            <Input value={newFieldFormat} onChange={(e)=>setNewFieldFormat(e.target.value)} placeholder="₹{{value}} or {{value}} kg" style={{marginBottom:8}}/>
            <div style={{display:"flex", gap:8}}><Button onClick={addCustomField} className="button--dark" style={{flex:1}}>Add to Label</Button><Button variant="outline" onClick={()=>setShowAddField(false)} style={{flex:1}}>Cancel</Button></div>
          </div>}
        </div>

        <div className="inspector-section"><label>Quick add</label><div className="element-palette">{fieldOptions.slice(0,8).map(([field, label]) => <button key={field} onClick={() => addElement("dynamic", field)}><Plus size={12} />{label}</button>)}<button onClick={() => addElement("text")}><Plus size={12} />Static text</button><button onClick={() => addElement("barcode", "code")}><Barcode size={12} />Barcode</button><button onClick={() => addElement("qrcode", "code")}><Barcode size={12} />QR Code</button><button onClick={() => addElement("formula")}><Plus size={12} />Formula</button></div></div>

        {selectedElement && <div className="inspector-section"><label>Selected: {selectedElement.type} ({selectedElement.dataSource})</label><div className="size-grid"><Input type="number" value={selectedElement.x} onChange={(event) => updateElement(selectedElement.id, { x: Number(event.target.value) })} /><Input type="number" value={selectedElement.y} onChange={(event) => updateElement(selectedElement.id, { y: Number(event.target.value) })} /><Input type="number" value={selectedElement.width} onChange={(event) => updateElement(selectedElement.id, { width: Number(event.target.value) })} /><Input type="number" value={selectedElement.height} onChange={(event) => updateElement(selectedElement.id, { height: Number(event.target.value) })} /></div><div className="inspector-control-row" style={{display:"flex", gap:6, marginTop:8}}><Input type="number" value={selectedElement.fontSize} onChange={(event) => updateElement(selectedElement.id, { fontSize: Number(event.target.value) })} style={{flex:1}}/><button onClick={() => updateElement(selectedElement.id, { bold:!selectedElement.bold })} style={{padding:"4px 8px", border:"1px solid #ddd", background: selectedElement.bold?"#000":"#fff", color:selectedElement.bold?"#fff":"#000"}}>B</button><button onClick={() => updateElement(selectedElement.id, { rotation: (selectedElement.rotation || 0) + 90 })} style={{padding:"4px 8px", border:"1px solid #ddd"}}><RotateCw size={13} /></button><button onClick={deleteElement} style={{padding:"4px 8px", border:"1px solid #ddd"}}><Trash2 size={13}/></button></div><label style={{marginTop:8, display:"block"}}>Display Format</label><Input value={selectedElement.displayFormat||""} onChange={(event) => updateElement(selectedElement.id, { displayFormat: event.target.value })} placeholder="₹{{value}}"/></div>}

        <div className="inspector-footer"><Button className="button button--dark button--full" onClick={printTemplate} disabled={!products.length}><Printer size={15} />Print selected label</Button><span><FileJson size={13} />Saved locally</span></div>
      </aside>
    </div>
 
