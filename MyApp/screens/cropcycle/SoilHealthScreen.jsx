import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity, Animated, Easing, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

// Mock soil data - in real app this would come from API
const SOIL_DATA = {
  'Rice': {
    currentScore: 72,
    targetScore: 85,
    pH: 6.2,
    nitrogen: 'Medium',
    phosphorus: 'Low',
    potassium: 'High',
    organicMatter: 1.8,
    bestSeason: 'Kharif',
    soilType: 'Clay Loam',
  },
  'Wheat': {
    currentScore: 68,
    targetScore: 80,
    pH: 7.1,
    nitrogen: 'Low',
    phosphorus: 'Medium',
    potassium: 'Medium',
    organicMatter: 1.5,
    bestSeason: 'Rabi',
    soilType: 'Sandy Loam',
  },
  'Maize': {
    currentScore: 75,
    targetScore: 88,
    pH: 6.8,
    nitrogen: 'High',
    phosphorus: 'High',
    potassium: 'Medium',
    organicMatter: 2.1,
    bestSeason: 'Both',
    soilType: 'Loam',
  },
  'Cotton': {
    currentScore: 65,
    targetScore: 82,
    pH: 7.5,
    nitrogen: 'Medium',
    phosphorus: 'Low',
    potassium: 'Low',
    organicMatter: 1.2,
    bestSeason: 'Kharif',
    soilType: 'Black Soil',
  },
  'Tomato': {
    currentScore: 70,
    targetScore: 85,
    pH: 6.5,
    nitrogen: 'Medium',
    phosphorus: 'High',
    potassium: 'High',
    organicMatter: 2.0,
    bestSeason: 'Both',
    soilType: 'Sandy Loam',
  },
  'Onion': {
    currentScore: 73,
    targetScore: 87,
    pH: 6.8,
    nitrogen: 'High',
    phosphorus: 'Medium',
    potassium: 'High',
    organicMatter: 1.9,
    bestSeason: 'Rabi',
    soilType: 'Loam',
  },
  // Fallback data for other crops
  'Sugarcane': {
    currentScore: 78,
    targetScore: 90,
    pH: 6.5,
    nitrogen: 'High',
    phosphorus: 'High',
    potassium: 'High',
    organicMatter: 2.5,
    bestSeason: 'Annual',
    soilType: 'Clay Loam',
  },
  'Potato': {
    currentScore: 69,
    targetScore: 83,
    pH: 6.0,
    nitrogen: 'Medium',
    phosphorus: 'High',
    potassium: 'Medium',
    organicMatter: 1.7,
    bestSeason: 'Rabi',
    soilType: 'Sandy Loam',
  },
  'Soybean': {
    currentScore: 71,
    targetScore: 86,
    pH: 6.5,
    nitrogen: 'High',
    phosphorus: 'Medium',
    potassium: 'Medium',
    organicMatter: 1.8,
    bestSeason: 'Kharif',
    soilType: 'Loam',
  },
  'Groundnut': {
    currentScore: 74,
    targetScore: 88,
    pH: 6.8,
    nitrogen: 'Medium',
    phosphorus: 'High',
    potassium: 'High',
    organicMatter: 2.2,
    bestSeason: 'Both',
    soilType: 'Sandy Loam',
  },
};

const NUTRIENT_RECOMMENDATIONS = {
  'Low': {
    color: '#FF6B6B',
    action: 'Add immediately',
    products: 'Urea, DAP, NPK',
    quantity: 'Full recommended dose',
  },
  'Medium': {
    color: '#FFC107',
    action: 'Add moderately',
    products: 'NPK, Organic manure',
    quantity: 'Half recommended dose',
  },
  'High': {
    color: '#4CAF50',
    action: 'No need to add',
    products: 'Maintain current level',
    quantity: 'No additional input',
  },
};

const SoilHealthScreen = ({ route }) => {
  const { selectedCrop, landSize } = route.params || { selectedCrop: 'Rice', landSize: '5' };
  const [currentView, setCurrentView] = useState('score');
  const [fadeAnim] = useState(new Animated.Value(1));
  const [scaleAnim] = useState(new Animated.Value(1));
  const [selectedAction, setSelectedAction] = useState(0);

  // Get soil data with fallback and additional error handling
  const soilData = SOIL_DATA[selectedCrop] || SOIL_DATA['Rice'];
  const landSizeNum = parseInt(landSize) || 5;
  const scoreGap = soilData.targetScore - soilData.currentScore;
  const improvementNeeded = scoreGap > 0;

  // Additional safety checks
  if (!soilData) {
    console.error('Soil data not found for crop:', selectedCrop);
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Soil data not available for {selectedCrop}</Text>
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

  const renderScoreView = () => (
    <Animated.View style={[styles.viewContainer, { opacity: fadeAnim }]}>
      <Text style={styles.sectionTitle}>🌱 Soil Health Score</Text>
      
      {/* Score Display */}
      <View style={styles.scoreContainer}>
        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>Current Score</Text>
          <Text style={styles.currentScore}>{soilData.currentScore}/100</Text>
          <View style={styles.scoreBar}>
            <View style={[styles.scoreFill, { width: `${soilData.currentScore}%`, backgroundColor: soilData.currentScore >= 80 ? '#4CAF50' : soilData.currentScore >= 60 ? '#FFC107' : '#FF6B6B' }]} />
          </View>
        </View>
        
        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>Target Score</Text>
          <Text style={styles.targetScore}>{soilData.targetScore}/100</Text>
          <View style={styles.scoreBar}>
            <View style={[styles.scoreFill, { width: `${soilData.targetScore}%`, backgroundColor: '#4CAF50' }]} />
          </View>
        </View>
      </View>

      {/* Improvement Needed */}
      <Animated.View style={[styles.improvementCard, { transform: [{ scale: scaleAnim }] }]}>
        <Text style={styles.improvementTitle}>
          {improvementNeeded ? `📈 Need ${scoreGap} points improvement` : '✅ Soil is optimal!'}
        </Text>
        <Text style={styles.improvementText}>
          {improvementNeeded 
            ? `Your soil needs ${scoreGap} more points to reach optimal health for ${selectedCrop}`
            : `Your soil is in excellent condition for ${selectedCrop} cultivation`
          }
        </Text>
      </Animated.View>

      {/* Soil Properties */}
      <View style={styles.propertiesCard}>
        <Text style={styles.propertiesTitle}>🔬 Soil Properties</Text>
        <View style={styles.propertyRow}>
          <Text style={styles.propertyLabel}>pH Level</Text>
          <Text style={styles.propertyValue}>{soilData.pH} (Optimal: 6.0-7.5)</Text>
        </View>
        <View style={styles.propertyRow}>
          <Text style={styles.propertyLabel}>Organic Matter</Text>
          <Text style={styles.propertyValue}>{soilData.organicMatter}% (Target: 3%)</Text>
        </View>
        <View style={styles.propertyRow}>
          <Text style={styles.propertyLabel}>Soil Type</Text>
          <Text style={styles.propertyValue}>{soilData.soilType}</Text>
        </View>
        <View style={styles.propertyRow}>
          <Text style={styles.propertyLabel}>Best Season</Text>
          <Text style={styles.propertyValue}>{soilData.bestSeason}</Text>
        </View>
      </View>
    </Animated.View>
  );

  const renderNutrientsView = () => (
    <Animated.View style={[styles.viewContainer, { opacity: fadeAnim }]}>
      <Text style={styles.sectionTitle}>🧪 Nutrient Analysis</Text>
      
      {[
        { name: 'Nitrogen (N)', level: soilData.nitrogen, importance: 'Leaf growth' },
        { name: 'Phosphorus (P)', level: soilData.phosphorus, importance: 'Root development' },
        { name: 'Potassium (K)', level: soilData.potassium, importance: 'Fruit quality' },
      ].map((nutrient, index) => {
        const recommendation = NUTRIENT_RECOMMENDATIONS[nutrient.level];
        return (
          <Animated.View key={index} style={[styles.nutrientCard, { transform: [{ scale: scaleAnim }] }]}>
            <View style={styles.nutrientHeader}>
              <Text style={styles.nutrientName}>{nutrient.name}</Text>
              <View style={[styles.nutrientLevel, { backgroundColor: recommendation.color }]}>
                <Text style={styles.nutrientLevelText}>{nutrient.level}</Text>
              </View>
            </View>
            <Text style={styles.nutrientImportance}>{nutrient.importance}</Text>
            <View style={styles.nutrientAction}>
              <Text style={styles.nutrientActionLabel}>Action:</Text>
              <Text style={styles.nutrientActionValue}>{recommendation.action}</Text>
            </View>
            <View style={styles.nutrientProducts}>
              <Text style={styles.nutrientProductsLabel}>Products:</Text>
              <Text style={styles.nutrientProductsValue}>{recommendation.products}</Text>
            </View>
            <View style={styles.nutrientQuantity}>
              <Text style={styles.nutrientQuantityLabel}>Quantity:</Text>
              <Text style={styles.nutrientQuantityValue}>{recommendation.quantity}</Text>
            </View>
          </Animated.View>
        );
      })}
    </Animated.View>
  );

  const renderActionView = () => (
    <Animated.View style={[styles.viewContainer, { opacity: fadeAnim }]}>
      <Text style={styles.sectionTitle}>🎯 Action Plan</Text>
      
      <View style={styles.actionsContainer}>
        {[
          {
            step: 1,
            title: 'Soil Testing',
            description: 'Get free soil test from government lab',
            duration: '2 weeks',
            cost: '₹0',
            contact: 'Local agriculture office',
            priority: 'High',
          },
          {
            step: 2,
            title: 'pH Correction',
            description: soilData.pH < 6.0 ? 'Add lime to increase pH' : soilData.pH > 7.5 ? 'Add gypsum to decrease pH' : 'pH is optimal',
            duration: '1 week',
            cost: soilData.pH < 6.0 || soilData.pH > 7.5 ? '₹2000/acre' : '₹0',
            contact: 'Local fertilizer shop',
            priority: soilData.pH < 6.0 || soilData.pH > 7.5 ? 'High' : 'Low',
          },
          {
            step: 3,
            title: 'Organic Matter',
            description: `Add ${Math.max(0, 3 - soilData.organicMatter).toFixed(1)} tonnes/acre of FYM`,
            duration: '1 week',
            cost: `₹${Math.max(0, 3 - soilData.organicMatter) * 2000}/acre`,
            contact: 'Local dairy farm',
            priority: soilData.organicMatter < 2 ? 'High' : 'Medium',
          },
          {
            step: 4,
            title: 'Nutrient Application',
            description: 'Apply fertilizers based on soil test',
            duration: '1 week',
            cost: '₹3000/acre',
            contact: 'Local fertilizer shop',
            priority: 'High',
          },
          {
            step: 5,
            title: 'Bio-fertilizers',
            description: 'Apply Rhizobium, Azotobacter for nitrogen fixation',
            duration: '1 day',
            cost: '₹500/acre',
            contact: 'Agriculture department',
            priority: 'Medium',
          },
        ].map((action, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.actionCard, selectedAction === index && styles.selectedActionCard]}
            onPress={() => {
              setSelectedAction(index);
              animateCard();
            }}
          >
            <View style={styles.actionHeader}>
              <View style={styles.actionNumber}>
                <Text style={styles.actionNumberText}>{action.step}</Text>
              </View>
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <View style={[styles.priorityBadge, { backgroundColor: action.priority === 'High' ? '#FF6B6B' : action.priority === 'Medium' ? '#FFC107' : '#4CAF50' }]}>
                  <Text style={styles.priorityText}>{action.priority}</Text>
                </View>
              </View>
              <Text style={styles.actionCost}>{action.cost}</Text>
            </View>
            <Text style={styles.actionDescription}>{action.description}</Text>
            <View style={styles.actionDetails}>
              <Text style={styles.actionDuration}>⏱️ {action.duration}</Text>
              <Text style={styles.actionContact}>📞 {action.contact}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>🌿 Soil Optimization</Text>
          <Text style={styles.subtitle}>{selectedCrop} - {landSize} acres</Text>
        </View>

        {/* Navigation Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, currentView === 'score' && styles.activeTab]}
            onPress={() => {
              setCurrentView('score');
              animateCard();
            }}
          >
            <Text style={[styles.tabText, currentView === 'score' && styles.activeTabText]}>🌱 Score</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, currentView === 'nutrients' && styles.activeTab]}
            onPress={() => {
              setCurrentView('nutrients');
              animateCard();
            }}
          >
            <Text style={[styles.tabText, currentView === 'nutrients' && styles.activeTabText]}>🧪 Nutrients</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, currentView === 'action' && styles.activeTab]}
            onPress={() => {
              setCurrentView('action');
              animateCard();
            }}
          >
            <Text style={[styles.tabText, currentView === 'action' && styles.activeTabText]}>🎯 Actions</Text>
          </TouchableOpacity>
        </View>

        {/* Content Views */}
        {currentView === 'score' && renderScoreView()}
        {currentView === 'nutrients' && renderNutrientsView()}
        {currentView === 'action' && renderActionView()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#101613' },
  scrollContainer: { padding: 20 },
  header: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#607D8B', marginBottom: 4 },
  subtitle: { fontSize: 16, color: '#aaa' },
  tabContainer: { flexDirection: 'row', marginBottom: 20, backgroundColor: '#181818', borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  activeTab: { backgroundColor: '#607D8B' },
  tabText: { color: '#aaa', fontWeight: '600', fontSize: 14 },
  activeTabText: { color: '#fff' },
  viewContainer: { marginBottom: 20 },
  sectionTitle: { fontSize: 20, color: '#607D8B', fontWeight: 'bold', marginBottom: 15 },
  scoreContainer: { flexDirection: 'row', marginBottom: 20 },
  scoreCard: { flex: 1, backgroundColor: '#181818', borderRadius: 16, padding: 20, alignItems: 'center', marginHorizontal: 5 },
  scoreLabel: { color: '#aaa', fontSize: 14, marginBottom: 8 },
  currentScore: { color: '#FFC107', fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  targetScore: { color: '#4CAF50', fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  scoreBar: { width: '100%', height: 8, backgroundColor: '#333', borderRadius: 4, overflow: 'hidden' },
  scoreFill: { height: '100%', borderRadius: 4 },
  improvementCard: { backgroundColor: '#181818', borderRadius: 16, padding: 20, marginBottom: 20 },
  improvementTitle: { color: '#607D8B', fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  improvementText: { color: '#fff', fontSize: 14 },
  propertiesCard: { backgroundColor: '#181818', borderRadius: 16, padding: 20 },
  propertiesTitle: { color: '#FFC107', fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
  propertyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  propertyLabel: { color: '#aaa', fontSize: 14 },
  propertyValue: { color: '#fff', fontSize: 14, fontWeight: '600' },
  nutrientCard: { backgroundColor: '#181818', borderRadius: 16, padding: 20, marginBottom: 15 },
  nutrientHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  nutrientName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  nutrientLevel: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  nutrientLevelText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  nutrientImportance: { color: '#aaa', fontSize: 14, marginBottom: 12 },
  nutrientAction: { flexDirection: 'row', marginBottom: 8 },
  nutrientActionLabel: { color: '#607D8B', fontSize: 14, fontWeight: 'bold', marginRight: 8 },
  nutrientActionValue: { color: '#fff', fontSize: 14 },
  nutrientProducts: { flexDirection: 'row', marginBottom: 8 },
  nutrientProductsLabel: { color: '#607D8B', fontSize: 14, fontWeight: 'bold', marginRight: 8 },
  nutrientProductsValue: { color: '#fff', fontSize: 14 },
  nutrientQuantity: { flexDirection: 'row' },
  nutrientQuantityLabel: { color: '#607D8B', fontSize: 14, fontWeight: 'bold', marginRight: 8 },
  nutrientQuantityValue: { color: '#fff', fontSize: 14 },
  actionsContainer: { gap: 15 },
  actionCard: { backgroundColor: '#181818', borderRadius: 16, padding: 20 },
  selectedActionCard: { backgroundColor: '#232323', borderColor: '#607D8B', borderWidth: 2 },
  actionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  actionNumber: { 
    width: 32, 
    height: 32, 
    backgroundColor: '#607D8B', 
    borderRadius: 16, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginRight: 12 
  },
  actionNumberText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  actionInfo: { flex: 1 },
  actionTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  priorityBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  priorityText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  actionCost: { color: '#4CAF50', fontSize: 14, fontWeight: 'bold' },
  actionDescription: { color: '#aaa', fontSize: 14, marginBottom: 8 },
  actionDetails: { flexDirection: 'row', justifyContent: 'space-between' },
  actionDuration: { color: '#FFC107', fontSize: 12 },
  actionContact: { color: '#607D8B', fontSize: 12 },
  errorText: {
    color: '#FF6B6B',
    fontSize: 18,
    textAlign: 'center',
    padding: 20,
  },
});

export default SoilHealthScreen; 