import { useState, useRef, useEffect, useCallback } from "react";

const PRESETS = [
  { name: "Sky",      hex: "#4A90D9" },
  { name: "Mint",     hex: "#27AE60" },
  { name: "Rose",     hex: "#E74C3C" },
  { name: "Amber",    hex: "#F39C12" },
  { name: "Violet",   hex: "#8E44AD" },
  { name: "Coral",    hex: "#E67E22" },
  { name: "Teal",     hex: "#16A085" },
  { name: "Slate",    hex: "#5D6D7E" },
  { name: "Pink",     hex: "#E91E8C" },
  { name: "Lime",     hex: "#7CB342" },
  { name: "Navy",     hex: "#1A3A6B" },
  { name: "Sand",     hex: "#C9A96E" },
];

function hexToRgb(hex) {
  const h = hex.replace("#","");
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
}

function rgbToHex(r,g,b) {
  return "#"+[r,g,b].map(v=>v.toString(16).padStart(2,"0")).join("");
}

function mix(a,b,t){ return Math.round(a+(b-a)*t); }

// Draw a macOS Big Sur style folder on canvas
function drawFolder(canvas, hex) {
  const ctx = canvas.getContext("2d");
  const S = canvas.width;
  ctx.clearRect(0,0,S,S);

  const [r,g,b] = hexToRgb(hex);

  const pad = S * 0.06;
  const bx1 = pad, by1 = S*0.28, bx2 = S-pad, by2 = S*0.88;
  const br = S*0.07;
  const tx1 = pad, ty1 = S*0.22, tx2 = S*0.44, ty2 = S*0.32;
  const tr = S*0.045;
  const fy1 = S*0.34;

  function roundRect(x1,y1,x2,y2,rad){
    const rr = Math.max(1, Math.min(rad, (x2-x1)/2, (y2-y1)/2));
    ctx.beginPath();
    ctx.moveTo(x1+rr, y1);
    ctx.lineTo(x2-rr, y1);
    ctx.quadraticCurveTo(x2, y1, x2, y1+rr);
    ctx.lineTo(x2, y2-rr);
    ctx.quadraticCurveTo(x2, y2, x2-rr, y2);
    ctx.lineTo(x1+rr, y2);
    ctx.quadraticCurveTo(x1, y2, x1, y2-rr);
    ctx.lineTo(x1, y1+rr);
    ctx.quadraticCurveTo(x1, y1, x1+rr, y1);
    ctx.closePath();
  }

  // Shadow
  ctx.save();
  roundRect(bx1+S*0.008, by1+S*0.018, bx2+S*0.008, by2+S*0.018, br);
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = S*0.04;
  ctx.fillStyle = "rgba(0,0,0,0.01)";
  ctx.fill();
  ctx.restore();

  // Back (dark)
  const dr = Math.round(r*0.52), dg = Math.round(g*0.55), db = Math.round(b*0.62);
  roundRect(bx1,by1,bx2,by2,br);
  ctx.fillStyle = `rgb(${dr},${dg},${db})`;
  ctx.fill();

  // Tab
  const tr2 = Math.round(r*0.58), tg2 = Math.round(g*0.61), tb2 = Math.round(b*0.68);
  roundRect(tx1,ty1,tx2,ty2,tr);
  ctx.fillStyle = `rgb(${tr2},${tg2},${tb2})`;
  ctx.fill();

  // Front
  roundRect(bx1,fy1,bx2,by2,br);
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fill();

  // Highlight stripe
  const hi_h = Math.max(1, S*0.012);
  ctx.beginPath();
  ctx.rect(bx1+br, fy1, bx2-bx1-br*2, hi_h);
  ctx.fillStyle = `rgba(${Math.min(255,r+65)},${Math.min(255,g+65)},${Math.min(255,b+65)},0.3)`;
  ctx.fill();
}

// Build an iconset zip using JSZip (all sizes rendered on canvas)
async function buildIconsetZip(hex, folderName) {
  const JSZip = (await import("https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js")).default
    || window.JSZip;

  const SIZES = [16,32,64,128,256,512,1024];
  const zip = new JSZip();
  const dir = zip.folder(`${folderName}.iconset`);

  for (const sz of SIZES) {
    const cvs = document.createElement("canvas");
    cvs.width = cvs.height = sz;
    drawFolder(cvs, hex);
    const blob = await new Promise(res => cvs.toBlob(res, "image/png"));
    dir.file(`icon_${sz}x${sz}.png`, blob);
    if (sz <= 512) {
      const cvs2 = document.createElement("canvas");
      cvs2.width = cvs2.height = sz*2;
      drawFolder(cvs2, hex);
      const blob2 = await new Promise(res => cvs2.toBlob(res, "image/png"));
      dir.file(`icon_${sz}x${sz}@2x.png`, blob2);
    }
  }

  const readme = `HOW TO APPLY THIS ICON TO A MACOS FOLDER
==========================================

OPTION A — Terminal (proper .icns):
  iconutil -c icns ${folderName}.iconset -o ${folderName}.icns
  Then open .icns in Preview → Cmd+A → Cmd+C
  Select folder in Finder → Cmd+I → click small icon top-left → Cmd+V

OPTION B — No Terminal needed:
  Open icon_512x512.png in Preview → Cmd+A → Cmd+C
  Select folder in Finder → Cmd+I → click small folder icon → Cmd+V
`;
  zip.file("HOW_TO_APPLY.txt", readme);

  return await zip.generateAsync({ type: "blob" });
}

export default function App() {
  const [color, setColor] = useState("#4A90D9");
  const [folderName, setFolderName] = useState("My Folder");
  const [generating, setGenerating] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const canvasRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (canvasRef.current) drawFolder(canvasRef.current, color);
    setDownloaded(false);
  }, [color]);

  const handleDownload = async () => {
    setGenerating(true);
    try {
      const safe = folderName.replace(/[^a-zA-Z0-9_\-]/g,"_") || "folder";
      const blob = await buildIconsetZip(color, safe);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safe}_iconset.zip`;
      a.click();
      URL.revokeObjectURL(url);
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 3000);
    } catch(e) {
      console.error(e);
      alert("Error generating icons: " + e.message);
    }
    setGenerating(false);
  };

  const [r,g,b] = hexToRgb(color);
  const isDark = (r*0.299 + g*0.587 + b*0.114) < 128;

  return (
    <div style={{fontFamily:"var(--font-sans)", padding:"1.5rem", maxWidth:600, margin:"0 auto"}}>
      <h2 style={{fontSize:18, fontWeight:500, marginBottom:4, color:"var(--color-text-primary)"}}>macOS folder colorizer</h2>
      <p style={{fontSize:13, color:"var(--color-text-secondary)", marginBottom:"1.5rem"}}>
        Pick a color, preview your folder icon, and download an iconset zip.
      </p>

      {/* Main layout */}
      <div style={{display:"flex", gap:20, alignItems:"flex-start"}}>

        {/* Left: Preview */}
        <div style={{
          display:"flex", flexDirection:"column", alignItems:"center", gap:10,
          background:"var(--color-background-secondary)",
          border:"0.5px solid var(--color-border-tertiary)",
          borderRadius:"var(--border-radius-lg)",
          padding:"1.5rem 1.25rem", minWidth:160
        }}>
          <canvas
            ref={canvasRef}
            width={160} height={160}
            style={{width:120, height:120, borderRadius:4}}
          />
          <input
            value={folderName}
            onChange={e=>setFolderName(e.target.value)}
            style={{
              background:"transparent", border:"none", textAlign:"center",
              fontSize:13, fontWeight:500, color:"var(--color-text-primary)",
              width:"100%", outline:"none", cursor:"text"
            }}
            placeholder="Folder name"
          />
        </div>

        {/* Right: Controls */}
        <div style={{flex:1, display:"flex", flexDirection:"column", gap:16}}>

          {/* Color picker */}
          <div>
            <div style={{fontSize:11, fontWeight:500, color:"var(--color-text-secondary)", textTransform:"uppercase", letterSpacing:".06em", marginBottom:8}}>Color</div>
            <div style={{display:"flex", alignItems:"center", gap:10}}>
              <div
                onClick={()=>inputRef.current?.click()}
                style={{
                  width:40, height:40, borderRadius:"var(--border-radius-md)",
                  background:color, cursor:"pointer",
                  border:"0.5px solid var(--color-border-secondary)",
                  flexShrink:0,
                  display:"flex", alignItems:"center", justifyContent:"center"
                }}
                title="Click to open color dropper"
              >
                {/* Dropper icon SVG */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isDark?"rgba(255,255,255,0.7)":"rgba(0,0,0,0.4)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m2 22 1-1h3l9-9"/>
                  <path d="M3 21v-3l9-9"/>
                  <path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8-1 1a6 6 0 0 1 1.4 6.8L11 19"/>
                </svg>
              </div>
              <input
                ref={inputRef}
                type="color"
                value={color}
                onChange={e=>setColor(e.target.value)}
                style={{position:"absolute", opacity:0, pointerEvents:"none", width:1, height:1}}
              />
              <input
                value={color}
                onChange={e => {
                  const v = e.target.value;
                  if (/^#[0-9a-fA-F]{6}$/.test(v)) setColor(v);
                  else if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setColor(v);
                }}
                style={{
                  flex:1, fontFamily:"var(--font-mono)", fontSize:14,
                  letterSpacing:"0.05em", textTransform:"uppercase"
                }}
                placeholder="#4A90D9"
              />
            </div>
          </div>

          {/* Sliders */}
          {[["R", r, (v)=>setColor(rgbToHex(v,g,b)), "#e74c3c"],
            ["G", g, (v)=>setColor(rgbToHex(r,v,b)), "#27ae60"],
            ["B", b, (v)=>setColor(rgbToHex(r,g,v)), "#2980b9"]
          ].map(([label, val, fn, accent]) => (
            <div key={label} style={{display:"flex", alignItems:"center", gap:8}}>
              <span style={{fontSize:12, fontWeight:500, color:"var(--color-text-secondary)", width:14}}>{label}</span>
              <input
                type="range" min="0" max="255" value={val} step="1"
                onChange={e=>fn(parseInt(e.target.value))}
                style={{flex:1, accentColor:accent}}
              />
              <span style={{fontSize:12, color:"var(--color-text-secondary)", width:28, textAlign:"right"}}>{val}</span>
            </div>
          ))}

          {/* Presets */}
          <div>
            <div style={{fontSize:11, fontWeight:500, color:"var(--color-text-secondary)", textTransform:"uppercase", letterSpacing:".06em", marginBottom:8}}>Presets</div>
            <div style={{display:"flex", flexWrap:"wrap", gap:6}}>
              {PRESETS.map(p => (
                <button
                  key={p.hex}
                  onClick={()=>setColor(p.hex)}
                  title={p.name}
                  style={{
                    width:26, height:26, borderRadius:"50%",
                    background:p.hex, cursor:"pointer",
                    border: color.toLowerCase()===p.hex.toLowerCase()
                      ? "2.5px solid var(--color-text-primary)"
                      : "2px solid transparent",
                    outline:"none", padding:0
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Download */}
      <div style={{marginTop:"1.5rem"}}>
        <button
          onClick={handleDownload}
          disabled={generating}
          style={{
            width:"100%", padding:"10px 0",
            background: downloaded ? "var(--color-background-success)" : color,
            color: downloaded ? "var(--color-text-success)" : (isDark ? "#fff" : "#000"),
            border: downloaded ? "0.5px solid var(--color-border-success)" : "none",
            borderRadius:"var(--border-radius-md)",
            fontSize:14, fontWeight:500, cursor: generating ? "wait" : "pointer",
            opacity: generating ? 0.7 : 1,
            transition:"background 0.25s, color 0.25s"
          }}
        >
          {generating ? "Building iconset…" : downloaded ? "✓ Downloaded!" : `↓  Download ${(folderName||"folder").replace(/[^a-zA-Z0-9_\- ]/g,"").trim() || "folder"}_iconset.zip`}
        </button>
        <p style={{fontSize:11, color:"var(--color-text-secondary)", textAlign:"center", marginTop:8}}>
          Includes all macOS sizes (16–1024px) + @2x retina • PNG iconset + apply instructions
        </p>
      </div>
    </div>
  );
}
