# sales.rizzosai.com Backend

This Node.js/Express backend enables users to lease domain names for $20/day using Stripe recurring payments. After payment, domains are registered via ShopCo API, and users receive login info by email. The system manages daily payments, domain renewals, user creation, and referral features. SQLite is used for user storage. This codebase is kept separate from the main backoffice for easier updates and conflict avoidance.

## Features
- Stripe recurring payments for domain leasing
- ShopCo API integration for domain registration
- SQLite for user and referral data
- Automated daily payment and renewal management
- Email notifications for login info
- Affiliate/referral system

## Getting Started
1. Install dependencies:
   ```powershell
   npm install
   ```
2. Start the server:
   ```powershell
   npm start
   ```

## Environment Variables
- `STRIPE_SECRET_KEY`: Stripe API key
- `SHOPCO_API_KEY`: ShopCo API key
- `EMAIL_SERVICE_API_KEY`: Email service API key

## Folder Structure
- `/src`: Main backend source code
- `/db`: SQLite database file
- `/config`: Configuration files

## License
MIT
