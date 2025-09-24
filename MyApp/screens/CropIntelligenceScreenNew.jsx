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
import { useTranslation } from 'react-i18next'; // Import useTranslation
import { useTheme } from '../context/ThemeContext';

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
  const { theme, isDark, toggleTheme } = useTheme();
  const { t } = useTranslation();
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

  // Measured tooltip position for onboarding (dynamic)
  const [onboardingTooltipPos, setOnboardingTooltipPos] = useState(null); // { x, y, width, height }

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
      title: t('cropintel.onboarding.nav_title'),
      content: t('cropintel.onboarding.nav_content'),
      targetElement: 'back-button',
      position: { top: 100, left: 20 },
      arrowPosition: 'top'
    },
    {
      id: 'weather_section',
      title: t('cropintel.onboarding.weather_title'),
      content: t('cropintel.onboarding.weather_content'),
      targetElement: 'weather-section',
      position: { top: 200, alignSelf: 'center' },
      arrowPosition: 'top'
    },
    {
      id: 'tabs_section',
      title: t('cropintel.onboarding.tabs_title'),
      content: t('cropintel.onboarding.tabs_content'),
      targetElement: 'tabs-section',
      position: { top: 350, alignSelf: 'center' },
      arrowPosition: 'top'
    },
    {
      id: 'combo_cards',
      title: t('cropintel.onboarding.combos_title'),
      content: t('cropintel.onboarding.combos_content'),
      targetElement: 'combo-cards',
      position: { top: 450, left: 20 },
      arrowPosition: 'top'
    },
    {
      id: 'combo_details',
      title: t('cropintel.onboarding.details_title'),
      content: t('cropintel.onboarding.details_content'),
      targetElement: 'combo-card-item',
      position: { top: 500, left: 20 },
      arrowPosition: 'top'
    },
    {
      id: 'ai_tab',
      title: t('cropintel.onboarding.ai_title'),
      content: t('cropintel.onboarding.ai_content'),
      targetElement: 'ai-tab',
      position: { top: 400, right: 20 },
      arrowPosition: 'top'
    },
    {
      id: 'generate_plan',
      title: t('cropintel.onboarding.plan_title'),
      content: t('cropintel.onboarding.plan_content'),
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

  // When onboarding steps or window dims change, re-measure current target
  useEffect(() => {
    if (showOnboarding) {
      // small timeout to ensure layout finished
      const id = setTimeout(() => measureCurrentOnboardingTarget(), 200);
      return () => clearTimeout(id);
    }
  }, [showOnboarding, currentOnboardingStep, screenDimensions]);

  const measureCurrentOnboardingTarget = () => {
    try {
      const step = ONBOARDING_STEPS[currentOnboardingStep];
      if (!step) return;

      let refToMeasure = null;
      switch (step.targetElement) {
        case 'back-button':
          refToMeasure = backButtonRef;
          break;
        case 'weather-section':
          refToMeasure = weatherSectionRef;
          break;
        case 'tabs-section':
          refToMeasure = tabsSectionRef;
          break;
        case 'combo-cards':
        case 'combo-card-item':
          refToMeasure = comboCardsRef;
          break;
        case 'ai-tab':
        case 'ai-tab':
          refToMeasure = aiTabRef;
          break;
        default:
          refToMeasure = null;
      }

      if (refToMeasure && refToMeasure.current && typeof refToMeasure.current.measureInWindow === 'function') {
        refToMeasure.current.measureInWindow((x, y, w, h) => {
          setOnboardingTooltipPos({ x, y, width: w, height: h });
        });
      } else {
        // fallback to step.position
        setOnboardingTooltipPos(null);
      }
    } catch (e) {
      console.warn('Failed to measure onboarding target', e);
      setOnboardingTooltipPos(null);
    }
  };

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
        Alert.alert(
          t('permission.denied', 'Permission Denied'),
          t('cropintel.location_denied', 'Location permission was denied. Displaying data for a default location.')
        );
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
      Alert.alert(t('cropintel.location_error_title'), t('cropintel.location_error_message'));
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
      Alert.alert(t('common.network_error_title'), t('common.network_error_message'));
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
      Alert.alert(t('common.info'), t('cropintel.ai.data_unavailable'));
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
        Alert.alert(t('common.error'), data.message || t('cropintel.ai.failed'));
      }
    } catch (error) {
      console.error('Error getting AI recommendations:', error);
      Alert.alert(t('common.error'), t('cropintel.ai.failed_details', { details: error.message }));
      try {
        const cached = await AsyncStorage.getItem(AI_RECOMMENDATIONS_CACHE_KEY);
        if (cached) {
          setAiRecommendations(JSON.parse(cached));
          Alert.alert(t('common.info'), t('cropintel.ai.loaded_cache'));
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
      case 4: return '#f44336';
      case 5: return '#f44336';
      default: return '#757575';
    }
  };

  const getAQIText = (aqi) => {
    if (!aqi) return t('common.unknown');
    const key = `cropintel.weather.aqi_${aqi}`;
    const fallback = ['Good', 'Fair', 'Moderate', 'Poor', 'Very Poor'][aqi-1] || 'Unknown';
    return t(key, fallback);
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
      Alert.alert(t('common.error'), t('cropintel.edit.name_required'));
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
      Alert.alert(t('common.success'), t('cropintel.edit.save_success'));
    } catch (error) {
      console.error('Error saving combo:', error);
      Alert.alert(t('common.error'), t('cropintel.edit.save_failed'));
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
      Alert.alert(t('common.reset_complete'), t('common.reset_message'));
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
          title: rec.combo_name || `${t('cropintel.ai.recommendation')} ${index + 1}`,
          description: t('cropintel.ai.recommendation_desc'),
          keyPoints: rec.key_points || [],
          actions: rec.action_plan || [],
          metrics: {
            [t('cropintel.combo.roi')]: rec.expected_roi || 'N/A',
            [t('cropintel.ai.risk_level')]: rec.risk_level || 'N/A',
            [t('cropintel.combo.duration')]: rec.timeline || 'N/A'
          },
          confidence: rec.confidence_score || 0
        });
      });
    }

    if (aiData.weather_insights && Array.isArray(aiData.weather_insights) && aiData.weather_insights.length > 0) {
      cards.push({
        id: 'weather-insights',
        type: 'analysis',
        title: t('cropintel.ai.weather_analysis'),
        description: t('cropintel.ai.weather_analysis_desc'),
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
        title: t('cropintel.ai.market_trends'),
        description: t('cropintel.ai.market_trends_desc'),
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
        title: t('cropintel.ai.action_plan'),
        description: t('cropintel.ai.action_plan_desc'),
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
      t('cropintel.ai.response_prompt'),
      [
        {
          text: t('common.save_collection'),
          onPress: () => {
            Alert.alert(t('common.saved'), t('common.saved_message'));
          }
        },
        {
          text: t('common.share'),
          onPress: () => {
            Alert.alert(t('common.share'), t('common.sharing_message'));
          }
        },
        {
          text: t('common.view_details'),
          onPress: () => {
            toggleCardExpansion(response.id);
          }
        },
        {
          text: t('common.cancel'),
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
        backgroundColor: theme.colors.card || '#1E293B',
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

      // If we have a measured target position, position tooltip relative to it
      const measured = onboardingTooltipPos;
      if (measured) {
        const tooltipWidth = 280;
        // prefer to show tooltip above the element unless arrowPosition is bottom
        if (step.arrowPosition === 'bottom') {
          style.top = measured.y + measured.height + 12; // Arrow height + gap
          style.left = Math.max(8, measured.x + measured.width / 2 - tooltipWidth / 2);
        } else {
          // Estimate tooltip height (approx 120-150) + arrow height + gap
          const tooltipHeight = 140; 
          style.top = Math.max(40, measured.y - tooltipHeight - 12); 
          style.left = Math.max(8, measured.x + measured.width / 2 - tooltipWidth / 2);
        }
      } else {
        if (step.position.top !== undefined) style.top = step.position.top;
        if (step.position.bottom !== undefined) style.bottom = step.position.bottom;
        if (step.position.left !== undefined) style.left = step.position.left;
        if (step.position.right !== undefined) style.right = step.position.right;
        if (step.position.alignSelf) style.alignSelf = step.position.alignSelf;
      }

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
          backgroundColor: theme.colors.overlay || 'rgba(0, 0, 0, 0.7)',
          zIndex: 999,
        }} />
        <View style={getTooltipStyle()}>
          <View style={getArrowStyle()} />
          <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>
            {step.title}
          </Text>
          <Text style={{ color: theme.colors.textSecondary || '#CBD5E1', fontSize: 14, lineHeight: 20, marginBottom: 16 }}>
            {step.content}
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: theme.colors.textSecondary || '#94A3B8', fontSize: 12 }}>
              {currentOnboardingStep + 1} of {ONBOARDING_STEPS.length}
            </Text>
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity onPress={onClose} style={{ marginRight: 16 }}>
                <Text style={{ color: theme.colors.textSecondary || '#94A3B8', fontSize: 14 }}>{t('common.skip')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onNext}
                style={{
                  backgroundColor: theme.colors.primary || '#00C853',
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: theme.colors.onPrimary || theme.colors.headerTitle || '#FFFFFF', fontSize: 14, fontWeight: '600' }}>
                  {currentOnboardingStep === ONBOARDING_STEPS.length - 1 ? t('common.finish') : t('common.next')}
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
        case 'recommendation': return 'lightbulb-outline';
        case 'analysis': return 'chart-line';
        case 'warning': return 'alert-circle';
        case 'success': return 'check-circle';
        default: return 'information-outline';
      }
    };

    const getResponseTypeColor = (type) => {
      switch (type?.toLowerCase()) {
        case 'recommendation': return '#00C853';
        case 'analysis': return '#2196F3';
        case 'warning': return '#FF9800';
        case 'success': return '#4CAF50';
        default: return '#757575';
      }
    };

    return (
      <TouchableOpacity
        style={[styles.responseCard, isExpanded && styles.responseCardExpanded]}
        onPress={() => onPress && onPress(response)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={[theme.colors.card || '#2A2A2A', theme.colors.surface || '#1A1A1A']}
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
                <Text style={styles.responseCardTitle}>{safeText(response?.title, t('common.untitled'))}</Text>
                <Text style={styles.responseCardSubtitle}>{safeText(response?.type, t('common.general'))}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.responseCardExpandButton}
              onPress={onToggleExpand}
            >
              <Text><Ionicons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={theme.colors.textSecondary}
              /></Text>
            </TouchableOpacity>
          </View>

          <View style={styles.responseCardContent}>
            <Text style={styles.responseCardDescription}>{safeText(response?.description, t('common.no_description'))}</Text>

            {isExpanded && (
              <View style={styles.responseCardExpandedContent}>
                {response.keyPoints && response.keyPoints.length > 0 && (
                  <View style={styles.responseCardSection}>
                    <Text style={styles.responseCardSectionTitle}>{t('cropintel.ai.key_points')}</Text>
                    {response.keyPoints.map((point, index) => (
                      <View key={index} style={styles.responseCardBulletPoint}>
                        <MaterialCommunityIcons name="circle" size={6} color={getResponseTypeColor(response.type)} />
                        <Text style={[styles.responseCardBulletText, { color: theme.colors.text }]}>{point}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {response.actions && response.actions.length > 0 && (
                  <View style={styles.responseCardSection}>
                    <Text style={styles.responseCardSectionTitle}>{t('cropintel.ai.recommended_actions')}</Text>
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
                    <Text style={styles.responseCardSectionTitle}>{t('cropintel.ai.metrics')}</Text>
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
                    <Text style={styles.responseCardSectionTitle}>{t('cropintel.ai.confidence')}</Text>
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
            <Text style={[styles.responseCardTimestamp, { color: theme.colors.textSecondary }]}>
              {new Date().toLocaleTimeString()}
            </Text>
            <View style={styles.responseCardActions}>
              <TouchableOpacity
                style={styles.responseCardActionButton}
                onPress={() => {
                  Alert.alert(t('common.saved'), t('common.saved_message'));
                }}
              >
                <Ionicons name="bookmark-outline" size={16} color={theme.colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.responseCardActionButton}
                onPress={() => {
                  Alert.alert(t('common.share'), t('common.sharing_message'));
                }}
              >
                <Ionicons name="share-outline" size={16} color={theme.colors.textSecondary} />
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
        colors={[theme.colors.background, theme.colors.background]}
        style={styles.headerGradient}
      >
        <SafeAreaView>
          <View style={styles.headerContent}>
            <TouchableOpacity
              ref={backButtonRef}
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Text><Ionicons name="arrow-back" size={24} color={theme.colors.text} /></Text>
            </TouchableOpacity>

            <Text style={styles.headerTitle}>{t('cropintel.title')}</Text>

            <TouchableOpacity onPress={startOnboardingTour} style={styles.helpButton}>
              <Text><MaterialCommunityIcons name="help-circle-outline" size={26} color={theme.colors.text} /></Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleTheme} style={styles.themeToggleButton}>
                <Text><Ionicons name={isDark ? "sunny" : "moon"} size={24} color={theme.colors.text} /></Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );

  const renderWeatherSection = () => (
    weatherData && (
      <View ref={weatherSectionRef} style={[styles.weatherSection, { backgroundColor: theme.colors.card }]}>
        <View style={styles.weatherHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{t('cropintel.weather.current_weather')}</Text>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={loadData}
          >
            <MaterialCommunityIcons name="refresh" size={20} color={theme.colors.text} />
            <Text style={{ color: theme.colors.text }}>{t('common.refresh')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.weatherContent}>
          <View style={styles.weatherMain}>
            <Image
              source={{ uri: getWeatherIcon(weatherData.weather[0].icon) }}
              style={styles.weatherIcon}
            />
            <Text style={[styles.weatherTemp, { color: theme.colors.text }]}>
              {Math.round(weatherData.main.temp)}°C
            </Text>
          </View>

          <View style={styles.weatherDetails}>
            <View style={styles.weatherDetailItem}>
              <MaterialCommunityIcons name="water" size={16} color={theme.colors.textSecondary} />
              <Text style={[styles.weatherDetailText, { color: theme.colors.text }]}>
                {weatherData.main.humidity}% {t('cropintel.weather.humidity')}
              </Text>
            </View>
            <View style={styles.weatherDetailItem}>
              <MaterialCommunityIcons name="wind" size={16} color={theme.colors.textSecondary} />
              <Text style={[styles.weatherDetailText, { color: theme.colors.text }]}>
                {Math.round(weatherData.wind.speed)} {t('cropintel.weather.wind_speed')}
              </Text>
            </View>
            <View style={styles.weatherDetailItem}>
              <MaterialCommunityIcons name="gauge" size={16} color={theme.colors.textSecondary} />
              <Text style={[styles.weatherDetailText, { color: theme.colors.text }]}>
                {weatherData.main.pressure} hPa {t('cropintel.weather.pressure')}
              </Text>
            </View>
          </View>
        </View>
      </View>
    )
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
          color={activeTab === 'combos' ? theme.colors.primary : theme.colors.textSecondary}
        />
        <Text style={[
          styles.tabText,
          activeTab === 'combos' && styles.activeTabText,
          { color: activeTab === 'combos' ? theme.colors.primary : theme.colors.text }
        ]}>
          {t('cropintel.tabs.combos', 'Crop Combos')}
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
          color={activeTab === 'ai' ? theme.colors.primary : theme.colors.textSecondary}
        />
        <Text style={[
          styles.tabText,
          activeTab === 'ai' && styles.activeTabText,
          { color: activeTab === 'ai' ? theme.colors.primary : theme.colors.text }
        ]}>
          {t('cropintel.tabs.ai', 'AI Recommendations')}
        </Text>
      </TouchableOpacity>
    </View>
  </View>
);

  const renderForecastSection = () => (
    forecastData?.list && (
      <View style={[styles.forecastSection, { backgroundColor: theme.colors.background }]}>
          <View style={styles.sectionHeaderRow}>
              <MaterialCommunityIcons name="calendar-week" size={22} color={theme.colors.textSecondary || '#333'} />
              <Text style={[styles.subSectionTitle, { color: theme.colors.text }]}>{t('cropintel.weather.forecast_title')}</Text>
            </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.forecastScroll}>
          {groupForecastByDay(forecastData.list).map((dayForecast, idx) => (
            <LinearGradient
              key={idx}
              colors={[theme.colors.surface || '#FFFFFF', theme.colors.card || '#F0F0F0']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.forecastCard, { borderColor: theme.colors.border }]}
            >
              <Text style={[styles.forecastDate, { color: theme.colors.textSecondary }]}>{formatDate(dayForecast.dt)}</Text>
              {dayForecast.weather?.[0]?.icon && (
                <Image
                  source={{ uri: getWeatherIcon(dayForecast.weather[0].icon) }}
                  style={styles.forecastIcon}
                />
              )}
              <Text style={[styles.forecastTemp, { color: theme.colors.text }]}>
                {Math.round(dayForecast.main.temp)}°C
              </Text>
              <Text style={[styles.forecastDesc, { color: theme.colors.textSecondary }]}>
                {dayForecast.weather[0].main}
              </Text>
              <View style={styles.forecastDetails}>
                <Text style={[styles.forecastLabel, { color: theme.colors.textSecondary }]}>{t('cropintel.weather.rain')}</Text>
                <Text style={[styles.forecastValue, { color: theme.colors.text }]}>
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
      style={[styles.comboCard, { backgroundColor: theme.colors.card }]}
      onPress={() => {
        setSelectedCombo(combo);
        setShowComboModal(true);
      }}
    >
        <LinearGradient
          colors={[theme.colors.surface || '#ffffff', theme.colors.card || '#f8f9fa']}
          style={styles.comboCardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
        <View style={styles.comboHeader}>
          <View style={styles.comboTitleContainer}>
            <Text style={[styles.comboTitle, { color: theme.colors.text }]}>{safeText(combo?.name, t('cropintel.combo.unnamed'))}</Text>
            <Text style={[styles.comboSeason, { color: theme.colors.textSecondary }]}>{safeText(combo?.season, t('cropintel.combo.unknown_season'))}</Text>
          </View>
          <View style={[
            styles.difficultyBadge,
            { backgroundColor: getDifficultyColor(combo.difficulty) }
          ]}>
            <Text style={[styles.difficultyText, { color: theme.colors.onPrimary || theme.colors.text }]}>{combo.difficulty || t('cropintel.combo.beginner')}</Text>
          </View>
        </View>

        <Text style={[styles.comboDescription, { color: theme.colors.text }]}>{safeText(combo?.description, t('common.no_description'))}</Text>

        <View style={styles.cropsList}>
          {combo?.crops?.slice(0, 3).map((crop, index) => (
            <View key={index} style={styles.cropTag}>
              <Text style={[styles.cropTagText, { color: theme.colors.text }]}>{safeText(crop, '')}</Text>
            </View>
          ))}
          {combo.crops?.length > 3 && (
            <View style={styles.cropTag}>
              <Text style={[styles.cropTagText, { color: theme.colors.text }]}>+{combo.crops.length - 3}</Text>
            </View>
          )}
        </View>

        <View style={styles.comboStats}>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="currency-inr" size={18} color={theme.colors.success || '#00C853'} />
            <Text style={[styles.statText, { color: theme.colors.text }]}>{combo.total_investment || t('common.na')}</Text>
          </View>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="trending-up" size={18} color={getROIColor(combo.roi_percentage)} />
            <Text style={[styles.statText, { color: getROIColor(combo.roi_percentage) }]}>
              {combo.roi_percentage || t('common.na')}
            </Text>
          </View>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="clock-outline" size={18} color={theme.colors.textSecondary || '#757575'} />
            <Text style={[styles.statText, { color: theme.colors.text }]}>{combo.duration || t('common.na')}</Text>
          </View>
        </View>

        <View style={styles.comboFooter}>
          <View style={styles.successRate}>
            <MaterialCommunityIcons name="check-circle" size={16} color={theme.colors.success || '#4CAF50'} />
            <Text style={[styles.successRateText, { color: theme.colors.text }]}>{combo.success_rate || t('common.na')} {t('cropintel.combo.success')}</Text>
          </View>
          <Text style={[styles.farmersUsing, { color: theme.colors.textSecondary }]}>{combo.farmers_using || t('common.unknown')}</Text>
        </View>
        </LinearGradient>
    </TouchableOpacity>
  );

  const renderAIRecommendations = () => (
    <View style={[styles.aiSection, { backgroundColor: theme.colors.background }]}>
      <Text style={styles.sectionTitle}>{t('cropintel.tabs.ai')}</Text>

      <View style={styles.aiButtonContainer}>
        <TouchableOpacity
          style={[styles.aiButton, aiLoading && styles.aiButtonDisabled]}
          onPress={getAIRecommendations}
          disabled={aiLoading}
        >
          {aiLoading ? (
            <ActivityIndicator size="small" color={theme.colors.onPrimary || theme.colors.headerTitle} />
          ) : (
            <MaterialCommunityIcons name="robot" size={20} color={theme.colors.onPrimary || theme.colors.headerTitle} />
          )}
          <Text style={styles.aiButtonText}>
            {aiLoading ? t('cropintel.ai.analyzing') : t('cropintel.ai.generate_plan')}
          </Text>
        </TouchableOpacity>
      </View>

      {responseCards.length > 0 ? (
        <View style={styles.responseCardsContainer}>
            <View style={styles.responseCardsSummary}>
            <Text style={[styles.responseCardsSummaryText, { color: theme.colors.text }]}>
              {t('cropintel.ai.recommendations_generated', { count: responseCards.length })}
            </Text>
            <View style={styles.responseCardsStats}>
              <View style={styles.responseCardStat}>
                <MaterialCommunityIcons name="lightbulb-outline" size={16} color={theme.colors.primary} />
                <Text style={[styles.responseCardStatText, { color: theme.colors.text }]}>
                  {responseCards.filter(card => card.type === 'recommendation').length} {t('cropintel.ai.recommendations')}
                </Text>
              </View>
              <View style={styles.responseCardStat}>
                <MaterialCommunityIcons name="chart-line" size={16} color={theme.colors.info || '#2196F3'} />
                <Text style={[styles.responseCardStatText, { color: theme.colors.text }]}>
                  {responseCards.filter(card => card.type === 'analysis').length} {t('cropintel.ai.analysis')}
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
          <Text style={styles.emptyStateText}>{t('cropintel.ai.processing')}</Text>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="robot-happy-outline" size={64} color="#ccc" />
          <Text style={styles.emptyStateText}>{t('cropintel.ai.prompt')}</Text>
        </View>
      )}
    </View>
  );

  if (loading && !weatherData && !cropCombos.length) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.text }]}>{t('cropintel.loading_initial')}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />

      <Animated.View
        style={[
          styles.content,
          {
            backgroundColor: theme.colors.background,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <ScrollView
          style={[styles.scrollView, { backgroundColor: theme.colors.background }]}
          refreshControl={
            <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.colors.primary}
                colors={[theme.colors.primary, theme.colors.accent || theme.colors.primary]}
              />
          }
          showsVerticalScrollIndicator={false}
        >
          {renderHeader()}
          {renderWeatherSection()}
          {renderTabBar()}

          {activeTab === 'combos' && (
            <View ref={comboCardsRef} style={[styles.combosSection ]}>
              <Text style={styles.sectionTitle}>{t('cropintel.combo.available_combos')}</Text>
              {cropCombos.length > 0 ? (
                cropCombos.map((combo, index) => renderCropComboCard(combo))
              ) : (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="seed-off" size={64} color="#ccc" />
                  <Text style={styles.emptyStateText}>{t('cropintel.combo.no_combos')}</Text>
                  <TouchableOpacity style={styles.retryButton} onPress={loadData}>
                    <Text style={styles.retryButtonText}>{t('common.refresh_data')}</Text>
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
          <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
            <LinearGradient
              colors={[theme.colors.primary || '#0A114A', theme.colors.headerBackground || '#1A237E']}
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
                    <Ionicons name="arrow-back" size={26} color={theme.colors.onPrimary || theme.colors.headerTitle} />
                  </TouchableOpacity>

                  <View style={styles.modalTitleContainer}>
                    <Text style={[styles.modalTitle, { color: theme.colors.headerTitle }]}>{safeText(selectedCombo?.name, t('cropintel.combo.details_title'))}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.modalEditButton}
                    onPress={() => {
                      setShowComboModal(false);
                      openEditModal(selectedCombo);
                    }}
                  >
                    <Ionicons name="create-outline" size={24} color={theme.colors.onPrimary || theme.colors.headerTitle} />
                  </TouchableOpacity>
                </View>
              </SafeAreaView>
            </LinearGradient>

            <ScrollView style={[styles.modalContent, { backgroundColor: theme.colors.background }]} showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalDescription, { color: theme.colors.text }]}>{safeText(selectedCombo?.description, t('common.no_description'))}</Text>

              <View style={styles.modalSection}>
                <Text style={[styles.modalSectionTitle, { color: theme.colors.text }]}>{t('cropintel.combo.crops_included')}</Text>
                <View style={styles.modalCropsList}>
                  {selectedCombo?.crops?.map((crop, index) => (
                    <View key={index} style={styles.modalCropTag}>
                      <Text style={[styles.modalCropTagText, { color: theme.colors.text }]}>{safeText(crop, '')}</Text>
                    </View>
                  )) || (
                      <Text style={[styles.modalDescription, { color: theme.colors.text }]}>{t('cropintel.combo.no_crops')}</Text>
                    )}
                </View>
              </View>

              {selectedCombo.advantages && selectedCombo.advantages.length > 0 && (
                <View style={styles.modalSection}>
                  <Text style={[styles.modalSectionTitle, { color: theme.colors.text }]}>{t('cropintel.combo.advantages')}</Text>
                  {selectedCombo.advantages.map((advantage, index) => (
                    <View key={index} style={styles.modalAdvantageItem}>
                      <MaterialCommunityIcons name="check-circle" size={18} color={theme.colors.success || '#00C853'} />
                      <Text style={[styles.modalAdvantageText, { color: theme.colors.text }]}>{advantage}</Text>
                    </View>
                  ))}
                </View>
              )}

              {selectedCombo.challenges && selectedCombo.challenges.length > 0 && (
                <View style={styles.modalSection}>
                  <Text style={[styles.modalSectionTitle, { color: theme.colors.text }]}>{t('cropintel.combo.challenges')}</Text>
                  {selectedCombo.challenges.map((challenge, index) => (
                    <View key={index} style={styles.modalChallengeItem}>
                      <MaterialCommunityIcons name="alert-circle" size={18} color={theme.colors.warning || theme.colors.danger || '#FF9800'} />
                      <Text style={[styles.modalChallengeText, { color: theme.colors.text }]}>{challenge}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.modalStatsGrid}>
                <View style={styles.modalStatCard}>
                  <Text style={[styles.modalStatLabel, { color: theme.colors.text }]}>{t('cropintel.combo.investment')}</Text>
                  <Text style={[styles.modalStatValue, { color: theme.colors.text }]}>{selectedCombo.total_investment}</Text>
                </View>
                <View style={styles.modalStatCard}>
                  <Text style={[styles.modalStatLabel, { color: theme.colors.text }]}>{t('cropintel.combo.returns')}</Text>
                  <Text style={[styles.modalStatValue, { color: theme.colors.text }]}>{selectedCombo.expected_returns}</Text>
                </View>
                <View style={styles.modalStatCard}>
                  <Text style={[styles.modalStatLabel, { color: theme.colors.text }]}>{t('cropintel.combo.roi')}</Text>
                  <Text style={[styles.modalStatValue, { color: getROIColor(selectedCombo.roi_percentage) }]}>
                    {selectedCombo.roi_percentage}
                  </Text>
                </View>
                <View style={styles.modalStatCard}>
                  <Text style={[styles.modalStatLabel, { color: theme.colors.text }]}>{t('cropintel.combo.duration')}</Text>
                  <Text style={[styles.modalStatValue, { color: theme.colors.text }]}>{selectedCombo.duration}</Text>
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
            colors={[theme.colors.primary || '#1B5E20', theme.colors.headerBackground || '#2E7D32']}
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
                  <Ionicons name="close" size={26} color={theme.colors.onPrimary || theme.colors.headerTitle} />
                </TouchableOpacity>

                <View style={styles.modalTitleContainer}>
                  <Text style={[styles.modalTitle, { color: theme.colors.headerTitle }]}>{t('cropintel.edit.title')}</Text>
                </View>

                <TouchableOpacity
                  style={styles.modalSaveButton}
                  onPress={saveComboChanges}
                  disabled={saveLoading}
                >
                  {saveLoading ? (
                    <ActivityIndicator size="small" color={theme.colors.onPrimary || theme.colors.headerTitle} />
                  ) : (
                    <Ionicons name="checkmark" size={24} color={theme.colors.onPrimary || theme.colors.headerTitle} />
                  )}
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </LinearGradient>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.editSection}>
              <Text style={styles.editSectionTitle}>{t('cropintel.edit.section_basic')}</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('cropintel.edit.combo_name')}</Text>
                <TextInput
                  style={styles.textInput}
                  value={editForm.name}
                  onChangeText={(value) => updateFormField('name', value)}
                  placeholder={t('cropintel.edit.combo_name_placeholder')}
                  placeholderTextColor="#666"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('cropintel.edit.description')}</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={editForm.description}
                  onChangeText={(value) => updateFormField('description', value)}
                  placeholder={t('cropintel.edit.description_placeholder')}
                  placeholderTextColor="#666"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                  <Text style={styles.inputLabel}>{t('cropintel.edit.season')}</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editForm.season}
                    onChangeText={(value) => updateFormField('season', value)}
                    placeholder={t('cropintel.edit.season_placeholder')}
                    placeholderTextColor="#666"
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
                  <Text style={styles.inputLabel}>{t('cropintel.edit.difficulty')}</Text>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => {
                      Alert.alert(
                        t('cropintel.edit.select_difficulty'),
                        '',
                        [
                          { text: t('cropintel.combo.beginner'), onPress: () => updateFormField('difficulty', 'Beginner') },
                          { text: t('cropintel.combo.intermediate'), onPress: () => updateFormField('difficulty', 'Intermediate') },
                          { text: t('cropintel.combo.advanced'), onPress: () => updateFormField('difficulty', 'Advanced') },
                          { text: t('common.cancel'), style: 'cancel' }
                        ]
                      );
                    }}
                  >
                    <Text style={styles.pickerButtonText}>{editForm.difficulty || t('common.select')}</Text>
                    <Ionicons name="chevron-down" size={20} color="#666" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.editSection}>
              <Text style={styles.editSectionTitle}>{t('cropintel.edit.section_financial')}</Text>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                  <Text style={styles.inputLabel}>{t('cropintel.edit.investment')}</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editForm.total_investment}
                    onChangeText={(value) => updateFormField('total_investment', value)}
                    placeholder={t('cropintel.edit.investment_placeholder')}
                    placeholderTextColor="#666"
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
                  <Text style={styles.inputLabel}>{t('cropintel.edit.returns')}</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editForm.expected_returns}
                    onChangeText={(value) => updateFormField('expected_returns', value)}
                    placeholder={t('cropintel.edit.returns_placeholder')}
                    placeholderTextColor="#666"
                  />
                </View>
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                  <Text style={styles.inputLabel}>{t('cropintel.edit.roi')}</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editForm.roi_percentage}
                    onChangeText={(value) => updateFormField('roi_percentage', value)}
                    placeholder={t('cropintel.edit.roi_placeholder')}
                    placeholderTextColor="#666"
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
                  <Text style={styles.inputLabel}>{t('cropintel.edit.duration')}</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editForm.duration}
                    onChangeText={(value) => updateFormField('duration', value)}
                    placeholder={t('cropintel.edit.duration_placeholder')}
                    placeholderTextColor="#666"
                  />
                </View>
              </View>
            </View>

            <View style={styles.editSection}>
              <Text style={styles.editSectionTitle}>{t('cropintel.edit.section_performance')}</Text>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                  <Text style={styles.inputLabel}>{t('cropintel.edit.success_rate')}</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editForm.success_rate}
                    onChangeText={(value) => updateFormField('success_rate', value)}
                    placeholder={t('cropintel.edit.success_rate_placeholder')}
                    placeholderTextColor="#666"
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1, marginLeft: 10 }]}>
                  <Text style={styles.inputLabel}>{t('cropintel.edit.farmers_using')}</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editForm.farmers_using}
                    onChangeText={(value) => updateFormField('farmers_using', value)}
                    placeholder={t('cropintel.edit.farmers_using_placeholder')}
                    placeholderTextColor="#666"
                  />
                </View>
              </View>
            </View>

            <View style={styles.editSection}>
              <Text style={styles.editSectionTitle}>{t('cropintel.edit.section_crops')}</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('cropintel.edit.crops_label')}</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={editForm.crops}
                  onChangeText={(value) => updateFormField('crops', value)}
                  placeholder={t('cropintel.edit.crops_placeholder')}
                  placeholderTextColor="#666"
                  multiline
                  numberOfLines={2}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('cropintel.edit.advantages_label')}</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={editForm.advantages}
                  onChangeText={(value) => updateFormField('advantages', value)}
                  placeholder={t('cropintel.edit.advantages_placeholder')}
                  placeholderTextColor="#666"
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t('cropintel.edit.challenges_label')}</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={editForm.challenges}
                  onChangeText={(value) => updateFormField('challenges', value)}
                  placeholder={t('cropintel.edit.challenges_placeholder')}
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
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="save-outline" size={20} color="white" />
                    <Text style={styles.saveButtonText}>{t('common.save_changes')}</Text>
                  </View>
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
            <Text style={styles.restartTourText}>{t('common.tour')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.resetTourButton}
            onPress={resetOnboarding}
          >
            <MaterialCommunityIcons name="refresh" size={16} color="#EF4444" />
            <Text style={styles.resetTourText}>{t('common.reset')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default CropIntelligenceScreen;