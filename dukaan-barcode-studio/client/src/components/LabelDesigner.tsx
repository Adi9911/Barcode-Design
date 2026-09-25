import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export type LabelElement = {
  id: string;
  type: "text" | "barcode" | "static";
  x: number; y: number; width: number; height: number;
  field: string; dataSource: string;
  fontSize: number; bold: boolean; color: string;
  align: "left"|"center"|"right";
  text: string; displayFormat?: string;
}

export type LabelTemplate = {
  id: string; name: string; width: number; height: number;
  elements: LabelElement[];
}

export default function LabelDesigner({ products }: { products: any[] }) {
  const [templates, setTemplates] = useState<LabelTemplate[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("dukaan-label-templates-v1") || "[]");
      // size ko lock rakho 54x37
      return saved.map((t:any) => ({...t, width: 54, height: 37}));
    } catch { return [] }
  });

  const [activeId, setActiveId] = useState<string>(templates[0]?.id || "");
  const [selectedEl, setSelectedEl] = useState<string | null>(null);
  const [drag, setDrag] = useState<any>(null);
  const [editingText, setEditingText] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const activeTemplate = templates.find(t => t.id === activeId) || templates[0];

  useEffect(() => {
    localStorage.setItem("dukaan-label-templates-v1", JSON.stringify(templates));
    window.dispatchEvent(new Event("templates-updated"));
  }, [templates]);

  const updateEl = (id: string, patch: Partial<LabelElement>) => {
    setTemplates(prev => prev.map(t =>
      t.id === activeId
       ? {...t, elements: t.elements.map(e => e.id === id? {...e,...patch} : e)}
        : t
    ));
  };

  const handleMouseDown = (e: React.MouseEvent, el: LabelElement, mode: "move" | "resize" = "move") => {
    e.stopPropagation();
    setSelectedEl(el.id);
    setEditingText(null);
    const rect = canvasRef.current!.getBoundingClientRect();
    setDrag({
      id: el.id, mode,
      startX: e.clientX, startY: e.clientY,
      origX: el.x, origY: el.y,
      origW: el.width, origH: el.height,
      origFont: el.fontSize,
      canvasW: rect.width, canvasH: rect.height
    });
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!drag ||!activeTemplate) return;
      const dxMm = (e.clientX - drag.startX) / drag.canvasW * activeTemplate.width;
      const dyMm = (e.clientY - drag.startY) / drag.canvasH * activeTemplate.height;

      if (drag.mode === "move") {
        // MOVE - cursor se khicho
        updateEl(drag.id, {
          x: Math.max(0, Math.min(drag.origX + dxMm, activeTemplate.width - drag.origW)),
          y: Math.max(0, Math.min(drag.origY + dyMm, activeTemplate.height - drag.origH))
        });
      } else {
        // RESIZE - corner se khicho + text bhi bada/chhota ho
        const newW = Math.max(4, drag.origW + dxMm);
        const newH = Math.max(3, drag.origH + dyMm);
        // font bhi proportional bada/chhota
        const scale = newW / drag.origW;
        const newFont = Math.max(3, Math.min(20, drag.origFont * scale));

        updateEl(drag.id, {
          width: Math.min(newW, activeTemplate.width - drag.origX),
          height: Math.min(newH, activeTemplate.height - drag.origY),
          fontSize: newFont
        });
      }
    };
    const onUp = () => setDrag(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); }
  }, [drag, activeTemplate]);

  if (!activeTemplate) {
    return <div className="p-4 border rounded bg-white text-xs">Excel upload karo - Auto template 54x37 banega</div>;
  }

  const sample = products[0];

  return (
    <div className="bg-white border rounded-xl p-3 mt-4" id="labels">
      <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
        <div className="flex gap-2 items-center">
          <Badge className="bg-black text-white">LABEL DESIGNER - 54x37 LOCKED - Drag & Edit</Badge>
          <select value={activeId} onChange={e => setActiveId(e.target.value)} className="border rounded h-8 px-2 text-xs">
            {templates.map(t => <option key={t.id} value={t.id}>{t.name} - {t.width}x{t.height}mm LOCKED</option>)}
          </select>
        </div>
        <div className="text-[10px] text-gray-500">👉 Field pe click = select | Drag karo = move | 🔵 Blue dot = corner se resize + text auto bada/chhota</div>
      </div>

      <div className="flex gap-4 flex-wrap">
        {/* CANVAS - 54x37 LOCKED SIZE */}
        <div ref={canvasRef} className="relative bg-white border-[2px] border-black shadow-lg select-none"
          style={{ width: "432px", height: "296px" }} // 54*8 x 37*8 - FIXED
          onMouseDown={() => { setSelectedEl(null); setEditingText(null); }}
        >
          <div className="absolute top-0 left-0 text-[8px] bg-black text-white px-1">54x37mm LOCKED - Size change nahi hoga</div>

          {activeTemplate.elements.map(el => {
            const isSel = selectedEl === el.id;
            const isEditing = editingText === el.id;
            const k = (el.dataSource || el.field || "").toLowerCase();
            let v = el.type === "static"? el.text : (sample as any)?.[k] || el.field;
            if (el.displayFormat && v && el.type!== "static") {
              try { v = el.displayFormat.replace("{{value}}", String(v)); } catch {}
            }
            if (el.type === "barcode" && sample) v = sample.code || "123456";

            return (
              <div key={el.id}
                className={`absolute group ${isSel? "border-2 border-blue-600 bg-blue-50/30" : "border border-dashed border-gray-400 hover:border-blue-400"} ${isEditing? "" : "cursor-move"}`}
                style={{
                  left: el.x * 8 + "px",
                  top: el.y * 8 + "px",
                  width: el.width * 8 + "px",
                  height: el.height * 8 + "px",
                }}
                onMouseDown={e =>!isEditing && handleMouseDown(e, el, "move")}
                onDoubleClick={() => setEditingText(el.id)}
              >
                {isEditing? (
                  <Input
                    autoFocus
                    value={el.type === "static"? el.text : el.displayFormat || ""}
                    onChange={e => updateEl(el.id, el.type === "static"? { text: e.target.value } : { displayFormat: e.target.value })}
                    onBlur={() => setEditingText(null)}
                    onKeyDown={e => e.key === "Enter" && setEditingText(null)}
                    className="w-full h-full text-[10px] p-1"
                    placeholder="{{value}} use karo"
                  />
                ) : el.type === "barcode"? (
                  <div className="w-full h-full bg-white border flex flex-col items-center justify-center">
                    <div className="w-full h-[70%] bg-[repeating-linear-gradient(90deg,black,black_2px,white_2px,white_4px)]"></div>
                    <div className="text-[8px] font-mono font-bold">{String(v).slice(0, 12)}</div>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center overflow-hidden px-1"
                    style={{
                      fontSize: el.fontSize * 0.85 + "px",
                      fontWeight: el.bold? 700 : 400,
                      textAlign: el.align as any,
                      color: el.color,
                      justifyContent: el.align === "center"? "center" : el.align === "right"? "flex-end" : "flex-start"
                    }}
                  >
                    <span className="truncate">{String(v).slice(0, 40)}</span>
                  </div>
                )}

                {/* RESIZE HANDLE - Corner se khicho */}
                {isSel &&!isEditing && (
                  <>
                    <div className="absolute -right-2 -bottom-2 w-4 h-4 bg-blue-600 rounded-full border-2 border-white cursor-nwse-resize shadow-lg flex items-center justify-center"
                      onMouseDown={e => handleMouseDown(e, el, "resize")}
                      title="Is corner se khicho - size + text dono bada/chhota hoga"
                    >
                      <div className="w-1 h-1 bg-white rounded-full"></div>
                    </div>
                    <div className="absolute -top-6 left-0 bg-blue-600 text-white text-[9px] px-2 py-0.5 rounded whitespace-nowrap">
                      {el.field} | {el.width.toFixed(1)}x{el.height.toFixed(1)}mm | Font: {el.fontSize.toFixed(1)}pt - Corner se khicho to text bhi bada hoga
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* EDIT PANEL */}
        <div className="flex-1 min-w-[260px] border rounded-lg p-3 bg-gray-50 max-h-[320px] overflow-auto">
          {selectedEl? (() => {
            const el = activeTemplate.elements.find(e => e.id === selectedEl)!;
            return (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <b className="text-xs">{el.field.toUpperCase()} EDIT</b>
                  <Badge variant="outline" className="text-[9px]">Text resize = corner drag</Badge>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-[9px] font-bold">X Position mm</label><Input type="number" step={0.5} value={el.x.toFixed(1)} onChange={e => updateEl(el.id, { x: Number(e.target.value) })} className="h-7 text-xs" /></div>
                  <div><label className="text-[9px] font-bold">Y Position mm</label><Input type="number" step={0.5} value={el.y.toFixed(1)} onChange={e => updateEl(el.id, { y: Number(e.target.value) })} className="h-7 text-xs" /></div>
                  <div><label className="text-[9px] font-bold">Width mm</label><Input type="number" step={0.5} value={el.width.toFixed(1)} onChange={e => { const newW = Number(e.target.value); const scale = newW / el.width; updateEl(el.id, { width: newW, fontSize: el.fontSize * scale }); }} className="h-7 text-xs" /></div>
                  <div><label className="text-[9px] font-bold">Height mm</label><Input type="number" step={0.5} value={el.height.toFixed(1)} onChange={e => updateEl(el.id, { height: Number(e.target.value) })} className="h-7 text-xs" /></div>
                </div>

                <div><label className="text-[9px] font-bold">Font Size pt - Corner drag se auto change hota hai</label><Input type="number" step={0.5} value={el.fontSize.toFixed(1)} onChange={e => updateEl(el.id, { fontSize: Number(e.target.value) })} className="h-7 text-xs" /></div>

                <div><label className="text-[9px] font-bold">Text / Format - Direct keyboard se edit karo</label>
                  <Input
                    value={el.type === "static"? el.text : el.displayFormat || ""}
                    onChange={e => updateEl(el.id, el.type === "static"? { text: e.target.value } : { displayFormat: e.target.value })}
                    className="h-7 text-xs"
                    placeholder='Exp: {{value}} ya Packed: {{value}}'
                  />
                  <div className="text-[8px] text-gray-500 mt-1">Double-click field pe bhi direct edit kar sakte ho</div>
                </div>

                <div className="flex gap-1 flex-wrap">
                  <Button size="sm" variant={el.bold? "default" : "outline"} className="h-7 text-[10px]" onClick={() => updateEl(el.id, { bold:!el.bold })}>B Bold</Button>
                  <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => updateEl(el.id, { align: el.align === "left"? "center" : el.align === "center"? "right" : "left" })}>Align: {el.align}</Button>
                  <Button size="sm" variant="destructive" className="h-7 text-[10px]" onClick={() => setTemplates(prev => prev.map(t => t.id === activeId? {...t, elements: t.elements.filter(e => e.id!== el.id)} : t))}>Delete Field</Button>
                </div>
              </div>
            );
          })() : (
            <div className="text-[11px] text-gray-600 p-3 text-center">
              <div className="text-lg mb-1">👆</div>
              <b>Kaise use kare:</b><br/>
              1. Label me kisi bhi field pe click karo<br/>
              2. <b>Drag karo</b> - field move hoga<br/>
              3. <b>Blue dot corner se khicho</b> - size bada/chhota + andar ka text bhi auto bada/chhota hoga<br/>
              4. <b>Double-click</b> - keyboard se direct edit<br/>
              <br/>
              <Badge className="text-[9px]">Label size 54x37 LOCKED hai - change nahi hoga</Badge>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
