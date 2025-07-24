import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, ScrollView, Platform, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

// Update this to your backend device IP (same as other screens)
const API_BASE = 'http://192.168.1.13:8000/document-builder';

export default function DocumentAgentScreen({ navigation }) {
  const { t } = useTranslation();
  const [sessionId, setSessionId] = useState(null);
  const [chat, setChat] = useState([
    { role: 'assistant', message: '🧑‍🌾 Namaste farmer 🙏, I’m here to help you make an official document required for any government scheme.\nPlease tell me the scheme name or upload a sample/photo of the document you saw.' }
  ]);
  const [schemeName, setSchemeName] = useState('');
  const [file, setFile] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [documentUrl, setDocumentUrl] = useState(null);
  const [documentReady, setDocumentReady] = useState(false);

  // File/image picker
  const pickFile = async () => {
    let result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
    if (!result.canceled && result.assets && result.assets[0]) {
      setFile(result.assets[0]);
    }
  };
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1 });
    if (!result.canceled && result.assets && result.assets[0]) {
      setFile(result.assets[0]);
    }
  };

  // Start session
  const startSession = async () => {
    setLoading(true);
    setError(null);
    try {
      let formData = new FormData();
      if (schemeName) formData.append('scheme_name', schemeName);
      if (file) {
        formData.append('file', {
          uri: file.uri,
          name: file.name || 'upload.jpg',
          type: file.mimeType || 'image/jpeg',
        });
      }
      const res = await fetch(`${API_BASE}/start`, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: formData,
      });
      if (!res.ok) throw new Error('Failed to start session');
      const data = await res.json();
      setSessionId(data.session_id);
      setQuestions(data.questions);
      setAnswers(data.present_fields || {});
      setChat(prev => [...prev, { role: 'user', message: schemeName || (file ? 'Uploaded a file/image.' : '') }, { role: 'assistant', message: data.questions.map(q => q.question).join('\n') }]);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  // Answer questions
  const submitAnswers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, answers }),
      });
      if (!res.ok) throw new Error('Failed to submit answers');
      const data = await res.json();
      setQuestions(data.questions);
      setAnswers(data.all_fields || {});
      setDocumentReady(data.document_ready);
      setDocumentUrl(data.document_url);
      setChat(prev => [
        ...prev,
        { role: 'user', message: Object.values(answers).join(', ') },
        { role: 'assistant', message: data.questions.length ? data.questions.map(q => q.question).join('\n') : (data.document_ready ? 'Your document is ready! You can download it below.' : '') }
      ]);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  // Reset session
  const resetSession = async () => {
    if (sessionId) {
      await fetch(`${API_BASE}/reset/${sessionId}`, { method: 'POST' });
    }
    setSessionId(null);
    setQuestions([]);
    setAnswers({});
    setFile(null);
    setSchemeName('');
    setDocumentUrl(null);
    setDocumentReady(false);
    setChat([
      { role: 'assistant', message: '🧑‍🌾 Namaste farmer 🙏, I’m here to help you make an official document required for any government scheme.\nPlease tell me the scheme name or upload a sample/photo of the document you saw.' }
    ]);
    setError(null);
  };

  // UI for chat bubbles
  const renderChat = () => (
    <ScrollView style={styles.chatArea} contentContainerStyle={{ paddingBottom: 20 }}>
      {chat.map((msg, idx) => (
        <View key={idx} style={[styles.chatBubble, msg.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
          <Text style={styles.chatText}>{msg.message}</Text>
        </View>
      ))}
    </ScrollView>
  );

  // UI for questions/answers
  const renderQuestions = () => (
    <View style={{ marginTop: 10 }}>
      {questions.map((q, idx) => (
        <View key={q.field} style={{ marginBottom: 12 }}>
          <Text style={styles.questionText}>{q.question}</Text>
          <TextInput
            style={styles.input}
            value={answers[q.field] || ''}
            onChangeText={text => setAnswers(a => ({ ...a, [q.field]: text }))}
            placeholder={q.field}
            placeholderTextColor="#aaa"
          />
        </View>
      ))}
      {questions.length > 0 && (
        <TouchableOpacity style={styles.submitBtn} onPress={submitAnswers} disabled={loading}>
          <Text style={styles.submitBtnText}>{loading ? 'Submitting...' : 'Submit Answers'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // UI for file/image upload
  const renderUpload = () => (
    <View style={styles.uploadRow}>
      <TouchableOpacity style={styles.uploadButton} onPress={pickFile}>
        <Feather name="file-text" size={28} color="#22c55e" />
        <Text style={styles.uploadLabel}>Upload Document</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
        <Feather name="image" size={28} color="#3b82f6" />
        <Text style={styles.uploadLabel}>Upload Image</Text>
      </TouchableOpacity>
    </View>
  );

  // UI for document download
  const renderDownload = () => (
    documentReady && documentUrl ? (
      <TouchableOpacity style={styles.downloadBtn} onPress={() => {
        // Open in browser or download
        Alert.alert('Download', 'Open document in browser?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open', onPress: () => { window.open(`${API_BASE}${documentUrl}`, '_blank'); } }
        ]);
      }}>
        <Feather name="download" size={24} color="#fff" />
        <Text style={styles.downloadBtnText}>Download Document</Text>
      </TouchableOpacity>
    ) : null
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Document Builder</Text>
        <TouchableOpacity onPress={resetSession} style={styles.resetBtn}>
          <Ionicons name="refresh" size={24} color="#facc15" />
        </TouchableOpacity>
      </View>
      {/* Chat Area */}
      {renderChat()}
      {/* Upload and Scheme Name Input (if not started) */}
      {!sessionId && (
        <View style={{ padding: 16 }}>
          <TextInput
            style={styles.input}
            value={schemeName}
            onChangeText={setSchemeName}
            placeholder="Enter scheme name (optional)"
            placeholderTextColor="#aaa"
          />
          {renderUpload()}
          <TouchableOpacity style={styles.submitBtn} onPress={startSession} disabled={loading}>
            <Text style={styles.submitBtnText}>{loading ? 'Starting...' : 'Start'}</Text>
          </TouchableOpacity>
        </View>
      )}
      {/* Questions/Answers (if session started) */}
      {sessionId && !documentReady && renderQuestions()}
      {/* Download (if ready) */}
      {renderDownload()}
      {/* Error */}
      {error && <Text style={styles.errorText}>{error}</Text>}
      {loading && <ActivityIndicator style={{ marginTop: 10 }} color="#22c55e" />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black', paddingTop: 34 },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181b', paddingHorizontal: 18, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#27272a', justifyContent: 'space-between' },
  headerText: { color: '#e5e7eb', fontWeight: '600', fontSize: 18 },
  resetBtn: { marginLeft: 10 },
  chatArea: { flex: 1, paddingHorizontal: 16, marginTop: 10 },
  chatBubble: { borderRadius: 12, padding: 12, marginBottom: 8, maxWidth: '85%' },
  userBubble: { backgroundColor: '#2563eb', alignSelf: 'flex-end' },
  assistantBubble: { backgroundColor: '#18181b', alignSelf: 'flex-start', borderWidth: 1, borderColor: '#27272a' },
  chatText: { color: '#fff', fontSize: 15, lineHeight: 22 },
  questionText: { color: '#facc15', fontSize: 15, marginBottom: 4 },
  input: { backgroundColor: '#232323', color: '#fff', borderRadius: 8, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: '#333' },
  submitBtn: { backgroundColor: '#22c55e', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  submitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  uploadRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginBottom: 12, marginTop: 10 },
  uploadButton: { backgroundColor: '#18181b', borderRadius: 16, paddingVertical: 18, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, width: 110 },
  uploadLabel: { color: '#d1d5db', fontSize: 13, marginTop: 8, textAlign: 'center', fontWeight: '500' },
  downloadBtn: { backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginTop: 18 },
  downloadBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16, marginLeft: 10 },
  errorText: { color: '#f87171', textAlign: 'center', marginTop: 10 },
  backButton: { padding: 6 },
});