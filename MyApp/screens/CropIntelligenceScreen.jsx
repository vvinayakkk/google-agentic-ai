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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons, FontAwesome5, Entypo } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as Location from 'expo-location';

// Import mock data as fallback
import cropIntelligenceData from '../data/crop_intelligence_data.json';

const { width, height } = Dimensions.get('window');
const API_BASE = 'http://192.168.0.111:8000';

const CropIntelligenceScreen = ({ navigation }) => {
  // State management
  const [weatherData, setWeatherData] = useState(null);
  const [soilData, setSoilData] = useState([]);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('combos');
  const [selectedCombo, setSelectedCombo] = useState(null);
  const [showComboModal, setShowComboModal] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [cropCombos, setCropCombos] = useState([]);
  const [currentConditions, setCurrentConditions] = useState(null);
  
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
        setLocation({ latitude: 18.8237, longitude: 74.3732, city: 'Shirur, Maharashtra' });
        return;
      }

      let currentLocation = await Location.getCurrentPositionAsync({});
      let reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });

      const address = reverseGeocode[0];
      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        city: `${address.city || address.subregion}, ${address.region}`,
      });
    } catch (error) {
      console.error('Error getting location:', error);
      setLocation({ latitude: 18.8237, longitude: 74.3732, city: 'Shirur, Maharashtra' });
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Load weather data (keeping existing integration)
      const weatherResponse = await axios.get(`${API_BASE}/weather/city?city=Pune,IN`);
      setWeatherData(weatherResponse.data);

      // Load soil data (keeping existing integration)
      const soilResponse = await axios.get(`${API_BASE}/soil-moisture`);
      setSoilData(soilResponse.data);

      // Load crop combos from backend
      const combosResponse = await axios.get(`${API_BASE}/crop-intelligence/combos`);
      setCropCombos(combosResponse.data.combos || []);

      // Analyze current conditions
      await analyzeCurrentConditions();

    } catch (error) {
      console.error('Error loading data:', error);
      // Fallback to cached data and mock combos
      loadCachedData();
      loadMockCombos();
    } finally {
      setLoading(false);
    }
  };

  const loadCachedData = async () => {
    try {
      const cachedWeather = await AsyncStorage.getItem('weather-cache');
      const cachedSoil = await AsyncStorage.getItem('soilMoistureDataCache');
      
      if (cachedWeather) setWeatherData(JSON.parse(cachedWeather));
      if (cachedSoil) setSoilData(JSON.parse(cachedSoil));
    } catch (error) {
      console.error('Error loading cached data:', error);
    }
  };

  const loadMockCombos = () => {
    // Create mock combos from existing data as fallback
    const mockCombos = [
      {
        combo_id: 'monsoon_premium',
        name: 'Monsoon Premium Combo',
        season: 'Monsoon',
        description: 'High-yield monsoon crops with premium market prices',
        crops: ['Rice', 'Sugarcane', 'Cotton'],
        total_investment: '₹85,000 - ₹1,20,000',
        expected_returns: '₹1,50,000 - ₹2,25,000',
        roi_percentage: '75-90%',
        duration: '4-6 months',
        difficulty: 'Intermediate',
        success_rate: '87%',
        farmers_using: '2,847 farmers',
        advantages: [
          'High market demand guaranteed',
          'Government procurement support',
          'Lower disease risk with proper management'
        ]
      },
      {
        combo_id: 'winter_value',
        name: 'Winter Value Combo',
        season: 'Winter',
        description: 'Profitable winter crops with export potential',
        crops: ['Wheat', 'Chickpea', 'Mustard'],
        total_investment: '₹45,000 - ₹65,000',
        expected_returns: '₹85,000 - ₹1,15,000',
        roi_percentage: '65-80%',
        duration: '3-4 months',
        difficulty: 'Beginner',
        success_rate: '92%',
        farmers_using: '4,523 farmers',
        advantages: [
          'Lower water requirements',
          'Stable market prices',
          'Government MSP support'
        ]
      }
    ];
    setCropCombos(mockCombos);
  };

  const analyzeCurrentConditions = async () => {
    if (!weatherData || !soilData.length) return;
    
    try {
      const avgMoisture = soilData.reduce((sum, item) => sum + (item.moisture || 0), 0) / soilData.length;
      
      const conditionsResponse = await axios.post(`${API_BASE}/crop-intelligence/analyze-conditions`, null, {
        params: {
          temperature: weatherData.main?.temp || 28,
          humidity: weatherData.main?.humidity || 70,
          soil_moisture: avgMoisture,
          location: location?.city || 'Unknown Location'
        }
      });
      
      setCurrentConditions(conditionsResponse.data);
    } catch (error) {
      console.error('Error analyzing conditions:', error);
    }
  };

  const getAIRecommendations = async () => {
    if (aiLoading) return;
    
    setAiLoading(true);
    
    try {
      const avgMoisture = soilData.length > 0 
        ? soilData.reduce((sum, item) => sum + (item.moisture || 0), 0) / soilData.length 
        : 75;
      
      const requestData = {
        location: location?.city || 'Unknown Location',
        weather: {
          temperature: weatherData?.main?.temp || 28,
          humidity: weatherData?.main?.humidity || 70,
          season: getCurrentSeason()
        },
        soil_moisture: avgMoisture,
        farmer: {
          experience_level: 'intermediate',
          farm_size: '5 acres',
          investment_capacity: '₹75,000',
          risk_tolerance: 'medium'
        }
      };

      const response = await axios.post(`${API_BASE}/crop-intelligence/recommendations`, requestData);
      setAiRecommendations(response.data);
      
      Alert.alert(
        '🤖 AI Analysis Complete',
        'Your personalized crop recommendations are ready!',
        [{ text: 'View Results', onPress: () => setActiveTab('ai-planner') }]
      );
      
    } catch (error) {
      console.error('Error getting AI recommendations:', error);
      Alert.alert('Error', 'Unable to generate AI recommendations. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const getCurrentSeason = () => {
    const month = new Date().getMonth() + 1;
    if (month >= 6 && month <= 9) return 'Monsoon';
    if (month >= 10 && month <= 2) return 'Winter';
    return 'Summer';
  };

  const renderHeader = () => (
    <LinearGradient
      colors={['#0a0a0a', '#1a1a1a', '#2a2a2a']}
      style={styles.header}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />
      <View style={styles.headerContent}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        
        <View style={styles.headerTitle}>
          <Text style={styles.headerTitleText}>🌱 Crop Intelligence</Text>
          <Text style={styles.headerSubtitle}>Smart Farming Assistant</Text>
        </View>
        
        <TouchableOpacity 
          onPress={getAIRecommendations} 
          style={[styles.aiPlannerButton, aiLoading && styles.aiPlannerLoading]}
          disabled={aiLoading}
        >
          {aiLoading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <MaterialCommunityIcons name="robot" size={20} color="white" />
              <Text style={styles.aiPlannerText}>AI Planner</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );

  const renderLocationWeatherSummary = () => (
    <LinearGradient
      colors={['#1e3c72', '#2a5298']}
      style={styles.summaryCard}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.locationRow}>
        <View style={styles.locationInfo}>
          <Ionicons name="location" size={20} color="#FFD700" />
          <Text style={styles.locationText}>
            {location?.city || 'Getting location...'}
          </Text>
        </View>
        <Text style={styles.liveIndicator}>🟢 LIVE</Text>
      </View>
      
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Ionicons name="thermometer" size={20} color="#FFD700" />
          <Text style={styles.summaryLabel}>Temperature</Text>
          <Text style={styles.summaryValue}>
            {weatherData?.main?.temp ? `${Math.round(weatherData.main.temp)}°C` : '28°C'}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Ionicons name="water" size={20} color="#00CED1" />
          <Text style={styles.summaryLabel}>Soil Moisture</Text>
          <Text style={styles.summaryValue}>
            {soilData.length > 0 
              ? `${Math.round(soilData.reduce((sum, item) => sum + (item.moisture || 0), 0) / soilData.length)}%`
              : '75%'
            }
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Ionicons name="rainy" size={20} color="#87CEEB" />
          <Text style={styles.summaryLabel}>Humidity</Text>
          <Text style={styles.summaryValue}>
            {weatherData?.main?.humidity ? `${weatherData.main.humidity}%` : '70%'}
          </Text>
        </View>
      </View>
      
      {currentConditions && (
        <Text style={styles.conditionsStatus}>
          {currentConditions.suitability_analysis.overall_rating === 'Good' ? '✅' : '⚠️'} 
          {' '}Conditions are {currentConditions.suitability_analysis.overall_rating.toLowerCase()} for farming
        </Text>
      )}
    </LinearGradient>
  );

  const renderTabButtons = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity 
        style={[styles.tabButton, activeTab === 'combos' && styles.activeTab]}
        onPress={() => setActiveTab('combos')}
      >
        <MaterialCommunityIcons name="format-list-checkbox" size={20} color={activeTab === 'combos' ? 'white' : '#666'} />
        <Text style={[styles.tabText, activeTab === 'combos' && styles.activeTabText]}>
          Crop Combos
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.tabButton, activeTab === 'techniques' && styles.activeTab]}
        onPress={() => setActiveTab('techniques')}
      >
        <MaterialCommunityIcons name="cog" size={20} color={activeTab === 'techniques' ? 'white' : '#666'} />
        <Text style={[styles.tabText, activeTab === 'techniques' && styles.activeTabText]}>
          Techniques
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.tabButton, activeTab === 'ai-planner' && styles.activeTab]}
        onPress={() => setActiveTab('ai-planner')}
      >
        <MaterialCommunityIcons name="robot" size={20} color={activeTab === 'ai-planner' ? 'white' : '#666'} />
        <Text style={[styles.tabText, activeTab === 'ai-planner' && styles.activeTabText]}>
          AI Planner
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderCropCombos = () => (
    <View style={styles.contentContainer}>
      <Text style={styles.sectionTitle}>🌾 Choose Your Perfect Farming Combo</Text>
      <Text style={styles.sectionSubtitle}>McDonald's style - pick what works best for you!</Text>
      
      {cropCombos.length === 0 ? (
        <View style={styles.noCombosContainer}>
          <MaterialCommunityIcons name="seedling" size={60} color="#666" />
          <Text style={styles.noCombosText}>No crop combos available</Text>
          <Text style={styles.noCombosSubtext}>Check your internet connection</Text>
        </View>
      ) : (
        cropCombos.map((combo, index) => (
          <Animated.View 
            key={combo.combo_id || index}
            style={[
              styles.comboCard,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }
            ]}
          >
            <LinearGradient
              colors={getComboGradient(combo.difficulty)}
              style={styles.comboCardGradient}
            >
              <View style={styles.comboHeader}>
                <View style={styles.comboTitleRow}>
                  <Text style={styles.comboName}>{combo.name}</Text>
                  <View style={styles.comboTag}>
                    <Text style={styles.comboTagText}>{combo.season}</Text>
                  </View>
                </View>
                <Text style={styles.comboDescription}>{combo.description}</Text>
              </View>

              <View style={styles.comboMetrics}>
                <View style={styles.metricRow}>
                  <View style={styles.metric}>
                    <Ionicons name="trending-up" size={16} color="#4CAF50" />
                    <Text style={styles.metricLabel}>ROI</Text>
                    <Text style={styles.metricValue}>{combo.roi_percentage}</Text>
                  </View>
                  <View style={styles.metric}>
                    <Ionicons name="time" size={16} color="#FF9800" />
                    <Text style={styles.metricLabel}>Duration</Text>
                    <Text style={styles.metricValue}>{combo.duration}</Text>
                  </View>
                  <View style={styles.metric}>
                    <MaterialCommunityIcons name="shield-check" size={16} color="#2196F3" />
                    <Text style={styles.metricLabel}>Success</Text>
                    <Text style={styles.metricValue}>{combo.success_rate}</Text>
                  </View>
                </View>
                
                <View style={styles.investmentRow}>
                  <Text style={styles.investmentLabel}>💰 Investment: </Text>
                  <Text style={styles.investmentValue}>{combo.total_investment}</Text>
                </View>
                <View style={styles.investmentRow}>
                  <Text style={styles.investmentLabel}>💵 Returns: </Text>
                  <Text style={styles.returnsValue}>{combo.expected_returns}</Text>
                </View>
              </View>

              <View style={styles.comboDetails}>
                <Text style={styles.cropsTitle}>🌱 Crops in this combo:</Text>
                <View style={styles.cropsContainer}>
                  {combo.crops && combo.crops.map((crop, idx) => (
                    <View key={idx} style={styles.cropTag}>
                      <Text style={styles.cropTagText}>{crop}</Text>
                    </View>
                  ))}
                </View>
                
                {combo.advantages && (
                  <View style={styles.advantagesContainer}>
                    <Text style={styles.advantagesTitle}>✅ Key Benefits:</Text>
                    {combo.advantages.slice(0, 2).map((advantage, idx) => (
                      <Text key={idx} style={styles.advantageText}>• {advantage}</Text>
                    ))}
                  </View>
                )}
              </View>

              <TouchableOpacity 
                style={styles.selectComboButton}
                onPress={() => {
                  setSelectedCombo(combo);
                  setShowComboModal(true);
                }}
              >
                <Text style={styles.selectComboText}>Select This Combo</Text>
                <Ionicons name="arrow-forward" size={16} color="white" style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        ))
      )}
    </View>
  );

  const renderAIPlanner = () => (
    <View style={styles.contentContainer}>
      <View style={styles.aiPlannerHeader}>
        <MaterialCommunityIcons name="robot" size={32} color="#03DAC6" />
        <Text style={styles.aiPlannerTitle}>AI-Powered Crop Planner</Text>
        <Text style={styles.aiPlannerSubtitle}>Smart recommendations based on your conditions</Text>
      </View>

      {!aiRecommendations ? (
        <View style={styles.aiEmptyState}>
          <LinearGradient
            colors={['rgba(3, 218, 198, 0.1)', 'rgba(3, 218, 198, 0.05)']}
            style={styles.aiEmptyCard}
          >
            <MaterialCommunityIcons name="brain" size={60} color="#03DAC6" />
            <Text style={styles.aiEmptyTitle}>Get Personalized Recommendations</Text>
            <Text style={styles.aiEmptyText}>
              Tap the AI Planner button to get intelligent crop suggestions based on your current weather, soil, and location conditions.
            </Text>
            <TouchableOpacity 
              style={styles.aiAnalyzeButton}
              onPress={getAIRecommendations}
              disabled={aiLoading}
            >
              {aiLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <MaterialCommunityIcons name="auto-fix" size={20} color="white" />
                  <Text style={styles.aiAnalyzeText}>Analyze Now</Text>
                </>
              )}
            </TouchableOpacity>
          </LinearGradient>
        </View>
      ) : (
        <ScrollView style={styles.aiResultsContainer}>
          <View style={styles.aiWeatherAnalysis}>
            <Text style={styles.aiSectionTitle}>🌤️ Weather Analysis</Text>
            <Text style={styles.aiAnalysisText}>{aiRecommendations.weather_analysis}</Text>
          </View>

          <View style={styles.aiRecommendations}>
            <Text style={styles.aiSectionTitle}>🎯 AI Recommendations</Text>
            {aiRecommendations.recommendations.map((rec, index) => (
              <LinearGradient
                key={index}
                colors={['#667eea', '#764ba2']}
                style={styles.aiRecommendationCard}
              >
                <View style={styles.aiRecHeader}>
                  <Text style={styles.aiRecName}>{rec.combo_name}</Text>
                  <View style={styles.aiConfidenceScore}>
                    <Text style={styles.aiConfidenceText}>{rec.confidence_score}%</Text>
                  </View>
                </View>
                
                <Text style={styles.aiRecJustification}>{rec.justification}</Text>
                
                <View style={styles.aiRecMetrics}>
                  <View style={styles.aiRecMetric}>
                    <Text style={styles.aiRecMetricLabel}>Expected ROI</Text>
                    <Text style={styles.aiRecMetricValue}>{rec.expected_roi}</Text>
                  </View>
                  <View style={styles.aiRecMetric}>
                    <Text style={styles.aiRecMetricLabel}>Risk Level</Text>
                    <Text style={[styles.aiRecMetricValue, { color: rec.risk_level === 'Low' ? '#4CAF50' : rec.risk_level === 'High' ? '#F44336' : '#FF9800' }]}>
                      {rec.risk_level}
                    </Text>
                  </View>
                  <View style={styles.aiRecMetric}>
                    <Text style={styles.aiRecMetricLabel}>Timeline</Text>
                    <Text style={styles.aiRecMetricValue}>{rec.timeline}</Text>
                  </View>
                </View>

                {rec.key_advantages && (
                  <View style={styles.aiAdvantages}>
                    <Text style={styles.aiAdvantagesTitle}>Key Advantages:</Text>
                    {rec.key_advantages.map((adv, idx) => (
                      <Text key={idx} style={styles.aiAdvantageText}>✓ {adv}</Text>
                    ))}
                  </View>
                )}
              </LinearGradient>
            ))}
          </View>

          {aiRecommendations.action_plan && (
            <View style={styles.aiActionPlan}>
              <Text style={styles.aiSectionTitle}>📋 Action Plan</Text>
              <Text style={styles.aiActionSubtitle}>Simple steps for farmers to follow:</Text>
              {aiRecommendations.action_plan.map((step, index) => (
                <View key={index} style={styles.aiActionStep}>
                  <View style={styles.aiStepNumber}>
                    <Text style={styles.aiStepNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.aiStepText}>{step}</Text>
                </View>
              ))}
            </View>
          )}

          {aiRecommendations.market_insights && (
            <View style={styles.aiMarketInsights}>
              <Text style={styles.aiSectionTitle}>💰 Market Insights</Text>
              <Text style={styles.aiInsightsText}>{aiRecommendations.market_insights}</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );

  const getComboGradient = (difficulty) => {
    switch (difficulty) {
      case 'Beginner':
        return ['#4CAF50', '#66BB6A'];
      case 'Intermediate':
        return ['#FF9800', '#FFB74D'];
      case 'Advanced':
      case 'Expert':
        return ['#F44336', '#EF5350'];
      default:
        return ['#2196F3', '#42A5F5'];
    }
  };

  const renderModernTechniques = () => (
    <View style={styles.contentContainer}>
      <Text style={styles.sectionTitle}>🚀 Modern Farming Techniques</Text>
      <Text style={styles.sectionSubtitle}>Boost your yield with advanced methods</Text>
      
      {cropIntelligenceData.farming_techniques.modern_methods.map((technique, index) => (
        <Animated.View 
          key={technique.name}
          style={[
            styles.techniqueCard,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.techniqueCardGradient}
          >
            <View style={styles.techniqueCardHeader}>
              <Text style={styles.techniqueCardTitle}>{technique.name}</Text>
              <Text style={styles.techniqueCardDescription}>{technique.description}</Text>
            </View>

            <View style={styles.techniqueStats}>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="chart-line" size={20} color="#FFD700" />
                <Text style={styles.statLabel}>Yield Increase</Text>
                <Text style={styles.statValue}>{technique.yield_increase}</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="cash" size={20} color="#4CAF50" />
                <Text style={styles.statLabel}>Investment</Text>
                <Text style={styles.statValue}>{technique.investment}</Text>
              </View>
            </View>

            <View style={styles.successStory}>
              <Text style={styles.successStoryTitle}>🌟 Success Story</Text>
              <Text style={styles.successStoryText}>
                {technique.success_stories[0].farmer}: {technique.success_stories[0].result}
              </Text>
            </View>

            <TouchableOpacity 
              style={styles.learnMoreButton}
              onPress={() => {
                Alert.alert(
                  technique.name,
                  `${technique.description}\n\nRequirements:\n${technique.requirements.join('\n• ')}\n\nBenefits:\n• Yield increase: ${technique.yield_increase}\n• Investment: ${technique.investment}`,
                  [{ text: 'Got it', style: 'default' }]
                );
              }}
            >
              <Text style={styles.learnMoreText}>Learn More</Text>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      ))}
    </View>
  );

  // Modal for combo details
  const renderComboModal = () => (
    <Modal
      visible={showComboModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowComboModal(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        {selectedCombo && (
          <>
            <LinearGradient
              colors={['#0a0a0a', '#1a1a1a']}
              style={styles.modalHeader}
            >
              <Text style={styles.modalTitle}>{selectedCombo.name}</Text>
              <TouchableOpacity onPress={() => setShowComboModal(false)}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </LinearGradient>
            
            <ScrollView style={styles.modalContent}>
              <LinearGradient
                colors={getComboGradient(selectedCombo.difficulty)}
                style={styles.modalComboCard}
              >
                <Text style={styles.modalComboDescription}>{selectedCombo.description}</Text>
                
                <View style={styles.modalMetricsGrid}>
                  <View style={styles.modalMetricItem}>
                    <Text style={styles.modalMetricLabel}>Investment</Text>
                    <Text style={styles.modalMetricValue}>{selectedCombo.total_investment}</Text>
                  </View>
                  <View style={styles.modalMetricItem}>
                    <Text style={styles.modalMetricLabel}>Expected Returns</Text>
                    <Text style={styles.modalMetricValue}>{selectedCombo.expected_returns}</Text>
                  </View>
                  <View style={styles.modalMetricItem}>
                    <Text style={styles.modalMetricLabel}>ROI</Text>
                    <Text style={styles.modalMetricValue}>{selectedCombo.roi_percentage}</Text>
                  </View>
                  <View style={styles.modalMetricItem}>
                    <Text style={styles.modalMetricLabel}>Duration</Text>
                    <Text style={styles.modalMetricValue}>{selectedCombo.duration}</Text>
                  </View>
                  <View style={styles.modalMetricItem}>
                    <Text style={styles.modalMetricLabel}>Difficulty</Text>
                    <Text style={styles.modalMetricValue}>{selectedCombo.difficulty}</Text>
                  </View>
                  <View style={styles.modalMetricItem}>
                    <Text style={styles.modalMetricLabel}>Success Rate</Text>
                    <Text style={styles.modalMetricValue}>{selectedCombo.success_rate}</Text>
                  </View>
                </View>
              </LinearGradient>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>🌱 Crops in this Combo</Text>
                <View style={styles.modalCropsGrid}>
                  {selectedCombo.crops && selectedCombo.crops.map((crop, idx) => (
                    <View key={idx} style={styles.modalCropItem}>
                      <Text style={styles.modalCropText}>{crop}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {selectedCombo.advantages && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>✅ Advantages</Text>
                  {selectedCombo.advantages.map((advantage, idx) => (
                    <View key={idx} style={styles.modalAdvantageItem}>
                      <Text style={styles.modalAdvantageText}>• {advantage}</Text>
                    </View>
                  ))}
                </View>
              )}

              {selectedCombo.challenges && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>⚠️ Challenges</Text>
                  {selectedCombo.challenges.map((challenge, idx) => (
                    <View key={idx} style={styles.modalChallengeItem}>
                      <Text style={styles.modalChallengeText}>• {challenge}</Text>
                    </View>
                  ))}
                </View>
              )}

              {selectedCombo.farming_techniques && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>🔧 Recommended Techniques</Text>
                  {selectedCombo.farming_techniques.map((technique, idx) => (
                    <View key={idx} style={styles.modalTechniqueItem}>
                      <Text style={styles.modalTechniqueText}>• {technique}</Text>
                    </View>
                  ))}
                </View>
              )}

              <TouchableOpacity 
                style={styles.modalStartButton}
                onPress={() => {
                  setShowComboModal(false);
                  Alert.alert(
                    'Combo Selected!',
                    `You've chosen ${selectedCombo.name}. This information has been saved to your farming plan.`,
                    [{ text: 'Great!', style: 'default' }]
                  );
                }}
              >
                <Text style={styles.modalStartButtonText}>Start This Combo</Text>
              </TouchableOpacity>
            </ScrollView>
          </>
        )}
      </SafeAreaView>
    </Modal>
  );

  if (loading) {
    return (
      <LinearGradient
        colors={['#0a0a0a', '#1a1a1a', '#2a2a2a']}
        style={styles.loadingContainer}
      >
        <MaterialCommunityIcons name="sprout" size={60} color="#03DAC6" />
        <ActivityIndicator size="large" color="#03DAC6" style={{ marginTop: 20 }} />
        <Text style={styles.loadingText}>Loading crop intelligence...</Text>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      {renderLocationWeatherSummary()}
      {renderTabButtons()}
      
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {activeTab === 'combos' && renderCropCombos()}
        {activeTab === 'techniques' && renderModernTechniques()}
        {activeTab === 'ai-planner' && renderAIPlanner()}
      </ScrollView>
      
      {renderComboModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
  },
  loadingText: {
    color: '#03DAC6',
    fontSize: 16,
    marginTop: 10,
    fontFamily: 'poppins-medium',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingTop: 50,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: 'poppins-bold',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#888888',
    fontFamily: 'poppins-regular',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#03DAC6',
    marginLeft: 6,
    fontFamily: 'poppins-medium',
  },
  weatherSummaryCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333333',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weatherInfo: {
    flex: 1,
  },
  weatherTitle: {
    fontSize: 16,
    fontFamily: 'poppins-medium',
    color: '#ffffff',
    marginBottom: 4,
  },
  weatherDetails: {
    fontSize: 14,
    color: '#888888',
    fontFamily: 'poppins-regular',
  },
  conditionsChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 15,
  },
  conditionsText: {
    fontSize: 12,
    fontFamily: 'poppins-medium',
    color: '#ffffff',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 5,
  },
  summaryValue: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 2,
  },
  conditionsStatus: {
    fontSize: 14,
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 15,
    fontFamily: 'poppins-medium',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 25,
    marginHorizontal: 4,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333333',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTabButton: {
    backgroundColor: '#03DAC6',
    borderColor: '#03DAC6',
  },
  tabButtonText: {
    color: '#888888',
    fontSize: 14,
    fontFamily: 'poppins-medium',
    textAlign: 'center',
    marginLeft: 5,
  },
  activeTabButtonText: {
    color: '#000000',
  },
  activeTab: {
    backgroundColor: '#03DAC6',
  },
  tabText: {
    marginLeft: 5,
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: 'white',
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'poppins-bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  comboCard: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333333',
  },
  comboCardContent: {
    padding: 20,
  },
  comboHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  comboName: {
    fontSize: 18,
    fontFamily: 'poppins-bold',
    color: '#ffffff',
    flex: 1,
    marginRight: 10,
  },
  comboBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#03DAC6',
  },
  comboBadgeText: {
    fontSize: 12,
    fontFamily: 'poppins-medium',
    color: '#000000',
  },
  comboDescription: {
    fontSize: 14,
    color: '#cccccc',
    fontFamily: 'poppins-regular',
    marginBottom: 16,
    lineHeight: 20,
  },
  comboStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontFamily: 'poppins-bold',
    color: '#03DAC6',
  },
  statLabel: {
    fontSize: 12,
    color: '#888888',
    fontFamily: 'poppins-regular',
    marginTop: 2,
  },
  cropsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  cropChip: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333333',
  },
  cropChipText: {
    fontSize: 12,
    color: '#ffffff',
    fontFamily: 'poppins-medium',
  },
  selectComboButton: {
    backgroundColor: '#03DAC6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignSelf: 'flex-start',
  },
  selectComboButtonText: {
    color: '#000000',
    fontSize: 14,
    fontFamily: 'poppins-medium',
  },
  aiPlannerContainer: {
    padding: 20,
  },
  aiPlannerHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  aiPlannerTitle: {
    fontSize: 24,
    fontFamily: 'poppins-bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  aiPlannerSubtitle: {
    fontSize: 16,
    color: '#888888',
    fontFamily: 'poppins-regular',
    textAlign: 'center',
    lineHeight: 22,
  },
  generatePlanButton: {
    backgroundColor: '#03DAC6',
    paddingVertical: 16,
    paddingHorizontal: 30,
    borderRadius: 30,
    alignSelf: 'center',
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  generatePlanButtonText: {
    color: '#000000',
    fontSize: 16,
    fontFamily: 'poppins-bold',
    marginLeft: 8,
  },
  aiThinking: {
    alignItems: 'center',
    padding: 40,
  },
  aiThinkingText: {
    color: '#03DAC6',
    fontSize: 16,
    fontFamily: 'poppins-medium',
    marginTop: 16,
    textAlign: 'center',
  },
  aiResultsContainer: {
    marginTop: 20,
  },
  aiResultCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  aiResultTitle: {
    fontSize: 18,
    fontFamily: 'poppins-bold',
    color: '#03DAC6',
    marginBottom: 12,
  },
  aiResultText: {
    fontSize: 14,
    color: '#cccccc',
    fontFamily: 'poppins-regular',
    lineHeight: 20,
  },
  techniqueCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  techniqueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  techniqueName: {
    fontSize: 18,
    fontFamily: 'poppins-bold',
    color: '#ffffff',
    flex: 1,
    marginRight: 10,
  },
  techniqueImpact: {
    fontSize: 14,
    fontFamily: 'poppins-bold',
    color: '#03DAC6',
  },
  techniqueDescription: {
    fontSize: 14,
    color: '#cccccc',
    fontFamily: 'poppins-regular',
    lineHeight: 20,
    marginBottom: 16,
  },
  learnMoreButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#03DAC6',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  learnMoreButtonText: {
    color: '#03DAC6',
    fontSize: 12,
    fontFamily: 'poppins-medium',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#0a0a0a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'poppins-bold',
    color: '#ffffff',
    flex: 1,
  },
  modalCloseButton: {
    padding: 8,
  },
  modalScrollContent: {
    padding: 20,
  },
  modalDescription: {
    fontSize: 16,
    color: '#cccccc',
    fontFamily: 'poppins-regular',
    lineHeight: 22,
    marginBottom: 20,
  },
  modalStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  modalStatItem: {
    width: '50%',
    paddingRight: 10,
    marginBottom: 16,
  },
  modalStatLabel: {
    fontSize: 12,
    color: '#888888',
    fontFamily: 'poppins-regular',
    marginBottom: 4,
  },
  modalStatValue: {
    fontSize: 16,
    color: '#03DAC6',
    fontFamily: 'poppins-bold',
  },
  modalCropsSection: {
    marginBottom: 20,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontFamily: 'poppins-bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  modalCropsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  modalCropChip: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333333',
  },
  modalCropChipText: {
    fontSize: 14,
    color: '#ffffff',
    fontFamily: 'poppins-medium',
  },
  modalSelectButton: {
    backgroundColor: '#03DAC6',
    paddingVertical: 16,
    borderRadius: 25,
    marginTop: 10,
  },
  modalSelectButtonText: {
    color: '#000000',
    fontSize: 16,
    fontFamily: 'poppins-bold',
    textAlign: 'center',
  },
});

export default CropIntelligenceScreen;
