import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Svg, { Path, G, Text as SvgText } from 'react-native-svg';

// --- Theme & Design System (as requested, in one file) ---
const theme = {
  colors: {
    primaryGreen: '#4CAF50',
    secondaryGreen: '#66BB6A',
    darkGreen: '#2E7D32',
    skyBlue: '#2196F3',
    lightBlue: '#64B5F6',
    orange: '#FF9800',
    red: '#F44336',
    gray: '#9E9E9E',
    lightGray: '#F5F5F5',
    white: '#FFFFFF',
    infoCardBg: '#E3F2FD',
    infoCardBorder: '#2196F3',
    warningCardBg: '#FFF3E0',
    warningCardBorder: '#FF9800',
  },
  typography: {
    fontFamily: 'System',
    headingLarge: { fontSize: 28, fontWeight: 'bold' },
    headingMedium: { fontSize: 24, fontWeight: 'bold' },
    headingSmall: { fontSize: 20, fontWeight: 'bold' },
    bodyLarge: { fontSize: 16, fontWeight: 'normal' },
    bodyMedium: { fontSize: 14, fontWeight: 'normal' },
    bodySmall: { fontSize: 12, fontWeight: 'normal' },
    caption: { fontSize: 10, fontWeight: 'normal' },
  },
  spacing: {
    small: 8,
    medium: 16,
    large: 24,
    extraLarge: 32,
  },
  layout: {
    horizontalPadding: 20,
    verticalPadding: 16,
  },
  components: {
    button: { borderRadius: 25 },
    card: { borderRadius: 12 },
  },
};

// --- MOCK DATA ---
const diseaseData = [
  { id: '1', name: 'Cedar Apple Rust', description: 'Cedar apple rust is a fungal disease that alternates bet...', savedCount: 2, image: 'https://placehold.co/80x80/A9DFBF/2E7D32?text=Plant', color: '#F39C12' },
  { id: '2', name: 'Early Blight', description: 'Early blight is a widespread fungal disease affecting po...', savedCount: 6, image: 'https://placehold.co/80x80/F5B7B1/2E7D32?text=Plant', color: '#E74C3C' },
  { id: '3', name: 'Late Blight', description: 'Late blight is one of the most devastating diseases ...', savedCount: 4, image: 'https://placehold.co/80x80/D2B4DE/2E7D32?text=Plant', color: '#8E44AD' },
  { id: '4', name: 'Target Spot', description: 'Target spot is a destructive fungal disease that...', savedCount: 2, image: 'https://placehold.co/80x80/AED6F1/2E7D32?text=Plant', color: '#3498DB' },
];

// --- Reusable Components ---
const ToggleButton = ({ icon, label, active, onPress }) => (
  <TouchableOpacity style={[styles.toggleButton, active && styles.toggleButtonActive]} onPress={onPress}>
    <Feather name={icon} size={20} color={active ? theme.colors.white : theme.colors.primaryGreen} />
    <Text style={[styles.toggleButtonText, active && styles.toggleButtonTextActive]}>{label}</Text>
  </TouchableOpacity>
);

// --- View Components ---

const ListView = ({ data }) => (
  <View>
    <View style={styles.listHeader}>
      <Text style={styles.sectionTitle}>Your Disease Records</Text>
      <View style={styles.recordCount}>
        <Text style={styles.recordCountText}>{data.length} Records</Text>
      </View>
    </View>
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.diseaseCard}>
          <Image source={{ uri: item.image }} style={styles.diseaseImage} />
          <View style={styles.diseaseInfo}>
            <Text style={styles.diseaseName}>{item.name}</Text>
            <Text style={styles.diseaseDescription} numberOfLines={2}>{item.description}</Text>
            <Text style={styles.diseaseSavedCount}>Saved {item.savedCount} times</Text>
          </View>
        </View>
      )}
      scrollEnabled={false}
    />
  </View>
);

const BarChartView = ({ data }) => {
    const totalOccurrences = data.reduce((sum, item) => sum + item.savedCount, 0);
    const mostCommon = data.reduce((prev, current) => (prev.savedCount > current.savedCount) ? prev : current);
    const maxValue = Math.max(...data.map(item => item.savedCount));

    return (
        <View>
            <Text style={styles.sectionTitle}>Disease Frequency</Text>
            <Text style={styles.sectionSubtitle}>Visualize the most common diseases in your farm</Text>
            <View style={styles.summaryCard}>
                <View style={styles.summaryItem}><Text style={styles.summaryLabel}>TOTAL OCCURRENCES</Text><Text style={styles.summaryValue}>{totalOccurrences}</Text></View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}><Text style={styles.summaryLabel}>MOST COMMON</Text><Text style={styles.summaryValue}>{mostCommon.name}</Text><Text style={styles.summarySubValue}>{mostCommon.savedCount} times</Text></View>
            </View>
            <View style={styles.barChartContainer}>
                {data.map(item => (
                    <View key={item.id} style={styles.barRow}>
                        <Text style={styles.barLabel}>{item.name}</Text>
                        <View style={styles.barWrapper}><View style={[styles.bar, { width: `${(item.savedCount / maxValue) * 100}%`, backgroundColor: item.color }]} /></View>
                        <Text style={styles.barValue}>{item.savedCount}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
};

const PieChartView = ({ data }) => {
    const total = data.reduce((sum, item) => sum + item.savedCount, 0);
    const mostCommon = data.reduce((prev, current) => (prev.savedCount > current.savedCount) ? prev : current);

    const getCoordinatesForPercent = (percent) => [Math.cos(2 * Math.PI * percent), Math.sin(2 * Math.PI * percent)];

    let cumulativePercent = 0;
    const slices = data.map(item => {
        const percent = item.savedCount / total;
        const [startX, startY] = getCoordinatesForPercent(cumulativePercent);
        cumulativePercent += percent;
        const [endX, endY] = getCoordinatesForPercent(cumulativePercent);
        const largeArcFlag = percent > 0.5 ? 1 : 0;
        const pathData = `M ${startX} ${startY} A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY} L 0 0`;
        return { path: pathData, color: item.color };
    });

    return (
        <View>
            <Text style={styles.sectionTitle}>Disease Distribution</Text>
            <Text style={styles.sectionSubtitle}>Percentage breakdown of diseases in your farm</Text>
            <View style={styles.pieChartContainer}>
                <Svg height="220" width="220" viewBox="-1.1 -1.1 2.2 2.2">
                    <G rotation="-90">
                        {slices.map((slice, index) => <Path key={index} d={slice.path} fill={slice.color} />)}
                    </G>
                    <Path d="M 0 0" fill="transparent" />
                </Svg>
                <View style={styles.pieChartCenter}>
                    <Text style={styles.pieChartCenterText}>{`${((mostCommon.savedCount / total) * 100).toFixed(1)}%`}</Text>
                    <Text style={styles.pieChartCenterLabel}>{mostCommon.name}</Text>
                </View>
            </View>
            <View style={styles.legendContainer}>
                {data.map(item => (
                    <View key={item.id} style={styles.legendItem}>
                        <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                        <Text style={styles.legendText}>{item.name}</Text>
                        <Text style={styles.legendValue}>{`${((item.savedCount / total) * 100).toFixed(1)}%`}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
};

// --- Main Screen Component ---
const DiseaseHistoryScreen = () => {
  const [activeView, setActiveView] = useState('List');

  const renderContent = () => {
    switch (activeView) {
      case 'List': return <ListView data={diseaseData} />;
      case 'Bar Chart': return <BarChartView data={diseaseData} />;
      case 'Pie Chart': return <PieChartView data={diseaseData} />;
      default: return <ListView data={diseaseData} />;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}><Text style={styles.headerTitle}>Disease History</Text><Text style={styles.headerSubtitle}>Track your plant health over time</Text></View>
        <View style={styles.toggleContainer}>
          <ToggleButton icon="list" label="List" active={activeView === 'List'} onPress={() => setActiveView('List')} />
          <ToggleButton icon="bar-chart-2" label="Bar Chart" active={activeView === 'Bar Chart'} onPress={() => setActiveView('Bar Chart')} />
          <ToggleButton icon="pie-chart" label="Pie Chart" active={activeView === 'Pie Chart'} onPress={() => setActiveView('Pie Chart')} />
        </View>
        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  );
};

// --- Styles using Theme ---
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.lightGray },
  container: { flex: 1, paddingHorizontal: theme.layout.horizontalPadding },
  header: { alignItems: 'center', marginVertical: theme.spacing.large },
  headerTitle: { ...theme.typography.headingMedium, color: theme.colors.darkGreen, fontFamily: 'serif', fontWeight: '700' },
  headerSubtitle: { ...theme.typography.bodyMedium, color: theme.colors.gray, marginTop: theme.spacing.small / 2 },
  toggleContainer: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: theme.colors.white, borderRadius: theme.components.button.borderRadius, padding: theme.spacing.small / 2, marginBottom: theme.spacing.large },
  toggleButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: theme.spacing.small, borderRadius: theme.components.button.borderRadius },
  toggleButtonActive: { backgroundColor: theme.colors.primaryGreen, shadowColor: theme.colors.primaryGreen, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },
  toggleButtonText: { ...theme.typography.bodyMedium, color: theme.colors.primaryGreen, marginLeft: theme.spacing.small },
  toggleButtonTextActive: { color: theme.colors.white, fontWeight: 'bold' },
  sectionTitle: { ...theme.typography.headingSmall, color: theme.colors.darkGreen, marginBottom: theme.spacing.small },
  sectionSubtitle: { ...theme.typography.bodyMedium, color: theme.colors.gray, marginBottom: theme.spacing.medium },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.medium },
  recordCount: { backgroundColor: theme.colors.secondaryGreen, paddingHorizontal: theme.spacing.medium, paddingVertical: theme.spacing.small / 2, borderRadius: 15 },
  recordCountText: { ...theme.typography.bodySmall, color: theme.colors.white, fontWeight: 'bold' },
  diseaseCard: { flexDirection: 'row', backgroundColor: theme.colors.white, borderRadius: theme.components.card.borderRadius, padding: theme.spacing.medium, marginBottom: theme.spacing.medium, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 5, elevation: 2 },
  diseaseImage: { width: 80, height: 80, borderRadius: theme.components.card.borderRadius },
  diseaseInfo: { flex: 1, marginLeft: theme.spacing.medium, justifyContent: 'center' },
  diseaseName: { ...theme.typography.bodyLarge, fontWeight: 'bold', color: theme.colors.darkGreen },
  diseaseDescription: { ...theme.typography.bodyMedium, color: theme.colors.gray, marginVertical: theme.spacing.small / 2 },
  diseaseSavedCount: { ...theme.typography.bodySmall, color: theme.colors.primaryGreen, fontWeight: 'bold', marginTop: theme.spacing.small },
  summaryCard: { flexDirection: 'row', backgroundColor: theme.colors.white, borderRadius: theme.components.card.borderRadius, padding: theme.spacing.medium, marginBottom: theme.spacing.large, alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { ...theme.typography.bodySmall, color: theme.colors.gray, marginBottom: 4 },
  summaryValue: { ...theme.typography.headingSmall, color: theme.colors.darkGreen },
  summarySubValue: { ...theme.typography.bodySmall, color: theme.colors.gray },
  summaryDivider: { width: 1, height: '80%', backgroundColor: theme.colors.lightGray },
  barChartContainer: { backgroundColor: theme.colors.white, borderRadius: theme.components.card.borderRadius, padding: theme.spacing.medium },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.medium },
  barLabel: { width: '30%', ...theme.typography.bodyMedium, color: theme.colors.darkGreen },
  barWrapper: { flex: 1, height: 20, backgroundColor: theme.colors.lightGray, borderRadius: 10, marginHorizontal: theme.spacing.small, overflow: 'hidden' },
  bar: { height: '100%', borderRadius: 10 },
  barValue: { ...theme.typography.bodyMedium, fontWeight: 'bold', color: theme.colors.darkGreen },
  pieChartContainer: { alignItems: 'center', justifyContent: 'center', marginVertical: theme.spacing.medium },
  pieChartCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  pieChartCenterText: { ...theme.typography.headingLarge, color: theme.colors.darkGreen },
  pieChartCenterLabel: { ...theme.typography.bodyMedium, color: theme.colors.gray },
  legendContainer: { backgroundColor: theme.colors.white, borderRadius: theme.components.card.borderRadius, padding: theme.spacing.medium, marginTop: theme.spacing.large },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.medium },
  legendColor: { width: 16, height: 16, borderRadius: 8, marginRight: theme.spacing.medium },
  legendText: { flex: 1, ...theme.typography.bodyMedium, color: theme.colors.darkGreen },
  legendValue: { ...theme.typography.bodyMedium, fontWeight: 'bold', color: theme.colors.darkGreen },
});

export default DiseaseHistoryScreen;
