import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  StyleSheet,
  TextInput,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  LayoutAnimation,
  UIManager,
  ActivityIndicator,
  Linking,
  Modal,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import NewMarketPricesScreen from './NewMarketPricesScreen';
import { useTranslation } from 'react-i18next';
import { NetworkConfig } from '../utils/NetworkConfig';
import MicOverlay from '../components/MicOverlay';
import { REAL_MANDI_DATA, AI_STRATEGIC_PLANS, findMandisByCrop, findMandisByLocation, getMandiById, getCropPriceInMandi, formatPhoneNumber, getMandisByDistance, calculateDistance } from '../data/mandiData';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const API_BASE = NetworkConfig.API_BASE;
const FARMER_ID = 'f001';
const STORAGE_KEY = 'market-listings-cache';

// --- Initial Data ---
const initialMarketData = [
    { id: 1, name: 'Wheat', price: 245.50, change: +12.30, changePercent: +5.27, volume: '2.4K tons', high: 248.00, low: 232.10, emoji: '🌾' },
    { id: 2, name: 'Rice', price: 189.75, change: -8.45, changePercent: -4.26, volume: '3.1K tons', high: 198.20, low: 185.30, emoji: '🍚' },
    { id: 3, name: 'Corn', price: 156.20, change: +3.80, changePercent: +2.49, volume: '1.8K tons', high: 159.40, low: 152.60, emoji: '🌽' },
];
const initialMyListings = [
    { id: 1, name: 'Organic Wheat', quantity: '50 tons', myPrice: 260.00, marketPrice: 245.50, status: 'active', views: 24, inquiries: 3, emoji: '🌾' },
    { id: 2, name: 'Fresh Milk', quantity: '200 liters/day', myPrice: 32.00, marketPrice: 28.75, status: 'active', views: 18, inquiries: 7, emoji: '🥛' },
];

// AI Combo Plans - Fixed missing constant
const AI_COMBO_PLANS = [
  {
    id: 'premium_bangalore',
    name: 'Premium Bangalore Combo',
    description: 'High-value crops optimized for Bangalore markets',
    totalInvestment: 75000,
    expectedReturns: 125000,
    roi: 66.7,
    duration: '4-6 months',
    crops: [
      { name: 'Coffee', expectedProfit: 25000 },
      { name: 'Banana', expectedProfit: 18000 },
      { name: 'Tomato', expectedProfit: 12000 }
    ],
    aiInsights: [
      'Coffee prices trending upward due to export demand',
      'Banana market has consistent demand year-round',
      'Tomato prices peak during festival seasons'
    ]
  },
  {
    id: 'stable_tumkur',
    name: 'Stable Tumkur Plan',
    description: 'Low-risk traditional crops with steady returns',
    totalInvestment: 45000,
    expectedReturns: 72000,
    roi: 60.0,
    duration: '6-8 months',
    crops: [
      { name: 'Coconut', expectedProfit: 20000 },
      { name: 'Ragi', expectedProfit: 15000 },
      { name: 'Groundnut', expectedProfit: 12000 }
    ],
    aiInsights: [
      'Coconut has minimal price fluctuation',
      'Ragi gaining popularity as health food',
      'Groundnut suitable for organic certification'
    ]
  },
  {
    id: 'quick_kolar',
    name: 'Quick Returns Kolar',
    description: 'Fast turnaround crops for immediate income',
    totalInvestment: 30000,
    expectedReturns: 48000,
    roi: 60.0,
    duration: '3-4 months',
    crops: [
      { name: 'Tomato', expectedProfit: 12000 },
      { name: 'Onion', expectedProfit: 10000 },
      { name: 'Potato', expectedProfit: 8000 }
    ],
    aiInsights: [
      'Vegetable prices peak during festivals',
      'Quick harvest cycles allow multiple plantings',
      'Good connectivity to Bangalore markets'
    ]
  }
];

// Crop name mapping: app name -> API name
const CROP_NAME_MAP = {
  "Organic Wheat": "Wheat",
    "Wheat": "Wheat",
    "Tomatoes": "Tomato",
    "Tomato": "Tomato",
    "Onion": "Onion",
    "Fresh Milk": "Milk",
    "Fresh Onions":"Onion",
    "Chickpeas":"Peas(Dry)"
  // Add more mappings as needed
};

// --- Reusable Components ---
const AnimatedListItem = ({ children, index }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, delay: index * 100, useNativeDriver: true }).start();
    }, [fadeAnim, index]);
    return (
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }}>
            {children}
        </Animated.View>
    );
};

// --- Main Screen ---
const MarketplaceScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const [selectedTab, setSelectedTab] = useState('market');
  const [marketData, setMarketData] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchCommodity, setSearchCommodity] = useState('');
  const [searching, setSearching] = useState(false);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedMarkets, setExpandedMarkets] = useState({});

  // Enhanced flow states
  const [currentStep, setCurrentStep] = useState('searchMandi'); // Start with mandi search: searchMandi -> selectMandi -> multipleCrops -> addProof -> priceComparison -> serviceInfo -> finalCard
  const [selectedMandi, setSelectedMandi] = useState(null);
  const [selectedCrops, setSelectedCrops] = useState([]); // Multiple crops
  const [cropProofs, setCropProofs] = useState({}); // Proof for each crop
  const [priceComparisons, setPriceComparisons] = useState({}); // Price comparison for each crop
  const [priceDecisions, setPriceDecisions] = useState({}); // Price decisions for each crop
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [mandiSearchTerm, setMandiSearchTerm] = useState('');
  const [showStrategicPlans, setShowStrategicPlans] = useState(false);
  const [filteredMandis, setFilteredMandis] = useState(REAL_MANDI_DATA);
  const [showCustomPriceModal, setShowCustomPriceModal] = useState(false);
  const [currentCropForPricing, setCurrentCropForPricing] = useState(null);
  const [customPriceInput, setCustomPriceInput] = useState('');

  // Modal State
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [productName, setProductName] = useState('');
  const [productQuantity, setProductQuantity] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productEmoji, setProductEmoji] = useState('');

  // Add state for preselectedMandi in MarketplaceScreen
  const [preselectedMandi, setPreselectedMandi] = useState(null);

  const openAddModal = () => {
    setEditingItem(null);
    setProductName('');
    setProductQuantity('');
    setProductPrice('');
    setProductEmoji('');
    setIsModalVisible(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setProductName(item.name);
    setProductQuantity(item.quantity);
    setProductPrice(item.myPrice.toString());
    setProductEmoji(item.emoji);
    setIsModalVisible(true);
  };

  // AI Strategic Plan Selection
  const handlePlanSelection = (plan) => {
    setSelectedPlan(plan);
    
    // Auto-fill data from plan
    const mainMandi = getMandiById(plan.crops[0].mandi);
    if (!mainMandi) {
      // Fallback to first available mandi if plan mandi not found
      const availableMandis = getMandisByDistance(200);
      setSelectedMandi(availableMandis[0] || null);
    } else {
      setSelectedMandi(mainMandi);
    }
    
    setSelectedCrops((plan.crops || []).map(crop => crop.name));
    
    // Auto-set price decisions to match recommended prices
    const autoDecisions = {};
    (plan.crops || []).forEach(crop => {
      const cropPrice = getCropPriceInMandi(crop.mandi, crop.name);
      if (cropPrice) {
        autoDecisions[crop.name] = {
          decision: 'match',
          finalPrice: cropPrice.avgPrice,
          matchedPrice: true
        };
      }
    });
    setPriceDecisions(autoDecisions);
    
    setCurrentStep('serviceInfo'); // Skip to service info since plan is pre-configured
  };

  // Handle Combo Selection - Fixed missing function
  const handleComboSelection = (combo) => {
    setSelectedPlan(combo);
    
    // Auto-fill data from combo
    const availableMandis = getMandisByDistance(200);
    const mainMandi = availableMandis[0]; // Get first nearby mandi
    setSelectedMandi(mainMandi || null);
    setSelectedCrops((combo.crops || []).map(crop => crop.name));
    
    // Auto-set price decisions
    const autoDecisions = {};
    (combo.crops || []).forEach(crop => {
      autoDecisions[crop.name] = {
        decision: 'match',
        finalPrice: 1500, // Default price, can be enhanced with real data
        matchedPrice: true
      };
    });
    setPriceDecisions(autoDecisions);
    
    setCurrentStep('multipleCrops');
  };

  // Enhanced flow functions
  const handleMandiSelection = (mandi) => {
    setSelectedMandi(mandi);
    setCurrentStep('multipleCrops');
  };

  const handleCropToggle = (crop) => {
    setSelectedCrops(prev => 
      prev.includes(crop) 
        ? prev.filter(c => c !== crop)
        : [...prev, crop]
    );
  };

  // Enhanced handleAddProof with image picker
  const handleAddProof = async (crop) => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions to upload proof images.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setCropProofs(prev => ({
          ...prev,
          [crop]: {
            uri: imageUri,
            fileName: `proof_${crop}_${Date.now()}.jpg`,
            uploaded: true
          }
        }));
        Alert.alert('Success', `Proof for ${crop} has been uploaded successfully!`);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to upload proof image. Please try again.');
    }
  };

  const proceedToPriceComparison = () => {
    if (!selectedMandi) {
      Alert.alert('Error', 'Please select a mandi first');
      return;
    }
    
    if ((selectedCrops || []).length === 0) {
      Alert.alert('Error', 'Please select at least one crop');
      return;
    }

    // Calculate price comparisons for all selected crops
    const comparisons = {};
    (selectedCrops || []).forEach(crop => {
      const cropPrice = getCropPriceInMandi(selectedMandi.id, crop);
      if (cropPrice) {
        comparisons[crop] = cropPrice;
      }
    });
    
    setPriceComparisons(comparisons);
    setCurrentStep('priceComparison');
  };

  const handlePriceDecision = (crop, decision, newPrice = null) => {
    setPriceDecisions(prev => ({
      ...prev,
      [crop]: {
        decision,
        finalPrice: newPrice || priceComparisons[crop]?.avgPrice,
        matchedPrice: decision === 'match'
      }
    }));
  };

  const proceedToServiceInfo = () => {
    const allCropsDecided = selectedCrops.every(crop => priceDecisions[crop]);
    if (!allCropsDecided) {
      Alert.alert('Error', 'Please make price decisions for all crops');
      return;
    }
    setCurrentStep('serviceInfo');
  };

  const makePhoneCall = (phoneNumber) => {
    const formattedNumber = formatPhoneNumber(phoneNumber);
    Linking.openURL(`tel:${formattedNumber}`);
  };

  const openWebsite = (url) => {
    Linking.openURL(url);
  };

  const resetFlow = () => {
    setCurrentStep('searchMandi');
    setSelectedMandi(null);
    setSelectedCrops([]);
    setCropProofs({});
    setPriceComparisons({});
    setPriceDecisions({});
    setSelectedPlan(null);
    setMandiSearchTerm('');
    setShowStrategicPlans(false);
  };

  const handleSave = () => {
    if (!productName || !productQuantity || !productPrice) {
      Alert.alert(t('marketplace.missing_info'), t('marketplace.fill_all_fields'));
      return;
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (editingItem) {
      setMyListings(myListings.map(item =>
        item.id === editingItem.id
          ? { ...item, name: productName, quantity: productQuantity, myPrice: parseFloat(productPrice), emoji: productEmoji || '📦' }
          : item
      ));
      Alert.alert(t('marketplace.success_updated', { name: productName }));
    } else {
      const newListing = {
        id: Date.now(),
        name: productName,
        quantity: productQuantity,
        myPrice: parseFloat(productPrice),
        marketPrice: marketData.find(p => p.name.toLowerCase() === productName.toLowerCase())?.price || 0,
        status: 'active',
        views: 0,
        inquiries: 0,
        emoji: productEmoji || '📦',
      };
      setMyListings([newListing, ...myListings]);
      Alert.alert(t('marketplace.success_added', { name: productName }));
    }
    setIsModalVisible(false);
  };

  const handleDelete = (itemToDelete) => {
    Alert.alert(
      t('marketplace.delete_listing'),
      t('marketplace.delete_confirm', { name: itemToDelete.name }),
      [
        { text: t('marketplace.cancel'), style: 'cancel' },
        {
          text: t('marketplace.delete'),
          style: 'destructive',
          onPress: () => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setMyListings(myListings.filter(item => item.id !== itemToDelete.id));
          }
        }
      ]
    );
  };

  // Helper to get mapped crop name
  const getMappedCropName = (name) => {
    return CROP_NAME_MAP[name] || name;
  };

  // Fetch real market price for a given crop
  const fetchMarketPriceForCrop = async (state, crop, district = 'Mumbai') => {
    const mappedCrop = getMappedCropName(crop);
    let url = `${API_BASE}/market/prices?state=${encodeURIComponent(state)}&commodity=${encodeURIComponent(mappedCrop)}&district=${encodeURIComponent(district)}`;
    try {
      const response = await fetch(url);
      if (!response.ok) return 0;
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        const sorted = data.slice().sort((a, b) => {
          const dateA = new Date(a.arrival_date || a.Arrival_Date || '');
          const dateB = new Date(b.arrival_date || b.Arrival_Date || '');
          return dateB - dateA;
        });
        const price = parseFloat(sorted[0].modal_price || sorted[0].Modal_Price || 0);
        return price;
      }
      return 0;
    } catch {
      return 0;
    }
  };

  // Update My Listings with real prices and loading state
  const updateListingsWithMarketPrices = async () => {
    if (!myListings || myListings.length === 0) return;
    setMyListings((prev) => prev.map(item => ({ ...item, marketPriceLoading: true })));
    const districtForPrice = 'Mumbai';
    const updatedListings = await Promise.all(myListings.map(async (item) => {
      const realPrice = await fetchMarketPriceForCrop(item.state, item.name, districtForPrice);
      return { ...item, marketPrice: realPrice, marketPriceLoading: false };
    }));
    const seen = new Set();
    const uniqueListings = updatedListings.filter(item => {
      const key = item.name + item.quantity;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    setMyListings(uniqueListings);
  };

  useEffect(() => {
    updateListingsWithMarketPrices();
  }, [myListings.length]);

  // Get filtered mandis based on search
  const getFilteredMandis = () => {
    if (!mandiSearchTerm.trim()) {
      const mandis = getMandisByDistance(200);
      return Array.isArray(mandis) ? mandis : [];
    }
    const mandis = findMandisByLocation(mandiSearchTerm);
    return Array.isArray(mandis) ? mandis : [];
  };

  // Render functions for enhanced flow
  const renderAIInsights = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>🤖 AI-Powered Marketplace</Text>
      <Text style={styles.subtitle}>Get smart recommendations tailored for you</Text>
      
      <View style={styles.aiInsightsCard}>
        <LinearGradient colors={['#8B5CF6', '#A855F7']} style={styles.aiCardGradient}>
          <Text style={styles.aiTitle}>💡 Smart Suggestions</Text>
          <Text style={styles.aiInsightText}>
            Based on market trends and your location near Karnataka, here are our AI recommendations:
          </Text>
          <View style={styles.aiInsightsList}>
            <Text style={styles.aiInsightItem}>• Coffee prices are 25% higher in Mysore this season</Text>
            <Text style={styles.aiInsightItem}>• Tomato demand is peak in Bangalore markets</Text>
            <Text style={styles.aiInsightItem}>• Ragi organic certification can boost profits by 40%</Text>
          </View>
        </LinearGradient>
      </View>

      <Text style={styles.comboTitle}>🍟 Ready-Made Combo Plans</Text>
      <Text style={styles.comboSubtitle}>Like McDonald's combos, but for farming!</Text>
      
      {(AI_COMBO_PLANS || []).map((combo, index) => (
        <AnimatedListItem key={combo.id} index={index}>
          <TouchableOpacity 
            style={styles.comboCard}
            onPress={() => handleComboSelection(combo)}
            activeOpacity={0.8}
          >
            <LinearGradient colors={['#1C1C1E', '#2C2C2E']} style={styles.comboCardGradient}>
              <View style={styles.comboHeader}>
                <Text style={styles.comboName}>{combo.name}</Text>
                <View style={styles.roiBadge}>
                  <Text style={styles.roiText}>{combo.roi.toFixed(1)}% ROI</Text>
                </View>
              </View>
              
              <Text style={styles.comboDescription}>{combo.description}</Text>
              
              <View style={styles.comboDetails}>
                <View style={styles.comboDetailRow}>
                  <Text style={styles.comboDetailLabel}>Investment:</Text>
                  <Text style={styles.comboDetailValue}>₹{combo.totalInvestment.toLocaleString()}</Text>
                </View>
                <View style={styles.comboDetailRow}>
                  <Text style={styles.comboDetailLabel}>Expected Returns:</Text>
                  <Text style={styles.comboDetailValue}>₹{combo.expectedReturns.toLocaleString()}</Text>
                </View>
                <View style={styles.comboDetailRow}>
                  <Text style={styles.comboDetailLabel}>Duration:</Text>
                  <Text style={styles.comboDetailValue}>{combo.duration}</Text>
                </View>
              </View>
              
              <View style={styles.comboCrops}>
                {(combo.crops || []).map((crop, idx) => (
                  <View key={idx} style={styles.comboCropItem}>
                    <Text style={styles.comboCropName}>{crop.name}</Text>
                    <Text style={styles.comboCropProfit}>+₹{crop.expectedProfit.toLocaleString()}</Text>
                  </View>
                ))}
              </View>
              
              <View style={styles.comboAIInsights}>
                <Text style={styles.aiInsightsTitle}>🧠 AI Insights:</Text>
                {(combo.aiInsights || []).slice(0, 2).map((insight, idx) => (
                  <Text key={idx} style={styles.aiInsightItem}>• {insight}</Text>
                ))}
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </AnimatedListItem>
      ))}

      <TouchableOpacity 
        style={styles.manualModeButton}
        onPress={() => setCurrentStep('searchMandi')}
      >
        <Text style={styles.manualModeText}>🎯 Manual Mode - Choose Your Own Path</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSearchMandi = () => (
    <View style={styles.section}>
      {/* AI Strategic Plans Button at Top */}
      <TouchableOpacity 
        style={styles.strategicPlansButton}
        onPress={() => setShowStrategicPlans(true)}
        activeOpacity={0.8}
      >
        <LinearGradient colors={['#4C1D95', '#7C3AED']} style={styles.strategicPlansGradient}>
          <Ionicons name="bulb" size={20} color="#FFFFFF" />
          <Text style={styles.strategicPlansButtonText}>AI Suggested Plans</Text>
          <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>
      
      <Text style={styles.sectionTitle}>🔍 Find Your Market</Text>
      <Text style={styles.subtitle}>Select the best mandi for your crops</Text>
      
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={mandiSearchTerm}
          onChangeText={setMandiSearchTerm}
          placeholder="Search by location, mandi name, or district..."
          placeholderTextColor="#64748B"
        />
        <Ionicons name="search" size={20} color="#64748B" style={styles.searchIcon} />
      </View>

      <Text style={styles.resultsTitle}>
        {mandiSearchTerm.trim() ? `Search Results (${getFilteredMandis().length})` : `Karnataka & Nearby Mandis (${getFilteredMandis().length})`}
      </Text>
      
      {(getFilteredMandis() || []).map((mandi, index) => (
        <AnimatedListItem key={mandi.id} index={index}>
          <TouchableOpacity 
            style={styles.mandiCard}
            onPress={() => handleMandiSelection(mandi)}
            activeOpacity={0.8}
          >
            <LinearGradient colors={['#1C1C1E', '#2C2C2E']} style={styles.mandiCardGradient}>
              <View style={styles.mandiHeader}>
                <View style={styles.mandiInfo}>
                  <Text style={styles.mandiEmoji}>🏪</Text>
                  <View style={styles.mandiTextInfo}>
                    <Text style={styles.mandiName}>{mandi.name}</Text>
                    <Text style={styles.mandiLocation}>{mandi.location}, {mandi.state}</Text>
                    <Text style={styles.mandiDistance}>{calculateDistance(mandi)}</Text>
                    <Text style={styles.mandiTurnover}>Daily Turnover: {mandi.dailyTurnover}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#64748B" />
              </View>
              
              <View style={styles.mandiDetails}>
                <View style={styles.mandiDetailItem}>
                  <Text style={styles.detailLabel}>Specialization</Text>
                  <Text style={styles.detailValue}>{mandi.specialization.join(', ')}</Text>
                </View>
                <View style={styles.mandiDetailItem}>
                  <Text style={styles.detailLabel}>Operating Hours</Text>
                  <Text style={styles.detailValue}>{mandi.operatingHours}</Text>
                </View>
                <View style={styles.mandiDetailItem}>
                  <Text style={styles.detailLabel}>Available Crops</Text>
                  <Text style={styles.detailValue}>{Object.keys(mandi.crops).length} varieties</Text>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </AnimatedListItem>
      ))}
    </View>
  );

  const renderMultipleCrops = () => (
    <View style={styles.section}>
      <TouchableOpacity style={styles.backButton} onPress={() => setCurrentStep('searchMandi')}>
        <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
      </TouchableOpacity>
      
      <Text style={styles.sectionTitle}>🌾 Select Multiple Crops</Text>
      <Text style={styles.subtitle}>Selected Mandi: {selectedMandi ? selectedMandi.name : 'None selected'}</Text>
      
      <View style={styles.selectedCropsContainer}>
        <Text style={styles.selectedCropsLabel}>Selected Crops ({(selectedCrops || []).length}):</Text>
        <View style={styles.selectedCropsChips}>
          {(selectedCrops || []).map(crop => (
            <View key={crop} style={styles.selectedCropChip}>
              <Text style={styles.selectedCropChipText}>{crop}</Text>
              <TouchableOpacity onPress={() => handleCropToggle(crop)}>
                <Ionicons name="close" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </View>

      <Text style={styles.availableCropsTitle}>Available crops in {selectedMandi ? selectedMandi.name : ''}:</Text>
      <View style={styles.cropButtonsContainer}>
        {Object.keys(selectedMandi?.crops || {}).map((crop) => (
          <TouchableOpacity
            key={crop}
            style={[
              styles.cropButton, 
              selectedCrops.includes(crop) && styles.selectedCropButton
            ]}
            onPress={() => handleCropToggle(crop)}
          >
            <Text style={[
              styles.cropButtonText, 
              selectedCrops.includes(crop) && styles.selectedCropButtonText
            ]}>
              {crop}
            </Text>
            {selectedCrops.includes(crop) && (
              <Ionicons name="checkmark" size={16} color="#FFFFFF" style={styles.checkmark} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity 
        style={[styles.continueButton, (selectedCrops || []).length === 0 && styles.disabledButton]}
        onPress={() => setCurrentStep('addProof')}
        disabled={(selectedCrops || []).length === 0}
      >
        <Text style={styles.continueButtonText}>Add Proof & Continue</Text>
      </TouchableOpacity>
    </View>
  );

  const renderAddProof = () => (
    <View style={styles.section}>
      <TouchableOpacity style={styles.backButton} onPress={() => setCurrentStep('multipleCrops')}>
        <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
      </TouchableOpacity>
      
      <Text style={styles.sectionTitle}>📸 Add Crop Proof</Text>
      <Text style={styles.subtitle}>Upload photos/documents for verification</Text>
      
      {(selectedCrops || []).map((crop, index) => {
        const proof = cropProofs[crop];
        return (
          <View key={crop} style={styles.proofCard}>
            <LinearGradient colors={['#1C1C1E', '#2C2C2E']} style={styles.proofCardGradient}>
              <View style={styles.proofHeader}>
                <Text style={styles.proofCropName}>{crop}</Text>
                {proof && proof.uploaded && (
                  <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                )}
              </View>
              
              {proof && proof.uri ? (
                <View style={styles.proofImageContainer}>
                  <Image source={{ uri: proof.uri }} style={styles.proofImage} />
                  <View style={styles.proofImageOverlay}>
                    <TouchableOpacity 
                      style={styles.proofImageButton}
                      onPress={() => handleAddProof(crop)}
                    >
                      <Ionicons name="refresh" size={20} color="#FFFFFF" />
                      <Text style={styles.proofImageButtonText}>Change Image</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.proofButton}
                  onPress={() => handleAddProof(crop)}
                >
                  <Ionicons 
                    name="camera" 
                    size={24} 
                    color="#64748B" 
                  />
                  <Text style={styles.proofButtonText}>Upload Proof</Text>
                </TouchableOpacity>
              )}
              
              {proof && proof.fileName && (
                <Text style={styles.proofFileName}>{proof.fileName}</Text>
              )}
            </LinearGradient>
          </View>
        );
      })}

      <TouchableOpacity 
        style={[
          styles.continueButton, 
          selectedCrops.some(crop => !cropProofs[crop]?.uploaded) && styles.disabledButton
        ]}
        onPress={proceedToPriceComparison}
        disabled={selectedCrops.some(crop => !cropProofs[crop]?.uploaded)}
      >
        <Text style={styles.continueButtonText}>Proceed to Price Comparison</Text>
      </TouchableOpacity>
    </View>
  );

  const renderPriceComparison = () => (
    <View style={styles.section}>
      <TouchableOpacity style={styles.backButton} onPress={() => setCurrentStep('addProof')}>
        <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
      </TouchableOpacity>
      
      <Text style={styles.sectionTitle}>💰 Price Comparison</Text>
      <Text style={styles.subtitle}>Compare and decide prices for each crop</Text>
      
      {(selectedCrops || []).map((crop, index) => {
        const comparison = priceComparisons[crop];
        const decision = priceDecisions[crop];
        
        if (!comparison) return null;
        
        return (
          <View key={crop} style={styles.priceComparisonCard}>
            <LinearGradient colors={['#1C1C1E', '#2C2C2E']} style={styles.priceCardGradient}>
              <View style={styles.cropPriceHeader}>
                <Text style={styles.cropPriceTitle}>{crop}</Text>
                {decision && (
                  <View style={styles.decisionBadge}>
                    <Text style={styles.decisionBadgeText}>
                      {decision.matchedPrice ? 'MATCHED' : 'CUSTOM'}
                    </Text>
                  </View>
                )}
              </View>
              
              <View style={styles.priceInfo}>
                <Text style={styles.marketPriceLabel}>Market Price</Text>
                <Text style={styles.marketPrice}>₹{comparison.avgPrice}/quintal</Text>
                
                <View style={styles.priceRange}>
                  <View style={styles.priceRangeItem}>
                    <Text style={styles.priceRangeLabel}>Min</Text>
                    <Text style={styles.priceRangeValue}>₹{comparison.minPrice}</Text>
                  </View>
                  <View style={styles.priceRangeItem}>
                    <Text style={styles.priceRangeLabel}>Max</Text>
                    <Text style={styles.priceRangeValue}>₹{comparison.maxPrice}</Text>
                  </View>
                </View>
              </View>
              
              {decision ? (
                <View style={styles.priceDecisionMade}>
                  <Text style={styles.decisionText}>
                    Your Price: ₹{decision.finalPrice}/quintal
                  </Text>
                  <TouchableOpacity 
                    style={styles.changeDecisionButton}
                    onPress={() => setPriceDecisions(prev => {
                      const newDecisions = { ...prev };
                      delete newDecisions[crop];
                      return newDecisions;
                    })}
                  >
                    <Ionicons name="refresh" size={16} color="#3B82F6" />
                    <Text style={styles.changeDecisionText}>Change</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.priceDecisionContainer}>
                  <TouchableOpacity 
                    style={styles.priceDecisionButton}
                    onPress={() => handlePriceDecision(crop, 'match')}
                  >
                    <Text style={styles.priceDecisionText}>Match Market</Text>
                    <Text style={styles.priceDecisionSubtext}>₹{comparison.avgPrice}/quintal</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.priceDecisionButton}
                    onPress={() => {
                      setCurrentCropForPricing(crop);
                      setCustomPriceInput(comparison.avgPrice.toString());
                      setShowCustomPriceModal(true);
                    }}
                  >
                    <Text style={styles.priceDecisionText}>Set Custom</Text>
                    <Text style={styles.priceDecisionSubtext}>Enter your price</Text>
                  </TouchableOpacity>
                </View>
              )}
            </LinearGradient>
          </View>
        );
      })}

      <TouchableOpacity 
        style={[
          styles.continueButton,
          !selectedCrops.every(crop => priceDecisions[crop]) && styles.disabledButton
        ]}
        onPress={proceedToServiceInfo}
        disabled={!selectedCrops.every(crop => priceDecisions[crop])}
      >
        <Text style={styles.continueButtonText}>Check Service Options</Text>
      </TouchableOpacity>
    </View>
  );

  const renderServiceInfo = () => (
    <View style={styles.section}>
      <TouchableOpacity style={styles.backButton} onPress={() => setCurrentStep('priceComparison')}>
        <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
      </TouchableOpacity>
      
      <Text style={styles.sectionTitle}>🚚 Service Information</Text>
      <Text style={styles.subtitle}>How to proceed with your sale</Text>
      
      <View style={styles.serviceCard}>
        <LinearGradient colors={['#1C1C1E', '#2C2C2E']} style={styles.serviceCardGradient}>
          <Text style={styles.serviceTitle}>Transportation & Pickup</Text>
          
          <View style={styles.serviceOption}>
            <Ionicons 
              name={selectedMandi?.services.homePickup ? "checkmark-circle" : "close-circle"} 
              size={24} 
              color={selectedMandi?.services.homePickup ? "#10B981" : "#EF4444"} 
            />
            <View style={styles.serviceOptionText}>
              <Text style={styles.serviceOptionTitle}>
                {selectedMandi?.services.homePickup ? 'Home Pickup Available' : 'No Home Pickup'}
              </Text>
              <Text style={styles.serviceOptionDesc}>
                {selectedMandi?.services.homePickup 
                  ? 'Mandi will collect crops from your location' 
                  : 'You need to transport crops to the mandi'}
              </Text>
            </View>
          </View>
          
          <View style={styles.serviceOption}>
            <Ionicons 
              name={selectedMandi?.services.onSiteDealing ? "checkmark-circle" : "close-circle"} 
              size={24} 
              color={selectedMandi?.services.onSiteDealing ? "#10B981" : "#EF4444"} 
            />
            <View style={styles.serviceOptionText}>
              <Text style={styles.serviceOptionTitle}>On-site Dealing</Text>
              <Text style={styles.serviceOptionDesc}>
                {selectedMandi?.services.onSiteDealing 
                  ? 'Direct dealing and payment at mandi' 
                  : 'Remote dealing and payment'}
              </Text>
            </View>
          </View>

          <View style={styles.serviceOption}>
            <Ionicons 
              name={selectedMandi?.services.qualityTesting ? "checkmark-circle" : "close-circle"} 
              size={24} 
              color={selectedMandi?.services.qualityTesting ? "#10B981" : "#EF4444"} 
            />
            <View style={styles.serviceOptionText}>
              <Text style={styles.serviceOptionTitle}>Quality Testing</Text>
              <Text style={styles.serviceOptionDesc}>
                {selectedMandi?.services.qualityTesting 
                  ? 'Professional quality testing available' 
                  : 'No quality testing facility'}
              </Text>
            </View>
          </View>

          <View style={styles.serviceOption}>
            <Ionicons 
              name={selectedMandi?.services.storageAvailable ? "checkmark-circle" : "close-circle"} 
              size={24} 
              color={selectedMandi?.services.storageAvailable ? "#10B981" : "#EF4444"} 
            />
            <View style={styles.serviceOptionText}>
              <Text style={styles.serviceOptionTitle}>Storage Facility</Text>
              <Text style={styles.serviceOptionDesc}>
                {selectedMandi?.services.storageAvailable 
                  ? 'Temporary storage available if needed' 
                  : 'No storage facility available'}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      <TouchableOpacity 
        style={styles.continueButton}
        onPress={() => setCurrentStep('finalCard')}
      >
        <Text style={styles.continueButtonText}>View Final Details</Text>
      </TouchableOpacity>
    </View>
  );

  const renderFinalCard = () => (
    <View style={styles.section}>
      <TouchableOpacity style={styles.backButton} onPress={() => setCurrentStep('serviceInfo')}>
        <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
      </TouchableOpacity>
      
      <Text style={styles.sectionTitle}>✅ Final Sale Details</Text>
      
      {selectedPlan && (
        <View style={styles.comboSelectedCard}>
          <LinearGradient colors={selectedPlan.gradient} style={styles.comboSelectedGradient}>
            <Text style={styles.comboSelectedTitle}>{selectedPlan.name}</Text>
            <Text style={styles.comboSelectedROI}>ROI: {selectedPlan.roi ? selectedPlan.roi.toFixed(1) : selectedPlan.expectedROI}</Text>
          </LinearGradient>
        </View>
      )}
      
      <View style={styles.finalSummaryCard}>
        <LinearGradient colors={['#10B981', '#059669']} style={styles.finalCardGradient}>
          <View style={styles.finalCardHeader}>
            <Text style={styles.finalCardTitle}>Ready to Sell!</Text>
            <Text style={styles.finalCardMandi}>{selectedMandi ? selectedMandi.name : ''}</Text>
          </View>
          
          <View style={styles.finalCropsList}>
            {(selectedCrops || []).map(crop => {
              const decision = priceDecisions[crop];
              return (
                <View key={crop} style={styles.finalCropItem}>
                  <Text style={styles.finalCropName}>{crop}</Text>
                  <Text style={styles.finalCropPrice}>₹{decision?.finalPrice}/quintal</Text>
                </View>
              );
            })}
          </View>
          
          <View style={styles.finalTotalEstimate}>
            <Text style={styles.finalTotalLabel}>Estimated Total Value:</Text>
            <Text style={styles.finalTotalValue}>
              ₹{selectedCrops.reduce((total, crop) => {
                const decision = priceDecisions[crop];
                return total + (decision?.finalPrice || 0) * 10; // Assuming 10 quintals per crop
              }, 0).toLocaleString()}
            </Text>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.contactCard}>
        <LinearGradient colors={['#1C1C1E', '#2C2C2E']} style={styles.contactCardGradient}>
          <Text style={styles.contactTitle}>📞 Contact Information</Text>
          
          <View style={styles.contactDetails}>
            <View style={styles.contactRow}>
              <Ionicons name="person" size={20} color="#64748B" />
              <Text style={styles.contactLabel}>Contact Person:</Text>
              <Text style={styles.contactValue}>{selectedMandi?.contactPerson}</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.contactRow}
              onPress={() => makePhoneCall(selectedMandi?.phone)}
            >
              <Ionicons name="call" size={20} color="#10B981" />
              <Text style={styles.contactLabel}>Phone:</Text>
              <Text style={[styles.contactValue, styles.phoneNumber]}>{selectedMandi?.phone}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.contactRow}
              onPress={() => openWebsite(selectedMandi?.website)}
            >
              <Ionicons name="globe" size={20} color="#3B82F6" />
              <Text style={styles.contactLabel}>Website:</Text>
              <Text style={[styles.contactValue, styles.websiteLink]}>Visit Website</Text>
            </TouchableOpacity>
            
            <View style={styles.contactRow}>
              <Ionicons name="location" size={20} color="#64748B" />
              <Text style={styles.contactLabel}>Address:</Text>
              <Text style={styles.contactValue}>{selectedMandi?.address}</Text>
            </View>

            <View style={styles.contactRow}>
              <Ionicons name="time" size={20} color="#64748B" />
              <Text style={styles.contactLabel}>Hours:</Text>
              <Text style={styles.contactValue}>{selectedMandi?.operatingHours}</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      <TouchableOpacity style={styles.newSaleButton} onPress={resetFlow}>
        <Text style={styles.newSaleButtonText}>🔄 Start New Sale</Text>
      </TouchableOpacity>
    </View>
  );

  // Combine and deduplicate marketData and myListings
  const getCombinedData = () => {
    // Normalize and mark source
    const normalizedMarket = (marketData || []).map(item => ({
      ...item,
      source: 'market',
      key: `${item.Commodity || item.commodity || ''}|${item.Market || item.market || ''}|${item.Variety || item.variety || ''}`,
      date: new Date(item.Arrival_Date || item.arrival_date || 0)
    }));
    const normalizedMy = (myListings || []).map(item => ({
      ...item,
      source: 'my',
      key: `${item.name || ''}|${item.quantity || ''}`,
      date: new Date(item.createdAt || item.created_at || 0)
    }));
    // Merge
    const all = [...normalizedMarket, ...normalizedMy];
    // Deduplicate by key, keep latest by date
    const deduped = Object.values(
      all.reduce((acc, item) => {
        if (!acc[item.key] || (item.date > acc[item.key].date)) {
          acc[item.key] = item;
        }
        return acc;
      }, {})
    );
    // Filter by search term (commodity or market name)
    if (!searchTerm.trim()) return deduped;
    const term = searchTerm.toLowerCase();
    return deduped.filter(item => {
      if (item.source === 'market') {
        return (
          (item.Commodity || item.commodity || '').toLowerCase().includes(term) ||
          (item.Market || item.market || '').toLowerCase().includes(term)
        );
      } else {
        return (
          (item.name || '').toLowerCase().includes(term) ||
          (item.quantity || '').toLowerCase().includes(term)
        );
      }
    });
  };
  // Group by market name, then render crops/commodities under each market
  const groupByMarket = (data) => {
    const grouped = {};
    data.forEach(item => {
      // Use market name for grouping, fallback to 'My Listings (No Market)' if not present
      const market = item.Market || item.market || (item.source === 'my' ? (item.market || 'My Listings (No Market)') : '-');
      if (!grouped[market]) grouped[market] = [];
      grouped[market].push(item);
    });
    return grouped;
  };
  const combinedData = getCombinedData();
  const groupedData = groupByMarket(combinedData);

  const renderMarketItem = (item, index) => {
    const price = parseFloat(item.modal_price) || 0;
    // Use a more robust key to prevent errors from malformed API data
    const key = `${item.arrival_date}-${item.market}-${item.variety}-${index}`;
    return (
        <AnimatedListItem index={index} key={key}>
            <TouchableOpacity style={styles.marketCard} activeOpacity={0.9}>
                 <View style={[StyleSheet.absoluteFillObject, styles.cardGlow]}>
                    <LinearGradient colors={['#3B82F6', 'transparent']} style={styles.glowGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                </View>
                <LinearGradient colors={['#18181b', '#27272a']} style={styles.marketCardGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                    <View style={styles.marketHeader}>
                        <View style={styles.marketInfo}><Text style={styles.cropEmoji}>📍</Text><View><Text style={styles.cropName}>{item.market}</Text><Text style={styles.volume}>District: {item.district}</Text></View></View>
                        <View style={styles.priceInfo}><Text style={styles.price}>₹{price.toFixed(2)}</Text><Text style={styles.volume}>per Quintal</Text></View>
                    </View>
                    <View style={styles.marketStats}>
                        <View style={styles.statItem}><Text style={styles.statLabel}>Variety</Text><Text style={styles.statValue}>{item.variety}</Text></View>
                        <View style={styles.statItem}><Text style={styles.statLabel}>State</Text><Text style={styles.statValue}>{item.state}</Text></View>
                        <View style={styles.statItem}><Text style={styles.statLabel}>Arrival</Text><Text style={styles.statValue}>{item.arrival_date}</Text></View>
                    </View>
                </LinearGradient>
            </TouchableOpacity>
        </AnimatedListItem>
    );
  };

  const renderMyListing = (item, index) => {
    const priceDiff = item.myPrice - item.marketPrice;
    const isPriceAboveMarket = priceDiff > 0;
    const priceCompColor = isPriceAboveMarket ? '#F59E0B' : '#10B981';
    return (
        <AnimatedListItem index={index} key={item.id}>
            <View style={styles.listingCard}>
                <LinearGradient colors={['#18181b', '#27272a']} style={styles.marketCardGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                    <View style={styles.listingHeader}><View style={styles.listingInfo}><Text style={styles.cropEmoji}>{item.emoji}</Text><View><Text style={styles.cropName}>{item.name}</Text><Text style={styles.quantity}>{item.quantity}</Text></View></View><View style={[styles.statusBadge, { backgroundColor: item.status === 'active' ? '#10B981' : '#F59E0B' }]}><Text style={styles.statusText}>{item.status.toUpperCase()}</Text></View></View>
                    <View style={styles.priceComparison}><View style={styles.priceRow}><Text style={styles.priceLabel}>Your Price:</Text><Text style={styles.myPrice}>₹{item.myPrice.toFixed(2)}</Text></View><View style={styles.priceRow}><Text style={styles.priceLabel}>Market Price:</Text>{item.marketPriceLoading ? <ActivityIndicator color="#fff" size="small" style={{ marginLeft: 8 }} /> : <Text style={styles.marketPriceText}>₹{item.marketPrice.toFixed(2)}</Text>}</View><View style={styles.priceRow}><Text style={styles.priceLabel}>Difference:</Text><Text style={[styles.priceDiff, { color: priceCompColor }]}>{isPriceAboveMarket ? '+' : ''}₹{priceDiff.toFixed(2)}</Text></View></View>
                    <View style={styles.listingStats}>
                        <View style={styles.statsGroup}><View style={styles.statBox}><Ionicons name="eye-outline" size={16} color="#64748B" /><Text style={styles.statNumber}>{item.views}</Text><Text style={styles.statText}>Views</Text></View><View style={styles.statBox}><Ionicons name="chatbubble-ellipses-outline" size={16} color="#64748B" /><Text style={styles.statNumber}>{item.inquiries}</Text><Text style={styles.statText}>Inquiries</Text></View></View>
                        <View style={styles.actionsContainer}><TouchableOpacity style={styles.editButton} onPress={() => openEditModal(item)}><Ionicons name="create-outline" size={16} color="#3B82F6" /><Text style={styles.editText}>Edit</Text></TouchableOpacity><TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item)}><Ionicons name="trash-outline" size={20} color="#EF4444" /></TouchableOpacity></View>
                    </View>
                </LinearGradient>
            </View>
        </AnimatedListItem>
    );
  };

  const fetchMarketPrices = async () => {
    setSearching(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/market/prices`);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed to fetch market prices.');
      }
      const data = await response.json();
      console.log('Market data from backend:', data); // Debug: log backend data
      setMarketData(data);
    } catch (e) {
      setError(e.message || 'An error occurred.');
      setMarketData([]); // Clear old data on error
    } finally {
      setSearching(false);
      setLoading(false); // Fix: ensure loading is set to false
    }
  };

  const fetchMyListings = async () => {
    setListingsLoading(true);
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEY);
      if (cached) {
        setMyListings(JSON.parse(cached));
      }
    } catch (e) { /* ignore */ }

    try {
      const response = await fetch(`${API_BASE}/farmer/${FARMER_ID}/market`);
      if (response.ok) {
        const data = await response.json();
        console.log('My listings from backend:', data); // Debug: log backend data
        setMyListings(data);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }
    } catch (err) {
      console.error("Failed to load listings:", err);
    } finally {
      setListingsLoading(false);
      setLoading(false); // Fix: ensure loading is set to false
    }
  };

  // Fetch all data on mount
  useEffect(() => {
    const fetchMarketPrices = async () => {
      setSearching(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE}/market/prices`);
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.detail || 'Failed to fetch market prices.');
        }
        const data = await response.json();
        setMarketData(data);
      } catch (e) {
        setError(e.message || 'An error occurred.');
        setMarketData([]);
      } finally {
        setSearching(false);
        setLoading(false);
      }
    };
    fetchMarketPrices();
    fetchMyListings();
  }, []);
  // Filter by commodity if searchCommodity is set
  const filteredMarketData = !searchCommodity.trim() ? marketData : marketData.filter(item => (item.Commodity || item.commodity || '').toLowerCase().includes(searchCommodity.toLowerCase()));

  const toggleMarket = (market) => {
    setExpandedMarkets(prev => ({ ...prev, [market]: !prev[market] }));
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'searchMandi':
        return renderSearchMandi();
      case 'multipleCrops':
        return renderMultipleCrops();
      case 'addProof':
        return renderAddProof();
      case 'priceComparison':
        return renderPriceComparison();
      case 'serviceInfo':
        return renderServiceInfo();
      case 'finalCard':
        return renderFinalCard();
      default:
        return renderSearchMandi();
    }
  };

  // When opening the AI suggestion modal, set preselectedMandi to selectedMandi if available
  const openAIStrategicPlans = () => {
    setPreselectedMandi(selectedMandi || null);
    setShowStrategicPlans(true);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>🤖 Smart Marketplace</Text>
          <Text style={styles.headerSubtitle}>AI-powered crop selling made easy</Text>
        </View>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {renderCurrentStep()}
      </ScrollView>
      
      {/* Strategic Plans Modal */}
      <Modal
        visible={showStrategicPlans}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowStrategicPlans(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.strategicPlansModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>AI Strategic Plans</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowStrategicPlans(false)}
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            {/* Mandi Picker */}
            <View style={{ margin: 16 }}>
              <Text style={{ color: '#fff', marginBottom: 8 }}>Select Mandi (optional):</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {(getMandisByDistance(200) || []).map((mandi) => (
                  <TouchableOpacity
                    key={mandi.id}
                    style={{
                      backgroundColor: preselectedMandi && preselectedMandi.id === mandi.id ? '#10B981' : '#222',
                      borderRadius: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      marginRight: 8,
                      borderWidth: 1,
                      borderColor: '#fff',
                    }}
                    onPress={() => setPreselectedMandi(mandi)}
                  >
                    <Text style={{ color: '#fff' }}>{mandi.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <Text style={styles.modalSubtitle}>Optimized farming strategies based on current market trends</Text>
            <ScrollView style={styles.plansScrollView} showsVerticalScrollIndicator={false}>
              {(AI_STRATEGIC_PLANS || []).map((plan, index) => {
                // If a mandi is preselected, filter crops to only those available in that mandi
                let filteredCrops = plan.crops;
                if (preselectedMandi && preselectedMandi.crops) {
                  filteredCrops = (plan.crops || []).filter(crop => preselectedMandi.crops[crop.name]);
                }
                // If no crops remain after filtering, skip this plan
                if (!filteredCrops || filteredCrops.length === 0) return null;
                return (
                  <TouchableOpacity
                    key={plan.id}
                    style={styles.strategicPlanCard}
                    onPress={() => {
                      setSelectedPlan(plan);
                      setShowStrategicPlans(false);
                      setSelectedMandi(preselectedMandi || getMandiById(filteredCrops[0]?.mandi) || null);
                      setSelectedCrops(filteredCrops.map(crop => crop.name));
                      setCurrentStep('multipleCrops');
                    }}
                    activeOpacity={0.8}
                  >
                    <LinearGradient 
                      colors={plan.gradient} 
                      style={styles.planCardGradient}
                    >
                      <View style={styles.planHeader}>
                        <Text style={styles.planName}>{plan.name}</Text>
                        <View style={styles.roiBadge}>
                          <Text style={styles.roiText}>{plan.expectedROI}</Text>
                        </View>
                      </View>
                      <Text style={styles.planDescription}>{plan.description}</Text>
                      <View style={styles.planDetails}>
                        <Text style={styles.planDetailText}>Investment: {plan.investment}</Text>
                        <Text style={styles.planDetailText}>Duration: {plan.duration}</Text>
                        <Text style={styles.planDetailText}>Risk: {plan.riskLevel}</Text>
                      </View>
                      <View style={styles.planCrops}>
                        {filteredCrops.slice(0, 3).map((crop, idx) => (
                          <View key={idx} style={styles.planCropItem}>
                            <Text style={styles.planCropName}>{crop.name}</Text>
                          </View>
                        ))}
                        {filteredCrops.length > 3 && (
                          <Text style={styles.planMoreCrops}>+{filteredCrops.length - 3} more</Text>
                        )}
                      </View>
                      <View style={styles.planAIInsights}>
                        <Text style={styles.planInsightsTitle}>📊 AI Analysis</Text>
                        <Text style={styles.planInsightsText}>{plan.aiInsights}</Text>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
      
      {/* Custom Price Modal */}
      <Modal
        visible={showCustomPriceModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCustomPriceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.customPriceModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>💰 Set Custom Price</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowCustomPriceModal(false)}
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalSubtitle}>
              Enter your price for {currentCropForPricing} (per quintal):
            </Text>
            
            <View style={styles.customPriceInputContainer}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.customPriceInput}
                value={customPriceInput}
                onChangeText={setCustomPriceInput}
                placeholder="Enter price"
                placeholderTextColor="#64748B"
                keyboardType="numeric"
                autoFocus={true}
              />
            </View>
            
            <View style={styles.customPriceButtons}>
              <TouchableOpacity 
                style={styles.customPriceCancelButton}
                onPress={() => setShowCustomPriceModal(false)}
              >
                <Text style={styles.customPriceCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.customPriceConfirmButton}
                onPress={() => {
                  const price = parseFloat(customPriceInput);
                  if (price && price > 0) {
                    handlePriceDecision(currentCropForPricing, 'custom', price);
                    setShowCustomPriceModal(false);
                    setCurrentCropForPricing(null);
                    setCustomPriceInput('');
                  } else {
                    Alert.alert('Invalid Price', 'Please enter a valid price greater than 0');
                  }
                }}
              >
                <Text style={styles.customPriceConfirmText}>Set Price</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Mic Overlay - UI only for now */}
      <MicOverlay 
        onPress={() => {
          // For now, just navigate to LiveVoiceScreen
          navigation.navigate('LiveVoiceScreen');
        }}
        isVisible={true}
        isActive={false}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16, backgroundColor: '#000' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#18181b', alignItems: 'center', justifyContent: 'center' },
  headerContent: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 14, color: '#64748B', marginTop: 2 },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#10B98120', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981', marginRight: 6 },
  liveText: { fontSize: 12, fontWeight: 'bold', color: '#10B981' },
  scrollView: { flex: 1, paddingHorizontal: 20 },
  section: { marginBottom: 24, paddingTop: 20 },
  sectionTitle: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#64748B', marginBottom: 24 },

  // Strategic Plans Button Styles
  strategicPlansButton: { borderRadius: 12, marginBottom: 20, overflow: 'hidden' },
  strategicPlansGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 20, gap: 8 },
  strategicPlansButtonText: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },

  // Strategic Plans Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.8)', justifyContent: 'center', alignItems: 'center' },
  strategicPlansModal: { backgroundColor: '#1C1C1E', borderRadius: 20, margin: 20, maxHeight: '80%', width: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#3A3A3C' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' },
  modalSubtitle: { fontSize: 14, color: '#64748B', paddingHorizontal: 20, paddingBottom: 16 },
  modalCloseButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#3A3A3C', alignItems: 'center', justifyContent: 'center' },
  plansScrollView: { maxHeight: 400, paddingHorizontal: 20, paddingBottom: 20 },
  strategicPlanCard: { borderRadius: 16, marginBottom: 16, overflow: 'hidden' },
  planCardGradient: { padding: 20 },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  planName: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF', flex: 1 },
  planDescription: { fontSize: 14, color: '#FFFFFF', opacity: 0.9, marginBottom: 16 },
  planDetails: { marginBottom: 16 },
  planDetailText: { fontSize: 12, color: '#64748B', marginBottom: 4 },
  planCrops: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  planCropItem: { backgroundColor: '#3A3A3C', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  planCropName: { fontSize: 12, color: '#FFFFFF' },
  planMoreCrops: { fontSize: 12, color: '#64748B', fontStyle: 'italic' },
  planAIInsights: { borderTopWidth: 1, borderTopColor: '#3A3A3C', paddingTop: 12 },
  planInsightsTitle: { fontSize: 14, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 8 },
  planInsightsText: { fontSize: 12, color: '#64748B' },

  // Custom Price Modal Styles
  customPriceModal: { backgroundColor: '#1C1C1E', borderRadius: 20, margin: 20, padding: 20, width: '90%' },
  customPriceInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2C2C2E', borderRadius: 12, marginVertical: 16, paddingHorizontal: 16 },
  currencySymbol: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF', marginRight: 8 },
  customPriceInput: { flex: 1, fontSize: 18, color: '#FFFFFF', paddingVertical: 16 },
  customPriceButtons: { flexDirection: 'row', gap: 12, marginTop: 16 },
  customPriceCancelButton: { flex: 1, backgroundColor: '#3A3A3C', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  customPriceCancelText: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
  customPriceConfirmButton: { flex: 1, backgroundColor: '#10B981', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  customPriceConfirmText: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },

  // AI Insights Styles
  aiInsightsCard: { borderRadius: 16, marginBottom: 24, overflow: 'hidden' },
  aiCardGradient: { padding: 20 },
  aiTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 12 },
  aiInsightText: { fontSize: 16, color: '#FFFFFF', opacity: 0.9, marginBottom: 16 },
  aiInsightsList: { gap: 8 },
  aiInsightItem: { fontSize: 14, color: '#FFFFFF', opacity: 0.8 },

  // Combo Plan Styles
  comboTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 8, marginTop: 24 },
  comboSubtitle: { fontSize: 16, color: '#64748B', marginBottom: 20 },
  comboCard: { borderRadius: 16, marginBottom: 16, overflow: 'hidden' },
  comboCardGradient: { padding: 20 },
  comboHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  comboName: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF', flex: 1 },
  roiBadge: { backgroundColor: '#10B981', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  roiText: { fontSize: 12, fontWeight: 'bold', color: '#FFFFFF' },
  comboDescription: { fontSize: 14, color: '#64748B', marginBottom: 16 },
  comboDetails: { gap: 8, marginBottom: 16 },
  comboDetailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  comboDetailLabel: { fontSize: 14, color: '#64748B' },
  comboDetailValue: { fontSize: 14, color: '#FFFFFF', fontWeight: '500' },
  comboCrops: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  comboCropItem: { backgroundColor: '#3A3A3C', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  comboCropName: { fontSize: 12, color: '#FFFFFF' },
  comboCropProfit: { fontSize: 12, color: '#10B981', fontWeight: 'bold' },
  comboAIInsights: { borderTopWidth: 1, borderTopColor: '#3A3A3C', paddingTop: 12 },
  aiInsightsTitle: { fontSize: 14, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 8 },
  manualModeButton: { backgroundColor: '#3B82F6', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 20 },
  manualModeText: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },

  // Search Styles
  searchContainer: { position: 'relative', marginBottom: 20 },
  searchInput: { backgroundColor: '#1C1C1E', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: '#FFFFFF', borderWidth: 1, borderColor: '#3A3A3C', paddingRight: 50 },
  searchIcon: { position: 'absolute', right: 16, top: 18 },
  resultsTitle: { fontSize: 16, color: '#FFFFFF', marginBottom: 16, fontWeight: '500' },

  // Mandi Selection Styles
  mandiCard: { borderRadius: 16, marginBottom: 16, overflow: 'hidden' },
  mandiCardGradient: { padding: 20 },
  mandiHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  mandiInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  mandiEmoji: { fontSize: 32, marginRight: 16 },
  mandiTextInfo: { flex: 1 },
  mandiName: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 4 },
  mandiLocation: { fontSize: 14, color: '#64748B', marginBottom: 2 },
  mandiDistance: { fontSize: 12, color: '#3B82F6', fontWeight: '500' },
  mandiTurnover: { fontSize: 12, color: '#10B981', fontWeight: '500' },
  mandiDetails: { borderTopWidth: 1, borderTopColor: '#3A3A3C', paddingTop: 16 },
  mandiDetailItem: { marginBottom: 8 },
  detailLabel: { fontSize: 12, color: '#64748B', marginBottom: 2 },
  detailValue: { fontSize: 14, color: '#FFFFFF' },

  // Multiple Crops Styles
  selectedCropsContainer: { marginBottom: 20 },
  selectedCropsLabel: { fontSize: 16, color: '#FFFFFF', marginBottom: 8, fontWeight: '500' },
  selectedCropsChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  selectedCropChip: { backgroundColor: '#10B981', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6 },
  selectedCropChipText: { fontSize: 14, color: '#FFFFFF', fontWeight: '500' },
  availableCropsTitle: { fontSize: 16, color: '#FFFFFF', marginBottom: 12, marginTop: 8 },
  cropButtonsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 },
  cropButton: { backgroundColor: '#1C1C1E', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: '#3A3A3C', flexDirection: 'row', alignItems: 'center', gap: 6 },
  selectedCropButton: { backgroundColor: '#10B981', borderColor: '#10B981' },
  cropButtonText: { fontSize: 14, color: '#64748B' },
  selectedCropButtonText: { color: '#FFFFFF', fontWeight: '500' },
  checkmark: { marginLeft: 4 },
  continueButton: { backgroundColor: '#10B981', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 10 },
  disabledButton: { backgroundColor: '#3A3A3C' },
  continueButtonText: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },

  // Proof Styles
  proofCard: { borderRadius: 16, marginBottom: 16, overflow: 'hidden' },
  proofCardGradient: { padding: 20 },
  proofHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  proofCropName: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
  proofButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2C2C2E', borderRadius: 12, padding: 16, gap: 12 },
  proofButtonText: { fontSize: 16, color: '#FFFFFF' },
  proofFileName: { fontSize: 12, color: '#64748B', marginTop: 8 },
  proofImageContainer: { position: 'relative', marginBottom: 12 },
  proofImage: { width: '100%', height: 200, borderRadius: 12, backgroundColor: '#2C2C2E' },
  proofImageOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  proofImageButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
  proofImageButtonText: { fontSize: 14, color: '#FFFFFF', fontWeight: '500' },

  // Price Comparison Enhanced Styles
  priceComparisonCard: { borderRadius: 16, marginBottom: 20, overflow: 'hidden' },
  priceCardGradient: { padding: 20 },
  cropPriceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cropPriceTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
  decisionBadge: { backgroundColor: '#10B981', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  decisionBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#FFFFFF' },
  priceInfo: { alignItems: 'center', marginBottom: 20 },
  marketPriceLabel: { fontSize: 16, color: '#64748B', marginBottom: 8 },
  marketPrice: { fontSize: 32, fontWeight: 'bold', color: '#10B981', marginBottom: 16 },
  priceRange: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
  priceRangeItem: { alignItems: 'center' },
  priceRangeLabel: { fontSize: 14, color: '#64748B', marginBottom: 4 },
  priceRangeValue: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
  priceDecisionMade: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#2C2C2E', borderRadius: 12, padding: 16 },
  decisionText: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
  changeDecisionButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  changeDecisionText: { fontSize: 14, color: '#3B82F6' },
  priceDecisionContainer: { gap: 12 },
  priceDecisionButton: { backgroundColor: '#2C2C2E', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#3A3A3C' },
  priceDecisionText: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 4 },
  priceDecisionSubtext: { fontSize: 14, color: '#64748B' },

  // Service Info Styles
  serviceCard: { borderRadius: 16, marginBottom: 20, overflow: 'hidden' },
  serviceCardGradient: { padding: 20 },
  serviceTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 16, textAlign: 'center' },
  serviceOption: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#2C2C2E', borderRadius: 12, padding: 16, marginBottom: 12 },
  serviceOptionText: { marginLeft: 12, flex: 1 },
  serviceOptionTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 4 },
  serviceOptionDesc: { fontSize: 14, color: '#64748B' },

  // Final Card Enhanced Styles
  comboSelectedCard: { borderRadius: 16, marginBottom: 16, overflow: 'hidden' },
  comboSelectedGradient: { padding: 16 },
  comboSelectedTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 4 },
  comboSelectedROI: { fontSize: 14, color: '#FFFFFF', opacity: 0.9 },
  finalSummaryCard: { borderRadius: 16, marginBottom: 20, overflow: 'hidden' },
  finalCardGradient: { padding: 20 },
  finalCardHeader: { alignItems: 'center', marginBottom: 20 },
  finalCardTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 4 },
  finalCardMandi: { fontSize: 16, color: '#FFFFFF', opacity: 0.9 },
  finalCropsList: { gap: 12, marginBottom: 20 },
  finalCropItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 12 },
  finalCropName: { fontSize: 16, color: '#FFFFFF', fontWeight: '500' },
  finalCropPrice: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
  finalTotalEstimate: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 2, borderTopColor: 'rgba(255,255,255,0.2)', paddingTop: 16 },
  finalTotalLabel: { fontSize: 16, color: '#FFFFFF', opacity: 0.9 },
  finalTotalValue: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' },

  // Contact Card Styles
  contactCard: { borderRadius: 16, marginBottom: 20, overflow: 'hidden' },
  contactCardGradient: { padding: 20 },
  contactTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 16, textAlign: 'center' },
  contactDetails: { gap: 12 },
  contactRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  contactLabel: { fontSize: 14, color: '#64748B', marginLeft: 12, minWidth: 100 },
  contactValue: { fontSize: 14, color: '#FFFFFF', marginLeft: 8, flex: 1 },
  phoneNumber: { color: '#10B981', textDecorationLine: 'underline' },
  websiteLink: { color: '#3B82F6', textDecorationLine: 'underline' },

  // New Sale Button
  newSaleButton: { backgroundColor: '#3B82F6', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 10 },
  newSaleButtonText: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
});

export default MarketplaceScreen;