import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, FlatList, KeyboardAvoidingView, Platform, Animated, Easing, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// --- Library imports have been removed to avoid build errors ---

// --- Simulated API Configuration ---
const getKissanAIResponse = async (message) => {
    console.log("Simulating AI response for:", message);
    return new Promise(resolve => {
        setTimeout(() => {
            if (message.type === 'document') {
                resolve(`Thank you for uploading '${message.content.name}'. I will analyze it and provide a summary. What specific information are you looking for?`);
                return;
            }

            const lowerCaseQuery = message.content.toLowerCase();
            const responses = {
                "weather": "The forecast for Pune, Maharashtra is clear skies for the next 3 days, with a chance of light showers over the weekend. Current temperature is 28°C.",
                "fertilizer for wheat": "For wheat crops in this region, a balanced NPK fertilizer (e.g., 12-32-16) is recommended during the sowing stage. It's best to confirm with a recent soil test.",
                "market price for tomatoes": "The current average market price for tomatoes in the Pune market is approximately ₹30 per kg for good quality produce.",
                "pest control": "For common pests on vegetable plants, a neem oil solution is a good organic first step. Can you specify the crop and the pest you are seeing?",
                "hello": "Hello! I am Kissan AI, your agricultural assistant. How can I help you today?",
                "default": "I am Kissan AI, ready to assist with your farming questions. You can ask me about crop management, weather, market prices, and more."
            };

            for (const key in responses) {
                if (lowerCaseQuery.includes(key)) {
                    resolve(responses[key]);
                    return;
                }
            }
            resolve(responses.default);
        }, 1500); // Simulate network delay
    });
};


// --- Chat Message Component ---
const ChatMessage = ({ message }) => {
    const isUser = message.sender === 'user';
    const isDocument = message.type === 'document';

    return (
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
    );
};

// --- Main App Component ---
export default function App() {
    const insets = useSafeAreaInsets ? useSafeAreaInsets() : { top: 40, bottom: 20 };
    const [currentView, setCurrentView] = useState('main'); // 'main', 'chat', 'liveVoice'
    const [inputValue, setInputValue] = useState('');
    const [chatHistory, setChatHistory] = useState([
        { sender: 'ai', type: 'text', content: 'Hello! I am Kissan AI. How can I assist you with your farming needs today?' }
    ]);
    const [isThinking, setIsThinking] = useState(false);

    const handleSendMessage = async (message) => {
        if (!message) {
            if (!inputValue.trim()) return;
            message = { type: 'text', content: inputValue };
        }

        const userMessage = { sender: 'user', ...message };
        setChatHistory(prev => [...prev, userMessage]);
        setInputValue('');
        setIsThinking(true);
        setCurrentView('chat');

        const aiResponseText = await getKissanAIResponse(message);
        const aiMessage = { sender: 'ai', type: 'text', content: aiResponseText };

        setIsThinking(false);
        setChatHistory(prev => [...prev, aiMessage]);
    };

    const handleAttachDocument = async () => {
        Alert.alert("Attaching Document", "Simulating document selection...");
        // Simulate picking a document after a short delay
        setTimeout(() => {
            const doc = { name: 'simulated_soil_report.pdf', uri: 'file:///simulated/path/report.pdf' };
            const message = { type: 'document', content: { name: doc.name, uri: doc.uri } };
            handleSendMessage(message);
        }, 1000);
    };
    
    const renderView = () => {
        switch (currentView) {
            case 'chat':
                return <ChatScreen 
                            insets={insets} 
                            chatHistory={chatHistory} 
                            isThinking={isThinking} 
                            onClose={() => setCurrentView('main')} 
                        />;
            case 'liveVoice':
                return <LiveVoiceScreen 
                            insets={insets} 
                            onClose={() => setCurrentView('main')} 
                            onVoiceResult={(text) => handleSendMessage({type: 'text', content: text})}
                        />;
            case 'main':
            default:
                return <MainScreen 
                            insets={insets} 
                            inputValue={inputValue}
                            setInputValue={setInputValue}
                            onSendMessage={handleSendMessage}
                            onShowChat={() => setCurrentView('chat')}
                            onShowLiveVoice={() => setCurrentView('liveVoice')}
                            onAttachDocument={handleAttachDocument}
                        />;
        }
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.container}>
            {renderView()}
        </KeyboardAvoidingView>
    );
}


// --- Screen Components ---

const MainScreen = ({ insets, inputValue, setInputValue, onSendMessage, onShowChat, onShowLiveVoice, onAttachDocument }) => {
    return (
        <View style={styles.container}>
            <View style={[styles.topBar, { paddingTop: insets.top }]}>
                <TouchableOpacity onPress={onShowChat}>
                    <Ionicons name="chatbubble-outline" size={28} color="white" />
                </TouchableOpacity>
                <View style={{ flex: 1 }} />
                <TouchableOpacity onPress={() => Alert.alert('Home', 'Navigating to Home Screen!')}>
                    <Ionicons name="home-outline" size={28} color="white" />
                </TouchableOpacity>
            </View>

            <View style={styles.liveVoiceSection}>
                <Text style={styles.liveVoiceText}>Live Voice Chat</Text>
                <TouchableOpacity onPress={onShowLiveVoice}>
                    <MaterialCommunityIcons name="waveform" size={80} color={'white'} />
                </TouchableOpacity>
            </View>

            <Text style={styles.orText}>OR</Text>

            <View style={[styles.inputContainer, { marginBottom: insets.bottom > 0 ? insets.bottom : 20 }]}>
                <TouchableOpacity style={styles.plusButton} onPress={onAttachDocument}>
                    <Ionicons name="add" size={28} color="gray" />
                </TouchableOpacity>
                <TextInput
                    style={styles.textInput}
                    placeholder="Ask Kissan AI"
                    placeholderTextColor="gray"
                    value={inputValue}
                    onChangeText={setInputValue}
                />
                {inputValue.length === 0 ? (
                    <>
                        <TouchableOpacity onPress={() => Alert.alert('Video Call', 'This feature is coming soon!')}>
                            <Ionicons name="videocam-outline" size={24} color="gray" style={styles.inputIcon} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={onAttachDocument}>
                            <MaterialCommunityIcons name="file-document-outline" size={24} color="gray" style={styles.inputIcon} />
                        </TouchableOpacity>
                    </>
                ) : (
                    <TouchableOpacity onPress={() => onSendMessage()}>
                        <MaterialCommunityIcons name="send-circle" size={34} color="#4CAF50" />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const ChatScreen = ({ insets, chatHistory, isThinking, onClose }) => {
    const flatListRef = useRef();

    useEffect(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
    }, [chatHistory]);

    return (
        <SafeAreaView style={styles.container}>
            <View style={[styles.topBar, { paddingTop: insets.top, paddingBottom: 15 }]}>
                <Text style={styles.topBarTitle}>Kissan AI Chat</Text>
                <TouchableOpacity onPress={onClose}>
                    <Ionicons name="close-circle" size={30} color="white" />
                </TouchableOpacity>
            </View>
            <FlatList
                ref={flatListRef}
                data={chatHistory}
                renderItem={({ item }) => <ChatMessage message={item} />}
                keyExtractor={(_, index) => index.toString()}
                style={styles.chatList}
                contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 10 }}
            />
            {isThinking && <Text style={styles.thinkingText}>Kissan AI is thinking...</Text>}
        </SafeAreaView>
    );
};

const LiveVoiceScreen = ({ insets, onClose, onVoiceResult }) => {
    const [isListening, setIsListening] = useState(false);
    const [recognizedText, setRecognizedText] = useState('');
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handleToggleListen = () => {
        if (isListening) {
            // This part is for stopping, but our simulation stops automatically.
            return;
        }
        
        setIsListening(true);
        setRecognizedText('...'); // Show listening indicator
        
        // Simulate voice recognition after a delay
        setTimeout(() => {
            const simulatedVoiceInput = "What is the weather forecast for this week?";
            setRecognizedText(simulatedVoiceInput);
            setIsListening(false);
            
            // Automatically send the result after another short delay
            setTimeout(() => {
                onVoiceResult(simulatedVoiceInput);
            }, 1000);
        }, 2500); // Simulate listening for 2.5 seconds
    };

    // --- Animation Logic ---
    useEffect(() => {
        const pulseAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(scaleAnim, { toValue: 1.2, duration: 500, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
                Animated.timing(scaleAnim, { toValue: 1, duration: 500, useNativeDriver: true, easing: Easing.inOut(Easing.ease) })
            ])
        );
        if (isListening) {
            pulseAnimation.start();
        } else {
            pulseAnimation.stop();
            scaleAnim.setValue(1);
        }
        
        return () => pulseAnimation.stop();
    }, [isListening, scaleAnim]);

    return (
        <SafeAreaView style={styles.container}>
             <View style={[styles.topBar, { paddingTop: insets.top }]}>
                <TouchableOpacity onPress={onClose}>
                    <Ionicons name="arrow-back" size={28} color="white" />
                </TouchableOpacity>
            </View>
            <View style={styles.liveVoiceSection}>
                <Text style={styles.liveVoiceTitle}>{isListening ? "Listening..." : "Tap to Speak"}</Text>
                <TouchableOpacity onPress={handleToggleListen}>
                    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                        <MaterialCommunityIcons name="waveform" size={120} color={isListening ? '#4CAF50' : 'white'} />
                    </Animated.View>
                </TouchableOpacity>
                <Text style={styles.liveVoiceSubtitle}>{recognizedText || "Ask me about crops, weather, or market prices."}</Text>
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
    },
    topBarTitle: {
        color: 'white',
        fontSize: 22,
        fontWeight: 'bold',
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
    orText: {
        color: 'gray',
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 20,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1e1e1e',
        borderRadius: 30,
        paddingHorizontal: 15,
        paddingVertical: 10,
        marginHorizontal: '5%',
    },
    plusButton: {
        marginRight: 10,
    },
    textInput: {
        flex: 1,
        color: 'white',
        fontSize: 16,
        marginRight: 10,
    },
    inputIcon: {
        marginHorizontal: 8,
    },
    chatList: {
        flex: 1,
    },
    chatMessageContainer: {
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 20,
        marginVertical: 5,
        maxWidth: '80%',
    },
    userMessageContainer: {
        backgroundColor: '#4CAF50',
        alignSelf: 'flex-end',
        borderBottomRightRadius: 5,
    },
    aiMessageContainer: {
        backgroundColor: '#333333',
        alignSelf: 'flex-start',
        borderBottomLeftRadius: 5,
    },
    chatMessageText: {
        color: 'white',
        fontSize: 16,
    },
    thinkingText: {
        textAlign: 'center',
        color: 'gray',
        padding: 10,
        fontStyle: 'italic',
    },
});
