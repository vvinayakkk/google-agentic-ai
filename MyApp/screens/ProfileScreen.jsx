import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    Image,
    TouchableOpacity,
    Switch,
    SafeAreaView,
    Alert, // Import Alert for better user feedback
} from 'react-native';
import { Feather, MaterialCommunityIcons, AntDesign, FontAwesome, FontAwesome5 } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

// --- Theme Colors from theme.md ---
const theme = {
    primaryGreen: '#4CAF50',
    secondaryGreen: '#66BB6A',
    darkGreen: '#2E7D32',
    skyBlue: '#2196F3',
    lightBlue: '#64B5F6',
    orange: '#FF9800',
    red: '#F44336',
    gray: '#9E9E9E',
    lightGray: '#F5F5F5',
    white: '#FFFFFF',
};

// --- Reusable Components ---

const ProfileCard = ({ children }) => (
    <View style={styles.card}>{children}</View>
);

const Section = ({ title, children }) => (
    <View style={styles.sectionContainer}>
        {title && <Text style={styles.sectionTitle}>{title}</Text>}
        <ProfileCard>{children}</ProfileCard>
    </View>
);

const ProfileRow = ({ icon, text, isToggle, isDestructive, onValueChange, value, onPress }) => (
    <TouchableOpacity style={styles.row} onPress={onPress} disabled={isToggle}>
        <View style={styles.rowLeft}>
            {icon}
            <Text style={[styles.rowText, isDestructive && styles.destructiveText]}>
                {text}
            </Text>
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


// --- Main Profile Screen Component ---

const ProfileScreen = () => {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [profileImage, setProfileImage] = useState('https://placehold.co/100x100/EFEFEF/333?text=J');
    const toggleSwitch = () => setIsDarkMode(previousState => !previousState);

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
    
    // Dummy onPress handlers for demonstration
    const handleChangePassword = () => Alert.alert("Navigation", "Navigate to Change Password screen.");
    const handleLanguage = () => Alert.alert("Navigation", "Navigate to Language settings.");
    const handlePolicies = () => Alert.alert("Navigation", "Navigate to Our Policies screen.");
    const handleDeleteAccount = () => Alert.alert("Danger", "Are you sure you want to delete your account?", [{ text: "Cancel" }, { text: "Delete", style: "destructive" }]);
    const handleLogout = () => Alert.alert("Logout", "Are you sure you want to logout?", [{ text: "Cancel" }, { text: "Logout", style: "destructive" }]);
    const handleBuyCoins = () => Alert.alert("Navigation", "Navigate to the coin purchasing screen.");

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <ScrollView showsVerticalScrollIndicator={false}>
                    <View style={styles.headerSmall}>
                        <Text style={styles.headerTitleSmall}>Profile</Text>
                        <View style={styles.headerUnderlineSmall} />
                    </View>

                    {/* --- User Info Card --- */}
                    <View style={styles.userInfoCard}>
                        <View style={styles.userInfoTop}>
                            <Image
                                source={{ uri: profileImage }}
                                style={styles.profileImage}
                            />
                            <View style={styles.userInfoTextContainer}>
                                <Text style={styles.userName}>John Doe</Text>
                                <Text style={styles.userEmail}>john.doe@email.com</Text>
                            </View>
                            <TouchableOpacity style={styles.cameraIcon} onPress={handlePickImage}>
                                <Feather name="camera" size={24} color={theme.darkGreen} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.pointsContainer}>
                            <FontAwesome name="star" size={16} color={theme.white} />
                            <Text style={styles.pointsText}>980 Points</Text>
                        </View>
                    </View>

                    {/* --- Sections --- */}
                    <Section title="Purchase Coins">
                        <ProfileRow icon={<FontAwesome5 name="money-bill-wave" size={20} color={theme.darkGreen} />} text="Buy Now" onPress={handleBuyCoins} />
                    </Section>

                    <Section title="Security & Language">
                        <ProfileRow icon={<Feather name="lock" size={24} color={theme.darkGreen} />} text="Change Password" onPress={handleChangePassword} />
                        <View style={styles.divider} />
                        <ProfileRow icon={<FontAwesome name="language" size={24} color={theme.darkGreen} />} text="Language" onPress={handleLanguage} />
                    </Section>

                    <Section title="Preferences">
                        <ProfileRow icon={<Feather name="moon" size={24} color={theme.darkGreen} />} text="Dark Mode" isToggle={true} value={isDarkMode} onValueChange={toggleSwitch} />
                        <View style={styles.divider} />
                        <ProfileRow icon={<MaterialCommunityIcons name="scale-balance" size={24} color={theme.darkGreen} />} text="Our Polices" onPress={handlePolicies} />
                    </Section>

                    <Section title="Account Management">
                        <ProfileRow icon={<AntDesign name="delete" size={24} color={theme.red} />} text="Delete Account" isDestructive onPress={handleDeleteAccount} />
                        <View style={styles.divider} />
                        <ProfileRow icon={<AntDesign name="logout" size={24} color={theme.red} />} text="Logout" isDestructive onPress={handleLogout} />
                    </Section>

                </ScrollView>
            </View>
        </SafeAreaView>
    );
};

// --- Styles ---

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: theme.lightGray,
    },
    container: {
        flex: 1,
        backgroundColor: theme.lightGray,
        paddingHorizontal: 20,
    },
    headerSmall: {
        alignItems: 'center',
        marginVertical: 12,
    },
    headerTitleSmall: {
        fontSize: 22,
        fontWeight: 'bold',
        color: theme.darkGreen,
    },
    headerUnderlineSmall: {
        width: 40,
        height: 3,
        backgroundColor: theme.primaryGreen,
        borderRadius: 2,
        marginTop: 6,
    },
    userInfoCard: {
        backgroundColor: theme.secondaryGreen,
        borderRadius: 25,
        padding: 20,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    userInfoTop: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    profileImage: {
        width: 70,
        height: 70,
        borderRadius: 35,
        borderWidth: 2,
        borderColor: theme.white,
    },
    userInfoTextContainer: {
        marginLeft: 16,
        flex: 1,
    },
    userName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.white,
    },
    userEmail: {
        fontSize: 14,
        color: theme.white,
        marginTop: 4,
    },
    cameraIcon: {
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        padding: 8,
        borderRadius: 20,
    },
    pointsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.primaryGreen,
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 16,
        alignSelf: 'flex-start',
        marginTop: 16,
        marginLeft: 86, // Aligns with the text
    },
    pointsText: {
        color: theme.white,
        fontSize: 14,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    sectionContainer: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.darkGreen,
        marginBottom: 12,
    },
    card: {
        backgroundColor: theme.white,
        borderRadius: 12,
        paddingHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rowText: {
        fontSize: 16,
        color: theme.darkGreen,
        marginLeft: 16,
    },
    destructiveText: {
        color: theme.red,
    },
    divider: {
        height: 1,
        backgroundColor: theme.lightGray,
        marginHorizontal: -16, // Extends to card edges
    },
});

export default ProfileScreen;