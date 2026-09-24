import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import JsBarcode from "jsbarcode";

export interface LabelElement {
  id: string;
  type: "text" | "barcode" | "static";
  x: number; y: number; width: number; height: number;
  field: string;
  dataSource: string;
  fontSize: number;
  bold: boolean;
  color: string;
  align: "left" | "center" | "right";
  text: string;
  displayFormat?: string;
}

export interface LabelTemplate {
  id: string;
  name: string;
  width: number;
  height: number;
  elements: LabelElement[];
}

const STORAGE_KEY = "dukaan-label-templates-v1";

// Real Scannable Barcode Component - Full Lining, Blur Proof
function RealBarcode({ value, height }: { value: string, width: number, height: number }) {
  const svgRef = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (svgRef.current && value) {
      try {
        const cleanVal = String(value).replace(/[^0-9A-Za-z\-\.]/g, "").trim() || "000000";
        JsBarcode(svgRef.current, cleanVal, {
          format: "CODE128",
          width: 2.4, // Moti line - blur me bhi scan
          height: height * 3.78 * 0.95,
          displayValue: false, // Number alag dikhayenge
          margin: 0,
          background: "#ffffff",
          lineColor: "#000000",
          flat: false,
        });
      } catch (e) {
        console.log("Barcode error", e);
      }
    }
  }, [value, height]);
  return <svg ref={svgRef} style={{ width: "100%", height: "100%" }} />;
}

const DEFAULT_TEMPLATES: LabelTemplate[] = [
  {
    id: "store-default",
    name: "STORE 54x37 - Full Barcode",
    width: 54, height: 37,
    elements: [
      { id: "e1", type: "text", x: 2, y: 1.5, width: 50, height: 4.5, field: "name", dataSource: "name", fontSize: 7.5, bold: true, color: "#000", align: "center", text: "" },
      // FULL WIDTH BIG BARCODE - pura jagah lines ko
      { id: "e2", type: "barcode", x: 1, y: 6.5, width: 52, height: 16, field: "code", dataSource: "code", fontSize: 8, bold: false, color: "#000", align: "center", text: "" },
      // Barcode number ek hi jagah niche
      { id: "e3", type: "text", x: 2, y: 22.8, width: 50, height: 3, field: "code", dataSource: "code", fontSize: 5.5, bold: true, color: "#000", align: "center", text: "" },
      { id: "e4", type: "text", x: 2, y: 26, width: 16, height: 3, field: "packeddate", dataSource: "packeddate", fontSize: 4.5, bold: false, color: "#000", align: "left", text: "", displayFormat: "Prod: {{value}}" },
      { id: "e5", type: "text", x: 19, y: 26, width: 16, height: 3, field: "uom", dataSource: "uom", fontSize: 6, bold: true, color: "#000", align: "center", text: "", displayFormat: "UOM: {{value}}" },
      { id: "e6", type: "text", x: 36, y: 26, width: 16, height: 3, field: "usebydate", dataSource: "usebydate", fontSize: 4.5, bold: false, color: "#000", align: "right", text: "", displayFormat: "Exp: {{value}}" },
      { id: "e7", type: "text", x: 2, y: 30, width: 15, height: 3, field: "plu", dataSource: "plu", fontSize: 6, bold: true, color: "#000", align: "left", text: "", displayFormat: "Link: {{value}}" },
      { id: "e8", type: "text", x: 19, y: 30, width: 16, height: 3, field: "expiry", dataSource: "expiry", fontSize: 6, bold: true, color: "#000", align: "center", text: "" },
      { id: "e9", type: "text", x: 36, y: 30, width: 16, height: 6, field: "unitprice", dataSource: "unitprice", fontSize: 9, bold: true, color: "#000", align: "right", text: "", displayFormat: "CDF {{value}}" },
    ]
  },
  {
    id: "prod-default",
    name: "PRODUCTION 54x37 - Full Scan Barcode",
    width: 54, height: 37,
    elements: [
      { id: "e1", type: "text", x: 2, y: 1.5, width: 50, height: 4.5, field: "name", dataSource: "name", fontSize: 7.5, bold: true, color: "#000", align: "center", text: "" },
      // FULL WIDTH BIG BARCODE - Pains Au Lait wala
      { id: "e2", type: "barcode", x: 1, y: 6.5, width: 52, height: 16, field: "code", dataSource: "code", fontSize: 8, bold: false, color: "#000", align: "center", text: "" },
      { id: "e3", type: "text", x: 2, y: 22.8, width: 50, height: 3, field: "code", dataSource: "code", fontSize: 6, bold: true, color: "#000", align: "center", text: "" },
      { id: "e4", type: "text", x: 2, y: 26, width: 16, height: 3, field: "packeddate", dataSource: "packeddate", fontSize: 4.5, bold: false, color: "#000", align: "left", text: "", displayFormat: "Prod: {{value}}" },
      { id: "e5", type: "text", x: 19, y: 26, width: 16, height: 3, field: "qty", dataSource: "qty", fontSize: 6.5, bold: true, color: "#000", align: "center", text: "", displayFormat: "QTY: {{value}}" },
      { id: "e6", type: "text", x: 36, y: 26, width: 16, height: 3, field: "usebydate", dataSource: "usebydate", fontSize: 4.5, bold: false, color: "#000", align: "right", text: "", displayFormat: "Exp: {{value}}" },
      { id: "e7", type: "text", x: 2, y: 30, width: 50, height: 6, field: "qty", dataSource: "qty", fontSize: 10, bold: true, color: "#000", align: "center", text: "", displayFormat: "QTY: {{value}} PCS" },
    ]
  }
];

export default function LabelDesigner({ products }: { products: any[] }) {
  const [templates, setTemplates] = useState<LabelTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [selectedElId, setSelectedElId] = useState<string>("");
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, elId: string } | null>(null);

  const loadTemplates = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (saved.length === 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_TEMPLATES));
        setTemplates(DEFAULT_TEMPLATES);
        setSelectedId(DEFAULT_TEMPLATES[0].id);
      } else {
        setTemplates(saved);
        if (!selectedId) setSelectedId(saved[0].id);
      }
    } catch {
      setTemplates(DEFAULT_TEMPLATES);
      setSelectedId(DEFAULT_TEMPLATES[0].id);
    }
  };

  useEffect(() => {
    loadTemplates();
    const handler = () => loadTemplates();
    window.addEventListener("templates-updated", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("templates-updated", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const selectedTemplate = templates.find(t => t.id === selectedId);
  const selectedEl = selectedTemplate?.elements.find(e => e.id === selectedElId);

  const saveTemplates = (newTemplates: LabelTemplate[]) => {
    setTemplates(newTemplates);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newTemplates));
  };

  const updateElement = (elId: string, patch: Partial<LabelElement>) => {
    const newTemplates = templates.map(t => t.id === selectedId? {...t, elements: t.elements.map(e => e.id === elId? {...e,...patch } : e) } : t);
    saveTemplates(newTemplates);
  };

  const fieldOptions = [
    { value: "name", label: "Product Name / ITEM NAME" },
    { value: "code", label: "Barcode / BARCODE - Scan Wala" },
    { value: "plu", label: "PLU No / Label Link No" },
    { value: "uom", label: "UOM - PC / WT / GRM" },
    { value: "unitprice", label: "Unit Price / Price" },
    { value: "totalprice", label: "Total Price" },
    { value: "packeddate", label: "Packed Date / Production Date" },
    { value: "usebydate", label: "Expiry Date / UseBy Date" },
    { value: "expiry", label: "Validity / Expiry Days" },
    { value: "qty", label: "QTY / Quantity" },
  ];

  if (!selectedTemplate) return null;

  const sample = products[0] || { name: "Pains Au Lait Grande Pkt", code: "142030", plu: "1", unit: "PC", unitPrice: 4300, price: 4300, packedDate: "01/01/1970", useByDate: "01/01/1970", expiryDays: 3, qty: 225 };

  const getValue = (dataSource: string) => {
    const map: any = {
      name: sample.name,
      code: sample.code,
      plu: sample.plu || sample.labelTemplate || "1",
      uom: sample.unit || "PC",
      unitprice: sample.unitPrice || sample.price,
      totalprice: sample.totalPrice || sample.price,
      packeddate: sample.packedDate,
      usebydate: sample.useByDate,
      expiry: sample.expiryDays? `${sample.expiryDays} Days` : "3 Days",
      qty: sample.qty || 1,
    };
    return map[dataSource] || dataSource;
  };

  return (
    <div id="labels" className="bg-white rounded-xl border p-4 mt-6 anchor-section">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <h2 className="font-bold text-lg">My Labels - Full Barcode - Blur Proof Scan</h2>
        <div className="flex gap-2 flex-wrap">
          {templates.map(t => (
            <button key={t.id} onClick={() => setSelectedId(t.id)} className={`px-3 py-1.5 rounded text-xs border ${selectedId === t.id? "bg-black text-white" : "bg-gray-100"}`}>
              {t.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-[1fr_280px] gap-4">
        <div className="bg-gray-100 p-6 rounded-lg flex justify-center items-center min-h-[350px] relative">
          <div className="bg-white border-2 border-black shadow-lg relative" style={{ width: selectedTemplate.width * 3.78, height: selectedTemplate.height * 3.78 }}>
            {selectedTemplate.elements.map(el => {
              const rawVal = getValue(el.dataSource);
              const displayVal = el.displayFormat? el.displayFormat.replace("{{value}}", String(rawVal)) : String(rawVal);
              const isSelected = selectedElId === el.id;
              return (
                <div
                  key={el.id}
                  onClick={() => setSelectedElId(el.id)}
                  onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, elId: el.id }); setSelectedElId(el.id); }}
                  className={`absolute cursor-move hover:bg-yellow-100 ${isSelected? "bg-blue-100 ring-2 ring-blue-500" : ""} ${el.type === "barcode"? "bg-white" : ""}`}
                  style={{
                    left: el.x * 3.78, top: el.y * 3.78, width: el.width * 3.78, height: el.height * 3.78,
                    fontSize: el.fontSize, fontWeight: el.bold? 700 : 400, color: el.color,
                    textAlign: el.align, display: "flex", alignItems: "center",
                    justifyContent: el.align === "center"? "center" : el.align === "right"? "flex-end" : "flex-start",
                    overflow: "hidden", lineHeight: 1.1, whiteSpace: "nowrap"
                  }}
                  title="Right Click karo field change karne ke liye"
                >
                  {el.type === "barcode"? (
                    <RealBarcode value={String(rawVal)} width={el.width} height={el.height} />
                  ) : displayVal}
                </div>
              );
            })}
          </div>
          <div className="absolute bottom-2 left-2 text-[10px] text-gray-500">Real CODE128 Barcode - Full width - Blur me bhi 100% scan hoga</div>
        </div>

        <div className="border rounded-lg p-3 bg-gray-50">
          <h3 className="font-bold text-sm mb-3">Field Edit - Manual Setting</h3>
          {!selectedEl? <p className="text-xs text-gray-500">Label par kisi bhi field par click karo ya right click karo. Barcode par click karo to uska size bada-chhota kar sakte ho.</p> : (
            <div className="space-y-3">
              <div><label className="text-[10px] font-bold">Data Source</label>
                <select value={selectedEl.dataSource} onChange={(e) => updateElement(selectedEl.id, { dataSource: e.target.value, field: e.target.value })} className="w-full border rounded h-8 text-xs px-2 mt-1">
                  {fieldOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-[10px]">X mm</label><input type="number" step={0.5} value={selectedEl.x} onChange={(e) => updateElement(selectedEl.id, { x: Number(e.target.value) })} className="w-full border rounded h-7 text-xs px-1" /></div>
                <div><label className="text-[10px]">Y mm</label><input type="number" step={0.5} value={selectedEl.y} onChange={(e) => updateElement(selectedEl.id, { y: Number(e.target.value) })} className="w-full border rounded h-7 text-xs px-1" /></div>
                <div><label className="text-[10px]">W mm</label><input type="number" step={0.5} value={selectedEl.width} onChange={(e) => updateElement(selectedEl.id, { width: Number(e.target.value) })} className="w-full border rounded h-7 text-xs px-1" /></div>
                <div><label className="text-[10px]">H mm</label><input type="number" step={0.5} value={selectedEl.height} onChange={(e) => updateElement(selectedEl.id, { height: Number(e.target.value) })} className="w-full border rounded h-7 text-xs px-1" /></div>
              </div>
              <div><label className="text-[10px]">Font Size</label><input type="number" value={selectedEl.fontSize} onChange={(e) => updateElement(selectedEl.id, { fontSize: Number(e.target.value) })} className="w-full border rounded h-7 text-xs px-1" /></div>
              <div><label className="text-[10px]">Display Format</label><input value={selectedEl.displayFormat || ""} onChange={(e) => updateElement(selectedEl.id, { displayFormat: e.target.value })} placeholder="CDF {{value}} ya {{value}}" className="w-full border rounded h-7 text-xs px-1" /></div>
              <div className="flex gap-2">
                <button onClick={() => updateElement(selectedEl.id, { bold:!selectedEl.bold })} className={`flex-1 h-7 rounded text-xs border ${selectedEl.bold? "bg-black text-white" : "bg-white"}`}>Bold</button>
                <button onClick={() => { if (confirm("Delete this field?")) { const newTemplates = templates.map(t => t.id === selectedId? {...t, elements: t.elements.filter(e => e.id!== selectedEl.id) } : t); saveTemplates(newTemplates); setSelectedElId(""); } }} className="flex-1 h-7 rounded text-xs bg-red-600 text-white">Delete</button>
              </div>
              {selectedEl.type === "barcode" && (
                <div className="text-[10px] bg-green-50 p-2 rounded border text-green-800">Ye real barcode hai - width 2.4 moti lines, full 52mm wide, blur me bhi scan hoga, right product aayega. Height badhao to aur bada hoga.</div>
              )}
            </div>
          )}
        </div>
      </div>

      {contextMenu && (
        <div className="fixed bg-white border shadow-2xl rounded-lg p-2 z-[9999] w-64" style={{ left: contextMenu.x, top: contextMenu.y }} onMouseLeave={() => setContextMenu(null)}>
          <div className="text-[11px] font-bold mb-2 border-b pb-1">Field Select Karo</div>
          {fieldOptions.map(opt => (
            <button key={opt.value} className="w-full text-left text-xs px-3 py-2 hover:bg-black hover:text-white rounded flex justify-between" onClick={() => {
              updateElement(contextMenu.elId, { dataSource: opt.value, field: opt.value });
              setContextMenu(null);
              toast.success(`${opt.label} set ho gaya`);
            }}>
              <span>{opt.label}</span><span className="text-[9px] opacity-60">{opt.value}</span>
            </button>
          ))}
          <button className="w-full text-left text-xs px-3 py-2 hover:bg-red-600 hover:text-white rounded mt-2 border-t" onClick={() => setContextMenu(null)}>Close</button>
        </div>
      )}
    </div>
  );
}
