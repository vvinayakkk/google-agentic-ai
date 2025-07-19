import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, FlatList, KeyboardAvoidingView, Platform, Animated, Easing, Alert, Clipboard } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// --- EXPO LIBRARY IMPORT (No Native Build Needed) ---
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

    const handleCopy = () => {
        Clipboard.setString(message.content);
        Alert.alert("Copied", "Response copied to clipboard.");
    };

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
                 {!isUser && !isDocument && (
                    <View style={styles.actionIconContainer}>
                        <TouchableOpacity onPress={() => Alert.alert('Liked', 'You liked this response!')}>
                            <MaterialCommunityIcons name="thumb-up-outline" size={20} color="gray" style={styles.actionIcon} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => Alert.alert('Disliked', 'Feedback submitted.')}>
                            <MaterialCommunityIcons name="thumb-down-outline" size={20} color="gray" style={styles.actionIcon} />
                        </TouchableOpacity>
                         <TouchableOpacity onPress={() => Alert.alert('Share', 'Sharing functionality coming soon.')}>
                            <MaterialCommunityIcons name="share-variant-outline" size={20} color="gray" style={styles.actionIcon} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleCopy}>
                            <MaterialCommunityIcons name="content-copy" size={20} color="gray" style={styles.actionIcon} />
                        </TouchableOpacity>
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

// --- Features View Component ---
const FeaturesView = ({ navigation }) => {
    return (
        <View style={styles.featuresContainer}>
            <View style={styles.featuresRow}>
                <TouchableOpacity style={styles.featureBox} onPress={() => navigation.navigate('CattleSchedule')}>
                    <MaterialCommunityIcons name="cow" size={40} color="white" />
                    <Text style={styles.featureText}>Cattle Schedule</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.featureBox} onPress={() => navigation.navigate('Calendar')}>
                    <MaterialCommunityIcons name="calendar-month-outline" size={40} color="white" />
                    <Text style={styles.featureText}>Calendar</Text>
                </TouchableOpacity>
            </View>
            <View style={styles.featuresRow}>
                <TouchableOpacity style={styles.featureBox} onPress={() => navigation.navigate('CropCycle')}>
                    <MaterialCommunityIcons name="recycle-variant" size={40} color="white" />
                    <Text style={styles.featureText}>Crop Cycle</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.featureBox} onPress={() => navigation.navigate('CropDoctor')}>
                    <MaterialCommunityIcons name="stethoscope" size={40} color="white" />
                    <Text style={styles.featureText}>Crop Doctor</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};


// --- Main Chat Screen Component ---
export default function VoiceChatInputScreen({ navigation }) {
    const insets = useSafeAreaInsets ? useSafeAreaInsets() : { top: 40, bottom: 20 };
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
            }
        } catch (err) {
            Alert.alert('Error', 'Could not open the document picker.');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Top Bar */}
            <View style={[styles.topBar, { paddingTop: insets.top }]}>
                <TouchableOpacity onPress={() => navigation.navigate('ChatHistory')}>
                    <Ionicons name="time-outline" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.topBarTitle} numberOfLines={1}>{chatTitle || 'Kissan AI'}</Text>
                <View style={styles.topRightIcons}>
                    <TouchableOpacity onPress={() => navigation.navigate('Featured')}>
                        <Ionicons name="star-outline" size={28} color="white" style={styles.topRightIcon} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.navigate('Home')}>
                        <Ionicons name="home-outline" size={28} color="white" />
                    </TouchableOpacity>
                </View>
            </View>

            <KeyboardAvoidingView 
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                <View style={{ flex: 1 }}>
                    {chatHistory.length === 0 ? (
                        <FeaturesView navigation={navigation} />
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
                        multiline
                    />
                    {inputValue.length === 0 ? (
                        <TouchableOpacity style={styles.voiceButton} onPress={() => navigation.navigate('LiveVoiceScreen')}>
                            <MaterialCommunityIcons name="waveform" size={26} color="white" />
                        </TouchableOpacity>
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
    topRightIcons: {
        flexDirection: 'row',
    },
    topRightIcon: {
        marginRight: 15,
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
        marginHorizontal: '5%',
        marginVertical: 10,
        minHeight: 50, // Ensure a minimum height
    },
    plusButton: {
        marginRight: 10,
    },
    textInput: {
        flex: 1,
        color: 'white',
        fontSize: 16,
        marginRight: 10,
        paddingVertical: 10, // Increased padding for more height
        maxHeight: 120, // Prevent it from getting excessively tall
    },
    voiceButton: {
        backgroundColor: '#333',
        borderRadius: 20,
        padding: 8,
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
        marginLeft: 'auto',
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
    actionIconContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
    },
    actionIcon: {
        marginRight: 20,
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
    featuresContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    featuresRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        marginBottom: 20,
    },
    featureBox: {
        backgroundColor: '#1e1e1e',
        borderRadius: 15,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        width: '45%',
        height: 120,
        borderWidth: 1,
        borderColor: '#333',
    },
    featureText: {
        color: 'white',
        marginTop: 10,
        fontSize: 14,
        fontWeight: '600',
    },
});
