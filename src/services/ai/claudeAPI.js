/**
 * Claude API呼び出しサービス
 *
 * 将来的にCloud Functions経由でClaude APIを呼び出す予定
 * 現在はダミー実装
 */

/**
 * Claude APIを呼び出す（ダミー実装）
 * @param {string} prompt - プロンプト
 * @returns {Promise<string>} - Claude APIの応答
 */
export const callClaudeAPI = async (prompt) => {
  console.log('[Claude API] ⚠️ API is not implemented yet. Returning empty response.');
  console.log('[Claude API] Prompt:', prompt.substring(0, 100) + '...');

  // 将来的にCloud Functions経由でClaude APIを呼び出す
  // const response = await fetch('https://YOUR_CLOUD_FUNCTION_URL', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ prompt })
  // });
  // return await response.text();

  return '';
};

export default callClaudeAPI;
