import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  Animated,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Svg, { G, Circle } from 'react-native-svg';
import { Animated as RNAnimated } from 'react-native';
const AnimatedCircle = RNAnimated.createAnimatedComponent(Circle);

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
    { id: '2', name: 'Early Blight', description: 'Early blight is a widespread fungal disease affecting po...', savedCount: 6, image: 'https://placehold.co/80x80/4CAF50/FFFFFF?text=Plant', color: theme.colors.primaryGreen },
    { id: '3', name: 'Late Blight', description: 'Late blight is one of the most devastating diseases ...', savedCount: 4, image: 'https://placehold.co/80x80/66BB6A/FFFFFF?text=Plant', color: theme.colors.secondaryGreen },
    { id: '1', name: 'Cedar Apple Rust', description: 'Cedar apple rust is a fungal disease that alternates bet...', savedCount: 2, image: 'https://placehold.co/80x80/A5D6A7/2E7D32?text=Plant', color: theme.colors.lightGreen },
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


// --- ListView with Animation ---
const AnimatedListItem = ({ children, index }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      delay: index * 80,
      useNativeDriver: true,
    }).start();
  }, [index]);
  return <Animated.View style={{ opacity: fadeAnim }}>{children}</Animated.View>;
};

const ListView = ({ data }) => (
  <View>
    <View style={styles.listHeader}>
        <SectionHeader icon="list" title="Your Disease Records" />
        <View style={styles.recordCount}>
            <Text style={styles.recordCountText}>{data.length} Records</Text>
        </View>
    </View>
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      renderItem={({ item, index }) => (
        <AnimatedListItem index={index}>
          <View style={[styles.diseaseCard, { borderLeftColor: item.color, borderLeftWidth: 5 }]}>
            <Image source={{ uri: item.image }} style={styles.diseaseImage} />
            <View style={styles.diseaseInfo}>
              <Text style={styles.diseaseName}>{item.name}</Text>
              <Text style={styles.diseaseDescription} numberOfLines={2}>{item.description}</Text>
              <Text style={styles.diseaseSavedCount}>Saved {item.savedCount} times</Text>
            </View>
          </View>
        </AnimatedListItem>
      )}
      scrollEnabled={false}
    />
  </View>
);

// --- Bar Chart with Animation ---
const AnimatedBar = ({ value, maxValue, color }) => {
  const widthAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: (value / maxValue) * 100,
      duration: 900,
      useNativeDriver: false,
    }).start();
  }, [value, maxValue]);
  return (
    <Animated.View
      style={{
        height: 14,
        borderRadius: 7,
        backgroundColor: color,
        width: widthAnim.interpolate({
          inputRange: [0, 100],
          outputRange: ['0%', '100%'],
        }),
        shadowColor: color,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 2,
      }}
    />
  );
};

const BarChartView = ({ data }) => {
    const totalOccurrences = data.reduce((sum, item) => sum + item.savedCount, 0);
    const mostCommon = data.reduce((prev, current) => (prev.savedCount > current.savedCount) ? prev : current);
    const average = totalOccurrences / data.length;
    const maxValue = Math.max(...data.map(item => item.savedCount));

    const fadeAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }, []);

    return (
        <View>
            <SectionHeader icon="bar-chart" title="Disease Frequency" />
            <Text style={styles.sectionSubtitle}>Visualize the most common diseases in your farm</Text>
            <Animated.View style={[styles.summaryCardGreen, { opacity: fadeAnim }]}>
                <View style={styles.summaryItemLeftGreen}>
                    <Text style={styles.summaryLabelWhite}>TOTAL OCCURRENCES</Text>
                    <Text style={styles.summaryValueLgWhite}>{totalOccurrences}</Text>
                    <Text style={styles.summarySubValueWhite}>times</Text>
                    <Feather name="trending-up" size={24} color={'#fff'} style={{ marginTop: 8 }} />
                </View>
                <View style={styles.summaryDividerGreen} />
                <View style={styles.summaryItemRightGreen}>
                    <View style={styles.summaryDetailRow}>
                        <Text style={styles.summaryLabelWhite}>MOST COMM.</Text>
                        <Text style={styles.summaryValueWhite}>{mostCommon.name}</Text>
                        <Text style={styles.summarySubValueWhite}>{mostCommon.savedCount} times</Text>
                    </View>
                    <View style={styles.summaryDetailRow}>
                        <Text style={styles.summaryLabelWhite}>AVERAGE</Text>
                        <Text style={styles.summaryValueWhite}>{average.toFixed(1)}</Text>
                        <Text style={styles.summarySubValueWhite}>per disease</Text>
                    </View>
                </View>
            </Animated.View>
            <View style={styles.barChartContainer}>
                {data.map((item, index) => (
                    <TouchableOpacity key={item.id} style={styles.barRow}>
                        <Text style={styles.barIndex}>{index + 1}</Text>
                        <Text style={styles.barLabel}>{item.name}</Text>
                        <View style={styles.barWrapper}>
                            <AnimatedBar value={item.savedCount} maxValue={maxValue} color={item.color} />
                        </View>
                        <Text style={styles.barValue}>{item.savedCount}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

// --- [FIXED] Pie Chart View ---
const PieChartView = ({ data }) => {
    const total = data.reduce((sum, item) => sum + item.savedCount, 0);
    const mostCommon = data.reduce((prev, current) => (prev.savedCount > current.savedCount) ? prev : current);
    const [activeId, setActiveId] = useState(mostCommon.id);
    const activeItem = data.find(item => item.id === activeId) || mostCommon;

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const donutAnim = useRef(new Animated.Value(0)).current;
    
    useEffect(() => {
        fadeAnim.setValue(0);
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();

        const percentage = activeItem.savedCount / total;
        Animated.timing(donutAnim, { toValue: percentage, duration: 500, useNativeDriver: false }).start();
    }, [activeId, activeItem.savedCount, total]);
    
    const size = 220;
    const strokeWidth = 28;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    const animatedStrokeDashoffset = donutAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [circumference, 0],
    });

    return (
        <View>
            <SectionHeader icon="pie-chart" title="Disease Distribution" />
            <Text style={styles.sectionSubtitle}>Percentage breakdown of diseases in your farm</Text>

            <View style={styles.pieChartDisplayCard}>
                <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    <G transform={`rotate(-90 ${size/2} ${size/2})`}>
                        <Circle
                            cx={size / 2} cy={size / 2} r={radius}
                            stroke={theme.colors.lightGray}
                            strokeWidth={strokeWidth}
                            fill="none"
                        />
                        <AnimatedCircle
                            cx={size / 2} cy={size / 2} r={radius}
                            stroke={activeItem.color}
                            strokeWidth={strokeWidth}
                            fill="none"
                            strokeDasharray={`${circumference} ${circumference}`}
                            strokeDashoffset={animatedStrokeDashoffset}
                            strokeLinecap="round"
                        />
                    </G>
                </Svg>
                <View style={[StyleSheet.absoluteFill, styles.pieChartCenter]}>
                    <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
                        <Text style={styles.pieChartCenterPercent}>
                            {`${((activeItem.savedCount / total) * 100).toFixed(1)}%`}
                        </Text>
                        <Text style={styles.pieChartCenterLabel}>{activeItem.name}</Text>
                    </Animated.View>
                </View>
            </View>

            <View style={styles.legendGridContainer}>
                {data.map(item => {
                    const isActive = item.id === activeId;
                    const percentage = ((item.savedCount / total) * 100).toFixed(1);
                    return (
                        <TouchableOpacity
                            key={item.id}
                            style={[
                                styles.legendPill,
                                isActive ? styles.legendPillActive : styles.legendPillInactive
                            ]}
                            onPress={() => setActiveId(item.id)}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.legendPillDot, { backgroundColor: item.color }]} />
                            <View style={styles.legendPillTextContainer}>
                                <Text style={styles.legendPillName} numberOfLines={1}>{item.name}</Text>
                                <Text style={styles.legendPillPercentage}>{percentage}%</Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};

// --- Main Screen Component ---
const DiseaseHistoryScreen = () => {
  const [activeView, setActiveView] = useState('Pie Chart');

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
          <ToggleButton icon="bar-chart" label="Bar Chart" active={activeView === 'Bar Chart'} onPress={() => setActiveView('Bar Chart')} />
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
  container: { flex: 1, paddingHorizontal: theme.layout.horizontalPadding, paddingBottom: 30 },
  header: { alignItems: 'center', marginVertical: theme.spacing.medium },
  headerTitle: { ...theme.typography.headingMedium, color: theme.colors.darkGreen, fontFamily: 'serif', fontWeight: '700', letterSpacing: 0.2 },
  headerSubtitle: { ...theme.typography.bodyMedium, color: theme.colors.gray, marginTop: 4 },
  toggleContainer: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: theme.colors.white, borderRadius: theme.components.button.borderRadius, padding: 4, marginBottom: theme.spacing.large },
  toggleButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: theme.spacing.small, borderRadius: theme.components.button.borderRadius },
  toggleButtonActive: { backgroundColor: theme.colors.primaryGreen, shadowColor: theme.colors.primaryGreen, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },
  toggleButtonText: { ...theme.typography.bodyMedium, color: theme.colors.primaryGreen, marginLeft: theme.spacing.small },
  toggleButtonTextActive: { color: theme.colors.white, fontWeight: 'bold' },
  sectionHeaderContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.small, },
  sectionTitle: { ...theme.typography.headingSmall, color: theme.colors.darkGreen, marginLeft: theme.spacing.small, fontFamily: 'serif', fontWeight: '700', letterSpacing: 0.2 },
  sectionSubtitle: { ...theme.typography.bodyMedium, color: theme.colors.gray, marginBottom: theme.spacing.small, marginLeft: 32 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.medium },
  recordCount: { backgroundColor: theme.colors.secondaryGreen, paddingHorizontal: theme.spacing.medium, paddingVertical: 4, borderRadius: 15 },
  recordCountText: { ...theme.typography.bodySmall, color: theme.colors.white, fontWeight: 'bold' },
  diseaseCard: { flexDirection: 'row', backgroundColor: theme.colors.white, borderRadius: theme.components.card.borderRadius, padding: theme.spacing.medium, marginBottom: theme.spacing.medium, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 5, elevation: 2 },
  diseaseImage: { width: 60, height: 60, borderRadius: theme.components.card.borderRadius },
  diseaseInfo: { flex: 1, marginLeft: theme.spacing.medium, justifyContent: 'center' },
  diseaseName: { ...theme.typography.bodyLarge, fontWeight: 'bold', color: theme.colors.darkGreen },
  diseaseDescription: { ...theme.typography.bodyMedium, color: theme.colors.gray, marginVertical: 4 },
  diseaseSavedCount: { ...theme.typography.bodySmall, color: theme.colors.primaryGreen, fontWeight: 'bold', marginTop: 4 },
  
  // Bar Chart Styles
  summaryCardGreen: {
      flexDirection: 'row',
      backgroundColor: theme.colors.primaryGreen,
      borderRadius: theme.components.card.borderRadius,
      padding: theme.spacing.medium,
      marginBottom: theme.spacing.large,
      alignItems: 'stretch',
      shadowColor: theme.colors.primaryGreen, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 4,
  },
  summaryItemLeftGreen: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingRight: theme.spacing.medium, },
  summaryItemRightGreen: { flex: 1.5, justifyContent: 'space-around', paddingLeft: theme.spacing.medium, },
  summaryLabelWhite: { ...theme.typography.caption, color: theme.colors.white, textTransform: 'uppercase', marginBottom: 2, opacity: 0.9 },
  summaryValueLgWhite: { ...theme.typography.headingLarge, color: theme.colors.white, lineHeight: 32 },
  summarySubValueWhite: { ...theme.typography.bodySmall, color: theme.colors.white, opacity: 0.9 },
  summaryDividerGreen: { width: 1, backgroundColor: theme.colors.lightGreen, opacity: 0.5 },
  summaryDetailRow: {},
  summaryValueWhite: { ...theme.typography.bodyLarge, fontWeight: 'bold', color: theme.colors.white },
  barChartContainer: { backgroundColor: theme.colors.white, borderRadius: theme.components.card.borderRadius, padding: theme.spacing.medium, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 5, elevation: 2, },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.large, minHeight: 32 },
  barIndex: { ...theme.typography.bodyMedium, color: theme.colors.gray, marginRight: theme.spacing.medium, width: 20, textAlign: 'right' },
  barLabel: { ...theme.typography.bodyLarge, color: theme.colors.darkGreen, flex: 1, fontWeight: '500' },
  barWrapper: { height: 14, backgroundColor: theme.colors.lightGray, borderRadius: 7, flex: 2, marginHorizontal: theme.spacing.medium, borderWidth: 1, borderColor: '#E0E0E0', overflow: 'hidden', justifyContent: 'center' },
  barValue: { ...theme.typography.bodyLarge, fontWeight: 'bold', color: theme.colors.darkGreen, width: 32, textAlign: 'right' },

  // --- [NEW] Pie Chart Styles ---
  pieChartDisplayCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.components.card.borderRadius,
    padding: theme.spacing.medium,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: theme.spacing.medium,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  pieChartCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieChartCenterPercent: {
    ...theme.typography.headingLarge,
    color: theme.colors.darkGreen,
    fontWeight: 'bold',
    fontSize: 36,
  },
  pieChartCenterLabel: {
    ...theme.typography.bodyMedium,
    color: theme.colors.gray,
    marginTop: 4,
  },
  legendGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: theme.spacing.small,
  },
  legendPill: {
    width: '48.5%', // Two items per row with a small gap
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.components.card.borderRadius,
    padding: theme.spacing.medium,
    marginBottom: theme.spacing.medium,
  },
  legendPillActive: {
    backgroundColor: theme.colors.lightGreen,
    borderWidth: 1.5,
    borderColor: theme.colors.primaryGreen,
  },
  legendPillInactive: {
    backgroundColor: theme.colors.white,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  legendPillDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: theme.spacing.medium,
  },
  legendPillTextContainer: {
    flex: 1,
  },
  legendPillName: {
    ...theme.typography.bodyMedium,
    color: theme.colors.darkGreen,
    fontWeight: '600',
  },
  legendPillPercentage: {
    ...theme.typography.bodySmall,
    color: theme.colors.gray,
    marginTop: 2,
  },
});

export default DiseaseHistoryScreen;