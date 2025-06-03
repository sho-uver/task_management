import { Client } from '@notionhq/client';

export class NotionClient {
  private client: Client;
  private databaseId: string;

  constructor(apiKey: string, databaseId: string) {
    this.client = new Client({ auth: apiKey });
    this.databaseId = databaseId;
  }

  async createTask(title: string, description?: string) {
    try {
      const response = await this.client.pages.create({
        parent: { database_id: this.databaseId },
        properties: {
          Name: {
            title: [
              {
                text: {
                  content: title,
                },
              },
            ],
          },
          Description: {
            rich_text: [
              {
                text: {
                  content: description || '',
                },
              },
            ],
          },
          Status: {
            status: {
              name: 'Not started',
            },
          },
        },
      });
      return response;
    } catch (error) {
      console.error('Error creating task in Notion:', error);
      throw error;
    }
  }

  async updateTaskStatus(pageId: string, status: string) {
    try {
      const response = await this.client.pages.update({
        page_id: pageId,
        properties: {
          Status: {
            status: {
              name: status,
            },
          },
        },
      });
      return response;
    } catch (error) {
      console.error('Error updating task status in Notion:', error);
      throw error;
    }
  }

  async getTasks() {
    try {
      const response = await this.client.databases.query({
        database_id: this.databaseId,
      });
      return response.results;
    } catch (error) {
      console.error('Error fetching tasks from Notion:', error);
      throw error;
    }
  }
} 