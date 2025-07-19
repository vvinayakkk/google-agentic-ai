import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Animated, Dimensions } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

// --- CROP DATA (ENHANCED) ---
const CROP_DATA = {
  sugarcane: {
    name: 'Sugarcane',
    icon: 'barley',
    plantingDate: '2024-10-15',
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
        trends: {
            labels: ['4w ago', '3w ago', '2w ago', 'Last week'],
            datasets: [
                { name: 'Soil Moisture', color: '#3498db', data: [70, 65, 75, 60] },
                { name: 'Rainfall (mm)', color: '#9b59b6', data: [10, 5, 25, 2] },
            ]
        },
        aiInsights: 'The graph shows a significant drop in both rainfall and soil moisture last week. While the recent irrigation event 2 weeks ago helped, the current moisture level (60%) is approaching the stress threshold for the Grand Growth phase. Recommend immediate supplementary irrigation to prevent yield loss.'
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
        trends: {
            labels: ['4w ago', '3w ago', '2w ago', 'Last week'],
            datasets: [
                { name: 'Fruit Set Rate', color: '#2ecc71', data: [40, 60, 85, 90] },
                { name: 'Pest Activity', color: '#e74c3c', data: [5, 8, 12, 15] },
            ]
        },
        aiInsights: 'The fruit set rate is excellent and trending upwards. However, pest activity has been steadily increasing over the past month. While still at a manageable level, proactive pest control measures are advised to protect the developing fruit.'
    },
    suggestions: [
        { id: 'sug1', type: 'recommendation', title: 'Increase Potassium', description: 'Apply a foliar spray of potassium nitrate to improve fruit size and quality.', icon: 'flask-outline' },
    ]
  },
};

// --- Helper to calculate current stage ---
const getCurrentStageInfo = (crop) => {
    const plantingDate = new Date(crop.plantingDate);
    const today = new Date('2025-07-20');
    const weeksSincePlanting = Math.floor((today - plantingDate) / (1000 * 60 * 60 * 24 * 7));
    
    let cumulativeWeeks = 0;
    let stageStartWeek = 0;
    for (let i = 0; i < crop.stages.length; i++) {
        cumulativeWeeks += crop.stages[i].durationWeeks;
        if (weeksSincePlanting < cumulativeWeeks) {
            const weeksIntoStage = weeksSincePlanting - stageStartWeek;
            const progress = Math.min(100, Math.floor((weeksIntoStage / crop.stages[i].durationWeeks) * 100));
            return { index: i, progress };
        }
        stageStartWeek = cumulativeWeeks;
    }
    return { index: crop.stages.length - 1, progress: 100 };
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
                const currentStageIndex = getCurrentStageInfo(crop).index;
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
    const { index: currentStageIndex, progress: currentStageProgress } = getCurrentStageInfo(crop);
    return (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
            {crop.stages.map((stage, index) => (
                <TimelineStage 
                    key={stage.id} 
                    stage={stage} 
                    isLast={index === crop.stages.length - 1} 
                    isCurrent={index === currentStageIndex}
                    progress={index === currentStageIndex ? currentStageProgress : (index < currentStageIndex ? 100 : 0)}
                />
            ))}
        </ScrollView>
    );
};

const AnalysisView = ({ crop }) => (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.analysisContainer}>
            <Text style={styles.sectionTitle}>4-Week Growth Trends</Text>
            <View style={styles.graphContainer}>
                {/* Graph */}
                <View style={styles.graph}>
                    {/* Y-Axis Labels */}
                    <View style={styles.yAxis}>
                        <Text style={styles.yAxisLabel}>100%</Text>
                        <Text style={styles.yAxisLabel}>50%</Text>
                        <Text style={styles.yAxisLabel}>0%</Text>
                    </View>
                    {/* Lines and Points */}
                    <View style={styles.plotArea}>
                        {crop.analysis.trends.datasets.map(dataset => (
                            <View key={dataset.name} style={StyleSheet.absoluteFill}>
                                {dataset.data.map((point, index) => {
                                    if (index === 0) return null;
                                    const prevPoint = dataset.data[index - 1];
                                    const x1 = (width * 0.7 / 3) * (index - 1);
                                    const y1 = 150 - (prevPoint / 100 * 150);
                                    const x2 = (width * 0.7 / 3) * index;
                                    const y2 = 150 - (point / 100 * 150);
                                    const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
                                    const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
                                    return (
                                        <View key={index} style={[styles.line, {
                                            backgroundColor: dataset.color,
                                            width: length,
                                            left: x1,
                                            top: y1,
                                            transform: [{ rotate: `${angle}deg` }, {translateX: length / 2 - length/2}, {translateY: -1}]
                                        }]} />
                                    );
                                })}
                                {dataset.data.map((point, index) => (
                                    <View key={index} style={[styles.point, {
                                        backgroundColor: dataset.color,
                                        left: (width * 0.7 / 3) * index - 4,
                                        top: 150 - (point / 100 * 150) - 4,
                                    }]} />
                                ))}
                            </View>
                        ))}
                    </View>
                </View>
                 {/* X-Axis Labels */}
                <View style={styles.xAxis}>
                    {crop.analysis.trends.labels.map(label => <Text key={label} style={styles.xAxisLabel}>{label}</Text>)}
                </View>
                {/* Legend */}
                <View style={styles.legend}>
                    {crop.analysis.trends.datasets.map(dataset => (
                        <View key={dataset.name} style={styles.legendItem}>
                            <View style={[styles.legendColor, { backgroundColor: dataset.color }]} />
                            <Text style={styles.legendText}>{dataset.name}</Text>
                        </View>
                    ))}
                </View>
            </View>
            <View style={styles.aiInsightsCard}>
                <MaterialCommunityIcons name="brain" size={24} color="#2ecc71" />
                <View style={styles.aiInsightsContent}>
                    <Text style={styles.summaryTitle}>AI Insights</Text>
                    <Text style={styles.summaryText}>{crop.analysis.aiInsights}</Text>
                </View>
            </View>
        </View>
    </ScrollView>
);

const SuggestionsView = ({ crop }) => {
    const animValues = useRef(crop.suggestions.map(() => new Animated.Value(0))).current;

    useEffect(() => {
        const animations = animValues.map(val => Animated.timing(val, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
        }));
        Animated.stagger(150, animations).start();
    }, [crop]);

    return (
     <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.suggestionContainer}>
             <Text style={styles.sectionTitle}>AI Suggestions & Alerts</Text>
             {crop.suggestions.map((sug, index) => {
                 const isAlert = sug.type === 'alert';
                 const translateY = animValues[index].interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                });
                 return (
                    <Animated.View key={sug.id} style={{opacity: animValues[index], transform: [{translateY}]}}>
                        <View style={[styles.suggestionCard, {borderColor: isAlert ? '#e74c3c' : '#f1c40f'}]}>
                            {isAlert && <View style={styles.alertGlow} />}
                            <MaterialCommunityIcons name={sug.icon} size={30} color={isAlert ? '#e74c3c' : '#f1c40f'} />
                            <View style={styles.suggestionContent}>
                                <Text style={styles.suggestionTitle}>{sug.title}</Text>
                                <Text style={styles.suggestionDesc}>{sug.description}</Text>
                            </View>
                        </View>
                    </Animated.View>
                 )
             })}
        </View>
    </ScrollView>
    );
};

const TimelineStage = ({ stage, isLast, isCurrent, progress }) => {
  const scaleAnim = useRef(new Animated.Value(isCurrent ? 1.1 : 1)).current;

  useEffect(() => {
      if(isCurrent) {
        Animated.loop(
            Animated.sequence([
                Animated.timing(scaleAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
                Animated.timing(scaleAnim, { toValue: 1.1, duration: 800, useNativeDriver: true }),
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
          {isCurrent && <Text style={styles.youAreHere}>You are here</Text>}
        </View>
        <View style={styles.stageDetails}>
          <Text style={styles.detailTitle}>Tasks:</Text>
          <Text style={styles.detailText}>{stage.tasks.join(', ')}.</Text>
        </View>
        <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressBar, { width: `${progress}%`, backgroundColor: stage.color }]} />
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
    paddingHorizontal: 20,
    paddingTop: 20,
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
  graph: {
    height: 150,
    flexDirection: 'row',
  },
  yAxis: {
      height: '100%',
      justifyContent: 'space-between',
      paddingRight: 10,
  },
  yAxisLabel: {
      color: 'gray',
      fontSize: 12,
  },
  plotArea: {
      flex: 1,
      height: '100%',
  },
  line: {
      height: 2,
      position: 'absolute',
      transformOrigin: '0 0',
  },
  point: {
      width: 8,
      height: 8,
      borderRadius: 4,
      position: 'absolute',
      borderWidth: 1,
      borderColor: '#1e1e1e',
  },
  xAxis: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingLeft: 40, // align with plot area
      marginTop: 5,
  },
  xAxisLabel: {
      color: 'gray',
      fontSize: 12,
  },
  legend: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 20,
  },
  legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 15,
  },
  legendColor: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginRight: 5,
  },
  legendText: {
      color: 'white',
      fontSize: 12,
  },
  aiInsightsCard: {
      backgroundColor: '#1e1e1e',
      borderRadius: 15,
      padding: 20,
      flexDirection: 'row',
  },
  aiInsightsContent: {
      flex: 1,
      marginLeft: 15,
  },
  summaryTitle: {
      color: '#2ecc71',
      fontWeight: 'bold',
      fontSize: 16,
      marginBottom: 5,
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
      overflow: 'hidden',
  },
  alertGlow: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: '#e74c3c',
      opacity: 0.1,
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
  youAreHere: {
      backgroundColor: '#fff',
      color: '#000',
      fontSize: 10,
      fontWeight: 'bold',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 5,
      marginLeft: 'auto',
      overflow: 'hidden',
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
  progressTrack: {
      height: 6,
      backgroundColor: '#333',
      borderRadius: 3,
      marginTop: 10,
      overflow: 'hidden',
  },
  progressBar: {
      height: '100%',
      borderRadius: 3,
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
