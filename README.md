# 건축사시험 스터디 로그 — 독립 앱 스캐폴드

Claude 아티팩트로 만들었던 앱을 그대로 옮긴 시작 버전이에요. 화면·기능은 100% 동일하고,
저장 방식만 `window.storage`(Claude 전용)에서 **Supabase**로 바뀌었어요.

## 1. Supabase 프로젝트 준비

1. https://supabase.com 에서 프로젝트 생성 (이미 shinjeon-dashboard에서 쓰는 프로젝트를 재사용해도 됩니다).
2. Supabase 대시보드 → SQL Editor에서 `supabase/schema.sql` 내용을 그대로 실행.
3. Authentication → Providers에서 **Email(매직링크)** 활성화 (기본값으로 이미 켜져 있는 경우가 많아요).
4. Project Settings → API에서 `Project URL`과 `anon public key`를 복사.

## 2. 로컬 설정

```bash
npm install
cp .env.example .env
# .env 파일에 방금 복사한 Supabase URL / anon key 붙여넣기
npm run dev
```

브라우저에서 열리면 이메일 입력 → 메일함에서 로그인 링크 클릭 → 앱 진입.
비밀번호가 없는 매직링크 방식이라 별도 가입 절차가 없어요.

## 3. 배포 (Vercel)

1. 이 폴더를 GitHub 저장소로 push (shinjeon-dashboard와 같은 계정 사용 가능).
2. Vercel에서 "New Project" → 방금 만든 저장소 선택.
3. Environment Variables에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 추가.
4. Deploy.

## 파일 구조

```
src/
  main.jsx            앱 진입점
  App.jsx             로그인 게이트 (매직링크) — 로그인 후 StudyTrackerApp 렌더링
  supabaseClient.js    Supabase 클라이언트 초기화
  StudyTrackerApp.jsx  실제 앱 전체 (대시보드/기출·과제/오답노트/공부시간/출석/작도/커뮤니티/설정)
supabase/
  schema.sql           테이블 + RLS 정책 (그대로 실행하면 끝)
```

## 저장 방식이 어떻게 바뀌었나요

기존 Claude 아티팩트는 `window.storage.get/set(key, shared)`로 개인/공유 데이터를 저장했어요.
이 스캐폴드는 그 인터페이스를 그대로 흉내 낸 `loadKey`/`saveKey` 함수를 Supabase 테이블
(`user_data`, `shared_data`) 위에 재구현했어요. 그래서 `StudyTrackerApp.jsx` 내부의 화면
컴포넌트 코드는 거의 손대지 않고 그대로 가져올 수 있었습니다.

## 다음에 손보면 좋은 부분

- **이미지 저장 방식**: 지금은 도면 사진·작도 사진이 base64로 JSON 안에 통째로 들어가요.
  사용자가 많아지고 사진이 쌓이면 Supabase Storage(전용 이미지 버킷)로 옮기는 걸 추천해요.
  (URL만 JSON에 저장 → 훨씬 가벼워짐)
- **커뮤니티 모더레이션**: 지금은 신고 누적 시 자동 숨김 + 개인별 차단만 있어요. 관리자가
  직접 게시글을 삭제/고정할 수 있는 어드민 화면은 아직 없어요.
- **알림**: 진짜 푸시 알림을 넣으려면 Service Worker + Web Push (또는 OneSignal 같은 서비스)
  등록이 필요해요. 아직 이 스캐폴드에는 포함되어 있지 않아요.
- **RLS 정책 강화**: 지금 `shared_data`는 로그인한 사람이면 누구나 아무 key나 덮어쓸 수 있어요.
  악용 사례가 보이면 key 패턴별로 정책을 더 세분화하는 걸 추천해요.
