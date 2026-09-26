import { firebaseConfig, cloudinaryConfig } from './config.js';
const $ = id => document.getElementById(id);
const MAX_FILE = 5 * 1024 * 1024;
let db, sdk, unsubscribe, nickname = '', busy = false, file = null, previewURL = null, uploaded = null;
let avatarUrl = saved('moyeo.avatar'), avatarFile = null, avatarPreviewURL = null, profileBusy = false;
let connected = false, lastSend = 0, pendingRef = null;
function saved(key, fallback='') { try { return localStorage.getItem(key) || fallback; } catch { return fallback; } }
function save(key, value) { try { localStorage.setItem(key,value); } catch {} }
const senderId = saved('moyeo.sender', crypto.randomUUID());
save('moyeo.sender', senderId);
$('nickname').value = saved('moyeo.nickname');
function status(message, error=false) { $('status').textContent=message; $('status').classList.toggle('error',error); }
function safeImage(url) {
  try { const u=new URL(url); return u.protocol==='https:' && u.hostname==='res.cloudinary.com' && u.pathname.startsWith(`/${cloudinaryConfig.cloudName}/image/upload/`) && !u.username && !u.password && !u.port; } catch { return false; }
}
function avatarNode(url, name) {
  const wrap=document.createElement('div'); wrap.className='avatar';
  const fallback=document.createElement('span'); fallback.textContent=Array.from(name || '?')[0]; wrap.append(fallback);
  if(url && (url===avatarPreviewURL || safeImage(url))) {
    const img=document.createElement('img'); img.src=url; img.alt=`${name || '내'} 프로필 사진`; img.referrerPolicy='no-referrer';
    img.onerror=()=>{img.hidden=true;}; wrap.append(img);
  }
  return wrap;
}
function previewAvatar() { $('avatar-preview').replaceChildren(avatarNode(avatarPreviewURL || avatarUrl, $('nickname').value)); }
function clearAvatarSelection() { if(avatarPreviewURL)URL.revokeObjectURL(avatarPreviewURL); avatarPreviewURL=null; avatarFile=null; $('avatar-file').value=''; }
if(!safeImage(avatarUrl))avatarUrl='';
previewAvatar();
$('nickname').addEventListener('input',previewAvatar);
$('avatar-file').addEventListener('change',()=>{
  const next=$('avatar-file').files[0]; if(!next)return;
  if(!['image/jpeg','image/png','image/webp'].includes(next.type) || !next.size || next.size>MAX_FILE) {
    $('avatar-file').value=''; status('프로필 사진은 JPG, PNG, WebP 형식의 5MB 이하 파일을 선택해 주세요.',true); return;
  }
  clearAvatarSelection(); avatarFile=next; avatarPreviewURL=URL.createObjectURL(next); previewAvatar();
});
$('avatar-remove').onclick=()=>{clearAvatarSelection(); avatarUrl=''; previewAvatar();};
function controls() { $('send').disabled=busy || !connected || !navigator.onLine; $('photo').disabled=busy; $('text').disabled=busy; $('remove').disabled=busy; $('rename').disabled=busy; }
function clearPhoto() { if(previewURL) URL.revokeObjectURL(previewURL); previewURL=null; file=null; uploaded=null; $('photo').value=''; $('attachment').hidden=true; $('preview').removeAttribute('src'); }
$('photo').addEventListener('change',()=>{
  const next=$('photo').files[0]; if(!next)return;
  clearPhoto();
  if(!['image/jpeg','image/png','image/webp'].includes(next.type) || next.size>MAX_FILE || next.size===0) { status('JPG, PNG, WebP 사진을 5MB 이하로 선택해 주세요.',true); return; }
  file=next; previewURL=URL.createObjectURL(file); $('preview').src=previewURL; $('filename').textContent=file.name; $('attachment').hidden=false;
});
$('remove').onclick=clearPhoto;
$('close-viewer').onclick=()=>{ $('viewer').close(); $('full-image').removeAttribute('src'); };
$('latest').onclick=()=>{ $('messages').scrollTop=$('messages').scrollHeight; $('latest').hidden=true; };
$('messages').addEventListener('scroll',()=>{ const m=$('messages'); if(m.scrollHeight-m.scrollTop-m.clientHeight<100)$('latest').hidden=true; });
function render(snapshot) {
  const box=$('messages'), bottom=box.scrollHeight-box.scrollTop-box.clientHeight<100, initial=!box.dataset.loaded;
  const oldHeight=box.scrollHeight, oldTop=box.scrollTop;
  const fragment=document.createDocumentFragment();
  if(snapshot.empty) { const empty=document.createElement('p'); empty.className='empty'; empty.textContent='아직 조용한 채팅방이에요.\n첫 인사를 남겨 보세요 👋'; fragment.append(empty); }
  snapshot.docs.slice().reverse().forEach(doc=>{
    const data=doc.data({serverTimestamps:'estimate'}), row=document.createElement('article');
    row.className='message'+(data.senderId===senderId?' mine':'');
    const meta=document.createElement('div');meta.className='meta';
    const name=document.createElement('strong'); name.textContent=typeof data.nickname==='string'?data.nickname:'알 수 없음';
    const time=document.createElement('time'); const date=data.createdAt?.toDate?.();
    time.textContent=doc.metadata.hasPendingWrites?'전송 중…':date?new Intl.DateTimeFormat('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(date):'시간 확인 중';
    if(date)time.dateTime=date.toISOString(); meta.append(name,time);
    const bubble=document.createElement('div');bubble.className='bubble';
    if(data.imageUrl && safeImage(data.imageUrl)) {
      const button=document.createElement('button');button.type='button';button.className='photo-open';button.setAttribute('aria-label',`${data.nickname}님 사진 크게 보기`);
      const img=document.createElement('img');img.src=data.imageUrl;img.alt='공유한 사진';img.className='message-photo';img.loading='lazy';img.referrerPolicy='no-referrer';
      img.onload=()=>{if(bottom)box.scrollTop=box.scrollHeight;};
      img.onerror=()=>{img.alt='사진을 불러올 수 없어요';};
      button.append(img);button.onclick=()=>{$('full-image').src=data.imageUrl;$('viewer').showModal();};bubble.append(button);
    }
    if(data.text){const body=document.createElement('p');body.className='body';body.textContent=data.text;bubble.append(body);}
    const content=document.createElement('div');content.className='message-content';content.append(meta,bubble);
    row.append(avatarNode(data.avatarUrl,data.nickname),content);fragment.append(row);
  });
  box.replaceChildren(fragment);box.dataset.loaded='true';
  if(bottom||initial)box.scrollTop=box.scrollHeight;
  else {box.scrollTop=Math.max(0,oldTop+Math.min(0,box.scrollHeight-oldHeight));$('latest').hidden=false;}
}
function listen() {
  unsubscribe?.(); connected=false; controls(); status('최근 대화를 불러오는 중…');
  const q=sdk.query(sdk.collection(db,'rooms','public','messages'),sdk.orderBy('createdAt','desc'),sdk.limit(100));
  unsubscribe=sdk.onSnapshot(q,{includeMetadataChanges:true},snapshot=>{
    render(snapshot); connected=!snapshot.metadata.fromCache; controls();
    status(connected?`${nickname}님으로 참여 중 · 실시간 연결됨`:'서버 연결 확인 중 · 인터넷 연결을 확인해 주세요.');
  },error=>{connected=false;controls();status(friendly(error)+' 새로고침 후 다시 입장해 주세요.',true);});
}
function friendly(error) {
  if(error.code==='permission-denied')return '접근이 거부됐어요. Firestore 규칙과 Cloudinary 이름 설정을 확인해 주세요.';
  if(error.code==='resource-exhausted')return '무료 사용량 한도에 도달했어요. Firebase 사용량을 확인해 주세요.';
  if(error.name==='AbortError')return '사진 업로드 시간이 초과됐어요. 다시 시도해 주세요.';
  return error.message || '연결에 실패했어요. 인터넷과 설정을 확인해 주세요.';
}
$('join-form').addEventListener('submit',async event=>{
  event.preventDefault(); const value=$('nickname').value.trim(); if(profileBusy || !sdk || !value || value.length>20)return;
  profileBusy=true;
  for(const id of ['join-button','nickname','avatar-file','avatar-remove'])$(id).disabled=true;
  try {
    if(avatarFile){status('프로필 사진을 올리고 있어요…');avatarUrl=await uploadImage(avatarFile);clearAvatarSelection();}
    nickname=value;save('moyeo.nickname',value);save('moyeo.avatar',avatarUrl);previewAvatar();
    $('join').hidden=true;$('chat').hidden=false;$('rename').hidden=false;listen();$('text').focus();
  } catch(error){status(friendly(error)+' 프로필 사진을 다시 선택하거나 재시도해 주세요.',true);}
  finally{profileBusy=false;for(const id of ['join-button','nickname','avatar-file','avatar-remove'])$(id).disabled=false;}
});
$('rename').onclick=()=>{unsubscribe?.();connected=false;$('chat').hidden=true;$('join').hidden=false;$('rename').hidden=true;$('nickname').focus();status('닉네임이나 프로필 사진을 변경해 주세요.');};
$('text').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing&&e.keyCode!==229){e.preventDefault();$('composer').requestSubmit();}});
async function uploadPhoto() {
  if(!uploaded)uploaded=await uploadImage(file);
  return uploaded;
}
async function uploadImage(selectedFile) {
  const form=new FormData();form.append('file',selectedFile);form.append('upload_preset',cloudinaryConfig.uploadPreset);
  const controller=new AbortController(), timeout=setTimeout(()=>controller.abort(),60000);
  try {
    const response=await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudinaryConfig.cloudName)}/image/upload`,{method:'POST',body:form,signal:controller.signal});
    const result=await response.json();
    if(!response.ok)throw new Error('사진 업로드 실패: '+(result.error?.message||response.status));
    if(!safeImage(result.secure_url))throw new Error('사진 서버가 올바르지 않은 주소를 반환했어요.');
    return result.secure_url;
  } finally {clearTimeout(timeout);}
}
$('composer').addEventListener('submit',async event=>{
  event.preventDefault(); const text=$('text').value.trim();
  if(busy||!connected||!navigator.onLine)return;
  if(!text&&!file)return;
  if(text.length>2000){status('메시지는 2,000자까지 보낼 수 있어요.',true);return;}
  if(Date.now()-lastSend<1500){status('잠깐 기다린 뒤 보내 주세요.');return;}
  busy=true;controls();
  try {
    status(file?'사진을 올리고 있어요…':'메시지를 보내고 있어요…');
    const imageUrl=file?await uploadPhoto():'';
    pendingRef=sdk.doc(sdk.collection(db,'rooms','public','messages'));
    // 서버 승인을 기다립니다. 오프라인 큐를 중복 재전송하지 않습니다.
    await sdk.setDoc(pendingRef,{nickname,senderId,text,imageUrl,avatarUrl,createdAt:sdk.serverTimestamp()});
    pendingRef=null;lastSend=Date.now();$('text').value='';clearPhoto();$('messages').scrollTop=$('messages').scrollHeight;status('전송했어요.');
  } catch(error) { pendingRef=null;status(friendly(error)+' 입력과 사진은 유지돼요.',true); }
  finally {busy=false;controls();$('text').focus();}
});
window.addEventListener('offline',()=>{status(busy?'연결이 끊겼어요. 전송 승인 대기 중입니다. 이 페이지를 유지해 주세요.':'오프라인이에요. 다시 연결되면 대화가 이어져요.',true);controls();});
window.addEventListener('online',()=>{status('연결을 다시 확인하고 있어요…');controls();});
window.addEventListener('beforeunload',event=>{if(busy || profileBusy){event.preventDefault();event.returnValue='';}});
async function boot() {
  $('join-button').disabled=true;
  const values=[firebaseConfig.apiKey,firebaseConfig.projectId,firebaseConfig.appId,cloudinaryConfig.cloudName,cloudinaryConfig.uploadPreset];
  if(values.some(v=>!v||v.startsWith('YOUR_'))){status('설정이 필요해요. README 순서대로 config.js의 Firebase와 Cloudinary 값을 입력해 주세요.',true);return;}
  try {
    const [app,firestore]=await Promise.all([import('https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js'),import('https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js')]);
    sdk=firestore;db=sdk.getFirestore(app.initializeApp(firebaseConfig));$('join-button').disabled=false;status('준비됐어요. 닉네임을 입력하고 참여하세요.');
  } catch(error){status('앱을 불러오지 못했어요. 설정, 인터넷 연결, 광고 차단 확장 기능을 확인해 주세요. '+friendly(error),true);}
}
boot();
