# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
