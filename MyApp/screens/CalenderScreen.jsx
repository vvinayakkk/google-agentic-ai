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
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

const API_BASE = 'http://192.168.0.111:8000';
const FARMER_ID = 'f001';

const SmartCalendar = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  // --- 4-line typewriter effect state ---
  const fullSummaryLines = [
    "Weather-synced farming schedule shows optimal planting window for wheat in 3 days.",
    "Irrigation scheduled for Field-A tomorrow.",
    "Cattle health checkups due this week.",
    "Monitor rainfall for optimal fertilizer application."
  ];
  const [summaryLines, setSummaryLines] = useState(["", "", "", ""]);
  const [currentLine, setCurrentLine] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  // Add expandedEventIndex state
  const [expandedEventIndex, setExpandedEventIndex] = useState(null);
  // --- Typing effect with blinking cursor ---
  const [showCursor, setShowCursor] = useState(true);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [events, setEvents] = useState({});
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState(null);

  // Animated values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const fullSummary = "Weather-synced farming schedule shows optimal planting window for wheat in 3 days. Irrigation scheduled for Field-A tomorrow. Cattle health checkups due this week.";

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

  // Typewriter effect
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

    // Typing effect
    let line = 0;
    let char = 0;
    let tempLines = ["", "", "", ""];
    setSummaryLines(["", "", "", ""]);
    setCurrentLine(0);
    setLoading(true);

    function typeNextChar() {
      if (line < fullSummaryLines.length) {
        if (char < fullSummaryLines[line].length) {
          tempLines[line] = fullSummaryLines[line].substring(0, char + 1);
          setSummaryLines([...tempLines]);
          char++;
          setTimeout(typeNextChar, 1); // super fast speed
        } else {
          char = 0;
          line++;
          setCurrentLine(line);
          setTimeout(typeNextChar, 10); // super fast between lines
        }
      } else {
        setLoading(false);
      }
    }
    typeNextChar();
    return () => {};
  }, []);

  useEffect(() => {
    setDataLoading(true);
    setDataError(null);
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
        setDataLoading(false);
      })
      .catch(err => {
        setDataError('Failed to load calendar events');
        setDataLoading(false);
      });
  }, []);

  // Blinking cursor effect
  useEffect(() => {
    if (!loading) return;
    const cursorInterval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 400);
    return () => clearInterval(cursorInterval);
  }, [loading]);

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

  if (!mounted) return null;

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

        {/* AI Summary */}
        <Animated.View style={[styles.summaryContainer, { opacity: fadeAnim }]}>
          <LinearGradient
            colors={['rgba(24, 24, 27, 0.9)', 'rgba(39, 39, 42, 0.9)']}
            style={styles.summaryCard}
          >
            <View style={styles.summaryHeader}>
              <LinearGradient
                colors={['#10b981', '#3b82f6']}
                style={styles.summaryIcon}
              >
                <Ionicons name="sparkles" size={16} color="white" />
              </LinearGradient>
              <Text style={styles.summaryTitle}>AI Farm Assistant</Text>
              {loading && (
                <Animated.View style={[styles.typingIndicator, { opacity: pulseAnim }]} />
              )}
            </View>
            {/* --- Replace summaryText rendering with 4-line effect --- */}
            <Text style={styles.summaryText}>
              {summaryLines.map((line, idx) => (
                <Text key={idx}>
                  {line !== "" && `• `}{line}
                  {loading && currentLine === idx && showCursor && <Text style={styles.cursor}>|</Text>}
                  {"\n"}
                </Text>
              ))}
            </Text>
          </LinearGradient>
        </Animated.View>

        {dataLoading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: '#fff' }}>Loading...</Text></View>
        ) : dataError ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: 'red' }}>{dataError}</Text></View>
        ) : (
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Calendar Navigation */}
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
                  {selectedDateEvents.map((item, index) =>
                    renderEventItem({ item, index })
                  )}
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
          </ScrollView>
        )}
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
  summaryContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  summaryCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  summaryTitle: {
    color: '#10b981',
    fontSize: 19,
    fontWeight: '600',
    flex: 1,
  },
  typingIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  summaryText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 17,
    lineHeight: 18,
  },
  cursor: {
    color: '#10b981',
    fontWeight: '600',
  },
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