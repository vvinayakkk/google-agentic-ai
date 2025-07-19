import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image, KeyboardAvoidingView, Platform } from 'react-native';

export default function PlantAssistantScreen({ navigation, route }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const scrollViewRef = useRef();

  useEffect(() => {
    const initialQuery = route.params?.initialQuery;

    if (initialQuery) {
      setMessages([
        { id: 1, sender: 'user', text: initialQuery },
        { id: 2, sender: 'bot', text: 'Thinking...' }
      ]);
      // TODO: Immediately trigger the API call for this query
    } else {
      setMessages([
        { id: 1, sender: 'bot', text: 'Hello! How can I help you with your plants today?' }
      ]);
    }
  }, [route.params?.initialQuery]);


  const handleSend = async () => {
    if (inputText.trim().length === 0) {
      return;
    }

    const userMessage = {
      id: messages.length + 1,
      sender: 'user',
      text: inputText,
    };
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInputText('');

    setTimeout(() => {
      const botMessage = {
        id: messages.length + 2,
        sender: 'bot',
        structuredText: {
          title: "Certainly! Here's a concise yet detailed overview of mint (Mentha):",
          sections: [
            {
              heading: 'Growing Conditions',
              points: [
                'Sunlight: Thrives in partial shade to full sun (morning sun + afternoon shade in hot climates).',
                'Soil: Moist, well-draining soil with a pH of 6.0–7.0. Tolerates most soil types.',
                'Water: Keep soil consistently damp (water when top inch feels dry). Avoid waterlogging.',
              ],
            },
            {
              heading: 'Care Tips',
              points: [
                'Pruning: Pinch stem tips to encourage bushiness. Trim flowers to prioritize leaf growth.',
              ],
            },
          ],
        },
      };
      setMessages(prevMessages => [...prevMessages, botMessage]);
    }, 1000);
  };

  return (
    <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 25}
    >
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.headerBack}>‹</Text>
        </TouchableOpacity>
        <Image source={{ uri: 'https://placehold.co/40x40/A7F3D0/14532D?text=P' }} style={styles.headerIcon} />
        <View>
          <Text style={styles.headerTitle}>Plant Assistant</Text>
          <Text style={styles.headerSubtitle}>Expert in Mint</Text>
        </View>
        <TouchableOpacity style={{ marginLeft: 'auto' }}>
            <Text style={styles.headerRefresh}>⟳</Text>
        </TouchableOpacity>
      </View>

      {/* Chat Messages */}
      <ScrollView 
        style={styles.messagesContainer}
        ref={scrollViewRef}
        onContentSizeChange={() => scrollViewRef.current.scrollToEnd({ animated: true })}
      >
        {messages.map((msg) => (
          <View key={msg.id} style={[styles.messageBubble, msg.sender === 'user' ? styles.userBubble : styles.botBubble]}>
            {msg.text ? (
              <Text style={msg.sender === 'user' ? styles.userText : styles.botText}>{msg.text}</Text>
            ) : (
              // Render the structured message card
              msg.structuredText && <View>
                <Text style={styles.botText}>{msg.structuredText.title}</Text>
                {msg.structuredText.sections.map((section, index) => (
                  <View key={index} style={styles.botSection}>
                    <Text style={styles.botSectionHeading}>{section.heading}</Text>
                    {section.points.map((point, pIndex) => (
                      <Text key={pIndex} style={styles.botText}>• {point}</Text>
                    ))}
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Message Input */}
      <View style={styles.inputContainer}>
        <TouchableOpacity>
            <Text style={styles.inputIcons}>📎</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Ask about Mint..."
          placeholderTextColor="#9CA3AF"
        />
        <TouchableOpacity onPress={handleSend}>
            <Text style={styles.inputIcons}>🎤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingTop: Platform.OS === 'android' ? 40 : 50,
    paddingBottom: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerBack: {
    fontSize: 36,
    color: '#14532D',
    marginRight: 10,
    fontWeight: '200',
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  headerRefresh: {
    fontSize: 24,
    color: '#14532D',
  },
  // Messages
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 15,
    borderRadius: 20,
    marginBottom: 10,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#16A34A',
    borderBottomRightRadius: 5,
  },
  botBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#E5E7EB',
    borderBottomLeftRadius: 5,
  },
  userText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  botText: {
    color: '#1F2937',
    fontSize: 16,
    lineHeight: 24,
  },
  botSection: {
    marginTop: 12,
  },
  botSectionHeading: {
    fontWeight: 'bold',
    color: '#1F2937',
    fontSize: 16,
    marginBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#D1D5DB',
    paddingBottom: 5,
  },
  // Input
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  textInput: {
    flex: 1,
    height: 45,
    backgroundColor: '#F3F4F6',
    borderRadius: 22,
    paddingHorizontal: 20,
    fontSize: 16,
    color: '#111827',
  },
  inputIcons: {
      fontSize: 24,
      color: '#6B7280',
      marginHorizontal: 10,
  }
});
