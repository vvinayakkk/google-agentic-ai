import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const chatItems = [
  { id: '1', title: 'Initial Greeting and Assistance Offered' },
  { id: '2', title: 'Hey, what is the temperature now?' },
  { id: '3', title: 'React Native Profile Screen Redesign' },
  { id: '4', title: 'Refactored UI for KisanAI App' },
];

const gemItems = [
  { key: 'crop', icon: '🩺', label: 'Crop Doctor', description: 'Diagnose crop issues instantly.' },
  { key: 'weather', icon: '🌦', label: 'Weather & Work', description: 'Get weather updates and plan your work.' },
  { key: 'sell', icon: '📈', label: 'Sell or Hold?', description: 'Market insights for your produce.' },
  { key: 'subsidy', icon: '💰', label: 'My Subsidy', description: 'Track and manage your subsidies.' },
];

export default function FeaturedScreen() {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.topBar, { paddingTop: insets.top }]}>  
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="close" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Chats & Gems</Text>
        <View style={styles.profileCircle}>
          <MaterialCommunityIcons name="account-circle" size={40} color="#90caf9" />
        </View>
      </View>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent} showsVerticalScrollIndicator={false}>
        {/* Chats Section */}
        <Text style={styles.sectionHeader}>Chats</Text>
        <View style={styles.sectionList}>
          {chatItems.map((item) => (
            <TouchableOpacity key={item.id} style={styles.chatItem}>
              <View style={styles.chatIconSquare}>
                <Ionicons name="chatbubble-outline" size={20} color="white" />
              </View>
              <Text style={styles.chatTitle}>{item.title}</Text>
              <Ionicons name="chevron-forward" size={22} color="#888" />
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.viewAllButton}>
          <Text style={styles.viewAllText}>View all</Text>
        </TouchableOpacity>
        {/* Gems Section */}
        <Text style={[styles.sectionHeader, { marginTop: 30 }]}>Featured Items</Text>
        <View style={styles.featuredGrid}>
          {gemItems.map((item, idx) => (
            <TouchableOpacity key={item.key} style={[styles.featuredCard, { borderColor: idx % 2 === 0 ? '#1565c0' : '#1b5e20' }]}> 
              <View style={styles.gemIconCircle}> 
                <Text style={{ fontSize: 22 }}>{item.icon}</Text>
              </View>
              <Text style={styles.gemTitle}>{item.label}</Text>
              <Text style={styles.gemDescription} numberOfLines={2}>{item.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'black',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 10,
    backgroundColor: 'black',
  },
  iconButton: {
    padding: 4,
    marginRight: 10,
  },
  topBarTitle: {
    flex: 1,
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  profileCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingHorizontal: 0,
    paddingBottom: 30,
  },
  sectionHeader: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 22,
    marginTop: 18,
    marginBottom: 10,
  },
  sectionList: {
    paddingHorizontal: 10,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181818',
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  chatIconSquare: {
    width: 32,
    height: 32,
    borderRadius: 7,
    backgroundColor: '#232323',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  chatTitle: {
    color: 'white',
    fontSize: 15,
    flex: 1,
  },
  gemItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181818',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  gemIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  gemTextContent: {
    flex: 1,
  },
  gemTitle: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 2,
  },
  gemDescription: {
    color: 'gray',
    fontSize: 13,
    marginBottom: 2,
  },
  featuredGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  featuredCard: {
    backgroundColor: '#181818',
    borderRadius: 12,
    width: '48%',
    marginBottom: 16,
    padding: 16,
    alignItems: 'flex-start',
    borderWidth: 1.5,
    // borderColor will be set inline for each card
  },
  viewAllButton: {
    alignSelf: 'flex-end',
    marginRight: 18,
    marginBottom: 6,
  },
  viewAllText: {
    color: '#90caf9',
    fontSize: 13,
    fontWeight: '500',
  },
});