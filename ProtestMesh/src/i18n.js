import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// In a full production app, these would be in separate JSON files.
const resources = {
  en: {
    translation: {
      welcome: "Connect when the world goes dark.",
      grant_permissions: "Grant Permissions to Connect Offline",
      enter_name: "Enter Display Name",
      join_mesh: "Join Offline Mesh",
      sos: "SOS",
      type_message: "Type a message...",
      offline_status: "Offline Mesh Active",
      connected_peers: "Peers Nearby: "
    }
  },
  hi: {
    translation: {
      welcome: "जब दुनिया में अंधेरा छा जाए, तब जुड़ें।",
      grant_permissions: "ऑफ़लाइन जुड़ने के लिए अनुमति दें",
      enter_name: "अपना नाम दर्ज करें",
      join_mesh: "ऑफ़लाइन मेश से जुड़ें",
      sos: "आपातकाल (SOS)",
      type_message: "संदेश लिखें...",
      offline_status: "ऑफ़लाइन मेश सक्रिय",
      connected_peers: "आसपास के लोग: "
    }
  }
  // Bengali, Telugu, Marathi, Tamil, Urdu, Gujarati, Kannada, Malayalam would follow here.
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // default
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false 
    }
  });

export default i18n;
