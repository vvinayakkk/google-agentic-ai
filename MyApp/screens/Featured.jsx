import React, { useState, useEffect, useRef } from 'react';
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
  LayoutAnimation,
  UIManager,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- NEW: Time-Aware Suggested Actions ---
const getSuggestedActions = (navigation) => {
    const currentHour = new Date().getHours();
    
    // Morning (5am - 12pm)
    if (currentHour >= 5 && currentHour < 12) {
        return [
            { key: 'cattle', icon: 'paw-outline', color: '#FB923C', title: 'Check on Livestock', subtitle: 'Review feeding and health schedule.', onPress: () => navigation.navigate('CattleScreen') },
            { key: 'calendar', icon: 'calendar-outline', color: '#A78BFA', title: 'View Today\'s Tasks', subtitle: 'You have 3 tasks scheduled for this morning.', onPress: () => navigation.navigate('CalenderScreen') },
        ];
    }
    // Afternoon (12pm - 5pm)
    else if (currentHour >= 12 && currentHour < 17) {
        return [
            { key: 'market', icon: 'trending-up-outline', color: '#34D399', title: 'Check Market Prices', subtitle: 'Corn prices are currently stable.', onPress: () => navigation.navigate('MarketplaceScreen') },
            { key: 'weather', icon: 'umbrella-outline', color: '#60A5FA', title: 'Check Weather Forecast', subtitle: 'High UV index expected this afternoon.', onPress: () => console.log('Weather') },
        ];
    }
    // Evening & Night (5pm - 5am)
    else {
        return [
            { key: 'planning', icon: 'bulb-outline', color: '#FBBF24', title: 'Plan for Tomorrow', subtitle: 'Fertilizing the north field is a top priority.', onPress: () => navigation.navigate('CalenderScreen') },
            { key: 'doctor', icon: 'leaf-outline', color: '#F87171', title: 'Review Pest Alerts', subtitle: 'Aphids have been reported in your region.', onPress: () => navigation.navigate('CropDoctor') },
        ];
    }
};


// --- Reusable Components ---

const SuggestedActionsCard = ({ navigation }) => {
    const [suggestedActions, setSuggestedActions] = useState([]);
    useEffect(() => {
        setSuggestedActions(getSuggestedActions(navigation));
    }, [navigation]);

    return (
        <View style={styles.summaryContainer}>
            <View style={styles.summaryHeader}>
                <Ionicons name="sparkles" size={22} color="#A78BFA" />
                <Text style={styles.summaryTitle}>Suggested Actions</Text>
            </View>
            <View style={styles.summaryContent}>
                {suggestedActions.map(item => (
                    <TouchableOpacity key={item.key} style={styles.summaryItem} onPress={item.onPress}>
                        <View style={[styles.summaryItemIconContainer, {backgroundColor: item.color + '20'}]}>
                           <Ionicons name={item.icon} size={20} color={item.color} />
                        </View>
                        <View style={styles.summaryItemTextContainer}>
                            <Text style={styles.summaryItemTitle}>{item.title}</Text>
                            <Text style={styles.summaryItemSubtitle}>{item.subtitle}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#666" />
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

const QuickActionCard = ({ item }) => (
  <TouchableOpacity onPress={item.onPress} style={styles.quickActionCard} activeOpacity={0.8}>
    <LinearGradient colors={item.gradient} style={styles.quickActionGradient}>
      <View style={styles.quickActionContent}>
        <View style={styles.quickActionLeft}>
          <View style={styles.quickActionIconContainer}><Ionicons name={item.icon} size={24} color="white" /></View>
          <View style={styles.quickActionText}><Text style={styles.quickActionTitle}>{item.title}</Text><Text style={styles.quickActionSubtitle}>{item.subtitle}</Text></View>
        </View>
        <View style={styles.quickActionRight}>
          {item.badge && (<View style={styles.badgeContainer}><Text style={styles.badgeText}>{item.badge}</Text></View>)}
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
        </View>
      </View>
    </LinearGradient>
  </TouchableOpacity>
);

const FeatureGroup = ({ group, isLast, navigation }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const rotationAnim = useRef(new Animated.Value(0)).current;

    const toggleSection = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setIsExpanded(!isExpanded);
    };

    useEffect(() => {
        Animated.timing(rotationAnim, { toValue: isExpanded ? 1 : 0, duration: 250, useNativeDriver: true }).start();
    }, [isExpanded]);

    const arrowRotation = rotationAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] });

    return (
      <View style={[styles.featureGroupContainer, isLast && { borderBottomWidth: 0 }]}>
        <TouchableOpacity onPress={toggleSection} style={styles.featureGroupHeader} activeOpacity={0.7}>
          <View style={styles.featureGroupLeft}>
            <View style={[styles.featureGroupIcon, {backgroundColor: group.gradient[1] + '30'}]}><Ionicons name={group.icon} size={20} color={group.gradient[0]} /></View>
            <View style={styles.featureGroupText}><Text style={styles.featureGroupTitle}>{group.title}</Text><Text style={styles.featureGroupSubtitle}>{group.features.length} tools</Text></View>
          </View>
          <Animated.View style={{ transform: [{ rotate: arrowRotation }] }}><Ionicons name="chevron-forward" size={20} color="#666" /></Animated.View>
        </TouchableOpacity>
        {isExpanded && (
          <View style={styles.featureGroupExpanded}>
            {group.features.map((feature) => (
              <TouchableOpacity key={feature.id} onPress={() => feature.onPress(navigation)} style={styles.featureItem} activeOpacity={0.7}>
                <Ionicons name={feature.icon} size={18} color="#999" /><Text style={styles.featureItemText}>{feature.title}</Text><Ionicons name="chevron-forward" size={16} color="#555" />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
};


export default function FarmerFriendlyScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null); // Not used, but keeping for potential future use

  // FIX: Data arrays are moved INSIDE the component to get access to the `navigation` prop.
  const quickActions = [
    { id: 'crop-doctor', icon: 'camera-outline', title: 'Crop Doctor', subtitle: 'Scan & diagnose diseases', gradient: ['#22c55e', '#16a34a'], onPress: () => navigation.navigate('CropDoctor') },
    { id: 'market', icon: 'trending-up-outline', title: 'Market Prices', subtitle: "Today's mandi rates", gradient: ['#3b82f6', '#2563eb'], badge: '₹2,340/qtl', onPress: () => navigation.navigate('MarketplaceScreen') },
    { id: 'calendar', icon: 'calendar-outline', title: 'Farm Calendar', subtitle: 'Today\'s tasks', gradient: ['#8b5cf6', '#7c3aed'], badge: '3 tasks', onPress: () => navigation.navigate('CalenderScreen') }
  ];

  const featureGroups = [
    { id: 'farm-management', title: 'Farm Management', icon: 'leaf-outline', gradient: ['#22c55e', '#16a34a'], features: [{ id: 'crop-cycle', title: 'Crop Tracking', icon: 'reload-circle-outline', onPress: () => navigation.navigate('CropCycle') }, { id: 'calendar-full', title: 'Full Calendar', icon: 'calendar-outline', onPress: () => navigation.navigate('CalenderScreen') }] },
    { id: 'livestock', title: 'Livestock Care', icon: 'heart-outline', gradient: ['#f97316', '#ea580c'], features: [{ id: 'cattle-health', title: 'Health Records', icon: 'paw-outline', onPress: () => navigation.navigate('CattleScreen') }, { id: 'feeding', title: 'Vaccination Schedule', icon: 'medical-outline', onPress: () => navigation.navigate('CattleScreen') }] },
    { id: 'business', title: 'Farm Business', icon: 'wallet-outline', gradient: ['#6366f1', '#4f46e5'], features: [{ id: 'finance', title: 'Loans & Subsidies', icon: 'wallet-outline', onPress: () => navigation.navigate('UPI') }, { id: 'documents', title: 'Paperwork Helper', icon: 'document-text-outline', onPress: () => console.log('Document Builder Pressed') }] },
    { id: 'equipment', title: 'Equipment & Tools', icon: 'car-sport-outline', gradient: ['#ca8a04', '#a16207'], features: [{ id: 'rental', title: 'Rent Equipment', icon: 'car-sport-outline', onPress: () => console.log('Rental System Pressed') }, { id: 'maintenance', title: 'Maintenance Log', icon: 'construct-outline', onPress: () => console.log('Maintenance Pressed') }] }
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}><Ionicons name="arrow-back-outline" size={26} color="#fff" /></TouchableOpacity>
        <View style={styles.headerCenter}><Text style={styles.headerGreeting}>Good Morning!</Text><Text style={styles.headerName}>Farmer</Text></View>
        <TouchableOpacity style={styles.headerButton}><Ionicons name="notifications-outline" size={24} color="#fff" /></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <SuggestedActionsCard navigation={navigation} />
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsContainer}>{quickActions.map((item) => (<QuickActionCard key={item.id} item={item} />))}</View>
        </View>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>More Features</Text>
            <TouchableOpacity onPress={() => setShowAllFeatures(!showAllFeatures)} style={styles.showAllButton}><Text style={styles.showAllButtonText}>{showAllFeatures ? 'Show Less' : 'Show All'}</Text><Ionicons name={showAllFeatures ? "chevron-up" : "chevron-down"} size={16} color="#22c55e" /></TouchableOpacity>
          </View>
          <View style={styles.featureGroupsList}>
            {featureGroups.slice(0, showAllFeatures ? featureGroups.length : 2).map((group, index) => (
              <FeatureGroup key={group.id} group={group} navigation={navigation} isLast={index === (showAllFeatures ? featureGroups.length : 2) - 1} />
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#000' },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16, backgroundColor: '#000' },
    headerButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    headerCenter: { flex: 1, alignItems: 'center' },
    headerGreeting: { fontSize: 18, color: '#fff', fontWeight: '600' },
    headerName: { fontSize: 14, color: '#999', marginTop: 2 },
    scrollContent: { paddingBottom: 32 },
    summaryContainer: { backgroundColor: '#111', margin: 16, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#222' },
    summaryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    summaryTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 10, flex: 1 },
    summaryContent: { gap: 8 },
    summaryItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181b', padding: 12, borderRadius: 10 },
    summaryItemIconContainer: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    summaryItemTextContainer: { flex: 1 },
    summaryItemTitle: { color: '#E2E8F0', fontSize: 14, fontWeight: '600' },
    summaryItemSubtitle: { color: '#94A3B8', fontSize: 12, marginTop: 2 },
    section: { marginTop: 8 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 16 },
    sectionTitle: { fontSize: 18, color: '#fff', fontWeight: '600' },
    showAllButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    showAllButtonText: { color: '#22c55e', fontSize: 14, fontWeight: '500' },
    quickActionsContainer: { gap: 12, paddingHorizontal: 16 },
    quickActionCard: { borderRadius: 16, overflow: 'hidden' },
    quickActionGradient: { padding: 16 },
    quickActionContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    quickActionLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    quickActionIconContainer: { width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    quickActionText: { flex: 1 },
    quickActionTitle: { color: 'white', fontSize: 16, fontWeight: '600' },
    quickActionSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 2 },
    quickActionRight: { alignItems: 'flex-end', gap: 8 },
    badgeContainer: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
    badgeText: { color: 'white', fontSize: 12, fontWeight: '500' },
    featureGroupsList: { backgroundColor: '#111', marginHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: '#222', overflow: 'hidden' },
    featureGroupContainer: { borderBottomWidth: 1, borderBottomColor: '#222' },
    featureGroupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
    featureGroupLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    featureGroupIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    featureGroupText: { flex: 1 },
    featureGroupTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
    featureGroupSubtitle: { color: '#999', fontSize: 13, marginTop: 2 },
    featureGroupExpanded: { paddingBottom: 8, paddingHorizontal: 16 },
    featureItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingLeft: 12, borderRadius: 8, marginVertical: 2 },
    featureItemText: { color: '#ccc', fontSize: 15, marginLeft: 12, flex: 1 },
});