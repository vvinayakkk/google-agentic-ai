import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

const FARMER_ID = 'f001';

const tools = [
  {
    id: 'cattle-care',
    icon: <MaterialCommunityIcons name="paw" size={24} color="#f59e42" />, bg: '#78350f',
    titleKey: 'featured.cattle_care', subtitleKey: 'featured.cattle_care_subtitle', screen: 'CattleScreen',
  },
  {
    id: 'agrifinance',
    icon: <MaterialCommunityIcons name="wallet-outline" size={24} color="#6366f1" />, bg: '#1e40af',
    titleKey: 'featured.agrifinance', subtitleKey: 'featured.agrifinance_subtitle', screen: 'UPI',
  },
  {
    id: 'rental-system',
    icon: <FontAwesome5 name="car" size={22} color="#fbbf24" />, bg: '#78350f',
    titleKey: 'featured.rental_system', subtitleKey: 'featured.rental_system_subtitle', screen: 'RentalScreen',
  },
  {
    id: 'document-builder',
    icon: <MaterialCommunityIcons name="file-document-outline" size={24} color="#38bdf8" />, bg: '#0e7490',
    titleKey: 'featured.document_builder', subtitleKey: 'featured.document_builder_subtitle', screen: 'DocumentAgentScreen',
  },
];

export default function Featured({ navigation }) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}> 
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackBtn}>
          <Ionicons name="arrow-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('featured.title')}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('FarmerProfile', { farmerId: FARMER_ID })} style={{ marginLeft: 'auto', marginRight: 2 }}>
          <Ionicons name="person-circle-outline" size={45} color="#10B981" />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {/* Crop Doctor Card */}
        <TouchableOpacity style={styles.cropDoctorCard} activeOpacity={0.9} onPress={() => navigation.navigate('CropDoctor')}>
          <View style={styles.cropDoctorIcon}><MaterialCommunityIcons name="leaf" size={32} color="#22c55e" /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cropDoctorTitle}>{t('featured.crop_doctor')}</Text>
            <Text style={styles.cropDoctorSubtitle}>{t('featured.crop_doctor_subtitle')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#64748B" />
        </TouchableOpacity>
        {/* Crop Cycle Card */}
        <TouchableOpacity style={styles.cropDoctorCard} activeOpacity={0.9} onPress={() => navigation.navigate('CropCycle')}>
          <View style={styles.cropDoctorIcon}><MaterialCommunityIcons name="progress-clock" size={32} color="#a78bfa" /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cropDoctorTitle}>{t('featured.crop_cycle')}</Text>
            <Text style={styles.cropDoctorSubtitle}>{t('featured.crop_cycle_subtitle')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#64748B" />
        </TouchableOpacity>
        {/* Weather Card */}
        <TouchableOpacity style={styles.cropDoctorCard} activeOpacity={0.9} onPress={() => navigation.navigate('WeatherScreen')}>
          <View style={styles.cropDoctorIcon}><MaterialCommunityIcons name="weather-partly-cloudy" size={32} color="#3b82f6" /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cropDoctorTitle}>{t('featured.weather')}</Text>
            <Text style={styles.cropDoctorSubtitle}>{t('featured.weather_subtitle')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#64748B" />
        </TouchableOpacity>
        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>{t('featured.quick_actions')}</Text>
        <View style={styles.quickActionsRow}>
          <TouchableOpacity style={styles.quickActionCard} onPress={() => navigation.navigate('MarketplaceScreen')}>
            <MaterialCommunityIcons name="trending-up" size={28} color="#60a5fa" />
            <Text style={styles.quickActionText}>{t('featured.market_prices')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionCard} onPress={() => navigation.navigate('CalenderScreen')}>
            <MaterialCommunityIcons name="calendar" size={28} color="#f472b6" />
            <Text style={styles.quickActionText}>{t('featured.farming_calendar')}</Text>
          </TouchableOpacity>
        </View>
        {/* All Farming Tools */}
        <Text style={styles.sectionTitle}>{t('featured.all_tools')}</Text>
        <View style={styles.toolsList}>
          {tools.map(tool => (
            <TouchableOpacity key={tool.id} style={styles.toolCard} onPress={() => navigation.navigate(tool.screen)}>
              <View style={[styles.toolIcon, { backgroundColor: tool.bg }]}>{tool.icon}</View>
              <View style={{ flex: 1 }}>
                <Text style={styles.toolTitle}>{t(tool.titleKey)}</Text>
                <Text style={styles.toolSubtitle}>{t(tool.subtitleKey)}</Text>
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
