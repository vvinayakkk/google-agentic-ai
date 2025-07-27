import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import suicidePreventionService from '../services/SuicidePreventionService';

const { width, height } = Dimensions.get('window');

const SuicidePrevention = ({ navigation }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [helplineData, setHelplineData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [serviceStatus, setServiceStatus] = useState('checking');

  // Default helpline data (fallback)
  const defaultHelplineData = [
    {
      id: 1,
      name: 'National Crisis Helpline',
      number: '988',
      description: '24/7 Suicide Prevention Lifeline',
      icon: 'phone',
      color: '#ef4444',
    },
    {
      id: 2,
      name: 'Crisis Text Line',
      number: '741741',
      description: 'Text HOME to connect with a counselor',
      icon: 'message-text',
      color: '#3b82f6',
    },
    {
      id: 3,
      name: 'Vandrevala Foundation',
      number: '1860-266-2345',
      description: 'Mental health support in India',
      icon: 'heart',
      color: '#10b981',
    },
    {
      id: 4,
      name: 'iCall Helpline',
      number: '022-25521111',
      description: 'Professional counseling support',
      icon: 'account-tie',
      color: '#8b5cf6',
    },
    {
      id: 5,
      name: 'Sneha Foundation',
      number: '044-24640050',
      description: '24/7 emotional support',
      icon: 'hand-heart',
      color: '#f59e0b',
    },
    {
      id: 6,
      name: 'AASRA',
      number: '9820466726',
      description: 'Suicide prevention and counseling',
      icon: 'shield',
      color: '#ec4899',
    },
  ];

  const handleCall = async (number, name) => {
    setLoading(true);
    try {
      // Try to use the backend service first
      await suicidePreventionService.handleEmergencyCall(number, name);
    } catch (error) {
      console.error('Backend call failed, falling back to direct call:', error);
      // Fallback to direct call
      Alert.alert(
        'Make a Call',
        `Call ${name} at ${number}?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Call',
            onPress: () => {
              Linking.openURL(`tel:${number}`);
            },
          },
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  // Load helpline data from backend on component mount
  useEffect(() => {
    loadHelplineData();
    checkServiceStatus();
  }, []);

  const loadHelplineData = async () => {
    try {
      const response = await suicidePreventionService.getHelplines();
      if (response.success && response.helplines) {
        setHelplineData(response.helplines);
      } else {
        setHelplineData(defaultHelplineData);
      }
    } catch (error) {
      console.error('Error loading helpline data:', error);
      setHelplineData(defaultHelplineData);
    }
  };

  const checkServiceStatus = async () => {
    try {
      await suicidePreventionService.healthCheck();
      setServiceStatus('connected');
    } catch (error) {
      console.error('Service health check failed:', error);
      setServiceStatus('disconnected');
    }
  };

  const handleEmergencyCall = async () => {
    setLoading(true);
    try {
      // Use the service to handle the emergency call
      await suicidePreventionService.handleEmergencyCall('100', 'Emergency Services');
    } catch (error) {
      console.error('Emergency call failed:', error);
      // Fallback to direct call
      Alert.alert(
        'Emergency Call',
        'Call emergency services (100)?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Call Emergency',
            style: 'destructive',
            onPress: () => {
              Linking.openURL('tel:100');
            },
          },
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const HelplineCard = ({ item }) => (
    <TouchableOpacity
      style={[styles.helplineCard, { borderLeftColor: item.color }]}
      onPress={() => handleCall(item.number, item.name)}
      activeOpacity={0.8}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
          <MaterialCommunityIcons name={item.icon} size={24} color="white" />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.cardDescription}>{item.description}</Text>
        </View>
        <TouchableOpacity
          style={[styles.callButton, { backgroundColor: item.color }]}
          onPress={() => handleCall(item.number, item.name)}
        >
          <Ionicons name="call" size={20} color="white" />
        </TouchableOpacity>
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.phoneNumber}>{item.number}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#22c55e" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Suicide Prevention</Text>
        <TouchableOpacity
          style={styles.emergencyButton}
          onPress={handleEmergencyCall}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#22c55e" />
          ) : (
            <Ionicons name="call" size={24} color="#22c55e" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Emergency Banner */}
        <View style={styles.emergencyBanner}>
          <MaterialCommunityIcons name="alert-circle" size={32} color="#22c55e" />
          <View style={styles.bannerText}>
            <Text style={styles.bannerTitle}>Need Immediate Help?</Text>
            <Text style={styles.bannerSubtitle}>
              Call 988 for 24/7 crisis support
            </Text>
          </View>
          <TouchableOpacity
            style={styles.bannerCallButton}
            onPress={() => handleCall('988', 'Crisis Helpline')}
          >
            <Ionicons name="call" size={20} color="black" />
          </TouchableOpacity>
        </View>

        {/* Information Section */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>You're Not Alone</Text>
          <Text style={styles.infoText}>
            If you're having thoughts of suicide or need emotional support, 
            these helplines are here to help you 24/7. All conversations are 
            confidential and free of charge.
          </Text>
        </View>

        {/* Service Status Indicator */}
        <View style={styles.statusSection}>
          <View style={[styles.statusIndicator, { backgroundColor: serviceStatus === 'connected' ? '#22c55e' : '#ef4444' }]}>
            <Text style={styles.statusText}>
              {serviceStatus === 'connected' ? 'Connected to Emergency Services' : 'Emergency Services Unavailable'}
            </Text>
          </View>
        </View>

        {/* Helpline Cards */}
        <View style={styles.helplinesSection}>
          <Text style={styles.sectionTitle}>Professional Helplines</Text>
          {helplineData.map((item) => (
            <HelplineCard key={item.id} item={item} />
          ))}
        </View>

        {/* Resources Section */}
        <View style={styles.resourcesSection}>
          <Text style={styles.sectionTitle}>Additional Resources</Text>
          
          <TouchableOpacity style={styles.resourceCard}>
            <MaterialCommunityIcons name="web" size={24} color="#22c55e" />
            <View style={styles.resourceInfo}>
              <Text style={styles.resourceTitle}>Online Support Groups</Text>
              <Text style={styles.resourceDescription}>
                Connect with others who understand
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#22c55e" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.resourceCard}>
            <MaterialCommunityIcons name="book-open-variant" size={24} color="#22c55e" />
            <View style={styles.resourceInfo}>
              <Text style={styles.resourceTitle}>Mental Health Resources</Text>
              <Text style={styles.resourceDescription}>
                Educational materials and guides
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#22c55e" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.resourceCard}>
            <MaterialCommunityIcons name="hospital-building" size={24} color="#22c55e" />
            <View style={styles.resourceInfo}>
              <Text style={styles.resourceTitle}>Find Local Services</Text>
              <Text style={styles.resourceDescription}>
                Mental health professionals near you
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#22c55e" />
          </TouchableOpacity>
        </View>

        {/* Important Notice */}
        <View style={styles.noticeSection}>
          <MaterialCommunityIcons name="information" size={24} color="#22c55e" />
          <Text style={styles.noticeText}>
            If you're in immediate danger, please call emergency services (100) 
            or go to the nearest emergency room.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#22c55e',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#22c55e',
  },
  emergencyButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emergencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#22c55e',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    marginBottom: 24,
  },
  bannerText: {
    flex: 1,
    marginLeft: 12,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#22c55e',
  },
  bannerSubtitle: {
    fontSize: 14,
    color: '#4ade80',
    marginTop: 2,
  },
  bannerCallButton: {
    backgroundColor: '#22c55e',
    padding: 12,
    borderRadius: 8,
  },
  infoSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#22c55e',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 16,
    color: '#d1d5db',
    lineHeight: 24,
  },
  helplinesSection: {
    marginBottom: 24,
  },
  helplineCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f3f4f6',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#9ca3af',
  },
  callButton: {
    padding: 12,
    borderRadius: 8,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#374151',
    paddingTop: 12,
  },
  phoneNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#22c55e',
    textAlign: 'center',
  },
  resourcesSection: {
    marginBottom: 24,
  },
  resourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  resourceInfo: {
    flex: 1,
    marginLeft: 12,
  },
  resourceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f3f4f6',
    marginBottom: 4,
  },
  resourceDescription: {
    fontSize: 14,
    color: '#9ca3af',
  },
  noticeSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#22c55e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  noticeText: {
    flex: 1,
    fontSize: 14,
    color: '#4ade80',
    marginLeft: 12,
    lineHeight: 20,
  },
  statusSection: {
    marginBottom: 24,
  },
  statusIndicator: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
});

export default SuicidePrevention; 