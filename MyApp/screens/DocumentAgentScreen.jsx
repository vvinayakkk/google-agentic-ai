import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  ActivityIndicator, 
  ScrollView, 
  Alert, 
  Modal,
  Animated,
  FlatList,
  Linking,
  SafeAreaView,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { NetworkConfig } from '../utils/NetworkConfig';
import MicOverlay from '../components/MicOverlay';
import schemesData from '../data/schemes.json';
import { useTheme } from '../context/ThemeContext';
import { StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const API_BASE = NetworkConfig.API_BASE;

// Enhanced schemes data with more schemes
const ENHANCED_SCHEMES = [
  {
    id: 1,
    scheme_name: 'PM-KISAN',
    content: 'Direct income support of ₹6000 per year to farmers in three equal installments',
    scheme_type: 'central_government',
    metadata: {
      key_benefit: '₹6000/year',
      helpline_number: '155261',
      official_website: 'https://pmkisan.gov.in',
      ministry: 'Ministry of Agriculture & Farmers Welfare',
      launch_date: '2019',
      beneficiaries: '11+ crore farmers'
    },
    isTopSuggestion: true,
    suggestionReason: 'Most widely adopted scheme with direct benefit transfer, perfect for immediate financial support',
    whyEffective: [
      'Direct cash transfer to bank accounts - no middlemen',
      'Covers 11+ crore farmers across India',
      'Quick verification through Aadhaar linking',
      'Seasonal support during sowing periods'
    ],
    description: 'PM-KISAN provides direct income support to landholding farmer families across the country to supplement their financial needs for procuring various inputs related to agriculture and allied activities as well as domestic needs.',
    eligibility: [
      'Small and marginal farmers with cultivable land',
      'Valid Aadhaar card mandatory',
      'Bank account linked with Aadhaar',
      'Land ownership documents required'
    ],
    requiredDocuments: [
      'Aadhaar Card',
      'Bank Account Details', 
      'Land Records (Khata/Khatauni)',
      'Mobile Number'
    ]
  },
  {
    id: 2,
    scheme_name: 'PM Fasal Bima Yojana',
    content: 'Crop insurance with 2% premium for Kharif and 1.5% for Rabi crops',
    scheme_type: 'central_government',
    metadata: {
      key_benefit: 'Crop Insurance',
      helpline_number: '14447',
      official_website: 'https://pmfby.gov.in',
      ministry: 'Ministry of Agriculture & Farmers Welfare',
      launch_date: '2016',
      beneficiaries: '3+ crore farmers'
    },
    isTopSuggestion: false,
    suggestionReason: 'Essential protection against crop losses due to natural calamities',
    whyEffective: [
      'Low premium rates (2% Kharif, 1.5% Rabi)',
      'Comprehensive coverage for natural disasters',
      'Quick claim settlement process',
      'Covers yield and post-harvest losses'
    ],
    description: 'PMFBY provides comprehensive crop insurance coverage against natural calamities, pests, and diseases. It ensures financial stability for farmers during crop failures.',
    eligibility: [
      'All farmers growing notified crops',
      'Mandatory for loanee farmers',
      'Optional for non-loanee farmers',
      'Must apply within specified timeframe'
    ],
    requiredDocuments: [
      'Land Records',
      'Crop Declaration',
      'Bank Account Details',
      'Aadhaar Card'
    ]
  },
  {
    id: 3,
    scheme_name: 'Soil Health Card',
    content: 'Free soil testing and personalized recommendations for better crop yield',
    scheme_type: 'central_government',
    metadata: {
      key_benefit: 'Free Soil Testing',
      helpline_number: '011-23382305',
      official_website: 'https://soilhealth.dac.gov.in',
      ministry: 'Ministry of Agriculture & Farmers Welfare',
      launch_date: '2015',
      beneficiaries: 'All farmers'
    },
    isTopSuggestion: false,
    suggestionReason: 'Scientific approach to soil management for optimal crop production',
    whyEffective: [
      'Free soil testing every 3 years',
      'Personalized fertilizer recommendations',
      'Improves soil fertility and crop yield',
      'Reduces input costs'
    ],
    description: 'Soil Health Card scheme provides farmers with detailed information about soil nutrient status and recommendations for improving soil health and crop productivity.',
    eligibility: [
      'All farmers across India',
      'Land-owning and tenant farmers',
      'No income or land size restrictions'
    ],
    requiredDocuments: [
      'Aadhaar Card',
      'Land Records',
      'Recent Photograph'
    ]
  },
  {
    id: 4,
    scheme_name: 'PM Krishi Sinchayee Yojana',
    content: 'Subsidy for micro-irrigation systems and water conservation',
    scheme_type: 'central_government',
    metadata: {
      key_benefit: '60% Subsidy',
      helpline_number: '011-23382351',
      official_website: 'https://pmksy.gov.in',
      ministry: 'Ministry of Agriculture & Farmers Welfare',
      launch_date: '2015',
      beneficiaries: 'Lakhs of farmers'
    },
    isTopSuggestion: false,
    suggestionReason: 'Water conservation and efficient irrigation for sustainable farming',
    whyEffective: [
      '60% subsidy on micro-irrigation systems',
      'Reduces water consumption by 40-60%',
      'Increases crop yield by 20-30%',
      'Suitable for all crop types'
    ],
    description: 'PMKSY promotes efficient water use through micro-irrigation systems like drip and sprinkler irrigation, helping farmers conserve water and improve productivity.',
    eligibility: [
      'All farmers with irrigation facilities',
      'Land ownership or lease rights',
      'Assured source of irrigation'
    ],
    requiredDocuments: [
      'Land Records',
      'Irrigation Source Proof',
      'Bank Account Details',
      'Aadhaar Card'
    ]
  },
  {
    id: 5,
    scheme_name: 'MahaDBT Farmer Portal',
    content: 'Centralized online application platform for Maharashtra state schemes',
    scheme_type: 'state_government',
    metadata: {
      key_benefit: 'Single Window',
      helpline_number: '022-49150800',
      official_website: 'https://mahadbt.maharashtra.gov.in',
      ministry: 'Maharashtra Agriculture Department',
      launch_date: '2017',
      beneficiaries: 'Maharashtra farmers'
    },
    isTopSuggestion: false,
    suggestionReason: 'State-specific schemes with easy online application process',
    whyEffective: [
      'Single window for multiple schemes',
      'Direct Benefit Transfer (DBT)',
      'Real-time application tracking',
      'Aadhaar-based authentication'
    ],
    description: 'MahaDBT portal provides a centralized platform for Maharashtra farmers to apply for various state government schemes with streamlined processes and direct benefit transfers.',
    eligibility: [
      'Maharashtra residents',
      'Valid Aadhaar card',
      'Bank account linked with Aadhaar'
    ],
    requiredDocuments: [
      'Aadhaar Card',
      'Bank Account Details',
      'Land Records (7/12, 8-A)',
      'Recent Photograph'
    ]
  }
];

export default function DocumentAgentScreen({ navigation }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(theme);
  // Loading states
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingStage, setLoadingStage] = useState('analyzing');
  const [loadingText, setLoadingText] = useState('Analyzing your farming activity...');
  const [showSchemes, setShowSchemes] = useState(false);
  
  // Selected scheme and modal states
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [showSchemeModal, setShowSchemeModal] = useState(false);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [showAllSchemes, setShowAllSchemes] = useState(false);
  
  // Application form states
  const [formData, setFormData] = useState({
    farmer_name: '',
    father_name: '',
    mobile_number: '',
    aadhaar_number: '',
    bank_account: '',
    ifsc_code: '',
    village: '',
    district: '',
    state: 'Maharashtra',
    pin_code: '',
    land_area: '',
    crop_type: ''
  });
  const [autoFillLoading, setAutoFillLoading] = useState(false);
  const [autoFillStage, setAutoFillStage] = useState(0);
  const [isFormAutoFilled, setIsFormAutoFilled] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [documentGenerated, setDocumentGenerated] = useState(false);

  // Farmer profile data
  const [farmerProfile, setFarmerProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Loading simulation on component mount
  useEffect(() => {
    simulateInitialLoading();
    fetchFarmerProfile();
  }, []);

  // Fetch farmer profile for auto-filling
  const fetchFarmerProfile = async () => {
    setProfileLoading(true);
    setProfileError(null);
    try {
      // Using the correct farmer ID from the database
      const farmerId = 'f001';
      const response = await NetworkConfig.safeFetch(`/farmer/${farmerId}/profile`);
      const profile = await response.json();
      setFarmerProfile(profile);
      console.log('Successfully fetched farmer profile:', profile);
    } catch (error) {
      console.log('Could not fetch farmer profile, using default data:', error.message);
      setProfileError(error.message);
      // Use default profile data if API fails
      setFarmerProfile({
        name: 'Vinayak Bhatia',
        phoneNumber: '+91 98765 43210',
        village: 'Shirur, Maharashtra',
        farmSize: '5 acres'
      });
    } finally {
      setProfileLoading(false);
    }
  };

  const simulateInitialLoading = async () => {
    const loadingStages = [
      { stage: 'analyzing', text: 'Analyzing your farming activity...', duration: 2000 },
      { stage: 'matching', text: 'Finding best schemes for you...', duration: 1500 },
      { stage: 'validating', text: 'Validating eligibility criteria...', duration: 1500 },
      { stage: 'complete', text: 'Ready! Found perfect scheme match', duration: 800 }
    ];

    for (let i = 0; i < loadingStages.length; i++) {
      const { stage, text, duration } = loadingStages[i];
      setLoadingStage(stage);
      setLoadingText(text);
      await new Promise(resolve => setTimeout(resolve, duration));
    }

  setInitialLoading(false);
  setShowSchemes(true);
    
  // Animate scheme appearance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // temporary: use inline theme styles where needed to avoid creating extra stylesheet here

  // Auto-fill form with farmer profile data and show input fields
  const handleApplyWithAI = () => {
    setShowSchemeModal(false);
    setShowApplicationForm(true);
    setAutoFillLoading(true);
    setAutoFillStage(0);
    
    simulateAutoFill();
  };

  // Generate and send PDF document after user input
  const generateAndSendDocument = async () => {
    setShowConfirmation(true);
    
    console.log('🚀 Starting document generation...');
    console.log('API Base:', NetworkConfig.API_BASE);
    console.log('Selected Scheme:', selectedScheme);
    console.log('Farmer Profile:', farmerProfile);
    console.log('Form Data:', formData);
    
    try {
      const response = await NetworkConfig.safeFetch(`/document/generate-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          farmer_id: 'f001',
          scheme_name: selectedScheme?.scheme_name || 'PM-KISAN',
          phone_number: '+917020744317',
          farmer_data: {
            ...farmerProfile,
            ...formData, // Include user input data
            name: farmerProfile?.name || formData.farmer_name || 'Vinayak Bhatia',
            phoneNumber: farmerProfile?.phoneNumber || formData.mobile_number || '+91 98765 43210',
            village: farmerProfile?.village || formData.village || 'Shirur, Maharashtra',
            farmSize: farmerProfile?.farmSize || formData.land_area || '5 acres'
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Document generation successful:', result);
        setShowConfirmation(false);
        Alert.alert(
          t('document.success_title', 'Success!'), 
          t('document.success_message', 'Your application document has been generated and sent to WhatsApp!'),
          [{ text: t('common.great', 'Great!'), onPress: () => setShowApplicationForm(false) }]
        );
      } else {
        const errorText = await response.text();
        console.error('❌ HTTP Error:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
    } catch (error) {
      console.error('❌ Error generating document:', error);
      setShowConfirmation(false);
      Alert.alert(
        t('common.error', 'Error'), 
        t('document.generate_failed', `Failed to generate document: ${error.message}`),
        [{ text: t('common.ok', 'OK') }]
      );
    }
  };

  const simulateAutoFill = async () => {
    // Use farmer profile data if available, otherwise use default
    const autoFillData = {
      farmer_name: farmerProfile?.name || 'Vinayak Bhatia',
      father_name: 'Suresh Sharma', 
      mobile_number: farmerProfile?.phoneNumber || '+91 98765 43210',
      aadhaar_number: '1234-5678-9012',
      bank_account: 'SBI12345678901',
      ifsc_code: 'SBIN0001234',
      village: farmerProfile?.village || 'Shirur, Maharashtra',
      district: 'Pune',
      state: 'Maharashtra',
      pin_code: '411046',
      land_area: farmerProfile?.farmSize || '5 acres',
      // Leave these fields empty for user input
      crop_type: '', // User must specify crop type
      sowing_date: '' // User must specify sowing date
    };

    const fields = Object.keys(autoFillData);
    
    for (let i = 0; i < fields.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 200)); // Faster auto-fill
      const field = fields[i];
      setFormData(prev => ({
        ...prev,
        [field]: autoFillData[field]
      }));
      setAutoFillStage(i + 1);
    }

    setAutoFillLoading(false);
    setIsFormAutoFilled(true);
  };

  // Handle form submission
  const handleConfirmApplication = () => {
    // Validate required user input fields
    const missingFields = [];
    
    if (!formData.crop_type?.trim()) {
      missingFields.push('Crop Type');
    }
    
    if (!formData.sowing_date?.trim()) {
      missingFields.push('Sowing Date');
    }
    
    if (missingFields.length > 0) {
      Alert.alert(
        t('document.missing_title', 'Missing Information'), 
        t('document.missing_fields', `Please fill in the following required fields:\n\n${missingFields.join('\n')}`),
        [{ text: t('common.ok', 'OK') }]
      );
      return;
    }
    generateAndSendDocument();

  };

  // Handle phone number click
  const handlePhoneClick = (phoneNumber) => {
    const cleanNumber = phoneNumber.replace(/[^0-9+]/g, '');
    Linking.openURL(`tel:${cleanNumber}`);
  };

  // Handle website link click
  const handleWebsiteClick = (url) => {
    Linking.openURL(url);
  };

  // Render scheme card
  const renderSchemeCard = (scheme, isTop = false) => (
    <View key={scheme.id} style={[styles.schemeCard, isTop && styles.topSchemeCard]}>
      {isTop && (
        <View style={styles.topSuggestionBadge}>
          <MaterialIcons name="star" size={16} color="#6366f1" />
          <Text style={styles.topSuggestionText}>{t('document.top_suggestion', 'TOP SUGGESTION')}</Text>
        </View>
      )}
      
      <View style={styles.schemeHeader}>
        <Text style={styles.schemeName}>{scheme.scheme_name}</Text>
        <View style={styles.schemeTypeTag}>
          <Text style={styles.schemeTypeText}>
            {scheme.scheme_type === 'central_government' ? t('document.scheme_type.central', 'Central') : t('document.scheme_type.state', 'State')}
          </Text>
        </View>
      </View>

      <Text style={styles.keyBenefit}>{scheme.metadata.key_benefit}</Text>
      <Text style={styles.schemeDescription}>{scheme.content}</Text>

      <View style={styles.schemeStats}>
        <View style={styles.statItem}>
          <MaterialIcons name="people" size={16} color="#6366f1" />
          <Text style={styles.statText}>{scheme.metadata.beneficiaries}</Text>
        </View>
        <View style={styles.statItem}>
          <MaterialIcons name="event" size={16} color="#6366f1" />
          <Text style={styles.statText}>{t('document.since', 'Since {{year}}', { year: scheme.metadata.launch_date })}</Text>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.viewDetailsBtn}
          onPress={() => {
            setSelectedScheme(scheme);
            setShowSchemeModal(true);
          }}
        >
          <MaterialIcons name="info" size={16} color="#6366f1" />
          <Text style={styles.viewDetailsText}>{t('document.details', 'Details')}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.applyBtn, isTop && styles.topApplyBtn]}
          onPress={handleApplyWithAI}
        >
          <MaterialIcons name="psychology" size={16} color="#fff" />
          <Text style={styles.applyText}>{t('document.apply_with_ai', 'Apply with AI')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Render loading screen
  if (initialLoading) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.colors.background }]}> 
        <StatusBar barStyle={theme.colors.statusBarStyle} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color={theme.colors.headerTint} />
          </TouchableOpacity>
          <Text style={[styles.headerText, { color: theme.colors.headerTitle }]}>{t('document.header', '🤖 Smart Document Assistant')}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.loadingContainer}>
          <View style={[styles.loadingContent, { backgroundColor: theme.colors.card }] }>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingTitle, { color: theme.colors.text }]}>{t('document.loading_schemes', 'Loading Schemes')}</Text>
            <Text style={[styles.loadingSubtitle, { color: theme.colors.textSecondary }]}>{t('document.based_on_activity', 'Based on your activity')}</Text>
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>{loadingText}</Text>
            
            <View style={styles.loadingSteps}>
              <View style={[styles.loadingStep, loadingStage === 'analyzing' && styles.activeStep]}>
                <MaterialIcons name="analytics" size={20} color={loadingStage === 'analyzing' ? theme.colors.primary : theme.colors.textSecondary} />
                <Text style={[styles.stepText, loadingStage === 'analyzing' && styles.activeStepText, { color: loadingStage === 'analyzing' ? theme.colors.text : theme.colors.textSecondary }]}>{t('document.loading_stage.analyzing', 'Analyzing')}</Text>
              </View>
              <View style={[styles.loadingStep, loadingStage === 'matching' && styles.activeStep]}>
                <MaterialIcons name="search" size={20} color={loadingStage === 'matching' ? theme.colors.primary : theme.colors.textSecondary} />
                <Text style={[styles.stepText, loadingStage === 'matching' && styles.activeStepText, { color: loadingStage === 'matching' ? theme.colors.text : theme.colors.textSecondary }]}>{t('document.loading_stage.matching', 'Matching')}</Text>
              </View>
              <View style={[styles.loadingStep, loadingStage === 'validating' && styles.activeStep]}>
                <MaterialIcons name="verified" size={20} color={loadingStage === 'validating' ? theme.colors.primary : theme.colors.textSecondary} />
                <Text style={[styles.stepText, loadingStage === 'validating' && styles.activeStepText, { color: loadingStage === 'validating' ? theme.colors.text : theme.colors.textSecondary }]}>{t('document.loading_stage.validating', 'Validating')}</Text>
              </View>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Render main scheme display
  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top, backgroundColor: theme.colors.background }]}> 
      <StatusBar barStyle={theme.colors.statusBarStyle} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color={theme.colors.headerTint} />
        </TouchableOpacity>
  <Text style={[styles.headerText, { color: theme.colors.headerTitle }]}>{t('document.header', '🤖 Smart Document Assistant')}</Text>
        <TouchableOpacity onPress={() => {
          setInitialLoading(true);
          setShowSchemes(false);
          simulateInitialLoading();
        }}>
          <Ionicons name="refresh" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContainer}>
        {showSchemes && (
          <Animated.View 
            style={[
              styles.schemeContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            {/* Top Suggestion */}
            {renderSchemeCard(ENHANCED_SCHEMES[0], true)}

            {/* Profile Status Indicator */}
            {profileLoading && (
              <View style={styles.profileStatus}>
                <ActivityIndicator size="small" color="#6366f1" />
                <Text style={styles.profileStatusText}>{t('document.loading_profile', 'Loading your profile...')}</Text>
              </View>
            )}
            
            {profileError && (
              <View style={styles.profileStatus}>
                <MaterialIcons name="info" size={16} color="#6366f1" />
                <Text style={styles.profileStatusText}>{t('document.using_default_profile', 'Using default profile data')}</Text>
                <TouchableOpacity 
                  style={styles.retryButton}
                  onPress={fetchFarmerProfile}
                >
                  <MaterialIcons name="refresh" size={16} color="#6366f1" />
                </TouchableOpacity>
              </View>
            )}

            {/* View All Schemes Button */}
            <TouchableOpacity 
              style={styles.viewAllSchemesBtn}
              onPress={() => setShowAllSchemes(true)}
            >
              <MaterialIcons name="list" size={20} color="#6366f1" />
              <Text style={styles.viewAllSchemesText}>View All Available Schemes</Text>
              <MaterialIcons name="arrow-forward" size={20} color="#6366f1" />
            </TouchableOpacity>
          </Animated.View>
        )}
      </ScrollView>

      {/* All Schemes Modal */}
      <Modal
        visible={showAllSchemes}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAllSchemes(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]}>
          <View style={[styles.allSchemesModalContent, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>All Available Schemes</Text>
              <TouchableOpacity onPress={() => setShowAllSchemes(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={ENHANCED_SCHEMES}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item, index }) => renderSchemeCard(item, index === 0)}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.schemesList}
            />
          </View>
        </View>
      </Modal>

      {/* Scheme Details Modal */}
      <Modal
        visible={showSchemeModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSchemeModal(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <TouchableOpacity 
                style={styles.applyWithAIBtn}
                onPress={handleApplyWithAI}
              >
                <MaterialIcons name="psychology" size={20} color="#fff" />
                <Text style={[styles.applyWithAIText, { color: theme.colors.headerTitle }]}>Apply with AI</Text>
              </TouchableOpacity>
              
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>{selectedScheme?.scheme_name}</Text>
              
              <TouchableOpacity onPress={() => setShowSchemeModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <Text style={[styles.modalDescription, { color: theme.colors.textSecondary }]}>{selectedScheme?.description}</Text>
              
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Eligibility Criteria</Text>
                {selectedScheme?.eligibility.map((criteria, index) => (
                  <Text key={index} style={styles.detailItem}>• {criteria}</Text>
                ))}
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Required Documents</Text>
                {selectedScheme?.requiredDocuments.map((doc, index) => (
                  <Text key={index} style={styles.detailItem}>• {doc}</Text>
                ))}
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Contact Information</Text>
                <Text style={styles.contactInfo}>Ministry: {selectedScheme?.metadata.ministry}</Text>
                <TouchableOpacity onPress={() => handlePhoneClick(selectedScheme?.metadata.helpline_number)}>
                  <Text style={styles.clickableContactInfo}>
                    Helpline: {selectedScheme?.metadata.helpline_number}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleWebsiteClick(selectedScheme?.metadata.official_website)}>
                  <Text style={styles.clickableContactInfo}>
                    Website: {selectedScheme?.metadata.official_website}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Application Form Modal */}
      <Modal
        visible={showApplicationForm}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowApplicationForm(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: theme.colors.overlay }]}>
          <View style={[styles.formModalContent, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>PM-KISAN Application</Text>
              <TouchableOpacity onPress={() => setShowApplicationForm(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {autoFillLoading && (
              <View style={styles.autoFillLoading}>
                <ActivityIndicator size="small" color="#10b981" />
                <Text style={styles.autoFillText}>
                  Autofilling with AI... ({autoFillStage}/13 fields completed)
                </Text>
              </View>
            )}

            {isFormAutoFilled && (
              <View style={styles.userInputSection}>
                <Text style={styles.userInputSectionTitle}>
                  📝 Please provide the following information:
                </Text>
                <Text style={styles.userInputSectionSubtitle}>
                  These fields are required to complete your application
                </Text>
              </View>
            )}

            <ScrollView style={styles.formBody}>
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>Personal Information</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Farmer Name *</Text>
                  <TextInput
                    style={[styles.input, formData.farmer_name && styles.filledInput]}
                    value={formData.farmer_name}
                    onChangeText={(text) => setFormData(prev => ({...prev, farmer_name: text}))}
                    placeholder="Enter farmer name"
                    placeholderTextColor="#666"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Father's Name *</Text>
                  <TextInput
                    style={[styles.input, formData.father_name && styles.filledInput]}
                    value={formData.father_name}
                    onChangeText={(text) => setFormData(prev => ({...prev, father_name: text}))}
                    placeholder="Enter father's name"
                    placeholderTextColor="#666"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Mobile Number *</Text>
                  <TextInput
                    style={[styles.input, formData.mobile_number && styles.filledInput]}
                    value={formData.mobile_number}
                    onChangeText={(text) => setFormData(prev => ({...prev, mobile_number: text}))}
                    placeholder="Enter mobile number"
                    placeholderTextColor="#666"
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Aadhaar Number *</Text>
                  <TextInput
                    style={[styles.input, formData.aadhaar_number && styles.filledInput]}
                    value={formData.aadhaar_number}
                    onChangeText={(text) => setFormData(prev => ({...prev, aadhaar_number: text}))}
                    placeholder="Enter Aadhaar number"
                    placeholderTextColor="#666"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>Bank Details</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Bank Account Number *</Text>
                  <TextInput
                    style={[styles.input, formData.bank_account && styles.filledInput]}
                    value={formData.bank_account}
                    onChangeText={(text) => setFormData(prev => ({...prev, bank_account: text}))}
                    placeholder="Enter bank account number"
                    placeholderTextColor="#666"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>IFSC Code *</Text>
                  <TextInput
                    style={[styles.input, formData.ifsc_code && styles.filledInput]}
                    value={formData.ifsc_code}
                    onChangeText={(text) => setFormData(prev => ({...prev, ifsc_code: text}))}
                    placeholder="Enter IFSC code"
                    placeholderTextColor="#666"
                  />
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>Address Details</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Village *</Text>
                  <TextInput
                    style={[styles.input, formData.village && styles.filledInput]}
                    value={formData.village}
                    onChangeText={(text) => setFormData(prev => ({...prev, village: text}))}
                    placeholder="Enter village name"
                    placeholderTextColor="#666"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>District *</Text>
                  <TextInput
                    style={[styles.input, formData.district && styles.filledInput]}
                    value={formData.district}
                    onChangeText={(text) => setFormData(prev => ({...prev, district: text}))}
                    placeholder="Enter district"
                    placeholderTextColor="#666"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>State *</Text>
                  <TextInput
                    style={[styles.input, formData.state && styles.filledInput]}
                    value={formData.state}
                    onChangeText={(text) => setFormData(prev => ({...prev, state: text}))}
                    placeholder="Enter state"
                    placeholderTextColor="#666"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>PIN Code *</Text>
                  <TextInput
                    style={[styles.input, formData.pin_code && styles.filledInput]}
                    value={formData.pin_code}
                    onChangeText={(text) => setFormData(prev => ({...prev, pin_code: text}))}
                    placeholder="Enter PIN code"
                    placeholderTextColor="#666"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>Farm Details</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Land Area *</Text>
                  <TextInput
                    style={[styles.input, formData.land_area && styles.filledInput]}
                    value={formData.land_area}
                    onChangeText={(text) => setFormData(prev => ({...prev, land_area: text}))}
                    placeholder="Enter land area (in acres)"
                    placeholderTextColor="#666"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, styles.userInputLabel]}>🌾 Crop Type * (Required)</Text>
                  <TextInput
                    style={[styles.input, styles.userInput, formData.crop_type && styles.filledInput]}
                    value={formData.crop_type}
                    onChangeText={(text) => setFormData(prev => ({...prev, crop_type: text}))}
                    placeholder="Enter main crop type (e.g., Rice, Wheat, Cotton)"
                    placeholderTextColor="#666"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, styles.userInputLabel]}>📅 Sowing Date * (Required)</Text>
                  <TextInput
                    style={[styles.input, styles.userInput, formData.sowing_date && styles.filledInput]}
                    value={formData.sowing_date}
                    onChangeText={(text) => setFormData(prev => ({...prev, sowing_date: text}))}
                    placeholder="Enter sowing date (DD/MM/YYYY)"
                    placeholderTextColor="#666"
                  />
                </View>
              </View>

              {isFormAutoFilled && (
                <View style={styles.confirmSection}>
                  <TouchableOpacity 
                    style={styles.confirmBtn}
                    onPress={handleConfirmApplication}
                  >
                    <MaterialIcons name="check-circle" size={20} color="#fff" />
                    <Text style={styles.confirmBtnText}>Confirm & Generate Document</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmation}
        transparent={true}
        animationType="fade"
      >
        <View style={[styles.confirmationOverlay, { backgroundColor: theme.colors.overlay }]}>
                  <View style={[styles.confirmationContent, { backgroundColor: theme.colors.background, borderColor: theme.colors.primary }]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.confirmationTitle, { color: theme.colors.primary }]}>Generating Document...</Text>
          <Text style={[styles.confirmationText, { color: theme.colors.textSecondary }]}>
            Creating your PM-KISAN application and sending to WhatsApp
          </Text>
        </View>
        </View>
      </Modal>

      {/* Mic Overlay */}
      <MicOverlay 
        onPress={() => navigation.navigate('LiveVoiceScreen')}
        isVisible={true}
        isActive={false}
      />
    </SafeAreaView>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    justifyContent: 'space-between',
    shadowColor: theme.colors.shadow || '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  headerText: {
    color: theme.colors.headerTitle || theme.colors.text,
    fontWeight: '600',
    fontSize: 18,
  },
  backButton: {
    padding: 4,
  },
  headerSpacer: {
    width: 28,
  },
  scrollContainer: {
    flex: 1,
  },
  
  // Loading Screen
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingContent: {
    alignItems: 'center',
    maxWidth: 300,
  },
  loadingTitle: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 8,
  },
  loadingSubtitle: {
    color: theme.colors.primary,
    fontSize: 16,
    marginBottom: 20,
  },
  loadingText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
  },
  loadingSteps: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  loadingStep: {
    alignItems: 'center',
    opacity: 0.5,
  },
  activeStep: {
    opacity: 1,
  },
  stepText: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 4,
  },
  activeStepText: {
    color: '#10b981',
    fontWeight: '600',
  },

  // Main Scheme Display
  schemeContainer: {
    margin: 16,
  },
  topSuggestionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  topSuggestionText: {
    color: theme.colors.onPrimary || '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  schemeCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 16,
    shadowColor: theme.colors.shadow || '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  topSchemeCard: {
    borderWidth: 2,
    borderColor: '#10b981',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  schemeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  schemeName: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
  },
  schemeTypeTag: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  schemeTypeText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '600',
  },
  keyBenefit: {
    color: theme.colors.onPrimary || '#fff',
    fontSize: 18,
    fontWeight: '600',
    backgroundColor: theme.colors.primary,
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  schemeDescription: {
    color: '#9ca3af',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  schemeStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: theme.colors.card,
    borderRadius: 8,
    paddingVertical: 12,
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statText: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  viewDetailsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  viewDetailsText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  applyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    borderRadius: 8,
    paddingVertical: 12,
  },
  topApplyBtn: {
    backgroundColor: '#10b981',
  },
  applyText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  viewAllSchemesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: 8,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    borderStyle: 'dashed',
  },
  viewAllSchemesText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 12,
  },
  profileStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  profileStatusText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  retryButton: {
    padding: 4,
    marginLeft: 8,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: (theme.colors.overlay || 'rgba(0,0,0,0.6)'),
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    margin: 20,
    maxHeight: '80%',
    width: '90%',
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.shadow || '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  allSchemesModalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    margin: 20,
    maxHeight: '90%',
    width: '95%',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  formModalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    margin: 20,
    maxHeight: '90%',
    width: '95%',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  applyWithAIBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  applyWithAIText: {
    color: theme.colors.onPrimary || '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  modalTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  modalBody: {
    padding: 20,
  },
  schemesList: {
    padding: 20,
  },
  modalDescription: {
    color: '#9ca3af',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  detailSection: {
    marginBottom: 24,
  },
  detailSectionTitle: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  detailItem: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 6,
  },
  contactInfo: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 6,
  },
  clickableContactInfo: {
    color: theme.colors.primary,
    fontSize: 14,
    marginBottom: 6,
    textDecorationLine: 'underline',
  },

  // User Input Section Styles
  userInputSection: {
    backgroundColor: (theme.colors.primary + '10') || '#10b98110',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  userInputSectionTitle: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  userInputSectionSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },

  // Form Styles
  autoFillLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: (theme.colors.primary + '20') || '#10b98120',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  autoFillText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  formBody: {
    maxHeight: 500,
  },
  formSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  formSectionTitle: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  userInputLabel: {
    color: '#10b981',
  },
  input: {
    backgroundColor: theme.colors.card,
    color: theme.colors.text,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    fontSize: 16,
  },
  filledInput: {
    borderColor: '#10b981',
    backgroundColor: '#10b98110',
  },
  userInput: {
    borderColor: '#10b981',
    backgroundColor: '#10b98110',
  },
  confirmSection: {
    padding: 20,
    alignItems: 'center',
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  confirmBtnText: {
    color: theme.colors.onPrimary || '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },

  // Confirmation Modal
  confirmationOverlay: {
    flex: 1,
    backgroundColor: (theme.colors.overlay || 'rgba(0,0,0,0.9)'),
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmationContent: {
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  confirmationTitle: {
    color: theme.colors.primary,
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  confirmationText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
});