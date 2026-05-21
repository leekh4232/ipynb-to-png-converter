import * as vscode from 'vscode';
import * as path from 'path';
import { promises as fs } from 'fs';
import { jsPDF } from 'jspdf';
import { renderNotebook } from './render';
import { Notebook } from './notebook';
import { resolveTheme, ThemeInfo } from './themes';

let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel('Jupyter to PNG Converter');

  const pngDisposable = vscode.commands.registerCommand(
    'ipynb-to-png-converter.convertToPng',
    async (fileUri?: vscode.Uri) => {
      const target = fileUri ?? resolveActiveNotebookUri();
      if (!target || !target.fsPath.endsWith('.ipynb')) {
        vscode.window.showErrorMessage('Please select a .ipynb file');
        return;
      }
      await convertNotebookToImage(context, target.fsPath, 'png');
    }
  );

  const pdfDisposable = vscode.commands.registerCommand(
    'ipynb-to-png-converter.convertToPdf',
    async (fileUri?: vscode.Uri) => {
      const target = fileUri ?? resolveActiveNotebookUri();
      if (!target || !target.fsPath.endsWith('.ipynb')) {
        vscode.window.showErrorMessage('Please select a .ipynb file');
        return;
      }
      await convertNotebookToImage(context, target.fsPath, 'pdf');
    }
  );

  context.subscriptions.push(pngDisposable, pdfDisposable);
}

async function convertNotebookToImage(
  context: vscode.ExtensionContext,
  filePath: string,
  format: 'png' | 'pdf'
): Promise<void> {
  const fileName = path.basename(filePath);
  const extension = format === 'png' ? '.png' : '.pdf';
  const outputPath = filePath.replace(/\.ipynb$/, extension);

  outputChannel.clear();
  outputChannel.show(true);
  outputChannel.appendLine(`📝 Converting: ${fileName} → ${format.toUpperCase()}`);

  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const notebook = JSON.parse(raw) as Notebook;
    const bodyHtml = renderNotebook(notebook);

    const config = vscode.workspace.getConfiguration('ipynb-to-png-converter');
    const scale = clamp(config.get<number>('deviceScaleFactor', 3), 1, 5);
    const imageWidth = clamp(config.get<number>('imageWidth', 800), 360, 2400);
    const pdfPageWidth = clamp(config.get<number>('pdfPageWidth', 800), 360, 2400);
    const pdfPageHeight = clamp(config.get<number>('pdfPageHeight', 1280), 480, 4000);
    const pdfPageMargin = clamp(
      config.get<number>('pdfPageMargin', 32),
      0,
      Math.min(Math.floor(pdfPageWidth / 2) - 1, Math.floor(pdfPageHeight / 2) - 1)
    );
    const theme = resolveTheme(config.get<string>('codeTheme'));

    const pdfContentWidth = pdfPageWidth - 2 * pdfPageMargin;
    const pdfContentHeight = pdfPageHeight - 2 * pdfPageMargin;
    const captureWidth = format === 'pdf' ? pdfContentWidth : imageWidth;
    const pageHeightCss = format === 'pdf' ? pdfContentHeight : null;

    outputChannel.appendLine(
      format === 'pdf'
        ? `Rendering in webview (theme: ${theme.info.label}, page: ${pdfPageWidth}×${pdfPageHeight}px CSS, margin: ${pdfPageMargin}px, scale: ${scale}x)…`
        : `Rendering in webview (theme: ${theme.info.label}, width: ${imageWidth}px, scale: ${scale}x)…`
    );
    const pages = await captureInWebview(context, {
      bodyHtml,
      scale,
      captureWidth,
      pageHeightCss,
      theme: theme.info,
      themeKey: theme.key,
      format,
    });

    if (format === 'pdf') {
      outputChannel.appendLine(`Assembling PDF (${pages.length} page${pages.length === 1 ? '' : 's'})…`);
      const buffer = await generatePdfFromPages(pages, pdfPageWidth, pdfPageHeight, pdfPageMargin);
      await fs.writeFile(outputPath, buffer);
    } else {
      const buffer = Buffer.from(pages[0].split(',')[1], 'base64');
      await fs.writeFile(outputPath, buffer);
    }

    outputChannel.appendLine(`✅ Saved: ${outputPath}`);
    vscode.window.showInformationMessage(
      `✅ Converted to ${format.toUpperCase()}: ${path.basename(outputPath)}`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    outputChannel.appendLine(`❌ Error: ${message}`);
    vscode.window.showErrorMessage(`Failed to convert notebook: ${message}`);
  }
}

interface CaptureParams {
  bodyHtml: string;
  scale: number;
  captureWidth: number;
  pageHeightCss: number | null;
  theme: ThemeInfo;
  themeKey: string;
  format: 'png' | 'pdf';
}

async function captureInWebview(
  context: vscode.ExtensionContext,
  params: CaptureParams
): Promise<string[]> {
  const { bodyHtml, scale, captureWidth, pageHeightCss, theme, themeKey, format } = params;
  const mediaRoot = vscode.Uri.joinPath(context.extensionUri, 'media');

  // Inline CSS into a <style> tag. html2canvas clones the DOM into an iframe
  // and cannot fetch external stylesheets across webview origins, so <link>
  // tags would produce an unstyled capture even though the live webview looks
  // correct.
  const [githubMdCss, hljsCss, styles] = await Promise.all([
    fs.readFile(vscode.Uri.joinPath(mediaRoot, 'github-markdown.css').fsPath, 'utf-8'),
    fs.readFile(vscode.Uri.joinPath(mediaRoot, 'themes', `${themeKey}.css`).fsPath, 'utf-8'),
    fs.readFile(vscode.Uri.joinPath(mediaRoot, 'styles.css').fsPath, 'utf-8'),
  ]);

  const themeVars = `:root {
  --capture-width: ${captureWidth}px;
  --code-bg: ${theme.background};
  --code-fg: ${theme.foreground};
  --code-border: ${theme.border};
  --line-number-color: ${theme.lineNumber};
}`;

  return new Promise((resolve, reject) => {
    const panel = vscode.window.createWebviewPanel(
      'ipynbToPngRenderer',
      'Converting notebook…',
      { viewColumn: vscode.ViewColumn.Active, preserveFocus: true },
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [mediaRoot],
      }
    );

    const html2canvasUri = panel.webview.asWebviewUri(
      vscode.Uri.joinPath(mediaRoot, 'html2canvas.min.js')
    );

    const timeout = setTimeout(() => {
      panel.dispose();
      reject(new Error('Webview rendering timed out after 60s'));
    }, 60_000);

    const subscription = panel.webview.onDidReceiveMessage((msg) => {
      if (msg?.type === 'result') {
        clearTimeout(timeout);
        subscription.dispose();
        panel.dispose();
        resolve((msg.pages as string[]) ?? [msg.dataUrl as string]);
      } else if (msg?.type === 'error') {
        clearTimeout(timeout);
        subscription.dispose();
        panel.dispose();
        reject(new Error(String(msg.message ?? 'Unknown webview error')));
      }
    });

    panel.webview.html = buildWebviewHtml({
      bodyHtml,
      scale,
      format,
      pageHeightPx: pageHeightCss !== null ? pageHeightCss * scale : null,
      cspSource: panel.webview.cspSource,
      html2canvasUri: html2canvasUri.toString(),
      inlineCss: `${themeVars}\n${githubMdCss}\n${hljsCss}\n${styles}`,
    });
  });
}

function buildWebviewHtml(params: {
  bodyHtml: string;
  scale: number;
  format: 'png' | 'pdf';
  pageHeightPx: number | null;
  cspSource: string;
  html2canvasUri: string;
  inlineCss: string;
}): string {
  const { bodyHtml, scale, format, pageHeightPx, cspSource, html2canvasUri, inlineCss } = params;
  const csp = [
    `default-src 'none'`,
    `img-src ${cspSource} data: blob:`,
    `style-src ${cspSource} 'unsafe-inline'`,
    `script-src ${cspSource} 'unsafe-inline'`,
    `font-src ${cspSource} data:`,
  ].join('; ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Security-Policy" content="${csp}" />
<style>${inlineCss}</style>
<script src="${html2canvasUri}"></script>
</head>
<body>
<div id="capture-root">${bodyHtml}</div>
<script>
(function () {
  const vscode = acquireVsCodeApi();
  const format = ${JSON.stringify(format)};
  const pageHeightPx = ${pageHeightPx === null ? 'null' : pageHeightPx};

  function sliceIntoPages(srcCanvas, pageHeight) {
    const w = srcCanvas.width;
    const totalH = srcCanvas.height;
    const pages = [];
    for (let y = 0; y < totalH; y += pageHeight) {
      const sliceH = Math.min(pageHeight, totalH - y);
      const page = document.createElement('canvas');
      page.width = w;
      page.height = pageHeight;
      const ctx = page.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, pageHeight);
      ctx.drawImage(srcCanvas, 0, y, w, sliceH, 0, 0, w, sliceH);
      pages.push(page.toDataURL('image/png'));
    }
    return pages.length > 0 ? pages : [srcCanvas.toDataURL('image/png')];
  }

  function capture() {
    const target = document.getElementById('capture-root');
    html2canvas(target, {
      scale: ${scale},
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
      windowWidth: target.scrollWidth,
      windowHeight: target.scrollHeight,
    })
      .then((canvas) => {
        if (format === 'pdf' && pageHeightPx) {
          vscode.postMessage({ type: 'result', pages: sliceIntoPages(canvas, pageHeightPx) });
        } else {
          vscode.postMessage({ type: 'result', pages: [canvas.toDataURL('image/png')] });
        }
      })
      .catch((err) => {
        vscode.postMessage({ type: 'error', message: String(err && err.message || err) });
      });
  }
  // Wait for fonts and images before capturing
  const imgPromises = Array.from(document.images).map((img) =>
    img.complete ? Promise.resolve() : new Promise((r) => {
      img.addEventListener('load', r);
      img.addEventListener('error', r);
    })
  );
  Promise.all([document.fonts ? document.fonts.ready : Promise.resolve(), ...imgPromises])
    .then(() => requestAnimationFrame(() => requestAnimationFrame(capture)))
    .catch(() => capture());
})();
</script>
</body>
</html>`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

async function generatePdfFromPages(
  pages: string[],
  pageWidthCss: number,
  pageHeightCss: number,
  marginCss: number
): Promise<Buffer> {
  const orientation = pageHeightCss >= pageWidthCss ? 'portrait' : 'landscape';
  const contentWidth = pageWidthCss - 2 * marginCss;
  const contentHeight = pageHeightCss - 2 * marginCss;
  const pdf = new jsPDF({
    orientation,
    unit: 'px',
    format: [pageWidthCss, pageHeightCss],
    hotfixes: ['px_scaling'],
    compress: true,
  });
  for (let i = 0; i < pages.length; i++) {
    if (i > 0) {
      pdf.addPage([pageWidthCss, pageHeightCss], orientation);
    }
    pdf.addImage(pages[i], 'PNG', marginCss, marginCss, contentWidth, contentHeight, undefined, 'FAST');
  }
  return Buffer.from(pdf.output('arraybuffer'));
}

function resolveActiveNotebookUri(): vscode.Uri | undefined {
  const notebook = vscode.window.activeNotebookEditor?.notebook.uri;
  if (notebook?.fsPath.endsWith('.ipynb')) {
    return notebook;
  }
  const editor = vscode.window.activeTextEditor?.document.uri;
  if (editor?.fsPath.endsWith('.ipynb')) {
    return editor;
  }
  return undefined;
}

export function deactivate() {}
