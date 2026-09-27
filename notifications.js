import { pushConfig } from './config.js';
const $=id=>document.getElementById(id);
const b64=a=>btoa(String.fromCharCode(...a)).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
const un64=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
function stored(key,generate){try{let s=localStorage.getItem(key);if(!s){s=generate();localStorage.setItem(key,s);}return s;}catch{throw new Error('기기 알림을 사용하려면 브라우저 저장 공간을 허용해 주세요.');}}
let deviceId,token,registration,busy=false,ready=false;
try{deviceId=stored('moyeo.push.device',()=>crypto.randomUUID());token=stored('moyeo.push.token',()=>b64(crypto.getRandomValues(new Uint8Array(32))));}catch{}
export const pushConfigured=()=>typeof pushConfig?.workerUrl==='string'&&/^https:\/\//.test(pushConfig.workerUrl)&&!pushConfig.workerUrl.includes('YOUR_')&&typeof pushConfig.vapidPublicKey==='string'&&pushConfig.vapidPublicKey.length===87;
export function currentDeviceId(){return deviceId || (deviceId=crypto.randomUUID());}
function info(text){$('push-status').textContent=text;}
function ios(){return /iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);}
function standalone(){return matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;}
export async function pushRequest(path,body){
 const response=await fetch(pushConfig.workerUrl.replace(/\/$/,'')+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(25000)});
 const data=await response.json();if(!response.ok)throw Object.assign(new Error(data.error||'알림 서버 연결 실패'),{status:response.status});return data;
}
function management(){if(!deviceId||!token)throw new Error('기기 저장 공간을 허용해 주세요.');return {deviceId,token};}
async function register(sub){await pushRequest('/subscribe',{...management(),subscription:sub.toJSON()});}
function buttons(){ $('push-enable').disabled=busy||!ready; $('push-test').disabled=busy||!ready; $('push-disable').disabled=busy||!ready; }
async function action(fn){if(busy)return;busy=true;buttons();try{await fn();}catch(e){info(e.name==='NotAllowedError'?'알림이 허용되지 않았어요. 기기 또는 브라우저 설정에서 알림을 허용하세요.':e.message);}finally{busy=false;buttons();}}
$('push-enable').onclick=()=>action(async()=>{
 // Permission must be requested directly inside the user's click on iOS.
 const permission=await Notification.requestPermission();if(permission!=='granted')throw new Error('알림을 허용해야 새 메시지를 받을 수 있어요.');
 let sub=await registration.pushManager.getSubscription();
 if(sub){const key=sub.options.applicationServerKey;if(key&&b64(new Uint8Array(key))!==pushConfig.vapidPublicKey){await sub.unsubscribe();sub=null;}}
 sub ||= await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:un64(pushConfig.vapidPublicKey)});
 await register(sub);localStorage.setItem('moyeo.push.enabled','1');info('이 기기의 알림이 켜졌어요. 테스트 알림으로 확인하세요.');$('push-enable').textContent='알림 연결 확인';
});
$('push-test').onclick=()=>action(async()=>{await pushRequest('/test',management());info('테스트 알림을 발송했어요. 기기의 알림을 확인하세요.');});
$('push-disable').onclick=()=>action(async()=>{
 const sub=await registration.pushManager.getSubscription();if(sub)await sub.unsubscribe();localStorage.removeItem('moyeo.push.enabled');
 try{await pushRequest('/unsubscribe',management());info('이 기기의 알림을 껐어요.');}catch{info('기기 알림은 껐어요. 서버 정리는 연결 후 ‘알림 끄기’를 다시 눌러 주세요.');}
 $('push-enable').textContent='알림 켜기';
});
export async function initPush(){
 buttons();
 if(!pushConfigured()){info('알림 서버 설정이 필요해요. PUSH_SETUP.md를 따라 설정해 주세요.');return;}
 if(ios()&&!standalone()){info('아이폰·아이패드: Safari 공유 → 홈 화면에 추가 → 홈 화면 아이콘으로 실행한 뒤 알림을 켜세요.');return;}
 if(!window.isSecureContext||!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window)){info('이 브라우저에서는 알림을 지원하지 않아요. 최신 Safari 홈 화면 앱 또는 Chrome을 사용해 주세요.');return;}
 try{
  management();await navigator.serviceWorker.register(new URL('./sw.js',import.meta.url),{scope:'./',updateViaCache:'none'});registration=await navigator.serviceWorker.ready;
  ready=true;buttons();info('알림 켜기를 누르면 앱을 닫아도 새 메시지 알림을 받을 수 있어요.');
  if(Notification.permission==='granted'){
   const sub=await registration.pushManager.getSubscription();
   if(sub){await register(sub);info('이 기기의 알림이 연결됐어요.');$('push-enable').textContent='알림 연결 확인';}
   else info('알림 구독이 없어요. 알림 켜기를 눌러 다시 연결하세요.');
  }else if(Notification.permission==='denied')info('알림이 차단돼 있어요. 기기/브라우저 설정에서 허용한 뒤 다시 켜세요.');
 }catch(e){info('알림 연결 확인 실패: '+e.message);}
}
