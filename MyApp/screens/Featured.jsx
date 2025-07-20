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

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- NEW DATA STRUCTURE ---
const quickActionsData = [
  { key: 'crop', icon: 'camera-outline', label: 'Crop Doctor', description: 'Scan & diagnose diseases', color: '#16a34a', onPress: (navigation) => navigation.navigate('CropDoctor') },
  { key: 'market', icon: 'trending-up-outline', label: 'Market Prices', description: "Today's mandi rates", color: '#2563eb', badge: { text: '₹2,340/qtl' }, onPress: (navigation) => navigation.navigate('MarketplaceScreen') },
  { key: 'calendar', icon: 'calendar-outline', label: 'Farm Calendar', description: "Today's tasks", color: '#7c3aed', badge: { text: '3 tasks' }, onPress: (navigation) => navigation.navigate('CalenderScreen') },
];

const moreFeaturesData = [
  {
    key: 'management',
    icon: 'leaf-outline',
    label: 'Farm Management',
    color: '#16a34a',
    tools: [
      { key: 'cycle', label: 'Crop Tracking', onPress: (navigation) => navigation.navigate('CropCycle') },
      { key: 'full_calendar', label: 'Full Calendar View', onPress: (navigation) => navigation.navigate('CalenderScreen') },
    ],
  },
  {
    key: 'livestock',
    icon: 'paw-outline',
    label: 'Livestock Care',
    color: '#ea580c',
    tools: [
      { key: 'cattle', label: 'Cattle Health Records', onPress: (navigation) => navigation.navigate('CattleScreen') },
    ],
  },
  {
    key: 'business',
    icon: 'wallet-outline',
    label: 'Farm Business',
    color: '#6366f1',
    tools: [
      { key: 'finance', label: 'AgriFinance & Loans', onPress: (navigation) => navigation.navigate('UPI') },
      { key: 'documents', label: 'Document Builder', onPress: (navigation) => console.log('Docs') },
    ],
  },
  {
    key: 'tools',
    icon: 'car-sport-outline',
    label: 'Equipment & Tools',
    color: '#ca8a04',
    tools: [
      { key: 'rental', label: 'Rental System', onPress: (navigation) => console.log('Rental') },
    ],
  },
];

// --- Reusable Components ---

const QuickActionCard = ({ item, navigation }) => (
  <TouchableOpacity onPress={() => item.onPress(navigation)} style={[styles.quickCard, { backgroundColor: item.color }]}>
    <View style={styles.quickCardIcon}>
        <Ionicons name={item.icon} size={28} color="#fff" />
    </View>
    <View style={styles.quickCardTextContainer}>
      <Text style={styles.quickCardTitle}>{item.label}</Text>
      <Text style={styles.quickCardDescription}>{item.description}</Text>
    </View>
    <View style={styles.quickCardAction}>
        {item.badge && <Text style={styles.badge}>{item.badge.text}</Text>}
        <Ionicons name="chevron-forward-outline" size={24} color="#fff" style={{ opacity: 0.7 }} />
    </View>
  </TouchableOpacity>
);

const SubFeatureItem = ({ item, navigation }) => (
    <TouchableOpacity style={styles.subItem} onPress={() => item.onPress(navigation)}>
        <Text style={styles.subItemText}>{item.label}</Text>
        <Ionicons name="chevron-forward-outline" size={20} color="#64748B" />
    </TouchableOpacity>
);

const FeatureAccordionGroup = ({ group, navigation }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const toggleExpand = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setIsExpanded(!isExpanded);
    };

    return (
        <View style={styles.accordionGroup}>
            <TouchableOpacity style={styles.accordionHeader} onPress={toggleExpand}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[styles.accordionIconContainer, { backgroundColor: `${group.color}20` }]}>
                        <Ionicons name={group.icon} size={22} color={group.color} />
                    </View>
                    <View>
                        <Text style={styles.accordionTitle}>{group.label}</Text>
                        <Text style={styles.accordionSubtitle}>{group.tools.length} tools</Text>
                    </View>
                </View>
                <Ionicons name={isExpanded ? "chevron-up-outline" : "chevron-down-outline"} size={22} color="#94A3B8" />
            </TouchableOpacity>
            {isExpanded && (
                <View style={styles.accordionContent}>
                    {group.tools.map(tool => (
                        <SubFeatureItem key={tool.key} item={tool} navigation={navigation} />
                    ))}
                </View>
            )}
        </View>
    );
};


export default function FeaturedScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const [showMore, setShowMore] = useState(true);

    const toggleShowMore = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setShowMore(!showMore);
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor="#18181b" />
            
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
                    <Ionicons name="arrow-back-outline" size={26} color="#fff" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerGreeting}>Good Morning!</Text>
                    <Text style={styles.headerUser}>Ramesh Kumar</Text>
                </View>
                <TouchableOpacity style={styles.headerButton}>
                    <Ionicons name="notifications-outline" size={26} color="#fff" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                {quickActionsData.map(item => (
                    <QuickActionCard key={item.key} item={item} navigation={navigation} />
                ))}

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>More Features</Text>
                    <TouchableOpacity onPress={toggleShowMore}>
                        <Text style={styles.toggleText}>{showMore ? 'Show Less' : 'Show All'}</Text>
                    </TouchableOpacity>
                </View>

                {showMore && (
                    <View>
                        {moreFeaturesData.map(group => (
                            <FeatureAccordionGroup key={group.key} group={group} navigation={navigation} />
                        ))}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#18181b' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 16, backgroundColor: '#18181b' },
    headerButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    headerGreeting: { color: '#94A3B8', fontSize: 14, textAlign: 'center' },
    headerUser: { color: '#fff', fontSize: 18, fontWeight: '600', textAlign: 'center' },
    scrollContent: { paddingBottom: 32, backgroundColor: '#000' },
    sectionTitle: { fontSize: 18, fontWeight: '600', color: '#E2E8F0', marginVertical: 20, paddingHorizontal: 16 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    toggleText: { fontSize: 14, fontWeight: '600', color: '#3b82f6', paddingRight: 16 },
    quickCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 12, padding: 16, borderRadius: 16 },
    quickCardIcon: { padding: 12, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.15)' },
    quickCardTextContainer: { flex: 1, marginLeft: 16 },
    quickCardTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
    quickCardDescription: { fontSize: 13, color: '#fff', opacity: 0.8 },
    quickCardAction: { alignItems: 'center' },
    badge: { backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 'bold', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, fontSize: 12, marginBottom: 4 },
    accordionGroup: { backgroundColor: '#18181b', borderRadius: 16, marginHorizontal: 16, marginBottom: 12, overflow: 'hidden' },
    accordionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
    accordionIconContainer: { padding: 10, borderRadius: 12, marginRight: 16 },
    accordionTitle: { fontSize: 16, fontWeight: '600', color: '#fff' },
    accordionSubtitle: { fontSize: 13, color: '#64748B' },
    accordionContent: { borderTopWidth: 1, borderColor: '#27272a', paddingTop: 8, paddingBottom: 8 },
    subItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 16 },
    subItemText: { color: '#E2E8F0', fontSize: 15 },
});