# Jupyter to PNG Converter

VSCode 익스텐션으로 Jupyter Notebook (.ipynb) 파일을 PNG 이미지로 변환합니다.

아이티윌에서 진행되는 이광호 강사의 수업에서 활용될 목적으로 개발되었습니다.

## 기능

- 파일 탐색기에서 .ipynb 파일을 마우스 우클릭하여 "Convert Jupyter Notebook to PNG" 명령어 실행
- Notebook 전체 내용을 한 장의 PNG 이미지로 저장
- 환경설정값으로 이미지 배율 조정 가능 (기본값: 3x)
- **외부 런타임 의존성 없음** — Python, nbconvert, Playwright, 별도 Chromium 설치 불필요. VSCode 내장 Webview에서 직접 렌더링하고 캡처합니다.

## 설치

1. `npm install` - 의존성 설치
2. `npm run vendor` - Webview용 정적 리소스 복사 (html2canvas, highlight.js 테마)
3. `npm run compile` - TypeScript 컴파일
4. VSCode에서 실행: `F5` 키 또는 Debug 탭에서 "Run Extension" 선택

## 사용 방법

1. VSCode에서 .ipynb 파일을 마우스 우클릭
2. "Convert Jupyter Notebook to PNG" 선택
3. 같은 디렉토리에 PNG 파일이 생성됨

## 환경설정

VSCode의 `settings.json`에서 다음과 같이 설정할 수 있습니다:

```json
{
  "ipynb-to-png-converter.deviceScaleFactor": 3
}
```

- **ipynb-to-png-converter.deviceScaleFactor**: PNG 이미지의 배율 (1-5, 기본값: 3)
  - 값이 클수록 더 높은 해상도의 이미지 생성
  - 1: 표준 해상도
  - 3: 고해상도 (기본값)
  - 5: 매우 고해상도 (더 오래 걸림)

또는 VSCode 설정 UI에서 "Jupyter to PNG Converter" 섹션을 찾아 직접 설정할 수 있습니다.

## 동작 원리

1. .ipynb 파일을 JSON으로 파싱
2. 마크다운 셀은 `marked`, 코드 셀은 `highlight.js`로 HTML 생성
3. VSCode Webview (내장 Chromium)에 HTML 렌더링
4. `html2canvas`로 DOM을 캔버스에 그려 PNG dataURL 추출
5. 디스크에 PNG 저장

## 구조

```
├── src/
│   ├── extension.ts          # VSCode 익스텐션 진입점 + Webview 오케스트레이션
│   ├── render.ts             # ipynb → HTML 변환기
│   └── notebook.ts           # ipynb JSON 타입 정의
├── media/
│   ├── styles.css            # Jupyter 스타일 CSS
│   ├── highlight.css         # 코드 하이라이팅 테마 (vendored)
│   └── html2canvas.min.js    # DOM → PNG 캡처 라이브러리 (vendored)
├── package.json
├── tsconfig.json
└── README.md
```

## 개발

- `npm run watch` - TypeScript 감시 모드 (변경 사항 자동 컴파일)
- `npm run lint` - ESLint 실행
- `npm run compile` - 전체 컴파일

## 배포

### VSCode Marketplace에 배포하는 방법

#### 1. 필수 도구 설치
```bash
npm install -g vsce
```

#### 2. Publisher 생성 (처음 한 번만)

**Step 1: VSCode Marketplace에서 Publisher 생성**
- [VSCode Publisher 생성 페이지](https://aka.ms/vscode-create-publisher)로 이동
- Microsoft 계정으로 로그인
- Publisher 이름 입력: `leekh`
- 약관 동의 후 생성

**Step 2: Personal Access Token (PAT) 생성**
- [Azure DevOps](https://dev.azure.com/)에 접속
- 우측 상단 프로필 → Settings
- Personal access tokens 선택
- New token 클릭
- Name: `vsce-token` 입력
- Organization: All accessible organizations 선택
- Scopes: Marketplace (Manage) 체크
- Create 클릭
- Token 복사 및 안전한 곳에 저장

**Step 3: vsce에 로그인**
```bash
vsce login leekh
# 프롬프트에서 PAT 입력
```

#### 3. 배포 전 확인사항
- `package.json`의 `version` 업데이트 (semantic versioning)
- `README.md` 최신 상태 확인
- `.vscodeignore`에 불필요한 파일 정리

#### 4. VSIX 파일 생성 및 배포

**로컬 테스트 (VSIX 생성만):**
```bash
vsce package
# ipynb-to-png-converter-0.0.1.vsix 생성
```

**Marketplace에 배포:**
```bash
vsce publish
# 또는
vsce publish -p <PAT>
```

**버전 업데이트와 함께 배포:**
```bash
vsce publish patch    # 0.0.1 → 0.0.2
vsce publish minor    # 0.0.1 → 0.1.0
vsce publish major    # 0.0.1 → 1.0.0
```

#### 5. 배포 확인
- [VSCode Marketplace](https://marketplace.visualstudio.com/)에서 검색하여 확인
- 검색: "Jupyter to PNG Converter"

### 배포 체크리스트
- [ ] `package.json`의 `publisher` 필드 확인
- [ ] `version` 번호 정확성 확인
- [ ] `README.md` 내용 완성
- [ ] `LICENSE` 파일 포함 (선택)
- [ ] GitHub Repository 링크 확인
- [ ] 스크린샷/데모 추가 (선택)
- [ ] CHANGELOG 작성 (선택)

### 문제 해결

**PAT 관련 에러:**
```bash
vsce login leekh
# 새로운 PAT 입력
```

**이미 존재하는 버전:**
```bash
# package.json의 version을 업데이트하고 다시 시도
```

## 개발자

- **이광호** (leekh4232@gmail.com)

## 라이선스

MIT
