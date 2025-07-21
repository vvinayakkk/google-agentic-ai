import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { ChevronLeft, ChevronDown, ChevronRight, Droplets, Egg, Calendar, MapPin } from 'lucide-react-native';

const API_BASE = 'http://192.168.0.111:8000';
const FARMER_ID = 'f001';

const CattleScreen = ({ navigation }) => {
  const [expandedCard, setExpandedCard] = useState(null);
  const [cattleData, setCattleData] = useState([]);
  const [calendarUpdates, setCalendarUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const suggestions = [
    'Bella needs more pasture space - consider rotation',
    'Chicken coop humidity levels need monitoring',
    'Billy shows signs of nutritional needs - supplement recommended'
  ];

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(`${API_BASE}/farmer/${FARMER_ID}/livestock`).then(res => res.json()),
      fetch(`${API_BASE}/farmer/${FARMER_ID}/calendar`).then(res => res.json())
    ])
      .then(([livestock, calendar]) => {
        setCattleData(livestock);
        // Filter calendar events for livestock-related ones (type === 'livestock')
        setCalendarUpdates(calendar.filter(e => e.type === 'livestock'));
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to load data');
        setLoading(false);
      });
  }, []);

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
          <ChevronDown 
            color="#64748B" 
            size={20} 
            style={{ 
              transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] 
            }} 
          />
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
});

export default CattleScreen;