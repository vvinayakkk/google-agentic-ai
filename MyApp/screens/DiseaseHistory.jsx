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
import Svg, { Path, G, Circle } from 'react-native-svg';

// --- Theme & Design System (as requested, in one file) ---
const theme = {
  colors: {
    primaryGreen: '#4CAF50',
    secondaryGreen: '#66BB6A',
    darkGreen: '#2E7D32',
    lightGreen: '#A5D6A7', // A lighter green for variation
    skyBlue: '#2196F3',
    lightBlue: '#64B5F6',
    orange: '#FF9800',
    red: '#F44336',
    gray: '#9E9E9E',
    lightGray: '#F5F5F5',
    white: '#FFFFFF',
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

// --- MOCK DATA (Using Green Theme) ---
const diseaseData = [
  { id: '1', name: 'Cedar Apple Rust', description: 'Cedar apple rust is a fungal disease that alternates bet...', savedCount: 2, image: 'https://placehold.co/80x80/A5D6A7/2E7D32?text=Plant', color: theme.colors.lightGreen },
  { id: '2', name: 'Early Blight', description: 'Early blight is a widespread fungal disease affecting po...', savedCount: 6, image: 'https://placehold.co/80x80/4CAF50/FFFFFF?text=Plant', color: theme.colors.primaryGreen },
  { id: '3', name: 'Late Blight', description: 'Late blight is one of the most devastating diseases ...', savedCount: 4, image: 'https://placehold.co/80x80/66BB6A/FFFFFF?text=Plant', color: theme.colors.secondaryGreen },
  { id: '4', name: 'Target Spot', description: 'Target spot is a destructive fungal disease that...', savedCount: 2, image: 'https://placehold.co/80x80/2E7D32/FFFFFF?text=Plant', color: theme.colors.darkGreen },
];


// --- Reusable Components ---
const ToggleButton = ({ icon, label, active, onPress }) => (
  <TouchableOpacity style={[styles.toggleButton, active && styles.toggleButtonActive]} onPress={onPress}>
    <Feather name={icon} size={20} color={active ? theme.colors.white : theme.colors.primaryGreen} />
    <Text style={[styles.toggleButtonText, active && styles.toggleButtonTextActive]}>{label}</Text>
  </TouchableOpacity>
);

const SectionHeader = ({ icon, title }) => (
    <View style={styles.sectionHeaderContainer}>
        <Feather name={icon} size={22} color={theme.colors.darkGreen} />
        <Text style={styles.sectionTitle}>{title}</Text>
    </View>
);


// --- View Components ---

const ListView = ({ data }) => (
  <View>
    <View style={styles.listHeader}>
        <SectionHeader icon="menu" title="Your Disease Records" />
        <View style={styles.recordCount}>
            <Text style={styles.recordCountText}>{data.length} Records</Text>
        </View>
    </View>
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={[styles.diseaseCard, { borderLeftColor: item.color, borderLeftWidth: 5 }]}>
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
    const average = totalOccurrences / data.length;
    const maxValue = Math.max(...data.map(item => item.savedCount));

    return (
        <View>
            <SectionHeader icon="bar-chart-2" title="Disease Frequency" />
            <Text style={styles.sectionSubtitle}>Visualize the most common diseases in your farm</Text>
            <Text style={styles.instructionText}>Tap on a bar to see more details</Text>
            <View style={styles.summaryCard}>
                <View style={[styles.summaryItem, { flex: 1.2 }]}>
                    <Text style={styles.summaryLabel}>TOTAL OCCURRENCES</Text>
                    <Text style={styles.summaryValueLg}>{totalOccurrences}</Text>
                    <Text style={styles.summaryLabel}>times</Text>
                    <Feather name="trending-up" size={24} color={theme.colors.primaryGreen} style={{ marginTop: 8, opacity: 0.5 }} />
                </View>
                <View style={styles.summaryDivider} />
                <View style={[styles.summaryItem, { flex: 2 }]}>
                    <View style={styles.summaryDetailRow}>
                        <Text style={styles.summaryLabel}>MOST COMM.</Text>
                        <Text style={styles.summaryValue}>{mostCommon.name}</Text>
                        <Text style={styles.summarySubValue}>{mostCommon.savedCount} times</Text>
                    </View>
                    <View style={styles.summaryDetailRow}>
                        <Text style={styles.summaryLabel}>AVERAGE</Text>
                        <Text style={styles.summaryValue}>{average.toFixed(1)}</Text>
                        <Text style={styles.summarySubValue}>per disease</Text>
                    </View>
                </View>
            </View>
            <View style={styles.barChartContainer}>
                {data.map((item, index) => (
                    <View key={item.id} style={styles.barRow}>
                        <Text style={styles.barIndex}>{index + 1}</Text>
                        <Text style={styles.barLabel}>{item.name}</Text>
                        <View style={styles.barWrapper}>
                            <View style={[styles.bar, { width: `${(item.savedCount / maxValue) * 100}%`, backgroundColor: item.color }]} />
                        </View>
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
            <SectionHeader icon="pie-chart" title="Disease Distribution" />
            <Text style={styles.sectionSubtitle}>Percentage breakdown of diseases in your farm</Text>
            <View style={styles.pieChartContainer}>
                <Svg height="220" width="220" viewBox="-1.1 -1.1 2.2 2.2">
                    <G rotation="-90">
                        {slices.map((slice, index) => <Path key={index} d={slice.path} fill={slice.color} />)}
                    </G>
                    <Circle cx="0" cy="0" r="0.65" fill={theme.colors.lightGray} />
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
        <View style={styles.header}>
            <Text style={styles.headerTitle}>Disease History</Text>
            <Text style={styles.headerSubtitle}>Track your plant health over time</Text>
        </View>
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
  header: { alignItems: 'center', marginVertical: theme.spacing.medium },
  // For an exact match to the screenshot, you might need to load a custom font.
  // 'serif' with a heavy weight is a close approximation.
  headerTitle: { ...theme.typography.headingMedium, color: theme.colors.darkGreen, fontFamily: 'serif', fontWeight: '700' },
  headerSubtitle: { ...theme.typography.bodyMedium, color: theme.colors.gray, marginTop: 4 },
  toggleContainer: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: theme.colors.white, borderRadius: theme.components.button.borderRadius, padding: 4, marginBottom: theme.spacing.large },
  toggleButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: theme.spacing.small, borderRadius: theme.components.button.borderRadius },
  toggleButtonActive: { backgroundColor: theme.colors.primaryGreen, shadowColor: theme.colors.primaryGreen, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },
  toggleButtonText: { ...theme.typography.bodyMedium, color: theme.colors.primaryGreen, marginLeft: theme.spacing.small },
  toggleButtonTextActive: { color: theme.colors.white, fontWeight: 'bold' },
  sectionHeaderContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.small, },
  sectionTitle: { ...theme.typography.headingSmall, color: theme.colors.darkGreen, marginLeft: theme.spacing.small },
  sectionSubtitle: { ...theme.typography.bodyMedium, color: theme.colors.gray, marginBottom: theme.spacing.small, marginLeft: 32 },
  instructionText: { ...theme.typography.bodySmall, color: theme.colors.gray, marginBottom: theme.spacing.medium, marginLeft: 32 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.medium },
  recordCount: { backgroundColor: theme.colors.secondaryGreen, paddingHorizontal: theme.spacing.medium, paddingVertical: 4, borderRadius: 15 },
  recordCountText: { ...theme.typography.bodySmall, color: theme.colors.white, fontWeight: 'bold' },
  diseaseCard: { flexDirection: 'row', backgroundColor: theme.colors.white, borderRadius: theme.components.card.borderRadius, padding: theme.spacing.medium, marginBottom: theme.spacing.medium, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 5, elevation: 2 },
  diseaseImage: { width: 60, height: 60, borderRadius: theme.components.card.borderRadius },
  diseaseInfo: { flex: 1, marginLeft: theme.spacing.medium, justifyContent: 'center' },
  diseaseName: { ...theme.typography.bodyLarge, fontWeight: 'bold', color: theme.colors.darkGreen },
  diseaseDescription: { ...theme.typography.bodyMedium, color: theme.colors.gray, marginVertical: 4 },
  diseaseSavedCount: { ...theme.typography.bodySmall, color: theme.colors.primaryGreen, fontWeight: 'bold', marginTop: 4 },
  summaryCard: { flexDirection: 'row', backgroundColor: theme.colors.white, borderRadius: theme.components.card.borderRadius, padding: theme.spacing.medium, marginBottom: theme.spacing.large, alignItems: 'stretch' },
  summaryItem: { alignItems: 'center', justifyContent: 'space-around' },
  summaryLabel: { ...theme.typography.caption, color: theme.colors.gray, textTransform: 'uppercase' },
  summaryValue: { ...theme.typography.bodyLarge, fontWeight: 'bold', color: theme.colors.darkGreen },
  summaryValueLg: { ...theme.typography.headingLarge, color: theme.colors.darkGreen },
  summarySubValue: { ...theme.typography.bodySmall, color: theme.colors.gray },
  summaryDivider: { width: 1, backgroundColor: theme.colors.lightGray, marginHorizontal: theme.spacing.small },
  summaryDetailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: theme.spacing.small },
  barChartContainer: { backgroundColor: theme.colors.white, borderRadius: theme.components.card.borderRadius, padding: theme.spacing.medium, paddingTop: theme.spacing.large },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.large },
  barIndex: { ...theme.typography.bodyMedium, color: theme.colors.gray, marginRight: theme.spacing.small },
  barLabel: { width: '30%', ...theme.typography.bodyMedium, color: theme.colors.darkGreen },
  barWrapper: { flex: 1, height: 12, backgroundColor: theme.colors.lightGray, borderRadius: 6, marginHorizontal: theme.spacing.small, overflow: 'hidden' },
  bar: { height: '100%', borderRadius: 6 },
  barValue: { ...theme.typography.bodyMedium, fontWeight: 'bold', color: theme.colors.darkGreen, width: 20, textAlign: 'right' },
  pieChartContainer: { alignItems: 'center', justifyContent: 'center', marginVertical: theme.spacing.medium },
  pieChartCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  pieChartCenterText: { ...theme.typography.headingLarge, color: theme.colors.darkGreen },
  pieChartCenterLabel: { ...theme.typography.bodyMedium, color: theme.colors.gray },
  legendContainer: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: theme.colors.white, borderRadius: theme.components.card.borderRadius, paddingVertical: theme.spacing.small, paddingHorizontal: theme.spacing.medium, marginTop: theme.spacing.large },
  legendItem: { flexDirection: 'row', alignItems: 'center', width: '50%', paddingVertical: theme.spacing.small },
  legendColor: { width: 16, height: 16, borderRadius: 8, marginRight: theme.spacing.small },
  legendText: { flex: 1, ...theme.typography.bodyMedium, color: theme.colors.darkGreen },
  legendValue: { ...theme.typography.bodyMedium, fontWeight: 'bold', color: theme.colors.darkGreen, marginLeft: theme.spacing.small },
});

export default DiseaseHistoryScreen;
