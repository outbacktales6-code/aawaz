import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { meshEngine } from '../MeshEngine';
import { getMessages } from '../db';

export default function Chat() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [peerCount, setPeerCount] = useState(0);
  
  const flatListRef = useRef(null);

  const loadMessages = async () => {
    // Basic lazy loading stub for MVP
    const msgs = await getMessages(meshEngine.db, 50, 0);
    setMessages(msgs);
  };

  useEffect(() => {
    loadMessages();
    
    // In a real app we'd use an event emitter from MeshEngine to trigger this
    const interval = setInterval(() => {
      setPeerCount(meshEngine.connectedEndpoints.size);
      loadMessages(); 
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);

  const handleSend = async () => {
    if (!inputText.trim()) return;
    await meshEngine.sendMessage(inputText);
    setInputText('');
    loadMessages();
  };

  const handleSOS = async () => {
    await meshEngine.sendMessage("🚨 EMERGENCY: Need Assistance at my location! 🚨", true);
    loadMessages();
  };

  const renderItem = ({ item }) => (
    <View style={[styles.messageBubble, item.sender_id === meshEngine.userId ? styles.myMessage : styles.theirMessage, item.is_sos && styles.sosMessage]}>
      <Text style={styles.senderName}>{item.sender_name}</Text>
      <Text style={styles.messageText}>{item.content}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('offline_status')}</Text>
        <Text style={styles.peerCount}>{t('connected_peers')} {peerCount}</Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        inverted // Chat apps usually load from bottom up
        contentContainerStyle={styles.listContent}
      />

      <View style={styles.inputContainer}>
        <TouchableOpacity style={styles.sosButton} onPress={handleSOS}>
          <Text style={styles.sosText}>{t('sos')}</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder={t('type_message')}
          placeholderTextColor="#666"
          value={inputText}
          onChangeText={setInputText}
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
          <Text style={styles.sendText}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { padding: 15, backgroundColor: '#111', borderBottomWidth: 1, borderColor: '#333', alignItems: 'center' },
  headerTitle: { color: '#0a84ff', fontWeight: 'bold', fontSize: 16 },
  peerCount: { color: '#888', fontSize: 12 },
  listContent: { padding: 15 },
  messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 16, marginBottom: 10 },
  myMessage: { backgroundColor: '#0a84ff', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  theirMessage: { backgroundColor: '#222', alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  sosMessage: { backgroundColor: '#ff3b30', alignSelf: 'stretch', maxWidth: '100%' },
  senderName: { color: '#ccc', fontSize: 10, marginBottom: 4 },
  messageText: { color: '#fff', fontSize: 16 },
  inputContainer: { flexDirection: 'row', padding: 10, backgroundColor: '#111', alignItems: 'center' },
  sosButton: { backgroundColor: '#ff3b30', padding: 12, borderRadius: 20, marginRight: 10 },
  sosText: { color: '#fff', fontWeight: 'bold' },
  input: { flex: 1, backgroundColor: '#222', color: '#fff', padding: 12, borderRadius: 20, marginRight: 10 },
  sendButton: { backgroundColor: '#0a84ff', padding: 12, borderRadius: 20 },
  sendText: { color: '#fff', fontSize: 16 }
});
