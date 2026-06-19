import { marked } from 'marked';
import hljs from 'highlight.js';
import {
  Cell,
  CellOutput,
  CodeCell,
  ErrorOutput,
  MarkdownCell,
  MimeBundle,
  Notebook,
  RawCell,
  joinSource,
} from './notebook';

marked.setOptions({
  gfm: true,
  breaks: false,
});

// eslint-disable-next-line no-control-regex
const ANSI_ESCAPE = /\x1b\[[0-9;]*m/g;

export function renderNotebook(nb: Notebook): string {
  const language =
    nb.metadata?.language_info?.name ??
    nb.metadata?.kernelspec?.language ??
    'python';

  const cellsHtml = nb.cells.map((cell) => renderCell(cell, language)).join('\n');
  return `<div class="jp-Notebook">\n${cellsHtml}\n</div>`;
}

// Renders a standalone Markdown document, reusing the same notebook chrome so it
// flows through the identical capture/theme pipeline as a .ipynb file.
export function renderMarkdown(source: string): string {
  const cell = markdownCellHtml(marked.parse(source) as string);
  return `<div class="jp-Notebook">\n${cell}\n</div>`;
}

function markdownCellHtml(html: string): string {
  return `<div class="jp-Cell jp-MarkdownCell"><div class="jp-Cell-inputWrapper"><div class="markdown-body">${html}</div></div></div>`;
}

function renderCell(cell: Cell, language: string): string {
  switch (cell.cell_type) {
    case 'markdown':
      return renderMarkdownCell(cell);
    case 'code':
      return renderCodeCell(cell, language);
    case 'raw':
      return renderRawCell(cell);
    default:
      return '';
  }
}

function renderMarkdownCell(cell: MarkdownCell): string {
  return markdownCellHtml(marked.parse(joinSource(cell.source)) as string);
}

function renderRawCell(cell: RawCell): string {
  return `<div class="jp-Cell jp-RawCell"><pre class="jp-RenderedText">${escapeHtml(joinSource(cell.source))}</pre></div>`;
}

function renderCodeCell(cell: CodeCell, language: string): string {
  const source = joinSource(cell.source).replace(/\n$/, '');
  const highlighted = highlightCode(source, language);
  const lineCount = source.split('\n').length;
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1).join('\n');

  const outputs = (cell.outputs ?? []).map(renderOutput).join('\n');
  const outputsBlock = outputs
    ? `<div class="jp-Cell-outputWrapper">${outputs}</div>`
    : '';

  return `<div class="jp-Cell jp-CodeCell">
  <div class="jp-Cell-inputWrapper">
    <div class="jp-InputArea-editor">
      <pre class="jp-LineNumbers">${lineNumbers}</pre>
      <pre class="hljs"><code>${highlighted}</code></pre>
    </div>
  </div>
  ${outputsBlock}
</div>`;
}

function renderOutput(output: CellOutput): string {
  switch (output.output_type) {
    case 'stream':
      return renderStream(output.name, joinSource(output.text));
    case 'display_data':
    case 'execute_result':
      return renderMime(output.data);
    case 'error':
      return renderError(output);
    default:
      return '';
  }
}

function renderStream(name: string, text: string): string {
  const cls = name === 'stderr' ? 'jp-OutputArea-stderr' : 'jp-OutputArea-stdout';
  return `<div class="jp-OutputArea ${cls}"><pre class="jp-RenderedText">${escapeHtml(stripAnsi(text))}</pre></div>`;
}

function renderMime(data: MimeBundle): string {
  // Priority order — pick the richest representation Jupyter would show.
  if (data['image/png']) {
    const src = `data:image/png;base64,${(data['image/png'] as string).trim()}`;
    return `<div class="jp-OutputArea"><img class="jp-OutputImage" src="${src}" /></div>`;
  }
  if (data['image/jpeg']) {
    const src = `data:image/jpeg;base64,${(data['image/jpeg'] as string).trim()}`;
    return `<div class="jp-OutputArea"><img class="jp-OutputImage" src="${src}" /></div>`;
  }
  if (data['image/svg+xml']) {
    const svg = joinSource(data['image/svg+xml'] as string | string[]);
    return `<div class="jp-OutputArea"><div class="jp-OutputImage">${svg}</div></div>`;
  }
  if (data['text/html']) {
    const html = joinSource(data['text/html'] as string | string[]);
    return `<div class="jp-OutputArea"><div class="jp-RenderedHTML">${html}</div></div>`;
  }
  if (data['text/markdown']) {
    const html = marked.parse(joinSource(data['text/markdown'] as string | string[])) as string;
    return `<div class="jp-OutputArea"><div class="markdown-body">${html}</div></div>`;
  }
  if (data['text/plain']) {
    const text = joinSource(data['text/plain'] as string | string[]);
    return `<div class="jp-OutputArea"><pre class="jp-RenderedText">${escapeHtml(text)}</pre></div>`;
  }
  return '';
}

function renderError(output: ErrorOutput): string {
  const traceback = (output.traceback ?? []).map(stripAnsi).join('\n');
  return `<div class="jp-OutputArea jp-OutputArea-error"><pre class="jp-RenderedText">${escapeHtml(traceback)}</pre></div>`;
}

function highlightCode(source: string, language: string): string {
  if (hljs.getLanguage(language)) {
    try {
      return hljs.highlight(source, { language, ignoreIllegals: true }).value;
    } catch {
      // fall through to escape-only
    }
  }
  return escapeHtml(source);
}

function stripAnsi(text: string): string {
  return text.replace(ANSI_ESCAPE, '');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
