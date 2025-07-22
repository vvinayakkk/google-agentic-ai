import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  Animated,
  Easing,
  ActivityIndicator, // Added for loading indicator
  Image, // Added for displaying images
} from 'react-native';
import { ChevronLeft, ChevronDown, Calendar, MapPin, Droplets, Egg } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';

const API_BASE = 'http://192.168.0.111:8000';
const FARMER_ID = 'f001';
const LIVESTOCK_CACHE_KEY = 'livestock-cache';
const CALENDAR_CACHE_KEY = 'cattle-calendar-cache';
const SPACE_SUGGESTIONS_CACHE_KEY = 'space-suggestions-cache';

const CattleScreen = ({ navigation }) => {
  const [expandedCard, setExpandedCard] = useState(null);
  const [cattleData, setCattleData] = useState([]);
  const [calendarUpdates, setCalendarUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Add state for animal modals and mic
  const [animalModalVisible, setAnimalModalVisible] = useState(false);
  const [animalModalMode, setAnimalModalMode] = useState('add');
  // Default values for new animal, ensuring all expected fields are present
  const [animalModalAnimal, setAnimalModalAnimal] = useState({
    name: '',
    breed: '',
    age: '',
    type: '',
    icon: '🐄', // Default icon
    color: '#10B981', // Default color
    health: 'Good',
    lastCheckup: '',
    milkCapacity: '',
    eggCapacity: ''
  });
  const [animalModalLoading, setAnimalModalLoading] = useState(false);
  const [animalAddOptionSheet, setAnimalAddOptionSheet] = useState(false);
  const [animalMicModal, setAnimalMicModal] = useState(false);
  const animalMicAnim = useRef(new Animated.Value(1)).current;

  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [lastSpaceImage, setLastSpaceImage] = useState(null);
  const [spaceSuggestions, setSpaceSuggestions] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null); // Only one image

  const suggestions = [
    'Bella needs more pasture space - consider rotation',
    'Chicken coop humidity levels need monitoring',
    'Billy shows signs of nutritional needs - supplement recommended'
  ];

  const { t } = useTranslation();

  // Function to fetch and cache data
  const fetchCattleData = async () => {
    setLoading(true);
    setError(null);

    // Try to load from cache first for immediate display
    try {
      const cachedLivestock = await AsyncStorage.getItem(LIVESTOCK_CACHE_KEY);
      const cachedCalendar = await AsyncStorage.getItem(CALENDAR_CACHE_KEY);

      if (cachedLivestock) {
        setCattleData(JSON.parse(cachedLivestock));
      }
      if (cachedCalendar) {
        setCalendarUpdates(JSON.parse(cachedCalendar));
      }

      // If data was found in cache, set loading to false temporarily
      // We will re-set it to true for the background fetch
      if (cachedLivestock || cachedCalendar) {
        setLoading(false);
      }
    } catch (e) {
      console.error("Failed to load data from cache:", e);
    }

    // Always fetch from backend in background to ensure data is fresh
    try {
      const [livestockResponse, calendarResponse] = await Promise.all([
        fetch(`${API_BASE}/farmer/${FARMER_ID}/livestock`),
        fetch(`${API_BASE}/farmer/${FARMER_ID}/calendar`)
      ]);

      if (!livestockResponse.ok || !calendarResponse.ok) {
        throw new Error('Network response was not ok');
      }

      const livestock = await livestockResponse.json();
      const calendar = await calendarResponse.json();

      setCattleData(livestock);
      setCalendarUpdates(calendar.filter(e => e.type === 'livestock'));

      // Cache the fresh data
      await AsyncStorage.setItem(LIVESTOCK_CACHE_KEY, JSON.stringify(livestock));
      await AsyncStorage.setItem(CALENDAR_CACHE_KEY, JSON.stringify(calendar.filter(e => e.type === 'livestock')));

    } catch (err) {
      console.error("Failed to fetch data from backend:", err);
      setError('Failed to load data. Please check your network connection.');
    } finally {
      setLoading(false);
    }
  };

  const fetchLastSpaceImage = async () => {
    try {
      const response = await fetch(`${API_BASE}/farmer/${FARMER_ID}`);
      if (!response.ok) return;
      const data = await response.json();
      // Find the latest spaceImage field
      const imageField = Object.keys(data).filter(k => k.startsWith('spaceImage_')).sort().reverse()[0];
      if (imageField && data[imageField]) {
        setLastSpaceImage(`data:image/jpeg;base64,${data[imageField]}`);
      } else {
        setLastSpaceImage(null);
      }
    } catch (e) {
      setLastSpaceImage(null);
    }
  };

  const fetchSpaceSuggestions = async () => {
    try {
      const response = await fetch(`${API_BASE}/farmer/${FARMER_ID}`);
      if (!response.ok) return;
      const data = await response.json();
      if (Array.isArray(data.spaceSuggestions)) {
        setSpaceSuggestions(data.spaceSuggestions);
        await AsyncStorage.setItem(SPACE_SUGGESTIONS_CACHE_KEY, JSON.stringify(data.spaceSuggestions));
      } else {
        setSpaceSuggestions([]);
        await AsyncStorage.removeItem(SPACE_SUGGESTIONS_CACHE_KEY);
      }
    } catch (e) {
      // On error, try to load from cache
      const cached = await AsyncStorage.getItem(SPACE_SUGGESTIONS_CACHE_KEY);
      if (cached) {
        setSpaceSuggestions(JSON.parse(cached));
      } else {
        setSpaceSuggestions([]);
      }
    }
  };

  const loadCachedSuggestions = async () => {
    const cached = await AsyncStorage.getItem(SPACE_SUGGESTIONS_CACHE_KEY);
    if (cached) {
      setSpaceSuggestions(JSON.parse(cached));
    } else {
      setSpaceSuggestions([]);
    }
  };

  useEffect(() => {
    loadCachedSuggestions(); // Show cached suggestions instantly
    fetchCattleData();
    fetchLastSpaceImage();
    fetchSpaceSuggestions(); // Update in background
  }, []);

  // Mic animation effect
  useEffect(() => {
    let timer;
    if (animalMicModal) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(animalMicAnim, { toValue: 1.2, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(animalMicAnim, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ).start();
      timer = setTimeout(() => {
        setAnimalMicModal(false);
        setAnimalModalMode('add');
        // Pre-fill for demonstration purposes after "mic input"
        setAnimalModalAnimal({
          name: 'Bella',
          breed: 'Jersey',
          age: '3',
          type: 'cow',
          icon: '🐄',
          color: '#10B981',
          health: 'Excellent',
          lastCheckup: '2024-06-01',
          milkCapacity: '12L/day',
          eggCapacity: ''
        });
        setAnimalModalVisible(true);
      }, 5000); // Simulate 5 seconds of listening
    } else {
      animalMicAnim.setValue(1); // Reset animation scale
      if (timer) clearTimeout(timer); // Clear timeout if modal is closed prematurely
    }
    return () => {
      if (timer) clearTimeout(timer);
      animalMicAnim.stopAnimation(); // Stop ongoing animation loop
    };
  }, [animalMicModal]);

  // Add animal handlers
  const openAddAnimalModal = () => setAnimalAddOptionSheet(true);

  const handleManualAddAnimal = () => {
    setAnimalAddOptionSheet(false);
    setAnimalModalMode('add');
    setAnimalModalAnimal({ // Reset to default empty values for new animal
      name: '',
      breed: '',
      age: '',
      type: '',
      icon: '🐄',
      color: '#10B981',
      health: 'Good',
      lastCheckup: '',
      milkCapacity: '',
      eggCapacity: ''
    });
    setAnimalModalVisible(true);
  };

  const handleSpeakAddAnimal = () => {
    setAnimalAddOptionSheet(false);
    setAnimalMicModal(true);
  };

  const openEditAnimalModal = (animal) => {
    setAnimalModalMode('edit');
    setAnimalModalAnimal({ ...animal }); // Populate modal with existing animal data
    setAnimalModalVisible(true);
  };

  const handleDeleteAnimal = (animal) => {
    Alert.alert('Delete Animal', `Are you sure you want to delete "${animal.name}"? This action cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setAnimalModalLoading(true); // Indicate loading for deletion
          const originalCattleData = [...cattleData]; // Store for rollback

          // Optimistically update UI
          const newAnimals = cattleData.filter(a => a.id !== animal.id);
          setCattleData(newAnimals);
          await AsyncStorage.setItem(LIVESTOCK_CACHE_KEY, JSON.stringify(newAnimals));

          try {
            const response = await fetch(`${API_BASE}/farmer/${FARMER_ID}/livestock/${animal.id}`, { method: 'DELETE' });
            if (!response.ok) {
              throw new Error('Failed to delete animal on server.');
            }
            Alert.alert('Success', `${animal.name} deleted successfully.`);
          } catch (err) {
            Alert.alert('Error', err.message || 'Failed to delete animal on server. Restoring data.');
            // Rollback UI if delete failed on server
            setCattleData(originalCattleData);
            await AsyncStorage.setItem(LIVESTOCK_CACHE_KEY, JSON.stringify(originalCattleData));
          } finally {
            setAnimalModalLoading(false);
          }
        }
      }
    ]);
  };

  const handleAnimalModalSave = async () => {
    if (!animalModalAnimal.name || !animalModalAnimal.breed || !animalModalAnimal.type) {
      Alert.alert('Missing Info', 'Please fill all required fields (Name, Breed, Type).');
      return;
    }
    setAnimalModalLoading(true);

    const method = animalModalMode === 'add' ? 'POST' : 'PUT';
    const url = animalModalMode === 'add'
      ? `${API_BASE}/farmer/${FARMER_ID}/livestock`
      : `${API_BASE}/farmer/${FARMER_ID}/livestock/${animalModalAnimal.id}`;

    const animalToSave = {
      ...animalModalAnimal,
      // Ensure ID exists for PUT, generate for POST if not from mic input
      id: animalModalAnimal.id || `an_${Date.now()}` // Simple unique ID for new entries
    };

    let newAnimals;
    const originalCattleData = [...cattleData]; // For rollback

    if (animalModalMode === 'add') {
      newAnimals = [animalToSave, ...cattleData];
    } else {
      newAnimals = cattleData.map(a => a.id === animalToSave.id ? animalToSave : a);
    }

    // Optimistically update UI
    setCattleData(newAnimals);
    await AsyncStorage.setItem(LIVESTOCK_CACHE_KEY, JSON.stringify(newAnimals));
    setAnimalModalVisible(false); // Close modal immediately for better UX

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(animalToSave)
      });

      if (!response.ok) {
        throw new Error(`Failed to ${animalModalMode === 'add' ? 'add' : 'update'} animal on server.`);
      }

      // If backend returns the saved object with potentially a real ID, update it
      const savedAnimal = await response.json();
      if (animalModalMode === 'add' && savedAnimal.id && savedAnimal.id !== animalToSave.id) {
        // Replace the temp ID with the backend-generated ID
        const updatedCattleData = newAnimals.map(a => a.id === animalToSave.id ? savedAnimal : a);
        setCattleData(updatedCattleData);
        await AsyncStorage.setItem(LIVESTOCK_CACHE_KEY, JSON.stringify(updatedCattleData));
      } else if (animalModalMode === 'edit') {
        // Ensure UI reflects exactly what was saved by backend (if any subtle changes)
        const updatedCattleData = newAnimals.map(a => a.id === animalToSave.id ? savedAnimal : a);
        setCattleData(updatedCattleData);
        await AsyncStorage.setItem(LIVESTOCK_CACHE_KEY, JSON.stringify(updatedCattleData));
      }

      Alert.alert('Success', `Animal ${animalModalMode === 'add' ? 'added' : 'updated'} successfully.`);

    } catch (err) {
      Alert.alert('Error', err.message || `Failed to ${animalModalMode === 'add' ? 'add' : 'update'} animal on server. Restoring data.`);
      // Rollback UI if save failed on server
      setCattleData(originalCattleData);
      await AsyncStorage.setItem(LIVESTOCK_CACHE_KEY, JSON.stringify(originalCattleData));
    } finally {
      setAnimalModalLoading(false);
    }
  };

  const toggleCard = (id) => {
    setExpandedCard(expandedCard === id ? null : id);
  };

  const renderAnimalCard = (animal) => {
    const isExpanded = expandedCard === animal.id;

    return (
      <TouchableOpacity
        key={animal.id}
        style={[styles.animalCard, { borderLeftColor: animal.color }]}
        onPress={() => toggleCard(animal.id)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.animalInfo}>
            <Text style={styles.animalIcon}>{animal.icon}</Text>
            <View style={styles.animalDetails}>
              <Text style={styles.animalName}>{animal.name}</Text>
              <Text style={styles.animalBreed}>{animal.breed}</Text>
            </View>
          </View>
          <View style={styles.cardActions}>
            <TouchableOpacity onPress={() => openEditAnimalModal(animal)} style={styles.actionButton}>
              <Ionicons name="create-outline" size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDeleteAnimal(animal)} style={[styles.actionButton, { backgroundColor: '#EF4444' }]}>
              <Ionicons name="trash-outline" size={18} color="#fff" />
            </TouchableOpacity>
            <ChevronDown
              color="#64748B"
              size={20}
              style={[styles.chevronIcon, { transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }]}
            />
          </View>
        </View>

        {isExpanded && (
          <View style={styles.expandedContent}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Age:</Text>
              <Text style={styles.detailValue}>{animal.age || 'N/A'}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Health:</Text>
              <Text style={[
                styles.detailValue,
                {
                  color: animal.health === 'Excellent' ? '#10B981' :
                    animal.health === 'Good' ? '#F59E0B' : '#EF4444'
                }
              ]}>
                {animal.health || 'Unknown'}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Last Checkup:</Text>
              <Text style={styles.detailValue}>{animal.lastCheckup || 'N/A'}</Text>
            </View>

            {(animal.type && (animal.type.toLowerCase() === 'cow' || animal.type.toLowerCase() === 'goat')) && (
              <View style={styles.capacityRow}>
                <Droplets color="#3B82F6" size={16} />
                <Text style={styles.capacityText}>Milk: {animal.milkCapacity || 'N/A'}</Text>
              </View>
            )}
            {(animal.type && animal.type.toLowerCase() === 'chicken') && (
              <View style={styles.capacityRow}>
                <Egg color="#F59E0B" size={16} />
                <Text style={styles.capacityText}>Eggs: {animal.eggCapacity || 'N/A'}</Text>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const handleAddImagePress = () => {
    setSelectedImage(null);
    setImageModalVisible(true);
  };

  const handleImagePick = async (fromCamera) => {
    // setImageModalVisible(false); // Do not close modal here
    let image = null;
    if (fromCamera) {
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7, base64: true });
      if (!result.cancelled) {
        const imageBase64 = result.base64 || (result.assets && result.assets[0] && result.assets[0].base64);
        const uri = result.uri || (result.assets && result.assets[0] && result.assets[0].uri);
        if (imageBase64 && uri) {
          image = { uri, base64: imageBase64 };
        }
      }
    } else {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7, base64: true });
      if (!result.cancelled) {
        const imageBase64 = result.base64 || (result.assets && result.assets[0] && result.assets[0].base64);
        const uri = result.uri || (result.assets && result.assets[0] && result.assets[0].uri);
        if (imageBase64 && uri) {
          image = { uri, base64: imageBase64 };
        }
      }
    }
    setSelectedImage(image);
  };

  const handleSubmitImage = async () => {
    if (!selectedImage) {
      Alert.alert('No image selected!');
      return;
    }
    setImageLoading(true);
    try {
      const payload = {
        image: selectedImage.base64,
        animals: cattleData,
        calendar: calendarUpdates
      };
      const response = await fetch(`${API_BASE}/farmer/${FARMER_ID}/space-suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('Failed to get suggestions');
      const data = await response.json();
      if (data.suggestions) {
        setSpaceSuggestions(data.suggestions);
        await AsyncStorage.setItem(SPACE_SUGGESTIONS_CACHE_KEY, JSON.stringify(data.suggestions));
      }
      await fetchLastSpaceImage();
      Alert.alert('Success', 'Space suggestions updated!');
      setSelectedImage(null);
      setImageModalVisible(false); // Close modal after submit
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to analyze image.');
    } finally {
      setImageLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ChevronLeft color="#FFFFFF" size={24} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{t('cattle.title')}</Text>
          <Text style={styles.headerSubtitle}>{t('cattle.suggestions')}</Text>
        </View>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      {loading && cattleData.length === 0 ? ( // Show full loading screen only if no cached data
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>{t('cattle.loading')}</Text>
        </View>
      ) : error ? ( // Show error if fetching failed and no data in cache
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{t('cattle.error')}</Text>
          <TouchableOpacity onPress={fetchCattleData} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>{t('common.refresh')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Animals Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('cattle.title')} ({cattleData.length})</Text>
            {cattleData.map(renderAnimalCard)}
            {cattleData.length === 0 && !loading && ( // Message if no animals and not loading
                <Text style={styles.noDataText}>{t('cattle.no_animals')}</Text>
            )}
          </View>

          {/* Calendar Updates */}
          <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('CalenderScreen')}>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Calendar color="#10B981" size={20} />
                <Text style={styles.sectionTitle}>{t('calendar.title')}</Text>
              </View>
              {calendarUpdates.length > 0 ? (
                calendarUpdates.map((update, idx) => (
                  <View key={idx} style={styles.updateCard}>
                    <View style={styles.updateHeader}>
                      <Text style={styles.updateTitle}>{update.task}</Text>
                      <View style={[styles.priorityBadge, { backgroundColor: update.priority === 'high' ? '#EF4444' : update.priority === 'medium' ? '#F59E0B' : '#10B981' }]}>
                        <Text style={styles.priorityText}>{update.priority?.toUpperCase()}</Text>
                      </View>
                    </View>
                    <Text style={styles.updateDate}>{update.date}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.noDataText}>{t('calendar.no_events')}</Text>
              )}
            </View>
          </TouchableOpacity>

          {/* Suggestions */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MapPin color="#8B5CF6" size={20} />
              <Text style={styles.sectionTitle}>{t('cattle.space_suggestion')}</Text>
            </View>
            <View style={{ marginBottom: 10, marginLeft: 2 }}>
              <Text style={styles.helperText}>{t('cattle.suggestions')}</Text>
            </View>
            <TouchableOpacity onPress={handleAddImagePress} style={styles.addFieldPhotoButton} activeOpacity={0.85}>
              <Ionicons name="camera" size={24} color="#fff" style={{ marginRight: 10 }} />
              <Text style={styles.addFieldPhotoButtonText}>{t('cattle.add_image')}</Text>
            </TouchableOpacity>
            <View style={{ position: 'relative' }}>
              {imageLoading && (
                <View style={styles.suggestionLoadingOverlay}>
                  <ActivityIndicator size="large" color="#10B981" />
                  <Text style={styles.loadingText}>{t('cattle.image_loading')}</Text>
                </View>
              )}
              {spaceSuggestions.length > 0 ? (
                spaceSuggestions.map((suggestion, index) => (
                  <View key={index} style={styles.suggestionCard}>
                    <View style={styles.suggestionDot} />
                    <Text style={styles.suggestionText}>{suggestion}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.noDataText}>No space suggestions at the moment.</Text>
              )}
              {lastSpaceImage && (
                <View style={{ alignItems: 'center', marginTop: 16 }}>
                  <Text style={{ color: '#94A3B8', marginBottom: 8 }}>{t('cattle.upload_image')}</Text>
                  <Image source={{ uri: lastSpaceImage }} style={{ width: 220, height: 140, borderRadius: 12, borderWidth: 2, borderColor: '#10B981' }} resizeMode="cover" />
                </View>
              )}
            </View>
          </View>
          <View style={{ height: 100 }} />{/* Spacer for floating button */}
        </ScrollView>
      )}

      {/* Floating + Add Animal Button */}
      <View style={{ position: 'absolute', bottom: 32, right: 32, zIndex: 100 }}>
        <TouchableOpacity onPress={openAddAnimalModal} style={styles.fabButton}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Animal Add Option Sheet */}
      <Modal visible={animalAddOptionSheet} transparent animationType="fade" onRequestClose={() => setAnimalAddOptionSheet(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.optionSheetContainer}>
            <Text style={styles.optionSheetTitle}>{t('cattle.add_animal')}</Text>
            <TouchableOpacity style={styles.optionButton} onPress={handleManualAddAnimal}>
              <Text style={styles.optionButtonText}>{t('calendar.type_manually')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.optionButton, { backgroundColor: '#3B82F6' }]} onPress={handleSpeakAddAnimal}>
              <Text style={styles.optionButtonText}>{t('calendar.speak_ai_extract')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelOptionButton} onPress={() => setAnimalAddOptionSheet(false)}>
              <Text style={styles.cancelOptionButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Animal Add/Edit Modal */}
      <Modal visible={animalModalVisible} animationType="slide" transparent onRequestClose={() => setAnimalModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.animalModalContainer}>
            <Text style={styles.animalModalTitle}>{animalModalMode === 'add' ? t('cattle.add_animal') : t('cattle.edit_animal')}</Text>
            <ScrollView style={styles.animalModalScrollView}>
              <TextInput style={styles.input} placeholder={t('cattle.animal_name')} placeholderTextColor="#64748B" value={animalModalAnimal.name} onChangeText={v => setAnimalModalAnimal({ ...animalModalAnimal, name: v })} />
              <TextInput style={styles.input} placeholder={t('cattle.animal_breed')} placeholderTextColor="#64748B" value={animalModalAnimal.breed} onChangeText={v => setAnimalModalAnimal({ ...animalModalAnimal, breed: v })} />
              <TextInput style={styles.input} placeholder={t('cattle.animal_age')} placeholderTextColor="#64748B" value={animalModalAnimal.age} onChangeText={v => setAnimalModalAnimal({ ...animalModalAnimal, age: v })} keyboardType="default" />
              <TextInput style={styles.input} placeholder={t('cattle.animal_type')} placeholderTextColor="#64748B" value={animalModalAnimal.type} onChangeText={v => setAnimalModalAnimal({ ...animalModalAnimal, type: v })} autoCapitalize="none" />
              <TextInput style={styles.input} placeholder={t('cattle.animal_health')} placeholderTextColor="#64748B" value={animalModalAnimal.health} onChangeText={v => setAnimalModalAnimal({ ...animalModalAnimal, health: v })} />
              <TextInput style={styles.input} placeholder={t('cattle.animal_last_checkup')} placeholderTextColor="#64748B" value={animalModalAnimal.lastCheckup} onChangeText={v => setAnimalModalAnimal({ ...animalModalAnimal, lastCheckup: v })} />
              <TextInput style={styles.input} placeholder={t('cattle.animal_milk_capacity')} placeholderTextColor="#64748B" value={animalModalAnimal.milkCapacity} onChangeText={v => setAnimalModalAnimal({ ...animalModalAnimal, milkCapacity: v })} />
              <TextInput style={styles.input} placeholder={t('cattle.animal_egg_capacity')} placeholderTextColor="#64748B" value={animalModalAnimal.eggCapacity} onChangeText={v => setAnimalModalAnimal({ ...animalModalAnimal, eggCapacity: v })} />
            </ScrollView>
            <View style={styles.animalModalButtons}>
              <TouchableOpacity style={styles.animalModalCancelButton} onPress={() => setAnimalModalVisible(false)}>
                <Text style={styles.animalModalButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.animalModalSaveButton} onPress={handleAnimalModalSave} disabled={animalModalLoading}>
                {animalModalLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.animalModalButtonText}>{t('common.save')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Mic Modal for Animal */}
      <Modal visible={animalMicModal} transparent animationType="fade" onRequestClose={() => setAnimalMicModal(false)}>
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.micButtonAnimated, { transform: [{ scale: animalMicAnim }] }]}>
            <Text style={styles.micIcon}>🎤</Text>
          </Animated.View>
          <Text style={styles.micListeningText}>{t('calendar.listening')}</Text>
          <TouchableOpacity onPress={() => setAnimalMicModal(false)} style={styles.micCancelButton}>
            <Text style={styles.micCancelButtonText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Image Add Modal */}
      <Modal visible={imageModalVisible} transparent animationType="fade" onRequestClose={() => setImageModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.optionSheetContainer, { maxHeight: '80%', paddingBottom: 0 }]}> {/* Limit height for scrollability */}
            <Text style={styles.optionSheetTitle}>{t('cattle.add_image')}</Text>
            <TouchableOpacity style={styles.optionButton} onPress={() => handleImagePick(true)}>
              <Text style={styles.optionButtonText}>{t('cropdoctor.take_photo')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.optionButton, { backgroundColor: '#3B82F6' }]} onPress={() => handleImagePick(false)}>
              <Text style={styles.optionButtonText}>{t('cropdoctor.pick_image')}</Text>
            </TouchableOpacity>
            {selectedImage && (
              <View style={styles.imagePreviewContainer}>
                <Text style={{ color: '#94A3B8', marginBottom: 6 }}>Selected Image:</Text>
                <Image source={{ uri: selectedImage.uri }} style={styles.imagePreview} />
              </View>
            )}
            <View style={styles.modalFooter}>
              <TouchableOpacity style={[styles.optionButton, { backgroundColor: '#10B981', marginTop: 0 }]} onPress={handleSubmitImage}>
                <Text style={styles.optionButtonText}>{t('cattle.upload_image')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelOptionButton} onPress={() => setImageModalVisible(false)}>
                <Text style={styles.cancelOptionButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {imageLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>Analyzing image and updating suggestions...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000', // Changed to pure black
    paddingTop: StatusBar.currentHeight, // Ensure content is below status bar
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#000', // Changed to pure black
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
    marginLeft: 16,
    alignItems: 'center', // Center title and subtitle
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.2)', // Light green background
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981', // Green dot
    marginRight: 6,
  },
  liveText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#10B981', // Green text
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  animalCard: {
    backgroundColor: '#1E293B', // Darker blue-grey
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 5, // Thicker border on left
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  animalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1, // Allows animal info to take available space
  },
  animalIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  animalDetails: {
    flex: 1,
  },
  animalName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  animalBreed: {
    fontSize: 14,
    color: '#94A3B8', // Lighter grey for subtitle
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    // No specific marginLeft here, let internal button margins handle spacing
  },
  actionButton: {
    backgroundColor: '#3B82F6', // Blue for edit
    borderRadius: 8,
    padding: 6,
    marginLeft: 8, // Spacing between buttons and chevron
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronIcon: {
    marginLeft: 8, // Spacing between last button and chevron
  },
  expandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#2D3748', // Divider color
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 14,
    color: '#CBD5E1', // Light grey
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  capacityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 10,
    backgroundColor: '#2D3748', // Darker background for capacities
    borderRadius: 8,
  },
  capacityText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  updateCard: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.20,
    shadowRadius: 1.41,
    elevation: 2,
  },
  updateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  updateTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
    flex: 1,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 15,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  updateDate: {
    fontSize: 12,
    color: '#94A3B8',
  },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start', // Align dot and text at the top
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.20,
    shadowRadius: 1.41,
    elevation: 2,
  },
  suggestionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#8B5CF6', // Purple dot
    marginTop: 6,
    marginRight: 12,
  },
  suggestionText: {
    fontSize: 14,
    color: '#E2E8F0',
    flex: 1, // Allow text to wrap
    lineHeight: 20,
  },
  noDataText: {
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
  fabButton: {
    backgroundColor: '#10B981', // Green
    borderRadius: 32,
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    fontSize: 36,
    color: '#fff',
    fontWeight: 'bold',
    lineHeight: 38, // Adjust to center the '+' better
  },
  // Modals common styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  // Animal Add Option Sheet styles
  optionSheetContainer: {
    backgroundColor: '#1E293B', // Darker blue-grey
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 350,
    alignItems: 'center',
  },
  optionSheetTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  optionButton: {
    backgroundColor: '#10B981', // Green
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  optionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelOptionButton: {
    marginTop: 18,
    alignItems: 'center',
  },
  cancelOptionButtonText: {
    color: '#94A3B8',
    fontSize: 16,
  },
  // Animal Add/Edit Modal styles
  animalModalContainer: {
    backgroundColor: '#1E293B', // Darker blue-grey
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 450,
    maxHeight: '90%',
  },
  animalModalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  animalModalScrollView: {
    maxHeight: 400, // Limit height of scrollable area
    paddingRight: 5, // Prevent scrollbar from overlapping content
  },
  input: {
    backgroundColor: '#2D3748', // Even darker for inputs
    borderRadius: 10,
    padding: 14,
    marginBottom: 15,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#374151',
    fontSize: 15,
  },
  animalModalButtons: {
    flexDirection: 'row',
    marginTop: 24,
    justifyContent: 'space-between',
  },
  animalModalCancelButton: {
    flex: 1,
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#4A5568', // Grey for cancel
    borderRadius: 10,
    marginRight: 10,
  },
  animalModalSaveButton: {
    flex: 1,
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#10B981', // Green for save
    borderRadius: 10,
    marginLeft: 10,
  },
  animalModalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  // Mic Modal styles
  micButtonAnimated: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  micIcon: {
    fontSize: 56,
    color: '#fff',
  },
  micListeningText: {
    color: '#FFFFFF',
    fontSize: 18,
    marginBottom: 24,
  },
  micCancelButton: {
    backgroundColor: '#2D3748', // Dark grey for cancel
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    width: 150,
  },
  micCancelButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000', // Changed to pure black
  },
  loadingText: {
    color: '#CBD5E1',
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000', // Changed to pure black
    padding: 20,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 25,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  suggestionLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderRadius: 10,
  },
  imagePreviewContainer: {
    marginVertical: 12,
    alignItems: 'center',
    width: '100%',
  },
  imagePreview: {
    width: 220,
    height: 140,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#10B981',
    backgroundColor: '#222E3A',
  },
  modalFooter: {
    width: '100%',
    alignItems: 'center',
    paddingBottom: 12,
  },
  helperText: {
    color: '#94A3B8',
    fontSize: 15,
    marginBottom: 10,
    marginLeft: 2,
  },
  addFieldPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignSelf: 'flex-start',
    marginBottom: 18,
    marginTop: 2,
  },
  addFieldPhotoButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 17,
  },
});

export default CattleScreen;