import React, { useState, useEffect } from "react";

const SURL = "https://qpoarmquzrwzbhqmffdn.supabase.co";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwb2FybXF1enJ3emJocW1mZmRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MzYxMzEsImV4cCI6MjA4ODExMjEzMX0.qvypDSMiWTYTCYOFUhuMFY5iVeV3GQGJIw-Z-2weW88";

const H=()=>({"Content-Type":"application/json","apikey":ANON,"Authorization":`Bearer ${ANON}`,"Prefer":"return=representation"});
function qs(f=[],o={}){const p=new URLSearchParams();f.forEach(({col,op,val})=>p.append(col,`${op}.${val}`));if(o.order)p.append("order",o.order);if(o.limit)p.append("limit",String(o.limit));if(o.select)p.append("select",o.select);return p.toString()?"?"+p.toString():"";}
const db={
  async get(t,f=[],o={}){const r=await fetch(`${SURL}/rest/v1/${t}${qs(f,o)}`,{headers:H()});if(!r.ok)return{data:null,error:await r.json()};return{data:await r.json(),error:null}},
  async ins(t,b){const r=await fetch(`${SURL}/rest/v1/${t}`,{method:"POST",headers:H(),body:JSON.stringify(b)});if(!r.ok)return{data:null,error:await r.json()};const tx=await r.text();return{data:tx?JSON.parse(tx):[],error:null}},
  async upd(t,b,f=[]){const r=await fetch(`${SURL}/rest/v1/${t}${qs(f)}`,{method:"PATCH",headers:H(),body:JSON.stringify(b)});if(!r.ok)return{data:null,error:await r.json()};const tx=await r.text();return{data:tx?JSON.parse(tx):[],error:null}},
  async del(t,f=[]){const r=await fetch(`${SURL}/rest/v1/${t}${qs(f)}`,{method:"DELETE",headers:H()});return{error:r.ok?null:await r.json()}},
};
const eq=(c,v)=>({col:c,op:"eq",val:v});
const lik=(c,v)=>({col:c,op:"ilike",val:v});
const fmt=s=>`${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;

export default function App(){
  const [user,setUser]=useState(null);
  const [page,setPage]=useState("login");
  const [dbOk,setDbOk]=useState(null);
  useEffect(()=>{db.get("users",[],{limit:1,select:"id"}).then(({error})=>setDbOk(!error)).catch(()=>setDbOk(false));},[]);
  const logout=async()=>{if(user?.sid)await db.upd("sessions",{active:false},[eq("id",user.sid)]);setUser(null);setPage("login");};
  return(
    <div style={S.root}>
      <BgGrid/>
      {dbOk===null&&<Spin text="Łączenie z bazą..."/>}
      {dbOk===false&&<NoDb/>}
      {dbOk===true&&<>
        {page==="login"&&<Login onLogin={u=>{setUser(u);setPage(u.role==="admin"?"admin":"student");}}/>}
        {page==="student"&&<Student user={user} onLogout={logout}/>}
        {page==="admin"&&<Admin onLogout={logout}/>}
      </>}
    </div>
  );
}

function NoDb(){return <div style={S.cx}><div style={{textAlign:"center",maxWidth:480,padding:40}}><div style={{fontSize:56}}>🔌</div><h2 style={{color:"#f87171"}}>Brak połączenia z bazą</h2><p style={{color:"#94a3b8"}}>Uruchom supabase_schema.sql w Supabase SQL Editor.</p></div></div>;}

function Login({onLogin}){
  const [u,setU]=useState("");const [p,setP]=useState("");const [err,setErr]=useState("");const [ld,setLd]=useState(false);const [tab,setTab]=useState("in");
  const go=async()=>{
    if(!u.trim()||!p.trim()){setErr("Wypełnij oba pola.");return;}setLd(true);setErr("");
    const {data:rows}=await db.get("users",[eq("username",u.trim()),eq("password_hash",p)],{select:"*",limit:1});
    if(!rows?.length){setErr("Nieprawidłowy login lub hasło.");setLd(false);return;}
    const usr=rows[0];if(!usr.active){setErr("Konto zablokowane.");setLd(false);return;}
    if(usr.role==="student"&&usr.session_minutes){
      const {data:ls}=await db.get("sessions",[eq("user_id",usr.id),eq("active",false)],{order:"locked_at.desc",limit:1});
      if(ls?.[0]?.locked_at){const ul=new Date(ls[0].locked_at).getTime()+86400000;if(Date.now()<ul){setErr(`Zablokowane (~${Math.ceil((ul-Date.now())/3600000)}h).`);setLd(false);return;}}
    }
    let cn="";if(usr.class_id){const {data:cl}=await db.get("classes",[eq("id",usr.class_id)],{limit:1});cn=cl?.[0]?.name||"";}
    const exp=usr.session_minutes?new Date(Date.now()+usr.session_minutes*60000).toISOString():null;
    const {data:sess}=await db.ins("sessions",{user_id:usr.id,expires_at:exp,active:true});
    onLogin({...usr,className:cn,sid:sess?.[0]?.id,exp});setLd(false);
  };
  return(
    <div style={S.cx}><div style={{width:"100%",maxWidth:420}}>
      <div style={{textAlign:"center",marginBottom:40}}>
        <div style={{fontSize:52}}>∑</div>
        <h1 style={{...S.gr,fontSize:30,fontWeight:900,margin:0,fontFamily:"Georgia,serif"}}>MathClass</h1>
        <p style={{color:"#64748b",marginTop:6,fontSize:13}}>System zadań matematycznych</p>
      </div>
      <div style={{...S.card,padding:28}}>
        <div style={{display:"flex",marginBottom:24,background:"#0f172a",borderRadius:8,padding:3}}>
          {[["in","Logowanie"],["reg","Rejestracja"]].map(([k,l])=>(<button key={k} onClick={()=>{setTab(k);setErr("");}} style={{flex:1,padding:"8px",border:"none",borderRadius:6,cursor:"pointer",fontWeight:600,fontSize:13,background:tab===k?"#1e3a5f":"transparent",color:tab===k?"#38bdf8":"#64748b"}}>{l}</button>))}
        </div>
        {tab==="in"?(<>
          <Lb>Login (np. mateusz_2A)</Lb><In v={u} s={setU} ph="imię_klasa" oe={go}/>
          <Lb style={{marginTop:14}}>Hasło</Lb><In type="password" v={p} s={setP} ph="••••••" oe={go}/>
          {err&&<Eb>{err}</Eb>}
          <Bt onClick={go} loading={ld} style={{marginTop:20}}>Zaloguj się →</Bt>
          <p style={{textAlign:"center",color:"#475569",fontSize:12,marginTop:16}}>Admin: <b style={{color:"#94a3b8"}}>admin</b> / <b style={{color:"#94a3b8"}}>admin123</b></p>
        </>):<Reg/>}
      </div>
    </div></div>
  );
}

function Reg(){
  const [n,setN]=useState("");const [c,setC]=useState("");const [p,setP]=useState("");const [c2,setC2]=useState("");
  const [cls,setCls]=useState([]);const [err,setErr]=useState("");const [ok,setOk]=useState("");
  useEffect(()=>{db.get("classes",[],{order:"name.asc"}).then(({data})=>setCls(data||[]));},[]);
  const go=async()=>{
    if(!n.trim()||!c||!p){setErr("Wypełnij wszystkie pola.");return;}if(p!==c2){setErr("Hasła nie pasują.");return;}if(p.length<4){setErr("Hasło min 4 znaki.");return;}setErr("");
    const cr=cls.find(x=>x.id===c);const base=n.trim().toLowerCase().replace(/\s+/g,"")+"_"+cr.name;
    const {data:ex}=await db.get("users",[lik("username",`${base}%`)],{select:"username"});
    let uname=base;if(ex?.length){const nums=ex.map(u=>{const m=u.username.replace(base,"");return m?parseInt(m)||0:0;});uname=base+(Math.max(...nums)+1);}
    await db.ins("users",{username:uname,name:n.trim(),password_hash:p,role:"student",class_id:c,active:true,session_minutes:60});
    setOk(`✅ Konto: ${uname}\nCzekaj na aktywację.`);
  };
  if(ok)return <div style={{color:"#4ade80",lineHeight:1.8,whiteSpace:"pre-line"}}>{ok}</div>;
  return(<>
    <Lb>Imię</Lb><In v={n} s={setN} ph="np. Mateusz"/>
    <Lb style={{marginTop:14}}>Klasa</Lb>
    <select value={c} onChange={e=>setC(e.target.value)} style={S.inp}><option value="">Wybierz klasę...</option>{cls.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select>
    <Lb style={{marginTop:14}}>Hasło</Lb><In type="password" v={p} s={setP}/>
    <Lb style={{marginTop:14}}>Potwierdź</Lb><In type="password" v={c2} s={setC2}/>
    {err&&<Eb>{err}</Eb>}
    <Bt onClick={go} style={{marginTop:20}}>Zarejestruj się</Bt>
  </>);
}

function Student({user,onLogout}){
  const [slots,setSlots]=useState([]);const [ans,setAns]=useState({});const [fb,setFb]=useState({});const [cd,setCd]=useState({});const [tl,setTl]=useState(null);const [exp,setExp]=useState(false);
  useEffect(()=>{db.get("tasks",[eq("active",true)]).then(({data})=>{if(data)setSlots([...data].sort(()=>Math.random()-.5).slice(0,6));});},[]);
  useEffect(()=>{
    if(!user.exp)return;
    const tick=()=>{const left=Math.max(0,new Date(user.exp)-Date.now());setTl(Math.ceil(left/1000));if(left<=0){setExp(true);db.upd("sessions",{active:false,locked_at:new Date().toISOString()},[eq("id",user.sid)]);}};
    tick();const iv=setInterval(tick,1000);return()=>clearInterval(iv);
  },[user.exp]);
  useEffect(()=>{
    const ivs={};Object.entries(cd).forEach(([id,x])=>{if(x.r>0){ivs[id]=setInterval(()=>{setCd(p=>{const c=p[id];if(!c||c.r<=1){clearInterval(ivs[id]);const{[id]:_,...r}=p;return r;}return{...p,[id]:{...c,r:c.r-1}};});},1000);}});
    return()=>Object.values(ivs).forEach(clearInterval);
  },[Object.keys(cd).join()]);
  const sub=async(idx)=>{
    const t=slots[idx];if(!t||cd[t.id])return;
    const g=(ans[t.id]||"").trim().toLowerCase();const ok=g===t.answer.trim().toLowerCase();
    await db.ins("answers",{user_id:user.id,task_id:t.id,given_answer:g,correct:ok,attempt_no:(cd[t.id]?.a||0)+1});
    if(ok){
      setFb(p=>({...p,[t.id]:"ok"}));
      setTimeout(async()=>{
        const {data}=await db.get("tasks",[eq("active",true)]);const ids=slots.map(x=>x.id);
        const pool=(data||[]).filter(x=>!ids.includes(x.id));const next=pool.length?pool[Math.floor(Math.random()*pool.length)]:null;
        setSlots(p=>{const s=[...p];s[idx]=next||t;return s;});setAns(p=>{const{[t.id]:_,...r}=p;return r;});setFb(p=>{const{[t.id]:_,...r}=p;return r;});
      },900);
    }else{
      const att=(cd[t.id]?.a||0)+1;setCd(p=>({...p,[t.id]:{r:att*10,a:att}}));setFb(p=>({...p,[t.id]:"bad"}));setTimeout(()=>setFb(p=>({...p,[t.id]:null})),1400);
    }
  };
  if(exp)return(<div style={S.cx}><div style={{textAlign:"center",background:"#0f172a",borderRadius:20,padding:56,border:"1px solid #ef4444",maxWidth:400}}><div style={{fontSize:60}}>⌛</div><h2 style={{color:"#ef4444"}}>Czas sesji minął</h2><p style={{color:"#64748b"}}>Skontaktuj się z nauczycielem.</p><Bt onClick={onLogout} style={{marginTop:28}}>Wróć</Bt></div></div>);
  const pct=user.exp?Math.max(0,(new Date(user.exp)-Date.now())/(user.session_minutes*60000)*100):100;const tc=pct>50?"#22c55e":pct>20?"#f59e0b":"#ef4444";
  return(
    <div style={{maxWidth:960,margin:"0 auto",padding:"24px 16px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:28,flexWrap:"wrap",gap:12}}>
        <div><h1 style={{margin:0,fontSize:22,fontWeight:800}}>Witaj, <span style={{color:"#38bdf8"}}>{user.name}</span></h1><p style={{margin:"4px 0 0",color:"#475569",fontSize:13}}>Klasa {user.className||"–"} · @{user.username}</p></div>
        <div style={{display:"flex",gap:14,alignItems:"center"}}>
          {tl!==null&&<div style={{textAlign:"right"}}><div style={{fontSize:11,color:"#475569",marginBottom:3}}>Czas sesji</div><div style={{fontSize:22,fontWeight:800,color:tc}}>{fmt(tl)}</div><div style={{width:90,height:3,background:"#1e293b",borderRadius:4,marginTop:4}}><div style={{width:`${pct}%`,height:"100%",background:tc,borderRadius:4,transition:"width 1s"}}/></div></div>}
          <button onClick={onLogout} style={S.gh}>Wyloguj</button>
        </div>
      </div>
      <p style={{color:"#475569",fontSize:13,marginBottom:22}}>Rozwiąż zadania — po poprawnej odpowiedzi pojawi się nowe. Błędna = kara (10s, 20s, 30s…)</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))",gap:16}}>
        {slots.map((t,i)=>{if(!t)return null;const c=cd[t.id];const f=fb[t.id];const bc=f==="ok"?"#22c55e":f==="bad"?"#ef4444":"#1e293b";return(
          <div key={t.id+i} style={{...S.card,border:`2px solid ${bc}`,transition:"border-color .3s",padding:20}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
              <span style={{fontSize:11,background:"#1e293b",padding:"3px 9px",borderRadius:20,color:"#7dd3fc"}}>{t.category}</span>
              <span style={{fontSize:11,color:t.difficulty==="łatwe"?"#22c55e":t.difficulty==="średnie"?"#f59e0b":"#ef4444"}}>{t.difficulty}</span>
            </div>
            <p style={{fontSize:15,fontWeight:600,margin:"10px 0 14px",lineHeight:1.55,minHeight:50}}>{t.question}</p>
            <In v={ans[t.id]||""} s={v=>setAns(p=>({...p,[t.id]:v}))} ph="Wpisz odpowiedź…" disabled={!!c} oe={()=>sub(i)}/>
            {c?.r?(<div style={{marginTop:10,textAlign:"center",background:"#1c0a0a",borderRadius:8,padding:"10px",color:"#ef4444",fontWeight:700,fontSize:14}}>⏱ Odczekaj {c.r}s (próba {c.a})</div>):(<Bt onClick={()=>sub(i)} style={{marginTop:10,padding:"10px",fontSize:13}}>{f==="ok"?"✅ Poprawnie!":f==="bad"?"❌ Błąd":"Sprawdź →"}</Bt>)}
          </div>);
        })}
      </div>
    </div>
  );
}

function Admin({onLogout}){
  const [tab,setTab]=useState("s");
  const tabs=[["s","👥 Uczniowie"],["t","📝 Zadania"],["st","📊 Statystyki"],["as","➕ Uczeń"],["at","➕ Zadanie"],["cl","🏫 Klasy"]];
  return(<div style={{maxWidth:1160,margin:"0 auto",padding:"24px 16px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
      <div><h1 style={{...S.gr,margin:0,fontSize:26,fontWeight:900,fontFamily:"Georgia,serif"}}>Panel Admina</h1><p style={{color:"#475569",fontSize:13,marginTop:4}}>MathClass</p></div>
      <button onClick={onLogout} style={S.gh}>Wyloguj</button>
    </div>
    <div style={{display:"flex",gap:6,marginBottom:24,flexWrap:"wrap"}}>
      {tabs.map(([k,l])=>(<button key={k} onClick={()=>setTab(k)} style={{padding:"8px 16px",borderRadius:8,border:"none",cursor:"pointer",fontSize:13,fontWeight:600,background:tab===k?"#0369a1":"#1e293b",color:tab===k?"#fff":"#64748b"}}>{l}</button>))}
    </div>
    {tab==="s"&&<StudTab/>}{tab==="t"&&<TaskTab/>}{tab==="st"&&<StatTab/>}
    {tab==="as"&&<AddStud/>}{tab==="at"&&<AddTask/>}{tab==="cl"&&<ClsTab/>}
  </div>);
}

function StudTab(){
  const [list,setList]=useState([]);const [cls,setCls]=useState([]);const [fil,setFil]=useState("ALL");const [eid,setEid]=useState(null);const [msg,setMsg]=useState("");
  const load=async()=>{const[{data:u},{data:c}]=await Promise.all([db.get("users",[eq("role","student")],{order:"name.asc",select:"*"}),db.get("classes",[],{order:"name.asc"})]);setList(u||[]);setCls(c||[]);};
  useEffect(()=>{load();},[]);
  const sm=m=>{setMsg(m);setTimeout(()=>setMsg(""),3000);};
  const gc=id=>cls.find(c=>c.id===id)?.name||"–";
  const tog=async u=>{await db.upd("users",{active:!u.active},[eq("id",u.id)]);setList(p=>p.map(x=>x.id===u.id?{...x,active:!x.active}:x));sm(u.active?"Zablokowano.":"Odblokowano.");};
  const rm=async u=>{if(!confirm(`Usunąć ${u.username}?`))return;await db.del("users",[eq("id",u.id)]);setList(p=>p.filter(x=>x.id!==u.id));sm("Usunięto.");};
  const ul=async u=>{await db.upd("sessions",{active:true,locked_at:null},[eq("user_id",u.id)]);sm(`Sesja ${u.username} odblokowana.`);};
  const ac=["ALL",...new Set(list.map(u=>gc(u.class_id)))].sort();
  const vi=list.filter(u=>fil==="ALL"||gc(u.class_id)===fil);
  return(<div>
    {msg&&<Ok style={{marginBottom:16}}>{msg}</Ok>}
    <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>{ac.map(c=><Pi key={c} a={fil===c} onClick={()=>setFil(c)}>{c==="ALL"?"Wszystkie":c}</Pi>)}</div>
    <div style={{display:"grid",gap:10}}>
      {vi.map(u=>eid===u.id?<EdStud key={u.id} user={u} cls={cls} onSave={async d=>{await db.upd("users",d,[eq("id",u.id)]);setEid(null);load();sm("Zapisano.");}} onCancel={()=>setEid(null)}/>:(
        <div key={u.id} style={{...S.card,display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",padding:"14px 18px",borderLeft:`3px solid ${u.active?"#0ea5e9":"#ef4444"}`}}>
          <div style={{flex:1,minWidth:160}}><span style={{fontWeight:700}}>{u.name}</span><span style={{marginLeft:8,fontSize:11,background:"#1e293b",padding:"2px 8px",borderRadius:20,color:"#7dd3fc"}}>{gc(u.class_id)}</span><div style={{color:"#475569",fontSize:12,marginTop:3}}>@{u.username}</div></div>
          <span style={{fontSize:12,color:"#64748b"}}>{u.session_minutes?`⏱ ${u.session_minutes}min`:"⏱ ∞"}</span>
          <span style={{fontSize:12,color:u.active?"#22c55e":"#ef4444",fontWeight:600}}>{u.active?"● aktywny":"● zablok."}</span>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            <Sm onClick={()=>setEid(u.id)}>✏️ Edytuj</Sm><Sm onClick={()=>tog(u)} col={u.active?"#1c1000":"#001c0a"}>{u.active?"🔒 Zablokuj":"🔓 Odblokuj"}</Sm>
            <Sm onClick={()=>ul(u)}>🔄 Sesja</Sm><Sm onClick={()=>rm(u)} col="#1c0505">🗑️</Sm>
          </div>
        </div>
      ))}
      {vi.length===0&&<Em>Brak uczniów.</Em>}
    </div>
  </div>);
}

function EdStud({user,cls,onSave,onCancel}){
  const [n,setN]=useState(user.name);const [c,setC]=useState(user.class_id||"");const [p,setP]=useState(user.password_hash);const [m,setM]=useState(user.session_minutes||"");
  const save=async()=>{
    if(!n.trim()||!p.trim())return;const cr=cls.find(x=>x.id===c);
    const base=n.trim().toLowerCase().replace(/\s+/g,"")+"_"+(cr?.name||"");
    const {data:ex}=await db.get("users",[lik("username",`${base}%`)],{select:"username,id"});
    let uname=base;const oth=(ex||[]).filter(u=>u.id!==user.id);
    if(oth.length){const ns=oth.map(u=>{const mx=u.username.replace(base,"");return mx?parseInt(mx)||0:0;});uname=base+(Math.max(...ns)+1);}
    onSave({name:n.trim(),username:uname,class_id:c||null,password_hash:p,session_minutes:m?parseInt(m):null});
  };
  return(<div style={{...S.card,border:"2px solid #0ea5e9",padding:20}}>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10}}>
      <div><Lb>Imię</Lb><In v={n} s={setN}/></div>
      <div><Lb>Klasa</Lb><select value={c} onChange={e=>setC(e.target.value)} style={S.inp}><option value="">brak</option>{cls.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
      <div><Lb>Hasło</Lb><In v={p} s={setP}/></div>
      <div><Lb>Sesja (min)</Lb><In type="number" v={m} s={setM} ph="∞"/></div>
    </div>
    <div style={{display:"flex",gap:8,marginTop:12}}><Bt onClick={save} style={{flex:1,margin:0,padding:"10px"}}>💾 Zapisz</Bt><Bt onClick={onCancel} style={{flex:1,margin:0,padding:"10px",background:"#1e293b"}}>Anuluj</Bt></div>
  </div>);
}

function TaskTab(){
  const [tasks,setTasks]=useState([]);const [eid,setEid]=useState(null);const [fil,setFil]=useState("ALL");const [msg,setMsg]=useState("");
  const reload=()=>db.get("tasks",[],{order:"category.asc"}).then(({data})=>setTasks(data||[]));
  useEffect(()=>{reload();},[]);
  const sm=m=>{setMsg(m);setTimeout(()=>setMsg(""),3000);};
  const rm=async t=>{if(!confirm("Usunąć?"))return;await db.del("tasks",[eq("id",t.id)]);setTasks(p=>p.filter(x=>x.id!==t.id));sm("Usunięto.");};
  const tog=async t=>{await db.upd("tasks",{active:!t.active},[eq("id",t.id)]);setTasks(p=>p.map(x=>x.id===t.id?{...x,active:!x.active}:x));};
  const cats=["ALL",...new Set(tasks.map(t=>t.category))].sort();const vi=tasks.filter(t=>fil==="ALL"||t.category===fil);
  return(<div>
    {msg&&<Ok style={{marginBottom:16}}>{msg}</Ok>}
    <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>{cats.map(c=><Pi key={c} a={fil===c} onClick={()=>setFil(c)}>{c==="ALL"?"Wszystkie":c}</Pi>)}</div>
    <div style={{display:"grid",gap:10}}>
      {vi.map(t=>eid===t.id?<EdTask key={t.id} task={t} onSave={async d=>{await db.upd("tasks",d,[eq("id",t.id)]);setEid(null);reload();sm("Zaktualizowano.");}} onCancel={()=>setEid(null)}/>:(
        <div key={t.id} style={{...S.card,display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",padding:"14px 18px",opacity:t.active?1:0.5,borderLeft:`3px solid ${t.active?"#0ea5e9":"#475569"}`}}>
          <div style={{flex:1,minWidth:200}}>
            <div style={{display:"flex",gap:8,marginBottom:6}}><span style={{fontSize:11,background:"#1e293b",padding:"2px 8px",borderRadius:20,color:"#7dd3fc"}}>{t.category}</span><span style={{fontSize:11,color:t.difficulty==="łatwe"?"#22c55e":t.difficulty==="średnie"?"#f59e0b":"#ef4444"}}>{t.difficulty}</span></div>
            <p style={{margin:"4px 0",fontWeight:500,fontSize:14}}>{t.question}</p><p style={{margin:0,color:"#22c55e",fontSize:13}}>Odp: <b>{t.answer}</b></p>
          </div>
          <div style={{display:"flex",gap:6}}><Sm onClick={()=>setEid(t.id)}>✏️</Sm><Sm onClick={()=>tog(t)} col={t.active?"#1e293b":"#001c0a"}>{t.active?"👁️ Ukryj":"👁️ Pokaż"}</Sm><Sm onClick={()=>rm(t)} col="#1c0505">🗑️</Sm></div>
        </div>
      ))}
      {vi.length===0&&<Em>Brak zadań.</Em>}
    </div>
  </div>);
}

function EdTask({task,onSave,onCancel}){
  const [q,setQ]=useState(task.question);const [a,setA]=useState(task.answer);const [c,setC]=useState(task.category);const [d,setD]=useState(task.difficulty);
  return(<div style={{...S.card,border:"2px solid #0ea5e9",padding:20}}>
    <Lb>Treść</Lb><textarea value={q} onChange={e=>setQ(e.target.value)} style={{...S.inp,height:64,resize:"vertical"}}/>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginTop:10}}>
      <div><Lb>Odpowiedź</Lb><In v={a} s={setA}/></div><div><Lb>Kategoria</Lb><In v={c} s={setC}/></div>
      <div><Lb>Trudność</Lb><select value={d} onChange={e=>setD(e.target.value)} style={S.inp}><option value="łatwe">łatwe</option><option value="średnie">średnie</option><option value="trudne">trudne</option></select></div>
    </div>
    <div style={{display:"flex",gap:8,marginTop:12}}><Bt onClick={()=>onSave({question:q,answer:a,category:c,difficulty:d})} style={{flex:1,margin:0,padding:"10px"}}>💾 Zapisz</Bt><Bt onClick={onCancel} style={{flex:1,margin:0,padding:"10px",background:"#1e293b"}}>Anuluj</Bt></div>
  </div>);
}

function StatTab(){
  const [stats,setStats]=useState([]);const [det,setDet]=useState(null);const [hist,setHist]=useState([]);const [ld,setLd]=useState(true);const [fil,setFil]=useState("ALL");
  useEffect(()=>{db.get("student_stats",[],{order:"class.asc"}).then(({data})=>{setStats(data||[]);setLd(false);});},[]);
  const showH=async u=>{setDet(u);const {data}=await db.get("answers",[eq("user_id",u.user_id)],{order:"answered_at.desc",limit:50});const rows=data||[];const tm={};for(const tid of[...new Set(rows.map(a=>a.task_id))]){const {data:t}=await db.get("tasks",[eq("id",tid)],{limit:1,select:"id,question,category"});if(t?.[0])tm[tid]=t[0];}setHist(rows.map(a=>({...a,task:tm[a.task_id]})));};
  if(ld)return <Spin text="Ładowanie…"/>;
  if(det)return(<div>
    <button onClick={()=>{setDet(null);setHist([]);}} style={{...S.gh,marginBottom:20}}>← Wróć</button>
    <h2 style={{margin:"0 0 4px",fontSize:20}}>{det.name} <span style={{color:"#64748b",fontSize:14}}>@{det.username}</span></h2>
    <p style={{color:"#475569",fontSize:13,marginBottom:20}}>Klasa {det.class||"–"}</p>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:24}}>
      {[["Rozwiązane",det.tasks_solved,"#22c55e"],["Poprawne",det.correct_answers,"#38bdf8"],["Prób",det.total_attempts,"#a78bfa"],["Skuteczność",`${det.accuracy_pct||0}%`,"#f59e0b"]].map(([l,v,c])=>(<div key={l} style={{...S.card,textAlign:"center",padding:16}}><div style={{fontSize:26,fontWeight:800,color:c}}>{v}</div><div style={{fontSize:12,color:"#64748b",marginTop:4}}>{l}</div></div>))}
    </div>
    <div style={{display:"grid",gap:8}}>
      {hist.map(h=>(<div key={h.id} style={{...S.card,padding:"12px 16px",display:"flex",gap:12,alignItems:"center",borderLeft:`3px solid ${h.correct?"#22c55e":"#ef4444"}`}}><span>{h.correct?"✅":"❌"}</span><div style={{flex:1}}><p style={{margin:0,fontSize:13,fontWeight:500}}>{h.task?.question||h.task_id}</p><p style={{margin:"3px 0 0",fontSize:12,color:"#475569"}}>Odp: <b style={{color:h.correct?"#22c55e":"#ef4444"}}>{h.given_answer}</b> · {h.task?.category}</p></div><span style={{fontSize:11,color:"#475569",whiteSpace:"nowrap"}}>{new Date(h.answered_at).toLocaleString("pl-PL")}</span></div>))}
      {!hist.length&&<Em>Brak historii.</Em>}
    </div>
  </div>);
  const ac=["ALL",...new Set(stats.map(s=>s.class||"–"))].sort();const vi=stats.filter(s=>fil==="ALL"||(s.class||"–")===fil);
  return(<div>
    <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>{ac.map(c=><Pi key={c} a={fil===c} onClick={()=>setFil(c)}>{c==="ALL"?"Wszystkie":c}</Pi>)}</div>
    <div style={{display:"grid",gap:10}}>
      {vi.map(s=>(<div key={s.user_id} style={{...S.card,padding:"14px 18px",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",cursor:"pointer"}} onClick={()=>showH(s)}>
        <div style={{flex:1}}><span style={{fontWeight:700}}>{s.name}</span><span style={{marginLeft:8,fontSize:11,background:"#1e293b",padding:"2px 8px",borderRadius:20,color:"#7dd3fc"}}>{s.class||"–"}</span><div style={{color:"#475569",fontSize:12,marginTop:3}}>@{s.username}</div></div>
        {[[`✅ ${s.tasks_solved}`,"#22c55e"],[`🎯 ${s.accuracy_pct||0}%`,"#f59e0b"],[`📝 ${s.total_attempts}`,"#64748b"]].map(([t,c])=>(<span key={t} style={{fontSize:13,color:c,fontWeight:600}}>{t}</span>))}
        <span style={{color:"#334155"}}>→</span>
      </div>))}
      {vi.length===0&&<Em>Brak danych.</Em>}
    </div>
  </div>);
}

function AddStud(){
  const [n,setN]=useState("");const [c,setC]=useState("");const [p,setP]=useState("");const [m,setM]=useState("45");const [cls,setCls]=useState([]);const [msg,setMsg]=useState("");const [err,setErr]=useState("");
  useEffect(()=>{db.get("classes",[],{order:"name.asc"}).then(({data})=>setCls(data||[]));},[]);
  const add=async()=>{
    if(!n.trim()||!c||!p.trim()){setErr("Wypełnij wszystkie pola.");return;}if(p.length<4){setErr("Hasło min 4 znaki.");return;}setErr("");
    const cr=cls.find(x=>x.id===c);const base=n.trim().toLowerCase().replace(/\s+/g,"")+"_"+cr.name;
    const {data:ex}=await db.get("users",[lik("username",`${base}%`)],{select:"username"});
    let uname=base;if(ex?.length){const ns=ex.map(u=>{const mx=u.username.replace(base,"");return mx?parseInt(mx)||0:0;});uname=base+(Math.max(...ns)+1);}
    const {error}=await db.ins("users",{username:uname,name:n.trim(),password_hash:p,role:"student",class_id:c,active:true,session_minutes:m?parseInt(m):null});
    if(error){setErr("Błąd: "+JSON.stringify(error));return;}
    setMsg(`✅ Dodano: ${uname}`);setN("");setC("");setP("");setM("45");setTimeout(()=>setMsg(""),4000);
  };
  return(<div style={{...S.card,maxWidth:500,padding:28}}>
    <h2 style={{margin:"0 0 20px",fontSize:18}}>➕ Dodaj ucznia</h2>
    {msg&&<Ok style={{marginBottom:16}}>{msg}</Ok>}
    <Lb>Imię</Lb><In v={n} s={setN} ph="np. Mateusz"/>
    <Lb style={{marginTop:14}}>Klasa</Lb><select value={c} onChange={e=>setC(e.target.value)} style={S.inp}><option value="">Wybierz klasę…</option>{cls.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select>
    <p style={{margin:"4px 0 0",fontSize:11,color:"#475569"}}>Login: {n&&c?`${n.toLowerCase().replace(/\s+/g,"")}_${cls.find(x=>x.id===c)?.name||""}`:"-"}</p>
    <Lb style={{marginTop:14}}>Hasło</Lb><In v={p} s={setP} ph="min. 4 znaki"/>
    <Lb style={{marginTop:14}}>Czas sesji (min, puste=∞)</Lb><In type="number" v={m} s={setM}/>
    {err&&<Eb>{err}</Eb>}<Bt onClick={add} style={{marginTop:20}}>✅ Dodaj ucznia</Bt>
  </div>);
}

function AddTask(){
  const [mode,setMode]=useState("s");const [q,setQ]=useState("");const [a,setA]=useState("");const [c,setC]=useState("");const [d,setD]=useState("łatwe");
  const [bk,setBk]=useState("");const [msg,setMsg]=useState("");const [err,setErr]=useState("");
  const sm=m=>{setMsg(m);setTimeout(()=>setMsg(""),4000);};
  const addS=async()=>{if(!q.trim()||!a.trim()){setErr("Treść i odpowiedź wymagane.");return;}const {error}=await db.ins("tasks",{question:q.trim(),answer:a.trim(),category:c.trim()||"Różne",difficulty:d,active:true});if(error){setErr("Błąd: "+JSON.stringify(error));return;}setErr("");setQ("");setA("");setC("");setD("łatwe");sm("✅ Dodano!");};
  const addB=async()=>{const lines=bk.split("\n").filter(l=>l.trim());const rows=[];const errs=[];lines.forEach((l,i)=>{const p=l.split("|").map(x=>x.trim());if(p.length<2){errs.push(`L${i+1}`);return;}rows.push({question:p[0],answer:p[1],category:p[2]||"Różne",difficulty:p[3]||"łatwe",active:true});});if(errs.length){setErr("Błędne: "+errs.join(", "));return;}const {error}=await db.ins("tasks",rows);if(error){setErr("Błąd: "+JSON.stringify(error));return;}setErr("");setBk("");sm(`✅ Dodano ${rows.length}!`);};
  return(<div style={{...S.card,maxWidth:620,padding:28}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
      <h2 style={{margin:0,fontSize:18}}>➕ Dodaj zadanie</h2>
      <div style={{display:"flex",gap:6}}>{[["s","Pojedyncze"],["b","Masowe"]].map(([k,l])=>(<button key={k} onClick={()=>setMode(k)} style={{padding:"6px 12px",borderRadius:6,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,background:mode===k?"#0369a1":"#1e293b",color:mode===k?"#fff":"#64748b"}}>{l}</button>))}</div>
    </div>
    {msg&&<Ok style={{marginBottom:16}}>{msg}</Ok>}
    {mode==="s"?(<>
      <Lb>Treść zadania</Lb><textarea value={q} onChange={e=>setQ(e.target.value)} placeholder="np. Ile to 5 × 7?" style={{...S.inp,height:72,resize:"vertical"}}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginTop:12}}>
        <div><Lb>Odpowiedź</Lb><In v={a} s={setA} ph="np. 35"/></div><div><Lb>Kategoria</Lb><In v={c} s={setC} ph="np. Mnożenie"/></div>
        <div><Lb>Trudność</Lb><select value={d} onChange={e=>setD(e.target.value)} style={S.inp}><option value="łatwe">łatwe</option><option value="średnie">średnie</option><option value="trudne">trudne</option></select></div>
      </div>
      {err&&<Eb>{err}</Eb>}<Bt onClick={addS} style={{marginTop:16}}>✅ Dodaj zadanie</Bt>
    </>):(<>
      <p style={{color:"#64748b",fontSize:13,margin:"0 0 10px"}}>Format: <code style={{background:"#1e293b",padding:"2px 6px",borderRadius:4}}>pytanie | odpowiedź | kategoria | trudność</code></p>
      <textarea value={bk} onChange={e=>setBk(e.target.value)} placeholder={"Ile to 5 × 7? | 35 | Mnożenie | łatwe\nIle to √25? | 5 | Pierwiastki | łatwe"} style={{...S.inp,height:160,resize:"vertical",fontFamily:"monospace",fontSize:13}}/>
      {err&&<Eb>{err}</Eb>}<Bt onClick={addB} style={{marginTop:12}}>✅ Dodaj wszystkie</Bt>
    </>)}
  </div>);
}

function ClsTab(){
  const [cls,setCls]=useState([]);const [n,setN]=useState("");const [msg,setMsg]=useState("");
  const load=()=>db.get("classes",[],{order:"name.asc"}).then(({data})=>setCls(data||[]));
  useEffect(()=>{load();},[]);
  const add=async()=>{if(!n.trim())return;const {error}=await db.ins("classes",{name:n.trim().toUpperCase()});if(error){setMsg("Błąd: "+JSON.stringify(error));return;}setN("");load();setMsg("✅ Dodano.");setTimeout(()=>setMsg(""),3000);};
  const rm=async c=>{if(!confirm(`Usunąć ${c.name}?`))return;await db.del("classes",[eq("id",c.id)]);load();setMsg("Usunięto.");setTimeout(()=>setMsg(""),3000);};
  return(<div style={{maxWidth:400}}>
    {msg&&<Ok style={{marginBottom:16}}>{msg}</Ok>}
    <div style={{...S.card,padding:20,marginBottom:16}}><Lb>Nowa klasa</Lb><div style={{display:"flex",gap:8,marginTop:6}}><In v={n} s={setN} ph="np. 4C" oe={add} style={{flex:1}}/><Bt onClick={add} style={{margin:0,padding:"10px 18px",width:"auto"}}>Dodaj</Bt></div></div>
    <div style={{display:"grid",gap:8}}>{cls.map(c=>(<div key={c.id} style={{...S.card,display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 18px"}}><span style={{fontWeight:700,fontSize:16}}>{c.name}</span><Sm onClick={()=>rm(c)} col="#1c0505">🗑️ Usuń</Sm></div>))}</div>
  </div>);
}

function In({v,s,ph,type="text",disabled,oe,style={}}){return <input type={type} value={v} disabled={disabled} placeholder={ph} onChange={e=>s(e.target.value)} onKeyDown={e=>e.key==="Enter"&&oe&&oe()} style={{...S.inp,...style}}/>;}
function Lb({children,style={}}){return <label style={{display:"block",marginBottom:5,color:"#94a3b8",fontSize:13,...style}}>{children}</label>;}
function Bt({children,onClick,loading,style={}}){return <button onClick={onClick} disabled={loading} style={{display:"block",width:"100%",padding:"12px",margin:0,background:"linear-gradient(135deg,#0369a1,#0ea5e9)",border:"none",borderRadius:10,color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",...style}}>{loading?"Ładowanie…":children}</button>;}
function Sm({children,onClick,col="#1e293b"}){return <button onClick={onClick} style={{padding:"6px 11px",background:col,border:"1px solid #334155",borderRadius:6,color:"#cbd5e1",fontSize:12,cursor:"pointer",fontWeight:500}}>{children}</button>;}
function Pi({children,a,onClick}){return <button onClick={onClick} style={{padding:"5px 13px",borderRadius:20,border:"none",cursor:"pointer",fontSize:12,background:a?"#0ea5e9":"#1e293b",color:a?"#fff":"#64748b"}}>{children}</button>;}
function Eb({children}){return <div style={{marginTop:10,padding:"9px 13px",background:"#1c0505",border:"1px solid #dc2626",borderRadius:8,color:"#f87171",fontSize:13}}>{children}</div>;}
function Ok({children,style={}}){return <div style={{padding:"9px 13px",background:"#052e16",border:"1px solid #16a34a",borderRadius:8,color:"#4ade80",fontSize:13,...style}}>{children}</div>;}
function Spin({text}){return <div style={S.cx}><div style={{textAlign:"center",color:"#475569"}}><p style={{fontSize:32}}>⚙️</p><p>{text}</p></div></div>;}
function Em({children}){return <div style={{textAlign:"center",padding:"40px",color:"#475569"}}>{children}</div>;}
function BgGrid(){return <div style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none",backgroundImage:"linear-gradient(#1e293b22 1px,transparent 1px),linear-gradient(90deg,#1e293b22 1px,transparent 1px)",backgroundSize:"40px 40px"}}/>;}
const S={root:{minHeight:"100vh",background:"#020817",fontFamily:"'Segoe UI',system-ui,sans-serif",color:"#e2e8f0",position:"relative"},cx:{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",padding:20},card:{background:"#0f172a",borderRadius:14,border:"1px solid #1e293b",position:"relative",zIndex:1},inp:{width:"100%",background:"#020817",border:"1px solid #1e293b",borderRadius:8,padding:"10px 13px",color:"#e2e8f0",fontSize:14,outline:"none",boxSizing:"border-box",display:"block"},gr:{background:"linear-gradient(135deg,#38bdf8,#818cf8)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"},gh:{background:"#0f172a",border:"1px solid #1e293b",color:"#94a3b8",padding:"8px 16px",borderRadius:8,cursor:"pointer",fontSize:13}};
