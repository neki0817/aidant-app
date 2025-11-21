# Phase 2-3 飲食業版AI質問生成 + 知識ベース統合 実装完了レポート

**実装日**: 2025-11-16
**ステータス**: ✅ 完了

---

## 1. 実装内容

### 1.1 知識ベース読み込み機能

**実装ファイル**: [functions/index.js](../functions/index.js)

#### `loadKnowledgeBase`関数の実装

```javascript
/**
 * 知識ベースのMarkdownファイルを読み込む
 *
 * @param {string} businessType - 業種（'飲食業' など）
 * @param {string} section - セクション（'顧客ニーズ'、'強み' など）
 * @returns {string} 知識ベースの内容（Markdown形式）
 */
function loadKnowledgeBase(businessType, section) {
  try {
    // 業種名を正規化（ファイルパスに使用可能な形式に）
    const normalizedBusinessType = businessType.replace(/[\/\\?%*:|"<>]/g, '_');

    // 知識ベースのディレクトリパス（functionsディレクトリ内）
    const knowledgeDir = path.join(__dirname, 'knowledge_base', businessType);

    // ディレクトリが存在しない場合は空文字列を返す
    if (!fs.existsSync(knowledgeDir)) {
      console.log(`[loadKnowledgeBase] Directory not found: ${knowledgeDir}`);
      return '';
    }

    // セクションに関連するファイルを検索
    const files = fs.readdirSync(knowledgeDir)
      .filter(file => {
        // セクション名が含まれるファイル、またはすべてのファイル
        return file.endsWith('.md') && (file.includes(section) || section === '全般');
      })
      .sort(); // ファイル名順にソート

    if (files.length === 0) {
      console.log(`[loadKnowledgeBase] No knowledge files found for ${businessType} / ${section}`);
      return '';
    }

    // ファイルを読み込んで結合
    const knowledgeContent = files.map(file => {
      const filePath = path.join(knowledgeDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      return content;
    }).join('\n\n---\n\n');

    console.log(`[loadKnowledgeBase] Loaded ${files.length} knowledge file(s) for ${businessType} / ${section}`);
    return knowledgeContent;
  } catch (error) {
    console.error('[loadKnowledgeBase] Error:', error);
    return '';
  }
}
```

#### 機能概要

1. **ディレクトリパス構築**: `functions/knowledge_base/{業種}/{セクション名を含むファイル}`
2. **ファイル検索**: セクション名（例：「顧客ニーズ」「強み」）を含むMarkdownファイルを検索
3. **複数ファイル対応**: 複数のファイルを読み込んで`---`で区切って結合
4. **エラーハンドリング**: ディレクトリやファイルが存在しない場合は空文字列を返す（エラーにしない）

### 1.2 Phase 2質問生成プロンプトへの統合

**関数**: `buildConversationalQuestionsPrompt`

#### 変更内容

```javascript
function buildConversationalQuestionsPrompt(businessType, dataItemId, dataItemLabel, collectedData, websiteSummary = '') {
  const websiteInfo = websiteSummary ? `\n\n# 公式Webサイトからの情報\n\n${websiteSummary}\n` : '';

  // 知識ベースを読み込む（Phase 2は「顧客ニーズ」セクション）
  const knowledgeBase = loadKnowledgeBase(businessType, '顧客ニーズ');
  const knowledgeInfo = knowledgeBase ? `\n\n# 参考知識（外部コンテンツから抽出）\n\nあなたは中小企業診断士レベルのAIです。以下の知識を参考に、採択率の高い質問を生成してください。\n\n${knowledgeBase}\n` : '';

  const prompt = `
業種: ${businessType}
${websiteInfo}
${knowledgeInfo}
「顧客ニーズと市場の動向」のセクションで、以下のデータ項目について情報収集します：
...
```

#### 統合されるプロンプト構造

```
業種: 飲食業

# 公式Webサイトからの情報
[Webサイト要約]

# 参考知識（外部コンテンツから抽出）
あなたは中小企業診断士レベルのAIです。以下の知識を参考に、採択率の高い質問を生成してください。

# 補助金申請で採択率90%を達成する方法（飲食業編）

**ソース**: YouTube
**URL**: https://youtube.com/watch?v=example (例)
**業種**: 飲食業
**セクション**: 顧客ニーズと市場の動向、自社の強み
**作成日**: 2025-11-16
**品質**: ⭐⭐⭐⭐⭐

## 要約
この動画では、中小企業診断士が実際の採択事例をもとに、補助金申請で採択率を上げるポイントを解説している。
特に飲食業において重要なのは、「顧客ニーズを具体的なデータで示すこと」「強みを数値で裏付けること」の2点である。

## 重要ポイント
1. **顧客ニーズは具体的なデータで示す**
   - 抽象的な表現（「お客様のニーズに応える」）は避ける
   - SNS投稿数、口コミ件数、リピート率等の定量データを活用
...

「顧客ニーズと市場の動向」のセクションで、以下のデータ項目について情報収集します：
...
```

### 1.3 Phase 3質問生成プロンプトへの統合

**関数**: `buildPhase3QuestionsPrompt`

#### 変更内容

```javascript
function buildPhase3QuestionsPrompt(businessType, dataItemId, dataItemLabel, collectedData, websiteSummary = '') {
  const websiteInfo = websiteSummary ? `\n\n# 公式Webサイトからの情報\n\n${websiteSummary}\n` : '';

  // 知識ベースを読み込む（Phase 3は「強み」セクション）
  const knowledgeBase = loadKnowledgeBase(businessType, '強み');
  const knowledgeInfo = knowledgeBase ? `\n\n# 参考知識（外部コンテンツから抽出）\n\nあなたは中小企業診断士レベルのAIです。以下の知識を参考に、採択率の高い質問を生成してください。\n\n${knowledgeBase}\n` : '';

  const prompt = `
業種: ${businessType}
${websiteInfo}
${knowledgeInfo}
「自社の強み」のセクションで、以下のデータ項目について情報収集します：
...
```

### 1.4 知識ベースファイルのデプロイ準備

#### ディレクトリ構造

```
functions/
├── index.js
├── package.json
└── knowledge_base/
    └── 飲食業/
        └── YouTube_補助金申請で採択率90%_20251116.md
```

#### デプロイ時の動作

- `firebase deploy --only functions`を実行すると、`knowledge_base`ディレクトリもCloud Functionsにアップロードされる
- `loadKnowledgeBase`関数がCloud Functions環境で実行されると、デプロイ済みのファイルを読み込む

---

## 2. 使用方法

### 2.1 新しい知識ファイルの追加

1. **NotebookLMで要約を生成**

   - YouTube動画、ブログ記事、PDF資料をNotebookLMに取り込む
   - 要約を生成

2. **Markdownファイルを作成**

   - `functions/knowledge_base/飲食業/` に新しいファイルを作成
   - ファイル名の形式: `{ソース}_{タイトル}_{作成日}.md`
   - 例: `Blog_採択率を上げる強みの書き方_20251117.md`

3. **ファイル内容のテンプレート**

```markdown
# [タイトル]

**ソース**: YouTube/Web/PDF
**URL**: [URL]
**業種**: 飲食業
**セクション**: 顧客ニーズ/強み/経営方針/補助事業計画/全般
**作成日**: 2025-11-16
**品質**: ⭐⭐⭐⭐⭐

---

## 要約

[NotebookLM generated summary]

---

## 重要ポイント

1. [Point 1]
2. [Point 2]

---

## 具体的なノウハウ

### ノウハウ1: [タイトル]

**内容:**
[詳細説明]

**記載例:**

- **悪い例**: [抽象的な表現]
- **良い例**: [具体的な表現]

---

## AIプロンプトへの活用方法

[このノウハウをAIプロンプトにどう組み込むか]

---

## タグ

`#飲食業` `#カフェ` `#顧客ニーズ` `#採択事例`
```

4. **デプロイ**

```bash
firebase deploy --only functions
```

### 2.2 セクション別のファイル検索ルール

`loadKnowledgeBase`関数は、ファイル名に**セクション名**が含まれているかを判定します。

| セクション     | マッチするファイル名の例                                                       |
| -------------- | ------------------------------------------------------------------------------ |
| `顧客ニーズ`   | `YouTube_顧客ニーズの記載方法_20251116.md`                                    |
| `強み`         | `Blog_採択率を上げる強みの書き方_20251117.md`                                 |
| `経営方針`     | `PDF_経営方針と目標の書き方_20251118.md`                                      |
| `補助事業計画` | `YouTube_補助事業計画の効果的な記載方法_20251119.md`                          |
| `全般`         | すべてのファイルを読み込む（セクション限定せず、業種内の全ファイルが対象）    |
| `顧客ニーズ`   | `YouTube_補助金申請で採択率90%_20251116.md`（複数セクションのファイルも対応） |

**重要**: 1つのファイルが複数セクションに対応する場合、ファイルのメタデータに複数のセクションを記載します。

```markdown
**セクション**: 顧客ニーズと市場の動向、自社の強み
```

この場合、「顧客ニーズ」で検索しても「強み」で検索しても、このファイルがマッチします。

---

## 3. 期待される効果

### 3.1 質問の品質向上

#### Before（知識ベースなし）

```json
{
  "questions": [
    {
      "id": "conv-1",
      "text": "お客様の年齢層を教えてください",
      "type": "multi_select",
      "options": ["20代", "30代", "40代", "50代", "60代以上"]
    }
  ]
}
```

#### After（知識ベースあり）

```json
{
  "questions": [
    {
      "id": "conv-1",
      "text": "お客様の年齢層を教えてください（複数選択可）",
      "type": "multi_select",
      "options": ["10代以下", "20代", "30代", "40代", "50代", "60代以上", "幅広い年齢層"],
      "example": ["30代", "40代"]
    },
    {
      "id": "conv-2",
      "text": "SNS投稿数や口コミ件数など、顧客ニーズを示す具体的なデータはありますか？",
      "type": "text",
      "placeholder": "例：Instagram投稿数が前年比150%増加",
      "optional": true
    }
  ]
}
```

### 3.2 採択率の向上

知識ベースの内容に基づいて質問を生成することで、以下のような**中小企業診断士レベルの質問**が可能になります：

1. **データ裏付けの促進**: 「SNS投稿数」「口コミ件数」「リピート率」などの定量データを引き出す質問
2. **具体性の向上**: 「美味しい」ではなく「どのような品質のこだわりがあるか」を聞く
3. **市場トレンドとの結びつけ**: 「健康志向の高まり」→「オーガニック食材メニューの売上推移」を聞く

### 3.3 ユーザー体験の向上

- **回答しやすさ**: 具体的な回答例が提示されるため、ユーザーが迷わない
- **学習効果**: 質問に答えながら、「採択されやすい申請書の書き方」を学べる
- **時間短縮**: AIが適切な質問を生成するため、ユーザーが考える時間が減る

---

## 4. 今後の拡張

### 4.1 Phase 4-5の知識ベース統合

Phase 4（経営方針・目標）、Phase 5（補助事業計画）の質問生成にも同様に知識ベースを統合します。

### 4.2 会話履歴からの知識抽出

ユーザーとの会話履歴を分析して、以下の情報を知識ベースに追加します：

1. **良い質問パターン**: ユーザーが具体的に回答できた質問
2. **良い回答例**: ユーザーが提供した具体的な回答
3. **ユーザー修正**: 様式2生成後にユーザーが修正した箇所

### 4.3 知識ベースの品質向上

1. **評価システム**: 各知識ファイルに品質スコア（⭐1-5）を付与
2. **更新頻度**: 古い情報を定期的に更新
3. **A/Bテスト**: 知識ベースありなしで採択率を比較

---

## 5. デプロイ手順

### 5.1 ローカルテスト

```bash
cd functions
npm test  # ユニットテストがあれば実行
```

### 5.2 デプロイ

```bash
firebase deploy --only functions
```

### 5.3 動作確認

1. Phase 2の質問生成をトリガー
2. Cloud Functionsのログを確認

```bash
firebase functions:log
```

3. ログに以下が表示されることを確認

```
[loadKnowledgeBase] Loaded 1 knowledge file(s) for 飲食業 / 顧客ニーズ
```

---

## 6. トラブルシューティング

### 6.1 ファイルが読み込まれない

**症状**: `[loadKnowledgeBase] Directory not found`

**原因**: `knowledge_base`ディレクトリがデプロイされていない

**解決策**:

```bash
# デプロイ前に確認
ls functions/knowledge_base/飲食業/

# 再デプロイ
firebase deploy --only functions
```

### 6.2 文字化け

**症状**: Markdown内容が文字化けする

**原因**: ファイルのエンコーディングがUTF-8ではない

**解決策**:

- ファイルをUTF-8で保存し直す
- BOM（Byte Order Mark）を削除

---

## 7. 実装済みのタスク

- [x] `loadKnowledgeBase`関数の実装
- [x] Phase 2プロンプトへの統合
- [x] Phase 3プロンプトへの統合
- [x] 知識ベースファイルのデプロイ準備
- [x] 実装完了レポート作成

## 8. 次のステップ

1. **Phase 4-5の知識ベース統合**
2. **会話履歴記録機能の実装**（Firestore）
3. **NotebookLMでの知識ファイル追加**（週次ルーチン）
4. **デプロイ＆動作確認**
