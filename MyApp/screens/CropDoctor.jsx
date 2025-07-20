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
  ActivityIndicator,
  Alert,
  ImageBackground,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// --- Theme ---
const theme = {
    colors: {
        background: '#0F172A', // Dark blue-gray
        surface: '#1E293B',   // Lighter blue-gray
        primary: '#34D399',   // Bright green
        primaryLight: 'rgba(52, 211, 153, 0.1)',
        text: '#E2E8F0',      // Light gray text
        textSecondary: '#94A3B8', // Muted gray text
        white: '#FFFFFF',
        error: '#F87171',
    },
    spacing: { small: 8, medium: 16, large: 24 },
    typography: {
        h1: { fontSize: 28, fontWeight: 'bold', color: '#E2E8F0' },
        h2: { fontSize: 22, fontWeight: 'bold', color: '#E2E8F0' },
        body: { fontSize: 16, lineHeight: 24, color: '#94A3B8' },
        caption: { fontSize: 12, color: '#64748B' },
    },
};

// --- Mock Data (Simulating Gemini Response) ---
const mockAnalysis = {
    diseaseName: 'Septoria Leaf Spot',
    confidence: '95.8%',
    processedImageUrl: 'https://i.ibb.co/cyv71J5/diseased-leaf.jpg', // A sample image of a diseased leaf
    boundingBox: { x: '25%', y: '30%', width: '50%', height: '40%' }, // Bounding box coordinates
    description: 'Septoria leaf spot is a common fungal disease that affects a wide range of plants, particularly tomatoes. It thrives in wet, humid conditions and can cause significant defoliation if left untreated, reducing the plant\'s ability to photosynthesize and produce fruit.',
    symptoms: [
        'Small, water-soaked circular spots on the lower leaves.',
        'Spots enlarge and develop dark brown borders with tan or gray centers.',
        'Tiny black dots (pycnidia), which are the fungal fruiting bodies, may appear in the center of the spots.',
        'Affected leaves turn yellow, wither, and eventually fall off.',
    ],
    solutions: [
        { title: 'Cultural Practices', details: 'Improve air circulation by properly spacing plants. Water at the base of the plant to avoid wetting the foliage. Remove and destroy infected leaves immediately.' },
        { title: 'Fungicides', details: 'For severe infections, apply fungicides containing chlorothalonil, mancozeb, or copper. Always follow the manufacturer\'s instructions for application rates and timing.' },
        { title: 'Crop Rotation', details: 'Avoid planting susceptible crops in the same location for at least two to three years to reduce the fungal inoculum in the soil.' },
    ],
};

// --- Reusable Components ---
const AnimatedView = ({ children, style }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }, []);
    return <Animated.View style={[{ opacity: fadeAnim }, style]}>{children}</Animated.View>;
};

// --- Main Screen Component ---
export default function CropDoctorScreen() {
    const [status, setStatus] = useState('upload'); // 'upload', 'loading', 'result'
    const [imageUri, setImageUri] = useState(null);
    const [analysis, setAnalysis] = useState(null);

    const handleImagePick = async () => {
        await ImagePicker.requestMediaLibraryPermissionsAsync();
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });

        if (!result.canceled) {
            setImageUri(result.assets[0].uri);
            setStatus('loading');
            // Simulate API call to Gemini
            setTimeout(() => {
                setAnalysis(mockAnalysis);
                setStatus('result');
            }, 2000);
        }
    };

    const handleTakePhoto = async () => {
        await ImagePicker.requestCameraPermissionsAsync();
        let result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 1,
        });

        if (!result.canceled) {
            setImageUri(result.assets[0].uri);
            setStatus('loading');
            setTimeout(() => {
                setAnalysis(mockAnalysis);
                setStatus('result');
            }, 2000);
        }
    };

    const handleReset = () => {
        setStatus('upload');
        setImageUri(null);
        setAnalysis(null);
    };

    const handleStartVoiceChat = () => {
        Alert.alert(
            "Voice Chat Initialized",
            "The chat has been started with the context of the Septoria Leaf Spot analysis. You can now ask follow-up questions.",
            [{ text: "OK" }]
        );
    };

    const renderContent = () => {
        switch (status) {
            case 'loading':
                return (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                        <Text style={styles.loadingText}>Analyzing your crop...</Text>
                    </View>
                );
            case 'result':
                return (
                    <AnimatedView style={{ flex: 1 }}>
                        <ScrollView>
                            <View style={styles.resultImageContainer}>
                                <ImageBackground source={{ uri: analysis.processedImageUrl }} style={styles.resultImage}>
                                    <View style={[styles.boundingBox, {
                                        top: analysis.boundingBox.y,
                                        left: analysis.boundingBox.x,
                                        width: analysis.boundingBox.width,
                                        height: analysis.boundingBox.height,
                                    }]} />
                                </ImageBackground>
                            </View>
                            <View style={styles.analysisContainer}>
                                <Text style={styles.diseaseTitle}>{analysis.diseaseName}</Text>
                                <Text style={styles.confidenceText}>Confidence: {analysis.confidence}</Text>
                                
                                <View style={styles.section}><Text style={styles.sectionTitle}>Description</Text><Text style={theme.typography.body}>{analysis.description}</Text></View>
                                
                                <View style={styles.section}><Text style={styles.sectionTitle}>Symptoms</Text>
                                    {analysis.symptoms.map((symptom, index) => (
                                        <View key={index} style={styles.listItem}><Text style={styles.bullet}>•</Text><Text style={styles.listItemText}>{symptom}</Text></View>
                                    ))}
                                </View>

                                <View style={styles.section}><Text style={styles.sectionTitle}>Solutions</Text>
                                    {analysis.solutions.map((solution, index) => (
                                        <View key={index} style={styles.solutionCard}>
                                            <Text style={styles.solutionTitle}>{solution.title}</Text>
                                            <Text style={theme.typography.body}>{solution.details}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        </ScrollView>
                        <View style={styles.chatInputContainer}>
                            <TouchableOpacity style={styles.chatButton} onPress={handleStartVoiceChat}>
                                <Feather name="mic" size={24} color={theme.colors.white} />
                                <Text style={styles.chatButtonText}>Ask a follow-up question</Text>
                            </TouchableOpacity>
                        </View>
                    </AnimatedView>
                );
            case 'upload':
            default:
                return (
                    <View style={styles.centered}>
                        <Feather name="upload-cloud" size={80} color={theme.colors.textSecondary} />
                        <Text style={styles.uploadTitle}>Upload a Crop Image</Text>
                        <Text style={styles.uploadSubtitle}>Get an instant diagnosis of any potential diseases.</Text>
                        <TouchableOpacity style={styles.button} onPress={handleTakePhoto}>
                            <Feather name="camera" size={20} color={theme.colors.white} />
                            <Text style={styles.buttonText}>Take Photo</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.button} onPress={handleImagePick}>
                            <Feather name="image" size={20} color={theme.colors.white} />
                            <Text style={styles.buttonText}>Choose from Gallery</Text>
                        </TouchableOpacity>
                    </View>
                );
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Crop Doctor</Text>
                {status === 'result' && (
                    <TouchableOpacity onPress={handleReset}>
                        <Feather name="refresh-cw" size={22} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                )}
            </View>
            {renderContent()}
        </SafeAreaView>
    );
}

// --- Stylesheet ---
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: theme.spacing.medium },
    headerTitle: { ...theme.typography.h2 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.large },
    loadingText: { ...theme.typography.body, color: theme.colors.primary, marginTop: theme.spacing.medium },
    uploadTitle: { ...theme.typography.h2, marginTop: theme.spacing.medium, textAlign: 'center' },
    uploadSubtitle: { ...theme.typography.body, textAlign: 'center', marginVertical: theme.spacing.small },
    button: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 30, marginTop: theme.spacing.medium },
    buttonText: { color: theme.colors.white, fontSize: 16, fontWeight: 'bold', marginLeft: theme.spacing.small },
    resultImageContainer: { height: 300 },
    resultImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    boundingBox: { position: 'absolute', borderWidth: 2, borderColor: theme.colors.error, backgroundColor: 'rgba(248, 113, 113, 0.2)' },
    analysisContainer: { padding: theme.spacing.medium },
    diseaseTitle: { ...theme.typography.h1, color: theme.colors.primary },
    confidenceText: { ...theme.typography.body, color: theme.colors.textSecondary, marginBottom: theme.spacing.large },
    section: { marginBottom: theme.spacing.large },
    sectionTitle: { ...theme.typography.h2, marginBottom: theme.spacing.small },
    listItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: theme.spacing.small },
    bullet: { fontSize: 16, color: theme.colors.primary, marginRight: theme.spacing.small, lineHeight: 24 },
    listItemText: { ...theme.typography.body, flex: 1 },
    solutionCard: { backgroundColor: theme.colors.surface, padding: theme.spacing.medium, borderRadius: 12, marginBottom: theme.spacing.medium },
    solutionTitle: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text, marginBottom: theme.spacing.small },
    chatInputContainer: { padding: theme.spacing.medium, backgroundColor: theme.colors.background, borderTopWidth: 1, borderColor: theme.colors.surface },
    chatButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary, padding: theme.spacing.medium, borderRadius: 12 },
    chatButtonText: { color: theme.colors.white, fontSize: 16, fontWeight: 'bold', marginLeft: theme.spacing.small },
});