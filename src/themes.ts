export interface ThemeInfo {
  label: string;
  background: string;
  foreground: string;
  border: string;
  lineNumber: string;
}

export const DEFAULT_THEME = 'dracula';

export const THEMES: Record<string, ThemeInfo> = {
  'dracula': {
    label: 'Dracula',
    background: '#282936',
    foreground: '#e9e9f4',
    border: '#44475a',
    lineNumber: '#6272a4',
  },
  'github': {
    label: 'GitHub Light',
    background: '#ffffff',
    foreground: '#24292e',
    border: '#d0d7de',
    lineNumber: '#8b949e',
  },
  'github-dark': {
    label: 'GitHub Dark',
    background: '#0d1117',
    foreground: '#c9d1d9',
    border: '#30363d',
    lineNumber: '#6e7681',
  },
  'atom-one-light': {
    label: 'Atom One Light',
    background: '#fafafa',
    foreground: '#383a42',
    border: '#d4d4d4',
    lineNumber: '#9d9d9f',
  },
  'atom-one-dark': {
    label: 'Atom One Dark',
    background: '#282c34',
    foreground: '#abb2bf',
    border: '#3e4451',
    lineNumber: '#636d83',
  },
  'monokai': {
    label: 'Monokai',
    background: '#272822',
    foreground: '#dddddd',
    border: '#49483e',
    lineNumber: '#75715e',
  },
  'nord': {
    label: 'Nord',
    background: '#2e3440',
    foreground: '#d8dee9',
    border: '#4c566a',
    lineNumber: '#616e88',
  },
  'vs2015': {
    label: 'Visual Studio Dark',
    background: '#1e1e1e',
    foreground: '#dcdcdc',
    border: '#333333',
    lineNumber: '#5a5a5a',
  },
  // Light, GitHub-print look from nb_convert.py's vertical (A4) mode. Pairs with
  // media/themes/leekh.css (syntax) and leekh.chrome.css (document styling).
  'leekh': {
    label: 'Leekh',
    background: '#f6f8fa',
    foreground: '#24292e',
    border: '#d0d7de',
    lineNumber: '#8b949e',
  },
};

export function resolveTheme(name: string | undefined): { key: string; info: ThemeInfo } {
  const key = name && name in THEMES ? name : DEFAULT_THEME;
  return { key, info: THEMES[key] };
}
