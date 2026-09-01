import { getCollection, type CollectionEntry } from 'astro:content';

export type LessonEntry = CollectionEntry<'lessons'>;

export interface ParsedLessonId {
  subject: string;
  chapterId: string;
  /** 章ディレクトリ名の数字部分（ch01-numbers → 1） */
  chapterOrder: number;
  /** ファイル名の先頭数字（01-xxx.md → 1）。index.md は 0（常に先頭） */
  sectionOrder: number;
}

/** glob loader が生成した id（例: basic-math/ch01-numbers/docs/index）を分解する */
export function parseLessonId(id: string): ParsedLessonId {
  const parts = id.split('/');
  const subject = parts[0] ?? '';
  const chapterId = parts[1] ?? '';
  const fileBase = parts[parts.length - 1] ?? 'index';

  const chapterOrder = Number(chapterId.match(/\d+/)?.[0] ?? 0);
  const sectionOrder =
    fileBase === 'index' ? 0 : Number(fileBase.match(/^\d+/)?.[0] ?? 0);

  return { subject, chapterId, chapterOrder, sectionOrder };
}

/** 本文（frontmatter を除いた raw markdown）の先頭 H1 からタイトルを導出する */
export function deriveTitle(body: string | undefined): string | undefined {
  if (!body) return undefined;
  const m = body.match(/^\s{0,3}#\s+(.+?)\s*$/m);
  return m?.[1];
}

export interface Chapter {
  subject: string;
  chapterId: string;
  chapterOrder: number;
  title: string;
  /** sectionOrder 昇順に並んだ節（docs 配下のファイル） */
  sections: LessonEntry[];
}

/**
 * lessons コレクションを章単位に集約する。
 * docs 配下の複数ファイルは 1 つの章にまとめ、sectionOrder 順に並べる。
 */
export async function getChapters(subject?: string): Promise<Chapter[]> {
  const all = await getCollection('lessons');
  const byChapter = new Map<string, Chapter>();

  for (const entry of all) {
    const parsed = parseLessonId(entry.id);
    if (subject && parsed.subject !== subject) continue;

    const key = `${parsed.subject}/${parsed.chapterId}`;
    if (!byChapter.has(key)) {
      byChapter.set(key, {
        subject: parsed.subject,
        chapterId: parsed.chapterId,
        chapterOrder: parsed.chapterOrder,
        title: parsed.chapterId,
        sections: [],
      });
    }
    byChapter.get(key)!.sections.push(entry);
  }

  const chapters = [...byChapter.values()];
  for (const chapter of chapters) {
    chapter.sections.sort(
      (a, b) => parseLessonId(a.id).sectionOrder - parseLessonId(b.id).sectionOrder,
    );
    // 章タイトルは先頭（sectionOrder 最小 = index）の H1 から
    chapter.title = deriveTitle(chapter.sections[0]?.body) ?? chapter.chapterId;
  }
  chapters.sort((a, b) => a.chapterOrder - b.chapterOrder);
  return chapters;
}
