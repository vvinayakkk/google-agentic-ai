import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView } from 'react-native';

const Card = ({ title, children, accent }) => (
  <View style={[styles.card, accent ? { borderLeftColor: accent } : {}]}>
    {title && <Text style={styles.cardTitle}>{title}</Text>}
    {children}
  </View>
);

const CropInsuranceScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.header}>🛡️ Risk Shield</Text>
        <Text style={styles.subheader}>Multi-layer insurance optimization plan</Text>
        <Card title="Comprehensive Risk Shield" accent="#9C27B0">
          <View style={styles.suggestionList}>
            <View style={styles.suggestionCard}><Text style={styles.suggestionText}>Enroll in Pradhan Mantri Fasal Bima Yojana (PMFBY)</Text></View>
            <View style={styles.suggestionCard}><Text style={styles.suggestionText}>Premium: Only 2% for Kharif, 1.5% for Rabi crops</Text></View>
            <View style={styles.suggestionCard}><Text style={styles.suggestionText}>Coverage: Full sum insured against natural calamities</Text></View>
            <View style={styles.suggestionCard}><Text style={styles.suggestionText}>Weather-based insurance for specific risks (drought, excess rain)</Text></View>
            <View style={styles.suggestionCard}><Text style={styles.suggestionText}>Private insurance for high-value crops and equipment</Text></View>
            <View style={styles.suggestionCard}><Text style={styles.suggestionText}>Maintain proper crop cutting experiments participation</Text></View>
            <View style={styles.suggestionCard}><Text style={styles.suggestionText}>Document all farming activities with photos/videos</Text></View>
            <View style={styles.suggestionCard}><Text style={styles.suggestionText}>Quick claim settlement through satellite monitoring</Text></View>
          </View>
        </Card>
        <Card title="Subsidy" accent="#43e97b">
          <Text style={styles.sectionText}>Government pays 95%+ of insurance premium</Text>
        </Card>
        <Card title="Timeline" accent="#FFC107">
          <Text style={styles.sectionText}>Enroll within 15 days of sowing</Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scrollContainer: { padding: 24 },
  header: { fontSize: 28, fontWeight: 'bold', color: '#9C27B0', marginBottom: 8 },
  subheader: { fontSize: 16, color: '#aaa', marginBottom: 24 },
  card: { backgroundColor: '#181818', borderRadius: 14, padding: 18, marginBottom: 18, borderLeftWidth: 5, borderLeftColor: '#333', shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: 17, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  sectionText: { fontSize: 15, color: '#ccc', marginBottom: 4 },
  suggestionList: { marginTop: 4 },
  suggestionCard: { backgroundColor: '#232323', borderRadius: 8, padding: 12, marginBottom: 8 },
  suggestionText: { color: '#E1B0FF', fontSize: 15 },
});

export default CropInsuranceScreen; 