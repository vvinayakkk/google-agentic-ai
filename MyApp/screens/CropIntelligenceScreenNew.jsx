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

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    loadData();
    animateEntry();
    getCurrentLocation();
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
            <View style={styles.currentWeatherMainCard}>
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
    <View style={styles.tabBarContainer}>
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
            <View style={styles.combosSection}>
              <Text style={styles.sectionTitle}>Available Crop Combinations</Text>
              {cropCombos.length > 0 ? (
                cropCombos.map(renderCropComboCard)
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
                    <Ionicons name="close" size={26} color="white" />
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>{selectedCombo.name}</Text>
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
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  modalCloseButton: {
    padding: 5,
    marginRight: 15,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
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
});

export default CropIntelligenceScreen;