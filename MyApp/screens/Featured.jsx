import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Animated,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

// --- DATA ---
const getSuggestedActions = (navigation) => {
    // Current time is early morning, so this will be returned.
    return [
        { id: 'suggest-planning', icon: 'bulb-outline', title: 'Plan for Today', subtitle: 'Weather is clear for fertilizing', color: '#f59e0b', details: 'Based on your crop cycle and the clear weather forecast, today is an ideal day for fertilizing the north field. Ensure your equipment is ready.', action: { text: 'View Crop Cycle', screen: 'CropCycle' } },
        { id: 'suggest-cattle', icon: 'paw-outline', title: 'Check Livestock', subtitle: 'Review morning feeding schedule', color: '#f97316', details: 'Good morning! It\'s the ideal time to check on your cattle, ensure they have fresh water, and review the morning feeding schedule.', action: { text: 'Open Cattle Manager', screen: 'CattleScreen' } },
    ];
};

const primaryToolsData = [
    { id: 'crop-doctor', icon: 'camera-outline', title: 'Crop Doctor', subtitle: 'Scan & diagnose diseases', gradient: ['#16a34a', '#22c55e'], onPress: (navigation) => navigation.navigate('CropDoctor') },
    { id: 'market', icon: 'trending-up-outline', title: 'Market Prices', subtitle: "Today's mandi rates", gradient: ['#2563eb', '#3b82f6'], onPress: (navigation) => navigation.navigate('MarketplaceScreen') },
    { id: 'calendar', icon: 'calendar-outline', title: 'Farm Calendar', subtitle: 'View today\'s tasks', gradient: ['#7c3aed', '#8b5cf6'], onPress: (navigation) => navigation.navigate('CalenderScreen') },
];

const farmHubTabs = [
    {
        id: 'management', title: 'Management', icon: 'leaf-outline',
        features: [
            { id: 'crop-cycle', title: 'Crop Tracking', icon: 'reload-circle-outline', onPress: (navigation) => navigation.navigate('CropCycle') },
            { id: 'calendar-full', title: 'Full Calendar', icon: 'calendar-outline', onPress: (navigation) => navigation.navigate('CalenderScreen') },
        ]
    },
    {
        id: 'livestock', title: 'Livestock', icon: 'heart-outline',
        features: [
            { id: 'cattle-health', title: 'Health Records', icon: 'paw-outline', onPress: (navigation) => navigation.navigate('CattleScreen') },
            { id: 'feeding', title: 'Vaccination Schedule', icon: 'medical-outline', onPress: (navigation) => navigation.navigate('CattleScreen') },
        ]
    },
    {
        id: 'business', title: 'Business', icon: 'wallet-outline',
        features: [
            { id: 'finance', title: 'Loans & Subsidies', icon: 'wallet-outline', onPress: (navigation) => navigation.navigate('UPI') },
            { id: 'documents', title: 'Paperwork Helper', icon: 'document-text-outline', onPress: (navigation) => navigation.navigate('DocumentAgentScreen') },
        ]
    },
];


// --- Reusable Components ---
const ActionDetailModal = ({ action, isVisible, onClose, navigation }) => {
    // This modal component remains the same
    if (!isVisible) return null;
    return (
        <Modal transparent={true} visible={isVisible} animationType="fade">
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}><View style={[styles.modalIcon, { backgroundColor: action.color }]}><Ionicons name={action.icon} size={24} color="white" /></View><Text style={styles.modalTitle}>{action.title}</Text><TouchableOpacity onPress={onClose} style={styles.closeButton}><Ionicons name="close" size={24} color="#999" /></TouchableOpacity></View>
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
    const [activeHubTab, setActiveHubTab] = useState('management');

    const suggestedActions = useMemo(() => getSuggestedActions(navigation), [navigation]);

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" backgroundColor="#111" />
            
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}><Ionicons name="arrow-back-outline" size={26} color="#E2E8F0" /></TouchableOpacity>
                <TouchableOpacity style={styles.headerButton}><Ionicons name="notifications-outline" size={24} color="#E2E8F0" /></TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* --- Zone 1: Welcome & Suggested Actions --- */}
                <LinearGradient colors={['#1E293B', '#111827']} style={styles.welcomeCard}>
                    <Text style={styles.welcomeGreeting}>Good Morning, Farmer!</Text>
                    <Text style={styles.welcomeSubtitle}>Here is your briefing for today:</Text>
                    <View style={styles.suggestionsContainer}>
                        {suggestedActions.map(item => (
                            <TouchableOpacity key={item.id} style={styles.suggestionItem} onPress={() => setSelectedAction(item)}>
                                <View style={[styles.suggestionIcon, { backgroundColor: `${item.color}30` }]}><Ionicons name={item.icon} size={20} color={item.color} /></View>
                                <View style={styles.suggestionTextContainer}><Text style={styles.suggestionTitle}>{item.title}</Text><Text style={styles.suggestionSubtitle}>{item.subtitle}</Text></View>
                                <Ionicons name="chevron-forward" size={20} color="#64748B" />
                            </TouchableOpacity>
                        ))}
                    </View>
                </LinearGradient>

                {/* --- Zone 2: Primary Tools --- */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Primary Tools</Text>
                    <View style={styles.primaryToolsGrid}>
                        {primaryToolsData.map(item => (
                            <TouchableOpacity key={item.id} onPress={() => item.onPress(navigation)} style={styles.primaryToolCard}>
                                <LinearGradient colors={item.gradient} style={styles.primaryToolGradient}>
                                    <View style={styles.primaryToolIcon}><Ionicons name={item.icon} size={32} color="white" /></View>
                                    <Text style={styles.primaryToolTitle}>{item.title}</Text>
                                    <Text style={styles.primaryToolSubtitle}>{item.subtitle}</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* --- Zone 3: Farm Hub --- */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Farm Hub</Text>
                    <View style={styles.hubContainer}>
                        <View style={styles.hubTabs}>
                            {farmHubTabs.map(tab => (
                                <TouchableOpacity key={tab.id} onPress={() => setActiveHubTab(tab.id)} style={[styles.hubTab, activeHubTab === tab.id && styles.hubTabActive]}>
                                    <Ionicons name={tab.icon} size={22} color={activeHubTab === tab.id ? '#34D399' : '#94A3B8'} />
                                    <Text style={[styles.hubTabText, activeHubTab === tab.id && styles.hubTabTextActive]}>{tab.title}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <View style={styles.hubContent}>
                            {farmHubTabs.find(tab => tab.id === activeHubTab)?.features.map(feature => (
                                <TouchableOpacity key={feature.id} onPress={() => feature.onPress(navigation)} style={styles.hubFeatureItem}>
                                    <View style={styles.hubFeatureIcon}><Ionicons name={feature.icon} size={20} color="#E2E8F0" /></View>
                                    <Text style={styles.hubFeatureText}>{feature.title}</Text>
                                    <Ionicons name="chevron-forward" size={20} color="#64748B" />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>
            </ScrollView>
            <ActionDetailModal isVisible={!!selectedAction} action={selectedAction} onClose={() => setSelectedAction(null)} navigation={navigation} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#111827' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10, backgroundColor: '#111827' },
    headerButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { paddingBottom: 40 },
    welcomeCard: { margin: 16, borderRadius: 20, padding: 20 },
    welcomeGreeting: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
    welcomeSubtitle: { fontSize: 16, color: '#94A3B8', marginTop: 4, marginBottom: 20 },
    suggestionsContainer: { gap: 10 },
    suggestionItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(17, 24, 39, 0.8)', padding: 12, borderRadius: 12 },
    suggestionIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    suggestionTextContainer: { flex: 1 },
    suggestionTitle: { color: '#E2E8F0', fontSize: 15, fontWeight: '600' },
    suggestionSubtitle: { color: '#94A3B8', fontSize: 13, marginTop: 2 },
    section: { marginTop: 16 },
    sectionTitle: { fontSize: 20, color: '#fff', fontWeight: '600', paddingHorizontal: 16, marginBottom: 16 },
    primaryToolsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 16 },
    primaryToolCard: { width: '100%', marginBottom: 12, borderRadius: 16, overflow: 'hidden' },
    primaryToolGradient: { flex: 1, padding: 20 },
    primaryToolIcon: { alignSelf: 'flex-start', padding: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', marginBottom: 24 },
    primaryToolTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
    primaryToolSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
    hubContainer: { marginHorizontal: 16, backgroundColor: '#1E293B', borderRadius: 16, overflow: 'hidden' },
    hubTabs: { flexDirection: 'row', backgroundColor: '#111827' },
    hubTab: { flex: 1, alignItems: 'center', paddingVertical: 16, borderBottomWidth: 2, borderBottomColor: 'transparent' },
    hubTabActive: { borderBottomColor: '#34D399' },
    hubTabText: { color: '#94A3B8', fontSize: 14, marginTop: 4 },
    hubTabTextActive: { color: '#34D399' },
    hubContent: { padding: 8 },
    hubFeatureItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8 },
    hubFeatureIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(148, 163, 184, 0.1)', marginRight: 12 },
    hubFeatureText: { flex: 1, color: '#E2E8F0', fontSize: 15 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.8)', justifyContent: 'flex-end' },
    modalContainer: { backgroundColor: '#1E293B', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, borderWidth: 1, borderColor: '#333' },
    modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    modalIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    modalTitle: { flex: 1, fontSize: 18, color: '#fff', fontWeight: 'bold' },
    closeButton: { padding: 4 },
    modalDetails: { fontSize: 16, color: '#94A3B8', lineHeight: 24, marginBottom: 24 },
    modalButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8 },
    modalButtonText: { color: '#111827', fontSize: 16, fontWeight: 'bold' },
});