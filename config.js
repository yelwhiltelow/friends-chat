// Firebase 콘솔의 웹 앱 설정을 복사하세요. 비밀 키를 넣지 마세요.
export const firebaseConfig = {
  apiKey: "AIzaSyAOYMHjKWQvchNzEf9q3XWQIX8rkyRDV04",
  authDomain: "friends-chat-55e0b.firebaseapp.com",
  projectId: "friends-chat-55e0b",
  storageBucket: "friends-chat-55e0b.firebasestorage.app",
  messagingSenderId: "684812453780",
  appId: "1:684812453780:web:49bdcb4f3d0a8e9319f181"
};
export const cloudinaryConfig = {
  cloudName: "fpvjrdlp",
  uploadPreset: "friends_chat_unsigned",
};

// 알림 서버의 공개 주소와 VAPID 공개 키만 입력하세요. 비밀 키는 넣지 마세요.
export const pushConfig = {
  workerUrl: "", // 예: https://moyeo-push.사용자.workers.dev
  vapidPublicKey: "", // tools/push-keys.html에서 생성한 공개 키
};
