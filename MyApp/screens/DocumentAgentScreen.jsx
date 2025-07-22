import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');

function VoiceWaveform({ isActive }) {
  const barCount = 24;
  const animatedValues = useRef(
    Array.from({ length: barCount }, () => new Animated.Value(0.5))
  ).current;

  React.useEffect(() => {
    let animations = [];
    if (isActive) {
      animations = animatedValues.map((val, i) =>
        Animated.loop(
          Animated.sequence([
            Animated.timing(val, {
              toValue: Math.random() * 1.5 + 0.5,
              duration: 120 + Math.random() * 80,
              useNativeDriver: true,
            }),
            Animated.timing(val, {
              toValue: 0.5,
              duration: 120 + Math.random() * 80,
              useNativeDriver: true,
            }),
          ])
        )
      );
      Animated.stagger(30, animations).start();
    } else {
      animatedValues.forEach((val) => val.setValue(0.5));
    }
    return () => {
      animatedValues.forEach((val) => val.stopAnimation());
    };
  }, [isActive]);

  return (
    <View style={styles.waveformContainer}>
      {animatedValues.map((val, i) => (
        <Animated.View
          key={i}
          style={[
            styles.waveBar,
            {
              transform: [
                { scaleY: val },
                { translateY: val.interpolate({ inputRange: [0, 2], outputRange: [0, -10] }) },
              ],
              backgroundColor: i % 2 === 0 ? '#22c55e' : '#bbf7d0',
            },
          ]}
        />
      ))}
    </View>
  );
}

const conversationFlow = [
  { agent: "Hello! I'm here to help you with any documentation needs. What can I assist you with today?", state: 'greeting' },
  { agent: "Perfect! I'll help you complete that form step by step. Do you have the form with you, or should I create a new one?", state: 'clarifying' },
  { agent: "Great. Let me start by getting your full name. Take your time.", state: 'collecting' },
  { agent: "Thank you. Now, what's your current address or village name?", state: 'collecting' },
  { agent: "Excellent. I'm now processing your information and preparing the document...", state: 'processing' }
];

export default function DocumentAgentScreen({ navigation }) {
  const { t } = useTranslation();
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [agentState, setAgentState] = useState('ready');
  const [conversationStage, setConversationStage] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [showAllDocs, setShowAllDocs] = useState(false);
  // Example doc data
  const docHistory = [
    { id: 1, title: 'Land Ownership Affidavit', time: 'Today, 10:24 AM' },
    { id: 2, title: 'Crop Insurance Form', time: 'Yesterday, 4:12 PM' },
    { id: 3, title: 'Fertilizer Purchase Receipt', time: '2 days ago, 11:03 AM' },
    { id: 4, title: 'Water Usage Log', time: '3 days ago, 9:45 AM' },
    { id: 5, title: 'Soil Test Report', time: 'Last week, 2:30 PM' },
  ];

  const handleMic = () => {
    if (isListening) {
      setIsListening(false);
      setAgentState('ready');
      return;
    }
    setIsListening(true);
    setAgentState('listening');
    setTimeout(() => {
      setIsListening(false);
      setAgentState('processing');
      setTimeout(() => {
        setIsSpeaking(true);
        setAgentState('speaking');
        setTimeout(() => {
          setIsSpeaking(false);
          if (conversationStage < conversationFlow.length - 1) {
            setConversationStage(prev => prev + 1);
          }
          setAgentState('ready');
        }, 2000);
      }, 1000);
    }, 2500);
  };

  const currentAgentMessage = conversationFlow[conversationStage]?.agent || '';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerRightRow}>
          <View style={styles.headerStatus}>
            <View style={styles.statusDot} />
            <Text style={styles.headerText}>Agent Connected</Text>
          </View>
          <View style={styles.headerLive}>
            <Text style={styles.liveText}>LIVE</Text>
            <View style={styles.liveDot} />
          </View>
          {/* Info Icon */}
          <TouchableOpacity onPress={() => setShowInfo(true)} style={styles.infoIconBtn}>
            <Ionicons name="information-circle-outline" size={36} color="#facc15" />
          </TouchableOpacity>
        </View>
      </View>
      {/* History icon below Agent Connected */}
      <TouchableOpacity onPress={() => setShowDocs(true)} style={styles.historyIconBtn}>
        <Ionicons name="time-outline" size={28} color="#2563eb" />
      </TouchableOpacity>
      {/* History Card */}
      {showDocs && (
        <View style={styles.docsCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name="time-outline" size={20} color="#2563eb" style={{ marginRight: 6 }} />
            <Text style={styles.docsCardTitle}>History</Text>
            <TouchableOpacity onPress={() => { setShowDocs(false); setShowAllDocs(false); }} style={{ marginLeft: 'auto' }}>
              <Ionicons name="close-circle" size={20} color="#f87171" />
            </TouchableOpacity>
          </View>
          <View style={styles.docsHistoryList}>
            {(showAllDocs ? docHistory : docHistory.slice(0,3)).map((doc) => (
              <TouchableOpacity key={doc.id} style={styles.docHistoryRow}>
                <Ionicons name="document" size={22} color="#2563eb" style={{marginRight: 10}} />
                <View style={{flex:1}}>
                  <Text style={styles.docHistoryTitle}>{doc.title}</Text>
                  <Text style={styles.docHistoryTime}>{doc.time}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
          {!showAllDocs && (
            <TouchableOpacity style={styles.showAllBtn} onPress={() => setShowAllDocs(true)}>
              <Text style={styles.showAllBtnText}>Show All</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      {/* Info Card */}
      {showInfo && (
        <View style={styles.infoCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <Ionicons name="information-circle" size={22} color="#2563eb" style={{ marginRight: 6 }} />
            <Text style={styles.infoCardTitle}>{t('documentagent.title')}</Text>
            <TouchableOpacity onPress={() => setShowInfo(false)} style={{ marginLeft: 'auto' }}>
              <Ionicons name="close-circle" size={22} color="#f87171" />
            </TouchableOpacity>
          </View>
          <View style={{marginTop: 2}}>
            <Text style={styles.infoCardText}>{'• Tap the mic to start speaking your document request.'}</Text>
            <Text style={styles.infoCardText}>{'• The agent will guide you step by step.'}</Text>
            <Text style={styles.infoCardText}>{'• Upload files or images if needed.'}</Text>
            <Text style={styles.infoCardText}>{'• Follow the prompts to complete your document.'}</Text>
          </View>
        </View>
      )}
      {/* Main Voice Circle */}
      <View style={styles.centerArea}>
        {/* Move VoiceWaveform outside the circle */}
        <VoiceWaveform isActive={isListening || isSpeaking} />
        <View style={[styles.bigVoiceCircle, isListening ? { borderColor: '#22c55e' } : isSpeaking ? { borderColor: '#3b82f6' } : agentState === 'processing' ? { borderColor: '#facc15' } : { borderColor: '#6b7280' }]}> 
          <View style={styles.avatarCircleBig}>
            <Feather name="user" size={64} color={isListening ? '#22c55e' : isSpeaking ? '#3b82f6' : agentState === 'processing' ? '#facc15' : '#d1d5db'} />
          </View>
          {/* Remove VoiceWaveform from here */}
          <TouchableOpacity
            style={[styles.micButtonBig, isListening && { backgroundColor: '#22c55e' }]}
            onPress={handleMic}
            activeOpacity={0.8}
          >
            <Ionicons name={isListening ? 'mic-off' : 'mic'} size={38} color={isListening ? 'white' : 'black'} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.statusText, isListening ? { color: '#22c55e' } : isSpeaking ? { color: '#3b82f6' } : agentState === 'processing' ? { color: '#facc15' } : { color: '#d1d5db' }]}> 
          {isListening ? 'Listening...' : isSpeaking ? 'Speaking...' : agentState === 'processing' ? 'Processing...' : 'Ready to Help'}
        </Text>
        {currentAgentMessage && !isListening && (
          <View style={styles.agentMessageBox}>
            <Text style={styles.agentMessageText}>{currentAgentMessage}</Text>
          </View>
        )}
      </View>
      {/* Upload Options */}
      <View style={styles.uploadRow}>
        <TouchableOpacity style={styles.uploadButton}>
          <Feather name="file-text" size={28} color="#22c55e" />
          <Text style={styles.uploadLabel}>Upload Document</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.uploadButton}>
          <Feather name="image" size={28} color="#3b82f6" />
          <Text style={styles.uploadLabel}>Upload Image</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.uploadButton}>
          <Feather name="camera" size={28} color="#facc15" />
          <Text style={styles.uploadLabel}>Camera</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    paddingTop: 34,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#18181b',
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  headerStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    // marginLeft: 10, // shift right to avoid overlap with back arrow
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  headerText: {
    color: '#e5e7eb',
    fontWeight: '600',
    fontSize: 18,
    marginRight: 100,
  },
  headerLive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  liveText: {
    color: '#f87171',
    fontWeight: 'bold',
    fontSize: 12,
    marginRight: 4,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f87171',
  },
  centerArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigVoiceCircle: {
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: width * 0.35,
    borderWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#18181b',
    marginBottom: 18,
    position: 'relative',
  },
  avatarCircleBig: {
    width: width * 0.32,
    height: width * 0.32,
    borderRadius: width * 0.16,
    backgroundColor: '#232323',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  micButtonBig: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    backgroundColor: 'white',
    borderRadius: 32,
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    textAlign: 'center',
  },
  agentMessageBox: {
    backgroundColor: '#18181b',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#27272a',
    marginTop: 6,
    maxWidth: width * 0.85,
    alignSelf: 'center',
  },
  agentMessageText: {
    color: '#d1d5db',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    width: width * 0.5,
    height: 36,
    marginTop: 8,
    marginBottom: 2,
    alignSelf: 'center',
  },
  waveBar: {
    width: 7,
    height: 28,
    borderRadius: 3,
    marginHorizontal: 1,
    backgroundColor: '#22c55e',
  },
  uploadRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 10,
    paddingHorizontal: 10,
  },
  uploadButton: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    width: width * 0.26,
  },
  uploadLabel: {
    color: '#d1d5db',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  infoIconBtn: {
    position: 'absolute',
    right: 26,
    top: 72,
    padding: 4,
    zIndex: 10,
  },
  infoCard: {
    position: 'absolute',
    top: 120,
    alignSelf: 'center',
    width: '70%',
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: '#2563eb',
    shadowColor: '#2563eb',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 20,
  },
  infoCardTitle: {
    color: '#2563eb',
    fontWeight: 'bold',
    fontSize: 17,
    marginRight: 8,
    letterSpacing: 0.2,
  },
  infoCardText: {
    color: '#22223b',
    fontSize: 15,
    marginTop: 4,
    lineHeight: 22,
    paddingLeft: 4,
  },
  historyIconBtn: {
    position: 'absolute',
    left: 18,
    top: 122,
    backgroundColor: '#e0e7ff',
    borderRadius: 16,
    padding: 7,
    elevation: 2,
    shadowColor: '#2563eb',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    zIndex: 12,
  },
  docsCard: {
    position: 'absolute',
    left: 18,
    top: 150,
    width: 240,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 2,
    borderColor: '#2563eb',
    shadowColor: '#2563eb',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 30,
  },
  docsCardTitle: {
    color: '#2563eb',
    fontWeight: 'bold',
    fontSize: 15,
    marginRight: 8,
    letterSpacing: 0.2,
  },
  docsHistoryList: {
    marginTop: 2,
  },
  docHistoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
    marginBottom: 2,
    backgroundColor: '#f1f5fd',
    marginTop: 2,
  },
  docHistoryTitle: {
    color: '#22223b',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  docHistoryTime: {
    color: '#64748b',
    fontSize: 12,
  },
  showAllBtn: {
    marginTop: 8,
    alignSelf: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 18,
  },
  showAllBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  backButton: {
    position: 'absolute',
    left: 8,
    top: 8,
    padding: 6,
    zIndex: 20,
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
});