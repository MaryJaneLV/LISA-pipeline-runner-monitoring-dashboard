const { createClient } = require('redis');
const config = require('../config');

class RedisService {
  constructor() {
    this.publisher = createClient({
      url: config.redis.url
    });
    
    this.publisher.on('error', (err) => {
      console.error('Redis Publisher Error:', err);
    });
    
    this.isConnected = false;
  }

  /**
   * Connect to Redis
   * @returns {Promise<void>}
   */
  async connect() {
    if (!this.isConnected) {
      await this.publisher.connect();
      this.isConnected = true;
    }
  }

  /**
   * Disconnect from Redis
   * @returns {Promise<void>}
   */
  async disconnect() {
    if (this.isConnected) {
      await this.publisher.quit();
      this.isConnected = false;
    }
  }

  /**
   * Publish a workflow status update
   * @param {Object} data - The workflow status data
   * @returns {Promise<Number>} - The number of clients that received the message
   */
  async publishWorkflowStatus(data) {
    try {
      await this.ensureConnection();
      return await this.publisher.publish('workflow:status', JSON.stringify(data));
    } catch (error) {
      throw new Error(`Error publishing workflow status: ${error.message}`);
    }
  }

  /**
   * Publish a workflow event
   * @param {String} event - The event type
   * @param {Object} data - The event data
   * @returns {Promise<Number>} - The number of clients that received the message
   */
  async publishEvent(event, data) {
    try {
      await this.ensureConnection();
      return await this.publisher.publish(`event:${event}`, JSON.stringify(data));
    } catch (error) {
      throw new Error(`Error publishing event: ${error.message}`);
    }
  }

  /**
   * Store a key-value pair
   * @param {String} key - The key
   * @param {String|Object} value - The value
   * @param {Number} expireSeconds - Expiration time in seconds (optional)
   * @returns {Promise<String>} - The operation result
   */
  async set(key, value, expireSeconds = null) {
    try {
      await this.ensureConnection();
      
      const serializedValue = typeof value === 'object' 
        ? JSON.stringify(value) 
        : value.toString();
      
      if (expireSeconds) {
        return await this.publisher.setEx(key, expireSeconds, serializedValue);
      } else {
        return await this.publisher.set(key, serializedValue);
      }
    } catch (error) {
      throw new Error(`Error setting value: ${error.message}`);
    }
  }

  /**
   * Get a value by key
   * @param {String} key - The key
   * @returns {Promise<String|Object|null>} - The value
   */
  async get(key) {
    try {
      await this.ensureConnection();
      
      const value = await this.publisher.get(key);
      
      if (!value) {
        return null;
      }
      
      // Try to parse as JSON
      try {
        return JSON.parse(value);
      } catch (e) {
        // Return as string if not valid JSON
        return value;
      }
    } catch (error) {
      throw new Error(`Error getting value: ${error.message}`);
    }
  }

  /**
   * Delete a key
   * @param {String} key - The key
   * @returns {Promise<Number>} - The number of keys that were removed
   */
  async delete(key) {
    try {
      await this.ensureConnection();
      return await this.publisher.del(key);
    } catch (error) {
      throw new Error(`Error deleting key: ${error.message}`);
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

module.exports = new RedisService();