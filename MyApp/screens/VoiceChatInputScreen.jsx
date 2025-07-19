import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, FlatList, KeyboardAvoidingView, Platform, Animated, Easing, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// --- EXPO LIBRARY IMPORT (No Native Build Needed) ---
// IMPORTANT: To enable document/image attachments, you MUST install this library.
// It works with Expo Go and does not require a native rebuild.
// Run the following command:
// expo install expo-document-picker
import * as DocumentPicker from 'expo-document-picker';


// --- Simulated API Configuration ---
const getKissanAIResponse = async (message) => {
    console.log("Simulating AI response for:", message);
    return new Promise(resolve => {
        setTimeout(() => {
            if (message.type === 'document') {
                resolve(`Thank you for uploading '${message.content.name}'. I am analyzing the document and will provide a summary shortly.`);
                return;
            }

            const lowerCaseQuery = message.content.toLowerCase();
            const responses = {
                "weather": "The forecast for Pune, Maharashtra is clear skies for the next 3 days, with a chance of light showers over the weekend. Current temperature is 28°C.",
                "fertilizer for wheat": "For wheat crops in this region, a balanced NPK fertilizer (e.g., 12-32-16) is recommended during the sowing stage. It's best to confirm with a recent soil test.",
                "market price for tomatoes": "The current average market price for tomatoes in the Pune market is approximately ₹30 per kg for good quality produce.",
                "pest control": "For common pests on vegetable plants, a neem oil solution is a good organic first step. Can you specify the crop and the pest you are seeing?",
                "hello": "Hello there! How can I help you today?",
                "default": "I am Kissan AI, ready to assist with your farming questions. You can ask me about crop management, weather, market prices, and more."
            };

            for (const key in responses) {
                if (lowerCaseQuery.includes(key)) {
                    resolve(responses[key]);
                    return;
                }
            }
            resolve(responses.default);
        }, 2000); // Simulate network delay
    });
};


// --- Chat Message Component ---
const ChatMessage = ({ message }) => {
    const isUser = message.sender === 'user';
    const isDocument = message.type === 'document';

    return (
        <View style={styles.chatMessageWrapper}>
            {!isUser && <MaterialCommunityIcons name="star-four-points" size={24} color="#4CAF50" style={styles.aiIcon}/>}
            <View style={[
                styles.chatMessageContainer,
                isUser ? styles.userMessageContainer : styles.aiMessageContainer
            ]}>
                {isDocument ? (
                     <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <MaterialCommunityIcons name="file-check" size={20} color="white" style={{marginRight: 8}}/>
                        <Text style={styles.chatMessageText}>Attached: {message.content.name}</Text>
                     </View>
                ) : (
                    <Text style={styles.chatMessageText}>{message.content}</Text>
                )}
            </View>
        </View>
    );
};

// --- Thinking Indicator Component ---
const ThinkingIndicator = () => {
    const rotateAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.timing(rotateAnim, {
                toValue: 1,
                duration: 1000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();
    }, [rotateAnim]);

    const rotation = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    return (
        <View style={styles.thinkingContainer}>
            <Animated.View style={{ transform: [{ rotate: rotation }] }}>
                <MaterialCommunityIcons name="star-four-points" size={24} color="#4CAF50" />
            </Animated.View>
            <Text style={styles.thinkingText}>Just a sec...</Text>
        </View>
    );
};


// --- Main App Component ---
export default function App() {
    const insets = useSafeAreaInsets ? useSafeAreaInsets() : { top: 40, bottom: 20 };
    const [currentView, setCurrentView] = useState('main'); // 'main', 'liveVoice', 'home', 'featured'
    
    const renderView = () => {
        switch (currentView) {
            case 'liveVoice':
                return <LiveVoiceScreen insets={insets} onClose={() => setCurrentView('main')} />;
            case 'home':
                return <PlaceholderScreen insets={insets} screenName="Home" onClose={() => setCurrentView('main')} />;
            case 'featured':
                 return <PlaceholderScreen insets={insets} screenName="Featured" onClose={() => setCurrentView('main')} />;
            case 'main':
            default:
                return <MainScreen 
                            insets={insets} 
                            onNavigate={setCurrentView}
                        />;
        }
    };

    // The KeyboardAvoidingView has been moved into the MainScreen component
    // to provide more granular control and fix the keyboard overlap issue.
    return (
        <View style={styles.container}>
            {renderView()}
        </View>
    );
}


// --- Screen Components ---

const MainScreen = ({ insets, onNavigate }) => {
    const [inputValue, setInputValue] = useState('');
    const [chatHistory, setChatHistory] = useState([]);
    const [chatTitle, setChatTitle] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const flatListRef = useRef();

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
        
        if (chatHistory.length === 0) { // First user message sets the title
            const title = message.content.length > 25 ? `${message.content.substring(0, 22)}...` : message.content;
            setChatTitle(title);
        }

        const userMessage = { sender: 'user', ...message };
        setChatHistory(prev => [...prev, userMessage]);
        setInputValue('');
        setIsThinking(true);

        const aiResponseText = await getKissanAIResponse(message);
        const aiMessage = { sender: 'ai', type: 'text', content: aiResponseText };

        setChatHistory(prev => [...prev, aiMessage]);
        setIsThinking(false);
    };

    const handleAttachDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync();
            if (!result.canceled && result.assets && result.assets.length > 0) {
                const doc = result.assets[0];
                const message = { type: 'document', content: { name: doc.name, uri: doc.uri } };
                handleSendMessage(message);
            } else {
                console.log('User cancelled the document picker or no asset was selected.');
            }
        } catch (err) {
            Alert.alert(
                'Error', 
                'Could not open the document picker. Please ensure you have granted necessary permissions.'
            );
            console.error('Document Picker Error:', err);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Top Bar */}
            <View style={[styles.topBar, { paddingTop: insets.top }]}>
                <TouchableOpacity onPress={() => onNavigate('featured')}>
                    <Ionicons name="chatbubble-outline" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.topBarTitle} numberOfLines={1}>{chatTitle || 'Kissan AI'}</Text>
                <TouchableOpacity onPress={() => onNavigate('home')}>
                    <Ionicons name="home-outline" size={28} color="white" />
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView 
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                {/* This view ensures the FlatList and Input are grouped for the KeyboardAvoidingView */}
                <View style={{ flex: 1 }}>
                    {/* Conditional Voice Section or Chat List */}
                    {chatHistory.length === 0 ? (
                        <View style={styles.liveVoiceSection}>
                            <Text style={styles.liveVoiceText}>Live Voice Chat</Text>
                            <TouchableOpacity onPress={() => onNavigate('liveVoice')}>
                                <MaterialCommunityIcons name="waveform" size={80} color={'white'} />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <FlatList
                            ref={flatListRef}
                            data={chatHistory}
                            renderItem={({ item }) => <ChatMessage message={item} />}
                            keyExtractor={(_, index) => index.toString()}
                            style={styles.chatList}
                            contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 10 }}
                            ListFooterComponent={isThinking ? <ThinkingIndicator /> : null}
                        />
                    )}
                </View>
                
                {/* Input Bar */}
                <View style={styles.inputContainer}>
                    <TouchableOpacity style={styles.plusButton} onPress={handleAttachDocument}>
                        <Ionicons name="add" size={28} color="gray" />
                    </TouchableOpacity>
                    <TextInput
                        style={styles.textInput}
                        placeholder="Ask Kissan AI"
                        placeholderTextColor="gray"
                        value={inputValue}
                        onChangeText={setInputValue}
                        onSubmitEditing={() => handleSendMessage()}
                    />
                    {inputValue.length === 0 ? (
                        <>
                            <TouchableOpacity onPress={() => Alert.alert('Video Call', 'This feature is coming soon!')}>
                                <Ionicons name="videocam-outline" size={24} color="gray" style={styles.inputIcon} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleAttachDocument}>
                                <MaterialCommunityIcons name="file-document-outline" size={24} color="gray" style={styles.inputIcon} />
                            </TouchableOpacity>
                        </>
                    ) : (
                        <TouchableOpacity onPress={() => handleSendMessage()}>
                            <MaterialCommunityIcons name="send-circle" size={34} color="#4CAF50" />
                        </TouchableOpacity>
                    )}
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const LiveVoiceScreen = ({ insets, onClose }) => (
    <PlaceholderScreen insets={insets} screenName="Live Voice (Placeholder)" onClose={onClose} />
);

const PlaceholderScreen = ({ insets, screenName, onClose }) => {
    return (
        <SafeAreaView style={styles.container}>
             <View style={[styles.topBar, { paddingTop: insets.top }]}>
                <TouchableOpacity onPress={onClose}>
                    <Ionicons name="arrow-back" size={28} color="white" />
                </TouchableOpacity>
            </View>
            <View style={styles.placeholderSection}>
                <Text style={styles.liveVoiceTitle}>{screenName} Screen</Text>
                <Text style={styles.liveVoiceSubtitle}>This is a placeholder for navigation.</Text>
            </View>
        </SafeAreaView>
    );
};


// --- Styles ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
    },
    topBar: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#222',
    },
    topBarTitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
        flex: 1,
        textAlign: 'center',
        marginHorizontal: 10,
    },
    liveVoiceSection: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    liveVoiceText: {
        color: 'white',
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 30,
    },
    chatList: {
        flex: 1,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1e1e1e',
        borderRadius: 30,
        paddingHorizontal: 15,
        paddingVertical: Platform.OS === 'ios' ? 10 : 5,
        marginHorizontal: '5%',
        marginVertical: 10, // Added margin for spacing
    },
    plusButton: {
        marginRight: 10,
    },
    textInput: {
        flex: 1,
        color: 'white',
        fontSize: 16,
        marginRight: 10,
        paddingVertical: Platform.OS === 'ios' ? 5 : 0,
    },
    inputIcon: {
        marginHorizontal: 8,
    },
    chatMessageWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginVertical: 5,
        paddingLeft: 10,
    },
    aiIcon: {
        marginRight: 8,
        marginTop: 10,
    },
    chatMessageContainer: {
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 20,
        maxWidth: '85%',
    },
    userMessageContainer: {
        backgroundColor: '#333333',
        alignSelf: 'flex-end',
        marginLeft: 'auto', // Push to the right
        borderBottomRightRadius: 5,
    },
    aiMessageContainer: {
        backgroundColor: 'transparent',
        alignSelf: 'flex-start',
    },
    chatMessageText: {
        color: 'white',
        fontSize: 16,
    },
    thinkingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        paddingLeft: 15,
    },
    thinkingText: {
        color: 'gray',
        fontStyle: 'italic',
        marginLeft: 10,
    },
    // Placeholder Screen Styles
    placeholderSection: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    liveVoiceTitle: {
        color: 'white',
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 40,
        paddingHorizontal: 20,
        textAlign: 'center',
    },
    liveVoiceSubtitle: {
        color: 'gray',
        fontSize: 16,
        marginTop: 40,
        textAlign: 'center',
        paddingHorizontal: 20,
        minHeight: 50,
    },
});
