import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import { ChevronLeft, ChevronDown, ChevronRight, Droplets, Egg, Calendar, MapPin } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const API_BASE = 'http://192.168.0.111:8000';
const FARMER_ID = 'f001';
const LIVESTOCK_CACHE_KEY = 'livestock-cache';
const CALENDAR_CACHE_KEY = 'cattle-calendar-cache';

const CattleScreen = ({ navigation }) => {
  const [expandedCard, setExpandedCard] = useState(null);
  const [cattleData, setCattleData] = useState([]);
  const [calendarUpdates, setCalendarUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Add state for animal modals and mic
  const [animalModalVisible, setAnimalModalVisible] = useState(false);
  const [animalModalMode, setAnimalModalMode] = useState('add');
  const [animalModalAnimal, setAnimalModalAnimal] = useState({ name: '', breed: '', age: '', type: '', icon: '🐄', color: '#10B981', health: 'Good', lastCheckup: '', milkCapacity: '', eggCapacity: '' });
  const [animalModalLoading, setAnimalModalLoading] = useState(false);
  const [animalAddOptionSheet, setAnimalAddOptionSheet] = useState(false);
  const [animalMicModal, setAnimalMicModal] = useState(false);
  const animalMicAnim = useRef(new Animated.Value(1)).current;

  const suggestions = [
    'Bella needs more pasture space - consider rotation',
    'Chicken coop humidity levels need monitoring',
    'Billy shows signs of nutritional needs - supplement recommended'
  ];

  // Load livestock and calendar from cache, then fetch from backend
  const fetchCattleData = async () => {
    setLoading(true);
    setError(null);
    // Try to load from cache first
    try {
      const cachedLivestock = await AsyncStorage.getItem(LIVESTOCK_CACHE_KEY);
      const cachedCalendar = await AsyncStorage.getItem(CALENDAR_CACHE_KEY);
      if (cachedLivestock) setCattleData(JSON.parse(cachedLivestock));
      if (cachedCalendar) setCalendarUpdates(JSON.parse(cachedCalendar));
      if (cachedLivestock || cachedCalendar) setLoading(false);
    } catch (e) {}
    // Always fetch from backend in background
    Promise.all([
      fetch(`${API_BASE}/farmer/${FARMER_ID}/livestock`).then(res => res.json()),
      fetch(`${API_BASE}/farmer/${FARMER_ID}/calendar`).then(res => res.json())
    ])
      .then(([livestock, calendar]) => {
        setCattleData(livestock);
        setCalendarUpdates(calendar.filter(e => e.type === 'livestock'));
        AsyncStorage.setItem(LIVESTOCK_CACHE_KEY, JSON.stringify(livestock));
        AsyncStorage.setItem(CALENDAR_CACHE_KEY, JSON.stringify(calendar.filter(e => e.type === 'livestock')));
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to load data');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchCattleData();
  }, []);

  // Mic animation effect
  useEffect(() => {
    let timer;
    if (animalMicModal) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(animalMicAnim, { toValue: 1.2, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(animalMicAnim, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ).start();
      timer = setTimeout(() => {
        setAnimalMicModal(false);
        setAnimalModalMode('add');
        setAnimalModalAnimal({ name: 'Bella', breed: 'Jersey', age: '3', type: 'cow', icon: '🐄', color: '#10B981', health: 'Excellent', lastCheckup: '2024-06-01', milkCapacity: '12L/day', eggCapacity: '' });
        setAnimalModalVisible(true);
      }, 5000);
    } else {
      animalMicAnim.setValue(1);
    }
    return () => clearTimeout(timer);
  }, [animalMicModal]);

  // Add animal handlers
  const openAddAnimalModal = () => setAnimalAddOptionSheet(true);
  const handleManualAddAnimal = () => {
    setAnimalAddOptionSheet(false);
    setAnimalModalMode('add');
    setAnimalModalAnimal({ name: '', breed: '', age: '', type: '', icon: '🐄', color: '#10B981', health: 'Good', lastCheckup: '', milkCapacity: '', eggCapacity: '' });
    setAnimalModalVisible(true);
  };
  const handleSpeakAddAnimal = () => {
    setAnimalAddOptionSheet(false);
    setAnimalMicModal(true);
  };
  const openEditAnimalModal = (animal) => {
    setAnimalModalMode('edit');
    setAnimalModalAnimal({ ...animal });
    setAnimalModalVisible(true);
  };
  const handleDeleteAnimal = (animal) => {
    Alert.alert('Delete Animal', `Are you sure you want to delete "${animal.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        setAnimalModalLoading(true);
        // Optimistically update UI
        const newAnimals = cattleData.filter(a => a.id !== animal.id);
        setCattleData(newAnimals);
        await AsyncStorage.setItem(LIVESTOCK_CACHE_KEY, JSON.stringify(newAnimals));
        setAnimalModalLoading(false);
        // Sync with backend
        fetch(`${API_BASE}/farmer/${FARMER_ID}/livestock/${animal.id}`, { method: 'DELETE' })
          .catch(() => { Alert.alert('Error', 'Failed to delete animal on server.'); });
      }}
    ]);
  };
  const handleAnimalModalSave = async () => {
    if (!animalModalAnimal.name || !animalModalAnimal.breed || !animalModalAnimal.type) {
      Alert.alert('Missing Info', 'Please fill all required fields.');
      return;
    }
    setAnimalModalLoading(true);
    const method = animalModalMode === 'add' ? 'POST' : 'PUT';
    const url = animalModalMode === 'add'
      ? `${API_BASE}/farmer/${FARMER_ID}/livestock`
      : `${API_BASE}/farmer/${FARMER_ID}/livestock/${animalModalAnimal.id}`;
    const newAnimal = {
      ...animalModalAnimal,
      id: animalModalAnimal.id || `an${Date.now()}`,
    };
    // Optimistically update UI
    let newAnimals;
    if (animalModalMode === 'add') {
      newAnimals = [newAnimal, ...cattleData];
    } else {
      newAnimals = cattleData.map(a => a.id === newAnimal.id ? newAnimal : a);
    }
    setCattleData(newAnimals);
    await AsyncStorage.setItem(LIVESTOCK_CACHE_KEY, JSON.stringify(newAnimals));
    setAnimalModalLoading(false);
    setAnimalModalVisible(false);
    // Sync with backend
    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newAnimal)
    })
      .catch(() => { Alert.alert('Error', 'Failed to save animal on server.'); });
  };

  const toggleCard = (id) => {
    setExpandedCard(expandedCard === id ? null : id);
  };

  const renderAnimalCard = (animal) => {
    const isExpanded = expandedCard === animal.id;
    
    return (
      <TouchableOpacity
        key={animal.id}
        style={[styles.animalCard, { borderLeftColor: animal.color }]}
        onPress={() => toggleCard(animal.id)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.animalInfo}>
            <Text style={styles.animalIcon}>{animal.icon}</Text>
            <View style={styles.animalDetails}>
              <Text style={styles.animalName}>{animal.name}</Text>
              <Text style={styles.animalBreed}>{animal.breed}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => openEditAnimalModal(animal)} style={{ backgroundColor: '#3B82F6', borderRadius: 8, padding: 6, marginRight: 6, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="create-outline" size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDeleteAnimal(animal)} style={{ backgroundColor: '#EF4444', borderRadius: 8, padding: 6, marginRight: 6, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="trash-outline" size={18} color="#fff" />
            </TouchableOpacity>
            <ChevronDown 
              color="#64748B" 
              size={20} 
              style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }} 
            />
          </View>
        </View>

        {isExpanded && (
          <View style={styles.expandedContent}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Age:</Text>
              <Text style={styles.detailValue}>{animal.age}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Health:</Text>
              <Text style={[
                styles.detailValue, 
                { color: animal.health === 'Excellent' ? '#10B981' : 
                         animal.health === 'Good' ? '#F59E0B' : '#EF4444' }
              ]}>
                {animal.health}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Last Checkup:</Text>
              <Text style={styles.detailValue}>{animal.lastCheckup}</Text>
            </View>

            {animal.type === 'cow' || animal.type === 'goat' ? (
              <View style={styles.capacityRow}>
                <Droplets color="#3B82F6" size={16} />
                <Text style={styles.capacityText}>Milk: {animal.milkCapacity}</Text>
              </View>
            ) : (
              <View style={styles.capacityRow}>
                <Egg color="#F59E0B" size={16} />
                <Text style={styles.capacityText}>Eggs: {animal.eggCapacity}</Text>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ChevronLeft color="#FFFFFF" size={24} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Cattle Management</Text>
          <Text style={styles.headerSubtitle}>Animal health & productivity</Text>
        </View>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: '#fff' }}>Loading...</Text></View>
      ) : error ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: 'red' }}>{error}</Text></View>
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Animals Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Animals ({cattleData.length})</Text>
            {cattleData.map(renderAnimalCard)}
          </View>

          {/* Calendar Updates */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Calendar color="#10B981" size={20} />
              <Text style={styles.sectionTitle}>Calendar Updates</Text>
            </View>
            
            {calendarUpdates.map((update, idx) => (
              <View key={idx} style={styles.updateCard}>
                <View style={styles.updateHeader}>
                  <Text style={styles.updateTitle}>{update.task}</Text>
                  <View style={[styles.priorityBadge, { backgroundColor: update.priority === 'high' ? '#EF4444' : update.priority === 'medium' ? '#F59E0B' : '#10B981' }]}>
                    <Text style={styles.priorityText}>{update.priority?.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.updateDate}>{update.date}</Text>
              </View>
            ))}
          </View>

          {/* Suggestions */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MapPin color="#8B5CF6" size={20} />
              <Text style={styles.sectionTitle}>Space Suggestions</Text>
            </View>
            
            {suggestions.map((suggestion, index) => (
              <View key={index} style={styles.suggestionCard}>
                <View style={styles.suggestionDot} />
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Floating + Add Animal Button */}
      <View style={{ position: 'absolute', bottom: 32, right: 32, zIndex: 100 }}>
        <TouchableOpacity onPress={openAddAnimalModal} style={{ backgroundColor: '#10B981', borderRadius: 32, width: 64, height: 64, alignItems: 'center', justifyContent: 'center', shadowColor: '#10B981', shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 }}>
          <Text style={{ fontSize: 36, color: '#fff', fontWeight: 'bold' }}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Animal Add Option Sheet */}
      <Modal visible={animalAddOptionSheet} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#23232a', borderRadius: 16, padding: 24, width: 300 }}>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>Add Animal</Text>
            <TouchableOpacity style={{ backgroundColor: '#10B981', borderRadius: 8, padding: 14, alignItems: 'center', marginBottom: 12 }} onPress={handleManualAddAnimal}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Type Manually</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ backgroundColor: '#3B82F6', borderRadius: 8, padding: 14, alignItems: 'center' }} onPress={handleSpeakAddAnimal}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Speak (AI Extract)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ marginTop: 18, alignItems: 'center' }} onPress={() => setAnimalAddOptionSheet(false)}>
              <Text style={{ color: '#64748B' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Animal Add/Edit Modal */}
      <Modal visible={animalModalVisible} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#18181b', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400, maxHeight: '90%' }}>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>{animalModalMode === 'add' ? 'Add New Animal' : 'Edit Animal'}</Text>
            <ScrollView style={{ maxHeight: 400 }}>
              <TextInput style={styles.input} placeholder="Name" placeholderTextColor="#64748B" value={animalModalAnimal.name} onChangeText={v => setAnimalModalAnimal({ ...animalModalAnimal, name: v })} />
              <TextInput style={styles.input} placeholder="Breed" placeholderTextColor="#64748B" value={animalModalAnimal.breed} onChangeText={v => setAnimalModalAnimal({ ...animalModalAnimal, breed: v })} />
              <TextInput style={styles.input} placeholder="Age" placeholderTextColor="#64748B" value={animalModalAnimal.age} onChangeText={v => setAnimalModalAnimal({ ...animalModalAnimal, age: v })} keyboardType="numeric" />
              <TextInput style={styles.input} placeholder="Type (cow, goat, chicken)" placeholderTextColor="#64748B" value={animalModalAnimal.type} onChangeText={v => setAnimalModalAnimal({ ...animalModalAnimal, type: v })} />
              <TextInput style={styles.input} placeholder="Icon (emoji)" placeholderTextColor="#64748B" value={animalModalAnimal.icon} onChangeText={v => setAnimalModalAnimal({ ...animalModalAnimal, icon: v })} />
              <TextInput style={styles.input} placeholder="Color (hex)" placeholderTextColor="#64748B" value={animalModalAnimal.color} onChangeText={v => setAnimalModalAnimal({ ...animalModalAnimal, color: v })} />
              <TextInput style={styles.input} placeholder="Health" placeholderTextColor="#64748B" value={animalModalAnimal.health} onChangeText={v => setAnimalModalAnimal({ ...animalModalAnimal, health: v })} />
              <TextInput style={styles.input} placeholder="Last Checkup" placeholderTextColor="#64748B" value={animalModalAnimal.lastCheckup} onChangeText={v => setAnimalModalAnimal({ ...animalModalAnimal, lastCheckup: v })} />
              <TextInput style={styles.input} placeholder="Milk Capacity (if applicable)" placeholderTextColor="#64748B" value={animalModalAnimal.milkCapacity} onChangeText={v => setAnimalModalAnimal({ ...animalModalAnimal, milkCapacity: v })} />
              <TextInput style={styles.input} placeholder="Egg Capacity (if applicable)" placeholderTextColor="#64748B" value={animalModalAnimal.eggCapacity} onChangeText={v => setAnimalModalAnimal({ ...animalModalAnimal, eggCapacity: v })} />
            </ScrollView>
            <View style={{ flexDirection: 'row', marginTop: 24 }}>
              <TouchableOpacity style={{ flex: 1, alignItems: 'center', padding: 12, backgroundColor: '#27272a', borderRadius: 8, marginRight: 8 }} onPress={() => setAnimalModalVisible(false)}>
                <Text style={{ color: '#64748B' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, alignItems: 'center', padding: 12, backgroundColor: '#10B981', borderRadius: 8, marginLeft: 8 }} onPress={handleAnimalModalSave} disabled={animalModalLoading}>
                <Text style={{ color: '#fff' }}>{animalModalLoading ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Mic Modal for Animal */}
      <Modal visible={animalMicModal} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' }}>
          <Animated.View style={{
            width: 120, height: 120, borderRadius: 60, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center',
            transform: [{ scale: animalMicAnim }], marginBottom: 32
          }}>
            <Text style={{ fontSize: 56, color: '#fff' }}>🎤</Text>
          </Animated.View>
          <Text style={{ color: '#fff', fontSize: 18, marginBottom: 24 }}>Listening...</Text>
          <TouchableOpacity onPress={() => setAnimalMicModal(false)} style={{ backgroundColor: '#23232a', borderRadius: 8, padding: 14, alignItems: 'center', width: 120 }}>
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 50,
    backgroundColor: '#000',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
    marginLeft: 16,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 2,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  liveText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#10B981',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 19,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  animalCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  animalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  animalIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  animalDetails: {
    flex: 1,
  },
  animalName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  animalBreed: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  expandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#2D3748',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  capacityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 8,
    backgroundColor: '#2D3748',
    borderRadius: 8,
  },
  capacityText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  updateCard: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  updateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  updateTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    flex: 1,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  updateDate: {
    fontSize: 12,
    color: '#64748B',
  },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  suggestionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#8B5CF6',
    marginTop: 6,
    marginRight: 12,
  },
  suggestionText: {
    fontSize: 14,
    color: '#E2E8F0',
    flex: 1,
    lineHeight: 18,
  },
  input: {
    backgroundColor: '#23232a',
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#374151',
  },
});

export default CattleScreen;