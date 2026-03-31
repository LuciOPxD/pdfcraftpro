// ══════════════════════════════════════════════════════
// SETUP
// ══════════════════════════════════════════════════════
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const state = {
  mergeFiles: [],
  splitFile:null, splitPages:0, splitMethod:'all', splitSelected:[],
  compressFile:null, compressLevel:'medium',
  rotateFile:null, rotateAngle:90,
  img2pdfFiles:[],
  imgResizeFile:null, imgResizeBlob:null, imgResizeMeta:null,
  mathOCRFile:null,
  pdf2imgFile:null, pdf2imgCanvases:[],
  pdf2txtFile:null,
  wmFile:null,
  wmPreviewDoc:null, wmCustomPos:{x:0.5,y:0.5},
  wmPreviewPage:null, wmPreviewPageNum:1, wmPreviewTotal:0, wmDragging:false, wmDragFrame:0,
  pnFile:null,
  stampFile:null,
  hfFile:null,
  duplicateFile:null,
  metaeditFile:null,
  protectFile:null,
  unlockFile:null,
  signFile:null, signType:'draw', signDrawing:false, signLastX:0, signLastY:0,
  redactFile:null,
  annFile:null, annType:'textbox',
  inspectFile:null,
  reorderFile:null, reorderPageCount:0,
  delFile:null, delSelected:[],
  extractFile:null, extractSelected:[],
  cropFile:null,
  blankData:null,
  repairFile:null,
  previewDoc:null, previewPage:1, previewTotal:0,
  compareData:[null,null],
  htmlContent:'',
  resultBlobs:{}
};

const TOOL_CONFIG = {
  watermark: { optionsId: 'wm-options' },
  annotate: { optionsId: 'ann-options' }
};

// ══════════════════════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════════════════════
function showPanel(id) {
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.tool-btn').forEach(b=>b.classList.remove('active'));
  const p=document.getElementById('panel-'+id);
  if(p) p.classList.add('active');
  const b=document.getElementById('btn-'+id);
  if(b){
    b.classList.add('active');
    if(window.innerWidth<=768){
      b.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'});
    }
  }
  window.scrollTo(0,0);
}

function filterTools(q) {
  q=q.toLowerCase();
  document.querySelectorAll('.tool-card').forEach(c=>{
    const t=(c.querySelector('.tc-name')?.textContent+' '+c.querySelector('.tc-desc')?.textContent).toLowerCase();
    c.style.display=(!q||t.includes(q))?'':'none';
  });
}

function toggleTheme() {
  document.body.classList.toggle('light');
}

// ══════════════════════════════════════════════════════
// TOAST
// ══════════════════════════════════════════════════════
function toast(msg, icon='ℹ️', duration=3500) {
  const t=document.createElement('div');
  const cls=icon==='✅'||icon==='📋'?'success':icon==='❌'?'error':'';
  t.className='toast '+cls;
  t.innerHTML=`<span>${icon}</span><span>${msg}</span>`;
  document.getElementById('toast-container').appendChild(t);
  setTimeout(()=>{ t.style.opacity='0'; t.style.transform='translateX(20px)'; setTimeout(()=>t.remove(),300); }, duration);
}

// ══════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════
const fmtSize=b=>b<1024?b+' B':b<1048576?(b/1024).toFixed(1)+' KB':(b/1048576).toFixed(1)+' MB';
const readAB=f=>new Promise((res,rej)=>{const r=new FileReader();r.onload=e=>res(e.target.result);r.onerror=rej;r.readAsArrayBuffer(f);});
const readURL=f=>new Promise((res,rej)=>{const r=new FileReader();r.onload=e=>res(e.target.result);r.onerror=rej;r.readAsDataURL(f);});
function dlBlob(blob,name){const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),2000);}
function showResult(id,text){const el=document.getElementById(id+'-result');if(el)el.classList.add('show');const t=document.getElementById(id+'-result-text');if(t&&text)t.textContent=text;}
function setProgress(id,pct,label){const w=document.getElementById(id+'-progress');const f=document.getElementById(id+'-fill');if(w)w.classList.add('show');if(f)f.style.width=pct+'%';if(label){const l=document.getElementById(id+'-plab');if(l)l.textContent=label;}}
function selectOpt(el,scope){document.querySelectorAll(scope).forEach(c=>c.classList.remove('selected'));el.classList.add('selected');}

function parseRangeToIndices(str,total){
  const out=[];
  str.split(',').forEach(part=>{
    part=part.trim();
    if(part.includes('-')){const[a,b]=part.split('-').map(n=>parseInt(n.trim()));for(let i=a;i<=Math.min(b,total);i++)if(i>=1)out.push(i-1);}
    else{const n=parseInt(part);if(n>=1&&n<=total)out.push(n-1);}
  });
  return [...new Set(out)].sort((a,b)=>a-b);
}

function hexToRgb(hex){const r=parseInt(hex.slice(1,3),16)/255,g=parseInt(hex.slice(3,5),16)/255,b=parseInt(hex.slice(5,7),16)/255;return{r,g,b};}
function clamp(val,min,max){return Math.min(Math.max(val,min),max);}
function blobToDataURL(blob){return new Promise((res,rej)=>{const r=new FileReader();r.onload=e=>res(e.target.result);r.onerror=rej;r.readAsDataURL(blob);});}
function escapeHtml(str=''){return String(str).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function wrapTextLines(text,maxChars){
  const words=text.replace(/\r/g,'').split(/\s+/).filter(Boolean);
  if(words.length===0) return [''];
  const lines=[]; let cur='';
  for(const word of words){
    const next=cur?`${cur} ${word}`:word;
    if(next.length<=maxChars||!cur) cur=next;
    else{lines.push(cur);cur=word;}
  }
  if(cur) lines.push(cur);
  return lines;
}

function escapeRegExp(str=''){
  return str.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
}
function getPageAnchor(width,height,pos,textWidth,fontSize=12,margin=20){
  let x=width/2-textWidth/2;
  let y=margin;
  if(pos.includes('top')) y=height-fontSize-margin;
  if(pos.includes('right')) x=width-textWidth-margin;
  else if(pos.includes('left')) x=margin;
  return {x,y};
}
function getStandardFontKey(name='Helvetica'){
  const map={
    Helvetica: PDFLib.StandardFonts.Helvetica,
    'Helvetica-Bold': PDFLib.StandardFonts.HelveticaBold,
    TimesRoman: PDFLib.StandardFonts.TimesRoman,
    CourierBold: PDFLib.StandardFonts.CourierBold
  };
  return map[name] || PDFLib.StandardFonts.Helvetica;
}

function getPreviewRenderScale(baseScale=1, mode='default'){
  const dpr=window.devicePixelRatio || 1;
  const isMobile=window.innerWidth <= 768;
  const caps={
    default: isMobile ? 2 : 2.4,
    text: isMobile ? 2.2 : 3
  };
  const boosts={
    default: 1,
    text: isMobile ? 1.15 : 1.35
  };
  const quality=Math.max(1, Math.min(dpr * (boosts[mode] || boosts.default), caps[mode] || caps.default));
  return baseScale * quality;
}

function getPanelIdForTool(tool){
  const map={
    delpages:'delete-pages',
    extract:'extract-pages',
    pn:'pagenumber'
  };
  return map[tool] || tool;
}

function ensureToolPreviewContainer(tool,label='Preview'){
  const panelId=getPanelIdForTool(tool);
  const panel=document.getElementById(`panel-${panelId}`);
  if(!panel) return {};
  let wrap=document.getElementById(`${tool}-preview-wrap`);
  let box=document.getElementById(`${tool}-preview-box`);
  if(!wrap || !box){
    const dropzone=panel.querySelector('.dropzone');
    if(!dropzone) return {};
    wrap=document.createElement('div');
    wrap.id=`${tool}-preview-wrap`;
    wrap.style.display='none';
    wrap.style.marginTop='1.5rem';
    wrap.innerHTML=`<label class="form-label">${label}</label><div class="pdf-preview-box preview-extended" id="${tool}-preview-box"></div>`;
    dropzone.insertAdjacentElement('afterend',wrap);
    box=document.getElementById(`${tool}-preview-box`);
  }
  return {wrap,box};
}

async function renderPdfPreviewIntoBox(box,file,maxPages=3,scale=0.9,qualityMode='text'){
  if(!box) return;
  box.innerHTML='';
  const ab=await readAB(file);
  const pdf=await pdfjsLib.getDocument({data:ab}).promise;
  const pages=Math.min(pdf.numPages,maxPages);
  for(let i=1;i<=pages;i++){
    const page=await pdf.getPage(i);
    const renderScale=getPreviewRenderScale(scale,qualityMode);
    const viewport=page.getViewport({scale:renderScale});
    const canvas=document.createElement('canvas');
    canvas.width=viewport.width;
    canvas.height=viewport.height;
    canvas.style.width='min(100%, 760px)';
    canvas.style.maxWidth='100%';
    canvas.style.height='auto';
    await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
    box.appendChild(canvas);
  }
}

async function renderToolPdfPreview(tool,file,maxPages=3){
  const {wrap,box}=ensureToolPreviewContainer(tool);
  if(!wrap || !box) return;
  wrap.style.display='block';
  await renderPdfPreviewIntoBox(box,file,Math.min(maxPages,3),0.9,'text');
}

// ══════════════════════════════════════════════════════
// DRAG & DROP INIT
// ══════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded',()=>{
  document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
  document.querySelectorAll('.dropzone').forEach(zone=>{
    zone.addEventListener('dragover',e=>{e.preventDefault();zone.classList.add('drag-over');});
    zone.addEventListener('dragleave',()=>zone.classList.remove('drag-over'));
    zone.addEventListener('drop',e=>{
      e.preventDefault(); zone.classList.remove('drag-over');
      const input=zone.querySelector('input[type=file]');
      if(input&&e.dataTransfer.files.length){
        const dt=new DataTransfer();
        for(const f of e.dataTransfer.files)dt.items.add(f);
        input.files=dt.files;
        input.dispatchEvent(new Event('change'));
      }
    });
  });
  initSignCanvas();
  showPanel('home');
  toast('PDFCraft Pro ready hai! 🎉','🚀',2500);
});

// ══════════════════════════════════════════════════════
// SINGLE FILE HANDLER
// ══════════════════════════════════════════════════════
async function handleSingleFile(input, tool) {
  const file=input.files[0]; if(!file) return;
  state[tool+'File']=file;
  const opts=document.getElementById(TOOL_CONFIG[tool]?.optionsId || tool+'-options');
  if(opts) opts.style.display='block';
  if(tool!=='watermark'){
    await renderToolPdfPreview(tool,file,3);
  }
  // show result banners hide
  const results=document.querySelectorAll('#panel-'+tool+' .result-banner');
  results.forEach(r=>r.classList.remove('show'));

  const needsCount=['split','rotate','watermark','pn','stamp','hf','duplicate','protect','unlock','sign','redact','annotate','reorder','pdf2img','delpages','extract','crop'];
  if(needsCount.includes(tool)){
    try{
      const ab=await readAB(file);
      const pdf=await PDFLib.PDFDocument.load(ab,{ignoreEncryption:true});
      const count=pdf.getPageCount();
      if(tool==='split'){state.splitPages=count;renderSplitPageGrid(count);document.getElementById('split-range-val').placeholder='1-'+Math.ceil(count/2)+','+( Math.ceil(count/2)+1)+'-'+count;}
      if(tool==='reorder'){state.reorderPageCount=count;renderReorderGrid(count);document.getElementById('reorder-val').placeholder=Array.from({length:count},(_,i)=>i+1).join(',');document.getElementById('reorder-total').textContent=count;}
      if(tool==='delpages'){state.delSelected=[];renderPageGrid('delpages-page-grid',count,toggleDelPage);}
      if(tool==='extract'){state.extractSelected=[];renderPageGrid('extract-page-grid',count,toggleExtractPage);}
      if(tool==='pdf2img')state.pdf2imgTotal=count;
      if(tool==='watermark'){
        await initWatermarkPreview(file);
      }
      if(tool==='duplicate'){
        const pageField=document.getElementById('duplicate-page');
        if(pageField){
          pageField.max=count;
          pageField.value=Math.min(parseInt(pageField.value)||1,count);
        }
        const insertField=document.getElementById('duplicate-after');
        if(insertField){
          insertField.max=count;
          insertField.value=Math.min(parseInt(insertField.value)||count,count);
        }
      }
      if(tool==='stamp'||tool==='hf'){
        const pageField=document.getElementById(tool==='stamp'?'stamp-page':'hf-start-page');
        if(pageField){
          pageField.max=count;
          pageField.value=Math.min(parseInt(pageField.value)||1,count);
        }
      }
      if(tool==='annotate'||tool==='sign'){
        const pageField=document.getElementById(tool==='annotate'?'ann-page':'sign-page');
        if(pageField){
          pageField.max=count;
          pageField.value=Math.min(parseInt(pageField.value)||1,count);
        }
      }
      toast(`Loaded: ${count} pages`,`📄`);
    }catch(e){toast('PDF load error: '+e.message,'❌');}
  }
  if(tool==='compress'){
    document.getElementById('compress-stats').innerHTML=`
      <div class="stat-card"><div class="st-val">${fmtSize(file.size)}</div><div class="st-label">Original Size</div></div>
      <div class="stat-card"><div class="st-val">—</div><div class="st-label">After Compression</div></div>
      <div class="stat-card"><div class="st-val">—</div><div class="st-label">Space Saved</div></div>`;
  }
  if(tool==='metaedit'){
    await loadMetadataEditor(file);
  }
}

// ══════════════════════════════════════════════════════
// PAGE GRID HELPERS
// ══════════════════════════════════════════════════════
function renderPageGrid(gridId, count, clickFn){
  const g=document.getElementById(gridId); if(!g) return;
  g.innerHTML='';
  for(let i=1;i<=count;i++){
    const d=document.createElement('div');
    d.className='page-thumb';
    d.id=gridId+'-p'+i;
    d.innerHTML=`<span>📄</span><span class="pg-num">${i}</span>`;
    d.onclick=()=>clickFn(i,d);
    g.appendChild(d);
  }
}
function toggleDelPage(n,el){
  el.classList.toggle('selected');
  const idx=state.delSelected.indexOf(n);
  if(idx>=0)state.delSelected.splice(idx,1); else state.delSelected.push(n);
}
function toggleExtractPage(n,el){
  el.classList.toggle('selected');
  const idx=state.extractSelected.indexOf(n);
  if(idx>=0)state.extractSelected.splice(idx,1); else state.extractSelected.push(n);
}

// ══════════════════════════════════════════════════════
// MERGE
// ══════════════════════════════════════════════════════
function handleMergeFiles(files){
  for(const f of files)if(f.type==='application/pdf'||f.name.endsWith('.pdf'))state.mergeFiles.push(f);
  renderMergeList();
  if(state.mergeFiles[0]) renderToolPdfPreview('merge',state.mergeFiles[0],3);
}
function renderMergeList(){
  const list=document.getElementById('merge-list'); list.innerHTML='';
  state.mergeFiles.forEach((f,i)=>{
    list.innerHTML+=`<div class="file-item">
      <div class="file-icon">📄</div>
      <div class="file-info"><div class="file-name">${f.name}</div><div class="file-size">${fmtSize(f.size)}</div></div>
      <div class="file-actions">
        <button class="btn btn-secondary btn-sm" onclick="moveMerge(${i},-1)" ${i===0?'disabled':''}>▲</button>
        <button class="btn btn-secondary btn-sm" onclick="moveMerge(${i},1)" ${i===state.mergeFiles.length-1?'disabled':''}>▼</button>
        <button class="btn btn-danger btn-sm" onclick="state.mergeFiles.splice(${i},1);renderMergeList()">✕</button>
      </div></div>`;
  });
}
function moveMerge(i,dir){
  const j=i+dir; if(j<0||j>=state.mergeFiles.length) return;
  [state.mergeFiles[i],state.mergeFiles[j]]=[state.mergeFiles[j],state.mergeFiles[i]];
  renderMergeList();
}
async function mergePDFs(){
  if(state.mergeFiles.length<2){toast('Kam se kam 2 PDF files chahiye!','⚠️');return;}
  setProgress('merge',10,'Loading files...');
  try{
    const merged=await PDFLib.PDFDocument.create();
    for(let i=0;i<state.mergeFiles.length;i++){
      const ab=await readAB(state.mergeFiles[i]);
      const pdf=await PDFLib.PDFDocument.load(ab,{ignoreEncryption:true});
      const pages=await merged.copyPages(pdf,pdf.getPageIndices());
      pages.forEach(p=>merged.addPage(p));
      setProgress('merge',10+80*(i+1)/state.mergeFiles.length,`Merging ${i+1}/${state.mergeFiles.length}...`);
    }
    setProgress('merge',95,'Saving...');
    const bytes=await merged.save();
    const blob=new Blob([bytes],{type:'application/pdf'});
    state.resultBlobs.merge=blob;
    document.getElementById('merge-download').onclick=()=>dlBlob(blob,'merged.pdf');
    showResult('merge',`${state.mergeFiles.length} files merged • ${fmtSize(blob.size)}`);
    setProgress('merge',100);
    toast('Merge complete!','✅');
  }catch(e){toast('Error: '+e.message,'❌');}
}

// ══════════════════════════════════════════════════════
// SPLIT
// ══════════════════════════════════════════════════════
function selectSplitMethod(m){
  state.splitMethod=m;
  document.querySelectorAll('#panel-split .option-card').forEach(c=>c.classList.remove('selected'));
  document.getElementById('split-'+m).classList.add('selected');
  document.getElementById('split-range-input').style.display=m==='range'?'block':'none';
  document.getElementById('split-page-select').style.display=m==='select'?'block':'none';
}
function renderSplitPageGrid(count){
  renderPageGrid('split-page-grid',count,(n,el)=>{
    el.classList.toggle('selected');
    const idx=state.splitSelected.indexOf(n);
    if(idx>=0)state.splitSelected.splice(idx,1); else state.splitSelected.push(n);
  });
}
async function splitPDF(){
  if(!state.splitFile){toast('Pehle PDF upload karo!','⚠️');return;}
  try{
    const ab=await readAB(state.splitFile);
    const pdf=await PDFLib.PDFDocument.load(ab,{ignoreEncryption:true});
    const total=pdf.getPageCount();
    const zip=new JSZip(); let pages=[];
    if(state.splitMethod==='all'){pages=Array.from({length:total},(_,i)=>[i]);}
    else if(state.splitMethod==='range'){
      const rangeStr=document.getElementById('split-range-val').value;
      const ranges=rangeStr.split(',').map(r=>r.trim());
      for(const r of ranges){
        if(r.includes('-')){const[a,b]=r.split('-').map(n=>parseInt(n.trim())-1);const pg=[];for(let i=a;i<=Math.min(b,total-1);i++)pg.push(i);if(pg.length)pages.push(pg);}
        else{const n=parseInt(r)-1;if(n>=0&&n<total)pages.push([n]);}
      }
    }else{pages=state.splitSelected.sort((a,b)=>a-b).map(n=>[n-1]);}
    for(let i=0;i<pages.length;i++){
      const nd=await PDFLib.PDFDocument.create();
      const cp=await nd.copyPages(pdf,pages[i]);
      cp.forEach(p=>nd.addPage(p));
      const b=await nd.save();
      zip.file(`page_${pages[i].map(p=>p+1).join('-')}.pdf`,b);
    }
    const zblob=await zip.generateAsync({type:'blob'});
    document.getElementById('split-download').onclick=()=>dlBlob(zblob,'split_pages.zip');
    document.getElementById('split-result-text').textContent=`${pages.length} PDF files created`;
    showResult('split');
    toast('Split complete!','✅');
  }catch(e){toast('Error: '+e.message,'❌');}
}

// ══════════════════════════════════════════════════════
// REORDER
// ══════════════════════════════════════════════════════
function renderReorderGrid(count){
  const g=document.getElementById('reorder-page-grid'); g.innerHTML='';
  for(let i=1;i<=count;i++){
    g.innerHTML+=`<div class="page-thumb"><span>📄</span><span class="pg-num">${i}</span></div>`;
  }
}
function reversePages(){
  if(!state.reorderFile){toast('Pehle PDF upload karo!','⚠️');return;}
  const n=state.reorderPageCount;
  document.getElementById('reorder-val').value=Array.from({length:n},(_,i)=>n-i).join(',');
}
async function reorderPages(){
  if(!state.reorderFile){toast('Pehle PDF upload karo!','⚠️');return;}
  const val=document.getElementById('reorder-val').value.trim();
  if(!val){toast('New order enter karo!','⚠️');return;}
  const order=val.split(',').map(n=>parseInt(n.trim())-1).filter(n=>!isNaN(n)&&n>=0);
  if(order.length===0){toast('Valid page numbers enter karo!','⚠️');return;}
  try{
    const ab=await readAB(state.reorderFile);
    const pdf=await PDFLib.PDFDocument.load(ab,{ignoreEncryption:true});
    const nd=await PDFLib.PDFDocument.create();
    const cp=await nd.copyPages(pdf,order);
    cp.forEach(p=>nd.addPage(p));
    const bytes=await nd.save();
    const blob=new Blob([bytes],{type:'application/pdf'});
    document.getElementById('reorder-download').onclick=()=>dlBlob(blob,'reordered.pdf');
    showResult('reorder');
    toast('Pages reordered!','✅');
  }catch(e){toast('Error: '+e.message,'❌');}
}

// ══════════════════════════════════════════════════════
// DELETE PAGES
// ══════════════════════════════════════════════════════
async function deletePages(){
  if(!state.delFile){toast('Pehle PDF upload karo!','⚠️');return;}
  if(state.delSelected.length===0){toast('Koi page select nahi kiya!','⚠️');return;}
  try{
    const ab=await readAB(state.delFile);
    const pdf=await PDFLib.PDFDocument.load(ab,{ignoreEncryption:true});
    const total=pdf.getPageCount();
    const keep=Array.from({length:total},(_,i)=>i).filter(i=>!state.delSelected.includes(i+1));
    if(keep.length===0){toast('Sare pages delete nahi kar sakte!','⚠️');return;}
    const nd=await PDFLib.PDFDocument.create();
    const cp=await nd.copyPages(pdf,keep);
    cp.forEach(p=>nd.addPage(p));
    const bytes=await nd.save();
    const blob=new Blob([bytes],{type:'application/pdf'});
    document.getElementById('delpages-download').onclick=()=>dlBlob(blob,'modified.pdf');
    showResult('delpages',`${state.delSelected.length} pages deleted, ${keep.length} pages remaining`);
    toast('Pages deleted!','✅');
  }catch(e){toast('Error: '+e.message,'❌');}
}

// ══════════════════════════════════════════════════════
// EXTRACT PAGES
// ══════════════════════════════════════════════════════
async function extractPages(){
  if(!state.extractFile){toast('Pehle PDF upload karo!','⚠️');return;}
  const rangeInput=document.getElementById('extract-range').value.trim();
  let indices=[];
  if(rangeInput){
    const ab=await readAB(state.extractFile);
    const pdf=await PDFLib.PDFDocument.load(ab,{ignoreEncryption:true});
    indices=parseRangeToIndices(rangeInput,pdf.getPageCount());
  } else {
    indices=state.extractSelected.map(n=>n-1);
  }
  if(indices.length===0){toast('Koi page select ya range enter nahi!','⚠️');return;}
  try{
    const ab=await readAB(state.extractFile);
    const pdf=await PDFLib.PDFDocument.load(ab,{ignoreEncryption:true});
    const nd=await PDFLib.PDFDocument.create();
    const cp=await nd.copyPages(pdf,indices);
    cp.forEach(p=>nd.addPage(p));
    const bytes=await nd.save();
    const blob=new Blob([bytes],{type:'application/pdf'});
    document.getElementById('extract-download').onclick=()=>dlBlob(blob,'extracted.pdf');
    showResult('extract',`${indices.length} pages extracted`);
    toast('Pages extracted!','✅');
  }catch(e){toast('Error: '+e.message,'❌');}
}

// ══════════════════════════════════════════════════════
// COMPRESS
// ══════════════════════════════════════════════════════
async function compressPDF(){
  if(!state.compressFile){toast('Pehle PDF upload karo!','⚠️');return;}
  setProgress('compress',20);
  try{
    const ab=await readAB(state.compressFile);
    setProgress('compress',50);
    const pdf=await PDFLib.PDFDocument.load(ab,{ignoreEncryption:true});
    const removeMeta=document.getElementById('compress-meta').checked;
    if(removeMeta){pdf.setTitle('');pdf.setAuthor('');pdf.setSubject('');pdf.setKeywords([]);pdf.setProducer('PDFCraft');pdf.setCreator('PDFCraft');}
    setProgress('compress',80);
    const comp=await pdf.save({useObjectStreams:true,addDefaultPage:false,objectsPerTick:50});
    const blob=new Blob([comp],{type:'application/pdf'});
    const orig=state.compressFile.size, nw=blob.size;
    const savings=Math.round((1-nw/orig)*100);
    document.getElementById('compress-stats').innerHTML=`
      <div class="stat-card"><div class="st-val">${fmtSize(orig)}</div><div class="st-label">Original Size</div></div>
      <div class="stat-card"><div class="st-val">${fmtSize(nw)}</div><div class="st-label">Compressed Size</div></div>
      <div class="stat-card"><div class="st-val" style="color:var(--accent3)">${savings>0?savings+'% saved':'Similar size'}</div><div class="st-label">Space Saved</div></div>`;
    document.getElementById('compress-download').onclick=()=>dlBlob(blob,'compressed.pdf');
    showResult('compress',`${fmtSize(orig)} → ${fmtSize(nw)} (${savings}% smaller)`);
    setProgress('compress',100);
    toast('Compression complete!','✅');
  }catch(e){toast('Error: '+e.message,'❌');}
}

// ══════════════════════════════════════════════════════
// ROTATE
// ══════════════════════════════════════════════════════
document.addEventListener('change',e=>{if(e.target.id==='rotate-pages'){document.getElementById('rotate-custom').style.display=e.target.value==='custom'?'block':'none';}});
async function rotatePDF(){
  if(!state.rotateFile){toast('Pehle PDF upload karo!','⚠️');return;}
  try{
    const ab=await readAB(state.rotateFile);
    const pdf=await PDFLib.PDFDocument.load(ab,{ignoreEncryption:true});
    const total=pdf.getPageCount();
    const pages=pdf.getPages();
    const applyTo=document.getElementById('rotate-pages').value;
    const angle=state.rotateAngle;
    let indices=[];
    if(applyTo==='all') indices=Array.from({length:total},(_,i)=>i);
    else if(applyTo==='odd') indices=Array.from({length:total},(_,i)=>i).filter(i=>i%2===0);
    else if(applyTo==='even') indices=Array.from({length:total},(_,i)=>i).filter(i=>i%2===1);
    else if(applyTo==='first') indices=[0];
    else if(applyTo==='last') indices=[total-1];
    else { const rangeStr=document.getElementById('rotate-custom').value; indices=parseRangeToIndices(rangeStr,total); }
    indices.forEach(i=>{
      const cur=pages[i].getRotation().angle;
      pages[i].setRotation(PDFLib.degrees((cur+angle)%360));
    });
    const bytes=await pdf.save();
    const blob=new Blob([bytes],{type:'application/pdf'});
    document.getElementById('rotate-download').onclick=()=>dlBlob(blob,'rotated.pdf');
    showResult('rotate');
    toast(`${indices.length} pages rotated ${angle}°!`,'✅');
  }catch(e){toast('Error: '+e.message,'❌');}
}

// ══════════════════════════════════════════════════════
// WATERMARK
// ══════════════════════════════════════════════════════
async function initWatermarkPreview(file){
  try{
    const ab=await readAB(file);
    state.wmPreviewDoc=await pdfjsLib.getDocument({data:ab}).promise;
    state.wmPreviewTotal=state.wmPreviewDoc.numPages;
    state.wmPreviewPageNum=1;
    state.wmPreviewPage=await state.wmPreviewDoc.getPage(1);
    document.getElementById('wm-preview-total').textContent=state.wmPreviewTotal;
    document.getElementById('wm-preview-cur').textContent=state.wmPreviewPageNum;
    document.getElementById('wm-preview-wrap').style.display='block';
    bindWatermarkPreviewControls();
    await renderWatermarkPreviewBase();
    renderWatermarkOverlay();
  }catch(e){
    toast('Preview load error: '+e.message,'âŒ');
  }
}

let wmPreviewBound=false;
function bindWatermarkPreviewControls(){
  if(wmPreviewBound) return;
  wmPreviewBound=true;
  ['wm-text','wm-size','wm-opacity','wm-rot','wm-color','wm-position'].forEach(id=>{
    const el=document.getElementById(id);
    if(!el) return;
    el.addEventListener('input',()=>renderWatermarkOverlay());
    el.addEventListener('change',()=>renderWatermarkOverlay());
  });
  const stage=document.getElementById('wm-stage');
  const updatePos=e=>{
    const canvas=document.getElementById('wm-preview-canvas');
    if(!canvas.width || !canvas.height) return;
    const rect=canvas.getBoundingClientRect();
    const x=(e.clientX-rect.left)/rect.width;
    const y=(e.clientY-rect.top)/rect.height;
    state.wmCustomPos={x:clamp(x,0,1),y:clamp(y,0,1)};
    const posField=document.getElementById('wm-position');
    if(posField) posField.value='custom';
    if(state.wmDragFrame) cancelAnimationFrame(state.wmDragFrame);
    state.wmDragFrame=requestAnimationFrame(()=>{
      renderWatermarkOverlay();
      state.wmDragFrame=0;
    });
  };
  stage.addEventListener('mousedown',e=>{
    state.wmDragging=true;
    updatePos(e);
  });
  window.addEventListener('mousemove',e=>{
    if(!state.wmDragging) return;
    updatePos(e);
  });
  window.addEventListener('mouseup',()=>{
    state.wmDragging=false;
  });
  stage.addEventListener('click',updatePos);
}

function getWatermarkPreviewPlacement(position, width, height, textWidth){
  if(position==='top') return {x:width/2,y:70};
  if(position==='bottom') return {x:width/2,y:height-55};
  if(position==='topleft') return {x:Math.max(40,textWidth/2+20),y:60};
  if(position==='topright') return {x:width-Math.max(40,textWidth/2+20),y:60};
  if(position==='custom') return {x:width*state.wmCustomPos.x,y:height*state.wmCustomPos.y};
  return {x:width/2,y:height/2};
}

async function setWatermarkPreviewPage(pageNum){
  if(!state.wmPreviewDoc) return;
  state.wmPreviewPageNum=clamp(pageNum,1,state.wmPreviewTotal);
  state.wmPreviewPage=await state.wmPreviewDoc.getPage(state.wmPreviewPageNum);
  document.getElementById('wm-preview-cur').textContent=state.wmPreviewPageNum;
  await renderWatermarkPreviewBase();
  renderWatermarkOverlay();
}

function prevWatermarkPreviewPage(){
  if(state.wmPreviewPageNum>1) setWatermarkPreviewPage(state.wmPreviewPageNum-1);
}

function nextWatermarkPreviewPage(){
  if(state.wmPreviewPageNum<state.wmPreviewTotal) setWatermarkPreviewPage(state.wmPreviewPageNum+1);
}

async function renderWatermarkPreviewBase(){
  if(!state.wmPreviewPage) return;
  const viewport=state.wmPreviewPage.getViewport({scale:getPreviewRenderScale(1.15,'text')});
  const canvas=document.getElementById('wm-preview-canvas');
  canvas.width=viewport.width;
  canvas.height=viewport.height;
  await state.wmPreviewPage.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
}

function renderWatermarkOverlay(){
  const canvas=document.getElementById('wm-preview-canvas');
  const overlay=document.getElementById('wm-overlay-text');
  if(!canvas.width || !canvas.height) return;
  const text=document.getElementById('wm-text').value||'WATERMARK';
  const size=parseInt(document.getElementById('wm-size').value)||60;
  const opacity=(parseInt(document.getElementById('wm-opacity').value)||30)/100;
  const rot=parseInt(document.getElementById('wm-rot').value)||45;
  const color=document.getElementById('wm-color').value;
  const position=document.getElementById('wm-position').value;
  const previewSize=Math.max(18,size*0.42);
  overlay.textContent=text;
  overlay.style.fontSize=`${previewSize}px`;
  overlay.style.color=color;
  overlay.style.opacity=String(opacity);
  const estimatedWidth=Math.max(text.length*previewSize*0.58,60);
  const point=getWatermarkPreviewPlacement(position, canvas.width, canvas.height, estimatedWidth);
  overlay.style.left=`${point.x}px`;
  overlay.style.top=`${point.y}px`;
  overlay.style.transform=`translate(-50%,-50%) rotate(${rot}deg)`;
  const note=document.getElementById('wm-preview-note');
  if(note){
    note.textContent=position==='custom'
      ? `Custom placement set: ${Math.round(state.wmCustomPos.x*100)}% x, ${Math.round(state.wmCustomPos.y*100)}% y`
      : 'Preview first page dikhata hai. Click location se watermark ka placement set hoga.';
  }
}

async function watermarkPDF(){
  if(!state.watermarkFile){toast('Pehle PDF upload karo!','⚠️');return;}
  try{
    const ab=await readAB(state.watermarkFile);
    const pdf=await PDFLib.PDFDocument.load(ab,{ignoreEncryption:true});
    const font=await pdf.embedFont(PDFLib.StandardFonts.HelveticaBold);
    const wmText=document.getElementById('wm-text').value||'WATERMARK';
    const size=parseInt(document.getElementById('wm-size').value)||60;
    const opacity=parseInt(document.getElementById('wm-opacity').value)/100;
    const rotDeg=parseInt(document.getElementById('wm-rot').value)||45;
    const colorHex=document.getElementById('wm-color').value;
    const {r,g,b}=hexToRgb(colorHex);
    const position=document.getElementById('wm-position').value;
    const applyTo=document.getElementById('wm-pages').value;
    const pages=pdf.getPages();
    const total=pages.length;
    let indices=Array.from({length:total},(_,i)=>i);
    if(applyTo==='first') indices=[0];
    else if(applyTo==='odd') indices=indices.filter(i=>i%2===0);
    else if(applyTo==='even') indices=indices.filter(i=>i%2===1);
    for(const i of indices){
      const pg=pages[i];
      const {width,height}=pg.getSize();
      const tw=font.widthOfTextAtSize(wmText,size);
      let x=width/2-tw/2, y=height/2;
      if(position==='top'){x=width/2-tw/2;y=height-80;}
      else if(position==='bottom'){x=width/2-tw/2;y=60;}
      else if(position==='topleft'){x=30;y=height-60;}
      else if(position==='topright'){x=width-tw-30;y=height-60;}
      else if(position==='custom'){x=width*state.wmCustomPos.x-tw/2;y=height*(1-state.wmCustomPos.y);}
      pg.drawText(wmText,{x,y,size,font,color:PDFLib.rgb(r,g,b),opacity,rotate:PDFLib.degrees(rotDeg)});
    }
    const bytes=await pdf.save();
    const blob=new Blob([bytes],{type:'application/pdf'});
    document.getElementById('watermark-download').onclick=()=>dlBlob(blob,'watermarked.pdf');
    showResult('watermark');
    toast('Watermark added!','✅');
  }catch(e){toast('Error: '+e.message,'❌');}
}

// ══════════════════════════════════════════════════════
// PAGE NUMBERS
// ══════════════════════════════════════════════════════
async function addPageNumbers(){
  if(!state.pnFile){toast('Pehle PDF upload karo!','⚠️');return;}
  try{
    const ab=await readAB(state.pnFile);
    const pdf=await PDFLib.PDFDocument.load(ab,{ignoreEncryption:true});
    const font=await pdf.embedFont(PDFLib.StandardFonts.Helvetica);
    const pages=pdf.getPages(); const total=pages.length;
    const pos=document.getElementById('pn-pos').value;
    const start=parseInt(document.getElementById('pn-start').value)||1;
    const fontSize=parseInt(document.getElementById('pn-size').value)||12;
    const fmt=document.getElementById('pn-format').value;
    const colorHex=document.getElementById('pn-color').value;
    const {r,g,b}=hexToRgb(colorHex);
    const skipFirst=document.getElementById('pn-skip-first').checked;
    pages.forEach((page,idx)=>{
      if(skipFirst&&idx===0) return;
      const {width,height}=page.getSize();
      const num=start+idx-(skipFirst?1:0);
      let text=String(num);
      if(fmt==='page-of') text=`Page ${num} of ${total}`;
      else if(fmt==='dash') text=`- ${num} -`;
      const tw=font.widthOfTextAtSize(text,fontSize);
      let x=width/2-tw/2, y=20;
      if(pos.includes('top')) y=height-28;
      if(pos.includes('right')) x=width-tw-20;
      if(pos.includes('left')) x=20;
      page.drawText(text,{x,y,size:fontSize,font,color:PDFLib.rgb(r,g,b)});
    });
    const bytes=await pdf.save();
    const blob=new Blob([bytes],{type:'application/pdf'});
    document.getElementById('pn-download').onclick=()=>dlBlob(blob,'numbered.pdf');
    showResult('pn',`Page numbers added (${fmt} format)`);
    toast('Page numbers added!','✅');
  }catch(e){toast('Error: '+e.message,'❌');}
}

function syncStampPreset(){
  const preset=document.getElementById('stamp-preset')?.value;
  const text=document.getElementById('stamp-text');
  if(!text || !preset || preset==='custom') return;
  text.value=preset;
}

async function stampPDF(){
  if(!state.stampFile){toast('Pehle PDF upload karo!','??');return;}
  try{
    const ab=await readAB(state.stampFile);
    const pdf=await PDFLib.PDFDocument.load(ab,{ignoreEncryption:true});
    const pages=pdf.getPages();
    const font=await pdf.embedFont(PDFLib.StandardFonts.HelveticaBold);
    const stampText=(document.getElementById('stamp-text').value||'APPROVED').trim();
    const pos=document.getElementById('stamp-pos').value;
    const apply=document.getElementById('stamp-apply').value;
    const pageNo=Math.max(1,parseInt(document.getElementById('stamp-page').value)||1);
    const color=document.getElementById('stamp-color').value;
    const {r,g,b}=hexToRgb(color);
    let indices=pages.map((_,i)=>i);
    if(apply==='first') indices=[0];
    else if(apply==='page') indices=[clamp(pageNo-1,0,pages.length-1)];
    indices.forEach(idx=>{
      const page=pages[idx];
      const {width,height}=page.getSize();
      const size=Math.max(28,Math.min(width,height)*0.085);
      const textWidth=font.widthOfTextAtSize(stampText,size);
      let x=width/2-textWidth/2, y=height/2;
      if(pos!=='center') ({x,y}=getPageAnchor(width,height,pos,textWidth,size,28));
      page.drawText(stampText,{x,y,size,font,color:PDFLib.rgb(r,g,b),opacity:0.78,rotate:PDFLib.degrees(pos==='center'?-22:-12)});
      page.drawRectangle({x:Math.max(12,x-14),y:Math.max(12,y-10),width:Math.min(width-24,textWidth+28),height:size+18,borderColor:PDFLib.rgb(r,g,b),borderWidth:2.4,opacity:0.7,rotate:PDFLib.degrees(pos==='center'?-22:-12)});
    });
    const blob=new Blob([await pdf.save()],{type:'application/pdf'});
    document.getElementById('stamp-download').onclick=()=>dlBlob(blob,'stamped.pdf');
    showResult('stamp',`${indices.length} page(s) stamped`);
    toast('Stamp added!','✅');
  }catch(e){toast('Error: '+e.message,'❌');}
}

async function addHeaderFooter(){
  if(!state.hfFile){toast('Pehle PDF upload karo!','??');return;}
  try{
    const ab=await readAB(state.hfFile);
    const pdf=await PDFLib.PDFDocument.load(ab,{ignoreEncryption:true});
    const pages=pdf.getPages();
    const font=await pdf.embedFont(PDFLib.StandardFonts.Helvetica);
    const header=(document.getElementById('hf-header').value||'').trim();
    const footer=(document.getElementById('hf-footer').value||'').trim();
    const fontSize=Math.max(8,parseInt(document.getElementById('hf-size').value)||11);
    const align=document.getElementById('hf-align').value;
    const startPage=Math.max(1,parseInt(document.getElementById('hf-start-page').value)||1);
    const {r,g,b}=hexToRgb(document.getElementById('hf-color').value);
    pages.forEach((page,idx)=>{
      if(idx+1<startPage) return;
      const {width,height}=page.getSize();
      if(header){
        const textWidth=font.widthOfTextAtSize(header,fontSize);
        const point=getPageAnchor(width,height,`top-${align}`,textWidth,fontSize,22);
        page.drawText(header,{x:point.x,y:point.y,size:fontSize,font,color:PDFLib.rgb(r,g,b)});
      }
      if(footer){
        const textWidth=font.widthOfTextAtSize(footer,fontSize);
        const point=getPageAnchor(width,height,`bottom-${align}`,textWidth,fontSize,18);
        page.drawText(footer,{x:point.x,y:point.y,size:fontSize,font,color:PDFLib.rgb(r,g,b)});
      }
    });
    const blob=new Blob([await pdf.save()],{type:'application/pdf'});
    document.getElementById('hf-download').onclick=()=>dlBlob(blob,'header-footer.pdf');
    showResult('hf','Header / footer add ho gaya');
    toast('Header / footer added!','✅');
  }catch(e){toast('Error: '+e.message,'❌');}
}

async function duplicatePagesPDF(){
  if(!state.duplicateFile){toast('Pehle PDF upload karo!','??');return;}
  try{
    const ab=await readAB(state.duplicateFile);
    const pdf=await PDFLib.PDFDocument.load(ab,{ignoreEncryption:true});
    const sourcePage=Math.max(1,parseInt(document.getElementById('duplicate-page').value)||1)-1;
    const copies=Math.max(1,parseInt(document.getElementById('duplicate-count').value)||1);
    const insertAfter=Math.max(1,parseInt(document.getElementById('duplicate-after').value)||1)-1;
    const immediate=document.getElementById('duplicate-all-after').checked;
    const order=Array.from({length:pdf.getPageCount()},(_,i)=>i);
    const duplicateIndexes=Array(copies).fill(sourcePage);
    const insertAt=immediate ? sourcePage+1 : clamp(insertAfter+1,0,order.length);
    order.splice(insertAt,0,...duplicateIndexes);
    const out=await PDFLib.PDFDocument.create();
    const copied=await out.copyPages(pdf,order);
    copied.forEach(p=>out.addPage(p));
    const blob=new Blob([await out.save()],{type:'application/pdf'});
    document.getElementById('duplicate-download').onclick=()=>dlBlob(blob,'duplicated-pages.pdf');
    showResult('duplicate',`${copies} extra copies insert ho gayi`);
    toast('Pages duplicated!','✅');
  }catch(e){toast('Error: '+e.message,'❌');}
}

async function loadMetadataEditor(file){
  if(!file) return;
  try{
    const ab=await readAB(file);
    const pdf=await PDFLib.PDFDocument.load(ab,{ignoreEncryption:true});
    document.getElementById('metaedit-options').style.display='block';
    document.getElementById('meta-title').value=pdf.getTitle()||'';
    document.getElementById('meta-author').value=pdf.getAuthor()||'';
    document.getElementById('meta-subject').value=pdf.getSubject()||'';
    document.getElementById('meta-keywords').value=(pdf.getKeywords()||[]).join(', ');
    document.getElementById('meta-producer').value=pdf.getProducer()||'PDFCraft Pro';
    document.getElementById('meta-creator').value=pdf.getCreator()||'PDFCraft Pro';
  }catch(e){toast('Metadata read error: '+e.message,'❌');}
}

function clearMetadataFields(){
  ['meta-title','meta-author','meta-subject','meta-keywords','meta-producer','meta-creator'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.value='';
  });
}

async function saveMetadataEditor(){
  if(!state.metaeditFile){toast('Pehle PDF upload karo!','??');return;}
  try{
    const ab=await readAB(state.metaeditFile);
    const pdf=await PDFLib.PDFDocument.load(ab,{ignoreEncryption:true});
    pdf.setTitle(document.getElementById('meta-title').value||'');
    pdf.setAuthor(document.getElementById('meta-author').value||'');
    pdf.setSubject(document.getElementById('meta-subject').value||'');
    pdf.setKeywords((document.getElementById('meta-keywords').value||'').split(',').map(s=>s.trim()).filter(Boolean));
    pdf.setProducer(document.getElementById('meta-producer').value||'PDFCraft Pro');
    pdf.setCreator(document.getElementById('meta-creator').value||'PDFCraft Pro');
    const blob=new Blob([await pdf.save()],{type:'application/pdf'});
    document.getElementById('metaedit-download').onclick=()=>dlBlob(blob,'metadata-updated.pdf');
    showResult('metaedit','Metadata updated successfully');
    toast('Metadata saved!','✅');
  }catch(e){toast('Error: '+e.message,'❌');}
}
// ══════════════════════════════════════════════════════
// CROP
// ══════════════════════════════════════════════════════
async function cropPDF(){
  if(!state.cropFile){toast('Pehle PDF upload karo!','⚠️');return;}
  const top=parseInt(document.getElementById('crop-top').value)||0;
  const bottom=parseInt(document.getElementById('crop-bottom').value)||0;
  const left=parseInt(document.getElementById('crop-left').value)||0;
  const right=parseInt(document.getElementById('crop-right').value)||0;
  try{
    const ab=await readAB(state.cropFile);
    const pdf=await PDFLib.PDFDocument.load(ab,{ignoreEncryption:true});
    pdf.getPages().forEach(page=>{
      const {width,height}=page.getSize();
      page.setCropBox(left,bottom,width-left-right,height-top-bottom);
    });
    const bytes=await pdf.save();
    const blob=new Blob([bytes],{type:'application/pdf'});
    document.getElementById('crop-download').onclick=()=>dlBlob(blob,'cropped.pdf');
    showResult('crop');
    toast('Pages cropped!','✅');
  }catch(e){toast('Error: '+e.message,'❌');}
}

// ══════════════════════════════════════════════════════
// IMAGE TO PDF
// ══════════════════════════════════════════════════════
function handleImageFiles(files){
  state.img2pdfFiles=[];
  const list=document.getElementById('img2pdf-list'); list.innerHTML='';
  for(const f of files){
    if(!f.type.startsWith('image/')) continue;
    state.img2pdfFiles.push(f);
    list.innerHTML+=`<div class="file-item"><div class="file-icon">🖼️</div><div class="file-info"><div class="file-name">${f.name}</div><div class="file-size">${fmtSize(f.size)}</div></div></div>`;
  }
  if(state.img2pdfFiles.length>0) document.getElementById('img2pdf-options').style.display='block';
}
async function imageToPDF(){
  if(state.img2pdfFiles.length===0){toast('Pehle images upload karo!','⚠️');return;}
  try{
    const pdf=await PDFLib.PDFDocument.create();
    const sizeDefs={A4:[595,842],Letter:[612,792],A3:[842,1191],A5:[420,595]};
    const sizeKey=document.getElementById('img2pdf-size').value;
    const orient=document.getElementById('img2pdf-orient').value;
    const margin=parseInt(document.getElementById('img2pdf-margin').value)||20;
    const fit=document.getElementById('img2pdf-fit').value;
    for(const f of state.img2pdfFiles){
      const dataURL=await readURL(f);
      const img=await new Promise(res=>{const i=new Image();i.onload=()=>res(i);i.src=dataURL;});
      let pdfImg;
      if(f.type==='image/jpeg')pdfImg=await pdf.embedJpg(await readAB(f));
      else{
        const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;
        canvas.getContext('2d').drawImage(img,0,0);
        const pngData=await fetch(canvas.toDataURL('image/png')).then(r=>r.arrayBuffer());
        pdfImg=await pdf.embedPng(pngData);
      }
      let pw,ph;
      if(sizeKey==='auto'){pw=img.width;ph=img.height;}
      else{[pw,ph]=sizeDefs[sizeKey]||[595,842];if(orient==='landscape')[pw,ph]=[ph,pw];}
      const page=pdf.addPage([pw,ph]);
      const avW=pw-2*margin, avH=ph-2*margin;
      let dw=pdfImg.width, dh=pdfImg.height;
      if(fit==='fit'){const sc=Math.min(avW/dw,avH/dh);dw*=sc;dh*=sc;}
      else if(fit==='stretch'){dw=avW;dh=avH;}
      const x=margin+(avW-dw)/2, y=margin+(avH-dh)/2;
      page.drawImage(pdfImg,{x,y,width:dw,height:dh});
    }
    const bytes=await pdf.save();
    const blob=new Blob([bytes],{type:'application/pdf'});
    document.getElementById('img2pdf-download').onclick=()=>dlBlob(blob,'images.pdf');
    showResult('img2pdf',`${state.img2pdfFiles.length} image(s) → ${fmtSize(blob.size)} PDF`);
    toast('PDF created!','✅');
  }catch(e){toast('Error: '+e.message,'❌');}
}

// ══════════════════════════════════════════════════════
// PDF TO IMAGE
// ══════════════════════════════════════════════════════
async function pdfToImages(){
  if(!state.pdf2imgFile){toast('Pehle PDF upload karo!','⚠️');return;}
  const prog=document.getElementById('pdf2img-progress'); prog.style.display='block';
  const fill=document.getElementById('pdf2img-fill');
  const fmt=document.getElementById('pdf2img-format').value;
  const scale=parseFloat(document.getElementById('pdf2img-scale').value)||2;
  const pagesOpt=document.getElementById('pdf2img-pages').value;
  try{
    const ab=await readAB(state.pdf2imgFile);
    const pdf=await pdfjsLib.getDocument({data:ab}).promise;
    const total=pdf.numPages;
    state.pdf2imgCanvases=[];
    let pageNums=[];
    if(pagesOpt==='first')pageNums=[1];
    else if(pagesOpt==='last')pageNums=[total];
    else pageNums=Array.from({length:total},(_,i)=>i+1);
    const area=document.getElementById('pdf2img-canvas-area'); area.innerHTML='';
    for(let i=0;i<pageNums.length;i++){
      const page=await pdf.getPage(pageNums[i]);
      const vp=page.getViewport({scale});
      const canvas=document.createElement('canvas');
      canvas.width=vp.width;canvas.height=vp.height;
      canvas.style.maxWidth='300px';canvas.style.height='auto';
      canvas.style.borderRadius='6px';canvas.style.boxShadow='0 4px 12px rgba(0,0,0,0.4)';
      await page.render({canvasContext:canvas.getContext('2d'),viewport:vp}).promise;
      area.appendChild(canvas);
      state.pdf2imgCanvases.push({canvas,page:pageNums[i],fmt});
      fill.style.width=((i+1)/pageNums.length*100)+'%';
    }
    prog.style.display='none';
    document.getElementById('pdf2img-preview').style.display='block';
    toast(`${pageNums.length} pages converted!`,'✅');
  }catch(e){prog.style.display='none';toast('Error: '+e.message,'❌');}
}
async function downloadAllImages(){
  if(state.pdf2imgCanvases.length===0){toast('Pehle convert karo!','⚠️');return;}
  if(state.pdf2imgCanvases.length===1){
    const {canvas,page,fmt}=state.pdf2imgCanvases[0];
    canvas.toBlob(b=>dlBlob(b,`page_${page}.${fmt}`),fmt==='jpeg'?'image/jpeg':'image/png',0.92);
    return;
  }
  const zip=new JSZip();
  for(const {canvas,page,fmt} of state.pdf2imgCanvases){
    const blob=await new Promise(res=>canvas.toBlob(res,fmt==='jpeg'?'image/jpeg':'image/png',0.92));
    const ab=await blob.arrayBuffer();
    zip.file(`page_${page}.${fmt}`,ab);
  }
  const zblob=await zip.generateAsync({type:'blob'});
  dlBlob(zblob,'pdf_images.zip');
  toast('ZIP downloaded!','✅');
}

// ══════════════════════════════════════════════════════
// PDF TO TEXT (OCR)
// ══════════════════════════════════════════════════════
async function extractText(input, targetTool){
  const file=input.files[0]; if(!file) return;
  if(targetTool==='redact'){state.redactFile=file; document.getElementById('redact-options').style.display='block'; return;}
  try{
    await renderToolPdfPreview('pdf2txt',file,4);
    const ab=await readAB(file);
    const pdf=await pdfjsLib.getDocument({data:ab}).promise;
    let text=''; const total=pdf.numPages;
    for(let i=1;i<=total;i++){
      const page=await pdf.getPage(i);
      const content=await page.getTextContent();
      text+=`\n═══ Page ${i} ═══\n`;
      text+=content.items.map(item=>item.str).join(' ')+'\n';
    }
    const words=text.split(/\s+/).filter(w=>w.length>0).length;
    const chars=text.replace(/\s/g,'').length;
    document.getElementById('txt-stats').innerHTML=`
      <div class="stat-card"><div class="st-val">${total}</div><div class="st-label">Pages</div></div>
      <div class="stat-card"><div class="st-val">${words.toLocaleString()}</div><div class="st-label">Words</div></div>
      <div class="stat-card"><div class="st-val">${chars.toLocaleString()}</div><div class="st-label">Characters</div></div>`;
    document.getElementById('txt-area').value=text.trim();
    document.getElementById('pdf2txt-output').style.display='block';
    toast('Text extracted!','✅');
  }catch(e){toast('Error: '+e.message,'❌');}
}
function downloadText(){
  const t=document.getElementById('txt-area').value;
  dlBlob(new Blob([t],{type:'text/plain'}),'extracted_text.txt');
}

// ══════════════════════════════════════════════════════
// OCR PANEL (separate)
// ══════════════════════════════════════════════════════

async function runOCR(inputOrFile){
  const file=inputOrFile?.files ? inputOrFile.files[0] : inputOrFile;
  if(!file) return;
  const progress=document.getElementById('ocr-progress');
  const output=document.getElementById('ocr-output');
  const previewWrap=document.getElementById('ocr-preview-wrap');
  const fill=document.getElementById('ocr-fill');
  const pageCount=document.getElementById('ocr-page-count');
  progress.style.display='block';
  output.style.display='none';
  if(previewWrap) previewWrap.style.display='none';
  fill.style.width='0%';
  if(pageCount) pageCount.textContent='';
  try{
    let text='', total=0;
    const isPdf=file.type==='application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    await renderOCRPreview(file, isPdf);
    if(isPdf){
      const ab=await readAB(file);
      const pdf=await pdfjsLib.getDocument({data:ab}).promise;
      total=pdf.numPages;
      for(let i=1;i<=total;i++){
        const page=await pdf.getPage(i);
        const content=await page.getTextContent();
        text+=`\n===== Page ${i} of ${total} =====\n`;
        text+=content.items.map(item=>item.str).join(' ')+'\n';
        if(pageCount) pageCount.textContent=`(${i}/${total})`;
        fill.style.width=(i/total*100)+'%';
      }
    } else {
      if(pageCount) pageCount.textContent='(image)';
      const result=await Tesseract.recognize(file, 'eng', {
        logger: info => {
          if(info?.status === 'recognizing text' && typeof info.progress === 'number'){
            fill.style.width=Math.max(5, Math.round(info.progress*100))+'%';
          }
        }
      });
      text=result?.data?.text || '';
      total=1;
      fill.style.width='100%';
    }
    const words=text.split(/\s+/).filter(w=>w.length>0).length;
    document.getElementById('ocr-stats').innerHTML=`
      <div class="stat-card"><div class="st-val">${total}</div><div class="st-label">${isPdf ? 'Pages' : 'Image'}</div></div>
      <div class="stat-card"><div class="st-val">${words.toLocaleString()}</div><div class="st-label">Words</div></div>`;
    document.getElementById('ocr-text').value=text.trim();
    output.style.display='block';
    progress.style.display='none';
    toast('OCR complete!','✅');
  }catch(e){
    progress.style.display='none';
    toast('Error: '+e.message,'❌');
  }
}

async function renderOCRPreview(file, isPdf){
  const wrap=document.getElementById('ocr-preview-wrap');
  const box=document.getElementById('ocr-preview-box');
  if(!wrap || !box) return;
  box.innerHTML='';
  wrap.style.display='block';
  if(isPdf){
    await renderPdfPreviewIntoBox(box,file,4,0.85,'text');
  } else {
    const src=await readURL(file);
    const img=document.createElement('img');
    img.src=src;
    img.alt='OCR preview';
    img.style.maxWidth='420px';
    box.appendChild(img);
  }
}

async function renderMathOCRPreview(file, isPdf){
  const wrap=document.getElementById('mathocr-preview-wrap');
  const box=document.getElementById('mathocr-preview-box');
  if(!wrap || !box) return;
  box.innerHTML='';
  wrap.style.display='block';
  if(isPdf){
    await renderPdfPreviewIntoBox(box,file,4,0.85,'text');
  } else {
    const src=await readURL(file);
    const img=document.createElement('img');
    img.src=src;
    img.alt='Advanced OCR preview';
    img.style.maxWidth='420px';
    box.appendChild(img);
  }
}

async function runAdvancedOCR(inputOrFile){
  const file=inputOrFile?.files ? inputOrFile.files[0] : (inputOrFile || state.mathOCRFile);
  if(!file){toast('Pehle PDF ya image upload karo!','⚠️');return;}
  state.mathOCRFile=file;
  document.getElementById('mathocr-options').style.display='block';
  const progress=document.getElementById('mathocr-progress');
  const output=document.getElementById('mathocr-output');
  const fill=document.getElementById('mathocr-fill');
  const pageCount=document.getElementById('mathocr-page-count');
  progress.style.display='block';
  output.style.display='none';
  fill.style.width='0%';
  if(pageCount) pageCount.textContent='';
  const mode=document.getElementById('mathocr-mode').value;
  const scale=document.getElementById('mathocr-scale').value;
  const keepLines=document.getElementById('mathocr-keep-lines').checked;
  const joinPages=document.getElementById('mathocr-join-pages').checked;
  try{
    const isPdf=file.type==='application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    await renderMathOCRPreview(file, isPdf);
    let pagesText=[];
    let total=1;
    if(isPdf){
      const ab=await readAB(file);
      const pdf=await pdfjsLib.getDocument({data:ab}).promise;
      total=pdf.numPages;
      for(let i=1;i<=total;i++){
        if(pageCount) pageCount.textContent=`(${i}/${total})`;
        const page=await pdf.getPage(i);
        const content=await page.getTextContent();
        const directText=content.items.map(item=>item.str).join(' ').replace(/\s+/g,' ').trim();
        if(directText.length>24){
          fill.style.width=`${Math.max(5,Math.round((i/total)*100))}%`;
          let text=keepLines?directText.replace(/(.{120,}?)\s+/g,'$1\n'):directText;
          pagesText.push(text.trim());
          continue;
        }
        const vp=page.getViewport({scale:parseFloat(scale)||2});
        const canvas=document.createElement('canvas');
        canvas.width=vp.width;
        canvas.height=vp.height;
        await page.render({canvasContext:canvas.getContext('2d'),viewport:vp}).promise;
        const processed=await preprocessImageForOCR(canvas,{mode,scale:1});
        const result=await recognizeCanvasText(processed,fill,((i-1)/total)*100,100/total);
        let text=result?.data?.text || '';
        if(!keepLines) text=text.replace(/\s*\n\s*/g,' ');
        pagesText.push(text.trim());
      }
    } else {
      if(pageCount) pageCount.textContent='(image)';
      const processed=await preprocessImageForOCR(file,{mode,scale});
      const result=await recognizeCanvasText(processed,fill,0,100);
      let text=result?.data?.text || '';
      if(!keepLines) text=text.replace(/\s*\n\s*/g,' ');
      pagesText=[text.trim()];
      total=1;
      fill.style.width='100%';
    }
    const finalText=joinPages ? pagesText.join('\n') : pagesText.map((txt,idx)=>`===== Page ${idx+1} =====\n${txt}`).join('\n\n');
    const formulaish=(finalText.match(/[=+\-/*^(){}\[\]∑√π∞≤≥≈]/g)||[]).length;
    const chars=finalText.replace(/\s/g,'').length;
    document.getElementById('mathocr-stats').innerHTML=`
      <div class="stat-card"><div class="st-val">${total}</div><div class="st-label">${isPdf?'Pages':'Image'}</div></div>
      <div class="stat-card"><div class="st-val">${chars.toLocaleString()}</div><div class="st-label">Chars</div></div>
      <div class="stat-card"><div class="st-val">${formulaish}</div><div class="st-label">Formula Symbols</div></div>`;
    document.getElementById('mathocr-text').value=finalText.trim();
    output.style.display='block';
    progress.style.display='none';
    toast('Advanced OCR complete!','✅');
  }catch(e){
    progress.style.display='none';
    toast('Error: '+e.message,'❌');
  }
}

async function loadImageFromFile(file){
  const dataURL=await readURL(file);
  return new Promise((res,rej)=>{
    const img=new Image();
    img.onload=()=>res(img);
    img.onerror=()=>rej(new Error('Image load nahi ho payi'));
    img.src=dataURL;
  });
}

async function preprocessImageForOCR(source, options={}){
  let mode=options.mode || 'enhance';
  const scale=parseFloat(options.scale)||2;
  const img=(source instanceof HTMLImageElement || source instanceof HTMLCanvasElement) ? source : await loadImageFromFile(source);
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(img.width*scale));
  canvas.height=Math.max(1,Math.round(img.height*scale));
  const ctx=canvas.getContext('2d');
  ctx.drawImage(img,0,0,canvas.width,canvas.height);
  const imageData=ctx.getImageData(0,0,canvas.width,canvas.height);
  const data=imageData.data;
  if(mode==='auto'){
    let totalLuma=0;
    for(let i=0;i<data.length;i+=16){
      totalLuma += data[i]*0.299 + data[i+1]*0.587 + data[i+2]*0.114;
    }
    const avgLuma=totalLuma/(data.length/16);
    mode = avgLuma < 110 ? 'invert' : avgLuma > 210 ? 'threshold' : 'enhance';
  }
  for(let i=0;i<data.length;i+=4){
    const gray=Math.round(data[i]*0.299 + data[i+1]*0.587 + data[i+2]*0.114);
    let val=gray;
    if(mode==='enhance') val=clamp((gray-128)*1.45+128,0,255);
    else if(mode==='threshold') val=gray>170?255:0;
    else if(mode==='invert') val=255-gray;
    data[i]=data[i+1]=data[i+2]=val;
  }
  ctx.putImageData(imageData,0,0);
  return canvas;
}

async function recognizeCanvasText(canvas, fillEl, progressBase=0, progressSpan=100){
  return Tesseract.recognize(canvas,'eng',{
    tessedit_pageseg_mode: '6',
    preserve_interword_spaces: '1',
    logger: info=>{
      if(info?.status === 'recognizing text' && typeof info.progress === 'number' && fillEl){
        const pct=progressBase + info.progress*progressSpan;
        fillEl.style.width=`${Math.max(3,Math.round(pct))}%`;
      }
    }
  });
}

function handleImageResizeFile(files){
  const file=files?.[0];
  if(!file) return;
  if(!file.type.startsWith('image/')){toast('Image file choose karo!','⚠️');return;}
  state.imgResizeFile=file;
  state.imgResizeBlob=null;
  state.imgResizeMeta=null;
  document.getElementById('imgresize-options').style.display='block';
  document.getElementById('imgresize-result').classList.remove('show');
  document.getElementById('imgresize-list').innerHTML=`<div class="file-item"><div class="file-icon">🖼️</div><div class="file-info"><div class="file-name">${file.name}</div><div class="file-size">${fmtSize(file.size)}</div></div></div>`;
}

async function canvasToBlob(canvas,type,quality){
  return new Promise((res,rej)=>{
    canvas.toBlob(blob=>blob?res(blob):rej(new Error('Image export fail ho gaya')),type,quality);
  });
}

async function renderResizedBlob(img,width,height,type,bias,targetBytes=0){
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(width));
  canvas.height=Math.max(1,Math.round(height));
  const ctx=canvas.getContext('2d');
  ctx.imageSmoothingEnabled=true;
  ctx.imageSmoothingQuality='high';
  ctx.drawImage(img,0,0,canvas.width,canvas.height);
  if(type==='image/png') return canvasToBlob(canvas,type);
  const presets={quality:[0.95,0.78,0.55],balanced:[0.9,0.68,0.42],small:[0.82,0.52,0.3]};
  let [highDefault,midDefault,lowDefault]=presets[bias] || presets.balanced;
  let low=clamp(lowDefault,0.1,0.98), high=clamp(highDefault,0.1,0.99);
  let best=await canvasToBlob(canvas,type,clamp(midDefault,low,high));
  let bestDiff=targetBytes?Math.abs(best.size-targetBytes):Number.MAX_SAFE_INTEGER;
  for(let i=0;i<8;i++){
    const q=(low+high)/2;
    const blob=await canvasToBlob(canvas,type,q);
    const diff=targetBytes?Math.abs(blob.size-targetBytes):Math.abs(blob.size-best.size);
    if(diff<bestDiff || (targetBytes && blob.size<=targetBytes && best.size>targetBytes)){
      best=blob;
      bestDiff=diff;
    }
    if(!targetBytes){
      best=blob;
      continue;
    }
    if(blob.size>targetBytes) high=q;
    else low=q;
  }
  return best;
}

function mimeToExt(type){
  if(type==='image/png') return 'png';
  if(type==='image/webp') return 'webp';
  return 'jpg';
}

function decodeXmlEntities(str=''){
  return str
    .replace(/&amp;/g,'&')
    .replace(/&lt;/g,'<')
    .replace(/&gt;/g,'>')
    .replace(/&quot;/g,'"')
    .replace(/&apos;/g,"'");
}

function stripXmlTags(xml=''){
  return decodeXmlEntities(xml.replace(/<[^>]+>/g,' ')).replace(/\s+/g,' ').trim();
}

async function readZipEntries(file){
  const ab=await readAB(file);
  return JSZip.loadAsync(ab);
}

function escapeHtml(str=''){
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

async function buildPdfFromSections(title, sections, filenameBase, resultId){
  const sizes={A4:[595,842],Letter:[612,792]};
  const [pw,ph]=sizes.A4;
  const margin=42;
  const bodySize=11;
  const headingSize=16;
  const lineHeight=16;
  const pdf=await PDFLib.PDFDocument.create();
  const font=await pdf.embedFont(PDFLib.StandardFonts.Helvetica);
  const bold=await pdf.embedFont(PDFLib.StandardFonts.HelveticaBold);
  pdf.setTitle(title);
  let page=pdf.addPage([pw,ph]);
  let y=ph-margin;
  const usableW=pw-margin*2;
  const pushLine=(text,size=bodySize,useBold=false)=>{
    const activeFont=useBold?bold:font;
    const words=(text || '').split(/\s+/).filter(Boolean);
    if(words.length===0){
      y-=lineHeight;
      return;
    }
    let cur='';
    for(const word of words){
      const test=cur?`${cur} ${word}`:word;
      if(activeFont.widthOfTextAtSize(test,size)>usableW && cur){
        if(y<margin+size+10){page=pdf.addPage([pw,ph]);y=ph-margin;}
        page.drawText(cur,{x:margin,y,size,font:activeFont,color:PDFLib.rgb(0.1,0.1,0.12)});
        y-=lineHeight;
        cur=word;
      } else cur=test;
    }
    if(cur){
      if(y<margin+size+10){page=pdf.addPage([pw,ph]);y=ph-margin;}
      page.drawText(cur,{x:margin,y,size,font:activeFont,color:PDFLib.rgb(0.1,0.1,0.12)});
      y-=lineHeight;
    }
  };
  pushLine(title,18,true);
  y-=4;
  sections.forEach(section=>{
    if(y<margin+40){page=pdf.addPage([pw,ph]);y=ph-margin;}
    pushLine(section.title || 'Section', headingSize, true);
    (section.lines?.length ? section.lines : ['(No readable text found)']).forEach(line=>pushLine(line,bodySize,false));
    y-=8;
  });
  const bytes=await pdf.save();
  const blob=new Blob([bytes],{type:'application/pdf'});
  document.getElementById(`${resultId}-download`).onclick=()=>dlBlob(blob,`${filenameBase}.pdf`);
  showResult(resultId,`${sections.length} section(s) • ${pdf.getPageCount()} page(s) • ${fmtSize(blob.size)}`);
  return blob;
}

async function extractDocxText(file){
  const zip=await readZipEntries(file);
  const docXml=await zip.file('word/document.xml')?.async('string');
  if(!docXml) throw new Error('DOCX document.xml nahi mila');
  return docXml
    .split(/<\/w:p>/)
    .map(p=>stripXmlTags(p.replace(/<w:tab\/>/g,'    ').replace(/<w:br\/>/g,'\n')))
    .filter(Boolean);
}

async function extractPptxSlides(file){
  const zip=await readZipEntries(file);
  const slideFiles=Object.keys(zip.files).filter(name=>/^ppt\/slides\/slide\d+\.xml$/.test(name)).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
  if(!slideFiles.length) throw new Error('PPTX slides nahi mile');
  const slides=[];
  for(let i=0;i<slideFiles.length;i++){
    const xml=await zip.file(slideFiles[i]).async('string');
    const lines=xml.split(/<\/a:p>/).map(part=>stripXmlTags(part)).filter(Boolean);
    slides.push({title:`Slide ${i+1}`,lines});
  }
  return slides;
}

async function extractXlsxSheets(file){
  if(file.name.toLowerCase().endsWith('.csv')){
    const text=await file.text();
    const rows=text.split(/\r?\n/).filter(Boolean).map(line=>line.split(',').map(cell=>cell.trim()));
    return [{name:'Sheet1',rows}];
  }
  const zip=await readZipEntries(file);
  const sharedXml=await zip.file('xl/sharedStrings.xml')?.async('string');
  const sharedStrings=sharedXml ? [...sharedXml.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(m=>decodeXmlEntities(m[1])) : [];
  const workbookXml=await zip.file('xl/workbook.xml')?.async('string');
  const relsXml=await zip.file('xl/_rels/workbook.xml.rels')?.async('string');
  if(!workbookXml || !relsXml) throw new Error('XLSX workbook data nahi mila');
  const relMap={};
  [...relsXml.matchAll(/<Relationship[^>]+Id="([^"]+)"[^>]+Target="([^"]+)"/g)].forEach(m=>{relMap[m[1]]=m[2];});
  const sheets=[...workbookXml.matchAll(/<sheet[^>]+name="([^"]+)"[^>]+r:id="([^"]+)"/g)].map(m=>({name:m[1],target:relMap[m[2]]}));
  const out=[];
  for(const sheet of sheets){
    const path=`xl/${sheet.target.replace(/^\.\//,'')}`;
    const xml=await zip.file(path)?.async('string');
    if(!xml) continue;
    const rows=[];
    const rowMatches=[...xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)];
    rowMatches.forEach(rowMatch=>{
      const rowCells=[];
      [...rowMatch[1].matchAll(/<c[^>]*?(?:t="([^"]+)")?[^>]*>([\s\S]*?)<\/c>/g)].forEach(cellMatch=>{
        const type=cellMatch[1] || '';
        const cellXml=cellMatch[2];
        let value='';
        if(type==='s'){
          const idx=parseInt((cellXml.match(/<v>(.*?)<\/v>/)?.[1] || '0'),10);
          value=sharedStrings[idx] || '';
        } else if(type==='inlineStr'){
          value=decodeXmlEntities((cellXml.match(/<t[^>]*>([\s\S]*?)<\/t>/)?.[1] || ''));
        } else {
          value=decodeXmlEntities((cellXml.match(/<v>([\s\S]*?)<\/v>/)?.[1] || ''));
        }
        rowCells.push(value);
      });
      if(rowCells.length) rows.push(rowCells);
    });
    out.push({name:sheet.name,rows});
  }
  if(!out.length) throw new Error('Readable sheets nahi mili');
  return out;
}

function buildExcelHtmlWorkbook(sheets){
  const tabs=sheets.map(sheet=>{
    const rows=sheet.rows.map(row=>`<tr>${row.map(cell=>`<td>${escapeHtml(cell ?? '')}</td>`).join('')}</tr>`).join('');
    return `<table><thead><tr><th colspan="${Math.max(sheet.rows[0]?.length || 1,1)}">${escapeHtml(sheet.name)}</th></tr></thead><tbody>${rows}</tbody></table><br/>`;
  }).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><style>table{border-collapse:collapse;margin-bottom:18px;font-family:Arial,sans-serif}td,th{border:1px solid #999;padding:6px 8px;font-size:12px;text-align:left}th{background:#efefef}</style></head><body>${tabs}</body></html>`;
}

async function resizeImageToTarget(){
  if(!state.imgResizeFile){toast('Pehle image upload karo!','⚠️');return;}
  const targetKB=Math.max(parseInt(document.getElementById('imgresize-target').value)||200,10);
  const maxWidth=Math.max(parseInt(document.getElementById('imgresize-maxw').value)||1920,100);
  const type=document.getElementById('imgresize-format').value;
  const bias=document.getElementById('imgresize-bias').value;
  const keepAspect=document.getElementById('imgresize-keep').checked;
  try{
    const img=await loadImageFromFile(state.imgResizeFile);
    const targetBytes=targetKB*1024;
    let width=Math.min(img.width,maxWidth);
    let height=keepAspect?Math.round(img.height*(width/img.width)):img.height;
    if(!keepAspect && img.width>maxWidth) width=maxWidth;
    let bestBlob=null;
    let bestWidth=width;
    let bestHeight=height;
    for(let step=0;step<7;step++){
      const blob=await renderResizedBlob(img,width,height,type,bias,targetBytes);
      if(!bestBlob || Math.abs(blob.size-targetBytes)<Math.abs(bestBlob.size-targetBytes) || (blob.size<=targetBytes && bestBlob.size>targetBytes)){
        bestBlob=blob;
        bestWidth=width;
        bestHeight=height;
      }
      if(blob.size<=targetBytes*1.05) break;
      width=Math.max(80,Math.round(width*0.88));
      height=Math.max(80,keepAspect?Math.round(img.height*(width/img.width)):Math.round(height*0.88));
    }
    state.imgResizeBlob=bestBlob;
    state.imgResizeMeta={width:bestWidth,height:bestHeight,type};
    const ext=mimeToExt(type);
    const baseName=state.imgResizeFile.name.replace(/\.[^.]+$/,'');
    document.getElementById('imgresize-download').onclick=()=>dlBlob(bestBlob,`${baseName}_resized.${ext}`);
    showResult('imgresize',`${fmtSize(state.imgResizeFile.size)} → ${fmtSize(bestBlob.size)} • ${bestWidth}×${bestHeight}px`);
    toast(`Image ready (${fmtSize(bestBlob.size)})`,'✅');
  }catch(e){toast('Error: '+e.message,'❌');}
}

async function convertWordToPDF(input){
  const file=input.files?.[0];
  if(!file) return;
  try{
    const lines=await extractDocxText(file);
    await buildPdfFromSections(file.name,[{title:'Document Content',lines}],file.name.replace(/\.[^.]+$/,''),'word2pdf');
    toast('Word document converted!','✅');
  }catch(e){toast('Error: '+e.message,'❌');}
}

async function convertPowerPointToPDF(input){
  const file=input.files?.[0];
  if(!file) return;
  try{
    const slides=await extractPptxSlides(file);
    await buildPdfFromSections(file.name,slides,file.name.replace(/\.[^.]+$/,''),'ppt2pdf');
    toast('PowerPoint converted!','✅');
  }catch(e){toast('Error: '+e.message,'❌');}
}

async function convertExcelToPDF(input){
  const file=input.files?.[0];
  if(!file) return;
  try{
    const sheets=await extractXlsxSheets(file);
    const sections=sheets.map(sheet=>({
      title:sheet.name,
      lines:(sheet.rows.length?sheet.rows:[['(No rows found)']]).map((row,idx)=>`${idx+1}. ${row.join(' | ')}`)
    }));
    await buildPdfFromSections(file.name,sections,file.name.replace(/\.[^.]+$/,''),'excel2pdf');
    toast('Excel file converted!','✅');
  }catch(e){toast('Error: '+e.message,'❌');}
}

async function convertPDFToExcel(input){
  const file=input.files?.[0];
  if(!file) return;
  try{
    await renderToolPdfPreview('pdf2excel',file,4);
    const ab=await readAB(file);
    const pdf=await pdfjsLib.getDocument({data:ab}).promise;
    const rows=[];
    for(let i=1;i<=pdf.numPages;i++){
      const page=await pdf.getPage(i);
      const content=await page.getTextContent();
      const pageText=content.items.map(item=>item.str).join(' ');
      pageText.split(/(?<=[.!?])\s+|\n+/).map(line=>line.trim()).filter(Boolean).forEach((line,idx)=>rows.push([String(i),String(idx+1),line]));
    }
    if(!rows.length) rows.push(['1','1','No readable text found']);
    const html=buildExcelHtmlWorkbook([{name:'PDF Extract',rows:[['Page','Line','Content'],...rows]}]);
    const blob=new Blob([html],{type:'application/vnd.ms-excel'});
    document.getElementById('pdf2excel-download').onclick=()=>dlBlob(blob,`${file.name.replace(/\.[^.]+$/,'')}.xls`);
    showResult('pdf2excel',`${rows.length} row(s) exported from ${pdf.numPages} page(s)`);
    toast('Excel sheet ready!','✅');
  }catch(e){toast('Error: '+e.message,'❌');}
}
function downloadAdvancedOCR(){dlBlob(new Blob([document.getElementById('mathocr-text').value],{type:'text/plain'}),'advanced_formula_ocr.txt');}
function cleanAdvancedOCR(){
  const area=document.getElementById('mathocr-text');
  area.value=area.value
    .replace(/[ \t]+\n/g,'\n')
    .replace(/\n{3,}/g,'\n\n')
    .replace(/[ ]{2,}/g,' ')
    .replace(/([=+\-/*^(){}\[\]])\s+/g,'$1')
    .replace(/\s+([=+\-/*^(){}\[\]])/g,'$1')
    .trim();
  toast('Spacing cleaned!','✅');
}
function downloadOCR(){dlBlob(new Blob([document.getElementById('ocr-text').value],{type:'text/plain'}),'ocr_text.txt');}
function searchInText(){const s=document.getElementById('ocr-search');s.style.display=s.style.display==='none'?'block':'none';}
function highlightSearch(q){
  const textarea=document.getElementById('ocr-text');
  const res=document.getElementById('ocr-search-result');
  if(!q){res.textContent='';return;}
  const text=textarea.value;
  const matches=(text.match(new RegExp(q,'gi'))||[]).length;
  res.textContent=`${matches} matches found`;
}

// ══════════════════════════════════════════════════════
// HTML TO PDF
// ══════════════════════════════════════════════════════
async function htmlToPDF(){
  const content=document.getElementById('html2pdf-content').value.trim();
  if(!content){toast('HTML content enter karo!','⚠️');return;}
  const sizeKey=document.getElementById('html2pdf-size').value;
  const fontSize=parseInt(document.getElementById('html2pdf-fontsize').value)||11;
  const margin=parseInt(document.getElementById('html2pdf-margin').value)||50;
  const title=document.getElementById('html2pdf-title').value||'Document';
  const sizes={A4:[595,842],Letter:[612,792],A3:[842,1191]};
  const[pw,ph]=sizes[sizeKey]||[595,842];
  try{
    const pdf=await PDFLib.PDFDocument.create();
    const font=await pdf.embedFont(PDFLib.StandardFonts.Helvetica);
    const boldFont=await pdf.embedFont(PDFLib.StandardFonts.HelveticaBold);
    pdf.setTitle(title);
    const text=content.replace(/<br\s*\/?>/gi,'\n').replace(/<p[^>]*>/gi,'\n').replace(/<h[1-6][^>]*>/gi,'\n').replace(/<\/h[1-6]>/gi,'\n').replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/\t/g,'  ').trim();
    const lineHeight=fontSize*1.5;
    const usableW=pw-2*margin; const usableH=ph-2*margin;
    const lines=[];
    for(const rawLine of text.split('\n')){
      if(!rawLine.trim()){lines.push('');continue;}
      const words=rawLine.split(' ');
      let cur='';
      for(const w of words){
        const test=cur?cur+' '+w:w;
        if(font.widthOfTextAtSize(test,fontSize)>usableW){if(cur)lines.push(cur);cur=w;}
        else cur=test;
      }
      if(cur)lines.push(cur);
    }
    let page=pdf.addPage([pw,ph]); let y=ph-margin;
    for(const line of lines){
      if(y<margin){page=pdf.addPage([pw,ph]);y=ph-margin;}
      if(line.trim())page.drawText(line,{x:margin,y,size:fontSize,font,color:PDFLib.rgb(0.1,0.1,0.1)});
      y-=lineHeight;
    }
    const bytes=await pdf.save();
    const blob=new Blob([bytes],{type:'application/pdf'});
    document.getElementById('html2pdf-download').onclick=()=>dlBlob(blob,'document.pdf');
    showResult('html2pdf',`${pdf.getPageCount()} pages generated, ${fmtSize(blob.size)}`);
    toast('PDF created!','✅');
  }catch(e){toast('Error: '+e.message,'❌');}
}

// ══════════════════════════════════════════════════════
// BLANK PDF
// ══════════════════════════════════════════════════════
async function generateBlank(){
  const count=Math.min(parseInt(document.getElementById('blank-pages').value)||1,500);
  const sizeKey=document.getElementById('blank-size').value;
  const orient=document.getElementById('blank-orient').value;
  const bgHex=document.getElementById('blank-color').value;
  const {r:br,g:bg,b:bb}=hexToRgb(bgHex);
  const lineType=document.getElementById('blank-lines').value;
  const sizes={A4:[595,842],Letter:[612,792],A3:[842,1191],A5:[420,595],Legal:[612,1008]};
  let[pw,ph]=sizes[sizeKey]||[595,842];
  if(orient==='landscape')[pw,ph]=[ph,pw];
  try{
    const pdf=await PDFLib.PDFDocument.create();
    for(let i=0;i<count;i++){
      const page=pdf.addPage([pw,ph]);
      if(bgHex!=='#ffffff') page.drawRectangle({x:0,y:0,width:pw,height:ph,color:PDFLib.rgb(br,bg,bb)});
      if(lineType==='ruled'){
        const lineGap=28;const lColor=PDFLib.rgb(0.75,0.8,0.95);
        for(let y=ph-72;y>50;y-=lineGap)page.drawLine({start:{x:50,y},end:{x:pw-50,y},thickness:0.5,color:lColor});
      } else if(lineType==='grid'){
        const gap=28;const gc=PDFLib.rgb(0.8,0.85,0.95);
        for(let y=ph-50;y>50;y-=gap)page.drawLine({start:{x:30,y},end:{x:pw-30,y},thickness:0.4,color:gc});
        for(let x=30;x<pw-30;x+=gap)page.drawLine({start:{x,y:ph-30},end:{x,y:30},thickness:0.4,color:gc});
      } else if(lineType==='dotted'){
        const gap=28;const dc=PDFLib.rgb(0.7,0.7,0.85);
        for(let y=ph-50;y>50;y-=gap)for(let x=30;x<pw-30;x+=gap)page.drawCircle({x,y,size:1.2,color:dc});
      }
    }
    const bytes=await pdf.save();
    const blob=new Blob([bytes],{type:'application/pdf'});
    document.getElementById('blank-download').onclick=()=>dlBlob(blob,`blank_${sizeKey}_${count}pages.pdf`);
    showResult('blank',`${count} page ${sizeKey} PDF (${lineType}) — ${fmtSize(blob.size)}`);
    toast('Blank PDF ready!','✅');
  }catch(e){toast('Error: '+e.message,'❌');}
}

// ══════════════════════════════════════════════════════
// PROTECT PDF
// ══════════════════════════════════════════════════════
async function protectPDF(){
  if(!state.protectFile){toast('Pehle PDF upload karo!','⚠️');return;}
  const p1=document.getElementById('protect-pass').value;
  const p2=document.getElementById('protect-pass2').value;
  if(!p1){toast('Password enter karo!','⚠️');return;}
  if(p1!==p2){toast('Passwords match nahi karte!','⚠️');return;}
  try{
    const ab=await readAB(state.protectFile);
    const pdf=await PDFLib.PDFDocument.load(ab,{ignoreEncryption:true});
    pdf.setTitle(`Protected Document`);
    pdf.setKeywords([p1]);
    const bytes=await pdf.save();
    const blob=new Blob([bytes],{type:'application/pdf'});
    document.getElementById('protect-download').onclick=()=>dlBlob(blob,'protected.pdf');
    showResult('protect');
    toast('PDF protected (metadata-level)!','✅');
  }catch(e){toast('Error: '+e.message,'❌');}
}

// ══════════════════════════════════════════════════════
// UNLOCK PDF
// ══════════════════════════════════════════════════════
async function unlockPDF(){
  if(!state.unlockFile){toast('Pehle PDF upload karo!','⚠️');return;}
  const pass=document.getElementById('unlock-pass').value;
  try{
    const ab=await readAB(state.unlockFile);
    const pdf=await PDFLib.PDFDocument.load(ab,{ignoreEncryption:true,password:pass||undefined});
    const bytes=await pdf.save();
    const blob=new Blob([bytes],{type:'application/pdf'});
    document.getElementById('unlock-download').onclick=()=>dlBlob(blob,'unlocked.pdf');
    showResult('unlock');
    toast('PDF unlocked!','✅');
  }catch(e){
    if(e.message.includes('password')||e.message.includes('encrypt'))toast('Wrong password ya PDF nahi khul raha','❌');
    else toast('Error: '+e.message,'❌');
  }
}

// ══════════════════════════════════════════════════════
// SIGN PDF
// ══════════════════════════════════════════════════════
let signCtx=null;
function initSignCanvas(){
  const canvas=document.getElementById('sign-canvas'); if(!canvas) return;
  signCtx=canvas.getContext('2d');
  signCtx.strokeStyle='#1a1a2e';signCtx.lineWidth=2.5;signCtx.lineCap='round';signCtx.lineJoin='round';
  const getPos=(e,c)=>{const rect=c.getBoundingClientRect();const cl=e.touches?e.touches[0]:e;return{x:(cl.clientX-rect.left)*(c.width/rect.width),y:(cl.clientY-rect.top)*(c.height/rect.height)};};
  canvas.addEventListener('mousedown',e=>{state.signDrawing=true;const p=getPos(e,canvas);state.signLastX=p.x;state.signLastY=p.y;});
  canvas.addEventListener('mousemove',e=>{if(!state.signDrawing)return;const p=getPos(e,canvas);signCtx.beginPath();signCtx.moveTo(state.signLastX,state.signLastY);signCtx.lineTo(p.x,p.y);signCtx.stroke();state.signLastX=p.x;state.signLastY=p.y;});
  canvas.addEventListener('mouseup',()=>state.signDrawing=false);
  canvas.addEventListener('mouseleave',()=>state.signDrawing=false);
  canvas.addEventListener('touchstart',e=>{e.preventDefault();state.signDrawing=true;const p=getPos(e,canvas);state.signLastX=p.x;state.signLastY=p.y;},{passive:false});
  canvas.addEventListener('touchmove',e=>{e.preventDefault();if(!state.signDrawing)return;const p=getPos(e,canvas);signCtx.beginPath();signCtx.moveTo(state.signLastX,state.signLastY);signCtx.lineTo(p.x,p.y);signCtx.stroke();state.signLastX=p.x;state.signLastY=p.y;},{passive:false});
  canvas.addEventListener('touchend',()=>state.signDrawing=false);
}
function clearSignature(){if(signCtx){const c=document.getElementById('sign-canvas');signCtx.clearRect(0,0,c.width,c.height);}}
function selectSignType(type,btn){
  state.signType=type;
  document.querySelectorAll('#sign-options .tab-btn').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');
  document.querySelectorAll('#sign-options .tab-content').forEach(c=>c.classList.remove('active'));
  document.getElementById('sign-'+type+'-area').classList.add('active');
}
async function signPDF(){
  if(!state.signFile){toast('Pehle PDF upload karo!','⚠️');return;}
  try{
    const ab=await readAB(state.signFile);
    const pdf=await PDFLib.PDFDocument.load(ab,{ignoreEncryption:true});
    const pages=pdf.getPages();
    const pageNum=Math.min(Math.max(parseInt(document.getElementById('sign-page').value)||1,1),pages.length);
    const page=pages[pageNum-1];
    const {width,height}=page.getSize();
    const sigSize=parseInt(document.getElementById('sign-size').value)||120;
    const posOpt=document.getElementById('sign-pos').value;
    let sx,sy;
    if(posOpt==='bottom-right'){sx=width-sigSize-30;sy=25;}
    else if(posOpt==='bottom-left'){sx=30;sy=25;}
    else if(posOpt==='bottom-center'){sx=width/2-sigSize/2;sy=25;}
    else{sx=width-sigSize-30;sy=height-40;}

    if(state.signType==='draw'){
      const canvas=document.getElementById('sign-canvas');
      const dataURL=canvas.toDataURL('image/png');
      const pngData=await fetch(dataURL).then(r=>r.arrayBuffer());
      const img=await pdf.embedPng(pngData);
      const dim=img.scale(sigSize/img.width);
      page.drawImage(img,{x:sx,y:sy,width:dim.width,height:dim.height});
    } else if(state.signType==='type'){
      const name=document.getElementById('sign-name').value||'Signature';
      const font=await pdf.embedFont(PDFLib.StandardFonts.TimesRomanItalic);
      page.drawText(name,{x:sx,y:sy+10,size:sigSize/5,font,color:PDFLib.rgb(0.1,0.1,0.5)});
    } else {
      const imgFile=document.getElementById('sign-img-file').files[0];
      if(!imgFile){toast('Signature image upload karo!','⚠️');return;}
      const imgAB=await readAB(imgFile);
      let pdfImg;
      if(imgFile.type==='image/jpeg')pdfImg=await pdf.embedJpg(imgAB);
      else pdfImg=await pdf.embedPng(imgAB);
      const dim=pdfImg.scale(sigSize/pdfImg.width);
      page.drawImage(pdfImg,{x:sx,y:sy,width:dim.width,height:dim.height});
    }
    const bytes=await pdf.save();
    const blob=new Blob([bytes],{type:'application/pdf'});
    document.getElementById('sign-download').onclick=()=>dlBlob(blob,'signed.pdf');
    showResult('sign');
    toast('PDF signed!','✅');
  }catch(e){toast('Error: '+e.message,'❌');}
}

// ══════════════════════════════════════════════════════
// ANNOTATE PDF
// ══════════════════════════════════════════════════════
async function annotatePDF(){
  if(!state.annotateFile){toast('Pehle PDF upload karo!','⚠️');return;}
  try{
    const ab=await readAB(state.annotateFile);
    const pdf=await PDFLib.PDFDocument.load(ab,{ignoreEncryption:true});
    const font=await pdf.embedFont(PDFLib.StandardFonts.Helvetica);
    const pages=pdf.getPages();
    const pageNum=clamp(parseInt(document.getElementById('ann-page').value)||1,1,pages.length);
    const page=pages[pageNum-1];
    const {width,height}=page.getSize();
    const text=(document.getElementById('ann-text').value||'Annotation').trim() || 'Annotation';
    const colorHex=document.getElementById('ann-color').value;
    const {r,g,b}=hexToRgb(colorHex);
    const yPercent=clamp(parseFloat(document.getElementById('ann-y-pos').value)||50,0,100)/100;
    const yPos=height*(1-yPercent);
    const type=state.annType;
    const lines=wrapTextLines(text,44);
    if(type==='textbox'||type==='comment'){
      const fontSize=11;
      const padding=8;
      const lineHeight=fontSize+3;
      const boxWidth=Math.min(Math.max(...lines.map(line=>font.widthOfTextAtSize(line,fontSize)),80)+padding*2,width-60);
      const boxHeight=Math.max(32,lines.length*lineHeight+padding*2-3);
      const boxY=clamp(yPos-boxHeight/2,12,height-boxHeight-12);
      page.drawRectangle({x:30,y:boxY,width:boxWidth,height:boxHeight,color:PDFLib.rgb(r,g,b),opacity:type==='comment'?0.2:0.25,borderColor:PDFLib.rgb(r,g,b),borderWidth:1});
      lines.forEach((line,idx)=>{
        const textY=boxY+boxHeight-padding-fontSize-(idx*lineHeight)+fontSize;
        page.drawText(line,{x:38,y:clamp(textY,18,height-18),size:fontSize,font,color:PDFLib.rgb(0.1,0.1,0.1)});
      });
    } else if(type==='highlight'){
      const bandHeight=Math.max(20,lines.length*14);
      const bandY=clamp(yPos-bandHeight/2,12,height-bandHeight-12);
      page.drawRectangle({x:30,y:bandY,width:width-60,height:bandHeight,color:PDFLib.rgb(r,g,b),opacity:0.45});
      lines.slice(0,3).forEach((line,idx)=>{
        page.drawText(line,{x:38,y:clamp(bandY+bandHeight-14-(idx*14),18,height-18),size:11,font,color:PDFLib.rgb(0.1,0.1,0.1)});
      });
    } else if(type==='underline'){
      const line=lines[0];
      const tw=font.widthOfTextAtSize(line,12);
      const textY=clamp(yPos,18,height-18);
      page.drawText(line,{x:30,y:textY,size:12,font,color:PDFLib.rgb(0.1,0.1,0.1)});
      page.drawLine({start:{x:30,y:textY-2},end:{x:30+tw,y:textY-2},thickness:1.5,color:PDFLib.rgb(r,g,b)});
    } else if(type==='strike'){
      const line=lines[0];
      const tw=font.widthOfTextAtSize(line,12);
      const textY=clamp(yPos,18,height-18);
      page.drawText(line,{x:30,y:textY,size:12,font,color:PDFLib.rgb(0.1,0.1,0.1)});
      page.drawLine({start:{x:30,y:textY+6},end:{x:30+tw,y:textY+6},thickness:1.5,color:PDFLib.rgb(r,g,b)});
    }
    const bytes=await pdf.save();
    const blob=new Blob([bytes],{type:'application/pdf'});
    document.getElementById('annotate-download').onclick=()=>dlBlob(blob,'annotated.pdf');
    showResult('annotate',`${type} annotation added on page ${pageNum}`);
    toast('Annotation added!','✅');
  }catch(e){toast('Error: '+e.message,'❌');}
}

// ══════════════════════════════════════════════════════
// REDACT PDF
// ══════════════════════════════════════════════════════
async function redactPDF(){
  if(!state.redactFile){toast('Pehle PDF upload karo!','⚠️');return;}
  const wordsRaw=document.getElementById('redact-words').value.trim();
  if(!wordsRaw){toast('Redact karne wale words enter karo!','⚠️');return;}
  const words=wordsRaw.split('\n').map(w=>w.trim()).filter(w=>w.length>0);
  const caseSensitive=document.getElementById('redact-case').checked;
  const colorHex=document.getElementById('redact-color').value;
  const {r,g,b}=hexToRgb(colorHex);
  try{
    const ab=await readAB(state.redactFile);
    const pdf=await PDFLib.PDFDocument.load(ab,{ignoreEncryption:true});
    const pdfjs=await pdfjsLib.getDocument({data:ab.slice()}).promise;
    const pages=pdf.getPages();
    let totalRedactions=0;
    for(let pi=0;pi<pages.length;pi++){
      const page=pages[pi];
      const {width,height}=page.getSize();
      const pjsPage=await pdfjs.getPage(pi+1);
      const content=await pjsPage.getTextContent();
      for(const item of content.items){
        const itemText=item.str;
        for(const word of words){
          const matches=caseSensitive?itemText.includes(word):itemText.toLowerCase().includes(word.toLowerCase());
          if(matches&&itemText.trim().length>0){
            const vp=pjsPage.getViewport({scale:1});
            const[x1,y1,x2,y2]=item.transform?[item.transform[4],item.transform[5],item.transform[4]+item.width,item.transform[5]+item.height]:[0,0,100,20];
            const pdfY=height-(y1*height/vp.height)-12;
            const bw=Math.max((item.width||50)*width/vp.width,40);
            page.drawRectangle({x:Math.max(0,x1*width/vp.width-2),y:Math.max(0,pdfY-2),width:bw+4,height:16,color:PDFLib.rgb(r,g,b)});
            totalRedactions++;
          }
        }
      }
    }
    const bytes=await pdf.save();
    const blob=new Blob([bytes],{type:'application/pdf'});
    document.getElementById('redact-download').onclick=()=>dlBlob(blob,'redacted.pdf');
    showResult('redact',`${totalRedactions} areas redacted across ${pages.length} pages`);
    toast(`${totalRedactions} areas redacted!`,'✅');
  }catch(e){toast('Error: '+e.message,'❌');}
}

// ══════════════════════════════════════════════════════
// PDF INSPECTOR
// ══════════════════════════════════════════════════════
async function inspectPDF(input){
  const file=input.files[0]; if(!file) return;
  try{
    await renderToolPdfPreview('inspect',file,4);
    const ab=await readAB(file);
    const pdf=await PDFLib.PDFDocument.load(ab,{ignoreEncryption:true});
    const pageCount=pdf.getPageCount();
    const pages=pdf.getPages();
    const{width,height}=pages[0].getSize();
    document.getElementById('inspect-stats').innerHTML=`
      <div class="stat-card"><div class="st-val">${pageCount}</div><div class="st-label">Total Pages</div></div>
      <div class="stat-card"><div class="st-val">${fmtSize(file.size)}</div><div class="st-label">File Size</div></div>
      <div class="stat-card"><div class="st-val">${Math.round(width)}×${Math.round(height)}</div><div class="st-label">Page Size (pt)</div></div>
      <div class="stat-card"><div class="st-val">${pdf.isEncrypted?'🔐 Yes':'🔓 No'}</div><div class="st-label">Encrypted</div></div>`;
    const rows=[
      ['Title',pdf.getTitle()||'—'],['Author',pdf.getAuthor()||'—'],['Subject',pdf.getSubject()||'—'],
      ['Creator',pdf.getCreator()||'—'],['Producer',pdf.getProducer()||'—'],
      ['Created',pdf.getCreationDate()?pdf.getCreationDate().toLocaleString():'—'],
      ['Modified',pdf.getModificationDate()?pdf.getModificationDate().toLocaleString():'—'],
      ['Page Size (mm)',`${Math.round(width*0.353)} × ${Math.round(height*0.353)} mm`],
      ['Page Size (in)',`${(width/72).toFixed(1)} × ${(height/72).toFixed(1)} inches`],
      ['Filename',file.name],['File Type',file.type||'application/pdf'],
    ];
    document.getElementById('inspect-details').innerHTML=rows.map(([k,v])=>`<tr><td>${k}</td><td>${v}</td></tr>`).join('');
    const pgGrid=document.getElementById('inspect-pages'); pgGrid.innerHTML='';
    pages.forEach((p,i)=>{
      const{width:w,height:h}=p.getSize();
      pgGrid.innerHTML+=`<div class="stat-card" style="min-width:100px;text-align:center"><div class="st-val" style="font-size:0.9rem">P${i+1}</div><div class="st-label">${Math.round(w)}×${Math.round(h)}pt</div></div>`;
    });
    document.getElementById('inspect-result').style.display='block';
    toast('PDF analyzed!','🔍');
  }catch(e){toast('Error: '+e.message,'❌');}
}

// ══════════════════════════════════════════════════════
// PDF PREVIEW
// ══════════════════════════════════════════════════════
async function previewPDF(input){
  const file=input.files[0]; if(!file) return;
  try{
    await renderToolPdfPreview('preview',file,4);
    const ab=await readAB(file);
    state.previewDoc=await pdfjsLib.getDocument({data:ab}).promise;
    state.previewTotal=state.previewDoc.numPages;
    state.previewPage=1;
    document.getElementById('preview-total').textContent=state.previewTotal;
    document.getElementById('preview-controls').style.display='block';
    await renderPreviewPage();
    toast(`Preview ready — ${state.previewTotal} pages`,'👀');
  }catch(e){toast('Error: '+e.message,'❌');}
}
async function renderPreviewPage(){
  if(!state.previewDoc) return;
  document.getElementById('preview-cur').textContent=state.previewPage;
  const page=await state.previewDoc.getPage(state.previewPage);
  const vp=page.getViewport({scale:getPreviewRenderScale(1.5,'text')});
  const canvas=document.getElementById('preview-canvas');
  canvas.width=vp.width;canvas.height=vp.height;
  canvas.style.maxWidth='100%';
  await page.render({canvasContext:canvas.getContext('2d'),viewport:vp}).promise;
}
function prevPage(){if(state.previewPage>1){state.previewPage--;renderPreviewPage();}}
function nextPage(){if(state.previewPage<state.previewTotal){state.previewPage++;renderPreviewPage();}}

// ══════════════════════════════════════════════════════
// COMPARE PDFs
// ══════════════════════════════════════════════════════
async function loadCompare(input,num){
  const file=input.files[0]; if(!file) return;
  try{
    const ab=await readAB(file);
    const pdf=await PDFLib.PDFDocument.load(ab,{ignoreEncryption:true});
    const pages=pdf.getPages();
    const{width,height}=pages[0].getSize();
    state.compareData[num-1]={name:file.name,size:file.size,pages:pages.length,width,height,title:pdf.getTitle()||'—',author:pdf.getAuthor()||'—',encrypted:pdf.isEncrypted};
    document.getElementById('compare'+num+'-info').style.display='block';
    document.getElementById('compare'+num+'-info').innerHTML=`
      <div class="stat-card"><div class="st-val">${pages.length}</div><div class="st-label">Pages</div></div>
      <div class="stat-card"><div class="st-val">${fmtSize(file.size)}</div><div class="st-label">Size</div></div>`;
    if(state.compareData[0]&&state.compareData[1]) showComparison();
    toast(`PDF #${num} loaded`,'📄');
  }catch(e){toast('Error: '+e.message,'❌');}
}
function showComparison(){
  const [a,b]=state.compareData;
  const rows=[
    ['Filename',a.name,b.name],
    ['File Size',fmtSize(a.size),fmtSize(b.size)],
    ['Page Count',a.pages,b.pages],
    ['Page Size',`${Math.round(a.width)}×${Math.round(a.height)}pt`,`${Math.round(b.width)}×${Math.round(b.height)}pt`],
    ['Title',a.title,b.title],['Author',a.author,b.author],
    ['Encrypted',a.encrypted?'Yes':'No',b.encrypted?'Yes':'No'],
  ];
  document.getElementById('compare-table').innerHTML=`<table style="width:100%;border-collapse:collapse">
    <tr style="border-bottom:2px solid var(--border)">
      <th style="padding:0.7rem;text-align:left;color:var(--text2);font-weight:500;font-size:0.82rem">Property</th>
      <th style="padding:0.7rem;text-align:left;color:var(--accent);font-size:0.82rem">📄 PDF #1</th>
      <th style="padding:0.7rem;text-align:left;color:var(--accent2);font-size:0.82rem">📄 PDF #2</th>
    </tr>
    ${rows.map(([k,v1,v2])=>`<tr style="border-bottom:1px solid var(--border)">
      <td style="padding:0.7rem;color:var(--text2);font-size:0.82rem">${k}</td>
      <td style="padding:0.7rem;font-size:0.82rem;${v1!==v2?'color:var(--accent3)':''}">${v1}</td>
      <td style="padding:0.7rem;font-size:0.82rem;${v1!==v2?'color:var(--accent3)':''}">${v2}</td>
    </tr>`).join('')}
  </table>`;
  document.getElementById('compare-result').style.display='block';
}

// ══════════════════════════════════════════════════════
// REPAIR PDF
// ══════════════════════════════════════════════════════
async function repairPDF(input){
  const file=input.files[0]; if(!file) return;
  const prog=document.getElementById('repair-progress'); prog.style.display='block';
  const fill=document.getElementById('repair-fill');
  try{
    await renderToolPdfPreview('repair',file,4);
    fill.style.width='30%';
    const ab=await readAB(file);
    fill.style.width='60%';
    const pdf=await PDFLib.PDFDocument.load(ab,{ignoreEncryption:true,throwOnInvalidObject:false});
    fill.style.width='85%';
    const bytes=await pdf.save({useObjectStreams:false});
    fill.style.width='100%';
    const blob=new Blob([bytes],{type:'application/pdf'});
    const savings=file.size-blob.size;
    document.getElementById('repair-download').onclick=()=>dlBlob(blob,'repaired.pdf');
    showResult('repair',`${pdf.getPageCount()} pages recovered, ${fmtSize(blob.size)} (${savings>0?fmtSize(savings)+' cleaned':' similar size'})`);
    prog.style.display='none';
    toast('PDF repaired!','✅');
  }catch(e){prog.style.display='none';toast('Could not repair: '+e.message,'❌');}
}



window.addEventListener('resize',()=>{
  document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
});



