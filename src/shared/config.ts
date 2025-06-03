interface NotionConfig {
  apiKey: string;
  databaseId: string;
}

export const notionConfig: NotionConfig = {
  apiKey: process.env.NOTION_API_KEY || '',
  databaseId: process.env.NOTION_DATABASE_ID || '',
};

export const validateNotionConfig = (): boolean => {
  return !!(notionConfig.apiKey && notionConfig.databaseId);
}; 