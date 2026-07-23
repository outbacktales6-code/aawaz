import NearbyConnection, { Strategy } from 'react-native-google-nearby-connection';
import { getDBConnection, saveMessage, getMessages } from './db';

// Using P2P_CLUSTER for mesh network topology
const STRATEGY = Strategy.P2P_CLUSTER;
const SERVICE_ID = 'com.protestmesh.awaaz';

class MeshEngine {
  constructor() {
    this.connectedEndpoints = new Set();
    this.db = null;
    this.userName = 'Anonymous';
    this.userId = 'uuid-placeholder'; // To be set on init
  }

  async init(userName, userId) {
    this.userName = userName;
    this.userId = userId;
    this.db = await getDBConnection();
    
    // Listen for incoming endpoints
    NearbyConnection.onEndpointDiscovered(({ endpointId, endpointName, serviceId }) => {
      console.log('Discovered:', endpointId);
      NearbyConnection.requestConnection(this.userName, endpointId, () => {}, () => {});
    });

    NearbyConnection.onConnectionInitiatedToEndpoint(({ endpointId, endpointName, authenticationToken }) => {
      console.log('Connection Initiated:', endpointId);
      NearbyConnection.acceptConnection(endpointId);
    });

    NearbyConnection.onEndpointConnected(({ endpointId }) => {
      console.log('Connected:', endpointId);
      this.connectedEndpoints.add(endpointId);
      this.syncRecentMessages(endpointId);
    });

    NearbyConnection.onEndpointDisconnected(({ endpointId }) => {
      this.connectedEndpoints.delete(endpointId);
    });

    NearbyConnection.onReceivePayload(({ endpointId, payloadId, payloadType, bytes }) => {
      // Decode byte payload (we use Base64 strings over the wire)
      this.handleIncomingBytes(bytes);
    });
  }

  async startMesh() {
    try {
      await NearbyConnection.startDiscovering(SERVICE_ID, STRATEGY);
      await NearbyConnection.startAdvertising(this.userName, SERVICE_ID, STRATEGY);
      console.log('Mesh Engine Started: Advertising and Discovering');
    } catch (e) {
      console.error('Failed to start mesh:', e);
    }
  }

  async stopMesh() {
    await NearbyConnection.stopDiscovering(SERVICE_ID);
    await NearbyConnection.stopAdvertising(SERVICE_ID);
    await NearbyConnection.stopAllEndpoints();
    this.connectedEndpoints.clear();
  }

  // --- Gossip Protocol ---

  async handleIncomingBytes(bytesStr) {
    try {
      // Basic base64 decode or direct parsing if text
      const msgData = JSON.parse(bytesStr);
      
      // Deduplication: Save returns true ONLY if it was a new message
      const isNewMessage = await saveMessage(this.db, msgData);
      
      if (isNewMessage) {
        // It's a new message! Gossip it forward to everyone else
        this.broadcastMessage(msgData);
        // Trigger UI update event here...
      }
    } catch (e) {
      console.error('Failed to parse payload', e);
    }
  }

  async sendMessage(content, isSos = false, replyToId = null) {
    const newMsg = {
      id: this.userId + '-' + Date.now(),
      sender_id: this.userId,
      sender_name: this.userName,
      content: content,
      timestamp: Date.now(),
      is_sos: isSos,
      reactions: {},
      reply_to_id: replyToId
    };

    await saveMessage(this.db, newMsg);
    this.broadcastMessage(newMsg);
    return newMsg;
  }

  async broadcastMessage(msgObject) {
    const payloadStr = JSON.stringify(msgObject);
    // Send to all currently connected endpoints
    for (let endpointId of this.connectedEndpoints) {
      NearbyConnection.sendBytes(endpointId, payloadStr);
    }
  }

  async syncRecentMessages(targetEndpointId) {
    // When a new person connects, send them our last 50 messages to get them up to speed
    const recentMessages = await getMessages(this.db, 50, 0);
    for (let msg of recentMessages) {
      const payloadStr = JSON.stringify(msg);
      NearbyConnection.sendBytes(targetEndpointId, payloadStr);
    }
  }
}

export const meshEngine = new MeshEngine();
