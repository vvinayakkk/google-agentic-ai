import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Animated, Dimensions } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

// --- CROP DATA ---
const CROP_DATA = {
  sugarcane: {
    name: 'Sugarcane',
    icon: 'barley',
    plantingDate: '2024-10-15', // Year-Month-Day
    totalDuration: '12-18 Months',
    stages: [
      { id: 1, title: 'Land Preparation', durationWeeks: 4, icon: 'shovel', color: '#a1662f', tasks: ['Deep ploughing', 'Apply FYM', 'Create furrows'], needs: 'Well-drained, loamy soil.', threats: 'Soil-borne pathogens.' },
      { id: 2, title: 'Planting', durationWeeks: 2, icon: 'seed-outline', color: '#8f9a62', tasks: ['Select healthy setts', 'Treat with fungicide', 'Plant in furrows'], needs: 'Optimal moisture.', threats: 'Poor sett quality.' },
      { id: 3, title: 'Germination', durationWeeks: 6, icon: 'sprout-outline', color: '#99bb6d', tasks: ['Light irrigation', 'Gap filling', 'First weeding'], needs: 'Warm temperature (28-32°C).', threats: 'Shoot borer insects.' },
      { id: 4, title: 'Tillering', durationWeeks: 16, icon: 'dots-grid', color: '#6a994e', tasks: ['First top dressing (N)', 'Earthing up', 'Regular weeding'], needs: 'Sunlight and nutrients.', threats: 'Weed competition.' },
      { id: 5, title: 'Grand Growth', durationWeeks: 28, icon: 'arrow-up-bold-box-outline', color: '#386641', tasks: ['Second top dressing (N & K)', 'Tying and propping', 'Manage water logging'], needs: 'High water/nutrient demand.', threats: 'Top borer, rust disease.' },
      { id: 6, title: 'Maturity', durationWeeks: 16, icon: 'beehive-outline', color: '#fca311', tasks: ['Stop irrigation', 'Monitor brix reading', 'Detrashing'], needs: 'Cool, dry weather.', threats: 'Rodents.' },
      { id: 7, title: 'Harvesting', durationWeeks: 8, icon: 'content-cut', color: '#bc4749', tasks: ['Harvest close to ground', 'Remove tops', 'Transport to mill quickly'], needs: 'Dry field conditions.', threats: 'Sugar inversion.' },
    ],
    subsidies: [
      { id: 'sub1', title: 'Pradhan Mantri Krishi Sinchayee Yojana (PMKSY)', description: 'Provides subsidies on micro-irrigation systems like drip and sprinklers, crucial for sugarcane.' },
      { id: 'sub2', title: 'National Food Security Mission (NFSM)', description: 'Offers assistance for purchasing new farm machinery and high-yielding seed varieties.' }
    ],
    analysis: {
        metrics: [
            { label: 'Height', value: 85, expected: 80, unit: '%' },
            { label: 'Soil Moisture', value: 60, expected: 75, unit: '%' },
            { label: 'Nutrient Level', value: 90, expected: 85, unit: '%' },
        ],
        summary: 'Crop height and nutrient levels are optimal. Soil moisture is slightly below the expected range for the Grand Growth phase. Consider light irrigation.'
    },
    suggestions: [
        { id: 'sug1', type: 'alert', title: 'Pest Alert: Top Borer', description: 'Minor infestation detected in the north-west corner of the field. Recommend spraying with a targeted pesticide.', icon: 'alert-octagon' },
        { id: 'sug2', type: 'recommendation', title: 'Nutrient Boost Recommended', description: 'Apply a potassium-rich fertilizer within the next 7 days to enhance sugar accumulation during the upcoming maturity phase.', icon: 'flask-outline' },
    ]
  },
  tomato: {
    name: 'Tomato',
    icon: 'food-apple-outline',
    plantingDate: '2025-06-01',
    totalDuration: '3-4 Months',
    stages: [
        { id: 1, title: 'Nursery Raising', durationWeeks: 4, icon: 'spa-outline', color: '#8f9a62', tasks: ['Sow seeds in trays', 'Maintain moisture', 'Harden seedlings'], needs: 'Controlled environment.', threats: 'Damping-off disease.' },
        { id: 2, title: 'Transplanting', durationWeeks: 1, icon: 'plant-outline', color: '#99bb6d', tasks: ['Prepare beds', 'Transplant seedlings in evening', 'Light irrigation'], needs: 'Well-prepared field.', threats: 'Transplant shock.' },
        { id: 3, title: 'Vegetative Growth', durationWeeks: 4, icon: 'arrow-up-bold-box-outline', color: '#6a994e', tasks: ['Staking/trellising', 'First fertilizer application', 'Weeding'], needs: 'Support, nutrients.', threats: 'Aphids, whiteflies.' },
        { id: 4, title: 'Flowering & Fruiting', durationWeeks: 6, icon: 'flower-tulip-outline', color: '#fca311', tasks: ['Regular irrigation', 'Apply K-rich fertilizer', 'Monitor for pests'], needs: 'Consistent moisture.', threats: 'Fruit borer, blossom end rot.' },
        { id: 5, title: 'Harvesting', durationWeeks: 4, icon: 'content-cut', color: '#bc4749', tasks: ['Pick mature fruits', 'Sort by grade', 'Proper storage'], needs: 'Careful handling.', threats: 'Post-harvest losses.' },
    ],
    subsidies: [
      { id: 'sub1', title: 'Mission for Integrated Development of Horticulture (MIDH)', description: 'Provides support for high-quality seeds, integrated pest management, and post-harvest infrastructure.' },
    ],
    analysis: {
        metrics: [
            { label: 'Fruit Set', value: 90, expected: 85, unit: '%' },
            { label: 'Soil Moisture', value: 80, expected: 80, unit: '%' },
            { label: 'Pest Activity', value: 15, expected: 10, unit: '%' },
        ],
        summary: 'Excellent fruit set and optimal soil moisture. Pest activity is slightly elevated; monitor for fruit borers.'
    },
    suggestions: [
        { id: 'sug1', type: 'recommendation', title: 'Increase Potassium', description: 'Apply a foliar spray of potassium nitrate to improve fruit size and quality.', icon: 'flask-outline' },
    ]
  },
};

// --- Helper to calculate current stage ---
const getCurrentStageIndex = (crop) => {
    const plantingDate = new Date(crop.plantingDate);
    const today = new Date('2025-07-20'); // Using fixed date for consistent demo
    const weeksSincePlanting = Math.floor((today - plantingDate) / (1000 * 60 * 60 * 24 * 7));
    
    let cumulativeWeeks = 0;
    for (let i = 0; i < crop.stages.length; i++) {
        cumulativeWeeks += crop.stages[i].durationWeeks;
        if (weeksSincePlanting < cumulativeWeeks) {
            return i;
        }
    }
    return crop.stages.length - 1;
};

// --- Components ---

const CropWallboard = ({ onSelectCrop }) => {
    const animValues = useRef(Object.keys(CROP_DATA).map(() => new Animated.Value(0))).current;

    useEffect(() => {
        const animations = animValues.map(val => Animated.timing(val, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
        }));
        Animated.stagger(100, animations).start();
    }, []);

    return (
        <ScrollView contentContainerStyle={styles.wallboardContainer}>
            {Object.keys(CROP_DATA).map((key, index) => {
                const crop = CROP_DATA[key];
                const currentStageIndex = getCurrentStageIndex(crop);
                const currentStage = crop.stages[currentStageIndex];
                const translateY = animValues[index].interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                });
                return (
                    <Animated.View key={key} style={{ opacity: animValues[index], transform: [{ translateY }] }}>
                        <TouchableOpacity style={styles.wallboardCard} onPress={() => onSelectCrop(key)}>
                            <View style={styles.wallboardHeader}>
                                <MaterialCommunityIcons name={crop.icon} size={40} color="white" />
                                <View>
                                    <Text style={styles.wallboardTitle}>{crop.name}</Text>
                                    <Text style={styles.wallboardDuration}>{crop.totalDuration}</Text>
                                </View>
                            </View>
                            <View style={styles.wallboardStatus}>
                                <Text style={styles.wallboardStatusLabel}>Current Stage:</Text>
                                <Text style={[styles.wallboardStatusValue, { color: currentStage.color }]}>{currentStage.title}</Text>
                            </View>
                        </TouchableOpacity>
                    </Animated.View>
                );
            })}
        </ScrollView>
    );
};

const CropDetailView = ({ crop, onBack }) => {
    const [activeView, setActiveView] = useState('menu'); // menu, timeline, subsidies, analysis, suggestions
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        fadeAnim.setValue(0);
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    }, [activeView, crop]);

    const handleBack = () => {
        if (activeView === 'menu') {
            onBack();
        } else {
            setActiveView('menu');
        }
    };

    const renderContent = () => {
        switch (activeView) {
            case 'timeline':
                return <TimelineView crop={crop} />;
            case 'subsidies':
                return <SubsidyInfo crop={crop} />;
            case 'analysis':
                return <AnalysisView crop={crop} />;
            case 'suggestions':
                return <SuggestionsView crop={crop} />;
            case 'menu':
            default:
                return <MenuView onSelect={setActiveView} />;
        }
    };

    return (
        <View style={{ flex: 1 }}>
             <TouchableOpacity style={styles.detailBack} onPress={handleBack}>
                <Ionicons name="arrow-back-circle-outline" size={32} color="gray" />
                <Text style={styles.detailBackText}>
                    {activeView === 'menu' ? 'Back to All Crops' : 'Back to Menu'}
                </Text>
            </TouchableOpacity>
            <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
                {renderContent()}
            </Animated.View>
        </View>
    );
};

const MenuView = ({ onSelect }) => {
    const menuItems = [
        { key: 'timeline', title: 'Crop Timeline', icon: 'chart-timeline-variant', color: '#3498db' },
        { key: 'analysis', title: 'Growth Analysis', icon: 'chart-bar', color: '#2ecc71' },
        { key: 'suggestions', title: 'AI Suggestions', icon: 'lightbulb-on-outline', color: '#f1c40f' },
        { key: 'subsidies', title: 'Subsidies & Schemes', icon: 'bank-outline', color: '#9b59b6' },
    ];
    const animValues = useRef(menuItems.map(() => new Animated.Value(0))).current;

    useEffect(() => {
        const animations = animValues.map(val => Animated.timing(val, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
        }));
        Animated.stagger(100, animations).start();
    }, []);

    return (
        <View style={styles.menuContainer}>
            <Text style={styles.menuTitle}>What do you want to see?</Text>
            {menuItems.map((item, index) => {
                 const translateY = animValues[index].interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                });
                return(
                <Animated.View key={item.key} style={{ opacity: animValues[index], transform: [{ translateY }] }}>
                    <TouchableOpacity style={styles.menuItem} onPress={() => onSelect(item.key)}>
                        <MaterialCommunityIcons name={item.icon} size={30} color={item.color} />
                        <Text style={styles.menuItemText}>{item.title}</Text>
                        <Ionicons name="chevron-forward" size={24} color="gray" />
                    </TouchableOpacity>
                </Animated.View>
            )})}
        </View>
    );
};

const TimelineView = ({ crop }) => {
    const currentStageIndex = getCurrentStageIndex(crop);
    return (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
            {crop.stages.map((stage, index) => (
                <TimelineStage key={stage.id} stage={stage} isLast={index === crop.stages.length - 1} isCurrent={index === currentStageIndex} />
            ))}
        </ScrollView>
    );
};

const AnalysisView = ({ crop }) => (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.analysisContainer}>
            <Text style={styles.sectionTitle}>Growth Analysis</Text>
            <View style={styles.graphContainer}>
                {crop.analysis.metrics.map(metric => (
                    <View key={metric.label} style={styles.barRow}>
                        <Text style={styles.barLabel}>{metric.label}</Text>
                        <View style={styles.barTrack}>
                            <Animated.View style={[styles.bar, { width: `${metric.value}%`, backgroundColor: metric.value < metric.expected ? '#e74c3c' : '#2ecc71' }]} />
                            <View style={[styles.barExpected, { left: `${metric.expected}%` }]} />
                        </View>
                        <Text style={styles.barValue}>{metric.value}{metric.unit}</Text>
                    </View>
                ))}
            </View>
            <Text style={styles.summaryTitle}>Summary</Text>
            <Text style={styles.summaryText}>{crop.analysis.summary}</Text>
        </View>
    </ScrollView>
);

const SuggestionsView = ({ crop }) => (
     <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.suggestionContainer}>
             <Text style={styles.sectionTitle}>AI Suggestions & Alerts</Text>
             {crop.suggestions.map(sug => {
                 const isAlert = sug.type === 'alert';
                 return (
                    <View key={sug.id} style={[styles.suggestionCard, {borderColor: isAlert ? '#e74c3c' : '#f1c40f'}]}>
                        <MaterialCommunityIcons name={sug.icon} size={30} color={isAlert ? '#e74c3c' : '#f1c40f'} />
                        <View style={styles.suggestionContent}>
                            <Text style={styles.suggestionTitle}>{sug.title}</Text>
                            <Text style={styles.suggestionDesc}>{sug.description}</Text>
                        </View>
                    </View>
                 )
             })}
        </View>
    </ScrollView>
);

const TimelineStage = ({ stage, isLast, isCurrent }) => {
  const scaleAnim = useRef(new Animated.Value(isCurrent ? 1.2 : 1)).current;

  useEffect(() => {
      if(isCurrent) {
        Animated.loop(
            Animated.sequence([
                Animated.timing(scaleAnim, { toValue: 1.1, duration: 600, useNativeDriver: true }),
                Animated.timing(scaleAnim, { toValue: 1.2, duration: 600, useNativeDriver: true }),
            ])
        ).start();
      } else {
          scaleAnim.setValue(1);
      }
  }, [isCurrent, scaleAnim]);

  return (
    <View style={styles.stageContainer}>
      <View style={styles.timelineLineContainer}>
        <Animated.View style={[styles.timelineDot, { backgroundColor: stage.color, transform: [{ scale: scaleAnim }] }, isCurrent && styles.currentDotGlow]} />
        {!isLast && <View style={styles.timelineLine} />}
      </View>
      <View style={[styles.stageContent, isCurrent && { borderColor: stage.color }]}>
        <View style={styles.stageHeader}>
          <MaterialCommunityIcons name={stage.icon} size={24} color={stage.color} />
          <Text style={[styles.stageTitle, { color: stage.color }]}>{stage.title}</Text>
          <Text style={styles.stageDuration}>{stage.durationWeeks} Weeks</Text>
        </View>
        <View style={styles.stageDetails}>
          <Text style={styles.detailTitle}>Tasks:</Text>
          <Text style={styles.detailText}>{stage.tasks.join(', ')}.</Text>
        </View>
      </View>
    </View>
  );
};

const SubsidyInfo = ({ crop }) => (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.sectionTitle}>Subsidies & Schemes</Text>
        {crop.subsidies.map(sub => (
            <View key={sub.id} style={styles.subsidyItem}>
                <View style={styles.subsidyHeader}>
                    <MaterialCommunityIcons name="bank-outline" size={24} color="#4CAF50" />
                    <Text style={styles.subsidyItemTitle}>{sub.title}</Text>
                </View>
                <Text style={styles.subsidyItemDesc}>{sub.description}</Text>
            </View>
        ))}
    </ScrollView>
);


export default function CropCycleScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [selectedCropKey, setSelectedCropKey] = useState(null);

  const handleBackPress = () => {
      if (selectedCropKey) {
          setSelectedCropKey(null);
      } else {
          navigation.goBack();
      }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={handleBackPress}>
          <Ionicons name="arrow-back" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>
            {selectedCropKey ? CROP_DATA[selectedCropKey].name : 'Crop Cycle Dashboard'}
        </Text>
        <View style={{ width: 28 }} />
      </View>
      
      {selectedCropKey ? (
          <CropDetailView crop={CROP_DATA[selectedCropKey]} onBack={() => setSelectedCropKey(null)} />
      ) : (
          <CropWallboard onSelectCrop={setSelectedCropKey} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  topBarTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  wallboardContainer: {
      padding: 20,
  },
  wallboardCard: {
      backgroundColor: '#1e1e1e',
      borderRadius: 15,
      padding: 20,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: '#333',
  },
  wallboardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  wallboardTitle: {
      color: 'white',
      fontSize: 22,
      fontWeight: 'bold',
      marginLeft: 15,
  },
  wallboardDuration: {
      color: 'gray',
      marginLeft: 15,
  },
  wallboardStatus: {
      marginTop: 15,
      paddingTop: 15,
      borderTopWidth: 1,
      borderColor: '#333',
  },
  wallboardStatusLabel: {
      color: 'gray',
      fontSize: 14,
  },
  wallboardStatusValue: {
      color: 'white',
      fontSize: 16,
      fontWeight: 'bold',
  },
  detailBack: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  detailBackText: {
    color: 'gray',
    marginLeft: 10,
  },
  menuContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  menuTitle: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 40,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
  },
  menuItemText: {
    color: 'white',
    fontSize: 18,
    marginLeft: 15,
    flex: 1,
  },
  scrollContainer: {
    padding: 20,
    paddingTop: 0,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  analysisContainer: {},
  graphContainer: {
    backgroundColor: '#1e1e1e',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  barLabel: {
    color: 'white',
    width: '30%',
  },
  barTrack: {
    flex: 1,
    height: 10,
    backgroundColor: '#333',
    borderRadius: 5,
  },
  bar: {
    height: '100%',
    borderRadius: 5,
  },
  barExpected: {
      position: 'absolute',
      height: '150%',
      width: 2,
      backgroundColor: 'white',
      top: '-25%',
  },
  barValue: {
      color: 'white',
      width: '15%',
      textAlign: 'right',
  },
  summaryTitle: {
      color: 'gray',
      fontWeight: 'bold',
      fontSize: 16,
      marginTop: 10,
  },
  summaryText: {
      color: 'white',
      fontSize: 14,
      lineHeight: 20,
  },
  suggestionContainer: {},
  suggestionCard: {
      flexDirection: 'row',
      backgroundColor: '#1e1e1e',
      borderRadius: 15,
      padding: 20,
      marginBottom: 15,
      borderLeftWidth: 4,
  },
  suggestionContent: {
      flex: 1,
      marginLeft: 15,
  },
  suggestionTitle: {
      color: 'white',
      fontSize: 16,
      fontWeight: 'bold',
  },
  suggestionDesc: {
      color: '#ccc',
      marginTop: 5,
  },
  stageContainer: {
    flexDirection: 'row',
  },
  timelineLineContainer: {
    alignItems: 'center',
    marginRight: 15,
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  currentDotGlow: {
      borderWidth: 3,
      borderColor: 'rgba(255,255,255,0.5)',
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#333',
  },
  stageContent: {
    flex: 1,
    backgroundColor: '#1e1e1e',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#333',
  },
  stageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  stageTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  stageDuration: {
    color: 'gray',
    fontSize: 12,
    marginLeft: 'auto',
  },
  stageDetails: {
    paddingLeft: 34,
  },
  detailTitle: {
    color: 'gray',
    fontWeight: 'bold',
    marginTop: 5,
  },
  detailText: {
    color: 'white',
  },
  subsidyItem: {
    backgroundColor: '#1e1e1e',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
  },
  subsidyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  subsidyItemTitle: {
    color: '#4CAF50',
    fontWeight: 'bold',
    fontSize: 16,
    flex: 1,
    marginLeft: 10,
  },
  subsidyItemDesc: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
  },
});
