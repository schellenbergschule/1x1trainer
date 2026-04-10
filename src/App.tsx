import { useState, useRef, useCallback } from "react";

function useAudio() {
  const ctx = useRef(null);
  const get = () => { if (!ctx.current) ctx.current = new (window.AudioContext || window.webkitAudioContext)(); return ctx.current; };
  const tone = (freq, type, dur, vol = 0.3, delay = 0) => {
    try {
      const c = get(), o = c.createOscillator(), g = c.createGain();
      o.connect(g); g.connect(c.destination);
      o.type = type; o.frequency.value = freq;
      const t = c.currentTime + delay;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.start(t); o.stop(t + dur);
    } catch(e) {}
  };
  return {
    correct: () => { tone(523,"sine",0.12,0.3); tone(659,"sine",0.12,0.3,0.1); tone(784,"sine",0.2,0.3,0.2); },
    wrong:   () => { tone(220,"sawtooth",0.25,0.25); tone(180,"sawtooth",0.25,0.2,0.15); },
    fanfare: () => { [[523,0],[659,0.15],[784,0.3],[1047,0.5],[784,0.75],[1047,1.0]].forEach(([f,d])=>tone(f,"sine",0.25,0.35,d)); },
    click:   () => tone(880,"sine",0.06,0.12),
  };
}

const FAV_COLORS = [
  { name:"Rosa",    col:"#f48fb1", dark:"#c2185b", label:"🩷 Rosa" },
  { name:"Lila",    col:"#ce93d8", dark:"#7b1fa2", label:"💜 Lila" },
  { name:"Blau",    col:"#90caf9", dark:"#1565c0", label:"💙 Blau" },
  { name:"Mint",    col:"#80cbc4", dark:"#00695c", label:"🩵 Mint" },
  { name:"Gelb",    col:"#fff176", dark:"#f9a825", label:"💛 Gelb" },
  { name:"Rot",     col:"#ef9a9a", dark:"#b71c1c", label:"❤️ Rot" },
  { name:"Orange",  col:"#ffcc80", dark:"#e65100", label:"🧡 Orange" },
  { name:"Grün",    col:"#a5d6a7", dark:"#2e7d32", label:"💚 Grün" },
];

const TOTAL_HURDLES = 12;

function HorseSVG({ jumping, stumble, size = 110 }) {
  const glow = stumble ? "drop-shadow(0 0 7px #e5737388)" : "none";
  const ty = jumping ? -14 : stumble ? 3 : 0;
  const sc = jumping ? 1.1 : 1;
  return (
    <div style={{
      width: size, height: size,
      transform: `translateY(${ty}px) scale(${sc})`,
      transition: "all 0.35s",
      filter: glow,
      display: "flex", alignItems: "center", justifyContent: "center",
      userSelect: "none",
    }}>
      <span style={{ fontSize: size * 0.9, lineHeight: 1, transform: "scaleX(-1)", display: "block" }}>🏇</span>
    </div>
  );
}

function ObstacleSVG({ fallen, stageCol = "#e53935" }) {
  return (
    <svg width={48} height={44} viewBox="0 0 48 44">
      <ellipse cx={8}  cy={40} rx={7} ry={3} fill="#8B5E3C"/>
      <ellipse cx={40} cy={40} rx={7} ry={3} fill="#8B5E3C"/>
      {[0,1,2,3].map(i=>(
        <rect key={i} x={5}  y={8+i*7} width={6} height={7} fill={i%2===0?"#e53935":"#fff"}/>
      ))}
      <rect x={5}  y={8} width={6}  height={28} rx={3} fill="none" stroke="#bbb" strokeWidth={0.5}/>
      {[0,1,2,3].map(i=>(
        <rect key={i} x={37} y={8+i*7} width={6} height={7} fill={i%2===0?"#e53935":"#fff"}/>
      ))}
      <rect x={37} y={8} width={6} height={28} rx={3} fill="none" stroke="#bbb" strokeWidth={0.5}/>
      {fallen ? (
        <g transform="rotate(-12,24,38)">
          <rect x={4} y={34} width={40} height={6} rx={3} fill={stageCol} stroke="#fff" strokeWidth={1}/>
          {[0,1,2,3].map(i=>(<rect key={i} x={8+i*9} y={34} width={4} height={6} fill="#fff" opacity={0.4}/>))}
        </g>
      ) : (
        <g>
          <rect x={5} y={15} width={38} height={6} rx={3} fill={stageCol} stroke="#fff" strokeWidth={1}/>
          {[0,1,2,3].map(i=>(<rect key={i} x={8+i*9} y={15} width={4} height={6} fill="#fff" opacity={0.4}/>))}
        </g>
      )}
    </svg>
  );
}

function Confetti({ favCol }) {
  const cols = [favCol.col, favCol.dark, "#fff", favCol.col+"bb", "#fff9", favCol.dark+"99"];
  const pieces = Array.from({length:40},(_,i)=>({
    x:Math.random()*100, delay:Math.random()*1.8,
    col: cols[i % cols.length],
    rot:Math.random()*360, size:7+Math.random()*9
  }));
  return (
    <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:99}}>
      {pieces.map((p,i)=>(
        <div key={i} style={{position:"absolute",left:`${p.x}%`,top:"-20px",
          width:p.size,height:p.size,background:p.col,
          borderRadius:i%3===0?"50%":"2px",
          animation:`cffall 2.8s ${p.delay}s ease-in forwards`,
          transform:`rotate(${p.rot}deg)`}}/>
      ))}
      <style>{`@keyframes cffall{to{top:110%;transform:rotate(720deg);}}`}</style>
    </div>
  );
}

function StarBadge({ count }) {
  return <span>{[1,2,3].map(i=>(
    <span key={i} style={{fontSize:18,color:i<=count?"#FFD700":"#ddd",textShadow:i<=count?"0 0 4px #FFD70088":"none"}}>★</span>
  ))}</span>;
}

function shuffle(arr) {
  const a=[...arr];
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  return a;
}

function buildTasks(reihen) {
  let all=[];
  reihen.forEach(r=>{ for(let i=0;i<=12;i++) all.push({a:i,b:r}); });
  return shuffle(all).slice(0,12);
}

function starsForTime(secs) {
  if(secs<=3) return 3;
  if(secs<5)  return 2;
  return 1;
}

function getMedal(earned, maxPossible, allReihen) {
  const pct = earned / maxPossible;
  if(allReihen && pct >= 1.0) return {label:"💎 Diamant-Schleife", col:"#a0e0ff"};
  if(pct >= 0.95) return {label:"🥇 Gold-Schleife",   col:"#FFD700"};
  if(pct >= 0.80) return {label:"🥈 Silber-Schleife", col:"#C0C0C0"};
  return              {label:"🥉 Bronze-Schleife", col:"#CD7F32"};
}

function formatTime(s) { return `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`; }

export default function App() {
  const audio = useAudio();
  const [screen, setScreen]       = useState("setup");
  const [horseName, setHorseName] = useState("Sternenstaub");
  const [favColor, setFavColor]   = useState(FAV_COLORS[0]);
  const [selReihen, setSelReihen] = useState([]);
  const [tasks, setTasks]         = useState([]);
  const [taskIdx, setTaskIdx]     = useState(0);
  const [totalStars, setTotalStars]     = useState(0);
  const [questionsAsked, setQuestionsAsked] = useState(0);
  const [lastStars, setLastStars] = useState(null);
  const [input, setInput]         = useState("");
  const [feedback, setFeedback]   = useState(null);
  const [hurdles, setHurdles]     = useState(Array(TOTAL_HURDLES).fill("pending"));
  const [hurdleIdx, setHurdleIdx] = useState(0);
  const [jumping, setJumping]     = useState(false);
  const [stumble, setStumble]     = useState(false);
  const [totalTime, setTotalTime] = useState(0);
  const gameStart  = useRef(null);
  const qStart     = useRef(null);
  const processing = useRef(false);

  const startGame = useCallback(() => {
    if(!selReihen.length) return;
    audio.click();
    const t = buildTasks(selReihen);
    setTasks(t); setTaskIdx(0);
    setTotalStars(0); setLastStars(null);
    setQuestionsAsked(0);
    setInput(""); setFeedback(null);
    setHurdles(Array(TOTAL_HURDLES).fill("pending"));
    setHurdleIdx(0);
    processing.current = false;
    gameStart.current = Date.now();
    qStart.current    = Date.now();
    setScreen("game");
  }, [selReihen, audio]);

  const toggleReihe = r => {
    audio.click();
    setSelReihen(p=>p.includes(r)?p.filter(x=>x!==r):[...p,r]);
  };

  const submit = useCallback(() => {
    if(processing.current || !input) return;
    const task = tasks[taskIdx];
    if(!task) return;
    processing.current = true;
    const secs    = (Date.now()-qStart.current)/1000;
    const correct = task.a*task.b;
    const isRight = parseInt(input,10)===correct;
    const earned  = isRight ? starsForTime(secs) : 0;
    const newQAsked = questionsAsked + 1;
    setQuestionsAsked(newQAsked);
    setFeedback(isRight?"correct":"wrong");
    setLastStars(isRight?earned:null);
    if(isRight) {
      audio.correct();
      setTotalStars(n=>n+earned);
      setJumping(true);
      setTimeout(()=>setJumping(false),500);
      setHurdles(h=>{const n=[...h];n[hurdleIdx]="done";return n;});
      const nextH=hurdleIdx+1;
      setHurdleIdx(nextH);
      setTimeout(()=>{
        setFeedback(null); setLastStars(null); setInput("");
        processing.current=false;
        const next=taskIdx+1;
        if(next>=tasks.length||nextH>=TOTAL_HURDLES){
          setTotalTime(Math.round((Date.now()-gameStart.current)/1000));
          audio.fanfare();
          setTimeout(()=>setScreen("win"),400);
        } else { setTaskIdx(next); qStart.current=Date.now(); }
      },900);
    } else {
      audio.wrong();
      setStumble(true);
      setTimeout(()=>setStumble(false),600);
      setHurdles(h=>{const n=[...h];n[hurdleIdx]="fallen";return n;});
      setTasks(t=>[...t,{...task}]);
      setTimeout(()=>setHurdles(h=>{const n=[...h];n[hurdleIdx]="pending";return n;}),1000);
      setTimeout(()=>{
        setFeedback(null); setLastStars(null); setInput("");
        processing.current=false;
        setTaskIdx(i=>i+1); qStart.current=Date.now();
      },1000);
    }
  },[input,tasks,taskIdx,hurdleIdx,audio,questionsAsked]);

  const press = val => {
    if(processing.current) return;
    audio.click();
    if(val==="⌫"){setInput(i=>i.slice(0,-1));return;}
    if(input.length<3) setInput(i=>i+val);
  };

  const pastel={background:"linear-gradient(160deg,#fce4ec 0%,#f3e5f5 40%,#e8f5e9 100%)",minHeight:"100vh",fontFamily:"'Segoe UI',Helvetica,sans-serif"};
  const card={background:"#fff8fd",borderRadius:20,padding:"18px 22px",boxShadow:"0 4px 20px #e0b0d044"};

  if(screen==="setup") return (
    <div style={{...pastel,display:"flex",flexDirection:"column",alignItems:"center",padding:"22px 14px"}}>
      <h1 style={{fontSize:24,color:"#8e44ad",margin:"0 0 2px",textAlign:"center"}}>🌸 Bella's Traumturnier 🌸</h1>
      <p style={{color:"#b06090",fontSize:13,margin:"0 0 18px"}}>Bereite dein Pferd vor!</p>
      <div style={{...card,width:"100%",maxWidth:380}}>
        <label style={{fontWeight:"bold",color:"#8e44ad",fontSize:14}}>🐴 Name deines Pferdes:</label>
        <input value={horseName} onChange={e=>setHorseName(e.target.value)}
          style={{display:"block",width:"100%",marginTop:7,padding:"9px 13px",borderRadius:12,
            border:"2px solid #ce93d8",fontSize:16,outline:"none",boxSizing:"border-box"}}/>
        <div style={{marginTop:16}}>
          <label style={{fontWeight:"bold",color:"#8e44ad",fontSize:14}}>🎨 Deine Lieblingsfarbe:</label>
          <div style={{display:"flex",flexWrap:"wrap",gap:7,marginTop:7}}>
            {FAV_COLORS.map(c=>(
              <button key={c.name} onClick={()=>{audio.click();setFavColor(c);}}
                style={{padding:"7px 13px",borderRadius:20,fontSize:13,cursor:"pointer",
                  color:favColor.name===c.name?"#fff":"#444",
                  fontWeight:"bold",
                  border:favColor.name===c.name?`3px solid ${c.dark}`:"2px solid #e0e0e0",
                  background:favColor.name===c.name?c.dark:c.col,
                  transition:"all 0.15s"}}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{marginTop:16,display:"flex",justifyContent:"center"}}>
          <HorseSVG jumping={false} stumble={false} size={120}/>
        </div>
      </div>
      <button onClick={()=>{audio.click();setScreen("reihen");}}
        style={{marginTop:20,padding:"13px 38px",borderRadius:30,fontSize:17,fontWeight:"bold",
          background:"linear-gradient(135deg,#ce93d8,#8e44ad)",color:"#fff",border:"none",
          cursor:"pointer",boxShadow:"0 4px 14px #b06090aa"}}>
        Weiter →
      </button>
    </div>
  );

  if(screen==="reihen") return (
    <div style={{...pastel,display:"flex",flexDirection:"column",alignItems:"center",padding:"22px 14px"}}>
      <h2 style={{color:"#8e44ad",margin:"0 0 4px"}}>📚 Welche Reihen üben?</h2>
      <p style={{color:"#b06090",fontSize:13,margin:"0 0 16px"}}>Mehrfachauswahl möglich!</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:9,maxWidth:340,width:"100%"}}>
        {Array.from({length:12},(_,i)=>i+1).map(r=>(
          <button key={r} onClick={()=>toggleReihe(r)}
            style={{padding:"14px 0",borderRadius:18,border:selReihen.includes(r)?"3px solid #8e44ad":"2px solid #e0c0f0",
              background:selReihen.includes(r)?"#8e44ad22":"#fff8fd",cursor:"pointer",
              fontSize:18,fontWeight:"bold",color:"#6a3080",transition:"all 0.15s"}}>
            {r}×
          </button>
        ))}
      </div>
      <div style={{display:"flex",gap:10,marginTop:16}}>
        <button onClick={()=>{audio.click();setSelReihen([1,2,3,4,5,6,7,8,9,10,11,12]);}}
          style={{padding:"9px 16px",borderRadius:18,background:"#f3e0ff",border:"2px solid #ce93d8",color:"#6a3080",cursor:"pointer",fontSize:13}}>Alle wählen</button>
        <button onClick={()=>{audio.click();setSelReihen([]);}}
          style={{padding:"9px 16px",borderRadius:18,background:"#fff",border:"2px solid #e0c0f0",color:"#6a3080",cursor:"pointer",fontSize:13}}>Alle löschen</button>
      </div>
      <div style={{display:"flex",gap:10,marginTop:20}}>
        <button onClick={()=>{audio.click();setScreen("setup");}}
          style={{padding:"11px 24px",borderRadius:28,background:"#fff",border:"2px solid #ce93d8",color:"#8e44ad",fontSize:15,cursor:"pointer"}}>← Zurück</button>
        <button onClick={startGame} disabled={!selReihen.length}
          style={{padding:"11px 30px",borderRadius:28,fontSize:15,fontWeight:"bold",border:"none",
            cursor:selReihen.length?"pointer":"not-allowed",
            background:selReihen.length?"linear-gradient(135deg,#ce93d8,#8e44ad)":"#e0e0e0",
            color:"#fff",boxShadow:selReihen.length?"0 4px 12px #b06090aa":"none"}}>
          Los geht's! 🐴
        </button>
      </div>
    </div>
  );

  if(screen==="game") {
    const task=tasks[taskIdx]||tasks[0];
    const bgCol=feedback==="correct"?"#e8f5e9":feedback==="wrong"?"#ffebee":"transparent";
    const horseX=2+(hurdleIdx/TOTAL_HURDLES)*90;
    const fc = favColor;
    return (
      <div style={{...pastel,background:bgCol,display:"flex",flexDirection:"column",
        alignItems:"center",padding:"10px 10px 6px",transition:"background 0.4s",minHeight:"100vh"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
          width:"100%",maxWidth:440,marginBottom:6}}>
          <div style={{fontSize:12,color:"#8e44ad",fontWeight:"bold"}}>🐴 {horseName}</div>
          <div style={{fontSize:13,color:"#8e44ad"}}>⭐ {totalStars}</div>
          <div style={{fontSize:12,color:"#8e44ad"}}>🏁 {hurdleIdx}/{TOTAL_HURDLES}</div>
        </div>
        <div style={{width:"100%",maxWidth:440,borderRadius:18,overflow:"hidden",
          background:`linear-gradient(180deg,${fc.col}88 0%,${fc.col}44 40%,#81c784 100%)`,
          height:112,position:"relative",boxShadow:`0 2px 12px ${fc.col}88`,marginBottom:8}}>
          {[8,42,72].map((x,i)=>(
            <div key={i} style={{position:"absolute",top:4+i*4,left:`${x}%`,opacity:0.55}}>
              <div style={{background:"#fff",borderRadius:20,width:34,height:14,position:"absolute"}}/>
              <div style={{background:"#fff",borderRadius:20,width:22,height:10,position:"absolute",top:-5,left:7}}/>
            </div>
          ))}
          {hurdles.map((state,i)=>(
            <div key={i} style={{position:"absolute",bottom:14,left:`${6+i*8}%`,transform:"translateX(-50%)"}}>
              <ObstacleSVG fallen={state==="fallen"} stageCol={favColor.dark}/>
              {state==="done"&&<div style={{position:"absolute",top:-10,left:"50%",transform:"translateX(-50%)",fontSize:10}}>✅</div>}
            </div>
          ))}
          <div style={{position:"absolute",bottom:8,left:`${horseX}%`,transform:"translateX(-50%)",transition:"left 0.55s ease"}}>
            <HorseSVG jumping={jumping} stumble={stumble} size={78}/>
          </div>
          <div style={{position:"absolute",bottom:0,left:0,right:0,height:16,background:fc.dark,borderRadius:"0 0 18px 18px",opacity:0.85}}/>
        </div>
        <div style={{...card,textAlign:"center",marginBottom:8,width:"100%",maxWidth:440}}>
          <div style={{fontSize:12,color:"#b06090",marginBottom:2}}>Was ist …</div>
          <div style={{fontSize:38,fontWeight:"bold",color:"#6a3080",letterSpacing:3}}>
            {task?.a} × {task?.b} = ?
          </div>
          {feedback&&(
            <div style={{marginTop:5,fontWeight:"bold",fontSize:14,
              color:feedback==="correct"?"#2e7d32":"#c62828",
              display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
              {feedback==="correct"
                ?<><StarBadge count={lastStars}/> {lastStars===3?"Fantastisch!":lastStars===2?"Super!":"Geschafft!"}</>
                :`❌ Richtig wäre ${task?.a*task?.b} – kommt nochmal!`}
            </div>
          )}
        </div>
        <div style={{background:"#f3e0ff",borderRadius:14,padding:"9px 30px",fontSize:32,
          fontWeight:"bold",color:"#6a3080",minWidth:90,textAlign:"center",
          marginBottom:8,letterSpacing:5,boxShadow:"inset 0 2px 5px #ce93d833",minHeight:50}}>
          {input||<span style={{opacity:0.25}}>_</span>}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:7,width:"100%",maxWidth:290}}>
          {["1","2","3","4","5","6","7","8","9","⌫","0","✓"].map(k=>(
            <button key={k} onClick={()=>k==="✓"?submit():press(k)}
              style={{padding:"15px 0",borderRadius:16,fontSize:21,fontWeight:"bold",border:"none",
                cursor:"pointer",
                background:k==="✓"?"linear-gradient(135deg,#a5d6a7,#2e7d32)":k==="⌫"?"#ffcdd2":"#fff8fd",
                color:k==="✓"?"#fff":"#6a3080",boxShadow:"0 3px 7px #00000012"}}>
              {k}
            </button>
          ))}
        </div>
        <div style={{width:"100%",maxWidth:440,marginTop:9,height:7,background:"#f3e0ff",borderRadius:6,overflow:"hidden"}}>
          <div style={{height:"100%",borderRadius:6,transition:"width 0.5s",
            background:`linear-gradient(90deg,${favColor.col},${favColor.dark})`,
            width:`${(hurdleIdx/TOTAL_HURDLES)*100}%`}}/>
        </div>
      </div>
    );
  }

  if(screen==="win") {
    const allReihen = selReihen.length===12;
    const maxPossible = questionsAsked * 3;
    const medal = getMedal(totalStars, maxPossible, allReihen);
    return (
      <div style={{...pastel,display:"flex",flexDirection:"column",alignItems:"center",
        justifyContent:"center",padding:"22px 14px",minHeight:"100vh",textAlign:"center"}}>
        <Confetti favCol={favColor}/>
        <div style={{fontSize:52,marginBottom:4}}>🏆</div>
        <h1 style={{fontSize:26,color:"#8e44ad",margin:"0 0 3px"}}>Gewonnen!</h1>
        <p style={{color:"#b06090",fontSize:13,margin:"0 0 16px"}}>Was für ein tolles Turnier!</p>
        <div style={{...card,maxWidth:360,border:`3px solid ${favColor.dark}`,background:`linear-gradient(160deg,#fff8fd,${favColor.col}33)`}}>
          <div style={{display:"flex",justifyContent:"center",marginBottom:10}}>
            <HorseSVG jumping={false} stumble={false} size={130}/>
          </div>
          <div style={{fontSize:18,fontWeight:"bold",color:"#6a3080",marginBottom:3}}>🎀 {horseName}</div>
          <div style={{fontSize:13,color:"#b06090",marginBottom:12}}>hat das Turnier gewonnen!</div>
          <div style={{display:"flex",flexDirection:"column",gap:7}}>
            <div style={{background:medal.col+"44",borderRadius:12,padding:"9px 16px",fontWeight:"bold",color:"#5a2070",fontSize:17}}>{medal.label}</div>
            <div style={{color:"#8e44ad",fontSize:14}}><StarBadge count={Math.min(3,Math.round(totalStars/questionsAsked))}/> {totalStars} / {maxPossible} Sterne</div>
            <div style={{color:"#8e44ad",fontSize:14}}>⏱️ Zeit: {formatTime(totalTime)}</div>
            <div style={{color:"#8e44ad",fontSize:13}}>Reihen: {[...selReihen].sort((a,b)=>a-b).join(", ")}×</div>
          </div>
        </div>
        <div style={{display:"flex",gap:10,marginTop:20,flexWrap:"wrap",justifyContent:"center"}}>
          <button onClick={()=>{audio.click();startGame();}}
            style={{padding:"11px 22px",borderRadius:28,background:"linear-gradient(135deg,#ce93d8,#8e44ad)",
              color:"#fff",fontSize:14,fontWeight:"bold",border:"none",cursor:"pointer",boxShadow:"0 4px 12px #b06090aa"}}>
            🔁 Nochmal!
          </button>
          <button onClick={()=>{audio.click();setScreen("reihen");}}
            style={{padding:"11px 22px",borderRadius:28,background:"#fff",border:"2px solid #ce93d8",
              color:"#8e44ad",fontSize:14,cursor:"pointer"}}>
            📚 Andere Reihen
          </button>
          <button onClick={()=>{audio.click();setScreen("setup");}}
            style={{padding:"11px 22px",borderRadius:28,background:"#fff",border:"2px solid #e0c0f0",
              color:"#8e44ad",fontSize:14,cursor:"pointer"}}>
            🐴 Neues Pferd
          </button>
        </div>
      </div>
    );
  }
}
