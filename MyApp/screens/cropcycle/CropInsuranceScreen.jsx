import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity, Animated, Easing, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

// Mock insurance data - in real app this would come from API
const INSURANCE_DATA = {
  'Rice': {
    riskLevel: 'Medium',
    riskFactors: ['Drought', 'Flood', 'Pest Attack'],
    currentSeason: 'Kharif',
    premiumRate: 2.0,
    sumInsured: 40000,
    claimSettlement: 92,
  },
  'Wheat': {
    riskLevel: 'Low',
    riskFactors: ['Frost', 'Hailstorm'],
    currentSeason: 'Rabi',
    premiumRate: 1.5,
    sumInsured: 45000,
    claimSettlement: 95,
  },
  'Maize': {
    riskLevel: 'Medium',
    riskFactors: ['Drought', 'Pest Attack'],
    currentSeason: 'Both',
    premiumRate: 2.0,
    sumInsured: 35000,
    claimSettlement: 88,
  },
  'Cotton': {
    riskLevel: 'High',
    riskFactors: ['Pest Attack', 'Drought', 'Excess Rain'],
    currentSeason: 'Kharif',
    premiumRate: 2.5,
    sumInsured: 60000,
    claimSettlement: 85,
  },
  'Tomato': {
    riskLevel: 'High',
    riskFactors: ['Disease', 'Price Fluctuation'],
    currentSeason: 'Both',
    premiumRate: 3.0,
    sumInsured: 80000,
    claimSettlement: 90,
  },
  'Onion': {
    riskLevel: 'Medium',
    riskFactors: ['Disease', 'Storage Loss'],
    currentSeason: 'Rabi',
    premiumRate: 2.5,
    sumInsured: 70000,
    claimSettlement: 87,
  },
  // Fallback data for other crops
  'Sugarcane': {
    riskLevel: 'Low',
    riskFactors: ['Drought', 'Pest Attack'],
    currentSeason: 'Annual',
    premiumRate: 1.8,
    sumInsured: 120000,
    claimSettlement: 93,
  },
  'Potato': {
    riskLevel: 'Medium',
    riskFactors: ['Disease', 'Frost', 'Price Fluctuation'],
    currentSeason: 'Rabi',
    premiumRate: 2.8,
    sumInsured: 90000,
    claimSettlement: 89,
  },
  'Soybean': {
    riskLevel: 'Medium',
    riskFactors: ['Drought', 'Pest Attack'],
    currentSeason: 'Kharif',
    premiumRate: 2.2,
    sumInsured: 50000,
    claimSettlement: 91,
  },
  'Groundnut': {
    riskLevel: 'Medium',
    riskFactors: ['Drought', 'Disease'],
    currentSeason: 'Both',
    premiumRate: 2.3,
    sumInsured: 55000,
    claimSettlement: 88,
  },
};

const INSURANCE_PLANS = {
  'PMFBY': {
    name: 'Pradhan Mantri Fasal Bima Yojana',
    logo: '🏛️',
    premium: '2% for Kharif, 1.5% for Rabi',
    coverage: 'Full sum insured',
    governmentShare: '95%',
    farmerShare: '5%',
    claimTime: '45 days',
    contact: '1800-180-1551',
    rating: 4.8,
    farmers: 5000000,
  },
  'Weather Based': {
    name: 'Weather Based Crop Insurance',
    logo: '🌤️',
    premium: '3-5% of sum insured',
    coverage: 'Weather-related losses only',
    governmentShare: '50%',
    farmerShare: '50%',
    claimTime: '30 days',
    contact: '1800-425-1111',
    rating: 4.5,
    farmers: 2000000,
  },
  'Private Insurance': {
    name: 'Private Crop Insurance',
    logo: '🏢',
    premium: '5-8% of sum insured',
    coverage: 'Comprehensive coverage',
    governmentShare: '0%',
    farmerShare: '100%',
    claimTime: '60 days',
    contact: 'Private insurers',
    rating: 4.2,
    farmers: 1000000,
  },
};

const CropInsuranceScreen = ({ route }) => {
  const { selectedCrop, landSize } = route.params || { selectedCrop: 'Rice', landSize: '5' };
  const [currentView, setCurrentView] = useState('risk');
  const [fadeAnim] = useState(new Animated.Value(1));
  const [scaleAnim] = useState(new Animated.Value(1));
  const [selectedPlan, setSelectedPlan] = useState(null);

  // Get insurance data with fallback and additional error handling
  const insuranceData = INSURANCE_DATA[selectedCrop] || INSURANCE_DATA['Rice'];
  const landSizeNum = parseInt(landSize) || 5;
  const totalSumInsured = insuranceData.sumInsured * landSizeNum;
  const premiumAmount = (totalSumInsured * insuranceData.premiumRate) / 100;
  const farmerShare = (premiumAmount * 5) / 100; // 5% for PMFBY

  // Additional safety checks
  if (!insuranceData) {
    console.error('Insurance data not found for crop:', selectedCrop);
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Insurance data not available for {selectedCrop}</Text>
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

  const renderRiskView = () => (
    <Animated.View style={[styles.viewContainer, { opacity: fadeAnim }]}>
      <Text style={styles.sectionTitle}>⚠️ Risk Assessment</Text>
      
      {/* Risk Level */}
      <View style={styles.riskCard}>
        <View style={styles.riskHeader}>
          <Text style={styles.riskTitle}>Risk Level: {insuranceData.riskLevel}</Text>
          <View style={[
            styles.riskBadge, 
            { 
              backgroundColor: insuranceData.riskLevel === 'High' ? '#FF6B6B' : 
                              insuranceData.riskLevel === 'Medium' ? '#FFC107' : '#4CAF50' 
            }
          ]}>
            <Text style={styles.riskBadgeText}>{insuranceData.riskLevel}</Text>
          </View>
        </View>
        <Text style={styles.riskDescription}>
          {selectedCrop} has {insuranceData.riskLevel.toLowerCase()} risk due to {insuranceData.riskFactors.join(', ').toLowerCase()}
        </Text>
      </View>

      {/* Risk Factors */}
      <Animated.View style={[styles.factorsCard, { transform: [{ scale: scaleAnim }] }]}>
        <Text style={styles.factorsTitle}>🎯 Main Risk Factors</Text>
        {insuranceData.riskFactors.map((factor, index) => (
          <View key={index} style={styles.factorItem}>
            <Text style={styles.factorBullet}>•</Text>
            <Text style={styles.factorText}>{factor}</Text>
          </View>
        ))}
      </Animated.View>

      {/* Insurance Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>📊 Insurance Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Sum Insured</Text>
          <Text style={styles.summaryValue}>₹{totalSumInsured.toLocaleString()}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Premium Rate</Text>
          <Text style={styles.summaryValue}>{insuranceData.premiumRate}%</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Your Premium</Text>
          <Text style={styles.summaryValue}>₹{farmerShare.toLocaleString()}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Claim Settlement</Text>
          <Text style={styles.summaryValue}>{insuranceData.claimSettlement}%</Text>
        </View>
      </View>
    </Animated.View>
  );

  const renderPlansView = () => (
    <Animated.View style={[styles.viewContainer, { opacity: fadeAnim }]}>
      <Text style={styles.sectionTitle}>🛡️ Insurance Plans</Text>
      
      {Object.entries(INSURANCE_PLANS).map(([planKey, plan], index) => (
        <Animated.View key={planKey} style={[styles.planCard, { transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.planHeader}>
            <View style={styles.planInfo}>
              <Text style={styles.planLogo}>{plan.logo}</Text>
              <View>
                <Text style={styles.planName}>{plan.name}</Text>
                <View style={styles.planRating}>
                  <Text style={styles.ratingText}>⭐ {plan.rating}</Text>
                  <Text style={styles.farmersText}>{plan.farmers.toLocaleString()} farmers</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => {
                setSelectedPlan(planKey);
                setCurrentView('application');
                animateCard();
              }}
            >
              <Text style={styles.selectButtonText}>Select</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.planDetails}>
            <View style={styles.planDetail}>
              <Text style={styles.planDetailLabel}>💰 Premium</Text>
              <Text style={styles.planDetailValue}>{plan.premium}</Text>
            </View>
            <View style={styles.planDetail}>
              <Text style={styles.planDetailLabel}>🛡️ Coverage</Text>
              <Text style={styles.planDetailValue}>{plan.coverage}</Text>
            </View>
            <View style={styles.planDetail}>
              <Text style={styles.planDetailLabel}>🏛️ Govt Share</Text>
              <Text style={styles.planDetailValue}>{plan.governmentShare}</Text>
            </View>
            <View style={styles.planDetail}>
              <Text style={styles.planDetailLabel}>👤 Your Share</Text>
              <Text style={styles.planDetailValue}>{plan.farmerShare}</Text>
            </View>
            <View style={styles.planDetail}>
              <Text style={styles.planDetailLabel}>⏱️ Claim Time</Text>
              <Text style={styles.planDetailValue}>{plan.claimTime}</Text>
            </View>
            <View style={styles.planDetail}>
              <Text style={styles.planDetailLabel}>📞 Contact</Text>
              <Text style={styles.planDetailValue}>{plan.contact}</Text>
            </View>
          </View>
        </Animated.View>
      ))}
    </Animated.View>
  );

  const renderClaimsView = () => (
    <Animated.View style={[styles.viewContainer, { opacity: fadeAnim }]}>
      <Text style={styles.sectionTitle}>📋 Claim Settlement Guide</Text>
      
      <View style={styles.claimsContainer}>
        {[
          {
            step: 1,
            title: 'Report Loss',
            description: 'Immediately report crop loss to insurance company within 72 hours',
            documents: 'Photos, videos of damaged crop',
            timeline: 'Within 72 hours',
            contact: 'Insurance helpline',
          },
          {
            step: 2,
            title: 'Survey Visit',
            description: 'Insurance surveyor visits your farm to assess damage',
            documents: 'Land documents, crop details',
            timeline: 'Within 7 days',
            contact: 'Surveyor assigned by company',
          },
          {
            step: 3,
            title: 'Submit Documents',
            description: 'Submit all required documents for claim processing',
            documents: 'Claim form, photos, land records, bank details',
            timeline: 'Within 15 days',
            contact: 'Local insurance office',
          },
          {
            step: 4,
            title: 'Claim Processing',
            description: 'Company processes your claim and calculates compensation',
            documents: 'No additional documents needed',
            timeline: '30-45 days',
            contact: 'Insurance company',
          },
          {
            step: 5,
            title: 'Payment',
            description: 'Claim amount credited to your bank account',
            documents: 'Bank passbook for verification',
            timeline: 'Within 7 days of approval',
            contact: 'Your bank',
          },
        ].map((step, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.claimCard, selectedPlan && styles.selectedClaimCard]}
            onPress={() => animateCard()}
          >
            <View style={styles.claimHeader}>
              <View style={styles.claimNumber}>
                <Text style={styles.claimNumberText}>{step.step}</Text>
              </View>
              <View style={styles.claimInfo}>
                <Text style={styles.claimTitle}>{step.title}</Text>
                <Text style={styles.claimTimeline}>⏱️ {step.timeline}</Text>
              </View>
            </View>
            <Text style={styles.claimDescription}>{step.description}</Text>
            <View style={styles.claimDocuments}>
              <Text style={styles.documentsLabel}>📄 Documents:</Text>
              <Text style={styles.documentsValue}>{step.documents}</Text>
            </View>
            <Text style={styles.claimContact}>📞 {step.contact}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tips */}
      <View style={styles.tipsCard}>
        <Text style={styles.tipsTitle}>💡 Claim Tips</Text>
        <View style={styles.tipItem}>
          <Text style={styles.tipBullet}>•</Text>
          <Text style={styles.tipText}>Take photos/videos immediately after damage</Text>
        </View>
        <View style={styles.tipItem}>
          <Text style={styles.tipBullet}>•</Text>
          <Text style={styles.tipText}>Keep all receipts and documents safe</Text>
        </View>
        <View style={styles.tipItem}>
          <Text style={styles.tipBullet}>•</Text>
          <Text style={styles.tipText}>Follow up regularly with insurance company</Text>
        </View>
        <View style={styles.tipItem}>
          <Text style={styles.tipBullet}>•</Text>
          <Text style={styles.tipText}>Maintain proper crop cutting experiment records</Text>
        </View>
      </View>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>🛡️ Risk Shield</Text>
          <Text style={styles.subtitle}>{selectedCrop} - {landSize} acres</Text>
        </View>

        {/* Navigation Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, currentView === 'risk' && styles.activeTab]}
            onPress={() => {
              setCurrentView('risk');
              animateCard();
            }}
          >
            <Text style={[styles.tabText, currentView === 'risk' && styles.activeTabText]}>⚠️ Risk</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, currentView === 'plans' && styles.activeTab]}
            onPress={() => {
              setCurrentView('plans');
              animateCard();
            }}
          >
            <Text style={[styles.tabText, currentView === 'plans' && styles.activeTabText]}>🛡️ Plans</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, currentView === 'claims' && styles.activeTab]}
            onPress={() => {
              setCurrentView('claims');
              animateCard();
            }}
          >
            <Text style={[styles.tabText, currentView === 'claims' && styles.activeTabText]}>📋 Claims</Text>
          </TouchableOpacity>
        </View>

        {/* Content Views */}
        {currentView === 'risk' && renderRiskView()}
        {currentView === 'plans' && renderPlansView()}
        {currentView === 'claims' && renderClaimsView()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#101613' },
  scrollContainer: { padding: 20 },
  header: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#9C27B0', marginBottom: 4 },
  subtitle: { fontSize: 16, color: '#aaa' },
  tabContainer: { flexDirection: 'row', marginBottom: 20, backgroundColor: '#181818', borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  activeTab: { backgroundColor: '#9C27B0' },
  tabText: { color: '#aaa', fontWeight: '600', fontSize: 14 },
  activeTabText: { color: '#fff' },
  viewContainer: { marginBottom: 20 },
  sectionTitle: { fontSize: 20, color: '#9C27B0', fontWeight: 'bold', marginBottom: 15 },
  riskCard: { backgroundColor: '#181818', borderRadius: 16, padding: 20, marginBottom: 20 },
  riskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  riskTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  riskBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  riskBadgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  riskDescription: { color: '#aaa', fontSize: 14 },
  factorsCard: { backgroundColor: '#181818', borderRadius: 16, padding: 20, marginBottom: 20 },
  factorsTitle: { color: '#9C27B0', fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  factorItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  factorBullet: { color: '#9C27B0', fontSize: 16, marginRight: 8, marginTop: 2 },
  factorText: { color: '#fff', fontSize: 14, flex: 1 },
  summaryCard: { backgroundColor: '#181818', borderRadius: 16, padding: 20 },
  summaryTitle: { color: '#FFC107', fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  summaryLabel: { color: '#aaa', fontSize: 14 },
  summaryValue: { color: '#fff', fontSize: 14, fontWeight: '600' },
  planCard: { backgroundColor: '#181818', borderRadius: 16, padding: 20, marginBottom: 20 },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  planInfo: { flexDirection: 'row', alignItems: 'center' },
  planLogo: { fontSize: 32, marginRight: 12 },
  planName: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  planRating: { flexDirection: 'row', alignItems: 'center' },
  ratingText: { color: '#FFC107', fontSize: 12, marginRight: 8 },
  farmersText: { color: '#aaa', fontSize: 12 },
  selectButton: { backgroundColor: '#9C27B0', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  selectButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  planDetails: { gap: 10 },
  planDetail: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  planDetailLabel: { color: '#aaa', fontSize: 14 },
  planDetailValue: { color: '#fff', fontSize: 14, fontWeight: '600' },
  claimsContainer: { gap: 15 },
  claimCard: { backgroundColor: '#181818', borderRadius: 16, padding: 20 },
  selectedClaimCard: { backgroundColor: '#232323', borderColor: '#9C27B0', borderWidth: 2 },
  claimHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  claimNumber: { 
    width: 32, 
    height: 32, 
    backgroundColor: '#9C27B0', 
    borderRadius: 16, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginRight: 12 
  },
  claimNumberText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  claimInfo: { flex: 1 },
  claimTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  claimTimeline: { color: '#9C27B0', fontSize: 12 },
  claimDescription: { color: '#aaa', fontSize: 14, marginBottom: 8 },
  claimDocuments: { marginBottom: 8 },
  documentsLabel: { color: '#FFC107', fontSize: 12, fontWeight: 'bold' },
  documentsValue: { color: '#fff', fontSize: 12 },
  claimContact: { color: '#9C27B0', fontSize: 12 },
  tipsCard: { backgroundColor: '#181818', borderRadius: 16, padding: 20 },
  tipsTitle: { color: '#FFC107', fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  tipItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  tipBullet: { color: '#9C27B0', fontSize: 16, marginRight: 8, marginTop: 2 },
  tipText: { color: '#fff', fontSize: 14, flex: 1 },
  errorText: { color: '#FF6B6B', fontSize: 16, textAlign: 'center', padding: 20 },
});

export default CropInsuranceScreen; 