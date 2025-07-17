import React, { useState } from 'react';
import { StyleSheet, Text, View, SafeAreaView, Image, TouchableOpacity, ScrollView } from 'react-native';
import { Feather } from '@expo/vector-icons';

// --- Theme ---
const theme = {
    colors: {
        background: '#F8F9FA',
        primaryText: '#212529',
        secondaryText: '#6C757D',
        accent: '#4CAF50',
        lightAccent: '#E8F5E9',
        white: '#FFFFFF',
        border: '#E9ECEF',
    },
    spacing: {
        small: 8,
        medium: 16,
        large: 24,
    },
    typography: {
        h1: { fontSize: 28, fontWeight: 'bold' },
        h2: { fontSize: 20, fontWeight: 'bold' },
        body: { fontSize: 16, lineHeight: 24 },
        caption: { fontSize: 12, color: '#6C757D' },
    },
};

// --- Mock Data (with updated images) ---
const diseaseDetails = {
    name: 'Late Blight',
    diseaseName: 'Potato__late_blight',
    scientificName: 'Phytophthora infestans',
    alsoKnownAs: 'Late Blight',
    description: 'Late blight is one of the most devastating diseases of potatoes, caused by the oomycete pathogen Phytophthora infestans. It affects both the foliage and tubers of potato plants, leading to significant yield loss and poor tuber quality. Under favorable wet and cool conditions, late blight can spread rapidly through a crop, causing complete defoliation within a few weeks.',
    mainImage: 'https://images.pexels.com/photos/807598/pexels-photo-807598.jpeg', // Plant leaf
    images: [
        'https://images.pexels.com/photos/807598/pexels-photo-807598.jpeg', // Close-up of plant leaves
        'https://images.pexels.com/photos/807598/pexels-photo-807598.jpeg',  // Another angle of leaves
        'https://images.pexels.com/photos/807598/pexels-photo-807598.jpeg', // Wider shot of a plant
    ],
    symptoms: [
        { title: 'Leaf Lesions', content: 'Initial symptoms appear as small, water-soaked, dark green to purplish-black lesions, often with a pale green or yellow halo.' },
        { title: 'Tuber Rot', content: 'Late blight also affects the tubers, resulting in irregular, sunken, reddish-brown patches on the skin and a granular, reddish-brown decay that extends into the tuber.' },
        { title: 'Stem Lesions', content: 'Dark brown to black lesions may form on stems, typically starting at the nodes. In moist conditions, a white, downy mildew may be visible.' },
    ],
    solutions: [
        { title: 'Fungicide Application', content: 'Timely application of fungicides such as chlorothalonil, metalaxyl, or mancozeb can help contain late blight outbreaks. Fungicides are most effective when applied preventatively or at the first signs of infection in the crop. During prolonged wet weather, repeated applications are recommended according to manufacturer instructions or local guidelines. Selecting fungicides with systemic properties can offer protection to both existing foliage and new growth during active outbreaks.' },
        { title: 'Sanitation', content: 'Removing infected plants and plant debris from the field reduces the source of inoculum. Destroying cull piles and volunteer potato plants is crucial.' },
        { title: 'Resistant Varieties', content: 'Planting potato varieties with genetic resistance to late blight is one of the most effective long-term strategies for managing the disease.' },
    ],
};

// --- Reusable Components ---

const AccordionItem = ({ icon, title, content, index }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    return (
        <View style={styles.accordionContainer}>
            <TouchableOpacity style={styles.accordionHeader} onPress={() => setIsExpanded(!isExpanded)} activeOpacity={0.8}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <View style={styles.accordionIndex}>
                        <Text style={styles.accordionIndexText}>{index}</Text>
                    </View>
                    <Text style={styles.accordionTitle}>{title}</Text>
                </View>
                <Feather name={isExpanded ? 'chevron-up' : 'chevron-down'} size={22} color={theme.colors.secondaryText} />
            </TouchableOpacity>
            {isExpanded && (
                <View style={styles.accordionContent}>
                    <Text style={theme.typography.body}>{content}</Text>
                </View>
            )}
        </View>
    );
};

const Section = ({ icon, title, subtitle, children }) => (
    <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
                <Feather name={icon} size={24} color={theme.colors.accent} />
            </View>
            <View>
                <Text style={styles.sectionTitle}>{title}</Text>
                <Text style={styles.sectionSubtitle}>{subtitle}</Text>
            </View>
        </View>
        {children}
    </View>
);


// --- Main Screen Component ---

export default function DiseaseDetailScreen() {
    const [isReadMore, setIsReadMore] = useState(false);

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header Image */}
                <View style={styles.headerImageContainer}>
                    <Image source={{ uri: diseaseDetails.mainImage }} style={styles.headerImage} />
                    <TouchableOpacity style={styles.backButton}>
                        <Feather name="chevron-left" size={28} color={theme.colors.primaryText} />
                    </TouchableOpacity>
                </View>
                
                <View style={styles.contentContainer}>
                    {/* Disease Info */}
                    <Text style={styles.title}>{diseaseDetails.name}</Text>
                    <Text style={styles.detailText}>
                        <Text style={{fontWeight: 'bold'}}>Disease Name:</Text> {diseaseDetails.diseaseName}
                    </Text>
                    <Text style={styles.detailText}>
                        <Text style={{fontWeight: 'bold'}}>Scientific Name:</Text> {diseaseDetails.scientificName}
                    </Text>
                    <Text style={styles.detailText}>
                        <Text style={{fontWeight: 'bold'}}>Also known as:</Text> {diseaseDetails.alsoKnownAs}
                    </Text>

                    {/* Description with Read More */}
                    <View style={styles.descriptionContainer}>
                        <Text style={styles.sectionTitle}>Description</Text>
                        <Text style={theme.typography.body} numberOfLines={isReadMore ? undefined : 4}>
                            {diseaseDetails.description}
                        </Text>
                        <TouchableOpacity onPress={() => setIsReadMore(!isReadMore)}>
                            <Text style={styles.readMoreText}>{isReadMore ? 'Read less' : 'Read more'}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Image Gallery */}
                    <View style={styles.descriptionContainer}>
                        <Text style={styles.sectionTitle}>Disease Images</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {diseaseDetails.images.map((img, index) => (
                                <Image key={index} source={{ uri: img }} style={styles.galleryImage} />
                            ))}
                        </ScrollView>
                    </View>

                    {/* Symptoms Section */}
                    <Section icon="activity" title="Symptoms" subtitle={`${diseaseDetails.symptoms.length} has been registered`}>
                        {diseaseDetails.symptoms.map((item, index) => (
                            <AccordionItem key={index} title={item.title} content={item.content} index={index + 1} />
                        ))}
                    </Section>

                    {/* Solutions Section */}
                     <Section icon="shield" title="Solutions" subtitle={`${diseaseDetails.solutions.length} solutions found`}>
                        {diseaseDetails.solutions.map((item, index) => (
                            <AccordionItem key={index} title={item.title} content={item.content} index={index + 1} />
                        ))}
                    </Section>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

// --- Stylesheet ---
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.colors.background },
    headerImageContainer: {
        height: 250,
        position: 'relative',
    },
    headerImage: {
        width: '100%',
        height: '100%',
    },
    backButton: {
        position: 'absolute',
        top: theme.spacing.large,
        left: theme.spacing.medium,
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        padding: theme.spacing.small,
        borderRadius: 20,
    },
    contentContainer: {
        padding: theme.spacing.medium,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        backgroundColor: theme.colors.background,
        marginTop: -20,
    },
    title: {
        ...theme.typography.h1,
        color: theme.colors.primaryText,
        marginBottom: theme.spacing.medium,
    },
    detailText: {
        ...theme.typography.body,
        color: theme.colors.secondaryText,
        marginBottom: 4,
    },
    descriptionContainer: {
        marginVertical: theme.spacing.large,
    },
    sectionTitle: {
        ...theme.typography.h2,
        color: theme.colors.primaryText,
        marginBottom: theme.spacing.small,
    },
    readMoreText: {
        ...theme.typography.body,
        color: theme.colors.accent,
        fontWeight: 'bold',
        marginTop: theme.spacing.small,
    },
    galleryImage: {
        width: 100,
        height: 100,
        borderRadius: 12,
        marginRight: theme.spacing.medium,
    },
    sectionContainer: {
        marginVertical: theme.spacing.medium,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.medium,
    },
    sectionIcon: {
        backgroundColor: theme.colors.lightAccent,
        padding: 12,
        borderRadius: 12,
        marginRight: theme.spacing.medium,
    },
    sectionSubtitle: {
        ...theme.typography.caption,
    },
    accordionContainer: {
        backgroundColor: theme.colors.white,
        borderRadius: 12,
        marginBottom: theme.spacing.medium,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    accordionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: theme.spacing.medium,
    },
    accordionIndex: {
        width: 30,
        height: 30,
        borderRadius: 8,
        backgroundColor: theme.colors.lightAccent,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: theme.spacing.medium,
    },
    accordionIndexText: {
        color: theme.colors.accent,
        fontWeight: 'bold',
    },
    accordionTitle: {
        ...theme.typography.h2,
        fontSize: 16,
        color: theme.colors.primaryText,
        flex: 1,
    },
    accordionContent: {
        padding: theme.spacing.medium,
        paddingTop: 0,
    },
});