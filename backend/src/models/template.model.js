const mongoose = require('mongoose');

const parameterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  type: {
    type: String,
    enum: ['string', 'number', 'boolean', 'file'],
    default: 'string'
  },
  default: {
    type: mongoose.Schema.Types.Mixed
  },
  required: {
    type: Boolean,
    default: false
  }
}, { _id: false });

const templateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  template: {
    type: String,
    required: true
  },
  parameters: [parameterSchema],
  isPublic: {
    type: Boolean,
    default: true
  },
  category: {
    type: String,
    enum: ['Data Processing', 'Machine Learning', 'Visualization', 'Other'],
    default: 'Other'
  },
  version: {
    type: String,
    default: '1.0.0'
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
templateSchema.index({ name: 1 }, { unique: true });
templateSchema.index({ category: 1, isPublic: 1 });

const Template = mongoose.model('Template', templateSchema);

module.exports = Template;