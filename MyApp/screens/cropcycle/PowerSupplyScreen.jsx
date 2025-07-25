import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView } from 'react-native';

const PowerSupplyScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.header}>⚡ Energy Independence</Text>
        <Text style={styles.subheader}>Step-by-step subsidy acquisition guide</Text>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Solar Transition Plan</Text>
          <Text style={styles.bullet}>• Calculate your power requirements: Irrigation pump (5-10 HP), lighting (2-3 kW), processing equipment</Text>
          <Text style={styles.bullet}>• Solar system sizing: For 10 HP pump + 3kW lighting = 15kW solar system needed</Text>
          <Text style={styles.bullet}>• Apply for PM-KUSUM Scheme: Up to 60% subsidy on solar pumps</Text>
          <Text style={styles.bullet}>• Contact empaneled vendors: Get quotes from government-approved suppliers</Text>
          <Text style={styles.bullet}>• Submit application with land documents and electricity bill</Text>
          <Text style={styles.bullet}>• Install system with certified technicians</Text>
          <Text style={styles.bullet}>• Connect net metering for excess power sale back to grid</Text>
          <Text style={styles.bullet}>• Expected payback period: 4-5 years with subsidies</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subsidy</Text>
          <Text style={styles.sectionText}>Government provides 60% subsidy + 30% bank loan at 7% interest</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Timeline</Text>
          <Text style={styles.sectionText}>3-4 months from application to installation</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scrollContainer: { padding: 24 },
  header: { fontSize: 28, fontWeight: 'bold', color: '#FF9800', marginBottom: 8 },
  subheader: { fontSize: 16, color: '#aaa', marginBottom: 24 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  sectionText: { fontSize: 15, color: '#ccc', marginBottom: 4 },
  bullet: { fontSize: 15, color: '#ccc', marginLeft: 12, marginBottom: 2 },
});

export default PowerSupplyScreen; 