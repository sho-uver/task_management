# コーディング規約

## 基本方針

1. **可読性を最優先**
   - 明確で理解しやすいコード
   - 適切な命名
   - 一貫性のある書き方

2. **保守性の確保**
   - モジュール化
   - 責務の分離
   - テスタビリティの確保

3. **型安全性の確保**
   - TypeScriptの厳格な型チェック
   - 明示的な型定義
   - any型の使用を最小限に

## 命名規則

### 1. 共通ルール
- 略語は避け、明確な名前を使用
- 英語で命名（日本語のローマ字は使用しない）
- 文脈から意味が明確な場合を除き、略語を避ける

### 2. ファイル名
```typescript
// コンポーネント
MyComponent.tsx
MyComponent.styles.ts
MyComponent.test.tsx

// ユーティリティ
stringUtils.ts
dateHelpers.ts

// 型定義
types.ts
interfaces.ts
```

### 3. 変数名
```typescript
// 変数（キャメルケース）
const userName = 'John';
const isActive = true;

// 定数（大文字スネークケース）
const MAX_RETRY_COUNT = 3;
const API_BASE_URL = 'https://api.example.com';

// 配列（複数形）
const users = ['John', 'Jane'];
const taskList = tasks.map(task => task.name);
```

### 4. 関数名
```typescript
// 動詞 + 名詞
function getUserData() { ... }
function calculateTotal() { ... }

// 真偽値を返す関数は is, has, can などで始める
function isValidUser() { ... }
function hasPermission() { ... }
```

### 5. クラス名
```typescript
// パスカルケース
class TaskManager { ... }
class UserAuthentication { ... }

// インターフェース（接頭辞 I は不要）
interface User { ... }
interface TaskData { ... }
```

### 6. コンポーネント名
```typescript
// Reactコンポーネント（パスカルケース）
function TaskList() { ... }
function UserProfile() { ... }

// カスタムフック（use で始める）
function useTaskManager() { ... }
function useAuthentication() { ... }
```

## コードフォーマット

### 1. インデント
- スペース2個
- タブは使用しない

```typescript
function example() {
  const value = 1;
  if (value === 1) {
    return true;
  }
}
```

### 2. 文字列
- シングルクォート（'）を使用
- テンプレートリテラルは適切な場合のみ使用

```typescript
const name = 'John';
const greeting = `Hello, ${name}!`;
```

### 3. オブジェクト・配列
```typescript
// オブジェクト
const user = {
  name: 'John',
  age: 30,
  isAdmin: false,
};

// 配列
const numbers = [
  1,
  2,
  3,
];
```

### 4. 関数
```typescript
// アロー関数（単一行）
const add = (a: number, b: number): number => a + b;

// アロー関数（複数行）
const calculate = (a: number, b: number): number => {
  const result = a + b;
  return result;
};

// 通常の関数
function processData(data: Data): Result {
  // 処理
}
```

## TypeScript特有のルール

### 1. 型定義
```typescript
// インターフェース定義
interface User {
  id: string;
  name: string;
  age?: number;  // オプショナルな属性
  readonly role: string;  // 読み取り専用
}

// 型エイリアス
type Status = 'active' | 'inactive' | 'pending';
type Handler = (event: Event) => void;
```

### 2. ジェネリクス
```typescript
// ジェネリック型の命名
interface Container<T> {
  value: T;
  getValue(): T;
}

// ジェネリック関数
function getFirst<T>(array: T[]): T | undefined {
  return array[0];
}
```

### 3. 非同期処理
```typescript
// Promise の使用
async function fetchData(): Promise<Data> {
  try {
    const response = await api.get('/data');
    return response.data;
  } catch (error) {
    handleError(error);
    throw error;
  }
}
```

## Reactコンポーネントの規約

### 1. コンポーネント構造
```typescript
// 関数コンポーネント
interface Props {
  title: string;
  onAction: () => void;
}

export const MyComponent: React.FC<Props> = ({ title, onAction }) => {
  return (
    <div>
      <h1>{title}</h1>
      <button onClick={onAction}>Click me</button>
    </div>
  );
};
```

### 2. カスタムフック
```typescript
// カスタムフックの実装
function useTaskState(initialTask: Task) {
  const [task, setTask] = useState<Task>(initialTask);
  
  const updateTask = useCallback((newData: Partial<Task>) => {
    setTask(prev => ({ ...prev, ...newData }));
  }, []);

  return { task, updateTask };
}
```

### 3. スタイリング
```typescript
// スタイルの定義
const styles = {
  container: {
    padding: '1rem',
    margin: '0.5rem',
  },
  title: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
  },
} as const;
```

## コメント規約

### 1. JSDoc形式のコメント
```typescript
/**
 * タスクを作成する
 * @param {TaskData} data タスクのデータ
 * @returns {Promise<Task>} 作成されたタスク
 * @throws {ValidationError} データが不正な場合
 */
async function createTask(data: TaskData): Promise<Task> {
  // 実装
}
```

### 2. インラインコメント
```typescript
// 一時的な対応（TODO: 後で修正）
const tempFix = value * 2;

/* 複数行のコメント
 * 詳細な説明が必要な場合に使用
 */
```

## テストコード規約

### 1. テストファイルの構造
```typescript
describe('TaskManager', () => {
  // セットアップ
  beforeEach(() => {
    // テストの準備
  });

  // テストケース
  it('should create a new task', () => {
    // テストの実装
  });
});
```

### 2. テストの命名
```typescript
// テストケースの命名
it('should return user data when valid ID is provided', () => {
  // テストの実装
});

it('should throw error when invalid ID is provided', () => {
  // テストの実装
});
```

## エラー処理規約

### 1. カスタムエラー
```typescript
class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
```

### 2. エラーハンドリング
```typescript
try {
  await processData();
} catch (error) {
  if (error instanceof ValidationError) {
    // バリデーションエラーの処理
  } else {
    // その他のエラーの処理
    console.error('Unexpected error:', error);
  }
}
``` 