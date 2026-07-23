import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, PermissionsAndroid, Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { meshEngine } from '../MeshEngine';

export default function Onboarding({ navigation }) {
  const { t, i18n } = useTranslation();
  const [name, setName] = useState('');

  useEffect(() => {
    const checkExisting = async () => {
      try {
        const existingId = await AsyncStorage.getItem('@user_id');
        if (existingId) {
          const existingName = await AsyncStorage.getItem('@user_name') || 'Anonymous';
          await meshEngine.init(existingName, existingId);
          await meshEngine.startMesh();
          navigation.replace('Chat');
        }
      } catch (e) {
        console.warn(e);
      }
    };
    checkExisting();
  }, [navigation]);

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
        
        // If Android 12+, we need CONNECT. If Android <12, we need FINE_LOCATION.
        // We will just do a loose check if any permission was denied heavily.
        if (
          granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.DENIED ||
          granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.DENIED
        ) {
          Alert.alert('Permissions Required', 'Awaaz cannot function without Bluetooth and Location permissions.');
          return;
        }
      } catch (err) {
        console.warn(err);
        return;
      }
    }

    let userId = await AsyncStorage.getItem('@user_id');
    if (!userId) {
      userId = 'user-' + Date.now() + Math.random().toString(36).substr(2, 9);
      await AsyncStorage.setItem('@user_id', userId);
    }
    
    const finalName = name.trim() || 'Anonymous';
    await AsyncStorage.setItem('@user_name', finalName);
    
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
        <TouchableOpacity style={styles.langBtn} onPress={() => i18n.changeLanguage('en')}><Text style={styles.langText}>Eng</Text></TouchableOpacity>
        <TouchableOpacity style={styles.langBtn} onPress={() => i18n.changeLanguage('hi')}><Text style={styles.langText}>हिंदी</Text></TouchableOpacity>
        <TouchableOpacity style={styles.langBtn} onPress={() => i18n.changeLanguage('bn')}><Text style={styles.langText}>বাংলা</Text></TouchableOpacity>
        <TouchableOpacity style={styles.langBtn} onPress={() => i18n.changeLanguage('te')}><Text style={styles.langText}>తెలుగు</Text></TouchableOpacity>
        <TouchableOpacity style={styles.langBtn} onPress={() => i18n.changeLanguage('mr')}><Text style={styles.langText}>मराठी</Text></TouchableOpacity>
        <TouchableOpacity style={styles.langBtn} onPress={() => i18n.changeLanguage('ta')}><Text style={styles.langText}>தமிழ்</Text></TouchableOpacity>
        <TouchableOpacity style={styles.langBtn} onPress={() => i18n.changeLanguage('gu')}><Text style={styles.langText}>ગુજરાતી</Text></TouchableOpacity>
        <TouchableOpacity style={styles.langBtn} onPress={() => i18n.changeLanguage('kn')}><Text style={styles.langText}>ಕನ್ನಡ</Text></TouchableOpacity>
        <TouchableOpacity style={styles.langBtn} onPress={() => i18n.changeLanguage('ml')}><Text style={styles.langText}>മലയാളം</Text></TouchableOpacity>
      </View>

      <TextInput
        style={styles.input}
        placeholder={t('enter_name')}
        placeholderTextColor="#666"
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.legalDisclaimer}>
        Disclaimer: By tapping Join Mesh, you agree that Awaaz is an open peer-to-peer network. You are solely responsible for your communications and agree not to use this network to facilitate unlawful assembly, violence, or any illegal activities.
      </Text>

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
  languageContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginBottom: 40 },
  langBtn: { padding: 10, borderWidth: 1, borderColor: '#333', borderRadius: 8 },
  langText: { color: '#fff' },
  input: { backgroundColor: '#111', color: '#fff', padding: 15, borderRadius: 12, marginBottom: 20, fontSize: 18 },
  joinBtn: { backgroundColor: '#ff3b30', padding: 20, borderRadius: 16, alignItems: 'center' },
  joinBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  legalDisclaimer: { color: '#888', fontSize: 11, textAlign: 'center', marginBottom: 20, lineHeight: 16 },
  trustNote: { color: '#666', textAlign: 'center', marginTop: 20, fontSize: 12 }
});
