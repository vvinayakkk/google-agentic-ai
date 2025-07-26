import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity, Animated, Easing, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

// Mock market data - in real app this would come from API
const MARKET_DATA = {
  'Rice': {
    currentPrice: 1850,
    potentialPrice: 2200,
    bestMandi: 'Azadpur Mandi, Delhi',
    bestTime: 'October-November',
    demand: 'High',
    competitors: 1200,
    transportCost: 150,
    commission: 2.5,
    qualityBonus: 200,
  },
  'Wheat': {
    currentPrice: 2100,
    potentialPrice: 2400,
    bestMandi: 'Khanna Mandi, Punjab',
    bestTime: 'April-May',
    demand: 'Very High',
    competitors: 800,
    transportCost: 180,
    commission: 2.0,
    qualityBonus: 150,
  },
  'Maize': {
    currentPrice: 1650,
    potentialPrice: 1900,
    bestMandi: 'Nizamabad Mandi, Telangana',
    bestTime: 'December-January',
    demand: 'Medium',
    competitors: 600,
    transportCost: 200,
    commission: 3.0,
    qualityBonus: 100,
  },
  'Cotton': {
    currentPrice: 6500,
    potentialPrice: 7200,
    bestMandi: 'Yavatmal Mandi, Maharashtra',
    bestTime: 'November-December',
    demand: 'High',
    competitors: 400,
    transportCost: 300,
    commission: 2.5,
    qualityBonus: 300,
  },
  'Tomato': {
    currentPrice: 25,
    potentialPrice: 45,
    bestMandi: 'Lasalgaon Mandi, Maharashtra',
    bestTime: 'March-April',
    demand: 'Very High',
    competitors: 2000,
    transportCost: 50,
    commission: 4.0,
    qualityBonus: 10,
  },
  'Onion': {
    currentPrice: 18,
    potentialPrice: 35,
    bestMandi: 'Lasalgaon Mandi, Maharashtra',
    bestTime: 'January-February',
    demand: 'High',
    competitors: 1500,
    transportCost: 40,
    commission: 3.5,
    qualityBonus: 8,
  },
  // Fallback data for other crops
  'Sugarcane': {
    currentPrice: 320,
    potentialPrice: 380,
    bestMandi: 'Muzzafarnagar Mandi, UP',
    bestTime: 'October-December',
    demand: 'High',
    competitors: 300,
    transportCost: 250,
    commission: 2.0,
    qualityBonus: 50,
  },
  'Potato': {
    currentPrice: 12,
    potentialPrice: 18,
    bestMandi: 'Agra Mandi, UP',
    bestTime: 'January-March',
    demand: 'Medium',
    competitors: 2500,
    transportCost: 60,
    commission: 3.0,
    qualityBonus: 5,
  },
  'Soybean': {
    currentPrice: 4200,
    potentialPrice: 4800,
    bestMandi: 'Indore Mandi, MP',
    bestTime: 'October-November',
    demand: 'High',
    competitors: 800,
    transportCost: 180,
    commission: 2.5,
    qualityBonus: 150,
  },
  'Groundnut': {
    currentPrice: 5800,
    potentialPrice: 6500,
    bestMandi: 'Junagadh Mandi, Gujarat',
    bestTime: 'November-December',
    demand: 'Medium',
    competitors: 600,
    transportCost: 200,
    commission: 2.5,
    qualityBonus: 200,
  },
};

const MANDI_INFO = {
  'Azadpur Mandi, Delhi': {
    distance: '45 km',
    commission: '2.5%',
    facilities: 'Cold Storage, Grading',
    contact: '011-23456789',
    bestDays: 'Monday, Wednesday, Friday',
  },
  'Khanna Mandi, Punjab': {
    distance: '120 km',
    commission: '2.0%',
    facilities: 'Warehouse, Testing Lab',
    contact: '01628-234567',
    bestDays: 'Tuesday, Thursday, Saturday',
  },
  'Nizamabad Mandi, Telangana': {
    distance: '85 km',
    commission: '3.0%',
    facilities: 'Storage, Transport',
    contact: '08462-234567',
    bestDays: 'Monday, Wednesday, Friday',
  },
  'Yavatmal Mandi, Maharashtra': {
    distance: '95 km',
    commission: '2.5%',
    facilities: 'Ginning, Storage',
    contact: '07232-234567',
    bestDays: 'Tuesday, Thursday, Saturday',
  },
  'Lasalgaon Mandi, Maharashtra': {
    distance: '110 km',
    commission: '4.0%',
    facilities: 'Cold Storage, Processing',
    contact: '02550-234567',
    bestDays: 'Daily',
  },
};

const MarketStrategyScreen = ({ route }) => {
  const { selectedCrop, landSize } = route.params || { selectedCrop: 'Rice', landSize: '5' };
  const [currentView, setCurrentView] = useState('earnings');
  const [fadeAnim] = useState(new Animated.Value(1));
  const [scaleAnim] = useState(new Animated.Value(1));

  // Get crop data with fallback and additional error handling
  const cropData = MARKET_DATA[selectedCrop] || MARKET_DATA['Rice'];
  const mandiData = MANDI_INFO[cropData.bestMandi] || MANDI_INFO['Azadpur Mandi, Delhi'];
  const landSizeNum = parseInt(landSize) || 5;
  const yieldPerAcre = selectedCrop === 'Tomato' || selectedCrop === 'Onion' ? 15 : 25; // tons for grains, tons for vegetables

  // Additional safety checks
  if (!cropData) {
    console.error('Market data not found for crop:', selectedCrop);
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Market data not available for {selectedCrop}</Text>
      </SafeAreaView>
    );
  }

  const currentEarnings = landSizeNum * yieldPerAcre * cropData.currentPrice;
  const potentialEarnings = landSizeNum * yieldPerAcre * cropData.potentialPrice;
  const profitIncrease = potentialEarnings - currentEarnings;
  const profitPercentage = ((profitIncrease / currentEarnings) * 100).toFixed(1);

  const animateView = () => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0.3,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
    ]).start();
  };

  const animateCard = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.bounce,
      }),
    ]).start();
  };

  useEffect(() => {
    animateView();
  }, [currentView]);

  const renderEarningsView = () => (
    <Animated.View style={[styles.viewContainer, { opacity: fadeAnim }]}>
      <Text style={styles.sectionTitle}>💰 Your Earnings Potential</Text>
      
      {/* Current vs Potential Earnings */}
      <View style={styles.earningsComparison}>
        <View style={styles.earningsCard}>
          <Text style={styles.earningsLabel}>Current Earnings</Text>
          <Text style={styles.currentEarnings}>₹{currentEarnings.toLocaleString()}</Text>
          <Text style={styles.earningsSubtext}>At ₹{cropData.currentPrice}/quintal</Text>
        </View>
        
        <View style={styles.arrowContainer}>
          <Text style={styles.arrow}>→</Text>
          <Text style={styles.profitText}>+{profitPercentage}%</Text>
        </View>
        
        <View style={styles.earningsCard}>
          <Text style={styles.earningsLabel}>Potential Earnings</Text>
          <Text style={styles.potentialEarnings}>₹{potentialEarnings.toLocaleString()}</Text>
          <Text style={styles.earningsSubtext}>At ₹{cropData.potentialPrice}/quintal</Text>
        </View>
      </View>

      {/* Profit Breakdown */}
      <Animated.View style={[styles.profitCard, { transform: [{ scale: scaleAnim }] }]}>
        <Text style={styles.profitTitle}>📈 Extra Profit: ₹{profitIncrease.toLocaleString()}</Text>
        <View style={styles.profitBreakdown}>
          <View style={styles.profitItem}>
            <Text style={styles.profitItemLabel}>Price Increase</Text>
            <Text style={styles.profitItemValue}>₹{(cropData.potentialPrice - cropData.currentPrice) * yieldPerAcre * landSizeNum}</Text>
          </View>
          <View style={styles.profitItem}>
            <Text style={styles.profitItemLabel}>Quality Bonus</Text>
            <Text style={styles.profitItemValue}>₹{cropData.qualityBonus * landSizeNum}</Text>
          </View>
          <View style={styles.profitItem}>
            <Text style={styles.profitItemLabel}>Transport Cost</Text>
            <Text style={styles.profitItemValue}>-₹{cropData.transportCost * landSizeNum}</Text>
          </View>
        </View>
      </Animated.View>

      {/* Market Demand */}
      <View style={styles.demandCard}>
        <Text style={styles.demandTitle}>📊 Market Demand: {cropData.demand}</Text>
        <Text style={styles.demandText}>
          {cropData.competitors.toLocaleString()} farmers selling {selectedCrop} in your region
        </Text>
      </View>
    </Animated.View>
  );

  const renderMandiView = () => (
    <Animated.View style={[styles.viewContainer, { opacity: fadeAnim }]}>
      <Text style={styles.sectionTitle}>🏪 Best Mandi: {cropData.bestMandi}</Text>
      
      <Animated.View style={[styles.mandiCard, { transform: [{ scale: scaleAnim }] }]}>
        <View style={styles.mandiHeader}>
          <Text style={styles.mandiName}>{cropData.bestMandi}</Text>
          <Text style={styles.mandiDistance}>{mandiData.distance} away</Text>
        </View>
        
        <View style={styles.mandiDetails}>
          <View style={styles.mandiDetail}>
            <Text style={styles.mandiDetailLabel}>📞 Contact</Text>
            <Text style={styles.mandiDetailValue}>{mandiData.contact}</Text>
          </View>
          <View style={styles.mandiDetail}>
            <Text style={styles.mandiDetailLabel}>💰 Commission</Text>
            <Text style={styles.mandiDetailValue}>{mandiData.commission}</Text>
          </View>
          <View style={styles.mandiDetail}>
            <Text style={styles.mandiDetailLabel}>🏗️ Facilities</Text>
            <Text style={styles.mandiDetailValue}>{mandiData.facilities}</Text>
          </View>
          <View style={styles.mandiDetail}>
            <Text style={styles.mandiDetailLabel}>📅 Best Days</Text>
            <Text style={styles.mandiDetailValue}>{mandiData.bestDays}</Text>
          </View>
        </View>
      </Animated.View>

      {/* Selling Tips */}
      <View style={styles.tipsCard}>
        <Text style={styles.tipsTitle}>💡 Smart Selling Tips</Text>
        <View style={styles.tipItem}>
          <Text style={styles.tipBullet}>•</Text>
          <Text style={styles.tipText}>Sell during {cropData.bestTime} for best prices</Text>
        </View>
        <View style={styles.tipItem}>
          <Text style={styles.tipBullet}>•</Text>
          <Text style={styles.tipText}>Grade your produce for quality bonus</Text>
        </View>
        <View style={styles.tipItem}>
          <Text style={styles.tipBullet}>•</Text>
          <Text style={styles.tipText}>Avoid peak arrival days (Tuesday-Thursday)</Text>
        </View>
        <View style={styles.tipItem}>
          <Text style={styles.tipBullet}>•</Text>
          <Text style={styles.tipText}>Store 30% for price appreciation</Text>
        </View>
      </View>
    </Animated.View>
  );

  const renderStrategyView = () => (
    <Animated.View style={[styles.viewContainer, { opacity: fadeAnim }]}>
      <Text style={styles.sectionTitle}>🎯 Your Action Plan</Text>
      
      <View style={styles.strategyCard}>
        <Text style={styles.strategyTitle}>Immediate Actions (This Week)</Text>
        <View style={styles.strategyItem}>
          <Text style={styles.strategyNumber}>1</Text>
          <Text style={styles.strategyText}>Contact {cropData.bestMandi} at {mandiData.contact}</Text>
        </View>
        <View style={styles.strategyItem}>
          <Text style={styles.strategyNumber}>2</Text>
          <Text style={styles.strategyText}>Arrange transport for {mandiData.distance} journey</Text>
        </View>
        <View style={styles.strategyItem}>
          <Text style={styles.strategyNumber}>3</Text>
          <Text style={styles.strategyText}>Grade and pack produce for quality bonus</Text>
        </View>
      </View>

      <View style={styles.strategyCard}>
        <Text style={styles.strategyTitle}>Long-term Strategy (Next Season)</Text>
        <View style={styles.strategyItem}>
          <Text style={styles.strategyNumber}>1</Text>
          <Text style={styles.strategyText}>Join FPO for better bargaining power</Text>
        </View>
        <View style={styles.strategyItem}>
          <Text style={styles.strategyNumber}>2</Text>
          <Text style={styles.strategyText}>Invest in storage facility</Text>
        </View>
        <View style={styles.strategyItem}>
          <Text style={styles.strategyNumber}>3</Text>
          <Text style={styles.strategyText}>Get organic certification for premium pricing</Text>
        </View>
      </View>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>📈 Market Intelligence</Text>
          <Text style={styles.subtitle}>{selectedCrop} - {landSize} acres</Text>
        </View>

        {/* Navigation Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, currentView === 'earnings' && styles.activeTab]}
            onPress={() => {
              setCurrentView('earnings');
              animateCard();
            }}
          >
            <Text style={[styles.tabText, currentView === 'earnings' && styles.activeTabText]}>💰 Earnings</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, currentView === 'mandi' && styles.activeTab]}
            onPress={() => {
              setCurrentView('mandi');
              animateCard();
            }}
          >
            <Text style={[styles.tabText, currentView === 'mandi' && styles.activeTabText]}>🏪 Best Mandi</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, currentView === 'strategy' && styles.activeTab]}
            onPress={() => {
              setCurrentView('strategy');
              animateCard();
            }}
          >
            <Text style={[styles.tabText, currentView === 'strategy' && styles.activeTabText]}>🎯 Action Plan</Text>
          </TouchableOpacity>
        </View>

        {/* Content Views */}
        {currentView === 'earnings' && renderEarningsView()}
        {currentView === 'mandi' && renderMandiView()}
        {currentView === 'strategy' && renderStrategyView()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#101613' },
  scrollContainer: { padding: 20 },
  header: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#4CAF50', marginBottom: 4 },
  subtitle: { fontSize: 16, color: '#aaa' },
  tabContainer: { flexDirection: 'row', marginBottom: 20, backgroundColor: '#181818', borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  activeTab: { backgroundColor: '#4CAF50' },
  tabText: { color: '#aaa', fontWeight: '600', fontSize: 14 },
  activeTabText: { color: '#fff' },
  viewContainer: { marginBottom: 20 },
  sectionTitle: { fontSize: 20, color: '#4CAF50', fontWeight: 'bold', marginBottom: 15 },
  earningsComparison: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  earningsCard: { flex: 1, backgroundColor: '#181818', borderRadius: 16, padding: 20, alignItems: 'center' },
  earningsLabel: { color: '#aaa', fontSize: 14, marginBottom: 8 },
  currentEarnings: { color: '#FF6B6B', fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  potentialEarnings: { color: '#4CAF50', fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  earningsSubtext: { color: '#666', fontSize: 12 },
  arrowContainer: { paddingHorizontal: 15, alignItems: 'center' },
  arrow: { fontSize: 24, color: '#4CAF50', marginBottom: 4 },
  profitText: { color: '#4CAF50', fontWeight: 'bold', fontSize: 16 },
  profitCard: { backgroundColor: '#181818', borderRadius: 16, padding: 20, marginBottom: 20 },
  profitTitle: { color: '#4CAF50', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  profitBreakdown: { gap: 12 },
  profitItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  profitItemLabel: { color: '#aaa', fontSize: 14 },
  profitItemValue: { color: '#fff', fontSize: 14, fontWeight: '600' },
  demandCard: { backgroundColor: '#181818', borderRadius: 16, padding: 20 },
  demandTitle: { color: '#FFC107', fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  demandText: { color: '#fff', fontSize: 14 },
  mandiCard: { backgroundColor: '#181818', borderRadius: 16, padding: 20, marginBottom: 20 },
  mandiHeader: { marginBottom: 15 },
  mandiName: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  mandiDistance: { color: '#4CAF50', fontSize: 14 },
  mandiDetails: { gap: 12 },
  mandiDetail: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mandiDetailLabel: { color: '#aaa', fontSize: 14 },
  mandiDetailValue: { color: '#fff', fontSize: 14, fontWeight: '600' },
  tipsCard: { backgroundColor: '#181818', borderRadius: 16, padding: 20 },
  tipsTitle: { color: '#FFC107', fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  tipItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  tipBullet: { color: '#4CAF50', fontSize: 16, marginRight: 8, marginTop: 2 },
  tipText: { color: '#fff', fontSize: 14, flex: 1 },
  strategyCard: { backgroundColor: '#181818', borderRadius: 16, padding: 20, marginBottom: 20 },
  strategyTitle: { color: '#4CAF50', fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
  strategyItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  strategyNumber: { 
    width: 24, 
    height: 24, 
    backgroundColor: '#4CAF50', 
    borderRadius: 12, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginRight: 12 
  },
  strategyText: { color: '#fff', fontSize: 14, flex: 1, lineHeight: 20 },
  errorText: {
    color: '#FF6B6B',
    fontSize: 18,
    textAlign: 'center',
    padding: 20,
  },
});

export default MarketStrategyScreen; 