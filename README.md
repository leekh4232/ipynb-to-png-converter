# Ipynb PDF Converter

VSCode 익스텐션으로 Jupyter Notebook (.ipynb) 파일을 **PDF 문서**로 변환합니다.

아이티윌에서 진행되는 이광호 강사의 수업에서 활용될 목적으로 개발되었습니다.

## 기능

- 파일 탐색기 / 에디터 탭 / 명령 팔레트에서 .ipynb 파일을 PDF로 변환 (`Convert Jupyter Notebook to PDF`)
- 페이지 단위로 분할되어 일반 PDF 뷰어에서 페이지 넘기기 가능 (**Galaxy Tab S9 세로 모드 기본 최적화**: 800 × 1280 CSS px)
- PDF 페이지 여백 설정(`pdfPageMargin`, 기본 32 px)으로 콘텐츠를 페이지 안쪽에 여유 있게 배치
- 코드 셀 신택스 하이라이트 테마 8종 (Dracula, GitHub Light/Dark, Atom One Light/Dark, Monokai, Nord, VS Dark)
- **외부 런타임 의존성 없음** — Python, nbconvert, Playwright, 별도 Chromium 설치 불필요. VSCode 내장 Webview에서 직접 렌더링하고 캡처합니다.

## 사용 방법

1. VSCode에서 .ipynb 파일을 마우스 우클릭
2. `Convert Jupyter Notebook to PDF` 선택
3. 같은 디렉토리에 `.pdf` 파일이 생성됨

## 환경설정

VSCode의 `settings.json`에서 다음과 같이 설정할 수 있습니다:

```json
{
  "ipynb-pdf-converter.pdfPageWidth": 800,
  "ipynb-pdf-converter.pdfPageHeight": 1280,
  "ipynb-pdf-converter.pdfPageMargin": 32,
  "ipynb-pdf-converter.deviceScaleFactor": 3,
  "ipynb-pdf-converter.codeTheme": "dracula"
}
```

- **ipynb-pdf-converter.pdfPageWidth**: PDF 페이지 가로 폭 (CSS px, 기본값: `800` — Galaxy Tab S9 portrait)
- **ipynb-pdf-converter.pdfPageHeight**: PDF 페이지 세로 폭 (CSS px, 기본값: `1280` — Galaxy Tab S9 portrait)
  - PDF 콘텐츠가 (페이지 높이 − 여백)을 넘기면 자동으로 여러 페이지로 분할됨
- **ipynb-pdf-converter.pdfPageMargin**: PDF 페이지 내부 여백 (CSS px, 기본값: `32`) — 모든 페이지의 상하좌우에 동일하게 적용
- **ipynb-pdf-converter.deviceScaleFactor**: 출력 배율 (1-5, 기본값: 3)
- **ipynb-pdf-converter.codeTheme**: 코드 셀 하이라이트 테마 (기본값: `dracula`)

또는 VSCode 설정 UI에서 "Ipynb PDF Converter" 섹션을 찾아 직접 설정할 수 있습니다.

## 동작 원리

1. .ipynb 파일을 JSON으로 파싱
2. 마크다운 셀은 `marked`, 코드 셀은 `highlight.js`로 HTML 생성
3. VSCode Webview (내장 Chromium)에 HTML 렌더링
4. `html2canvas`로 DOM을 캔버스에 그린 뒤 페이지 단위로 분할
5. `jspdf`로 PDF를 조립하여 디스크에 저장

## 개발자

- **이광호** (leekh4232@gmail.com)

## 라이선스

MIT
