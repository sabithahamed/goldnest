import React from 'react';
import Navbar from '@/components/Navbar'; // USING ALIAS
import Footer from '@/components/Footer'; // USING ALIAS

export default function ShippingPage() {
  return (
    <>
      <Navbar activePage="shipping" />

      <main className="static-page-content static-page-padding">
        <div className="content-container prose lg:prose-xl mx-auto">
          <h1>Shipping Information</h1>

          <p>
              When you choose to redeem your digital gold balance for physical gold coins or bars through GoldNest, we ensure a secure and transparent delivery process. Here’s what you need to know about shipping:
          </p>

          <h2>Redemption Process</h2>
          <ol>
              <li>Ensure you have the minimum required gold balance for redemption (e.g., 1g, 5g, 10g).</li>
              <li>Navigate to the 'Wallet' or 'Redeem' section in your dashboard.</li>
              <li>Select the coin/bar size you wish to redeem.</li>
              <li>Confirm your registered shipping address (ensure it is accurate and complete).</li>
              <li>Review any applicable making charges, delivery fees, and insurance costs.</li>
              <li>Confirm your redemption request. Your digital gold balance will be debited accordingly.</li>
          </ol>

          <h2>Shipping Fees and Timelines</h2>
          <ul>
              <li><strong>Making Charges:</strong> Small charges may apply for the fabrication of coins/bars.</li>
              <li><strong>Delivery Fees:</strong> Calculated based on your location and the weight/value of the shipment.</li>
              <li><strong>Insurance:</strong> All shipments are fully insured against loss or damage during transit.</li>
              <li><strong>Timeline:</strong> Please allow approximately [e.g., 5-10] business days for processing and delivery after redemption confirmation. You will receive tracking information once your order is dispatched.</li>
          </ul>

          <h2>Security and Verification</h2>
          <ul>
              <li>All shipments are handled by trusted, secure logistics partners.</li>
              <li>Deliveries require signature confirmation and may require identity verification upon receipt.</li>
              <li>Packaging is discreet and tamper-evident.</li>
          </ul>

           <h2>Address Accuracy</h2>
           <p>It is crucial that your shipping address registered with GoldNest is accurate and up-to-date. GoldNest is not liable for delivery issues arising from incorrect address information provided by the user.</p>

          <h2>Contact</h2>
          <p>If you have any questions regarding shipping or redemption, please contact our support team at support@goldnest.com.</p>

        </div>
      </main>

      <Footer />
    </>
  );
}