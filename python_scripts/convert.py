import sys
from pathlib import Path
from nbconvert import HTMLExporter
from playwright.sync_api import sync_playwright


def convert_ipynb_to_html(ipynb_path: Path) -> Path:
    output_dir = ipynb_path.parent
    output_name = ipynb_path.stem

    print(f"📝 Converting to HTML: {ipynb_path.name}")
    try:
        exporter = HTMLExporter()
        body, _ = exporter.from_filename(str(ipynb_path))

        html_path = output_dir / f"{output_name}.html"
        html_path.write_text(body, encoding='utf-8')
    except Exception as e:
        print(f"❌ nbconvert failed: {e}")
        sys.exit(1)

    return html_path


def convert_html_to_png(html_path: Path, png_path: Path, device_scale_factor: int = 3):
    print(f"🖼️  Converting to PNG: {html_path.name}")
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page(
                viewport={
                    "width": 1280,
                    "height": 720,
                },
                device_scale_factor=device_scale_factor,
            )

            page.goto(f"file://{html_path.resolve()}", wait_until="networkidle")

            # Measure actual content height
            content_height = page.evaluate("document.documentElement.scrollHeight")

            # Adjust viewport to content height
            page.set_viewport_size({"width": 1280, "height": int(content_height)})

            page.screenshot(
                path=str(png_path),
                full_page=True,
            )

            browser.close()
    except Exception as e:
        print(f"❌ Screenshot failed: {e}")
        sys.exit(1)


def main():
    if len(sys.argv) < 2:
        print("ipynb file path is required.")
        sys.exit(1)

    ipynb_path = Path(sys.argv[1]).resolve()
    
    # Get device scale factor from argument (default: 3)
    device_scale_factor = 3
    if len(sys.argv) >= 3:
        try:
            device_scale_factor = int(sys.argv[2])
            if device_scale_factor < 1 or device_scale_factor > 5:
                print(f"Warning: device scale factor must be between 1 and 5. Using default: 3")
                device_scale_factor = 3
        except ValueError:
            print(f"Warning: invalid device scale factor value. Using default: 3")

    if not ipynb_path.exists():
        print(f"File not found: {ipynb_path}")
        sys.exit(1)

    if ipynb_path.suffix.lower() != ".ipynb":
        print("Only .ipynb files can be converted.")
        sys.exit(1)

    html_path = convert_ipynb_to_html(ipynb_path)
    png_path = ipynb_path.with_suffix(".png")

    convert_html_to_png(html_path, png_path, device_scale_factor)

    html_path.unlink()
    print(f"✅ Conversion completed: {png_path}")


if __name__ == "__main__":
    main()
