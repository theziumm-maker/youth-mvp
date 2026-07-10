# Youth MVP 배포 가이드

텐미닛 배포 때와 완전히 같은 순서입니다. 총 20분 정도 걸립니다.

## 1단계 — GitHub에 올리기 (5분)

1. https://github.com 접속 → **기존 계정으로 로그인** (텐미닛 때 쓰던 계정 그대로)
2. 우측 상단 **+** → **New repository**
   - Repository name: `youth-mvp`
   - **Public** 선택
   - **Create repository** 클릭
3. 생성된 화면에서 **"uploading an existing file"** 링크 클릭
4. 압축 푼 폴더에서 아래 파일/폴더를 드래그해서 업로드:
   - `server.js`, `package.json`, `README.md`, `DEPLOY.md`
   - `public` 폴더 (안의 index.html, manifest.json, sw.js, icon 파일들 포함)
   - ⚠️ `node_modules` 폴더는 올리지 마세요 (압축본에는 없음)
5. 하단 **Commit changes** 클릭

## 2단계 — Render에서 데이터베이스 만들기 (5분)

1. https://render.com 접속 → **기존 계정으로 로그인**
2. 대시보드에서 **New +** → **PostgreSQL**
   - Name: `youth-db`
   - Region: **Singapore** (한국에서 가장 가까움)
   - Instance Type: **Free**
   - **Create Database**
3. 생성 완료 후 데이터베이스 페이지에서 **Internal Database URL** 복사
   (`postgresql://...` 로 시작하는 긴 문자열)

> ⚠️ Render 무료 Postgres는 **생성 후 30일이 지나면 만료**됩니다 (유예 14일).
> 텐미닛 때와 동일합니다. 캘린더에 알림 걸어두시고, 검증이 한 달을
> 넘기면 유료 전환($7/월 수준)하세요. 여기엔 사용자 얼굴 기록이 쌓이므로
> 만료로 날리면 안 됩니다.

## 3단계 — 웹 서비스 배포 (10분)

1. **New +** → **Web Service**
2. 1단계에서 만든 저장소 연결 (`youth-mvp` 선택)
3. 설정:
   - Region: **Singapore** (DB와 같은 리전!)
   - Build Command: `npm install` (자동 감지됨)
   - Start Command: `npm start` (자동 감지됨)
   - Instance Type: **Free**
4. **Environment Variables** 섹션에서 추가:

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | 2단계에서 복사한 Internal Database URL |

5. **Create Web Service** → 빌드 후 상단에 초록색 **Live**
6. `https://youth-mvp-xxxx.onrender.com` 주소가 서비스 주소입니다

배포가 끝나면 Logs 탭에 이렇게 떠야 정상입니다:

```
DB: Postgres 영속화 모드 (기록 0건 보유)
💜 Youth MVP 서버 실행 중 (포트 10000)
   자가 핑 활성화: https://youth-mvp-xxxx.onrender.com
```

자가 핑은 코드에 이미 들어 있어서 무료 티어의 "15분 잠들기"를 방지합니다.

## 4단계 — 폰에서 테스트

1. 휴대폰에서 주소 접속 → **촬영 탭** → 카메라 권한 허용
   (Render는 HTTPS 자동이라 카메라 바로 됩니다)
2. 밝기·선명도 게이트가 초록불이 되면 촬영 → 저장
3. 홈에 점수가 뜨고, 브라우저를 완전히 껐다 켜도 기록이 남아 있으면 성공
4. 이틀 이상 기록하면 **분석 탭**(추세 그래프)과 **전후 탭**(비교 슬라이더)이 활성화됩니다
5. 홈 화면에 추가: iOS는 Safari 공유 버튼 → "홈 화면에 추가",
   안드로이드는 Chrome 메뉴 → "앱 설치"

## 확인 포인트

- `주소/api/health` 접속 → `{"ok":true,"db":"postgres"}` 가 떠야 DB 연결 정상
  (`"db":"memory"` 로 뜨면 DATABASE_URL 환경변수가 빠진 것)
- 사용자 구분은 기기별 자동 생성 UUID 방식이라 가입 절차가 없습니다.
  같은 폰 같은 브라우저 = 같은 사용자로 기록이 이어집니다.

## 운영 메모

- **코드 수정 배포**: GitHub에서 파일 수정(연필 아이콘) → Commit → Render 자동 재배포
- **로그 확인**: Render 웹 서비스 → Logs 탭
- **데이터 전체 리셋**: Render Postgres → Connect → PSQL 접속 후
  `DELETE FROM records; DELETE FROM users;`
- 텐미닛과 달리 **TURN 서버는 필요 없습니다** (영상통화가 없으므로)

## 다음 단계 (배포 후)

1. MediaPipe FaceMesh 게이트 추가 — 얼굴 크기·위치·각도 검사 (코드로 제공 예정)
2. 매일 리마인더 푸시 — 텐미닛 웹푸시 코드 재활용
3. Python 정밀 분석 엔진(pores.py 등) 별도 서비스로 연결
