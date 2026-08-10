const STORE_KEY='foodtrack69_ai_v2';
const DB_NAME='FoodTrack69Photos';
const DB_STORE='bodyPhotos';
const defaults={
  settings:{height:172,currentWeight:68,targetWeight:69,weeklyGain:0.10,kcal:2500,p:130,f:60,c:330},
  meals:{},weights:[],training:{},advice:{}
};
let state=loadState();
let mealImageData=null;
let bodyImageBlob=null;
let currentAnalysis=null;

const $=id=>document.getElementById(id);
const dateKey=()=>new Date().toISOString().slice(0,10);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const fmt=(n,d=0)=>Number(n||0).toFixed(d);
function loadState(){try{const s=JSON.parse(localStorage.getItem(STORE_KEY)||'{}');return {...structuredClone(defaults),...s,settings:{...defaults.settings,...(s.settings||{})},meals:s.meals||{},weights:s.weights||[],training:s.training||{},advice:s.advice||{}}}catch{return structuredClone(defaults)}}
function saveState(){localStorage.setItem(STORE_KEY,JSON.stringify(state))}
function showToast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1800)}
function loading(on,text='AIが分析中...'){$('loadingText').textContent=text;$('loading').classList.toggle('hidden',!on)}

function gotoView(name){document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id===`view-${name}`));document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.view===name));window.scrollTo({top:0,behavior:'smooth'});if(name==='body')renderGallery();if(name==='history')renderHistory();}
document.querySelectorAll('.nav-btn').forEach(b=>b.onclick=()=>gotoView(b.dataset.view));
document.querySelectorAll('[data-goto]').forEach(b=>b.onclick=()=>gotoView(b.dataset.goto));

function mealsFor(d=dateKey()){return state.meals[d]||[]}
function totalsFor(d=dateKey()){return mealsFor(d).reduce((a,m)=>({kcal:a.kcal+(+m.kcal||0),p:a.p+(+m.p||0),f:a.f+(+m.f||0),c:a.c+(+m.c||0)}),{kcal:0,p:0,f:0,c:0})}
function bar(id,val,goal){$(id).style.width=`${Math.max(0,Math.min(100,val/goal*100))}%`}
function recentWeightAverage(days,offset=0){const end=new Date();end.setHours(23,59,59,999);end.setDate(end.getDate()-offset);const start=new Date(end);start.setDate(start.getDate()-days+1);start.setHours(0,0,0,0);const vals=state.weights.filter(x=>{const d=new Date(x.date+'T12:00:00');return d>=start&&d<=end}).map(x=>x.weight);return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null}
function weightTrend(){const a=recentWeightAverage(7,0),b=recentWeightAverage(7,7);if(a==null||b==null)return null;return {current:a,previous:b,diff:a-b}}

function renderHome(){
 const d=dateKey(),t=totalsFor(d),s=state.settings;
 $('todayLabel').textContent=new Date().toLocaleDateString('ja-JP',{month:'long',day:'numeric',weekday:'short'});
 $('trainingType').value=state.training[d]||'Rest';
 [['homeKcal',Math.round(t.kcal)],['homeP',`${fmt(t.p)}g`],['homeF',`${fmt(t.f)}g`],['homeC',`${fmt(t.c)}g`]].forEach(([id,v])=>$(id).textContent=v);
 $('homeKcalGoal').textContent=`/ ${s.kcal}`;$('homePGoal').textContent=`/ ${s.p}g`;$('homeFGoal').textContent=`/ ${s.f}g`;$('homeCGoal').textContent=`/ ${s.c}g`;
 bar('barKcal',t.kcal,s.kcal);bar('barP',t.p,s.p);bar('barF',t.f,s.f);bar('barC',t.c,s.c);
 const meals=mealsFor(d);$('todayMeals').innerHTML=meals.length?meals.map((m,i)=>`<div class="meal-row"><div><div class="meal-name">${esc(m.type)}｜${esc(m.name)}</div><div class="meal-meta">P ${fmt(m.p)} / F ${fmt(m.f)} / C ${fmt(m.c)} g${m.ai?' ・ AI推定':''}</div></div><div><div class="meal-kcal">${Math.round(m.kcal)} kcal</div><button class="link-btn" onclick="deleteMeal('${d}',${i})">削除</button></div></div>`).join(''):'<div class="list-empty">まだ食事記録がありません。</div>';
 const ws=[...state.weights].sort((a,b)=>a.date.localeCompare(b.date)),latest=ws.at(-1),avg7=recentWeightAverage(7);$('latestWeight').textContent=latest?`${latest.weight.toFixed(1)} kg`:'--';$('avg7Weight').textContent=avg7?`${avg7.toFixed(2)} kg`:'--';$('targetWeight').textContent=`${s.targetWeight.toFixed(1)} kg`;
 const tr=weightTrend();$('weightTrendNote').textContent=tr?trendMessage(tr):'14日ほど記録すると増量ペースを判定します。';
 const adv=state.advice[d];if(adv){$('coachAdvice').textContent=adv.summary;$('coachSuggestions').innerHTML=(adv.suggestions||[]).map(x=>`<span class="suggestion">${esc(x)}</span>`).join('')}else{$('coachAdvice').textContent='食事を記録すると、目標・今日のPFC・体重推移に合わせてアドバイスします。';$('coachSuggestions').innerHTML=''}
}
window.deleteMeal=(d,i)=>{state.meals[d].splice(i,1);saveState();renderAll();showToast('食事を削除しました')}
function trendMessage(tr){const target=state.settings.weeklyGain;if(tr.diff<0.02)return '7日平均はほぼ横ばい。これが2〜3週間続くなら+100〜150kcalを検討。';if(tr.diff>target+0.15)return `7日平均が前週比 +${tr.diff.toFixed(2)}kg。目標より速めなので増やしすぎに注意。`;return `7日平均が前週比 ${tr.diff>=0?'+':''}${tr.diff.toFixed(2)}kg。現在のペースを継続候補。`}
$('trainingType').onchange=e=>{state.training[dateKey()]=e.target.value;saveState();renderHome()}

$('mealCameraBtn').onclick=()=>$('mealPhotoInput').click();
$('mealPhotoInput').onchange=async e=>{const f=e.target.files[0];if(!f)return;mealImageData=await compressImage(f,1280,.82);$('mealPreview').src=mealImageData;$('mealPreview').classList.remove('hidden');$('analyzeMealBtn').disabled=false;}
async function compressImage(file,maxSide=1280,quality=.82){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>{const img=new Image();img.onload=()=>{let w=img.width,h=img.height;const scale=Math.min(1,maxSide/Math.max(w,h));w=Math.round(w*scale);h=Math.round(h*scale);const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);resolve(c.toDataURL('image/jpeg',quality))};img.onerror=reject;img.src=r.result};r.onerror=reject;r.readAsDataURL(file)})}
$('analyzeMealBtn').onclick=async()=>{
 if(!mealImageData)return;
 loading(true,'食事写真から料理とPFCを推定中...');
 try{
   const res=await fetch('/api/analyze-meal',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image:mealImageData,mealType:$('mealType').value,note:$('mealNote').value,profile:state.settings,today:totalsFor(),training:state.training[dateKey()]||'Rest'})});
   const data=await res.json();if(!res.ok)throw new Error(data.error||'分析に失敗しました');
   currentAnalysis=data;$('analysisCard').classList.remove('hidden');$('analysisTitle').textContent=data.meal_name||'分析結果';$('analysisConfidence').textContent=`信頼度 ${data.confidence||'medium'}`;
   $('detectedFoods').innerHTML=(data.items||[]).map(x=>`<span class="food-chip">${esc(x.name)} ${esc(x.estimated_amount||'')}</span>`).join('');
   $('resultKcal').value=Math.round(data.total_kcal||0);$('resultP').value=fmt(data.protein_g,1);$('resultF').value=fmt(data.fat_g,1);$('resultC').value=fmt(data.carbs_g,1);$('analysisNote').value=data.estimate_note||'';$('mealAdvice').textContent=data.meal_advice||'';
   $('analysisCard').scrollIntoView({behavior:'smooth',block:'start'});
 }catch(err){showToast(err.message)}finally{loading(false)}
}
$('saveAnalyzedMeal').onclick=()=>{
 const d=dateKey();if(!state.meals[d])state.meals[d]=[];state.meals[d].push({type:$('mealType').value,name:currentAnalysis?.meal_name||'写真から登録',kcal:+$('resultKcal').value||0,p:+$('resultP').value||0,f:+$('resultF').value||0,c:+$('resultC').value||0,note:$('analysisNote').value,ai:true,createdAt:Date.now()});saveState();resetMealCapture();renderAll();gotoView('home');showToast('食事を保存しました');
}
function resetMealCapture(){mealImageData=null;currentAnalysis=null;$('mealPhotoInput').value='';$('mealPreview').src='';$('mealPreview').classList.add('hidden');$('analysisCard').classList.add('hidden');$('analyzeMealBtn').disabled=true;$('mealNote').value=''}
$('saveManualMeal').onclick=()=>{const d=dateKey();if(!state.meals[d])state.meals[d]=[];state.meals[d].push({type:$('mealType').value,name:$('manualName').value||'手入力',kcal:+$('manualKcal').value||0,p:+$('manualP').value||0,f:+$('manualF').value||0,c:+$('manualC').value||0,ai:false,createdAt:Date.now()});saveState();['manualName','manualKcal','manualP','manualF','manualC'].forEach(id=>$(id).value='');renderAll();gotoView('home');showToast('食事を保存しました')}

$('refreshAdvice').onclick=async()=>{
 loading(true,'今日の食事と目標からアドバイス作成中...');
 try{const tr=weightTrend();const payload={profile:state.settings,today:totalsFor(),meals:mealsFor(),training:state.training[dateKey()]||'Rest',weightTrend:tr,recentWeights:[...state.weights].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,14)};const res=await fetch('/api/advice',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const data=await res.json();if(!res.ok)throw new Error(data.error||'AIアドバイスに失敗しました');state.advice[dateKey()]=data;saveState();renderHome()}catch(err){showToast(err.message)}finally{loading(false)}}

$('saveBodyNumbers').onclick=()=>{const weight=+$('weightInput').value,waist=+$('waistInput').value||null;if(!weight)return showToast('体重を入力してください');const d=dateKey(),idx=state.weights.findIndex(x=>x.date===d),rec={date:d,weight,waist};if(idx>=0)state.weights[idx]=rec;else state.weights.push(rec);state.settings.currentWeight=weight;saveState();$('weightInput').value='';$('waistInput').value='';renderAll();showToast('身体データを保存しました')}
$('bodyCameraBtn').onclick=()=>$('bodyPhotoInput').click();
$('bodyPhotoInput').onchange=e=>{const f=e.target.files[0];if(!f)return;bodyImageBlob=f;$('bodyPreview').src=URL.createObjectURL(f);$('bodyPreview').classList.remove('hidden');$('saveBodyPhoto').classList.remove('hidden')}
$('saveBodyPhoto').onclick=async()=>{if(!bodyImageBlob)return;const dataUrl=await compressImage(bodyImageBlob,1400,.82);await idbAdd({date:dateKey(),pose:$('bodyPose').value,flex:$('bodyFlex').value,dataUrl,createdAt:Date.now()});bodyImageBlob=null;$('bodyPhotoInput').value='';$('bodyPreview').classList.add('hidden');$('saveBodyPhoto').classList.add('hidden');renderGallery();showToast('進捗写真を端末内に保存しました')}
$('galleryFilter').onchange=renderGallery;
function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(DB_STORE))db.createObjectStore(DB_STORE,{keyPath:'id',autoIncrement:true})};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function idbAdd(x){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readwrite');tx.objectStore(DB_STORE).add(x);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}
async function idbAll(){const db=await openDB();return new Promise((resolve,reject)=>{const r=db.transaction(DB_STORE).objectStore(DB_STORE).getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function idbDelete(id){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readwrite');tx.objectStore(DB_STORE).delete(id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}
window.removeBodyPhoto=async id=>{if(!confirm('この写真を削除しますか？'))return;await idbDelete(id);renderGallery()}
async function renderGallery(){const el=$('bodyGallery');if(!el)return;let arr=(await idbAll()).sort((a,b)=>b.createdAt-a.createdAt);const f=$('galleryFilter').value;if(f!=='all')arr=arr.filter(x=>x.pose===f);const pose={front:'正面',side:'横',back:'背面'},flex={relaxed:'リラックス',flexed:'力あり'};el.innerHTML=arr.length?arr.map(x=>`<div class="photo-card"><img src="${x.dataUrl}" alt="進捗写真"><button class="photo-delete" onclick="removeBodyPhoto(${x.id})">×</button><div class="photo-tag">${x.date}<br>${pose[x.pose]}・${flex[x.flex]}</div></div>`).join(''):'<div class="list-empty">まだ進捗写真がありません。</div>'}

async function renderHistory(){const mh=$('mealHistory'),bh=$('bodyHistory');const rows=[];Object.keys(state.meals).sort().reverse().slice(0,14).forEach(d=>state.meals[d].slice().reverse().forEach(m=>rows.push({d,m})));mh.innerHTML=rows.length?rows.slice(0,30).map(({d,m})=>`<div class="history-row"><div><div class="meal-name">${d}｜${esc(m.name)}</div><div class="meal-meta">${esc(m.type)} ・ P${fmt(m.p)} F${fmt(m.f)} C${fmt(m.c)}${m.ai?' ・ AI推定':''}</div></div><div class="meal-kcal">${Math.round(m.kcal)} kcal</div></div>`).join(''):'<div class="list-empty">食事履歴なし</div>';const ws=[...state.weights].sort((a,b)=>b.date.localeCompare(a.date));bh.innerHTML=ws.length?ws.slice(0,20).map(x=>`<div class="history-row"><div><div class="meal-name">${x.date}</div><div class="meal-meta">${x.waist?`ウエスト ${x.waist} cm`:''}</div></div><div class="meal-kcal">${x.weight.toFixed(1)} kg</div></div>`).join(''):'<div class="list-empty">身体記録なし</div>'}

function renderSettings(){const s=state.settings;[['setHeight','height'],['setCurrentWeight','currentWeight'],['setTargetWeight','targetWeight'],['setWeeklyGain','weeklyGain'],['setKcal','kcal'],['setP','p'],['setF','f'],['setC','c']].forEach(([id,k])=>$(id).value=s[k])}
$('saveSettings').onclick=()=>{state.settings={height:+$('setHeight').value,currentWeight:+$('setCurrentWeight').value,targetWeight:+$('setTargetWeight').value,weeklyGain:+$('setWeeklyGain').value,kcal:+$('setKcal').value,p:+$('setP').value,f:+$('setF').value,c:+$('setC').value};saveState();renderAll();showToast('設定を保存しました')}
$('exportData').onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`FoodTrack69_${dateKey()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
$('importData').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const x=JSON.parse(await f.text());state={...structuredClone(defaults),...x,settings:{...defaults.settings,...(x.settings||{})}};saveState();renderAll();showToast('バックアップを読み込みました')}catch{showToast('読み込みに失敗しました')}}

function renderAll(){renderHome();renderSettings();}
renderAll();renderGallery();
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));
