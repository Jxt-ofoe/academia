import {useState,useEffect,useRef} from "react";
import {GraduationCap,ArrowRight,Sparkles,Timer,CalendarDays,MapPin,Plus,Trash2,X,Clock,Flame,Check,ClipboardList,Calculator,LayoutDashboard,LogOut} from "lucide-react";
import { apiRequest } from "./lib/api";
const LR={GraduationCap,ArrowRight,Sparkles,Timer,CalendarDays,MapPin,Plus,Trash2,X,Clock,Flame,Check,ClipboardList,Calculator,LayoutDashboard,LogOut};
const Ic=({n,s=18,c=""})=>{const C=LR[n];return C?<C size={s} className={c}/>:null};

/* ---------- helpers ---------- */
const useNow=()=>{const [n,setN]=useState(Date.now());useEffect(()=>{const t=setInterval(()=>setN(Date.now()),30000);return()=>clearInterval(t)},[]);return n};
const uid=()=>Math.random().toString(36).slice(2,9);
const DAYS=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const SCALE=[[80,"A",4],[75,"B+",3.5],[70,"B",3],[65,"C+",2.5],[60,"C",2],[55,"D+",1.5],[50,"D",1],[0,"F",0]];
const TC={Quiz:"#FF5E1A",Exam:"#EF4444","Mid-Sem":"#A1A1AA","Final Exam":"#EF4444"};
const DEFW={Quiz:"10","Mid-Sem":"30","Final Exam":"60"};
const courseStat=c=>{
  const w=c.scores.reduce((a,s)=>a+s.weight,0); if(!w) return null;
  const e=c.scores.reduce((a,s)=>a+(s.score/s.max)*s.weight,0);
  const pct=Math.round(e/w*1000)/10; const g=SCALE.find(x=>pct>=x[0]);
  return {pct,w,letter:g[1],pts:g[2]};
};
const calcGpa=cs=>{let q=0,h=0;cs.forEach(c=>{const s=courseStat(c);if(s){q+=s.pts*c.credits;h+=c.credits}});return h?q/h:null};
const when=a=>new Date(a.date+"T"+(a.time||"00:00"));
const countdown=(a,now)=>{
  const ms=when(a)-now; if(ms<0) return {t:"Passed",urgent:false};
  const d=Math.floor(ms/864e5),h=Math.floor(ms%864e5/36e5),m=Math.floor(ms%36e5/6e4);
  return {t:d>0?d+"d "+h+"h":h+"h "+m+"m",urgent:ms<2*864e5};
};
const fmtDate=d=>new Date(d+"T00:00").toLocaleDateString(undefined,{weekday:"short",day:"numeric",month:"short"});
const isoIn=n=>{const d=new Date();d.setDate(d.getDate()+n);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
const card="bg-[#121318] border border-[#22242C] rounded-2xl";
const inp="w-full bg-[#0A0A0C] border border-[#22242C] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#FF5E1A] focus:ring-1 focus:ring-[#FF5E1A]";
const btn="bg-[#FF5E1A] hover:bg-[#ff7440] active:scale-[.98] text-white font-semibold rounded-lg px-4 py-2 text-sm transition flex items-center justify-center gap-2";
const ghost="border border-[#22242C] hover:border-[#FF5E1A] text-zinc-300 rounded-lg px-3 py-2 text-sm transition flex items-center justify-center gap-2";

/* ---------- shared UI ---------- */
const Badge=({t})=>(<span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border whitespace-nowrap" style={{color:TC[t],background:TC[t]+"22",borderColor:TC[t]+"44"}}>{t}</span>);
const Letter=({l,p})=>{const hi=p>=3.5,f=p===0;const c=hi?"#84CC16":f?"#EF4444":"#A1A1AA";return (<span className="text-sm font-bold px-2.5 py-1 rounded-lg border" style={{color:c,background:c+"1f",borderColor:c+"44"}}>{l}</span>)};
const Modal=({title,onClose,children})=>(<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 sm:p-4" onClick={onClose}><div className={card+" w-full max-w-md rounded-b-none sm:rounded-b-2xl p-5 max-h-[90vh] overflow-y-auto"} onClick={e=>e.stopPropagation()}><div className="flex items-center justify-between mb-4"><h3 className="font-semibold text-lg">{title}</h3><button onClick={onClose} className="text-zinc-400 hover:text-white"><Ic n="X"/></button></div>{children}</div></div>);
const F=({label,children})=>(<label className="block mb-3"><span className="text-xs text-zinc-400 mb-1 block">{label}</span>{children}</label>);
const Err=({e})=>e?(<div className="text-xs text-[#EF4444] mb-3">{e}</div>):null;
const Empty=({icon,text,children})=>(<div className={card+" p-8 text-center"}><div className="mx-auto mb-3 w-12 h-12 rounded-full bg-[#0A0A0C] border border-[#22242C] flex items-center justify-center text-[#FF5E1A]"><Ic n={icon} s={22}/></div><p className="text-sm text-zinc-400 mb-4">{text}</p>{children}</div>);
const Head=({title,sub,action})=>(<div className="flex items-center justify-between gap-3 mb-5"><div><h2 className="text-xl font-bold">{title}</h2><p className="text-xs text-zinc-500">{sub}</p></div>{action}</div>);
const Ring=({v,size=120})=>{
  const r=size/2-9,c=2*Math.PI*r,p=v==null?0:Math.min(v/4,1);
  return (<div className="relative shrink-0" style={{width:size,height:size}}>
    <svg width={size} height={size} className="-rotate-90"><circle cx={size/2} cy={size/2} r={r} stroke="#22242C" strokeWidth="9" fill="none"/><circle cx={size/2} cy={size/2} r={r} stroke="#84CC16" strokeWidth="9" fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c*(1-p)} style={{transition:"stroke-dashoffset .7s"}}/></svg>
    <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-2xl font-bold text-[#84CC16]">{v==null?"–":v.toFixed(2)}</span><span className="text-[10px] text-zinc-500">of 4.0</span></div></div>);
};

/* ---------- Auth ---------- */
function Auth({onDone}){
  const [f,setF]=useState({name:"",id:"",pw:""});const [err,setErr]=useState("");const [login,setLogin]=useState(false);const [busy,setBusy]=useState(false);
  const s=k=>e=>setF({...f,[k]:e.target.value});
  const go=async()=>{
    setErr("");
    if(!f.id.trim()||(!login&&!f.name.trim())) return setErr(login?"Enter your Student ID or email.":"Enter your full name and Student ID or email.");
    if(f.pw.length<8) return setErr("Password must be at least 8 characters.");
    setBusy(true);
    try {
      if(login){
        const {user}=await apiRequest("/auth/login",{method:"POST",body:JSON.stringify({loginId:f.id,password:f.pw})});
        const {data}=await apiRequest("/data");
        onDone(user,data);
      }else{
        const initialData={};
        try {
          for(const key of ["slots","tests","courses"]){
            initialData[key]=JSON.parse(localStorage.getItem(`sam_${key}`)||"[]");
          }
        } catch(error) {
          throw new Error(`Could not read your saved browser data. Nothing was changed. ${error.message}`);
        }
        if(!Object.values(initialData).every(value=>Array.isArray(value)&&value.length<=500)){
          throw new Error("Your saved browser data is invalid or too large to import. Nothing was changed.");
        }
        const {user}=await apiRequest("/auth/signup",{method:"POST",body:JSON.stringify({name:f.name,loginId:f.id,password:f.pw,initialData})});
        Object.keys(initialData).forEach(key=>localStorage.removeItem(`sam_${key}`));
        localStorage.removeItem("sam_user");
        onDone(user,initialData);
      }
    }catch(error){
      setErr(error.message);
    }finally{
      setBusy(false);
    }
  };
  return (<div className="min-h-screen flex items-center justify-center p-4"><div className={card+" w-full max-w-md p-6 sm:p-8"}>
    <div className="w-12 h-12 rounded-xl bg-[#FF5E1A] flex items-center justify-center mb-5"><Ic n="GraduationCap" s={26} c="text-white"/></div>
    <h1 className="text-2xl font-bold">{login?"Welcome back":"Create your account"}</h1>
    <p className="text-sm text-zinc-400 mb-6">Your account and academic data are saved securely in Turso.</p>
    {!login&&<F label="Full name"><input className={inp} value={f.name} onChange={s("name")} placeholder="Ama Mensah"/></F>}
    <F label="Student ID or email"><input className={inp} value={f.id} onChange={s("id")} placeholder="10456789 or ama@st.ug.edu.gh"/></F>
    <F label="Password"><input type="password" className={inp} value={f.pw} onChange={s("pw")} placeholder="At least 8 characters"/></F>
    <Err e={err}/>
    <button disabled={busy} className={btn+" w-full py-2.5 disabled:opacity-60"} onClick={go}>{busy?"Please wait":login?"Sign in":"Sign up"}<Ic n="ArrowRight" s={16}/></button>
    <button className="text-xs text-zinc-400 hover:text-white mt-4 w-full" onClick={()=>{setLogin(!login);setErr("");}}> {login?"Need an account? Sign up":"Already have an account? Sign in"}</button>
  </div></div>);
}

/* ---------- Overview ---------- */
function Overview({user,slots,tests,courses,go,sample}){
  const now=useNow(),g=calcGpa(courses),today=(new Date().getDay()+6)%7;
  const ts=slots.filter(s=>s.day===today).sort((a,b)=>a.start.localeCompare(b.start));
  const next=tests.filter(t=>!t.done&&when(t)>now).sort((a,b)=>when(a)-when(b))[0];
  const cd=next&&countdown(next,now);
  const credits=courses.reduce((a,c)=>a+c.credits,0);
  const none=!slots.length&&!tests.length&&!courses.length;
  return (<div>
    <Head title={"Hi, "+user.name.split(" ")[0]} sub="Here’s your academic snapshot."/>
    {none&&(<div className="mb-4"><Empty icon="Sparkles" text="Nothing here yet. Add your own data or preview the dashboard with sample data."><button className={btn+" mx-auto"} onClick={sample}>Load sample data</button></Empty></div>)}
    <div className="grid gap-4 md:grid-cols-3">
      <div className={card+" p-5 flex items-center gap-4"}><Ring v={g}/><div><div className="text-xs text-zinc-500">Cumulative GPA</div><div className="text-sm text-zinc-300">{courses.length} course{courses.length===1?"":"s"} · {credits} credits</div><button onClick={()=>go("grades")} className="text-xs text-[#FF5E1A] mt-2 font-semibold">Open grades →</button></div></div>
      <div className={card+" p-5"}><div className="text-xs text-zinc-500 mb-2 flex items-center gap-1.5"><Ic n="Timer" s={14}/>Next assessment</div>
        {next?(<div><Badge t={next.type}/><div className="font-semibold mt-2 truncate">{next.title}</div><div className="text-xs text-zinc-500">{fmtDate(next.date)} · {next.time} · {next.venue}</div><div className="text-2xl font-bold mt-2" style={{color:cd.urgent?"#EF4444":"#FF5E1A"}}>{cd.t}</div></div>):(<div className="text-sm text-zinc-500">No upcoming quizzes or exams.</div>)}</div>
      <div className={card+" p-5"}><div className="text-xs text-zinc-500 mb-2 flex items-center gap-1.5"><Ic n="CalendarDays" s={14}/>Today · {DAYS[today]}</div>
        {ts.length?ts.map(s=>(<div key={s.id} className="flex justify-between gap-2 text-sm py-1"><span className="truncate"><b>{s.code}</b> <span className="text-zinc-500">{s.location}</span></span><span className="text-zinc-400 shrink-0">{s.start}</span></div>)):(<div className="text-sm text-zinc-500">No classes today.</div>)}</div>
    </div></div>);
}

/* ---------- Timetable ---------- */
function SlotForm({day,onSave,onClose}){
  const [f,setF]=useState({code:"",title:"",day,start:"08:00",end:"10:00",location:""});const [err,setErr]=useState("");
  const s=k=>e=>setF({...f,[k]:e.target.value});
  const save=()=>{
    if(!f.code.trim()||!f.title.trim()||!f.location.trim()) return setErr("Fill in course code, title and location.");
    if(f.end<=f.start) return setErr("End time must be after the start time.");
    onSave({...f,code:f.code.trim().toUpperCase(),title:f.title.trim(),location:f.location.trim(),day:+f.day,id:uid()});onClose();
  };
  return (<Modal title="Add timetable slot" onClose={onClose}>
    <div className="grid grid-cols-2 gap-3"><F label="Course code"><input className={inp} value={f.code} onChange={s("code")} placeholder="CHEM 201"/></F>
    <F label="Day"><select className={inp} value={f.day} onChange={s("day")}>{DAYS.map((d,i)=>(<option key={i} value={i}>{d}</option>))}</select></F></div>
    <F label="Course title"><input className={inp} value={f.title} onChange={s("title")} placeholder="Organic Chemistry II"/></F>
    <div className="grid grid-cols-2 gap-3"><F label="Start"><input type="time" className={inp} value={f.start} onChange={s("start")}/></F>
    <F label="End"><input type="time" className={inp} value={f.end} onChange={s("end")}/></F></div>
    <F label="Location"><input className={inp} value={f.location} onChange={s("location")} placeholder="Lecture Hall B, Room 12"/></F>
    <Err e={err}/><button className={btn+" w-full"} onClick={save}><Ic n="Plus" s={16}/>Add slot</button></Modal>);
}
function Timetable({slots,setSlots}){
  const [day,setDay]=useState((new Date().getDay()+6)%7);const [open,setOpen]=useState(false);
  const list=slots.filter(s=>s.day===day).sort((a,b)=>a.start.localeCompare(b.start));
  return (<div>
    <Head title="Timetable" sub="Your weekly lectures and labs." action={(<button className={btn} onClick={()=>setOpen(true)}><Ic n="Plus" s={16}/>Add Slot</button>)}/>
    <div className="flex gap-1 overflow-x-auto border-b border-[#22242C] mb-4">{DAYS.map((d,i)=>{const n=slots.filter(s=>s.day===i).length,on=i===day;
      return (<button key={i} onClick={()=>setDay(i)} className={"px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap transition "+(on?"border-[#FF5E1A] text-[#FF5E1A]":"border-transparent text-zinc-500 hover:text-zinc-300")}>{d}{n?(<span className="ml-1 text-[10px] opacity-70">{n}</span>):null}</button>)})}</div>
    {list.length?(<div className="space-y-3">{list.map(s=>(<div key={s.id} className={card+" p-4 flex items-center gap-4"}>
      <div className="text-center w-20 shrink-0 border-r border-[#22242C] pr-4"><div className="text-base font-bold">{s.start}</div><div className="text-xs text-zinc-500">{s.end}</div></div>
      <div className="min-w-0 flex-1"><div className="text-xs font-bold text-[#FF5E1A]">{s.code}</div><div className="font-semibold truncate">{s.title}</div><div className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5"><Ic n="MapPin" s={12}/>{s.location}</div></div>
      <button onClick={()=>setSlots(x=>x.filter(y=>y.id!==s.id))} className="text-zinc-600 hover:text-[#EF4444]"><Ic n="Trash2" s={16}/></button></div>))}</div>)
    :(<Empty icon="CalendarDays" text={"No classes on "+DAYS[day]+". Enjoy the free day or add a slot."}/>)}
    {open&&(<SlotForm day={day} onSave={s=>setSlots(x=>[...x,s])} onClose={()=>setOpen(false)}/>)}</div>);
}

/* ---------- Quizzes & Exams ---------- */
function TestForm({onSave,onClose}){
  const [f,setF]=useState({type:"Quiz",title:"",date:isoIn(3),time:"09:00",venue:""});const [err,setErr]=useState("");
  const s=k=>e=>setF({...f,[k]:e.target.value});
  const save=()=>{if(!f.title.trim()||!f.venue.trim()||!f.date) return setErr("Fill in title, date and venue.");onSave({...f,title:f.title.trim(),venue:f.venue.trim(),id:uid(),done:false});onClose()};
  return (<Modal title="Add quiz or exam" onClose={onClose}>
    <div className="grid grid-cols-2 gap-2 mb-3">{["Quiz","Exam"].map(t=>(<button key={t} onClick={()=>setF({...f,type:t})} className="rounded-lg py-2 text-sm font-bold border transition" style={f.type===t?{background:TC[t],borderColor:TC[t],color:"#fff"}:{borderColor:"#22242C",color:"#A1A1AA"}}>{t}</button>))}</div>
    <F label="Course / title"><input className={inp} value={f.title} onChange={s("title")} placeholder="CHEM 201 – Thermodynamics"/></F>
    <div className="grid grid-cols-2 gap-3"><F label="Date"><input type="date" className={inp} value={f.date} onChange={s("date")}/></F>
    <F label="Time"><input type="time" className={inp} value={f.time} onChange={s("time")}/></F></div>
    <F label="Venue"><input className={inp} value={f.venue} onChange={s("venue")} placeholder="Great Hall"/></F>
    <Err e={err}/><button className={btn+" w-full"} onClick={save}><Ic n="Plus" s={16}/>Add {f.type.toLowerCase()}</button></Modal>);
}
function Tests({tests,setTests}){
  const [open,setOpen]=useState(false);const now=useNow();
  const list=[...tests].sort((a,b)=>(a.done-b.done)||(when(a)-when(b)));
  return (<div>
    <Head title="Quizzes & Exams" sub="Never get caught off guard." action={(<button className={btn} onClick={()=>setOpen(true)}><Ic n="Plus" s={16}/>Add</button>)}/>
    {list.length?(<div className="space-y-3">{list.map(t=>{const c=countdown(t,now);return (<div key={t.id} className={card+" p-4 flex items-center gap-3 "+(t.done?"opacity-60":"")}>
      <button onClick={()=>setTests(x=>x.map(y=>y.id===t.id?{...y,done:!y.done}:y))} className={"w-6 h-6 rounded-full border flex items-center justify-center shrink-0 transition "+(t.done?"bg-[#84CC16] border-[#84CC16] text-black":"border-[#3a3d48] text-transparent hover:border-[#84CC16]")}><Ic n="Check" s={14}/></button>
      <div className="min-w-0 flex-1"><div className="flex items-center gap-2 mb-1"><Badge t={t.type}/>{t.done&&(<span className="text-[10px] font-bold text-[#84CC16]">COMPLETED</span>)}</div>
        <div className={"font-semibold truncate "+(t.done?"line-through":"")}>{t.title}</div>
        <div className="text-xs text-zinc-500 flex flex-wrap gap-x-3"><span className="flex items-center gap-1"><Ic n="Clock" s={12}/>{fmtDate(t.date)}, {t.time}</span><span className="flex items-center gap-1"><Ic n="MapPin" s={12}/>{t.venue}</span></div></div>
      {!t.done&&(<div className="text-right shrink-0"><div className="text-sm font-bold" style={{color:c.urgent?"#EF4444":"#A1A1AA"}}>{c.t}</div>{c.urgent&&(<div className="text-[10px] font-bold text-[#EF4444] flex items-center gap-1 justify-end"><Ic n="Flame" s={11}/>URGENT</div>)}</div>)}
      <button onClick={()=>setTests(x=>x.filter(y=>y.id!==t.id))} className="text-zinc-600 hover:text-[#EF4444]"><Ic n="Trash2" s={16}/></button></div>)})}</div>)
    :(<Empty icon="ClipboardList" text="No assessments yet. Add your first quiz or exam."><button className={btn+" mx-auto"} onClick={()=>setOpen(true)}>Add assessment</button></Empty>)}
    {open&&(<TestForm onSave={t=>setTests(x=>[...x,t])} onClose={()=>setOpen(false)}/>)}</div>);
}

/* ---------- Grades & GPA ---------- */
function CourseForm({onSave,onClose}){
  const [f,setF]=useState({name:"",credits:"3"});const [err,setErr]=useState("");
  const save=()=>{const cr=parseFloat(f.credits);if(!f.name.trim()||isNaN(cr)||cr<=0) return setErr("Enter a course name and credit hours above 0.");onSave({id:uid(),name:f.name.trim(),credits:cr,scores:[]});onClose()};
  return (<Modal title="Add course" onClose={onClose}>
    <F label="Course code / name"><input className={inp} value={f.name} onChange={e=>setF({...f,name:e.target.value})} placeholder="CHEM 201 – Organic Chemistry"/></F>
    <F label="Credit hours"><input type="number" min="0.5" step="0.5" className={inp} value={f.credits} onChange={e=>setF({...f,credits:e.target.value})}/></F>
    <Err e={err}/><button className={btn+" w-full"} onClick={save}><Ic n="Plus" s={16}/>Add course</button></Modal>);
}
function ScoreForm({course,onSave,onClose}){
  const [f,setF]=useState({type:"Quiz",name:"",score:"",max:"",weight:"10"});const [err,setErr]=useState("");
  const s=k=>e=>setF({...f,[k]:e.target.value});
  const save=()=>{
    const sc=parseFloat(f.score),mx=parseFloat(f.max),w=parseFloat(f.weight);
    if(isNaN(sc)||isNaN(mx)||isNaN(w)||mx<=0||w<=0) return setErr("Enter a score, max score and weight above 0.");
    if(sc<0||sc>mx) return setErr("Score must be between 0 and the max score.");
    onSave({id:uid(),type:f.type,name:f.name.trim(),score:sc,max:mx,weight:w});onClose();
  };
  return (<Modal title={"Add score · "+course.name} onClose={onClose}>
    <F label="Type"><select className={inp} value={f.type} onChange={e=>setF({...f,type:e.target.value,weight:DEFW[e.target.value]})}>{Object.keys(DEFW).map(t=>(<option key={t}>{t}</option>))}</select></F>
    <F label="Label (optional)"><input className={inp} value={f.name} onChange={s("name")} placeholder="Quiz 1"/></F>
    <div className="grid grid-cols-3 gap-3"><F label="Score"><input type="number" className={inp} value={f.score} onChange={s("score")}/></F>
    <F label="Out of"><input type="number" className={inp} value={f.max} onChange={s("max")}/></F>
    <F label="Weight %"><input type="number" className={inp} value={f.weight} onChange={s("weight")}/></F></div>
    <Err e={err}/><button className={btn+" w-full"} onClick={save}><Ic n="Plus" s={16}/>Add score</button></Modal>);
}
function Grades({courses,setCourses}){
  const [add,setAdd]=useState(false);const [scoring,setScoring]=useState(null);
  const g=calcGpa(courses),credits=courses.reduce((a,c)=>a+c.credits,0);
  const sc=courses.find(c=>c.id===scoring);
  const patch=(id,fn)=>setCourses(cs=>cs.map(c=>c.id===id?fn(c):c));
  return (<div>
    <Head title="Grades & GPA" sub="4.0 scale: A 80+, B+ 75, B 70, C+ 65, C 60, D+ 55, D 50." action={(<button className={btn} onClick={()=>setAdd(true)}><Ic n="Plus" s={16}/>Course</button>)}/>
    <div className={card+" p-5 flex items-center gap-5 mb-4"}><Ring v={g} size={110}/><div><div className="text-xs text-zinc-500">Overall GPA</div><div className="text-3xl font-bold text-[#84CC16]">{g==null?"–":g.toFixed(2)}</div><div className="text-xs text-zinc-500">{courses.length} course{courses.length===1?"":"s"} · {credits} credit hours</div></div></div>
    {courses.length?(<div className="space-y-4">{courses.map(c=>{const st=courseStat(c);return (<div key={c.id} className={card+" p-4"}>
      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="font-semibold truncate">{c.name}</div><div className="text-xs text-zinc-500">{c.credits} credit hours</div></div>
        <div className="flex items-center gap-2 shrink-0">{st&&(<><span className="text-lg font-bold">{st.pct.toFixed(1)}%</span><Letter l={st.letter} p={st.pts}/></>)}<button onClick={()=>setCourses(cs=>cs.filter(x=>x.id!==c.id))} className="text-zinc-600 hover:text-[#EF4444] ml-1"><Ic n="Trash2" s={16}/></button></div></div>
      {st&&(<div className="mt-3"><div className="h-1.5 rounded-full bg-[#22242C] overflow-hidden"><div className="h-full bg-[#84CC16]" style={{width:Math.min(st.w,100)+"%"}}/></div><div className="text-[10px] text-zinc-500 mt-1">{st.w}% of coursework graded</div></div>)}
      {c.scores.length>0&&(<div className="mt-3 divide-y divide-[#22242C]">{c.scores.map(s=>(<div key={s.id} className="flex items-center gap-2 py-2 text-sm"><Badge t={s.type}/><span className="flex-1 truncate text-zinc-300">{s.name||s.type}</span><span className="text-zinc-400">{s.score}/{s.max}</span><span className="text-xs text-zinc-500 w-12 text-right">{s.weight}%</span><button onClick={()=>patch(c.id,x=>({...x,scores:x.scores.filter(y=>y.id!==s.id)}))} className="text-zinc-600 hover:text-[#EF4444]"><Ic n="X" s={14}/></button></div>))}</div>)}
      <button className={ghost+" w-full mt-3"} onClick={()=>setScoring(c.id)}><Ic n="Plus" s={14}/>Add score</button></div>)})}</div>)
    :(<Empty icon="Calculator" text="Add a course with its credit hours, then log quiz, mid-sem and exam scores."><button className={btn+" mx-auto"} onClick={()=>setAdd(true)}>Add course</button></Empty>)}
    {add&&(<CourseForm onSave={c=>setCourses(x=>[...x,c])} onClose={()=>setAdd(false)}/>)}
    {sc&&(<ScoreForm course={sc} onSave={s=>patch(sc.id,c=>({...c,scores:[...c.scores,s]}))} onClose={()=>setScoring(null)}/>)}</div>);
}

/* ---------- App shell ---------- */
const NAV=[["overview","Overview","LayoutDashboard"],["timetable","Timetable","CalendarDays"],["tests","Quizzes & Exams","ClipboardList"],["grades","Grades & GPA","Calculator"]];
function App(){
  const [user,setUser]=useState(null);
  const [data,setData]=useState({slots:[],tests:[],courses:[]});
  const [loading,setLoading]=useState(true);
  const [startupError,setStartupError]=useState("");
  const [saveError,setSaveError]=useState("");
  const [tab,setTab]=useState("overview");
  const dataRef=useRef(data);
  const saveQueue=useRef(Promise.resolve());

  const loadSession=()=>{
    setLoading(true);
    setStartupError("");
    apiRequest("/auth/me")
      .then(({user:currentUser})=>apiRequest("/data").then(({data:storedData})=>({currentUser,storedData})))
      .then(({currentUser,storedData})=>{
        dataRef.current=storedData;
        setData(storedData);
        setUser(currentUser);
      })
      .catch(error=>{
        if(error.status===401){
          setUser(null);
          setData({slots:[],tests:[],courses:[]});
          dataRef.current={slots:[],tests:[],courses:[]};
        }else{
          setStartupError(error.message);
        }
      })
      .finally(()=>setLoading(false));
  };

  useEffect(()=>{
    loadSession();
  }, []);

  const updateData=(key,update)=>{
    const current=dataRef.current;
    const value=typeof update==="function"?update(current[key]):update;
    const next={...current,[key]:value};
    dataRef.current=next;
    setData(next);
    saveQueue.current=saveQueue.current
      .catch(()=>{})
      .then(()=>apiRequest("/data",{method:"PUT",body:JSON.stringify(next)}))
      .then(()=>setSaveError(""))
      .catch(error=>{
        console.error("Could not save dashboard data:",error);
        setSaveError(`Your latest changes could not be saved to Turso: ${error.message}`);
      });
  };

  const signOut=async()=>{
    try{
      await apiRequest("/auth/logout",{method:"POST"});
      setUser(null);
      setData({slots:[],tests:[],courses:[]});
      dataRef.current={slots:[],tests:[],courses:[]};
      setSaveError("");
    }catch(error){
      setStartupError(error.message);
    }
  };

  if(loading) return (<div className="min-h-screen flex items-center justify-center text-sm text-zinc-400">Connecting to your account…</div>);
  if(startupError&&!user) return (<div className="min-h-screen flex items-center justify-center p-4"><div className={card+" w-full max-w-md p-6"}><h1 className="text-xl font-bold mb-2">Could not connect to Turso</h1><p className="text-sm text-zinc-400 mb-4">{startupError}</p><button className={btn+" w-full"} onClick={loadSession}>Try again</button></div></div>);
  if(!user) return (<Auth onDone={(currentUser,storedData)=>{
    dataRef.current=storedData;
    setData(storedData);
    setUser(currentUser);
  }}/>);
  const slots=data.slots,tests=data.tests,courses=data.courses;
  const setSlots=update=>updateData("slots",update);
  const setTests=update=>updateData("tests",update);
  const setCourses=update=>updateData("courses",update);
  const sample=()=>{
    setSlots([{id:uid(),code:"CHEM 201",title:"Organic Chemistry II",day:0,start:"08:00",end:"10:00",location:"Chemistry Lecture Hall A"},{id:uid(),code:"CHEM 215",title:"Physical Chemistry",day:2,start:"10:00",end:"12:00",location:"Science Block, Room 4"},{id:uid(),code:"MATH 210",title:"Calculus III",day:(new Date().getDay()+6)%7,start:"14:00",end:"16:00",location:"Great Hall"}]);
    setTests([{id:uid(),type:"Quiz",title:"CHEM 201 – Reaction Mechanisms",date:isoIn(1),time:"09:00",venue:"Lecture Hall A",done:false},{id:uid(),type:"Exam",title:"MATH 210 – Mid-Semester",date:isoIn(9),time:"13:00",venue:"Great Hall",done:false}]);
    setCourses([{id:uid(),name:"CHEM 201 – Organic Chemistry",credits:3,scores:[{id:uid(),type:"Quiz",name:"Quiz 1",score:8,max:10,weight:10},{id:uid(),type:"Mid-Sem",name:"Mid-Sem",score:27,max:30,weight:30}]},{id:uid(),name:"MATH 210 – Calculus III",credits:4,scores:[{id:uid(),type:"Quiz",name:"Quiz 1",score:6,max:10,weight:10},{id:uid(),type:"Mid-Sem",name:"Mid-Sem",score:21,max:30,weight:30}]}]);
  };
  const view=tab==="timetable"?(<Timetable slots={slots} setSlots={setSlots}/>):tab==="tests"?(<Tests tests={tests} setTests={setTests}/>):tab==="grades"?(<Grades courses={courses} setCourses={setCourses}/>):(<Overview user={user} slots={slots} tests={tests} courses={courses} go={setTab} sample={sample}/>);
  return (<div className="min-h-screen flex">
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-[#22242C] p-4 sticky top-0 h-screen">
      <div className="flex items-center gap-2.5 px-2 mb-8"><div className="w-9 h-9 rounded-lg bg-[#FF5E1A] flex items-center justify-center"><Ic n="GraduationCap" s={20} c="text-white"/></div><span className="font-bold text-lg">Academia</span></div>
      <nav className="space-y-1 flex-1">{NAV.map(([k,l,i])=>(<button key={k} onClick={()=>setTab(k)} className={"w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium border-l-2 transition "+(tab===k?"border-[#FF5E1A] bg-[#FF5E1A]/10 text-[#FF5E1A]":"border-transparent text-zinc-400 hover:bg-[#121318] hover:text-white")}><Ic n={i} s={18}/>{l}</button>))}</nav>
      <div className={card+" p-3"}><div className="text-sm font-semibold truncate">{user.name}</div><div className="text-xs text-zinc-500 truncate mb-2">{user.idLabel}</div><button onClick={signOut} className="text-xs text-zinc-400 hover:text-[#EF4444] flex items-center gap-1.5"><Ic n="LogOut" s={13}/>Sign out</button></div>
    </aside>
    <main className="flex-1 min-w-0 w-full max-w-5xl mx-auto p-4 md:p-8 pb-28 md:pb-8">
      <div className="md:hidden flex items-center justify-between mb-5"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-[#FF5E1A] flex items-center justify-center"><Ic n="GraduationCap" s={18} c="text-white"/></div><span className="font-bold">Academia</span></div><button onClick={signOut} className="text-zinc-400"><Ic n="LogOut" s={18}/></button></div>
      {saveError&&<div role="alert" className="mb-4 rounded-lg border border-[#EF4444]/40 bg-[#EF4444]/10 px-4 py-3 text-sm text-[#FCA5A5]">{saveError}</div>}
      {view}</main>
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0A0A0C]/95 backdrop-blur border-t border-[#22242C] grid grid-cols-4 pb-[env(safe-area-inset-bottom,0px)]">{NAV.map(([k,l,i])=>(<button key={k} onClick={()=>setTab(k)} className={"flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold border-t-2 -mt-px "+(tab===k?"border-[#FF5E1A] text-[#FF5E1A]":"border-transparent text-zinc-500")}><Ic n={i} s={20}/>{l.split(" ")[0]}</button>))}</nav>
  </div>);
}
export default App;
