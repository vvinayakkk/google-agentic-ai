import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView } from 'react-native';

const ContractFarmingScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.header}>🤝 Corporate Partnerships</Text>
        <Text style={styles.subheader}>Contract negotiation & partnership roadmap</Text>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Corporate Partnership Roadmap</Text>
          <Text style={styles.bullet}>• Register on agri-business platforms: ITC e-Choupal, Reliance Fresh Direct</Text>
          <Text style={styles.bullet}>• Obtain quality certifications: Organic, GlobalGAP, FSSAI</Text>
          <Text style={styles.bullet}>• Form/join farmer collectives for volume aggregation</Text>
          <Text style={styles.bullet}>• Participate in corporate buyer meets organized by government</Text>
          <Text style={styles.bullet}>• Develop traceability systems for crop tracking</Text>
          <Text style={styles.bullet}>• Negotiate forward contracts with price floors</Text>
          <Text style={styles.bullet}>• Ensure consistent quality and delivery schedules</Text>
          <Text style={styles.bullet}>• Build long-term relationships through reliable supply</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subsidy</Text>
          <Text style={styles.sectionText}>FPO formation grants and quality certification support</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Timeline</Text>
          <Text style={styles.sectionText}>6-12 months to establish partnerships</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scrollContainer: { padding: 24 },
  header: { fontSize: 28, fontWeight: 'bold', color: '#2196F3', marginBottom: 8 },
  subheader: { fontSize: 16, color: '#aaa', marginBottom: 24 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  sectionText: { fontSize: 15, color: '#ccc', marginBottom: 4 },
  bullet: { fontSize: 15, color: '#ccc', marginLeft: 12, marginBottom: 2 },
});

export default ContractFarmingScreen; 