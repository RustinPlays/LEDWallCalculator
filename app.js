(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const SCALE = 0.12; // screen pixels per mm
  const SNAP_MM = 50;
  const MARGIN = 90;
  const COLORS = ['#4bb7ff','#22c55e','#f59e0b','#a78bfa','#ef4444','#06b6d4','#84cc16','#f97316','#ec4899','#eab308','#60a5fa','#34d399'];
  const STORAGE_KEY = 'jcLedWallPlannerProjectV1';
  const CUSTOM_KEY = 'jcLedWallPlannerCustomProfilesV1';

  const basePanels = (window.JC_LED_PROFILES?.panels || []).map(p => ({...p}));
  const baseProcessors = (window.JC_LED_PROFILES?.processors || []).map(p => ({...p}));
  let customProfiles = loadCustomProfiles();

  const state = {
    panels: [],
    dataRoutes: [],
    powerRoutes: [],
    selectedIds: [],
    view: 'front',
    planMode: 'layout',
    currentRouteId: null,
    numberingMode: 'sequential',
    showIds: true,
    showCentre: true,
    showGround: true,
    showDimensions: true,
    units: 'metric',
    processorId: 'novastar-generic',
    distroName: '16A Distro',
    dirty: false
  };

  let history = [];
  let future = [];
  let drag = null;
  let suppressClick = false;

  function uid(prefix='id') {
    if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
  const clone = x => JSON.parse(JSON.stringify(x));
  const num = (v,d=0) => Number.isFinite(Number(v)) ? Number(v) : d;
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const snap = v => Math.round(v / SNAP_MM) * SNAP_MM;
  const fmt = (n,d=1) => Number(n || 0).toLocaleString(undefined,{maximumFractionDigits:d});
  const ceil = n => Math.ceil(Number(n)||0);

  function loadCustomProfiles(){
    try { return JSON.parse(localStorage.getItem(CUSTOM_KEY) || '{"panels":[],"processors":[]}'); }
    catch { return {panels:[],processors:[]}; }
  }
  function saveCustomProfiles(){
    try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(customProfiles)); } catch {}
  }
  function allPanelProfiles(){ return [...basePanels,...(customProfiles.panels||[])]; }
  function allProcessors(){ return [...baseProcessors,...(customProfiles.processors||[])]; }
  function panelProfile(id){ return allPanelProfiles().find(p=>p.id===id) || allPanelProfiles()[0]; }
  function processorProfile(id){ return allProcessors().find(p=>p.id===id) || allProcessors()[0]; }

  function makePanel(profile, x=0, y=0, rotation=0){
    const rotated = rotation % 180 !== 0;
    const widthMm = rotated ? profile.heightMm : profile.widthMm;
    const heightMm = rotated ? profile.widthMm : profile.heightMm;
    const pxW = Math.max(1,Math.round(widthMm/profile.pitchMm));
    const pxH = Math.max(1,Math.round(heightMm/profile.pitchMm));
    return {
      id: uid('panel'), profileId: profile.id, x:snap(x), y:snap(y), rotation:rotated?90:0,
      widthMm,heightMm,pitchMm:profile.pitchMm,pixelW:pxW,pixelH:pxH,
      maxPowerW:profile.maxPowerW,avgPowerW:profile.avgPowerW,weightKg:profile.weightKg,
      maxPowerLink:profile.maxPowerLink||8, customLabel:''
    };
  }

  function snapshot(){
    return clone({
      panels:state.panels,dataRoutes:state.dataRoutes,powerRoutes:state.powerRoutes,
      selectedIds:state.selectedIds,view:state.view,planMode:state.planMode,currentRouteId:null,
      numberingMode:state.numberingMode,showIds:state.showIds,showCentre:state.showCentre,
      showGround:state.showGround,showDimensions:state.showDimensions,units:state.units,
      processorId:state.processorId,distroName:state.distroName
    });
  }
  function restore(s, render=true){
    if(!s) return;
    Object.assign(state, clone(s));
    state.currentRouteId=null;
    state.dirty=true;
    if(render) renderAll();
  }
  function pushHistory(){
    history.push(snapshot());
    if(history.length>60) history.shift();
    future=[];
    updateUndoRedo();
  }
  function undo(){ if(!history.length)return; future.push(snapshot()); restore(history.pop()); updateUndoRedo(); }
  function redo(){ if(!future.length)return; history.push(snapshot()); restore(future.pop()); updateUndoRedo(); }
  function updateUndoRedo(){ $('undoBtn').disabled=!history.length; $('redoBtn').disabled=!future.length; }
  function markDirty(){ state.dirty=true; $('projectStatus').textContent='Unsaved'; }

  function getBounds(){
    if(!state.panels.length) return {minX:0,minY:0,maxX:0,maxY:0,width:0,height:0};
    const minX=Math.min(...state.panels.map(p=>p.x));
    const minY=Math.min(...state.panels.map(p=>p.y));
    const maxX=Math.max(...state.panels.map(p=>p.x+p.widthMm));
    const maxY=Math.max(...state.panels.map(p=>p.y+p.heightMm));
    return {minX,minY,maxX,maxY,width:maxX-minX,height:maxY-minY};
  }
  function displayX(panel,bounds){
    return state.view==='back' ? bounds.width - (panel.x-bounds.minX) - panel.widthMm : panel.x-bounds.minX;
  }
  function screenPoint(panel,bounds){
    return {
      x:MARGIN+(displayX(panel,bounds)+panel.widthMm/2)*SCALE,
      y:MARGIN+((panel.y-bounds.minY)+panel.heightMm/2)*SCALE
    };
  }

  function panelName(panel,index){
    if(state.numberingMode==='custom' && panel.customLabel) return panel.customLabel;
    if(state.numberingMode==='grid'){
      const b=getBounds();
      const row=Math.round((panel.y-b.minY)/500);
      const col=Math.round((panel.x-b.minX)/500)+1;
      return `${String.fromCharCode(65+(row%26))}${col}`;
    }
    if(state.numberingMode==='data'){
      let order=0;
      for(const r of state.dataRoutes){ const i=r.panelIds.indexOf(panel.id); if(i>=0){ order += i+1; break; } order += r.panelIds.length; }
      return order?String(order):String(index+1);
    }
    return String(index+1);
  }

  function quickBuild(){
    const widthM=num($('quickWidth').value);
    const heightM=num($('quickHeight').value);
    const profile=panelProfile($('panelProfile').value);
    const targetW=Math.round(widthM*1000), targetH=Math.round(heightM*1000);
    if(targetW<=0||targetH<=0) return;
    const cols=targetW/profile.widthMm;
    const rows=targetH/profile.heightMm;
    if(!Number.isInteger(cols)||!Number.isInteger(rows)){
      $('buildHint').textContent=`${widthM} × ${heightM} m is not an exact multiple of ${profile.widthMm} × ${profile.heightMm} mm. Choose another profile/dimension or build manually.`;
      $('buildHint').classList.add('error-text');
      return;
    }
    pushHistory();
    state.panels=[]; state.dataRoutes=[]; state.powerRoutes=[]; state.selectedIds=[];
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++) state.panels.push(makePanel(profile,c*profile.widthMm,r*profile.heightMm));
    $('buildHint').textContent=`Built ${cols} × ${rows}: ${state.panels.length} cabinets.`;
    $('buildHint').classList.remove('error-text');
    markDirty(); renderAll();
  }

  function addPanel(){
    const profile=panelProfile($('panelProfile').value); pushHistory();
    let x=0,y=0;
    if(state.selectedIds.length){ const p=state.panels.find(x=>x.id===state.selectedIds[state.selectedIds.length-1]); if(p){x=p.x+p.widthMm;y=p.y;} }
    else if(state.panels.length){ const p=state.panels[state.panels.length-1];x=p.x+p.widthMm;y=p.y; }
    const p=makePanel(profile,x,y); state.panels.push(p);state.selectedIds=[p.id];markDirty();renderAll();
  }
  function duplicateSelected(){
    if(!state.selectedIds.length)return; pushHistory();
    const made=[];
    for(const id of state.selectedIds){ const p=state.panels.find(x=>x.id===id); if(!p)continue; const q={...clone(p),id:uid('panel'),x:p.x+p.widthMm,customLabel:p.customLabel?`${p.customLabel} copy`:''}; state.panels.push(q); made.push(q.id); }
    state.selectedIds=made; markDirty(); renderAll();
  }
  function deleteSelected(){
    if(!state.selectedIds.length)return; pushHistory(); const gone=new Set(state.selectedIds);
    state.panels=state.panels.filter(p=>!gone.has(p.id));
    for(const r of [...state.dataRoutes,...state.powerRoutes]) r.panelIds=r.panelIds.filter(id=>!gone.has(id));
    state.dataRoutes=state.dataRoutes.filter(r=>r.panelIds.length); state.powerRoutes=state.powerRoutes.filter(r=>r.panelIds.length);
    state.selectedIds=[]; markDirty();renderAll();
  }
  function rotateSelected(){
    if(!state.selectedIds.length)return; pushHistory();
    for(const id of state.selectedIds){ const p=state.panels.find(x=>x.id===id); if(!p)continue; [p.widthMm,p.heightMm]=[p.heightMm,p.widthMm]; [p.pixelW,p.pixelH]=[p.pixelH,p.pixelW]; p.rotation=(p.rotation+90)%180; }
    markDirty();renderAll();
  }
  function selectRow(){
    if(!state.selectedIds.length)return; const p=state.panels.find(x=>x.id===state.selectedIds[0]); if(!p)return; state.selectedIds=state.panels.filter(q=>Math.abs(q.y-p.y)<1).map(q=>q.id);renderCanvas();
  }
  function selectCol(){
    if(!state.selectedIds.length)return; const p=state.panels.find(x=>x.id===state.selectedIds[0]); if(!p)return; state.selectedIds=state.panels.filter(q=>Math.abs(q.x-p.x)<1).map(q=>q.id);renderCanvas();
  }

  function serpentinePanels(){
    const rows=[]; const sorted=[...state.panels].sort((a,b)=>a.y-b.y||a.x-b.x);
    for(const p of sorted){ let row=rows.find(r=>Math.abs(r.y-p.y)<1); if(!row){row={y:p.y,items:[]};rows.push(row);} row.items.push(p); }
    rows.sort((a,b)=>a.y-b.y);
    const out=[]; rows.forEach((r,i)=>{r.items.sort((a,b)=>a.x-b.x);if(i%2)r.items.reverse();out.push(...r.items)}); return out;
  }

  function suggestDataPlan(){
    pushHistory();
    const cap=Math.max(1,num($('pixelsPerPort').value,650000));
    const ordered=serpentinePanels(); const routes=[]; let current=null; let load=0;
    for(const p of ordered){
      const px=p.pixelW*p.pixelH;
      if(!current || (load+px>cap && current.panelIds.length)){ current={id:uid('data'),label:`DATA ${routes.length+1}`,panelIds:[],port:routes.length+1};routes.push(current);load=0; }
      current.panelIds.push(p.id); load+=px;
    }
    state.dataRoutes=routes; markDirty();renderAll();
  }
  function suggestPowerPlan(){
    pushHistory();
    const voltage=num($('supplyVoltage').value,230), amps=num($('circuitAmps').value,16), head=num($('headroom').value,.8);
    const cap=voltage*amps*head; const ordered=serpentinePanels();
    const chains=[]; let chain=null; let load=0; let maxPanels=Infinity;
    for(const p of ordered){
      const nextMax=Math.min(maxPanels,p.maxPowerLink||8);
      const needsNew=!chain || chain.panelIds.length>=nextMax || (load+p.maxPowerW>cap && chain.panelIds.length);
      if(needsNew){ chain={id:uid('power'),label:`PWR ${chains.length+1}`,panelIds:[],circuit:0};chains.push(chain);load=0;maxPanels=Infinity; }
      chain.panelIds.push(p.id); load+=p.maxPowerW; maxPanels=Math.min(maxPanels,p.maxPowerLink||8);
    }
    // Efficient first-fit circuit packing. Multiple power home-runs can share a circuit when capacity allows.
    const circuitLoads=[];
    const sortedChains=[...chains].sort((a,b)=>routeWatts(b)-routeWatts(a));
    for(const ch of sortedChains){ const w=routeWatts(ch); let ci=circuitLoads.findIndex(v=>v+w<=cap+0.001); if(ci<0){ci=circuitLoads.length;circuitLoads.push(0);} circuitLoads[ci]+=w;ch.circuit=ci+1; }
    chains.forEach((r,i)=>{r.label=`PWR ${i+1}`;});
    state.powerRoutes=chains; markDirty();renderAll();
  }
  function routePixels(route){ return route.panelIds.reduce((s,id)=>{const p=state.panels.find(x=>x.id===id);return s+(p?p.pixelW*p.pixelH:0)},0); }
  function routeWatts(route){ return route.panelIds.reduce((s,id)=>{const p=state.panels.find(x=>x.id===id);return s+(p?p.maxPowerW:0)},0); }

  function suggestActivePlan(){ if(state.planMode==='data')suggestDataPlan(); else if(state.planMode==='power')suggestPowerPlan(); else {suggestDataPlan();suggestPowerPlan();} }
  function currentRoutes(){ return state.planMode==='data'?state.dataRoutes:state.planMode==='power'?state.powerRoutes:[]; }
  function newRoute(){
    if(state.planMode==='layout')return; pushHistory();
    const routes=currentRoutes(); const type=state.planMode;
    const r={id:uid(type),label:`${type==='data'?'DATA':'PWR'} ${routes.length+1}`,panelIds:[]};
    if(type==='data')r.port=routes.length+1; else r.circuit=Math.max(1,...state.powerRoutes.map(x=>x.circuit||0))+1;
    routes.push(r); state.currentRouteId=r.id; markDirty(); renderAll();
  }
  function finishRoute(){
    const routes=currentRoutes(); const r=routes.find(x=>x.id===state.currentRouteId);
    if(r && !r.panelIds.length){ const i=routes.indexOf(r);routes.splice(i,1); }
    state.currentRouteId=null; markDirty();renderAll();
  }
  function clearPlan(){ if(state.planMode==='layout')return; pushHistory(); if(state.planMode==='data')state.dataRoutes=[];else state.powerRoutes=[];state.currentRouteId=null;markDirty();renderAll(); }
  function clickPanelForRoute(panel){
    if(!state.currentRouteId)return;
    const r=currentRoutes().find(x=>x.id===state.currentRouteId); if(!r)return;
    const i=r.panelIds.indexOf(panel.id); if(i>=0)r.panelIds.splice(i,1); else r.panelIds.push(panel.id);
    markDirty();renderAll();
  }

  function renderCanvas(){
    const layer=$('panelLayer'), svg=$('routeOverlay'), canvas=$('wallCanvas'), b=getBounds();
    const w=Math.max(1100,MARGIN*2+b.width*SCALE),h=Math.max(760,MARGIN*2+b.height*SCALE+80);
    canvas.style.width=`${w}px`;canvas.style.height=`${h}px`;
    layer.innerHTML=''; svg.innerHTML='';
    $('centreLine').style.display=state.showCentre?'block':'none';
    $('groundLine').style.display=state.showGround?'block':'none';
    $('centreLine').style.left=`${MARGIN+b.width*SCALE/2}px`;
    $('groundLine').style.top=`${MARGIN+b.height*SCALE+18}px`;

    state.panels.forEach((p,i)=>{
      const el=document.createElement('div'); el.className='led-panel';el.dataset.id=p.id;
      const dx=displayX(p,b),dy=p.y-b.minY;
      el.style.left=`${MARGIN+dx*SCALE}px`;el.style.top=`${MARGIN+dy*SCALE}px`;el.style.width=`${Math.max(18,p.widthMm*SCALE)}px`;el.style.height=`${Math.max(18,p.heightMm*SCALE)}px`;
      el.classList.toggle('selected',state.selectedIds.includes(p.id));
      const activeRoute=currentRoutes().find(r=>r.id===state.currentRouteId);
      el.classList.toggle('route-selected',!!activeRoute?.panelIds.includes(p.id));
      const id=document.createElement('span');id.className='panel-id';id.textContent=state.showIds?panelName(p,i):'';
      const pitch=document.createElement('span');pitch.className='panel-pitch';pitch.textContent=`P${p.pitchMm}`;
      el.append(id,pitch);
      el.addEventListener('dblclick',()=>{const v=prompt('Custom panel label:',p.customLabel||panelName(p,i));if(v!==null){pushHistory();p.customLabel=v.trim().slice(0,40);state.numberingMode='custom';$('numberingMode').value='custom';markDirty();renderAll();}});
      el.addEventListener('click',e=>{
        if(suppressClick){suppressClick=false;return;}
        if(state.planMode!=='layout'){clickPanelForRoute(p);return;}
        if(e.ctrlKey||e.metaKey){ const set=new Set(state.selectedIds);set.has(p.id)?set.delete(p.id):set.add(p.id);state.selectedIds=[...set]; }
        else state.selectedIds=[p.id];
        renderCanvas();
      });
      el.addEventListener('pointerdown',e=>startDrag(e,p));
      layer.append(el);
    });
    renderRoutes(svg,b);
    renderDimensionReadout();
  }

  function startDrag(e,p){
    if(state.planMode!=='layout'||e.button!==0)return;
    if(!state.selectedIds.includes(p.id)) state.selectedIds=[p.id];
    const starts=state.selectedIds.map(id=>{const q=state.panels.find(x=>x.id===id);return q?{id,x:q.x,y:q.y}:null}).filter(Boolean);
    drag={startX:e.clientX,startY:e.clientY,starts,moved:false};
    document.addEventListener('pointermove',dragMove); document.addEventListener('pointerup',dragEnd,{once:true});
  }
  function dragMove(e){
    if(!drag)return; const dx=(e.clientX-drag.startX)/SCALE*(state.view==='back'?-1:1),dy=(e.clientY-drag.startY)/SCALE;
    if(Math.abs(dx)+Math.abs(dy)>3&&!drag.moved){pushHistory();drag.moved=true;}
    if(!drag.moved)return;
    for(const s of drag.starts){const p=state.panels.find(x=>x.id===s.id);if(p){p.x=snap(s.x+dx);p.y=snap(s.y+dy);}}
    suppressClick=true; markDirty(); renderAll(false);
  }
  function dragEnd(){ document.removeEventListener('pointermove',dragMove); drag=null; if(suppressClick)setTimeout(()=>suppressClick=false,40); }

  function renderRoutes(svg,b){
    const routes=state.planMode==='data'?state.dataRoutes:state.planMode==='power'?state.powerRoutes:[];
    routes.forEach((r,ri)=>{
      const pts=r.panelIds.map(id=>state.panels.find(p=>p.id===id)).filter(Boolean).map(p=>screenPoint(p,b)); if(!pts.length)return;
      const color=state.planMode==='power'?COLORS[((r.circuit||1)-1)%COLORS.length]:COLORS[ri%COLORS.length];
      if(pts.length>1){const pl=document.createElementNS('http://www.w3.org/2000/svg','polyline');pl.setAttribute('points',pts.map(p=>`${p.x},${p.y}`).join(' '));pl.setAttribute('class','route-path');pl.setAttribute('stroke',color);svg.append(pl);}
      const first=pts[0];const home=document.createElementNS('http://www.w3.org/2000/svg','line');home.setAttribute('x1',Math.max(12,first.x-65));home.setAttribute('y1',first.y);home.setAttribute('x2',first.x);home.setAttribute('y2',first.y);home.setAttribute('class','route-path route-home');home.setAttribute('stroke',color);svg.append(home);
      const t=document.createElementNS('http://www.w3.org/2000/svg','text');t.setAttribute('x',Math.max(8,first.x-62));t.setAttribute('y',first.y-7);t.setAttribute('fill',color);t.setAttribute('class','route-label');t.textContent=state.planMode==='power'?`${r.label} · C${r.circuit||'?'}`:`${r.label}`;svg.append(t);
    });
  }

  function renderDimensionReadout(){
    const b=getBounds(); if(!state.showDimensions||!state.panels.length){$('dimensionReadout').textContent='';$('dimensionReadout').style.display='none';return;}
    $('dimensionReadout').style.display='block';
    $('dimensionReadout').textContent=`${formatDistance(b.width)} × ${formatDistance(b.height)} · ${state.view==='back'?'BACK':'FRONT'} VIEW`;
  }
  function formatDistance(mm){ if(state.units==='imperial'){const inches=mm/25.4,ft=Math.floor(inches/12),rem=Math.round((inches-ft*12)*10)/10;return `${ft}′ ${rem}″`;} return mm>=1000?`${fmt(mm/1000,2)} m`:`${fmt(mm,0)} mm`; }

  function wallResolution(){
    if(!state.panels.length)return {w:0,h:0,mixed:false,total:0};
    const total=state.panels.reduce((s,p)=>s+p.pixelW*p.pixelH,0); const pitches=[...new Set(state.panels.map(p=>p.pitchMm))]; const b=getBounds();
    if(pitches.length!==1)return {w:0,h:0,mixed:true,total};
    return {w:Math.round(b.width/pitches[0]),h:Math.round(b.height/pitches[0]),mixed:false,total};
  }
  function renderStats(){
    const b=getBounds(),res=wallResolution(); const area=b.width*b.height/1e6; const weight=state.panels.reduce((s,p)=>s+p.weightKg,0); const maxW=state.panels.reduce((s,p)=>s+p.maxPowerW,0); const avgW=state.panels.reduce((s,p)=>s+p.avgPowerW,0);
    const stats=[['Cabinets',state.panels.length],['Size',state.panels.length?`${formatDistance(b.width)} × ${formatDistance(b.height)}`:'—'],['Area',`${fmt(area,2)} m²`],['Weight',`${fmt(weight,1)} kg`],['Resolution',res.mixed?'Mixed pitch':`${res.w} × ${res.h}`],['Pixels',fmt(res.total,0)],['Max Power',`${fmt(maxW/1000,2)} kW`],['Avg Power',`${fmt(avgW/1000,2)} kW`]];
    $('wallStats').innerHTML=stats.map(([k,v])=>`<div class="metric"><b>${v}</b><span>${k}</span></div>`).join('');
  }

  function calcData(){
    const total=state.panels.reduce((s,p)=>s+p.pixelW*p.pixelH,0); const per=Math.max(1,num($('pixelsPerPort').value,650000)); const outputs=Math.max(1,num($('processorOutputs').value,4)); const required=ceil(total/per); const routes=state.dataRoutes.length; const worst=Math.max(0,...state.dataRoutes.map(routePixels));
    return {total,per,outputs,required,routes,worst};
  }
  function calcPower(){
    const voltage=num($('supplyVoltage').value,230),amps=num($('circuitAmps').value,16),head=num($('headroom').value,.8); const safe=voltage*amps*head;
    const maxW=state.panels.reduce((s,p)=>s+p.maxPowerW,0),avgW=state.panels.reduce((s,p)=>s+p.avgPowerW,0); const required=ceil(maxW/safe);
    const usedCircuits=new Set(state.powerRoutes.map(r=>r.circuit).filter(Boolean)).size;
    return {voltage,amps,head,safe,maxW,avgW,required,usedCircuits,maxA:maxW/voltage,avgA:avgW/voltage};
  }
  function calcCables(){
    const dataHome=state.dataRoutes.filter(r=>r.panelIds.length).length; const dataLinks=state.dataRoutes.reduce((s,r)=>s+Math.max(0,r.panelIds.length-1),0);
    const pwrHome=state.powerRoutes.filter(r=>r.panelIds.length).length; const pwrLinks=state.powerRoutes.reduce((s,r)=>s+Math.max(0,r.panelIds.length-1),0); const spare=num($('sparePercent').value,10)/100;
    return {dataHome,dataLinks,pwrHome,pwrLinks,dataHomeSpare:ceil(dataHome*(1+spare)),dataLinksSpare:ceil(dataLinks*(1+spare)),pwrHomeSpare:ceil(pwrHome*(1+spare)),pwrLinksSpare:ceil(pwrLinks*(1+spare))};
  }

  function renderSummaries(){
    const d=calcData(),p=calcPower(),c=calcCables();
    $('dataSummary').innerHTML=`<div class="summary-row"><span>Total pixels</span><strong>${fmt(d.total,0)}</strong></div><div class="summary-row"><span>Efficient ports needed</span><strong>${d.required}</strong></div><div class="summary-row"><span>Processor outputs</span><strong>${d.outputs}</strong></div><div class="summary-row"><span>Planned routes</span><strong>${d.routes}</strong></div>`;
    $('powerSummary').innerHTML=`<div class="summary-row"><span>Max load</span><strong>${fmt(p.maxW/1000,2)} kW / ${fmt(p.maxA,1)} A</strong></div><div class="summary-row"><span>Average load</span><strong>${fmt(p.avgW/1000,2)} kW / ${fmt(p.avgA,1)} A</strong></div><div class="summary-row"><span>Efficient circuits needed</span><strong>${p.required} × ${p.amps}A</strong></div><div class="summary-row"><span>Circuits in plan</span><strong>${p.usedCircuits}</strong></div>`;
    $('cableSummary').innerHTML=`<div class="summary-row"><span>CAT home-runs</span><strong>${c.dataHome} (${c.dataHomeSpare} incl. spares)</strong></div><div class="summary-row"><span>CAT linkers</span><strong>${c.dataLinks} (${c.dataLinksSpare} incl. spares)</strong></div><div class="summary-row"><span>Power home-runs</span><strong>${c.pwrHome} (${c.pwrHomeSpare} incl. spares)</strong></div><div class="summary-row"><span>Power linkers</span><strong>${c.pwrLinks} (${c.pwrLinksSpare} incl. spares)</strong></div>`;
    renderRouteLists(); renderCanvasHelper();
  }
  function renderRouteLists(){
    $('dataRoutes').innerHTML=state.dataRoutes.map((r,i)=>routeCard(r,i,'data')).join('')||'<div class="hint">No data plan yet.</div>';
    $('powerRoutes').innerHTML=state.powerRoutes.map((r,i)=>routeCard(r,i,'power')).join('')||'<div class="hint">No power plan yet.</div>';
    document.querySelectorAll('[data-route-delete]').forEach(b=>b.onclick=()=>{pushHistory();const [type,id]=b.dataset.routeDelete.split(':');if(type==='data')state.dataRoutes=state.dataRoutes.filter(r=>r.id!==id);else state.powerRoutes=state.powerRoutes.filter(r=>r.id!==id);markDirty();renderAll();});
  }
  function routeCard(r,i,type){
    const load=type==='data'?`${fmt(routePixels(r),0)} px`:`${fmt(routeWatts(r),0)} W · C${r.circuit||'?'}`;
    return `<div class="route-card"><div class="route-card-top"><strong>${r.label}</strong><button data-route-delete="${type}:${r.id}">×</button></div><span>${r.panelIds.length} panels · ${load}</span></div>`;
  }
  function renderCanvasHelper(){
    const res=wallResolution(),rw=num($('rasterW').value,1920),rh=num($('rasterH').value,1080);
    if(res.mixed){$('canvasHelper').innerHTML='<strong>Mixed pixel pitch</strong><br>Canvas position cannot be calculated reliably.';return;}
    const x=Math.floor((rw-res.w)/2),y=Math.floor((rh-res.h)/2); const fits=res.w<=rw&&res.h<=rh;
    $('canvasHelper').innerHTML=`<div class="summary-row"><span>Wall raster</span><strong>${res.w} × ${res.h}</strong></div><div class="summary-row"><span>Source raster</span><strong>${rw} × ${rh}</strong></div><div class="summary-row"><span>Centered X / Y</span><strong>${x} / ${y}</strong></div><div class="summary-row"><span>Status</span><strong>${fits?'Fits without scaling':'Scaling / larger canvas required'}</strong></div>`;
  }

  function renderValidation(){
    const d=calcData(),p=calcPower(); const items=[]; const allIds=new Set(state.panels.map(x=>x.id));
    if(!state.panels.length)items.push(['warn','Build or add panels to begin.']);
    if(state.panels.length){
      if(d.required>d.outputs)items.push(['bad',`Processor needs at least ${d.required} data outputs; only ${d.outputs} configured.`]);else items.push(['ok',`Data capacity fits in ${d.required} of ${d.outputs} available outputs.`]);
      state.dataRoutes.forEach((r,i)=>{const px=routePixels(r);if(px>d.per)items.push(['bad',`${r.label} is overloaded: ${fmt(px,0)} px > ${fmt(d.per,0)} px/port.`]);});
      const assignedData=new Set(state.dataRoutes.flatMap(r=>r.panelIds)); const missingData=[...allIds].filter(id=>!assignedData.has(id)).length;if(missingData)items.push(['warn',`${missingData} cabinet(s) are not assigned to a data route.`]);
      const assignedPower=new Set(state.powerRoutes.flatMap(r=>r.panelIds)); const missingPower=[...allIds].filter(id=>!assignedPower.has(id)).length;if(missingPower)items.push(['warn',`${missingPower} cabinet(s) are not assigned to a power route.`]);
      state.powerRoutes.forEach(r=>{const w=routeWatts(r);if(w>p.safe)items.push(['bad',`${r.label} exceeds selected circuit planning capacity (${fmt(w,0)} W > ${fmt(p.safe,0)} W).`]);const maxLink=Math.min(...r.panelIds.map(id=>state.panels.find(x=>x.id===id)?.maxPowerLink||999));if(r.panelIds.length>maxLink)items.push(['bad',`${r.label} has ${r.panelIds.length} panels but the chain limit is ${maxLink}.`]);});
      if(p.usedCircuits && p.usedCircuits>p.required)items.push(['warn',`Power plan uses ${p.usedCircuits} circuits; calculated efficient minimum is ${p.required}.`]);
      if(p.usedCircuits && p.usedCircuits<=p.required)items.push(['ok',`Power plan uses ${p.usedCircuits} circuit(s); calculated minimum is ${p.required}.`]);
      const profiles=new Set(state.panels.map(p=>p.profileId));if(profiles.size>1)items.push(['warn','Mixed panel profiles are present. Verify mechanical compatibility, pixel mapping and power/data limits.']);
    }
    $('validationList').innerHTML=items.map(([c,t])=>`<div class="validation-item ${c}">${t}</div>`).join('')||'<div class="validation-item ok">No issues found.</div>';
  }

  function renderPlanControls(){
    document.querySelectorAll('#planTabs button').forEach(b=>b.classList.toggle('active',b.dataset.plan===state.planMode));
    $('activePlanLabel').textContent=state.planMode==='layout'?'Layout':state.planMode==='data'?'Data Plan':'Power Plan';
    const planning=state.planMode!=='layout';$('newRouteBtn').classList.toggle('hidden',!planning);$('finishRouteBtn').classList.toggle('hidden',!planning);$('clearPlanBtn').classList.toggle('hidden',!planning);$('suggestPlanBtn').textContent=state.planMode==='layout'?'Suggest Power + Data':`Suggest ${state.planMode==='data'?'Data':'Power'} Plan`;
  }

  function renderAll(full=true){ renderPlanControls();renderCanvas();renderStats();renderSummaries();renderValidation();updateUndoRedo();if(full)syncControlsFromState(); }
  function syncControlsFromState(){
    $('numberingMode').value=state.numberingMode;$('unitMode').value=state.units;$('showIds').checked=state.showIds;$('showCentre').checked=state.showCentre;$('showGround').checked=state.showGround;$('showDimensions').checked=state.showDimensions;
    document.querySelectorAll('#viewTabs button').forEach(b=>b.classList.toggle('active',b.dataset.view===state.view));
  }

  function populateProfiles(){
    $('panelProfile').innerHTML=allPanelProfiles().map(p=>`<option value="${p.id}">${p.name}</option>`).join('');
    const avLed=(window.AV_DETAILED_CATALOG||[]).find(x=>x.category==='LED Wall')?.items||[];
    const known=allProcessors(); const options=[]; const used=new Set();
    for(const p of known){options.push(`<option value="${p.id}">${p.name}</option>`);used.add(p.name);}
    for(const name of avLed.filter(n=>/processor/i.test(n))){if(!used.has(name))options.push(`<option value="av:${name}">${name}</option>`);}
    $('processorSelect').innerHTML=options.join('');
    const distros=(window.AV_DETAILED_CATALOG||[]).find(x=>x.category==='Power')?.items||[];
    $('distroSelect').innerHTML=distros.map(n=>`<option>${n}</option>`).join('');
    $('processorSelect').value=state.processorId;$('distroSelect').value=state.distroName;
  }
  function applyProcessorSelection(){
    const id=$('processorSelect').value;state.processorId=id;let p=processorProfile(id);if(id.startsWith('av:'))p=baseProcessors[0];
    $('processorOutputs').value=p?.outputs||4;$('pixelsPerPort').value=p?.pixelsPerOutput||650000;markDirty();renderAll();
  }
  function applyDistroSelection(){state.distroName=$('distroSelect').value;const m=state.distroName.match(/(10|16|20|32|63)A/i);if(m)$('circuitAmps').value=['10','16','20','32'].includes(m[1])?m[1]:'32';markDirty();renderAll();}

  function saveProject(){ try{localStorage.setItem(STORAGE_KEY,JSON.stringify(snapshot()));state.dirty=false;$('projectStatus').textContent='Saved';}catch(e){alert(`Could not save: ${e.message}`);} }
  function loadProject(){ try{const s=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');if(!s)return alert('No saved project in this browser.');pushHistory();restore(s);$('projectStatus').textContent='Loaded';}catch(e){alert(`Could not load: ${e.message}`);} }
  function download(name,blob){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
  function exportJson(){download('JC-LED-Wall-Project.json',new Blob([JSON.stringify(snapshot(),null,2)],{type:'application/json'}));}
  function importJson(file){const r=new FileReader();r.onload=()=>{try{pushHistory();restore(JSON.parse(r.result));}catch(e){alert(`Invalid project file: ${e.message}`)}};r.readAsText(file);}
  function exportCsv(){
    const c=calcCables(),p=calcPower(),d=calcData(),rows=[['Item','Count','Notes']];
    const by={};state.panels.forEach(x=>{const n=panelProfile(x.profileId)?.name||x.profileId;by[n]=(by[n]||0)+1;});Object.entries(by).forEach(([n,count])=>rows.push([n,count,'LED cabinet']));
    const sp=num($('sparePanels').value,0);if(sp)rows.push(['Spare LED panels',sp,'User specified']);
    rows.push(['Processor',1,$('processorSelect').selectedOptions[0]?.textContent||''],['Data ports required',d.required,`${fmt(d.total,0)} total pixels`],['CAT home-runs',c.dataHomeSpare,'Includes configured spare %'],['CAT linkers',c.dataLinksSpare,'Includes configured spare %'],['Power circuits required',p.required,`${p.amps}A @ ${p.voltage}V, ${Math.round(p.head*100)}% planning load`],['Power home-runs',c.pwrHomeSpare,'Includes configured spare %'],['Power linkers',c.pwrLinksSpare,'Includes configured spare %'],['Power distro',1,state.distroName]);
    const csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');download('JC-LED-Wall-BOM.csv',new Blob([csv],{type:'text/csv'}));
  }
  function exportPng(){
    if(!state.panels.length)return alert('Build a wall first.'); const b=getBounds();const scale=Math.min(.8,2200/Math.max(1,b.width));const margin=60;const cv=document.createElement('canvas');cv.width=Math.ceil(b.width*scale+margin*2);cv.height=Math.ceil(b.height*scale+margin*2);const ctx=cv.getContext('2d');ctx.fillStyle='#08111f';ctx.fillRect(0,0,cv.width,cv.height);
    state.panels.forEach((p,i)=>{const dx=state.view==='back'?b.width-(p.x-b.minX)-p.widthMm:p.x-b.minX;const x=margin+dx*scale,y=margin+(p.y-b.minY)*scale,w=p.widthMm*scale,h=p.heightMm*scale;ctx.fillStyle='#17304a';ctx.fillRect(x,y,w,h);ctx.strokeStyle=state.selectedIds.includes(p.id)?'#4bb7ff':'#6f8baa';ctx.strokeRect(x,y,w,h);ctx.fillStyle='#fff';ctx.font=`${Math.max(10,Math.min(22,w/5))}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';if(state.showIds)ctx.fillText(panelName(p,i),x+w/2,y+h/2);});
    const routes=state.planMode==='data'?state.dataRoutes:state.planMode==='power'?state.powerRoutes:[];routes.forEach((r,ri)=>{const pts=r.panelIds.map(id=>state.panels.find(p=>p.id===id)).filter(Boolean);if(pts.length<2)return;ctx.beginPath();pts.forEach((p,i)=>{const dx=state.view==='back'?b.width-(p.x-b.minX)-p.widthMm:p.x-b.minX;const x=margin+(dx+p.widthMm/2)*scale,y=margin+(p.y-b.minY+p.heightMm/2)*scale;i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.strokeStyle=state.planMode==='power'?COLORS[((r.circuit||1)-1)%COLORS.length]:COLORS[ri%COLORS.length];ctx.lineWidth=4;ctx.stroke();});
    cv.toBlob(blob=>download('JC-LED-Wall-Plan.png',blob),'image/png');
  }

  function openModal(id){$('modalBackdrop').classList.remove('hidden');$('helpModal').classList.toggle('hidden',id!=='helpModal');$('customEquipmentModal').classList.toggle('hidden',id!=='customEquipmentModal');}
  function closeModal(){$('modalBackdrop').classList.add('hidden');}
  function saveCustomEquipment(){
    const name=$('customEqName').value.trim();if(!name)return alert('Enter a name.'); const type=$('customEqType').value;
    if(type==='panel'){
      const p={id:`custom-panel-${uid()}`,name,widthMm:num($('customWidth').value,500),heightMm:num($('customHeight').value,500),pitchMm:num($('customPitch').value,2.9),weightKg:num($('customWeight').value,8),maxPowerW:num($('customMaxW').value,200),avgPowerW:num($('customAvgW').value,90),maxPowerLink:num($('customMaxLink').value,8)};customProfiles.panels.push(p);saveCustomProfiles();populateProfiles();$('panelProfile').value=p.id;
    } else {
      const p={id:`custom-processor-${uid()}`,name,outputs:num($('customOutputs').value,4),pixelsPerOutput:num($('customPixelsPerOutput').value,650000),maxPixels:num($('customMaxPixels').value,2600000),maxWidth:99999,maxHeight:99999,source:'Custom'};customProfiles.processors.push(p);saveCustomProfiles();populateProfiles();$('processorSelect').value=p.id;applyProcessorSelection();
    }
    closeModal();
  }

  function bind(){
    $('buildWallBtn').onclick=quickBuild;$('clearWallBtn').onclick=()=>{if(!state.panels.length)return;if(!confirm('Clear the wall and all routing plans?'))return;pushHistory();state.panels=[];state.dataRoutes=[];state.powerRoutes=[];state.selectedIds=[];markDirty();renderAll();};
    $('addPanelBtn').onclick=addPanel;$('duplicateBtn').onclick=duplicateSelected;$('deleteBtn').onclick=deleteSelected;$('rotateBtn').onclick=rotateSelected;$('selectRowBtn').onclick=selectRow;$('selectColBtn').onclick=selectCol;$('clearSelectionBtn').onclick=()=>{state.selectedIds=[];renderCanvas()};
    $('numberingMode').onchange=e=>{state.numberingMode=e.target.value;markDirty();renderAll()};$('unitMode').onchange=e=>{state.units=e.target.value;renderAll()};
    for(const id of ['showIds','showCentre','showGround','showDimensions']) $(id).onchange=e=>{state[id]=e.target.checked;renderAll()};
    document.querySelectorAll('#viewTabs button').forEach(b=>b.onclick=()=>{state.view=b.dataset.view;renderAll()});
    document.querySelectorAll('#planTabs button').forEach(b=>b.onclick=()=>{state.planMode=b.dataset.plan;state.currentRouteId=null;renderAll()});
    $('suggestPlanBtn').onclick=suggestActivePlan;$('newRouteBtn').onclick=newRoute;$('finishRouteBtn').onclick=finishRoute;$('clearPlanBtn').onclick=clearPlan;
    $('processorSelect').onchange=applyProcessorSelection;$('distroSelect').onchange=applyDistroSelection;
    for(const id of ['pixelsPerPort','processorOutputs','supplyVoltage','circuitAmps','headroom','sparePercent','sparePanels','rasterW','rasterH']) $(id).oninput=()=>{markDirty();renderAll(false)};
    $('undoBtn').onclick=undo;$('redoBtn').onclick=redo;$('saveBtn').onclick=saveProject;$('loadBtn').onclick=loadProject;
    $('presentationBtn').onclick=()=>{document.body.classList.toggle('presentation');$('presentationBtn').textContent=document.body.classList.contains('presentation')?'Exit Presentation':'Presentation'};
    $('helpBtn').onclick=()=>openModal('helpModal');document.querySelectorAll('.modal-close').forEach(b=>b.onclick=closeModal);$('modalBackdrop').addEventListener('click',e=>{if(e.target===$('modalBackdrop'))closeModal()});
    $('customEquipmentBtn').onclick=()=>openModal('customEquipmentModal');$('customEqType').onchange=e=>{$('customPanelFields').classList.toggle('hidden',e.target.value!=='panel');$('customProcessorFields').classList.toggle('hidden',e.target.value!=='processor')};$('saveCustomEqBtn').onclick=saveCustomEquipment;
    $('exportJsonBtn').onclick=exportJson;$('importJsonBtn').onclick=()=>$('importFile').click();$('importFile').onchange=e=>{const f=e.target.files?.[0];if(f)importJson(f);e.target.value=''};$('exportCsvBtn').onclick=exportCsv;$('exportPngBtn').onclick=exportPng;$('printBtn').onclick=()=>window.print();
    document.addEventListener('keydown',e=>{if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName))return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();}else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();redo();}else if(e.key==='Delete')deleteSelected();else if(e.key.toLowerCase()==='r')rotateSelected();else if(e.key==='Escape'){state.currentRouteId=null;renderAll();}});
    window.addEventListener('beforeunload',e=>{if(state.dirty){e.preventDefault();e.returnValue='';}});
  }

  function init(){
    populateProfiles();
    // Add rotate control without making the HTML noisy.
    if(!$('rotateBtn')){const b=document.createElement('button');b.id='rotateBtn';b.textContent='Rotate';$('duplicateBtn').after(b);}
    bind();
    $('processorSelect').value=state.processorId;$('distroSelect').value=state.distroName;applyProcessorSelection();
    updateUndoRedo();renderAll();
  }

  init();
})();
