import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// --- DATA: Added an "overview" for the back of the card ---
const featureItems = [
  {
    key: 'crop',
    icon: 'leaf-outline',
    label: 'Crop Doctor',
    description: 'Diagnose crop diseases',
    gradient: ['#22c55e', '#16a34a'],
    overview: 'Use your phone camera to instantly identify crop diseases and pests. Get AI-powered solutions and treatment recommendations with 98% accuracy.',
    onPress: (navigation) => navigation.navigate('CropDoctor'),
  },
  {
    key: 'market',
    icon: 'trending-up-outline',
    label: 'Market Prices',
    description: 'Check local mandi rates',
    gradient: ['#3b82f6', '#2563eb'],
    overview: 'Access real-time prices for your crops from thousands of markets (mandis) across India. Make informed decisions on when and where to sell.',
    onPress: (navigation) => navigation.navigate('MarketplaceScreen'),
  },
  {
    key: 'calendar',
    icon: 'calendar-outline',
    label: 'Farming Calendar',
    description: 'Plan your activities',
    gradient: ['#ec4899', '#db2777'],
    overview: 'Get a personalized calendar for your crops, synced with local weather forecasts. Receive timely alerts for sowing, irrigation, and harvesting.',
    onPress: (navigation) => navigation.navigate('CalenderScreen'),
  },
  {
    key: 'cycle',
    icon: 'reload-circle-outline',
    label: 'Crop Cycle',
    description: 'Track growth stages',
    gradient: ['#8b5cf6', '#7c3aed'],
    overview: 'Monitor your entire crop lifecycle from seed to harvest. Log activities, add photos, and track the progress of your farm effortlessly.',
    onPress: (navigation) => navigation.navigate('CropCycle'),
  },
  {
    key: 'cattle',
    icon: 'paw-outline',
    label: 'Cattle Care',
    description: 'Manage animal health',
    gradient: ['#f97316', '#ea580c'],
    overview: 'Keep detailed health records for your livestock. Track vaccinations, breeding cycles, and milk production to improve overall herd management.',
    onPress: (navigation) => navigation.navigate('CattleScreen'),
  },
  {
    key: 'finance',
    icon: 'wallet-outline',
    label: 'AgriFinance',
    description: 'Loans and subsidies',
    gradient: ['#6366f1', '#4f46e5'],
    overview: 'Explore government schemes, apply for agricultural loans, and manage your farm finances. Connect with financial experts for guidance.',
    onPress: (navigation) => navigation.navigate('UPI'),
  },
  {
    key: 'rental',
    icon: 'car-sport-outline',
    label: 'Rental System',
    description: 'Rent farm equipment',
    gradient: ['#ca8a04', '#a16207'],
    overview: 'Need a tractor or a thresher? Rent equipment from nearby farmers or service providers. You can also list your own equipment for others to rent.',
    onPress: (navigation) => console.log('Rental System Pressed'),
  },
  {
    key: 'documents',
    icon: 'document-text-outline',
    label: 'Document Builder',
    description: 'Create legal papers',
    gradient: ['#0891b2', '#0e7490'],
    overview: 'Easily create important documents like subsidy applications, land lease agreements, or sales receipts using pre-built templates.',
    onPress: (navigation) => console.log('Document Builder Pressed'),
  },
];

// --- Card Component with Flip Animation ---
const FeatureCard = ({ item, navigation }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;

  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg'],
  });

  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg'],
  });

  const handleFlip = () => {
    const toValue = isFlipped ? 0 : 180;
    Animated.spring(flipAnim, {
      toValue,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
    setIsFlipped(!isFlipped);
  };

  const frontAnimatedStyle = { transform: [{ rotateY: frontInterpolate }] };
  const backAnimatedStyle = { transform: [{ rotateY: backInterpolate }] };

  return (
    <View style={styles.featureCard}>
      <TouchableOpacity onPress={handleFlip}>
        {/* Front of the Card */}
        <Animated.View style={[styles.cardSide, frontAnimatedStyle]}>
          <LinearGradient colors={item.gradient} style={styles.cardGradient}>
            <Ionicons name={item.icon} size={48} color="white" />
            <Text style={styles.cardTitle}>{item.label}</Text>
            <Text style={styles.cardDescription}>{item.description}</Text>
          </LinearGradient>
        </Animated.View>

        {/* Back of the Card */}
        <Animated.View style={[styles.cardSide, styles.cardBack, backAnimatedStyle]}>
          <LinearGradient colors={item.gradient} style={styles.cardGradient}>
            <Text style={styles.overviewText}>{item.overview}</Text>
            <TouchableOpacity 
              style={styles.exploreButton} 
              onPress={() => item.onPress(navigation)}
            >
              <Text style={styles.exploreButtonText}>Explore Feature</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
};


export default function FeaturedScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F4F5" />
      
      {/* --- New, Centered Header with Back Button --- */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="arrow-back-outline" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: '#fff' }]}>Agri-Suite Features</Text>
        <View style={styles.headerButton} /> {/* Empty view for alignment */}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.featuresGrid}>
          {featureItems.map((item) => (
            <FeatureCard
              key={item.key}
              item={item}
              navigation={navigation}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000', // Changed from #F4F4F5 to black
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222', // Darker border for dark theme
    backgroundColor: '#000', // Changed from #F4F4F5 to black
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    color: '#fff', // Changed from #18181B to white
    fontWeight: '700',
  },
  scrollContent: {
    paddingBottom: 32,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  // Card container to set dimensions and perspective for 3D effect
  featureCard: {
    width: (width - 48) / 2,
    height: 190,
    marginBottom: 16,
  },
  // Base style for both sides of the card
  cardSide: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    backfaceVisibility: 'hidden', // Crucial for the flip effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  // Positions the back of the card behind the front
  cardBack: {
    position: 'absolute',
    top: 0,
  },
  cardGradient: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    justifyContent: 'space-around',
  },
  cardTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
  },
  cardDescription: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
  },
  overviewText: {
    color: 'white',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    flex: 1, // Takes up available space
  },
  exploreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 20,
    paddingVertical: 8,
    marginTop: 10,
  },
  exploreButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginRight: 6,
  },
});