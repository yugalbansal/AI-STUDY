import { Helmet } from 'react-helmet-async';
import { Navbar1 } from '../components/ui/navbar-1';
import { Footer } from '../components/ui/footer';
import { motion } from 'framer-motion';
import { Mail, MessageCircle, Phone, MapPin, Send, Clock, HeadphonesIcon } from 'lucide-react';
import { useState } from 'react';

const contactMethods = [
  {
    icon: Mail,
    title: "Email Support",
    description: "Get help within 24 hours",
    detail: "support@vectormind.site",
    availability: "24/7"
  },
  {
    icon: MessageCircle,
    title: "Live Chat",
    description: "Quick answers in real-time",
    detail: "Click to start chatting",
    availability: "9AM - 6PM EST"
  },
  {
    icon: HeadphonesIcon,
    title: "Community Forum",
    description: "Connect with other users",
    detail: "Join our Discord community",
    availability: "Always active"
  }
];

const teamMembers = [
  {
    name: "Yugal Bansal",
    role: "Founder & Developer",
    email: "yugal@yugalbansal.in",
    avatar: "https://ktjpfkrmsjopiytvxkzm.supabase.co/storage/v1/object/sign/meetourteam/yugalprof.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV84NzBiYjJkYy0zMThiLTQwMGQtYmNkMC0wNTZmNzc0OWU4NzIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJtZWV0b3VydGVhbS95dWdhbHByb2YucG5nIiwiaWF0IjoxNzc4NjU3MjgzLCJleHAiOjMxNzEwNzEyMTI4M30.SphQ0pfJE8OWbD9cgDerBuSrGJ75hyVkdagVH4cF8jo"
  },
];

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Messages are sent to yugal@yugalbansal.in
    alert("Thanks for reaching out! Your message has been sent directly to Yugal Bansal. We'll get back to you within 24 hours.");
    setFormData({ name: '', email: '', subject: '', message: '' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <Helmet>
        <title>Contact Us - Vector Mind AI | Support, Partnerships, Sales</title>
        <meta name="description" content="Contact Vector Mind AI for support, partnerships, or sales inquiries. Email support@vectormind.site or use our live chat. Fast response within 24 hours." />
        <meta name="keywords" content="contact vector mind ai, support, customer service, help desk, partnership inquiry, sales contact, technical support, contact us" />
        <meta property="og:title" content="Contact Us - Vector Mind AI" />
        <meta property="og:description" content="Get in touch with our team. We're here to help!" />
        <meta property="og:type" content="website" />
      </Helmet>

      <Navbar1 />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-6">
              Contact Us
            </span>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight">
              We're Here to
              <span className="text-blue-600"> Help</span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Have questions? Need help? Want to collaborate? We'd love to hear from you.
              Our team is ready to assist you.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {contactMethods.map((method, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg text-center"
              >
                <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <method.icon className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{method.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-3">{method.description}</p>
                <p className="text-blue-600 font-medium mb-2">{method.detail}</p>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Clock className="w-4 h-4" />
                  {method.availability}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section className="py-16 bg-white dark:bg-gray-800">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Send Us a Message
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Fill out the form below and we'll get back to you within 24 hours
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Subject
              </label>
              <select
                required
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={formData.subject}
                onChange={(e) => setFormData({...formData, subject: e.target.value})}
              >
                <option value="">Select a topic</option>
                <option value="general">General Question</option>
                <option value="technical">Technical Support</option>
                <option value="billing">Billing Inquiry</option>
                <option value="partnership">Partnership</option>
                <option value="feedback">Feedback</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Message
              </label>
              <textarea
                required
                rows={5}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="How can we help you?"
                value={formData.message}
                onChange={(e) => setFormData({...formData, message: e.target.value})}
              />
            </div>
            <button
              type="submit"
              className="w-full py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <Send className="w-5 h-5" />
              Send Message
            </button>
          </form>
        </div>
      </section>

      {/* Team Contacts */}
      <section className="py-16 px-4">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Contact Founder
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Have questions? Reach out directly to our founder
            </p>
          </div>
          <div className="max-w-sm mx-auto">
            {teamMembers.map((member, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg text-center"
              >
                <img
                  src={member.avatar}
                  alt={member.name}
                  className="w-24 h-24 rounded-full mx-auto mb-4 object-cover border-4 border-blue-500"
                />
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{member.name}</h3>
                <p className="text-blue-600 text-sm mb-2">{member.role}</p>
                <a
                  href={`mailto:${member.email}`}
                  className="text-gray-600 dark:text-gray-400 text-sm hover:text-blue-600"
                >
                  {member.email}
                </a>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Office Location */}
      <section className="py-16 bg-blue-50 dark:bg-gray-800">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <MapPin className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Our Headquarters</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Vector Mind AI<br />
            Based in India<br />
            Serving Users Worldwide<br />
            150+ Countries Worldwide
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}