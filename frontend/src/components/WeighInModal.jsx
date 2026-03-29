import { useState } from "react";
import { format } from "date-fns";
import { Plus } from "lucide-react";

// Design tokens (espelham os do App.jsx para manter identidade visual)
const G = {
  50:"#FBF7EE", 100:"#F5ECDA", 200:"#EBDAB5", 300:"#D4B978",
  400:"#C4A44E", 500:"#A8872E", 600:"#8B6D1E", 700:"#6E5517",
  800:"#4E3D12", 900:"#332810"
};
const S = {
  blue:"#2980B9",
  yel:"#F39C12",
  grn:"#27AE60",
};

const safeFmt = (dateStr, fmt) => {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    return format(d, fmt);
  } catch {
    return "—";
  }
};

/**
 * Modal para registro de pesagem do paciente.
 * Inclui campos de peso total, massa magra e massa gorda,
 * além de toggle para envio de mensagem automática ao paciente.
 *
 * @param {{ p: object, onClose: ()=>void, onSave: (entry:object)=>void, onLog?: (log:object)=>void, onSendMsg?: (msg:object)=>void }} props
 */
export function WeighInModal({ p, onClose, onSave, onLog, onSendMsg }) {
  const [data,    setData]   = useState(format(new Date(), "yyyy-MM-dd"));
  const [peso,    setPeso]   = useState(p.cw || "");
  const [mm,      setMm]     = useState("");
  const [mg,      setMg]     = useState("");
  const [sendMsg, setSendMsg] = useState(true);
  const [err,     setErr]    = useState("");

  const w    = parseFloat(peso) || 0;
  const mVal = parseFloat(mm)   || 0;
  const gVal = parseFloat(mg)   || 0;
  const tot  = mVal + gVal;
  const pctMM = tot > 0 ? (mVal / tot * 100).toFixed(1) : "—";
  const pctMG = tot > 0 ? (gVal / tot * 100).toFixed(1) : "—";

  const perdaTotal = p.iw > 0 ? (p.iw - w) : null;
  const perdaSem   = p.cw > 0 ? (p.cw - w) : null;

  const msgText = [
    `📊 *Pesagem registrada — ${safeFmt(data, "dd/MM/yyyy")}*`,
    ``,
    `⚖️ Peso atual: *${w}kg*`,
    perdaSem   !== null ? `📉 Variação: ${perdaSem >= 0 ? `-${perdaSem.toFixed(1)}` : `+${Math.abs(perdaSem).toFixed(1)}`}kg esta pesagem` : null,
    perdaTotal !== null ? `🏆 Perda total no programa: *${perdaTotal.toFixed(1)}kg*` : null,
    (mVal > 0 || gVal > 0) ? `💪 Massa magra: ${mVal}kg (${pctMM}%) | Gordura: ${gVal}kg (${pctMG}%)` : null,
    ``,
    `Continue assim! 🌟 — Equipe Ser Livre`,
  ].filter(l => l !== null).join("\n");

  const handleSave = () => {
    if (!w) return setErr("Informe o peso total em kg.");
    const entry = {
      date:         new Date(data).toISOString(),
      weight:       w,
      massaMagra:   mVal,
      massaGordura: gVal,
      m: (p.history || [])[(p.history || []).length - 1]?.m || {},
      b: (p.history || [])[(p.history || []).length - 1]?.b || {},
      n: (p.history || [])[(p.history || []).length - 1]?.n || {},
    };
    onSave(entry);
    onLog && onLog({
      action: "pesagem",
      patientId: p.id,
      patientName: p.name,
      detail: `Peso: ${w}kg | MM: ${mVal}kg | MG: ${gVal}kg`,
    });
    if (sendMsg && onSendMsg) {
      onSendMsg({
        id:         crypto.randomUUID(),
        date:       new Date().toISOString(),
        senderName: "Equipe Ser Livre",
        role:       "admin",
        text:       msgText,
        conv:       `p_${p.id}`,
        read:       false,
      });
    }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"#fff", width:"100%", maxWidth:400, borderRadius:14, padding:24, boxShadow:"0 20px 60px rgba(0,0,0,0.3)", maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
          <span style={{ fontSize:15, fontWeight:700, color:G[800] }}>Registrar pesagem</span>
          <div onClick={onClose} style={{ cursor:"pointer", padding:4, borderRadius:6, background:G[50], fontSize:13, color:"#aaa" }}>✕</div>
        </div>
        <div style={{ fontSize:11, color:"#aaa", marginBottom:14 }}>{p.name}</div>

        {err && <div style={{ color:"#C0392B", fontSize:12, marginBottom:10, padding:"8px 10px", background:"#fef2f2", borderRadius:6 }}>{err}</div>}

        {[
          { label:"Data da pesagem",  val:data, set:setData, type:"date"   },
          { label:"Peso total (kg)",  val:peso, set:setPeso, type:"number", ph:"84.2" },
          { label:"Massa magra (kg)", val:mm,   set:setMm,   type:"number", ph:"56.8" },
          { label:"Massa gorda (kg)", val:mg,   set:setMg,   type:"number", ph:"27.4" },
        ].map(f => (
          <div key={f.label} style={{ marginBottom:12 }}>
            <label style={{ fontSize:11, fontWeight:500, color:G[700], marginBottom:3, display:"block" }}>{f.label}</label>
            <input
              type={f.type}
              value={f.val}
              onChange={e => f.set(e.target.value)}
              placeholder={f.ph || ""}
              style={{ width:"100%", padding:"9px 11px", borderRadius:7, border:`1px solid ${G[300]}`, fontSize:12, fontFamily:"inherit", outline:"none", boxSizing:"border-box" }}
            />
          </div>
        ))}

        {tot > 0 && (
          <div style={{ background:G[50], borderRadius:8, padding:"8px 12px", marginBottom:12, display:"flex", gap:16, fontSize:11 }}>
            <span style={{ color:S.blue }}>Magra: <strong>{pctMM}%</strong></span>
            <span style={{ color:S.yel }}>Gorda: <strong>{pctMG}%</strong></span>
          </div>
        )}

        {/* Toggle — enviar mensagem ao paciente */}
        <div style={{ border:`1.5px solid ${sendMsg ? G[400] : G[200]}`, borderRadius:10, padding:"12px 14px", marginBottom:16, background:sendMsg ? G[50] : "#fff", transition:"all 0.2s" }}>
          <div
            onClick={() => setSendMsg(!sendMsg)}
            style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", marginBottom: sendMsg ? 10 : 0 }}
          >
            <div style={{ width:36, height:20, borderRadius:10, background:sendMsg ? G[600] : "#ddd", position:"relative", transition:"background 0.2s", flexShrink:0 }}>
              <div style={{ position:"absolute", top:2, left:sendMsg ? 18 : 2, width:16, height:16, borderRadius:"50%", background:"#fff", transition:"left 0.2s", boxShadow:"0 1px 3px rgba(0,0,0,0.2)" }}/>
            </div>
            <div>
              <div style={{ fontSize:12, fontWeight:600, color:G[800] }}>Enviar evolução ao paciente</div>
              <div style={{ fontSize:10, color:"#aaa" }}>Mensagem automática na conversa</div>
            </div>
          </div>
          {sendMsg && w > 0 && (
            <div style={{ background:"#fff", borderRadius:8, padding:"10px 12px", border:`1px solid ${G[200]}`, fontSize:11, color:"#555", lineHeight:1.6, whiteSpace:"pre-line", fontFamily:"inherit" }}>
              {msgText}
            </div>
          )}
          {sendMsg && !w && (
            <div style={{ fontSize:10, color:"#aaa", textAlign:"center" }}>Preencha o peso para ver o preview</div>
          )}
        </div>

        <div style={{ display:"flex", gap:8 }}>
          <button
            onClick={handleSave}
            style={{ flex:1, padding:11, background:G[600], color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}
          >
            💾 Salvar pesagem
          </button>
          <button
            onClick={onClose}
            style={{ flex:1, padding:11, background:G[100], color:G[800], border:"none", borderRadius:8, fontSize:13, fontWeight:400, cursor:"pointer", fontFamily:"inherit" }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
