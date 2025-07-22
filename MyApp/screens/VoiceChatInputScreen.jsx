import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, FlatList, KeyboardAvoidingView, Platform, Animated, Easing, Alert, Clipboard, Share, Image } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Markdown from 'react-native-markdown-display';
import * as ImagePicker from 'expo-image-picker';


// --- Simulated API Configuration ---
const getKissanAIResponse = async (message, context) => {
    // If not a text message, fallback to simulation
    if (message.type !== 'text') {
        console.log("Simulating AI response for:", message);
        if (message.type === 'image') {
            return new Promise(resolve => setTimeout(() => resolve(`Image \"${message.content.name}\" received!`), 1500));
        }
        if (message.type === 'document') {
            return new Promise(resolve => setTimeout(() => resolve(`Thank you for uploading '${message.content.name}'. I am analyzing the document and will provide a summary shortly.`), 1500));
        }
        // ... handle other types if needed ...
        return new Promise(resolve => setTimeout(() => resolve("Unsupported message type."), 1500));
    }
    // For text messages, call backend RAG endpoint
    try {
        const response = await axios.post('http://192.168.0.111:8000/chat/rag', {
            user_query: message.content,
            chat_history: context ? JSON.stringify(context) : ""
        });
        // Prefer bullet points and links if present
        if (response.data && response.data.response) {
            return response.data.response;
        }
        return "Sorry, I couldn't get a response from the server.";
    } catch (error) {
        return "Sorry, there was an error connecting to the server.";
    }
};

// --- Helper to render bold text ---
const FormattedText = ({ text }) => {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return (
        <Text style={styles.chatMessageText}>
            {parts.map((part, index) => 
                index % 2 === 1 
                    ? <Text key={index} style={{ fontWeight: 'bold' }}>{part}</Text> 
                    : part
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

    const handleCopy = () => Clipboard.setString(message.content);
    const handleLike = () => { setLiked(!liked); if (disliked) setDisliked(false); };
    const handleDislike = () => { setDisliked(!disliked); if (liked) setLiked(false); };

    const handleShare = async () => {
        try {
            let shareText = 'Kissan AI Chat:\n\n';
            chatHistory.forEach(msg => {
                const sender = msg.sender === 'user' ? 'You' : 'Kissan AI';
                const content = msg.type === 'document' ? `[Document: ${msg.content.name}]` : msg.content;
                shareText += `${sender}: ${content}\n\n`;
            });
            await Share.share({ message: shareText, title: 'Kissan AI Chat' });
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
                        <Text style={styles.chatMessageText}>Attached: {message.content.name}</Text>
                    </View>
                ) : isImage ? (
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <Image source={{ uri: message.content.uri }} style={{ width: 120, height: 120, borderRadius: 10, marginRight: 8 }} />
                        <Text style={styles.chatMessageText}>{message.content.name || 'Image attached'}</Text>
                    </View>
                ) : isContext ? (
                    <Text style={styles.contextMessageText}>{message.content}</Text>
                ) : (
                    isUser ? <FormattedText text={message.content} /> : <Markdown style={{body: styles.chatMessageText}}>{message.content}</Markdown>
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

// --- Features View Component ---
const FeaturesView = ({ navigation }) => (
    <View style={styles.featuresContainer}>
        {/* Key Feature Box */}
        <TouchableOpacity style={styles.keyFeatureBox} onPress={() => navigation.navigate('DocumentAgentScreen')} activeOpacity={0.85}>
            <MaterialCommunityIcons name="file-document-multiple" size={44} color="#FFB07C" style={{marginBottom: 6}} />
            <Text style={styles.keyFeatureTitle}>Document Agent</Text>
            <Text style={styles.keyFeatureSubtitle}>Create & manage your documents</Text>
        </TouchableOpacity>
        <View style={styles.featuresRow}>
            <TouchableOpacity style={styles.featureBox} onPress={() => navigation.navigate('CattleScreen')}><MaterialCommunityIcons name="cow" size={40} color="#10b981" /><Text style={styles.featureText}>Cattle Schedule</Text></TouchableOpacity>
            <TouchableOpacity style={styles.featureBox} onPress={() => navigation.navigate('CalenderScreen')}><MaterialCommunityIcons name="calendar-month-outline" size={40} color="#3b82f6" /><Text style={styles.featureText}>Calendar</Text></TouchableOpacity>
        </View>
        <View style={styles.featuresRow}>
            <TouchableOpacity style={styles.featureBox} onPress={() => navigation.navigate('CropCycle')}><MaterialCommunityIcons name="recycle-variant" size={40} color="#f59e0b" /><Text style={styles.featureText}>Crop Cycle</Text></TouchableOpacity>
            <TouchableOpacity style={styles.featureBox} onPress={() => navigation.navigate('CropDoctor')}><MaterialCommunityIcons name="stethoscope" size={40} color="#a259f7" /><Text style={styles.featureText}>Crop Doctor</Text></TouchableOpacity>
        </View>
        <View style={styles.featuresRow}>
            <TouchableOpacity style={styles.featureBox} onPress={() => navigation.navigate('WeatherScreen')}>
                <MaterialCommunityIcons name="weather-partly-cloudy" size={40} color="#3b82f6" />
                <Text style={styles.featureText}>Weather</Text>
            </TouchableOpacity>
        </View>
    </View>
);

// --- Main Chat Screen Component ---
export default function VoiceChatInputScreen({ navigation, route }) {
    const insets = useSafeAreaInsets();
    const [inputValue, setInputValue] = useState('');
    const [chatHistory, setChatHistory] = useState([]);
    const [chatTitle, setChatTitle] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [currentContext, setCurrentContext] = useState(null);
    const flatListRef = useRef();

    useEffect(() => {
        const context = route.params?.context;
        if (context) {
            setCurrentContext(context);
            const title = `${context.diseaseName} Analysis`;
            setChatTitle(title);

            // The new sequence: User Context -> Thinking -> AI Response
            const userContextMessage = {
                sender: 'user',
                type: 'context',
                content: `Continuing conversation about "${context.diseaseName}"`
            };
            setChatHistory([userContextMessage]);
            setIsThinking(true);

            setTimeout(() => {
                const aiIntroMessage = {
                    sender: 'ai',
                    type: 'text',
                    content: `Alright, I have the details for **${context.diseaseName}**. Ask me anything specific about its symptoms or solutions.`
                };
                setChatHistory(prev => [...prev, aiIntroMessage]);
                setIsThinking(false);
            }, 1500);
        }
    }, [route.params?.context]);


    const saveChatToHistory = async (title, messages) => {
        try {
            const newChat = { id: Date.now().toString(), title: title || 'Untitled Chat', date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), messages };
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
        if (!message) {
            if (!inputValue.trim()) return;
            message = { type: 'text', content: inputValue };
        }
        
        if (chatHistory.length === 0 && !currentContext) {
            const title = message.content.length > 25 ? `${message.content.substring(0, 22)}...` : message.content;
            setChatTitle(title);
        }

        const userMessage = { sender: 'user', ...message };
        setChatHistory(prev => [...prev, userMessage]);
        setInputValue('');
        setIsThinking(true);

        const aiResponseText = await getKissanAIResponse(message, currentContext);
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
                    const message = { type: 'image', content: { name: doc.name, uri: doc.uri } };
                    handleSendMessage(message);
                } else {
                    const message = { type: 'document', content: { name: doc.name, uri: doc.uri } };
                    handleSendMessage(message);
                }
            }
        } catch (err) { Alert.alert('Error', 'Could not open the document picker.'); }
    };

    const handleAttachImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: [ImagePicker.MediaType.IMAGE], allowsEditing: true, quality: 1 });
            if (!result.canceled && result.assets && result.assets.length > 0) {
                const img = result.assets[0];
                const message = { type: 'image', content: { name: img.fileName || 'Image', uri: img.uri } };
                handleSendMessage(message);
            }
        } catch (err) { Alert.alert('Error', 'Could not open the image picker.'); }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={[styles.topBar, { paddingTop: insets.top }]}>
                <TouchableOpacity onPress={() => navigation.navigate('ChatHistory')}><Ionicons name="time-outline" size={28} color="white" /></TouchableOpacity>
                <Text style={styles.topBarTitle} numberOfLines={1}>{chatTitle || 'Kissan AI'}</Text>
                <View style={styles.topRightIcons}>
                    <TouchableOpacity onPress={() => navigation.navigate('Featured')}><Ionicons name="star-outline" size={28} color="white" style={styles.topRightIcon} /></TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.navigate('ChoiceScreen')}><Ionicons name="home-outline" size={28} color="white" /></TouchableOpacity>
                </View>
            </View>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : -500}>
                <View style={{ flex: 1 }}>
                    {chatHistory.length === 0 ? (
                        <FeaturesView navigation={navigation} />
                    ) : (
                        <FlatList
                            ref={flatListRef}
                            data={chatHistory}
                            renderItem={({ item }) => <ChatMessage message={item} chatHistory={chatHistory} />}
                            keyExtractor={(_, index) => index.toString()}
                            style={styles.chatList}
                            contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 10 }}
                            ListFooterComponent={isThinking ? <ThinkingIndicator /> : null}
                        />
                    )}
                </View>
                <View style={styles.inputContainer}>
                    <TouchableOpacity style={styles.plusButton} onPress={handleAttachDocument}><Ionicons name="add" size={28} color="gray" /></TouchableOpacity>
                    <TouchableOpacity style={styles.plusButton} onPress={handleAttachImage}><MaterialCommunityIcons name="image-plus" size={28} color="gray" /></TouchableOpacity>
                    <TextInput style={styles.textInput} placeholder="Ask Kissan AI" placeholderTextColor="gray" value={inputValue} onChangeText={setInputValue} onSubmitEditing={() => handleSendMessage()} multiline />
                    {inputValue.length === 0 ? (
                        <TouchableOpacity style={styles.voiceButton} onPress={() => navigation.navigate('LiveVoiceScreen')}><MaterialCommunityIcons name="waveform" size={26} color="white" /></TouchableOpacity>
                    ) : (
                        <TouchableOpacity onPress={() => handleSendMessage()}><MaterialCommunityIcons name="send-circle" size={34} color="#4CAF50" /></TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.newChatButton} onPress={handleStartNewChat}><Ionicons name="add-circle" size={32} color="#10b981" /></TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

// --- Styles ---
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#121212' },
    topBar: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingTop:10,paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#222' },
    topBarTitle: { color: 'white', fontSize: 30, fontWeight: 'bold', flex: 1, textAlign: 'center', marginHorizontal: 10,marginTop:10 },
    topRightIcons: { flexDirection: 'row' },
    topRightIcon: { marginRight: 15 },
    chatList: { flex: 1 },
    inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e1e1e', borderRadius: 35, paddingHorizontal: 20, marginHorizontal: '5%', marginVertical: 25, minHeight: 60, paddingVertical: 5 },
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
});