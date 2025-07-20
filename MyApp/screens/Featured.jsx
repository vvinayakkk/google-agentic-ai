import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView, 
  TouchableOpacity, 
  Animated, 
  Dimensions,
  StatusBar,
  Platform
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

const gemItems = [
  { 
    key: 'crop', 
    icon: '🩺', 
    label: 'Crop Doctor', 
    description: 'AI-powered disease detection with 98% accuracy',
    gradient: ['#10b981', '#059669'],
    accentColor: '#34d399',
    stats: '10K+ diagnoses',
    bgIcon: 'medical'
  },
  { 
    key: 'market', 
    icon: '🛒', 
    label: 'Market Intelligence', 
    description: 'Real-time market prices and trading insights',
    gradient: ['#3b82f6', '#0ea5e9'],
    accentColor: '#60a5fa',
    stats: 'Live data',
    bgIcon: 'trending-up'
  },
  { 
    key: 'calendar', 
    icon: '📅', 
    label: 'Calendar', 
    description: 'Weather-synced farming optimization',
    gradient: ['#8b5cf6', '#ec4899'],
    accentColor: '#a78bfa',
    stats: '365 day sync',
    bgIcon: 'calendar'
  },
  { 
    key: 'cycle', 
    icon: '🌱', 
    label: 'Crop Cycle', 
    description: 'Complete growth monitoring with IoT',
    gradient: ['#22c55e', '#65a30d'],
    accentColor: '#4ade80',
    stats: 'Real-time',
    bgIcon: 'leaf'
  },
  { 
    key: 'cattle', 
    icon: '🐄', 
    label: 'Cattle Schedule', 
    description: 'Health tracking & breeding optimization',
    gradient: ['#f59e0b', '#ea580c'],
    accentColor: '#fbbf24',
    stats: '500+ animals',
    bgIcon: 'paw'
  },
  { 
    key: 'finance', 
    icon: '💡', 
    label: 'AgriFinance Pro', 
    description: 'Loan assistance & financial planning',
    gradient: ['#6366f1', '#8b5cf6'],
    accentColor: '#818cf8',
    stats: '$2M+ funded',
    bgIcon: 'cash'
  },
];

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const FloatingIcon = ({ icon, delay, duration }) => {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = () => {
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: duration,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: duration,
          useNativeDriver: true,
        })
      ]).start(() => animate());
    };

    setTimeout(() => animate(), delay);
  }, []);

  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20]
  });

  const opacity = floatAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.8, 0.3]
  });

  return (
    <Animated.View
      style={[
        styles.floatingIcon,
        {
          transform: [{ translateY }],
          opacity,
          left: Math.random() * (width - 50),
          top: Math.random() * (height - 200) + 100,
        }
      ]}
    >
      <Ionicons name={icon} size={16} color="#4ade80" />
    </Animated.View>
  );
};

const FeatureCard = ({ item, index, onPress }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animation
    Animated.spring(scaleAnim, {
      toValue: 1,
      delay: index * 150,
      useNativeDriver: true,
    }).start();

    // Continuous glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: false,
        })
      ])
    ).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8]
  });

  return (
    <AnimatedTouchable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      style={[
        styles.featureCard,
        { transform: [{ scale: scaleAnim }] }
      ]}
      activeOpacity={0.9}
    >
      {/* Glow Effect */}
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          styles.cardGlow,
          { opacity: glowOpacity }
        ]}
      >
        <LinearGradient
          colors={[...item.gradient, 'transparent']}
          style={styles.glowGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>

      {/* Card Content */}
      <LinearGradient
        colors={['rgba(24,24,27,0.95)', 'rgba(39,39,42,0.95)']}
        style={styles.cardContent}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Background Icon */}
        <View style={styles.backgroundIcon}>
          <Ionicons name={item.bgIcon} size={80} color="rgba(255,255,255,0.05)" />
        </View>

        {/* Header */}
        <View style={styles.cardHeader}>
          <LinearGradient
            colors={item.gradient}
            style={styles.iconContainer}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.cardEmoji}>{item.icon}</Text>
          </LinearGradient>
          
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: item.accentColor }]} />
            <Text style={[styles.statusText, { color: item.accentColor }]}>Active</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.cardTitle}>{item.label}</Text>
        
        {/* Description */}
        <Text style={styles.cardDescription} numberOfLines={2}>
          {item.description}
        </Text>

        {/* Footer */}
        <View style={styles.cardFooter}>
          <View style={styles.statsContainer}>
            <Ionicons name="trending-up" size={12} color={item.accentColor} />
            <Text style={[styles.statsText, { color: item.accentColor }]}>{item.stats}</Text>
          </View>
          
          <View style={[styles.actionButton, { backgroundColor: `${item.accentColor}20` }]}>
            <Ionicons name="chevron-forward" size={16} color={item.accentColor} />
          </View>
        </View>
      </LinearGradient>
    </AnimatedTouchable>
  );
};

export default function FeaturedScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(false);
  const headerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setMounted(true);
    Animated.timing(headerOpacity, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Background Gradient */}
      {/* <LinearGradient
        colors={['#0f172a', '#1e1b4b', '#0f172a']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      /> */}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'black' }]} />

      {/* Floating Background Icons */}
      {mounted && (
        <>
          <FloatingIcon icon="leaf-outline" delay={0} duration={3000} />
          <FloatingIcon icon="analytics-outline" delay={1000} duration={2500} />
          <FloatingIcon icon="calendar-outline" delay={2000} duration={3500} />
          <FloatingIcon icon="trending-up-outline" delay={3000} duration={2800} />
        </>
      )}

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: headerOpacity, paddingTop: insets.top }]}>
          <BlurView intensity={20} tint="dark" style={styles.headerBlur}>
            <View style={styles.headerContent}>
              <TouchableOpacity style={styles.headerButton} onPress={() => navigation.navigate('VoiceChatInputScreen')}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                  style={styles.headerButtonGradient}
                >
                  <Ionicons name="close" size={24} color="white" />
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.headerCenter}>
                <View style={styles.titleContainer}>
                  <Ionicons name="sparkles" size={20} color="#fbbf24" />
                  <Text style={styles.headerTitle}>AgriTech Suite</Text>
                </View>
                <Text style={styles.headerSubtitle}>Premium Features</Text>
              </View>

              <TouchableOpacity style={styles.profileContainer}>
                <LinearGradient
                  colors={['#10b981', '#3b82f6']}
                  style={styles.profileGradient}
                >
                  <MaterialCommunityIcons name="account-circle-outline" size={28} color="white" />
                  <View style={styles.onlineIndicator} />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </BlurView>
        </Animated.View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          {/* <LinearGradient
            colors={['rgba(16, 185, 129, 0.1)', 'rgba(59, 130, 246, 0.1)']}
            style={styles.heroBadge}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="flash" size={16} color="#fbbf24" />
            <Text style={styles.heroBadgeText}>AI-Powered Agriculture</Text>
          </LinearGradient> */}
          
          <Text style={styles.heroTitle}>Transform Your Farm</Text>
          <Text style={styles.heroDescription}>
            Advanced tools to maximize yield and optimize every aspect of modern agriculture
          </Text>
        </View>

        {/* Features Grid */}
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.featuresGrid}>
            {gemItems.map((item, index) => {
              let onPress = () => console.log(`Pressed ${item.label}`);
              if (item.key === 'calendar') {
                onPress = () => navigation.navigate('CalenderScreen');
              } else if (item.key === 'cycle') {
                onPress = () => navigation.navigate('CropCycle');
              } else if (item.key === 'market') {
                onPress = () => navigation.navigate('MarketplaceScreen');
              } else if (item.key === 'cattle') {
                onPress = () => navigation.navigate('CattleScreen');
              } else if (item.key === 'finance') {
                onPress = () => navigation.navigate('UPI');
              } else if (item.key === 'crop') {
                onPress = () => navigation.navigate('CropDoctor');
              }
              return (
                <FeatureCard
                  key={item.key}
                  item={item}
                  index={index}
                  onPress={onPress}
                />
              );
            })}
          </View>

          {/* CTA Section */}
          {/* <View style={styles.ctaSection}>
            <LinearGradient
              colors={['#10b981', '#3b82f6']}
              style={styles.ctaCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.ctaContent}>
                <Text style={styles.ctaTitle}>Ready to Revolutionize?</Text>
                <Text style={styles.ctaDescription}>
                  Join 50,000+ farmers using AI-powered agriculture
                </Text>
                <TouchableOpacity style={styles.ctaButton}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,1)']}
                    style={styles.ctaButtonGradient}
                  >
                    <Ionicons name="sparkles" size={18} color="#059669" />
                    <Text style={styles.ctaButtonText}>Start Free Trial</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View> */}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerBlur: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  headerButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 2,
  },
  profileContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    position: 'relative',
  },
  profileGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4ade80',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.3)',
  },
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    marginBottom: 16,
  },
  heroBadgeText: {
    color: '#4ade80',
    fontSize: 12,
    fontWeight: '600',
  },
  heroTitle: {
    color: 'white',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroDescription: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: '90%',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    gap: 12,
  },
  featureCard: {
    width: (width - 44) / 2,
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
  },
  cardGlow: {
    borderRadius: 20,
  },
  glowGradient: {
    flex: 1,
  },
  cardContent: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    minHeight: 180,
  },
  backgroundIcon: {
    position: 'absolute',
    top: -10,
    right: -10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardEmoji: {
    fontSize: 24,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  cardTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  cardDescription: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statsText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingIcon: {
    position: 'absolute',
    zIndex: 1,
  },
  ctaSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  ctaCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  ctaContent: {
    alignItems: 'center',
  },
  ctaTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  ctaDescription: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  ctaButton: {
    borderRadius: 16,
    overflow: 'hidden',
    width: '100%',
  },
  ctaButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  ctaButtonText: {
    color: '#059669',
    fontSize: 16,
    fontWeight: '700',
  },
});