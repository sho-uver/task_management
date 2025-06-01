const Store = require('electron-store');

const schema = {
  tasks: {
    type: 'array',
    default: [],
    items: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        title: { type: 'string' },
        status: { type: 'string', enum: ['not-started', 'in-progress'] },
        estimatedTime: { type: 'string' },
        actualTime: { type: 'string' }
      },
      required: ['id', 'title', 'status', 'estimatedTime', 'actualTime']
    }
  },
  settings: {
    type: 'object',
    default: {
      isAlwaysOnTop: false,
      window: {
        x: undefined,
        y: undefined,
        width: 400,
        height: 400
      }
    },
    properties: {
      isAlwaysOnTop: { type: 'boolean' },
      window: {
        type: 'object',
        properties: {
          x: { type: ['number', 'null'] },
          y: { type: ['number', 'null'] },
          width: { type: 'number' },
          height: { type: 'number' }
        }
      }
    }
  }
};

const store = new Store({ schema });

module.exports = store; 