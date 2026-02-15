// src/components/layout/Footer.tsx
import React from 'react';
import Link from 'next/link';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-white dark:bg-gray-900 shadow-inner dark:shadow-gray-950/50 mt-12 py-6 border-t border-transparent dark:border-gray-800">
      <div className="w-full px-6 text-center text-gray-500 dark:text-gray-400 text-xs">
        <p>
          &copy; {currentYear}{' '}
          <a
            href="https://designare.at/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-700 dark:hover:text-gray-300 hover:underline"
          >
            Michael Kanda & Evita
          </a>
          . Jede Codezeile von Hand gestreichelt. Also bitte nicht klauen. Alle
          Rechte vorbehalten.
          
          <span className="mx-2">|</span>
          <Link
            href="/impressum"
            className="hover:text-gray-700 dark:hover:text-gray-300 hover:underline"
          >
            Impressum
          </Link>
          <span className="mx-2">|</span>
          <Link
            href="/datenschutz"
            className="hover:text-gray-700 dark:hover:text-gray-300 hover:underline"
          >
            Datenschutzerklärung
          </Link>
        </p>
      </div>
    </footer>
  );
};

export default Footer;
