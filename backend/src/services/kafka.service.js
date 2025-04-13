const { Kafka } = require('kafkajs');
const config = require('../config');

class KafkaService {
  constructor() {
    this.kafka = new Kafka({
      clientId: 'scientific-workflow-api',
      brokers: [config.kafka.broker]
    });
    
    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId: 'workflow-service' });
    this.isConnected = false;
  }

  async connect() {
    if (!this.isConnected) {
      await this.producer.connect();
      this.isConnected = true;
      console.log('Connected to Kafka producer');
    }
  }

  async disconnect() {
    if (this.isConnected) {
      await this.producer.disconnect();
      this.isConnected = false;
      console.log('Disconnected from Kafka producer');
    }
  }

  async publishWorkflowSubmission(data) {
    try {
      await this.ensureConnection();
      await this.producer.send({
        topic: 'workflow-submission',
        messages: [
          { value: JSON.stringify(data) }
        ],
      });
      console.log(`Submitted workflow: ${JSON.stringify(data)}`);
      return true;
    } catch (error) {
      throw new Error(`Error submitting workflow: ${error.message}`);
    }
  }

  async publishEvent(event, data) {
    try {
      await this.ensureConnection();
      await this.producer.send({
        topic: `event.${event}`,
        messages: [
          { value: JSON.stringify(data) }
        ],
      });
      console.log(`Published event ${event}: ${JSON.stringify(data)}`);
      return true;
    } catch (error) {
      throw new Error(`Error publishing event: ${error.message}`);
    }
  }

  async subscribeToWorkflowStatus(callback) {
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: 'workflow-status-raw', fromBeginning: false });
    
    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const data = JSON.parse(JSON.parse(message.value.toString())?.body);
          await this.producer.send({
            topic: 'workflow-status',
            messages: [
              { value: JSON.stringify(data) }
            ],
          });
          console.log(`Published processed workflow status}`);
          callback(data);
        } catch (error) {
          console.error(`Error processing Kafka message: ${error}`);
        }
      },
    });
    
    console.log('Subscribed to workflow-status-raw topic');
  }

  async subscribeToEvent(event, callback) {
    const consumer = this.kafka.consumer({ groupId: `event-${event}-consumer` });
    await consumer.connect();
    await consumer.subscribe({ topic: `event.${event}`, fromBeginning: false });
    
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const data = JSON.parse(message.value.toString());
          callback(data);
        } catch (error) {
          console.error(`Error processing Kafka message: ${error}`);
        }
      },
    });
    
    console.log(`Subscribed to event.${event} topic`);
    return consumer;
  }

  async set(key, value) {
    try {
      await this.ensureConnection();
      
      const serializedValue = typeof value === 'object' 
        ? JSON.stringify(value) 
        : value.toString();
      
      await this.producer.send({
        topic: 'kv.store',
        messages: [
          { 
            key,
            value: serializedValue
          }
        ],
      });
      
      return true;
    } catch (error) {
      throw new Error(`Error setting value: ${error.message}`);
    }
  }

  async ensureConnection() {
    if (!this.isConnected) {
      await this.connect();
    }
  }
}

module.exports = new KafkaService();