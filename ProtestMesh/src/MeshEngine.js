import NearbyConnection, { Strategy } from 'react-native-google-nearby-connection';
import { DeviceEventEmitter } from 'react-native';
import { getDBConnection, saveMessage, getMessages, createTables } from './db';
import { containsAdultContent } from './profanityFilter';

// Using P2P_CLUSTER for mesh network topology
const SERVICE_ID = 'com.protestmesh.awaaz';

class MeshEngine {
  constructor() {
    this.connectedEndpoints = new Set();
    this.seenMessages = new Map(); // Using Map for LRU Cache
    this.db = null;
    this.userName = 'Anonymous';
    this.userId = 'uuid-placeholder';
  }

  addToLRU(id) {
    if (this.seenMessages.has(id)) {
      this.seenMessages.delete(id);
    }
    this.seenMessages.set(id, true);
    if (this.seenMessages.size > 5000) {
      const firstKey = this.seenMessages.keys().next().value;
      this.seenMessages.delete(firstKey);
    }
  }

  async init(userName, userId) {
    this.userName = userName;
    this.userId = userId;
    this.db = await getDBConnection();
    await createTables(this.db);
    
    // Listen for incoming endpoints
    NearbyConnection.onEndpointDiscovered(({ endpointId, endpointName, serviceId }) => {
      console.log('Discovered:', endpointId);
      NearbyConnection.connectToEndpoint(serviceId, endpointId);
    });

    NearbyConnection.onConnectionInitiatedToEndpoint(({ endpointId, endpointName, authenticationToken, serviceId }) => {
      console.log('Connection Initiated:', endpointId);
      NearbyConnection.acceptConnection(serviceId || SERVICE_ID, endpointId);
    });

    NearbyConnection.onConnectedToEndpoint(({ endpointId }) => {
      console.log('Connected:', endpointId);
      this.connectedEndpoints.add(endpointId);
      DeviceEventEmitter.emit('onPeersChanged', this.connectedEndpoints.size);
      this.syncRecentMessages(endpointId);
    });

    NearbyConnection.onDisconnectedFromEndpoint(({ endpointId }) => {
      this.connectedEndpoints.delete(endpointId);
      DeviceEventEmitter.emit('onPeersChanged', this.connectedEndpoints.size);
    });

    NearbyConnection.onReceivePayload(async ({ serviceId, endpointId, payloadId, payloadType }) => {
      // Decode byte payload (we use Base64 strings over the wire)
      if (payloadType === 1) { // Payload.BYTES
        try {
          const result = await NearbyConnection.readBytes(serviceId || SERVICE_ID, endpointId, payloadId);
          if (result && result.bytes) {
            this.handleIncomingBytes(result.bytes);
          }
        } catch (e) {
          console.error('Error reading bytes:', e);
        }
      }
    });
  }

  async startMesh() {
    try {
      const STRATEGY = Strategy.P2P_CLUSTER;
      await NearbyConnection.startDiscovering(SERVICE_ID, STRATEGY);
      await NearbyConnection.startAdvertising(this.userName, SERVICE_ID, STRATEGY);
      console.log('Mesh Engine: Radios ON');
    } catch (e) {
      console.error('Failed to start mesh:', e);
    }
  }

  async stopMesh() {
    await NearbyConnection.stopDiscovering(SERVICE_ID);
    await NearbyConnection.stopAdvertising(SERVICE_ID);
    for (let endpointId of this.connectedEndpoints) {
      await NearbyConnection.disconnectFromEndpoint(SERVICE_ID, endpointId);
    }
    this.connectedEndpoints.clear();
  }

  // --- Gossip Protocol ---

  async handleIncomingBytes(bytesStr) {
    try {
      // Basic base64 decode or direct parsing if text
      const msgData = JSON.parse(bytesStr);
      
      // Seen Cache Check to stop flooding immediately
      if (this.seenMessages.has(msgData.id)) {
        return;
      }
      this.addToLRU(msgData.id);

      // Adult Content Filter (Drop Option B)
      if (containsAdultContent(msgData.content)) {
        console.log('Blocked incoming adult content');
        return;
      }

      // Deduplication: Save returns true ONLY if it was a new message
      const isNewMessage = await saveMessage(this.db, msgData);
      
      if (isNewMessage) {
        // Decrease TTL before forwarding
        if (msgData.ttl === undefined) msgData.ttl = 5;
        msgData.ttl -= 1;
        
        if (msgData.ttl > 0) {
          // Gossip it forward to everyone else
          this.broadcastMessage(msgData);
        }
        // Trigger UI update event
        DeviceEventEmitter.emit('onNewMessage');
      }
    } catch (e) {
      console.error('Failed to parse payload', e);
    }
  }

  async sendMessage(content, isSos = false, replyToId = null) {
    if (containsAdultContent(content)) {
      console.log('Blocked outgoing adult content');
      return null;
    }

    const newMsg = {
      id: this.userId + '-' + Date.now(),
      sender_id: this.userId,
      sender_name: this.userName,
      content: content,
      timestamp: Date.now(),
      is_sos: isSos,
      reactions: {},
      reply_to_id: replyToId,
      ttl: 5
    };

    this.addToLRU(newMsg.id);
    await saveMessage(this.db, newMsg);
    this.broadcastMessage(newMsg);
    return newMsg;
  }

  async broadcastMessage(msgObject) {
    const payloadStr = JSON.stringify(msgObject);
    let endpoints = Array.from(this.connectedEndpoints);
    
    // Epidemic Routing: Forward to max 3 random peers to prevent Broadcast Storms
    if (endpoints.length > 3) {
      endpoints = endpoints.sort(() => 0.5 - Math.random()).slice(0, 3);
    }
    
    for (let endpointId of endpoints) {
      NearbyConnection.sendBytes(SERVICE_ID, endpointId, payloadStr);
    }
  }

  async syncRecentMessages(targetEndpointId) {
    // When a new person connects, send them our last 15 messages to get them up to speed
    const recentMessages = await getMessages(this.db, 15, 0);
    
    // Batch with slight delays to prevent DoS attack on Nearby API bandwidth
    for (let i = 0; i < recentMessages.length; i++) {
      setTimeout(() => {
        const payloadStr = JSON.stringify(recentMessages[i]);
        NearbyConnection.sendBytes(SERVICE_ID, targetEndpointId, payloadStr);
      }, i * 50); // 50ms delay per packet
    }
  }
}

export const meshEngine = new MeshEngine();
