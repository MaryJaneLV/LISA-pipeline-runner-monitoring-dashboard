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

  /**
   * Connect to Kafka
   * @returns {Promise<void>}
   */
  async connect() {
    if (!this.isConnected) {
      await this.producer.connect();
      this.isConnected = true;
      console.log('Connected to Kafka producer');
    }
  }

  /**
   * Disconnect from Kafka
   * @returns {Promise<void>}
   */
  async disconnect() {
    if (this.isConnected) {
      await this.producer.disconnect();
      this.isConnected = false;
      console.log('Disconnected from Kafka producer');
    }
  }

  /**
   * Publish a workflow submission
   * @param {Object} data - The workflow status data
   * @returns {Promise<void>}
   */
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

  /**
   * Publish an event
   * @param {String} event - The event type
   * @param {Object} data - The event data
   * @returns {Promise<void>}
   */
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

  /**
   * Create consumer for workflow status updates
   * @param {Function} callback - The callback to handle messages
   * @returns {Promise<void>}
   */
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

  /**
   * Create consumer for custom events
   * @param {String} event - The event type to subscribe to
   * @param {Function} callback - The callback to handle messages
   * @returns {Promise<void>}
   */
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

  /**
   * Store a key-value pair (using a dedicated topic with key)
   * @param {String} key - The key
   * @param {String|Object} value - The value
   * @returns {Promise<void>}
   */
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

  /**
   * Ensure connection is established
   * @returns {Promise<void>}
   */
  async ensureConnection() {
    if (!this.isConnected) {
      await this.connect();
    }
  }
}

module.exports = new KafkaService();