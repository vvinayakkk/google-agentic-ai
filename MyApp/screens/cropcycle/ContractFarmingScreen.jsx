import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, StyleSheet, SafeAreaView, TouchableOpacity, Animated, Easing, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

// Mock corporate buyer data - in real app this would come from API
const CORPORATE_BUYERS = {
  'Rice': [
    {
      id: 1,
      name: 'ITC e-Choupal',
      logo: '🏢',
      contractPrice: 2200,
      marketPrice: 1850,
      premium: 19,
      requirements: 'Organic certification, 5-ton minimum',
      payment: 'Within 7 days',
      contract: '1 year',
      contact: '1800-425-1234',
      rating: 4.8,
      farmers: 15000,
    },
    {
      id: 2,
      name: 'Reliance Fresh',
      logo: '🛒',
      contractPrice: 2100,
      marketPrice: 1850,
      premium: 14,
      requirements: 'FSSAI certified, 3-ton minimum',
      payment: 'Within 15 days',
      contract: '6 months',
      contact: '1800-111-1111',
      rating: 4.5,
      farmers: 8000,
    },
  ],
  'Wheat': [
    {
      id: 1,
      name: 'Britannia Industries',
      logo: '🍞',
      contractPrice: 2500,
      marketPrice: 2100,
      premium: 19,
      requirements: 'High protein content, 10-ton minimum',
      payment: 'Within 10 days',
      contract: '1 year',
      contact: '1800-425-5678',
      rating: 4.7,
      farmers: 12000,
    },
    {
      id: 2,
      name: 'ITC Foods',
      logo: '🏢',
      contractPrice: 2400,
      marketPrice: 2100,
      premium: 14,
      requirements: 'Quality grade A, 5-ton minimum',
      payment: 'Within 7 days',
      contract: '1 year',
      contact: '1800-425-1234',
      rating: 4.6,
      farmers: 10000,
    },
  ],
  'Tomato': [
    {
      id: 1,
      name: 'BigBasket',
      logo: '🛒',
      contractPrice: 45,
      marketPrice: 25,
      premium: 80,
      requirements: 'Fresh, uniform size, 2-ton minimum',
      payment: 'Within 3 days',
      contract: '3 months',
      contact: '1800-425-9999',
      rating: 4.9,
      farmers: 5000,
    },
    {
      id: 2,
      name: 'Reliance Fresh',
      logo: '🛒',
      contractPrice: 40,
      marketPrice: 25,
      premium: 60,
      requirements: 'Grade A, 1-ton minimum',
      payment: 'Within 5 days',
      contract: '6 months',
      contact: '1800-111-1111',
      rating: 4.4,
      farmers: 3000,
    },
  ],
  'Cotton': [
    {
      id: 1,
      name: 'Arvind Mills',
      logo: '🧵',
      contractPrice: 7500,
      marketPrice: 6500,
      premium: 15,
      requirements: 'Long staple, 2-ton minimum',
      payment: 'Within 15 days',
      contract: '1 year',
      contact: '1800-425-7777',
      rating: 4.6,
      farmers: 8000,
    },
    {
      id: 2,
      name: 'Raymond',
      logo: '👔',
      contractPrice: 7200,
      marketPrice: 6500,
      premium: 11,
      requirements: 'Premium quality, 1-ton minimum',
      payment: 'Within 10 days',
      contract: '1 year',
      contact: '1800-425-8888',
      rating: 4.5,
      farmers: 6000,
    },
  ],
  // Fallback data for other crops
  'Sugarcane': [
    {
      id: 1,
      name: 'Sugar Mills Consortium',
      logo: '🏭',
      contractPrice: 380,
      marketPrice: 320,
      premium: 19,
      requirements: 'High sucrose content, 50-ton minimum',
      payment: 'Within 30 days',
      contract: '1 year',
      contact: '1800-425-1111',
      rating: 4.5,
      farmers: 20000,
    },
  ],
  'Potato': [
    {
      id: 1,
      name: 'PepsiCo',
      logo: '🥤',
      contractPrice: 18,
      marketPrice: 12,
      premium: 50,
      requirements: 'Processing grade, 10-ton minimum',
      payment: 'Within 7 days',
      contract: '6 months',
      contact: '1800-425-2222',
      rating: 4.6,
      farmers: 8000,
    },
  ],
  'Soybean': [
    {
      id: 1,
      name: 'Adani Wilmar',
      logo: '🛢️',
      contractPrice: 4800,
      marketPrice: 4200,
      premium: 14,
      requirements: 'High protein content, 5-ton minimum',
      payment: 'Within 10 days',
      contract: '1 year',
      contact: '1800-425-3333',
      rating: 4.4,
      farmers: 12000,
    },
  ],
  'Groundnut': [
    {
      id: 1,
      name: 'Mother Dairy',
      logo: '🥛',
      contractPrice: 6500,
      marketPrice: 5800,
      premium: 12,
      requirements: 'Aflatoxin-free, 3-ton minimum',
      payment: 'Within 7 days',
      contract: '1 year',
      contact: '1800-425-4444',
      rating: 4.3,
      farmers: 6000,
    },
  ],
};

const CERTIFICATION_INFO = {
  'Organic': {
    cost: '₹5000',
    duration: '6 months',
    benefits: '20% price premium',
    contact: 'APEDA: 1800-425-1111',
  },
  'FSSAI': {
    cost: '₹2000',
    duration: '1 month',
    benefits: 'Market access',
    contact: 'FSSAI: 1800-425-2222',
  },
  'GlobalGAP': {
    cost: '₹15000',
    duration: '3 months',
    benefits: 'Export access',
    contact: 'GlobalGAP: 1800-425-3333',
  },
};

const ContractFarmingScreen = ({ route }) => {
  const { selectedCrop, landSize } = route.params || { selectedCrop: 'Rice', landSize: '5' };
  const [currentView, setCurrentView] = useState('buyers');
  const [fadeAnim] = useState(new Animated.Value(1));
  const [scaleAnim] = useState(new Animated.Value(1));
  const [selectedBuyer, setSelectedBuyer] = useState(null);
  
  // Calculator state
  const [contractPrice, setContractPrice] = useState('2200');
  const [marketPrice, setMarketPrice] = useState('1850');
  const [yieldPerAcre, setYieldPerAcre] = useState('25');
  const [certificationCost, setCertificationCost] = useState('5000');

  // Get buyers with fallback and additional error handling
  const buyers = CORPORATE_BUYERS[selectedCrop] || CORPORATE_BUYERS['Rice'];
  const landSizeNum = parseInt(landSize) || 5;
  const yieldPerAcreNum = parseInt(yieldPerAcre) || 25;
  const totalYield = landSizeNum * yieldPerAcreNum;

  // Additional safety checks
  if (!buyers || buyers.length === 0) {
    console.error('Buyer data not found for crop:', selectedCrop);
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Contract farming data not available for {selectedCrop}</Text>
      </SafeAreaView>
    );
  }

  // Calculator calculations
  const contractPriceNum = parseInt(contractPrice) || 2200;
  const marketPriceNum = parseInt(marketPrice) || 1850;
  const certificationCostNum = parseInt(certificationCost) || 5000;
  
  const contractEarnings = totalYield * contractPriceNum;
  const marketEarnings = totalYield * marketPriceNum;
  const premiumEarnings = contractEarnings - marketEarnings;
  const netProfit = premiumEarnings - certificationCostNum;
  const roi = ((netProfit / certificationCostNum) * 100).toFixed(1);

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

  const renderBuyersView = () => (
    <Animated.View style={[styles.viewContainer, { opacity: fadeAnim }]}>
      <Text style={styles.sectionTitle}>🏢 Corporate Buyers</Text>
      
      {buyers.map((buyer, index) => {
        const contractEarnings = totalYield * buyer.contractPrice;
        const marketEarnings = totalYield * buyer.marketPrice;
        const extraProfit = contractEarnings - marketEarnings;
        
        return (
          <Animated.View key={buyer.id} style={[styles.buyerCard, { transform: [{ scale: scaleAnim }] }]}>
            <View style={styles.buyerHeader}>
              <View style={styles.buyerInfo}>
                <Text style={styles.buyerLogo}>{buyer.logo}</Text>
                <View>
                  <Text style={styles.buyerName}>{buyer.name}</Text>
                  <View style={styles.buyerRating}>
                    <Text style={styles.ratingText}>⭐ {buyer.rating}</Text>
                    <Text style={styles.farmersText}>{buyer.farmers.toLocaleString()} farmers</Text>
                  </View>
                </View>
              </View>
              <View style={styles.premiumBadge}>
                <Text style={styles.premiumText}>+{buyer.premium}%</Text>
              </View>
            </View>
            
            <View style={styles.priceComparison}>
              <View style={styles.priceCard}>
                <Text style={styles.priceLabel}>Market Price</Text>
                <Text style={styles.marketPrice}>₹{buyer.marketPrice}</Text>
                <Text style={styles.priceSubtext}>Per quintal</Text>
              </View>
              <View style={styles.arrowContainer}>
                <Text style={styles.arrow}>→</Text>
                <Text style={styles.profitText}>+₹{extraProfit.toLocaleString()}</Text>
              </View>
              <View style={styles.priceCard}>
                <Text style={styles.priceLabel}>Contract Price</Text>
                <Text style={styles.contractPrice}>₹{buyer.contractPrice}</Text>
                <Text style={styles.priceSubtext}>Per quintal</Text>
              </View>
            </View>
            
            <View style={styles.buyerDetails}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>📋 Requirements</Text>
                <Text style={styles.detailValue}>{buyer.requirements}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>💰 Payment</Text>
                <Text style={styles.detailValue}>{buyer.payment}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>📅 Contract</Text>
                <Text style={styles.detailValue}>{buyer.contract}</Text>
              </View>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>📞 Contact</Text>
                <Text style={styles.detailValue}>{buyer.contact}</Text>
              </View>
            </View>
            
            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => {
                setSelectedBuyer(buyer);
                setCurrentView('application');
                animateCard();
              }}
            >
              <Text style={styles.applyButtonText}>Apply for Contract</Text>
            </TouchableOpacity>
          </Animated.View>
        );
      })}
    </Animated.View>
  );

  const renderCalculatorView = () => (
    <Animated.View style={[styles.viewContainer, { opacity: fadeAnim }]}>
      <Text style={styles.sectionTitle}>🧮 Contract Farming Calculator</Text>
      
      <View style={styles.calculatorContainer}>
                 <View style={styles.inputGroup}>
           <Text style={styles.inputLabel}>Land Size (Acres)</Text>
           <Text style={styles.inputField}>{landSize}</Text>
         </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Yield per Acre (Quintals)</Text>
          <TextInput
            style={styles.inputField}
            keyboardType="numeric"
            value={yieldPerAcre}
            onChangeText={setYieldPerAcre}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Contract Price (Per Quintal)</Text>
          <TextInput
            style={styles.inputField}
            keyboardType="numeric"
            value={contractPrice}
            onChangeText={setContractPrice}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Market Price (Per Quintal)</Text>
          <TextInput
            style={styles.inputField}
            keyboardType="numeric"
            value={marketPrice}
            onChangeText={setMarketPrice}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Certification Cost (₹)</Text>
          <TextInput
            style={styles.inputField}
            keyboardType="numeric"
            value={certificationCost}
            onChangeText={setCertificationCost}
          />
        </View>

        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>Calculated Results</Text>
          <View style={styles.resultItem}>
            <Text style={styles.resultLabel}>Total Yield (Quintals)</Text>
            <Text style={styles.resultValue}>{totalYield.toLocaleString()}</Text>
          </View>
          <View style={styles.resultItem}>
            <Text style={styles.resultLabel}>Contract Earnings (₹)</Text>
            <Text style={styles.resultValue}>₹{contractEarnings.toLocaleString()}</Text>
          </View>
          <View style={styles.resultItem}>
            <Text style={styles.resultLabel}>Market Earnings (₹)</Text>
            <Text style={styles.resultValue}>₹{marketEarnings.toLocaleString()}</Text>
          </View>
          <View style={styles.resultItem}>
            <Text style={styles.resultLabel}>Premium Earnings (₹)</Text>
            <Text style={styles.resultValue}>₹{premiumEarnings.toLocaleString()}</Text>
          </View>
          <View style={styles.resultItem}>
            <Text style={styles.resultLabel}>Net Profit (₹)</Text>
            <Text style={styles.resultValue}>₹{netProfit.toLocaleString()}</Text>
          </View>
          <View style={styles.resultItem}>
            <Text style={styles.resultLabel}>ROI (%) (Based on Certification Cost)</Text>
            <Text style={styles.resultValue}>{roi}%</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>🤝 Corporate Partnerships</Text>
          <Text style={styles.subtitle}>{selectedCrop} - {landSize} acres</Text>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, currentView === 'buyers' && styles.activeTab]}
            onPress={() => {
              setCurrentView('buyers');
              animateCard();
            }}
          >
            <Text style={[styles.tabText, currentView === 'buyers' && styles.activeTabText]}>🏢 Buyers</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, currentView === 'certification' && styles.activeTab]}
            onPress={() => {
              setCurrentView('certification');
              animateCard();
            }}
          >
            <Text style={[styles.tabText, currentView === 'certification' && styles.activeTabText]}>🧮 Calculator</Text>
          </TouchableOpacity>
        </View>

        {/* Content Views */}
        {currentView === 'buyers' && renderBuyersView()}
        {currentView === 'certification' && renderCalculatorView()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#101613' },
  scrollContainer: { padding: 20 },
  header: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#2196F3', marginBottom: 4 },
  subtitle: { fontSize: 16, color: '#aaa' },
  tabContainer: { flexDirection: 'row', marginBottom: 20, backgroundColor: '#181818', borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  activeTab: { backgroundColor: '#2196F3' },
  tabText: { color: '#aaa', fontWeight: '600', fontSize: 14 },
  activeTabText: { color: '#fff' },
  viewContainer: { marginBottom: 20 },
  sectionTitle: { fontSize: 20, color: '#2196F3', fontWeight: 'bold', marginBottom: 15 },
  buyerCard: { backgroundColor: '#181818', borderRadius: 16, padding: 20, marginBottom: 20 },
  buyerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  buyerInfo: { flexDirection: 'row', alignItems: 'center' },
  buyerLogo: { fontSize: 32, marginRight: 12 },
  buyerName: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  buyerRating: { flexDirection: 'row', alignItems: 'center' },
  ratingText: { color: '#FFC107', fontSize: 12, marginRight: 8 },
  farmersText: { color: '#aaa', fontSize: 12 },
  premiumBadge: { backgroundColor: '#4CAF50', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  premiumText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  priceComparison: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  priceCard: { flex: 1, backgroundColor: '#232323', borderRadius: 12, padding: 15, alignItems: 'center' },
  priceLabel: { color: '#aaa', fontSize: 12, marginBottom: 4 },
  marketPrice: { color: '#FF6B6B', fontSize: 20, fontWeight: 'bold', marginBottom: 2 },
  contractPrice: { color: '#4CAF50', fontSize: 20, fontWeight: 'bold', marginBottom: 2 },
  priceSubtext: { color: '#666', fontSize: 10 },
  arrowContainer: { paddingHorizontal: 15, alignItems: 'center' },
  arrow: { fontSize: 20, color: '#2196F3', marginBottom: 4 },
  profitText: { color: '#4CAF50', fontWeight: 'bold', fontSize: 14 },
  buyerDetails: { gap: 10, marginBottom: 15 },
  detailItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel: { color: '#aaa', fontSize: 14 },
  detailValue: { color: '#fff', fontSize: 14, fontWeight: '600', flex: 1, textAlign: 'right' },
  applyButton: { backgroundColor: '#2196F3', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  applyButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  certCard: { backgroundColor: '#181818', borderRadius: 16, padding: 20, marginBottom: 15 },
  certHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  certName: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  certCost: { color: '#4CAF50', fontSize: 16, fontWeight: 'bold' },
  certDetails: { gap: 10, marginBottom: 15 },
  certItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  certLabel: { color: '#aaa', fontSize: 14 },
  certValue: { color: '#fff', fontSize: 14, fontWeight: '600' },
  certButton: { backgroundColor: '#232323', borderRadius: 8, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#2196F3' },
  certButtonText: { color: '#2196F3', fontSize: 14, fontWeight: 'bold' },
  roadmapContainer: { gap: 15 },
  roadmapCard: { backgroundColor: '#181818', borderRadius: 16, padding: 20 },
  selectedRoadmapCard: { backgroundColor: '#232323', borderColor: '#2196F3', borderWidth: 2 },
  roadmapHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  roadmapNumber: { 
    width: 32, 
    height: 32, 
    backgroundColor: '#2196F3', 
    borderRadius: 16, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginRight: 12 
  },
  roadmapNumberText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  roadmapInfo: { flex: 1 },
  roadmapTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  priorityBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  priorityText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  roadmapCost: { color: '#4CAF50', fontSize: 14, fontWeight: 'bold' },
  roadmapDescription: { color: '#aaa', fontSize: 14, marginBottom: 8 },
  roadmapDetails: { flexDirection: 'row', justifyContent: 'space-between' },
  roadmapDuration: { color: '#FFC107', fontSize: 12 },
  roadmapContact: { color: '#2196F3', fontSize: 12 },
  errorText: {
    color: '#FF6B6B',
    fontSize: 18,
    textAlign: 'center',
    padding: 20,
  },
  calculatorContainer: {
    backgroundColor: '#181818',
    borderRadius: 16,
    padding: 20,
    marginTop: 10,
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 8,
  },
  inputField: {
    backgroundColor: '#232323',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
  },
  resultContainer: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  resultTitle: {
    color: '#2196F3',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultLabel: {
    color: '#aaa',
    fontSize: 14,
  },
  resultValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default ContractFarmingScreen; 