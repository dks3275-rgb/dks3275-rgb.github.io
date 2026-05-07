# 🗄️ Firestore 자동 백업

이 폴더에는 매일 자정(KST 새벽 3시)에 자동 생성되는 Firestore 백업 파일이 저장됩니다.

## 📁 파일 구조

- `backup-YYYY-MM-DD.json` — 일별 백업 파일
- `latest.json` — 최신 백업 정보 요약

## 🔄 자동 실행

GitHub Actions 워크플로우 `.github/workflows/backup.yml`이 매일 자동으로 백업을 수행합니다.

## 📅 보관 기간

30일 이상 된 백업은 자동 삭제됩니다.

## 🛠️ 수동 실행

GitHub 저장소 → Actions 탭 → "Daily Firestore Backup" → "Run workflow"

## ⚠️ 복구 방법

문제 발생 시 해당 날짜의 `backup-YYYY-MM-DD.json` 파일을 열어 데이터를 확인할 수 있습니다.
복구가 필요하면 Firebase 콘솔에서 수동으로 데이터를 복원하세요.

## 🔐 필수 설정 (1회)

GitHub 저장소 Secrets에 `FIREBASE_SA_JSON` 추가 필요:
1. Firebase 콘솔 → 프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성
2. JSON 파일 내용 복사
3. GitHub 저장소 → Settings → Secrets and variables → Actions
4. New repository secret → `FIREBASE_SA_JSON` 이름으로 붙여넣기
