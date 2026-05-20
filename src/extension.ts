import * as vscode from 'vscode';
import * as path from 'path';
import { promises as fs } from 'fs';
import { renderNotebook } from './render';
import { Notebook } from './notebook';
import { resolveTheme, ThemeInfo } from './themes';

let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel('Jupyter to PNG Converter');

  const disposable = vscode.commands.registerCommand(
    'ipynb-to-png-converter.convertToPng',
    async (fileUri?: vscode.Uri) => {
      const target = fileUri ?? resolveActiveNotebookUri();
      if (!target || !target.fsPath.endsWith('.ipynb')) {
        vscode.window.showErrorMessage('Please select a .ipynb file');
        return;
      }
      await convertNotebookToPng(context, target.fsPath);
    }
  );

  context.subscriptions.push(disposable);
}

async function convertNotebookToPng(
  context: vscode.ExtensionContext,
  filePath: string
): Promise<void> {
  const fileName = path.basename(filePath);
  const pngPath = filePath.replace(/\.ipynb$/, '.png');

  outputChannel.clear();
  outputChannel.show(true);
  outputChannel.appendLine(`📝 Converting: ${fileName}`);

  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const notebook = JSON.parse(raw) as Notebook;
    const bodyHtml = renderNotebook(notebook);

    const config = vscode.workspace.getConfiguration('ipynb-to-png-converter');
    const scale = clamp(config.get<number>('deviceScaleFactor', 3), 1, 5);
    const imageWidth = clamp(config.get<number>('imageWidth', 1024), 480, 2400);
    const theme = resolveTheme(config.get<string>('codeTheme'));

    outputChannel.appendLine(
      `Rendering in webview (theme: ${theme.info.label}, width: ${imageWidth}px, scale: ${scale}x)…`
    );
    const dataUrl = await captureInWebview(context, {
      bodyHtml,
      scale,
      imageWidth,
      theme: theme.info,
      themeKey: theme.key,
    });

    const buffer = Buffer.from(dataUrl.split(',')[1], 'base64');
    await fs.writeFile(pngPath, buffer);

    outputChannel.appendLine(`✅ Saved: ${pngPath}`);
    vscode.window.showInformationMessage(
      `✅ Converted to PNG: ${path.basename(pngPath)}`
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
  imageWidth: number;
  theme: ThemeInfo;
  themeKey: string;
}

async function captureInWebview(
  context: vscode.ExtensionContext,
  params: CaptureParams
): Promise<string> {
  const { bodyHtml, scale, imageWidth, theme, themeKey } = params;
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
  --capture-width: ${imageWidth}px;
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
        resolve(msg.dataUrl as string);
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
      cspSource: panel.webview.cspSource,
      html2canvasUri: html2canvasUri.toString(),
      inlineCss: `${themeVars}\n${githubMdCss}\n${hljsCss}\n${styles}`,
    });
  });
}

function buildWebviewHtml(params: {
  bodyHtml: string;
  scale: number;
  cspSource: string;
  html2canvasUri: string;
  inlineCss: string;
}): string {
  const { bodyHtml, scale, cspSource, html2canvasUri, inlineCss } = params;
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
        vscode.postMessage({ type: 'result', dataUrl: canvas.toDataURL('image/png') });
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
