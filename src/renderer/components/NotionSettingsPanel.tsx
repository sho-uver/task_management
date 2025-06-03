import React, { useState, useEffect } from 'react';
import { useNotionSync } from '../hooks/useNotionSync';
import { NotionSettings } from '../../shared/types';

/**
 * Notion連携設定パネルのプロパティ
 */
interface NotionSettingsPanelProps {
  /** パネルを閉じる時のコールバック */
  onClose?: () => void;
  /** タスクリスト（同期テスト用） */
  tasks?: any[];
}

/**
 * Notion連携設定パネルコンポーネント
 */
export const NotionSettingsPanel: React.FC<NotionSettingsPanelProps> = ({ onClose, tasks = [] }) => {
  const {
    notionSettings,
    syncStatus,
    syncStats,
    conflicts,
    isConnected,
    isConnecting,
    errorMessage,
    updateSettings,
    testConnection,
    performSync,
    resolveConflict,
    toggleAutoSync,
    resetSettings,
    exportData,
    importData,
  } = useNotionSync();

  // フォーム状態
  const [formData, setFormData] = useState<NotionSettings>({
    apiToken: '',
    databaseId: '',
    syncInterval: 30,
    autoSyncEnabled: false,
    statusPropertyName: 'Status',
    titlePropertyName: 'Name',
    estimatedTimePropertyName: 'Estimated Time',
    actualTimePropertyName: 'Actual Time',
  });

  const [isFormValid, setIsFormValid] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 設定が読み込まれたらフォームを初期化
  useEffect(() => {
    if (notionSettings) {
      setFormData(notionSettings);
    }
  }, [notionSettings]);

  // フォームバリデーション
  useEffect(() => {
    const isValid = formData.apiToken.length > 0 && 
                   formData.databaseId.length > 0 &&
                   formData.syncInterval > 0;
    setIsFormValid(isValid);
  }, [formData]);

  /**
   * フォーム入力の処理
   */
  const handleInputChange = (field: keyof NotionSettings, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  /**
   * 設定を保存
   */
  const handleSave = async () => {
    if (!isFormValid) return;

    setIsSaving(true);
    try {
      const success = await updateSettings(formData);
      if (success && onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * 接続テストを実行
   */
  const handleTestConnection = async () => {
    // まず設定を保存してからテスト
    const success = await updateSettings(formData);
    if (success) {
      await testConnection();
    }
  };

  /**
   * 手動同期を実行
   */
  const handleManualSync = async () => {
    await performSync(tasks);
  };

  /**
   * データエクスポート
   */
  const handleExport = async () => {
    const data = await exportData();
    if (data) {
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `notion-settings-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  /**
   * データインポート
   */
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target?.result as string;
        if (content) {
          await importData(content);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="notion-settings-panel" style={styles.panel}>
      <div style={styles.header}>
        <h2 style={styles.title}>Notion連携設定</h2>
        {onClose && (
          <button onClick={onClose} style={styles.closeButton}>×</button>
        )}
      </div>

      <div style={styles.content}>
        {/* 接続状態 */}
        <div style={styles.statusSection}>
          <div style={styles.statusIndicator}>
            <span style={{
              ...styles.statusDot,
              backgroundColor: isConnected ? '#22c55e' : '#ef4444'
            }} />
            <span style={styles.statusText}>
              {isConnecting ? '接続中...' : isConnected ? '接続済み' : '未接続'}
            </span>
          </div>
          
          {syncStatus.lastSyncTime && (
            <div style={styles.lastSync}>
              最終同期: {new Date(syncStatus.lastSyncTime).toLocaleString()}
            </div>
          )}
        </div>

        {/* エラーメッセージ */}
        {errorMessage && (
          <div style={styles.errorMessage}>
            {errorMessage}
          </div>
        )}

        {/* 基本設定 */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>基本設定</h3>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>
              Notion APIトークン
              <input
                type="password"
                value={formData.apiToken}
                onChange={(e) => handleInputChange('apiToken', e.target.value)}
                placeholder="secret_..."
                style={styles.input}
              />
            </label>
            <div style={styles.helpText}>
              <a 
                href="https://www.notion.so/my-integrations" 
                target="_blank" 
                rel="noopener noreferrer"
                style={styles.link}
              >
                Notion Integration設定画面
              </a>
              で取得できます
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>
              データベースID
              <input
                type="text"
                value={formData.databaseId}
                onChange={(e) => handleInputChange('databaseId', e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                style={styles.input}
              />
            </label>
            <div style={styles.helpText}>
              NotionページのURLの最後の32文字
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>
              同期間隔（分）
              <input
                type="number"
                value={formData.syncInterval}
                onChange={(e) => handleInputChange('syncInterval', parseInt(e.target.value))}
                min="1"
                max="1440"
                style={styles.input}
              />
            </label>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={formData.autoSyncEnabled}
                onChange={(e) => handleInputChange('autoSyncEnabled', e.target.checked)}
                style={styles.checkbox}
              />
              自動同期を有効にする
            </label>
          </div>
        </div>

        {/* 詳細設定 */}
        <div style={styles.section}>
          <h3 
            style={styles.sectionTitle}
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            詳細設定 {showAdvanced ? '▲' : '▼'}
          </h3>
          
          {showAdvanced && (
            <div style={styles.advancedSection}>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  タイトルプロパティ名
                  <input
                    type="text"
                    value={formData.titlePropertyName}
                    onChange={(e) => handleInputChange('titlePropertyName', e.target.value)}
                    style={styles.input}
                  />
                </label>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  ステータスプロパティ名
                  <input
                    type="text"
                    value={formData.statusPropertyName}
                    onChange={(e) => handleInputChange('statusPropertyName', e.target.value)}
                    style={styles.input}
                  />
                </label>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  見積時間プロパティ名
                  <input
                    type="text"
                    value={formData.estimatedTimePropertyName}
                    onChange={(e) => handleInputChange('estimatedTimePropertyName', e.target.value)}
                    style={styles.input}
                  />
                </label>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>
                  実績時間プロパティ名
                  <input
                    type="text"
                    value={formData.actualTimePropertyName}
                    onChange={(e) => handleInputChange('actualTimePropertyName', e.target.value)}
                    style={styles.input}
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* 統計情報 */}
        {syncStats.totalSyncs > 0 && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>同期統計</h3>
            <div style={styles.statsGrid}>
              <div style={styles.statItem}>
                <span style={styles.statValue}>{syncStats.totalSyncs}</span>
                <span style={styles.statLabel}>総同期回数</span>
              </div>
              <div style={styles.statItem}>
                <span style={styles.statValue}>{syncStats.successfulSyncs}</span>
                <span style={styles.statLabel}>成功</span>
              </div>
              <div style={styles.statItem}>
                <span style={styles.statValue}>{syncStats.totalConflicts}</span>
                <span style={styles.statLabel}>競合</span>
              </div>
              <div style={styles.statItem}>
                <span style={styles.statValue}>{Math.round(syncStats.averageSyncTime)}ms</span>
                <span style={styles.statLabel}>平均時間</span>
              </div>
            </div>
          </div>
        )}

        {/* 競合リスト */}
        {conflicts.length > 0 && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>未解決の競合 ({conflicts.length})</h3>
            {conflicts.map(conflict => (
              <div key={conflict.taskId} style={styles.conflictItem}>
                <div style={styles.conflictTitle}>{conflict.title}</div>
                <div style={styles.conflictDetails}>
                  競合フィールド: {conflict.conflictingFields.join(', ')}
                </div>
                <div style={styles.conflictActions}>
                  <button
                    onClick={() => resolveConflict(conflict.taskId, 'local_wins')}
                    style={styles.conflictButton}
                  >
                    ローカルを優先
                  </button>
                  <button
                    onClick={() => resolveConflict(conflict.taskId, 'notion_wins')}
                    style={styles.conflictButton}
                  >
                    Notionを優先
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* アクションボタン */}
        <div style={styles.actions}>
          <div style={styles.primaryActions}>
            <button
              onClick={handleTestConnection}
              disabled={!isFormValid || isConnecting}
              style={{
                ...styles.button,
                ...styles.testButton,
                ...((!isFormValid || isConnecting) ? styles.disabledButton : {})
              }}
            >
              {isConnecting ? '接続中...' : '接続テスト'}
            </button>

            <button
              onClick={handleSave}
              disabled={!isFormValid || isSaving}
              style={{
                ...styles.button,
                ...styles.saveButton,
                ...((!isFormValid || isSaving) ? styles.disabledButton : {})
              }}
            >
              {isSaving ? '保存中...' : '設定を保存'}
            </button>

            {isConnected && (
              <button
                onClick={handleManualSync}
                disabled={syncStatus.isSyncing}
                style={{
                  ...styles.button,
                  ...styles.syncButton,
                  ...(syncStatus.isSyncing ? styles.disabledButton : {})
                }}
              >
                {syncStatus.isSyncing ? '同期中...' : '手動同期'}
              </button>
            )}
          </div>

          <div style={styles.secondaryActions}>
            <button
              onClick={handleExport}
              style={{...styles.button, ...styles.secondaryButton}}
            >
              設定をエクスポート
            </button>

            <label style={{...styles.button, ...styles.secondaryButton}}>
              設定をインポート
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                style={{ display: 'none' }}
              />
            </label>

            <button
              onClick={resetSettings}
              style={{...styles.button, ...styles.dangerButton}}
            >
              設定をリセット
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// スタイル定義
const styles: { [key: string]: React.CSSProperties } = {
  panel: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    width: '600px',
    maxHeight: '80vh',
    overflow: 'auto',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#6b7280',
    padding: '0',
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: '20px',
  },
  statusSection: {
    marginBottom: '20px',
    padding: '12px',
    backgroundColor: '#f3f4f6',
    borderRadius: '6px',
  },
  statusIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  statusText: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
  },
  lastSync: {
    fontSize: '12px',
    color: '#6b7280',
  },
  errorMessage: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#dc2626',
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '16px',
    fontSize: '14px',
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '12px',
    cursor: 'pointer',
    userSelect: 'none',
  },
  formGroup: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '4px',
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'inherit',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#374151',
    cursor: 'pointer',
  },
  checkbox: {
    margin: 0,
  },
  helpText: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '4px',
  },
  link: {
    color: '#3b82f6',
    textDecoration: 'none',
  },
  advancedSection: {
    paddingLeft: '16px',
    borderLeft: '2px solid #e5e7eb',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px',
  },
  statItem: {
    textAlign: 'center',
    padding: '8px',
    backgroundColor: '#f9fafb',
    borderRadius: '4px',
  },
  statValue: {
    display: 'block',
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827',
  },
  statLabel: {
    display: 'block',
    fontSize: '12px',
    color: '#6b7280',
  },
  conflictItem: {
    border: '1px solid #fbbf24',
    borderRadius: '4px',
    padding: '12px',
    marginBottom: '8px',
    backgroundColor: '#fffbeb',
  },
  conflictTitle: {
    fontWeight: '500',
    marginBottom: '4px',
  },
  conflictDetails: {
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '8px',
  },
  conflictActions: {
    display: 'flex',
    gap: '8px',
  },
  conflictButton: {
    padding: '4px 8px',
    fontSize: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
  },
  actions: {
    marginTop: '24px',
    paddingTop: '16px',
    borderTop: '1px solid #e5e7eb',
  },
  primaryActions: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px',
  },
  secondaryActions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap' as 'wrap',
  },
  button: {
    padding: '8px 16px',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  saveButton: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    borderColor: '#3b82f6',
  },
  testButton: {
    backgroundColor: '#10b981',
    color: '#ffffff',
    borderColor: '#10b981',
  },
  syncButton: {
    backgroundColor: '#8b5cf6',
    color: '#ffffff',
    borderColor: '#8b5cf6',
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    color: '#374151',
  },
  dangerButton: {
    backgroundColor: '#ef4444',
    color: '#ffffff',
    borderColor: '#ef4444',
  },
  disabledButton: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
}; 