// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkLesson from './src/plugins/remark-lesson.mjs';

// https://astro.build/config
export default defineConfig({
  // 組織の Pages サイト（Mebae-org.github.io）なのでルート公開。base は付けない。
  site: 'https://mebae-org.github.io',
  integrations: [mdx(), react()],
  markdown: {
    // remarkLesson: H1 抽出＋相対リンク書き換え / remarkMath: $ $$ を数式ノード化
    remarkPlugins: [remarkLesson, remarkMath],
    rehypePlugins: [rehypeKatex],
  },
});
