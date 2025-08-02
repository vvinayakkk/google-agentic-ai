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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { NetworkConfig } from '../utils/NetworkConfig';
import styles from './CropIntelligenceScreenNew.styles';

const safeText = (value, fallback = '') => {
  if (value === null || value === undefined) return fallback;
  return String(value);
};

const { width, height } = Dimensions.get('window');
const API_BASE = NetworkConfig.API_BASE;
const FARMER_ID = 'f001';

const WEATHER_CACHE_KEY = 'weather-cache';
const FORECAST_CACHE_KEY = 'forecast-cache';
const AIR_QUALITY_CACHE_KEY = 'air-quality-cache';
const SOIL_CACHE_KEY = 'soilMoistureDataCache';
const CROP_COMBOS_CACHE_KEY = 'crop-combos-cache';
const AI_RECOMMENDATIONS_CACHE_KEY = 'ai-recommendations-cache';

const CropIntelligenceScreen = ({ navigation }) => {
  const [weatherData, setWeatherData] = useState(null);
  const [forecastData, setForecastData] = useState(null);
  const [airQualityData, setAirQualityData] = useState(null);
  const [soilData, setSoilData] = useState([]);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('combos');
  const [selectedCombo, setSelectedCombo] = useState(null);
  const [showComboModal, setShowComboModal] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [cropCombos, setCropCombos] = useState([]);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCombo, setEditingCombo] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saveLoading, setSaveLoading] = useState(false);

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentOnboardingStep, setCurrentOnboardingStep] = useState(0);
  const [screenDimensions, setScreenDimensions] = useState(Dimensions.get('window'));

  const backButtonRef = useRef(null);
  const weatherSectionRef = useRef(null);
  const tabsSectionRef = useRef(null);
  const comboCardsRef = useRef(null);
  const aiTabRef = useRef(null);

  const [responseCards, setResponseCards] = useState([]);
  const [expandedCardId, setExpandedCardId] = useState(null);

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

  useEffect(() => {
    if (aiRecommendations) {
      const cards = convertAIRecommendationsToResponseCards(aiRecommendations);
      setResponseCards(cards);
    }
  }, [aiRecommendations]);

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
        city: `${address.city || address.subregion || address.region || 'Unknown City'}, ${address.region || ''}`,
      });
    } catch (error) {
      console.error('Error getting location:', error);
      setLocation({ latitude: 18.8237, longitude: 74.3732, city: 'Shirur, Maharashtra' });
      Alert.alert('Location Error', 'Could not get current location. Displaying data for a default location.');
    }
  };

  const loadData = async () => {
    setLoading(true);
    let weatherCoords = { lat: 18.8237, lon: 74.3732 };

    try {
      await loadCachedData();

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

      const [
        weatherResponse,
        soilResponse,
        combosResponse,
        healthResponse
      ] = await Promise.all([
        fetch(`${API_BASE}/weather/coords?lat=${weatherCoords.lat}&lon=${weatherCoords.lon}`).catch(() => null),
        fetch(`${API_BASE}/soil-moisture`).catch(() => null),
        fetch(`${API_BASE}/crop-intelligence/combos`).catch(() => null),
        fetch(`${API_BASE}/crop-intelligence/health`).catch(() => null)
      ]);

      if (weatherResponse && weatherResponse.ok) {
        const weatherData = await weatherResponse.json();
        setWeatherData(weatherData);
        await AsyncStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(weatherData));

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
        await healthResponse.json();
      } else {
        console.warn('Failed to fetch backend health or response not OK.');
      }

    } catch (error) {
      console.error('Error during data loading:', error);
      Alert.alert('Network Error', 'Could not fetch the latest data. Displaying cached data if available. Please check your internet connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const loadCachedData = async () => {
    let hasCachedData = false;
    try {
      const cachedWeather = await AsyncStorage.getItem(WEATHER_CACHE_KEY);
      const cachedForecast = await AsyncStorage.getItem(FORECAST_CACHE_KEY);
      const cachedAirQuality = await AsyncStorage.getItem(AIR_QUALITY_CACHE_KEY);
      const cachedSoil = await AsyncStorage.getItem(SOIL_CACHE_KEY);
      const cachedCombos = await AsyncStorage.getItem(CROP_COMBOS_CACHE_KEY);

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
        : 75;

      const requestData = {
        location: location.city,
        temperature: weatherData.main?.temp || 25,
        humidity: weatherData.main?.humidity || 70,
        soil_moisture: avgMoisture,
        season: getCurrentSeason(),
        farmer_experience: 'intermediate',
        available_investment: '₹50,000-1,00,000',
        farm_size: '2-3 hectares',
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
    const month = new Date().getMonth() + 1;
    if (month >= 3 && month <= 5) return 'summer';
    if (month >= 6 && month <= 9) return 'monsoon';
    if (month >= 10 || month <= 2) return 'winter';
    return 'unknown';
  };

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
    return Object.values(days).slice(0, 5).map(dayEntries => {
      let closestEntry = dayEntries[0];
      let minDiff = Infinity;
      dayEntries.forEach(entry => {
        const hour = new Date(entry.dt * 1000).getHours();
        const diff12 = Math.abs(hour - 12);
        const diff15 = Math.abs(hour - 15);
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
    if (!aqi) return '#757575';
    switch (aqi) {
      case 1: return '#4CAF50';
      case 2: return '#8BC34A';
      case 3: return '#FF9800';
      case 4: return '#FF5722';
      case 5: return '#f44336';
      default: return '#757575';
    }
  };

  const getAQIText = (aqi) => {
    if (!aqi) return 'Unknown';
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
      case 'beginner': case 'easy': return '#4CAF50';
      case 'intermediate': case 'medium': return '#FF9800';
      case 'advanced': case 'expert': case 'hard': return '#f44336';
      default: return '#2196F3';
    }
  };

  const getROIColor = (roi) => {
    if (!roi) return '#757575';
    const percentageMatch = roi.match(/(\d+)/);
    const percentage = percentageMatch ? parseInt(percentageMatch[1]) : 0;

    if (percentage >= 80) return '#4CAF50';
    if (percentage >= 50) return '#FF9800';
    return '#f44336';
  };

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

      const updatedCombos = cropCombos.map(combo =>
        combo.combo_id === editingCombo.combo_id || combo.name === editingCombo.name
          ? updatedCombo
          : combo
      );
      setCropCombos(updatedCombos);

      await AsyncStorage.setItem(CROP_COMBOS_CACHE_KEY, JSON.stringify(updatedCombos));

      setShowEditModal(false);
      setSelectedCombo(updatedCombo);
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

  const handleLanguageChange = (newLanguage) => {
    console.log('Language changed to:', newLanguage);
  };

  const convertAIRecommendationsToResponseCards = (aiData) => {
    if (!aiData || !aiData.recommendations) return [];

    const cards = [];

    if (aiData.recommendations && Array.isArray(aiData.recommendations)) {
      aiData.recommendations.forEach((rec, index) => {
        cards.push({
          id: `rec-${index}`,
          type: 'recommendation',
          title: rec.combo_name || `Crop Recommendation ${index + 1}`,
          description: `AI-powered recommendation based on current conditions`,
          keyPoints: rec.key_points || [],
          actions: rec.action_plan || [],
          metrics: {
            'Expected ROI': rec.expected_roi || 'N/A',
            'Risk Level': rec.risk_level || 'N/A',
            'Timeline': rec.timeline || 'N/A'
          },
          confidence: rec.confidence_score || 0
        });
      });
    }

    if (aiData.weather_insights && Array.isArray(aiData.weather_insights) && aiData.weather_insights.length > 0) {
      cards.push({
        id: 'weather-insights',
        type: 'analysis',
        title: 'Weather Analysis',
        description: 'Current weather conditions and their impact on farming',
        keyPoints: aiData.weather_insights,
        actions: [],
        metrics: {},
        confidence: 85
      });
    }

    if (aiData.market_insights && Array.isArray(aiData.market_insights) && aiData.market_insights.length > 0) {
      cards.push({
        id: 'market-insights',
        type: 'analysis',
        title: 'Market Trends',
        description: 'Current market conditions and price trends',
        keyPoints: aiData.market_insights,
        actions: [],
        metrics: {},
        confidence: 80
      });
    }

    if (aiData.action_plan && Array.isArray(aiData.action_plan) && aiData.action_plan.length > 0) {
      cards.push({
        id: 'action-plan',
        type: 'recommendation',
        title: 'Action Plan',
        description: 'Step-by-step action plan for optimal farming',
        keyPoints: [],
        actions: aiData.action_plan,
        metrics: {},
        confidence: 90
      });
    }

    return cards;
  };

  const toggleCardExpansion = (cardId) => {
    setExpandedCardId(expandedCardId === cardId ? null : cardId);
  };

  const handleResponseCardPress = (response) => {
    console.log('Response card pressed:', response);
    Alert.alert(
      response.title,
      'What would you like to do with this recommendation?',
      [
        {
          text: 'Save to Collection',
          onPress: () => {
            Alert.alert('Saved', 'Response saved to your collection');
          }
        },
        {
          text: 'Share',
          onPress: () => {
            Alert.alert('Share', 'Sharing response...');
          }
        },
        {
          text: 'View Details',
          onPress: () => {
            toggleCardExpansion(response.id);
          }
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  const InteractiveGuideTooltip = ({ step, onNext, onClose }) => {
    if (!step) return null;

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

  const ResponseCard = ({ response, onPress, isExpanded, onToggleExpand }) => {
    if (!response) return null;

    const getResponseTypeIcon = (type) => {
      switch (type?.toLowerCase()) {
        case 'recommendation':
          return 'lightbulb-outline';
        case 'analysis':
          return 'chart-line';
        case 'warning':
          return 'alert-circle';
        case 'success':
          return 'check-circle';
        default:
          return 'information-outline';
      }
    };

    const getResponseTypeColor = (type) => {
      switch (type?.toLowerCase()) {
        case 'recommendation':
          return '#00C853';
        case 'analysis':
          return '#2196F3';
        case 'warning':
          return '#FF9800';
        case 'success':
          return '#4CAF50';
        default:
          return '#757575';
      }
    };

    return (
      <TouchableOpacity
        style={[styles.responseCard, isExpanded && styles.responseCardExpanded]}
        onPress={() => onPress && onPress(response)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#2A2A2A', '#1A1A1A']}
          style={styles.responseCardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.responseCardHeader}>
            <View style={styles.responseCardTitleRow}>
              <MaterialCommunityIcons
                name={getResponseTypeIcon(response.type)}
                size={24}
                color={getResponseTypeColor(response.type)}
              />
              <View style={styles.responseCardTitleContainer}>
                <Text style={styles.responseCardTitle}>{safeText(response?.title, 'Untitled')}</Text>
                <Text style={styles.responseCardSubtitle}>{safeText(response?.type, 'General')}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.responseCardExpandButton}
              onPress={onToggleExpand}
            >
              <Ionicons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#E0E0E0"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.responseCardContent}>
            <Text style={styles.responseCardDescription}>{safeText(response?.description, 'No description available')}</Text>

            {isExpanded && (
              <View style={styles.responseCardExpandedContent}>
                {response.keyPoints && response.keyPoints.length > 0 && (
                  <View style={styles.responseCardSection}>
                    <Text style={styles.responseCardSectionTitle}>Key Points</Text>
                    {response.keyPoints.map((point, index) => (
                      <View key={index} style={styles.responseCardBulletPoint}>
                        <MaterialCommunityIcons name="circle" size={6} color={getResponseTypeColor(response.type)} />
                        <Text style={styles.responseCardBulletText}>{point}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {response.actions && response.actions.length > 0 && (
                  <View style={styles.responseCardSection}>
                    <Text style={styles.responseCardSectionTitle}>Recommended Actions</Text>
                    {response.actions.map((action, index) => (
                      <View key={index} style={styles.responseCardActionItem}>
                        <View style={[styles.responseCardActionNumber, { backgroundColor: getResponseTypeColor(response.type) }]}>
                          <Text style={styles.responseCardActionNumberText}>{index + 1}</Text>
                        </View>
                        <Text style={styles.responseCardActionText}>{action}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {response.metrics && Object.keys(response.metrics).length > 0 && (
                  <View style={styles.responseCardSection}>
                    <Text style={styles.responseCardSectionTitle}>Metrics</Text>
                    <View style={styles.responseCardMetrics}>
                      {Object.entries(response.metrics).map(([key, value]) => (
                        <View key={key} style={styles.responseCardMetric}>
                          <Text style={styles.responseCardMetricLabel}>{key}</Text>
                          <Text style={styles.responseCardMetricValue}>{value}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {response.confidence && (
                  <View style={styles.responseCardSection}>
                    <Text style={styles.responseCardSectionTitle}>Confidence Score</Text>
                    <View style={styles.responseCardConfidence}>
                      <View style={styles.responseCardConfidenceBar}>
                        <View
                          style={[
                            styles.responseCardConfidenceFill,
                            {
                              width: `${response.confidence}%`,
                              backgroundColor: getResponseTypeColor(response.type)
                            }
                          ]}
                        />
                      </View>
                      <Text style={styles.responseCardConfidenceText}>{response.confidence}%</Text>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>

          <View style={styles.responseCardFooter}>
            <Text style={styles.responseCardTimestamp}>
              {new Date().toLocaleTimeString()}
            </Text>
            <View style={styles.responseCardActions}>
              <TouchableOpacity
                style={styles.responseCardActionButton}
                onPress={() => {
                  Alert.alert('Saved', 'Response saved to your collection');
                }}
              >
                <Ionicons name="bookmark-outline" size={16} color="#E0E0E0" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.responseCardActionButton}
                onPress={() => {
                  Alert.alert('Share', 'Sharing response...');
                }}
              >
                <Ionicons name="share-outline" size={16} color="#E0E0E0" />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <LinearGradient
        colors={['#000000', '#1A237E', '#0A114A']}
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
              <Text style={styles.headerTitle}>{'Crop Intelligence'}</Text>
              <View style={styles.locationContainer}>
                <Ionicons name="location-sharp" size={16} color="rgba(255,255,255,0.8)" />
                <Text style={styles.headerSubtitle}>
                  {safeText(location?.city, 'Fetching location...')}
                </Text>
              </View>
            </View>

            <View style={styles.headerActions}>
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
                      {safeText(weatherData?.main?.temp ? Math.round(weatherData.main.temp) : 0)}°C
                    </Text>
                    <Text style={styles.currentWeatherDescription}>
                      {safeText(
                        weatherData?.weather?.[0]?.description
                          ? weatherData.weather[0].description.toUpperCase()
                          : 'N/A'
                      )}
                    </Text>
                  </View>
                </View>

                <View style={styles.currentWeatherDetailsGrid}>
                  <View style={styles.weatherDetailItem}>
                    <MaterialCommunityIcons name="water-percent" size={20} color="#A7FFEB" />
                    <Text style={styles.weatherDetailValue}>{weatherData.main?.humidity || 0}%</Text>
                    <Text style={styles.weatherDetailLabel}>{'Humidity'}</Text>
                  </View>
                  <View style={styles.weatherDetailItem}>
                    <MaterialCommunityIcons name="weather-windy" size={20} color="#82B1FF" />
                    <Text style={styles.weatherDetailValue}>
                      {weatherData.wind?.speed ? (weatherData.wind.speed * 3.6).toFixed(1) : '0'} km/h
                    </Text>
                    <Text style={styles.weatherDetailLabel}>{'Wind'}</Text>
                  </View>
                  {airQualityData?.list?.[0]?.main?.aqi && (
                    <View style={styles.weatherDetailItem}>
                      <MaterialCommunityIcons name="air-filter" size={20} color={getAQIColor(airQualityData.list[0].main.aqi)} />
                      <Text style={styles.weatherDetailValue}>{getAQIText(airQualityData.list[0].main.aqi) || 'N/A'}</Text>
                      <Text style={styles.weatherDetailLabel}>{'Air Quality'}</Text>
                    </View>
                  )}
                  {soilData.length > 0 && (
                    <View style={styles.weatherDetailItem}>
                      <MaterialCommunityIcons name="water" size={20} color="#C5E1A5" />
                      <Text style={styles.weatherDetailValue}>
                        {Math.round(soilData.reduce((sum, item) => sum + (item.moisture || 0), 0) / soilData.length) || 0}%
                      </Text>
                      <Text style={styles.weatherDetailLabel}>{'Soil Moisture'}</Text>
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
            {'Crop Combos'}
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
            {'AI Recommendations'}
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
            <Text style={styles.comboTitle}>{safeText(combo?.name, 'Unnamed Combo')}</Text>
            <Text style={styles.comboSeason}>{safeText(combo?.season, 'Unknown Season')}</Text>
          </View>
          <View style={[
            styles.difficultyBadge,
            { backgroundColor: getDifficultyColor(combo.difficulty) }
          ]}>
            <Text style={styles.difficultyText}>{combo.difficulty || 'Beginner'}</Text>
          </View>
        </View>

        <Text style={styles.comboDescription}>{safeText(combo?.description, 'No description available')}</Text>

        <View style={styles.cropsList}>
          {combo?.crops?.slice(0, 3).map((crop, index) => (
            <View key={index} style={styles.cropTag}>
              <Text style={styles.cropTagText}>{safeText(crop, '')}</Text>
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
            <Text style={styles.statText}>{combo.total_investment || 'N/A'}</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="trending-up" size={18} color={getROIColor(combo.roi_percentage)} />
            <Text style={[styles.statText, { color: getROIColor(combo.roi_percentage) }]}>
              {combo.roi_percentage || 'N/A'}
            </Text>
          </View>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="clock-outline" size={18} color="#757575" />
            <Text style={styles.statText}>{combo.duration || 'N/A'}</Text>
          </View>
        </View>

        <View style={styles.comboFooter}>
          <View style={styles.successRate}>
            <MaterialCommunityIcons name="check-circle" size={16} color="#4CAF50" />
            <Text style={styles.successRateText}>{combo.success_rate || 'N/A'} Success</Text>
          </View>
          <Text style={styles.farmersUsing}>{combo.farmers_using || 'Unknown'}</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderAIRecommendations = () => (
    <View style={styles.aiSection}>
      <Text style={styles.sectionTitle}>{'AI Recommendations'}</Text>

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

      {responseCards.length > 0 ? (
        <View style={styles.responseCardsContainer}>
          <View style={styles.responseCardsSummary}>
            <Text style={styles.responseCardsSummaryText}>
              {`${responseCards.length} recommendation${responseCards.length !== 1 ? 's' : ''} generated`}
            </Text>
            <View style={styles.responseCardsStats}>
              <View style={styles.responseCardStat}>
                <MaterialCommunityIcons name="lightbulb-outline" size={16} color="#00C853" />
                <Text style={styles.responseCardStatText}>
                  {responseCards.filter(card => card.type === 'recommendation').length} {'Recommendations'}
                </Text>
              </View>
              <View style={styles.responseCardStat}>
                <MaterialCommunityIcons name="chart-line" size={16} color="#2196F3" />
                <Text style={styles.responseCardStatText}>
                  {responseCards.filter(card => card.type === 'analysis').length} {'Analysis'}
                </Text>
              </View>
            </View>
          </View>

          {responseCards.map((card) => (
            <ResponseCard
              key={card.id}
              response={card}
              onPress={handleResponseCardPress}
              isExpanded={expandedCardId === card.id}
              onToggleExpand={() => toggleCardExpansion(card.id)}
            />
          ))}
        </View>
      ) : aiRecommendations ? (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="robot-happy-outline" size={64} color="#ccc" />
          <Text style={styles.emptyStateText}>{'Processing recommendations...'}</Text>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="robot-happy-outline" size={64} color="#ccc" />
          <Text style={styles.emptyStateText}>{'Tap the button above to generate AI recommendations'}</Text>
        </View>
      )}
    </View>
  );

  if (loading && !weatherData && !cropCombos.length) {
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
              tintColor="#00C853"
              colors={['#00C853', '#1A237E']}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {renderHeader()}
          {renderForecastSection()}
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

      <Modal
        visible={showComboModal}
        animationType="slide"
        presentationStyle="pageSheet"
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
                    <Text style={styles.modalTitle}>{safeText(selectedCombo?.name, 'Crop Combo Details')}</Text>
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
              <Text style={styles.modalDescription}>{safeText(selectedCombo?.description, 'No description available')}</Text>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Crops Included</Text>
                <View style={styles.modalCropsList}>
                  {selectedCombo?.crops?.map((crop, index) => (
                    <View key={index} style={styles.modalCropTag}>
                      <Text style={styles.modalCropTagText}>{safeText(crop, '')}</Text>
                    </View>
                  )) || (
                      <Text style={styles.modalDescription}>No crops specified</Text>
                    )}
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

      {showOnboarding && ONBOARDING_STEPS[currentOnboardingStep] && (
        <InteractiveGuideTooltip
          step={ONBOARDING_STEPS[currentOnboardingStep]}
          onNext={nextOnboardingStep}
          onClose={completeOnboarding}
        />
      )}

      {__DEV__ && (
        <View style={styles.tourButtonsContainer}>
          <TouchableOpacity
            style={styles.restartTourButton}
            onPress={startOnboardingTour}
          >
            <MaterialCommunityIcons name="replay" size={20} color="#10B981" />
            <Text style={styles.restartTourText}>Tour</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.resetTourButton}
            onPress={resetOnboarding}
          >
            <MaterialCommunityIcons name="refresh" size={16} color="#EF4444" />
            <Text style={styles.resetTourText}>Reset</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default CropIntelligenceScreen;