const mongoose = require('mongoose');

const workflowSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  templateName: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Running', 'Succeeded', 'Failed', 'Terminated'],
    default: 'Pending'
  },
  argoWorkflowName: {
    type: String,
    required: true
  },
  parameters: {
    type: Map,
    of: String
  },
  artifacts: {
    type: [{
      name: String,
      path: String,
      s3: {
        bucket: String,
        key: String
      }
    }]
  },
  outputs: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  startedAt: {
    type: Date
  },
  finishedAt: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Add index for faster queries
workflowSchema.index({ createdBy: 1, status: 1 });
workflowSchema.index({ argoWorkflowName: 1 }, { unique: true });

const Workflow = mongoose.model('Workflow', workflowSchema);

module.exports = Workflow;