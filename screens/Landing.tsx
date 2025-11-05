import { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView,
  Linking,
  SafeAreaView,
  StatusBar
} from 'react-native';
import Header from '../components/global/Header';
import SignIn from '../components/modals/SignIn';
import SignUp from '../components/modals/SignUp';
import ResetPassword from '../components/modals/ResetPassword';
import { 
  Upload, 
  MapPin, 
  Shield, 
  Bell, 
  Users, 
  Clock,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
  MapPin as LocationIcon,
} from 'lucide-react-native';

type AuthModalType = 'signin' | 'signup' | 'reset' | null;

const Landing=({ navigation }: any)=> {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [activeModal, setActiveModal] = useState<AuthModalType>(null);

  const faqs = [
    {
      question: "How does PrintEase work?",
      answer: "Simply upload your documents, choose a nearby print shop, make a secure payment, and track your order in real-time. You'll receive notifications when your prints are ready for pickup."
    },
    {
      question: "What file formats do you support?",
      answer: "We support PDF, DOC, DOCX, JPG, PNG, and many other common file formats. Our system automatically optimizes your files for the best print quality."
    },
    {
      question: "How secure are my documents?",
      answer: "Your documents are encrypted during upload and automatically deleted from our servers after printing. We use enterprise-grade security to protect your privacy."
    },
    {
      question: "What if I'm not satisfied with the print quality?",
      answer: "We guarantee quality prints. If you're not satisfied, contact us within 24 hours and we'll work with the print shop to resolve the issue or provide a refund."
    }
  ];

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />
      
      {/* Header - Fixed at top */}
      <Header onAuthPress={(type) => setActiveModal(type)} />
      
      <ScrollView className="flex-1 bg-white">
        {/* Hero Section */}
        <View className="px-6 py-16 bg-gradient-to-b from-blue-50 to-white">
          <View className="items-center mb-8">
            <View className="px-4 py-2 bg-blue-100 rounded-full mb-6">
              <Text className="text-sm font-medium text-blue-700">
                ✨ Revolutionizing Print Services
              </Text>
            </View>
            
            <Text className="text-5xl font-bold text-gray-900 text-center mb-4">
              Print
            </Text>
            <Text className="text-5xl font-bold text-center mb-2 text-blue-600">
              Anywhere
            </Text>
            <Text className="text-5xl font-bold text-gray-700 text-center mb-6">
              Anytime
            </Text>
            
            <Text className="text-lg text-gray-600 text-center max-w-md mb-8">
              Connect instantly with local print shops. Upload documents, track orders, and pay securely—all in one seamless experience.
            </Text>

            {/* CTA Buttons */}
            <View className="w-full gap-4">
              <TouchableOpacity 
                onPress={() => setActiveModal('signup')}
                className="bg-blue-600 py-4 px-8 rounded-xl shadow-lg active:scale-95"
              >
                <Text className="text-white text-lg font-semibold text-center">
                  Start Printing Now
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={() => setActiveModal('signin')}
                className="bg-white border-2 border-blue-600 py-4 px-8 rounded-xl active:scale-95"
              >
                <Text className="text-blue-600 text-lg font-semibold text-center">
                  Sign In
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Why Choose Section */}
        <View className="px-6 py-16 bg-gray-50">
          <Text className="text-4xl font-bold text-gray-900 text-center mb-4">
            Why Choose PrintEase?
          </Text>
          <Text className="text-xl text-gray-600 text-center mb-12">
            Discover the features that make printing effortless
          </Text>

          {/* Features Grid */}
          <View className="gap-4">
            {/* Instant Upload */}
            <View className="bg-white p-6 rounded-2xl shadow-sm">
              <View className="w-14 h-14 bg-blue-500 rounded-2xl items-center justify-center mb-4">
                <Upload color="#fff" size={28} />
              </View>
              <Text className="text-2xl font-bold text-gray-900 mb-3">
                Instant Document Upload
              </Text>
              <Text className="text-gray-600 text-base leading-relaxed mb-4">
                Upload your documents in seconds with our advanced file processing system. Support for PDF, DOC, images, and more.
              </Text>
              <View className="flex-row gap-4">
                <View className="flex-row items-center">
                  <CheckCircle color="#10b981" size={16} />
                  <Text className="text-sm text-gray-500 ml-1">Multiple formats</Text>
                </View>
                <View className="flex-row items-center">
                  <CheckCircle color="#10b981" size={16} />
                  <Text className="text-sm text-gray-500 ml-1">Cloud storage</Text>
                </View>
              </View>
            </View>

            {/* Find Nearby Shops */}
            <View className="bg-white p-6 rounded-2xl shadow-sm">
              <View className="w-12 h-12 bg-green-500 rounded-xl items-center justify-center mb-3">
                <MapPin color="#fff" size={24} />
              </View>
              <Text className="text-lg font-semibold text-gray-900 mb-2">
                Find Nearby Shops
              </Text>
              <Text className="text-gray-600 text-sm">
                Locate print shops near you with real-time availability
              </Text>
            </View>

            {/* Secure Payments */}
            <View className="bg-white p-6 rounded-2xl shadow-sm">
              <View className="w-12 h-12 bg-purple-500 rounded-xl items-center justify-center mb-3">
                <Shield color="#fff" size={24} />
              </View>
              <Text className="text-lg font-semibold text-gray-900 mb-2">
                Secure Payments
              </Text>
              <Text className="text-gray-600 text-sm">
                50% upfront payment system prevents fraud and ensures quality
              </Text>
            </View>

            {/* Real-time Tracking */}
            <View className="bg-white p-6 rounded-2xl shadow-sm">
              <View className="flex-row items-center gap-4">
                <View className="w-12 h-12 bg-orange-500 rounded-xl items-center justify-center">
                  <Clock color="#fff" size={24} />
                </View>
                <View className="flex-1">
                  <Text className="text-lg font-semibold text-gray-900 mb-1">
                    Real-time Tracking
                  </Text>
                  <Text className="text-gray-600 text-sm">
                    Track your order status from upload to pickup with live notifications
                  </Text>
                </View>
              </View>
            </View>

            {/* Smart Alerts */}
            <View className="bg-white p-6 rounded-2xl shadow-sm">
              <View className="w-12 h-12 bg-teal-500 rounded-xl items-center justify-center mb-3">
                <Bell color="#fff" size={24} />
              </View>
              <Text className="text-lg font-semibold text-gray-900 mb-2">
                Smart Alerts
              </Text>
              <Text className="text-gray-600 text-sm">
                Get notified at every step of your printing journey
              </Text>
            </View>

            {/* Quality Guarantee */}
            <View className="bg-white p-6 rounded-2xl shadow-sm">
              <View className="w-12 h-12 bg-emerald-500 rounded-xl items-center justify-center mb-3">
                <CheckCircle color="#fff" size={24} />
              </View>
              <Text className="text-lg font-semibold text-gray-900 mb-3">
                Quality Guarantee
              </Text>
              <Text className="text-gray-600 text-sm leading-relaxed mb-4">
                We ensure every print meets our high standards with quality checks and satisfaction guarantee.
              </Text>
              <View className="gap-2">
                <View className="flex-row items-center">
                  <View className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2" />
                  <Text className="text-xs text-gray-500">24/7 Quality Control</Text>
                </View>
                <View className="flex-row items-center">
                  <View className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2" />
                  <Text className="text-xs text-gray-500">Money-back Guarantee</Text>
                </View>
              </View>
            </View>

            {/* Dual Access */}
            <View className="bg-white p-6 rounded-2xl shadow-sm">
              <View className="w-12 h-12 bg-pink-500 rounded-xl items-center justify-center mb-3">
                <Users color="#fff" size={24} />
              </View>
              <Text className="text-lg font-semibold text-gray-900 mb-2">
                Dual Access
              </Text>
              <Text className="text-gray-600 text-sm">
                Separate portals for customers and print shop vendors
              </Text>
            </View>
          </View>
        </View>

        {/* FAQ Section */}
        <View className="px-6 py-16 bg-white">
          <Text className="text-4xl font-bold text-gray-900 text-center mb-4">
            Frequently Asked Questions
          </Text>
          <Text className="text-xl text-gray-600 text-center mb-12">
            Everything you need to know about PrintEase
          </Text>

          <View className="gap-4">
            {faqs.map((faq, index) => (
              <View key={index} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <TouchableOpacity
                  className="p-6 flex-row items-center justify-between"
                  onPress={() => setExpandedFaq(expandedFaq === index ? null : index)}
                >
                  <Text className="text-lg font-semibold text-gray-900 flex-1 pr-4">
                    {faq.question}
                  </Text>
                  {expandedFaq === index ? (
                    <ChevronUp color="#64748b" size={20} />
                  ) : (
                    <ChevronDown color="#64748b" size={20} />
                  )}
                </TouchableOpacity>
                {expandedFaq === index && (
                  <View className="px-6 pb-6">
                    <Text className="text-gray-600 leading-relaxed">
                      {faq.answer}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Footer */}
        <View className="px-6 py-16 bg-gray-50 border-t border-gray-200">
          {/* Company Info */}
          <View className="mb-8">
            <Text className="text-lg font-semibold text-gray-900 mb-4">
              PrintEase
            </Text>
            <Text className="text-sm text-gray-600 leading-relaxed mb-6">
              Revolutionizing the printing experience through innovative technology and seamless connectivity between users and print shops.
            </Text>
          </View>

          {/* Quick Links */}
          <View className="mb-8">
            <Text className="text-lg font-semibold text-gray-900 mb-4">
              Quick Links
            </Text>
            <View className="gap-3">
              <TouchableOpacity>
                <Text className="text-sm text-gray-600">About Us</Text>
              </TouchableOpacity>
              <TouchableOpacity>
                <Text className="text-sm text-gray-600">Features</Text>
              </TouchableOpacity>
              <TouchableOpacity>
                <Text className="text-sm text-gray-600">Help Center</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Contact */}
          <View className="mb-8">
            <Text className="text-lg font-semibold text-gray-900 mb-4">
              Contact
            </Text>
            <View className="gap-3">
              <TouchableOpacity 
                className="flex-row items-center"
                onPress={() => Linking.openURL('mailto:yashwanth.lumia535@gmail.com')}
              >
                <Mail color="#64748b" size={16} />
                <Text className="text-sm text-gray-600 ml-2">
                  yashwanth.lumia535@gmail.com
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                className="flex-row items-center"
                onPress={() => Linking.openURL('tel:+919380535535')}
              >
                <Phone color="#64748b" size={16} />
                <Text className="text-sm text-gray-600 ml-2">
                  +91 9380535535
                </Text>
              </TouchableOpacity>
              <View className="flex-row items-start">
                <LocationIcon color="#64748b" size={16} />
                <Text className="text-sm text-gray-600 ml-2">
                  123 Ibrahimpatnam{'\n'}Hyderabad, Telangana 500038
                </Text>
              </View>
            </View>
          </View>

          {/* Bottom Bar */}
          <View className="pt-8 border-t border-gray-200">
            <Text className="text-sm text-gray-600 text-center mb-4">
              © {new Date().getFullYear()} PrintEase. All rights reserved.
            </Text>
            <View className="flex-row justify-center gap-6">
              <TouchableOpacity>
                <Text className="text-sm text-gray-600">Privacy Policy</Text>
              </TouchableOpacity>
              <TouchableOpacity>
                <Text className="text-sm text-gray-600">Terms of Service</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Auth Modals */}
      <SignIn
        visible={activeModal === 'signin'}
        onClose={() => setActiveModal(null)}
        onSwitchToSignUp={() => setActiveModal('signup')}
        onSwitchToResetPassword={() => setActiveModal('reset')}
      />
      
      <SignUp
        visible={activeModal === 'signup'}
        onClose={() => setActiveModal(null)}
        onSwitchToSignIn={() => setActiveModal('signin')}
      />
      
      <ResetPassword
        visible={activeModal === 'reset'}
        onClose={() => setActiveModal(null)}
        onSwitchToSignIn={() => setActiveModal('signin')}
      />
    </SafeAreaView>
  );
};

export default Landing;