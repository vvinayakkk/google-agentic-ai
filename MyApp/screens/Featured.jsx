import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// --- DATA: Same data, but we'll present it differently ---
const featureItems = [
  {
    key: 'crop',
    icon: 'leaf-outline',
    label: 'Crop Doctor',
    description: 'Diagnose crop diseases instantly.',
    color: '#22c55e',
    onPress: (navigation) => navigation.navigate('CropDoctor'),
  },
  {
    key: 'market',
    icon: 'trending-up-outline',
    label: 'Market Prices',
    description: 'Check local mandi rates.',
    color: '#3b82f6',
    onPress: (navigation) => navigation.navigate('MarketplaceScreen'),
  },
  {
    key: 'calendar',
    icon: 'calendar-outline',
    label: 'Farming Calendar',
    description: 'Plan your farm activities.',
    color: '#ec4899',
    onPress: (navigation) => navigation.navigate('CalenderScreen'),
  },
  {
    key: 'cycle',
    icon: 'reload-circle-outline',
    label: 'Crop Cycle',
    description: 'Track growth from seed to harvest.',
    color: '#8b5cf6',
    onPress: (navigation) => navigation.navigate('CropCycle'),
  },
  {
    key: 'cattle',
    icon: 'paw-outline',
    label: 'Cattle Care',
    description: 'Manage animal health records.',
    color: '#f97316',
    onPress: (navigation) => navigation.navigate('CattleScreen'),
  },
  {
    key: 'finance',
    icon: 'wallet-outline',
    label: 'AgriFinance',
    description: 'Explore loans and subsidies.',
    color: '#6366f1',
    onPress: (navigation) => navigation.navigate('UPI'),
  },
  {
    key: 'rental',
    icon: 'car-sport-outline',
    label: 'Rental System',
    description: 'Rent farm equipment nearby.',
    color: '#ca8a04',
    onPress: (navigation) => console.log('Rental System Pressed'),
  },
  {
    key: 'documents',
    icon: 'document-text-outline',
    label: 'Document Builder',
    description: 'Create legal & sales papers.',
    color: '#0891b2',
    onPress: (navigation) => console.log('Document Builder Pressed'),
  },
];


// --- Reusable List Item Component ---
const FeatureListItem = ({ item, navigation }) => (
  <TouchableOpacity style={styles.listItem} onPress={() => item.onPress(navigation)}>
    <View style={[styles.listItemIconContainer, { backgroundColor: item.color + '30' }]}>
      <Ionicons name={item.icon} size={26} color={item.color} />
    </View>
    <View style={styles.listItemTextContainer}>
      <Text style={styles.listItemTitle}>{item.label}</Text>
      <Text style={styles.listItemDescription}>{item.description}</Text>
    </View>
    <Ionicons name="chevron-forward-outline" size={22} color="#4A5568" />
  </TouchableOpacity>
);

export default function FeaturedScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  // Separate features for different sections of the UI
  const heroFeature = featureItems[0]; // Crop Doctor
  const quickActions = featureItems.slice(1, 3); // Market Prices, Calendar
  const allTools = featureItems.slice(3); // The rest of the features

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="arrow-back-outline" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Agri-Suite Features</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* --- Hero Feature --- */}
        <Text style={styles.sectionTitle}>Get Help Instantly</Text>
        <TouchableOpacity onPress={() => heroFeature.onPress(navigation)}>
          <LinearGradient
            colors={['#27272a', '#18181b']}
            style={styles.heroCard}
          >
            <View style={[styles.heroIconContainer, { backgroundColor: heroFeature.color }]}>
              <Ionicons name={heroFeature.icon} size={32} color="white" />
            </View>
            <View style={styles.heroTextContainer}>
              <Text style={styles.heroTitle}>{heroFeature.label}</Text>
              <Text style={styles.heroDescription}>{heroFeature.description}</Text>
            </View>
            <Ionicons name="arrow-forward-circle" size={30} color="#4A5568" />
          </LinearGradient>
        </TouchableOpacity>

        {/* --- Quick Actions --- */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 16 }}>
          {quickActions.map(item => (
            <TouchableOpacity key={item.key} onPress={() => item.onPress(navigation)}>
              <LinearGradient
                colors={['#27272a', '#18181b']}
                style={styles.quickActionCard}
              >
                <Ionicons name={item.icon} size={28} color={item.color} />
                <Text style={styles.quickActionTitle}>{item.label}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* --- All Tools List --- */}
        <Text style={styles.sectionTitle}>All Farming Tools</Text>
        <View style={styles.listContainer}>
          {allTools.map(item => (
            <FeatureListItem key={item.key} item={item} navigation={navigation} />
          ))}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: '#000',
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '700',
  },
  scrollContent: {
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#A0AEC0',
    marginTop: 24,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  // --- Hero Card Styles ---
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2D3748',
  },
  heroIconContainer: {
    padding: 12,
    borderRadius: 12,
    marginRight: 12,
  },
  heroTextContainer: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  heroDescription: {
    fontSize: 14,
    color: '#A0AEC0',
    marginTop: 2,
  },
  // --- Quick Action Styles ---
  quickActionCard: {
    width: 120,
    height: 120,
    borderRadius: 16,
    padding: 12,
    marginRight: 12,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#2D3748',
  },
  quickActionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  // --- List Styles ---
  listContainer: {
    marginHorizontal: 16,
    backgroundColor: '#1A202C',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2D3748',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2D3748',
  },
  listItemIconContainer: {
    padding: 10,
    borderRadius: 10,
    marginRight: 16,
  },
  listItemTextContainer: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  listItemDescription: {
    fontSize: 13,
    color: '#A0AEC0',
    marginTop: 2,
  },
});