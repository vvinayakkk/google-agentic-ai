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
  Dimensions,
} from 'react-native';
import { ChevronLeft, ChevronDown, Calendar, MapPin, Droplets, Egg } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { NetworkConfig } from '../utils/NetworkConfig';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';


const API_BASE = NetworkConfig.API_BASE;
const FARMER_ID = 'f001';
const LIVESTOCK_CACHE_KEY = 'livestock-cache';
const CALENDAR_CACHE_KEY = 'cattle-calendar-cache';
const SPACE_SUGGESTIONS_CACHE_KEY = 'space-suggestions-cache';

const CattleScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(theme);
  const { t } = useTranslation();
  const [expandedCard, setExpandedCard] = useState(null);
  const [cattleData, setCattleData] = useState([]);
  const [calendarUpdates, setCalendarUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Add state for animal modals
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

  const [imageModalVisible, setImageModalVisible] = useState(false);

  // Onboarding states
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentOnboardingStep, setCurrentOnboardingStep] = useState(0);

  const screenDimensions = Dimensions.get('window');
  const [imageLoading, setImageLoading] = useState(false);
  const [lastSpaceImage, setLastSpaceImage] = useState(null);
  const [spaceSuggestions, setSpaceSuggestions] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null); // Only one image

  const suggestions = [
    t('cattle.suggestions.bella', 'Bella needs more pasture space - consider rotation'),
    t('cattle.suggestions.coop_humidity', 'Chicken coop humidity levels need monitoring'),
    t('cattle.suggestions.billy', 'Billy shows signs of nutritional needs - supplement recommended')
  ];

  // Onboarding steps configuration
  const ONBOARDING_STEPS = [
    {
      id: 'back_button',
      title: t('cattle.onboarding.back_title', 'Navigation'),
      content: t('cattle.onboarding.back_message', 'Tap here to go back to the main screen anytime.'),
      targetElement: 'back-button',
      position: { top: 70, left: 20 },
      arrowPosition: 'top'
    },
    {
      id: 'live_indicator',
      title: t('cattle.onboarding.live_title', 'Live Status'),
      content: t('cattle.onboarding.live_message', 'This shows your farm data is updated in real-time.'),
      targetElement: 'live-indicator',
      position: { top: 70, right: 20 },
      arrowPosition: 'top'
    },
    {
      id: 'cattle_list',
      title: t('cattle.onboarding.list_title', 'Your Livestock'),
      content: t('cattle.onboarding.list_message', 'View all your animals here. Tap any card to see more details.'),
      targetElement: 'cattle-section',
      position: { top: 160, left: 20 },
      arrowPosition: 'top'
    },
    {
      id: 'animal_card',
      title: t('cattle.onboarding.card_title', 'Animal Cards'),
      content: t('cattle.onboarding.card_message', 'Each card shows animal info. Tap to expand, use edit/delete buttons.'),
      targetElement: 'animal-card',
      position: { top: 200, left: 20 },
      arrowPosition: 'top'
    },
    {
      id: 'calendar_section',
      title: t('cattle.onboarding.calendar_title', 'Livestock Schedule'),
      content: t('cattle.onboarding.calendar_message', 'View upcoming tasks and care reminders for your animals.'),
      targetElement: 'calendar-section',
      position: { top: 400, left: 20 },
      arrowPosition: 'top'
    },
    {
      id: 'space_suggestions',
      title: t('cattle.onboarding.space_title', 'AI Space Suggestions'),
      content: t('cattle.onboarding.space_message', 'Get intelligent recommendations for optimizing your livestock space.'),
      targetElement: 'suggestions-section',
      position: { top: 500, left: 20 },
      arrowPosition: 'top'
    },
    {
      id: 'image_upload',
      title: t('cattle.onboarding.image_title', 'Upload Field Photos'),
      content: t('cattle.onboarding.image_message', 'Take or upload photos of your farm space for AI analysis.'),
      targetElement: 'image-upload-button',
      position: { top: 600, left: 20 },
      arrowPosition: 'top'
    },
    {
      id: 'add_animal',
      title: t('cattle.onboarding.add_title', 'Add New Animals'),
      content: t('cattle.onboarding.add_message', 'Tap the + button to add new animals to your livestock.'),
      targetElement: 'add-animal-fab',
      position: { bottom: 120, right: 40 },
      arrowPosition: 'bottom'
    }
  ];

  // Onboarding functions
  const checkOnboardingStatus = async () => {
    try {
      const completed = await AsyncStorage.getItem('cattleScreenOnboardingCompleted');
      if (!completed) {
        setTimeout(() => {
          setShowOnboarding(true);
          setCurrentOnboardingStep(0);
        }, 1000);
      }
    } catch (error) {
      console.log('Error checking onboarding status:', error);
    }
  };

  const nextOnboardingStep = () => {
    if (currentOnboardingStep < ONBOARDING_STEPS.length - 1) {
      setCurrentOnboardingStep(currentOnboardingStep + 1);
    } else {
      completeOnboarding();
    }
  };

  const completeOnboarding = async () => {
    setShowOnboarding(false);
    try {
      await AsyncStorage.setItem('cattleScreenOnboardingCompleted', 'true');
    } catch (error) {
      console.log('Error saving onboarding completion:', error);
    }
  };

  const startOnboardingTour = () => {
    setCurrentOnboardingStep(0);
    setShowOnboarding(true);
  };

  const resetOnboarding = async () => {
    try {
      await AsyncStorage.removeItem('cattleScreenOnboardingCompleted');
      Alert.alert(t('cattle.onboarding.reset_title', 'Reset Complete'), t('cattle.onboarding.reset_message', 'Onboarding has been reset. Restart the app to see the tour again.'));
    } catch (error) {
      console.log('Error resetting onboarding:', error);
    }
  };

  // Interactive Guide Tooltip Component
  const InteractiveGuideTooltip = ({ step, onNext, onClose }) => {
    const getTooltipStyle = () => {
      const style = {
        position: 'absolute',
        backgroundColor: theme.colors.card,
        borderRadius: 12,
        padding: 16,
        maxWidth: 280,
        zIndex: 1000,
        shadowColor: theme.colors.shadow || '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
      };

      if (step.position.top !== undefined) style.top = step.position.top;
      if (step.position.bottom !== undefined) style.bottom = step.position.bottom;
      if (step.position.left !== undefined) style.left = step.position.left;
      if (step.position.right !== undefined) style.right = step.position.right;

      return style;
    };

    const getArrowStyle = () => {
      const arrowStyle = {
        position: 'absolute',
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
      };

      switch (step.arrowPosition) {
        case 'top':
          arrowStyle.top = -8;
          arrowStyle.left = 20;
          arrowStyle.borderLeftWidth = 8;
          arrowStyle.borderRightWidth = 8;
          arrowStyle.borderBottomWidth = 8;
          arrowStyle.borderLeftColor = 'transparent';
          arrowStyle.borderRightColor = 'transparent';
          arrowStyle.borderBottomColor = theme.colors.card;
          break;
        case 'bottom':
          arrowStyle.bottom = -8;
          arrowStyle.right = 20;
          arrowStyle.borderLeftWidth = 8;
          arrowStyle.borderRightWidth = 8;
          arrowStyle.borderTopWidth = 8;
          arrowStyle.borderLeftColor = 'transparent';
          arrowStyle.borderRightColor = 'transparent';
          arrowStyle.borderTopColor = theme.colors.card;
          break;
        default:
          break;
      }

      return arrowStyle;
    };

    return (
      <>
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: theme.colors.overlay || 'rgba(0,0,0,0.7)',
          zIndex: 999,
        }} />
        <View style={getTooltipStyle()}>
          <View style={getArrowStyle()} />
          <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>
            {step.title}
          </Text>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 16 }}>
            {step.content}
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
              {currentOnboardingStep + 1} of {ONBOARDING_STEPS.length}
            </Text>
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity onPress={onClose} style={{ marginRight: 16 }}>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 14 }}>{t('common.skip', 'Skip')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onNext}
                style={{
                  backgroundColor: theme.colors.success || theme.colors.primary,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: theme.colors.onPrimary || theme.colors.text, fontSize: 14, fontWeight: '600' }}>
                  {currentOnboardingStep === ONBOARDING_STEPS.length - 1 ? t('common.finish', 'Finish') : t('common.next', 'Next')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </>
    );
  };

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
      setError(t('cattle.fetch_error', 'Failed to load data. Please check your network connection.'));
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
    checkOnboardingStatus(); // Check if onboarding should be shown
  }, []);



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



  const openEditAnimalModal = (animal) => {
    setAnimalModalMode('edit');
    setAnimalModalAnimal({ ...animal }); // Populate modal with existing animal data
    setAnimalModalVisible(true);
  };

  const handleDeleteAnimal = (animal) => {
    Alert.alert(t('cattle.delete_title', 'Delete Animal'), t('cattle.delete_confirm', `Are you sure you want to delete "${animal.name}"? This action cannot be undone.`), [
      { text: t('common.cancel', 'Cancel'), style: 'cancel' },
      {
        text: t('common.delete', 'Delete'),
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
            Alert.alert(t('common.success', 'Success'), t('cattle.delete_success', `${animal.name} deleted successfully.`));
          } catch (err) {
            Alert.alert(t('common.error', 'Error'), err.message || t('cattle.delete_failed', 'Failed to delete animal on server. Restoring data.'));
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
      Alert.alert(t('cattle.missing_title', 'Missing Info'), t('cattle.missing_message', 'Please fill all required fields (Name, Breed, Type).'));
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

      Alert.alert(t('common.success', 'Success'), t('cattle.save_success', `Animal ${animalModalMode === 'add' ? 'added' : 'updated'} successfully.`));

    } catch (err) {
      Alert.alert(t('common.error', 'Error'), err.message || t('cattle.save_failed', `Failed to ${animalModalMode === 'add' ? 'add' : 'update'} animal on server. Restoring data.`));
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

  const renderAnimalCard = (animal, index) => {
    const isExpanded = expandedCard === animal.id;

    return (
      <TouchableOpacity
        key={animal.id}
        ref={index === 0 ? (ref => ref && (ref._reactInternalInstance = 'animal-card')) : null}
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
              <Text style={styles.detailLabel}>{t('cattle.age', 'Age:')}</Text>
              <Text style={styles.detailValue}>{animal.age || t('common.na', 'N/A')}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('cattle.health', 'Health:')}</Text>
              <Text style={[
                styles.detailValue,
                {
                  color: animal.health === 'Excellent' ? '#10B981' :
                    animal.health === 'Good' ? '#F59E0B' : '#EF4444'
                }
              ]}>
                {animal.health || t('common.unknown', 'Unknown')}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('cattle.last_checkup', 'Last Checkup:')}</Text>
              <Text style={styles.detailValue}>{animal.lastCheckup || t('common.na', 'N/A')}</Text>
            </View>

            {(animal.type && (animal.type.toLowerCase() === 'cow' || animal.type.toLowerCase() === 'goat')) && (
              <View style={styles.capacityRow}>
                <Droplets color="#3B82F6" size={16} />
                <Text style={styles.capacityText}>{t('cattle.milk', 'Milk')}: {animal.milkCapacity || t('common.na', 'N/A')}</Text>
              </View>
            )}
            {(animal.type && animal.type.toLowerCase() === 'chicken') && (
              <View style={styles.capacityRow}>
                <Egg color="#F59E0B" size={16} />
                <Text style={styles.capacityText}>{t('cattle.eggs', 'Eggs')}: {animal.eggCapacity || t('common.na', 'N/A')}</Text>
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
      Alert.alert(t('cattle.no_image_title', 'No image selected!'));
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
      Alert.alert(t('common.success', 'Success'), t('cattle.space_success', 'Space suggestions updated!'));
      setSelectedImage(null);
      setImageModalVisible(false); // Close modal after submit
    } catch (err) {
      Alert.alert(t('common.error', 'Error'), err.message || t('cattle.space_failed', 'Failed to analyze image.'));
    } finally {
      setImageLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top || StatusBar.currentHeight, backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={theme.colors.statusBarStyle} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.headerBackground, borderBottomColor: theme.colors.border }]}> 
        <TouchableOpacity 
          ref={ref => ref && (ref._reactInternalInstance = 'back-button')}
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>{t('cattle.title')}</Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>{t('cattle.subtitle')}</Text>
        </View>
        <View 
          ref={ref => ref && (ref._reactInternalInstance = 'live-indicator')}
          style={[styles.liveIndicator, { borderColor: theme.colors.border }]}
        >
          <View style={styles.liveDot} />
          <Text style={[styles.liveText, { color: theme.colors.text }]}>{t('common.live', 'LIVE')}</Text>
        </View>
      </View>

      {loading && cattleData.length === 0 ? ( // Show full loading screen only if no cached data
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>{t('cattle.loading')}</Text>
        </View>
      ) : error ? ( // Show error if fetching failed and no data in cache
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.colors.text }]}>{t('cattle.error')}</Text>
          <TouchableOpacity onPress={fetchCattleData} style={styles.retryButton}>
            <Text style={[styles.retryButtonText, { color: theme.colors.text }]}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
  <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Animals Section */}
          <View 
            ref={ref => ref && (ref._reactInternalInstance = 'cattle-section')}
            style={styles.section}
          >
            <Text style={styles.sectionTitle}>{t('cattle.your_livestock', 'Your Livestock')} ({cattleData.length})</Text>
            {cattleData.map((animal, index) => renderAnimalCard(animal, index))}
            {cattleData.length === 0 && !loading && ( // Message if no animals and not loading
                <Text style={styles.noDataText}>{t('cattle.no_animals')}</Text>
            )}
          </View>

          {/* Calendar Updates */}
          <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('CalenderScreen')}>
            <View 
              ref={ref => ref && (ref._reactInternalInstance = 'calendar-section')}
              style={styles.section}
            >
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
          <View 
            ref={ref => ref && (ref._reactInternalInstance = 'suggestions-section')}
            style={styles.section}
          >
            <View style={styles.sectionHeader}>
              <MapPin color="#8B5CF6" size={20} />
              <Text style={styles.sectionTitle}>{t('cattle.space_suggestion')}</Text>
            </View>
            <View style={{ marginBottom: 10, marginLeft: 2 }}>
              <Text style={styles.helperText}>{t('cattle.suggestions_helper')}</Text>
            </View>
            <TouchableOpacity 
              ref={ref => ref && (ref._reactInternalInstance = 'image-upload-button')}
              onPress={handleAddImagePress} 
              style={styles.addFieldPhotoButton} 
              activeOpacity={0.85}
            >
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
                <Text style={styles.noDataText}>{t('cattle.no_space_suggestions', 'No space suggestions at the moment.')}</Text>
              )}
              {lastSpaceImage && (
                <View style={{ alignItems: 'center', marginTop: 16 }}>
                  <Text style={{ color: '#94A3B8', marginBottom: 8 }}>{t('cattle.last_uploaded_image', 'Last Uploaded Image')}</Text>
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
        <TouchableOpacity 
          ref={ref => ref && (ref._reactInternalInstance = 'add-animal-fab')}
          onPress={openAddAnimalModal} 
          style={styles.fabButton}
        >
          <Text style={styles.fabText}>{t('common.plus', '+')}</Text>
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
                <Text style={{ color: '#94A3B8', marginBottom: 6 }}>{t('cattle.selected_image', 'Selected Image:')}</Text>
                <Image source={{ uri: selectedImage.uri }} style={styles.imagePreview} />
              </View>
            )}
            <View style={styles.modalFooter}>
              <TouchableOpacity style={[styles.optionButton, { backgroundColor: '#10B981', marginTop: 0 }]} onPress={handleSubmitImage}>
                <Text style={styles.optionButtonText}>{t('cattle.submit_for_analysis')}</Text>
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
          <Text style={styles.loadingText}>{t('cattle.analyzing_image', 'Analyzing image and updating suggestions...')}</Text>
        </View>
      )}

      {/* Onboarding Tooltip */}
      {showOnboarding && (
        <InteractiveGuideTooltip
          step={ONBOARDING_STEPS[currentOnboardingStep]}
          onNext={nextOnboardingStep}
          onClose={completeOnboarding}
        />
      )}

      {/* Onboarding debug buttons for testing */}
      {__DEV__ && (
        <View style={styles.tourButtonsContainer}>
          <TouchableOpacity 
            style={styles.restartTourButton} 
            onPress={startOnboardingTour}
          >
            <MaterialCommunityIcons name="replay" size={20} color="#10B981" />
            <Text style={styles.restartTourText}>{t('common.tour', 'Tour')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.resetTourButton} 
            onPress={resetOnboarding}
          >
            <MaterialCommunityIcons name="refresh" size={16} color="#FF5722" />
            <Text style={styles.resetTourText}>{t('common.reset', 'Reset')}</Text>
          </TouchableOpacity>
        </View>
      )}
      

    </SafeAreaView>
  );
};

const makeStyles = (theme) => {
  const { colors } = theme;
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerContent: {
      flex: 1,
      marginLeft: 16,
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      color: colors.text,
    },
    headerSubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 2,
    },
    liveIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      backgroundColor: colors.surface,
    },
    liveDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.success || colors.primary,
      marginRight: 6,
    },
    liveText: {
      fontSize: 12,
      fontWeight: 'bold',
      color: colors.text,
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
      color: colors.text,
      marginLeft: 8,
    },
    animalCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderLeftWidth: 5,
      shadowColor: colors.shadow || '#000',
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
      flex: 1,
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
      color: colors.text,
    },
    animalBreed: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 2,
    },
    cardActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    actionButton: {
      backgroundColor: colors.info || colors.primary,
      borderRadius: 8,
      padding: 6,
      marginLeft: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chevronIcon: {
      marginLeft: 8,
    },
    expandedContent: {
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    detailLabel: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    detailValue: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text,
    },
    capacityRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 12,
      padding: 10,
      backgroundColor: colors.surface,
      borderRadius: 8,
    },
    capacityText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.text,
      marginLeft: 8,
    },
    updateCard: {
      backgroundColor: colors.card,
      borderRadius: 10,
      padding: 14,
      marginBottom: 10,
      shadowColor: colors.shadow || '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
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
      color: colors.text,
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
      color: colors.text,
    },
    updateDate: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    suggestionCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: colors.card,
      borderRadius: 10,
      padding: 14,
      marginBottom: 10,
      shadowColor: colors.shadow || '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 1.41,
      elevation: 2,
    },
    suggestionDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.accent || colors.primary,
      marginTop: 6,
      marginRight: 12,
    },
    suggestionText: {
      fontSize: 14,
      color: colors.text,
      flex: 1,
      lineHeight: 20,
    },
    noDataText: {
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: 20,
      fontSize: 16,
    },
    fabButton: {
      backgroundColor: colors.success || colors.primary,
      borderRadius: 32,
      width: 64,
      height: 64,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.success || colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 8,
    },
    fabText: {
      fontSize: 36,
      color: colors.onPrimary || '#fff',
      fontWeight: 'bold',
      lineHeight: 38,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlay || 'rgba(0,0,0,0.8)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    optionSheetContainer: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 24,
      width: '90%',
      maxWidth: 350,
      alignItems: 'center',
    },
    optionSheetTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 20,
    },
    optionButton: {
      backgroundColor: colors.success || colors.primary,
      borderRadius: 10,
      padding: 15,
      alignItems: 'center',
      width: '100%',
      marginBottom: 12,
    },
    optionButtonText: {
      color: colors.onPrimary || '#fff',
      fontWeight: 'bold',
      fontSize: 16,
    },
    cancelOptionButton: {
      marginTop: 18,
      alignItems: 'center',
    },
    cancelOptionButtonText: {
      color: colors.textSecondary,
      fontSize: 16,
    },
    animalModalContainer: {
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 24,
      width: '100%',
      maxWidth: 450,
      maxHeight: '90%',
    },
    animalModalTitle: {
      color: colors.text,
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 20,
      textAlign: 'center',
    },
    animalModalScrollView: {
      maxHeight: 400,
      paddingRight: 5,
    },
    input: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      padding: 14,
      marginBottom: 15,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
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
      backgroundColor: colors.muted || colors.surface,
      borderRadius: 10,
      marginRight: 10,
    },
    animalModalSaveButton: {
      flex: 1,
      alignItems: 'center',
      padding: 14,
      backgroundColor: colors.success || colors.primary,
      borderRadius: 10,
      marginLeft: 10,
    },
    animalModalButtonText: {
      color: colors.onPrimary || '#fff',
      fontWeight: 'bold',
      fontSize: 16,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    loadingText: {
      color: colors.textSecondary,
      marginTop: 10,
      fontSize: 16,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
      padding: 20,
    },
    errorText: {
      color: colors.danger || '#EF4444',
      fontSize: 18,
      textAlign: 'center',
      marginBottom: 20,
    },
    retryButton: {
      backgroundColor: colors.info || colors.primary,
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 25,
    },
    retryButtonText: {
      color: colors.onPrimary || '#FFFFFF',
      fontSize: 16,
      fontWeight: 'bold',
    },
    suggestionLoadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.overlay || 'rgba(0,0,0,0.85)',
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
      borderColor: colors.success || colors.primary,
      backgroundColor: colors.surface,
    },
    modalFooter: {
      width: '100%',
      alignItems: 'center',
      paddingBottom: 12,
    },
    helperText: {
      color: colors.textSecondary,
      fontSize: 15,
      marginBottom: 10,
      marginLeft: 2,
    },
    addFieldPhotoButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.success || colors.primary,
      borderRadius: 10,
      paddingVertical: 14,
      paddingHorizontal: 24,
      alignSelf: 'flex-start',
      marginBottom: 18,
      marginTop: 2,
    },
    addFieldPhotoButtonText: {
      color: colors.onPrimary || '#fff',
      fontWeight: 'bold',
      fontSize: 17,
    },
    tourButtonsContainer: {
      position: 'absolute',
      bottom: 85,
      left: 15,
      flexDirection: 'row',
      gap: 10,
      zIndex: 15,
    },
    restartTourButton: {
      backgroundColor: 'rgba(16,185,129,0.1)',
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: colors.success || colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 10,
      marginLeft:140,
      marginBottom:60,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: colors.success || colors.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    restartTourText: {
      color: colors.success || colors.primary,
      fontSize: 14,
      fontWeight: '700',
      marginLeft: 6,
      letterSpacing: 0.5,
    },
    resetTourButton: {
      backgroundColor: 'rgba(255,87,34,0.1)',
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: colors.warning || '#FF5722',
      paddingHorizontal: 16,
      paddingVertical: 10,
      marginBottom:60,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: colors.warning || '#FF5722',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    resetTourText: {
      color: colors.warning || '#FF5722',
      fontSize: 14,
      fontWeight: '700',
      marginLeft: 6,
      letterSpacing: 0.5,
    },
  });
};

export default CattleScreen;