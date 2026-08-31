import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// 科目ごとにコレクションを分けず、単一の lessons コレクションで扱う。
// 各レッスンは src/content/lessons/<科目id>/... に配置され、
// frontmatter の subject で科目を区別する。
// → 科目を追加してもこの config.ts を変更する必要はない。
const lessons = defineCollection({
  loader: glob({
    pattern: '**/[^_]*.{md,mdx}',
    base: './src/content/lessons',
  }),
  schema: z.object({
    // どの科目に属するか（courses.json の id と対応）
    subject: z.string(),
    title: z.string(),
    // 科目内での並び順（未指定なら 0）
    order: z.number().default(0),
    draft: z.boolean().default(false),
  }),
});

export const collections = { lessons };
