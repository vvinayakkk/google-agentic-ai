import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Image,
  Dimensions,
  Modal,
} from 'react-native';
import { Svg, Path } from 'react-native-svg';

// --- Theme & Design System ---
const theme = {
  colors: {
    primaryGreen: '#4CAF50',
    darkGreen: '#2E7D32',
    lightGreen: '#E8F5E9',
    skyBlue: '#2196F3',
    red: '#F44336',
    lightRed: '#FFEBEE',
    gray: '#9E9E9E',
    lightGray: '#F5F5F5',
    white: '#FFFFFF',
    textPrimary: '#212121',
    textSecondary: '#757575',
    blue: '#2F80ED',
    orange: '#FF9800',
  },
  typography: {
    headingMedium: { fontSize: 24, fontWeight: 'bold' },
    headingSmall: { fontSize: 20, fontWeight: 'bold' },
    bodyLarge: { fontSize: 16, fontWeight: 'normal' },
    bodyMedium: { fontSize: 14, fontWeight: 'normal' },
    bodySmall: { fontSize: 12, fontWeight: 'normal' },
  },
  spacing: {
    small: 8,
    medium: 16,
    large: 24,
  },
  borderRadius: {
    medium: 12,
    large: 16,
    full: 999,
  },
};

// --- Dimensions ---
const { width } = Dimensions.get('window');

// --- Mock Data & Assets ---
const allCrops = [
    { name: 'Sugarcane', image: 'https://img.icons8.com/plasticine/100/sugar-cane.png' },
    { name: 'Mango', image: 'https://img.icons8.com/plasticine/100/mango.png' },
    { name: 'Corn', image: 'https://img.icons8.com/plasticine/100/corn.png' },
    { name: 'Grapes', image: 'https://img.icons8.com/plasticine/100/grapes.png' },
    { name: 'Almond', image: 'https://img.icons8.com/plasticine/100/almond.png' },
    { name: 'Apple', image: 'https://img.icons8.com/plasticine/100/apple.png' },
    { name: 'Apricot', image: 'https://img.icons8.com/plasticine/100/apricot.png' },
    { name: 'Banana', image: 'https://img.icons8.com/plasticine/100/banana.png' },
    { name: 'Barley', image: 'https://img.icons8.com/plasticine/100/barley.png' },
    { name: 'Bean', image: 'https://img.icons8.com/plasticine/100/bean.png' },
    { name: 'Bitter Gourd', image: 'https://img.icons8.com/plasticine/100/bitter-gourd.png' },
    { name: 'Cabbage', image: 'https://img.icons8.com/plasticine/100/cabbage.png' },
    { name: 'Carrot', image: 'https://img.icons8.com/plasticine/100/carrot.png' },
    { name: 'Cauliflower', image: 'https://img.icons8.com/plasticine/100/cauliflower.png' },
];

const initialUserCrops = allCrops.slice(0, 4);
const diseaseImg1 = require('../assets/image.png');
const diseaseImg2 = require('../assets/image.png');

// --- Icon Components ---
const MoreIcon = () => ( <Svg width="24" height="24" viewBox="0 0 24 24" fill="none"><Path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" fill={theme.colors.textPrimary}/></Svg>);
const CropsIcon = ({ active }) => ( <Svg width="24" height="24" viewBox="0 0 24 24" fill="none"><Path d="M21.4,7.5A8.46,8.46,0,0,0,13,2.6a8.46,8.46,0,0,0-8.4,4.9C2.7,8.2,2,10.6,2,12.1a3.9,3.9,0,0,0,3.9,3.9H6V13.2H5.9A1.1,1.1,0,0,1,4.8,12c0-1.2.6-3.3,2.4-4.2A5.66,5.66,0,0,1,13,5.4a5.66,5.66,0,0,1,5.8,2.4,5.38,5.38,0,0,1,1.2,3.3,4.6,4.6,0,0,1-4.6,4.6h-.9V18h.9a6.6,6.6,0,0,0,6-6.6C22,10.1,21.8,8.7,21.4,7.5Z" fill={active ? theme.colors.darkGreen : theme.colors.textSecondary} /><Path d="M12,8.4a.9.9,0,0,0-.9.9V21.1a.9.9,0,1,0,1.8,0V9.3A.9.9,0,0,0,12,8.4Z" fill={active ? theme.colors.darkGreen : theme.colors.textSecondary} /></Svg>);
const CommunityIcon = ({ active }) => ( <Svg width="24" height="24" viewBox="0 0 24 24" fill="none"><Path d="M16.5,12A4.5,4.5,0,1,0,12,7.5,4.5,4.5,0,0,0,16.5,12ZM12,5.5A6.5,6.5,0,1,1,5.5,12,6.5,6.5,0,0,1,12,5.5Z" fill={active ? theme.colors.darkGreen : theme.colors.textSecondary} /><Path d="M21.5,16.5a.9.9,0,0,0-.9.9,4.7,4.7,0,0,1-4.7,4.7H8.1a4.7,4.7,0,0,1-4.7-4.7.9.9,0,0,0-1.8,0,6.5,6.5,0,0,0,6.5,6.5h7.8a6.5,6.5,0,0,0,6.5-6.5A.9.9,0,0,0,21.5,16.5Z" fill={active ? theme.colors.darkGreen : theme.colors.textSecondary} /></Svg>);
const MarketIcon = ({ active }) => ( <Svg width="24" height="24" viewBox="0 0 24 24" fill="none"><Path d="M21.8,7.8,19.4,4.2a.9.9,0,0,0-.8-.4H5.4a.9.9,0,0,0-.8.4L2.2,7.8a.9.9,0,0,0,0,.9L4.6,12.3a.9.9,0,0,0,.8.4H8.1V20a.9.9,0,0,0,.9.9h5.1a.9.9,0,0,0,.9-.9V12.7h2.8a.9.9,0,0,0,.8-.4l2.4-3.6A.9.9,0,0,0,21.8,7.8ZM4.1,8.2,5.8,5.6H18.2l1.8,2.6ZM14.1,20V12.7H9.9V20Zm-5.1-9.1H5.4L3.5,8.2h5.7Zm12.4,0H15V8.2h5.7Z" fill={active ? theme.colors.darkGreen : theme.colors.textSecondary} /></Svg>);
const UserIcon = ({ active }) => ( <Svg width="24" height="24" viewBox="0 0 24 24" fill="none"><Path d="M12,12A6,6,0,1,0,6,6,6,6,0,0,0,12,12Zm0-10A4,4,0,1,1,8,6,4,4,0,0,1,12,2Z" fill={active ? theme.colors.darkGreen : theme.colors.textSecondary} /><Path d="M12,14a9,9,0,0,0-9,9,.9.9,0,0,0,.9.9H20.1a.9.9,0,0,0,.9-.9A9,9,0,0,0,12,14Zm-7,8a7.1,7.1,0,0,1,14,0Z" fill={active ? theme.colors.darkGreen : theme.colors.textSecondary} /></Svg>);
const BackIcon = () => (<Svg width="24" height="24" viewBox="0 0 24 24" fill="none"><Path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" fill={theme.colors.textPrimary}/></Svg>);
const CloseIcon = () => (<Svg width="16" height="16" viewBox="0 0 24 24" fill="none"><Path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill={theme.colors.white}/></Svg>);

// --- Select Crops Modal ---
const SelectCropsScreen = ({ isVisible, onClose, onSave, initialSelectedCrops }) => {
    const [selected, setSelected] = useState(new Set(initialSelectedCrops.map(c => c.name)));

    const handleSelect = (crop) => {
        const newSelection = new Set(selected);
        if (newSelection.has(crop.name)) {
            newSelection.delete(crop.name);
        } else if (newSelection.size < 8) {
            newSelection.add(crop.name);
        }
        setSelected(newSelection);
    };

    const handleSave = () => {
        const selectedCrops = allCrops.filter(crop => selected.has(crop.name));
        onSave(selectedCrops);
        onClose();
    };

    return (
        <Modal animationType="slide" transparent={false} visible={isVisible} onRequestClose={onClose}>
            <SafeAreaView style={styles.modalSafeArea}>
                <View style={styles.modalHeader}>
                    <TouchableOpacity onPress={onClose}><BackIcon /></TouchableOpacity>
                    <Text style={styles.modalTitle}>Select crops</Text>
                    <Text style={styles.modalCounter}>{selected.size}/8</Text>
                </View>
                <ScrollView contentContainerStyle={styles.modalScroll}>
                    <Text style={styles.modalSubtitle}>Select up to 8 crops you are interested in</Text>
                    <View style={styles.modalGrid}>
                        {allCrops.map(crop => {
                            const isSelected = selected.has(crop.name);
                            return (
                                <TouchableOpacity key={crop.name} style={styles.modalCropItem} onPress={() => handleSelect(crop)}>
                                    <View style={[styles.modalCropCircle, isSelected && styles.modalCropCircleSelected]}>
                                        <Image source={{ uri: crop.image }} style={styles.modalCropImage} />
                                        {isSelected && (
                                            <View style={styles.closeIconContainer}>
                                                <CloseIcon />
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.modalCropName}>{crop.name}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </ScrollView>
                <View style={styles.modalFooter}>
                    <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                        <Text style={styles.saveButtonText}>Save</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </Modal>
    );
};


// --- Bottom Navigation Component ---
const BottomNavBar = ({ activeTab, onTabPress }) => {
    const navItems = [
        { name: 'Your crops', icon: CropsIcon },
        { name: 'Community', icon: CommunityIcon },
        { name: 'Market', icon: MarketIcon },
        { name: 'You', icon: UserIcon },
    ];

    return (
        <View style={styles.bottomNavContainer}>
            {navItems.map((item) => {
                const isActive = activeTab === item.name;
                const Icon = item.icon;
                return (
                    <TouchableOpacity key={item.name} style={styles.navItem} onPress={() => onTabPress(item.name)}>
                        <View style={[styles.navIconContainer, isActive && styles.navIconContainerActive]}>
                            <Icon active={isActive} />
                        </View>
                        <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{item.name}</Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};


// --- Main HomeScreen Component ---
const HomeScreen = () => {
    const [activeTab, setActiveTab] = useState('Community');
    const [userCrops, setUserCrops] = useState(initialUserCrops);
    const [isCropModalVisible, setCropModalVisible] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.white} />
      <SelectCropsScreen 
        isVisible={isCropModalVisible}
        onClose={() => setCropModalVisible(false)}
        onSave={setUserCrops}
        initialSelectedCrops={userCrops}
      />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.newHeaderContainer}>
            <View style={styles.titleRow}>
                <Text style={styles.appName}>Mazraaty</Text>
                <TouchableOpacity><MoreIcon /></TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cropScroll}>
                {userCrops.map(crop => (
                    <TouchableOpacity key={crop.name} style={styles.cropCircle}>
                        <Image source={{uri: crop.image}} style={styles.cropImage} />
                    </TouchableOpacity>
                ))}
                <TouchableOpacity style={[styles.cropCircle, styles.addCropCircle]} onPress={() => setCropModalVisible(true)}>
                    <Text style={styles.addCropIcon}>+</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.infoCardScroll}>
            <View style={styles.weatherCard}><View><Text style={styles.weatherLocation}>Mumbai, 17 Jul</Text><Text style={styles.weatherDetails}>Foggy • 27°C / 31°C</Text></View><View style={styles.weatherTempContainer}><Text style={styles.weatherIcon}>🌥️</Text><Text style={styles.weatherTemp}>30°C</Text></View></View>
            <View style={[styles.sprayingCard, {backgroundColor: theme.colors.lightRed}]}><Text style={styles.sprayingTitle}>Spraying conditions</Text><Text style={[styles.sprayingStatus, {color: theme.colors.red}]}>Unfavourable</Text></View>
        </ScrollView>
        
        <View style={styles.scanCard}>
          <View style={styles.scanRow}>
            <View style={styles.scanIconWrap}>
              <Text style={styles.scanIcon}>📸</Text>
            </View>
            <View>
              <Text style={styles.scanCount}><Text style={{ color: theme.colors.darkGreen }}>98</Text> Scans Available</Text>
              <Text style={styles.scanPoints}>980 Points (10 points per scan)</Text>
            </View>
             <TouchableOpacity><Text style={styles.infoIcon}>ⓘ</Text></TouchableOpacity>
          </View>
          <View style={styles.scanInfoBox}>
            <Text style={styles.scanInfoText}>
              <Text style={{ color: theme.colors.blue }}>ⓘ </Text>
              Use your scans to identify plant diseases by taking photos of affected plants. Subscribe to Premium for unlimited scans.
            </Text>
          </View>
        </View>

        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Common Diseases</Text><TouchableOpacity><Text style={styles.seeAllText}>All →</Text></TouchableOpacity></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
          <View style={styles.diseaseCard}><Image source={diseaseImg1} style={styles.diseaseImg} /><View style={styles.diseaseTag}><Text style={styles.diseaseTagText}>Common</Text></View><Text style={styles.diseaseTitle}>Early Blight</Text><Text style={styles.diseaseDesc}>Early blight causes dark, concentric spots on potato leav...</Text><TouchableOpacity style={styles.learnBtn}><Text style={styles.learnBtnText}>ⓘ Learn More</Text></TouchableOpacity></View>
          <View style={styles.diseaseCard}><Image source={diseaseImg2} style={styles.diseaseImg} /><View style={styles.diseaseTag}><Text style={styles.diseaseTagText}>Common</Text></View><Text style={styles.diseaseTitle}>Head Rot</Text><Text style={styles.diseaseDesc}>Healthy heads develop strong, dark spots and rot...</Text><TouchableOpacity style={styles.learnBtn}><Text style={styles.learnBtnText}>ⓘ Learn More</Text></TouchableOpacity></View>
        </ScrollView>

        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Key Features</Text></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
            <View style={[styles.featureCard, {backgroundColor: theme.colors.lightRed}]}><View style={styles.featureIconContainer}><Text>🧩</Text></View><Text style={styles.featureCardTitle}>Plant Disease Detection</Text><Text style={styles.featureCardDesc}>Identify plant diseases with AI technology</Text><TouchableOpacity><Text style={styles.featureLearnMore}>Learn More</Text></TouchableOpacity></View>
            <View style={[styles.featureCard, {backgroundColor: theme.colors.lightGreen}]}><View style={styles.featureIconContainer}><Text>🌿</Text></View><Text style={styles.featureCardTitle}>Plant Care Guides</Text><Text style={styles.featureCardDesc}>Get detailed guides for plant care</Text><TouchableOpacity><Text style={styles.featureLearnMore}>Learn More</Text></TouchableOpacity></View>
        </ScrollView>

        <View style={styles.premiumCard}>
          <View style={styles.premiumHeaderRow}>
            <Text style={styles.premiumTitle}>Premium</Text>
            <Text style={styles.specialOffer}>SPECIAL OFFER</Text>
          </View>
          <Text style={styles.premiumSubtitle}>Unlock Premium Features</Text>
          <Text style={styles.premiumDesc}>Get unlimited scans, advanced insights, and priority support</Text>
          <View style={styles.premiumList}>
            <Text style={styles.premiumListItem}>✔ Unlimited plant scans</Text>
            <Text style={styles.premiumListItem}>✔ Detailed plant care guides</Text>
            <Text style={styles.premiumListItem}>✔ Priority customer support</Text>
          </View>
          <TouchableOpacity style={styles.subscribeBtn}><Text style={styles.subscribeBtnText}>Subscribe Now</Text></TouchableOpacity>
        </View>

      </ScrollView>
      
      <BottomNavBar activeTab={activeTab} onTabPress={setActiveTab} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.white },
  scrollContent: { paddingBottom: 120 },
  newHeaderContainer: { paddingHorizontal: theme.spacing.large, paddingTop: theme.spacing.medium, backgroundColor: theme.colors.white },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.medium },
  appName: { ...theme.typography.headingMedium, color: theme.colors.textPrimary },
  cropScroll: { paddingBottom: theme.spacing.medium },
  cropCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.white, justifyContent: 'center', alignItems: 'center', marginRight: theme.spacing.medium, borderWidth: 1, borderColor: theme.colors.gray },
  cropImage: { width: 64, height: 64, borderRadius: 32 },
  addCropCircle: { backgroundColor: theme.colors.lightGray, borderStyle: 'dashed' },
  addCropIcon: { fontSize: 24, color: theme.colors.textSecondary },
  infoCardScroll: { paddingHorizontal: theme.spacing.large, paddingTop: theme.spacing.small, paddingBottom: theme.spacing.medium },
  weatherCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.full, paddingVertical: theme.spacing.small, paddingHorizontal: theme.spacing.medium, marginRight: theme.spacing.medium, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
  weatherLocation: { ...theme.typography.bodyMedium, fontWeight: 'bold', color: theme.colors.textPrimary },
  weatherDetails: { ...theme.typography.bodySmall, color: theme.colors.textSecondary },
  weatherTempContainer: { flexDirection: 'row', alignItems: 'center', marginLeft: theme.spacing.large },
  weatherIcon: { fontSize: 20, marginRight: theme.spacing.small },
  weatherTemp: { ...theme.typography.headingMedium, color: theme.colors.textPrimary },
  sprayingCard: { justifyContent: 'center', borderRadius: theme.borderRadius.full, paddingHorizontal: theme.spacing.medium, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
  sprayingTitle: { ...theme.typography.bodySmall, color: theme.colors.textSecondary },
  sprayingStatus: { ...theme.typography.bodyMedium, fontWeight: 'bold' },
  scanCard: { backgroundColor: theme.colors.lightGreen, marginHorizontal: theme.spacing.large, borderRadius: theme.borderRadius.large, padding: theme.spacing.medium, marginBottom: theme.spacing.large},
  scanRow: { flexDirection: 'row', alignItems: 'center' },
  scanIconWrap: { backgroundColor: theme.colors.white, borderRadius: 10, width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  scanIcon: { fontSize: 22, color: theme.colors.darkGreen },
  scanCount: { fontSize: 18, fontWeight: 'bold', color: theme.colors.textPrimary },
  scanPoints: { fontSize: 14, color: theme.colors.textSecondary },
  infoIcon: { marginLeft: 'auto', fontSize: 18, color: theme.colors.textSecondary },
  scanInfoBox: { backgroundColor: '#D1E7DD', borderRadius: 8, padding: 10, marginTop: 12 },
  scanInfoText: { fontSize: 13, color: theme.colors.darkGreen },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: theme.spacing.large, marginBottom: theme.spacing.medium, marginTop: theme.spacing.large },
  sectionTitle: { ...theme.typography.headingSmall, color: theme.colors.textPrimary },
  seeAllText: { ...theme.typography.bodyMedium, color: theme.colors.primaryGreen, fontWeight: 'bold', borderWidth: 1, borderColor: theme.colors.primaryGreen, paddingHorizontal: 12, paddingVertical: 4, borderRadius: theme.borderRadius.full },
  horizontalScroll: { paddingLeft: theme.spacing.large, marginBottom: theme.spacing.large },
  diseaseCard: { backgroundColor: theme.colors.white, borderRadius: theme.borderRadius.large, width: width * 0.6, marginRight: theme.spacing.medium, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, overflow: 'hidden', paddingBottom: theme.spacing.medium },
  diseaseImg: { width: '100%', height: 100, borderTopLeftRadius: theme.borderRadius.large, borderTopRightRadius: theme.borderRadius.large },
  diseaseTag: { position: 'absolute', top: theme.spacing.small, left: theme.spacing.small, backgroundColor: theme.colors.orange, borderRadius: theme.borderRadius.medium, paddingHorizontal: theme.spacing.small, paddingVertical: 4 },
  diseaseTagText: { color: theme.colors.white, ...theme.typography.bodySmall, fontWeight: 'bold' },
  diseaseTitle: { ...theme.typography.bodyLarge, fontWeight: 'bold', color: theme.colors.textPrimary, margin: theme.spacing.medium, marginBottom: 4 },
  diseaseDesc: { ...theme.typography.bodySmall, color: theme.colors.textSecondary, marginHorizontal: theme.spacing.medium, marginBottom: theme.spacing.medium },
  learnBtn: { borderColor: theme.colors.primaryGreen, borderWidth: 1, borderRadius: theme.borderRadius.medium, marginHorizontal: 12, paddingVertical: 6, alignItems: 'center' },
  learnBtnText: { color: theme.colors.darkGreen, fontWeight: 'bold', fontSize: 14 },
  featureCard: { borderRadius: theme.borderRadius.large, width: width * 0.7, marginRight: theme.spacing.medium, padding: 18, marginBottom: 5 },
  featureIconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.white, justifyContent: 'center', alignItems: 'center', marginBottom: theme.spacing.medium },
  featureCardTitle: { fontSize: 16, fontWeight: 'bold', color: '#222', marginBottom: 6 },
  featureCardDesc: { fontSize: 13, color: '#666', marginBottom: 10 },
  featureLearnMore: { color: theme.colors.red, fontWeight: 'bold' },
  premiumCard: { backgroundColor: theme.colors.darkGreen, borderRadius: 18, marginHorizontal: 20, padding: 20, marginBottom: 20, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4 },
  premiumHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  premiumTitle: { color: '#fff', fontWeight: 'bold', fontSize: 18, flex: 1 },
  specialOffer: { backgroundColor: '#FFD600', color: theme.colors.darkGreen, fontWeight: 'bold', fontSize: 12, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  premiumSubtitle: { color: '#fff', fontWeight: 'bold', fontSize: 16, marginBottom: 2 },
  premiumDesc: { color: '#fff', fontSize: 13, marginBottom: 10 },
  premiumList: { marginBottom: 12 },
  premiumListItem: { color: '#fff', fontSize: 14, marginBottom: 2 },
  subscribeBtn: { backgroundColor: '#fff', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  subscribeBtnText: { color: theme.colors.darkGreen, fontWeight: 'bold', fontSize: 16 },
  bottomNavContainer: { flexDirection: 'row', height: 85, backgroundColor: theme.colors.white, position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1, borderTopColor: '#E0E0E0', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.05, shadowRadius: 5, paddingHorizontal: theme.spacing.medium },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navIconContainer: { width: 60, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 16, marginBottom: 4 },
  navIconContainerActive: { backgroundColor: theme.colors.lightGreen },
  navLabel: { ...theme.typography.bodySmall, color: theme.colors.textSecondary },
  navLabelActive: { color: theme.colors.darkGreen, fontWeight: 'bold' },
  modalSafeArea: { flex: 1, backgroundColor: theme.colors.white },
  modalHeader: { flexDirection: 'row', alignItems: 'center', padding: theme.spacing.medium, borderBottomWidth: 1, borderBottomColor: theme.colors.lightGray },
  modalTitle: { ...theme.typography.headingSmall, flex: 1, textAlign: 'center', marginLeft: -24 },
  modalCounter: { ...theme.typography.bodyMedium, color: theme.colors.textSecondary },
  modalScroll: { padding: theme.spacing.large },
  modalSubtitle: { ...theme.typography.bodyLarge, marginBottom: theme.spacing.large },
  modalGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  modalCropItem: { width: (width - theme.spacing.large * 2) / 3 - theme.spacing.medium, alignItems: 'center', marginBottom: theme.spacing.large },
  modalCropCircle: { width: 80, height: 80, borderRadius: 40, borderWidth: 1, borderColor: theme.colors.gray, justifyContent: 'center', alignItems: 'center', marginBottom: theme.spacing.small },
  modalCropCircleSelected: { borderColor: theme.colors.blue },
  modalCropImage: { width: 80, height: 80, borderRadius: 40 },
  closeIconContainer: { position: 'absolute', top: -5, right: -5, backgroundColor: theme.colors.blue, borderRadius: 10, padding: 2 },
  modalCropName: { ...theme.typography.bodyMedium, textAlign: 'center' },
  modalFooter: { padding: theme.spacing.medium, borderTopWidth: 1, borderTopColor: theme.colors.lightGray },
  saveButton: { backgroundColor: theme.colors.blue, padding: theme.spacing.medium, borderRadius: theme.borderRadius.medium, alignItems: 'center' },
  saveButtonText: { color: theme.colors.white, ...theme.typography.bodyLarge, fontWeight: 'bold' },
});

export default HomeScreen;
