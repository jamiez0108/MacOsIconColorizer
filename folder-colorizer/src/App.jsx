import { useState, useRef, useEffect } from "react";

const PRESETS = [
  { name: "Sky",    hex: "#4A90D9" },
  { name: "Mint",   hex: "#27AE60" },
  { name: "Rose",   hex: "#E74C3C" },
  { name: "Amber",  hex: "#F39C12" },
  { name: "Violet", hex: "#8E44AD" },
  { name: "Coral",  hex: "#E67E22" },
  { name: "Teal",   hex: "#16A085" },
  { name: "Slate",  hex: "#5D6D7E" },
  { name: "Pink",   hex: "#E91E8C" },
  { name: "Lime",   hex: "#7CB342" },
  { name: "Navy",   hex: "#1A3A6B" },
  { name: "Sand",   hex: "#C9A96E" },
];

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
}
function rgbToHex(r,g,b) {
  return "#" + [r,g,b].map(v => v.toString(16).padStart(2,"0")).join("");
}

function drawFolder(canvas, hex) {
  const ctx = canvas.getContext("2d");
  const S = canvas.width;
  ctx.clearRect(0,0,S,S);
  const [r,g,b] = hexToRgb(hex);
  const pad = S*0.06, bx1=pad, by1=S*0.28, bx2=S-pad, by2=S*0.88, br=S*0.07;
  const tx1=pad, ty1=S*0.22, tx2=S*0.44, ty2=S*0.32, tr=S*0.045, fy1=S*0.34;

  function rr(x1,y1,x2,y2,rad) {
    const r2=Math.max(1,Math.min(rad,(x2-x1)/2,(y2-y1)/2));
    ctx.beginPath();
    ctx.moveTo(x1+r2,y1); ctx.lineTo(x2-r2,y1);
    ctx.quadraticCurveTo(x2,y1,x2,y1+r2); ctx.lineTo(x2,y2-r2);
    ctx.quadraticCurveTo(x2,y2,x2-r2,y2); ctx.lineTo(x1+r2,y2);
    ctx.quadraticCurveTo(x1,y2,x1,y2-r2); ctx.lineTo(x1,y1+r2);
    ctx.quadraticCurveTo(x1,y1,x1+r2,y1); ctx.closePath();
  }

  ctx.save();
  rr(bx1+S*0.008,by1+S*0.018,bx2+S*0.008,by2+S*0.018,br);
  ctx.shadowColor="rgba(0,0,0,0.3)"; ctx.shadowBlur=S*0.05;
  ctx.fillStyle="rgba(0,0,0,0.01)"; ctx.fill();
  ctx.restore();

  rr(bx1,by1,bx2,by2,br);
  ctx.fillStyle=`rgb(${Math.round(r*0.52)},${Math.round(g*0.55)},${Math.round(b*0.62)})`; ctx.fill();
  rr(tx1,ty1,tx2,ty2,tr);
  ctx.fillStyle=`rgb(${Math.round(r*0.58)},${Math.round(g*0.61)},${Math.round(b*0.68)})`; ctx.fill();
  rr(bx1,fy1,bx2,by2,br);
  ctx.fillStyle=`rgb(${r},${g},${b})`; ctx.fill();
  ctx.beginPath(); ctx.rect(bx1+br,fy1,bx2-bx1-br*2,Math.max(1,S*0.012));
  ctx.fillStyle=`rgba(${Math.min(255,r+65)},${Math.min(255,g+65)},${Math.min(255,b+65)},0.28)`; ctx.fill();
}

async function buildIconsetZip(hex, folderName) {
  const mod = await import("https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js");
  const JSZip = mod.default || window.JSZip;
  const SIZES = [16,32,64,128,256,512,1024];
  const zip = new JSZip();
  const dir = zip.folder(`${folderName}.iconset`);
  for (const sz of SIZES) {
    const c = document.createElement("canvas"); c.width=c.height=sz; drawFolder(c,hex);
    dir.file(`icon_${sz}x${sz}.png`, await new Promise(res=>c.toBlob(res,"image/png")));
    if (sz<=512) {
      const c2=document.createElement("canvas"); c2.width=c2.height=sz*2; drawFolder(c2,hex);
      dir.file(`icon_${sz}x${sz}@2x.png`, await new Promise(res=>c2.toBlob(res,"image/png")));
    }
  }
  zip.file("HOW_TO_APPLY.txt",
    `HOW TO APPLY THIS ICON TO A MACOS FOLDER\n==========================================\n\n` +
    `OPTION A — Terminal:\n  iconutil -c icns ${folderName}.iconset -o ${folderName}.icns\n` +
    `  Open .icns in Preview → Cmd+A → Cmd+C\n  Select folder → Cmd+I → click small icon top-left → Cmd+V\n\n` +
    `OPTION B — No Terminal:\n  Open icon_512x512.png in Preview → Cmd+A → Cmd+C\n  Select folder → Cmd+I → click small folder icon → Cmd+V\n`
  );
  return await zip.generateAsync({ type: "blob" });
}

export default function App() {
  const [color, setColor]       = useState("#4A90D9");
  const [folderName, setFolderName] = useState("My Folder");
  const [generating, setGenerating] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const canvasRef = useRef(null);
  const pickerRef = useRef(null);

  useEffect(() => {
    if (canvasRef.current) drawFolder(canvasRef.current, color);
    setDownloaded(false);
  }, [color]);

  const handleDownload = async () => {
    setGenerating(true);
    try {
      const safe = folderName.replace(/[^a-zA-Z0-9_\-]/g,"_") || "folder";
      const blob = await buildIconsetZip(color, safe);
      const a = Object.assign(document.createElement("a"), {
        href: URL.createObjectURL(blob), download: `${safe}_iconset.zip`
      });
      a.click(); URL.revokeObjectURL(a.href);
      setDownloaded(true); setTimeout(()=>setDownloaded(false),3000);
    } catch(e) { alert("Error: "+e.message); }
    setGenerating(false);
  };

  const [r,g,b] = hexToRgb(color);
  const lum = r*0.299+g*0.587+b*0.114;
  const isDark = lum < 140;

  const card = {
    background:"#1a1a1f",
    border:"1px solid rgba(255,255,255,0.07)",
    borderRadius:20,
    padding:"20px 22px",
  };

  return (
    <div style={{
      minHeight:"100vh", background:"#111115",
      display:"flex", alignItems:"center", justifyContent:"center",
      fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif",
      padding:"2rem"
    }}>
      <div style={{width:"100%", maxWidth:480}}>

        {/* Header */}
        <div style={{textAlign:"center", marginBottom:28}}>
          <h1 style={{fontSize:22, fontWeight:600, color:"#fff", margin:0, letterSpacing:"-0.4px"}}>
            Folder Colorizer
          </h1>
          <p style={{fontSize:13, color:"rgba(255,255,255,0.38)", marginTop:6}}>
            macOS icon generator
          </p>
        </div>

        {/* Preview card */}
        <div style={{...card, marginBottom:12, display:"flex", flexDirection:"column", alignItems:"center", gap:14, padding:"32px 22px"}}>
          <div style={{
            width:140, height:140,
            borderRadius:24,
            background:`radial-gradient(circle at 40% 30%, rgba(${r},${g},${b},0.18) 0%, transparent 70%)`,
            display:"flex", alignItems:"center", justifyContent:"center",
          }}>
            <canvas ref={canvasRef} width={200} height={200} style={{width:120,height:120}} />
          </div>
          <input
            value={folderName}
            onChange={e=>setFolderName(e.target.value)}
            style={{
              background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)",
              borderRadius:10, padding:"7px 14px", textAlign:"center",
              fontSize:14, fontWeight:500, color:"#fff", outline:"none",
              width:200, letterSpacing:"0.01em"
            }}
            placeholder="Folder name"
          />
        </div>

        {/* Color picker row */}
        <div style={{...card, marginBottom:12}}>
          <div style={{display:"flex", alignItems:"center", gap:12, marginBottom:16}}>
            {/* Swatch / dropper */}
            <div
              onClick={()=>pickerRef.current?.click()}
              style={{
                width:44, height:44, borderRadius:14, background:color,
                cursor:"pointer", flexShrink:0, flexDirection:"column",
                display:"flex", alignItems:"center", justifyContent:"center",
                boxShadow:`0 0 0 1px rgba(0,0,0,0.3), 0 4px 12px rgba(${r},${g},${b},0.5)`
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke={isDark?"rgba(255,255,255,0.75)":"rgba(0,0,0,0.45)"}
                strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m2 22 1-1h3l9-9"/><path d="M3 21v-3l9-9"/>
                <path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8-1 1a6 6 0 0 1 1.4 6.8L11 19"/>
              </svg>
            </div>
            <input ref={pickerRef} type="color" value={color} onChange={e=>setColor(e.target.value)}
              style={{position:"absolute",opacity:0,pointerEvents:"none",width:1,height:1}} />
            <input
              value={color.toUpperCase()}
              onChange={e=>{const v=e.target.value; if(/^#[0-9a-fA-F]{6}$/.test(v))setColor(v); else if(/^#[0-9a-fA-F]{0,6}$/.test(v))setColor(v);}}
              style={{
                flex:1, background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)",
                borderRadius:10, padding:"10px 14px", fontSize:14, fontFamily:"'SF Mono',monospace",
                color:"#fff", outline:"none", letterSpacing:"0.08em"
              }}
            />
          </div>

          {/* RGB sliders */}
          {[
            ["R", r, v=>setColor(rgbToHex(v,g,b)), `rgba(220,60,60,1)`, `rgba(220,60,60,0.25)`],
            ["G", g, v=>setColor(rgbToHex(r,v,b)), `rgba(50,180,90,1)`,  `rgba(50,180,90,0.25)`],
            ["B", b, v=>setColor(rgbToHex(r,g,v)), `rgba(60,140,240,1)`, `rgba(60,140,240,0.25)`],
          ].map(([label,val,fn,hi,lo])=>(
            <div key={label} style={{display:"flex", alignItems:"center", gap:10, marginBottom:8}}>
              <span style={{fontSize:11, fontWeight:600, color:"rgba(255,255,255,0.35)", width:12, letterSpacing:"0.05em"}}>{label}</span>
              <div style={{flex:1, position:"relative"}}>
                <input type="range" min="0" max="255" value={val} step="1"
                  onChange={e=>fn(parseInt(e.target.value))}
                  style={{
                    width:"100%", height:4, borderRadius:99,
                    accentColor:hi, cursor:"pointer",
                    background:`linear-gradient(to right, ${hi} 0%, ${hi} ${val/255*100}%, rgba(255,255,255,0.1) ${val/255*100}%, rgba(255,255,255,0.1) 100%)`
                  }}
                />
              </div>
              <span style={{fontSize:12, color:"rgba(255,255,255,0.4)", width:28, textAlign:"right", fontVariantNumeric:"tabular-nums"}}>{val}</span>
            </div>
          ))}
        </div>

        {/* Presets */}
        <div style={{...card, marginBottom:12}}>
          <div style={{fontSize:10, fontWeight:600, color:"rgba(255,255,255,0.3)", letterSpacing:"0.1em", marginBottom:12, textTransform:"uppercase"}}>Presets</div>
          <div style={{display:"flex", flexWrap:"wrap", gap:8}}>
            {PRESETS.map(p=>(
              <button key={p.hex} onClick={()=>setColor(p.hex)} title={p.name}
                style={{
                  width:32, height:32, borderRadius:10, background:p.hex,
                  cursor:"pointer", border:"none", padding:0, position:"relative",
                  boxShadow: color.toLowerCase()===p.hex.toLowerCase()
                    ? `0 0 0 2px #111115, 0 0 0 4px ${p.hex}`
                    : "none",
                  transform: color.toLowerCase()===p.hex.toLowerCase() ? "scale(1.12)" : "scale(1)",
                  transition:"transform 0.15s, box-shadow 0.15s"
                }}
              />
            ))}
          </div>
        </div>

        {/* Download button */}
        <button
          onClick={handleDownload}
          disabled={generating}
          style={{
            width:"100%", padding:"14px 0", borderRadius:16,
            background: downloaded
              ? "rgba(39,174,96,0.2)"
              : `linear-gradient(135deg, rgb(${Math.min(255,r+20)},${Math.min(255,g+20)},${Math.min(255,b+20)}), rgb(${Math.max(0,r-30)},${Math.max(0,g-30)},${Math.max(0,b-30)}))`,
            color: downloaded ? "#27ae60" : (isDark?"#fff":"rgba(0,0,0,0.85)"),
            border: downloaded ? "1px solid rgba(39,174,96,0.35)" : "none",
            fontSize:15, fontWeight:600, cursor:generating?"wait":"pointer",
            opacity:generating?0.6:1, letterSpacing:"-0.2px",
            transition:"all 0.25s", boxShadow: downloaded ? "none" : `0 4px 20px rgba(${r},${g},${b},0.4)`
          }}
        >
          {generating ? "Building iconset…" : downloaded ? "✓ Downloaded!" : `↓  Download iconset.zip`}
        </button>
        <p style={{fontSize:11, color:"rgba(255,255,255,0.25)", textAlign:"center", marginTop:10}}>
          All macOS sizes (16–1024px) + @2x retina variants included
        </p>
      </div>
    </div>
  );
}