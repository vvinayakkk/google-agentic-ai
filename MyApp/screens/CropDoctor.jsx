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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Speech from 'expo-speech';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axios from 'axios';

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
                    'http:// 192.168.0.111:8000/crop-disease/detect',
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
                    <AnimatedView style={{ flex: 1 }}>
                        <ScrollView>
                            <View style={styles.resultImageContainer}><ImageBackground source={{ uri: analysis.processedImageUrl }} style={styles.resultImage}><View style={[styles.boundingBox, { top: analysis.boundingBox.y, left: analysis.boundingBox.x, width: analysis.boundingBox.width, height: analysis.boundingBox.height }]} /></ImageBackground></View>
                            <View style={styles.analysisContainer}>
                                <Text style={styles.diseaseTitle}>{analysis.diseaseName}</Text>
                                <Text style={styles.confidenceText}>Confidence: {analysis.confidence}</Text>
                                <View style={styles.section}><Text style={styles.sectionTitle}>Description</Text><Text style={theme.typography.body}>{analysis.description}</Text></View>
                                <View style={styles.section}><Text style={styles.sectionTitle}>Symptoms</Text>{analysis.symptoms.map((symptom, index) => (<View key={index} style={styles.listItem}><Text style={styles.bullet}>•</Text><Text style={styles.listItemText}>{symptom}</Text></View>))}</View>
                                <View style={styles.section}><Text style={styles.sectionTitle}>Solutions</Text>{analysis.solutions.map((solution, index) => (<View key={index} style={styles.solutionCard}><Text style={styles.solutionTitle}>{solution.title}</Text><Text style={theme.typography.body}>{solution.details}</Text></View>))}</View>
                            </View>
                        </ScrollView>
                        <View style={styles.chatInputContainer}><TouchableOpacity style={styles.chatButton} onPress={promptFollowUp}><Feather name="mic" size={24} color={theme.colors.background} /><Text style={styles.chatButtonText}>Ask a follow-up question</Text></TouchableOpacity></View>
                    </AnimatedView>
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
    resultImageContainer: { height: 300 },
    resultImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    boundingBox: { position: 'absolute', borderWidth: 2, borderColor: theme.colors.error, backgroundColor: 'rgba(248, 113, 113, 0.2)', borderRadius: 4 },
    analysisContainer: { padding: theme.spacing.medium },
    diseaseTitle: { ...theme.typography.h1, color: theme.colors.primary },
    confidenceText: { ...theme.typography.body, color: theme.colors.textSecondary, marginBottom: theme.spacing.large },
    section: { marginBottom: theme.spacing.large },
    sectionTitle: { ...theme.typography.h2, marginBottom: theme.spacing.small, borderBottomWidth: 1, borderBottomColor: theme.colors.surface, paddingBottom: theme.spacing.small },
    listItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: theme.spacing.small },
    bullet: { fontSize: 16, color: theme.colors.primary, marginRight: theme.spacing.small, lineHeight: 24 },
    listItemText: { ...theme.typography.body, flex: 1 },
    solutionCard: { backgroundColor: theme.colors.surface, padding: theme.spacing.medium, borderRadius: 12, marginBottom: theme.spacing.medium },
    solutionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text, marginBottom: theme.spacing.small },
    chatInputContainer: { padding: theme.spacing.medium, backgroundColor: theme.colors.background, borderTopWidth: 1, borderColor: theme.colors.surface },
    chatButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary, padding: theme.spacing.medium, borderRadius: 12 },
    chatButtonText: { color: theme.colors.background, fontSize: 16, fontWeight: 'bold', marginLeft: theme.spacing.small },
});