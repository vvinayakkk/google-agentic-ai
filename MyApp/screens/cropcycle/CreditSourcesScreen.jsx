import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity, Animated, Easing, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

// Mock loan data - in real app this would come from API
const LOAN_DATA = {
  'Rice': {
    cropValue: 40000,
    inputCost: 15000,
    equipmentCost: 25000,
    totalRequirement: 80000,
    bestSeason: 'Kharif',
    repaymentPeriod: '12 months',
  },
  'Wheat': {
    cropValue: 45000,
    inputCost: 18000,
    equipmentCost: 30000,
    totalRequirement: 93000,
    bestSeason: 'Rabi',
    repaymentPeriod: '12 months',
  },
  'Maize': {
    cropValue: 35000,
    inputCost: 12000,
    equipmentCost: 20000,
    totalRequirement: 67000,
    bestSeason: 'Both',
    repaymentPeriod: '10 months',
  },
  'Cotton': {
    cropValue: 60000,
    inputCost: 25000,
    equipmentCost: 40000,
    totalRequirement: 125000,
    bestSeason: 'Kharif',
    repaymentPeriod: '15 months',
  },
  'Tomato': {
    cropValue: 80000,
    inputCost: 30000,
    equipmentCost: 15000,
    totalRequirement: 125000,
    bestSeason: 'Both',
    repaymentPeriod: '8 months',
  },
  'Onion': {
    cropValue: 70000,
    inputCost: 25000,
    equipmentCost: 12000,
    totalRequirement: 107000,
    bestSeason: 'Rabi',
    repaymentPeriod: '8 months',
  },
  // Fallback data for other crops
  'Sugarcane': {
    cropValue: 120000,
    inputCost: 40000,
    equipmentCost: 60000,
    totalRequirement: 220000,
    bestSeason: 'Annual',
    repaymentPeriod: '18 months',
  },
  'Potato': {
    cropValue: 90000,
    inputCost: 35000,
    equipmentCost: 20000,
    totalRequirement: 145000,
    bestSeason: 'Rabi',
    repaymentPeriod: '10 months',
  },
  'Soybean': {
    cropValue: 50000,
    inputCost: 18000,
    equipmentCost: 25000,
    totalRequirement: 93000,
    bestSeason: 'Kharif',
    repaymentPeriod: '12 months',
  },
  'Groundnut': {
    cropValue: 55000,
    inputCost: 20000,
    equipmentCost: 22000,
    totalRequirement: 97000,
    bestSeason: 'Both',
    repaymentPeriod: '10 months',
  },
};

const LOAN_SCHEMES = {
  'Kisan Credit Card': {
    name: 'Kisan Credit Card (KCC)',
    logo: '🏦',
    maxAmount: '₹3,00,000',
    interestRate: '7% (with subsidy)',
    processingTime: '7-14 days',
    eligibility: 'All farmers with land',
    documents: 'Aadhaar, Land records, Photo',
    contact: 'Local bank branch',
    rating: 4.8,
    farmers: 8000000,
    subsidy: 'Interest subvention up to 3%',
  },
  'Mudra Loan': {
    name: 'Mudra Agricultural Loan',
    logo: '💰',
    maxAmount: '₹10,00,000',
    interestRate: '8.5%',
    processingTime: '10-20 days',
    eligibility: 'Small & marginal farmers',
    documents: 'Land docs, Income certificate, Bank account',
    contact: 'Mudra portal or bank',
    rating: 4.5,
    farmers: 3000000,
    subsidy: 'No subsidy',
  },
  'FPO Loan': {
    name: 'FPO Collective Loan',
    logo: '👥',
    maxAmount: '₹50,00,000',
    interestRate: '6.5%',
    processingTime: '15-25 days',
    eligibility: 'FPO members only',
    documents: 'FPO ID, Land docs, Group guarantee',
    contact: 'FPO office',
    rating: 4.7,
    farmers: 1000000,
    subsidy: 'Interest subvention up to 2%',
  },
  'Digital Loan': {
    name: 'Digital Quick Loan',
    logo: '📱',
    maxAmount: '₹1,00,000',
    interestRate: '9%',
    processingTime: '1-2 hours',
    eligibility: 'Good credit score',
    documents: 'PAN, Aadhaar, Mobile number',
    contact: 'Digital lending apps',
    rating: 4.3,
    farmers: 5000000,
    subsidy: 'No subsidy',
  },
};

const CreditSourcesScreen = ({ route }) => {
  const { selectedCrop, landSize } = route.params || { selectedCrop: 'Rice', landSize: '5' };
  const [currentView, setCurrentView] = useState('loans');
  const [fadeAnim] = useState(new Animated.Value(1));
  const [scaleAnim] = useState(new Animated.Value(1));
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [loanAmount, setLoanAmount] = useState('50000');
  const [loanTenure, setLoanTenure] = useState('12');

  // Get loan data with fallback and additional error handling
  const loanData = LOAN_DATA[selectedCrop] || LOAN_DATA['Rice'];
  const landSizeNum = parseInt(landSize) || 5;
  const totalRequirement = loanData.totalRequirement * landSizeNum;
  const loanAmountNum = parseInt(loanAmount) || 50000;
  const tenureNum = parseInt(loanTenure) || 12;

  const monthlyEMI = (loanAmountNum * (1 + 0.07 / 100)) / 12; // Placeholder interest rate

  // Additional safety checks
  if (!loanData) {
    console.error('Loan data not found for crop:', selectedCrop);
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Credit data not available for {selectedCrop}</Text>
      </SafeAreaView>
    );
  }

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

  const renderLoansView = () => (
    <Animated.View style={[styles.viewContainer, { opacity: fadeAnim }]}>
      <Text style={styles.sectionTitle}>💰 Loan Options</Text>
      
      {Object.entries(LOAN_SCHEMES).map(([schemeKey, scheme], index) => (
        <Animated.View key={schemeKey} style={[styles.loanCard, { transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.loanHeader}>
            <View style={styles.loanInfo}>
              <Text style={styles.loanLogo}>{scheme.logo}</Text>
              <View>
                <Text style={styles.loanName}>{scheme.name}</Text>
                <View style={styles.loanRating}>
                  <Text style={styles.ratingText}>⭐ {scheme.rating}</Text>
                  <Text style={styles.farmersText}>{scheme.farmers.toLocaleString()} farmers</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => {
                setSelectedScheme(schemeKey);
                setCurrentView('application');
                animateCard();
              }}
            >
              <Text style={styles.selectButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.loanDetails}>
            <View style={styles.loanDetail}>
              <Text style={styles.loanDetailLabel}>💰 Max Amount</Text>
              <Text style={styles.loanDetailValue}>{scheme.maxAmount}</Text>
            </View>
            <View style={styles.loanDetail}>
              <Text style={styles.loanDetailLabel}>📊 Interest Rate</Text>
              <Text style={styles.loanDetailValue}>{scheme.interestRate}</Text>
            </View>
            <View style={styles.loanDetail}>
              <Text style={styles.loanDetailLabel}>⏱️ Processing Time</Text>
              <Text style={styles.loanDetailValue}>{scheme.processingTime}</Text>
            </View>
            <View style={styles.loanDetail}>
              <Text style={styles.loanDetailLabel}>👤 Eligibility</Text>
              <Text style={styles.loanDetailValue}>{scheme.eligibility}</Text>
            </View>
            <View style={styles.loanDetail}>
              <Text style={styles.loanDetailLabel}>📋 Documents</Text>
              <Text style={styles.loanDetailValue}>{scheme.documents}</Text>
            </View>
            <View style={styles.loanDetail}>
              <Text style={styles.loanDetailLabel}>📞 Contact</Text>
              <Text style={styles.loanDetailValue}>{scheme.contact}</Text>
            </View>
            <View style={styles.loanDetail}>
              <Text style={styles.loanDetailLabel}>🏛️ Subsidy</Text>
              <Text style={styles.loanDetailValue}>{scheme.subsidy}</Text>
            </View>
          </View>
        </Animated.View>
      ))}
    </Animated.View>
  );

  const renderCalculatorView = () => (
    <Animated.View style={[styles.viewContainer, { opacity: fadeAnim }]}>
      <Text style={styles.sectionTitle}>🧮 Loan Calculator</Text>
      
      <View style={styles.calculatorCard}>
        <Text style={styles.calculatorTitle}>Loan Details for {selectedCrop}</Text>
        <View style={styles.calcRow}>
          <Text style={styles.calcLabel}>Loan Amount</Text>
          <Text style={styles.calcValue}>₹{loanAmountNum.toLocaleString()}</Text>
        </View>
        <View style={styles.calcRow}>
          <Text style={styles.calcLabel}>Interest Rate</Text>
          <Text style={styles.calcValue}>7%</Text> {/* Placeholder */}
        </View>
        <View style={styles.calcRow}>
          <Text style={styles.calcLabel}>Repayment Period</Text>
          <Text style={styles.calcValue}>{tenureNum} months</Text>
        </View>
        <View style={styles.calcRow}>
          <Text style={styles.calcLabel}>Monthly EMI</Text>
          <Text style={styles.calcValue}>₹{monthlyEMI.toLocaleString()}</Text>
        </View>
        <View style={styles.calcRow}>
          <Text style={styles.calcLabel}>Total Interest</Text>
          <Text style={styles.calcValue}>₹{(loanAmountNum * 0.07).toLocaleString()}</Text> {/* Placeholder */}
        </View>
        <View style={styles.calcRow}>
          <Text style={styles.calcLabel}>Success Rate</Text>
          <Text style={styles.calcValue}>85%</Text> {/* Placeholder */}
        </View>
      </View>

      <Animated.View style={[styles.comparisonCard, { transform: [{ scale: scaleAnim }] }]}>
        <Text style={styles.comparisonTitle}>📊 Scheme Comparison</Text>
        <View style={styles.comparisonTable}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderText}>Scheme</Text>
            <Text style={styles.tableHeaderText}>Amount</Text>
            <Text style={styles.tableHeaderText}>Rate</Text>
            <Text style={styles.tableHeaderText}>Time</Text>
          </View>
          {Object.entries(LOAN_SCHEMES).map(([key, scheme], index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.tableCell}>{scheme.name.split(' ')[0]}</Text>
              <Text style={styles.tableCell}>{scheme.maxAmount}</Text>
              <Text style={styles.tableCell}>{scheme.interestRate}</Text>
              <Text style={styles.tableCell}>{scheme.processingTime}</Text>
            </View>
          ))}
        </View>
      </Animated.View>
    </Animated.View>
  );



  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>💎 Smart Financing</Text>
          <Text style={styles.subtitle}>{selectedCrop} - {landSize} acres</Text>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, currentView === 'loans' && styles.activeTab]}
            onPress={() => {
              setCurrentView('loans');
              animateCard();
            }}
          >
            <Text style={[styles.tabText, currentView === 'loans' && styles.activeTabText]}>💰 Loans</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, currentView === 'calculator' && styles.activeTab]}
            onPress={() => {
              setCurrentView('calculator');
              animateCard();
            }}
          >
            <Text style={[styles.tabText, currentView === 'calculator' && styles.activeTabText]}>🧮 Calculator</Text>
          </TouchableOpacity>
        </View>

        {/* Content Views */}
        {currentView === 'loans' && renderLoansView()}
        {currentView === 'calculator' && renderCalculatorView()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#101613' },
  scrollContainer: { padding: 20 },
  header: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#00BCD4', marginBottom: 4 },
  subtitle: { fontSize: 16, color: '#aaa' },
  tabContainer: { flexDirection: 'row', marginBottom: 20, backgroundColor: '#181818', borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  activeTab: { backgroundColor: '#00BCD4' },
  tabText: { color: '#aaa', fontWeight: '600', fontSize: 14 },
  activeTabText: { color: '#fff' },
  viewContainer: { marginBottom: 20 },
  sectionTitle: { fontSize: 20, color: '#00BCD4', fontWeight: 'bold', marginBottom: 15 },
  loanCard: { backgroundColor: '#181818', borderRadius: 16, padding: 20, marginBottom: 20 },
  loanHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  loanInfo: { flexDirection: 'row', alignItems: 'center' },
  loanLogo: { fontSize: 32, marginRight: 12 },
  loanName: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  loanRating: { flexDirection: 'row', alignItems: 'center' },
  ratingText: { color: '#FFC107', fontSize: 12, marginRight: 8 },
  farmersText: { color: '#aaa', fontSize: 12 },
  selectButton: { backgroundColor: '#00BCD4', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  selectButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  loanDetails: { gap: 10 },
  loanDetail: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  loanDetailLabel: { color: '#aaa', fontSize: 14 },
  loanDetailValue: { color: '#fff', fontSize: 14, fontWeight: '600' },
  calculatorCard: { backgroundColor: '#181818', borderRadius: 16, padding: 20, marginBottom: 20 },
  calculatorTitle: { color: '#00BCD4', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  calcRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  calcLabel: { color: '#aaa', fontSize: 14 },
  calcValue: { color: '#fff', fontSize: 14, fontWeight: '600' },
  comparisonCard: { backgroundColor: '#181818', borderRadius: 16, padding: 20 },
  comparisonTitle: { color: '#FFC107', fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
  comparisonTable: { gap: 8 },
  tableHeader: { flexDirection: 'row', marginBottom: 8 },
  tableHeaderText: { color: '#00BCD4', fontSize: 12, fontWeight: 'bold', flex: 1 },
  tableRow: { flexDirection: 'row', marginBottom: 4 },
  tableCell: { color: '#fff', fontSize: 12, flex: 1 },

  tipsCard: { backgroundColor: '#181818', borderRadius: 16, padding: 20 },
  tipsTitle: { color: '#FFC107', fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  tipItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  tipBullet: { color: '#00BCD4', fontSize: 16, marginRight: 8, marginTop: 2 },
  tipText: { color: '#fff', fontSize: 14, flex: 1 },
  errorText: { color: '#FF6B6B', fontSize: 18, textAlign: 'center', padding: 20 },
});

export default CreditSourcesScreen; 