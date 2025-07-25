import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet,
    Text,
    View,
    SafeAreaView,
    Image,
    TouchableOpacity,
    ScrollView,
    Animated,
    Easing,
    ImageBackground,
    LayoutAnimation, // Import LayoutAnimation
    Platform, // Import Platform for LayoutAnimation
    UIManager, // Import UIManager for LayoutAnimation
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Speech from 'expo-speech';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axios from 'axios';
import { NetworkConfig } from '../utils/NetworkConfig';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android') {
    if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
    }
}

// --- THEME (Updated to Black Background) ---
const theme = {
    colors: {
        background: '#000000',
        surface: '#1E293B',
        primary: '#34D399',
        text: '#E2E8F0',
        textSecondary: '#94A3B8',
        white: '#FFFFFF',
        error: '#F87171',
    },
    spacing: { small: 8, medium: 16, large: 24 },
    typography: {
        h1: { fontSize: 28, fontWeight: 'bold', color: '#E2E8F0' },
        h2: { fontSize: 22, fontWeight: 'bold', color: '#E2E8F0' },
        body: { fontSize: 16, lineHeight: 24, color: '#94A3B8' },
    },
};

// --- Reusable Animated Components ---
const AnimatedView = ({ children, style, delay = 0 }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, delay, useNativeDriver: true }).start();
    }, []);
    return <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }, style]}>{children}</Animated.View>;
};

// --- New Spinning Star Loader ---
const LoadingAnimator = () => {
    const spinAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.timing(spinAnim, {
                toValue: 1,
                duration: 1500,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();
    }, [spinAnim]);

    const rotation = spinAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    return (
        <View style={styles.centered}>
            <Animated.View style={{ transform: [{ rotate: rotation }] }}>
                <MaterialCommunityIcons name="star-four-points" size={60} color={theme.colors.primary} />
            </Animated.View>
            <Text style={styles.loadingText}>Analyzing your crop...</Text>
        </View>
    );
};

// --- Accordion Component ---
const Accordion = ({ title, children, initialExpanded = false }) => {
    const [expanded, setExpanded] = useState(initialExpanded);
    const animatedHeight = useRef(new Animated.Value(initialExpanded ? 1 : 0)).current;

    const toggleExpansion = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpanded(!expanded);
        Animated.timing(animatedHeight, {
            toValue: expanded ? 0 : 1,
            duration: 300,
            useNativeDriver: false, // Must be false for height animations
        }).start();
    };

    // Use a large max height for interpolation
    const maxContentHeight = 1000;
    const heightInterpolate = animatedHeight.interpolate({
        inputRange: [0, 1],
        outputRange: [0, maxContentHeight],
    });

    return (
        <View style={styles.accordionContainer}>
            <TouchableOpacity onPress={toggleExpansion} style={styles.accordionHeader}>
                <Text style={styles.sectionTitle}>{title}</Text>
                <Feather name={expanded ? "chevron-up" : "chevron-down"} size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <Animated.View style={{ height: heightInterpolate, overflow: 'hidden' }}>
                {expanded && (
                    <View style={styles.accordionContent}>
                        {children}
                    </View>
                )}
            </Animated.View>
        </View>
    );
};

const imageDisplayWidth = 300; // Reduced width
const imageDisplayHeight = 300; // Reduced height

const getBoxStyle = (box) => {
    if (!box) return {};
    // Ensure all values are numbers
    const x = typeof box.x === 'string' ? parseFloat(box.x) : box.x;
    const y = typeof box.y === 'string' ? parseFloat(box.y) : box.y;
    const width = typeof box.width === 'string' ? parseFloat(box.width) : box.width;
    const height = typeof box.height === 'string' ? parseFloat(box.height) : box.height;
    return {
        top: (y / 100) * imageDisplayHeight,
        left: (x / 100) * imageDisplayWidth,
        width: (width / 100) * imageDisplayWidth,
        height: (height / 100) * imageDisplayHeight,
    };
};


// --- Main Screen Component ---
export default function CropDoctorScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const [status, setStatus] = useState('upload');
    const [analysis, setAnalysis] = useState(null);

    useEffect(() => { return () => Speech.stop(); }, []);

    const speakAnalysis = (analysisData) => {
        const summary = `Analysis complete. The detected disease is ${analysisData.diseaseName} with a confidence of ${analysisData.confidence}.`;
        Speech.speak(summary, { language: 'en-US' });
    };

    // --- Replace handleImageResult ---
    const handleImageResult = async (result) => {
        if (!result.canceled) {
            const userImageUri = result.assets[0].uri;
            setStatus('loading');
            try {
                // Prepare image for upload
                const formData = new FormData();
                formData.append('image', {
                    uri: userImageUri,
                    name: 'crop.jpg',
                    type: 'image/jpeg',
                });
                // Call backend
                const response = await axios.post(
                    `${NetworkConfig.API_BASE}/crop-disease/detect`,
                    formData,
                    {
                        headers: {
                            'Content-Type': 'multipart/form-data',
                        },
                    }
                );
                const backendAnalysis = response.data;
                // Compose analysis object for UI
                const analysisWithUserImage = {
                    ...backendAnalysis,
                    userImageUri,
                    processedImageUrl: userImageUri, // Optionally update if backend returns processed image
                };
                setAnalysis(analysisWithUserImage);
                setStatus('result');
                speakAnalysis(analysisWithUserImage);
            } catch (error) {
                setStatus('upload');
                alert('Failed to analyze image: ' + (error?.response?.data?.detail || error.message));
            }
        }
    };

    const pickFromGallery = async () => {
        await ImagePicker.requestMediaLibraryPermissionsAsync();
        let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 1 });
        handleImageResult(result);
    };

    const takePhoto = async () => {
        await ImagePicker.requestCameraPermissionsAsync();
        let result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 1 });
        handleImageResult(result);
    };

    const handleReset = () => {
        Speech.stop();
        setStatus('upload');
        setAnalysis(null);
    };

    const promptFollowUp = () => {
        Speech.stop();
        navigation.navigate('FollowUpScreen', { context: analysis });
    };

    const renderContent = () => {
        switch (status) {
            case 'loading':
                return <LoadingAnimator />; // Using the new spinning loader
            case 'result':
                return (
                    <View style={{ flex: 1 }}> {/* Changed to View to allow sticky footer */}
                        <ScrollView style={{ flex: 1 }}>
                            <AnimatedView delay={0} style={styles.resultImageContainer}>
                                <ImageBackground source={{ uri: analysis.processedImageUrl }} style={styles.resultImage}>
                                    {Array.isArray(analysis.boundingBoxes) && analysis.boundingBoxes.map((box, idx) => (
                                        <View key={idx} style={[styles.boundingBox, getBoxStyle(box)]} />
                                    ))}
                                </ImageBackground>
                            </AnimatedView>
                            <View style={styles.analysisContainer}>
                                <Text style={styles.diseaseTitle}>{analysis.diseaseName}</Text>
                                <Text style={styles.confidenceText}>Confidence: {analysis.confidence}</Text>

                                <Accordion title="Description" initialExpanded={true}>
                                    <Text style={theme.typography.body}>{analysis.description}</Text>
                                </Accordion>

                                <Accordion title="Symptoms">
                                    {analysis.symptoms.map((symptom, index) => (
                                        <View key={index} style={styles.listItem}>
                                            <Text style={styles.bullet}>•</Text>
                                            <Text style={styles.listItemText}>{symptom}</Text>
                                        </View>
                                    ))}
                                </Accordion>

                                <Accordion title="Solutions">
                                    {analysis.solutions.map((solution, index) => (
                                        <View key={index} style={styles.solutionCard}>
                                            <Text style={styles.solutionTitle}>{solution.title}</Text>
                                            <Text style={theme.typography.body}>{solution.details}</Text>
                                        </View>
                                    ))}
                                </Accordion>
                            </View>
                        </ScrollView>
                        <View style={styles.chatInputContainer}>
                            <TouchableOpacity style={styles.chatButton} onPress={promptFollowUp}>
                                <Feather name="mic" size={24} color={theme.colors.background} />
                                <Text style={styles.chatButtonText}>Ask a follow-up question</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                );
            default:
                return (
                    <View style={styles.centered}>
                        <Feather name="upload-cloud" size={80} color={theme.colors.textSecondary} />
                        <Text style={styles.uploadTitle}>Upload a Crop Image</Text>
                        <Text style={styles.uploadSubtitle}>Get an instant diagnosis of any potential diseases.</Text>
                        <TouchableOpacity style={styles.button} onPress={takePhoto}><Feather name="camera" size={20} color={theme.colors.background} /><Text style={styles.buttonText}>Take Photo</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.button} onPress={pickFromGallery}><Feather name="image" size={20} color={theme.colors.background} /><Text style={styles.buttonText}>Choose from Gallery</Text></TouchableOpacity>
                    </View>
                );
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <View style={{ width: 40, alignItems: 'flex-start' }}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Feather name="arrow-left" size={34} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                </View>
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={styles.headerTitle}>Crop Doctor</Text>
                </View>
                <View style={{ width: 50, alignItems: 'flex-end' }}>
                    {status === 'result' && (
                        <TouchableOpacity onPress={handleReset}>
                            <Feather name="refresh-cw" size={22} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
            {renderContent()}
        </SafeAreaView>
    );
}

// --- Stylesheet ---
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: theme.spacing.medium, borderBottomWidth: 1, borderBottomColor: theme.colors.surface },
    headerTitle: { ...theme.typography.h1 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.large },
    loadingText: { ...theme.typography.body, color: theme.colors.primary, marginTop: theme.spacing.large }, // Increased margin
    uploadTitle: { ...theme.typography.h2, marginTop: theme.spacing.medium, textAlign: 'center' },
    uploadSubtitle: { ...theme.typography.body, textAlign: 'center', marginVertical: theme.spacing.small, paddingHorizontal: theme.spacing.medium },
    button: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 30, marginTop: theme.spacing.medium },
    buttonText: { color: theme.colors.background, fontSize: 16, fontWeight: 'bold', marginLeft: theme.spacing.small },
    resultImageContainer: {
        height: imageDisplayHeight, // Use new reduced height
        width: imageDisplayWidth,   // Use new reduced width
        alignSelf: 'center',
        marginVertical: theme.spacing.medium, // Added margin for spacing
        borderRadius: 12, // Rounded corners for the image container
        overflow: 'hidden', // Ensure image respects border radius
    },
    resultImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    boundingBox: {
        position: 'absolute',
        borderWidth: 3,
        borderColor: '#39FF14', // Neon green
        backgroundColor: 'rgba(57,255,20,0.18)', // Neon green with higher opacity
        borderRadius: 6,
        shadowColor: '#39FF14',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 6,
        elevation: 8,
    },
    analysisContainer: { padding: theme.spacing.medium },
    diseaseTitle: { ...theme.typography.h1, color: theme.colors.primary },
    confidenceText: { ...theme.typography.body, color: theme.colors.textSecondary, marginBottom: theme.spacing.large },
    // Removed direct section styles as they are now part of accordion
    listItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: theme.spacing.small },
    bullet: { fontSize: 16, color: theme.colors.primary, marginRight: theme.spacing.small, lineHeight: 24 },
    listItemText: { ...theme.typography.body, flex: 1 },
    solutionCard: { backgroundColor: theme.colors.surface, padding: theme.spacing.medium, borderRadius: 12, marginBottom: theme.spacing.small }, // Reduced marginBottom
    solutionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text, marginBottom: theme.spacing.small },
    chatInputContainer: { padding: theme.spacing.medium, backgroundColor: theme.colors.background, borderTopWidth: 1, borderColor: theme.colors.surface },
    chatButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary, padding: theme.spacing.medium, borderRadius: 12 },
    chatButtonText: { color: theme.colors.background, fontSize: 16, fontWeight: 'bold', marginLeft: theme.spacing.small },

    // Accordion Styles
    accordionContainer: {
        marginBottom: theme.spacing.medium,
        borderWidth: 1,
        borderColor: theme.colors.surface,
        borderRadius: 12,
        overflow: 'hidden', // Crucial for animation
    },
    accordionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.medium,
        backgroundColor: theme.colors.surface,
    },
    accordionContent: {
        padding: theme.spacing.medium,
        backgroundColor: theme.colors.background,
    },
    sectionTitle: { // Re-used for accordion header
        ...theme.typography.h2,
        color: theme.colors.text,
    },
});