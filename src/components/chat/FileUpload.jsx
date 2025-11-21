import React, { useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import './FileUpload.css';

/**
 * ファイルアップロードコンポーネント
 *
 * 販売費及び一般管理費内訳書のアップロードとOCR処理
 */
const FileUpload = ({ questionId, onUploadComplete, onSkip }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);

  // ファイル選択ハンドラ
  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];

    if (!selectedFile) {
      return;
    }

    // ファイルサイズチェック（10MB以下）
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('ファイルサイズは10MB以下にしてください');
      return;
    }

    // ファイルタイプチェック
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(selectedFile.type)) {
      setError('JPG、PNG、PDFファイルのみアップロード可能です');
      return;
    }

    setFile(selectedFile);
    setError(null);

    // 画像ファイルの場合はプレビュー表示
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview(null);
    }
  };

  // アップロードとOCR処理
  const handleUpload = async () => {
    if (!file) {
      setError('ファイルを選択してください');
      return;
    }

    setUploading(true);
    setProgress(10);

    try {
      // Firebase Storageにアップロード
      const timestamp = Date.now();
      const fileName = `${questionId}_${timestamp}_${file.name}`;
      const storageRef = ref(storage, `financial-documents/${fileName}`);

      setProgress(30);
      await uploadBytes(storageRef, file);

      setProgress(50);
      const downloadURL = await getDownloadURL(storageRef);

      setProgress(70);

      // OCR処理を実行（Cloud Functions）
      let extractedData = null;

      if (file.type.startsWith('image/')) {
        // 画像の場合はGoogle Cloud Vision APIでOCR
        extractedData = await processImageWithOCR(downloadURL);
      } else if (file.type === 'application/pdf') {
        // PDFの場合は別の処理
        extractedData = await processPDFWithOCR(downloadURL);
      }

      setProgress(100);

      // 完了コールバック
      onUploadComplete({
        fileUrl: downloadURL,
        fileName: file.name,
        fileType: file.type,
        extractedData
      });

      setUploading(false);
    } catch (err) {
      console.error('Upload error:', err);
      setError('アップロードに失敗しました: ' + err.message);
      setUploading(false);
      setProgress(0);
    }
  };

  // 画像OCR処理（Google Cloud Vision API）
  const processImageWithOCR = async (imageUrl) => {
    try {
      const functions = getFunctions(undefined, 'asia-northeast1');
      const extractExpensesFromImage = httpsCallable(functions, 'extractExpensesFromImage');

      const result = await extractExpensesFromImage({ imageUrl });
      return result.data;
    } catch (error) {
      console.error('OCR processing error:', error);
      // OCR失敗時もアップロードは成功扱い
      return {
        success: false,
        message: 'OCR処理に失敗しました。手動で入力してください。'
      };
    }
  };

  // PDF OCR処理
  const processPDFWithOCR = async (pdfUrl) => {
    try {
      const functions = getFunctions(undefined, 'asia-northeast1');
      const extractExpensesFromPDF = httpsCallable(functions, 'extractExpensesFromPDF');

      const result = await extractExpensesFromPDF({ pdfUrl });
      return result.data;
    } catch (error) {
      console.error('PDF OCR processing error:', error);
      return {
        success: false,
        message: 'PDF処理に失敗しました。画像ファイルをお試しください。'
      };
    }
  };

  return (
    <div className="file-upload-container">
      <div className="upload-header">
        <h3>📄 決算書のアップロード</h3>
        <p className="upload-description">
          「販売費及び一般管理費内訳書」のページをアップロードしてください
        </p>
      </div>

      <div className="upload-body">
        {!file && (
          <div className="file-select-area">
            <label htmlFor="file-input" className="file-select-label">
              <div className="file-select-icon">📎</div>
              <p className="file-select-text">
                ファイルを選択またはドラッグ＆ドロップ
              </p>
              <p className="file-select-hint">
                JPG、PNG、PDF（最大10MB）
              </p>
            </label>
            <input
              id="file-input"
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileSelect}
              className="file-input-hidden"
            />
          </div>
        )}

        {file && !uploading && (
          <div className="file-preview-area">
            {preview && (
              <div className="image-preview">
                <img src={preview} alt="プレビュー" className="preview-image" />
              </div>
            )}
            <div className="file-info">
              <p className="file-name">📎 {file.name}</p>
              <p className="file-size">
                {(file.size / 1024).toFixed(1)} KB
              </p>
              <button
                type="button"
                className="btn-change-file"
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                  setError(null);
                }}
              >
                ファイルを変更
              </button>
            </div>
          </div>
        )}

        {uploading && (
          <div className="upload-progress-area">
            <div className="progress-bar-container">
              <div className="progress-bar" style={{ width: `${progress}%` }}></div>
            </div>
            <p className="progress-text">{progress}% 完了</p>
            {progress >= 70 && (
              <p className="progress-sub-text">OCR処理中...</p>
            )}
          </div>
        )}

        {error && (
          <div className="error-message-box">
            ⚠️ {error}
          </div>
        )}
      </div>

      <div className="upload-footer">
        <div className="privacy-notice-box">
          <p className="privacy-title">🔒 プライバシー保護</p>
          <ul className="privacy-list">
            <li>個人情報（代表者名、住所など）は黒塗りしてください</li>
            <li>アップロードしたファイルは暗号化して保存します</li>
            <li>処理後30日で自動削除されます</li>
          </ul>
        </div>

        <div className="button-group">
          {onSkip && (
            <button
              type="button"
              className="btn-skip"
              onClick={onSkip}
              disabled={uploading}
            >
              スキップ（他の方法を選択）
            </button>
          )}
          <button
            type="button"
            className="btn-upload"
            onClick={handleUpload}
            disabled={!file || uploading}
          >
            {uploading ? 'アップロード中...' : 'アップロードして次へ'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;
