# 모여 — GitHub Pages 공용 채팅

닉네임으로 들어가 텍스트와 사진을 주고받는 한국어 정적 웹앱입니다. 서버 설치, 빌드, npm 설치 없이 HTML/CSS/JavaScript 파일을 그대로 배포합니다.

- 하나의 공용 채팅방, 실시간 메시지, 사진 선택/미리보기/확대
- 보낸 사람과 날짜·시간 표시, 최근 100개 표시, 모바일/PC 반응형
- 닉네임과 브라우저 구분용 임의 ID만 localStorage에 저장
- 메시지는 Firestore에 저장하므로 새로고침 후에도 유지됩니다.
- Firebase App 초기화 + Firestore만 사용합니다. Authentication, Storage, Functions, Analytics는 사용하지 않습니다.
- Node.js, Socket.IO, Railway 의존성 및 실행 서버가 없습니다.

## 0. 먼저 알아둘 점

**이 앱은 인증 없는 공개 채팅방입니다.** 닉네임은 계정이 아닙니다. URL이나 설정을 아는 사람은 누구나 대화를 읽고 쓸 수 있습니다. 동일 닉네임을 쓸 수 있으며 브라우저 ID도 위조할 수 있습니다. “내 메시지” 정렬은 편의를 위한 표시일 뿐 본인 인증이 아닙니다.

보안 규칙은 경로·자료형·길이·시간·사진 주소를 검사하고 수정/삭제를 막습니다. 다만 로그인 없이 스팸, 사칭, 무료 할당량 소진, 전체 데이터 수집을 확실히 막을 수 없습니다. 읽기 100개 제한도 쿼리당 제한입니다. 비공개 방이나 민감한 대화에 사용하지 마세요. 사용자 인증과 서버가 필요한 기능은 이번 요구사항 범위 밖입니다.

Firebase 웹 설정값과 Cloudinary cloud name/unsigned preset은 브라우저에서 공개됩니다. **Cloudinary API secret, Firebase 서비스 계정 JSON/개인 키는 절대로 넣지 마세요.** unsigned preset 이름은 비밀번호가 아닙니다. 사진 URL도 접근 권한이 없는 공개 URL이며 이 앱은 종단간 암호화를 제공하지 않습니다.

필요한 계정: GitHub Free, Firebase Spark, Cloudinary Free. 유료 플랜/결제 계정 연결 없이 설정하세요. 계정별 가입 화면이나 정책이 달라 결제를 요구하면 결제하지 말고 선택한 상품·플랜을 먼저 확인하세요.

## 1. 압축 풀기

ZIP을 풀면 `friends-chat` 폴더 안에 아래 파일이 있습니다.

| 파일 | 역할 |
|---|---|
| index.html | 채팅 화면 |
| styles.css | 반응형 디자인 |
| app.js | Firestore 실시간 채팅과 사진 업로드 |
| config.js | 사용자가 채울 설정값 |
| firestore.rules | 콘솔에 게시할 보안 규칙 |
| .nojekyll | GitHub Pages에서 정적 파일 그대로 제공 |
| README.md | 이 안내 |
| TESTING.md | 검증 범위와 연결 후 확인 목록 |

## 2. Firebase 프로젝트 만들기 (Spark)

1. https://console.firebase.google.com/ 에 Google 계정으로 로그인합니다.
2. **프로젝트 만들기 / Add project**를 선택하고 프로젝트 이름을 입력합니다. 예: `friends-chat`.
3. Google Analytics는 끄세요. 이 앱에는 필요하지 않습니다.
4. 프로젝트를 생성하고 콘솔로 이동합니다.
5. 프로젝트 플랜이 **Spark (무료)**인지 확인합니다. Blaze 업그레이드나 Cloud Billing 계정 연결을 하지 않습니다.
6. 왼쪽 **빌드 / Build → Firestore Database → 데이터베이스 만들기 / Create database**로 이동합니다.
7. 에디션을 묻는다면 **Standard**를 선택합니다. 데이터베이스 ID는 **(default)**를 사용합니다. 이 앱은 기본 데이터베이스에 연결합니다.
8. 데이터베이스 위치는 이용자와 가까운 지역을 선택합니다. 생성 후 간단히 변경할 수 없으므로 확인하세요.
9. **프로덕션 모드 / Production mode**로 시작합니다. 테스트 모드의 임시 전체 허용 규칙을 사용하지 않습니다. 아래 5단계에서 필요한 규칙으로 바꿉니다.
10. 생성될 때까지 기다립니다. 컬렉션을 미리 만들 필요는 없습니다. 첫 메시지를 보낼 때 `rooms/public/messages`에 문서가 생성됩니다. 상위 room 문서가 비어 있는 것은 정상입니다.

### Firebase 웹 앱 등록

1. 프로젝트 개요에서 **웹 아이콘 `</>`**을 누릅니다. 이미 다른 앱이 있으면 프로젝트 설정 → 일반 → 내 앱 → 앱 추가 → 웹을 사용합니다.
2. 앱 닉네임을 입력하고 등록합니다.
3. Firebase Hosting 설정은 선택하지 않습니다. 화면은 GitHub Pages에서 제공합니다.
4. SDK 설정 안내에 나오는 `firebaseConfig` 객체를 복사합니다. npm 설치나 안내의 초기화 코드를 붙일 필요는 없습니다.
5. ZIP의 `config.js`를 텍스트 편집기로 열어 `firebaseConfig` 값들을 교체합니다.

```js
export const firebaseConfig = {
  apiKey: "콘솔에서_복사한_apiKey",
  authDomain: "실제프로젝트.firebaseapp.com",
  projectId: "실제프로젝트ID",
  appId: "콘솔에서_복사한_appId",
};
export const cloudinaryConfig = {
  cloudName: "다음_단계에서_입력",
  uploadPreset: "다음_단계에서_입력",
};
```

콘솔의 다른 설정 필드가 함께 있어도 괜찮지만 `export const firebaseConfig =` 선언은 유지하세요. API 키는 Firebase 웹 클라이언트 식별용이며 데이터 보호는 Firestore 규칙이 담당합니다. Authentication을 쓰지 않으므로 로그인 공급자나 Authorized domains 설정은 필요하지 않습니다. 별도로 API 키 HTTP referrer 제한을 설정한 경우 GitHub Pages 주소가 허용되는지 확인하세요.

## 3. Cloudinary 무료 계정과 업로드 preset

1. https://cloudinary.com/ 에서 Free 계정을 만들고 로그인합니다. 유료 업그레이드를 선택하지 않습니다.
2. Console의 해당 **Product environment**에서 **Cloud name**을 확인합니다. 표시 이름이나 API key가 아닙니다.
3. `config.js`의 `cloudName`에 그 값을 붙여 넣습니다.
4. Console의 **Settings → Upload → Upload presets**로 이동합니다. UI에 따라 **Settings → Upload Presets**로 바로 표시될 수 있습니다.
5. **Add upload preset** 또는 **Create upload preset**을 선택합니다.
6. Preset name을 정합니다. 예: `friends_chat_unsigned`.
7. **Signing mode를 Unsigned**로 선택합니다. Signed이면 이 앱에서 업로드할 수 없습니다.
8. 해당 preset의 업로드 제한 설정에서 다음을 적용합니다. 화면의 탭 이름은 계정/UI 버전에 따라 달라질 수 있습니다.
   - **Allowed formats**: `jpg,jpeg,png,webp` (확장자 앞 점 없이 입력).
   - **Max file size는 preset 화면에서 찾을 필요가 없습니다.** 이 앱은 브라우저 코드에서 5MiB 제한을 검사합니다. Cloudinary Upload Widget의 maxFileSize도 클라이언트 검사 옵션이며 preset의 서버 제한 설정과 다릅니다.
   - 고유 이름 생성을 유지합니다. 원본 파일명을 public ID로 그대로 사용하지 않는 편이 좋습니다.
   - 선택: Asset folder 또는 Folder를 `friends-chat`으로 지정합니다. 둘의 동작은 환경의 폴더 모드에 따라 다르며 앱은 폴더 구조에 의존하지 않습니다.
9. Save를 눌러 저장합니다. **앱의 5MiB 검사는 우회 가능하며 서버에서 5MiB를 강제하는 설정은 아닙니다.** Cloudinary 서버에는 계정 Usage Limits의 파일 크기 한도가 적용됩니다. Allowed formats는 preset에서 설정하세요.
10. 저장한 preset 이름을 `config.js`의 `uploadPreset`에 그대로 입력합니다. 이름의 대소문자도 일치해야 합니다.

이 앱은 `https://api.cloudinary.com/v1_1/<cloudName>/image/upload`로 파일과 `upload_preset`만 전송합니다. API secret, 서명 서버, API key를 사용하지 않습니다. JPG/PNG/WebP 한 장을 선택할 수 있고 파일당 최대 5MiB입니다. HEIC는 JPG 등으로 변환한 후 사용하세요. 업로드 전에 사진 메타데이터를 별도로 제거하지 않으므로 위치 등 민감한 메타데이터가 없는 사진을 사용하세요.

## 4. config.js 최종 확인

`YOUR_`로 시작하는 값을 모두 실제 값으로 바꿉니다. Firebase 설정과 Cloudinary 설정 모두 있어야 입장 버튼이 활성화됩니다. 따옴표·쉼표·중괄호를 지우지 마세요. 비밀 키나 계정 비밀번호는 넣지 않습니다.

## 5. Firestore 규칙 게시 — 반드시 수행

1. `firestore.rules`를 텍스트 편집기로 엽니다.
2. **`YOUR_CLOUD_NAME`을 config.js에 입력한 실제 Cloudinary cloudName으로 교체**합니다. 사진을 허용할 계정을 규칙에서도 지정하는 단계입니다.
3. Firebase Console → **Firestore Database → Rules / 규칙**으로 이동합니다.
4. 기존 규칙 전체를 지우고 수정한 `firestore.rules` 전체를 붙여 넣습니다.
5. **Publish / 게시**를 누릅니다. 구문 오류가 없는지 확인하고 규칙 전파를 기다립니다.
6. GitHub에 `firestore.rules` 파일만 올리는 것으로는 규칙이 적용되지 않습니다. 콘솔에서 게시해야 합니다.

허용되는 경로는 `rooms/public/messages/{messageId}`뿐입니다. 쿼리는 최대 100개, 메시지는 최대 2,000자, 닉네임은 최대 20자입니다. `createdAt`은 Firestore `serverTimestamp()`로만 허용합니다. 사진은 지정 Cloudinary 계정의 HTTPS 업로드 주소만 허용합니다. 새 메시지 생성만 허용하고 기존 메시지 수정/삭제는 금지합니다. 사진 URL 규칙은 URL 형식만 검사하며 파일 실제 소유권이나 콘텐츠를 증명하지 않습니다.

`allow read, write: if true`로 바꾸지 마세요. 문제가 생기면 아래 문제 해결 표를 먼저 확인하세요.

## 6. GitHub Pages 배포 (브라우저만으로 가능)

1. https://github.com/ 로그인 → 우측 상단 **+ → New repository**.
2. 저장소 이름을 정합니다. 예: `friends-chat`.
3. GitHub Free에서 Pages를 이용하려면 저장소를 **Public**으로 만듭니다. Create repository를 누릅니다.
4. 빈 저장소 화면의 **uploading an existing file** 또는 **Add file → Upload files**를 누릅니다.
5. 압축을 푼 `friends-chat` 폴더 **안의 파일들**을 올립니다. ZIP 자체를 올리거나 바깥 폴더를 통째로 한 단계 더 넣지 마세요.
6. 저장소 첫 화면에 `index.html`, `styles.css`, `app.js`, `config.js`가 바로 보여야 합니다. README와 rules도 같이 올려도 됩니다.
7. 숨김 파일 `.nojekyll`이 업로드되지 않았다면 **Add file → Create new file**에서 `.nojekyll`이라는 파일을 만들고 빈 줄만 넣어 저장합니다.
8. **Commit changes**로 저장합니다. 기본 브랜치가 `main`인지 확인합니다.
9. 저장소 **Settings → Pages → Build and deployment**로 이동합니다.
10. Source를 **Deploy from a branch**로 선택합니다.
11. Branch를 **main**, Folder를 **/(root)**로 선택하고 Save를 누릅니다. 기본 브랜치명이 다르면 실제 파일이 있는 브랜치를 고릅니다.
12. **Actions**에서 `pages build and deployment` 작업 완료를 기다립니다.
13. Settings → Pages에 나오는 **Visit site**를 누릅니다. 보통 주소는 `https://사용자이름.github.io/friends-chat/`입니다.
14. 닉네임을 입력해 입장합니다. 다른 브라우저 또는 친구 휴대폰에서도 같은 주소로 들어가 텍스트와 사진을 보내 봅니다.

경로는 모두 `./` 상대 경로이므로 저장소 이름이 달라도 동작합니다. 앱 실행 시 Firebase SDK를 Google CDN에서 가져옵니다. 인터넷이 필요합니다. 공개 저장소의 `config.js`를 숨기려고 해도 브라우저에서 필요한 값이므로 비밀이 될 수 없습니다.

### 수정 사항 배포

GitHub에서 파일 선택 → 연필 아이콘 → 수정 → Commit changes를 누릅니다. Pages 작업이 완료되면 새로고침하세요. 이전 화면이 계속 나오면 강력 새로고침 또는 시크릿 창으로 확인합니다. Firestore 규칙 변경은 콘솔에서 별도로 다시 게시하세요.

## 7. 사용 방법

- 닉네임 입력 후 입장. 같은 브라우저에서는 닉네임과 표시용 ID를 기억합니다.
- 텍스트 입력 후 보내기. Enter 전송, Shift+Enter 줄바꿈. 한국어 조합 중 Enter는 전송하지 않습니다.
- `＋` 버튼으로 사진 선택 → 미리보기 확인 → 보내기. 사진만 보내거나 설명을 같이 보낼 수 있습니다.
- 첨부의 `✕`로 사진을 취소합니다. 전송 후 입력이 비워집니다.
- 받은 사진을 누르면 확대되고 닫기 또는 Escape로 돌아갑니다.
- 새로고침하면 최신 100개를 다시 읽습니다. 100개보다 오래된 메시지를 자동 삭제하지는 않습니다.
- 위쪽 대화를 읽는 동안 새 메시지가 오면 아래로 이동 버튼이 표시됩니다.
- 인터넷이 끊기면 전송을 막습니다. 이미 Firestore에 전달한 요청의 서버 승인을 기다리는 중 끊긴 경우 페이지를 유지하세요. 재연결 시 SDK가 이어서 처리합니다. 중복 전송 방지를 위해 승인 대기 중에는 입력을 잠급니다.
- 업로드 또는 저장 실패 시 입력과 선택 사진을 유지합니다. 사진 업로드 성공 후 메시지 저장이 실패하면 같은 페이지에서 재시도할 때 업로드된 URL을 재사용합니다.

## 8. 무료 사용량과 정리

2026-09-27 공식 문서 확인 기준 Firestore 무료 할당량은 저장 1GiB, 읽기 일 50,000회, 쓰기 일 20,000회, 삭제 일 20,000회, 아웃바운드 월 10GiB입니다. 일일 할당량은 태평양 시간 자정 무렵 재설정됩니다. 실제 적용은 콘솔과 최신 공식 문서가 기준입니다.

화면을 열 때 최대 100개 문서를 읽고, 새 메시지가 오면 연결된 각 이용자에게 읽기가 발생합니다. 새로고침·재연결에도 읽기가 추가될 수 있습니다. 최근 100개 제한은 저장량 제한이 아닙니다. Spark에서 한도를 넘으면 요청이 실패하거나 서비스가 제한될 수 있습니다. 계속 무료로 쓰려면 유료 플랜으로 전환하지 말고 사용량을 확인하고 데이터를 정리하세요.

Firebase Console → Firestore → Usage에서 사용량을 봅니다. 오래된 메시지는 관리자가 Console → Data → `rooms/public/messages`에서 삭제할 수 있습니다. 이 앱에는 자동 삭제, TTL, 예약 작업이 없습니다. 콘솔 관리자 작업은 클라이언트 규칙의 삭제 금지와 별개입니다.

Cloudinary는 Console의 Usage에서 저장/전송/변환 사용량을 확인하세요. Free도 무제한은 아닙니다. 사진은 Cloudinary Assets/Media Library에서 관리자가 삭제합니다. Firestore 메시지 삭제와 Cloudinary 사진 삭제는 서로 연동되지 않습니다. 한쪽을 삭제해도 다른 쪽이 자동으로 삭제되지 않습니다. 업로드 후 메시지 저장 실패/페이지 종료 시 사용되지 않는 사진이 남을 수 있으므로 가끔 정리하세요.

preset이 악용되면 즉시 preset을 비활성화하거나 삭제하고 새 preset을 만들어 config.js를 갱신하세요. 채팅을 긴급 중지하려면 콘솔에서 Firestore의 모든 읽기·쓰기를 거부하도록 규칙을 변경합니다. 공개 웹페이지가 노출한 값을 숨기는 것만으로 악용을 막을 수는 없습니다.

## 9. 문제 해결

| 현상 | 확인할 내용 |
|---|---|
| 입장 버튼 비활성화 | config.js의 YOUR_ 값, 빈 값, JavaScript 구문 오류 확인 |
| 앱을 불러오지 못함 | 인터넷, Google CDN 차단, 확장 프로그램, Firebase 설정 확인 |
| permission-denied | 올바른 프로젝트의 기본 DB인지, 규칙을 게시했는지 확인 |
| 텍스트는 되는데 사진 저장 거부 | firestore.rules의 YOUR_CLOUD_NAME 교체 및 게시 여부 확인 |
| 사진 업로드 400/401 | 실제 cloudName과 preset 이름, Unsigned 모드, 파일 제한 확인 |
| 사용량 초과 | Firebase/Cloudinary 콘솔 Usage 확인; 자동 유료 전환하지 않기 |
| 방이 비어 보임 | 다른 projectId인지, createdAt 필드 없는 수동 문서인지 확인 |
| GitHub Pages 404 | Pages 배포 완료 여부, main 루트의 index.html, 정확한 저장소 URL 확인 |
| 화면은 뜨지만 파일 오류 | config.js와 app.js가 index.html과 같은 폴더인지 확인 |
| 사진이 나중에 깨짐 | Cloudinary에서 해당 자산 삭제/제한 여부 확인 |
| file://에서 동작 안 함 | ES 모듈 앱이므로 GitHub Pages 또는 로컬 HTTP 서버로 열기 |

선택 사항: 로컬 미리보기는 Python 3이 있다면 프로젝트 폴더에서 `python3 -m http.server 8000` 실행 후 `http://localhost:8000/`을 여세요. Python은 미리보기용일 뿐 배포/운영 의존성이 아닙니다.

## 공식 문서

- Firebase CDN 설정: https://firebase.google.com/docs/web/alt-setup
- Firestore 규칙: https://firebase.google.com/docs/firestore/security/get-started
- Firestore 무료 할당량: https://firebase.google.com/docs/firestore/quotas
- Firestore 요금제: https://firebase.google.com/docs/firestore/pricing
- Cloudinary upload presets: https://cloudinary.com/documentation/upload_presets
- Cloudinary 브라우저 업로드: https://cloudinary.com/documentation/client_side_uploading
- GitHub Pages 생성: https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
