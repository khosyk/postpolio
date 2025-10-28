## GitFlow 운영 규칙

**메인 개발 브랜치**: `main` (dev 역할)

**릴리즈 브랜치**: `release/x.y.z` (예: `release/0.1.0`)

**프로덕션 브랜치**: `master` (배포 시점에만 사용)

**기능 브랜치**: `feature/<name>` (예: `feature/auth-signup-login`)

**핫픽스 브랜치**: `hotfix/x.y.z+1` (예: `hotfix/0.1.1`)

### 브랜치 전략
- 기능 개발: `main` → `feature/<name>` 분기 → PR로 `main` 머지
- 릴리즈 준비: `main` → `release/x.y.z` 분기 → QA/버그픽스 → 배포 시 `master`에 머지+태그 → `main` 역머지
- 긴급 수정: `master` → `hotfix/x.y.z+1` 분기 → `master`와 `main` 양쪽에 머지

참고: `chore`는 브랜치 타입이 아님. 커밋 타입(Conventional Commits)으로만 사용

### PR 규칙
- `feature/*` → `main`
- `release/*` → `master` 및 `main`
- `hotfix/*` → `master` 및 `main`

### 커밋 컨벤션 (Conventional Commits)
- `feat: ...` 사용자 기능 추가
- `fix: ...` 버그 수정
- `chore: ...` 빌드/도구/잡무 변경 (코드 동작 영향 없음)
- `docs: ...` 문서 변경
- `refactor: ...` 리팩터링(기능변경 없음)
- `test: ...` 테스트 추가/변경

예: `chore(gitflow): add gitflow.sh and yarn scripts`

### 버전 태깅
- 태그: `vX.Y.Z` (예: `v0.1.0`)
- 태그는 `master` 머지 시점에 Annotated Tag로 생성/푸시

### 명령 스니펫

Alias (1회 설정)
```bash
git config --global alias.gff '!f(){ git checkout main && git pull --ff-only && git checkout -b feature/"$1" && git push -u origin feature/"$1"; }; f'
git config --global alias.gfr '!f(){ git checkout main && git pull --ff-only && git checkout -b release/"$1" && git push -u origin release/"$1"; }; f'
git config --global alias.gfrf '!f(){ git checkout master && git pull --ff-only && git merge --no-ff release/"$1" && git tag -a v"$1" -m "v$1" && git push origin master --tags && git checkout main && git pull --ff-only && git merge --no-ff release/"$1" && git push origin main; }; f'
```

사용 예시 (alias)
```bash
git gff auth-signup-login
git gfr 0.1.0
git gfrf 0.1.0
```

Yarn 스크립트
```bash
yarn gf:start auth-signup-login
yarn gf:release 0.1.0
yarn gf:finish 0.1.0
```

### 운영 수칙
- 브랜치 생성/머지 전 `git pull --ff-only`로 Fast-Forward만 허용
- 작업 중 변경사항은 커밋/스태시 후 스크립트 실행
- 최초 실행 전 `git fetch --all` 권장


