import { renderMarkdown } from './markdown';

const ORG = 'Mebae-org';

export interface Assignment {
  /** ファイル名ベースの id（例: index, 01-report） */
  id: string;
  /** 本文をそのままレンダリングした HTML（自動判定はしない） */
  bodyHtml: string;
  /** 提出用: 教材リポジトリの Issue Forms（絶対URL） */
  issueUrl: string;
}

// 各章の assignments/*.md を raw 文字列として build 時に取り込む
const assignmentFiles = import.meta.glob(
  '/src/content/lessons/*/*/assignments/**/*.md',
  { query: '?raw', import: 'default', eager: true },
) as Record<string, string>;

/** 章に紐づく課題を返す（ファイル名順）。自動判定の対象外。 */
export function getAssignments(subject: string, chapterId: string): Assignment[] {
  const prefix = `/src/content/lessons/${subject}/${chapterId}/assignments/`;
  // Issue Forms のチューザー。提出先は教材リポジトリ Mebae-org/<subject>。
  const issueUrl = `https://github.com/${ORG}/${subject}/issues/new/choose`;

  return Object.keys(assignmentFiles)
    .filter((p) => p.startsWith(prefix))
    .sort()
    .map((path) => {
      const id = path.slice(prefix.length).replace(/\.md$/, '');
      return {
        id,
        bodyHtml: renderMarkdown(assignmentFiles[path]),
        issueUrl,
      };
    });
}
