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

const { width, height } = Dimensions.get('window');
const API_BASE = 'http://192.168.0.111:8000';
const FARMER_ID = 'f001';

const WEATHER_CACHE_KEY = 'weather-cache';
const FORECAST_CACHE_KEY = 'forecast-cache';
const ALERTS_CACHE_KEY = 'alerts-cache';
const FARMER_PROFILE_CACHE_KEY = 'farmer-profile-cache';

const WeatherScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState(null);
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchValue, setSearchValue] = useState('');
  const [searching, setSearching] = useState(false);
  const [isCustomLocation, setIsCustomLocation] = useState(false);
  const farmLocationRef = useRef(null);
  const farmProfileRef = useRef(null);
  const [profileLoading, setProfileLoading] = useState(true);

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
      let cachedAlerts = null;
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
        [cachedWeather, cachedForecast, cachedAlerts] = await Promise.all([
          AsyncStorage.getItem(WEATHER_CACHE_KEY),
          AsyncStorage.getItem(FORECAST_CACHE_KEY),
          AsyncStorage.getItem(ALERTS_CACHE_KEY),
        ]);
        if (cachedWeather) setWeather(JSON.parse(cachedWeather));
        if (cachedForecast) setForecast(JSON.parse(cachedForecast));
        if (cachedAlerts) setAlerts(JSON.parse(cachedAlerts));
        setIsCustomLocation(false);
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
        // Fetch weather, forecast, alerts
        const [wRes, fRes, aRes] = await Promise.all([
          fetch(`${API_BASE}/weather/coords?lat=${farmLocation.lat}&lon=${farmLocation.lng}`),
          fetch(`${API_BASE}/weather/forecast/coords?lat=${farmLocation.lat}&lon=${farmLocation.lng}`),
          fetch(`${API_BASE}/weather/alerts?lat=${farmLocation.lat}&lon=${farmLocation.lng}`),
        ]);
        const w = await wRes.json();
        const f = await fRes.json();
        const a = await aRes.json();
        // Compare and update weather if changed
        if (!cachedWeather || JSON.stringify(w) !== cachedWeather) {
          setWeather(w);
          await AsyncStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(w));
        }
        if (!cachedForecast || JSON.stringify(f) !== cachedForecast) {
          setForecast(f);
          await AsyncStorage.setItem(FORECAST_CACHE_KEY, JSON.stringify(f));
        }
        const aArr = Array.isArray(a) ? a : (a.alerts || []);
        if (!cachedAlerts || JSON.stringify(aArr) !== cachedAlerts) {
          setAlerts(aArr);
          await AsyncStorage.setItem(ALERTS_CACHE_KEY, JSON.stringify(aArr));
        }
      } catch (e) {
        // Silently ignore background errors
      }
    };
    loadFromCacheAndBackground();
    return () => { isMounted = false; };
  }, []);

  // --- Search Handler ---
  const handleSearch = async () => {
    setSearching(true);
    setError(null);
    let city = null, lat = null, lon = null;
    const trimmed = searchValue.trim();
    // Check if input is coordinates
    if (/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(trimmed)) {
      // Coordinates
      [lat, lon] = trimmed.split(',').map(s => parseFloat(s.trim()));
    } else {
      city = trimmed;
    }
    try {
      let w, f, a;
      if (city) {
        // By city
        const [wRes, fRes] = await Promise.all([
          fetch(`${API_BASE}/weather/city?city=${encodeURIComponent(city)}`),
          fetch(`${API_BASE}/weather/forecast/city?city=${encodeURIComponent(city)}`),
        ]);
        w = await wRes.json();
        f = await fRes.json();
        // For alerts, need lat/lon from city result if available
        if (w.coord && w.coord.lat && w.coord.lon) {
          const aRes = await fetch(`${API_BASE}/weather/alerts?lat=${w.coord.lat}&lon=${w.coord.lon}`);
          a = await aRes.json();
        } else {
          a = [];
        }
      } else if (lat !== null && lon !== null) {
        // By coordinates
        const [wRes, fRes, aRes] = await Promise.all([
          fetch(`${API_BASE}/weather/coords?lat=${lat}&lon=${lon}`),
          fetch(`${API_BASE}/weather/forecast/coords?lat=${lat}&lon=${lon}`),
          fetch(`${API_BASE}/weather/alerts?lat=${lat}&lon=${lon}`),
        ]);
        w = await wRes.json();
        f = await fRes.json();
        a = await aRes.json();
      } else {
        throw new Error('Enter a city or coordinates');
      }
      setWeather(w);
      setForecast(f);
      setAlerts(Array.isArray(a) ? a : (a.alerts || []));
      setIsCustomLocation(true);
    } catch (e) {
      setError(e.message || 'Failed to fetch weather for location');
    }
    setSearching(false);
  };

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
      // Fetch weather, forecast, alerts and update cache
      const [wRes, fRes, aRes] = await Promise.all([
        fetch(`${API_BASE}/weather/coords?lat=${farmLocation.lat}&lon=${farmLocation.lng}`),
        fetch(`${API_BASE}/weather/forecast/coords?lat=${farmLocation.lat}&lon=${farmLocation.lng}`),
        fetch(`${API_BASE}/weather/alerts?lat=${farmLocation.lat}&lon=${farmLocation.lng}`),
      ]);
      const w = await wRes.json();
      const f = await fRes.json();
      const a = await aRes.json();
      setWeather(w);
      setForecast(f);
      setAlerts(Array.isArray(a) ? a : (a.alerts || []));
      await AsyncStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(w));
      await AsyncStorage.setItem(FORECAST_CACHE_KEY, JSON.stringify(f));
      await AsyncStorage.setItem(ALERTS_CACHE_KEY, JSON.stringify(Array.isArray(a) ? a : (a.alerts || [])));
    } catch (e) {
      setError(e.message || 'Failed to update weather');
      setProfileLoading(false);
    }
    setLoading(false);
  };

  // --- Back to Farm Handler (loads from cache only) ---
  const handleBackToFarm = async () => {
    setLoading(true);
    setProfileLoading(true);
    setError(null);
    try {
      // Load profile from cache
      const cachedProfile = await AsyncStorage.getItem(FARMER_PROFILE_CACHE_KEY);
      let prof = null;
      if (cachedProfile) {
        prof = JSON.parse(cachedProfile);
        setProfile(prof);
        farmProfileRef.current = prof;
        const { farmLocation } = prof;
        farmLocationRef.current = farmLocation;
      }
      setProfileLoading(false);
      // Load from cache only
      const [cachedWeather, cachedForecast, cachedAlerts] = await Promise.all([
        AsyncStorage.getItem(WEATHER_CACHE_KEY),
        AsyncStorage.getItem(FORECAST_CACHE_KEY),
        AsyncStorage.getItem(ALERTS_CACHE_KEY),
      ]);
      if (cachedWeather) setWeather(JSON.parse(cachedWeather));
      if (cachedForecast) setForecast(JSON.parse(cachedForecast));
      if (cachedAlerts) setAlerts(JSON.parse(cachedAlerts));
      setIsCustomLocation(false);
    } catch (e) {
      setError(e.message || 'Failed to load farm weather');
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
        {/* Search Bar */}
        <View style={{ flexDirection: 'row', alignItems: 'center', margin: 16, marginBottom: 0 }}>
          <TextInput
            style={{ flex: 1, backgroundColor: '#23232a', borderRadius: 12, padding: 12, color: '#fff', fontSize: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginRight: 8 }}
            placeholder="Enter city (Pune,IN) or lat,lon"
            placeholderTextColor="#64748B"
            value={searchValue}
            onChangeText={setSearchValue}
            editable={!searching && !loading}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity onPress={handleSearch} disabled={searching || loading} style={{ backgroundColor: '#3B82F6', borderRadius: 10, padding: 12, opacity: searching || loading ? 0.6 : 1 }}>
            <Ionicons name="search" size={22} color="#fff" />
          </TouchableOpacity>
          {isCustomLocation && (
            <TouchableOpacity onPress={handleBackToFarm} style={{ backgroundColor: '#10b981', borderRadius: 10, padding: 12, marginLeft: 8 }}>
              <Ionicons name="home" size={22} color="#fff" />
            </TouchableOpacity>
          )}
          {!isCustomLocation && (
            <TouchableOpacity onPress={handleUpdate} disabled={loading} style={{ backgroundColor: '#64748B', borderRadius: 10, padding: 12, marginLeft: 8, opacity: loading ? 0.6 : 1 }}>
              <Ionicons name="refresh" size={22} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
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
        {/* Main Content */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {(loading && !weather && !forecast && !alerts) ? (
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
              {/* Alerts Section */}
              <View style={styles.sectionHeader}>
                <Ionicons name="alert-circle" size={22} color="#EF4444" style={{ marginRight: 8 }} />
                <Text style={styles.sectionTitle}>Weather Alerts</Text>
              </View>
              {alerts && alerts.length > 0 ? (
                alerts.map((alert, idx) => (
                  <LinearGradient key={idx} colors={["#ef4444", "#18181b"]} style={styles.alertCard}>
                    <Text style={styles.alertTitle}>{alert.event}</Text>
                    <Text style={styles.alertDesc}>{alert.description}</Text>
                    <Text style={styles.alertTime}>{new Date(alert.start * 1000).toLocaleString()} - {new Date(alert.end * 1000).toLocaleString()}</Text>
                  </LinearGradient>
                ))
              ) : (
                <Text style={{ color: '#fff', opacity: 0.7, marginLeft: 16, marginBottom: 24 }}>No weather alerts for your farm right now.</Text>
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
  alertCard: { marginHorizontal: 16, marginBottom: 12, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  alertTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  alertDesc: { color: '#fff', fontSize: 13, marginBottom: 4 },
  alertTime: { color: '#fff', fontSize: 12, opacity: 0.7 },
});

export default WeatherScreen; 