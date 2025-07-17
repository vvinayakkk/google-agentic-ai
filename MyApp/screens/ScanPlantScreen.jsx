import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Animated, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
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
        fontFamily: 'System',
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

const ResultCard = ({ result, onReadMore }) => {
    const slideAnim = useRef(new Animated.Value(300)).current;
    useEffect(() => {
        Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }).start();
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
    const [imageUri, setImageUri] = useState(null);
    const [scanResult, setScanResult] = useState(null);

    // Request permissions on component mount
    useEffect(() => {
        ImagePicker.requestMediaLibraryPermissionsAsync();
        ImagePicker.requestCameraPermissionsAsync();
    }, []);
    
    const handleImageResult = (result) => {
        if (!result.canceled) {
            setImageUri(result.assets[0].uri);
            setScanResult(mockScanResult);
        }
    };

    const pickFromGallery = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });
        handleImageResult(result);
    };

    const takePhoto = async () => {
        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });
        handleImageResult(result);
    };

    const handleReset = () => {
        setImageUri(null);
        setScanResult(null);
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                <AppHeader onReset={handleReset} />

                {/* Main content area now acts as a button to open camera */}
                <TouchableOpacity style={styles.contentContainer} activeOpacity={0.8} onPress={takePhoto}>
                    <View style={styles.imagePreviewContainer}>
                        {imageUri ? (
                            <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                        ) : (
                            <View style={styles.imagePlaceholder}>
                                 <View style={styles.boundingBox} />
                                <View style={styles.instructionContainer}>
                                    <Text style={styles.instructionText}>Position plant in frame</Text>
                                </View>
                            </View>
                        )}
                         {scanResult && imageUri && (
                            <View style={styles.resultMarker}>
                                <Feather name="check" size={16} color={theme.colors.white} />
                            </View>
                        )}
                    </View>
                </TouchableOpacity>

                {/* Show controls or result card based on state */}
                {!scanResult ? (
                    <View style={styles.controlsContainer}>
                        <TouchableOpacity style={styles.controlButton} onPress={pickFromGallery}>
                            <Feather name="image" size={24} color={theme.colors.black} />
                            <Text style={styles.controlButtonText}>Gallery</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.shutterButton} onPress={takePhoto}>
                             <Feather name="camera" size={32} color={theme.colors.white} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.controlButton}>
                            <Feather name="help-circle" size={24} color={theme.colors.black} />
                            <Text style={styles.controlButtonText}>Help</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <ResultCard result={scanResult} onReadMore={handleReset} />
                )}
            </View>
        </SafeAreaView>
    );
}

// --- Stylesheet ---
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.colors.white },
    container: { flex: 1, backgroundColor: theme.colors.lightGreen },
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
    headerPointsText: { fontWeight: 'bold', marginLeft: 4, color: theme.colors.green },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.black },
    contentContainer: {
        flex: 1,
        padding: theme.spacing.medium,
        paddingTop: 0,
    },
    imagePreviewContainer: {
        flex: 1,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: theme.colors.black,
        alignItems: 'center',
        justifyContent: 'center',
    },
    imagePreview: {
        width: '100%',
        height: '100%',
    },
    imagePlaceholder: {
        width: '100%',
        height: '100%',
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        backgroundColor: theme.colors.white,
        paddingVertical: theme.spacing.medium,
        paddingBottom: theme.spacing.large,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        position: 'absolute',
        bottom: 0,
        left: 0, 
        right: 0
    },
    controlButton: { alignItems: 'center', width: 80 },
    controlButtonText: { fontSize: 12, color: theme.colors.black, marginTop: 4 },
    shutterButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: theme.colors.green,
        alignItems: 'center',
        justifyContent: 'center',
        // Shadow for iOS
        shadowColor: theme.colors.green,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        // Elevation for Android
        elevation: 8,
    },
    resultCard: {
        backgroundColor: theme.colors.white,
        padding: theme.spacing.large,
        paddingBottom: theme.spacing.medium,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -5 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    resultTitle: { fontSize: 24, fontWeight: 'bold', color: theme.colors.black, marginBottom: theme.spacing.small },
    resultConfidence: { fontSize: 16, color: theme.colors.gray, marginBottom: theme.spacing.medium },
    resultDescription: { fontSize: 14, color: theme.colors.black, lineHeight: 20, marginBottom: theme.spacing.large },
    readMoreButton: { backgroundColor: theme.colors.green, padding: theme.spacing.medium, borderRadius: 12, alignItems: 'center' },
    readMoreButtonText: { color: theme.colors.white, fontSize: 16, fontWeight: 'bold' },
    resultMarker: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: [{ translateX: -75 }, { translateY: -50 }],
        width: 30,
        height: 30,
        borderRadius: 5,
        backgroundColor: theme.colors.green,
        alignItems: 'center',
        justifyContent: 'center',
    },
});