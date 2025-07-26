import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView } from 'react-native';

const Card = ({ title, children, accent }) => (
  <View style={[styles.card, accent ? { borderLeftColor: accent } : {}]}>
    {title && <Text style={styles.cardTitle}>{title}</Text>}
    {children}
  </View>
);

const CreditSourcesScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.header}>💎 Smart Financing</Text>
        <Text style={styles.subheader}>Financial engineering for farmers</Text>
        <Card title="Smart Financing Strategy" accent="#00BCD4">
          <View style={styles.suggestionList}>
            <View style={styles.suggestionCard}><Text style={styles.suggestionText}>Kisan Credit Card: Up to ₹3 lakh at 7% interest (with subsidy)</Text></View>
            <View style={styles.suggestionCard}><Text style={styles.suggestionText}>Mudra loans: Up to ₹10 lakh for agri-allied activities</Text></View>
            <View style={styles.suggestionCard}><Text style={styles.suggestionText}>FPO loans: Cheaper rates through collective borrowing</Text></View>
            <View style={styles.suggestionCard}><Text style={styles.suggestionText}>Equipment financing: Tractor loans at 9-10% interest</Text></View>
            <View style={styles.suggestionCard}><Text style={styles.suggestionText}>Input financing: Seed, fertilizer purchase on credit</Text></View>
            <View style={styles.suggestionCard}><Text style={styles.suggestionText}>Warehouse receipt financing: Pledge stored crop for loans</Text></View>
            <View style={styles.suggestionCard}><Text style={styles.suggestionText}>Digital lending platforms: Quick approval for short-term needs</Text></View>
            <View style={styles.suggestionCard}><Text style={styles.suggestionText}>Maintain good credit score through timely repayments</Text></View>
          </View>
        </Card>
        <Card title="Subsidy" accent="#43e97b">
          <Text style={styles.sectionText}>Interest subvention up to 3% on crop loans</Text>
        </Card>
        <Card title="Timeline" accent="#FFC107">
          <Text style={styles.sectionText}>KCC can be processed in 7-14 days</Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scrollContainer: { padding: 24 },
  header: { fontSize: 28, fontWeight: 'bold', color: '#00BCD4', marginBottom: 8 },
  subheader: { fontSize: 16, color: '#aaa', marginBottom: 24 },
  card: { backgroundColor: '#181818', borderRadius: 14, padding: 18, marginBottom: 18, borderLeftWidth: 5, borderLeftColor: '#333', shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: 17, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  sectionText: { fontSize: 15, color: '#ccc', marginBottom: 4 },
  suggestionList: { marginTop: 4 },
  suggestionCard: { backgroundColor: '#232323', borderRadius: 8, padding: 12, marginBottom: 8 },
  suggestionText: { color: '#B0FFFF', fontSize: 15 },
});

export default CreditSourcesScreen; 