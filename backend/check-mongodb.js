const mongoose = require('mongoose');

// Define a simple schema for testing
const TestSchema = new mongoose.Schema({
  name: String,
  timestamp: { type: Date, default: Date.now }
});

const Test = mongoose.model('Test', TestSchema);

// Connect to MongoDB
console.log('Connecting to MongoDB...');
mongoose.connect('mongodb://mongo:27017/scientific-workflow', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(async () => {
  console.log('Connected to MongoDB successfully!');
  
  try {
    // Create a test document
    console.log('Creating test document...');
    const test = new Test({ name: 'Connection Test' });
    await test.save();
    console.log('Test document created with ID:', test._id);
    
    // Find the document
    console.log('Finding test documents...');
    const docs = await Test.find().sort({ timestamp: -1 }).limit(5);
    console.log('Recent test documents:');
    docs.forEach(doc => {
      console.log(`- ${doc._id}: ${doc.name} (${doc.timestamp})`);
    });
    
    console.log('MongoDB connection and operations successful!');
  } catch (err) {
    console.error('Error during MongoDB operations:', err);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
})
.catch(err => {
  console.error('Failed to connect to MongoDB:', err);
});