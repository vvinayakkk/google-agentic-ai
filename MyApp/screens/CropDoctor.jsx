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
    Dimensions,
    Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

    // Onboarding states
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [currentOnboardingStep, setCurrentOnboardingStep] = useState(0);

    const screenDimensions = Dimensions.get('window');

    // Onboarding steps configuration
    const ONBOARDING_STEPS = [
        {
            id: 'back_button',
            title: 'Navigation',
            content: 'Tap here to go back to the previous screen anytime.',
            targetElement: 'back-button',
            position: { top: 60, left: 20 },
            arrowPosition: 'top'
        },
        {
            id: 'refresh_button',
            title: 'Reset Analysis',
            content: 'After analyzing, tap here to start over with a new image.',
            targetElement: 'refresh-button',
            position: { top: 60, right: 20 },
            arrowPosition: 'top',
            showOnlyInState: 'result'
        },
        {
            id: 'upload_area',
            title: 'Upload Your Crop Image',
            content: 'This is where you start! Upload an image of your crop to get instant disease diagnosis.',
            targetElement: 'upload-area',
            position: { top: 200, alignSelf: 'center' },
            arrowPosition: 'top'
        },
        {
            id: 'take_photo',
            title: 'Take Photo',
            content: 'Use your camera to capture a photo of your crop directly.',
            targetElement: 'take-photo-button',
            position: { bottom: 180, alignSelf: 'center' },
            arrowPosition: 'bottom'
        },
        {
            id: 'gallery_photo',
            title: 'Choose from Gallery',
            content: 'Select an existing photo of your crop from your device gallery.',
            targetElement: 'gallery-button',
            position: { bottom: 120, alignSelf: 'center' },
            arrowPosition: 'bottom'
        },
        {
            id: 'result_image',
            title: 'Analysis Results',
            content: 'Your crop image with detected disease areas highlighted.',
            targetElement: 'result-image',
            position: { top: 400, alignSelf: 'center' },
            arrowPosition: 'top',
            showOnlyInState: 'result'
        },
        {
            id: 'disease_info',
            title: 'Disease Information',
            content: 'Detailed information about the detected disease with confidence level.',
            targetElement: 'disease-info',
            position: { top: 500, left: 20 },
            arrowPosition: 'top',
            showOnlyInState: 'result'
        },
        {
            id: 'accordions',
            title: 'Detailed Analysis',
            content: 'Expand these sections to see symptoms, solutions, and more details.',
            targetElement: 'accordion-sections',
            position: { top: 600, left: 20 },
            arrowPosition: 'top',
            showOnlyInState: 'result'
        },
        {
            id: 'followup_chat',
            title: 'Ask Follow-up Questions',
            content: 'Tap here to ask additional questions about your crop diagnosis.',
            targetElement: 'followup-button',
            position: { bottom: 100, alignSelf: 'center' },
            arrowPosition: 'bottom',
            showOnlyInState: 'result'
        }
    ];

    useEffect(() => { return () => Speech.stop(); }, []);

    // Onboarding functions
    const checkOnboardingStatus = async () => {
        try {
            const completed = await AsyncStorage.getItem('cropDoctorOnboardingCompleted');
            if (!completed) {
                setTimeout(() => {
                    setShowOnboarding(true);
                    setCurrentOnboardingStep(0);
                }, 1000);
            }
        } catch (error) {
            console.log('Error checking onboarding status:', error);
            // Show onboarding anyway if there's an error
            setTimeout(() => {
                setShowOnboarding(true);
                setCurrentOnboardingStep(0);
            }, 1000);
        }
    };

    const nextOnboardingStep = () => {
        const availableSteps = getAvailableSteps();
        const currentIndex = availableSteps.findIndex(step => step.id === ONBOARDING_STEPS[currentOnboardingStep].id);
        
        if (currentIndex < availableSteps.length - 1) {
            const nextStep = availableSteps[currentIndex + 1];
            const nextStepIndex = ONBOARDING_STEPS.findIndex(step => step.id === nextStep.id);
            setCurrentOnboardingStep(nextStepIndex);
        } else {
            completeOnboarding();
        }
    };

    const completeOnboarding = async () => {
        setShowOnboarding(false);
        try {
            await AsyncStorage.setItem('cropDoctorOnboardingCompleted', 'true');
        } catch (error) {
            console.log('Error saving onboarding completion:', error);
        }
    };

    const startOnboardingTour = () => {
        setCurrentOnboardingStep(0);
        setShowOnboarding(true);
    };

    const resetOnboarding = async () => {
        try {
            await AsyncStorage.removeItem('cropDoctorOnboardingCompleted');
            Alert.alert('Reset Complete', 'Onboarding has been reset. Restart the app to see the tour again.');
        } catch (error) {
            console.log('Error resetting onboarding:', error);
        }
    };

    const getAvailableSteps = () => {
        return ONBOARDING_STEPS.filter(step => {
            if (!step.showOnlyInState) return true;
            return step.showOnlyInState === status;
        });
    };

    // Check onboarding status on mount
    useEffect(() => {
        checkOnboardingStatus();
    }, []);

    // Interactive Guide Tooltip Component
    const InteractiveGuideTooltip = ({ step, onNext, onClose }) => {
        const getTooltipStyle = () => {
            const style = {
                position: 'absolute',
                backgroundColor: '#1E293B',
                borderRadius: 12,
                padding: 16,
                maxWidth: 280,
                zIndex: 1000,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
            };

            if (step.position.top !== undefined) style.top = step.position.top;
            if (step.position.bottom !== undefined) style.bottom = step.position.bottom;
            if (step.position.left !== undefined) style.left = step.position.left;
            if (step.position.right !== undefined) style.right = step.position.right;
            if (step.position.alignSelf) style.alignSelf = step.position.alignSelf;

            return style;
        };

        const getArrowStyle = () => {
            const arrowStyle = {
                position: 'absolute',
                width: 0,
                height: 0,
                backgroundColor: 'transparent',
                borderStyle: 'solid',
            };

            switch (step.arrowPosition) {
                case 'top':
                    arrowStyle.top = -8;
                    arrowStyle.left = 20;
                    arrowStyle.borderLeftWidth = 8;
                    arrowStyle.borderRightWidth = 8;
                    arrowStyle.borderBottomWidth = 8;
                    arrowStyle.borderLeftColor = 'transparent';
                    arrowStyle.borderRightColor = 'transparent';
                    arrowStyle.borderBottomColor = '#1E293B';
                    break;
                case 'bottom':
                    arrowStyle.bottom = -8;
                    arrowStyle.left = 20;
                    arrowStyle.borderLeftWidth = 8;
                    arrowStyle.borderRightWidth = 8;
                    arrowStyle.borderTopWidth = 8;
                    arrowStyle.borderLeftColor = 'transparent';
                    arrowStyle.borderRightColor = 'transparent';
                    arrowStyle.borderTopColor = '#1E293B';
                    break;
                default:
                    break;
            }

            return arrowStyle;
        };

        const availableSteps = getAvailableSteps();
        const currentIndex = availableSteps.findIndex(s => s.id === step.id);

        return (
            <>
                <View style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    zIndex: 999,
                }} />
                <View style={getTooltipStyle()}>
                    <View style={getArrowStyle()} />
                    <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>
                        {step.title}
                    </Text>
                    <Text style={{ color: '#CBD5E1', fontSize: 14, lineHeight: 20, marginBottom: 16 }}>
                        {step.content}
                    </Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: '#94A3B8', fontSize: 12 }}>
                            {currentIndex + 1} of {availableSteps.length}
                        </Text>
                        <View style={{ flexDirection: 'row' }}>
                            <TouchableOpacity onPress={onClose} style={{ marginRight: 16 }}>
                                <Text style={{ color: '#94A3B8', fontSize: 14 }}>Skip</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={onNext}
                                style={{
                                    backgroundColor: '#34D399',
                                    paddingHorizontal: 16,
                                    paddingVertical: 8,
                                    borderRadius: 8,
                                }}
                            >
                                <Text style={{ color: '#000000', fontSize: 14, fontWeight: '600' }}>
                                    {currentIndex === availableSteps.length - 1 ? 'Finish' : 'Next'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </>
        );
    };

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
                            <AnimatedView 
                                delay={0} 
                                ref={ref => ref && (ref._reactInternalInstance = 'result-image')}
                                style={styles.resultImageContainer}
                            >
                                <ImageBackground source={{ uri: analysis.processedImageUrl }} style={styles.resultImage}>
                                    {Array.isArray(analysis.boundingBoxes) && analysis.boundingBoxes.map((box, idx) => (
                                        <View key={idx} style={[styles.boundingBox, getBoxStyle(box)]} />
                                    ))}
                                </ImageBackground>
                            </AnimatedView>
                            <View 
                                ref={ref => ref && (ref._reactInternalInstance = 'disease-info')}
                                style={styles.analysisContainer}
                            >
                                <Text style={styles.diseaseTitle}>{analysis.diseaseName}</Text>
                                <Text style={styles.confidenceText}>Confidence: {analysis.confidence}</Text>

                                <View 
                                    ref={ref => ref && (ref._reactInternalInstance = 'accordion-sections')}
                                >
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
                            </View>
                        </ScrollView>
                        <View style={styles.chatInputContainer}>
                            <TouchableOpacity 
                                ref={ref => ref && (ref._reactInternalInstance = 'followup-button')}
                                style={styles.chatButton} 
                                onPress={promptFollowUp}
                            >
                                <Feather name="mic" size={24} color={theme.colors.background} />
                                <Text style={styles.chatButtonText}>Ask a follow-up question</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                );
            default:
                return (
                    <View 
                        ref={ref => ref && (ref._reactInternalInstance = 'upload-area')}
                        style={styles.centered}
                    >
                        <Feather name="upload-cloud" size={80} color={theme.colors.textSecondary} />
                        <Text style={styles.uploadTitle}>Upload a Crop Image</Text>
                        <Text style={styles.uploadSubtitle}>Get an instant diagnosis of any potential diseases.</Text>
                        <TouchableOpacity 
                            ref={ref => ref && (ref._reactInternalInstance = 'take-photo-button')}
                            style={styles.button} 
                            onPress={takePhoto}
                        >
                            <Feather name="camera" size={20} color={theme.colors.background} />
                            <Text style={styles.buttonText}>Take Photo</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            ref={ref => ref && (ref._reactInternalInstance = 'gallery-button')}
                            style={styles.button} 
                            onPress={pickFromGallery}
                        >
                            <Feather name="image" size={20} color={theme.colors.background} />
                            <Text style={styles.buttonText}>Choose from Gallery</Text>
                        </TouchableOpacity>
                    </View>
                );
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={[styles.header, { paddingTop: insets.top }]}>
                <View style={{ width: 40, alignItems: 'flex-start' }}>
                    <TouchableOpacity 
                        ref={ref => ref && (ref._reactInternalInstance = 'back-button')}
                        onPress={() => navigation.goBack()}
                    >
                        <Feather name="arrow-left" size={34} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                </View>
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={styles.headerTitle}>Crop Doctor</Text>
                </View>
                <View style={{ width: 50, alignItems: 'flex-end' }}>
                    {status === 'result' && (
                        <TouchableOpacity 
                            ref={ref => ref && (ref._reactInternalInstance = 'refresh-button')}
                            onPress={handleReset}
                        >
                            <Feather name="refresh-cw" size={22} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
            {renderContent()}

            {/* Onboarding Tooltip */}
            {showOnboarding && (
                <InteractiveGuideTooltip
                    step={ONBOARDING_STEPS[currentOnboardingStep]}
                    onNext={nextOnboardingStep}
                    onClose={completeOnboarding}
                />
            )}

            {/* Debug Buttons for Testing (remove in production) */}
            {__DEV__ && (
                <View style={{
                    position: 'absolute',
                    top: 100,
                    left: 10,
                    zIndex: 999,
                    flexDirection: 'row'
                }}>
                    <TouchableOpacity
                        onPress={startOnboardingTour}
                        style={{
                            backgroundColor: '#34D399',
                            padding: 8,
                            borderRadius: 4,
                            marginRight: 8
                        }}
                    >
                        <Text style={{ color: 'black', fontSize: 10 }}>Tour</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                        onPress={resetOnboarding}
                        style={{
                            backgroundColor: '#EF4444',
                            padding: 8,
                            borderRadius: 4
                        }}
                    >
                        <Text style={{ color: 'white', fontSize: 10 }}>Reset</Text>
                    </TouchableOpacity>
                </View>
            )}
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