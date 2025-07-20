import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  LayoutAnimation,
  UIManager,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function FarmerFriendlyScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [expandedSection, setExpandedSection] = useState(null);
  const [showAllFeatures, setShowAllFeatures] = useState(false);

  // Core daily features that farmers use most
  const quickActions = [
    {
      id: 'crop-doctor',
      icon: 'camera-outline',
      title: 'Crop Doctor',
      subtitle: 'Scan & diagnose diseases',
      gradient: ['#22c55e', '#16a34a'],
      urgent: true,
      onPress: () => navigation.navigate('CropDoctor'),
    },
    {
      id: 'market',
      icon: 'trending-up-outline',
      title: 'Market Prices',
      subtitle: "Today's mandi rates",
      gradient: ['#3b82f6', '#2563eb'],
      badge: '₹2,340/qtl',
      onPress: () => navigation.navigate('MarketplaceScreen'),
    },
    {
      id: 'calendar',
      icon: 'calendar-outline',
      title: 'Farm Calendar',
      subtitle: 'Today\'s tasks',
      gradient: ['#8b5cf6', '#7c3aed'],
      badge: '3 tasks',
      onPress: () => navigation.navigate('CalenderScreen'),
    }
  ];

  // Grouped secondary features
  const featureGroups = [
    {
      id: 'farm-management',
      title: 'Farm Management',
      icon: 'leaf-outline',
      gradient: ['#22c55e', '#16a34a'],
      features: [
        { 
          id: 'crop-cycle', 
          title: 'Crop Tracking', 
          icon: 'reload-circle-outline',
          onPress: () => navigation.navigate('CropCycle')
        },
        { 
          id: 'calendar-full', 
          title: 'Full Calendar', 
          icon: 'calendar-outline',
          onPress: () => navigation.navigate('CalenderScreen')
        }
      ]
    },
    {
      id: 'livestock',
      title: 'Livestock Care',
      icon: 'heart-outline',
      gradient: ['#f97316', '#ea580c'],
      features: [
        { 
          id: 'cattle-health', 
          title: 'Health Records', 
          icon: 'paw-outline',
          onPress: () => navigation.navigate('CattleScreen')
        },
        { 
          id: 'feeding', 
          title: 'Vaccination Schedule', 
          icon: 'medical-outline',
          onPress: () => navigation.navigate('CattleScreen')
        }
      ]
    },
    {
      id: 'business',
      title: 'Farm Business',
      icon: 'wallet-outline',
      gradient: ['#6366f1', '#4f46e5'],
      features: [
        { 
          id: 'finance', 
          title: 'Loans & Subsidies', 
          icon: 'wallet-outline',
          onPress: () => navigation.navigate('UPI')
        },
        { 
          id: 'documents', 
          title: 'Paperwork Helper', 
          icon: 'document-text-outline',
          onPress: () => console.log('Document Builder Pressed')
        }
      ]
    },
    {
      id: 'equipment',
      title: 'Equipment & Tools',
      icon: 'car-sport-outline',
      gradient: ['#ca8a04', '#a16207'],
      features: [
        { 
          id: 'rental', 
          title: 'Rent Equipment', 
          icon: 'car-sport-outline',
          onPress: () => console.log('Rental System Pressed')
        },
        { 
          id: 'maintenance', 
          title: 'Maintenance Log', 
          icon: 'construct-outline',
          onPress: () => console.log('Maintenance Pressed')
        }
      ]
    }
  ];

  const toggleSection = (sectionId) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  const QuickActionCard = ({ item }) => (
    <TouchableOpacity 
      onPress={item.onPress}
      style={styles.quickActionCard}
      activeOpacity={0.8}
    >
      <LinearGradient colors={item.gradient} style={styles.quickActionGradient}>
        <View style={styles.quickActionContent}>
          <View style={styles.quickActionLeft}>
            <View style={styles.quickActionIconContainer}>
              <Ionicons name={item.icon} size={24} color="white" />
            </View>
            <View style={styles.quickActionText}>
              <Text style={styles.quickActionTitle}>{item.title}</Text>
              <Text style={styles.quickActionSubtitle}>{item.subtitle}</Text>
            </View>
          </View>
          <View style={styles.quickActionRight}>
            {item.urgent && (
              <View style={styles.urgentIndicator} />
            )}
            {item.badge && (
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>{item.badge}</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const FeatureGroup = ({ group }) => {
    const isExpanded = expandedSection === group.id;
    
    return (
      <View style={styles.featureGroupContainer}>
        <TouchableOpacity
          onPress={() => toggleSection(group.id)}
          style={styles.featureGroupHeader}
          activeOpacity={0.7}
        >
          <View style={styles.featureGroupLeft}>
            <LinearGradient colors={group.gradient} style={styles.featureGroupIcon}>
              <Ionicons name={group.icon} size={20} color="white" />
            </LinearGradient>
            <View style={styles.featureGroupText}>
              <Text style={styles.featureGroupTitle}>{group.title}</Text>
              <Text style={styles.featureGroupSubtitle}>{group.features.length} tools</Text>
            </View>
          </View>
          <Ionicons 
            name={isExpanded ? "chevron-down" : "chevron-forward"} 
            size={20} 
            color="#666" 
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.featureGroupExpanded}>
            {group.features.map((feature) => (
              <TouchableOpacity
                key={feature.id}
                onPress={feature.onPress}
                style={styles.featureItem}
                activeOpacity={0.7}
              >
                <Ionicons name={feature.icon} size={18} color="#999" />
                <Text style={styles.featureItemText}>{feature.title}</Text>
                <Ionicons name="chevron-forward" size={16} color="#555" />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="arrow-back-outline" size={26} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerGreeting}>Good Morning!</Text>
          <Text style={styles.headerName}>Farmer!!</Text>
        </View>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="notifications-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsContainer}>
            {quickActions.map((item) => (
              <QuickActionCard key={item.id} item={item} />
            ))}
          </View>
        </View>

        {/* More Features Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>More Features</Text>
            <TouchableOpacity 
              onPress={() => setShowAllFeatures(!showAllFeatures)}
              style={styles.showAllButton}
            >
              <Text style={styles.showAllButtonText}>
                {showAllFeatures ? 'Show Less' : 'Show All'}
              </Text>
              <Ionicons 
                name={showAllFeatures ? "chevron-up" : "chevron-down"} 
                size={16} 
                color="#22c55e" 
              />
            </TouchableOpacity>
          </View>

          <View style={styles.featureGroupsList}>
            {featureGroups.slice(0, showAllFeatures ? featureGroups.length : 2).map((group) => (
              <FeatureGroup key={group.id} group={group} />
            ))}
          </View>
        </View>

        {/* Emergency Help Section */}
        <View style={styles.emergencySection}>
          <View style={styles.emergencyContent}>
            <View style={styles.emergencyLeft}>
              <View style={styles.emergencyIcon}>
                <Text style={styles.emergencyIconText}>!</Text>
              </View>
              <View>
                <Text style={styles.emergencyTitle}>Need Help?</Text>
                <Text style={styles.emergencySubtitle}>Call our agriculture expert</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.emergencyButton}>
              <Text style={styles.emergencyButtonText}>Call Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    backgroundColor: '#000',
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerGreeting: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
  },
  headerName: {
    fontSize: 14,
    color: '#999',
    marginTop: 2,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 16,
  },
  showAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  showAllButtonText: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: '500',
  },
  quickActionsContainer: {
    gap: 12,
  },
  quickActionCard: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  quickActionGradient: {
    padding: 16,
  },
  quickActionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quickActionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  quickActionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  quickActionText: {
    flex: 1,
  },
  quickActionTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  quickActionSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 2,
  },
  quickActionRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  urgentIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  badgeContainer: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  featureGroupsList: {
    gap: 8,
  },
  featureGroupContainer: {
    backgroundColor: '#111',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#222',
  },
  featureGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  featureGroupLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  featureGroupIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureGroupText: {
    flex: 1,
  },
  featureGroupTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  featureGroupSubtitle: {
    color: '#999',
    fontSize: 13,
    marginTop: 2,
  },
  featureGroupExpanded: {
    borderTopWidth: 1,
    borderTopColor: '#222',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 2,
  },
  featureItemText: {
    color: '#ccc',
    fontSize: 15,
    marginLeft: 12,
    flex: 1,
  },
  emergencySection: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  emergencyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a0f0f',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#2d1515',
    borderStyle: 'dashed',
  },
  emergencyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  emergencyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2d1515',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  emergencyIconText: {
    color: '#ef4444',
    fontSize: 20,
    fontWeight: 'bold',
  },
  emergencyTitle: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '600',
  },
  emergencySubtitle: {
    color: '#b91c1c',
    fontSize: 13,
    marginTop: 2,
  },
  emergencyButton: {
    backgroundColor: '#ef4444',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  emergencyButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});