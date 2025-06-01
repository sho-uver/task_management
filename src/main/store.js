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
      isAlwaysOnTop: false
    },
    properties: {
      isAlwaysOnTop: { type: 'boolean' }
    }
  }
};

const store = new Store({ schema });

module.exports = store; 