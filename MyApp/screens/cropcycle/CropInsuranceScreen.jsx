import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView } from 'react-native';

const CropInsuranceScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.header}>🛡️ Risk Shield</Text>
        <Text style={styles.subheader}>Multi-layer insurance optimization plan</Text>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Comprehensive Risk Shield</Text>
          <Text style={styles.bullet}>• Enroll in Pradhan Mantri Fasal Bima Yojana (PMFBY)</Text>
          <Text style={styles.bullet}>• Premium: Only 2% for Kharif, 1.5% for Rabi crops</Text>
          <Text style={styles.bullet}>• Coverage: Full sum insured against natural calamities</Text>
          <Text style={styles.bullet}>• Weather-based insurance for specific risks (drought, excess rain)</Text>
          <Text style={styles.bullet}>• Private insurance for high-value crops and equipment</Text>
          <Text style={styles.bullet}>• Maintain proper crop cutting experiments participation</Text>
          <Text style={styles.bullet}>• Document all farming activities with photos/videos</Text>
          <Text style={styles.bullet}>• Quick claim settlement through satellite monitoring</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subsidy</Text>
          <Text style={styles.sectionText}>Government pays 95%+ of insurance premium</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Timeline</Text>
          <Text style={styles.sectionText}>Enroll within 15 days of sowing</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scrollContainer: { padding: 24 },
  header: { fontSize: 28, fontWeight: 'bold', color: '#9C27B0', marginBottom: 8 },
  subheader: { fontSize: 16, color: '#aaa', marginBottom: 24 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  sectionText: { fontSize: 15, color: '#ccc', marginBottom: 4 },
  bullet: { fontSize: 15, color: '#ccc', marginLeft: 12, marginBottom: 2 },
});

export default CropInsuranceScreen; 