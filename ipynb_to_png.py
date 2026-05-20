import sys
from pathlib import Path
from nbconvert import HTMLExporter
from playwright.sync_api import sync_playwright


def convert_ipynb_to_html(ipynb_path: Path) -> Path:
    output_dir = ipynb_path.parent
    output_name = ipynb_path.stem

    print(f"📝 HTML로 변환 중: {ipynb_path.name}")
    try:
        exporter = HTMLExporter()
        body, _ = exporter.from_filename(str(ipynb_path))

        html_path = output_dir / f"{output_name}.html"
        html_path.write_text(body, encoding='utf-8')
    except Exception as e:
        print(f"❌ nbconvert 실패: {e}")
        sys.exit(1)

    return html_path


def convert_html_to_png(html_path: Path, png_path: Path):
    print(f"🖼️  PNG로 변환 중: {html_path.name}")
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page(
                viewport={
                    "width": 1280,
                    "height": 720,
                },
                device_scale_factor=3,
            )

            page.goto(f"file://{html_path.resolve()}", wait_until="networkidle")

            # 콘텐츠의 실제 높이 측정
            content_height = page.evaluate("document.documentElement.scrollHeight")

            # viewport를 콘텐츠 높이에 맞게 조정
            page.set_viewport_size({"width": 1280, "height": int(content_height)})

            page.screenshot(
                path=str(png_path),
                full_page=True,
            )

            browser.close()
    except Exception as e:
        print(f"❌ 스크린샷 실패: {e}")
        sys.exit(1)


def main():
    if len(sys.argv) < 2:
        print("ipynb 파일 경로가 필요함.")
        sys.exit(1)

    ipynb_path = Path(sys.argv[1]).resolve()

    if not ipynb_path.exists():
        print(f"파일이 없음: {ipynb_path}")
        sys.exit(1)

    if ipynb_path.suffix.lower() != ".ipynb":
        print("ipynb 파일만 변환 가능함.")
        sys.exit(1)

    html_path = convert_ipynb_to_html(ipynb_path)
    png_path = ipynb_path.with_suffix(".png")

    convert_html_to_png(html_path, png_path)

    html_path.unlink()
    print(f"✅ 변환 완료: {png_path}")


if __name__ == "__main__":
    main()