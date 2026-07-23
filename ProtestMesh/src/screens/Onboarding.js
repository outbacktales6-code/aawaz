import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, PermissionsAndroid, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { meshEngine } from '../MeshEngine';

export default function Onboarding({ navigation }) {
  const { t, i18n } = useTranslation();
  const [name, setName] = useState('');

  const requestPermissionsAndJoin = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES,
        ]);
        
        // In a real app we'd check if granted === PermissionsAndroid.RESULTS.GRANTED
      } catch (err) {
        console.warn(err);
      }
    }

    const userId = 'user-' + Date.now() + Math.random().toString(36).substr(2, 9);
    const finalName = name.trim() || 'Anonymous';
    
    await meshEngine.init(finalName, userId);
    await meshEngine.startMesh();
    
    navigation.replace('Chat');
  };

  return (
    <View style={styles.container}>
      <View style={styles.brand}>
        <Text style={styles.icon}>〰️</Text>
        <Text style={styles.title}>Awaaz (आवाज़)</Text>
      </View>

      <Text style={styles.headline}>{t('welcome')}</Text>

      <View style={styles.languageContainer}>
        <TouchableOpacity style={styles.langBtn} onPress={() => i18n.changeLanguage('en')}>
          <Text style={styles.langText}>English</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.langBtn} onPress={() => i18n.changeLanguage('hi')}>
          <Text style={styles.langText}>हिंदी</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.input}
        placeholder={t('enter_name')}
        placeholderTextColor="#666"
        value={name}
        onChangeText={setName}
      />

      <TouchableOpacity style={styles.joinBtn} onPress={requestPermissionsAndJoin}>
        <Text style={styles.joinBtnText}>{t('join_mesh')}</Text>
      </TouchableOpacity>
      
      <Text style={styles.trustNote}>We never track your GPS location.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505', padding: 20, justifyContent: 'center' },
  brand: { alignItems: 'center', marginBottom: 40 },
  icon: { fontSize: 40 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  headline: { fontSize: 24, color: '#fff', textAlign: 'center', marginBottom: 40 },
  languageContainer: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 40 },
  langBtn: { padding: 10, borderWidth: 1, borderColor: '#333', borderRadius: 8 },
  langText: { color: '#fff' },
  input: { backgroundColor: '#111', color: '#fff', padding: 15, borderRadius: 12, marginBottom: 20, fontSize: 18 },
  joinBtn: { backgroundColor: '#ff3b30', padding: 20, borderRadius: 16, alignItems: 'center' },
  joinBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  trustNote: { color: '#666', textAlign: 'center', marginTop: 20, fontSize: 12 }
});
