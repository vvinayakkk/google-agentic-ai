import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Animated,
  LayoutAnimation,
  UIManager,
  Platform,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- DATA GENERATION ---
const getSuggestedActions = (navigation) => {
    const currentHour = new Date().getHours();
    // Morning (5am - 12pm)
    if (currentHour >= 5 && currentHour < 12) {
        return [
            { id: 'suggest-cattle', icon: 'paw-outline', title: 'Check Livestock', subtitle: 'Review feeding schedule', color: '#f97316', details: 'Good morning! It\'s the ideal time to check on your cattle, ensure they have fresh water, and review the morning feeding schedule.', action: { text: 'Open Cattle Manager', screen: 'CattleScreen' } },
            { id: 'suggest-tasks', icon: 'calendar-outline', title: 'Review Today\'s Tasks', subtitle: '3 tasks are due this morning', color: '#8b5cf6', details: 'You have 3 tasks scheduled before noon, starting with irrigation for the wheat field. Tap below to see your full schedule.', action: { text: 'View Farm Calendar', screen: 'CalenderScreen' } },
        ];
    }
    // Afternoon (12pm - 5pm)
    else if (currentHour >= 12 && currentHour < 17) {
        return [
            { id: 'suggest-market', icon: 'trending-up-outline', title: 'Check Market Prices', subtitle: 'Corn prices are stable', color: '#3b82f6', details: 'The afternoon market session is live. Corn prices are stable at ₹1,560/qtl. This might be a good time to plan your sales.', action: { text: 'Open Marketplace', screen: 'MarketplaceScreen' } },
            { id: 'suggest-doctor', icon: 'leaf-outline', title: 'Inspect Crops', subtitle: 'Check for signs of pests', color: '#ef4444', details: 'High humidity is forecasted. Inspect your vegetable crops for early signs of fungal diseases like blight.', action: { text: 'Open Crop Doctor', screen: 'CropDoctor' } },
        ];
    }
    // Evening & Night (5pm - 5am)
    return [
        { id: 'suggest-planning', icon: 'bulb-outline', title: 'Plan for Tomorrow', subtitle: 'Fertilizing is a top priority', color: '#f59e0b', details: 'Based on your crop cycle and the weather forecast, tomorrow is a good day for fertilizing the north field. Ensure your equipment is ready.', action: { text: 'View Crop Cycle', screen: 'CropCycle' } },
        { id: 'suggest-finance', icon: 'wallet-outline', title: 'Review Finances', subtitle: 'Check recent transactions', color: '#6366f1', details: 'It\'s a good time to review this week\'s expenses and income to stay on top of your farm\'s finances.', action: { text: 'Open AgriFinance', screen: 'UPI' } },
    ];
};

const quickActionsData = [
    { id: 'crop-doctor', icon: 'camera-outline', title: 'Crop Doctor', gradient: ['#16a34a', '#22c55e'], onPress: (navigation) => navigation.navigate('CropDoctor') },
    { id: 'market', icon: 'trending-up-outline', title: 'Market Prices', gradient: ['#2563eb', '#3b82f6'], onPress: (navigation) => navigation.navigate('MarketplaceScreen') },
    { id: 'calendar', icon: 'calendar-outline', title: 'Calendar', gradient: ['#7c3aed', '#8b5cf6'], onPress: (navigation) => navigation.navigate('CalenderScreen') },
];

const featureGroupsData = [
    { id: 'farm-management', title: 'Farm Management', icon: 'leaf-outline', color: '#22c55e', features: [{ id: 'crop-cycle', title: 'Crop Tracking', icon: 'reload-circle-outline', onPress: (navigation) => navigation.navigate('CropCycle') }, { id: 'calendar-full', title: 'Full Calendar', icon: 'calendar-outline', onPress: (navigation) => navigation.navigate('CalenderScreen') }] },
    { id: 'livestock', title: 'Livestock Care', icon: 'heart-outline', color: '#f97316', features: [{ id: 'cattle-health', title: 'Health Records', icon: 'paw-outline', onPress: (navigation) => navigation.navigate('CattleScreen') }, { id: 'feeding', title: 'Vaccination Schedule', icon: 'medical-outline', onPress: (navigation) => navigation.navigate('CattleScreen') }] },
    { id: 'business', title: 'Farm Business', icon: 'wallet-outline', color: '#6366f1', features: [{ id: 'finance', title: 'Loans & Subsidies', icon: 'wallet-outline', onPress: (navigation) => navigation.navigate('UPI') }, { id: 'documents', title: 'Paperwork Helper', icon: 'document-text-outline', onPress: () => console.log('Document Builder Pressed') }] },
];

// --- Reusable Components ---

const SuggestedAction = ({ item, onPress }) => (
    <TouchableOpacity onPress={onPress} style={styles.summaryItem}>
        <View style={[styles.summaryItemIconContainer, { backgroundColor: item.color + '20', shadowColor: item.color }]}>
            <Ionicons name={item.icon} size={22} color={item.color} />
        </View>
        <View style={styles.summaryItemTextContainer}>
            <Text style={styles.summaryItemTitle}>{item.title}</Text>
            <Text style={styles.summaryItemSubtitle}>{item.subtitle}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#666" />
    </TouchableOpacity>
);

const QuickActionCard = ({ item, navigation }) => (
    <TouchableOpacity onPress={() => item.onPress(navigation)} style={styles.quickActionCard}>
        <LinearGradient colors={item.gradient} style={styles.quickActionGradient}>
            <Ionicons name={item.icon} size={32} color="white" />
            <Text style={styles.quickActionTitle}>{item.title}</Text>
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
                    <View style={[styles.featureGroupIcon, { backgroundColor: group.color + '20' }]}><Ionicons name={group.icon} size={22} color={group.color} /></View>
                    <View style={styles.featureGroupText}><Text style={styles.featureGroupTitle}>{group.title}</Text><Text style={styles.featureGroupSubtitle}>{group.features.length} tools</Text></View>
                </View>
                <Animated.View style={{ transform: [{ rotate: arrowRotation }] }}><Ionicons name="chevron-forward" size={20} color="#666" /></Animated.View>
            </TouchableOpacity>
            {isExpanded && (
                <View style={styles.featureGroupExpanded}>
                    {group.features.map(feature => (
                        <TouchableOpacity key={feature.id} onPress={() => feature.onPress(navigation)} style={styles.featureItem} activeOpacity={0.7}>
                            <Ionicons name={feature.icon} size={18} color="#999" /><Text style={styles.featureItemText}>{feature.title}</Text><Ionicons name="chevron-forward" size={16} color="#555" />
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    );
};

const ActionDetailModal = ({ action, isVisible, onClose, navigation }) => {
    if (!isVisible) return null;
    return (
        <Modal transparent={true} visible={isVisible} animationType="fade">
            <View style={styles.modalOverlay}>
                <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <View style={[styles.modalIcon, { backgroundColor: action.color }]}><Ionicons name={action.icon} size={24} color="white" /></View>
                        <Text style={styles.modalTitle}>{action.title}</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}><Ionicons name="close" size={24} color="#999" /></TouchableOpacity>
                    </View>
                    <Text style={styles.modalDetails}>{action.details}</Text>
                    <TouchableOpacity style={[styles.modalButton, { backgroundColor: action.color }]} onPress={() => { navigation.navigate(action.action.screen); onClose(); }}>
                        <Text style={styles.modalButtonText}>{action.action.text}</Text>
                        <Ionicons name="arrow-forward" size={16} color="white" />
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

export default function FarmerFriendlyScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const [selectedAction, setSelectedAction] = useState(null);

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor="#111" />
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}><Ionicons name="arrow-back-outline" size={26} color="#fff" /></TouchableOpacity>
                <View style={styles.headerCenter}><Text style={styles.headerGreeting}>Good Morning!</Text><Text style={styles.headerName}>Farmer</Text></View>
                <TouchableOpacity style={styles.headerButton}><Ionicons name="notifications-outline" size={24} color="#fff" /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Today's Suggested Actions</Text>
                    <LinearGradient colors={['#18181b', '#111']} style={styles.summaryContainer}>
                        {getSuggestedActions(navigation).map(item => (
                            <SuggestedAction key={item.id} item={item} onPress={() => setSelectedAction(item)} />
                        ))}
                    </LinearGradient>
                </View>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
                        {quickActionsData.map(item => <QuickActionCard key={item.id} item={item} navigation={navigation} />)}
                    </ScrollView>
                </View>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>All Features</Text>
                    <View style={styles.featureGroupsList}>
                        {featureGroupsData.map((group, index) => (
                            <FeatureGroup key={group.id} group={group} navigation={navigation} isLast={index === featureGroupsData.length - 1} />
                        ))}
                    </View>
                </View>
            </ScrollView>
            <ActionDetailModal isVisible={!!selectedAction} action={selectedAction} onClose={() => setSelectedAction(null)} navigation={navigation} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#111' },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16, backgroundColor: '#111' },
    headerButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    headerCenter: { flex: 1, alignItems: 'center' },
    headerGreeting: { fontSize: 18, color: '#fff', fontWeight: '600' },
    headerName: { fontSize: 14, color: '#999', marginTop: 2 },
    scrollContent: { paddingBottom: 32 },
    section: { marginTop: 24 },
    sectionTitle: { fontSize: 20, color: '#fff', fontWeight: '600', paddingHorizontal: 16, marginBottom: 16 },
    summaryContainer: { marginHorizontal: 16, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#222' },
    summaryItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#11111190', padding: 12, borderRadius: 12, marginBottom: 8 },
    summaryItemIconContainer: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 8 },
    summaryItemTextContainer: { flex: 1 },
    summaryItemTitle: { color: '#E2E8F0', fontSize: 15, fontWeight: '600' },
    summaryItemSubtitle: { color: '#94A3B8', fontSize: 13, marginTop: 2 },
    quickActionCard: { width: 140, height: 160, marginRight: 12, borderRadius: 20, overflow: 'hidden' },
    quickActionGradient: { flex: 1, padding: 16, justifyContent: 'space-between' },
    quickActionTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
    featureGroupsList: { backgroundColor: '#18181b', marginHorizontal: 16, borderRadius: 16 },
    featureGroupContainer: { borderBottomWidth: 1, borderBottomColor: '#27272a' },
    featureGroupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
    featureGroupLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    featureGroupIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    featureGroupText: { flex: 1 },
    featureGroupTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
    featureGroupSubtitle: { color: '#999', fontSize: 13, marginTop: 2 },
    featureGroupExpanded: { paddingBottom: 8, paddingHorizontal: 16 },
    featureItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingLeft: 12, borderRadius: 8, marginVertical: 2 },
    featureItemText: { color: '#ccc', fontSize: 15, marginLeft: 12, flex: 1 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.8)', justifyContent: 'flex-end' },
    modalContainer: { backgroundColor: '#18181b', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderWidth: 1, borderColor: '#333' },
    modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    modalIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    modalTitle: { flex: 1, fontSize: 18, color: '#fff', fontWeight: 'bold' },
    closeButton: { padding: 4 },
    modalDetails: { fontSize: 16, color: '#ccc', lineHeight: 24, marginBottom: 24 },
    modalButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8 },
    modalButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});