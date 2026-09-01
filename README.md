# 🌱 Mebae

学生のための教材・課題・演習をまとめて提供するプロジェクトのサイトです。
[Astro](https://astro.build/) で構築し、GitHub Pages（組織サイト）で公開しています。

- 公開URL: https://mebae-org.github.io/
- 数式は KaTeX（`$ ... $` / `$$ ... $$`）で描画
- 演習は自動採点（Quiz）、課題は Issue で提出

## 開発

パッケージマネージャは **pnpm** です。

```bash
pnpm install
pnpm dev      # 開発サーバ（http://localhost:4321）
pnpm build    # 本番ビルド（dist/ を生成）
pnpm preview  # ビルド結果をローカルで確認
```

## 構成

教材の本体はこのリポジトリには含みません。各科目は**別リポジトリ**にあり、
ビルド時に `courses.json` を読んで `src/content/lessons/<科目id>` へ取り込みます。

```
courses.json                     科目の一覧（id / title / order）
src/
  content.config.ts              単一 lessons コレクション（subject で科目を区別）
  content/lessons/               ← ビルド時に取り込み（.gitignore 済み）
  layouts/Base.astro             共通レイアウト（サイドバー＋本文）
  pages/
    index.astro                  トップ（概要）
    [subject]/[chapter].astro    章ページ（本文＋演習＋課題）
  components/Quiz.tsx            演習の自動採点（React 島, client:visible）
  lib/                           教材・演習・課題のパース
  plugins/remark-lesson.mjs      H1 抽出＋相対リンク書き換え
.github/workflows/deploy.yml     main への push でビルド＆Pages へデプロイ
```

### 科目の追加

`courses.json` に 1 行足すだけです（`config.ts` の変更は不要）。

```json
[
  { "id": "basic-math", "title": "基礎数学", "category": "数学", "order": 1 }
]
```

- 既定では教材を `Mebae-org/<id>` から取得します。
- `category` が同じ科目は、サイドバーで同じカテゴリにまとめられます。
- 別リポジトリ名にする場合は `"repo": "Owner/Name"`、ブランチ指定は `"branch": "..."` を追加。
- 非公開リポジトリを使う場合は、リポジトリの Secrets に `CONTENT_PAT`（教材の read 権限を持つ PAT）を登録してください。

## 教材リポジトリの構造

メタデータは frontmatter を使わず、**ディレクトリ構成と本文の H1 から自動で導出**します。

```
<科目>/
  ch01-numbers/
    docs/          本文（*.md）。1 ファイル = 1 ページ
    exercises/     演習（自動採点の対象）
    assignments/   課題（自動採点なし。Issue で提出）
```

- **subject**: パスの第1階層 / **chapterId**: 章ディレクトリ名 / **章の順序**: `ch01` の数字
- **節の順序**: ファイル名先頭の数字（`index.md` は 0 で先頭）
- **タイトル**: 本文の最初の `# 見出し`（レイアウトで表示するため本文からは除去）
- **URL**: `index.md` は `/<科目>/<章>`、ほかは `/<科目>/<章>/<docs 内の相対パス>`
- **教材の位置づけ**: `index.md` は AI を活用して継続的に運用し、その他の Markdown は人間が主体となって制作
- **演習・課題**: 章トップとなる `index.md` のページに集約

### 演習の書式（exercises/*.md）

```markdown
## 問1

$\sqrt{9}$ を計算せよ。

<details><summary>解答</summary>

**答: 3**

$9 = 3^2$ なので $\sqrt{9} = 3$。

</details>
```

- `## 問N` で 1 問。見出し以降 `<details>` までが問題文。
- `<details>` 内の `**答: ○○**` が正答。その直前に `**選択: A / B / C**` があれば選択式、無ければ記述式。
- 答えの行より後ろが解説。書式に合わない問題はスキップ（ビルドは継続）。

記述式の照合は正規化（前後空白除去 / 全角空白→半角 / 全角英数→半角）してから比較します。
章ごとの最高得点は `localStorage`（キー `mebae:quiz:<subject>:<chapter>`）に保存します。

## デプロイ

`main` への push で GitHub Actions が実行され、教材の取り込み → ビルド → Pages へ公開します。
初回のみ、リポジトリの **Settings → Pages → Source** を「GitHub Actions」に設定してください。
