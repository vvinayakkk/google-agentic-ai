import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  FlatList,
  Modal,
  TextInput,
  Alert,
  Easing,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Markdown from 'react-native-markdown-display';
import { PanResponder } from 'react-native';

const { width, height } = Dimensions.get('window');

const API_BASE = 'http://10.123.4.245:8000';
const FARMER_ID = 'f001';
const CALENDAR_CACHE_KEY = 'calendar-events-cache';
const CALENDAR_ANALYSIS_CACHE_KEY = 'calendar-ai-analysis-f001';

const SmartCalendar = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  // REMOVED: fullSummaryLines, summaryLines, currentLine, loading, showCursor states
  // as these were tied to the hardcoded typewriter effect.

  const [mounted, setMounted] = useState(false);
  // Add expandedEventIndex state
  const [expandedEventIndex, setExpandedEventIndex] = useState(null);

  const [calendarEvents, setCalendarEvents] = useState([]);
  const [events, setEvents] = useState({});
  const [dataLoading, setDataLoading] = useState(true); // For calendar events
  const [dataError, setDataError] = useState(null);
  const [calendarAnalysis, setCalendarAnalysis] = useState(''); // This is the AI analysis from backend
  const [analysisLoading, setAnalysisLoading] = useState(false); // For AI analysis loading
  const [showFullAnalysis, setShowFullAnalysis] = useState(false);
  // Remove pan, panResponder, analysisBoxPosition, and related useRef/useState
  // Remove Animated.View with absolute positioning for AI Calendar Analysis

  // Animated values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // REMOVED: const fullSummary - no longer needed.

  // Floating particles component
  const FloatingParticle = ({ delay, duration }) => {
    const particleAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      const animate = () => {
        Animated.sequence([
          Animated.timing(particleAnim, {
            toValue: 1,
            duration: duration,
            useNativeDriver: true,
          }),
          Animated.timing(particleAnim, {
            toValue: 0,
            duration: duration,
            useNativeDriver: true,
          })
        ]).start(() => animate());
      };

      setTimeout(() => animate(), delay);
    }, []);

    const translateY = particleAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -30]
    });

    const opacity = particleAnim.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.2, 0.8, 0.2]
    });

    return (
      <Animated.View
        style={[
          styles.floatingParticle,
          {
            transform: [{ translateY }],
            opacity,
            left: Math.random() * (width - 20),
            top: Math.random() * (height - 300) + 150,
          }
        ]}
      >
        <View style={styles.particle} />
      </Animated.View>
    );
  };

  useEffect(() => {
    setMounted(true);

    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      })
    ]).start();

    // Pulse animation
    const pulsing = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ]).start(() => pulsing());
    };
    pulsing();

    fetchCalendarEvents();
    loadCalendarAnalysis(); // Load analysis for the movable section

    // REMOVED: The entire typewriter effect logic from this useEffect
    // as it was tied to the hardcoded summary.
  }, []); // Dependencies remain for initial loads and animations.

  // REMOVED: Blinking cursor effect useEffect as it's no longer needed for the hardcoded summary.

  // Load calendar events from cache, then fetch from backend
  const fetchCalendarEvents = async () => {
    setDataLoading(true);
    setDataError(null);
    // Try to load from cache first
    try {
      const cached = await AsyncStorage.getItem(CALENDAR_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        setCalendarEvents(parsed);
        // Transform array to date-keyed object
        const eventsByDate = {};
        parsed.forEach(ev => {
          if (!eventsByDate[ev.date]) eventsByDate[ev.date] = [];
          eventsByDate[ev.date].push(ev);
        });
        setEvents(eventsByDate);
        setDataLoading(false); // Show cached data immediately
      }
    } catch (e) { }
    // Always fetch from backend in background
    fetch(`${API_BASE}/farmer/${FARMER_ID}/calendar`)
      .then(res => res.json())
      .then(data => {
        setCalendarEvents(data);
        // Transform array to date-keyed object
        const eventsByDate = {};
        data.forEach(ev => {
          if (!eventsByDate[ev.date]) eventsByDate[ev.date] = [];
          eventsByDate[ev.date].push(ev);
        });
        setEvents(eventsByDate);
        AsyncStorage.setItem(CALENDAR_CACHE_KEY, JSON.stringify(data));
        setDataLoading(false);
      })
      .catch(err => {
        setDataError('Failed to load calendar events');
        setDataLoading(false);
      });
  };

  // Fetch or load cached AI analysis
  const loadCalendarAnalysis = async () => {
    setAnalysisLoading(true);
    try {
      const cached = await AsyncStorage.getItem(CALENDAR_ANALYSIS_CACHE_KEY);
      if (cached) {
        setCalendarAnalysis(cached);
        setAnalysisLoading(false);
        return;
      }
      // If not cached, fetch from backend
      const res = await fetch(`${API_BASE}/farmer/${FARMER_ID}/calendar/ai-analysis`);
      const data = await res.json();
      setCalendarAnalysis(data.analysis);
      await AsyncStorage.setItem(CALENDAR_ANALYSIS_CACHE_KEY, data.analysis);
      setAnalysisLoading(false);
    } catch (e) {
      setCalendarAnalysis('Failed to load AI analysis.');
      setAnalysisLoading(false);
    }
  };

  const updateCalendarAnalysis = async () => {
    setAnalysisLoading(true);
    try {
      const res = await fetch(`${API_BASE}/farmer/${FARMER_ID}/calendar/ai-analysis`);
      const data = await res.json();
      setCalendarAnalysis(data.analysis);
      await AsyncStorage.setItem(CALENDAR_ANALYSIS_CACHE_KEY, data.analysis);
      setAnalysisLoading(false);
    } catch (e) {
      setCalendarAnalysis('Failed to update AI analysis.');
      setAnalysisLoading(false);
    }
  };

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDateKey = (date) => {
    return date.toISOString().split('T')[0];
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const hasEvents = (date) => {
    return events[formatDateKey(date)]?.length > 0;
  };

  const getEventIcon = (type) => {
    switch (type) {
      case 'irrigation': return 'water-outline';
      case 'planting': return 'leaf-outline';
      case 'livestock': return 'paw-outline';
      case 'analysis': return 'analytics-outline';
      case 'treatment': return 'flash-outline';
      case 'market': return 'trending-up-outline';
      case 'monitoring': return 'eye-outline';
      default: return 'calendar-outline';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return ['#ef4444', '#dc2626'];
      case 'medium': return ['#f59e0b', '#d97706'];
      case 'low': return ['#10b981', '#059669'];
      default: return ['#3b82f6', '#2563eb'];
    }
  };

  const changeMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  // --- FIXED renderCalendar for correct weekday alignment ---
  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate); // 0=Sun, 6=Sat
    const days = [];
    let week = [];

    // Fill initial empty cells for the first week
    for (let i = 0; i < firstDay; i++) {
      week.push(<View key={`empty-${i}`} style={styles.emptyDay} />);
    }

    // Fill days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dateKey = formatDateKey(date);
      const dayEvents = events[dateKey] || [];
      const isSelectedDate = selectedDate.toDateString() === date.toDateString();
      const isTodayDate = isToday(date);

      week.push(
        <TouchableOpacity
          key={day}
          style={[
            styles.dayCell,
            isTodayDate && styles.todayCell,
            isSelectedDate && styles.selectedCell,
          ]}
          onPress={() => setSelectedDate(date)}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={
              isTodayDate
                ? ['rgba(16, 185, 129, 0.2)', 'rgba(59, 130, 246, 0.2)']
                : isSelectedDate
                  ? ['rgba(16, 185, 129, 0.1)', 'rgba(59, 130, 246, 0.1)']
                  : ['rgba(24, 24, 27, 0.5)', 'rgba(39, 39, 42, 0.5)']
            }
            style={styles.dayCellGradient}
          >
            <Text style={[
              styles.dayNumber,
              isTodayDate && styles.todayNumber,
              isSelectedDate && styles.selectedNumber,
            ]}>
              {day}
            </Text>
            {dayEvents.length > 0 && (
              <View style={styles.eventsContainer}>
                {dayEvents.slice(0, 2).map((event, idx) => (
                  <LinearGradient
                    key={idx}
                    colors={getPriorityColor(event.priority)}
                    style={styles.eventDot}
                  />
                ))}
                {dayEvents.length > 2 && (
                  <View style={styles.moreEvents}>
                    <Text style={styles.moreEventsText}>+</Text>
                  </View>
                )}
              </View>
            )}
            {hasEvents(date) && (
              <Animated.View style={[styles.eventIndicator, { transform: [{ scale: pulseAnim }] }]}>
                <View style={styles.pulseDot} />
              </Animated.View>
            )}
          </LinearGradient>
        </TouchableOpacity>
      );

      // If week is complete, push to days and start new week
      if ((week.length === 7) || (day === daysInMonth)) {
        // Fill trailing empty cells if last week is not complete
        if (day === daysInMonth && week.length < 7) {
          for (let j = week.length; j < 7; j++) {
            week.push(<View key={`empty-end-${day}-${j}`} style={styles.emptyDay} />);
          }
        }
        days.push(
          <View key={`week-${day}`} style={{ flexDirection: 'row' }}>
            {week}
          </View>
        );
        week = [];
      }
    }
    return days;
  };

  const selectedDateEvents = events[formatDateKey(selectedDate)] || [];

  // Update renderEventItem to support expand/collapse
  const renderEventItem = ({ item, index }) => {
    const isExpanded = expandedEventIndex === index;
    return (
      <View key={index}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setExpandedEventIndex(isExpanded ? null : index)}
          style={{ marginBottom: 12 }}
        >
          <Animated.View
            style={[
              styles.eventItem,
              {
                opacity: fadeAnim,
                transform: [{ translateX: slideAnim }]
              }
            ]}
          >
            <LinearGradient
              colors={['rgba(24, 24, 27, 0.8)', 'rgba(39, 39, 42, 0.8)']}
              style={styles.eventItemGradient}
            >
              <View style={styles.eventItemHeader}>
                <LinearGradient
                  colors={getPriorityColor(item.priority)}
                  style={styles.eventIconContainer}
                >
                  <Ionicons name={getEventIcon(item.type)} size={16} color="white" />
                </LinearGradient>
                <View style={styles.eventItemContent}>
                  <Text style={styles.eventTitle} numberOfLines={2}>{item.task}</Text>
                  <Text style={styles.eventTime}>{item.time}</Text>
                </View>
                <LinearGradient
                  colors={getPriorityColor(item.priority)}
                  style={styles.priorityBadge}
                >
                  <Text style={styles.priorityText}>{item.priority.toUpperCase()}</Text>
                </LinearGradient>
              </View>
              {isExpanded && (
                <View style={styles.eventDetailsContainer}>
                  <Text style={styles.eventDetailsText}>{item.details}</Text>
                </View>
              )}
            </LinearGradient>
          </Animated.View>
        </TouchableOpacity>
      </View>
    );
  };

  // Add state for event modals and mic
  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [eventModalMode, setEventModalMode] = useState('add');
  const [eventModalEvent, setEventModalEvent] = useState({ date: '', time: '', task: '', type: '', priority: 'medium', details: '' });
  const [eventModalLoading, setEventModalLoading] = useState(false);
  const [eventAddOptionSheet, setEventAddOptionSheet] = useState(false);
  const [eventMicModal, setEventMicModal] = useState(false);
  const eventMicAnim = useRef(new Animated.Value(1)).current;

  // Mic animation effect
  useEffect(() => {
    let timer;
    if (eventMicModal) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(eventMicAnim, { toValue: 1.2, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(eventMicAnim, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ).start();
      timer = setTimeout(() => {
        setEventMicModal(false);
        setEventModalMode('add');
        setEventModalEvent({ date: formatDateKey(selectedDate), time: '09:00', task: 'Irrigation for Wheat', type: 'irrigation', priority: 'high', details: 'Irrigate field A for wheat.' });
        setEventModalVisible(true);
      }, 5000);
    } else {
      eventMicAnim.setValue(1);
    }
    return () => clearTimeout(timer);
  }, [eventMicModal]);

  // Add event handlers
  const openAddEventModal = () => setEventAddOptionSheet(true);
  const handleManualAddEvent = () => {
    setEventAddOptionSheet(false);
    setEventModalMode('add');
    setEventModalEvent({ date: formatDateKey(selectedDate), time: '', task: '', type: '', priority: 'medium', details: '' });
    setEventModalVisible(true);
  };
  const handleSpeakAddEvent = () => {
    setEventAddOptionSheet(false);
    setEventMicModal(true);
  };
  const openEditEventModal = (event) => {
    setEventModalMode('edit');
    setEventModalEvent({ ...event });
    setEventModalVisible(true);
  };
  const handleDeleteEvent = (event) => {
    Alert.alert('Delete Event', `Are you sure you want to delete "${event.task}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          setEventModalLoading(true);
          // Optimistically update UI
          const newEvents = calendarEvents.filter(e => e.eventId !== event.eventId);
          setCalendarEvents(newEvents);
          // Update cache
          await AsyncStorage.setItem(CALENDAR_CACHE_KEY, JSON.stringify(newEvents));
          setEventModalLoading(false);
          // Sync with backend
          fetch(`${API_BASE}/farmer/${FARMER_ID}/calendar/${event.eventId}`, { method: 'DELETE' })
            .catch(() => { Alert.alert('Error', 'Failed to delete event on server.'); });
        }
      }
    ]);
  };
  const handleEventModalSave = async () => {
    if (!eventModalEvent.task || !eventModalEvent.time || !eventModalEvent.type) {
      Alert.alert('Missing Info', 'Please fill all required fields.');
      return;
    }
    setEventModalLoading(true);
    const method = eventModalMode === 'add' ? 'POST' : 'PUT';
    const url = eventModalMode === 'add'
      ? `${API_BASE}/farmer/${FARMER_ID}/calendar`
      : `${API_BASE}/farmer/${FARMER_ID}/calendar/${eventModalEvent.eventId}`;
    const newEvent = {
      ...eventModalEvent,
      eventId: eventModalEvent.eventId || `ev${Date.now()}`,
      date: eventModalEvent.date || formatDateKey(selectedDate),
    };
    // Optimistically update UI
    let newEvents;
    if (eventModalMode === 'add') {
      newEvents = [newEvent, ...calendarEvents];
    } else {
      newEvents = calendarEvents.map(e => e.eventId === newEvent.eventId ? newEvent : e);
    }
    setCalendarEvents(newEvents);
    await AsyncStorage.setItem(CALENDAR_CACHE_KEY, JSON.stringify(newEvents));
    setEventModalLoading(false);
    setEventModalVisible(false);
    // Sync with backend
    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEvent)
    })
      .catch(() => { Alert.alert('Error', 'Failed to save event on server.'); });
  };

  if (!mounted) return null;

  const modalInputStyle = {
    backgroundColor: '#23232a',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 12,
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Background */}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'black' }]} />

      {/* Background Gradients */}
      <LinearGradient
        colors={['rgba(16, 185, 129, 0.05)', 'transparent', 'rgba(59, 130, 246, 0.05)']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Floating Particles */}
      {mounted && (
        <>
          <FloatingParticle delay={0} duration={3000} />
          <FloatingParticle delay={1000} duration={2500} />
          <FloatingParticle delay={2000} duration={3500} />
          <FloatingParticle delay={3000} duration={2800} />
          <FloatingParticle delay={4000} duration={3200} />
        </>
      )}

      <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <BlurView intensity={20} tint="dark" style={styles.headerBlur}>
            <View style={styles.headerContent}>
              <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                  style={styles.backButtonGradient}
                >
                  <Ionicons name="chevron-back" size={24} color="white" />
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.headerCenter}>
                <View style={styles.headerTitleContainer}>
                  <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                    <Ionicons name="calendar" size={20} color="#10b981" />
                  </Animated.View>
                  <Text style={styles.headerTitle}>Smart Calendar</Text>
                </View>
                <Text style={styles.headerSubtitle}>Weather-synced farming</Text>
              </View>

              <View style={styles.syncIndicator}>
                <Animated.View style={[styles.syncDot, { transform: [{ scale: pulseAnim }] }]} />
                <Text style={styles.syncText}>LIVE</Text>
              </View>
            </View>
          </BlurView>
        </Animated.View>

        {/* AI Calendar Analysis Section (static, above calendar) */}
        <View style={{
          backgroundColor: '#18181b',
          borderRadius: 16,
          padding: 16,
          marginHorizontal: 16,
          marginTop: 4,
          marginBottom: 0,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.1)',
          elevation: 10,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <MaterialCommunityIcons name="robot-excited" size={22} color="#10b981" style={{ marginRight: 8 }} />
            <Text style={{ color: '#10b981', fontWeight: 'bold', fontSize: 17 }}>AI Calendar Analysis</Text>
            <TouchableOpacity onPress={updateCalendarAnalysis} style={{ marginLeft: 12, backgroundColor: '#3B82F6', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Update</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 250 }}>
            {analysisLoading ? (
              <Text style={{ color: '#fff' }}>Loading analysis...</Text>
            ) : (
              (() => {
                const lines = calendarAnalysis.split(/\n|\r/).filter(l => l.trim() !== '');
                const previewLines = lines.slice(0, 4); // Still show preview lines if desired
                const isLong = lines.length > 4;
                return (
                  <>
                    <Markdown style={{ body: { color: '#fff', fontSize: 15} }}>
                      {showFullAnalysis ? calendarAnalysis : previewLines.join('\n')}
                    </Markdown>
                    {isLong && (
                      <TouchableOpacity onPress={() => setShowFullAnalysis(v => !v)} style={{ marginTop: 8, alignSelf: 'flex-start' }}>
                        <Text style={{ color: '#3B82F6', fontWeight: 'bold' }}>{showFullAnalysis ? 'Show Less' : 'Show More'}</Text>
                      </TouchableOpacity>
                    )}
                  </>
                );
              })()
            )}
          </ScrollView>
        </View>

        {/* Main content: loading, error, or calendar UI */}
        {dataLoading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: '#fff' }}>Loading...</Text></View>
        ) : dataError ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: 'red' }}>{dataError}</Text></View>
        ) : (
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.calendarNav}>
              <TouchableOpacity
                style={styles.navButton}
                onPress={() => changeMonth(-1)}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                  style={styles.navButtonGradient}
                >
                  <Ionicons name="chevron-back" size={20} color="#10b981" />
                </LinearGradient>
              </TouchableOpacity>
              <Text style={styles.monthYear}>
                {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </Text>
              <TouchableOpacity
                style={styles.navButton}
                onPress={() => changeMonth(1)}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                  style={styles.navButtonGradient}
                >
                  <Ionicons name="chevron-forward" size={20} color="#10b981" />
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Calendar */}
            <Animated.View style={[styles.calendarContainer, { opacity: fadeAnim }]}>
              <LinearGradient
                colors={['rgba(24, 24, 27, 0.9)', 'rgba(39, 39, 42, 0.9)']}
                style={styles.calendarCard}
              >
                {/* Days of week */}
                <View style={styles.weekDaysHeader}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <Text key={day} style={styles.weekDayText}>{day}</Text>
                  ))}
                </View>

                {/* Calendar Grid */}
                <View style={styles.calendarGrid}>
                  {renderCalendar()}
                </View>
              </LinearGradient>
            </Animated.View>

            {/* Selected Date Events */}
            <View style={styles.eventsSection}>
              <View style={styles.eventsSectionHeader}>
                <LinearGradient
                  colors={['#3b82f6', '#10b981']}
                  style={styles.eventsIcon}
                >
                  <Ionicons name="time-outline" size={18} color="white" />
                </LinearGradient>
                <Text style={styles.eventsSectionTitle}>
                  {selectedDate.toLocaleDateString('default', {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric'
                  })}
                </Text>
                <Text style={styles.eventsCount}>
                  {selectedDateEvents.length} task{selectedDateEvents.length !== 1 ? 's' : ''}
                </Text>
              </View>

              {selectedDateEvents.length > 0 ? (
                <View style={styles.eventsList}>
                  {selectedDateEvents.map((item, index) => (
                    <View key={index}>
                      {renderEventItem({ item, index })}
                      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 }}>
                        <TouchableOpacity onPress={() => openEditEventModal(item)} style={{ backgroundColor: '#3B82F6', borderRadius: 8, padding: 8, marginRight: 8 }}>
                          <Ionicons name="create-outline" size={18} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteEvent(item)} style={{ backgroundColor: '#EF4444', borderRadius: 8, padding: 8 }}>
                          <Ionicons name="trash-outline" size={18} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <Animated.View style={[styles.noEventsContainer, { opacity: fadeAnim }]}>
                  <LinearGradient
                    colors={['rgba(24, 24, 27, 0.5)', 'rgba(39, 39, 42, 0.5)']}
                    style={styles.noEventsCard}
                  >
                    <Ionicons name="calendar-outline" size={48} color="rgba(255,255,255,0.3)" />
                    <Text style={styles.noEventsText}>No tasks scheduled</Text>
                  </LinearGradient>
                </Animated.View>
              )}
            </View>

            {/* Weather Panel */}
            <Animated.View style={[styles.weatherPanel, { opacity: fadeAnim }]}>
              <LinearGradient
                colors={['rgba(59, 130, 246, 0.1)', 'rgba(16, 185, 129, 0.1)']}
                style={styles.weatherCard}
              >
                <View style={styles.weatherHeader}>
                  <LinearGradient
                    colors={['#3b82f6', '#10b981']}
                    style={styles.weatherIcon}
                  >
                    <Ionicons name="sunny-outline" size={16} color="white" />
                  </LinearGradient>
                  <Text style={styles.weatherTitle}>Weather Sync</Text>
                </View>

                <View style={styles.weatherStats}>
                  <View style={styles.weatherStat}>
                    <Ionicons name="thermometer-outline" size={16} color="#10b981" />
                    <Text style={styles.weatherLabel}>Temperature</Text>
                    <Text style={styles.weatherValue}>28°C</Text>
                  </View>
                  <View style={styles.weatherStat}>
                    <Ionicons name="water-outline" size={16} color="#3b82f6" />
                    <Text style={styles.weatherLabel}>Humidity</Text>
                    <Text style={styles.weatherValue}>65%</Text>
                  </View>
                  <View style={styles.weatherStat}>
                    <Ionicons name="rainy-outline" size={16} color="#f59e0b" />
                    <Text style={styles.weatherLabel}>Rain</Text>
                    <Text style={styles.weatherValue}>Tomorrow</Text>
                  </View>
                </View>
              </LinearGradient>
            </Animated.View>

            {/* Add Event Option Sheet */}
            <Modal visible={eventAddOptionSheet} transparent animationType="fade">
              <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}>
                <View style={{ backgroundColor: '#23232a', borderRadius: 16, padding: 24, width: 300 }}>
                  <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>Add Event</Text>
                  <TouchableOpacity style={{ backgroundColor: '#10B981', borderRadius: 8, padding: 14, alignItems: 'center', marginBottom: 12 }} onPress={handleManualAddEvent}>
                    <Ionicons name="create-outline" size={22} color="#fff" style={{ marginBottom: 4 }} />
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Type Manually</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{ backgroundColor: '#3B82F6', borderRadius: 8, padding: 14, alignItems: 'center' }} onPress={handleSpeakAddEvent}>
                    <Ionicons name="mic-outline" size={22} color="#fff" style={{ marginBottom: 4 }} />
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Speak (AI Extract)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{ marginTop: 18, alignItems: 'center' }} onPress={() => setEventAddOptionSheet(false)}>
                    <Text style={{ color: '#64748B' }}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>

            {/* Mic Modal for Event */}
            <Modal visible={eventMicModal} transparent animationType="fade">
              <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' }}>
                <Animated.View style={{
                  width: 120, height: 120, borderRadius: 60, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center',
                  transform: [{ scale: eventMicAnim }], marginBottom: 32
                }}>
                  <Ionicons name="mic" size={56} color="#fff" />
                </Animated.View>
                <Text style={{ color: '#fff', fontSize: 18, marginBottom: 24 }}>Listening...</Text>
                <TouchableOpacity onPress={() => setEventMicModal(false)} style={{ backgroundColor: '#23232a', borderRadius: 8, padding: 14, alignItems: 'center', width: 120 }}>
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </Modal>

            {/* Event Add/Edit Modal */}
            <Modal visible={eventModalVisible} animationType="slide" transparent>
              <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                <View style={{ backgroundColor: '#18181b', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400, maxHeight: '90%' }}>
                  <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>{eventModalMode === 'add' ? 'Add New Event' : 'Edit Event'}</Text>
                  <ScrollView style={{ maxHeight: 400 }}>
                    <TextInput style={modalInputStyle} placeholder="Task" placeholderTextColor="#64748B" value={eventModalEvent.task} onChangeText={v => setEventModalEvent({ ...eventModalEvent, task: v })} />
                    <TextInput style={modalInputStyle} placeholder="Time (e.g. 09:00)" placeholderTextColor="#64748B" value={eventModalEvent.time} onChangeText={v => setEventModalEvent({ ...eventModalEvent, time: v })} />
                    <TextInput style={modalInputStyle} placeholder="Type (e.g. irrigation, planting)" placeholderTextColor="#64748B" value={eventModalEvent.type} onChangeText={v => setEventModalEvent({ ...eventModalEvent, type: v })} />
                    <TextInput style={modalInputStyle} placeholder="Priority (high, medium, low)" placeholderTextColor="#64748B" value={eventModalEvent.priority} onChangeText={v => setEventModalEvent({ ...eventModalEvent, priority: v })} />
                    <TextInput style={modalInputStyle} placeholder="Details" placeholderTextColor="#64748B" value={eventModalEvent.details} onChangeText={v => setEventModalEvent({ ...eventModalEvent, details: v })} multiline />
                  </ScrollView>
                  <View style={{ flexDirection: 'row', marginTop: 24 }}>
                    <TouchableOpacity style={{ flex: 1, alignItems: 'center', padding: 12, backgroundColor: '#27272a', borderRadius: 8, marginRight: 8 }} onPress={() => setEventModalVisible(false)}>
                      <Text style={{ color: '#64748B' }}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={{ flex: 1, alignItems: 'center', padding: 12, backgroundColor: '#10B981', borderRadius: 8, marginLeft: 8 }} onPress={handleEventModalSave} disabled={eventModalLoading}>
                      <Text style={{ color: '#fff' }}>{eventModalLoading ? 'Saving...' : 'Save'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
          </ScrollView>
        )}
        <View style={{ position: 'absolute', bottom: 32, right: 32, zIndex: 100 }}>
          <TouchableOpacity onPress={openAddEventModal} style={{ backgroundColor: '#10B981', borderRadius: 32, width: 64, height: 64, alignItems: 'center', justifyContent: 'center', shadowColor: '#10B981', shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 }}>
            <Ionicons name="add" size={36} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  safeArea: {
    flex: 1,
  },
  floatingParticle: {
    position: 'absolute',
    zIndex: 1,
  },
  particle: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#10b981',
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerBlur: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  backButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: 'white',
    fontSize: 25,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    marginTop: 2,
  },
  syncIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: 12,
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  syncText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '600',
  },
  // REMOVED: Styles related to summaryContainer, summaryCard, summaryHeader,
  // summaryIcon, summaryTitle, typingIndicator, summaryText, cursor
  // as the hardcoded AI Farm Assistant is removed.
  scrollView: {
    flex: 1,
  },
  calendarNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  navButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthYear: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
  },
  calendarContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  calendarCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  weekDaysHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  weekDayText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    width: (width - 64) / 7,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  emptyDay: {
    width: (width - 64) / 7,
    height: 50,
  },
  dayCell: {
    width: (width - 64) / 7,
    height: 50,
    padding: 2,
  },
  dayCellGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    position: 'relative',
  },
  todayCell: {},
  selectedCell: {},
  dayNumber: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  todayNumber: {
    color: '#10b981',
    fontWeight: '900',
  },
  selectedNumber: {
    color: '#10b981',
    fontWeight: '700',
  },
  eventsContainer: {
    position: 'absolute',
    bottom: 2,
    flexDirection: 'row',
    gap: 2,
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  moreEvents: {
    width: 8,
    height: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreEventsText: {
    color: '#10b981',
    fontSize: 6,
    fontWeight: '600',
  },
  eventIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  eventsSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  eventsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  eventsIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  eventsSectionTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  eventsCount: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  eventsList: {
    maxHeight: 300,
  },
  eventItem: {
    marginBottom: 12,
  },
  eventItemGradient: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  eventItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  eventItemContent: {
    flex: 1,
  },
  eventTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  eventTime: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    color: 'white',
    fontSize: 8,
    fontWeight: '700',
  },
  noEventsContainer: {
    marginTop: 20,
  },
  noEventsCard: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  noEventsText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    marginTop: 12,
  },
  weatherPanel: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  weatherCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  weatherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  weatherIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  weatherTitle: {
    color: 'white',
    fontSize: 19,
    fontWeight: '600',
  },
  weatherStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weatherStat: {
    alignItems: 'center',
    flex: 1,
  },
  weatherLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginTop: 4,
    marginBottom: 2,
  },
  weatherValue: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  eventDetailsContainer: {
    marginTop: 10,
    backgroundColor: 'rgba(16,185,129,0.08)',
    borderRadius: 8,
    padding: 10,
  },
  eventDetailsText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    lineHeight: 17,
  },
});

export default SmartCalendar;