import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  ActivityIndicator,
  Modal,
  Alert,
  StatusBar,
  SafeAreaView,
  RefreshControl,
  TextInput,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons, FontAwesome5, Entypo } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { NetworkConfig } from '../utils/NetworkConfig';

const { width, height } = Dimensions.get('window');
const API_BASE = NetworkConfig.API_BASE;
const FARMER_ID = 'f001'; // Static ID for now, can be made dynamic

// Cache keys
const WEATHER_CACHE_KEY = 'weather-cache';
const FORECAST_CACHE_KEY = 'forecast-cache';
const AIR_QUALITY_CACHE_KEY = 'air-quality-cache';
const SOIL_CACHE_KEY = 'soilMoistureDataCache';
const CROP_COMBOS_CACHE_KEY = 'crop-combos-cache';
const AI_RECOMMENDATIONS_CACHE_KEY = 'ai-recommendations-cache';

const CropIntelligenceScreen = ({ navigation }) => {
  // State management
  const [weatherData, setWeatherData] = useState(null);
  const [forecastData, setForecastData] = useState(null);
  const [airQualityData, setAirQualityData] = useState(null);
  const [soilData, setSoilData] = useState([]);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('combos'); // Default to crop combos
  const [selectedCombo, setSelectedCombo] = useState(null);
  const [showComboModal, setShowComboModal] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [cropCombos, setCropCombos] = useState([]);

  // Edit combo states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCombo, setEditingCombo] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saveLoading, setSaveLoading] = useState(false);

  // Onboarding states
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentOnboardingStep, setCurrentOnboardingStep] = useState(0);
  const [screenDimensions, setScreenDimensions] = useState(Dimensions.get('window'));

  // Refs for onboarding
  const backButtonRef = useRef(null);
  const weatherSectionRef = useRef(null);
  const tabsSectionRef = useRef(null);
  const comboCardsRef = useRef(null);
  const aiTabRef = useRef(null);

  // Onboarding steps configuration
  const ONBOARDING_STEPS = [
    {
      id: 'back_button',
      title: 'Navigation',
      content: 'Tap here to go back to the main screen anytime.',
      targetElement: 'back-button',
      position: { top: 100, left: 20 },
      arrowPosition: 'top'
    },
    {
      id: 'weather_section',
      title: 'Weather Dashboard',
      content: 'Monitor real-time weather conditions, forecasts, and alerts for your farming area.',
      targetElement: 'weather-section',
      position: { top: 200, alignSelf: 'center' },
      arrowPosition: 'top'
    },
    {
      id: 'tabs_section',
      title: 'Intelligence Tabs',
      content: 'Switch between Crop Combos and AI Recommendations to explore different farming insights.',
      targetElement: 'tabs-section',
      position: { top: 350, alignSelf: 'center' },
      arrowPosition: 'top'
    },
    {
      id: 'combo_cards',
      title: 'Crop Combo Cards',
      content: 'Explore proven crop combinations with investment details, ROI, and success rates.',
      targetElement: 'combo-cards',
      position: { top: 450, left: 20 },
      arrowPosition: 'top'
    },
    {
      id: 'combo_details',
      title: 'Detailed Information',
      content: 'Tap any combo card to view complete details, advantages, challenges, and edit options.',
      targetElement: 'combo-card-item',
      position: { top: 500, left: 20 },
      arrowPosition: 'top'
    },
    {
      id: 'ai_tab',
      title: 'AI Recommendations',
      content: 'Get personalized farming recommendations powered by AI based on your location and conditions.',
      targetElement: 'ai-tab',
      position: { top: 400, right: 20 },
      arrowPosition: 'top'
    },
    {
      id: 'generate_plan',
      title: 'Master Plan Generation',
      content: 'Generate comprehensive farming plans tailored to your specific needs and conditions.',
      targetElement: 'generate-plan-button',
      position: { bottom: 150, alignSelf: 'center' },
      arrowPosition: 'bottom'
    }
  ];

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    loadData();
    animateEntry();
    getCurrentLocation();
    checkOnboardingStatus();
  }, []);

  useEffect(() => {
    const getDimensions = () => {
      const { width, height } = Dimensions.get('window');
      setScreenDimensions({ width, height });
    };

    getDimensions();
    const subscription = Dimensions.addEventListener('change', getDimensions);
    return () => subscription?.remove();
  }, []);

  const animateEntry = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const getCurrentLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        // Fallback to a default location (Shirur, Maharashtra) if permission not granted
        setLocation({ latitude: 18.8237, longitude: 74.3732, city: 'Shirur, Maharashtra' });
        Alert.alert('Permission Denied', 'Location permission was denied. Displaying data for a default location.');
        return;
      }

      let currentLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      let reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });

      const address = reverseGeocode[0];
      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        // Prioritize city, then subregion, then region for a good location display
        city: `${address.city || address.subregion || address.region || 'Unknown City'}, ${address.region || ''}`,
      });
    } catch (error) {
      console.error('Error getting location:', error);
      // Fallback to a default location if any error occurs
      setLocation({ latitude: 18.8237, longitude: 74.3732, city: 'Shirur, Maharashtra' });
      Alert.alert('Location Error', 'Could not get current location. Displaying data for a default location.');
    }
  };

  const loadData = async () => {
    setLoading(true);
    let weatherCoords = { lat: 18.8237, lon: 74.3732 }; // Default coords for Pune/Shirur area

    try {
      // Always try to load cached data first for a snappier UI
      await loadCachedData();

      // Get current location (or use default if permission denied) before fetching weather
      let currentLoc = null;
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          let pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
          currentLoc = pos.coords;
        }
      } catch (locError) {
        console.warn('Could not get live location for weather fetch, using default:', locError);
      }

      if (currentLoc) {
        weatherCoords = { lat: currentLoc.latitude, lon: currentLoc.longitude };
      }

      // Fetch fresh data in background
      const [
        weatherResponse,
        soilResponse,
        combosResponse,
        healthResponse
      ] = await Promise.all([
        fetch(`${API_BASE}/weather/coords?lat=${weatherCoords.lat}&lon=${weatherCoords.lon}`).catch(() => null), // Use coords for more accurate weather
        fetch(`${API_BASE}/soil-moisture`).catch(() => null),
        fetch(`${API_BASE}/crop-intelligence/combos`).catch(() => null),
        fetch(`${API_BASE}/crop-intelligence/health`).catch(() => null) // Check backend health
      ]);

      if (weatherResponse && weatherResponse.ok) {
        const weatherData = await weatherResponse.json();
        setWeatherData(weatherData);
        await AsyncStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(weatherData));

        // Fetch forecast and air quality based on current weather coordinates
        const [forecastResponse, airQualityResponse] = await Promise.all([
          fetch(`${API_BASE}/weather/forecast/coords?lat=${weatherData.coord.lat}&lon=${weatherData.coord.lon}`).catch(() => null),
          fetch(`${API_BASE}/weather/air_quality?lat=${weatherData.coord.lat}&lon=${weatherData.coord.lon}`).catch(() => null)
        ]);

        if (forecastResponse && forecastResponse.ok) {
          const forecastData = await forecastResponse.json();
          setForecastData(forecastData);
          await AsyncStorage.setItem(FORECAST_CACHE_KEY, JSON.stringify(forecastData));
        }

        if (airQualityResponse && airQualityResponse.ok) {
          const airQualityData = await airQualityResponse.json();
          setAirQualityData(airQualityData);
          await AsyncStorage.setItem(AIR_QUALITY_CACHE_KEY, JSON.stringify(airQualityData));
        }
      } else {
        console.warn('Failed to fetch fresh weather data or response not OK.');
      }

      if (soilResponse && soilResponse.ok) {
        const soilData = await soilResponse.json();
        setSoilData(soilData);
        await AsyncStorage.setItem(SOIL_CACHE_KEY, JSON.stringify(soilData));
      } else {
        console.warn('Failed to fetch fresh soil data or response not OK.');
      }

      if (combosResponse && combosResponse.ok) {
        const combosData = await combosResponse.json();
        if (combosData.success && combosData.combos) {
          setCropCombos(combosData.combos);
          await AsyncStorage.setItem(CROP_COMBOS_CACHE_KEY, JSON.stringify(combosData.combos));
        }
      } else {
        console.warn('Failed to fetch fresh crop combos or response not OK.');
      }

      if (healthResponse && healthResponse.ok) {
        const health = await healthResponse.json();
      } else {
        console.warn('Failed to fetch backend health or response not OK.');
      }

    } catch (error) {
      console.error('Error during data loading:', error);
      Alert.alert('Network Error', 'Could not fetch the latest data. Displaying cached data if available. Please check your internet connection.');
      // Fallback to cached data is already handled by loadCachedData being called first.
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData(); // This will also handle setting refreshing to false
  };

  const loadCachedData = async () => {
    let hasCachedData = false;
    try {
      const cachedWeather = await AsyncStorage.getItem(WEATHER_CACHE_KEY);
      const cachedForecast = await AsyncStorage.getItem(FORECAST_CACHE_KEY);
      const cachedAirQuality = await AsyncStorage.getItem(AIR_QUALITY_CACHE_KEY);
      const cachedSoil = await AsyncStorage.getItem(SOIL_CACHE_KEY);
      const cachedCombos = await AsyncStorage.getItem(CROP_COMBOS_CACHE_KEY);
      const cachedAIRecommendations = await AsyncStorage.getItem(AI_RECOMMENDATIONS_CACHE_KEY);

      if (cachedWeather) {
        setWeatherData(JSON.parse(cachedWeather));
        hasCachedData = true;
      }
      if (cachedForecast) {
        setForecastData(JSON.parse(cachedForecast));
        hasCachedData = true;
      }
      if (cachedAirQuality) {
        setAirQualityData(JSON.parse(cachedAirQuality));
        hasCachedData = true;
      }
      if (cachedSoil) {
        setSoilData(JSON.parse(cachedSoil));
        hasCachedData = true;
      }
      if (cachedCombos) {
        setCropCombos(JSON.parse(cachedCombos));
        hasCachedData = true;
      }
      // Remove AI recommendations caching - user should click generate
      // if (cachedAIRecommendations) {
      //   setAiRecommendations(JSON.parse(cachedAIRecommendations));
      //   hasCachedData = true;
      // }
    } catch (error) {
      console.error('Error loading cached data:', error);
    }
    return hasCachedData;
  };

  const getAIRecommendations = async () => {
    if (aiLoading || !weatherData || !location) {
      Alert.alert('Info', 'Weather data or location not available yet. Please wait or refresh.');
      return;
    }

    setAiLoading(true);
    try {
      const avgMoisture = soilData.length > 0
        ? soilData.reduce((sum, item) => sum + (item.moisture || 0), 0) / soilData.length
        : 75; // Default if no soil data

      const requestData = {
        location: location.city,
        temperature: weatherData.main?.temp || 25,
        humidity: weatherData.main?.humidity || 70,
        soil_moisture: avgMoisture,
        season: getCurrentSeason(),
        farmer_experience: 'intermediate', // This can be dynamic from user profile
        available_investment: '₹50,000-1,00,000', // This can be dynamic from user input/profile
        farm_size: '2-3 hectares', // This can be dynamic from user input/profile
        specific_query: 'Recommend best crop combinations for current conditions based on weather, soil, and market trends.'
      };

      const response = await fetch(`${API_BASE}/crop-intelligence/recommend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setAiRecommendations(data);
        await AsyncStorage.setItem(AI_RECOMMENDATIONS_CACHE_KEY, JSON.stringify(data));
      } else {
        Alert.alert('AI Error', data.message || 'Failed to get AI recommendations.');
      }
    } catch (error) {
      console.error('Error getting AI recommendations:', error);
      Alert.alert('Error', 'Failed to get AI recommendations. Please try again. (Details: ' + error.message + ')');
      // Try to load cached recommendations as fallback if fresh fetch fails
      try {
        const cached = await AsyncStorage.getItem(AI_RECOMMENDATIONS_CACHE_KEY);
        if (cached) {
          setAiRecommendations(JSON.parse(cached));
          Alert.alert('Info', 'Loaded previous AI recommendations due to network error.');
        }
      } catch (cacheError) {
        console.error('Error loading cached recommendations as fallback:', cacheError);
      }
    } finally {
      setAiLoading(false);
    }
  };

  const getCurrentSeason = () => {
    const month = new Date().getMonth() + 1; // getMonth() is 0-indexed
    // Indian Seasons (approximate)
    if (month >= 3 && month <= 5) return 'summer'; // March-May
    if (month >= 6 && month <= 9) return 'monsoon'; // June-September
    if (month >= 10 && month <= 2) return 'winter'; // October-February
    return 'unknown';
  };

  // Helper functions for weather data and UI logic
  const getWeatherIcon = (icon) => `https://openweathermap.org/img/wn/${icon}@2x.png`;

  const formatDate = (dt) => {
    const d = new Date(dt * 1000);
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const groupForecastByDay = (list) => {
    if (!list) return [];
    const days = {};
    list.forEach(item => {
      const date = new Date(item.dt * 1000);
      const key = date.toISOString().split('T')[0];
      if (!days[key]) days[key] = [];
      days[key].push(item);
    });
    // For each day, take the entry closest to midday (e.g., 12 PM or 3 PM) for a representative forecast
    return Object.values(days).slice(0, 5).map(dayEntries => {
      // Find the entry closest to 12 PM or 3 PM
      let closestEntry = dayEntries[0];
      let minDiff = Infinity;
      dayEntries.forEach(entry => {
        const hour = new Date(entry.dt * 1000).getHours();
        const diff12 = Math.abs(hour - 12);
        const diff15 = Math.abs(hour - 15); // 3 PM
        const currentDiff = Math.min(diff12, diff15);
        if (currentDiff < minDiff) {
          minDiff = currentDiff;
          closestEntry = entry;
        }
      });
      return closestEntry;
    });
  };

  const getAQIColor = (aqi) => {
    switch (aqi) {
      case 1: return '#4CAF50'; // Good
      case 2: return '#8BC34A'; // Fair
      case 3: return '#FF9800'; // Moderate
      case 4: return '#FF5722'; // Poor
      case 5: return '#f44336'; // Very Poor
      default: return '#757575'; // Unknown
    }
  };

  const getAQIText = (aqi) => {
    switch (aqi) {
      case 1: return 'Good';
      case 2: return 'Fair';
      case 3: return 'Moderate';
      case 4: return 'Poor';
      case 5: return 'Very Poor';
      default: return 'Unknown';
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'beginner': case 'easy': return '#4CAF50'; // Green
      case 'intermediate': case 'medium': return '#FF9800'; // Orange
      case 'advanced': case 'expert': case 'hard': return '#f44336'; // Red
      default: return '#2196F3'; // Blue
    }
  };

  const getROIColor = (roi) => {
    if (!roi) return '#757575';
    // Extract percentage, assuming format like "80-120%"
    const percentageMatch = roi.match(/(\d+)/);
    const percentage = percentageMatch ? parseInt(percentageMatch[1]) : 0;

    if (percentage >= 80) return '#4CAF50'; // High ROI - Green
    if (percentage >= 50) return '#FF9800'; // Medium ROI - Orange
    return '#f44336'; // Low ROI - Red
  };

  // Edit combo functions
  const openEditModal = (combo) => {
    setEditingCombo(combo);
    setEditForm({
      name: combo.name || '',
      description: combo.description || '',
      season: combo.season || '',
      difficulty: combo.difficulty || 'Beginner',
      total_investment: combo.total_investment || '',
      expected_returns: combo.expected_returns || '',
      roi_percentage: combo.roi_percentage || '',
      duration: combo.duration || '',
      success_rate: combo.success_rate || '',
      farmers_using: combo.farmers_using || '',
      crops: combo.crops ? combo.crops.join(', ') : '',
      advantages: combo.advantages ? combo.advantages.join('\n') : '',
      challenges: combo.challenges ? combo.challenges.join('\n') : ''
    });
    setShowEditModal(true);
  };

  const updateFormField = (field, value) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const saveComboChanges = async () => {
    if (!editingCombo || !editForm.name.trim()) {
      Alert.alert('Error', 'Please fill in the combo name.');
      return;
    }

    setSaveLoading(true);
    try {
      const updatedCombo = {
        ...editingCombo,
        name: editForm.name.trim(),
        description: editForm.description.trim(),
        season: editForm.season.trim(),
        difficulty: editForm.difficulty,
        total_investment: editForm.total_investment.trim(),
        expected_returns: editForm.expected_returns.trim(),
        roi_percentage: editForm.roi_percentage.trim(),
        duration: editForm.duration.trim(),
        success_rate: editForm.success_rate.trim(),
        farmers_using: editForm.farmers_using.trim(),
        crops: editForm.crops.split(',').map(crop => crop.trim()).filter(crop => crop),
        advantages: editForm.advantages.split('\n').map(adv => adv.trim()).filter(adv => adv),
        challenges: editForm.challenges.split('\n').map(ch => ch.trim()).filter(ch => ch)
      };

      // Update local state
      const updatedCombos = cropCombos.map(combo => 
        combo.combo_id === editingCombo.combo_id || combo.name === editingCombo.name
          ? updatedCombo
          : combo
      );
      setCropCombos(updatedCombos);

      // Save to cache
      await AsyncStorage.setItem(CROP_COMBOS_CACHE_KEY, JSON.stringify(updatedCombos));

      // TODO: Save to backend
      // const response = await fetch(`${API_BASE}/farmer/${FARMER_ID}/crop-combos/${editingCombo.combo_id}`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(updatedCombo)
      // });

      setShowEditModal(false);
      setSelectedCombo(updatedCombo); // Update selected combo if it's being viewed
      Alert.alert('Success', 'Crop combo updated successfully!');
    } catch (error) {
      console.error('Error saving combo:', error);
      Alert.alert('Error', 'Failed to save changes. Please try again.');
    } finally {
      setSaveLoading(false);
    }
  };

  const resetEditForm = () => {
    setEditForm({});
    setEditingCombo(null);
  };

  // Onboarding functions
  const checkOnboardingStatus = async () => {
    try {
      const completed = await AsyncStorage.getItem('cropIntelligenceOnboardingCompleted');
      if (!completed) {
        setTimeout(() => {
          setShowOnboarding(true);
          setCurrentOnboardingStep(0);
        }, 1000);
      }
    } catch (error) {
      console.log('Error checking onboarding status:', error);
      setTimeout(() => {
        setShowOnboarding(true);
        setCurrentOnboardingStep(0);
      }, 1000);
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
      await AsyncStorage.setItem('cropIntelligenceOnboardingCompleted', 'true');
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
      await AsyncStorage.removeItem('cropIntelligenceOnboardingCompleted');
      Alert.alert('Reset Complete', 'Onboarding has been reset. Restart the app to see the tour again.');
    } catch (error) {
      console.log('Error resetting onboarding:', error);
    }
  };

  // Interactive Guide Tooltip Component
  const InteractiveGuideTooltip = ({ step, onNext, onClose }) => {
    const getTooltipStyle = () => {
      const style = {
        position: 'absolute',
        backgroundColor: '#1E293B',
        borderRadius: 12,
        padding: 16,
        maxWidth: 280,
        zIndex: 1000,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
      };

      if (step.position.top !== undefined) style.top = step.position.top;
      if (step.position.bottom !== undefined) style.bottom = step.position.bottom;
      if (step.position.left !== undefined) style.left = step.position.left;
      if (step.position.right !== undefined) style.right = step.position.right;
      if (step.position.alignSelf) style.alignSelf = step.position.alignSelf;

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
          arrowStyle.borderBottomColor = '#1E293B';
          break;
        case 'bottom':
          arrowStyle.bottom = -8;
          arrowStyle.left = 20;
          arrowStyle.borderLeftWidth = 8;
          arrowStyle.borderRightWidth = 8;
          arrowStyle.borderTopWidth = 8;
          arrowStyle.borderLeftColor = 'transparent';
          arrowStyle.borderRightColor = 'transparent';
          arrowStyle.borderTopColor = '#1E293B';
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
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          zIndex: 999,
        }} />
        <View style={getTooltipStyle()}>
          <View style={getArrowStyle()} />
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>
            {step.title}
          </Text>
          <Text style={{ color: '#CBD5E1', fontSize: 14, lineHeight: 20, marginBottom: 16 }}>
            {step.content}
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: '#94A3B8', fontSize: 12 }}>
              {currentOnboardingStep + 1} of {ONBOARDING_STEPS.length}
            </Text>
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity onPress={onClose} style={{ marginRight: 16 }}>
                <Text style={{ color: '#94A3B8', fontSize: 14 }}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onNext}
                style={{
                  backgroundColor: '#00C853',
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>
                  {currentOnboardingStep === ONBOARDING_STEPS.length - 1 ? 'Finish' : 'Next'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <LinearGradient
        colors={['#000000', '#1A237E', '#0A114A']} // Darker, premium gradient
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView>
          <View style={styles.headerContent}>
            <TouchableOpacity
              ref={backButtonRef}
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={26} color="white" />
            </TouchableOpacity>

            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Crop Intelligence</Text>
              <View style={styles.locationContainer}>
                <Ionicons name="location-sharp" size={16} color="rgba(255,255,255,0.8)" />
                <Text style={styles.headerSubtitle}>
                  {location?.city || 'Fetching location...'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.refreshButton}
              onPress={onRefresh}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="refresh" size={24} color="white" />
              )}
            </TouchableOpacity>
          </View>

          {weatherData && (
            <View ref={weatherSectionRef} style={styles.currentWeatherMainCard}>
              <View style={styles.currentWeatherMainInfo}>
                <View style={styles.currentWeatherVisual}>
                  {weatherData.weather?.[0]?.icon && (
                    <Image
                      source={{ uri: getWeatherIcon(weatherData.weather[0].icon) }}
                      style={styles.currentWeatherBigIcon}
                    />
                  )}
                  <View>
                    <Text style={styles.currentWeatherTemperature}>
                      {Math.round(weatherData.main?.temp || 0)}°C
                    </Text>
                    <Text style={styles.currentWeatherDescription}>
                      {weatherData.weather?.[0]?.description ? weatherData.weather[0].description.toUpperCase() : 'N/A'}
                    </Text>
                  </View>
                </View>

                <View style={styles.currentWeatherDetailsGrid}>
                  <View style={styles.weatherDetailItem}>
                    <MaterialCommunityIcons name="water-percent" size={20} color="#A7FFEB" />
                    <Text style={styles.weatherDetailValue}>{weatherData.main?.humidity || 0}%</Text>
                    <Text style={styles.weatherDetailLabel}>Humidity</Text>
                  </View>
                  <View style={styles.weatherDetailItem}>
                    <MaterialCommunityIcons name="weather-windy" size={20} color="#82B1FF" />
                    <Text style={styles.weatherDetailValue}>{(weatherData.wind?.speed * 3.6).toFixed(1) || 0} km/h</Text> {/* m/s to km/h */}
                    <Text style={styles.weatherDetailLabel}>Wind</Text>
                  </View>
                  {airQualityData?.list?.[0]?.main?.aqi && (
                    <View style={styles.weatherDetailItem}>
                      <MaterialCommunityIcons name="air-filter" size={20} color={getAQIColor(airQualityData.list[0].main.aqi)} />
                      <Text style={styles.weatherDetailValue}>{getAQIText(airQualityData.list[0].main.aqi)}</Text>
                      <Text style={styles.weatherDetailLabel}>Air Quality</Text>
                    </View>
                  )}
                  {soilData.length > 0 && (
                    <View style={styles.weatherDetailItem}>
                      <MaterialCommunityIcons name="water" size={20} color="#C5E1A5" />
                      <Text style={styles.weatherDetailValue}>
                        {Math.round(soilData.reduce((sum, item) => sum + (item.moisture || 0), 0) / soilData.length)}%
                      </Text>
                      <Text style={styles.weatherDetailLabel}>Soil Moisture</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}
        </SafeAreaView>
      </LinearGradient>
    </View>
  );

  const renderTabBar = () => (
    <View ref={tabsSectionRef} style={styles.tabBarContainer}>
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'combos' && styles.activeTab]}
          onPress={() => setActiveTab('combos')}
        >
          <MaterialCommunityIcons
            name="seed"
            size={22}
            color={activeTab === 'combos' ? '#00C853' : '#757575'}
          />
          <Text style={[
            styles.tabText,
            activeTab === 'combos' && styles.activeTabText
          ]}>
            Crop Combos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          ref={aiTabRef}
          style={[styles.tab, activeTab === 'ai' && styles.activeTab]}
          onPress={() => setActiveTab('ai')}
        >
          <MaterialCommunityIcons
            name="robot"
            size={22}
            color={activeTab === 'ai' ? '#00C853' : '#757575'}
          />
          <Text style={[
            styles.tabText,
            activeTab === 'ai' && styles.activeTabText
          ]}>
            AI Insights
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderForecastSection = () => (
    forecastData?.list && (
      <View style={styles.forecastSection}>
        <View style={styles.sectionHeaderRow}>
          <MaterialCommunityIcons name="calendar-week" size={22} color="#333" />
          <Text style={styles.subSectionTitle}>5-Day Weather Forecast</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.forecastScroll}>
          {groupForecastByDay(forecastData.list).map((dayForecast, idx) => (
            <LinearGradient
              key={idx}
              colors={['#FFFFFF', '#F0F0F0']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.forecastCard}
            >
              <Text style={styles.forecastDate}>{formatDate(dayForecast.dt)}</Text>
              {dayForecast.weather?.[0]?.icon && (
                <Image
                  source={{ uri: getWeatherIcon(dayForecast.weather[0].icon) }}
                  style={styles.forecastIcon}
                />
              )}
              <Text style={styles.forecastTemp}>
                {Math.round(dayForecast.main.temp)}°C
              </Text>
              <Text style={styles.forecastDesc}>
                {dayForecast.weather[0].main}
              </Text>
              <View style={styles.forecastDetails}>
                <Text style={styles.forecastLabel}>Rain</Text>
                <Text style={styles.forecastValue}>
                  {dayForecast.rain?.['3h'] ? `${dayForecast.rain['3h']} mm` : '0 mm'}
                </Text>
              </View>
            </LinearGradient>
          ))}
        </ScrollView>
      </View>
    )
  );

  const renderCropComboCard = (combo) => (
    <TouchableOpacity
      key={combo.combo_id || combo.name}
      style={styles.comboCard}
      onPress={() => {
        setSelectedCombo(combo);
        setShowComboModal(true);
      }}
    >
      <LinearGradient
        colors={['#ffffff', '#f8f9fa']}
        style={styles.comboCardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.comboHeader}>
          <View style={styles.comboTitleContainer}>
            <Text style={styles.comboTitle}>{combo.name}</Text>
            <Text style={styles.comboSeason}>{combo.season}</Text>
          </View>
          <View style={[
            styles.difficultyBadge,
            { backgroundColor: getDifficultyColor(combo.difficulty) }
          ]}>
            <Text style={styles.difficultyText}>{combo.difficulty}</Text>
          </View>
        </View>

        <Text style={styles.comboDescription}>{combo.description}</Text>

        <View style={styles.cropsList}>
          {combo.crops?.slice(0, 3).map((crop, index) => (
            <View key={index} style={styles.cropTag}>
              <Text style={styles.cropTagText}>{crop}</Text>
            </View>
          ))}
          {combo.crops?.length > 3 && (
            <View style={styles.cropTag}>
              <Text style={styles.cropTagText}>+{combo.crops.length - 3}</Text>
            </View>
          )}
        </View>

        <View style={styles.comboStats}>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="currency-inr" size={18} color="#00C853" />
            <Text style={styles.statText}>{combo.total_investment}</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="trending-up" size={18} color={getROIColor(combo.roi_percentage)} />
            <Text style={[styles.statText, { color: getROIColor(combo.roi_percentage) }]}>
              {combo.roi_percentage}
            </Text>
          </View>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="clock-outline" size={18} color="#757575" />
            <Text style={styles.statText}>{combo.duration}</Text>
          </View>
        </View>

        <View style={styles.comboFooter}>
          <View style={styles.successRate}>
            <MaterialCommunityIcons name="check-circle" size={16} color="#4CAF50" />
            <Text style={styles.successRateText}>{combo.success_rate} Success</Text>
          </View>
          <Text style={styles.farmersUsing}>{combo.farmers_using}</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderAIRecommendations = () => (
    <View style={styles.aiSection}>
      <Text style={styles.sectionTitle}>AI-Powered Recommendations</Text>
      
      <View style={styles.aiButtonContainer}>
        <TouchableOpacity
          style={[styles.aiButton, aiLoading && styles.aiButtonDisabled]}
          onPress={getAIRecommendations}
          disabled={aiLoading}
        >
          {aiLoading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <MaterialCommunityIcons name="robot" size={20} color="white" />
          )}
          <Text style={styles.aiButtonText}>
            {aiLoading ? 'Analyzing...' : 'Generate Master Plan'}
          </Text>
        </TouchableOpacity>
      </View>

      {aiRecommendations ? (
        <ScrollView style={styles.aiResults} nestedScrollEnabled>
          <View style={styles.confidenceBar}>
            <Text style={styles.confidenceText}>
              Overall Confidence: {Math.round(aiRecommendations.confidence_score * 100)}%
            </Text>
            <View style={styles.confidenceBarTrack}>
              <View
                style={[
                  styles.confidenceBarFill,
                  { width: `${aiRecommendations.confidence_score * 100}%` }
                ]}
              />
            </View>
          </View>

          {(aiRecommendations.recommendations && Array.isArray(aiRecommendations.recommendations) ? aiRecommendations.recommendations : []).map((rec, index) => (
            <View key={index} style={styles.aiRecommendationCard}>
              <View style={styles.aiRecHeader}>
                <Text style={styles.aiRecTitle}>{rec.combo_name}</Text>
                <View style={[styles.aiConfidenceBadge, { backgroundColor: getROIColor(`${rec.confidence_score}%`) }]}>
                  <Text style={styles.aiConfidenceText}>{rec.confidence_score}%</Text>
                </View>
              </View>

              {/* Key Points in bullet format */}
              <View style={styles.keyPointsSection}>
                {(rec.key_points && Array.isArray(rec.key_points) ? rec.key_points : []).map((point, idx) => (
                  <View key={idx} style={styles.bulletPoint}>
                    <MaterialCommunityIcons name="circle" size={6} color="#00C853" />
                    <Text style={styles.bulletText}>{point}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.aiRecDetails}>
                <View style={styles.aiRecDetail}>
                  <Text style={styles.aiRecDetailLabel}>Expected ROI:</Text>
                  <Text style={styles.aiRecDetailValue}>{rec.expected_roi}</Text>
                </View>
                <View style={styles.aiRecDetail}>
                  <Text style={styles.aiRecDetailLabel}>Risk Level:</Text>
                  <Text style={[
                    styles.aiRecDetailValue,
                    { color: rec.risk_level === 'Low' ? '#4CAF50' : rec.risk_level === 'Medium' ? '#FF9800' : '#f44336' }
                  ]}>
                    {rec.risk_level}
                  </Text>
                </View>
                <View style={styles.aiRecDetail}>
                  <Text style={styles.aiRecDetailLabel}>Timeline:</Text>
                  <Text style={styles.aiRecDetailValue}>{rec.timeline}</Text>
                </View>
              </View>
            </View>
          ))}

          {/* Weather & Market Insights in bullet format */}
          {((aiRecommendations.weather_insights && Array.isArray(aiRecommendations.weather_insights) && aiRecommendations.weather_insights.length > 0) || 
            (aiRecommendations.market_insights && Array.isArray(aiRecommendations.market_insights) && aiRecommendations.market_insights.length > 0)) && (
            <View style={styles.insightsCard}>
              <Text style={styles.analysisTitle}>Key Insights</Text>
              {aiRecommendations.weather_insights && Array.isArray(aiRecommendations.weather_insights) && 
                aiRecommendations.weather_insights.map((insight, index) => (
                  <View key={`weather-${index}`} style={styles.bulletPoint}>
                    <MaterialCommunityIcons name="weather-partly-cloudy" size={14} color="#82B1FF" />
                    <Text style={styles.bulletText}>{insight}</Text>
                  </View>
                ))
              }
              {aiRecommendations.market_insights && Array.isArray(aiRecommendations.market_insights) && 
                aiRecommendations.market_insights.map((insight, index) => (
                  <View key={`market-${index}`} style={styles.bulletPoint}>
                    <MaterialCommunityIcons name="trending-up" size={14} color="#00C853" />
                    <Text style={styles.bulletText}>{insight}</Text>
                  </View>
                ))
              }
            </View>
          )}

          {aiRecommendations.action_plan && Array.isArray(aiRecommendations.action_plan) && aiRecommendations.action_plan.length > 0 && (
            <View style={styles.actionPlanCard}>
              <Text style={styles.actionPlanTitle}>Recommended Action Plan</Text>
              {aiRecommendations.action_plan.map((action, index) => (
                <View key={index} style={styles.actionItem}>
                  <View style={styles.actionNumber}>
                    <Text style={styles.actionNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.actionText}>{action}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="robot-happy-outline" size={64} color="#ccc" />
          <Text style={styles.emptyStateText}>Tap "Generate Master Plan" to get AI insights.</Text>
        </View>
      )}
    </View>
  );

  if (loading && !weatherData && !cropCombos.length) { // Only show full screen loader if no cached data either
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00C853" />
        <Text style={styles.loadingText}>Fetching Fresh Intelligence...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#00C853" // iOS loading spinner color
              colors={['#00C853', '#1A237E']} // Android loading spinner colors
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {renderHeader()}
          {renderForecastSection()} {/* Render forecast always below header */}
          {renderTabBar()}

          {activeTab === 'combos' && (
            <View ref={comboCardsRef} style={styles.combosSection}>
              <Text style={styles.sectionTitle}>Available Crop Combinations</Text>
              {cropCombos.length > 0 ? (
                cropCombos.map((combo, index) => renderCropComboCard(combo))
              ) : (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="seed-off" size={64} color="#ccc" />
                  <Text style={styles.emptyStateText}>No crop combinations available.</Text>
                  <TouchableOpacity style={styles.retryButton} onPress={loadData}>
                    <Text style={styles.retryButtonText}>Refresh Data</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {activeTab === 'ai' && renderAIRecommendations()}
        </ScrollView>
      </Animated.View>

      {/* Combo Details Modal */}
      <Modal
        visible={showComboModal}
        animationType="slide"
        presentationStyle="pageSheet" // Looks good on iOS, full screen on Android
        onRequestClose={() => setShowComboModal(false)}
      >
        {selectedCombo && (
          <View style={styles.modalContainer}>
            <LinearGradient
              colors={['#0A114A', '#1A237E']}
              style={styles.modalHeaderGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <SafeAreaView style={{ flex: 1 }}>
                <View style={styles.modalHeaderContent}>
                  <TouchableOpacity
                    style={styles.modalCloseButton}
                    onPress={() => setShowComboModal(false)}
                  >
                    <Ionicons name="arrow-back" size={26} color="white" />
                  </TouchableOpacity>
                  
                  <View style={styles.modalTitleContainer}>
                    <Text style={styles.modalTitle}>{selectedCombo.name}</Text>
                  </View>
                  
                  <TouchableOpacity
                    style={styles.modalEditButton}
                    onPress={() => {
                      setShowComboModal(false);
                      openEditModal(selectedCombo);
                    }}
                  >
                    <Ionicons name="create-outline" size={24} color="white" />
                  </TouchableOpacity>
                </View>
              </SafeAreaView>
            </LinearGradient>

            <ScrollView style={styles.modalContent}>
              <Text style={styles.modalDescription}>{selectedCombo.description}</Text>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Crops Included</Text>
                <View style={styles.modalCropsList}>
                  {selectedCombo.crops?.map((crop, index) => (
                    <View key={index} style={styles.modalCropTag}>
                      <Text style={styles.modalCropTagText}>{crop}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {selectedCombo.advantages && selectedCombo.advantages.length > 0 && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Advantages</Text>
                  {selectedCombo.advantages.map((advantage, index) => (
                    <View key={index} style={styles.modalAdvantageItem}>
                      <MaterialCommunityIcons name="check-circle" size={18} color="#00C853" />
                      <Text style={styles.modalAdvantageText}>{advantage}</Text>
                    </View>
                  ))}
                </View>
              )}

              {selectedCombo.challenges && selectedCombo.challenges.length > 0 && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Challenges</Text>
                  {selectedCombo.challenges.map((challenge, index) => (
                    <View key={index} style={styles.modalChallengeItem}>
                      <MaterialCommunityIcons name="alert-circle" size={18} color="#FF9800" />
                      <Text style={styles.modalChallengeText}>{challenge}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.modalStatsGrid}>
                <View style={styles.modalStatCard}>
                  <Text style={styles.modalStatLabel}>Investment</Text>
                  <Text style={styles.modalStatValue}>{selectedCombo.total_investment}</Text>
                </View>
                <View style={styles.modalStatCard}>
                  <Text style={styles.modalStatLabel}>Expected Returns</Text>
                  <Text style={styles.modalStatValue}>{selectedCombo.expected_returns}</Text>
                </View>
                <View style={styles.modalStatCard}>
                  <Text style={styles.modalStatLabel}>ROI</Text>
                  <Text style={[styles.modalStatValue, { color: getROIColor(selectedCombo.roi_percentage) }]}>
                    {selectedCombo.roi_percentage}
                  </Text>
                </View>
                <View style={styles.modalStatCard}>
                  <Text style={styles.modalStatLabel}>Duration</Text>
                  <Text style={styles.modalStatValue}>{selectedCombo.duration}</Text>
                </View>
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>

      {/* Edit Combo Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowEditModal(false);
          resetEditForm();
        }}
      >
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={['#1B5E20', '#2E7D32']}
            style={styles.modalHeaderGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <SafeAreaView style={{ flex: 1 }}>
              <View style={styles.modalHeaderContent}>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => {
                    setShowEditModal(false);
                    resetEditForm();
                  }}
                >
                  <Ionicons name="close" size={26} color="white" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Edit Crop Combo</Text>
                <TouchableOpacity
                  style={styles.modalSaveButton}
                  onPress={saveComboChanges}
                  disabled={saveLoading}
                >
                  {saveLoading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Ionicons name="checkmark" size={24} color="white" />
                  )}
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </LinearGradient>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Basic Information */}
            <View style={styles.editSection}>
              <Text style={styles.editSectionTitle}>Basic Information</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Combo Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={editForm.name}
                  onChangeText={(value) => updateFormField('name', value)}
                  placeholder="Enter combo name"
                  placeholderTextColor="#666"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={editForm.description}
                  onChangeText={(value) => updateFormField('description', value)}
                  placeholder="Enter combo description"
                  placeholderTextColor="#666"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                  <Text style={styles.inputLabel}>Season</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editForm.season}
                    onChangeText={(value) => updateFormField('season', value)}
                    placeholder="e.g., Kharif, Rabi"
                    placeholderTextColor="#666"
                  />
                </View>
                
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
                  <Text style={styles.inputLabel}>Difficulty</Text>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => {
                      Alert.alert(
                        'Select Difficulty',
                        '',
                        [
                          { text: 'Beginner', onPress: () => updateFormField('difficulty', 'Beginner') },
                          { text: 'Intermediate', onPress: () => updateFormField('difficulty', 'Intermediate') },
                          { text: 'Advanced', onPress: () => updateFormField('difficulty', 'Advanced') },
                          { text: 'Cancel', style: 'cancel' }
                        ]
                      );
                    }}
                  >
                    <Text style={styles.pickerButtonText}>{editForm.difficulty || 'Select'}</Text>
                    <Ionicons name="chevron-down" size={20} color="#666" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Financial Information */}
            <View style={styles.editSection}>
              <Text style={styles.editSectionTitle}>Financial Details</Text>
              
              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                  <Text style={styles.inputLabel}>Total Investment</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editForm.total_investment}
                    onChangeText={(value) => updateFormField('total_investment', value)}
                    placeholder="e.g., ₹50,000"
                    placeholderTextColor="#666"
                  />
                </View>
                
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
                  <Text style={styles.inputLabel}>Expected Returns</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editForm.expected_returns}
                    onChangeText={(value) => updateFormField('expected_returns', value)}
                    placeholder="e.g., ₹80,000"
                    placeholderTextColor="#666"
                  />
                </View>
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                  <Text style={styles.inputLabel}>ROI Percentage</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editForm.roi_percentage}
                    onChangeText={(value) => updateFormField('roi_percentage', value)}
                    placeholder="e.g., 60-80%"
                    placeholderTextColor="#666"
                  />
                </View>
                
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
                  <Text style={styles.inputLabel}>Duration</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editForm.duration}
                    onChangeText={(value) => updateFormField('duration', value)}
                    placeholder="e.g., 4-6 months"
                    placeholderTextColor="#666"
                  />
                </View>
              </View>
            </View>

            {/* Performance Metrics */}
            <View style={styles.editSection}>
              <Text style={styles.editSectionTitle}>Performance Metrics</Text>
              
              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                  <Text style={styles.inputLabel}>Success Rate</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editForm.success_rate}
                    onChangeText={(value) => updateFormField('success_rate', value)}
                    placeholder="e.g., 85%"
                    placeholderTextColor="#666"
                  />
                </View>
                
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
                  <Text style={styles.inputLabel}>Farmers Using</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editForm.farmers_using}
                    onChangeText={(value) => updateFormField('farmers_using', value)}
                    placeholder="e.g., 1,200+ farmers"
                    placeholderTextColor="#666"
                  />
                </View>
              </View>
            </View>

            {/* Crops Information */}
            <View style={styles.editSection}>
              <Text style={styles.editSectionTitle}>Crops & Details</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Crops (comma-separated)</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={editForm.crops}
                  onChangeText={(value) => updateFormField('crops', value)}
                  placeholder="e.g., Rice, Wheat, Sugarcane"
                  placeholderTextColor="#666"
                  multiline
                  numberOfLines={2}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Advantages (one per line)</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={editForm.advantages}
                  onChangeText={(value) => updateFormField('advantages', value)}
                  placeholder={`High yield potential\nGood market demand\nLow maintenance cost`}
                  placeholderTextColor="#666"
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Challenges (one per line)</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={editForm.challenges}
                  onChangeText={(value) => updateFormField('challenges', value)}
                  placeholder={`Water management required\nSeasonal dependency\nMarket price fluctuation`}
                  placeholderTextColor="#666"
                  multiline
                  numberOfLines={4}
                />
              </View>
            </View>

            {/* Save Button */}
            <View style={styles.saveButtonContainer}>
              <TouchableOpacity
                style={[styles.saveButton, saveLoading && styles.saveButtonDisabled]}
                onPress={saveComboChanges}
                disabled={saveLoading}
              >
                {saveLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={20} color="white" />
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={{ height: 50 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* Onboarding Tooltip */}
      {showOnboarding && ONBOARDING_STEPS[currentOnboardingStep] && (
        <InteractiveGuideTooltip
          step={ONBOARDING_STEPS[currentOnboardingStep]}
          onNext={nextOnboardingStep}
          onClose={completeOnboarding}
        />
      )}

      {/* Debug buttons for testing (remove in production) */}
      {__DEV__ && (
        <View style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          flexDirection: 'column',
          gap: 10,
        }}>
          <TouchableOpacity
            onPress={startOnboardingTour}
            style={{
              backgroundColor: 'rgba(0,200,83,0.8)',
              padding: 10,
              borderRadius: 5,
            }}
          >
            <Text style={{ color: 'white', fontSize: 12 }}>Start Tour</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={resetOnboarding}
            style={{
              backgroundColor: 'rgba(255,0,0,0.8)',
              padding: 10,
              borderRadius: 5,
            }}
          >
            <Text style={{ color: 'white', fontSize: 12 }}>Reset Tour</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C1C1C', // Dark background for the entire screen
    paddingTop: 10, // Added top padding
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1C1C1C',
    paddingTop: 10, // Added top padding to loading container as well
  },
  loadingText: {
    marginTop: 15,
    fontSize: 18,
    color: '#E0E0E0', // Light grey text
    fontWeight: '500',
  },
  header: {
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  headerGradient: {
    paddingBottom: 25,
    borderBottomLeftRadius: 30, // Rounded bottom corners for the gradient header
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  backButton: {
    padding: 8,
    marginRight: 10,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 0.5,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  headerSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    marginLeft: 5,
    fontWeight: '500',
  },
  refreshButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },
  currentWeatherMainCard: {
    marginTop: 20,
    marginHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.08)', // Slightly transparent white
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  currentWeatherMainInfo: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  currentWeatherVisual: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  currentWeatherBigIcon: {
    width: 80,
    height: 80,
    marginRight: 15,
  },
  currentWeatherTemperature: {
    fontSize: 48,
    fontWeight: '200',
    color: 'white',
    lineHeight: 50,
  },
  currentWeatherDescription: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'capitalize',
    marginTop: 5,
  },
  currentWeatherDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    width: '100%',
  },
  weatherDetailItem: {
    alignItems: 'center',
    width: '48%', // Approx half width
    marginBottom: 15,
    paddingVertical: 8,
  },
  weatherDetailValue: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginTop: 5,
  },
  weatherDetailLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  forecastSection: {
    marginTop: 20,
    marginBottom: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  subSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E0E0E0', // Light text for dark background
    marginLeft: 10,
  },
  forecastScroll: {
    paddingLeft: 20,
  },
  forecastCard: {
    borderRadius: 15,
    padding: 15,
    marginRight: 15,
    alignItems: 'center',
    minWidth: 120,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: '#E0E0E0', // Light border
  },
  forecastDate: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  forecastIcon: {
    width: 45,
    height: 45,
    marginBottom: 8,
  },
  forecastTemp: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 4,
  },
  forecastDesc: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  forecastDetails: {
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    paddingTop: 8,
    width: '100%',
  },
  forecastLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 2,
  },
  forecastValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  tabBarContainer: {
    backgroundColor: '#1C1C1C', // Match container background
    paddingBottom: 5,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#2C2C2C', // Darker background for tabs
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    borderTopWidth: 1,
    borderTopColor: '#444',
    marginHorizontal: 0,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#00C853', // Vibrant green accent
    backgroundColor: '#3A3A3A', // Slightly lighter dark for active tab
  },
  tabText: {
    marginLeft: 10,
    fontSize: 15,
    fontWeight: '600',
    color: '#E0E0E0', // Light text for inactive tabs
  },
  activeTabText: {
    color: '#00C853', // Vibrant green for active tab text
    fontWeight: '700',
  },
  content: {
    flex: 1,
    backgroundColor: '#1C1C1C', // Match container background
  },
  scrollView: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E0E0E0',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  combosSection: {
    paddingVertical: 20,
  },
  comboCard: {
    marginHorizontal: 20,
    marginBottom: 18,
    borderRadius: 15,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    overflow: 'hidden', // Ensures gradient respects border radius
  },
  comboCardGradient: {
    padding: 20,
    borderRadius: 15,
  },
  comboHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  comboTitleContainer: {
    flex: 1,
    marginRight: 10,
  },
  comboTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  comboSeason: {
    fontSize: 13,
    color: '#666',
    marginTop: 3,
    fontWeight: '500',
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    alignSelf: 'flex-start',
  },
  difficultyText: {
    fontSize: 11,
    color: 'white',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  comboDescription: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
    marginBottom: 18,
  },
  cropsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 18,
  },
  cropTag: {
    backgroundColor: '#E8F5E9', // Light green
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    marginRight: 8,
    marginBottom: 8,
  },
  cropTagText: {
    fontSize: 13,
    color: '#2E7D32', // Darker green
    fontWeight: '600',
  },
  comboStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
    paddingHorizontal: 5,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  statText: {
    fontSize: 13,
    color: '#555',
    marginLeft: 6,
    fontWeight: '600',
  },
  comboFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#ECEFF1',
  },
  successRate: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  successRateText: {
    fontSize: 13,
    color: '#4CAF50',
    marginLeft: 6,
    fontWeight: '600',
  },
  farmersUsing: {
    fontSize: 13,
    color: '#777',
    fontWeight: '500',
  },
  aiSection: {
    paddingVertical: 20,
  },
  aiButtonContainer: {
    paddingHorizontal: 20,
    marginBottom: 25,
    alignItems: 'center',
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00C853', // Vibrant green for AI button
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    minWidth: 200,
    justifyContent: 'center',
  },
  aiButtonDisabled: {
    backgroundColor: '#666',
  },
  aiButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  aiResults: {
    // maxHeight: height * 0.7, // Adjust as needed, but ScrollView handles full content
  },
  confidenceBar: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#2A2A2A', // Dark background for bar
    borderRadius: 8,
    padding: 15,
    borderWidth: 1,
    borderColor: '#444',
  },
  confidenceText: {
    fontSize: 15,
    color: '#E0E0E0',
    marginBottom: 10,
    fontWeight: '600',
  },
  confidenceBarTrack: {
    height: 8,
    backgroundColor: '#444',
    borderRadius: 4,
    overflow: 'hidden',
  },
  confidenceBarFill: {
    height: '100%',
    backgroundColor: '#00C853', // Vibrant green
    borderRadius: 4,
  },
  aiRecommendationCard: {
    backgroundColor: '#2A2A2A', // Dark card background
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 20,
    borderRadius: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#444',
  },
  aiRecHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  aiRecTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E0E0E0',
    flex: 1,
    marginRight: 10,
  },
  aiConfidenceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  aiConfidenceText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '700',
  },
  aiRecJustification: {
    fontSize: 15,
    color: '#B0B0B0', // Lighter grey for main text
    lineHeight: 22,
    marginBottom: 18,
  },
  keyPointsSection: {
    marginBottom: 18,
  },
  bulletPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingLeft: 5,
  },
  bulletText: {
    fontSize: 14,
    color: '#B0B0B0',
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
  },
  aiRecDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
    borderTopWidth: 1,
    borderTopColor: '#3A3A3A',
    paddingTop: 15,
  },
  aiRecDetail: {
    flex: 1,
    alignItems: 'center',
  },
  aiRecDetailLabel: {
    fontSize: 13,
    color: '#999',
    marginBottom: 5,
  },
  aiRecDetailValue: {
    fontSize: 15,
    color: '#E0E0E0',
    fontWeight: '600',
  },
  advantagesSection: {
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#3A3A3A',
    paddingTop: 15,
  },
  advantagesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E0E0E0',
    marginBottom: 10,
  },
  advantageItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  advantageText: {
    fontSize: 14,
    color: '#B0B0B0',
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
  },
  analysisCard: {
    backgroundColor: '#2A2A2A',
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 20,
    borderRadius: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#444',
  },
  insightsCard: {
    backgroundColor: '#2A2A2A',
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 20,
    borderRadius: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#444',
  },
  analysisTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E0E0E0',
    marginBottom: 10,
  },
  analysisText: {
    fontSize: 15,
    color: '#B0B0B0',
    lineHeight: 22,
  },
  actionPlanCard: {
    backgroundColor: '#2A2A2A',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#444',
  },
  actionPlanTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E0E0E0',
    marginBottom: 15,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  actionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#00C853', // Green for numbers
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    flexShrink: 0, // Prevent number circle from shrinking
  },
  actionNumberText: {
    fontSize: 14,
    color: 'white',
    fontWeight: 'bold',
  },
  actionText: {
    fontSize: 15,
    color: '#B0B0B0',
    flex: 1,
    lineHeight: 22,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    marginTop: 15,
    marginBottom: 20,
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  retryButton: {
    backgroundColor: '#00C853',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#1C1C1C', // Dark background for modal
  },
  modalHeaderGradient: {
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  modalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  modalCloseButton: {
    padding: 5,
    marginRight: 15,
  },
  modalTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalDescription: {
    fontSize: 16,
    color: '#B0B0B0',
    lineHeight: 24,
    marginBottom: 25,
  },
  modalSection: {
    marginBottom: 30,
  },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E0E0E0',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#3A3A3A',
    paddingBottom: 8,
  },
  modalCropsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  modalCropTag: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    marginRight: 10,
    marginBottom: 10,
  },
  modalCropTagText: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '600',
  },
  modalAdvantageItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  modalAdvantageText: {
    fontSize: 15,
    color: '#B0B0B0',
    marginLeft: 10,
    flex: 1,
    lineHeight: 22,
  },
  modalChallengeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  modalChallengeText: {
    fontSize: 15,
    color: '#B0B0B0',
    marginLeft: 10,
    flex: 1,
    lineHeight: 22,
  },
  modalStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  modalStatCard: {
    width: '48%',
    backgroundColor: '#2A2A2A',
    padding: 18,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#444',
  },
  modalStatLabel: {
    fontSize: 13,
    color: '#999',
    marginBottom: 8,
  },
  modalStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E0E0E0',
  },

  // Edit Modal Styles
  modalEditButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSaveButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editSection: {
    marginBottom: 24,
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 16,
  },
  editSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00C853',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E0E0E0',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFFFFF',
    minHeight: 48,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  pickerButton: {
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 48,
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  saveButtonContainer: {
    marginTop: 24,
    marginBottom: 16,
  },
  saveButton: {
    backgroundColor: '#00C853',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#00C853',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  saveButtonDisabled: {
    backgroundColor: '#666',
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 8,
  },
});

export default CropIntelligenceScreen;