import { useState, useEffect, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from "recharts";

const C = {
  bg:"#0d0d0d", surface:"#161616", card:"#1e1e1e", cardHover:"#252525",
  accent:"#FF8C42", accentDim:"#FF8C4222", text:"#e8e8e8", muted:"#666",
  border:"#272727", success:"#4ade80", error:"#f87171", highlight:"#FFD166",
};
const TAG_COLORS = {
  "財務・会計":"#3b82f6","経済学":"#8b5cf6","中小企業政策":"#10b981",
  "テクノロジー":"#f59e0b","カスタム":"#FF8C42",
};
const PRESETS = [
  {id:1,emoji:"📉",title:"財務諸表の読み方",    tag:"財務・会計",   color:"#3b82f6"},
  {id:2,emoji:"🌍",title:"需要と供給の基礎",    tag:"経済学",       color:"#8b5cf6"},
  {id:3,emoji:"🏭",title:"中小企業政策の全体像",tag:"中小企業政策", color:"#10b981"},
  {id:4,emoji:"💹",title:"キャッシュフロー計算書",tag:"財務・会計", color:"#3b82f6"},
  {id:5,emoji:"📊",title:"マクロ経済指標の見方",tag:"経済学",       color:"#8b5cf6"},
  {id:6,emoji:"🤝",title:"中小企業支援機関の役割",tag:"中小企業政策",color:"#10b981"},
  {id:7,emoji:"⚡",title:"AIとDX推進の基礎",    tag:"テクノロジー", color:"#f59e0b"},
  {id:8,emoji:"🎯",title:"損益分岐点分析",      tag:"財務・会計",   color:"#3b82f6"},
];

const LESSON_SYS = `あなたは優秀な教育コンテンツ作成者です。指定トピックの学習コンテンツを日本語で作成してください。
以下のJSON形式のみを返してください（前置き・コードブロック不要）。
各セクションにはテキスト（80字程度に簡潔化）＋visualで補完してください。

visual.typeは以下から選択:
- "bar": 棒グラフ  data:[{"label":"ラベル","value":数値(0-100),"color":"#hex色"}] 最大5項目
- "metrics": 指標カード  data:[{"icon":"絵文字","label":"名称","value":"数値や文字"}] 最大4項目  
- "comparison": 比較表  labels:{"left":"Aの名称","right":"Bの名称"} data:[{"aspect":"観点","left":"内容","right":"内容"}] 最大4行
- null: ビジュアルなし

{"title":"タイトル","subtitle":"サブタイトル1文","sections":[{"icon":"絵文字","heading":"見出し","content":"80字の解説文","visual":{"type":"bar","title":"グラフタイトル","data":[{"label":"項目","value":75,"color":"#3b82f6"}]}},{"icon":"絵文字","heading":"見出し","content":"解説文","visual":{"type":"metrics","data":[{"icon":"💰","label":"指標","value":"数値"}]}},{"icon":"絵文字","heading":"見出し","content":"解説文","visual":{"type":"comparison","title":"比較タイトル","labels":{"left":"A","right":"B"},"data":[{"aspect":"観点","left":"内容","right":"内容"}]}},{"icon":"絵文字","heading":"見出し","content":"解説文","visual":null}],"key_points":["ポイント1","ポイント2","ポイント3"]}`;

const QUIZ_SYS = `あなたは試験問題作成の専門家です。4択問題を3問作成してください。
以下のJSON配列のみを返してください（前置き・コードブロック不要）:
[{"question":"問題文","options":["A","B","C","D"],"correct":0,"explanation":"解説文"}]`;

async function callClaude(sys, msg) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:2500,
      system:sys, messages:[{role:"user",content:msg}] }),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const d = await r.json();
  return d.content?.map(b=>b.text||"").join("")||"";
}
function parseJSON(raw) {
  const s = raw.replace(/```(?:json)?/g,"").trim();
  try { return JSON.parse(s); } catch {}
  const o = s.match(/(\{[\s\S]*\})/); if (o) try { return JSON.parse(o[1]); } catch {}
  const a = s.match(/(\[[\s\S]*\])/); if (a) try { return JSON.parse(a[1]); } catch {}
  throw new Error("JSON parse failed");
}

// ─── Visual Components ────────────────────────────────────────────────────────

const BAR_DEFAULTS = ["#FF8C42","#3b82f6","#10b981","#8b5cf6","#f59e0b"];

function VisualBar({ visual }) {
  const data = visual.data || [];
  return (
    <div style={{marginTop:14,background:"#111",borderRadius:10,padding:"14px 10px 8px"}}>
      {visual.title && <div style={{color:C.muted,fontSize:11,fontWeight:700,marginBottom:10,paddingLeft:4}}>{visual.title}</div>}
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{top:0,right:8,left:-20,bottom:0}}>
          <XAxis dataKey="label" tick={{fill:C.muted,fontSize:11}} axisLine={false} tickLine={false}/>
          <YAxis tick={{fill:C.muted,fontSize:10}} axisLine={false} tickLine={false}/>
          <Tooltip contentStyle={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,fontSize:12,color:C.text}} cursor={{fill:"#ffffff08"}}/>
          <Bar dataKey="value" radius={[5,5,0,0]}>
            {data.map((d,i)=><Cell key={i} fill={d.color||BAR_DEFAULTS[i%BAR_DEFAULTS.length]}/>)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function VisualMetrics({ visual }) {
  const data = visual.data || [];
  return (
    <div style={{marginTop:14,display:"grid",gridTemplateColumns:`repeat(${Math.min(data.length,4)},1fr)`,gap:8}}>
      {data.map((m,i)=>(
        <div key={i} style={{background:"#111",borderRadius:10,padding:"12px 10px",textAlign:"center",border:`1px solid ${C.border}`}}>
          <div style={{fontSize:22,marginBottom:6}}>{m.icon}</div>
          <div style={{color:C.accent,fontWeight:800,fontSize:16,lineHeight:1.2}}>{m.value}</div>
          <div style={{color:C.muted,fontSize:10,marginTop:4}}>{m.label}</div>
        </div>
      ))}
    </div>
  );
}

function VisualComparison({ visual }) {
  const data = visual.data || [];
  const L = visual.labels || { left:"A", right:"B" };
  return (
    <div style={{marginTop:14,overflow:"hidden",borderRadius:10,border:`1px solid ${C.border}`}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",background:"#111"}}>
        <div style={{padding:"8px 12px",color:C.muted,fontSize:11,fontWeight:700,borderRight:`1px solid ${C.border}`}}>観点</div>
        <div style={{padding:"8px 12px",color:"#3b82f6",fontSize:11,fontWeight:700,textAlign:"center",borderRight:`1px solid ${C.border}`}}>{L.left}</div>
        <div style={{padding:"8px 12px",color:C.accent,fontSize:11,fontWeight:700,textAlign:"center"}}>{L.right}</div>
      </div>
      {data.map((row,i)=>(
        <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",
          background:i%2===0?"#0d0d0d":"#111",borderTop:`1px solid ${C.border}`}}>
          <div style={{padding:"9px 12px",color:C.muted,fontSize:12,borderRight:`1px solid ${C.border}`}}>{row.aspect}</div>
          <div style={{padding:"9px 12px",color:C.text,fontSize:12,borderRight:`1px solid ${C.border}`,textAlign:"center"}}>{row.left}</div>
          <div style={{padding:"9px 12px",color:C.text,fontSize:12,textAlign:"center"}}>{row.right}</div>
        </div>
      ))}
    </div>
  );
}

function VisualBlock({ visual }) {
  if (!visual || !visual.type) return null;
  if (visual.type === "bar")        return <VisualBar visual={visual}/>;
  if (visual.type === "metrics")    return <VisualMetrics visual={visual}/>;
  if (visual.type === "comparison") return <VisualComparison visual={visual}/>;
  return null;
}

// ─── UI Helpers ───────────────────────────────────────────────────────────────

function Bar2({ value, color=C.accent, h=4 }) {
  return (
    <div style={{background:C.border,borderRadius:4,height:h,overflow:"hidden"}}>
      <div style={{width:`${value}%`,height:"100%",background:color,transition:"width 0.4s ease",borderRadius:4}}/>
    </div>
  );
}
function Btn({ children, onClick, variant="primary", style:s={} }) {
  const v = {
    primary:{background:C.accent,color:"#fff",border:"none"},
    ghost:{background:"transparent",border:`1px solid ${C.border}`,color:C.muted},
    outline:{background:C.accentDim,border:`1px solid ${C.accent}50`,color:C.accent},
  };
  return <button onClick={onClick}
    style={{...{borderRadius:8,fontWeight:700,cursor:"pointer",fontSize:13,padding:"10px 18px",transition:"all 0.15s"},...v[variant],...s}}>
    {children}
  </button>;
}

// ─── TopicCard ────────────────────────────────────────────────────────────────

function TopicCard({ topic, onClick, cached }) {
  const [hov,setHov]=useState(false);
  const tc = TAG_COLORS[topic.tag]||C.accent;
  return (
    <div onClick={()=>onClick(topic)} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{background:hov?C.cardHover:C.card,border:`1px solid ${hov?C.accent+"60":C.border}`,
        borderRadius:12,cursor:"pointer",transition:"all 0.2s",transform:hov?"translateY(-2px)":"none",overflow:"hidden",position:"relative"}}>
      {cached && (
        <div style={{position:"absolute",top:8,right:8,background:C.success+"30",color:C.success,
          fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:10,zIndex:1}}>
          ✓ 保存済
        </div>
      )}
      <div style={{height:100,background:`linear-gradient(135deg,${topic.color}22,${topic.color}06)`,
        display:"flex",alignItems:"center",justifyContent:"center",fontSize:40,borderBottom:`1px solid ${C.border}`}}>
        {topic.emoji}
      </div>
      <div style={{padding:"11px 13px"}}>
        <span style={{display:"inline-block",background:tc+"20",color:tc,
          fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:4}}>{topic.tag}</span>
        <div style={{color:C.text,fontWeight:600,fontSize:13,lineHeight:1.4,marginTop:6}}>{topic.title}</div>
      </div>
    </div>
  );
}

// ─── Loading ──────────────────────────────────────────────────────────────────

function LoadingView({ topic, progress, steps }) {
  return (
    <div style={{maxWidth:420,margin:"60px auto 0",textAlign:"center",padding:"0 20px"}}>
      <div style={{fontSize:50,marginBottom:14}}>{topic?.emoji}</div>
      <div style={{color:C.text,fontWeight:700,fontSize:16,marginBottom:5}}>{topic?.title}</div>
      <div style={{color:C.muted,fontSize:12,marginBottom:22}}>AIが並列でコンテンツを生成中...</div>
      <div style={{marginBottom:8}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
          <span style={{color:C.muted,fontSize:11}}>生成進捗</span>
          <span style={{color:C.accent,fontSize:12,fontWeight:700}}>{Math.round(progress)}%</span>
        </div>
        <Bar2 value={progress}/>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:7,marginTop:18}}>
        {[{k:"lesson",l:"📖 レッスンコンテンツ + ビジュアル"},{k:"quiz",l:"🎯 クイズ問題"}].map(({k,l})=>(
          <div key={k} style={{background:C.card,border:`1px solid ${steps[k]?C.success+"50":C.border}`,
            borderRadius:8,padding:"10px 15px",display:"flex",justifyContent:"space-between",alignItems:"center",transition:"border 0.3s"}}>
            <span style={{color:C.text,fontSize:13}}>{l}</span>
            {steps[k]
              ? <span style={{color:C.success,fontSize:12,fontWeight:700}}>✓ 完了</span>
              : <span style={{color:C.muted,fontSize:12,animation:"pulse 1.2s infinite"}}>生成中...</span>}
          </div>
        ))}
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );
}

// ─── Lesson ───────────────────────────────────────────────────────────────────

function LessonView({ topic, lesson, onStartQuiz, onAddHighlight }) {
  const [progress,setProgress] = useState(0);
  const [activeSection,setActive] = useState(0);
  const [popup,setPopup] = useState(null); // {x,y,text,section}
  const sectionRefs = useRef([]);
  const containerRef = useRef(null);

  useEffect(()=>{
    const iv = setInterval(()=>setProgress(p=>{if(p>=100){clearInterval(iv);return 100;}return p+0.2;}),70);
    return ()=>clearInterval(iv);
  },[]);

  useEffect(()=>{
    const total = lesson.sections?.length||1;
    setActive(Math.min(Math.floor((progress/100)*total),total-1));
  },[progress]);

  // Global mouseup for reliable highlight detection
  useEffect(()=>{
    const onUp = ()=>{
      setTimeout(()=>{
        const sel = window.getSelection();
        const text = sel?.toString().trim();
        if (!text || text.length < 5) { setPopup(null); return; }

        // Find which section contains the selection
        let sectionHeading = "レッスン";
        const anchor = sel.anchorNode;
        sectionRefs.current.forEach((ref,i)=>{
          if (ref && anchor && ref.contains(anchor)) {
            sectionHeading = lesson.sections?.[i]?.heading || sectionHeading;
          }
        });

        const range = sel.getRangeAt(0).getBoundingClientRect();
        setPopup({ x: range.left + range.width/2, y: range.top - 8, text, section: sectionHeading });
      }, 10);
    };
    document.addEventListener("mouseup", onUp);
    return ()=>document.removeEventListener("mouseup", onUp);
  },[lesson]);

  const saveHL = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (!popup) return;
    onAddHighlight({ id:Date.now(), text:popup.text, section:popup.section,
      topic:topic.title, date:new Date().toLocaleDateString("ja-JP") });
    setPopup(null);
    window.getSelection()?.removeAllRanges();
  };
  const closePopup = (e) => { e.preventDefault(); e.stopPropagation(); setPopup(null); window.getSelection()?.removeAllRanges(); };

  return (
    <div ref={containerRef} style={{maxWidth:720,margin:"0 auto"}}>
      {/* Highlight popup — fixed to viewport */}
      {popup && (
        <div style={{position:"fixed",left:popup.x-80,top:popup.y-42,zIndex:9999,
          background:C.highlight,borderRadius:8,padding:"6px 14px",
          display:"flex",gap:10,alignItems:"center",
          boxShadow:"0 4px 20px #000a",pointerEvents:"all"}}>
          <button onMouseDown={saveHL}
            style={{background:"none",border:"none",cursor:"pointer",fontWeight:700,fontSize:12,color:"#1a1a1a"}}>
            ✏️ ハイライト保存
          </button>
          <button onMouseDown={closePopup}
            style={{background:"none",border:"none",cursor:"pointer",color:"#555",fontSize:14}}>✕</button>
        </div>
      )}

      {/* Header */}
      <div style={{background:C.card,borderRadius:12,border:`1px solid ${C.border}`,overflow:"hidden",marginBottom:14}}>
        <div style={{background:"linear-gradient(135deg,#1a1a2e,#16213e)",padding:"22px 20px",
          display:"flex",alignItems:"center",gap:16}}>
          <div style={{fontSize:44}}>{topic.emoji}</div>
          <div>
            <div style={{color:C.muted,fontSize:10,fontWeight:700,letterSpacing:"0.1em",marginBottom:3}}>📺 NOW LEARNING</div>
            <div style={{color:C.text,fontSize:18,fontWeight:700,lineHeight:1.3}}>{lesson.title||topic.title}</div>
            <div style={{color:C.muted,fontSize:12,marginTop:3}}>{lesson.subtitle}</div>
          </div>
        </div>
        <div style={{padding:"9px 17px",background:"#090909"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
            <span style={{color:C.muted,fontSize:11}}>学習進捗</span>
            <span style={{color:C.accent,fontSize:12,fontWeight:700}}>{Math.round(progress)}%</span>
          </div>
          <Bar2 value={progress}/>
        </div>
      </div>

      <div style={{color:C.muted,fontSize:11,textAlign:"center",marginBottom:10}}>
        💡 テキストを選択→ <span style={{color:C.highlight}}>ハイライト保存</span>できます
      </div>

      {/* Sections */}
      <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:14}}>
        {(lesson.sections||[]).map((sec,i)=>{
          const active = i===activeSection;
          return (
            <div key={i} ref={el=>sectionRefs.current[i]=el}
              style={{background:active?C.accentDim:C.card,
                border:`1px solid ${active?C.accent+"55":C.border}`,borderRadius:12,
                padding:"15px 16px",transition:"all 0.35s",opacity:i<=activeSection?1:0.3}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
                <div style={{fontSize:22,flexShrink:0,marginTop:1}}>{sec.icon}</div>
                <div style={{flex:1}}>
                  <div style={{color:C.accent,fontWeight:700,fontSize:13,marginBottom:5}}>{sec.heading}</div>
                  <div style={{color:C.text,fontSize:13,lineHeight:1.75,userSelect:"text"}}>{sec.content}</div>
                  <VisualBlock visual={sec.visual}/>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Key Points */}
      {lesson.key_points?.length>0 && (
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,
          padding:"13px 16px",marginBottom:18,opacity:progress>80?1:0.2,transition:"opacity 0.5s"}}>
          <div style={{color:C.accent,fontWeight:700,fontSize:12,marginBottom:8}}>⭐ キーポイント</div>
          {lesson.key_points.map((pt,i)=>(
            <div key={i} style={{display:"flex",gap:9,marginBottom:6}}>
              <span style={{color:C.accent,fontWeight:700,fontSize:11,marginTop:2}}>✓</span>
              <span style={{color:C.text,fontSize:13}}>{pt}</span>
            </div>
          ))}
        </div>
      )}

      <button onClick={onStartQuiz}
        style={{width:"100%",padding:"14px",background:progress>=100?C.accent:C.border,
          color:progress>=100?"#fff":C.muted,border:"none",borderRadius:10,
          fontSize:14,fontWeight:700,cursor:progress>=100?"pointer":"default",transition:"all 0.3s"}}>
        {progress>=100?"🎯 理解度チェック → クイズ開始":`📖 読み進めてください... (${Math.round(progress)}%)`}
      </button>
    </div>
  );
}

// ─── Quiz ─────────────────────────────────────────────────────────────────────

function QuizView({ quiz, onComplete }) {
  const [cur,setCur]=useState(0);
  const [sel,setSel]=useState(null);
  const [answers,setAns]=useState([]);
  const [showExp,setExp]=useState(false);
  const q=quiz[cur]; const L=["A","B","C","D"];
  const pick=(i)=>{ if(sel!==null)return; setSel(i); setExp(true); };
  const next=()=>{
    const na=[...answers,{sel,correct:q.correct}];
    if(cur+1>=quiz.length){onComplete(na);return;}
    setAns(na);setCur(c=>c+1);setSel(null);setExp(false);
  };
  return (
    <div style={{maxWidth:680,margin:"0 auto"}}>
      <div style={{marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
          <span style={{color:C.muted,fontSize:12}}>問題 {cur+1} / {quiz.length}</span>
          <span style={{color:C.accent,fontSize:12,fontWeight:700}}>{Math.round((cur/quiz.length)*100)}%</span>
        </div>
        <Bar2 value={(cur/quiz.length)*100}/>
      </div>
      <div style={{background:C.card,borderRadius:12,border:`1px solid ${C.border}`,padding:"20px",marginBottom:12}}>
        <div style={{color:C.accent,fontSize:11,fontWeight:700,marginBottom:8}}>Q{cur+1}</div>
        <div style={{color:C.text,fontSize:15,lineHeight:1.65,fontWeight:600}}>{q.question}</div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>
        {q.options.map((opt,i)=>{
          const chosen=sel===i,right=i===q.correct,rev=sel!==null;
          let bg=C.card,border=C.border,tc=C.text;
          if(rev&&right){bg=C.success+"20";border=C.success;tc=C.success;}
          else if(rev&&chosen){bg=C.error+"20";border=C.error;tc=C.error;}
          return (
            <div key={i} onClick={()=>pick(i)}
              style={{background:bg,border:`1px solid ${border}`,borderRadius:10,
                padding:"12px 15px",cursor:sel===null?"pointer":"default",
                display:"flex",alignItems:"center",gap:12,transition:"all 0.2s"}}>
              <div style={{width:26,height:26,borderRadius:6,background:border+"30",
                border:`1px solid ${border}`,display:"flex",alignItems:"center",
                justifyContent:"center",color:tc,fontWeight:700,fontSize:11,flexShrink:0}}>
                {L[i]}
              </div>
              <span style={{color:tc,fontSize:13}}>{opt}</span>
            </div>
          );
        })}
      </div>
      {showExp&&(
        <div style={{background:"#0a1f0a",border:`1px solid ${C.success}40`,borderRadius:10,
          padding:"12px 15px",marginBottom:12}}>
          <div style={{color:C.success,fontWeight:700,fontSize:11,marginBottom:5}}>💡 解説</div>
          <div style={{color:C.text,fontSize:13,lineHeight:1.65}}>{q.explanation}</div>
        </div>
      )}
      {sel!==null&&(
        <Btn onClick={next} style={{width:"100%",padding:"12px",fontSize:14}}>
          {cur+1>=quiz.length?"結果を見る →":"次の問題 →"}
        </Btn>
      )}
    </div>
  );
}

// ─── Result ───────────────────────────────────────────────────────────────────

function ResultView({ answers, topic, onRetry, onHome }) {
  const score=answers.filter(a=>a.sel===a.correct).length;
  const pct=Math.round((score/answers.length)*100);
  return (
    <div style={{maxWidth:440,margin:"0 auto",textAlign:"center"}}>
      <div style={{background:C.card,borderRadius:16,border:`1px solid ${C.border}`,padding:"34px 24px"}}>
        <div style={{fontSize:48,marginBottom:12}}>{pct===100?"🏆":pct>=66?"✅":"📚"}</div>
        <div style={{color:C.text,fontSize:20,fontWeight:700,marginBottom:5}}>{score} / {answers.length} 正解</div>
        <div style={{color:C.accent,fontSize:40,fontWeight:900,marginBottom:5}}>{pct}%</div>
        <div style={{color:C.muted,fontSize:12,marginBottom:20}}>{topic.title} — {pct===100?"完璧！":pct>=66?"合格圏":"要復習"}</div>
        <Bar2 value={pct} color={pct>=66?C.success:C.error} h={5}/>
        <div style={{display:"flex",gap:9,marginTop:22}}>
          <Btn variant="outline" onClick={onRetry} style={{flex:1}}>🔄 再チャレンジ</Btn>
          <Btn onClick={onHome} style={{flex:1}}>🏠 ホームへ</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── History / Highlights ─────────────────────────────────────────────────────

function HistoryView({ history }) {
  if (!history.length) return (
    <div style={{textAlign:"center",padding:"70px 20px",color:C.muted}}>
      <div style={{fontSize:42,marginBottom:12}}>📭</div>
      <div style={{fontSize:14}}>まだ学習履歴がありません</div>
    </div>
  );
  return (
    <div style={{maxWidth:640,margin:"0 auto"}}>
      <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:"0.08em",marginBottom:12}}>
        学習履歴 — {history.length}件
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {[...history].reverse().map((h,i)=>{
          const pct=Math.round((h.score/h.total)*100);
          return (
            <div key={i} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:9}}>
                <div>
                  <div style={{color:C.text,fontWeight:700,fontSize:14}}>{h.emoji} {h.topic}</div>
                  <div style={{color:C.muted,fontSize:11,marginTop:2}}>{h.date}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{color:pct>=66?C.success:C.error,fontWeight:900,fontSize:20}}>{pct}%</div>
                  <div style={{color:C.muted,fontSize:11}}>{h.score}/{h.total}問</div>
                </div>
              </div>
              <Bar2 value={pct} color={pct>=66?C.success:C.error} h={3}/>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HighlightsView({ highlights, onDelete }) {
  if (!highlights.length) return (
    <div style={{textAlign:"center",padding:"70px 20px",color:C.muted}}>
      <div style={{fontSize:42,marginBottom:12}}>✏️</div>
      <div style={{fontSize:14}}>ハイライトがありません</div>
      <div style={{fontSize:12,marginTop:5}}>レッスン中にテキストを選択して保存できます</div>
    </div>
  );
  const grouped=highlights.reduce((acc,h)=>({...acc,[h.topic]:[...(acc[h.topic]||[]),h]}),{});
  return (
    <div style={{maxWidth:640,margin:"0 auto"}}>
      <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:"0.08em",marginBottom:12}}>
        ハイライト — {highlights.length}件
      </div>
      {Object.entries(grouped).map(([topic,items])=>(
        <div key={topic} style={{marginBottom:18}}>
          <div style={{color:C.accent,fontSize:12,fontWeight:700,marginBottom:9}}>{topic}</div>
          <div style={{display:"flex",flexDirection:"column",gap:7}}>
            {items.map(h=>(
              <div key={h.id} style={{background:C.card,
                border:`1px solid ${C.border}`,borderLeft:`3px solid ${C.highlight}`,
                borderRadius:"0 10px 10px 0",padding:"10px 14px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
                  <div style={{flex:1}}>
                    <div style={{color:C.muted,fontSize:10,marginBottom:5}}>{h.section} · {h.date}</div>
                    <div style={{color:C.text,fontSize:13,lineHeight:1.6,
                      background:C.highlight+"18",padding:"5px 9px",borderRadius:6,fontStyle:"italic"}}>
                      "{h.text}"
                    </div>
                  </div>
                  <button onClick={()=>onDelete(h.id)}
                    style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:15,padding:"0 3px",flexShrink:0}}>✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function StudyStream() {
  const [tab,setTab]           = useState("home");
  const [view,setView]         = useState("feed");
  const [topic,setTopic]       = useState(null);
  const [lesson,setLesson]     = useState(null);
  const [quiz,setQuiz]         = useState(null);
  const [answers,setAnswers]   = useState([]);
  const [history,setHistory]   = useState([]);
  const [highlights,setHL]     = useState([]);
  const [cache,setCache]       = useState({});   // ← コンテンツキャッシュ
  const [customIn,setCustomIn] = useState("");
  const [loadProg,setLoadProg] = useState(0);
  const [loadSteps,setSteps]   = useState({lesson:false,quiz:false});
  const [error,setError]       = useState("");

  const startLesson = async (t) => {
    setTopic(t); setError("");

    // ✅ キャッシュヒット → 即座に表示（再生成しない）
    if (cache[t.title]) {
      setLesson(cache[t.title].lesson);
      setQuiz(cache[t.title].quiz);
      setView("lesson");
      return;
    }

    setView("loading"); setLoadProg(0); setSteps({lesson:false,quiz:false});
    const iv = setInterval(()=>setLoadProg(p=>p<85?p+1.4:p),180);
    try {
      const [lessonRaw,quizRaw] = await Promise.all([
        callClaude(LESSON_SYS,`トピック: ${t.title}`).then(r=>{setSteps(s=>({...s,lesson:true}));return r;}),
        callClaude(QUIZ_SYS,  `トピック: ${t.title}`).then(r=>{setSteps(s=>({...s,quiz:true}));  return r;}),
      ]);
      clearInterval(iv); setLoadProg(100);
      const l = parseJSON(lessonRaw);
      const q = parseJSON(quizRaw);
      setLesson(l); setQuiz(q);
      // キャッシュに保存
      setCache(c=>({...c,[t.title]:{lesson:l,quiz:q}}));
      setTimeout(()=>setView("lesson"),300);
    } catch(e) {
      clearInterval(iv);
      setError(`生成失敗: ${e.message}`);
      setView("feed");
    }
  };

  const handleCustom = () => {
    if (!customIn.trim()) return;
    startLesson({emoji:"📝",title:customIn.trim(),tag:"カスタム",color:"#FF8C42"});
    setCustomIn("");
  };

  const handleComplete = (ans) => {
    const score = ans.filter(a=>a.sel===a.correct).length;
    setAnswers(ans);
    setHistory(h=>[...h,{topic:topic.title,emoji:topic.emoji,score,total:ans.length,date:new Date().toLocaleDateString("ja-JP")}]);
    setView("result");
  };

  const goHome = () => { setView("feed"); setTab("home"); };

  const NAV = [
    {id:"home",       icon:"🏠", label:"ホーム"},
    {id:"history",    icon:"📊", label:`履歴${history.length?` (${history.length})`:""}`},
    {id:"highlights", icon:"✏️", label:`HL${highlights.length?` (${highlights.length})`:""}`},
  ];

  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Hiragino Sans','Noto Sans JP',sans-serif",color:C.text}}>
      {/* Header */}
      <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,
        padding:"11px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",
        position:"sticky",top:0,zIndex:200}}>
        <div style={{display:"flex",alignItems:"center",gap:9,cursor:"pointer"}} onClick={goHome}>
          <div style={{width:28,height:28,borderRadius:7,background:C.accent,
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>▶</div>
          <div>
            <div style={{fontWeight:900,fontSize:14}}>Study<span style={{color:C.accent}}>Stream</span></div>
            <div style={{color:C.muted,fontSize:9}}>powered by Claude</div>
          </div>
        </div>
        <div style={{display:"flex",gap:4}}>
          {NAV.map(n=>(
            <button key={n.id} onClick={()=>{setTab(n.id);if(n.id!=="home")setView("feed");}}
              style={{background:tab===n.id?C.accentDim:"transparent",
                border:`1px solid ${tab===n.id?C.accent+"60":C.border}`,
                color:tab===n.id?C.accent:C.muted,
                padding:"5px 10px",borderRadius:7,cursor:"pointer",
                fontSize:11,fontWeight:700,transition:"all 0.15s"}}>
              {n.icon} {n.label}
            </button>
          ))}
        </div>
        {view!=="feed"&&tab==="home"&&(
          <button onClick={goHome}
            style={{background:"transparent",border:`1px solid ${C.border}`,color:C.muted,
              padding:"5px 11px",borderRadius:7,cursor:"pointer",fontSize:11}}>← 戻る</button>
        )}
      </div>

      <div style={{padding:"20px 16px",maxWidth:860,margin:"0 auto"}}>
        {tab==="history"    && <HistoryView history={history}/>}
        {tab==="highlights" && <HighlightsView highlights={highlights} onDelete={id=>setHL(h=>h.filter(x=>x.id!==id))}/>}

        {tab==="home" && (
          <>
            {view==="feed" && (
              <>
                <div style={{background:C.card,border:`1px solid ${C.border}`,
                  borderRadius:12,padding:"15px",marginBottom:20}}>
                  <div style={{color:C.text,fontWeight:700,marginBottom:9,fontSize:13}}>🔍 何でも学ぶ</div>
                  <div style={{display:"flex",gap:8}}>
                    <input value={customIn} onChange={e=>setCustomIn(e.target.value)}
                      onKeyDown={e=>e.key==="Enter"&&handleCustom()}
                      placeholder="例：減価償却の仕組み、景気循環の理論..."
                      style={{flex:1,background:C.surface,border:`1px solid ${C.border}`,
                        borderRadius:8,color:C.text,padding:"8px 12px",fontSize:13,outline:"none"}}/>
                    <Btn onClick={handleCustom}>学ぶ →</Btn>
                  </div>
                  {error && <div style={{color:C.error,fontSize:11,marginTop:7}}>{error}</div>}
                </div>
                <div style={{color:C.muted,fontSize:11,fontWeight:700,letterSpacing:"0.08em",marginBottom:10}}>
                  おすすめトピック {Object.keys(cache).length>0 && <span style={{color:C.success,fontSize:10}}>• {Object.keys(cache).length}件キャッシュ済</span>}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))",gap:10}}>
                  {PRESETS.map(t=><TopicCard key={t.id} topic={t} onClick={startLesson} cached={!!cache[t.title]}/>)}
                </div>
              </>
            )}
            {view==="loading" && <LoadingView topic={topic} progress={loadProg} steps={loadSteps}/>}
            {view==="lesson"  && lesson && (
              <LessonView topic={topic} lesson={lesson}
                onStartQuiz={()=>setView("quiz")}
                onAddHighlight={h=>setHL(hs=>[...hs,h])}/>
            )}
            {view==="quiz"   && quiz && <QuizView quiz={quiz} onComplete={handleComplete}/>}
            {view==="result" && <ResultView answers={answers} topic={topic} onRetry={()=>setView("quiz")} onHome={goHome}/>}
          </>
        )}
      </div>
    </div>
  );
}
