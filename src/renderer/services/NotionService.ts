import { Client } from '@notionhq/client';
import { Task, NotionSettings, NotionTaskProperties, NotionSyncConflict, NotionSyncStatus } from '../../shared/types';

/**
 * Notion APIとの連携を管理するサービスクラス
 */
export class NotionService {
  private client: Client | null = null;
  private settings: NotionSettings | null = null;

  /**
   * Notion APIクライアントを初期化
   */
  initialize(settings: NotionSettings): void {
    this.settings = settings;
    this.client = new Client({
      auth: settings.apiToken,
    });
    console.log('Notion service initialized');
  }

  /**
   * 接続テストを実行
   */
  async testConnection(): Promise<boolean> {
    if (!this.client || !this.settings) {
      throw new Error('Notion service not initialized');
    }

    try {
      // データベース存在確認
      await this.client.databases.retrieve({
        database_id: this.settings.databaseId,
      });
      
      console.log('Notion connection test successful');
      return true;
    } catch (error) {
      console.error('Notion connection test failed:', error);
      return false;
    }
  }

  /**
   * Notionからタスクを取得
   */
  async getTasks(): Promise<Task[]> {
    if (!this.client || !this.settings) {
      throw new Error('Notion service not initialized');
    }

    try {
      const response = await this.client.databases.query({
        database_id: this.settings.databaseId,
        sorts: [
          {
            property: 'Last Updated',
            direction: 'descending',
          },
        ],
      });

      const tasks: Task[] = [];

      for (const page of response.results) {
        if ('properties' in page) {
          const task = this.convertNotionPageToTask(page.properties as any, page.id);
          if (task) {
            tasks.push(task);
          }
        }
      }

      console.log(`Retrieved ${tasks.length} tasks from Notion`);
      return tasks;
    } catch (error) {
      console.error('Failed to get tasks from Notion:', error);
      throw error;
    }
  }

  /**
   * Notionにタスクを作成
   */
  async createTask(task: Task): Promise<string> {
    if (!this.client || !this.settings) {
      throw new Error('Notion service not initialized');
    }

    try {
      const properties = this.convertTaskToNotionProperties(task);
      
      const response = await this.client.pages.create({
        parent: {
          database_id: this.settings.databaseId,
        },
        properties,
      });

      console.log(`Created task in Notion: ${task.title}`);
      return response.id;
    } catch (error) {
      console.error('Failed to create task in Notion:', error);
      throw error;
    }
  }

  /**
   * Notionのタスクを更新
   */
  async updateTask(notionPageId: string, task: Task): Promise<void> {
    if (!this.client || !this.settings) {
      throw new Error('Notion service not initialized');
    }

    try {
      const properties = this.convertTaskToNotionProperties(task);
      
      await this.client.pages.update({
        page_id: notionPageId,
        properties,
      });

      console.log(`Updated task in Notion: ${task.title}`);
    } catch (error) {
      console.error('Failed to update task in Notion:', error);
      throw error;
    }
  }

  /**
   * Notionからタスクを削除（アーカイブ）
   */
  async deleteTask(notionPageId: string): Promise<void> {
    if (!this.client || !this.settings) {
      throw new Error('Notion service not initialized');
    }

    try {
      await this.client.pages.update({
        page_id: notionPageId,
        archived: true,
      });

      console.log(`Archived task in Notion: ${notionPageId}`);
    } catch (error) {
      console.error('Failed to archive task in Notion:', error);
      throw error;
    }
  }

  /**
   * 双方向同期を実行
   */
  async performSync(localTasks: Task[]): Promise<{
    syncedTasks: Task[];
    conflicts: NotionSyncConflict[];
    syncStatus: NotionSyncStatus;
  }> {
    const startTime = Date.now();
    const syncStatus: NotionSyncStatus = {
      isSyncing: true,
      lastSyncResult: null,
      lastSyncTime: null,
      errorMessage: null,
      syncedCount: 0,
      conflictCount: 0,
      failedCount: 0,
    };

    try {
      console.log('Starting Notion sync...');
      
      // 1. Notionからタスクを取得
      const notionTasks = await this.getTasks();
      
      // 2. タスクのマッピングを作成
      const taskMap = this.createTaskMapping(localTasks, notionTasks);
      
      // 3. 競合検出
      const conflicts = this.detectConflicts(taskMap);
      
      // 4. 競合しないタスクを同期
      const syncedTasks = await this.syncNonConflictingTasks(taskMap);
      
      // 5. 統計更新
      syncStatus.syncedCount = syncedTasks.length;
      syncStatus.conflictCount = conflicts.length;
      syncStatus.lastSyncResult = conflicts.length > 0 ? 'partial' : 'success';
      syncStatus.lastSyncTime = new Date().toISOString();
      syncStatus.isSyncing = false;

      const duration = Date.now() - startTime;
      console.log(`Notion sync completed in ${duration}ms`);
      console.log(`- Synced: ${syncStatus.syncedCount}`);
      console.log(`- Conflicts: ${syncStatus.conflictCount}`);

      return {
        syncedTasks,
        conflicts,
        syncStatus,
      };
    } catch (error) {
      console.error('Notion sync failed:', error);
      
      syncStatus.lastSyncResult = 'error';
      syncStatus.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      syncStatus.isSyncing = false;
      syncStatus.lastSyncTime = new Date().toISOString();

      throw error;
    }
  }

  /**
   * NotionページをTaskオブジェクトに変換
   */
  private convertNotionPageToTask(properties: any, pageId: string): Task | null {
    if (!this.settings) return null;

    try {
      const titleProperty = properties[this.settings.titlePropertyName];
      const statusProperty = properties[this.settings.statusPropertyName];
      const estimatedTimeProperty = properties[this.settings.estimatedTimePropertyName];
      const actualTimeProperty = properties[this.settings.actualTimePropertyName];
      const lastUpdatedProperty = properties['Last Updated'];
      const appTaskIdProperty = properties['App Task ID'];

      // タイトルが必須
      if (!titleProperty || !titleProperty.title || titleProperty.title.length === 0) {
        console.warn('Notion page missing title, skipping');
        return null;
      }

      const title = titleProperty.title[0].text.content;
      const status = this.mapNotionStatusToTaskStatus(statusProperty?.select?.name || 'not-started');
      const estimatedTime = this.extractTimeFromRichText(estimatedTimeProperty) || '00:30:00';
      const actualTime = this.extractTimeFromRichText(actualTimeProperty) || '00:00:00';
      const lastUpdated = lastUpdatedProperty?.date?.start || new Date().toISOString();
      const appTaskId = appTaskIdProperty?.number || Date.now(); // フォールバック用のID

      return {
        id: appTaskId,
        title,
        status,
        estimatedTime,
        actualTime,
        lastUpdated,
        description: `Synced from Notion (${pageId})`,
      };
    } catch (error) {
      console.error('Error converting Notion page to task:', error);
      return null;
    }
  }

  /**
   * TaskオブジェクトをNotionプロパティに変換
   */
  private convertTaskToNotionProperties(task: Task): any {
    if (!this.settings) {
      throw new Error('Settings not available');
    }

    return {
      [this.settings.titlePropertyName]: {
        title: [
          {
            text: {
              content: task.title,
            },
          },
        ],
      },
      [this.settings.statusPropertyName]: {
        select: {
          name: this.mapTaskStatusToNotionStatus(task.status),
        },
      },
      [this.settings.estimatedTimePropertyName]: {
        rich_text: [
          {
            text: {
              content: task.estimatedTime,
            },
          },
        ],
      },
      [this.settings.actualTimePropertyName]: {
        rich_text: [
          {
            text: {
              content: task.actualTime,
            },
          },
        ],
      },
      'Last Updated': {
        date: {
          start: task.lastUpdated || new Date().toISOString(),
        },
      },
      'App Task ID': {
        number: task.id,
      },
    };
  }

  /**
   * リッチテキストから時間を抽出
   */
  private extractTimeFromRichText(property: any): string | null {
    if (!property || !property.rich_text || property.rich_text.length === 0) {
      return null;
    }

    const content = property.rich_text[0].text.content;
    
    // HH:mm:ss形式の時間をチェック
    const timePattern = /^([0-9]{1,2}):([0-5][0-9]):([0-5][0-9])$/;
    if (timePattern.test(content)) {
      return content;
    }

    // その他の時間形式を変換（例：1h 30m → 01:30:00）
    const hourMinutePattern = /(\d+)h\s*(\d+)?m?/;
    const match = content.match(hourMinutePattern);
    if (match) {
      const hours = parseInt(match[1]);
      const minutes = match[2] ? parseInt(match[2]) : 0;
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
    }

    return null;
  }

  /**
   * Notionステータスをタスクステータスにマッピング
   */
  private mapNotionStatusToTaskStatus(notionStatus: string): 'not-started' | 'in-progress' | 'completed' {
    switch (notionStatus.toLowerCase()) {
      case 'completed':
      case 'done':
      case '完了':
        return 'completed';
      case 'in progress':
      case 'doing':
      case '進行中':
        return 'in-progress';
      default:
        return 'not-started';
    }
  }

  /**
   * タスクステータスをNotionステータスにマッピング
   */
  private mapTaskStatusToNotionStatus(taskStatus: string): string {
    switch (taskStatus) {
      case 'completed':
        return 'Completed';
      case 'in-progress':
        return 'In Progress';
      case 'not-started':
      default:
        return 'Not Started';
    }
  }

  /**
   * タスクマッピングを作成
   */
  private createTaskMapping(localTasks: Task[], notionTasks: Task[]): Map<number, { local?: Task; notion?: Task }> {
    const taskMap = new Map<number, { local?: Task; notion?: Task }>();

    // ローカルタスクを追加
    localTasks.forEach(task => {
      taskMap.set(task.id, { local: task });
    });

    // Notionタスクを追加
    notionTasks.forEach(task => {
      const existing = taskMap.get(task.id);
      if (existing) {
        existing.notion = task;
      } else {
        taskMap.set(task.id, { notion: task });
      }
    });

    return taskMap;
  }

  /**
   * 競合を検出
   */
  private detectConflicts(taskMap: Map<number, { local?: Task; notion?: Task }>): NotionSyncConflict[] {
    const conflicts: NotionSyncConflict[] = [];

    taskMap.forEach((mapping, taskId) => {
      const { local, notion } = mapping;

      if (local && notion) {
        const localTime = new Date(local.lastUpdated || 0).getTime();
        const notionTime = new Date(notion.lastUpdated || 0).getTime();
        const timeDiff = Math.abs(localTime - notionTime);

        // 1分以上の差がある場合は競合として扱う
        if (timeDiff > 60000) {
          const conflictingFields: string[] = [];

          if (local.title !== notion.title) conflictingFields.push('title');
          if (local.status !== notion.status) conflictingFields.push('status');
          if (local.estimatedTime !== notion.estimatedTime) conflictingFields.push('estimatedTime');
          if (local.actualTime !== notion.actualTime) conflictingFields.push('actualTime');

          if (conflictingFields.length > 0) {
            conflicts.push({
              taskId,
              title: local.title,
              localLastUpdated: local.lastUpdated || '',
              notionLastUpdated: notion.lastUpdated || '',
              conflictingFields,
              resolution: localTime > notionTime ? 'local_wins' : 'notion_wins',
            });
          }
        }
      }
    });

    return conflicts;
  }

  /**
   * 競合しないタスクを同期
   */
  private async syncNonConflictingTasks(
    taskMap: Map<number, { local?: Task; notion?: Task }>
  ): Promise<Task[]> {
    const syncedTasks: Task[] = [];

    for (const [taskId, mapping] of taskMap) {
      const { local, notion } = mapping;

      try {
        if (local && !notion) {
          // ローカルのみ存在 → Notionに作成
          await this.createTask(local);
          syncedTasks.push(local);
        } else if (!local && notion) {
          // Notionのみ存在 → ローカルに追加
          syncedTasks.push(notion);
        } else if (local && notion) {
          // 両方存在 → 更新日時で判定
          const localTime = new Date(local.lastUpdated || 0).getTime();
          const notionTime = new Date(notion.lastUpdated || 0).getTime();

          if (Math.abs(localTime - notionTime) <= 60000) {
            // 差が1分以内の場合は競合なしとして処理
            if (localTime >= notionTime) {
              // ローカルが新しい → Notionを更新
              // TODO: NotionページIDの取得方法を実装
              syncedTasks.push(local);
            } else {
              // Notionが新しい → ローカルを更新
              syncedTasks.push(notion);
            }
          }
        }
      } catch (error) {
        console.error(`Failed to sync task ${taskId}:`, error);
      }
    }

    return syncedTasks;
  }
} 