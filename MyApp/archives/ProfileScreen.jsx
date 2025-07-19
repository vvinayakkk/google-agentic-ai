import React, { useState, useRef, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    Image,
    TouchableOpacity,
    Switch,
    SafeAreaView,
    Alert,
    Animated,
    Dimensions,
} from 'react-native';
import { Feather, MaterialCommunityIcons, AntDesign, FontAwesome, FontAwesome5 } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { BlurView } from 'expo-blur';
import Toast from 'react-native-toast-message';
import { Easing } from 'react-native';

// --- THEME & DIMENSIONS ---
const theme = {
    primaryGreen: '#4CAF50',
    secondaryGreen: '#66BB6A',
    darkGreen: '#2E7D32',
    skyBlue: '#2196F3',
    lightBlue: '#64B5F6',
    orange: '#FF9800',
    red: '#F44336',
    gray: '#9E9E9E',
    darkGray: '#616161',
    lightGray: '#F5F5F5',
    white: '#FFFFFF',
};

const { height, width } = Dimensions.get('window');
const HEADER_MAX_HEIGHT = 240;
const HEADER_MIN_HEIGHT = 80;
const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

// --- DUMMY DATA ---
let logoAsset;
try {
    logoAsset = require('../assets/logo.png');
} catch (e) {
    logoAsset = undefined; // Gracefully handle if logo is not found
}
const DEFAULT_PROFILE_IMAGE = 'https://placehold.co/100x100/EFEFEF/333?text=J';

// --- REUSABLE COMPONENTS ---

// Animated wrapper for list items
const AnimatedListItem = ({ children, index }) => {
    const slideAnim = useRef(new Animated.Value(50)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 500,
            delay: index * 100,
            useNativeDriver: true,
        }).start();

        Animated.timing(slideAnim, {
            toValue: 0,
            duration: 500,
            delay: index * 100,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
        }).start();
    }, [slideAnim, opacityAnim, index]);

    return (
        <Animated.View style={{ opacity: opacityAnim, transform: [{ translateY: slideAnim }] }}>
            {children}
        </Animated.View>
    );
};

const ProfileCard = ({ children, style }) => (
    <View style={[styles.card, style]}>{children}</View>
);

const Section = ({ title, children, index }) => (
    <AnimatedListItem index={index}>
        <View style={styles.sectionContainer}>
            {title && <Text style={styles.sectionTitle}>{title}</Text>}
            <ProfileCard>{children}</ProfileCard>
        </View>
    </AnimatedListItem>
);

const ProfileRow = ({ icon, text, isToggle, isDestructive, onValueChange, value, onPress }) => (
    <TouchableOpacity style={styles.row} onPress={onPress} disabled={isToggle} activeOpacity={0.7}>
        <View style={styles.rowLeft}>
            {icon}
            <Text style={[styles.rowText, isDestructive && styles.destructiveText]}>{text}</Text>
        </View>
        {isToggle ? (
            <Switch
                trackColor={{ false: theme.gray, true: theme.primaryGreen }}
                thumbColor={theme.white}
                ios_backgroundColor="#3e3e3e"
                onValueChange={onValueChange}
                value={value}
            />
        ) : (
            <Feather name="chevron-right" size={24} color={theme.gray} />
        )}
    </TouchableOpacity>
);

const CtaRow = ({ icon, text, onPress }) => (
    <TouchableOpacity style={styles.ctaRow} onPress={onPress} activeOpacity={0.8}>
        <View style={styles.ctaIconContainer}>
            {icon}
        </View>
        <Text style={styles.ctaText}>{text}</Text>
        <Feather name="arrow-right-circle" size={24} color={theme.white} />
    </TouchableOpacity>
);

// --- MAIN PROFILE SCREEN ---
const ProfileScreen = () => {
    // --- STATE & REFS ---
    // Note: isLoggedIn is now false by default and isn't changed by the UI.
    // You can manually set it to `true` here to test the "logged-in" view.
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [profileImage, setProfileImage] = useState(DEFAULT_PROFILE_IMAGE);
    const scrollY = useRef(new Animated.Value(0)).current;

    // --- HANDLERS ---
    const handleSignInNavigation = () => {
        Alert.alert(
            "Navigation",
            "This would take you to a dedicated Sign-In / Sign-Up page.",
            [{ text: "OK" }]
        );
    };

    const handleLogout = () => {
        Alert.alert("Logout", "Are you sure you want to logout?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Logout",
                style: "destructive",
                onPress: () => {
                    setIsLoggedIn(false);
                    Toast.show({
                        type: 'success',
                        text1: 'Logged Out',
                        text2: 'You have been successfully logged out.',
                    });
                }
            }
        ]);
    };
    
    const handlePickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
            return;
        }
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });
        if (!result.canceled && result.assets && result.assets.length > 0) {
            setProfileImage(result.assets[0].uri);
        }
    };

    const toggleDarkMode = () => setIsDarkMode(previousState => !previousState);
    const alertNotImplemented = (feature) => Alert.alert("Coming Soon", `${feature} is not yet implemented.`);

    // --- ANIMATION VALUES ---
    const headerTranslate = scrollY.interpolate({
        inputRange: [0, HEADER_SCROLL_DISTANCE],
        outputRange: [0, -HEADER_SCROLL_DISTANCE],
        extrapolate: 'clamp',
    });
    const headerScale = scrollY.interpolate({
        inputRange: [-HEADER_MAX_HEIGHT, 0, HEADER_SCROLL_DISTANCE],
        outputRange: [2.5, 1, 0.75],
        extrapolate: 'clamp',
    });
     const headerOpacity = scrollY.interpolate({
        inputRange: [0, HEADER_SCROLL_DISTANCE / 2],
        outputRange: [1, 0],
        extrapolate: 'clamp',
    });

    // --- SECTIONS DATA ---
    const sections = [
        {
            title: "Get More Features",
            rows: [
                { type: 'cta', icon: <FontAwesome5 name="coins" size={22} color={theme.white} />, text: "Purchase Coins", onPress: () => alertNotImplemented("Coin Purchase") },
            ]
        },
        {
            title: "Security & Language",
            rows: [
                { icon: <Feather name="lock" size={24} color={theme.darkGreen} />, text: "Change Password", onPress: () => alertNotImplemented("Change Password") },
                { icon: <FontAwesome name="language" size={24} color={theme.darkGreen} />, text: "Language", onPress: () => alertNotImplemented("Language Settings") },
            ]
        },
        {
            title: "Preferences",
            rows: [
                { icon: <Feather name="moon" size={24} color={theme.darkGreen} />, text: "Dark Mode", isToggle: true, value: isDarkMode, onValueChange: toggleDarkMode },
                { icon: <MaterialCommunityIcons name="scale-balance" size={24} color={theme.darkGreen} />, text: "Our Policies", onPress: () => alertNotImplemented("Policies Screen") },
            ]
        },
        {
            title: "Account Management",
            rows: [
                { icon: <AntDesign name="delete" size={24} color={theme.red} />, text: "Delete Account", isDestructive: true, onPress: () => alertNotImplemented("Delete Account") },
                { icon: <AntDesign name="logout" size={24} color={theme.red} />, text: "Logout", isDestructive: true, onPress: handleLogout },
            ]
        },
    ];

    // --- RENDER LOGIC ---
    const renderContent = () => {
        if (!isLoggedIn) {
            return (
                <View style={{ position: 'relative', marginTop: 24 }}>
                    <View style={{ opacity: 0.3 }} pointerEvents="none">
                        {/* Render dummy content for background blur */}
                        {sections.map((section, index) => (
                            <Section key={index} title={section.title} index={index}>
                                {section.rows.map((row, rowIndex) => (
                                    <View key={rowIndex}>
                                        {row.type === 'cta' ? (
                                             <CtaRow {...row} />
                                        ) : (
                                             <ProfileRow {...row} />
                                        )}
                                        {rowIndex < section.rows.length - 1 && <View style={styles.divider} />}
                                    </View>
                                ))}
                            </Section>
                        ))}
                    </View>
                    <BlurView intensity={80} tint="light" style={styles.lockOverlay}>
                        <View style={styles.lockContent}>
                            <FontAwesome name="lock" size={42} color={theme.darkGray} />
                            <Text style={styles.lockText}>Sign in to unlock all features</Text>
                        </View>
                    </BlurView>
                </View>
            );
        }

        return sections.map((section, index) => (
            <Section key={index} title={section.title} index={index}>
                {section.rows.map((row, rowIndex) => (
                    <View key={rowIndex}>
                         {row.type === 'cta' ? (
                            <CtaRow {...row} />
                        ) : (
                            <ProfileRow {...row} />
                        )}
                        {rowIndex < section.rows.length - 1 && section.rows.length > 1 && <View style={styles.divider} />}
                    </View>
                ))}
            </Section>
        ));
    };
    
    return (
        <SafeAreaView style={styles.safeArea}>
            <Animated.View style={[styles.header, { transform: [{ translateY: headerTranslate }] }]}>
                <Animated.View style={[styles.headerContent, { transform: [{ scale: headerScale }], opacity: headerOpacity }]}>
                    {isLoggedIn ? (
                        <View style={styles.userInfoCard}>
                            <View style={styles.userInfoTop}>
                                <TouchableOpacity onPress={handlePickImage} activeOpacity={0.8}>
                                     <Image source={{ uri: profileImage }} style={styles.profileImage} />
                                     <View style={styles.cameraIconContainer}>
                                         <Feather name="camera" size={16} color={theme.darkGreen} />
                                     </View>
                                </TouchableOpacity>
                                <View style={styles.userInfoTextContainer}>
                                    <Text style={styles.userName}>Jai Kisan</Text>
                                    <Text style={styles.userEmail}>jai.kisan@example.com</Text>
                                </View>
                            </View>
                            <View style={styles.pointsContainer}>
                                <FontAwesome5 name="coins" size={16} color={theme.orange} />
                                <Text style={styles.pointsText}>250 Coins</Text>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.accountCardGreen}>
                            <View style={styles.accountRow}>
                                <View style={styles.avatarBox}>
                                    {logoAsset ? (
                                        <Image source={logoAsset} style={styles.avatarImg} accessibilityLabel="App Logo" />
                                    ) : (
                                        <View style={[styles.avatarImg, styles.logoPlaceholder]}><Text style={styles.logoPlaceholderText}>Logo</Text></View>
                                    )}
                                </View>
                                <View style={{ flex: 1, marginLeft: 14 }}>
                                    <Text style={styles.accountTitleGreen}>Your Account</Text>
                                    <Text style={styles.accountSubtitleGreen}>Join the KisanAI Community</Text>
                                </View>
                            </View>
                            <TouchableOpacity style={styles.signInBtn} accessibilityRole="button" onPress={handleSignInNavigation} activeOpacity={0.8}>
                                <Text style={styles.signInBtnText}>Sign In & Unlock</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </Animated.View>
            </Animated.View>

            <Animated.ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContainer}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: true }
                )}
                scrollEventThrottle={16}>
                {renderContent()}
            </Animated.ScrollView>
            <Toast />
        </SafeAreaView>
    );
};


const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.lightGray },
    scrollContainer: { paddingTop: HEADER_MAX_HEIGHT, paddingHorizontal: 20, paddingBottom: 20 },
    container: { flex: 1, backgroundColor: theme.lightGray },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: theme.lightGray,
        overflow: 'hidden',
        height: HEADER_MAX_HEIGHT,
        zIndex: 100,
    },
    headerContent: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 20,
        paddingTop: 30, // Adjust for status bar
    },
    userInfoCard: {
        backgroundColor: theme.white,
        borderRadius: 25,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
    },
    userInfoTop: { flexDirection: 'row', alignItems: 'center' },
    profileImage: { width: 70, height: 70, borderRadius: 35, borderWidth: 3, borderColor: theme.primaryGreen },
    cameraIconContainer: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: theme.white,
        borderRadius: 15,
        padding: 6,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    userInfoTextContainer: { marginLeft: 16, flex: 1 },
    userName: { fontSize: 22, fontWeight: 'bold', color: theme.darkGreen },
    userEmail: { fontSize: 14, color: theme.gray, marginTop: 4 },
    pointsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF8E1',
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 16,
        alignSelf: 'flex-start',
        marginTop: 16,
        marginLeft: 86,
    },
    pointsText: { color: theme.orange, fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
    sectionContainer: { marginBottom: 24 },
    sectionTitle: { fontSize: 18, fontWeight: '600', color: theme.darkGray, marginBottom: 12, paddingHorizontal: 5 },
    card: {
        backgroundColor: theme.white,
        borderRadius: 16,
        paddingHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16 },
    rowLeft: { flexDirection: 'row', alignItems: 'center' },
    rowText: { fontSize: 16, color: theme.darkGreen, marginLeft: 16, fontWeight: '500' },
    destructiveText: { color: theme.red },
    divider: { height: 1, backgroundColor: theme.lightGray, marginHorizontal: -16 },
    accountCardGreen: {
        backgroundColor: theme.primaryGreen,
        borderRadius: 25,
        padding: 20,
        shadowColor: theme.darkGreen,
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
        elevation: 10,
    },
    accountRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    avatarBox: { width: 60, height: 60, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    avatarImg: { width: 44, height: 44, borderRadius: 12 },
    logoPlaceholder: { backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center' },
    logoPlaceholderText: { color: '#888' },
    accountTitleGreen: { fontSize: 20, fontWeight: 'bold', color: theme.white },
    accountSubtitleGreen: { fontSize: 15, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
    signInBtn: { backgroundColor: theme.white, borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginTop: 2 },
    signInBtnText: { color: theme.primaryGreen, fontWeight: 'bold', fontSize: 17, letterSpacing: 0.2 },
    lockOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', borderRadius: 16 },
    lockContent: { alignItems: 'center', padding: 20 },
    lockText: { marginTop: 16, fontSize: 16, color: theme.darkGray, textAlign: 'center', fontWeight: '600' },
    ctaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.darkGreen,
        padding: 16,
        borderRadius: 16,
        marginVertical: 8,
    },
    ctaIconContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        padding: 10,
        borderRadius: 12,
        marginRight: 16,
    },
    ctaText: {
        flex: 1,
        fontSize: 17,
        fontWeight: 'bold',
        color: theme.white,
    },
});

export default ProfileScreen;