import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// 単一の lessons コレクション。科目ごとにコレクションを分けない。
// 読み込み対象: src/content/lessons/<科目>/<章>/docs/**/*.md
// メタデータ（subject / chapterId / order / title）は frontmatter ではなく、
// パス構造と本文の H1 から導出する（src/lib/lessons.ts / remark-lesson.mjs）。
// → 科目・章を追加してもこの config.ts を変更する必要はない。
const lessons = defineCollection({
  loader: glob({
    pattern: '*/*/docs/**/*.md',
    base: './src/content/lessons',
    // 既定の generateId は小文字化・スラッグ化するため、
    // パスをそのまま id にして章・節の順序を確実に解析できるようにする。
    generateId: ({ entry }) => entry.replace(/\.md$/, ''),
  }),
  // frontmatter は任意。あれば title / order を上書きに使える。
  schema: z
    .object({
      title: z.string().optional(),
      order: z.number().optional(),
      draft: z.boolean().optional(),
    })
    .passthrough(),
});

export const collections = { lessons };
