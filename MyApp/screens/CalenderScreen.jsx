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
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { NetworkConfig } from '../utils/NetworkConfig';

const { width } = Dimensions.get('window');

const API_BASE = NetworkConfig.API_BASE;
const FARMER_ID = 'f001';
const CALENDAR_CACHE_KEY = 'calendar-events-cache';

// Hardcoded AI insights for carousel
const AI_INSIGHTS = [
  {
    icon: 'water-outline',
    title: 'Irrigation Schedule',
    description: 'Your tomato field needs watering in 2 days based on soil moisture and weather patterns.',
    color: '#10b981'
  },
  {
    icon: 'leaf-outline',
    title: 'Crop Growth',
    description: 'Wheat is entering flowering stage. Consider applying nitrogen fertilizer this week.',
    color: '#3b82f6'
  },
  {
    icon: 'bug-outline',
    title: 'Pest Alert',
    description: 'Weather conditions favor aphid growth. Monitor your crops closely.',
    color: '#f59e0b'
  },
  {
    icon: 'sunny-outline',
    title: 'Weather Insight',
    description: 'Perfect conditions for outdoor activities next 3 days. Plan your harvesting.',
    color: '#ef4444'
  }
];

const SmartCalendar = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [events, setEvents] = useState({});
  const [dataLoading, setDataLoading] = useState(true);
  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [addMethodModalVisible, setAddMethodModalVisible] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [selectedEventDetails, setSelectedEventDetails] = useState(null);
  const [eventModalEvent, setEventModalEvent] = useState({ 
    date: '', time: '', task: '', type: '', priority: 'medium', details: '' 
  });
  const [currentEventPopupVisible, setCurrentEventPopupVisible] = useState(false);
  const [currentEvent, setCurrentEvent] = useState(null);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const carouselScrollX = useRef(new Animated.Value(0)).current;
  const eventDetailsOpacity = useRef(new Animated.Value(0)).current;

  // Auto-scroll carousel
  const carouselRef = useRef(null);
  const [currentInsightIndex, setCurrentInsightIndex] = useState(0);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    fetchCalendarEvents();
    startCarouselAutoScroll();
    checkCurrentEvent();
  }, []);

  const startCarouselAutoScroll = () => {
    const interval = setInterval(() => {
      if (carouselRef.current) {
        const nextIndex = (currentInsightIndex + 1) % AI_INSIGHTS.length;
        carouselRef.current.scrollTo({
          x: nextIndex * (width - 40),
          animated: true,
        });
        setCurrentInsightIndex(nextIndex);
      }
    }, 4000);

    return () => clearInterval(interval);
  };

  const checkCurrentEvent = () => {
    const now = new Date();
    const todayKey = formatDateKey(now);
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;

    // Check if there's a current event happening now
    const todayEvents = events[todayKey] || [];
    const currentEvents = todayEvents.filter(event => {
      const [eventHour, eventMinute] = event.time.split(':').map(Number);
      const eventTimeMinutes = eventHour * 60 + eventMinute;
      // Check if event is within 30 minutes window (15 before, 15 after)
      return Math.abs(currentTimeMinutes - eventTimeMinutes) <= 15;
    });

    if (currentEvents.length > 0) {
      setCurrentEvent(currentEvents[0]);
      setCurrentEventPopupVisible(true);
      
      // Auto hide after 5 seconds
      setTimeout(() => {
        setCurrentEventPopupVisible(false);
      }, 5000);
    }
  };

  const fetchCalendarEvents = async () => {
    setDataLoading(true);
    try {
      const cached = await AsyncStorage.getItem(CALENDAR_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        setCalendarEvents(parsed);
        const eventsByDate = {};
        parsed.forEach(ev => {
          if (!eventsByDate[ev.date]) eventsByDate[ev.date] = [];
          eventsByDate[ev.date].push(ev);
        });
        setEvents(eventsByDate);
        setDataLoading(false);
        return;
      }
    } catch (e) {
      console.error('Cache load error:', e);
    }

    // Mock data for demo
    const mockEvents = [
      {
        eventId: 'ev1',
        date: formatDateKey(new Date()),
        time: '08:00',
        task: 'Water tomato plants',
        type: 'irrigation',
        priority: 'high',
        details: 'Check soil moisture and apply drip irrigation'
      },
      {
        eventId: 'ev2',
        date: formatDateKey(new Date(Date.now() + 86400000)),
        time: '15:00',
        task: 'Apply fertilizer to wheat field',
        type: 'treatment',
        priority: 'medium',
        details: 'Use nitrogen-rich fertilizer'
      }
    ];

    setCalendarEvents(mockEvents);
    const eventsByDate = {};
    mockEvents.forEach(ev => {
      if (!eventsByDate[ev.date]) eventsByDate[ev.date] = [];
      eventsByDate[ev.date].push(ev);
    });
    setEvents(eventsByDate);
    setDataLoading(false);
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

  const changeMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const handleDatePress = (date) => {
    setSelectedDate(date);
    const dateKey = formatDateKey(date);
    const dayEvents = events[dateKey];
    
    if (dayEvents && dayEvents.length > 0) {
      setSelectedEventDetails(dayEvents[0]);
      Animated.timing(eventDetailsOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      
      // Auto hide after 3 seconds
      setTimeout(() => {
        Animated.timing(eventDetailsOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setSelectedEventDetails(null);
        });
      }, 3000);
    }
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];
    let week = [];

    // Fill initial empty cells
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
          onPress={() => handleDatePress(date)}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.dayNumber,
            isTodayDate && styles.todayNumber,
            isSelectedDate && styles.selectedNumber,
          ]}>
            {day}
          </Text>
          {dayEvents.length > 0 && (
            <View style={styles.eventIndicator}>
              <View style={[
                styles.eventDot,
                { backgroundColor: dayEvents[0].priority === 'high' ? '#ff4444' : '#10b981' }
              ]} />
            </View>
          )}
        </TouchableOpacity>
      );

      if (week.length === 7 || day === daysInMonth) {
        if (day === daysInMonth && week.length < 7) {
          for (let j = week.length; j < 7; j++) {
            week.push(<View key={`empty-end-${day}-${j}`} style={styles.emptyDay} />);
          }
        }
        days.push(
          <View key={`week-${day}`} style={styles.weekRow}>
            {week}
          </View>
        );
        week = [];
      }
    }
    return days;
  };

  const getNextUpcomingTask = () => {
    const today = new Date();
    const sortedEvents = calendarEvents
      .filter(event => new Date(event.date) >= today)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    return sortedEvents[0] || null;
  };

  const getTaskIcon = (type) => {
    switch (type) {
      case 'irrigation': return 'water-outline';
      case 'planting': return 'leaf-outline';
      case 'livestock': return 'paw-outline';
      case 'treatment': return 'medical-outline';
      case 'harvest': return 'cut-outline';
      default: return 'calendar-outline';
    }
  };

  const openAddMethodModal = () => {
    setAddMethodModalVisible(true);
  };

  const handleManualAdd = () => {
    setAddMethodModalVisible(false);
    setEventModalEvent({ 
      date: formatDateKey(selectedDate), 
      time: '', 
      task: '', 
      type: '', 
      priority: 'medium', 
      details: '' 
    });
    setEventModalVisible(true);
  };

  const handleAIAdd = async () => {
    setAddMethodModalVisible(false);
    setAiGenerating(true);
    
    // Simulate AI generation
    setTimeout(() => {
      const aiSuggestions = [
        {
          task: 'Check soil moisture levels',
          time: '07:00',
          type: 'irrigation',
          priority: 'high',
          details: 'Monitor field sections A-C for optimal watering schedule'
        },
        {
          task: 'Inspect crop health',
          time: '16:00',
          type: 'monitoring',
          priority: 'medium',
          details: 'Look for signs of pest damage or disease in tomato plants'
        }
      ];
      
      const suggestion = aiSuggestions[Math.floor(Math.random() * aiSuggestions.length)];
      setEventModalEvent({ 
        date: formatDateKey(selectedDate), 
        ...suggestion
      });
      setAiGenerating(false);
      setEventModalVisible(true);
    }, 2500);
  };

  const handleSaveEvent = async () => {
    if (!eventModalEvent.task || !eventModalEvent.time) {
      Alert.alert('Missing Info', 'Please fill task and time fields.');
      return;
    }

    const newEvent = {
      ...eventModalEvent,
      eventId: `ev${Date.now()}`,
      date: eventModalEvent.date || formatDateKey(selectedDate),
    };

    const newEvents = [newEvent, ...calendarEvents];
    setCalendarEvents(newEvents);
    
    const eventsByDate = {};
    newEvents.forEach(ev => {
      if (!eventsByDate[ev.date]) eventsByDate[ev.date] = [];
      eventsByDate[ev.date].push(ev);
    });
    setEvents(eventsByDate);

    await AsyncStorage.setItem(CALENDAR_CACHE_KEY, JSON.stringify(newEvents));
    setEventModalVisible(false);
  };

  const nextTask = getNextUpcomingTask();

  if (dataLoading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="black" />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <Ionicons name="calendar" size={48} color="#10b981" />
            <Text style={styles.loadingText}>Loading your farm calendar...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="black" />
      <SafeAreaView style={styles.safeArea}>
        
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color="#10b981" />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Farm Calendar</Text>
            <Text style={styles.headerSubtitle}>Plan your farming activities</Text>
          </View>
          
          <View style={styles.headerRight}>
            <View style={styles.statusDot} />
          </View>
        </Animated.View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          
          {/* Calendar Section */}
          <Animated.View style={[styles.calendarSection, { opacity: fadeAnim }]}>
            <View style={styles.monthNav}>
              <TouchableOpacity 
                style={styles.navButton} 
                onPress={() => changeMonth(-1)}
              >
                <Ionicons name="chevron-back" size={20} color="#10b981" />
              </TouchableOpacity>
              
              <Text style={styles.monthText}>
                {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </Text>
              
              <TouchableOpacity 
                style={styles.navButton} 
                onPress={() => changeMonth(1)}
              >
                <Ionicons name="chevron-forward" size={20} color="#10b981" />
              </TouchableOpacity>
            </View>

            <View style={styles.calendarContainer}>
              {/* Add Task Button - Top Right of Calendar */}
              <TouchableOpacity 
                style={styles.addTaskButton}
                onPress={openAddMethodModal}
              >
                <Ionicons name="add" size={20} color="white" />
              </TouchableOpacity>

              <View style={styles.weekHeader}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                  <Text key={index} style={styles.weekDay}>{day}</Text>
                ))}
              </View>

              <View style={styles.calendarGrid}>
                {renderCalendar()}
              </View>
            </View>
          </Animated.View>

          {/* Event Details Popup */}
          {selectedEventDetails && (
            <Animated.View style={[styles.eventDetailsPopup, { opacity: eventDetailsOpacity }]}>
              <View style={styles.eventDetailsContent}>
                <Ionicons 
                  name={getTaskIcon(selectedEventDetails.type)} 
                  size={20} 
                  color="#10b981" 
                />
                <View style={styles.eventDetailsText}>
                  <Text style={styles.eventDetailsTitle}>{selectedEventDetails.task}</Text>
                  <Text style={styles.eventDetailsTime}>{selectedEventDetails.time}</Text>
                </View>
              </View>
            </Animated.View>
          )}

          {/* Next Upcoming Task */}
          {nextTask && (
            <View style={styles.upcomingSection}>
              <Text style={styles.upcomingSectionTitle}>Next Upcoming Task</Text>
              <View style={styles.upcomingTaskCard}>
                <View style={styles.upcomingTaskIcon}>
                  <Ionicons 
                    name={getTaskIcon(nextTask.type)} 
                    size={24} 
                    color="#10b981" 
                  />
                </View>
                <View style={styles.upcomingTaskContent}>
                  <Text style={styles.upcomingTaskTitle}>{nextTask.task}</Text>
                  <Text style={styles.upcomingTaskDate}>
                    {new Date(nextTask.date).toLocaleDateString('default', {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric'
                    })} at {nextTask.time}
                  </Text>
                  {nextTask.details && (
                    <Text style={styles.upcomingTaskDetails}>{nextTask.details}</Text>
                  )}
                </View>
                <View style={[
                  styles.upcomingTaskPriority,
                  { backgroundColor: nextTask.priority === 'high' ? '#ff4444' : 
                                   nextTask.priority === 'medium' ? '#ffaa00' : '#10b981' }
                ]} />
              </View>
            </View>
          )}

          {/* AI Analysis Carousel */}
          <View style={styles.aiAnalysisSection}>
            <View style={styles.aiAnalysisHeader}>
              <MaterialCommunityIcons name="brain" size={24} color="#10b981" />
              <Text style={styles.aiAnalysisTitle}>AI Farm Insights</Text>
            </View>

            <ScrollView
              ref={carouselRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={styles.insightsCarousel}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { x: carouselScrollX } } }],
                { useNativeDriver: false }
              )}
            >
              {AI_INSIGHTS.map((insight, index) => (
                <View key={index} style={styles.insightCard}>
                  <View style={[styles.insightIconContainer, { backgroundColor: `${insight.color}20` }]}>
                    <Ionicons name={insight.icon} size={28} color={insight.color} />
                  </View>
                  <Text style={styles.insightTitle}>{insight.title}</Text>
                  <Text style={styles.insightDescription}>{insight.description}</Text>
                </View>
              ))}
            </ScrollView>

            {/* Carousel Indicators */}
            <View style={styles.carouselIndicators}>
              {AI_INSIGHTS.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.indicator,
                    index === currentInsightIndex && styles.activeIndicator
                  ]}
                />
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Current Event Popup */}
        <Modal visible={currentEventPopupVisible} animationType="fade" transparent>
          <View style={styles.currentEventOverlay}>
            <Animated.View style={styles.currentEventPopup}>
              <View style={styles.currentEventHeader}>
                <View style={styles.currentEventIconContainer}>
                  <Ionicons 
                    name={currentEvent ? getTaskIcon(currentEvent.type) : 'calendar'} 
                    size={24} 
                    color="#10b981" 
                  />
                </View>
                <View style={styles.currentEventTextContainer}>
                  <Text style={styles.currentEventTitle}>Current Task</Text>
                  <Text style={styles.currentEventTask}>{currentEvent?.task}</Text>
                  <Text style={styles.currentEventTime}>Scheduled: {currentEvent?.time}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.currentEventCloseButton}
                  onPress={() => setCurrentEventPopupVisible(false)}
                >
                  <Ionicons name="close" size={20} color="#666" />
                </TouchableOpacity>
              </View>
              {currentEvent?.details && (
                <Text style={styles.currentEventDetails}>{currentEvent.details}</Text>
              )}
            </Animated.View>
          </View>
        </Modal>

        {/* Add Method Selection Modal */}
        <Modal visible={addMethodModalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.addMethodModal}>
              <Text style={styles.addMethodTitle}>Add New Task</Text>
              <Text style={styles.addMethodSubtitle}>Choose how you'd like to add your farming task</Text>
              
              <TouchableOpacity 
                style={styles.addMethodOption}
                onPress={handleManualAdd}
              >
                <Ionicons name="create-outline" size={24} color="#10b981" />
                <View style={styles.addMethodOptionContent}>
                  <Text style={styles.addMethodOptionTitle}>Fill Manually</Text>
                  <Text style={styles.addMethodOptionDesc}>Enter task details yourself</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.addMethodOption}
                onPress={handleAIAdd}
              >
                <MaterialCommunityIcons name="brain" size={24} color="#3b82f6" />
                <View style={styles.addMethodOptionContent}>
                  <Text style={styles.addMethodOptionTitle}>Fill with AI</Text>
                  <Text style={styles.addMethodOptionDesc}>Let AI suggest optimal tasks</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.addMethodCancel}
                onPress={() => setAddMethodModalVisible(false)}
              >
                <Text style={styles.addMethodCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* AI Generation Loading Modal */}
        <Modal visible={aiGenerating} animationType="fade" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.aiLoadingModal}>
              <Animated.View style={styles.aiLoadingAnimation}>
                <MaterialCommunityIcons name="brain" size={48} color="#3b82f6" />
              </Animated.View>
              <Text style={styles.aiLoadingTitle}>Generating using Reinforcement Learning</Text>
              <Text style={styles.aiLoadingSubtitle}>Analyzing your farm data and weather patterns...</Text>
              <View style={styles.loadingBar}>
                <Animated.View style={styles.loadingBarFill} />
              </View>
            </View>
          </View>
        </Modal>

        {/* Add/Edit Event Modal */}
        <Modal visible={eventModalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Farm Task</Text>
                <TouchableOpacity 
                  onPress={() => setEventModalVisible(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalContent}>
                <TextInput
                  style={styles.modalInput}
                  placeholder="What needs to be done?"
                  placeholderTextColor="#666"
                  value={eventModalEvent.task}
                  onChangeText={(text) => setEventModalEvent({...eventModalEvent, task: text})}
                />
                
                <TextInput
                  style={styles.modalInput}
                  placeholder="Time (e.g., 09:00)"
                  placeholderTextColor="#666"
                  value={eventModalEvent.time}
                  onChangeText={(text) => setEventModalEvent({...eventModalEvent, time: text})}
                />
                
                <TextInput
                  style={styles.modalInput}
                  placeholder="Type (irrigation, planting, etc.)"
                  placeholderTextColor="#666"
                  value={eventModalEvent.type}
                  onChangeText={(text) => setEventModalEvent({...eventModalEvent, type: text})}
                />
                
                <TextInput
                  style={[styles.modalInput, styles.modalTextArea]}
                  placeholder="Additional details (optional)"
                  placeholderTextColor="#666"
                  value={eventModalEvent.details}
                  onChangeText={(text) => setEventModalEvent({...eventModalEvent, details: text})}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.modalFooter}>
                <TouchableOpacity 
                  style={styles.modalCancelButton}
                  onPress={() => setEventModalVisible(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.modalSaveButton}
                  onPress={handleSaveEvent}
                >
                  <Text style={styles.modalSaveText}>Save Task</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  headerSubtitle: {
    color: '#666',
    fontSize: 14,
    marginTop: 2,
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  scrollView: {
    flex: 1,
  },
  calendarSection: {
    padding: 20,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  navButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
  },
  monthText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  calendarContainer: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    position: 'relative',
  },
  addTaskButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  weekHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  weekDay: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    width: (width - 72) / 7,
  },
  calendarGrid: {},
  weekRow: {
    flexDirection: 'row',
  },
  emptyDay: {
    width: (width - 72) / 7,
    height: 40,
  },
  dayCell: {
    width: (width - 72) / 7,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  todayCell: {
    backgroundColor: '#10b981',
    borderRadius: 8,
  },
  selectedCell: {
    backgroundColor: '#1a4d3a',
    borderRadius: 8,
  },
  dayNumber: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  todayNumber: {
    color: '#000',
    fontWeight: '700',
  },
  selectedNumber: {
    color: '#10b981',
    fontWeight: '600',
  },
  eventIndicator: {
    position: 'absolute',
    bottom: 2,
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  eventDetailsPopup: {
    position: 'absolute',
    top: 200,
    left: 20,
    right: 20,
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#10b981',
    zIndex: 1000,
  },
  eventDetailsContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventDetailsText: {
    marginLeft: 12,
    flex: 1,
  },
  eventDetailsTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  eventDetailsTime: {
    color: '#10b981',
    fontSize: 14,
    marginTop: 2,
  },
  currentEventOverlay: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 100,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  currentEventPopup: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    borderWidth: 2,
    borderColor: '#10b981',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    maxWidth: 350,
    width: '90%',
  },
  currentEventHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  currentEventIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a4d3a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  currentEventTextContainer: {
    flex: 1,
  },
  currentEventTitle: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  currentEventTask: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  currentEventTime: {
    color: '#666',
    fontSize: 14,
  },
  currentEventCloseButton: {
    padding: 4,
    marginLeft: 8,
  },
  currentEventDetails: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  upcomingSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  upcomingSectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  upcomingTaskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 20,
  },
  upcomingTaskIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1a4d3a',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  upcomingTaskContent: {
    flex: 1,
  },
  upcomingTaskTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  upcomingTaskDate: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '500',
  },
  upcomingTaskDetails: {
    color: '#666',
    fontSize: 14,
    marginTop: 4,
  },
  upcomingTaskPriority: {
    width: 4,
    height: 48,
    borderRadius: 2,
  },
  aiAnalysisSection: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  aiAnalysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  aiAnalysisTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  insightsCarousel: {
    marginBottom: 16,
  },
  insightCard: {
    width: width - 40,
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 24,
    marginRight: 0,
    alignItems: 'center',
  },
  insightIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  insightTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  insightDescription: {
    color: '#ccc',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  carouselIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#333',
    marginHorizontal: 4,
  },
  activeIndicator: {
    backgroundColor: '#10b981',
    width: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  addMethodModal: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  addMethodTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  addMethodSubtitle: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  addMethodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  addMethodOptionContent: {
    flex: 1,
    marginLeft: 16,
  },
  addMethodOptionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  addMethodOptionDesc: {
    color: '#666',
    fontSize: 14,
  },
  addMethodCancel: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  addMethodCancelText: {
    color: '#666',
    fontSize: 16,
  },
  aiLoadingModal: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 300,
  },
  aiLoadingAnimation: {
    marginBottom: 20,
  },
  aiLoadingTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  aiLoadingSubtitle: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  loadingBar: {
    width: '100%',
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    overflow: 'hidden',
  },
  loadingBarFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    width: '70%',
  },
  modalContainer: {
    backgroundColor: '#111',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
  },
  modalInput: {
    backgroundColor: '#222',
    borderRadius: 8,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    marginBottom: 16,
  },
  modalTextArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#222',
  },
  modalCancelButton: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: '#222',
    borderRadius: 8,
  },
  modalCancelText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  modalSaveButton: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    marginLeft: 8,
    backgroundColor: '#10b981',
    borderRadius: 8,
  },
  modalSaveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
     },
 });

export default SmartCalendar;