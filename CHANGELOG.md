# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.1] - 2026-05-21

### Added
- **`pdfPageMargin` setting** (default `32` CSS px) — inner margin applied on all four sides of every PDF page. Content is now rendered into the `pageWidth - 2×margin` × `pageHeight - 2×margin` content area and centered on each page.

### Changed
- **`imageWidth` default lowered from `960` → `800`** so PNG and PDF share the same rendering width by default.

## [0.4.0] - 2026-05-21

### Added
- **Multi-page PDF output**: PDF is now paginated. The captured notebook is sliced into fixed-size pages so it can be flipped through page-by-page in any standard PDF viewer.
- **Separate width settings for PNG and PDF**:
  - `pdfPageWidth` (default `800`) — width of each PDF page in CSS pixels.
  - `pdfPageHeight` (default `1280`) — height of each PDF page in CSS pixels.
  - Defaults are optimized for **Galaxy Tab S9 portrait** (800 × 1280 CSS px → 1600 × 2560 px at the device's 2× DPR).
- Output channel now reports page count for PDF runs.

### Changed
- `imageWidth` is now PNG-only; PDF uses the dedicated `pdfPageWidth` / `pdfPageHeight` pair.
- Webview script now produces an array of page data URLs; PNG runs return a single-page array (no behavior change for PNG output).

## [0.3.0] - 2026-05-21

### Added
- **PDF export**: New `Convert Jupyter Notebook to PDF` command, available from the Explorer context menu, editor tab context menu, and Command Palette. Generated PDF preserves the same rendering as the PNG output.
- GitHub Actions workflow (`.github/workflows/build-and-publish.yml`) that automatically lints, type-checks, bundles, packages, and publishes the extension to the VSCode Marketplace whenever a commit message pushed to `main` contains the word `build`. Also uploads the `.vsix` as a workflow artifact and creates a tagged GitHub Release.
- `npm run package` / `npm run publish` shortcuts for local `vsce` runs.

### Changed
- **Smartphone-optimized default width**: `imageWidth` default lowered from `1024` to `360` (Galaxy S25 logical CSS width). With the default `deviceScaleFactor` of `3`, the captured PNG is 1080 px wide — exactly the physical pixel width of a Galaxy S25 screen.
- **Bundled distribution with esbuild**: extension code is now bundled into a single minified `out/extension.js`. `node_modules` is excluded from the `.vsix` package, dramatically reducing the install footprint (was ~79 MB of node_modules shipped in v0.2.0).
- `vscode:prepublish` now runs `vendor → typecheck → build` instead of plain `tsc`.

### Removed
- `tsc`-emitted per-file JS in `out/` (replaced by a single esbuild bundle).

## [0.1.0] - 2026-05-21

### Changed
- **Complete architectural rewrite**: Removed Python, nbconvert, Playwright, and Chromium dependencies. Conversion now runs entirely in TypeScript via VSCode's built-in Webview + html2canvas. Users no longer need to install any external runtime.
- Code cell font size increased to 14px for better readability.
- Removed `In[N]:` / `Out[N]:` prompts for a cleaner look.

### Added
- `codeTheme` setting — choose syntax highlighting theme: Dracula (default), GitHub Light, GitHub Dark, Atom One Light, Atom One Dark, Monokai, Nord, Visual Studio Dark.
- `imageWidth` setting — customize generated PNG width (480–2400 px).
- Line numbers in source code cells.
- GitHub-styled markdown rendering for text cells (via `github-markdown-css`).
- Context menu entries for editor tabs and command palette in addition to Explorer sidebar.
- Auto-detect active notebook editor when the command is invoked without an explicit file URI (e.g., from the command palette).

### Removed
- Python scripts (`ipynb_to_png.py`, `python_scripts/convert.py`).
- `child-process-promise` npm dependency.

### Fixed
- `.vscodeignore` no longer excludes `node_modules`, so runtime dependencies ship inside the `.vsix`.
- Build artifacts (`out/`) are produced reliably before activation.

## [0.0.1] - 2026-05-20

### Added
- Initial release of Jupyter to PNG Converter
- Convert .ipynb files to high-quality PNG images
- Context menu integration in VSCode Explorer
- Configurable device scale factor (1-5) for image resolution
- Support for custom viewport settings
- Automatic temporary file cleanup
- Output channel for conversion progress and error messages

### Features
- nbconvert integration for HTML conversion
- Playwright-based screenshot capture
- Responsive viewport adjustment based on content height
- Real-time status messages and notifications
