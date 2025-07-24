import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, Modal, Animated, Easing, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';

const { height, width } = Dimensions.get('window');

const COLORS = {
  background: '#FFFFFF',
  primaryGreen: '#217A4B',
  darkText: '#1F2937',
  lightText: '#6B7280',
  cardBackground: '#FFFFFF',
  cardBorder: '#F3F4F6',
  white: '#FFFFFF',
  lightGray: '#E5E7EB',
  button: '#22C55E',
};

const FONTS = {
  title: 28,
  subtitle: 16,
  sectionTitle: 22,
  sectionSubtitle: 15,
  cardLabel: 16,
};

const featureCards = [
  { key: 'crop', icon: '🩺', label: 'Crop Doctor' },
  { key: 'weather', icon: '🌦️', label: 'Weather & Work' },
  { key: 'sell', icon: '📈', label: 'Sell or Hold?' },
  { key: 'subsidy', icon: '💰', label: 'My Subsidy' },
];

const FeatureCard = ({ icon, label, onPress }) => (
  <TouchableOpacity style={styles.featureCard} onPress={onPress} activeOpacity={0.8}>
    <Text style={styles.featureIcon}>{icon}</Text>
    <Text style={styles.featureLabel}>{label}</Text>
  </TouchableOpacity>
);

const modalContentMap = {
  care: {
    title: 'Care Guide',
    desc: 'Learn how to care for your plant: watering, soil, pruning, and more.'
  },
  light: {
    title: 'Light Needs',
    desc: 'Find out how much sunlight your plant needs for optimal growth.'
  },
  toxicity: {
    title: 'Pet Toxicity',
    desc: 'Is your plant safe for pets? Get toxicity info for cats and dogs.'
  },
  watering: {
    title: 'Watering',
    desc: 'How often and how much should you water your plant?'
  },
};

export default function PlantAILandingScreen() {
  const navigation = useNavigation();
  // --- Advanced modal state ---
  const [modalVisible, setModalVisible] = useState(null); // null or one of 'crop', 'weather', 'sell', 'subsidy', 'care', 'light', 'toxicity', 'watering'
  const modalAnim = useRef(new Animated.Value(height)).current;
  // Advanced modal states
  const [cropImage, setCropImage] = useState(null);
  const [cropError, setCropError] = useState('');
  const [cropResult, setCropResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState('');
  const [validation, setValidation] = useState({});

  useEffect(() => {
    if (modalVisible) {
      Animated.timing(modalAnim, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(modalAnim, {
        toValue: height,
        duration: 400,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }
  }, [modalVisible]);

  // --- Advanced modal logic (simplified, you can expand as needed) ---
  const openModal = (key) => {
    setOutput('');
    setValidation({});
    setLoading(false);
    setCropImage(null);
    setModalVisible(key);
  };
  const closeModal = () => setModalVisible(null);

  // --- Crop Doctor logic ---
  const pickCropImage = async () => {
    setCropError('');
    setCropResult(null);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setCropError('Permission to access media library is required!');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setCropImage(result.assets[0]);
      }
    } catch (err) {
      setCropError('Failed to pick image.');
    }
  };

  const takeCropPhoto = async () => {
    setCropError('');
    setCropResult(null);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        setCropError('Camera permission is required!');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.7,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setCropImage(result.assets[0]);
      }
    } catch (err) {
      setCropError('Failed to take photo.');
    }
  };

  const diagnoseCrop = async () => {
    setCropError('');
    setCropResult(null);
    if (!cropImage) {
      setCropError('Please select an image first.');
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('images', {
        uri: cropImage.uri,
        type: cropImage.type || 'image/jpeg',
        name: cropImage.fileName || 'crop.jpg',
      });
      // Debug: log all FormData keys and values
      for (let pair of formData.entries()) {
        console.log('FormData:', pair[0], pair[1]);
      }
      const url = 'http://192.168.1.13:3000/api/crop-doctor';
      console.log('FETCH URL:', url);
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }
      const data = await response.json();
      setCropResult(data.diagnosis);
    } catch (err) {
      setCropError('Failed to diagnose. Please try again.');
      Alert.alert('Network or Server Error', err.message || String(err));
      console.log('FETCH ERROR:', err);
    } finally {
      setLoading(false);
    }
  };

  // --- Render advanced modal content ---
  const renderModalContent = () => {
    switch (modalVisible) {
      case 'crop':
        return (
          <>
            <Text style={styles.modalTitle}>Crop Doctor 🩺</Text>
            <Text style={styles.modalDesc}>Upload a photo of the affected crop area for instant diagnosis.</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
              <TouchableOpacity style={styles.imagePickerButton} onPress={pickCropImage}>
                <Text style={styles.imagePickerText}>🖼️ Select Image</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.imagePickerButton} onPress={takeCropPhoto}>
                <Text style={styles.imagePickerText}>📷 Take Photo</Text>
              </TouchableOpacity>
            </View>
            {cropImage && (
              <View style={{ alignItems: 'center', marginVertical: 10 }}>
                <Image source={{ uri: cropImage.uri }} style={{ width: 120, height: 120, borderRadius: 16, borderWidth: 2, borderColor: COLORS.primaryGreen }} />
              </View>
            )}
            {cropError ? (
              <Text style={{ color: 'red', textAlign: 'center', marginBottom: 8 }}>{cropError}</Text>
            ) : null}
            {loading ? (
              <View style={{ alignItems: 'center', marginVertical: 12 }}>
                <Animated.View style={{ transform: [{ scale: modalAnim.interpolate({ inputRange: [0, height], outputRange: [1, 0.7] }) }] }}>
                  <Text style={{ fontSize: 36, color: COLORS.primaryGreen }}>⏳</Text>
                </Animated.View>
                <Text style={{ color: COLORS.primaryGreen, marginTop: 8 }}>Diagnosing...</Text>
              </View>
            ) : cropResult ? (
              <View style={{ backgroundColor: COLORS.lightGray, borderRadius: 16, padding: 16, marginVertical: 10, elevation: 2 }}>
                <Text style={{ fontWeight: 'bold', color: COLORS.primaryGreen, fontSize: 18, marginBottom: 6 }}>Diagnosis Result</Text>
                <Text style={{ color: COLORS.darkText, fontSize: 16 }}>{typeof cropResult === 'string' ? cropResult : JSON.stringify(cropResult)}</Text>
              </View>
            ) : null}
            <TouchableOpacity style={styles.modalSubmitButton} onPress={diagnoseCrop} disabled={loading}>
              <Text style={styles.modalSubmitButtonText}>{loading ? 'Diagnosing...' : 'Diagnose'}</Text>
            </TouchableOpacity>
          </>
        );
      case 'weather':
        return (
          <>
            <Text style={styles.modalTitle}>Weather & Work 🌦️</Text>
            <Text style={styles.modalDesc}>Get hyperlocal weather and actionable farm advice.</Text>
            <TouchableOpacity style={styles.modalSubmitButton}>
              <Text style={styles.modalSubmitButtonText}>Get Advice (mock)</Text>
            </TouchableOpacity>
          </>
        );
      case 'sell':
        return (
          <>
            <Text style={styles.modalTitle}>Sell or Hold? 📈</Text>
            <Text style={styles.modalDesc}>Get a data-backed recommendation for your local market.</Text>
            <TouchableOpacity style={styles.modalSubmitButton}>
              <Text style={styles.modalSubmitButtonText}>Get Recommendation (mock)</Text>
            </TouchableOpacity>
          </>
        );
      case 'subsidy':
        return (
          <>
            <Text style={styles.modalTitle}>My Subsidy Finder 💰</Text>
            <Text style={styles.modalDesc}>Find government schemes you are eligible for.</Text>
            <TouchableOpacity style={styles.modalSubmitButton}>
              <Text style={styles.modalSubmitButtonText}>Find Subsidies (mock)</Text>
            </TouchableOpacity>
          </>
        );
      case 'care':
      case 'light':
      case 'toxicity':
      case 'watering': {
        const content = modalContentMap[modalVisible];
        return (
          <>
            <Text style={styles.modalTitle}>{content.title}</Text>
            <Text style={styles.modalDesc}>{content.desc}</Text>
          </>
        );
      }
      default:
        return null;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      {/* Top bar with Home button */}
      <View style={styles.topBar}>
        <View style={{ flex: 1 }} />
        <TouchableOpacity style={styles.homeButton} onPress={() => navigation.navigate('Home')}>
          <Text style={{ fontSize: 26 }}>🏠</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.container}>
        {/* Logo */}
        <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
        {/* Title & Subtitle */}
        <Text style={styles.mainTitle}>Plant AI Assistant</Text>
        <Text style={styles.subtitle}>Ask me anything about Mentha-Mint or any other plants!</Text>
        {/* Start Chatting Button */}
        <TouchableOpacity style={styles.startChatButton} onPress={() => navigation.navigate('ChatInterfaceScreen')}>
          <Text style={styles.startChatIcon}>💬</Text>
          <Text style={styles.startChatText}>Start chatting</Text>
        </TouchableOpacity>
        {/* --- Feature Cards Section --- */}
        <View style={styles.featureCardsGrid}>
          <View style={styles.featureRow}>
            <FeatureCard icon={featureCards[0].icon} label={featureCards[0].label} onPress={() => openModal('crop')} />
            <FeatureCard icon={featureCards[1].icon} label={featureCards[1].label} onPress={() => openModal('weather')} />
          </View>
          <View style={styles.featureRow}>
            <FeatureCard icon={featureCards[2].icon} label={featureCards[2].label} onPress={() => openModal('sell')} />
            <FeatureCard icon={featureCards[3].icon} label={featureCards[3].label} onPress={() => openModal('subsidy')} />
          </View>
        </View>
      </View>
      {/* Modal */}
      <Modal visible={!!modalVisible} animationType="fade" transparent={true} onRequestClose={closeModal}>
        <View style={styles.modalBackdrop}>
          <Animated.View style={[styles.modalContent, { transform: [{ translateY: modalAnim }] }]}>  
            {renderModalContent()}
            <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 78, // Increased from 18 to 38 to bring the home button further down
    paddingHorizontal: 28,
    height: 120,
    backgroundColor: COLORS.background,
  },
  homeButton: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    elevation: 2,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  logo: {
    width: 120,
    height: 120,
    marginTop: 10,
    marginBottom: 18,
  },
  mainTitle: {
    fontSize: FONTS.title,
    fontWeight: 'bold',
    color: COLORS.primaryGreen,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: FONTS.subtitle,
    color: COLORS.lightText,
    textAlign: 'center',
    marginBottom: 22,
  },
  startChatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.button,
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginBottom: 30,
    elevation: 2,
  },
  startChatIcon: {
    fontSize: 22,
    marginRight: 8,
    color: COLORS.white,
  },
  startChatText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionHeader: {
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: FONTS.sectionTitle,
    fontWeight: 'bold',
    color: COLORS.darkText,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: FONTS.sectionSubtitle,
    color: COLORS.lightText,
    marginBottom: 10,
  },
  questionsGrid: {
    width: '100%',
    marginTop: 8,
  },
  questionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  questionCard: {
    width: (width - 60) / 2,
    height: 110,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    elevation: 2,
  },
  questionIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  questionLabel: {
    fontSize: FONTS.cardLabel,
    fontWeight: '600',
    color: COLORS.darkText,
    textAlign: 'center',
  },
  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
    minHeight: 220,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.primaryGreen,
    textAlign: 'center',
    marginBottom: 10,
  },
  modalDesc: {
    fontSize: 16,
    color: COLORS.darkText,
    textAlign: 'center',
    marginBottom: 24,
  },
  closeButton: {
    width: '100%',
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  closeButtonText: {
    color: COLORS.darkText,
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Add styles for feature cards
  featureCardsGrid: {
    width: '100%',
    marginTop: 8,
    marginBottom: 18,
  },
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  featureCard: {
    width: (width - 60) / 2,
    height: 120,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    elevation: 3,
  },
  featureIcon: {
    fontSize: 44,
    marginBottom: 10,
  },
  featureLabel: {
    fontSize: FONTS.cardLabel,
    fontWeight: '700',
    color: COLORS.primaryGreen,
    textAlign: 'center',
  },
  imagePickerButton: {
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  imagePickerText: {
    color: COLORS.darkText,
    fontSize: 16,
    fontWeight: '600',
  },
  modalSubmitButton: {
    backgroundColor: COLORS.primaryGreen,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginTop: 10,
  },
  modalSubmitButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
});