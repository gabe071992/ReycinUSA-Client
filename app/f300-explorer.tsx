import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  Animated,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  Zap,
  Gauge,
  Settings,
  Shield,
  Activity,
  Cpu,
  Wind,
  Wrench,
  Calendar,
  ChevronRight,
  Info,
  Fuel,
  Volume2,
} from 'lucide-react-native';
const COLORS = {
  primary: '#FF4500',
  secondary: '#1a1a1a',
  text: '#ffffff',
  textSecondary: '#999999',
  background: '#000000',
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SpecItem {
  label: string;
  value: string;
  icon?: React.ReactNode;
}

interface Section {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

const F300Explorer = () => {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState('overview');
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const sections: Section[] = [
    {
      id: 'overview',
      title: 'Overview',
      icon: <Info size={20} color={COLORS.primary} />,
      content: (
        <View style={styles.sectionContent}>
          <Text style={styles.tagline}>"Four cylinders never sounded this good"</Text>
          <Text style={styles.description}>
            The F300 is engineered as a high-performance track kart that bridges the gap between pure racing performance and street-legal capability. With its dual-purpose design, advanced telemetry, and cutting-edge aerodynamics, the F300 represents the pinnacle of lightweight performance engineering.
          </Text>
          <View style={styles.releaseCard}>
            <Calendar size={24} color={COLORS.primary} />
            <View style={styles.releaseInfo}>
              <Text style={styles.releaseLabel}>Official Release</Text>
              <Text style={styles.releaseDate}>December 10, 2025</Text>
            </View>
          </View>
          <View style={styles.featureGrid}>
            <View style={styles.featureCard}>
              <Shield size={32} color={COLORS.primary} />
              <Text style={styles.featureTitle}>Track & Street</Text>
              <Text style={styles.featureDesc}>Dual-purpose design with street-legal kit options</Text>
            </View>
            <View style={styles.featureCard}>
              <Activity size={32} color={COLORS.primary} />
              <Text style={styles.featureTitle}>Real-time Telemetry</Text>
              <Text style={styles.featureDesc}>Reycin OS integration for performance monitoring</Text>
            </View>
            <View style={styles.featureCard}>
              <Wind size={32} color={COLORS.primary} />
              <Text style={styles.featureTitle}>Advanced Aero</Text>
              <Text style={styles.featureDesc}>Adjustable wings and diffuser for optimal downforce</Text>
            </View>
            <View style={styles.featureCard}>
              <Wrench size={32} color={COLORS.primary} />
              <Text style={styles.featureTitle}>Modular Production</Text>
              <Text style={styles.featureDesc}>Hand-assembled with scalable manufacturing</Text>
            </View>
          </View>
        </View>
      ),
    },
    {
      id: 'chassis',
      title: 'Chassis & Dimensions',
      icon: <Settings size={20} color={COLORS.primary} />,
      content: (
        <View style={styles.sectionContent}>
          <Text style={styles.sectionDescription}>
            The F300 features a tubular frame chassis constructed from Schedule 5, 304 stainless steel with integrated halo protection for maximum safety.
          </Text>
          <View style={styles.specGrid}>
            <SpecCard label="Material" value="304 Stainless Steel" />
            <SpecCard label="Tube Diameter" value='1.5"' />
            <SpecCard label="Wall Thickness" value='0.06"' />
            <SpecCard label="Weight" value="330 lbs" />
          </View>
          <View style={styles.dimensionsContainer}>
            <Text style={styles.subheading}>Dimensions</Text>
            <View style={styles.dimensionsList}>
              <DimensionItem label="Overall Length" value="82 inches" />
              <DimensionItem label="Total Width" value="63 inches" />
              <DimensionItem label="Wheelbase" value="52 inches" />
              <DimensionItem label="Track Width" value="55 inches" />
              <DimensionItem label="Height" value="45-50 inches" />
              <DimensionItem label="Ground Clearance" value="3-5 inches (adjustable)" />
              <DimensionItem label="Body Width (Front)" value="18 inches" />
              <DimensionItem label="Body Width (Rear)" value="22 inches" />
            </View>
          </View>
        </View>
      ),
    },
    {
      id: 'powertrain',
      title: 'Engine & Powertrain',
      icon: <Zap size={20} color={COLORS.primary} />,
      content: (
        <View style={styles.sectionContent}>
          <Text style={styles.sectionDescription}>
            The F300 offers multiple engine configurations, from test units to production-ready turbocharged variants.
          </Text>
          
          <View style={styles.engineCard}>
            <Text style={styles.engineType}>Test Engine</Text>
            <Text style={styles.engineSpec}>420cc, 15 hp engine</Text>
          </View>
          
          <View style={styles.engineCard}>
            <Text style={styles.engineType}>Production Engine</Text>
            <Text style={styles.engineSpec}>RXT4-5 4cyl DOHC</Text>
            <View style={styles.engineFeatures}>
              <View style={styles.engineFeature}>
                <Fuel size={16} color={COLORS.primary} />
                <Text style={styles.engineFeatureText}>91 octane / 95 RON optimized</Text>
              </View>
              <View style={styles.engineFeature}>
                <Wind size={16} color={COLORS.primary} />
                <Text style={styles.engineFeatureText}>Turbocharged with intercooler</Text>
              </View>
            </View>
          </View>

          <View style={styles.transmissionSection}>
            <Text style={styles.subheading}>Transmission Ratios</Text>
            
            <View style={styles.gearboxCard}>
              <Text style={styles.gearboxTitle}>TD5 Production Gearbox</Text>
              <View style={styles.gearRatios}>
                <GearRatio gear="1st" ratio="12:1" />
                <GearRatio gear="2nd" ratio="7:1" />
                <GearRatio gear="3rd" ratio="4:1" />
                <GearRatio gear="4th" ratio="2.5:1" />
                <GearRatio gear="5th" ratio="2.31:1" />
              </View>
            </View>
            
            <View style={styles.gearboxCard}>
              <Text style={styles.gearboxTitle}>T3.5 Test Gearbox</Text>
              <View style={styles.gearRatios}>
                <GearRatio gear="1st" ratio="5:1" />
                <GearRatio gear="2nd" ratio="3:1" />
                <GearRatio gear="3rd" ratio="2:1" />
                <GearRatio gear="4th/5th" ratio="Optional" />
              </View>
            </View>
          </View>

          <View style={styles.coolingCard}>
            <Text style={styles.coolingTitle}>Advanced Cooling System</Text>
            <Text style={styles.coolingDesc}>
              Liquid cooling with radiator and intercooler designed to handle the increased heat from turbocharged configurations.
            </Text>
          </View>
        </View>
      ),
    },
    {
      id: 'suspension',
      title: 'Suspension & Handling',
      icon: <Gauge size={20} color={COLORS.primary} />,
      content: (
        <View style={styles.sectionContent}>
          <Text style={styles.sectionDescription}>
            Precision-tuned suspension geometry for optimal track performance and adjustable street comfort.
          </Text>
          
          <View style={styles.suspensionGrid}>
            <Text style={styles.subheading}>Wheel Placement</Text>
            <View style={styles.wheelPlacement}>
              <SpecCard label="Front from nose" value="14 inches" />
              <SpecCard label="Rear from edge" value="12 inches" />
            </View>
            
            <Text style={styles.subheading}>Control Arms</Text>
            <View style={styles.controlArms}>
              <SpecCard label="Upper Arms" value="10-11 inches" />
              <SpecCard label="Lower Arms" value="12-14 inches" />
            </View>
            
            <Text style={styles.subheading}>Alignment Settings</Text>
            <View style={styles.alignmentGrid}>
              <AlignmentCard 
                title="Camber"
                front="-1° to -2°"
                rear="0° to -1°"
                description="Optimized for cornering grip"
              />
              <AlignmentCard 
                title="Caster"
                front="5° to 7°"
                rear="Minimal"
                description="High-speed stability"
              />
              <AlignmentCard 
                title="Toe"
                front="0.1° to 0.2° in"
                rear="0.1° to 0.3° in"
                description="Enhanced stability"
              />
            </View>
            
            <Text style={styles.subheading}>Spring & Damper Rates</Text>
            <View style={styles.springGrid}>
              <SpringCard
                title="Front Suspension"
                springRate="28-42 lb/in"
                damping="100-200 lbf/in/sec"
                travel="2-3 inches"
                stroke="3-4 inches"
              />
              <SpringCard
                title="Rear Suspension"
                springRate="42-63 lb/in"
                damping="150-300 lbf/in/sec"
                travel="2-3 inches"
                stroke="3-4 inches"
              />
            </View>
          </View>
        </View>
      ),
    },
    {
      id: 'performance',
      title: 'Performance Systems',
      icon: <Activity size={20} color={COLORS.primary} />,
      content: (
        <View style={styles.sectionContent}>
          <Text style={styles.sectionDescription}>
            Advanced performance systems designed for both track dominance and street capability.
          </Text>
          
          <View style={styles.performanceCard}>
            <Text style={styles.performanceTitle}>Braking System</Text>
            <View style={styles.performanceFeatures}>
              <PerformanceFeature text="Hydraulic disc brakes on all four wheels" />
              <PerformanceFeature text="Integrated brake cooling system" />
              <PerformanceFeature text="Regenerative braking (future versions)" />
            </View>
          </View>
          
          <View style={styles.performanceCard}>
            <Text style={styles.performanceTitle}>Tire Configuration</Text>
            <View style={styles.performanceFeatures}>
              <PerformanceFeature text="14x8 tire dimensions (front & rear)" />
              <PerformanceFeature text="Soft, medium, and hard compounds available" />
              <PerformanceFeature text="Performance street tires for road use" />
            </View>
          </View>
          
          <View style={styles.performanceCard}>
            <Text style={styles.performanceTitle}>Aerodynamics</Text>
            <View style={styles.performanceFeatures}>
              <PerformanceFeature text="Adjustable front and rear wings" />
              <PerformanceFeature text="Rear diffuser for high-speed stability" />
              <PerformanceFeature text="CFD-optimized body panels" />
              <PerformanceFeature text="Wind tunnel tested design" />
            </View>
          </View>
          
          <View style={styles.performanceCard}>
            <Text style={styles.performanceTitle}>Fuel System</Text>
            <View style={styles.performanceFeatures}>
              <PerformanceFeature text="Rear-mounted fuel cell" />
              <PerformanceFeature text="91 octane and 95 RON compatible" />
              <PerformanceFeature text="Future hydrogen fuel exploration" />
            </View>
          </View>
        </View>
      ),
    },
    {
      id: 'technology',
      title: 'Technology & Data',
      icon: <Cpu size={20} color={COLORS.primary} />,
      content: (
        <View style={styles.sectionContent}>
          <Text style={styles.sectionDescription}>
            Cutting-edge electronics and telemetry systems powered by Reycin OS for comprehensive performance monitoring.
          </Text>
          
          <View style={styles.techCard}>
            <View style={styles.techHeader}>
              <Cpu size={24} color={COLORS.primary} />
              <Text style={styles.techTitle}>Reycin OS Integration</Text>
            </View>
            <View style={styles.techFeatures}>
              <TechFeature title="Performance Logging" desc="Real-time data capture and analysis" />
              <TechFeature title="Graph Displays" desc="Visual performance metrics" />
              <TechFeature title="Report Generation" desc="Detailed session analysis" />
              <TechFeature title="Self-Diagnosis" desc="Automated system health monitoring" />
            </View>
          </View>
          
          <View style={styles.techCard}>
            <View style={styles.techHeader}>
              <Activity size={24} color={COLORS.primary} />
              <Text style={styles.techTitle}>Sensor Array</Text>
            </View>
            <View style={styles.sensorGrid}>
              <SensorItem name="Engine Temperature" />
              <SensorItem name="Braking Force" />
              <SensorItem name="Tire Wear" />
              <SensorItem name="G-Force" />
              <SensorItem name="Lap Times" />
              <SensorItem name="Speed & RPM" />
            </View>
          </View>
          
          <View style={styles.techCard}>
            <View style={styles.techHeader}>
              <Settings size={24} color={COLORS.primary} />
              <Text style={styles.techTitle}>Exact Lap F Series Steering Wheel</Text>
            </View>
            <Text style={styles.techDesc}>
              Central hub for all data processing and driver controls, featuring integrated display and customizable buttons for on-the-fly adjustments.
            </Text>
          </View>
          
          <View style={styles.espCard}>
            <Text style={styles.espTitle}>ESP32 Powered</Text>
            <Text style={styles.espDesc}>Low-latency data communication across all systems</Text>
          </View>
        </View>
      ),
    },
    {
      id: 'ergonomics',
      title: 'Driver Ergonomics',
      icon: <Shield size={20} color={COLORS.primary} />,
      content: (
        <View style={styles.sectionContent}>
          <Text style={styles.sectionDescription}>
            Designed with driver comfort and adjustability in mind, accommodating a wide range of body types.
          </Text>
          
          <View style={styles.ergonomicsGrid}>
            <ErgonomicsCard
              title="Adjustable Seat"
              spec="6 inches of movement"
              description="Forward and backward sliding mechanism"
              icon={<Settings size={24} color={COLORS.primary} />}
            />
            <ErgonomicsCard
              title="Steering Adjustment"
              spec="6 inches of travel"
              description="Accommodates various arm lengths"
              icon={<Settings size={24} color={COLORS.primary} />}
            />
            <ErgonomicsCard
              title="Cockpit Width"
              spec='16" front, 18" rear'
              description="Ample space for driver comfort"
              icon={<Shield size={24} color={COLORS.primary} />}
            />
            <ErgonomicsCard
              title="Halo Protection"
              spec="Integrated safety"
              description="FIA-inspired head protection system"
              icon={<Shield size={24} color={COLORS.primary} />}
            />
          </View>
          
          <View style={styles.futureCard}>
            <Text style={styles.futureTitle}>Future Customization</Text>
            <Text style={styles.futureDesc}>
              Future versions will include extensive options for seat and control customization based on driver feedback during initial testing phases.
            </Text>
          </View>
        </View>
      ),
    },
    {
      id: 'production',
      title: 'Production & Future',
      icon: <Wrench size={20} color={COLORS.primary} />,
      content: (
        <View style={styles.sectionContent}>
          <Text style={styles.sectionDescription}>
            Limited initial production with scalable manufacturing capabilities for future expansion.
          </Text>
          
          <View style={styles.productionCard}>
            <Text style={styles.productionTitle}>Initial Production Run</Text>
            <Text style={styles.productionSpec}>15-20 Units</Text>
            <Text style={styles.productionDesc}>Hand-assembled in the United States with meticulous attention to detail</Text>
          </View>
          
          <View style={styles.productionCard}>
            <Text style={styles.productionTitle}>Modular Production System</Text>
            <Text style={styles.productionDesc}>
              Dual-jig setup capable of producing two vehicles simultaneously, with scalability through additional jig systems.
            </Text>
            <View style={styles.scalabilityInfo}>
              <Text style={styles.scalabilityText}>2x production capacity per additional jig</Text>
            </View>
          </View>
          
          <View style={styles.complianceCard}>
            <Text style={styles.complianceTitle}>Street Legal Compliance</Text>
            <View style={styles.complianceGrid}>
              <ComplianceItem 
                icon={<Volume2 size={20} color={COLORS.primary} />}
                title="Noise Control"
                desc="Mufflers and sound dampening"
              />
              <ComplianceItem 
                icon={<Wind size={20} color={COLORS.primary} />}
                title="Emissions"
                desc="Catalytic converters included"
              />
            </View>
          </View>
          
          <View style={styles.futureUpgradesCard}>
            <Text style={styles.futureUpgradesTitle}>Future Development</Text>
            <View style={styles.upgradesList}>
              <UpgradeItem text="MGU-K energy recovery systems" />
              <UpgradeItem text="Chassis pressurization technology" />
              <UpgradeItem text="Water and methane injection systems" />
              <UpgradeItem text="Extended driver customization options" />
              <UpgradeItem text="Hydrogen fuel exploration" />
            </View>
          </View>
        </View>
      ),
    },
  ];

  const handleSectionPress = (sectionId: string) => {
    setActiveSection(sectionId);
    scrollViewRef.current?.scrollTo({ x: 0, y: 0, animated: true });
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#000000', '#0a0a0a', '#000000']}
        style={StyleSheet.absoluteFillObject}
      />
      
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>REYCIN F300</Text>
            <Text style={styles.headerSubtitle}>Explorer</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <Animated.View 
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.tabsContainer}
            contentContainerStyle={styles.tabsContent}
          >
            {sections.map((section) => (
              <TouchableOpacity
                key={section.id}
                style={[
                  styles.tab,
                  activeSection === section.id && styles.activeTab,
                ]}
                onPress={() => handleSectionPress(section.id)}
              >
                {section.icon}
                <Text
                  style={[
                    styles.tabText,
                    activeSection === section.id && styles.activeTabText,
                  ]}
                >
                  {section.title}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {sections.find((s) => s.id === activeSection)?.content}
            
            <View style={styles.ctaSection}>
              <LinearGradient
                colors={[COLORS.primary, '#FF4500']}
                style={styles.ctaGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.ctaTitle}>Reserve Your F300</Text>
                <Text style={styles.ctaDesc}>Be among the first to experience four-cylinder perfection</Text>
                <TouchableOpacity style={styles.ctaButton}>
                  <Text style={styles.ctaButtonText}>Join Waitlist</Text>
                  <ChevronRight size={20} color="#000" />
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </ScrollView>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
};

// Component definitions
const SpecCard = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.specCard}>
    <Text style={styles.specLabel}>{label}</Text>
    <Text style={styles.specValue}>{value}</Text>
  </View>
);

const DimensionItem = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.dimensionItem}>
    <Text style={styles.dimensionLabel}>{label}</Text>
    <Text style={styles.dimensionValue}>{value}</Text>
  </View>
);

const GearRatio = ({ gear, ratio }: { gear: string; ratio: string }) => (
  <View style={styles.gearRatio}>
    <Text style={styles.gearLabel}>{gear}</Text>
    <Text style={styles.ratioValue}>{ratio}</Text>
  </View>
);

const AlignmentCard = ({ title, front, rear, description }: { title: string; front: string; rear: string; description: string }) => (
  <View style={styles.alignmentCard}>
    <Text style={styles.alignmentTitle}>{title}</Text>
    <View style={styles.alignmentValues}>
      <View style={styles.alignmentValue}>
        <Text style={styles.alignmentLabel}>Front</Text>
        <Text style={styles.alignmentSpec}>{front}</Text>
      </View>
      <View style={styles.alignmentValue}>
        <Text style={styles.alignmentLabel}>Rear</Text>
        <Text style={styles.alignmentSpec}>{rear}</Text>
      </View>
    </View>
    <Text style={styles.alignmentDesc}>{description}</Text>
  </View>
);

const SpringCard = ({ title, springRate, damping, travel, stroke }: { title: string; springRate: string; damping: string; travel: string; stroke: string }) => (
  <View style={styles.springCard}>
    <Text style={styles.springTitle}>{title}</Text>
    <View style={styles.springSpecs}>
      <View style={styles.springSpec}>
        <Text style={styles.springSpecLabel}>Spring Rate</Text>
        <Text style={styles.springSpecValue}>{springRate}</Text>
      </View>
      <View style={styles.springSpec}>
        <Text style={styles.springSpecLabel}>Damping</Text>
        <Text style={styles.springSpecValue}>{damping}</Text>
      </View>
      <View style={styles.springSpec}>
        <Text style={styles.springSpecLabel}>Travel</Text>
        <Text style={styles.springSpecValue}>{travel}</Text>
      </View>
      <View style={styles.springSpec}>
        <Text style={styles.springSpecLabel}>Stroke</Text>
        <Text style={styles.springSpecValue}>{stroke}</Text>
      </View>
    </View>
  </View>
);

const PerformanceFeature = ({ text }: { text: string }) => (
  <View style={styles.performanceFeature}>
    <ChevronRight size={16} color={COLORS.primary} />
    <Text style={styles.performanceFeatureText}>{text}</Text>
  </View>
);

const TechFeature = ({ title, desc }: { title: string; desc: string }) => (
  <View style={styles.techFeature}>
    <Text style={styles.techFeatureTitle}>{title}</Text>
    <Text style={styles.techFeatureDesc}>{desc}</Text>
  </View>
);

const SensorItem = ({ name }: { name: string }) => (
  <View style={styles.sensorItem}>
    <Activity size={16} color={COLORS.primary} />
    <Text style={styles.sensorName}>{name}</Text>
  </View>
);

const ErgonomicsCard = ({ title, spec, description, icon }: { title: string; spec: string; description: string; icon: React.ReactNode }) => (
  <View style={styles.ergonomicsCard}>
    {icon}
    <Text style={styles.ergonomicsTitle}>{title}</Text>
    <Text style={styles.ergonomicsSpec}>{spec}</Text>
    <Text style={styles.ergonomicsDesc}>{description}</Text>
  </View>
);

const ComplianceItem = ({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) => (
  <View style={styles.complianceItem}>
    {icon}
    <View style={styles.complianceContent}>
      <Text style={styles.complianceTitle}>{title}</Text>
      <Text style={styles.complianceDesc}>{desc}</Text>
    </View>
  </View>
);

const UpgradeItem = ({ text }: { text: string }) => (
  <View style={styles.upgradeItem}>
    <View style={styles.upgradeBullet} />
    <Text style={styles.upgradeText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    padding: 8,
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.primary,
    marginTop: 2,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  tabsContainer: {
    maxHeight: 60,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  tabsContent: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  activeTab: {
    backgroundColor: 'rgba(255, 69, 0, 0.2)',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  tabText: {
    color: '#888',
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500' as const,
  },
  activeTabText: {
    color: COLORS.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  sectionContent: {
    padding: 20,
  },
  tagline: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  description: {
    fontSize: 16,
    color: '#ccc',
    lineHeight: 24,
    marginBottom: 24,
  },
  sectionDescription: {
    fontSize: 15,
    color: '#aaa',
    lineHeight: 22,
    marginBottom: 20,
  },
  releaseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 69, 0, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 0, 0.3)',
  },
  releaseInfo: {
    marginLeft: 16,
  },
  releaseLabel: {
    fontSize: 12,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  releaseDate: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#fff',
    marginTop: 4,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  featureCard: {
    width: '50%',
    padding: 8,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
    marginTop: 12,
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 13,
    color: '#888',
    lineHeight: 18,
  },
  specGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 24,
  },
  specCard: {
    width: '50%',
    padding: 6,
  },
  specLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  specValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: COLORS.primary,
  },
  subheading: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#fff',
    marginBottom: 16,
    marginTop: 8,
  },
  dimensionsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 16,
  },
  dimensionsList: {},
  dimensionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  dimensionLabel: {
    fontSize: 14,
    color: '#aaa',
  },
  dimensionValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
  },
  engineCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  engineType: {
    fontSize: 12,
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  engineSpec: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 12,
  },
  engineFeatures: {
    marginTop: 8,
  },
  engineFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  engineFeatureText: {
    fontSize: 14,
    color: '#aaa',
    marginLeft: 8,
  },
  transmissionSection: {
    marginTop: 24,
  },
  gearboxCard: {
    backgroundColor: 'rgba(255, 69, 0, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 0, 0.2)',
  },
  gearboxTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
    marginBottom: 12,
  },
  gearRatios: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gearRatio: {
    width: '33.33%',
    paddingVertical: 8,
  },
  gearLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
  },
  ratioValue: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: COLORS.primary,
  },
  coolingCard: {
    backgroundColor: 'rgba(0, 150, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 150, 255, 0.2)',
  },
  coolingTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#00BFFF',
    marginBottom: 8,
  },
  coolingDesc: {
    fontSize: 14,
    color: '#aaa',
    lineHeight: 20,
  },
  suspensionGrid: {},
  wheelPlacement: {
    flexDirection: 'row',
    marginHorizontal: -6,
    marginBottom: 16,
  },
  controlArms: {
    flexDirection: 'row',
    marginHorizontal: -6,
    marginBottom: 16,
  },
  alignmentGrid: {
    marginBottom: 24,
  },
  alignmentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  alignmentTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: COLORS.primary,
    marginBottom: 12,
  },
  alignmentValues: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  alignmentValue: {
    flex: 1,
  },
  alignmentLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  alignmentSpec: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
  },
  alignmentDesc: {
    fontSize: 13,
    color: '#888',
    fontStyle: 'italic',
  },
  springGrid: {},
  springCard: {
    backgroundColor: 'rgba(255, 69, 0, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 0, 0.2)',
  },
  springTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
    marginBottom: 12,
  },
  springSpecs: {},
  springSpec: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  springSpecLabel: {
    fontSize: 13,
    color: '#888',
  },
  springSpecValue: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: COLORS.primary,
  },
  performanceCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  performanceTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#fff',
    marginBottom: 12,
  },
  performanceFeatures: {},
  performanceFeature: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  performanceFeatureText: {
    fontSize: 14,
    color: '#aaa',
    marginLeft: 8,
    flex: 1,
  },
  techCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  techHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  techTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#fff',
    marginLeft: 12,
  },
  techDesc: {
    fontSize: 14,
    color: '#aaa',
    lineHeight: 20,
  },
  techFeatures: {},
  techFeature: {
    marginBottom: 12,
  },
  techFeatureTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: COLORS.primary,
    marginBottom: 4,
  },
  techFeatureDesc: {
    fontSize: 13,
    color: '#888',
  },
  sensorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  sensorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '50%',
    paddingVertical: 8,
  },
  sensorName: {
    fontSize: 14,
    color: '#aaa',
    marginLeft: 8,
  },
  espCard: {
    backgroundColor: 'rgba(0, 200, 100, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 200, 100, 0.3)',
    alignItems: 'center',
  },
  espTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#00FF7F',
    marginBottom: 4,
  },
  espDesc: {
    fontSize: 13,
    color: '#aaa',
    textAlign: 'center',
  },
  ergonomicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  ergonomicsCard: {
    width: '50%',
    padding: 8,
  },
  ergonomicsTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
    marginTop: 8,
    marginBottom: 4,
  },
  ergonomicsSpec: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: COLORS.primary,
    marginBottom: 4,
  },
  ergonomicsDesc: {
    fontSize: 12,
    color: '#888',
    lineHeight: 16,
  },
  futureCard: {
    backgroundColor: 'rgba(255, 69, 0, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 0, 0.2)',
  },
  futureTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: COLORS.primary,
    marginBottom: 8,
  },
  futureDesc: {
    fontSize: 14,
    color: '#aaa',
    lineHeight: 20,
  },
  productionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  productionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
    marginBottom: 8,
  },
  productionSpec: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: COLORS.primary,
    marginBottom: 8,
  },
  productionDesc: {
    fontSize: 14,
    color: '#aaa',
    lineHeight: 20,
  },
  scalabilityInfo: {
    backgroundColor: 'rgba(255, 69, 0, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  scalabilityText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600' as const,
    textAlign: 'center',
  },
  complianceCard: {
    backgroundColor: 'rgba(0, 150, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 150, 255, 0.2)',
  },
  complianceTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#00BFFF',
    marginBottom: 12,
  },
  complianceGrid: {},
  complianceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  complianceContent: {
    marginLeft: 12,
    flex: 1,
  },
  complianceDesc: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  futureUpgradesCard: {
    backgroundColor: 'rgba(255, 69, 0, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 0, 0.2)',
  },
  futureUpgradesTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#fff',
    marginBottom: 16,
  },
  upgradesList: {},
  upgradeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  upgradeBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    marginTop: 6,
    marginRight: 10,
  },
  upgradeText: {
    fontSize: 14,
    color: '#aaa',
    flex: 1,
  },
  ctaSection: {
    margin: 20,
    marginTop: 40,
  },
  ctaGradient: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 8,
  },
  ctaDesc: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 20,
    textAlign: 'center',
  },
  ctaButton: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#000',
    marginRight: 8,
  },
});

export default F300Explorer;