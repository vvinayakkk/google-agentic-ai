import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import axios from 'axios';
import { NetworkConfig } from '../utils/NetworkConfig';

const API_BASE = NetworkConfig.API_BASE;

export default function SpeechToTextScreen({ navigation }) {
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);
  const recordingRef = useRef(null);

  const startRecording = async () => {
    setError(null);
    setTranscript('');
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        setError('Permission to access microphone is required!');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      recordingRef.current = recording;
      setIsRecording(true);
    } catch (e) {
      setError('Failed to start recording: ' + e.message);
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);
    try {
      const rec = recordingRef.current;
      if (!rec) return;
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      setRecording(null);
      await uploadAudio(uri);
    } catch (e) {
      setError('Failed to stop recording: ' + e.message);
    }
  };

  const uploadAudio = async (uri) => {
    setIsUploading(true);
    setTranscript('');
    setError(null);
    try {
      // Convert to .wav if needed, but expo-av records as .m4a by default. Backend expects .wav.
      // For demo, try sending as-is, but ideally convert to .wav on backend or use a library to record as .wav.
      const fileInfo = await FileSystem.getInfoAsync(uri);
      const fileName = uri.split('/').pop().replace(/m4a$/, 'wav');
      const formData = new FormData();
      formData.append('file', {
        uri,
        name: fileName,
        type: 'audio/wav', // May need to adjust if backend expects .wav
      });
      const response = await axios.post(`${API_BASE}/speech-to-text/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setTranscript(response.data.transcript || 'No transcript found.');
    } catch (e) {
      setError('Failed to upload or transcribe audio: ' + (e.response?.data?.detail || e.message));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Speech to Text (Backend)</Text>
      <View style={styles.textContainer}>
        {isUploading ? (
          <ActivityIndicator size="large" color="#10B981" />
        ) : (
          <Text style={styles.recognizedText}>{transcript || 'Tap the mic, record, and upload to backend...'}</Text>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
      <TouchableOpacity
        style={[styles.micButton, isRecording && { backgroundColor: '#10B981' }]}
        onPress={isRecording ? stopRecording : startRecording}
        activeOpacity={0.8}
        disabled={isUploading}
      >
        <Ionicons name={isRecording ? 'mic-off' : 'mic'} size={48} color={isRecording ? 'white' : '#10B981'} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    color: '#10B981',
    fontWeight: 'bold',
    marginBottom: 32,
  },
  textContainer: {
    minHeight: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  recognizedText: {
    fontSize: 22,
    color: '#fff',
    textAlign: 'center',
  },
  micButton: {
    backgroundColor: '#fff',
    borderRadius: 50,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  errorText: {
    color: '#f87171',
    marginBottom: 16,
    textAlign: 'center',
  },
  backButton: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#23232a',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
  },
}); 