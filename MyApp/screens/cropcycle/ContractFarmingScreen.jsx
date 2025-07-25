import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView } from 'react-native';

const Card = ({ title, children, accent }) => (
  <View style={[styles.card, accent ? { borderLeftColor: accent } : {}]}>
    {title && <Text style={styles.cardTitle}>{title}</Text>}
    {children}
  </View>
);

const ContractFarmingScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.header}>🤝 Corporate Partnerships</Text>
        <Text style={styles.subheader}>Contract negotiation & partnership roadmap</Text>
        <Card title="Corporate Partnership Roadmap" accent="#2196F3">
          <View style={styles.suggestionList}>
            <View style={styles.suggestionCard}><Text style={styles.suggestionText}>Register on agri-business platforms: ITC e-Choupal, Reliance Fresh Direct</Text></View>
            <View style={styles.suggestionCard}><Text style={styles.suggestionText}>Obtain quality certifications: Organic, GlobalGAP, FSSAI</Text></View>
            <View style={styles.suggestionCard}><Text style={styles.suggestionText}>Form/join farmer collectives for volume aggregation</Text></View>
            <View style={styles.suggestionCard}><Text style={styles.suggestionText}>Participate in corporate buyer meets organized by government</Text></View>
            <View style={styles.suggestionCard}><Text style={styles.suggestionText}>Develop traceability systems for crop tracking</Text></View>
            <View style={styles.suggestionCard}><Text style={styles.suggestionText}>Negotiate forward contracts with price floors</Text></View>
            <View style={styles.suggestionCard}><Text style={styles.suggestionText}>Ensure consistent quality and delivery schedules</Text></View>
            <View style={styles.suggestionCard}><Text style={styles.suggestionText}>Build long-term relationships through reliable supply</Text></View>
          </View>
        </Card>
        <Card title="Subsidy" accent="#43e97b">
          <Text style={styles.sectionText}>FPO formation grants and quality certification support</Text>
        </Card>
        <Card title="Timeline" accent="#FFC107">
          <Text style={styles.sectionText}>6-12 months to establish partnerships</Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scrollContainer: { padding: 24 },
  header: { fontSize: 28, fontWeight: 'bold', color: '#2196F3', marginBottom: 8 },
  subheader: { fontSize: 16, color: '#aaa', marginBottom: 24 },
  card: { backgroundColor: '#181818', borderRadius: 14, padding: 18, marginBottom: 18, borderLeftWidth: 5, borderLeftColor: '#333', shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 8, elevation: 2 },
  cardTitle: { fontSize: 17, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  sectionText: { fontSize: 15, color: '#ccc', marginBottom: 4 },
  suggestionList: { marginTop: 4 },
  suggestionCard: { backgroundColor: '#232323', borderRadius: 8, padding: 12, marginBottom: 8 },
  suggestionText: { color: '#B0D6FF', fontSize: 15 },
});

export default ContractFarmingScreen; 