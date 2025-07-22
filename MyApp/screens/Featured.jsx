import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const tools = [
  // {
  //   id: 'crop-cycle',
  //   icon: <MaterialCommunityIcons name="progress-clock" size={24} color="#a78bfa" />, bg: '#4c1d95',
  //   title: 'Crop Cycle', subtitle: 'Track growth from seed to harvest.', screen: 'CropCycle',
  // },
  {
    id: 'cattle-care',
    icon: <MaterialCommunityIcons name="paw" size={24} color="#f59e42" />, bg: '#78350f',
    title: 'Cattle Care', subtitle: 'Manage animal health records.', screen: 'CattleScreen',
  },
  {
    id: 'agrifinance',
    icon: <MaterialCommunityIcons name="wallet-outline" size={24} color="#6366f1" />, bg: '#1e40af',
    title: 'AgriFinance', subtitle: 'Explore loans and subsidies.', screen: 'UPI',
  },
  {
    id: 'rental-system',
    icon: <FontAwesome5 name="car" size={22} color="#fbbf24" />, bg: '#78350f',
    title: 'Rental System', subtitle: 'Rent farm equipment nearby.', screen: 'RentalScreen',
  },
  {
    id: 'document-builder',
    icon: <MaterialCommunityIcons name="file-document-outline" size={24} color="#38bdf8" />, bg: '#0e7490',
    title: 'Document Builder', subtitle: 'Create legal & sales papers.', screen: 'DocumentAgentScreen',
  },
];

export default function Featured({ navigation }) {
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}> 
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackBtn}>
          <Ionicons name="arrow-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Agri-Suite Features</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {/* Crop Doctor Card */}
        <TouchableOpacity style={styles.cropDoctorCard} activeOpacity={0.9} onPress={() => navigation.navigate('CropDoctor')}>
          <View style={styles.cropDoctorIcon}><MaterialCommunityIcons name="leaf" size={32} color="#22c55e" /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cropDoctorTitle}>Crop Doctor</Text>
            <Text style={styles.cropDoctorSubtitle}>Diagnose crop diseases instantly.</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#64748B" />
        </TouchableOpacity>
        {/* Crop Cycle Card */}
        <TouchableOpacity style={styles.cropDoctorCard} activeOpacity={0.9} onPress={() => navigation.navigate('CropCycle')}>
          <View style={styles.cropDoctorIcon}><MaterialCommunityIcons name="progress-clock" size={32} color="#a78bfa" /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cropDoctorTitle}>Crop Cycle</Text>
            <Text style={styles.cropDoctorSubtitle}>Track growth from seed to harvest.</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#64748B" />
        </TouchableOpacity>
        {/* Weather Card */}
        <TouchableOpacity style={styles.cropDoctorCard} activeOpacity={0.9} onPress={() => navigation.navigate('WeatherScreen')}>
          <View style={styles.cropDoctorIcon}><MaterialCommunityIcons name="weather-partly-cloudy" size={32} color="#3b82f6" /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cropDoctorTitle}>Weather</Text>
            <Text style={styles.cropDoctorSubtitle}>See live weather & forecast</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#64748B" />
        </TouchableOpacity>
        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsRow}>
          <TouchableOpacity style={styles.quickActionCard} onPress={() => navigation.navigate('MarketplaceScreen')}>
            <MaterialCommunityIcons name="trending-up" size={28} color="#60a5fa" />
            <Text style={styles.quickActionText}>Market Prices</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionCard} onPress={() => navigation.navigate('CalenderScreen')}>
            <MaterialCommunityIcons name="calendar" size={28} color="#f472b6" />
            <Text style={styles.quickActionText}>Farming Calendar</Text>
          </TouchableOpacity>
        </View>
        {/* All Farming Tools */}
        <Text style={styles.sectionTitle}>All Farming Tools</Text>
        <View style={styles.toolsList}>
          {tools.map(tool => (
            <TouchableOpacity key={tool.id} style={styles.toolCard} onPress={() => navigation.navigate(tool.screen)}>
              <View style={[styles.toolIcon, { backgroundColor: tool.bg }]}>{tool.icon}</View>
              <View style={{ flex: 1 }}>
                <Text style={styles.toolTitle}>{tool.title}</Text>
                <Text style={styles.toolSubtitle}>{tool.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color="#64748B" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 10,
    marginBottom: 10,
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#18181b',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  cropDoctorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderRadius: 18,
    padding: 18,
    marginHorizontal: 16,
    marginBottom: 18,
    marginTop: 8,
    shadowColor: '#22c55e',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  cropDoctorIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#22c55e20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cropDoctorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  cropDoctorSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 2,
  },
  sectionTitle: {
    color: '#a1a1aa',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 18,
    marginBottom: 8,
    marginTop: 10,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 18,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: '#18181b',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 22,
    marginHorizontal: 6,
    shadowColor: '#fff',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  quickActionText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 8,
  },
  toolsList: {
    marginHorizontal: 10,
    marginTop: 2,
  },
  toolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#fff',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  toolIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  toolTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  toolSubtitle: {
    color: '#a1a1aa',
    fontSize: 13,
    marginTop: 2,
  },
});
