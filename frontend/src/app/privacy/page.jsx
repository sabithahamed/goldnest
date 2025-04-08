import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function PrivacyPage() {
  return (
    <>
      <Navbar activePage="privacy" />

       <main className="static-page-content static-page-padding">
        <div className="content-container prose lg:prose-xl mx-auto"> {/* Add prose for text styling */}
          <h1>Privacy Policy</h1>

          <p><strong>Last Updated: [Insert Date]</strong></p>

          <p>
            Welcome to GoldNest! We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website [Your Website URL] and use our services. Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the site.
          </p>

          <h2>Collection of Your Information</h2>
          <p>
            We may collect information about you in a variety of ways. The information we may collect on the Site includes:
          </p>
          <ul>
            <li><strong>Personal Data:</strong> Personally identifiable information, such as your name, shipping address, email address, telephone number, and demographic information (such as your age, gender, hometown, and interests), that you voluntarily give to us when you register with the Site or when you choose to participate in various activities related to the Site, such as online chat and message boards.</li>
            <li><strong>Financial Data:</strong> Financial information, such as data related to your payment method (e.g., valid credit card number, card brand, expiration date) that we may collect when you purchase, order, return, exchange, or request information about our services from the Site. [Explain what financial data is stored, if any, and security measures].</li>
            <li><strong>Data From Social Networks:</strong> User information from social networking sites, such as [List Social Networks Used], including your name, your social network username, location, gender, birth date, email address, profile picture, and public data for contacts, if you connect your account to such social networks.</li>
             {/* Add other types of data collected (Derivative Data, Mobile Device Data, etc.) */}
          </ul>

           <h2>Use of Your Information</h2>
            <p>Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the Site to:</p>
           <ul>
                <li>Create and manage your account.</li>
                <li>Process your transactions and send you related information, including purchase confirmations and invoices.</li>
                <li>Email you regarding your account or order.</li>
                <li>Comply with legal and regulatory requirements.</li>
                <li>[Add other uses relevant to GoldNest: e.g., Provide AI insights, manage gamification, facilitate P2P transactions if applicable]</li>
           </ul>

           {/* Add sections for: Disclosure of Your Information, Security of Your Information, Policy for Children, Controls for Do-Not-Track Features, Account Information, Contact Us */}

           <h2>Contact Us</h2>
            <p>If you have questions or comments about this Privacy Policy, please contact us at:</p>
            <p>Email: support@goldnest.com</p>
            {/* Add Address if applicable */}

        </div>
      </main>

      <Footer />
    </>
  );
}