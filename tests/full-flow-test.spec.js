// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * 全フローテスト（Phase 0 → Phase 6）
 *
 * 実際のユーザーフローを通しでテストし、使用感を確認
 */

// テスト用認証情報
const TEST_EMAIL = 'washo0410@gmail.com';
const TEST_PASSWORD = 'neki12345@';

test.describe('全フローテスト', () => {
  test.setTimeout(600000); // 10分のタイムアウト

  test('Phase 0からPhase 6まで通しでテスト', async ({ page }) => {
    const report = {
      phases: [],
      issues: [],
      suggestions: []
    };

    // コンソールログを監視
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Error') || text.includes('error') || text.includes('失敗')) {
        console.log('[ERROR]', text);
        report.issues.push({ type: 'console_error', message: text });
      }
      // Phase 2デバッグ用ログ
      if (text.includes('Phase 2') || text.includes('ConversationalPhase2') || text.includes('handleAnswer') || text.includes('confirm')) {
        console.log('[DEBUG]', text);
      }
    });

    // ===== Phase 0: ログイン =====
    console.log('\n========== PHASE 0: ログイン ==========');
    const phase0Start = Date.now();

    await page.goto('http://localhost:3000');
    await page.waitForSelector('input[type="email"]', { timeout: 30000 });

    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');

    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'tests/screenshots/flow-01-login.png', fullPage: true });

    report.phases.push({
      phase: 'Login',
      duration: Date.now() - phase0Start,
      status: 'success'
    });
    console.log('✅ ログイン完了');

    // ===== 「補助金申請を開始」ボタンをクリック =====
    console.log('\n========== 「補助金申請を開始」ボタンをクリック ==========');

    // 「補助金申請を開始」ボタンを探してクリック
    const startButton = page.locator('button:has-text("補助金申請を開始")');
    await startButton.waitFor({ state: 'visible', timeout: 10000 });
    console.log('「補助金申請を開始」ボタンを検出');
    await startButton.click();
    console.log('「補助金申請を開始」ボタンをクリックしました');
    await page.waitForTimeout(3000);

    // チャット画面が表示されるまで待機
    await page.waitForSelector('.chat-container, .message-bubble', { timeout: 15000 });
    console.log('チャット画面に遷移しました');

    // 「始める」ボタンがあればクリック
    const hajimeruButton = page.locator('button:has-text("始める")');
    if (await hajimeruButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('「始める」ボタンを検出');
      await hajimeruButton.click();
      console.log('「始める」ボタンをクリックしました');
      await page.waitForTimeout(3000);
    }

    await page.screenshot({ path: 'tests/screenshots/flow-02-start.png', fullPage: true });

    // ===== Phase 0: 補助対象判定 =====
    console.log('\n========== PHASE 0: 補助対象判定 ==========');
    const phaseP0Start = Date.now();

    // Q0-1: 取組の目的（複数選択）
    console.log('Q0-1: 取組の目的を選択中...');
    await page.waitForTimeout(2000);

    // 最新のメッセージバブル内の選択肢ボタンを取得
    const latestBubble = page.locator('.message-bubble.ai').last();
    const q01Options = latestBubble.locator('.option-button');
    const q01Count = await q01Options.count();
    console.log(`Q0-1 選択肢数: ${q01Count}`);

    if (q01Count > 0) {
      // 最初の2つを選択（複数選択）
      await q01Options.nth(0).click();
      await page.waitForTimeout(500);
      await q01Options.nth(1).click();
      await page.waitForTimeout(500);

      // 確定ボタンをクリック
      const confirmBtn = latestBubble.locator('.confirm-selection-button:not([disabled])');
      if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmBtn.click();
        await page.waitForTimeout(3000);
      }
    }

    await page.screenshot({ path: 'tests/screenshots/flow-03-q0-1.png', fullPage: true });

    // Q0-2: 過去の受給歴（単一選択）
    console.log('Q0-2: 過去の受給歴を選択中...');
    await page.waitForTimeout(2000);

    const latestBubble2 = page.locator('.message-bubble.ai').last();
    const q02Options = latestBubble2.locator('.option-button');
    const q02Count = await q02Options.count();
    console.log(`Q0-2 選択肢数: ${q02Count}`);

    if (q02Count > 0) {
      // 「いいえ」を選択（最初のオプション）
      await q02Options.first().click();
      await page.waitForTimeout(3000);
    }

    await page.screenshot({ path: 'tests/screenshots/flow-04-q0-2.png', fullPage: true });

    report.phases.push({
      phase: 'Phase 0 (補助対象判定)',
      duration: Date.now() - phaseP0Start,
      status: 'success'
    });
    console.log('✅ Phase 0 完了');

    // ===== Phase 1: 基本情報 =====
    console.log('\n========== PHASE 1: 基本情報 ==========');
    const phase1Start = Date.now();

    // Q1-0: 店舗検索（実際の店舗情報を使用）
    // テスト用の実在店舗: クレアバッカス（赤坂のワインバー）
    const TEST_STORE_NAME = 'クレアバッカス 赤坂';
    console.log(`Q1-0: 店舗検索中... (${TEST_STORE_NAME})`);
    await page.waitForTimeout(3000);

    // Google Maps検索入力欄を探す
    const searchInput = page.locator('input[placeholder*="店舗名"], input[placeholder*="検索"]');
    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.fill(TEST_STORE_NAME);
      await page.waitForTimeout(3000); // Google Places APIの応答待ち時間を増やす

      // 検索結果を選択
      const searchResult = page.locator('.pac-item, .search-result-item').first();
      if (await searchResult.isVisible({ timeout: 5000 }).catch(() => false)) {
        await searchResult.click();
        console.log('  店舗を選択しました');
        await page.waitForTimeout(3000);
      }
    }

    await page.screenshot({ path: 'tests/screenshots/flow-05-q1-0.png', fullPage: true });

    // 以降の質問に自動回答（汎用的なヘルパー関数）
    let lastAnsweredQuestion = ''; // 重複回答防止用
    let lastConfirmQuestion = ''; // 確認質問の追跡用
    const answerCurrentQuestion = async (phaseLabel) => {
      // 確認質問に回答した直後の場合、新しい質問が表示されるまで待機
      if (lastConfirmQuestion) {
        console.log(`  確認質問(${lastConfirmQuestion})後、新しい質問を待機中...`);
        let foundNewQuestion = false;
        // 新しいメッセージバブルが追加されるまで最大15秒待機
        for (let waitCount = 0; waitCount < 15; waitCount++) {
          await page.waitForTimeout(1000);
          const newBubble = page.locator('.message-bubble.ai').last();
          const newText = await newBubble.locator('.message-text').textContent().catch(() => '');
          if (newText && !newText.includes(lastConfirmQuestion)) {
            console.log(`  新しい質問を検出: ${newText?.substring(0, 40)}...`);
            foundNewQuestion = true;
            break;
          }
          console.log(`  まだ同じ確認質問が表示中... (${waitCount + 1}/15)`);
        }
        if (!foundNewQuestion) {
          console.log(`  [WARN] 新しい質問が表示されませんでした`);
        }
        lastConfirmQuestion = ''; // リセット
      }

      // 最新のAIメッセージのテキストを取得
      const latestAiBubble = page.locator('.message-bubble.ai').last();
      let messageText = await latestAiBubble.locator('.message-text').textContent().catch(() => '');
      console.log(`${phaseLabel}: ${messageText?.substring(0, 60)}...`);

      // 同じ質問に2回回答しないようにチェック
      if (messageText && messageText === lastAnsweredQuestion) {
        console.log('  [SKIP] 同じ質問に再度回答しようとしています - スキップ');
        return { answered: false, messageText, skipped: true };
      }

      // 選択肢ボタンを含むメッセージバブルを検索（ページ全体から最後のものを取得）
      // 回答済み（answer属性がtrue）でないバブルのみ対象
      const bubbleWithOptions = page.locator('.message-bubble.ai:has(.option-button)').last();

      // 未選択の選択肢ボタンのみを取得（✓マークが付いていないもの）
      const unselectedOptions = bubbleWithOptions.locator('.option-button:not(.selected)');
      const unselectedCount = await unselectedOptions.count();

      // 全選択肢（参考用）
      const allOptions = bubbleWithOptions.locator('.option-button');
      const allOptCount = await allOptions.count();

      if (unselectedCount > 0) {
        console.log(`  選択肢数: ${allOptCount} (未選択: ${unselectedCount})`);

        // Q1-14-method質問の場合、「スキップする」（3番目）を選択
        if (messageText?.includes('Q1-14-method') || messageText?.includes('販売費及び一般管理費')) {
          console.log('  Q1-14-method質問検出 - 「スキップする」を選択');
          const skipOption = bubbleWithOptions.locator('.option-button:has-text("スキップ"), .option-button:has-text("後で")');
          if (await skipOption.isVisible({ timeout: 1000 }).catch(() => false)) {
            await skipOption.first().click();
          } else {
            // スキップオプションが見つからない場合、最後のオプションを選択
            await unselectedOptions.last().click();
          }
        } else {
          // 最初の未選択の選択肢をクリック
          await unselectedOptions.first().click();
        }
        await page.waitForTimeout(1000);

        // 確定ボタンがあり、有効な場合のみクリック（同じバブル内で検索）
        const confirm = bubbleWithOptions.locator('.confirm-selection-button:not([disabled])');
        if (await confirm.isVisible({ timeout: 2000 }).catch(() => false)) {
          console.log('  確定ボタンをクリック');
          await confirm.click();
          await page.waitForTimeout(2000);
        } else {
          console.log('  単一選択（確定ボタンなし）');
          await page.waitForTimeout(2000);
        }
        lastAnsweredQuestion = messageText || '';

        // 確認質問（-confirm）に回答した場合、次の質問を待機するためにマーク
        if (messageText?.includes('-confirm')) {
          // 確認質問のIDを抽出（例：【target_customers-confirm】）
          const confirmMatch = messageText.match(/【([^】]+-confirm)】/);
          if (confirmMatch) {
            lastConfirmQuestion = confirmMatch[1];
            console.log(`  *** 確認質問検出: ${lastConfirmQuestion} - 次回呼び出し時に新しい質問を待機します ***`);
          } else {
            // IDが抽出できない場合は-confirmをそのまま使用
            lastConfirmQuestion = '-confirm';
            console.log(`  *** 確認質問検出（ID抽出失敗）: -confirm - 次回呼び出し時に新しい質問を待機します ***`);
          }
        }

        return { answered: true, messageText };
      } else if (allOptCount > 0) {
        console.log('  [SKIP] すべての選択肢が選択済み - 次の質問を待機');
        return { answered: false, messageText, allSelected: true };
      }

      // P5-8 仕入先テーブル入力（supplier_table_input）
      // テーブル形式で仕入先名、商品名、単価、数量を入力し「入力内容を確定する」ボタンを押す
      const supplierTableConfirmBtn = page.locator('button:has-text("入力内容を確定する"):visible');
      if (await supplierTableConfirmBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log('  仕入先テーブル入力を検出');

        // テーブルの各フィールドを入力
        // 仕入先名
        const supplierNameInput = page.locator('input[placeholder*="株式会社"]:visible').first();
        if (await supplierNameInput.isVisible({ timeout: 1000 }).catch(() => false)) {
          await supplierNameInput.fill('株式会社テスト');
        }

        // 商品・サービス名
        const productNameInput = page.locator('input[placeholder*="POSレジ"]:visible').first();
        if (await productNameInput.isVisible({ timeout: 1000 }).catch(() => false)) {
          await productNameInput.fill('POSレジシステム');
        }

        // 単価
        const unitPriceInput = page.locator('input[placeholder="300000"]:visible').first();
        if (await unitPriceInput.isVisible({ timeout: 1000 }).catch(() => false)) {
          await unitPriceInput.fill('300000');
        }

        // 数量
        const quantityInput = page.locator('input[placeholder="1"]:visible').first();
        if (await quantityInput.isVisible({ timeout: 1000 }).catch(() => false)) {
          await quantityInput.fill('1');
        }

        await page.waitForTimeout(500);

        // 「入力内容を確定する」ボタンをクリック
        console.log('  「入力内容を確定する」ボタンをクリック');
        await supplierTableConfirmBtn.click();
        await page.waitForTimeout(2000);
        lastAnsweredQuestion = messageText || '';
        return { answered: true, messageText };
      }

      // 日付入力欄があれば入力（type="date"またはtype="month"）
      const dateInput = page.locator('input[type="date"]:visible, input[type="month"]:visible').first();
      if (await dateInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log('  日付入力');
        // month inputの場合は"YYYY-MM"形式、date inputの場合は"YYYY-MM-DD"形式
        const inputType = await dateInput.getAttribute('type');
        const dateValue = inputType === 'month' ? '2020-04' : '2020-04-01';
        await dateInput.fill(dateValue);
        // 送信ボタンをクリック
        const submitBtn = page.locator('.submit-button-simple:visible, button:has-text("送信"):visible').first();
        if (await submitBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await submitBtn.click();
        } else {
          await page.keyboard.press('Enter');
        }
        await page.waitForTimeout(2000);
        lastAnsweredQuestion = messageText || '';
        return { answered: true, messageText };
      }

      // テキスト入力欄があれば入力（QuestionInputコンポーネント）
      // まずtextareaを優先的にチェック（P5-1, P5-2などで使用）
      const textareaInput = page.locator('.textarea-simple:visible, .question-input-simple textarea:visible').first();
      if (await textareaInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        // Phase 5の費用入力の場合、サンプル形式で入力
        const isP5Cost = messageText?.includes('費用') || messageText?.includes('P5-2');
        const textareaValue = isP5Cost
          ? 'POSレジシステム：30万円\nホームページ制作：50万円'
          : 'テスト回答です';
        console.log(`  テキストエリア入力 (${isP5Cost ? '費用形式' : '通常'})`);
        await textareaInput.fill(textareaValue);
        // 送信ボタンをクリック
        const submitBtn = page.locator('.submit-button-simple:visible, button:has-text("送信"):visible').first();
        if (await submitBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await submitBtn.click();
        } else {
          await page.keyboard.press('Enter');
        }
        await page.waitForTimeout(2000);
        lastAnsweredQuestion = messageText || '';
        return { answered: true, messageText };
      }

      // 次にテキスト入力欄をチェック
      // 複数のセレクタパターンを試す
      const textInputSelectors = [
        '.question-input input:visible',
        '.message-input input:visible',
        'input[type="text"]:visible',
        'input[type="number"]:visible'
      ];
      let textInput = null;
      for (const selector of textInputSelectors) {
        const input = page.locator(selector).first();
        if (await input.isVisible({ timeout: 500 }).catch(() => false)) {
          textInput = input;
          break;
        }
      }
      if (textInput) {
        // input[type="number"]の場合は数値を入力
        const inputType = await textInput.getAttribute('type');
        const inputValue = inputType === 'number' ? '3' : 'テスト回答です';
        console.log(`  テキスト入力 (type=${inputType})`);
        await textInput.fill(inputValue);
        // 送信ボタンをクリック
        const submitBtn = page.locator('.submit-button-simple:visible, button:has-text("送信"):visible').first();
        if (await submitBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await submitBtn.click();
        } else {
          await page.keyboard.press('Enter');
        }
        await page.waitForTimeout(2000);
        lastAnsweredQuestion = messageText || '';
        return { answered: true, messageText };
      }

      // Google Maps検索入力欄
      const gmapSearchInput = page.locator('input[placeholder*="店舗名"], input[placeholder*="検索"]').first();
      if (await gmapSearchInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log('  Google Maps検索');
        await gmapSearchInput.fill('クレアバッカス 赤坂');
        await page.waitForTimeout(3000);
        // 検索結果が表示されたら最初のものをクリック
        const gmapSearchResult = page.locator('.pac-item').first();
        if (await gmapSearchResult.isVisible({ timeout: 5000 }).catch(() => false)) {
          await gmapSearchResult.click();
          await page.waitForTimeout(3000);
        }
        return { answered: true, messageText };
      }

      return { answered: false, messageText };
    };

    // Phase 1の質問に回答
    for (let i = 0; i < 25; i++) {
      await page.waitForTimeout(2000);

      const result = await answerCurrentQuestion(`質問 ${i + 1}`);

      // Phase 1完了のチェック
      if (result.messageText?.includes('Phase 1') && result.messageText?.includes('完了')) {
        console.log('✅ Phase 1 完了検出');
        break;
      }

      // Phase 2開始のチェック
      // 注意: 「Phase 2の質問生成に活用」はQ1-1のprependMessageであり、まだPhase 1
      const isPhase2Start = (result.messageText?.includes('Phase 2') && !result.messageText?.includes('活用')) ||
                             result.messageText?.includes('顧客ニーズ');
      if (isPhase2Start) {
        console.log('✅ Phase 2 開始検出');
        break;
      }

      // エラーチェック
      if (result.messageText?.includes('失敗') || result.messageText?.includes('エラー')) {
        console.log('❌ エラー検出:', result.messageText?.substring(0, 100));
        report.issues.push({ phase: 'Phase 1', message: result.messageText });
        break;
      }

      // 同じ質問にスキップされた場合（無限ループ防止）
      if (result.skipped) {
        console.log('  → 同じ質問の繰り返しを検出 - ループを脱出');
        break;
      }

      // 回答できなかった場合（ローディング中など）
      if (!result.answered) {
        console.log('  → 回答待機中...');
      }
    }

    await page.screenshot({ path: 'tests/screenshots/flow-06-phase1-end.png', fullPage: true });

    report.phases.push({
      phase: 'Phase 1 (基本情報)',
      duration: Date.now() - phase1Start,
      status: 'success'
    });

    // ===== Phase 2: 顧客ニーズと市場の動向 =====
    console.log('\n========== PHASE 2: 顧客ニーズと市場の動向 ==========');
    const phase2Start = Date.now();

    for (let i = 0; i < 100; i++) {
      await page.waitForTimeout(3000);

      const result = await answerCurrentQuestion(`Phase 2 質問 ${i + 1}`);

      // ローディング中はスキップ
      if (result.messageText?.includes('読み込み中') || result.messageText?.includes('生成中')) {
        console.log('  → ローディング中...');
        continue;
      }

      // Phase 2完了チェック（「Phase 2が完了しました」メッセージ）
      if (result.messageText?.includes('Phase 2が完了') || result.messageText?.includes('Phase 2（顧客ニーズ）が完了')) {
        console.log('✅ Phase 2 完了検出');
        break;
      }

      // Phase 3開始チェック（質問IDが conv-p3- で始まる場合、または明示的な案内）
      if (result.messageText?.includes('Phase 3（自社の強み）')) {
        console.log('✅ Phase 3 開始検出（案内メッセージ）');
        break;
      }

      // エラーチェック
      if (result.messageText?.includes('失敗') || result.messageText?.includes('エラー')) {
        console.log('❌ エラー検出:', result.messageText?.substring(0, 100));
        report.issues.push({ phase: 'Phase 2', message: result.messageText });
        break;
      }

      // 同じ質問にスキップされた場合（無限ループ防止）
      if (result.skipped) {
        console.log('  → 同じ質問の繰り返しを検出 - ループを脱出');
        break;
      }

      if (!result.answered) {
        console.log('  → 回答待機中...');
      }
    }

    await page.screenshot({ path: 'tests/screenshots/flow-07-phase2-end.png', fullPage: true });

    report.phases.push({
      phase: 'Phase 2 (顧客ニーズ)',
      duration: Date.now() - phase2Start,
      status: 'success'
    });

    // ===== Phase 3: 自社の強み =====
    console.log('\n========== PHASE 3: 自社の強み ==========');
    const phase3Start = Date.now();

    for (let i = 0; i < 100; i++) {
      await page.waitForTimeout(3000);

      const result = await answerCurrentQuestion(`Phase 3 質問 ${i + 1}`);

      if (result.messageText?.includes('読み込み中') || result.messageText?.includes('生成中')) {
        console.log('  → ローディング中...');
        continue;
      }

      // Phase 3完了チェック
      if (result.messageText?.includes('Phase 3が完了') || result.messageText?.includes('Phase 3（自社の強み）が完了')) {
        console.log('✅ Phase 3 完了検出');
        break;
      }

      // Phase 4開始チェック（案内メッセージ）
      if (result.messageText?.includes('Phase 4（経営方針）') || result.messageText?.includes('経営方針・目標')) {
        console.log('✅ Phase 4 開始検出（案内メッセージ）');
        break;
      }

      if (result.messageText?.includes('失敗') || result.messageText?.includes('エラー')) {
        console.log('❌ エラー検出:', result.messageText?.substring(0, 100));
        report.issues.push({ phase: 'Phase 3', message: result.messageText });
        break;
      }

      // skippedの場合でも質問IDが変わっていなければ続行（無限ループ防止は別途対処）
      if (!result.answered && !result.skipped) {
        console.log('  → 回答待機中...');
      }
    }

    await page.screenshot({ path: 'tests/screenshots/flow-08-phase3-end.png', fullPage: true });

    report.phases.push({
      phase: 'Phase 3 (自社の強み)',
      duration: Date.now() - phase3Start,
      status: 'success'
    });

    // ===== Phase 4: 経営方針・目標 =====
    console.log('\n========== PHASE 4: 経営方針・目標 ==========');
    const phase4Start = Date.now();

    for (let i = 0; i < 100; i++) {
      await page.waitForTimeout(3000);

      const result = await answerCurrentQuestion(`Phase 4 質問 ${i + 1}`);

      if (result.messageText?.includes('読み込み中') || result.messageText?.includes('生成中')) {
        console.log('  → ローディング中...');
        continue;
      }

      // Phase 4完了チェック
      if (result.messageText?.includes('Phase 4が完了') || result.messageText?.includes('Phase 4（経営方針）が完了')) {
        console.log('✅ Phase 4 完了検出');
        break;
      }

      // Phase 5開始チェック（案内メッセージ）
      if (result.messageText?.includes('Phase 5（補助事業）') || result.messageText?.includes('補助事業計画')) {
        console.log('✅ Phase 5 開始検出（案内メッセージ）');
        break;
      }

      if (result.messageText?.includes('失敗') || result.messageText?.includes('エラー')) {
        console.log('❌ エラー検出:', result.messageText?.substring(0, 100));
        report.issues.push({ phase: 'Phase 4', message: result.messageText });
        break;
      }

      // skippedの場合でも質問IDが変わっていなければ続行
      if (!result.answered && !result.skipped) {
        console.log('  → 回答待機中...');
      }
    }

    await page.screenshot({ path: 'tests/screenshots/flow-09-phase4-end.png', fullPage: true });

    report.phases.push({
      phase: 'Phase 4 (経営方針)',
      duration: Date.now() - phase4Start,
      status: 'success'
    });

    // ===== Phase 5: 補助事業計画 =====
    console.log('\n========== PHASE 5: 補助事業計画 ==========');
    const phase5Start = Date.now();

    for (let i = 0; i < 100; i++) {
      await page.waitForTimeout(3000);

      const result = await answerCurrentQuestion(`Phase 5 質問 ${i + 1}`);

      if (result.messageText?.includes('読み込み中') || result.messageText?.includes('生成中')) {
        console.log('  → ローディング中...');
        continue;
      }

      // Phase 5完了チェック
      if (result.messageText?.includes('Phase 5が完了') || result.messageText?.includes('Phase 5（補助事業）が完了')) {
        console.log('✅ Phase 5 完了検出');
        break;
      }

      // Phase 6開始チェック（案内メッセージ）
      if (result.messageText?.includes('Phase 6（文章スタイル）') || result.messageText?.includes('文章スタイル')) {
        console.log('✅ Phase 6 開始検出（案内メッセージ）');
        break;
      }

      if (result.messageText?.includes('失敗') || result.messageText?.includes('エラー')) {
        console.log('❌ エラー検出:', result.messageText?.substring(0, 100));
        report.issues.push({ phase: 'Phase 5', message: result.messageText });
        break;
      }

      // skippedの場合でも質問IDが変わっていなければ続行
      if (!result.answered && !result.skipped) {
        console.log('  → 回答待機中...');
      }
    }

    await page.screenshot({ path: 'tests/screenshots/flow-10-phase5-end.png', fullPage: true });

    report.phases.push({
      phase: 'Phase 5 (補助事業計画)',
      duration: Date.now() - phase5Start,
      status: 'success'
    });

    // ===== Phase 6: 文章スタイル =====
    console.log('\n========== PHASE 6: 文章スタイル ==========');
    const phase6Start = Date.now();

    for (let i = 0; i < 30; i++) {
      await page.waitForTimeout(3000);

      const result = await answerCurrentQuestion(`Phase 6 質問 ${i + 1}`);

      if (result.messageText?.includes('読み込み中') || result.messageText?.includes('生成中')) {
        console.log('  → ローディング中...');
        continue;
      }

      // Phase 6完了チェック（様式2生成開始のメッセージ）
      if (result.messageText?.includes('Phase 6が完了') || result.messageText?.includes('様式2の作成') || result.messageText?.includes('申請書を生成')) {
        console.log('✅ Phase 6 完了検出');
        break;
      }

      if (result.messageText?.includes('失敗') || result.messageText?.includes('エラー')) {
        console.log('❌ エラー検出:', result.messageText?.substring(0, 100));
        report.issues.push({ phase: 'Phase 6', message: result.messageText });
        break;
      }

      // skippedの場合でも質問IDが変わっていなければ続行
      if (!result.answered && !result.skipped) {
        console.log('  → 回答待機中...');
      }
    }

    await page.screenshot({ path: 'tests/screenshots/flow-11-phase6-end.png', fullPage: true });

    report.phases.push({
      phase: 'Phase 6 (文章スタイル)',
      duration: Date.now() - phase6Start,
      status: 'success'
    });

    // ===== 申請書生成 =====
    console.log('\n========== 申請書生成 ==========');
    const generateStart = Date.now();

    // Phase 6完了後、申請書画面に自動遷移するか、「申請書を生成する」ボタンが表示されるまで待機
    await page.waitForTimeout(5000);

    // ApplicationDocumentコンポーネントが表示されるか確認
    const applicationDoc = page.locator('.application-document');
    const generateButton = page.locator('button:has-text("申請書を生成")');

    let generationStatus = 'pending';

    // 申請書画面が表示されているか確認
    if (await applicationDoc.isVisible({ timeout: 10000 }).catch(() => false)) {
      console.log('✅ 申請書画面に遷移しました');
      await page.screenshot({ path: 'tests/screenshots/flow-12-application-screen.png', fullPage: true });

      // 「申請書を生成する」ボタンを探してクリック
      if (await generateButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('「申請書を生成する」ボタンを検出');
        await generateButton.click();
        console.log('「申請書を生成する」ボタンをクリックしました');

        // 生成完了を待機（最大2分）
        console.log('申請書生成中... (最大2分待機)');

        try {
          // 生成中のスピナーが消えるか、コンテンツが表示されるまで待機
          await page.waitForSelector('.markdown-content, .document-content', { timeout: 120000 });
          console.log('✅ 申請書の生成が完了しました');
          generationStatus = 'success';

          await page.screenshot({ path: 'tests/screenshots/flow-13-generated-document.png', fullPage: true });

          // 生成された内容の一部を確認
          const documentContent = await page.locator('.markdown-content, .document-body').textContent().catch(() => '');
          if (documentContent) {
            console.log(`生成された申請書のプレビュー: ${documentContent.substring(0, 200)}...`);
          }

          // ダウンロードボタンがあるか確認
          const downloadButton = page.locator('button:has-text("ダウンロード")');
          if (await downloadButton.isVisible({ timeout: 3000 }).catch(() => false)) {
            console.log('✅ ダウンロードボタンが表示されています');
          }

        } catch (timeoutError) {
          console.log('⚠️ 申請書生成がタイムアウトしました（2分経過）');
          generationStatus = 'timeout';
          await page.screenshot({ path: 'tests/screenshots/flow-13-generation-timeout.png', fullPage: true });
        }

      } else {
        // すでに生成済みの可能性
        const existingContent = page.locator('.markdown-content, .document-body');
        if (await existingContent.isVisible({ timeout: 3000 }).catch(() => false)) {
          console.log('✅ 既に生成された申請書が表示されています');
          generationStatus = 'already_generated';
          await page.screenshot({ path: 'tests/screenshots/flow-13-existing-document.png', fullPage: true });
        } else {
          console.log('⚠️ 「申請書を生成する」ボタンが見つかりません');
          generationStatus = 'button_not_found';
        }
      }

    } else {
      console.log('⚠️ 申請書画面への自動遷移が検出されませんでした');

      // チャット画面に「全ての質問が完了しました」メッセージがあるか確認
      const completionMessage = page.locator('.message-bubble:has-text("全ての質問が完了"), .message-bubble:has-text("申請書を生成できます")');
      if (await completionMessage.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('完了メッセージを検出しました');
        generationStatus = 'waiting_for_manual_navigation';
      } else {
        generationStatus = 'screen_not_found';
      }

      await page.screenshot({ path: 'tests/screenshots/flow-12-completion-state.png', fullPage: true });
    }

    report.phases.push({
      phase: '申請書生成',
      duration: Date.now() - generateStart,
      status: generationStatus
    });

    console.log(`申請書生成ステータス: ${generationStatus}`);

    // ===== レポート出力 =====
    console.log('\n========== テストレポート ==========');
    console.log('Phases:');
    report.phases.forEach(p => {
      console.log(`  - ${p.phase}: ${p.status} (${p.duration}ms)`);
    });

    if (report.issues.length > 0) {
      console.log('\nIssues:');
      report.issues.forEach(i => {
        console.log(`  - ${i.phase || i.type}: ${i.message?.substring(0, 100)}`);
      });
    }

    console.log('\n========== テスト完了 ==========');

    // テスト終了後にブラウザを開いたままにする
    console.log('ブラウザを開いたまま待機します...');
    await page.pause();
  });
});
