import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Animated } from 'react-native';
import { Camera } from 'expo-camera';
import { Feather } from '@expo/vector-icons';

// --- Theme (Colors & Fonts) ---
const theme = {
    colors: {
        green: '#3E7D40',
        darkGreen: '#2E5D30',
        lightGreen: '#EBF2EC',
        white: '#FFFFFF',
        black: '#212121',
        gray: '#8A8A8A',
    },
    typography: {
        fontFamily: 'System', // Replace with your custom font if you have one
    },
    spacing: {
        small: 8,
        medium: 16,
        large: 24,
    },
};

// --- Mock Data for Scan Result ---
const mockScanResult = {
    name: 'Late Blight',
    confidence: '98.4%',
    description: 'Late blight is one of the most devastating diseases of potatoes, caused by the oomycete pathogen Phytophthora infestans. It affects both the foliage and tubers of potato plants, leading to significant yield loss and poor tuber quality.',
};

// --- Reusable Components ---
const AppHeader = ({ onReset }) => (
    <View style={styles.header}>
        <View style={styles.headerPoints}>
            <Feather name="star" size={16} color={theme.colors.green} />
            <Text style={styles.headerPointsText}>980</Text>
        </View>
        <Text style={styles.headerTitle}>Scan Plant</Text>
        <TouchableOpacity onPress={onReset}>
            <Feather name="refresh-cw" size={22} color={theme.colors.gray} />
        </TouchableOpacity>
    </View>
);

const CustomBottomNavBar = () => (
    <View style={styles.navContainer}>
        <View style={styles.navBar}>
            <TouchableOpacity style={styles.navButton}>
                <Feather name="home" size={24} color={theme.colors.gray} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.navButton}>
                <Feather name="file-text" size={24} color={theme.colors.gray} />
            </TouchableOpacity>
            {/* Placeholder for the large central button */}
            <View style={{ width: 60 }} />
            <TouchableOpacity style={styles.navButton}>
                <Feather name="help-circle" size={24} color={theme.colors.gray} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.navButton}>
                <Feather name="user" size={24} color={theme.colors.green} />
            </TouchableOpacity>
        </View>
        {/* Large central button with cradle effect */}
        <View style={styles.navCenter}>
            <View style={styles.navCenterCradle} />
            <TouchableOpacity style={styles.navCenterButton}>
                <Feather name="grid" size={28} color={theme.colors.white} />
            </TouchableOpacity>
        </View>
    </View>
);

const ResultCard = ({ result, onReadMore }) => {
    const slideAnim = useRef(new Animated.Value(300)).current;

    useEffect(() => {
        Animated.timing(slideAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
        }).start();
    }, []);

    return (
        <Animated.View style={[styles.resultCard, { transform: [{ translateY: slideAnim }] }]}>
            <Text style={styles.resultTitle}>{result.name}</Text>
            <Text style={styles.resultConfidence}>Confidence: {result.confidence}</Text>
            <Text style={styles.resultDescription}>{result.description}</Text>
            <TouchableOpacity style={styles.readMoreButton} onPress={onReadMore}>
                <Text style={styles.readMoreButtonText}>Read More</Text>
            </TouchableOpacity>
        </Animated.View>
    );
};


// --- Main Screen Component ---
export default function ScanPlantScreen() {
    const [hasPermission, setHasPermission] = useState(null);
    const [scanResult, setScanResult] = useState(null);

    useEffect(() => {
        (async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === 'granted');
        })();
    }, []);

    const handleScan = () => {
        // This simulates a successful scan.
        // In a real app, you would process the camera frame and get results here.
        setScanResult(mockScanResult);
    };

    const handleReset = () => {
        setScanResult(null);
    };

    if (hasPermission === null) {
        return <View style={styles.loadingContainer}><Text>Requesting permission...</Text></View>;
    }
    if (hasPermission === false) {
        return <View style={styles.loadingContainer}><Text>No access to camera</Text></View>;
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <AppHeader onReset={handleReset} />
                <View style={styles.cameraContainer}>
                    <Camera style={styles.camera} type="back">
                        <View style={styles.cameraOverlay}>
                            {/* Bounding Box */}
                            <View style={styles.boundingBox} />
                            
                            {/* Overlayed result marker */}
                            {scanResult && (
                                <View style={styles.resultMarker}>
                                    <Feather name="check" size={16} color={theme.colors.white} />
                                </View>
                            )}

                            {/* Instruction Text */}
                            {!scanResult && (
                                <View style={styles.instructionContainer}>
                                    <Text style={styles.instructionText}>Position plant in frame</Text>
                                </View>
                            )}
                        </View>
                    </Camera>
                </View>

                {/* Show controls or result card based on state */}
                {!scanResult ? (
                    <View style={styles.controlsContainer}>
                        <TouchableOpacity style={styles.controlButton}>
                            <Feather name="image" size={24} color={theme.colors.black} />
                            <Text style={styles.controlButtonText}>Gallery</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.shutterButton} onPress={handleScan}>
                            <View style={styles.shutterButtonInner} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.controlButton}>
                            <Feather name="help-circle" size={24} color={theme.colors.black} />
                            <Text style={styles.controlButtonText}>Help</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <ResultCard result={scanResult} onReadMore={handleReset} />
                )}

                <CustomBottomNavBar />
            </View>
        </SafeAreaView>
    );
}

// --- Stylesheet ---
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.colors.white },
    container: { flex: 1, backgroundColor: theme.colors.lightGreen },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: theme.spacing.medium,
        paddingTop: theme.spacing.small,
        backgroundColor: theme.colors.lightGreen,
    },
    headerPoints: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.white,
        paddingHorizontal: theme.spacing.small,
        paddingVertical: 4,
        borderRadius: 20,
    },
    headerPointsText: {
        fontWeight: 'bold',
        marginLeft: 4,
        color: theme.colors.green,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.black,
    },
    cameraContainer: {
        flex: 1,
        marginHorizontal: theme.spacing.medium,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: theme.colors.black,
    },
    camera: {
        flex: 1,
    },
    cameraOverlay: {
        flex: 1,
        backgroundColor: 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
    },
    boundingBox: {
        width: 250,
        height: 250,
        borderWidth: 2,
        borderColor: theme.colors.white,
        borderRadius: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    instructionContainer: {
        position: 'absolute',
        bottom: 30,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        paddingHorizontal: theme.spacing.medium,
        paddingVertical: theme.spacing.small,
        borderRadius: 20,
    },
    instructionText: {
        color: theme.colors.white,
        fontSize: 14,
    },
    controlsContainer: {
        height: 100,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        backgroundColor: theme.colors.white,
        paddingVertical: theme.spacing.medium,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        marginTop: -20, // To overlap with camera view
    },
    controlButton: { alignItems: 'center' },
    controlButtonText: {
        fontSize: 12,
        color: theme.colors.black,
        marginTop: 4,
    },
    shutterButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: theme.colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: theme.colors.green,
    },
    shutterButtonInner: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: theme.colors.green,
    },
    resultCard: {
        backgroundColor: theme.colors.white,
        padding: theme.spacing.large,
        paddingBottom: theme.spacing.medium,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        position: 'absolute',
        bottom: 60, // Height of the nav bar
        left: 0,
        right: 0,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -5 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    resultTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.black,
        marginBottom: theme.spacing.small,
    },
    resultConfidence: {
        fontSize: 16,
        color: theme.colors.gray,
        marginBottom: theme.spacing.medium,
    },
    resultDescription: {
        fontSize: 14,
        color: theme.colors.black,
        lineHeight: 20,
        marginBottom: theme.spacing.large,
    },
    readMoreButton: {
        backgroundColor: theme.colors.green,
        padding: theme.spacing.medium,
        borderRadius: 12,
        alignItems: 'center',
    },
    readMoreButtonText: {
        color: theme.colors.white,
        fontSize: 16,
        fontWeight: 'bold',
    },
    resultMarker: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: [{ translateX: -75 }, { translateY: -50 }], // Example position
        width: 30,
        height: 30,
        borderRadius: 5,
        backgroundColor: theme.colors.green,
        alignItems: 'center',
        justifyContent: 'center',
    },
    // --- Custom Nav Bar Styles ---
    navContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 90, // Increased height to avoid overlap
        alignItems: 'center',
    },
    navBar: {
        flexDirection: 'row',
        backgroundColor: theme.colors.white,
        height: 60,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        justifyContent: 'space-around',
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    navButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    navCenter: {
        position: 'absolute',
        top: 0,
        alignItems: 'center',
        width: 80,
        height: 80,
    },
    navCenterCradle: {
        width: 80,
        height: 40,
        backgroundColor: theme.colors.white,
        borderBottomLeftRadius: 40,
        borderBottomRightRadius: 40,
        position: 'absolute',
        top: -1,
    },
    navCenterButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: theme.colors.green,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        marginTop: 5,
    },
});