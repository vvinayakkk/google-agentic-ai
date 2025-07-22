import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  UIManager,
  LayoutAnimation,
  Animated,
  FlatList,
  TouchableWithoutFeedback,
  Modal,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import RNPickerSelect from 'react-native-picker-select';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Markdown from 'react-native-markdown-display';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const API_BASE = 'http://10.123.4.245:8000'; // Ensure this is your correct local IP
const CACHE_KEY = 'soilMoistureDataCache';
const FARMER_ID = 'f001';

const SoilMoistureScreen = ({ navigation }) => {
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [loading, setLoading] = useState(false);
  const [allStates, setAllStates] = useState([]);
  const [allDistricts, setAllDistricts] = useState([]);
  const [summaryAnim] = useState(new Animated.Value(0));
  const [cardAnims, setCardAnims] = useState([]);
  const [masterStates, setMasterStates] = useState([]);
  const [masterDistricts, setMasterDistricts] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  // Load cached data on mount, then fetch fresh data in background
  useEffect(() => {
    let isMounted = true;
    const loadCacheAndFetch = async () => {
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached && isMounted) {
          setData(JSON.parse(cached));
        }
      } catch (e) {}
      // Always fetch fresh data in background
      fetchData(true);
    };
    loadCacheAndFetch();
    return () => { isMounted = false; };
  }, []);

  // Modified fetchData to optionally skip loading state and cache result
  const fetchData = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    setError(null);
    if (!isBackground) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    try {
      let url = `${API_BASE}/soil-moisture?`;
      const params = [];
      if (state && state.trim()) params.push(`state=${encodeURIComponent(state)}`);
      if (district && district.trim()) params.push(`district=${encodeURIComponent(district)}`);
      url += params.join('&');
      const response = await fetch(url);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed to fetch soil moisture data.');
      }
      const result = await response.json();
      setData(result);
      // Save to cache
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(result));
    } catch (e) {
      setError(e.message || 'An error occurred.');
      setData([]);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };
  
  // Fetch farmer profile and set default state
  useEffect(() => {
    const fetchFarmerProfile = async () => {
      try {
        const response = await fetch(`${API_BASE}/farmer/f001/profile`);
        if (!response.ok) return;
        const profile = await response.json();
        if (profile && profile.state) {
          setState(profile.state);
        } else if (profile && profile.village) {
          // Try to extract state from village string if possible
          const parts = profile.village.split(',').map(s => s.trim());
          if (parts.length > 1) setState(parts[1]);
        }
      } catch (e) {}
    };
    fetchFarmerProfile();
  }, []);

  // Fetch master filter options on mount
  useEffect(() => {
    const fetchMasterOptions = async () => {
      try {
        let url = `${API_BASE}/soil-moisture?state=Maharashtra`;
        const response = await fetch(url);
        if (!response.ok) return;
        const result = await response.json();
        setMasterStates([...new Set(result.map(item => item.State).filter(Boolean))]);
        setMasterDistricts([...new Set(result.map(item => item.District).filter(Boolean))]);
      } catch (e) {}
    };
    fetchMasterOptions();
  }, []);

  // Extract unique filter options from data
  useEffect(() => {
    if (data && data.length > 0) {
      setAllStates([...new Set(data.map(item => item.State).filter(Boolean))]);
      setAllDistricts([...new Set(data.map(item => item.District).filter(Boolean))]);
    }
  }, [data]);

  useEffect(() => {
    Animated.timing(summaryAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  // Set up cardAnims when data changes
  useEffect(() => {
    setCardAnims(data.map(() => new Animated.Value(0)));
  }, [data]);

  // Run animations after cardAnims is set
  useEffect(() => {
    if (cardAnims.length === data.length && data.length > 0) {
      cardAnims.forEach((anim, i) => {
        Animated.timing(anim, {
          toValue: 1,
          duration: 500,
          delay: 100 + i * 80,
          useNativeDriver: true,
        }).start();
      });
    }
    // eslint-disable-next-line
  }, [cardAnims, data]);

  // Update filteredData whenever data or filters change
  useEffect(() => {
    let filtered = data;
    if (state && state.trim()) filtered = filtered.filter(item => item.State && item.State.toLowerCase().includes(state.toLowerCase()));
    if (district && district.trim()) filtered = filtered.filter(item => item.District && item.District.toLowerCase().includes(district.toLowerCase()));
    setFilteredData(filtered);
  }, [data, state, district]);

  const clearFilters = () => {
    setState('');
    setDistrict('');
  };

  // Handler for AI Assistant button
  const handleAIAssistant = async () => {
    if (!district) {
      Alert.alert('Select District', 'Please select a district first to get AI suggestions.');
      return;
    }
    setAiModalVisible(true);
    setAiLoading(true);
    setAiError('');
    setAiSuggestions([]);
    try {
      const response = await fetch(`${API_BASE}/soil-moisture/ai-suggestion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state, district, farmer_id: FARMER_ID }),
      });
      const result = await response.json();
      if (result.suggestions) {
        setAiSuggestions(result.suggestions);
      } else {
        setAiError('No suggestions received.');
      }
    } catch (e) {
      setAiError('Failed to get AI suggestions.');
    } finally {
      setAiLoading(false);
    }
  };

  const renderDataItem = (item, index) => {
    // Highlight color for Avg_smlvl_at15cm
    const moistureValue = parseFloat(item.Avg_smlvl_at15cm) || 0;
    const colorIntensity = Math.min(255, Math.max(0, moistureValue * 5));
    const moistureColor = `rgb(${255 - colorIntensity}, ${colorIntensity}, 80)`;
    return (
      <Animated.View style={{ opacity: (cardAnims[index] || 1) }} key={index}>
        <View style={styles.dataCard}>
          <LinearGradient colors={['#232526', '#414345']} style={styles.dataCardGradient}>
            <View style={styles.cardHeader}>
              {/* Show Location as the main title */}
              <Text style={styles.cardTitle}>{item.District}, {item.State}</Text>
              {/* Date badge removed */}
            </View>
            <View style={styles.cardBodyAllFields}>
              {/* Show Agency name in the body, smaller */}
              <View style={styles.fieldRow}>
                <Ionicons name="business" size={16} color="#FFD580" style={{ marginRight: 6 }} />
                <Text style={styles.fieldKey}>Agency:</Text>
                <Text style={styles.fieldValue}>{item.Agency_name || 'Unknown Agency'}</Text>
              </View>
              {Object.entries(item).map(([key, value]) => {
                if (["Agency_name", "Date", "Month", "Year", "State", "District", "Avg_smlvl_at15cm"].includes(key)) return null;
                return (
                  <View key={key} style={styles.fieldRow}>
                    <Text style={styles.fieldKey}>{key.replace(/_/g, ' ')}:</Text>
                    <Text style={styles.fieldValue}>{String(value)}</Text>
                  </View>
                );
              })}
              <View style={styles.fieldRow}>
                <Ionicons name="water" size={18} color={moistureColor} style={{ marginRight: 6 }} />
                <Text style={styles.fieldKey}>Avg Moisture (15cm):</Text>
                <Text style={[styles.fieldValue, { color: moistureColor, fontWeight: 'bold' }]}>{item.Avg_smlvl_at15cm}</Text>
              </View>
            </View>
          </LinearGradient>
        </View>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Soil Moisture Data</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 20 }}>
        <View style={styles.section}>
          <Animated.View style={[styles.summaryBar, { opacity: summaryAnim }]}> 
            <LinearGradient colors={['#FFD580', '#FFB347']} style={styles.summaryGradient}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="analytics" size={22} color="#232526" style={{ marginRight: 8 }} />
                  <Text style={styles.summaryText}>Records: <Text style={styles.summaryValue}>{filteredData.length}</Text></Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="water" size={20} color="#232526" style={{ marginRight: 4 }} />
                  <Text style={styles.summaryText}>Avg Moisture: <Text style={styles.summaryValue}>{filteredData.length > 0 ? (filteredData.reduce((acc, item) => acc + (parseFloat(item.Avg_smlvl_at15cm) || 0), 0) / filteredData.length).toFixed(2) : '--'}</Text></Text>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>
          {/* AI Assistant Button */}
          <TouchableOpacity style={styles.aiButton} onPress={handleAIAssistant}>
            <Ionicons name="chatbubbles" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.aiButtonText}>Ask AI Assistant</Text>
          </TouchableOpacity>
          <View style={styles.searchContainer}>
            {/* State Input with Suggestions */}
            <View style={{ marginBottom: 8 }}>
              <TextInput
                style={styles.searchInput}
                value={state}
                onChangeText={setState}
                placeholder="State"
                placeholderTextColor="#555"
                autoCapitalize="words"
              />
              {state.length > 0 && masterStates.length > 0 && (
                <View style={styles.suggestionList}>
                  {masterStates.filter(s => s.toLowerCase().includes(state.toLowerCase()) && s !== state).slice(0, 5).map(item => (
                    <TouchableWithoutFeedback key={item} onPress={() => setState(item)}>
                      <View style={styles.suggestionItem}><Text style={styles.suggestionText}>{item}</Text></View>
                    </TouchableWithoutFeedback>
                  ))}
                </View>
              )}
            </View>
            {/* District Input with Suggestions */}
            <View style={{ marginBottom: 8 }}>
              <TextInput
                style={styles.searchInput}
                value={district}
                onChangeText={setDistrict}
                placeholder="District"
                placeholderTextColor="#555"
                autoCapitalize="words"
              />
              {district.length > 0 && masterDistricts.length > 0 && (
                <View style={styles.suggestionList}>
                  {masterDistricts.filter(d => d.toLowerCase().includes(district.toLowerCase()) && d !== district).slice(0, 5).map(item => (
                    <TouchableWithoutFeedback key={item} onPress={() => setDistrict(item)}>
                      <View style={styles.suggestionItem}><Text style={styles.suggestionText}>{item}</Text></View>
                    </TouchableWithoutFeedback>
                  ))}
                </View>
              )}
            </View>
            <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
              <Text style={styles.clearButtonText}>Clear Filters</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={[styles.searchButton, loading && styles.disabledButton]} onPress={fetchData} disabled={loading}>
            {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.searchButtonText}>Search</Text>}
          </TouchableOpacity>
          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
        {/* Data Cards Rendered Below Filters */}
        {loading && filteredData.length === 0 ? (
          <ActivityIndicator color="#fff" style={{ marginTop: 40 }} size="large" />
        ) : filteredData.length > 0 ? (
          filteredData.map((item, index) => renderDataItem(item, index))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No soil moisture data found for this selection.
            </Text>
          </View>
        )}
      </ScrollView>
      {/* AI Assistant Modal */}
      <Modal
        visible={aiModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAiModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>AI Suggestions for {district ? `${district}, ` : ''}{state}</Text>
            {aiLoading ? (
              <ActivityIndicator size="large" color="#FFD580" style={{ marginVertical: 20 }} />
            ) : aiError ? (
              <Text style={styles.errorText}>{aiError}</Text>
            ) : (
              aiSuggestions.length > 0 ? (
                <Markdown style={{ body: { color: '#fff', fontSize: 16 } }}>{aiSuggestions[0]}</Markdown>
              ) : (
                <Text style={styles.emptyText}>No suggestions found.</Text>
              )
            )}
            <TouchableOpacity style={styles.closeButton} onPress={() => setAiModalVisible(false)}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000000' },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 62, borderBottomWidth: 1, borderBottomColor: '#2C2C2E',paddingBottom:10},
    backButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2C2C2E'},
    headerTitle: { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' },
    scrollView: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
    section: { marginBottom: 24 },
    searchContainer: { flexDirection: 'column', marginBottom: 16, gap: 12 },
    searchInput: { backgroundColor: '#1C1C1E', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: '#fff', borderWidth: 1, borderColor: '#3A3A3C' },
    searchButton: { paddingVertical: 14, backgroundColor: '#FFFFFF', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    searchButtonText: { color: '#000000', fontSize: 16, fontWeight: 'bold' },
    disabledButton: { backgroundColor: '#3A3A3C' },
    errorText: { color: '#FFD580', textAlign: 'center', marginBottom: 12, fontSize: 14 },
    dataCard: { borderRadius: 16, marginBottom: 12, overflow: 'hidden', backgroundColor: '#1C1C1E'},
    dataCardGradient: { padding: 16 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    cardTitle: { fontSize: 18, fontWeight: '600', color: '#FFFFFF' },
    dateBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    dateText: { color: '#000', fontSize: 12, fontWeight: 'bold' },
    cardBodyAllFields: { paddingVertical: 8, paddingHorizontal: 4 },
    fieldRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    fieldKey: { color: '#FFD580', fontWeight: '600', marginRight: 6, fontSize: 18 },
    fieldValue: { color: '#fff', fontSize: 18 },
    locationFooter: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#2C2C2E', paddingTop: 12, justifyContent: 'center' },
    locationText: { marginLeft: 8, fontSize: 12, color: '#8E8E93' },
    emptyContainer: { marginTop: 40, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
    emptyText: { color: '#8E8E93', textAlign: 'center', fontSize: 16, lineHeight: 24 },
    clearButton: {
      paddingVertical: 10,
      paddingHorizontal: 20,
      backgroundColor: '#FFD580',
      borderRadius: 8,
      alignSelf: 'flex-start',
      marginTop: 10,
    },
    clearButtonText: {
      color: '#000000',
      fontSize: 14,
      fontWeight: 'bold',
    },
    summaryBar: { marginBottom: 16, borderRadius: 12, overflow: 'hidden' },
    summaryGradient: { padding: 16, borderRadius: 12 },
    summaryText: { color: '#232526', fontWeight: 'bold', fontSize: 15 },
    summaryValue: { color: '#232526', fontWeight: 'bold', fontSize: 16 },
    suggestionList: {
      backgroundColor: '#222',
      borderRadius: 8,
      marginTop: 2,
      maxHeight: 120,
      zIndex: 10,
    },
    suggestionItem: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#333',
    },
    suggestionText: {
      color: '#FFD580',
      fontSize: 15,
    },
    aiButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFD580',
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 18,
      alignSelf: 'center',
      marginBottom: 16,
    },
    aiButtonText: {
      color: '#232526',
      fontWeight: 'bold',
      fontSize: 16,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: '#232526',
      borderRadius: 16,
      padding: 24,
      width: '85%',
      alignItems: 'center',
    },
    modalTitle: {
      color: '#FFD580',
      fontWeight: 'bold',
      fontSize: 18,
      marginBottom: 16,
      textAlign: 'center',
    },
    suggestionText: {
      color: '#fff',
      fontSize: 16,
      marginBottom: 10,
      textAlign: 'left',
      alignSelf: 'flex-start',
    },
    closeButton: {
      marginTop: 20,
      backgroundColor: '#FFD580',
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 24,
    },
    closeButtonText: {
      color: '#232526',
      fontWeight: 'bold',
      fontSize: 16,
    },
});

const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#3A3A3C',
    borderRadius: 8,
    color: '#fff',
    backgroundColor: '#1C1C1E',
    marginBottom: 8,
  },
  inputAndroid: {
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#3A3A3C',
    borderRadius: 8,
    color: '#fff',
    backgroundColor: '#1C1C1E',
    marginBottom: 8,
  },
});

export default SoilMoistureScreen; 