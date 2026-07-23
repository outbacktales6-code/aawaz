import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, DeviceEventEmitter, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { meshEngine } from '../MeshEngine';
import { getMessages, wipeDatabase } from '../db';

export default function Chat() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [peerCount, setPeerCount] = useState(0);
  const [replyTo, setReplyTo] = useState(null);
  
  const flatListRef = useRef(null);

  const loadMessages = async () => {
    if (!meshEngine.db) return; // Guard for Fast Refresh during development
    // Basic lazy loading stub for MVP
    const msgs = await getMessages(meshEngine.db, 50, 0);
    setMessages(msgs);
  };

  useEffect(() => {
    loadMessages();
    
    const msgListener = DeviceEventEmitter.addListener('onNewMessage', () => {
      loadMessages();
    });
    
    const peerListener = DeviceEventEmitter.addListener('onPeersChanged', (count) => {
      setPeerCount(count);
    });
    
    return () => {
      msgListener.remove();
      peerListener.remove();
    };
  }, []);

  const handleSend = async () => {
    try {
      console.log('--- handleSend START ---');
      console.log('inputText:', inputText);
      if (!inputText.trim()) {
        console.log('Input is empty, returning early');
        return;
      }
      
      console.log('Calling meshEngine.sendMessage...');
      const sentMsg = await meshEngine.sendMessage(inputText, false, replyTo ? replyTo.id : null);
      console.log('meshEngine.sendMessage returned:', sentMsg);
      
      if (sentMsg === null) {
        console.log('Message was blocked by profanity filter');
        Alert.alert('Message Blocked', 'Your message contained explicit content which is blocked on this network.');
        return;
      }
      
      console.log('Clearing input text...');
      setInputText('');
      setReplyTo(null);
      loadMessages();
      console.log('--- handleSend DONE ---');
    } catch (e) {
      console.error('Send Error Catch Block:', e);
      Alert.alert('Send Error', e.message || String(e));
    }
  };

  const handlePanic = () => {
    Alert.alert(
      'Wipe Database',
      'Are you sure you want to permanently delete all messages on this device? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Wipe', 
          style: 'destructive',
          onPress: async () => {
            await wipeDatabase(meshEngine.db);
            setMessages([]);
            loadMessages();
          }
        }
      ]
    );
  };

  const handleSOS = async () => {
    try {
      await meshEngine.sendMessage("🚨 EMERGENCY: Need Assistance at my location! 🚨", true);
      loadMessages();
    } catch (e) {
      Alert.alert('SOS Error', e.message || String(e));
    }
  };

  const renderItem = ({ item }) => {
    const isMine = item.sender_id === meshEngine.userId;
    const repliedMsg = item.reply_to_id ? messages.find(m => m.id === item.reply_to_id) : null;
    
    return (
      <TouchableOpacity 
        style={[styles.messageBubble, isMine ? styles.myMessage : styles.theirMessage, item.is_sos && styles.sosMessage]}
        onLongPress={() => setReplyTo(item)}
      >
        <Text style={styles.senderName}>{item.sender_name}</Text>
        {repliedMsg && (
          <View style={styles.replyPreviewBubble}>
            <Text style={styles.replyPreviewName}>{repliedMsg.sender_name}</Text>
            <Text style={styles.replyPreviewText} numberOfLines={1}>{repliedMsg.content}</Text>
          </View>
        )}
        <Text style={styles.messageText}>{item.content}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Awaaz (आवाज़)</Text>
          <Text style={styles.peerCount}>
            {t('offline_status')} • {t('connected_peers')} {peerCount}
          </Text>
        </View>
        <TouchableOpacity style={styles.panicBtn} onPress={handlePanic}>
          <Text style={styles.panicText}>⚠️</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        inverted // Chat apps usually load from bottom up
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
      />

      <View style={styles.inputContainer}>
        {replyTo && (
          <View style={styles.replyBanner}>
            <Text style={styles.replyBannerText}>{t('reply')}: {replyTo.sender_name}</Text>
            <TouchableOpacity onPress={() => setReplyTo(null)}><Text style={styles.replyBannerClose}>✕</Text></TouchableOpacity>
          </View>
        )}
        <View style={styles.inputRow}>
          <TouchableOpacity style={styles.sosButton} onPress={handleSOS}>
            <Text style={styles.sosText}>{t('sos')}</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder={t('type_message')}
            placeholderTextColor="#666"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            blurOnSubmit={false}
          />
          <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
            <Text style={styles.sendText}>➤</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { 
    padding: 20, 
    paddingTop: 50, 
    backgroundColor: '#111', 
    borderBottomWidth: 1, 
    borderColor: '#333',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  panicBtn: {
    backgroundColor: '#400',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f00'
  },
  panicText: { fontSize: 20 },
  headerTitle: { color: '#0a84ff', fontWeight: 'bold', fontSize: 16 },
  peerCount: { color: '#888', fontSize: 12 },
  listContent: { padding: 15 },
  messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 16, marginBottom: 10 },
  myMessage: { backgroundColor: '#0a84ff', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  theirMessage: { backgroundColor: '#222', alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  sosMessage: { backgroundColor: '#ff3b30', alignSelf: 'stretch', maxWidth: '100%' },
  senderName: { color: '#ccc', fontSize: 10, marginBottom: 4 },
  messageText: { color: '#fff', fontSize: 16 },
  replyPreviewBubble: { backgroundColor: 'rgba(0,0,0,0.2)', padding: 6, borderRadius: 6, marginBottom: 6, borderLeftWidth: 3, borderLeftColor: '#fff' },
  replyPreviewName: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  replyPreviewText: { color: '#ddd', fontSize: 12 },
  inputContainer: { backgroundColor: '#111', paddingBottom: 20 },
  replyBanner: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, backgroundColor: '#222', borderTopWidth: 1, borderTopColor: '#333' },
  replyBannerText: { color: '#aaa', fontSize: 12 },
  replyBannerClose: { color: '#fff', fontWeight: 'bold' },
  inputRow: { flexDirection: 'row', padding: 10, alignItems: 'center' },
  sosButton: { backgroundColor: '#ff3b30', padding: 12, borderRadius: 20, marginRight: 10 },
  sosText: { color: '#fff', fontWeight: 'bold' },
  input: { flex: 1, backgroundColor: '#222', color: '#fff', padding: 12, borderRadius: 20, marginRight: 10 },
  sendButton: { backgroundColor: '#0a84ff', padding: 12, borderRadius: 20 },
  sendText: { color: '#fff', fontSize: 16 }
});
