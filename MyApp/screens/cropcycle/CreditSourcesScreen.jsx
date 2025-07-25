import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView } from 'react-native';

const CreditSourcesScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.header}>💎 Smart Financing</Text>
        <Text style={styles.subheader}>Financial engineering for farmers</Text>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Smart Financing Strategy</Text>
          <Text style={styles.bullet}>• Kisan Credit Card: Up to ₹3 lakh at 7% interest (with subsidy)</Text>
          <Text style={styles.bullet}>• Mudra loans: Up to ₹10 lakh for agri-allied activities</Text>
          <Text style={styles.bullet}>• FPO loans: Cheaper rates through collective borrowing</Text>
          <Text style={styles.bullet}>• Equipment financing: Tractor loans at 9-10% interest</Text>
          <Text style={styles.bullet}>• Input financing: Seed, fertilizer purchase on credit</Text>
          <Text style={styles.bullet}>• Warehouse receipt financing: Pledge stored crop for loans</Text>
          <Text style={styles.bullet}>• Digital lending platforms: Quick approval for short-term needs</Text>
          <Text style={styles.bullet}>• Maintain good credit score through timely repayments</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subsidy</Text>
          <Text style={styles.sectionText}>Interest subvention up to 3% on crop loans</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Timeline</Text>
          <Text style={styles.sectionText}>KCC can be processed in 7-14 days</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scrollContainer: { padding: 24 },
  header: { fontSize: 28, fontWeight: 'bold', color: '#00BCD4', marginBottom: 8 },
  subheader: { fontSize: 16, color: '#aaa', marginBottom: 24 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  sectionText: { fontSize: 15, color: '#ccc', marginBottom: 4 },
  bullet: { fontSize: 15, color: '#ccc', marginLeft: 12, marginBottom: 2 },
});

export default CreditSourcesScreen; 