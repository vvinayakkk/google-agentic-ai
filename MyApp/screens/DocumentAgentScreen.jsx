import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  ActivityIndicator, 
  ScrollView, 
  Alert, 
  Linking,
  Modal,
  FlatList
} from 'react-native';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { NetworkConfig } from '../utils/NetworkConfig';

// Use the main backend API base URL
const API_BASE = NetworkConfig.API_BASE;

export default function DocumentAgentScreen({ navigation }) {
  const { t } = useTranslation();
  const [mode, setMode] = useState('ai-chat'); // 'ai-chat' or 'direct'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // AI Chat mode states
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([
    { 
      role: 'assistant', 
      message: '🤖 Hello! I\'m your AI farming assistant. I can help you with:\n\n✅ Government schemes information\n✅ Document generation\n✅ Farming advice\n✅ Application assistance\n\nJust ask me anything!'
    }
  ]);
  const [sessionId, setSessionId] = useState(null);
  const [selectedSchemeContext, setSelectedSchemeContext] = useState(null);
  
  // Government schemes data
  const [schemes, setSchemes] = useState([]);
  const [allSchemes, setAllSchemes] = useState([]); // Store original unfiltered schemes
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [showSchemeModal, setShowSchemeModal] = useState(false);
  const [schemeLoading, setSchemeLoading] = useState(false); // Loading state for schemes
  
  // Filter and sorting states
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedSort, setSelectedSort] = useState('name');
  const [showFilters, setShowFilters] = useState(false);
  
  const filterOptions = [
    { value: 'all', label: '🏛️ All Schemes', icon: '🏛️' },
    { value: 'central_government', label: '🇮🇳 Central Govt', icon: '🇮🇳' },
    { value: 'maharashtra_state', label: '🏛️ Maharashtra', icon: '🏛️' },
    { value: 'crop_specific', label: '🌾 Agriculture', icon: '🌾' },
    { value: 'health', label: '🏥 Health', icon: '🏥' },
    { value: 'housing', label: '🏠 Housing', icon: '🏠' },
    { value: 'business', label: '💼 Business', icon: '💼' },
    { value: 'education', label: '📚 Education', icon: '📚' }
  ];
  
  const sortOptions = [
    { value: 'name', label: '📝 Name (A-Z)', icon: '📝' },
    { value: 'name_desc', label: '📝 Name (Z-A)', icon: '📝' },
    { value: 'type', label: '🏛️ Type', icon: '🏛️' },
    { value: 'benefit', label: '💰 Benefit', icon: '💰' }
  ];
  
  // Form states for document generation
  const [farmerData, setFarmerData] = useState({
    farmer_name: '',
    aadhaar_number: '',
    contact_number: '',
    address: '',
    document_type: 'loan_application'
  });
  
  // Generated document states
  const [generatedDoc, setGeneratedDoc] = useState(null);
  const [showDocumentTypes, setShowDocumentTypes] = useState(false);
  
  const documentTypes = [
    { value: 'loan_application', label: '🏦 Loan Application', desc: 'Agricultural loan application' },
    { value: 'subsidy_application', label: '💰 Subsidy Application', desc: 'Equipment subsidy application' },
    { value: 'crop_insurance', label: '🌾 Crop Insurance', desc: 'PMFBY crop insurance application' },
    { value: 'kisan_credit_card', label: '💳 Kisan Credit Card', desc: 'KCC card application' },
    { value: 'general_application', label: '📄 General Application', desc: 'Other government schemes' }
  ];

  // Comprehensive scheme-specific document requirements
  const schemeDocumentRequirements = {
    'PM-KISAN': {
      documents: [
        {
          type: 'pm_kisan_application',
          label: '📄 PM-KISAN Registration',
          desc: 'Direct income support application',
          fields: [
            { name: 'farmer_name', label: 'Full Name', type: 'text', required: true },
            { name: 'aadhaar_number', label: 'Aadhaar Number', type: 'text', required: true, pattern: /^\d{12}$/ },
            { name: 'mobile_number', label: 'Mobile Number', type: 'tel', required: true },
            { name: 'bank_account', label: 'Bank Account Number', type: 'text', required: true },
            { name: 'ifsc_code', label: 'IFSC Code', type: 'text', required: true },
            { name: 'land_survey_number', label: 'Survey/Khata Number', type: 'text', required: true },
            { name: 'land_area', label: 'Land Area (in hectares)', type: 'number', required: true },
            { name: 'state', label: 'State', type: 'text', required: true },
            { name: 'district', label: 'District', type: 'text', required: true },
            { name: 'village', label: 'Village', type: 'text', required: true }
          ]
        }
      ]
    },
    'PMFBY': {
      documents: [
        {
          type: 'pmfby_application',
          label: '🌾 PMFBY Crop Insurance',
          desc: 'Crop insurance under PMFBY scheme',
          fields: [
            { name: 'farmer_name', label: 'Full Name', type: 'text', required: true },
            { name: 'aadhaar_number', label: 'Aadhaar Number', type: 'text', required: true },
            { name: 'mobile_number', label: 'Mobile Number', type: 'tel', required: true },
            { name: 'bank_account', label: 'Bank Account Number', type: 'text', required: true },
            { name: 'crop_name', label: 'Crop Name', type: 'text', required: true },
            { name: 'crop_area', label: 'Crop Area (hectares)', type: 'number', required: true },
            { name: 'sowing_date', label: 'Sowing Date', type: 'date', required: true },
            { name: 'season', label: 'Season (Kharif/Rabi)', type: 'select', options: ['Kharif', 'Rabi'], required: true },
            { name: 'loan_account', label: 'Loan Account Number (if any)', type: 'text', required: false },
            { name: 'village', label: 'Village', type: 'text', required: true },
            { name: 'tehsil', label: 'Tehsil', type: 'text', required: true }
          ]
        }
      ]
    },
    'Kisan Credit Card': {
      documents: [
        {
          type: 'kcc_application',
          label: '💳 Kisan Credit Card Application',
          desc: 'KCC application for credit facility',
          fields: [
            { name: 'farmer_name', label: 'Full Name', type: 'text', required: true },
            { name: 'father_name', label: "Father's Name", type: 'text', required: true },
            { name: 'aadhaar_number', label: 'Aadhaar Number', type: 'text', required: true },
            { name: 'pan_number', label: 'PAN Number', type: 'text', required: true },
            { name: 'mobile_number', label: 'Mobile Number', type: 'tel', required: true },
            { name: 'bank_name', label: 'Preferred Bank', type: 'text', required: true },
            { name: 'bank_branch', label: 'Branch Name', type: 'text', required: true },
            { name: 'total_land_area', label: 'Total Land Area (hectares)', type: 'number', required: true },
            { name: 'annual_income', label: 'Annual Income', type: 'number', required: true },
            { name: 'credit_limit_required', label: 'Credit Limit Required', type: 'number', required: true },
            { name: 'purpose', label: 'Purpose of Credit', type: 'textarea', required: true }
          ]
        }
      ]
    },
    'MIDH': {
      documents: [
        {
          type: 'midh_horticulture_subsidy',
          label: '🌱 Horticulture Development Subsidy',
          desc: 'Subsidy for horticultural development',
          fields: [
            { name: 'farmer_name', label: 'Full Name', type: 'text', required: true },
            { name: 'aadhaar_number', label: 'Aadhaar Number', type: 'text', required: true },
            { name: 'mobile_number', label: 'Mobile Number', type: 'tel', required: true },
            { name: 'crop_type', label: 'Horticultural Crop', type: 'text', required: true },
            { name: 'land_area', label: 'Area for Development (hectares)', type: 'number', required: true },
            { name: 'irrigation_source', label: 'Irrigation Source', type: 'text', required: true },
            { name: 'estimated_cost', label: 'Estimated Project Cost', type: 'number', required: true },
            { name: 'subsidy_component', label: 'Subsidy Component', type: 'select', 
              options: ['Area Expansion', 'Protected Cultivation', 'Post Harvest Management', 'Technology'], required: true }
          ]
        }
      ]
    },
    'PKVY': {
      documents: [
        {
          type: 'pkvy_organic_farming',
          label: '🌿 Organic Farming Certification',
          desc: 'Organic farming support under PKVY',
          fields: [
            { name: 'farmer_name', label: 'Full Name', type: 'text', required: true },
            { name: 'aadhaar_number', label: 'Aadhaar Number', type: 'text', required: true },
            { name: 'mobile_number', label: 'Mobile Number', type: 'tel', required: true },
            { name: 'land_area', label: 'Land Area for Organic Farming (hectares)', type: 'number', required: true },
            { name: 'current_farming_type', label: 'Current Farming Type', type: 'select', 
              options: ['Conventional', 'Transitional', 'Organic'], required: true },
            { name: 'crops_planned', label: 'Crops Planned for Organic Cultivation', type: 'textarea', required: true },
            { name: 'water_source', label: 'Water Source', type: 'text', required: true },
            { name: 'group_registration', label: 'Group/Cluster Registration', type: 'text', required: false }
          ]
        }
      ]
    },
    'PMAY': {
      documents: [
        {
          type: 'pmay_housing_application',
          label: '🏠 PMAY Housing Application',
          desc: 'Affordable housing under PMAY',
          fields: [
            { name: 'applicant_name', label: 'Full Name', type: 'text', required: true },
            { name: 'aadhaar_number', label: 'Aadhaar Number', type: 'text', required: true },
            { name: 'mobile_number', label: 'Mobile Number', type: 'tel', required: true },
            { name: 'annual_income', label: 'Annual Household Income', type: 'number', required: true },
            { name: 'category', label: 'Category', type: 'select', 
              options: ['EWS', 'LIG', 'MIG-I', 'MIG-II'], required: true },
            { name: 'house_type', label: 'House Type Required', type: 'select', 
              options: ['New Construction', 'Enhancement', 'Completion'], required: true },
            { name: 'plot_area', label: 'Plot Area (sq. ft.)', type: 'number', required: true },
            { name: 'family_size', label: 'Family Size', type: 'number', required: true }
          ]
        }
      ]
    },
    'Ayushman Bharat': {
      documents: [
        {
          type: 'ayushman_bharat_application',
          label: '🏥 Ayushman Bharat Health Card',
          desc: 'Health insurance under Ayushman Bharat',
          fields: [
            { name: 'family_head_name', label: 'Family Head Name', type: 'text', required: true },
            { name: 'aadhaar_number', label: 'Aadhaar Number', type: 'text', required: true },
            { name: 'mobile_number', label: 'Mobile Number', type: 'tel', required: true },
            { name: 'ration_card_number', label: 'Ration Card Number', type: 'text', required: true },
            { name: 'family_members', label: 'Number of Family Members', type: 'number', required: true },
            { name: 'annual_income', label: 'Annual Family Income', type: 'number', required: true },
            { name: 'bpl_card', label: 'BPL Card Number (if any)', type: 'text', required: false },
            { name: 'caste_category', label: 'Caste Category', type: 'select', 
              options: ['General', 'OBC', 'SC', 'ST'], required: true }
          ]
        }
      ]
    },
    'Mudra Loan': {
      documents: [
        {
          type: 'mudra_loan_application',
          label: '💼 MUDRA Loan Application',
          desc: 'Micro-finance loan under MUDRA scheme',
          fields: [
            { name: 'applicant_name', label: 'Full Name', type: 'text', required: true },
            { name: 'aadhaar_number', label: 'Aadhaar Number', type: 'text', required: true },
            { name: 'pan_number', label: 'PAN Number', type: 'text', required: true },
            { name: 'mobile_number', label: 'Mobile Number', type: 'tel', required: true },
            { name: 'business_type', label: 'Business Type', type: 'text', required: true },
            { name: 'loan_category', label: 'Loan Category', type: 'select', 
              options: ['Shishu (up to ₹50,000)', 'Kishore (₹50,000 to ₹5 lakh)', 'Tarun (₹5 lakh to ₹10 lakh)'], required: true },
            { name: 'loan_amount', label: 'Loan Amount Required', type: 'number', required: true },
            { name: 'business_experience', label: 'Business Experience (years)', type: 'number', required: true },
            { name: 'purpose', label: 'Purpose of Loan', type: 'textarea', required: true }
          ]
        }
      ]
    }
  };

  // Application states
  const [selectedSchemeForApplication, setSelectedSchemeForApplication] = useState(null);
  const [selectedDocumentType, setSelectedDocumentType] = useState(null);
  const [applicationFormData, setApplicationFormData] = useState({});

  // Load government schemes on component mount
  useEffect(() => {
    loadGovernmentSchemes();
  }, []);

  // Load government schemes
  const loadGovernmentSchemes = async () => {
    try {
      setSchemeLoading(true);
      // Use the correct endpoint from document_builder router
      const response = await fetch(`${API_BASE}/api/v1/document-builder/schemes/search?query=government scheme&limit=50`);
      if (response.ok) {
        const result = await response.json();
        console.log('API Response:', result); // Debug log
        
        if (result.success && result.results) {
          let loadedSchemes = result.results || [];
          
          // Filter out schemes without contact info and remove duplicates
          loadedSchemes = loadedSchemes.filter(scheme => {
            const hasContactInfo = (
              (scheme.metadata?.helpline_number) || 
              (scheme.metadata?.official_website) ||
              (scheme.raw_data?.helplineNumber) ||
              (scheme.raw_data?.officialWebsite) ||
              (scheme.raw_data?.helpline_number) ||
              (scheme.raw_data?.official_website)
            );
            return hasContactInfo;
          });
          
          // Remove duplicates based on scheme_name
          const uniqueSchemes = loadedSchemes.filter((scheme, index, self) =>
            index === self.findIndex(s => s.scheme_name === scheme.scheme_name)
          );
          
          console.log(`Loaded ${uniqueSchemes.length} unique schemes with contact info from API`);
          setAllSchemes(uniqueSchemes);
          setSchemes(uniqueSchemes);
        } else {
          console.warn('API returned success=false or no results:', result);
          loadFallbackSchemes();
        }
      } else {
        console.error('API response not ok:', response.status, response.statusText);
        loadFallbackSchemes();
      }
    } catch (error) {
      console.error('Error loading schemes from API:', error);
      loadFallbackSchemes();
    } finally {
      setSchemeLoading(false);
    }
  };

  const loadFallbackSchemes = () => {
    console.log('Loading fallback schemes...');
    // Add comprehensive sample schemes as fallback with contact info
    const fallbackSchemes = [
      { 
        scheme_name: 'PM-KISAN', 
        content: 'Direct income support of ₹6000 per year to farmers', 
        metadata: { 
          key_benefit: '₹6000/year',
          helpline_number: '155261',
          official_website: 'https://pmkisan.gov.in'
        }, 
        scheme_type: 'central_government' 
      },
      { 
        scheme_name: 'PMFBY', 
        content: 'Pradhan Mantri Fasal Bima Yojana for crop insurance', 
        metadata: { 
          key_benefit: 'Crop Insurance',
          helpline_number: '18001801551',
          official_website: 'https://pmfby.gov.in'
        }, 
        scheme_type: 'central_government' 
      },
      { 
        scheme_name: 'Kisan Credit Card', 
        content: 'Easy credit access for farmers at subsidized rates', 
        metadata: { 
          key_benefit: 'Low Interest Loans',
          helpline_number: '18001801551',
          official_website: 'https://kcc.gov.in'
        }, 
        scheme_type: 'central_government' 
      },
      { 
        scheme_name: 'PMAY', 
        content: 'Pradhan Mantri Awas Yojana for affordable housing', 
        metadata: { 
          key_benefit: 'Housing Subsidy',
          helpline_number: '18001036743',
          official_website: 'https://pmaymis.gov.in'
        }, 
        scheme_type: 'central_government' 
      },
      { 
        scheme_name: 'Ayushman Bharat', 
        content: 'Health insurance coverage up to ₹5 lakh per family', 
        metadata: { 
          key_benefit: 'Health Insurance',
          helpline_number: '14555',
          official_website: 'https://pmjay.gov.in'
        }, 
        scheme_type: 'central_government' 
      },
      { 
        scheme_name: 'Mudra Loan', 
        content: 'Micro-finance for small businesses and enterprises', 
        metadata: { 
          key_benefit: 'Business Loans',
          helpline_number: '18001801111',
          official_website: 'https://mudra.org.in'
        }, 
        scheme_type: 'central_government' 
      }
    ];
    setAllSchemes(fallbackSchemes);
    setSchemes(fallbackSchemes);
  };

  // Filter schemes based on selected filter
  const filterSchemes = (schemes, filterType) => {
    if (filterType === 'all') return schemes;
    
    return schemes.filter(scheme => {
      const schemeType = scheme.scheme_type || '';
      const schemeName = scheme.scheme_name?.toLowerCase() || '';
      const content = scheme.content?.toLowerCase() || '';
      
      switch (filterType) {
        case 'central_government':
        case 'maharashtra_state':
        case 'crop_specific':
          return schemeType === filterType;
        case 'health':
          return schemeName.includes('health') || schemeName.includes('ayushman') || schemeName.includes('aushadhi') || content.includes('health') || content.includes('medicine');
        case 'housing':
          return schemeName.includes('awas') || schemeName.includes('housing') || content.includes('housing') || content.includes('house');
        case 'business':
          return schemeName.includes('mudra') || schemeName.includes('business') || content.includes('business') || content.includes('enterprise');
        case 'education':
          return schemeName.includes('skill') || schemeName.includes('education') || content.includes('education') || content.includes('training');
        default:
          return true;
      }
    });
  };

  // Sort schemes based on selected sort option
  const sortSchemes = (schemes, sortType) => {
    const sortedSchemes = [...schemes];
    
    switch (sortType) {
      case 'name':
        return sortedSchemes.sort((a, b) => a.scheme_name.localeCompare(b.scheme_name));
      case 'name_desc':
        return sortedSchemes.sort((a, b) => b.scheme_name.localeCompare(a.scheme_name));
      case 'type':
        return sortedSchemes.sort((a, b) => (a.scheme_type || '').localeCompare(b.scheme_type || ''));
      case 'benefit':
        return sortedSchemes.sort((a, b) => (a.metadata?.key_benefit || '').localeCompare(b.metadata?.key_benefit || ''));
      default:
        return sortedSchemes;
    }
  };

  // Apply filters and sorting when filter or sort changes
  useEffect(() => {
    let filteredSchemes = filterSchemes(allSchemes, selectedFilter);
    let sortedSchemes = sortSchemes(filteredSchemes, selectedSort);
    setSchemes(sortedSchemes);
  }, [allSchemes, selectedFilter, selectedSort]);

  // AI Chat function with intelligent document generation
  const sendChatMessage = async () => {
    if (!chatMessage.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    setLoading(true);
    setError(null);

    // Add user message to chat immediately
    const userMessage = { role: 'user', message: chatMessage };
    setChatHistory(prev => [...prev, userMessage]);
    const currentMessage = chatMessage;
    setChatMessage(''); // Clear input

    try {
      // Prepare the request body
      const requestBody = {
        message: currentMessage,
        session_id: sessionId,
        farmer_data: farmerData
      };

      // Add scheme context if available
      if (selectedSchemeContext) {
        const formattedSchemeData = formatSchemeContent(selectedSchemeContext);
        requestBody.scheme_context = {
          scheme_name: selectedSchemeContext.scheme_name,
          scheme_type: selectedSchemeContext.scheme_type,
          content: selectedSchemeContext.content,
          key_benefit: formattedSchemeData.keyBenefit,
          description: formattedSchemeData.description,
          eligibility: formattedSchemeData.eligibility,
          application_process: formattedSchemeData.applicationProcess,
          required_documents: formattedSchemeData.requiredDocuments,
          ministry: formattedSchemeData.ministry,
          official_website: formattedSchemeData.officialWebsite,
          helpline_number: formattedSchemeData.helplineNumber
        };
      }

      const response = await fetch(`${API_BASE}/api/v1/document-builder/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Chat failed: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Set session ID if not already set
        if (!sessionId) {
          setSessionId(result.session_id);
        }

        // Add AI response to chat
        const aiMessage = { 
          role: 'assistant', 
          message: result.response,
          suggested_actions: result.suggested_actions,
          context_schemes: result.context_schemes
        };
        
        setChatHistory(prev => [...prev, aiMessage]);

        // Check if AI suggests document generation
        if (result.should_generate_document) {
          setTimeout(() => {
            Alert.alert(
              'Document Generation',
              'Based on our conversation, I can generate a document for you. Would you like me to create it?',
              [
                { text: 'Not now', style: 'cancel' },
                { text: 'Generate Document', onPress: () => generateDocumentFromChat(result.suggested_document_type) }
              ]
            );
          }, 1000);
        }
      }
    } catch (err) {
      setError(err.message);
      // Add error message to chat
      setChatHistory(prev => [...prev, { 
        role: 'assistant', 
        message: `❌ I encountered an error: ${err.message}. Please try again or try asking a different question.` 
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Generate scheme-specific document
  const generateSchemeSpecificDocument = async () => {
    if (!selectedDocumentType || !selectedSchemeForApplication) {
      Alert.alert('Error', 'Please select a scheme and document type');
      return;
    }

    // Validate required fields
    const requiredFields = selectedDocumentType.fields.filter(field => field.required);
    const missingFields = requiredFields.filter(field => !applicationFormData[field.name] || applicationFormData[field.name].trim() === '');
    
    if (missingFields.length > 0) {
      Alert.alert(
        'Missing Information', 
        `Please fill in the following required fields:\n• ${missingFields.map(f => f.label).join('\n• ')}`
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/v1/document-builder/generate-scheme-specific-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scheme_name: selectedSchemeForApplication.scheme_name,
          document_type: selectedDocumentType.type,
          application_data: applicationFormData,
          scheme_context: {
            scheme_type: selectedSchemeForApplication.scheme_type,
            key_benefit: selectedSchemeForApplication.metadata?.key_benefit || '',
            helpline_number: selectedSchemeForApplication.metadata?.helpline_number || '',
            official_website: selectedSchemeForApplication.metadata?.official_website || ''
          },
          format_type: 'pdf'
        })
      });

      if (!response.ok) {
        throw new Error('Document generation failed');
      }

      const result = await response.json();
      
      if (result.success) {
        setGeneratedDoc(result);
        
        Alert.alert(
          '🎉 Success!', 
          `Your ${selectedDocumentType.label} has been generated!\n\nScheme: ${selectedSchemeForApplication.scheme_name}\nFile: ${result.filename}`,
          [
            { text: 'OK', style: 'default' },
            { text: '📥 Download', onPress: () => downloadDocument(result.document_id) }
          ]
        );

        // Reset form after successful generation
        setApplicationFormData({});
      }
    } catch (err) {
      setError(err.message);
      Alert.alert('Error', `Failed to generate document: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Render direct mode
  const renderDirectMode = () => (
    <View style={styles.directContainer}>
      <Text style={styles.sectionTitle}>📄 Quick PDF Generation</Text>
      <Text style={styles.subtitle}>Generate basic documents quickly without scheme selection</Text>
      
      {/* Show selected document type info */}
      <View style={styles.selectedDocTypeInfo}>
        <Text style={styles.selectedDocTypeLabel}>Selected Document Type:</Text>
        <Text style={styles.selectedDocTypeValue}>
          {documentTypes.find(d => d.value === farmerData.document_type)?.label || 'General Application'}
        </Text>
        <Text style={styles.selectedDocTypeDesc}>
          {documentTypes.find(d => d.value === farmerData.document_type)?.desc || 'Document generation'}
        </Text>
      </View>
      
      <TouchableOpacity 
        style={styles.generateBtn} 
        onPress={generateBasicPDF}
        disabled={loading}
      >
        <Feather name="file-text" size={24} color="#fff" />
        <Text style={styles.btnText}>
          {loading ? 'Generating PDF...' : '📄 Generate Basic PDF'}
        </Text>
      </TouchableOpacity>
    </View>
  );
  const generateDocumentFromChat = async (documentType = null) => {
    if (!farmerData.farmer_name.trim()) {
      Alert.alert('Error', 'Please enter your name first');
      return;
    }

    setLoading(true);

    try {
      // Use the last few chat messages as context for document generation
      const chatContext = chatHistory
        .filter(msg => msg.role === 'user')
        .slice(-3)
        .map(msg => msg.message)
        .join(' ');

      const response = await fetch(`${API_BASE}/api/v1/document-builder/generate-pdf-with-ai-json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          farmer_name: farmerData.farmer_name,
          user_question: chatContext || 'Generate document based on our conversation',
          aadhaar_number: farmerData.aadhaar_number || '',
          contact_number: farmerData.contact_number || '',
          address: farmerData.address || '',
          document_type: documentType || farmerData.document_type,
          format_type: 'pdf'
        })
      });

      if (!response.ok) {
        throw new Error('Document generation failed');
      }

      const result = await response.json();
      
      if (result.success) {
        setGeneratedDoc(result);
        
        // Add success message to chat
        setChatHistory(prev => [...prev, { 
          role: 'assistant', 
          message: `✅ Great! I've generated your document: ${result.filename}\n\n� Document Type: ${documentType || farmerData.document_type}\n🤖 AI Assistance: Included\n\nYou can download it now!` 
        }]);
        
        Alert.alert(
          '🎉 Success!', 
          `Your document has been generated with AI assistance!\n\nFile: ${result.filename}`,
          [
            { text: 'OK', style: 'default' },
            { text: '📥 Download', onPress: () => downloadDocument(result.document_id) }
          ]
        );
      }
    } catch (err) {
      setError(err.message);
      setChatHistory(prev => [...prev, { 
        role: 'assistant', 
        message: `❌ I couldn't generate the document: ${err.message}. Please try again.` 
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Generate basic PDF without AI
  const generateBasicPDF = async () => {
    if (!farmerData.farmer_name.trim()) {
      Alert.alert('त्रुटी', 'कृपया तुमचे नाव प्रविष्ट करा');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/v1/document-builder/generate-pdf-json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          farmer_name: farmerData.farmer_name,
          aadhaar_number: farmerData.aadhaar_number || '',
          contact_number: farmerData.contact_number || '',
          address: farmerData.address || '',
          document_type: farmerData.document_type,
          format_type: 'pdf'
        })
      });

      if (!response.ok) {
        throw new Error('PDF generation failed');
      }

      const result = await response.json();
      
      if (result.success) {
        setGeneratedDoc(result);
        
        Alert.alert(
          '🎉 यशस्वी!', 
          `तुमचा PDF दस्तावेज तयार झाला!\n\nफाइल: ${result.filename}`,
          [
            { text: 'ठीक आहे', style: 'default' },
            { text: '📥 डाउनलोड करा', onPress: () => downloadDocument(result.document_id) }
          ]
        );
      }
    } catch (err) {
      setError(err.message);
      Alert.alert('त्रुटी', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Download document
  const downloadDocument = async (documentId) => {
    try {
      const url = `${API_BASE}/api/v1/document-builder/download/${documentId}`;
      const supported = await Linking.canOpenURL(url);
      
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('त्रुटी', 'दस्तावेज उघडू शकत नाही');
      }
    } catch (err) {
      Alert.alert('त्रुटी', 'डाउनलोड करताना त्रुटी');
    }
  };

  // Render filter and sorting options
  const renderFilterSort = () => (
    <Modal
      visible={showFilters}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowFilters(false)}
    >
      <View style={styles.filterModalOverlay}>
        <View style={styles.filterModalContent}>
          <View style={styles.filterModalHeader}>
            <Text style={styles.filterModalTitle}>🔍 Filter & Sort Schemes</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.filterModalBody} showsVerticalScrollIndicator={false}>
            {/* Filter Options */}
            <View style={styles.filterModalSection}>
              <Text style={styles.filterModalSectionTitle}>📂 Filter by Category</Text>
              <View style={styles.filterGrid}>
                {filterOptions.map((filter) => (
                  <TouchableOpacity
                    key={filter.value}
                    style={[
                      styles.filterGridItem,
                      selectedFilter === filter.value && styles.filterGridItemActive
                    ]}
                    onPress={() => setSelectedFilter(filter.value)}
                  >
                    <Text style={styles.filterGridIcon}>{filter.icon}</Text>
                    <Text style={[
                      styles.filterGridText,
                      selectedFilter === filter.value && styles.filterGridTextActive
                    ]}>
                      {filter.label.replace(/🏛️|🇮🇳|🌾|🏥|🏠|💼|📚/g, '').trim()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Sort Options */}
            <View style={styles.filterModalSection}>
              <Text style={styles.filterModalSectionTitle}>🔄 Sort by</Text>
              <View style={styles.sortGrid}>
                {sortOptions.map((sort) => (
                  <TouchableOpacity
                    key={sort.value}
                    style={[
                      styles.sortGridItem,
                      selectedSort === sort.value && styles.sortGridItemActive
                    ]}
                    onPress={() => setSelectedSort(sort.value)}
                  >
                    <Text style={styles.sortGridIcon}>{sort.icon}</Text>
                    <Text style={[
                      styles.sortGridText,
                      selectedSort === sort.value && styles.sortGridTextActive
                    ]}>
                      {sort.label.replace(/📝|🏛️|💰/g, '').trim()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Results Summary */}
            <View style={styles.filterResultsSummary}>
              <Text style={styles.filterResultsText}>
                📊 Showing {schemes.length} schemes
                {selectedFilter !== 'all' && ` in ${filterOptions.find(f => f.value === selectedFilter)?.label.replace(/🏛️|🇮🇳|🌾|🏥|🏠|💼|📚/g, '').trim()}`}
              </Text>
            </View>
          </ScrollView>

          {/* Modal Footer */}
          <View style={styles.filterModalFooter}>
            <TouchableOpacity 
              style={styles.filterResetBtn}
              onPress={() => {
                setSelectedFilter('all');
                setSelectedSort('name');
              }}
            >
              <Text style={styles.filterResetText}>Reset All</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.filterApplyBtn}
              onPress={() => setShowFilters(false)}
            >
              <Text style={styles.filterApplyText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Render government schemes carousel
  const renderSchemesCarousel = () => (
    <View style={styles.schemesContainer}>
      <View style={styles.schemesHeader}>
        <Text style={styles.sectionTitle}>🏛️ Government Schemes & Benefits</Text>
        <TouchableOpacity 
          style={styles.filterModalBtn}
          onPress={() => setShowFilters(!showFilters)}
        >
          <MaterialIcons name="tune" size={18} color="#22c55e" />
          <Text style={styles.filterModalText}>Filter</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.schemesScroll}
        contentContainerStyle={styles.schemesScrollContent}
        decelerationRate="fast"
        snapToInterval={200}
        snapToAlignment="start"
      >
        {schemes.length > 0 ? schemes.map((scheme, index) => (
          <TouchableOpacity
            key={index}
            style={styles.schemeCard}
            onPress={() => {
              setSelectedScheme(scheme);
              setShowSchemeModal(true);
            }}
          >
            <View style={styles.schemeCardHeader}>
              <Text style={styles.schemeTitle} numberOfLines={1}>{scheme.scheme_name}</Text>
              <View style={styles.schemeTypeTag}>
                <Text style={styles.schemeTypeText}>
                  {scheme.scheme_type === 'central_government' ? '🇮🇳' : 
                   scheme.scheme_type === 'maharashtra_state' ? '🏛️' : 
                   scheme.scheme_type === 'crop_specific' ? '🌾' : '📋'}
                </Text>
              </View>
            </View>
            
            {scheme.metadata?.key_benefit && (
              <Text style={styles.schemeBenefit} numberOfLines={1}>{scheme.metadata.key_benefit}</Text>
            )}
            
            <Text style={styles.schemeDesc} numberOfLines={2}>
              {scheme.content || scheme.label || 'Government scheme for citizens'}
            </Text>
            
            {/* Quick Action Buttons */}
            <View style={styles.schemeQuickActions}>
              <TouchableOpacity 
                style={styles.quickActionBtn}
                onPress={(e) => {
                  e.stopPropagation();
                  setSelectedSchemeContext(scheme);
                  setMode('ai-chat');
                }}
              >
                <MaterialIcons name="psychology" size={14} color="#22c55e" />
                <Text style={styles.quickActionText}>Ask AI</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.quickActionBtn}
                onPress={(e) => {
                  e.stopPropagation();
                  setSelectedSchemeForApplication(scheme);
                  setMode('application');
                }}
              >
                <MaterialIcons name="description" size={14} color="#3b82f6" />
                <Text style={styles.quickActionText}>Apply</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.schemeFooter}>
              <Text style={styles.learnMore}>View Details →</Text>
            </View>
          </TouchableOpacity>
        )) : (
          <View style={styles.noSchemesContainer}>
            <Text style={styles.noSchemesText}>No schemes found</Text>
            <TouchableOpacity 
              style={styles.resetFilterBtn}
              onPress={() => setSelectedFilter('all')}
            >
              <Text style={styles.resetFilterText}>Show All</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
      
      {schemes.length > 3 && (
        <View style={styles.scrollIndicator}>
          <Text style={styles.scrollIndicatorText}>← Scroll to see more schemes →</Text>
        </View>
      )}
    </View>
  );

  // Render mode selection
  const renderModeSelection = () => (
    <View style={styles.modeSelection}>
      <TouchableOpacity 
        style={[styles.modeBtn, mode === 'ai-chat' && styles.modeActive]}
        onPress={() => setMode('ai-chat')}
      >
        <MaterialIcons name="psychology" size={24} color={mode === 'ai-chat' ? '#fff' : '#22c55e'} />
        <Text style={[styles.modeText, mode === 'ai-chat' && styles.modeActiveText]}>🤖 AI Chat</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.modeBtn, mode === 'application' && styles.modeActive]}
        onPress={() => setMode('application')}
      >
        <MaterialIcons name="assignment" size={24} color={mode === 'application' ? '#fff' : '#3b82f6'} />
        <Text style={[styles.modeText, mode === 'application' && styles.modeActiveText]}>📋 Application Zone</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.modeBtn, mode === 'direct' && styles.modeActive]}
        onPress={() => setMode('direct')}
      >
        <Feather name="file-text" size={24} color={mode === 'direct' ? '#fff' : '#ef4444'} />
        <Text style={[styles.modeText, mode === 'direct' && styles.modeActiveText]}>📄 Quick PDF</Text>
      </TouchableOpacity>
    </View>
  );

  // Render AI chat mode
  const renderAIChatMode = () => (
    <View style={styles.aiChatContainer}>
      {/* Scheme Context Indicator */}
      {selectedSchemeContext && (
        <View style={styles.schemeContextIndicator}>
          <View style={styles.schemeContextHeader}>
            <MaterialIcons name="info" size={16} color="#22c55e" />
            <Text style={styles.schemeContextTitle}>Added Context: {selectedSchemeContext.scheme_name}</Text>
            <TouchableOpacity 
              onPress={() => setSelectedSchemeContext(null)}
              style={styles.removeContextBtn}
            >
              <Ionicons name="close-circle" size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>
          <Text style={styles.schemeContextDesc}>
            AI assistant now has detailed information about this scheme
          </Text>
        </View>
      )}

      {/* Chat History */}
      <ScrollView style={styles.chatArea} contentContainerStyle={{ paddingBottom: 20 }}>
        {chatHistory.map((msg, idx) => (
          <View key={idx} style={[
            styles.chatBubble, 
            msg.role === 'user' ? styles.userBubble : styles.assistantBubble
          ]}>
            <Text style={styles.chatText}>{msg.message}</Text>
            {msg.suggested_actions && (
              <View style={styles.suggestedActions}>
                {msg.suggested_actions.map((action, actionIdx) => (
                  <TouchableOpacity key={actionIdx} style={styles.actionBtn}>
                    <Text style={styles.actionText}>{action}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ))}
        {loading && (
          <View style={styles.loadingMessage}>
            <ActivityIndicator size="small" color="#22c55e" />
            <Text style={styles.loadingText}>AI is thinking...</Text>
          </View>
        )}
      </ScrollView>

      {/* Chat Input */}
      <View style={styles.chatInputContainer}>
        <View style={styles.chatInputWrapper}>
          <TextInput
            style={styles.chatInput}
            value={chatMessage}
            onChangeText={setChatMessage}
            placeholder={selectedSchemeContext ? 
              `Ask about ${selectedSchemeContext.scheme_name} or anything else...` : 
              "Ask me about farming, schemes, or document generation..."
            }
            placeholderTextColor="#666"
            multiline
            maxLength={800}
            textAlignVertical="top"
          />
        </View>
        <TouchableOpacity 
          style={[styles.sendBtn, loading && styles.sendBtnDisabled]} 
          onPress={sendChatMessage}
          disabled={loading}
        >
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Render application zone
  const renderApplicationZone = () => {
    if (!selectedSchemeForApplication) {
      return (
        <View style={styles.applicationContainer}>
          <Text style={styles.sectionTitle}>� Application Zone</Text>
          <Text style={styles.subtitle}>Select a scheme from the carousel above to start your application</Text>
          
          <View style={styles.applicationPrompt}>
            <MaterialIcons name="info" size={48} color="#3b82f6" />
            <Text style={styles.promptTitle}>Choose a Government Scheme</Text>
            <Text style={styles.promptDesc}>
              Browse through the government schemes above and click "Apply" to start your application with scheme-specific documents and requirements.
            </Text>
          </View>
        </View>
      );
    }

    const availableDocuments = schemeDocumentRequirements[selectedSchemeForApplication.scheme_name] || {
      documents: [{
        type: 'general_application',
        label: '📄 General Application',
        desc: 'Standard government scheme application',
        fields: [
          { name: 'farmer_name', label: 'Full Name', type: 'text', required: true },
          { name: 'aadhaar_number', label: 'Aadhaar Number', type: 'text', required: true },
          { name: 'mobile_number', label: 'Mobile Number', type: 'tel', required: true },
          { name: 'purpose', label: 'Purpose of Application', type: 'textarea', required: true }
        ]
      }]
    };

    if (!selectedDocumentType) {
      return (
        <View style={styles.applicationContainer}>
          <View style={styles.schemeHeader}>
            <TouchableOpacity 
              onPress={() => setSelectedSchemeForApplication(null)}
              style={styles.backToSchemesBtn}
            >
              <MaterialIcons name="arrow-back" size={20} color="#3b82f6" />
              <Text style={styles.backToSchemesText}>Back to Schemes</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.sectionTitle}>📋 {selectedSchemeForApplication.scheme_name}</Text>
          <Text style={styles.subtitle}>Select the document you want to apply for</Text>
          
          <View style={styles.documentsGrid}>
            {availableDocuments.documents.map((doc, index) => (
              <TouchableOpacity
                key={index}
                style={styles.documentCard}
                onPress={() => {
                  setSelectedDocumentType(doc);
                  setApplicationFormData({});
                }}
              >
                <Text style={styles.documentLabel}>{doc.label}</Text>
                <Text style={styles.documentDesc}>{doc.desc}</Text>
                <Text style={styles.documentFieldCount}>
                  {doc.fields.filter(f => f.required).length} required fields
                </Text>
                <View style={styles.documentFooter}>
                  <Text style={styles.selectDocText}>Select →</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      );
    }

    return (
      <View style={styles.applicationContainer}>
        <View style={styles.applicationHeader}>
          <TouchableOpacity 
            onPress={() => setSelectedDocumentType(null)}
            style={styles.backToDocsBtn}
          >
            <MaterialIcons name="arrow-back" size={20} color="#3b82f6" />
            <Text style={styles.backToDocsText}>Back to Documents</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.sectionTitle}>{selectedDocumentType.label}</Text>
        <Text style={styles.subtitle}>{selectedDocumentType.desc}</Text>
        
        <ScrollView style={styles.applicationForm} showsVerticalScrollIndicator={false}>
          {selectedDocumentType.fields.map((field, index) => (
            <View key={index} style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>
                {field.label} {field.required && <Text style={styles.requiredStar}>*</Text>}
              </Text>
              
              {field.type === 'select' ? (
                <TouchableOpacity 
                  style={styles.selectField}
                  onPress={() => {
                    // Show select options modal
                    Alert.alert(
                      field.label,
                      'Select an option',
                      field.options.map(option => ({
                        text: option,
                        onPress: () => setApplicationFormData(prev => ({ ...prev, [field.name]: option }))
                      })).concat([{ text: 'Cancel', style: 'cancel' }])
                    );
                  }}
                >
                  <Text style={[styles.selectFieldText, !applicationFormData[field.name] && styles.placeholderText]}>
                    {applicationFormData[field.name] || `Select ${field.label}`}
                  </Text>
                  <MaterialIcons name="arrow-drop-down" size={24} color="#666" />
                </TouchableOpacity>
              ) : field.type === 'textarea' ? (
                <TextInput
                  style={[styles.applicationInput, styles.textAreaInput]}
                  value={applicationFormData[field.name] || ''}
                  onChangeText={(text) => setApplicationFormData(prev => ({ ...prev, [field.name]: text }))}
                  placeholder={`Enter ${field.label}`}
                  placeholderTextColor="#666"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              ) : (
                <TextInput
                  style={styles.applicationInput}
                  value={applicationFormData[field.name] || ''}
                  onChangeText={(text) => setApplicationFormData(prev => ({ ...prev, [field.name]: text }))}
                  placeholder={`Enter ${field.label}`}
                  placeholderTextColor="#666"
                  keyboardType={field.type === 'number' ? 'numeric' : field.type === 'tel' ? 'phone-pad' : 'default'}
                />
              )}
            </View>
          ))}
          
          <TouchableOpacity 
            style={styles.generateApplicationBtn}
            onPress={generateSchemeSpecificDocument}
            disabled={loading}
          >
            <MaterialIcons name="description" size={24} color="#fff" />
            <Text style={styles.generateApplicationText}>
              {loading ? 'Generating Application...' : '📄 Generate Application'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  };

  // Render farmer form
  const renderFarmerForm = () => (
    <View style={styles.formContainer}>
      <Text style={styles.sectionTitle}>👨‍🌾 Farmer Information</Text>
      
      <TextInput
        style={styles.input}
        value={farmerData.farmer_name}
        onChangeText={(text) => setFarmerData(prev => ({ ...prev, farmer_name: text }))}
        placeholder="Your Full Name *"
        placeholderTextColor="#666"
      />
      
      <TextInput
        style={styles.input}
        value={farmerData.aadhaar_number}
        onChangeText={(text) => setFarmerData(prev => ({ ...prev, aadhaar_number: text }))}
        placeholder="Aadhaar Number (Optional)"
        placeholderTextColor="#666"
        keyboardType="numeric"
      />
      
      <TextInput
        style={styles.input}
        value={farmerData.contact_number}
        onChangeText={(text) => setFarmerData(prev => ({ ...prev, contact_number: text }))}
        placeholder="Mobile Number (Optional)"
        placeholderTextColor="#666"
        keyboardType="phone-pad"
      />
      
      <TextInput
        style={[styles.input, styles.addressInput]}
        value={farmerData.address}
        onChangeText={(text) => setFarmerData(prev => ({ ...prev, address: text }))}
        placeholder="Address (Optional)"
        placeholderTextColor="#666"
        multiline
        numberOfLines={2}
      />

      {/* Document Type Selection */}
      <TouchableOpacity 
        style={styles.documentTypeBtn}
        onPress={() => setShowDocumentTypes(true)}
      >
        <Text style={styles.documentTypeText}>
          {documentTypes.find(d => d.value === farmerData.document_type)?.label || 'Select Document Type'}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#22c55e" />
      </TouchableOpacity>
    </View>
  );

  // Format scheme content for better display
  const formatSchemeContent = (scheme) => {
    if (!scheme) return null;

    // Try multiple data sources - raw_data, metadata, or direct scheme properties
    const rawData = scheme.raw_data || scheme || {};
    const metadata = scheme.metadata || {};
    
    // Extract comprehensive information from all possible sources
    return {
      description: rawData.description || rawData.content || scheme.content || rawData.scheme_description || 'No description available',
      keyBenefit: rawData.keyBenefit || rawData.key_benefit || metadata.key_benefit || rawData.benefit_amount || 'Not specified',
      ministry: rawData.administeringMinistry || rawData.ministry || metadata.ministry || rawData.administering_ministry || '',
      primaryObjective: rawData.primaryObjective || rawData.primary_objective || metadata.primary_objective || rawData.objective || '',
      eligibility: rawData.eligibilityCriteria || rawData.eligibility_criteria || rawData.eligibility || rawData.target_beneficiaries || '',
      applicationProcess: rawData.applicationProcess || rawData.application_process || rawData.how_to_apply || '',
      requiredDocuments: rawData.requiredDocuments || rawData.required_documents || rawData.documents_required || '',
      officialWebsite: rawData.officialWebsite || rawData.official_website || metadata.official_website || rawData.website || '',
      helplineNumber: rawData.helplineNumber || rawData.helpline_number || metadata.helpline_number || rawData.contact_number || '',
      launchDate: rawData.launchDate || rawData.launch_date || rawData.start_date || '',
      applicableRegion: rawData.applicableRegion || rawData.applicable_region || metadata.applicable_region || rawData.coverage_area || 'India',
      // Additional fields that might be present
      schemeType: rawData.scheme_type || scheme.scheme_type || 'Government Scheme',
      targetBeneficiaries: rawData.targetBeneficiaries || rawData.target_beneficiaries || '',
      budgetAllocation: rawData.budgetAllocation || rawData.budget_allocation || '',
      implementingAgency: rawData.implementingAgency || rawData.implementing_agency || ''
    };
  };

  // Open URL function
  const openURL = async (url) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open this URL');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open URL');
    }
  };

  // Scheme detail modal
  const renderSchemeModal = () => {
    if (!selectedScheme) return null;
    
    const formattedData = formatSchemeContent(selectedScheme);
    
    return (
      <Modal
        visible={showSchemeModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSchemeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.schemeModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedScheme?.scheme_name}</Text>
              <TouchableOpacity onPress={() => setShowSchemeModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.schemeDetails} showsVerticalScrollIndicator={false}>
              {/* Scheme Type Badge */}
              <View style={styles.schemeTypeBadge}>
                <Text style={styles.schemeTypeBadgeText}>
                  {selectedScheme.scheme_type === 'central_government' ? '🇮🇳 Central Government' : 
                   selectedScheme.scheme_type === 'maharashtra_state' ? '🏛️ Maharashtra State' : 
                   selectedScheme.scheme_type === 'crop_specific' ? '🌾 Agriculture Specific' : '📋 Government Scheme'}
                </Text>
              </View>

              {/* Key Benefit */}
              {formattedData.keyBenefit && (
                <View style={styles.schemeInfoSection}>
                  <Text style={styles.schemeInfoLabel}>💰 Key Benefit</Text>
                  <Text style={styles.schemeInfoValue}>{formattedData.keyBenefit}</Text>
                </View>
              )}

              {/* Ministry/Department */}
              {formattedData.ministry && (
                <View style={styles.schemeInfoSection}>
                  <Text style={styles.schemeInfoLabel}>🏛️ Administered By</Text>
                  <Text style={styles.schemeInfoValue}>{formattedData.ministry}</Text>
                </View>
              )}

              {/* Primary Objective */}
              {formattedData.primaryObjective && (
                <View style={styles.schemeInfoSection}>
                  <Text style={styles.schemeInfoLabel}>🎯 Objective</Text>
                  <Text style={styles.schemeInfoValue}>{formattedData.primaryObjective}</Text>
                </View>
              )}

              {/* Description */}
              <View style={styles.schemeInfoSection}>
                <Text style={styles.schemeInfoLabel}>📄 Description</Text>
                <Text style={styles.schemeInfoValue}>
                  {formattedData.description.replace(/\[cite:.*?\]/g, '').trim()}
                </Text>
              </View>

              {/* Eligibility */}
              {formattedData.eligibility && (
                <View style={styles.schemeInfoSection}>
                  <Text style={styles.schemeInfoLabel}>✅ Eligibility</Text>
                  {Array.isArray(formattedData.eligibility) ? (
                    formattedData.eligibility.map((criteria, index) => (
                      <Text key={index} style={styles.schemeInfoBullet}>
                        • {criteria.replace(/\[cite:.*?\]/g, '').trim()}
                      </Text>
                    ))
                  ) : (
                    <Text style={styles.schemeInfoValue}>
                      {formattedData.eligibility.replace(/\[cite:.*?\]/g, '').trim()}
                    </Text>
                  )}
                </View>
              )}

              {/* Application Process */}
              {formattedData.applicationProcess && (
                <View style={styles.schemeInfoSection}>
                  <Text style={styles.schemeInfoLabel}>📝 Application Process</Text>
                  {Array.isArray(formattedData.applicationProcess) ? (
                    formattedData.applicationProcess.map((step, index) => (
                      <Text key={index} style={styles.schemeInfoBullet}>
                        {index + 1}. {step.replace(/\[cite:.*?\]/g, '').trim()}
                      </Text>
                    ))
                  ) : (
                    <Text style={styles.schemeInfoValue}>
                      {formattedData.applicationProcess.replace(/\[cite:.*?\]/g, '').trim()}
                    </Text>
                  )}
                </View>
              )}

              {/* Required Documents */}
              {formattedData.requiredDocuments && (
                <View style={styles.schemeInfoSection}>
                  <Text style={styles.schemeInfoLabel}>📋 Required Documents</Text>
                  {Array.isArray(formattedData.requiredDocuments) ? (
                    formattedData.requiredDocuments.map((doc, index) => (
                      <Text key={index} style={styles.schemeInfoBullet}>
                        • {doc.replace(/\[cite:.*?\]/g, '').trim()}
                      </Text>
                    ))
                  ) : (
                    <Text style={styles.schemeInfoValue}>
                      {formattedData.requiredDocuments.replace(/\[cite:.*?\]/g, '').trim()}
                    </Text>
                  )}
                </View>
              )}

              {/* Target Beneficiaries */}
              {formattedData.targetBeneficiaries && (
                <View style={styles.schemeInfoSection}>
                  <Text style={styles.schemeInfoLabel}>👥 Target Beneficiaries</Text>
                  <Text style={styles.schemeInfoValue}>{formattedData.targetBeneficiaries}</Text>
                </View>
              )}

              {/* Budget/Implementation */}
              {(formattedData.budgetAllocation || formattedData.implementingAgency) && (
                <View style={styles.schemeInfoSection}>
                  <Text style={styles.schemeInfoLabel}>💼 Implementation</Text>
                  {formattedData.budgetAllocation && (
                    <Text style={styles.schemeInfoValue}>Budget: {formattedData.budgetAllocation}</Text>
                  )}
                  {formattedData.implementingAgency && (
                    <Text style={styles.schemeInfoValue}>Agency: {formattedData.implementingAgency}</Text>
                  )}
                </View>
              )}

              {/* Contact Information */}
              <View style={styles.schemeInfoSection}>
                <Text style={styles.schemeInfoLabel}>📞 Contact Information</Text>
                
                {formattedData.officialWebsite && (
                  <TouchableOpacity 
                    style={styles.contactLink}
                    onPress={() => openURL(formattedData.officialWebsite)}
                  >
                    <MaterialIcons name="language" size={20} color="#3b82f6" />
                    <Text style={styles.contactLinkText}>Official Website</Text>
                    <MaterialIcons name="launch" size={16} color="#3b82f6" />
                  </TouchableOpacity>
                )}

                {formattedData.helplineNumber && (
                  <TouchableOpacity 
                    style={styles.contactLink}
                    onPress={() => openURL(`tel:${formattedData.helplineNumber}`)}
                  >
                    <MaterialIcons name="phone" size={20} color="#22c55e" />
                    <Text style={styles.contactLinkText}>{formattedData.helplineNumber}</Text>
                    <MaterialIcons name="call" size={16} color="#22c55e" />
                  </TouchableOpacity>
                )}

                {formattedData.launchDate && (
                  <View style={styles.contactInfo}>
                    <MaterialIcons name="event" size={20} color="#888" />
                    <Text style={styles.contactInfoText}>Launched: {formattedData.launchDate}</Text>
                  </View>
                )}

                {formattedData.applicableRegion && (
                  <View style={styles.contactInfo}>
                    <MaterialIcons name="location-on" size={20} color="#888" />
                    <Text style={styles.contactInfoText}>Region: {formattedData.applicableRegion}</Text>
                  </View>
                )}
              </View>

              {/* Action Buttons */}
              <View style={styles.schemeActions}>
                <TouchableOpacity 
                  style={styles.applySchemeBtn}
                  onPress={() => {
                    setShowSchemeModal(false);
                    setSelectedSchemeContext(selectedScheme);
                    setMode('ai-chat');
                  }}
                >
                  <MaterialIcons name="psychology" size={20} color="#fff" />
                  <Text style={styles.applySchemeText}>Ask AI Assistant</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.generateDocBtn}
                  onPress={() => {
                    setShowSchemeModal(false);
                    setSelectedSchemeForApplication(selectedScheme);
                    setMode('application');
                  }}
                >
                  <MaterialIcons name="description" size={20} color="#fff" />
                  <Text style={styles.generateDocText}>Start Application</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  // Document type modal
  const renderDocumentTypeModal = () => (
    <Modal
      visible={showDocumentTypes}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowDocumentTypes(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Document Type</Text>
            <TouchableOpacity onPress={() => setShowDocumentTypes(false)}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.documentTypeList}>
            {documentTypes.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.documentTypeItem,
                  farmerData.document_type === type.value && styles.selectedDocumentType
                ]}
                onPress={() => {
                  setFarmerData(prev => ({ ...prev, document_type: type.value }));
                  setShowDocumentTypes(false);
                }}
              >
                <Text style={styles.documentTypeLabel}>{type.label}</Text>
                <Text style={styles.documentTypeDesc}>{type.desc}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerText}>🤖 AI Farming Assistant</Text>
        <TouchableOpacity onPress={() => {
          setChatHistory([chatHistory[0]]);
          setGeneratedDoc(null);
          setError(null);
          setSessionId(null);
        }}>
          <Ionicons name="refresh" size={24} color="#facc15" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContainer}>
        {/* Government Schemes Carousel */}
        {renderSchemesCarousel()}
        
        {/* Mode Selection */}
        {renderModeSelection()}
        
        {/* Farmer Form - only show in direct mode */}
        {mode === 'direct' && renderFarmerForm()}
        
        {/* Content based on mode */}
        {mode === 'ai-chat' ? renderAIChatMode() : 
         mode === 'application' ? renderApplicationZone() : 
         renderDirectMode()}
        
        {/* Generated Document Info */}
        {generatedDoc && (
          <View style={styles.docInfo}>
            <Text style={styles.docInfoTitle}>📄 Generated Document</Text>
            <Text style={styles.docInfoText}>📁 {generatedDoc.filename}</Text>
            <Text style={styles.docInfoText}>📊 {generatedDoc.format.toUpperCase()}</Text>
            <Text style={styles.docInfoText}>🕒 {new Date(generatedDoc.generated_at).toLocaleString()}</Text>
            
            <TouchableOpacity 
              style={styles.downloadBtn}
              onPress={() => downloadDocument(generatedDoc.document_id)}
            >
              <Feather name="download" size={20} color="#fff" />
              <Text style={styles.downloadBtnText}>📥 Download</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Error Display */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>❌ {error}</Text>
          </View>
        )}
      </ScrollView>
      
      {/* Modals */}
      {renderFilterSort()}
      {renderSchemeModal()}
      {renderDocumentTypeModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    justifyContent: 'space-between',
  },
  headerText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  backButton: {
    padding: 4,
  },
  scrollContainer: {
    flex: 1,
  },
  // Government schemes carousel - New compact design
  schemesContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  schemesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  filterModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22c55e20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#22c55e40',
  },
  filterModalText: {
    color: '#22c55e',
    marginLeft: 4,
    fontSize: 13,
    fontWeight: '600',
  },
  schemesScroll: {
    paddingLeft: 16,
  },
  schemesScrollContent: {
    paddingRight: 16,
  },
  scrollIndicator: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  scrollIndicatorText: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  noSchemesContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#333',
    width: 200,
  },
  noSchemesText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  resetFilterBtn: {
    backgroundColor: '#22c55e',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  resetFilterText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  schemeCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 12,
    marginRight: 12,
    width: 180,
    minHeight: 160,
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  schemeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  schemeTitle: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 4,
  },
  schemeTypeTag: {
    backgroundColor: '#333',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  schemeTypeText: {
    fontSize: 12,
  },
  schemeBenefit: {
    color: '#3b82f6',
    fontSize: 11,
    fontWeight: '600',
    backgroundColor: '#3b82f620',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  schemeDesc: {
    color: '#ccc',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  // Quick Action Buttons in Scheme Cards
  schemeQuickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    flex: 0.48,
    justifyContent: 'center',
  },
  quickActionText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
  schemeFooter: {
    alignItems: 'flex-end',
  },
  learnMore: {
    color: '#3b82f6',
    fontSize: 11,
    fontWeight: '600',
  },
  // Filter Modal Styles
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  filterModalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#333',
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  filterModalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  filterModalBody: {
    maxHeight: 400,
  },
  filterModalSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  filterModalSectionTitle: {
    color: '#22c55e',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  filterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterGridItem: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
    minWidth: '30%',
    justifyContent: 'center',
  },
  filterGridItemActive: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  filterGridIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  filterGridText: {
    color: '#ccc',
    fontSize: 13,
    fontWeight: '500',
  },
  filterGridTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  sortGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sortGridItem: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
    minWidth: '45%',
    justifyContent: 'center',
  },
  sortGridItemActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  sortGridIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  sortGridText: {
    color: '#ccc',
    fontSize: 13,
    fontWeight: '500',
  },
  sortGridTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  filterResultsSummary: {
    padding: 20,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
  },
  filterResultsText: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
  },
  filterModalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  filterResetBtn: {
    flex: 1,
    backgroundColor: '#666',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  filterResetText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  filterApplyBtn: {
    flex: 2,
    backgroundColor: '#22c55e',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  filterApplyText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Mode selection
  modeSelection: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
    padding: 4,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  modeActive: {
    backgroundColor: '#22c55e',
  },
  modeText: {
    color: '#666',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  modeActiveText: {
    color: '#fff',
  },
  // Farmer form
  formContainer: {
    margin: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  subtitle: {
    color: '#888',
    fontSize: 14,
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#2a2a2a',
    color: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
    fontSize: 16,
  },
  addressInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  documentTypeBtn: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  documentTypeText: {
    color: '#fff',
    fontSize: 16,
    flex: 1,
  },
  // AI Chat
  aiChatContainer: {
    margin: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    height: 400,
  },
  // Scheme Context Indicator
  schemeContextIndicator: {
    backgroundColor: '#22c55e10',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#22c55e',
  },
  schemeContextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  schemeContextTitle: {
    color: '#22c55e',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    marginLeft: 6,
  },
  removeContextBtn: {
    padding: 2,
  },
  schemeContextDesc: {
    color: '#999',
    fontSize: 11,
    marginTop: 4,
  },
  chatArea: {
    flex: 1,
    marginBottom: 16,
  },
  chatBubble: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    maxWidth: '85%',
  },
  userBubble: {
    backgroundColor: '#2563eb',
    alignSelf: 'flex-end',
  },
  assistantBubble: {
    backgroundColor: '#2a2a2a',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#333',
  },
  chatText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
  suggestedActions: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  actionBtn: {
    backgroundColor: '#22c55e20',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 4,
  },
  actionText: {
    color: '#22c55e',
    fontSize: 12,
    fontWeight: '500',
  },
  loadingMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  loadingText: {
    color: '#888',
    marginLeft: 8,
    fontSize: 14,
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 12,
  },
  chatInputWrapper: {
    flex: 1,
    marginRight: 8,
  },
  chatInputHelper: {
    color: '#22c55e',
    fontSize: 12,
    marginBottom: 6,
    paddingHorizontal: 4,
    fontStyle: 'italic',
  },
  chatInput: {
    backgroundColor: '#2a2a2a',
    color: '#fff',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#333',
    fontSize: 14,
    lineHeight: 20,
  },
  chatInputWithHelper: {
    minHeight: 80,
  },
  sendBtn: {
    backgroundColor: '#22c55e',
    borderRadius: 20,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#666',
  },
  // Direct mode
  directContainer: {
    margin: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
  },
  selectedDocTypeInfo: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  selectedDocTypeLabel: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  selectedDocTypeValue: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  selectedDocTypeDesc: {
    color: '#ccc',
    fontSize: 13,
  },
  generateBtn: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  
  // Application Zone Styles
  applicationContainer: {
    margin: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    minHeight: 400,
  },
  applicationPrompt: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  promptTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  promptDesc: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  schemeHeader: {
    marginBottom: 16,
  },
  backToSchemesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  backToSchemesText: {
    color: '#3b82f6',
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '600',
  },
  documentsGrid: {
    gap: 12,
  },
  documentCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  documentLabel: {
    color: '#22c55e',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  documentDesc: {
    color: '#ccc',
    fontSize: 13,
    marginBottom: 8,
  },
  documentFieldCount: {
    color: '#888',
    fontSize: 11,
    marginBottom: 12,
  },
  documentFooter: {
    alignItems: 'flex-end',
  },
  selectDocText: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: '600',
  },
  applicationHeader: {
    marginBottom: 16,
  },
  backToDocsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  backToDocsText: {
    color: '#3b82f6',
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '600',
  },
  applicationForm: {
    flex: 1,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  requiredStar: {
    color: '#ef4444',
  },
  applicationInput: {
    backgroundColor: '#2a2a2a',
    color: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#333',
    fontSize: 14,
  },
  textAreaInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  selectField: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#333',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectFieldText: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  placeholderText: {
    color: '#666',
  },
  generateApplicationBtn: {
    backgroundColor: '#22c55e',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  generateApplicationText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  // Document info
  docInfo: {
    margin: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  docInfoTitle: {
    color: '#22c55e',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  docInfoText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 4,
  },
  downloadBtn: {
    backgroundColor: '#22c55e',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  downloadBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  errorContainer: {
    margin: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f87171',
  },
  errorText: {
    color: '#f87171',
    fontSize: 14,
    textAlign: 'center',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    margin: 20,
    maxHeight: '80%',
    width: '90%',
  },
  schemeModalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    margin: 20,
    maxHeight: '70%',
    width: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  schemeDetails: {
    padding: 20,
  },
  schemeTypeBadge: {
    backgroundColor: '#22c55e20',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  schemeTypeBadgeText: {
    color: '#22c55e',
    fontSize: 12,
    fontWeight: '600',
  },
  schemeInfoSection: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  schemeInfoLabel: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  schemeInfoValue: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 22,
  },
  schemeInfoBullet: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 4,
  },
  contactLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f620',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  contactLinkText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginLeft: 8,
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  contactInfoText: {
    color: '#ccc',
    fontSize: 14,
    marginLeft: 8,
  },
  schemeActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  generateDocBtn: {
    flex: 1,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateDocText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  schemeFullDesc: {
    color: '#ccc',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  applySchemeBtn: {
    flex: 1,
    backgroundColor: '#22c55e',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  applySchemeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  documentTypeList: {
    maxHeight: 400,
  },
  documentTypeItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  selectedDocumentType: {
    backgroundColor: '#22c55e20',
    borderLeftWidth: 4,
    borderLeftColor: '#22c55e',
  },
  documentTypeLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  documentTypeDesc: {
    color: '#888',
    fontSize: 14,
  },
});
