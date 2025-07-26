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
  Linking,
  Modal,
  FlatList
} from 'react-native';
import { Ionicons, Feather, MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { NetworkConfig } from '../utils/NetworkConfig';
import MicOverlay from '../components/MicOverlay';

// Use the main backend API base URL
const API_BASE = NetworkConfig.API_BASE;

export default function DocumentAgentScreen({ navigation }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // AI Chat states
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([
    { 
      role: 'assistant', 
      message: '🤖 Hello! I\'m your smart document assistant. I can help you:\n\n✅ Find the right government scheme for your needs\n✅ Generate applications automatically\n✅ Answer questions about eligibility and benefits\n✅ Guide you through the application process\n\nTell me what kind of help you need or which scheme interests you!'
    }
  ]);
  const [sessionId, setSessionId] = useState(null);
  const [selectedSchemeContext, setSelectedSchemeContext] = useState(null);
  const [documentInProgress, setDocumentInProgress] = useState(null);
  const [collectedFields, setCollectedFields] = useState({});
  const [waitingForUserInput, setWaitingForUserInput] = useState(false);
  
  // Government schemes data
  const [schemes, setSchemes] = useState([]);
  const [allSchemes, setAllSchemes] = useState([]);
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [showSchemeModal, setShowSchemeModal] = useState(false);
  const [schemeLoading, setSchemeLoading] = useState(false);
  
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
  
  // Document generation states
  const [generatedDoc, setGeneratedDoc] = useState(null);

  
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

  // Smart AI Chat function with automatic document generation
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
      // Create FormData for the request (backend expects form data, not JSON)
      const formData = new FormData();
      formData.append('message', currentMessage);
      
      if (sessionId) {
        formData.append('session_id', sessionId);
      }
      
      // Include collected fields and document context if available
      let contextData = {
        collected_fields: collectedFields,
        document_in_progress: documentInProgress,
        waiting_for_input: waitingForUserInput
      };
      
      // Add scheme context if available
      if (selectedSchemeContext) {
        const formattedSchemeData = formatSchemeContent(selectedSchemeContext);
        contextData.scheme_context = {
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
      
      if (Object.keys(contextData).length > 0) {
        formData.append('farmer_data', JSON.stringify(contextData));
      }

      const response = await fetch(`${API_BASE}/api/v1/document-builder/chat`, {
        method: 'POST',
        body: formData
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

        // Handle automatic document generation workflow
        if (result.should_generate_document) {
          // Check if we have all required fields
          const hasRequiredFields = checkIfHasRequiredFields(result.suggested_document_type, currentMessage);
          
          if (hasRequiredFields) {
            // Generate document automatically
            setTimeout(() => generateDocumentAutomatically(result.suggested_document_type, currentMessage), 1000);
          } else {
            // Start collecting required fields
            setDocumentInProgress(result.suggested_document_type);
            setWaitingForUserInput(true);
            
            // AI will ask for missing fields in next response
            setTimeout(() => {
              setChatHistory(prev => [...prev, { 
                role: 'assistant', 
                message: `I can help you generate a ${result.suggested_document_type ? result.suggested_document_type.replace('_', ' ') : 'document'}. Let me collect some information from you first.` 
              }]);
            }, 1000);
          }
        }

        // Handle field collection from user response
        if (waitingForUserInput && documentInProgress) {
          const extractedFields = extractFieldsFromMessage(currentMessage);
          if (Object.keys(extractedFields).length > 0) {
            setCollectedFields(prev => ({ ...prev, ...extractedFields }));
            
            // Check if we have enough fields to generate document
            if (hasAllRequiredFields(documentInProgress, { ...collectedFields, ...extractedFields })) {
              setWaitingForUserInput(false);
              setTimeout(() => generateDocumentAutomatically(documentInProgress, ''), 1500);
            }
          }
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

  // Check if message contains required fields for document generation
  const checkIfHasRequiredFields = (documentType, message) => {
    const lowerMessage = message.toLowerCase();
    
    // Basic field checks
    const hasName = /name|naam|नाम/.test(lowerMessage) || /my name is|i am|मैं हूं/.test(lowerMessage);
    const hasContact = /\d{10}/.test(message) || /phone|mobile|contact/.test(lowerMessage);
    
    return hasName; // Minimum requirement
  };

  // Extract fields from user message using regex and keywords
  const extractFieldsFromMessage = (message) => {
    const fields = {};
    const lowerMessage = message.toLowerCase();
    
    // Extract name
    const nameMatch = message.match(/(?:my name is|i am|नाम है)\s+([a-zA-Z\s]+)/i);
    if (nameMatch) {
      fields.farmer_name = nameMatch[1].trim();
    }
    
    // Extract phone number
    const phoneMatch = message.match(/(\d{10})/);
    if (phoneMatch) {
      fields.contact_number = phoneMatch[1];
    }
    
    // Extract Aadhaar
    const aadhaarMatch = message.match(/(\d{12})/);
    if (aadhaarMatch && aadhaarMatch[1] !== fields.contact_number) {
      fields.aadhaar_number = aadhaarMatch[1];
    }
    
    // Extract address
    if (lowerMessage.includes('address') || lowerMessage.includes('पता')) {
      const addressMatch = message.match(/(?:address|पता)[\s:]+([^,]+)/i);
      if (addressMatch) {
        fields.address = addressMatch[1].trim();
      }
    }
    
    return fields;
  };

  // Check if we have all required fields for document generation
  const hasAllRequiredFields = (documentType, collectedFields) => {
    // Minimum requirement: name
    return collectedFields.farmer_name && collectedFields.farmer_name.trim().length > 0;
  };

  // Generate document automatically based on collected information
  const generateDocumentAutomatically = async (documentType, userMessage) => {
    setLoading(true);

    try {
      // Combine collected fields with any additional info from message
      const extractedFields = extractFieldsFromMessage(userMessage);
      const allFields = { ...collectedFields, ...extractedFields };
      
      // Ensure we have minimum required data
      if (!allFields.farmer_name) {
        setChatHistory(prev => [...prev, { 
          role: 'assistant', 
          message: '❌ I need at least your name to generate the document. Please provide your full name.' 
        }]);
        setLoading(false);
        return;
      }

      // Generate comprehensive context from chat history
      const chatContext = chatHistory
        .filter(msg => msg.role === 'user')
        .slice(-5) // Last 5 user messages
        .map(msg => msg.message)
        .join(' ');

      const response = await fetch(`${API_BASE}/api/v1/document-builder/generate-pdf-with-ai-json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          farmer_name: allFields.farmer_name,
          user_question: chatContext + ' ' + userMessage,
          aadhaar_number: allFields.aadhaar_number || '',
          contact_number: allFields.contact_number || '',
          address: allFields.address || '',
          document_type: documentType || 'general_application',
          format_type: 'pdf',
          scheme_context: selectedSchemeContext ? {
            scheme_name: selectedSchemeContext.scheme_name,
            scheme_type: selectedSchemeContext.scheme_type
          } : null
        })
      });

      if (!response.ok) {
        throw new Error('Document generation failed');
      }

      const result = await response.json();
      
      if (result.success) {
        setGeneratedDoc(result);
        
        // Add success message to chat with download option
        setChatHistory(prev => [...prev, { 
          role: 'assistant', 
          message: `🎉 Perfect! I've generated your document automatically!\n\n📄 Document: ${result.filename}\n👤 Name: ${allFields.farmer_name}\n📞 Contact: ${allFields.contact_number || 'Not provided'}\n\n✅ Your ${documentType ? documentType.replace('_', ' ') : 'document'} is ready for download!`,
          generated_document: result
        }]);
        
        // Reset document generation states
        setDocumentInProgress(null);
        setCollectedFields({});
        setWaitingForUserInput(false);
        
        // Show download option
        setTimeout(() => {
          Alert.alert(
            '🎉 Document Generated!', 
            `Your ${documentType ? documentType.replace('_', ' ') : 'document'} has been created successfully!\n\nFile: ${result.filename}`,
            [
              { text: 'Great!', style: 'default' },
              { text: '📥 Download Now', onPress: () => downloadDocument(result.document_id) }
            ]
          );
        }, 1000);
      }
    } catch (err) {
      setError(err.message);
      setChatHistory(prev => [...prev, { 
        role: 'assistant', 
        message: `❌ I couldn't generate the document automatically: ${err.message}. Let me try a different approach. Can you provide your basic details again?` 
      }]);
      
      // Reset states on error
      setDocumentInProgress(null);
      setCollectedFields({});
      setWaitingForUserInput(false);
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
        Alert.alert('Error', 'Cannot open document');
      }
    } catch (err) {
      Alert.alert('Error', 'Download failed');
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
                      {filter.label ? filter.label.replace(/🏛️|🇮🇳|🌾|🏥|🏠|💼|📚/g, '').trim() : 'Filter'}
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
                      {sort.label ? sort.label.replace(/📝|🏛️|💰/g, '').trim() : 'Sort'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Results Summary */}
            <View style={styles.filterResultsSummary}>
              <Text style={styles.filterResultsText}>
                📊 Showing {schemes.length} schemes
                {selectedFilter !== 'all' && ` in ${filterOptions.find(f => f.value === selectedFilter)?.label?.replace(/🏛️|🇮🇳|🌾|🏥|🏠|💼|📚/g, '').trim() || 'category'}`}
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

  // Render government schemes carousel with bigger cards
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
        snapToInterval={280} // Increased for bigger cards
        snapToAlignment="start"
      >
        {schemes.length > 0 ? schemes.map((scheme, index) => (
          <TouchableOpacity
            key={index}
            style={styles.bigSchemeCard} // New bigger card style
            onPress={() => {
              setSelectedScheme(scheme);
              setShowSchemeModal(true);
            }}
          >
            <View style={styles.schemeCardHeader}>
              <Text style={styles.bigSchemeTitle} numberOfLines={2}>{scheme.scheme_name}</Text>
              <View style={styles.schemeTypeTag}>
                <Text style={styles.schemeTypeText}>
                  {scheme.scheme_type === 'central_government' ? '🇮🇳' : 
                   scheme.scheme_type === 'maharashtra_state' ? '🏛️' : 
                   scheme.scheme_type === 'crop_specific' ? '🌾' : '📋'}
                </Text>
              </View>
            </View>
            
            {scheme.metadata?.key_benefit && (
              <View style={styles.benefitContainer}>
                <Text style={styles.benefitLabel}>Key Benefit:</Text>
                <Text style={styles.schemeBenefit}>{scheme.metadata.key_benefit}</Text>
              </View>
            )}
            
            <Text style={styles.bigSchemeDesc} numberOfLines={3}>
              {scheme.content || scheme.label || 'Government scheme for citizens'}
            </Text>
            
            {/* Contact Information */}
            <View style={styles.contactInfo}>
              {(scheme.metadata?.helpline_number || scheme.raw_data?.helplineNumber) && (
                <View style={styles.contactItem}>
                  <MaterialIcons name="phone" size={14} color="#22c55e" />
                  <Text style={styles.contactText}>
                    {scheme.metadata?.helpline_number || scheme.raw_data?.helplineNumber}
                  </Text>
                </View>
              )}
              {(scheme.metadata?.official_website || scheme.raw_data?.officialWebsite) && (
                <View style={styles.contactItem}>
                  <MaterialIcons name="language" size={14} color="#3b82f6" />
                  <Text style={styles.contactText} numberOfLines={1}>Website</Text>
                </View>
              )}
            </View>
            
            {/* Enhanced Action Buttons */}
            <View style={styles.bigSchemeActions}>
              <TouchableOpacity 
                style={styles.bigActionBtn}
                onPress={(e) => {
                  e.stopPropagation();
                  setSelectedSchemeContext(scheme);
                  setChatHistory(prev => [...prev, { 
                    role: 'assistant', 
                    message: `Great! I now have detailed information about ${scheme.scheme_name}. How can I help you with this scheme? I can:\n\n• Explain eligibility criteria\n• Help you apply\n• Generate required documents\n• Answer any questions\n\nWhat would you like to know?` 
                  }]);
                }}
              >
                <MaterialIcons name="psychology" size={18} color="#fff" />
                <Text style={styles.bigActionText}>Ask AI</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.bigActionBtn, styles.applyBtn]}
                onPress={(e) => {
                  e.stopPropagation();
                  setSelectedSchemeContext(scheme);
                  setChatMessage(`I want to apply for ${scheme.scheme_name}. Can you help me generate the required documents?`);
                }}
              >
                <MaterialIcons name="description" size={18} color="#fff" />
                <Text style={styles.bigActionText}>Apply Now</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={styles.viewDetailsBtn}
              onPress={() => {
                setSelectedScheme(scheme);
                setShowSchemeModal(true);
              }}
            >
              <Text style={styles.viewDetailsText}>View Full Details →</Text>
            </TouchableOpacity>
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
      
      {schemes.length > 2 && (
        <View style={styles.scrollIndicator}>
          <Text style={styles.scrollIndicatorText}>← Scroll to see more schemes →</Text>
        </View>
      )}
    </View>
  );

  // Render enhanced AI chat interface
  const renderAIChatInterface = () => (
    <View style={styles.aiChatContainer}>
      {/* Scheme Context Indicator */}
      {selectedSchemeContext && (
        <View style={styles.schemeContextIndicator}>
          <View style={styles.schemeContextHeader}>
            <MaterialIcons name="info" size={16} color="#22c55e" />
            <Text style={styles.schemeContextTitle}>Active Context: {selectedSchemeContext.scheme_name}</Text>
            <TouchableOpacity 
              onPress={() => setSelectedSchemeContext(null)}
              style={styles.removeContextBtn}
            >
              <Ionicons name="close-circle" size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>
          <Text style={styles.schemeContextDesc}>
            I have detailed information about this scheme and can help you apply or generate documents
          </Text>
        </View>
      )}

      {/* Document Generation Status */}
      {documentInProgress && (
        <View style={styles.documentProgress}>
          <MaterialIcons name="description" size={16} color="#3b82f6" />
          <Text style={styles.documentProgressText}>
            Preparing {documentInProgress ? documentInProgress.replace('_', ' ') : 'document'}...
          </Text>
          {waitingForUserInput && (
            <Text style={styles.documentProgressSubtext}>
              Please provide the requested information
            </Text>
          )}
        </View>
      )}

      {/* Chat History */}
      <ScrollView 
        style={styles.chatArea} 
        contentContainerStyle={{ paddingBottom: 20 }}
        ref={chatScrollRef}
        onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}
      >
        {chatHistory.map((msg, idx) => (
          <View key={idx} style={[
            styles.chatBubble, 
            msg.role === 'user' ? styles.userBubble : styles.assistantBubble
          ]}>
            <Text style={styles.chatText}>{msg.message}</Text>
            
            {/* Show download button if message contains generated document */}
            {msg.generated_document && (
              <TouchableOpacity 
                style={styles.downloadBtn}
                onPress={() => downloadDocument(msg.generated_document.document_id)}
              >
                <MaterialIcons name="download" size={20} color="#fff" />
                <Text style={styles.downloadBtnText}>Download PDF</Text>
              </TouchableOpacity>
            )}
            
            {/* Show context schemes if available */}
            {msg.context_schemes && msg.context_schemes.length > 0 && (
              <View style={styles.contextSchemes}>
                <Text style={styles.contextSchemesTitle}>Related Schemes:</Text>
                {msg.context_schemes.map((schemeName, idx) => (
                  <Text key={idx} style={styles.contextSchemeItem}>• {schemeName}</Text>
                ))}
              </View>
            )}
            
            {/* Show suggested actions */}
            {msg.suggested_actions && msg.suggested_actions.length > 0 && (
              <View style={styles.suggestedActions}>
                <Text style={styles.suggestedActionsTitle}>Quick Actions:</Text>
                {msg.suggested_actions.map((action, actionIdx) => (
                  <TouchableOpacity 
                    key={actionIdx} 
                    style={styles.actionBtn}
                    onPress={() => setChatMessage(action)}
                  >
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
            <Text style={styles.loadingText}>
              {documentInProgress ? 'Generating your document...' : 'AI is thinking...'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Enhanced Chat Input */}
      <View style={styles.chatInputContainer}>
        <View style={styles.chatInputWrapper}>
          <TextInput
            style={styles.chatInput}
            value={chatMessage}
            onChangeText={setChatMessage}
            placeholder={
              documentInProgress 
                ? "Provide the requested information..." 
                : selectedSchemeContext 
                  ? `Ask about ${selectedSchemeContext.scheme_name} or request documents...` 
                  : "Ask me about schemes, eligibility, or say 'I want to apply for...'"
            }
            placeholderTextColor="#666"
            multiline
            maxLength={1000}
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

      {/* Quick Suggestions */}
      {chatHistory.length <= 1 && !selectedSchemeContext && (
        <View style={styles.quickSuggestions}>
          <Text style={styles.suggestionsTitle}>💡 Try asking:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[
              "I want to apply for PM-KISAN",
              "Show me crop insurance schemes", 
              "I need a loan application",
              "Help me with housing schemes",
              "What documents do I need for KCC?"
            ].map((suggestion, idx) => (
              <TouchableOpacity 
                key={idx}
                style={styles.suggestionChip}
                onPress={() => setChatMessage(suggestion)}
              >
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );

  const chatScrollRef = useRef(null);

  // Format scheme content for better display
  const formatSchemeContent = (scheme) => {
    if (!scheme) return {
      description: 'No description available',
      keyBenefit: 'Not specified',
      ministry: '',
      primaryObjective: '',
      eligibility: '',
      applicationProcess: '',
      requiredDocuments: '',
      officialWebsite: '',
      helplineNumber: '',
      launchDate: '',
      applicableRegion: 'India',
      schemeType: 'Government Scheme',
      targetBeneficiaries: '',
      budgetAllocation: '',
      implementingAgency: ''
    };

    // Try multiple data sources - raw_data, metadata, or direct scheme properties
    const rawData = scheme.raw_data || scheme || {};
    const metadata = scheme.metadata || {};
    
    // Helper function to safely get string value and handle nulls
    const safeString = (value) => {
      if (value === null || value === undefined) return '';
      return String(value);
    };
    
    // Extract comprehensive information from all possible sources
    return {
      description: safeString(rawData.description || rawData.content || scheme.content || rawData.scheme_description || 'No description available'),
      keyBenefit: safeString(rawData.keyBenefit || rawData.key_benefit || metadata.key_benefit || rawData.benefit_amount || 'Not specified'),
      ministry: safeString(rawData.administeringMinistry || rawData.ministry || metadata.ministry || rawData.administering_ministry || ''),
      primaryObjective: safeString(rawData.primaryObjective || rawData.primary_objective || metadata.primary_objective || rawData.objective || ''),
      eligibility: safeString(rawData.eligibilityCriteria || rawData.eligibility_criteria || rawData.eligibility || rawData.target_beneficiaries || ''),
      applicationProcess: safeString(rawData.applicationProcess || rawData.application_process || rawData.how_to_apply || ''),
      requiredDocuments: safeString(rawData.requiredDocuments || rawData.required_documents || rawData.documents_required || ''),
      officialWebsite: safeString(rawData.officialWebsite || rawData.official_website || metadata.official_website || rawData.website || ''),
      helplineNumber: safeString(rawData.helplineNumber || rawData.helpline_number || metadata.helpline_number || rawData.contact_number || ''),
      launchDate: safeString(rawData.launchDate || rawData.launch_date || rawData.start_date || ''),
      applicableRegion: safeString(rawData.applicableRegion || rawData.applicable_region || metadata.applicable_region || rawData.coverage_area || 'India'),
      // Additional fields that might be present
      schemeType: safeString(rawData.scheme_type || scheme.scheme_type || 'Government Scheme'),
      targetBeneficiaries: safeString(rawData.targetBeneficiaries || rawData.target_beneficiaries || ''),
      budgetAllocation: safeString(rawData.budgetAllocation || rawData.budget_allocation || ''),
      implementingAgency: safeString(rawData.implementingAgency || rawData.implementing_agency || '')
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
                  {formattedData.description ? formattedData.description.replace(/\[cite:.*?\]/g, '').trim() : 'No description available'}
                </Text>
              </View>

              {/* Eligibility */}
              {formattedData.eligibility && (
                <View style={styles.schemeInfoSection}>
                  <Text style={styles.schemeInfoLabel}>✅ Eligibility</Text>
                  {Array.isArray(formattedData.eligibility) ? (
                    formattedData.eligibility.map((criteria, index) => (
                      <Text key={index} style={styles.schemeInfoBullet}>
                        • {criteria ? String(criteria).replace(/\[cite:.*?\]/g, '').trim() : ''}
                      </Text>
                    ))
                  ) : (
                    <Text style={styles.schemeInfoValue}>
                      {formattedData.eligibility ? formattedData.eligibility.replace(/\[cite:.*?\]/g, '').trim() : ''}
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
                        {index + 1}. {step ? String(step).replace(/\[cite:.*?\]/g, '').trim() : ''}
                      </Text>
                    ))
                  ) : (
                    <Text style={styles.schemeInfoValue}>
                      {formattedData.applicationProcess ? formattedData.applicationProcess.replace(/\[cite:.*?\]/g, '').trim() : ''}
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
                        • {doc ? String(doc).replace(/\[cite:.*?\]/g, '').trim() : ''}
                      </Text>
                    ))
                  ) : (
                    <Text style={styles.schemeInfoValue}>
                      {formattedData.requiredDocuments ? formattedData.requiredDocuments.replace(/\[cite:.*?\]/g, '').trim() : ''}
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
        <Text style={styles.headerText}>🤖 Smart Document Assistant</Text>
        <TouchableOpacity onPress={() => {
          setChatHistory([{
            role: 'assistant', 
            message: '🤖 Hello! I\'m your smart document assistant. I can help you:\n\n✅ Find the right government scheme for your needs\n✅ Generate applications automatically\n✅ Answer questions about eligibility and benefits\n✅ Guide you through the application process\n\nTell me what kind of help you need or which scheme interests you!'
          }]);
          setGeneratedDoc(null);
          setError(null);
          setSessionId(null);
          setSelectedSchemeContext(null);
          setDocumentInProgress(null);
          setCollectedFields({});
          setWaitingForUserInput(false);
        }}>
          <Ionicons name="refresh" size={24} color="#facc15" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContainer}>
        {/* Government Schemes Carousel */}
        {renderSchemesCarousel()}
        
        {/* AI Chat Interface */}
        {renderAIChatInterface()}
        
        {/* Generated Document Info */}
        {generatedDoc && (
          <View style={styles.docInfo}>
            <Text style={styles.docInfoTitle}>🎉 Document Generated Successfully!</Text>
            <Text style={styles.docInfoText}>📁 {generatedDoc.filename}</Text>
            <Text style={styles.docInfoText}>📊 {generatedDoc.format?.toUpperCase() || 'PDF'}</Text>
            <Text style={styles.docInfoText}>🕒 {new Date(generatedDoc.generated_at || Date.now()).toLocaleString()}</Text>
            
            <TouchableOpacity 
              style={styles.downloadDocBtn}
              onPress={() => downloadDocument(generatedDoc.document_id)}
            >
              <MaterialIcons name="download" size={20} color="#fff" />
              <Text style={styles.downloadDocText}>Download PDF</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Error Display */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>❌ {error}</Text>
            <TouchableOpacity 
              style={styles.errorRetryBtn}
              onPress={() => setError(null)}
            >
              <Text style={styles.errorRetryText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Filter Modal */}
      {renderFilterSort()}
      {/* Scheme Detail Modal */}
      {renderSchemeModal()}
      
      {/* Mic Overlay - UI only for now */}
      <MicOverlay 
        onPress={() => {
          // For now, just navigate to LiveVoiceScreen
          navigation.navigate('LiveVoiceScreen');
        }}
        isVisible={true}
        isActive={false}
      />
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
  
  // Bigger Scheme Cards
  bigSchemeCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginRight: 16,
    width: 260,
    minHeight: 220,
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  bigSchemeTitle: {
    color: '#22c55e',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
    lineHeight: 20,
  },
  benefitContainer: {
    backgroundColor: '#22c55e10',
    padding: 8,
    borderRadius: 8,
    marginVertical: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#22c55e',
  },
  benefitLabel: {
    color: '#22c55e',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  bigSchemeDesc: {
    color: '#ccc',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  contactInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  contactText: {
    color: '#ccc',
    fontSize: 11,
    marginLeft: 4,
  },
  bigSchemeActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  bigActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22c55e',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
  },
  applyBtn: {
    backgroundColor: '#3b82f6',
  },
  bigActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  viewDetailsBtn: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  viewDetailsText: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Enhanced Chat Styles
  documentProgress: {
    backgroundColor: '#3b82f610',
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  documentProgressText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  documentProgressSubtext: {
    color: '#3b82f6',
    fontSize: 12,
    marginLeft: 8,
    opacity: 0.8,
  },
  downloadBtn: {
    backgroundColor: '#22c55e',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  downloadBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  contextSchemes: {
    backgroundColor: '#22c55e10',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  contextSchemesTitle: {
    color: '#22c55e',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  contextSchemeItem: {
    color: '#ccc',
    fontSize: 11,
    marginLeft: 8,
  },
  suggestedActionsTitle: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    marginTop: 8,
  },
  quickSuggestions: {
    padding: 16,
    backgroundColor: '#1a1a1a',
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  suggestionsTitle: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  suggestionChip: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  suggestionText: {
    color: '#ccc',
    fontSize: 12,
  },
  downloadDocBtn: {
    backgroundColor: '#22c55e',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
    alignSelf: 'center',
  },
  downloadDocText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  errorContainer: {
    backgroundColor: '#ef444420',
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444',
    padding: 12,
    margin: 16,
    borderRadius: 8,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
  },
  errorRetryBtn: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  errorRetryText: {
    color: '#fff',
    fontSize: 12,
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
