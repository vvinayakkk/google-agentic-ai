import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  Image,
  TextInput,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Markdown from 'react-native-markdown-display';

const { width, height } = Dimensions.get('window');
const API_BASE = 'http://10.123.4.245:8000';
const FARMER_ID = 'f001';

const WEATHER_CACHE_KEY = 'weather-cache';
const FORECAST_CACHE_KEY = 'forecast-cache';
const FARMER_PROFILE_CACHE_KEY = 'farmer-profile-cache';
const AIR_QUALITY_CACHE_KEY = 'air-quality-cache';
const WEATHER_ANALYSIS_CACHE_KEY = 'weather-ai-analysis-f001';

const WeatherScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState(null);
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [airQuality, setAirQuality] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const farmLocationRef = useRef(null);
  const farmProfileRef = useRef(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [weatherAnalysis, setWeatherAnalysis] = useState('');
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [showFullAnalysis, setShowFullAnalysis] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  // Fetch air quality data
  const fetchAirQuality = async (lat, lon) => {
    try {
      const res = await fetch(`${API_BASE}/weather/air_quality?lat=${lat}&lon=${lon}`);
      const data = await res.json();
      setAirQuality(data);
      await AsyncStorage.setItem(AIR_QUALITY_CACHE_KEY, JSON.stringify(data));
    } catch (e) {
      // ignore
    }
  };

  // Fetch or load cached AI weather analysis
  const loadWeatherAnalysis = async () => {
    setAnalysisLoading(true);
    try {
      const cached = await AsyncStorage.getItem(WEATHER_ANALYSIS_CACHE_KEY);
      if (cached) {
        setWeatherAnalysis(cached);
        setAnalysisLoading(false);
        return;
      }
      // If not cached, fetch from backend
      const res = await fetch(`${API_BASE}/weather/ai-analysis?farmer_id=${FARMER_ID}`);
      const data = await res.json();
      setWeatherAnalysis(data.analysis);
      await AsyncStorage.setItem(WEATHER_ANALYSIS_CACHE_KEY, data.analysis);
      setAnalysisLoading(false);
    } catch (e) {
      setWeatherAnalysis('Failed to load AI analysis.');
      setAnalysisLoading(false);
    }
  };

  const updateWeatherAnalysis = async () => {
    setAnalysisLoading(true);
    try {
      const res = await fetch(`${API_BASE}/weather/ai-analysis?farmer_id=${FARMER_ID}`);
      const data = await res.json();
      setWeatherAnalysis(data.analysis);
      await AsyncStorage.setItem(WEATHER_ANALYSIS_CACHE_KEY, data.analysis);
      setAnalysisLoading(false);
    } catch (e) {
      setWeatherAnalysis('Failed to update AI analysis.');
      setAnalysisLoading(false);
    }
  };

  useEffect(() => {
    loadWeatherAnalysis();
  }, []);

  // Only fetch from cache on mount and farm restore
  useEffect(() => {
    let isMounted = true;
    const loadFromCacheAndBackground = async () => {
      setLoading(true);
      setProfileLoading(true);
      setError(null);
      // 1. Load from cache instantly
      let cachedProfile = null;
      let cachedWeather = null;
      let cachedForecast = null;
      let cachedAirQuality = null;
      try {
        cachedProfile = await AsyncStorage.getItem(FARMER_PROFILE_CACHE_KEY);
        if (cachedProfile) {
          const prof = JSON.parse(cachedProfile);
          setProfile(prof);
          farmProfileRef.current = prof;
          const { farmLocation } = prof;
          farmLocationRef.current = farmLocation;
        }
        setProfileLoading(false);
        [cachedWeather, cachedForecast, cachedAirQuality] = await Promise.all([
          AsyncStorage.getItem(WEATHER_CACHE_KEY),
          AsyncStorage.getItem(FORECAST_CACHE_KEY),
          AsyncStorage.getItem(AIR_QUALITY_CACHE_KEY),
        ]);
        if (cachedWeather) setWeather(JSON.parse(cachedWeather));
        if (cachedForecast) setForecast(JSON.parse(cachedForecast));
        if (cachedAirQuality) setAirQuality(JSON.parse(cachedAirQuality));
      } catch (e) {
        if (isMounted) setError(e.message || 'Failed to load weather');
      }
      setLoading(false);

      // 2. In background, fetch latest from backend and update if changed
      try {
        // Fetch profile
        const profRes = await fetch(`${API_BASE}/farmer/${FARMER_ID}/profile`);
        const prof = await profRes.json();
        if (!isMounted) return;
        const { farmLocation } = prof;
        if (!farmLocation || !farmLocation.lat || !farmLocation.lng) return;
        // Compare and update profile if changed
        if (!cachedProfile || JSON.stringify(prof) !== cachedProfile) {
          setProfile(prof);
          farmProfileRef.current = prof;
          farmLocationRef.current = farmLocation;
          await AsyncStorage.setItem(FARMER_PROFILE_CACHE_KEY, JSON.stringify(prof));
        }
        // Fetch weather, forecast, air quality
        const [wRes, fRes] = await Promise.all([
          fetch(`${API_BASE}/weather/coords?lat=${farmLocation.lat}&lon=${farmLocation.lng}`),
          fetch(`${API_BASE}/weather/forecast/coords?lat=${farmLocation.lat}&lon=${farmLocation.lng}`),
        ]);
        const w = await wRes.json();
        const f = await fRes.json();
        await fetchAirQuality(farmLocation.lat, farmLocation.lng);

        // Compare and update weather if changed
        if (!cachedWeather || JSON.stringify(w) !== cachedWeather) {
          setWeather(w);
          await AsyncStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(w));
        }
        if (!cachedForecast || JSON.stringify(f) !== cachedForecast) {
          setForecast(f);
          await AsyncStorage.setItem(FORECAST_CACHE_KEY, JSON.stringify(f));
        }
      } catch (e) {
        // Silently ignore background errors
      }
    };
    loadFromCacheAndBackground();
    return () => { isMounted = false; };
  }, []);

  // --- Update Handler (fetches latest and updates cache) ---
  const handleUpdate = async () => {
    setLoading(true);
    setProfileLoading(true);
    setError(null);
    try {
      // Fetch profile from backend and update cache
      const profRes = await fetch(`${API_BASE}/farmer/${FARMER_ID}/profile`);
      const prof = await profRes.json();
      setProfile(prof);
      farmProfileRef.current = prof;
      const { farmLocation } = prof;
      farmLocationRef.current = farmLocation;
      await AsyncStorage.setItem(FARMER_PROFILE_CACHE_KEY, JSON.stringify(prof));
      setProfileLoading(false);
      if (!farmLocation || !farmLocation.lat || !farmLocation.lng) throw new Error('No farm location set');
      // Fetch weather, forecast, air quality and update cache
      const [wRes, fRes] = await Promise.all([
        fetch(`${API_BASE}/weather/coords?lat=${farmLocation.lat}&lon=${farmLocation.lng}`),
        fetch(`${API_BASE}/weather/forecast/coords?lat=${farmLocation.lat}&lon=${farmLocation.lng}`),
      ]);
      const w = await wRes.json();
      const f = await fRes.json();
      await fetchAirQuality(farmLocation.lat, farmLocation.lng);
      setWeather(w);
      setForecast(f);
      await AsyncStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(w));
      await AsyncStorage.setItem(FORECAST_CACHE_KEY, JSON.stringify(f));
    } catch (e) {
      setError(e.message || 'Failed to update weather');
      setProfileLoading(false);
    }
    setLoading(false);
  };

  // Helper: get weather icon url
  const getWeatherIcon = (icon) => `https://openweathermap.org/img/wn/${icon}@4x.png`;

  // Helper: format date
  const formatDate = (dt) => {
    const d = new Date(dt * 1000);
    return d.toLocaleDateString('default', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  // Helper: group forecast by day
  const groupForecastByDay = (list) => {
    if (!list) return [];
    const days = {};
    list.forEach(item => {
      const date = new Date(item.dt * 1000);
      const key = date.toISOString().split('T')[0];
      if (!days[key]) days[key] = [];
      days[key].push(item);
    });
    return Object.values(days).slice(0, 5); // 5 days
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'black' }]} />
      <LinearGradient
        colors={['rgba(16, 185, 129, 0.05)', 'transparent', 'rgba(59, 130, 246, 0.05)']}
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>  
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>  
          <BlurView intensity={20} tint="dark" style={styles.headerBlur}>
            <View style={styles.headerContent}>
              <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                  style={styles.backButtonGradient}
                >
                  <Ionicons name="chevron-back" size={24} color="white" />
                </LinearGradient>
              </TouchableOpacity>
              <View style={styles.headerCenter}>
                <View style={styles.headerTitleContainer}>
                  <Ionicons name="cloudy-night" size={20} color="#3B82F6" />
                  <Text style={styles.headerTitle}>Weather</Text>
                </View>
                <Text style={styles.headerSubtitle}>Farm Weather Insights</Text>
              </View>
              <View style={styles.syncIndicator}>
                <Animated.View style={[styles.syncDot, { transform: [{ scale: fadeAnim }] }]} />
                <Text style={styles.syncText}>LIVE</Text>
              </View>
            </View>
          </BlurView>
        </Animated.View>
        {/* AI Weather Analysis Section (above weather card) */}
        <View style={{
          backgroundColor: '#18181b',
          borderRadius: 16,
          padding: 16,
          marginHorizontal: 16,
          marginTop: 4,
          marginBottom: 0,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.1)',
          elevation: 10,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <MaterialCommunityIcons name="robot-excited" size={22} color="#10b981" style={{ marginRight: 8 }} />
            <Text style={{ color: '#10b981', fontWeight: 'bold', fontSize: 17 }}>AI Weather Insights</Text>
            <TouchableOpacity onPress={updateWeatherAnalysis} style={{ marginLeft: 12, backgroundColor: '#3B82F6', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Update</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 250 }}>
            {analysisLoading ? (
              <Text style={{ color: '#fff' }}>Loading analysis...</Text>
            ) : (
              (() => {
                const lines = weatherAnalysis.split(/\n|\r/).filter(l => l.trim() !== '');
                const previewLines = lines.slice(0, 4);
                const isLong = lines.length > 4;
                return (
                  <>
                    <Markdown style={{ body: { color: '#fff', fontSize: 15} }}>
                      {showFullAnalysis ? weatherAnalysis : previewLines.join('\n')}
                    </Markdown>
                    {isLong && (
                      <TouchableOpacity onPress={() => setShowFullAnalysis(v => !v)} style={{ marginTop: 8, alignSelf: 'flex-start' }}>
                        <Text style={{ color: '#3B82F6', fontWeight: 'bold' }}>{showFullAnalysis ? 'Show Less' : 'Show More'}</Text>
                      </TouchableOpacity>
                    )}
                  </>
                );
              })()
            )}
          </ScrollView>
        </View>
        {/* Main Content */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {(loading && !weather && !forecast) ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 80 }}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={{ color: '#fff', marginTop: 16 }}>Loading weather...</Text>
            </View>
          ) : error ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 80 }}>
              <Text style={{ color: 'red' }}>{error}</Text>
            </View>
          ) : (
            <>
              {/* Current Weather Card */}
              <Animated.View style={[styles.weatherCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>  
                <LinearGradient colors={["#23232a", "#18181b"]} style={styles.weatherCardGradient}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {weather?.weather && weather.weather[0] && (
                      <Image source={{ uri: getWeatherIcon(weather.weather[0].icon) }} style={styles.weatherIcon} />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.weatherMain}>{weather?.weather?.[0]?.main || '--'}</Text>
                      <Text style={styles.weatherDesc}>{weather?.weather?.[0]?.description || ''}</Text>
                      <Text style={styles.weatherTemp}>{Math.round(weather?.main?.temp || 0)}°C</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.weatherLabel}>Humidity</Text>
                      <Text style={styles.weatherValue}>{weather?.main?.humidity}%</Text>
                      <Text style={styles.weatherLabel}>Wind</Text>
                      <Text style={styles.weatherValue}>{weather?.wind?.speed} m/s</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', marginTop: 12, justifyContent: 'space-between' }}>
                    <Text style={styles.weatherLocation}>{profile?.village || 'Your Farm'}</Text>
                    <Text style={styles.weatherLocation}>{profile?.farmLocation ? `${profile.farmLocation.lat?.toFixed(3)}, ${profile.farmLocation.lng?.toFixed(3)}` : ''}</Text>
                  </View>
                </LinearGradient>
              </Animated.View>
              {/* Forecast Section */}
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="weather-partly-cloudy" size={22} color="#3B82F6" style={{ marginRight: 8 }} />
                <Text style={styles.sectionTitle}>5-Day Forecast</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
                {forecast && forecast.list && groupForecastByDay(forecast.list).map((day, idx) => {
                  // Pick the midday forecast for icon/temp
                  const midday = day[Math.floor(day.length / 2)];
                  return (
                    <LinearGradient key={idx} colors={["#23232a", "#18181b"]} style={styles.forecastCard}>
                      <Text style={styles.forecastDate}>{formatDate(midday.dt)}</Text>
                      <Image source={{ uri: getWeatherIcon(midday.weather[0].icon) }} style={styles.forecastIcon} />
                      <Text style={styles.forecastTemp}>{Math.round(midday.main.temp)}°C</Text>
                      <Text style={styles.forecastDesc}>{midday.weather[0].main}</Text>
                      <Text style={styles.forecastLabel}>Rain</Text>
                      <Text style={styles.forecastValue}>{midday.rain?.['3h'] ? `${midday.rain['3h']} mm` : '0 mm'}</Text>
                    </LinearGradient>
                  );
                })}
              </ScrollView>
              {/* --- Air Quality Section --- */}
              {airQuality && airQuality.list && airQuality.list[0] && (
                <View style={{ marginHorizontal: 16, marginBottom: 16, backgroundColor: '#23232a', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(16,185,129,0.1)' }}>
                  <Text style={{ color: '#10b981', fontWeight: 'bold', fontSize: 16, marginBottom: 4 }}>Air Quality</Text>
                  <Text style={{ color: '#fff', fontSize: 13 }}>AQI: {airQuality.list[0].main.aqi}</Text>
                  <Text style={{ color: '#fff', fontSize: 13 }}>CO: {airQuality.list[0].components.co} | NO₂: {airQuality.list[0].components.no2} | O₃: {airQuality.list[0].components.o3}</Text>
                  <Text style={{ color: '#fff', fontSize: 13 }}>PM2.5: {airQuality.list[0].components.pm2_5} | PM10: {airQuality.list[0].components.pm10}</Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  safeArea: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 8 },
  headerBlur: { borderRadius: 20, overflow: 'hidden' },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 16 },
  backButton: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden' },
  backButtonGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { alignItems: 'center' },
  headerTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { color: 'white', fontSize: 25, fontWeight: '700' },
  headerSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 15, marginTop: 2 },
  syncIndicator: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: 'rgba(59, 130, 246, 0.2)', borderRadius: 12 },
  syncDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#3B82F6' },
  syncText: { color: '#3B82F6', fontSize: 10, fontWeight: '600' },
  weatherCard: { margin: 16, borderRadius: 20, elevation: 8 },
  weatherCardGradient: { borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  weatherIcon: { width: 80, height: 80, marginRight: 16 },
  weatherMain: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  weatherDesc: { color: '#3B82F6', fontSize: 15, fontWeight: '600', marginBottom: 2 },
  weatherTemp: { color: '#10b981', fontSize: 38, fontWeight: '900', marginTop: 2 },
  weatherLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 4 },
  weatherValue: { color: '#fff', fontSize: 15, fontWeight: '600' },
  weatherLocation: { color: '#fff', fontSize: 13, opacity: 0.7 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginLeft: 16, marginTop: 18, marginBottom: 8 },
  sectionTitle: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  forecastCard: { width: 120, borderRadius: 16, marginHorizontal: 8, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(24,24,27,0.7)' },
  forecastDate: { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 4 },
  forecastIcon: { width: 48, height: 48, marginBottom: 4 },
  forecastTemp: { color: '#10b981', fontSize: 22, fontWeight: 'bold' },
  forecastDesc: { color: '#3B82F6', fontSize: 13, fontWeight: '600', marginBottom: 2 },
  forecastLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 },
  forecastValue: { color: '#fff', fontSize: 13, fontWeight: '600' },
});

export default WeatherScreen; 