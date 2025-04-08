import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';


export default function TermsPage() {
  return (
    <>
      <Navbar activePage="terms" />

        <main className="static-page-content static-page-padding">
            <div className="content-container prose lg:prose-xl mx-auto">
                <h1>Terms and Conditions</h1>
                <p><strong>Last Updated: [Insert Date]</strong></p>

                <p>Please read these Terms and Conditions ("Terms", "Terms and Conditions") carefully before using the [Your Website URL] website and the GoldNest mobile application (the "Service") operated by CodeMavericks ("us", "we", or "our").</p>

                <p>Your access to and use of the Service is conditioned on your acceptance of and compliance with these Terms. These Terms apply to all visitors, users, and others who access or use the Service.</p>

                <p><strong>By accessing or using the Service you agree to be bound by these Terms. If you disagree with any part of the terms then you may not access the Service.</strong></p>

                <h2>Accounts</h2>
                <p>When you create an account with us, you must provide us information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.</p>
                <p>You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password, whether your password is with our Service or a third-party service.</p>
                {/* ... (Add sections on Purchases, Gold Pricing, Redemption, Fees, AI Insights Disclaimer, Blockchain Disclaimer, Termination, Governing Law, Changes, Contact Us etc.) ... */}

                <h2>Gold Pricing and Transactions</h2>
                <p>The price of gold displayed on the platform is based on prevailing market rates but includes a spread or commission for GoldNest. Prices are indicative and may fluctuate. Transactions are executed at the price confirmed at the time of order placement.</p>

                 <h2>Redemption of Physical Gold</h2>
                 <p>Users may redeem their digital gold balance for physical gold subject to minimum redemption amounts, verification procedures, and applicable making and delivery charges as outlined on the platform.</p>

                 <h2>Fees</h2>
                 <p>You agree to pay all applicable fees associated with your use of the Service, including transaction fees, storage fees (if any), and redemption/delivery charges. Fee schedules are available on the platform and may be updated periodically.</p>

                <h2>Disclaimers</h2>
                 <p>The AI-driven insights provided are for informational purposes only and do not constitute financial advice. Gold investments carry market risk, and past performance is not indicative of future results. Blockchain transactions are irreversible; ensure accuracy before confirming.</p>

                <h2>Termination</h2>
                <p>We may terminate or suspend access to our Service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.</p>

                {/* Add more sections as required by your platform */}

                <h2>Contact Us</h2>
                <p>If you have any questions about these Terms, please contact us at support@goldnest.com.</p>
            </div>
      </main>

      <Footer />
    </>
  );
}