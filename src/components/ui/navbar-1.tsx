import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Menu, X } from "lucide-react"
import { DarkModeToggle } from "../DarkModeToggle"
import { Link, useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "@clerk/clerk-react"

interface Navbar1Props {
  onGetStarted?: () => void;
}

const Navbar1 = ({ onGetStarted }: Navbar1Props) => {
  const [isOpen, setIsOpen] = useState(false)
  const { isSignedIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const toggleMenu = () => setIsOpen(!isOpen)

  const handleGetStarted = () => {
    setIsOpen(false)
    if (isSignedIn) {
      navigate('/dashboard')
    } else if (onGetStarted) {
      onGetStarted()
    } else {
      navigate('/login')
    }
  }

  const scrollToSection = (id: string) => {
    setIsOpen(false)
    if (location.pathname === "/") {
      const element = document.getElementById(id)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      } else if (id === 'home') {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    } else {
      const target = isSignedIn ? `/?allowHome=true#${id}` : `/#${id}`
      navigate(target)
    }
  }

  const navItems = [
    { name: "Home", id: "home" },
    { name: "How It Works", id: "how-it-works" },
    { name: "Features", id: "features" },
    { name: "Contact", id: "contact" }
  ]

  const logoTarget = isSignedIn ? "/?allowHome=true" : "/"

  return (
    <div className="flex justify-center w-full py-6 px-4">
      <div className="flex items-center justify-between px-6 py-3 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-md rounded-full shadow-lg border border-gray-200/50 dark:border-zinc-700/50 w-full max-w-5xl relative z-10">
        
        {/* Clickable Brand / Logo */}
        <Link 
          to={logoTarget} 
          className="flex items-center gap-2 cursor-pointer focus:outline-none"
          onClick={() => {
            if (location.pathname === "/") {
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }
          }}
        >
          <motion.div
            className="w-10 h-10 mr-0.5 overflow-hidden"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            whileHover={{ rotate: 10 }}
            transition={{ duration: 0.3 }}
          >
            <img 
              src="https://ktjpfkrmsjopiytvxkzm.supabase.co/storage/v1/object/public/logo/logoVectormind.svg" 
              alt="Vector Mind AI Logo" 
              className="w-full h-full object-cover scale-150"
              style={{ display: 'block', margin: 0, padding: 0 }}
            />
          </motion.div>
          <span className="font-bold text-gray-900 dark:text-white hidden sm:block">Vector Mind AI</span>
        </Link>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          {navItems.map((item) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              whileHover={{ scale: 1.05 }}
            >
              <button
                onClick={() => scrollToSection(item.id)}
                className="text-sm text-gray-900 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium focus:outline-none"
              >
                {item.name}
              </button>
            </motion.div>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3">
          <DarkModeToggle />
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            whileHover={{ scale: 1.05 }}
          >
            <button
              onClick={handleGetStarted}
              className="inline-flex items-center justify-center px-5 py-2 text-sm text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-full hover:from-blue-700 hover:to-blue-800 transition-all shadow-md font-medium"
            >
              {isSignedIn ? "Back to Dashboard" : "Get Started"}
            </button>
          </motion.div>
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center gap-2">
          <DarkModeToggle />
          <motion.button onClick={toggleMenu} whileTap={{ scale: 0.9 }}>
            <Menu className="h-6 w-6 text-gray-900 dark:text-white" />
          </motion.button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 bg-white dark:bg-zinc-900 z-50 pt-24 px-6 md:hidden"
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <motion.button
              className="absolute top-6 right-6 p-2"
              onClick={toggleMenu}
              whileTap={{ scale: 0.9 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <X className="h-6 w-6 text-gray-900 dark:text-white" />
            </motion.button>
            <div className="flex flex-col space-y-6">
              {navItems.map((item, i) => (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 + 0.1 }}
                  exit={{ opacity: 0, x: 20 }}
                >
                  <button
                    onClick={() => scrollToSection(item.id)}
                    className="text-base text-gray-900 dark:text-gray-300 font-medium w-full text-left"
                  >
                    {item.name}
                  </button>
                </motion.div>
              ))}

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                exit={{ opacity: 0, y: 20 }}
                className="pt-6"
              >
                <button
                  onClick={handleGetStarted}
                  className="inline-flex items-center justify-center w-full px-5 py-3 text-base text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-full hover:from-blue-700 hover:to-blue-800 transition-all shadow-md font-medium"
                >
                  {isSignedIn ? "Back to Dashboard" : "Get Started"}
                </button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export { Navbar1 }
