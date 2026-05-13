import { Link } from 'react-router-dom';
import { Github, Linkedin, Mail, ArrowUp, Heart, MessageCircle } from 'lucide-react';

function handleScrollTop() {
  window.scroll({
    top: 0,
    behavior: "smooth",
  });
}

const navigation = {
  sections: [
    {
      name: "Product",
      items: [
        { name: "Features", href: "/features" },
        { name: "Pricing", href: "/pricing" },
        { name: "How to Use", href: "/how-to-use" },
        { name: "Use Cases", href: "/use-cases" },
      ],
    },
    {
      name: "Company",
      items: [
        { name: "About Us", href: "/about" },
        { name: "Contact", href: "/contact" },
        { name: "Blog", href: "/blog" },
        { name: "Careers", href: "/careers" },
      ],
    },
    {
      name: "Resources",
      items: [
        { name: "FAQ", href: "/faq" },
        { name: "Documentation", href: "/how-to-use" },
        { name: "API", href: "#api" },
        { name: "Status", href: "#status" },
      ],
    },
    {
      name: "Legal",
      items: [
        { name: "Privacy Policy", href: "/privacy" },
        { name: "Terms of Service", href: "/terms" },
        { name: "Cookie Policy", href: "/cookie-policy" },
      ],
    },
    {
      name: "Developers",
      items: [
        { name: "API Documentation", href: "/api-docs" },
        { name: "System Status", href: "/status" },
        { name: "Blog", href: "/blog" },
        { name: "Careers", href: "/careers" },
      ],
    },
  ],
};

const Underline = `hover:-translate-y-1 border border-dotted rounded-xl p-2.5 transition-transform dark:border-zinc-700 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400`;

export function Footer() {
  return (
    <footer id="contact" className="border-gray-200 dark:border-zinc-700 mx-auto w-full border-t">
      <div className="relative mx-auto grid max-w-7xl items-center justify-center gap-6 p-10 pb-0 md:flex">
        <Link to="/">
          <div className="flex items-center justify-center rounded-full">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-400 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-xl">AI</span>
            </div>
          </div>
        </Link>
        <p className="bg-transparent text-center text-xs leading-4 text-gray-600 dark:text-gray-400 md:text-left">
          Welcome to Vector Mind AI, where artificial intelligence meets education. 
          Transform your learning experience with our advanced AI-powered tools. 
          Get instant answers, analyze documents, generate images, and have voice conversations 
          with your AI tutor. Built for students who want to excel in their academic journey. 
          Experience the future of learning today.
        </p>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="border-b border-dotted dark:border-zinc-700"></div>
        <div className="py-10">
          <div className="grid grid-cols-3 flex-row justify-between gap-6 leading-6 md:flex">
            {navigation.sections.map((section) => (
              <div key={section.name}>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  {section.name}
                </h3>
                <ul role="list" className="flex flex-col space-y-2">
                  {section.items.map((item) => (
                    <li key={item.name} className="flow-root">
                      {item.href.startsWith('#') ? (
                        <a
                          href={item.href}
                          onClick={(e) => {
                            if (window.location.pathname !== '/') {
                              e.preventDefault();
                              window.location.href = '/' + item.href;
                            }
                          }}
                          className="text-sm text-slate-600 hover:text-black dark:text-slate-400 hover:dark:text-white md:text-xs"
                        >
                          {item.name}
                        </a>
                      ) : (
                        <Link
                          to={item.href}
                          className="text-sm text-slate-600 hover:text-black dark:text-slate-400 hover:dark:text-white md:text-xs"
                        >
                          {item.name}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="border-b border-dotted dark:border-zinc-700"></div>
      </div>

      <div className="flex flex-wrap justify-center gap-y-6">
        <div className="flex flex-wrap items-center justify-center gap-3 px-6">
          <a
            aria-label="Email"
            href="mailto:bansalyugal3@gmail.com"
            rel="noreferrer"
            target="_blank"
            className={Underline}
          >
            <Mail strokeWidth={1.5} className="h-5 w-5" />
          </a>
          <a
            aria-label="GitHub"
            href="https://github.com/yugalbansal"
            rel="noreferrer"
            target="_blank"
            className={Underline}
          >
            <Github className="h-5 w-5" />
          </a>
          <a
            aria-label="LinkedIn"
            href="https://www.linkedin.com/in/yugalb"
            rel="noreferrer"
            target="_blank"
            className={Underline}
          >
            <Linkedin className="h-5 w-5" />
          </a>
          <a
            aria-label="WhatsApp"
            href="https://wa.me/918901293583"
            rel="noreferrer"
            target="_blank"
            className={Underline}
          >
            <MessageCircle className="h-5 w-5" />
          </a>
        </div>
        
        <div className="flex items-center justify-center ml-3">
          <button
            type="button"
            onClick={handleScrollTop}
            className="border border-dotted rounded-full p-2.5 hover:-translate-y-1 transition-transform dark:border-zinc-700 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
          >
            <ArrowUp className="h-5 w-5" />
            <span className="sr-only">Scroll to top</span>
          </button>
        </div>
      </div>

      <div className="mx-auto mb-10 mt-10 flex flex-col justify-between text-center text-xs md:max-w-7xl">
        <div className="flex flex-row items-center justify-center gap-1 text-slate-600 dark:text-slate-400">
          <span>©</span>
          <span>{new Date().getFullYear()}</span>
          <span>Made with</span>
          <Heart className="text-red-600 mx-1 h-4 w-4" fill="currentColor" />
          <span>by</span>
          <span className="cursor-pointer text-black dark:text-white font-semibold">
            Yugal
          </span>
          <span>-</span>
          <span className="hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer">
            <Link to="/">Vector Mind AI</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
