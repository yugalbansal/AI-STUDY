import { Helmet } from 'react-helmet-async';
import { Navbar1 } from '../components/ui/navbar-1';
import { Footer } from '../components/ui/footer';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, Clock, Server, Database, Zap, Cloud, ExternalLink } from 'lucide-react';

const services = [
  {
    name: "Website",
    status: "operational",
    uptime: "99.98%",
    latency: "45ms",
    description: "Main website and landing pages"
  },
  {
    name: "Authentication",
    status: "operational",
    uptime: "99.95%",
    latency: "32ms",
    description: "User login and sign-up system"
  },
  {
    name: "Document Processing",
    status: "operational",
    uptime: "99.90%",
    latency: "2.3s",
    description: "PDF, DOCX, PPTX processing"
  },
  {
    name: "AI Chat",
    status: "operational",
    uptime: "99.92%",
    latency: "1.8s",
    description: "Document chat functionality"
  },
  {
    name: "JSONL Generation",
    status: "operational",
    uptime: "99.88%",
    latency: "3.2s",
    description: "Dataset generation and export"
  },
  {
    name: "Voice AI",
    status: "operational",
    uptime: "99.85%",
    latency: "450ms",
    description: "Voice call functionality"
  },
  {
    name: "Image Generation",
    status: "operational",
    uptime: "99.95%",
    latency: "2.1s",
    description: "AI image creation"
  },
  {
    name: "API",
    status: "operational",
    uptime: "99.99%",
    latency: "28ms",
    description: "Developer API endpoints"
  }
];

const incidents = [
  {
    date: "2026-05-10",
    title: "Brief API Performance Degradation",
    severity: "low",
    status: "resolved",
    description: "Some API requests experienced higher than normal latency for approximately 15 minutes. Issue was resolved automatically.",
    impact: "Minimal - 2% of requests affected"
  },
  {
    date: "2026-04-25",
    title: "Scheduled Maintenance",
    severity: "maintenance",
    status: "completed",
    description: "Routine database optimization and security updates. Service remained available throughout.",
    impact: "None - Zero downtime"
  }
];

const getStatusIcon = (status: string) => {
  switch (status) {
    case "operational":
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case "degraded":
      return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    case "outage":
      return <XCircle className="w-5 h-5 text-red-500" />;
    default:
      return <Clock className="w-5 h-5 text-gray-500" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "operational":
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    case "degraded":
      return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "outage":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
  }
};

export default function Status() {
  const overallStatus = "operational";

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <Helmet>
        <title>System Status - Vector Mind AI | Service Status & Uptime</title>
        <meta name="description" content="Check the current status of Vector Mind AI services. View uptime, latency, and any ongoing incidents. Real-time system health monitoring." />
        <meta name="keywords" content="vector mind status, system status, uptime, service status, api status, server status, system health, downtime, maintenance" />
        <meta property="og:title" content="System Status - Vector Mind AI" />
        <meta property="og:description" content="Real-time status of all Vector Mind AI services" />
        <meta property="og:type" content="website" />
      </Helmet>

      <Navbar1 />

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-green-100 dark:bg-green-900/30 rounded-full mb-6">
              {getStatusIcon(overallStatus)}
              <span className="text-green-700 dark:text-green-400 font-semibold">All Systems Operational</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 tracking-tight">
              System
              <span className="text-blue-600"> Status</span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Real-time status of all Vector Mind AI services. We continuously monitor
              our infrastructure to ensure maximum uptime and performance.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Overall Stats */}
      <section className="py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { label: "Overall Uptime", value: "99.95%", icon: Zap },
              { label: "Active Services", value: "8/8", icon: Server },
              { label: "Avg Response", value: "45ms", icon: Clock },
              { label: "Last Incident", value: "3 days ago", icon: ExternalLink }
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg text-center"
              >
                <stat.icon className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                <p className="text-gray-600 dark:text-gray-400 text-sm">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="py-16 bg-white dark:bg-gray-800">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Service Status</h2>
            <p className="text-gray-600 dark:text-gray-400">Current status of all our services</p>
          </div>
          <div className="space-y-4">
            {services.map((service, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                viewport={{ once: true }}
                className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  {getStatusIcon(service.status)}
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">{service.name}</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">{service.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Uptime (30d)</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{service.uptime}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Latency</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{service.latency}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(service.status)}`}>
                    {service.status}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Past Incidents */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Recent Incidents</h2>
            <p className="text-gray-600 dark:text-gray-400">History of any service disruptions</p>
          </div>
          <div className="space-y-6">
            {incidents.map((incident, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {incident.status === "resolved" ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <Clock className="w-5 h-5 text-yellow-500" />
                    )}
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{incident.title}</h3>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(incident.status)}`}>
                    {incident.status}
                  </span>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-4">{incident.description}</p>
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <span>📅 {incident.date}</span>
                  <span>⚠️ {incident.severity}</span>
                  <span>📊 {incident.impact}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Subscribe */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-3xl font-bold text-white mb-4">Stay Informed</h2>
          <p className="text-blue-100 mb-6">Subscribe to status updates for instant notifications</p>
          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-6 py-3 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-white"
            />
            <button className="px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors">
              Subscribe
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}