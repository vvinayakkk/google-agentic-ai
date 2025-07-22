import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  StyleSheet,
  TextInput,
  Animated,
  Platform,
  LayoutAnimation,
  UIManager,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';


if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const API_BASE = 'http://10.123.4.245:8000'; // Ensure this is your correct local IP
const MARKET_CACHE_KEY = 'market-prices-cache';

const AnimatedListItem = ({ children, index }) => {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      delay: index * 100,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, index]);
  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
      {children}
    </Animated.View>
  );
};

const NewMarketPricesScreen = ({ navigation, embedded = false }) => {
  const [marketData, setMarketData] = useState([]);
  const [error, setError] = useState(null);
  const [searchState, setSearchState] = useState('Maharashtra');
  const [searchDistrict, setSearchDistrict] = useState('Mumbai');
  const [searchCommodity, setSearchCommodity] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);


  // --- Data Processing ---
  const processAndFilterPrices = (records) => {
    if (!records || records.length === 0) {
      return [];
    }
    const latestPrices = new Map();
    
    records.forEach(item => {
      const key = `${item.Market}-${item.Commodity}-${item.Variety}`;
      // Date format is DD/MM/YYYY, need to parse carefully
      const dateParts = item.Arrival_Date.split('/');
      const arrivalDate = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`);

      const existingEntry = latestPrices.get(key);
      if (!existingEntry || arrivalDate > existingEntry.arrivalDate) {
        latestPrices.set(key, { ...item, arrivalDate });
      }
    });

    return Array.from(latestPrices.values());
  };

  // --- API Fetching ---
  const fetchMarketPrices = async (state, commodity, district) => {
    let url = `${API_BASE}/market/prices?state=${encodeURIComponent(state)}&commodity=${encodeURIComponent(commodity)}`;
    if (district) {
      url += `&district=${encodeURIComponent(district)}`;
    }
    const response = await fetch(url);
    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.detail || `Failed for ${commodity}`);
    }
    return response.json();
  };

  const fetchTopCommodities = async (forceRefresh = false) => {
    setLoading(true);
    setError(null);

    if (!forceRefresh) {
        try {
            const cachedData = await AsyncStorage.getItem(MARKET_CACHE_KEY);
            if (cachedData) {
                setMarketData(JSON.parse(cachedData));
                setLoading(false);
                return; // Exit if we have cached data
            }
        } catch (e) {
            console.error("Failed to load from cache", e);
        }
    }

    const topCommodities = ['Wheat', 'Paddy(Dhan)', 'Cotton', 'Soyabean', 'Gram', 'Maize'];
    try {
      const allPromises = topCommodities.map(commodity =>
        fetchMarketPrices(searchState, commodity, searchDistrict)
      );
      const results = await Promise.allSettled(allPromises);
      const successfulResults = results
        .filter(p => p.status === 'fulfilled')
        .flatMap(p => p.value);
      
      const processedData = processAndFilterPrices(successfulResults);
      setMarketData(processedData);
      await AsyncStorage.setItem(MARKET_CACHE_KEY, JSON.stringify(processedData));

    } catch (e) {
      setError(e.message || 'An error occurred fetching top commodities.');
      setMarketData([]);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSearch = async () => {
    if (!searchCommodity.trim()) {
      // If no commodity is entered, fetch top commodities (like refresh)
      await fetchTopCommodities(true);
      return;
    }
    setIsSearching(true);
    setError(null);
    try {
        const results = await fetchMarketPrices(searchState, searchCommodity, searchDistrict);
        const processedData = processAndFilterPrices(results);
        setMarketData(processedData);
    } catch(e) {
        setError(e.message);
        setMarketData([]);
    } finally {
        setIsSearching(false);
    }
  };

  useEffect(() => {
    fetchTopCommodities();
  }, []);

  const renderMarketItem = (item, index) => {
    const minPrice = parseFloat(item.Min_Price) || 0;
    const maxPrice = parseFloat(item.Max_Price) || 0;
    const modalPrice = parseFloat(item.Modal_Price) || 0;
    const key = `${item.Arrival_Date}-${item.Market}-${item.Variety}-${index}`;
    return (
      <AnimatedListItem index={index} key={key}>
        <View style={styles.marketCard}>
          <LinearGradient colors={['#1C1C1E', '#1C1C1E']} style={styles.marketCardGradient}>
            <View style={styles.marketHeader}>
              <View style={styles.marketInfo}>
                <Text style={styles.cropEmoji}>🌾</Text>
                <View>
                  <Text style={styles.cropName}>{item.Commodity}</Text>
                  <Text style={styles.volume}>Market: {item.Market}</Text>
                </View>
              </View>
              <View style={styles.priceInfo}>
                <Text style={styles.price}>₹{modalPrice.toFixed(2)}</Text>
                <Text style={styles.volume}>per Quintal</Text>
              </View>
            </View>
            <View style={styles.marketStats}>
              <View style={styles.statItem}><Text style={styles.statLabel}>Variety</Text><Text style={styles.statValue}>{item.Variety}</Text></View>
              <View style={styles.statItem}><Text style={styles.statLabel}>Min Price</Text><Text style={styles.statValue}>₹{minPrice.toFixed(2)}</Text></View>
              <View style={styles.statItem}><Text style={styles.statLabel}>Max Price</Text><Text style={styles.statValue}>₹{maxPrice.toFixed(2)}</Text></View>
            </View>
          </LinearGradient>
        </View>
      </AnimatedListItem>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {!embedded && <StatusBar barStyle="light-content" backgroundColor="#000" />}
      {!embedded && (
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Live Market Prices</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={() => fetchTopCommodities(true)} disabled={loading}>
              <Ionicons name="refresh" size={24} color={loading ? '#555' : '#FFFFFF'} />
          </TouchableOpacity>
        </View>
      )}
      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingTop: embedded ? 0 : 32, paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <View style={styles.searchContainer}>
            <TextInput style={styles.searchInput} value={searchState} onChangeText={setSearchState} placeholder="State (e.g., Maharashtra)" placeholderTextColor="#555" />
            <TextInput style={styles.searchInput} value={searchDistrict} onChangeText={setSearchDistrict} placeholder="District (Optional)" placeholderTextColor="#555" />
            <TextInput style={styles.searchInput} value={searchCommodity} onChangeText={setSearchCommodity} placeholder="Commodity (e.g., Wheat)" placeholderTextColor="#555" />
          </View>
          <TouchableOpacity style={[styles.searchButton, isSearching && styles.disabledButton]} onPress={handleSearch} disabled={isSearching}>
            {isSearching ? <ActivityIndicator color="#000" /> : <Text style={styles.searchButtonText}>Search Prices</Text>}
          </TouchableOpacity>
          {error && <Text style={styles.errorText}>{error}</Text>}
          {loading ? (
             <ActivityIndicator color="#fff" style={{ marginTop: 40 }} size="large" />
          ) : marketData.length > 0 ? (
            marketData.map((item, index) => renderMarketItem(item, index))
          ) : (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                No market data found. Try refreshing or searching.
                </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000000' },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 62, borderBottomWidth: 1, borderBottomColor: '#2C2C2E', paddingBottom:10 },
    backButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2C2C2E'},
    headerTitle: { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' },
    refreshButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    scrollView: { flex: 1, paddingHorizontal: 16 },
    section: { marginBottom: 24 },
    searchContainer: { flexDirection: 'column', marginBottom: 16, gap: 12 },
    searchInput: { backgroundColor: '#1C1C1E', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: '#fff', borderWidth: 1, borderColor: '#3A3A3C' },
    searchButton: { paddingVertical: 14, backgroundColor: '#FFFFFF', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    searchButtonText: { color: '#000000', fontSize: 16, fontWeight: 'bold' },
    disabledButton: { backgroundColor: '#3A3A3C' },
    errorText: { color: '#FFD580', textAlign: 'center', marginBottom: 12, fontSize: 14 },
    marketCard: { borderRadius: 16, marginBottom: 12, overflow: 'hidden', backgroundColor: '#1C1C1E'},
    marketCardGradient: { padding: 16, borderWidth: 1, borderColor: '#3A3A3C' },
    marketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    marketInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', marginRight: 8 },
    cropEmoji: { fontSize: 28, marginRight: 12 },
    cropName: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
    volume: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
    priceInfo: { alignItems: 'flex-end' },
    price: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' },
    marketStats: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#3A3A3C' },
    statItem: { flex: 1, alignItems: 'center' },
    statLabel: { fontSize: 12, color: '#8E8E93', marginBottom: 4 },
    statValue: { fontSize: 14, fontWeight: '500', color: '#FFFFFF' },
    emptyContainer: { marginTop: 40, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
    emptyText: { color: '#8E8E93', textAlign: 'center', fontSize: 16, lineHeight: 24 },
  });
  
  export default NewMarketPricesScreen; 