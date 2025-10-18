import React from 'react';
import './AiDraftOptions.css';

const AiDraftOptions = ({ draft, onAccept, onEdit, onManual, isLoading }) => {
  const formatDraft = (draft) => {
    if (Array.isArray(draft)) {
      return draft.join('、');
    }
    return draft;
  };

  return (
    <div className="ai-draft-options">
      <div className="ai-draft-content">
        <div className="ai-label">🤖 AIが回答を補完しました：</div>
        <div className="draft-text">{formatDraft(draft)}</div>
      </div>

      <div className="ai-action-buttons">
        <button
          onClick={onAccept}
          className="ai-btn accept-btn"
          disabled={isLoading}
        >
          ✅ そのまま採用
        </button>
        <button
          onClick={onEdit}
          className="ai-btn edit-btn"
          disabled={isLoading}
        >
          ✏️ 修正する
        </button>
        <button
          onClick={onManual}
          className="ai-btn manual-btn"
          disabled={isLoading}
        >
          ↩️ 元の回答を使う
        </button>
      </div>
    </div>
  );
};

export default AiDraftOptions;
