import { renderMarkdown } from './markdown';

// 演習の1問を表す型。数式入りの本文は KaTeX 済みの HTML 文字列にしておき、
// Quiz コンポーネントでは dangerouslySetInnerHTML で描画する。
export interface Choice {
  /** 照合に使う元テキスト（例: "$\\sqrt{2}$"） */
  raw: string;
  /** 表示用の KaTeX 済み HTML */
  html: string;
}

export interface Problem {
  /** 問題番号ラベル（例: "問1"） */
  id: string;
  kind: 'choice' | 'text';
  /** 問題文の HTML */
  promptHtml: string;
  /** 選択式のときの選択肢 */
  choices?: Choice[];
  /** 照合用の正答（元テキスト） */
  answer: string;
  /** 正答の表示用 HTML */
  answerHtml: string;
  /** 解説の HTML（無ければ undefined） */
  explanationHtml?: string;
}

// 各章の exercises/*.md を raw 文字列として build 時に取り込む
const exerciseFiles = import.meta.glob('/src/content/lessons/*/*/exercises/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const renderFragment = renderMarkdown;

/** 章に紐づく exercises/*.md をすべて読み、問題配列を返す（ファイル名順に連結） */
export function getExercises(subject: string, chapterId: string): Problem[] {
  const prefix = `/src/content/lessons/${subject}/${chapterId}/exercises/`;
  const paths = Object.keys(exerciseFiles)
    .filter((p) => p.startsWith(prefix))
    .sort();

  const problems: Problem[] = [];
  for (const path of paths) {
    problems.push(...parseExercises(exerciseFiles[path], path));
  }
  return problems;
}

/** 「## 問N」ごとに分割してパースする。書式に合わない問題はスキップし警告を出す。 */
export function parseExercises(raw: string, sourcePath = '(unknown)'): Problem[] {
  const headingRe = /^##\s+(問[^\n]*?)\s*$/gm;
  const matches = [...raw.matchAll(headingRe)];
  const problems: Problem[] = [];

  for (let i = 0; i < matches.length; i++) {
    const label = matches[i][1].trim();
    const start = matches[i].index! + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index! : raw.length;
    const block = raw.slice(start, end);

    const parsed = parseBlock(label, block);
    if (!parsed) {
      // ビルドは止めず、警告だけ出す
      console.warn(`[exercises] ${sourcePath}: "${label}" は書式に合わないためスキップしました`);
      continue;
    }
    problems.push(parsed);
  }
  return problems;
}

function parseBlock(label: string, block: string): Problem | null {
  const detailsIdx = block.search(/<details[^>]*>/i);
  if (detailsIdx === -1) return null; // 解答（details）が無い

  const statement = block.slice(0, detailsIdx).trim();
  if (!statement) return null;

  // details 内側だけを取り出す
  let inner = block.slice(detailsIdx);
  const closeIdx = inner.search(/<\/details>/i);
  if (closeIdx !== -1) inner = inner.slice(0, closeIdx);
  inner = inner
    .replace(/<details[^>]*>/i, '')
    .replace(/<summary>[\s\S]*?<\/summary>/i, '')
    .trim();

  const answerMatch = inner.match(/\*\*\s*答\s*[:：]\s*([\s\S]*?)\*\*/);
  if (!answerMatch) return null; // 「**答: ○○**」が無い
  const answer = answerMatch[1].trim();
  if (!answer) return null;

  // 答えの直前に「**選択: A / B / C**」があれば選択式
  const beforeAnswer = inner.slice(0, answerMatch.index);
  const choiceMatch = beforeAnswer.match(/\*\*\s*選択\s*[:：]\s*([\s\S]*?)\*\*/);
  const choices = choiceMatch
    ? choiceMatch[1]
        .split('/')
        .map((c) => c.trim())
        .filter(Boolean)
        .map((raw) => ({ raw, html: renderFragment(raw) }))
    : undefined;

  // 答えの行より後ろが解説
  const explanationSrc = inner.slice(answerMatch.index! + answerMatch[0].length).trim();

  return {
    id: label,
    kind: choices && choices.length > 0 ? 'choice' : 'text',
    promptHtml: renderFragment(statement),
    choices,
    answer,
    answerHtml: renderFragment(answer),
    explanationHtml: explanationSrc ? renderFragment(explanationSrc) : undefined,
  };
}
