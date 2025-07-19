import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  Image,
  Platform,
  KeyboardAvoidingView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const ChatScreen = () => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState(null);
  const [selectedImages, setSelectedImages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const scrollViewRef = useRef(null);

  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    const audioPermission = await Audio.requestPermissionsAsync();
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!audioPermission.granted || !cameraPermission.granted || !mediaPermission.granted) {
      Alert.alert('Permissions Required', 'Please grant camera, microphone, and media library permissions to use all features.');
    }
  };

  const sendToServer = async (payload) => {
    try {
      setIsLoading(true);
      console.log('📤 Sending payload:', payload);
      
      const formData = new FormData();
      formData.append('type', payload.type);
      
      if (payload.text) {
        formData.append('text', payload.text);
      }
      
      if (payload.audio) {
        formData.append('audio', {
          uri: Platform.OS === 'ios' ? payload.audio.replace('file://', '') : payload.audio,
          type: 'audio/m4a',
          name: 'recording.m4a',
        });
      }
      
      if (payload.images && payload.images.length > 0) {
        payload.images.forEach((image, index) => {
          const uri = image.uri;
          const uriParts = uri.split('.');
          const fileType = uriParts[uriParts.length - 1];
          const mimeType = `image/${fileType}`;
          const fileName = image.fileName || `image_${index}.${fileType}`;
          
          formData.append('images', {
            uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
            type: mimeType,
            name: fileName,
          });
        });
        formData.append('imageCount', payload.images.length.toString());
      }
      
      console.log('📡 Making request to server...');
      
      const response = await fetch('http://192.168.0.101:3000/api/chat', {
        method: 'POST',
        body: formData,
        headers: {
          Accept: 'application/json',
        },
        timeout: 60000,
      });
      
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Server error:', errorText);
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('✅ Server response:', result);
      
      setMessages(prev => [...prev, { id: Date.now(), ...payload, timestamp: new Date() }]);
      
    } catch (error) {
      console.error('❌ Error sending to server:', error);
      
      let errorMessage = 'Failed to send message. Please try again.';
      
      if (error.message.includes('Network request failed')) {
        errorMessage = 'Network error. Please check your connection and server URL.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Request timeout. The server might be slow or unavailable.';
      } else if (error.message.includes('Server error')) {
        errorMessage = error.message;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };


  const handleSendText = () => {
    const hasText = message.trim().length > 0;
    const hasImages = selectedImages.length > 0;

    if (!hasText && !hasImages) {
        return; 
    }
    
    let payloadType;
    if (hasImages && hasText) {
        payloadType = 'text_with_images';
    } else if (hasImages && !hasText) {
        payloadType = 'images_only';
    } else { 
        payloadType = 'text';
    }

    const payload = {
      type: payloadType,
      text: message.trim(),
      images: selectedImages,
    };
    
    sendToServer(payload);
    setMessage('');
    setSelectedImages([]);
  };



  const startRecording = async () => {
    try {
      console.log('🎤 Requesting permissions..');
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('🎤 Starting recording..');
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsRecording(true);
      console.log('✅ Recording started');
    } catch (err) {
      console.error('❌ Failed to start recording', err);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const stopRecording = async () => {
    if (!isRecording) return; 

    console.log('🎤 Stopping recording..');
    setIsRecording(false);
    
    if (recording) {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null); 
      console.log('✅ Recording stopped and stored at', uri);
      
      const payload = {
        type: 'audio',
        audio: uri,
      };
      
      sendToServer(payload);
    }
  };

  const pickImage = async (useCamera = false) => {
    try {
      console.log(`📷 ${useCamera ? 'Opening camera' : 'Opening gallery'}...`);
      
      let result;
      
      const commonOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsEditing: false,
      };
      
      if (useCamera) {
        result = await ImagePicker.launchCameraAsync({
          ...commonOptions,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          ...commonOptions,
          allowsMultipleSelection: true,
          selectionLimit: 5,
        });
      }

      console.log('📷 Image picker result:', result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImages(prev => [...prev, ...result.assets]);
      } else {
        console.log('📷 No images selected or operation cancelled');
      }
    } catch (error) {
      console.error('❌ Error picking image:', error);
      Alert.alert('Error', `Failed to pick image: ${error.message}`);
    }
  };

  const removeImage = (index) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const showImageOptions = () => {
    Alert.alert(
      'Select Image',
      'Choose an option',
      [
        { text: 'Camera', onPress: () => pickImage(true) },
        { text: 'Gallery', onPress: () => pickImage(false) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const renderMessage = (msg) => (
    <View key={msg.id} style={styles.messageContainer}>
      <Text style={styles.messageType}>{msg.type.replace(/_/g, ' ').toUpperCase()}</Text>
      {msg.text && <Text style={styles.messageText}>{msg.text}</Text>}
      {msg.images && msg.images.length > 0 && (
        <View style={styles.imagesContainer}>
          {msg.images.map((img, index) => (
            <Image 
              key={index} 
              source={{ uri: img.uri }} 
              style={styles.messageImage}
              onError={(error) => console.log('❌ Image load error:', error.nativeEvent.error)}
            />
          ))}
        </View>
      )}
      {msg.audio && (
        <View style={styles.audioContainer}>
          <Ionicons name="musical-notes" size={20} color="#007AFF" />
          <Text style={styles.audioText}>Audio Recording</Text>
        </View>
      )}
      <Text style={styles.timestamp}>
        {msg.timestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'Now'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardContainer} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chat Interface</Text>
        <Text style={styles.headerSubtitle}>
          {isLoading ? '📤 Sending...' : '✅ Ready'}
        </Text>
      </View>
      
      <ScrollView 
        ref={scrollViewRef}
        style={styles.messagesContainer}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map(renderMessage)}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Sending message...</Text>
          </View>
        )}
      </ScrollView>

      {selectedImages.length > 0 && (
        <View style={styles.selectedImagesContainer}>
          <Text style={styles.selectedImagesTitle}>
            Selected Images ({selectedImages.length})
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {selectedImages.map((img, index) => (
              <View key={index} style={styles.selectedImageWrapper}>
                <Image 
                  source={{ uri: img.uri }} 
                  style={styles.selectedImage}
                  onError={(error) => console.log('❌ Preview image error:', error.nativeEvent.error)}
                />
                <TouchableOpacity 
                  style={styles.removeImageBtn}
                  onPress={() => removeImage(index)}
                >
                  <Ionicons name="close-circle" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.inputContainer}>
        <View style={styles.inputRow}>
          <TouchableOpacity 
            style={styles.attachBtn}
            onPress={showImageOptions}
          >
            <Ionicons name="camera" size={24} color="#007AFF" />
          </TouchableOpacity>
          
          <TextInput
            style={styles.textInput}
            value={message}
            onChangeText={setMessage}
            placeholder="Type a message..."
            multiline
            maxLength={1000}
          />
          
          <TouchableOpacity
            style={[styles.actionBtn, isRecording && styles.recordingBtn]}
            onPressIn={startRecording}
            onPressOut={stopRecording}
          >
            <MaterialIcons 
              name={isRecording ? "stop" : "mic"} 
              size={24} 
              color={isRecording ? "#FF3B30" : "#007AFF"} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.sendBtn,
              (!message.trim() && selectedImages.length === 0) && styles.sendBtnDisabled
            ]}
            onPress={handleSendText}
            disabled={!message.trim() && selectedImages.length === 0}
          >
            <Ionicons name="send" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        
        {isRecording && (
          <Text style={styles.recordingText}>Recording... Hold to record, release to send</Text>
        )}
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// Styles remain the same
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 15,
    paddingTop: 10,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 4,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 15,
  },
  messageContainer: {
    backgroundColor: '#F1F1F1',
    padding: 12,
    marginVertical: 5,
    borderRadius: 12,
    alignSelf: 'flex-end',
    maxWidth: '80%',
  },
  messageType: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    color: '#000000',
    marginBottom: 4,
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  messageImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    margin: 2,
  },
  audioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  audioText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#007AFF',
  },
  timestamp: {
    fontSize: 11,
    color: '#8E8E93',
    textAlign: 'right',
    marginTop: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 10,
  },
  loadingText: {
    color: '#8E8E93',
    fontStyle: 'italic',
  },
  selectedImagesContainer: {
    backgroundColor: '#F8F9FA',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  selectedImagesTitle: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 8,
    fontWeight: '600',
  },
  selectedImageWrapper: {
    position: 'relative',
    marginRight: 8,
  },
  selectedImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  removeImageBtn: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
  },
  inputContainer: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 15,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 25 : 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  attachBtn: {
    padding: 8,
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 8,
    maxHeight: 100,
    backgroundColor: '#FFFFFF',
    fontSize: 16,
  },
  actionBtn: {
    padding: 8,
    marginRight: 8,
  },
  recordingBtn: {
    backgroundColor: '#FFE5E5',
    borderRadius: 20,
  },
  sendBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 40,
  },
  sendBtnDisabled: {
    backgroundColor: '#C7C7CC',
  },
  recordingText: {
    textAlign: 'center',
    color: '#FF3B30',
    fontSize: 12,
    marginTop: 5,
  },
});

export default ChatScreen;