import path from 'node:path';

// 教材リポジトリの GitHub オーガニゼーション。
// 相対リンクの書き換え先に使う（repo 名は科目 id と一致する前提）。
const ORG = 'Mebae-org';
const BRANCH = 'main';

/**
 * frontmatter を使わない教材向けの remark プラグイン。
 *  1. 本文先頭の H1 を取り出して frontmatter.title に格納し、本文からは除去する
 *     （タイトルはレイアウト側で表示するため、本文に残すと重複するため）
 *  2. 相対リンク（../exercises/ など）を教材リポジトリの GitHub URL に書き換える
 *     （web 側に対応ページが無いため、リンク切れを避ける）
 */
export default function remarkLesson() {
  return (tree, file) => {
    extractTitle(tree, file);
    rewriteRelativeLinks(tree, file);
  };
}

function extractTitle(tree, file) {
  const children = tree.children ?? [];
  for (let i = 0; i < children.length; i++) {
    const node = children[i];
    if (node.type === 'heading' && node.depth === 1) {
      const title = mdastToString(node).trim();
      children.splice(i, 1); // 本文から H1 を除去
      file.data.astro ??= {};
      file.data.astro.frontmatter ??= {};
      file.data.astro.frontmatter.title = title;
      return;
    }
  }
}

function rewriteRelativeLinks(tree, file) {
  const filePath = (file.path ?? file.history?.[0] ?? '').replace(/\\/g, '/');
  // src/content/lessons/<subject>/<chapter>/docs/<...>.md を取り出す
  const m = filePath.match(/\/lessons\/([^/]+)\/([^/]+)\/docs\/(.+)$/);
  if (!m) return;
  const [, subject, chapter, docRel] = m;
  const repo = `${ORG}/${subject}`;
  // 教材リポジトリ内での、このファイルが属するディレクトリ
  const dirInRepo = path.posix.dirname(`${chapter}/docs/${docRel}`);

  visitLinks(tree, (node) => {
    if (!isRelative(node.url)) return;
    const [rawPath, hash = ''] = splitHash(node.url);
    const isDir = rawPath === '' || rawPath.endsWith('/');
    // 教材リポジトリのルートからの相対パスに解決
    const resolved = path.posix
      .normalize(path.posix.join(dirInRepo, rawPath))
      .replace(/^(\.\/)+/, '')
      .replace(/\/$/, '');
    const kind = isDir ? 'tree' : 'blob';
    node.url = `https://github.com/${repo}/${kind}/${BRANCH}/${resolved}${hash}`;
    node.data ??= {};
    node.data.hProperties = {
      ...(node.data.hProperties ?? {}),
      target: '_blank',
      rel: 'noopener noreferrer',
    };
  });
}

// --- helpers ---------------------------------------------------------------

function mdastToString(node) {
  if (typeof node.value === 'string') return node.value;
  if (Array.isArray(node.children)) return node.children.map(mdastToString).join('');
  return '';
}

function visitLinks(node, fn) {
  if (node.type === 'link') fn(node);
  if (Array.isArray(node.children)) {
    for (const child of node.children) visitLinks(child, fn);
  }
}

function isRelative(url) {
  if (!url) return false;
  return (
    !/^[a-z][a-z0-9+.-]*:/i.test(url) && // http:, mailto:, tel: など
    !url.startsWith('//') &&
    !url.startsWith('/') &&
    !url.startsWith('#')
  );
}

function splitHash(url) {
  const i = url.indexOf('#');
  return i === -1 ? [url, ''] : [url.slice(0, i), url.slice(i)];
}
