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
  LayoutAnimation
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const API_BASE = 'http://192.168.0.111:8000'; // Ensure this is your correct local IP

const SoilMoistureScreen = ({ navigation }) => {
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [state, setState] = useState('Maharashtra');
  const [district, setDistrict] = useState('Pune');
  const [year, setYear] = useState('2022');
  const [month, setMonth] = useState('January');
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    try {
      const url = `${API_BASE}/soil-moisture?state=${encodeURIComponent(state)}&district=${encodeURIComponent(district)}&year=${encodeURIComponent(year)}&month=${encodeURIComponent(month)}`;
      const response = await fetch(url);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed to fetch soil moisture data.');
      }
      const result = await response.json();
      setData(result);
    } catch (e) {
      setError(e.message || 'An error occurred.');
      setData([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch data on initial load
  useEffect(() => {
    fetchData();
  }, []);

  const renderDataItem = (item, index) => {
    // Determine color based on moisture value, from red (dry) to green (wet)
    const moistureValue = parseFloat(item.Soil_Moisture_1) || 0;
    const colorIntensity = Math.min(255, Math.max(0, moistureValue * 5)); // crude mapping
    const moistureColor = `rgb(${255 - colorIntensity}, ${colorIntensity}, 0)`;
    
    return (
        <View style={styles.dataCard} key={index}>
          <LinearGradient colors={['#2C2C2E', '#1C1C1E']} style={styles.dataCardGradient}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.Agency_name}</Text>
              <View style={[styles.dateBadge, { backgroundColor: moistureColor }]}>
                <Text style={styles.dateText}>{item.Day}/{item.Month}/{item.Year}</Text>
              </View>
            </View>
            <View style={styles.cardBody}>
                <View style={styles.statItem}><Text style={styles.statLabel}>Moisture (0-30cm)</Text><Text style={[styles.statValue, {color: moistureColor}]}>{item.Soil_Moisture_1}</Text></View>
                <View style={styles.statItem}><Text style={styles.statLabel}>Moisture (30-60cm)</Text><Text style={styles.statValue}>{item.Soil_Moisture_2}</Text></View>
                <View style={styles.statItem}><Text style={styles.statLabel}>Moisture (60-90cm)</Text><Text style={styles.statValue}>{item.Soil_Moisture_3}</Text></View>
            </View>
            <View style={styles.locationFooter}>
                <Ionicons name="location-outline" size={14} color="#8E8E93" />
                <Text style={styles.locationText}>{item.District}, {item.State}</Text>
            </View>
          </LinearGradient>
        </View>
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
          <View style={styles.searchContainer}>
            <TextInput style={styles.searchInput} value={state} onChangeText={setState} placeholder="State" placeholderTextColor="#555" />
            <TextInput style={styles.searchInput} value={district} onChangeText={setDistrict} placeholder="District" placeholderTextColor="#555" />
            <TextInput style={styles.searchInput} value={year} onChangeText={setYear} placeholder="Year" placeholderTextColor="#555" keyboardType="numeric" />
            <TextInput style={styles.searchInput} value={month} onChangeText={setMonth} placeholder="Month" placeholderTextColor="#555" />
          </View>
          <TouchableOpacity style={[styles.searchButton, loading && styles.disabledButton]} onPress={fetchData} disabled={loading}>
            {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.searchButtonText}>Search</Text>}
          </TouchableOpacity>
          {error && <Text style={styles.errorText}>{error}</Text>}
          
          {loading && data.length === 0 ? (
             <ActivityIndicator color="#fff" style={{ marginTop: 40 }} size="large" />
          ) : data.length > 0 ? (
            data.map((item, index) => renderDataItem(item, index))
          ) : (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                No soil moisture data found for this selection.
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
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#2C2C2E'},
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
    cardBody: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
    statItem: { alignItems: 'center' },
    statLabel: { fontSize: 12, color: '#8E8E93', marginBottom: 4 },
    statValue: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
    locationFooter: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#2C2C2E', paddingTop: 12, justifyContent: 'center' },
    locationText: { marginLeft: 8, fontSize: 12, color: '#8E8E93' },
    emptyContainer: { marginTop: 40, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
    emptyText: { color: '#8E8E93', textAlign: 'center', fontSize: 16, lineHeight: 24 },
});

export default SoilMoistureScreen; 