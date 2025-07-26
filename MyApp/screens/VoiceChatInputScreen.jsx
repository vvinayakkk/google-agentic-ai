import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, FlatList, KeyboardAvoidingView, Platform, Animated, Easing, Alert, Clipboard, Share, Image, Dimensions } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Markdown from 'react-native-markdown-display';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useTranslation } from 'react-i18next';
import { NetworkConfig } from '../utils/NetworkConfig';
import MicOverlay from '../components/MicOverlay';

const { width } = Dimensions.get('window');

// Interactive Guide Tooltip Component for VoiceChatInputScreen
function InteractiveGuideTooltip({ step, onNext, onSkip }) {
  const getTooltipPosition = () => {
    switch (step.target) {
      case 'profileIcon':
        return {
          top: 120, // Below the profile icon (top right)
          right: 5,
        };
      case 'chatHistory':
        return {
          top: 120, // Below the chat history icon
          left: 20,
        };
      case 'newChatButton':
        return {
          top: 180, // Below the new chat button
          alignSelf: 'center',
        };
      case 'featuresArea':
        return {
          top: '40%', // Middle of features area
          alignSelf: 'center',
        };
      case 'inputArea':
        return {
          bottom: 120, // Above the input container
          alignSelf: 'center',
        };
      case 'attachButtons':
        return {
          bottom: 120, // Above the attachment buttons
          left: 20,
        };
      case 'voiceButton':
        return {
          bottom: 120, // Above the voice/send button
          right: 80,
        };
      case 'homeButton':
        return {
          bottom: 60, // Above the home button
          right: 40,
        };
      case 'screen':
      default:
        return {
          top: '35%', // Center of screen for welcome message
          alignSelf: 'center',
        };
    }
  };

  return (
    <View style={[styles.tooltip, getTooltipPosition()]}>
      {/* Pointer Arrow */}
      {step.position === 'bottom' && <View style={styles.tooltipArrowDown} />}
      {step.position === 'top' && <View style={styles.tooltipArrowUp} />}
      {/* No arrow for center position */}
      
      <View style={styles.tooltipContent}>
        <Text style={styles.tooltipTitle}>{step.title}</Text>
        <Text style={styles.tooltipMessage}>{step.message}</Text>
        
        <View style={styles.tooltipButtons}>
          <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
            <Text style={styles.skipButtonText}>Skip Tour</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.nextButton} onPress={onNext}>
            <Text style={styles.nextButtonText}>
              {step.id === 'home_navigation' ? 'Got it!' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// --- Simulated API Configuration ---
const getKissanAIResponse = async (message, context) => {
    // Session management
    let session_id = await AsyncStorage.getItem('chat_session_id');
    if (!session_id) {
        session_id = Date.now().toString();
        await AsyncStorage.setItem('chat_session_id', session_id);
    }
    const user_id = 'f001'; // Replace with real user id if available
    const farmer_id = 'f001'; // Replace with real farmer id if available
    // Compose payload
    const payload = {
        user_prompt: message.type === 'text' ? message.content : (message.content?.text || ''),
        metadata: { 
            extra_context: context || [],
            farmer_id,
        },
        user_id,
        session_id,
    };
    try {
        const response = await axios.post('http://10.215.221.37:8000/agent', payload); // Update to your backend URL
        if (response.data && response.data.response_text) {
            return response.data.response_text;
        }
        return "Sorry, I couldn't get a response from the server.";
    } catch (error) {
        if (error.response) {
            console.log('AI error response:', error.response.data);
        } else {
            console.log('AI error:', error.message || error);
        }
        return "Sorry, there was an error connecting to the server.";
    }
};

// --- Helper to render bold text ---
const FormattedText = ({ text }) => {
    if (!text || typeof text !== 'string') {
        return <Text style={styles.chatMessageText}></Text>;
    }
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return (
        <Text style={styles.chatMessageText}>
            {parts.map((part, index) => 
                index % 2 === 1 
                    ? <Text key={index} style={{ fontWeight: 'bold' }}>{part}</Text> 
                    : <Text key={index}>{part}</Text>
            )}
        </Text>
    );
};

// --- Chat Message Component ---
const ChatMessage = ({ message, chatHistory }) => {
    const isUser = message.sender === 'user';
    const isDocument = message.type === 'document';
    const isImage = message.type === 'image'; // Add image type check
    const isContext = message.type === 'context'; // Check for context message
    const [liked, setLiked] = useState(false);
    const [disliked, setDisliked] = useState(false);

    const handleCopy = () => Clipboard.setString(message.content || '');
    const handleLike = () => { setLiked(!liked); if (disliked) setDisliked(false); };
    const handleDislike = () => { setDisliked(!disliked); if (liked) setLiked(false); };

    const handleShare = async () => {
        try {
            let shareText = 'Kisaan Sahayak Chat:\n\n';
            chatHistory.forEach(msg => {
                const sender = msg.sender === 'user' ? 'You' : 'Kisaan Sahayak';
                const content = msg.type === 'document' ? `[Document: ${msg.content?.name || 'Unknown'}]` : (msg.content || '');
                shareText += `${sender}: ${content}\n\n`;
            });
            await Share.share({ message: shareText, title: 'Kisaan Sahayak Chat' });
        } catch (error) {
            console.log('Error sharing:', error);
        }
    };

    return (
        <View style={styles.chatMessageWrapper}>
            {!isUser && <MaterialCommunityIcons name="star-four-points" size={24} color="#4CAF50" style={styles.aiIcon}/>} 
            <View style={[
                styles.chatMessageContainer, 
                isUser ? styles.userMessageContainer : styles.aiMessageContainer,
                isContext && styles.contextMessageContainer // Apply special style for context
            ]}>
                {isDocument ? (
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <MaterialCommunityIcons name="file-check" size={20} color="white" style={{marginRight: 8}}/>
                        <Text style={styles.chatMessageText}>Attached: {message.content?.name || 'Unknown file'}</Text>
                    </View>
                ) : isImage ? (
                    <View style={{flexDirection: 'column', alignItems: 'flex-start'}}>
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                            <Image source={{ uri: message.content?.uri || '' }} style={{ width: 120, height: 120, borderRadius: 10, marginRight: 8 }} />
                            <Text style={styles.chatMessageText}>{message.content?.name || 'Image attached'}</Text>
                        </View>
                        {message.content?.text && (
                            <Text style={[styles.chatMessageText, {marginTop: 6}]}>{message.content.text}</Text>
                        )}
                    </View>
                ) : isContext ? (
                    <Text style={styles.contextMessageText}>{message.content || ''}</Text>
                ) : (
                    isUser ? <FormattedText text={message.content || ''} /> : (
                        <View>
                            <Markdown style={{body: styles.chatMessageText}}>
                                {message.content || ''}
                            </Markdown>
                        </View>
                    )
                )}
                {!isUser && !isDocument && !isImage && (
                    <View style={styles.actionIconContainer}>
                        <TouchableOpacity onPress={handleLike}><MaterialCommunityIcons name={liked ? "thumb-up" : "thumb-up-outline"} size={20} color={liked ? "#4CAF50" : "gray"} style={styles.actionIcon} /></TouchableOpacity>
                        <TouchableOpacity onPress={handleDislike}><MaterialCommunityIcons name={disliked ? "thumb-down" : "thumb-down-outline"} size={20} color={disliked ? "#4CAF50" : "gray"} style={styles.actionIcon} /></TouchableOpacity>
                        <TouchableOpacity onPress={handleShare}><MaterialCommunityIcons name="share-variant-outline" size={20} color="gray" style={styles.actionIcon} /></TouchableOpacity>
                        <TouchableOpacity onPress={handleCopy}><MaterialCommunityIcons name="content-copy" size={20} color="gray" style={styles.actionIcon} /></TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
    );
};

// --- Thinking Indicator Component ---
const ThinkingIndicator = () => {
    const rotateAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.loop(Animated.timing(rotateAnim, { toValue: 1, duration: 1000, easing: Easing.linear, useNativeDriver: true })).start();
    }, [rotateAnim]);
    const rotation = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    return (
        <View style={styles.thinkingContainer}>
            <Animated.View style={{ transform: [{ rotate: rotation }] }}><MaterialCommunityIcons name="star-four-points" size={24} color="#4CAF50" /></Animated.View>
            <Text style={styles.thinkingText}>Just a sec...</Text>
        </View>
    );
};

const featureOptions = [
    { icon: <MaterialCommunityIcons name="bank" size={20} color="#f59e0b" />, label: 'marketplace', screen: 'MarketplaceScreen', color: '#f59e0b' },
    { icon: <MaterialCommunityIcons name="calendar-month-outline" size={20} color="#3b82f6" />, label: 'calendar', screen: 'CalenderScreen', color: '#3b82f6' },
    { icon: <MaterialCommunityIcons name="cow" size={20} color="#10b981" />, label: 'cattle', screen: 'CattleScreen', color: '#10b981' },
    { icon: <MaterialCommunityIcons name="recycle-variant" size={20} color="#f59e0b" />, label: 'cropcycle', screen: 'CropCycle', color: '#f59e0b' },
    // More options
    // { icon: <MaterialCommunityIcons name="weather-partly-cloudy" size={20} color="#3b82f6" />, label: 'weather', screen: 'WeatherScreen', color: '#3b82f6' },
    { icon: <MaterialCommunityIcons name="water" size={20} color="#38bdf8" />, label: 'soil', screen: 'CropIntelligenceScreenNew', color: '#38bdf8' },
    { icon: <MaterialCommunityIcons name="school" size={20} color="#a78bfa" />, label: 'edufinance', screen: 'UPI', color: '#a78bfa' },
    { icon: <MaterialCommunityIcons name="file-document-multiple" size={20} color="#f59e0b" />, label: 'document', screen: 'DocumentAgentScreen', color: '#f59e0b' },
    { icon: <MaterialCommunityIcons name="stethoscope" size={20} color="#10b981" />, label: 'cropdoctor', screen: 'CropDoctor', color: '#10b981' },
    { icon: <MaterialCommunityIcons name="tractor-variant" size={20} color="#f59e0b" />, label: 'rental', screen: 'RentalSystemScreen', color: '#f59e0b' },
];

const FeaturesView = ({ navigation }) => {
    const { t } = useTranslation();
    const [showAll, setShowAll] = useState(false);
    const mainOptions = featureOptions.slice(0, 4);
    const extraOptions = featureOptions.slice(4);
    return (
        <View style={styles.featuresPillContainer}>
            <Text style={styles.featuresTitle}>{t('voicechat.features_title')}</Text>
            <View style={styles.pillRow}>
                {mainOptions.map((opt) => (
                    <TouchableOpacity
                        key={opt.label}
                        style={styles.pillButton}
                        onPress={() => navigation.navigate(opt.screen)}
                        activeOpacity={0.85}
                    >
                        {opt.icon}
                        <Text style={styles.pillLabel}>{t(`voicechat.feature.${opt.label}`) || opt.label}</Text>
                    </TouchableOpacity>
                ))}
                <TouchableOpacity style={styles.pillButton} onPress={() => setShowAll((v) => !v)}>
                    <MaterialCommunityIcons name="dots-horizontal" size={20} color="#fff" />
                    <Text style={[styles.pillLabel, { color: '#fff' }]}>{t('voicechat.more')}</Text>
                </TouchableOpacity>
            </View>
            {showAll && (
                <View style={styles.pillRowMore}>
                    {extraOptions.map((opt) => (
                        <TouchableOpacity
                            key={opt.label}
                            style={styles.pillButton}
                            onPress={() => navigation.navigate(opt.screen)}
                            activeOpacity={0.85}
                        >
                            {opt.icon}
                            <Text style={styles.pillLabel}>{t(`voicechat.feature.${opt.label}`) || opt.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>
    );
};

// --- Main Chat Screen Component ---
export default function VoiceChatInputScreen({ navigation, route }) {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation(); // Add useTranslation hook
    const [inputValue, setInputValue] = useState('');
    const [chatHistory, setChatHistory] = useState([]);
    const [chatTitle, setChatTitle] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [currentContext, setCurrentContext] = useState(null);
    const flatListRef = useRef();
    const [allContext, setAllContext] = useState({ weather: '', soil: '', market: '' });
    const [attachedImage, setAttachedImage] = useState(null); // NEW: for image preview
    
    // Onboarding states
    const [showInteractiveGuide, setShowInteractiveGuide] = useState(false);
    const [onboardingStep, setOnboardingStep] = useState(0);
    const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);

    // Interactive onboarding steps for VoiceChatInputScreen
    const ONBOARDING_STEPS = [
        {
            id: 'welcome',
            title: 'Welcome to Chat Mode! 💬',
            message: 'This is where you can have detailed conversations with your AI farming assistant.',
            target: 'screen',
            position: 'center'
        },
        {
            id: 'profile_access',
            title: 'Your Profile 👤',
            message: 'Access your farmer profile and settings from here.',
            target: 'profileIcon',
            position: 'bottom'
        },
        {
            id: 'chat_history',
            title: 'Chat History 📝',
            message: 'View all your previous conversations and continue where you left off.',
            target: 'chatHistory',
            position: 'bottom'
        },
        {
            id: 'new_chat',
            title: 'Start New Chat ➕',
            message: 'Click here to start a fresh conversation anytime.',
            target: 'newChatButton',
            position: 'bottom'
        },
        {
            id: 'features_overview',
            title: 'Quick Features 🚀',
            message: 'Access farming tools like weather, marketplace, cattle management, and more directly from here.',
            target: 'featuresArea',
            position: 'top'
        },
        {
            id: 'text_input',
            title: 'Type Your Questions ⌨️',
            message: 'Type your farming questions here. You can ask about crops, weather, diseases, or anything farm-related.',
            target: 'inputArea',
            position: 'bottom'
        },
        {
            id: 'attachments',
            title: 'Add Files & Images 📎',
            message: 'Attach documents or images to get help with crop diseases, documents, or visual analysis.',
            target: 'attachButtons',
            position: 'bottom'
        },
        {
            id: 'voice_mode',
            title: 'Switch to Voice 🎤',
            message: 'When input is empty, tap this button to switch to voice mode for hands-free interaction.',
            target: 'voiceButton',
            position: 'bottom'
        },
        {
            id: 'home_navigation',
            title: 'Return Home 🏠',
            message: 'Use this button to go back to the main screen and choose between voice or chat modes.',
            target: 'homeButton',
            position: 'bottom'
        }
    ];

    // Check if user has seen onboarding before
    useEffect(() => {
        checkOnboardingStatus();
    }, []);

    const checkOnboardingStatus = async () => {
        try {
            const hasSeenGuide = await AsyncStorage.getItem('voiceChatInputScreenOnboardingCompleted');
            console.log('VoiceChatInputScreen onboarding status:', hasSeenGuide);
            
            if (!hasSeenGuide) {
                console.log('First-time user detected, starting onboarding...');
                // Start onboarding after a short delay
                setTimeout(() => {
                    setShowInteractiveGuide(true);
                    setOnboardingStep(0);
                }, 2000); // Longer delay for this screen due to more complexity
            } else {
                console.log('Returning user, onboarding already completed');
            }
            setHasSeenOnboarding(!!hasSeenGuide);
        } catch (error) {
            console.error('Error checking onboarding status:', error);
            // If there's an error, show onboarding anyway for first-time experience
            setTimeout(() => {
                setShowInteractiveGuide(true);
                setOnboardingStep(0);
            }, 2000);
        }
    };

    const startInteractiveGuide = () => {
        console.log('Starting VoiceChatInputScreen interactive guide manually...');
        setShowInteractiveGuide(true);
        setOnboardingStep(0);
    };

    const nextOnboardingStep = () => {
        if (onboardingStep < ONBOARDING_STEPS.length - 1) {
            setOnboardingStep(onboardingStep + 1);
        } else {
            completeOnboarding();
        }
    };

    const skipOnboarding = async () => {
        completeOnboarding();
    };

    const completeOnboarding = async () => {
        setShowInteractiveGuide(false);
        setOnboardingStep(0);
        setHasSeenOnboarding(true);
        
        try {
            await AsyncStorage.setItem('voiceChatInputScreenOnboardingCompleted', 'true');
        } catch (error) {
            console.error('Error saving onboarding completion:', error);
        }
    };

    // Debug function to reset onboarding (for testing)
    const resetOnboarding = async () => {
        try {
            await AsyncStorage.removeItem('voiceChatInputScreenOnboardingCompleted');
            setHasSeenOnboarding(false);
            console.log('VoiceChatInputScreen onboarding reset - will show on next app start');
            Alert.alert('Debug', 'Onboarding reset! Restart the app to see it again.');
        } catch (error) {
            console.error('Error resetting onboarding:', error);
        }
    };

    useEffect(() => {
        const context = route.params?.context;
        if (context) {
            setCurrentContext(context);
            setChatTitle(t('voicechat.title'));
            setChatHistory([]); // Start with empty chat
        }
    }, [route.params?.context]);

    // REMOVED: useEffect that fetches all context on mount

    // If fetchWeatherContext, fetchSoilContext, fetchMarketContext are not used elsewhere, remove them too


    const saveChatToHistory = async (title, messages) => {
        try {
            const newChat = { id: Date.now().toString(), title: title || t('voicechat.new_chat'), date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), messages };
            let history = await AsyncStorage.getItem('chatHistory');
            history = history ? JSON.parse(history) : [];
            history.unshift(newChat);
            await AsyncStorage.setItem('chatHistory', JSON.stringify(history.slice(0, 20)));
        } catch (e) { console.log('Failed to save chat to history', e); }
    };

    const handleStartNewChat = async () => {
        if (chatHistory.length > 0) {
            await saveChatToHistory(chatTitle, chatHistory);
        }
        setChatHistory([]);
        setChatTitle('');
        setInputValue('');
        setCurrentContext(null);
    };

    useEffect(() => {
        if (chatHistory.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: true });
        }
    }, [chatHistory]);

    const handleSendMessage = async (message) => {
        // NEW: Compose message with image and/or text
        let msgToSend = null;
        if (attachedImage && (inputValue.trim() || !inputValue)) {
            msgToSend = {
                type: 'image',
                content: {
                    name: attachedImage.name || t('voicechat.image'),
                    uri: attachedImage.uri,
                    text: inputValue.trim() ? inputValue : undefined,
                },
            };
        } else if (!message) {
            if (!inputValue.trim()) return;
            msgToSend = { type: 'text', content: inputValue };
        } else {
            msgToSend = message;
        }
        if (!msgToSend) return;
        if (chatHistory.length === 0 && !currentContext) {
            const title = msgToSend.content.text
                ? (msgToSend.content.text.length > 25 ? `${msgToSend.content.text.substring(0, 22)}...` : msgToSend.content.text)
                : (msgToSend.content.length > 25 ? `${msgToSend.content.substring(0, 22)}...` : msgToSend.content);
            setChatTitle(title);
        }
        const userMessage = { sender: 'user', ...msgToSend };
        setChatHistory(prev => [...prev, userMessage]);
        setInputValue('');
        setAttachedImage(null); // Clear image after sending
        setIsThinking(true);
        const aiResponseText = await getKissanAIResponse(msgToSend, chatHistory);
        const aiMessage = { sender: 'ai', type: 'text', content: aiResponseText };
        setChatHistory(prev => [...prev, aiMessage]);
        setIsThinking(false);
    };

    const handleAttachDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync();
            if (!result.canceled && result.assets && result.assets.length > 0) {
                const doc = result.assets[0];
                // Check if the file is an image by mime type or extension
                const isImage = (doc.mimeType && doc.mimeType.startsWith('image/')) || (doc.name && doc.name.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i));
                if (isImage) {
                    // Read file and encode as base64 data URL
                    const fileUri = doc.uri;
                    const base64 = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 });
                    // Guess mime type from extension
                    const ext = doc.name.split('.').pop().toLowerCase();
                    const mime = ext === 'jpg' || ext === 'jpeg' ? 'jpeg' : ext;
                    const dataUrl = `data:image/${mime};base64,${base64}`;
                    setAttachedImage({ name: doc.name, uri: dataUrl });
                } else {
                    const message = { type: 'document', content: { name: doc.name, uri: doc.uri } };
                    handleSendMessage(message);
                }
            }
        } catch (err) { Alert.alert(t('common.error'), t('voicechat.could_not_open_document_picker')) }
    };

    const handleAttachImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: [ImagePicker.MediaType.IMAGE], allowsEditing: true, quality: 1 });
            if (!result.canceled && result.assets && result.assets.length > 0) {
                const img = result.assets[0];
                // Read file and encode as base64 data URL
                const fileUri = img.uri;
                const base64 = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 });
                // Guess mime type from extension
                let ext = 'jpeg';
                if (img.fileName && img.fileName.includes('.')) {
                  ext = img.fileName.split('.').pop().toLowerCase();
                }
                const mime = ext === 'jpg' || ext === 'jpeg' ? 'jpeg' : ext;
                const dataUrl = `data:image/${mime};base64,${base64}`;
                setAttachedImage({ name: img.fileName || t('voicechat.image'), uri: dataUrl });
            }
        } catch (err) { Alert.alert(t('common.error'), t('voicechat.could_not_open_image_picker')) }
    };

    const FARMER_ID = 'f001';
    const API_BASE = NetworkConfig.API_BASE;
    const WEATHER_ANALYSIS_CACHE_KEY = 'weather-ai-analysis-f001';
    const MARKET_CACHE_KEY = 'market-prices-cache';

    // REMOVED: fetchWeatherContext, fetchSoilContext, fetchMarketContext function definitions

    return (
        <SafeAreaView style={styles.container}>
            {/* Profile Icon at Top Right */}
            <TouchableOpacity
                style={{ position: 'absolute', top: 68, right: 2, zIndex: 10 }}
                onPress={() => navigation.navigate('FarmerProfile', { farmerId: FARMER_ID })}
                activeOpacity={0.5}
            >
                <Ionicons name="person-circle-outline" size={44} color="#10B981" />
            </TouchableOpacity>
            <View style={[styles.topBar, { paddingTop: insets.top }]}> 
                <TouchableOpacity onPress={() => navigation.navigate('ChatHistory')}><Ionicons name="time-outline" size={28} color="white" /></TouchableOpacity>
                <Text style={styles.topBarTitle} numberOfLines={1}>{chatTitle || t('voicechat.title')}</Text>
                <View style={styles.topRightIcons}>
                    <TouchableOpacity onPress={() => navigation.navigate('Featured')}><Ionicons name="star-outline" size={28} color="white" style={styles.topRightIcon} /></TouchableOpacity>
                </View>
            </View>
            {/* New Chat Button Centered Below Title */}
            <View style={styles.centeredNewChatRow}>
                <TouchableOpacity
                    style={styles.centeredNewChatButton}
                    onPress={async () => {
                        if (chatHistory.length > 0) {
                            const newChat = {
                                id: Date.now().toString(),
                                title: chatTitle || t('voicechat.new_chat'),
                                date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                                messages: chatHistory,
                                context: allContext // Save context with chat history
                            };
                            try {
                                // Save to AsyncStorage only, or implement remote save via /agent if needed
                                let history = await AsyncStorage.getItem('chatHistory');
                                history = history ? JSON.parse(history) : [];
                                history.unshift(newChat);
                                await AsyncStorage.setItem('chatHistory', JSON.stringify(history.slice(0, 20)));
                            } catch (e) {
                                Alert.alert(t('common.error'), t('voicechat.failed_to_save_chat_backend'));
                            }
                        }
                        setChatHistory([]);
                        setChatTitle('');
                        setInputValue('');
                        setAttachedImage(null); // Clear image on new chat
                        setCurrentContext(null);
                        navigation.navigate('ChatHistory');
                    }}
                >
                    <Ionicons name="add-circle" size={38} color="#10b981" />
                </TouchableOpacity>
            </View>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <View style={{ flex: 1 }}>
                    {chatHistory.length === 0 ? (
                        <FeaturesView navigation={navigation} />
                    ) : (
                        <FlatList
                            ref={flatListRef}
                            data={chatHistory}
                            renderItem={({ item }) => <ChatMessage message={item} chatHistory={chatHistory} />}
                            keyExtractor={(item, index) => `chat-${index}-${item.type || 'message'}`}
                            style={styles.chatList}
                            contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 10 }}
                            ListFooterComponent={isThinking ? <ThinkingIndicator /> : null}
                        />
                    )}
                </View>
                <View style={[styles.inputContainer, { marginRight: 70, marginBottom: 10 }]}> {/* Add marginRight to avoid overlap with home button */}
                    <TouchableOpacity style={styles.plusButton} onPress={handleAttachDocument}><Ionicons name="add" size={28} color="gray" /></TouchableOpacity>
                    <TouchableOpacity style={styles.plusButton} onPress={handleAttachImage}><MaterialCommunityIcons name="image-plus" size={28} color="gray" /></TouchableOpacity>
                    {/* Image preview above input */}
                    {attachedImage && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 10 }}>
                            <Image source={{ uri: attachedImage.uri }} style={{ width: 50, height: 50, borderRadius: 8, marginRight: 6 }} />
                            <TouchableOpacity onPress={() => setAttachedImage(null)} style={{ marginLeft: 2 }}>
                                <MaterialCommunityIcons name="close-circle" size={24} color="#f87171" />
                            </TouchableOpacity>
                        </View>
                    )}
                    <TextInput style={styles.textInput} placeholder={t('voicechat.placeholder')} placeholderTextColor="gray" value={inputValue} onChangeText={setInputValue} onSubmitEditing={() => handleSendMessage()} multiline />
                    {(inputValue.length === 0 && !attachedImage) ? (
                        <TouchableOpacity style={styles.voiceButton} onPress={() => navigation.navigate('LiveVoiceScreen')}><MaterialCommunityIcons name="waveform" size={26} color="white" /></TouchableOpacity>
                    ) : (
                        <TouchableOpacity onPress={() => handleSendMessage()}><MaterialCommunityIcons name="send-circle" size={34} color="#4CAF50" /></TouchableOpacity>
                    )}
                </View>
                {/* Floating Home Button at Bottom Right */}
                <TouchableOpacity
                    style={{ position: 'absolute', bottom: 10, right: 9, zIndex: 20, backgroundColor: '#18181b', borderRadius: 32, padding: 10, elevation: 8 }}
                    onPress={() => navigation.navigate('ChoiceScreen')}
                    activeOpacity={0.85}
                >
                    <Ionicons name="home-outline" size={38} color="#10B981" />
                </TouchableOpacity>

                {/* Mic Overlay - UI only for now */}
                <MicOverlay 
                    onPress={() => {
                        // For now, just navigate to LiveVoiceScreen
                        navigation.navigate('LiveVoiceScreen');
                    }}
                    isVisible={true}
                    isActive={false}
                />

                {/* Onboarding debug buttons for testing */}
                {hasSeenOnboarding && (
                    <View style={styles.tourButtonsContainer}>
                        <TouchableOpacity 
                            style={styles.restartTourButton} 
                            onPress={startInteractiveGuide}
                        >
                            <MaterialCommunityIcons name="replay" size={16} color="#10B981" />
                            <Text style={styles.restartTourText}>Tour</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={styles.resetTourButton} 
                            onPress={resetOnboarding}
                        >
                            <MaterialCommunityIcons name="refresh" size={14} color="#FF5722" />
                            <Text style={styles.resetTourText}>Reset</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </KeyboardAvoidingView>

            {/* Interactive Guide Overlay */}
            {showInteractiveGuide && (
                <View style={styles.guideOverlay}>
                    <TouchableOpacity 
                        style={styles.guideOverlayBackground}
                        onPress={nextOnboardingStep}
                        activeOpacity={1}
                    />
                    <InteractiveGuideTooltip 
                        step={ONBOARDING_STEPS[onboardingStep]}
                        onNext={nextOnboardingStep}
                        onSkip={skipOnboarding}
                    />
                </View>
            )}
        </SafeAreaView>
    );
};

// --- Styles ---
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#121212' },
    topBar: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 30, paddingTop:10,paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#222' },
    topBarTitle: { color: 'white', fontSize: 30, fontWeight: 'bold', flex: 1, textAlign: 'center', marginHorizontal: 30,marginTop:10,paddingHorizontal:30 },
    topRightIcons: { flexDirection: 'row' },
    topRightIcon: { marginRight: 20,marginTop:10 },
    chatList: { flex: 1 },
    inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e1e1e', borderRadius: 35, paddingHorizontal: 20, marginHorizontal: '5%', marginVertical: 20, minHeight: 60, paddingVertical: 5 },
    plusButton: { marginRight: 10 },
    textInput: { flex: 1, color: 'white', fontSize: 18, marginRight: 10, maxHeight: 120 },
    voiceButton: { backgroundColor: '#333', borderRadius: 20, padding: 8 },
    chatMessageWrapper: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 5, paddingLeft: 10 },
    aiIcon: { marginRight: 8, marginTop: 10 },
    chatMessageContainer: { paddingVertical: 10, paddingHorizontal: 15, borderRadius: 20, maxWidth: '85%' },
    userMessageContainer: { backgroundColor: '#333333', alignSelf: 'flex-end', marginLeft: 'auto', borderBottomRightRadius: 5 },
    aiMessageContainer: { backgroundColor: 'transparent', alignSelf: 'flex-start' },
    contextMessageContainer: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#444', alignSelf: 'center', marginLeft: 0 },
    chatMessageText: { color: 'white', fontSize: 16, lineHeight: 22 },
    contextMessageText: { color: '#888', fontSize: 14, fontStyle: 'italic' },
    actionIconContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
    actionIcon: { marginRight: 20 },
    thinkingContainer: { flexDirection: 'row', alignItems: 'center', padding: 10, paddingLeft: 15 },
    thinkingText: { color: 'gray', fontStyle: 'italic', marginLeft: 10 },
    featuresContainer: { marginTop: 30, marginBottom: 10, alignItems: 'center', justifyContent: 'center' },
    keyFeatureBox: {
      width: '90%',
      alignSelf: 'center',
      backgroundColor: '#1e1e1e',
      borderRadius: 18,
      paddingVertical: 22,
      paddingHorizontal: 18,
      marginBottom: 22,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: '#888',
      elevation: 8,
    },
    keyFeatureTitle: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 20,
      marginBottom: 2,
      letterSpacing: 0.2,
    },
    keyFeatureSubtitle: {
      color: '#fff',
      fontSize: 14,
      marginTop: 2,
      textAlign: 'center',
    },
    featuresRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginBottom: 20 },
    featureBox: { backgroundColor: '#1e1e1e', borderRadius: 15, padding: 20, alignItems: 'center', justifyContent: 'center', width: '45%', height: 120, borderWidth: 1, borderColor: '#333' },
    featureText: { color: 'white', marginTop: 10, fontSize: 14, fontWeight: '600' },
    newChatButton: { marginLeft: 10, padding: 4 },
    cropDoctorCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#1e1e1e',
      borderRadius: 18,
      paddingVertical: 22,
      paddingHorizontal: 18,
      marginBottom: 22,
      alignSelf: 'center',
      width: '90%',
      borderWidth: 2,
      borderColor: '#888',
      elevation: 8,
    },
    cropDoctorIcon: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: '#3b82f6',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 15,
    },
    cropDoctorTitle: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 20,
      marginBottom: 2,
      letterSpacing: 0.2,
    },
    cropDoctorSubtitle: {
      color: '#fff',
      fontSize: 14,
      marginTop: 2,
      textAlign: 'center',
    },
    featuresGridContainer: { marginTop: 40, alignItems: 'center', justifyContent: 'center' },
    featuresTitle: { color: 'white', fontSize: 22, fontWeight: 'bold', marginBottom: 24 },
    featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16, width: '100%' },
    featureGridBox: {
        width: 120, height: 60, backgroundColor: '#232323', borderRadius: 16, alignItems: 'center', justifyContent: 'center', margin: 8, elevation: 2,
        flexDirection: 'column',
    },
    featureGridLabel: { color: '#fff', fontSize: 14, marginTop: 6, textAlign: 'center' },
    featuresPillContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 0 },
    pillRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24, flexWrap: 'wrap', gap: 10 },
    pillRowMore: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 16, flexWrap: 'wrap', gap: 10 },
    pillButton: {
        flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 22, paddingHorizontal: 14, paddingVertical: 8, marginHorizontal: 4, marginVertical: 4, backgroundColor: 'transparent', borderColor: '#bbb',
    },
    pillLabel: { fontSize: 15, fontWeight: '500', marginLeft: 6, color: '#bbb' },
    centeredNewChatRow: { alignItems: 'center', marginTop: -20, marginBottom: 10 },
    centeredNewChatButton: { backgroundColor: 'transparent', borderRadius: 24, padding: 2 },

    // Onboarding Tour Buttons (smaller for this screen)
    tourButtonsContainer: {
        position: 'absolute',
        bottom: 85,
        left: 15,
        flexDirection: 'row',
        gap: 6,
        zIndex: 15,
    },
    restartTourButton: {
        backgroundColor: '#18181b',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#10B981',
        paddingHorizontal: 8,
        paddingVertical: 6,
        flexDirection: 'row',
        alignItems: 'center',
    },
    restartTourText: {
        color: '#10B981',
        fontSize: 10,
        fontWeight: '600',
        marginLeft: 3,
    },
    resetTourButton: {
        backgroundColor: '#18181b',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FF5722',
        paddingHorizontal: 6,
        paddingVertical: 6,
        flexDirection: 'row',
        alignItems: 'center',
    },
    resetTourText: {
        color: '#FF5722',
        fontSize: 9,
        fontWeight: '600',
        marginLeft: 2,
    },

    // Interactive Guide Styles (adapted for smaller screen space)
    guideOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 2000,
    },
    guideOverlayBackground: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
    },
    tooltip: {
        position: 'absolute',
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 14,
        marginHorizontal: 15,
        maxWidth: width - 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    tooltipArrowDown: {
        position: 'absolute',
        bottom: -7,
        alignSelf: 'center',
        width: 0,
        height: 0,
        borderLeftWidth: 7,
        borderRightWidth: 7,
        borderTopWidth: 7,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: 'white',
    },
    tooltipArrowUp: {
        position: 'absolute',
        top: -7,
        alignSelf: 'center',
        width: 0,
        height: 0,
        borderLeftWidth: 7,
        borderRightWidth: 7,
        borderBottomWidth: 7,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: 'white',
    },
    tooltipContent: {
        alignItems: 'center',
    },
    tooltipTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 6,
        textAlign: 'center',
    },
    tooltipMessage: {
        fontSize: 13,
        color: '#666',
        textAlign: 'center',
        lineHeight: 18,
        marginBottom: 14,
    },
    tooltipButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    skipButton: {
        flex: 1,
        padding: 10,
        alignItems: 'center',
        marginRight: 6,
        borderRadius: 6,
        backgroundColor: '#f5f5f5',
    },
    skipButtonText: {
        color: '#666',
        fontSize: 13,
        fontWeight: '500',
    },
    nextButton: {
        flex: 1,
        padding: 10,
        alignItems: 'center',
        marginLeft: 6,
        borderRadius: 6,
        backgroundColor: '#10B981',
    },
    nextButtonText: {
        color: 'white',
        fontSize: 13,
        fontWeight: 'bold',
    },
});