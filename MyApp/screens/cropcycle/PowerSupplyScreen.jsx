import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity, Animated, Easing, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

// Mock power data - in real app this would come from API
const POWER_DATA = {
  'Rice': {
    currentPowerCost: 12000,
    solarSavings: 8000,
    systemSize: '10kW',
    pumpHP: '7.5 HP',
    dailyUsage: '8 hours',
    bestSeason: 'Kharif',
  },
  'Wheat': {
    currentPowerCost: 15000,
    solarSavings: 10000,
    systemSize: '12kW',
    pumpHP: '10 HP',
    dailyUsage: '6 hours',
    bestSeason: 'Rabi',
  },
  'Maize': {
    currentPowerCost: 10000,
    solarSavings: 7000,
    systemSize: '8kW',
    pumpHP: '5 HP',
    dailyUsage: '5 hours',
    bestSeason: 'Both',
  },
  'Cotton': {
    currentPowerCost: 18000,
    solarSavings: 12000,
    systemSize: '15kW',
    pumpHP: '12 HP',
    dailyUsage: '10 hours',
    bestSeason: 'Kharif',
  },
  'Tomato': {
    currentPowerCost: 8000,
    solarSavings: 6000,
    systemSize: '6kW',
    pumpHP: '3 HP',
    dailyUsage: '4 hours',
    bestSeason: 'Both',
  },
  'Onion': {
    currentPowerCost: 7000,
    solarSavings: 5000,
    systemSize: '5kW',
    pumpHP: '2.5 HP',
    dailyUsage: '3 hours',
    bestSeason: 'Rabi',
  },
  // Fallback data for other crops
  'Sugarcane': {
    currentPowerCost: 20000,
    solarSavings: 14000,
    systemSize: '20kW',
    pumpHP: '15 HP',
    dailyUsage: '12 hours',
    bestSeason: 'Annual',
  },
  'Potato': {
    currentPowerCost: 9000,
    solarSavings: 6500,
    systemSize: '7kW',
    pumpHP: '4 HP',
    dailyUsage: '5 hours',
    bestSeason: 'Rabi',
  },
  'Soybean': {
    currentPowerCost: 11000,
    solarSavings: 7500,
    systemSize: '9kW',
    pumpHP: '6 HP',
    dailyUsage: '6 hours',
    bestSeason: 'Kharif',
  },
  'Groundnut': {
    currentPowerCost: 8500,
    solarSavings: 6000,
    systemSize: '6kW',
    pumpHP: '3.5 HP',
    dailyUsage: '4 hours',
    bestSeason: 'Both',
  },
};

const SUBSIDY_INFO = {
  'PM-KUSUM': {
    subsidy: '60%',
    loan: '30% at 7% interest',
    farmerShare: '10%',
    maxSystem: '10 HP',
    eligibility: 'All farmers with land',
    documents: 'Aadhaar, Land docs, Electricity bill',
    timeline: '3-4 months',
    contact: '1800-180-1551',
  },
  'State Subsidy': {
    subsidy: '40-50%',
    loan: '40% at 8% interest',
    farmerShare: '10-20%',
    maxSystem: '15 HP',
    eligibility: 'Small & marginal farmers',
    documents: 'Land docs, Income certificate, Bank account',
    timeline: '2-3 months',
    contact: 'State agriculture office',
  },
  'Bank Loan': {
    subsidy: '0%',
    loan: '90% at 9% interest',
    farmerShare: '10%',
    maxSystem: 'No limit',
    eligibility: 'Good credit score',
    documents: 'Land docs, Income proof, Bank statements',
    timeline: '1-2 months',
    contact: 'Local bank branch',
  },
};

const PowerSupplyScreen = ({ route }) => {
  const { selectedCrop, landSize } = route.params || { selectedCrop: 'Rice', landSize: '5' };
  
  // Debug logging
  console.log('PowerSupplyScreen received params:', { selectedCrop, landSize });
  console.log('Route params:', route.params);
  
  const [currentView, setCurrentView] = useState('savings');
  const [fadeAnim] = useState(new Animated.Value(1));
  const [scaleAnim] = useState(new Animated.Value(1));
  const [selectedStep, setSelectedStep] = useState(0);

  // Get power data with fallback and additional error handling
  const powerData = POWER_DATA[selectedCrop] || POWER_DATA['Rice'];
  const landSizeNum = parseInt(landSize) || 5;
  
  // Additional safety checks
  if (!powerData) {
    console.error('Power data not found for crop:', selectedCrop);
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Data not available for {selectedCrop}</Text>
      </SafeAreaView>
    );
  }
  
  const annualSavings = powerData.solarSavings * landSizeNum;
  const paybackPeriod = Math.round((powerData.systemSize.replace('kW', '') * 80000 * 0.1) / annualSavings);

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

  const renderSavingsView = () => (
    <Animated.View style={[styles.viewContainer, { opacity: fadeAnim }]}>
      <Text style={styles.sectionTitle}>💰 Your Power Savings</Text>
      
      {/* Current vs Solar Costs */}
      <View style={styles.costComparison}>
        <View style={styles.costCard}>
          <Text style={styles.costLabel}>Current Power Cost</Text>
          <Text style={styles.currentCost}>₹{(powerData.currentPowerCost * landSizeNum).toLocaleString()}</Text>
          <Text style={styles.costSubtext}>Per year for {landSizeNum} acres</Text>
        </View>
        
        <View style={styles.arrowContainer}>
          <Text style={styles.arrow}>→</Text>
          <Text style={styles.savingsText}>Save ₹{annualSavings.toLocaleString()}</Text>
        </View>
        
        <View style={styles.costCard}>
          <Text style={styles.costLabel}>With Solar</Text>
          <Text style={styles.solarCost}>₹{((powerData.currentPowerCost - powerData.solarSavings) * landSizeNum).toLocaleString()}</Text>
          <Text style={styles.costSubtext}>Per year after solar</Text>
        </View>
      </View>

      {/* System Details */}
      <Animated.View style={[styles.systemCard, { transform: [{ scale: scaleAnim }] }]}>
        <Text style={styles.systemTitle}>⚡ Solar System for {selectedCrop}</Text>
        <View style={styles.systemDetails}>
          <View style={styles.systemItem}>
            <Text style={styles.systemItemLabel}>System Size</Text>
            <Text style={styles.systemItemValue}>{powerData.systemSize}</Text>
          </View>
          <View style={styles.systemItem}>
            <Text style={styles.systemItemLabel}>Pump Capacity</Text>
            <Text style={styles.systemItemValue}>{powerData.pumpHP}</Text>
          </View>
          <View style={styles.systemItem}>
            <Text style={styles.systemItemLabel}>Daily Usage</Text>
            <Text style={styles.systemItemValue}>{powerData.dailyUsage}</Text>
          </View>
          <View style={styles.systemItem}>
            <Text style={styles.systemItemLabel}>Best Season</Text>
            <Text style={styles.systemItemValue}>{powerData.bestSeason}</Text>
          </View>
        </View>
      </Animated.View>

      {/* Payback Analysis */}
      <View style={styles.paybackCard}>
        <Text style={styles.paybackTitle}>📈 Investment Analysis</Text>
        <View style={styles.paybackItem}>
          <Text style={styles.paybackLabel}>System Cost</Text>
          <Text style={styles.paybackValue}>₹{(powerData.systemSize.replace('kW', '') * 80000).toLocaleString()}</Text>
        </View>
        <View style={styles.paybackItem}>
          <Text style={styles.paybackLabel}>Annual Savings</Text>
          <Text style={styles.paybackValue}>₹{annualSavings.toLocaleString()}</Text>
        </View>
        <View style={styles.paybackItem}>
          <Text style={styles.paybackLabel}>Payback Period</Text>
          <Text style={styles.paybackValue}>{paybackPeriod} years</Text>
        </View>
        <View style={styles.paybackItem}>
          <Text style={styles.paybackLabel}>25-year Savings</Text>
          <Text style={styles.paybackValue}>₹{(annualSavings * 25).toLocaleString()}</Text>
        </View>
      </View>
    </Animated.View>
  );

  const renderSubsidyView = () => (
    <Animated.View style={[styles.viewContainer, { opacity: fadeAnim }]}>
      <Text style={styles.sectionTitle}>🏛️ Government Subsidies</Text>
      
      {Object.entries(SUBSIDY_INFO).map(([scheme, info], index) => (
        <Animated.View key={scheme} style={[styles.subsidyCard, { transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.subsidyHeader}>
            <Text style={styles.subsidyName}>{scheme}</Text>
            <Text style={styles.subsidyRate}>{info.subsidy} subsidy</Text>
          </View>
          
          <View style={styles.subsidyDetails}>
            <View style={styles.subsidyItem}>
              <Text style={styles.subsidyLabel}>💳 Loan</Text>
              <Text style={styles.subsidyValue}>{info.loan}</Text>
            </View>
            <View style={styles.subsidyItem}>
              <Text style={styles.subsidyLabel}>👤 Your Share</Text>
              <Text style={styles.subsidyValue}>{info.farmerShare}</Text>
            </View>
            <View style={styles.subsidyItem}>
              <Text style={styles.subsidyLabel}>📋 Documents</Text>
              <Text style={styles.subsidyValue}>{info.documents}</Text>
            </View>
            <View style={styles.subsidyItem}>
              <Text style={styles.subsidyLabel}>⏱️ Timeline</Text>
              <Text style={styles.subsidyValue}>{info.timeline}</Text>
            </View>
            <View style={styles.subsidyItem}>
              <Text style={styles.subsidyLabel}>📞 Contact</Text>
              <Text style={styles.subsidyValue}>{info.contact}</Text>
            </View>
          </View>
        </Animated.View>
      ))}
    </Animated.View>
  );

  const renderInstallationView = () => (
    <Animated.View style={[styles.viewContainer, { opacity: fadeAnim }]}>
      <Text style={styles.sectionTitle}>🔧 Installation Guide</Text>
      
      <View style={styles.stepsContainer}>
        {[
          {
            step: 1,
            title: 'Apply for Subsidy',
            description: 'Submit application with land documents and Aadhaar',
            duration: '1 week',
            cost: '₹0',
            contact: 'PM-KUSUM: 1800-180-1551',
          },
          {
            step: 2,
            title: 'Get Technical Survey',
            description: 'Government engineer visits your farm for assessment',
            duration: '2 weeks',
            cost: '₹0',
            contact: 'Local agriculture office',
          },
          {
            step: 3,
            title: 'Select Vendor',
            description: 'Choose from government-empaneled solar vendors',
            duration: '1 week',
            cost: '₹0',
            contact: 'List available at agriculture office',
          },
          {
            step: 4,
            title: 'Installation',
            description: 'Solar panels and pump installation at your farm',
            duration: '1 week',
            cost: 'Your 10% share',
            contact: 'Selected vendor',
          },
          {
            step: 5,
            title: 'Commissioning',
            description: 'Testing and handover of solar system',
            duration: '1 day',
            cost: '₹0',
            contact: 'Vendor + government team',
          },
        ].map((stepData, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.stepCard, selectedStep === index && styles.selectedStepCard]}
            onPress={() => {
              setSelectedStep(index);
              animateCard();
            }}
          >
            <View style={styles.stepHeader}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{stepData.step}</Text>
              </View>
              <View style={styles.stepInfo}>
                <Text style={styles.stepTitle}>{stepData.title}</Text>
                <Text style={styles.stepDuration}>⏱️ {stepData.duration}</Text>
              </View>
              <Text style={styles.stepCost}>{stepData.cost}</Text>
            </View>
            <Text style={styles.stepDescription}>{stepData.description}</Text>
            <Text style={styles.stepContact}>📞 {stepData.contact}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>⚡ Energy Independence</Text>
          <Text style={styles.subtitle}>{selectedCrop} - {landSize} acres</Text>
        </View>

        {/* Navigation Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, currentView === 'savings' && styles.activeTab]}
            onPress={() => {
              setCurrentView('savings');
              animateCard();
            }}
          >
            <Text style={[styles.tabText, currentView === 'savings' && styles.activeTabText]}>💰 Savings</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, currentView === 'subsidy' && styles.activeTab]}
            onPress={() => {
              setCurrentView('subsidy');
              animateCard();
            }}
          >
            <Text style={[styles.tabText, currentView === 'subsidy' && styles.activeTabText]}>🏛️ Subsidies</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, currentView === 'installation' && styles.activeTab]}
            onPress={() => {
              setCurrentView('installation');
              animateCard();
            }}
          >
            <Text style={[styles.tabText, currentView === 'installation' && styles.activeTabText]}>🔧 Install</Text>
          </TouchableOpacity>
        </View>

        {/* Content Views */}
        {currentView === 'savings' && renderSavingsView()}
        {currentView === 'subsidy' && renderSubsidyView()}
        {currentView === 'installation' && renderInstallationView()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#101613' },
  scrollContainer: { padding: 20 },
  header: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#FF9800', marginBottom: 4 },
  subtitle: { fontSize: 16, color: '#aaa' },
  tabContainer: { flexDirection: 'row', marginBottom: 20, backgroundColor: '#181818', borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  activeTab: { backgroundColor: '#FF9800' },
  tabText: { color: '#aaa', fontWeight: '600', fontSize: 14 },
  activeTabText: { color: '#fff' },
  viewContainer: { marginBottom: 20 },
  sectionTitle: { fontSize: 20, color: '#FF9800', fontWeight: 'bold', marginBottom: 15 },
  costComparison: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  costCard: { flex: 1, backgroundColor: '#181818', borderRadius: 16, padding: 20, alignItems: 'center' },
  costLabel: { color: '#aaa', fontSize: 14, marginBottom: 8 },
  currentCost: { color: '#FF6B6B', fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  solarCost: { color: '#4CAF50', fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  costSubtext: { color: '#666', fontSize: 12 },
  arrowContainer: { paddingHorizontal: 15, alignItems: 'center' },
  arrow: { fontSize: 24, color: '#FF9800', marginBottom: 4 },
  savingsText: { color: '#4CAF50', fontWeight: 'bold', fontSize: 16 },
  systemCard: { backgroundColor: '#181818', borderRadius: 16, padding: 20, marginBottom: 20 },
  systemTitle: { color: '#FF9800', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  systemDetails: { gap: 12 },
  systemItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  systemItemLabel: { color: '#aaa', fontSize: 14 },
  systemItemValue: { color: '#fff', fontSize: 14, fontWeight: '600' },
  paybackCard: { backgroundColor: '#181818', borderRadius: 16, padding: 20 },
  paybackTitle: { color: '#FFC107', fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
  paybackItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  paybackLabel: { color: '#aaa', fontSize: 14 },
  paybackValue: { color: '#fff', fontSize: 14, fontWeight: '600' },
  subsidyCard: { backgroundColor: '#181818', borderRadius: 16, padding: 20, marginBottom: 15 },
  subsidyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  subsidyName: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  subsidyRate: { color: '#4CAF50', fontSize: 16, fontWeight: 'bold' },
  subsidyDetails: { gap: 10 },
  subsidyItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subsidyLabel: { color: '#aaa', fontSize: 14 },
  subsidyValue: { color: '#fff', fontSize: 14, fontWeight: '600', flex: 1, textAlign: 'right' },
  stepsContainer: { gap: 15 },
  stepCard: { backgroundColor: '#181818', borderRadius: 16, padding: 20 },
  selectedStepCard: { backgroundColor: '#232323', borderColor: '#FF9800', borderWidth: 2 },
  stepHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  stepNumber: { 
    width: 32, 
    height: 32, 
    backgroundColor: '#FF9800', 
    borderRadius: 16, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginRight: 12 
  },
  stepNumberText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  stepInfo: { flex: 1 },
  stepTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  stepDuration: { color: '#FF9800', fontSize: 12 },
  stepCost: { color: '#4CAF50', fontSize: 14, fontWeight: 'bold' },
  stepDescription: { color: '#aaa', fontSize: 14, marginBottom: 8 },
  stepContact: { color: '#FFC107', fontSize: 12 },
  errorText: {
    color: '#FF6B6B',
    fontSize: 18,
    textAlign: 'center',
    padding: 20,
  },
});

export default PowerSupplyScreen; 