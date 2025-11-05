# RizzosAI Sales Site with Zapier & Namecheap Integration

A comprehensive Flask-based sales platform for RizzosAI domain rental services with automated Zapier workflows and Namecheap API integration.

## Features

- **Domain Rental System**: Revolutionary 5-referral system with $20/day premium space rental
- **Zapier Integration**: Automated lead processing and workflow triggers
- **Namecheap API**: Real-time domain availability checking and registration
- **Automated Processing**: Seamless user onboarding and account creation
- **Responsive Design**: Patriotic red, white, and blue theme with mobile optimization

## System Architecture

### The 5-Referral System
1. **1st Referral**: Handled automatically by the system
2. **2nd Referral**: Goes to system owner for platform maintenance
3. **3rd-5th Referrals**: Automatically placed by the system
4. **6th+ Referrals**: All future referrals go directly to the user

### Integrations
- **Zapier Webhooks**: Automated email sequences and user placement
- **Namecheap API**: Domain registration and availability checking
- **Back Office Integration**: Seamless connection to existing platform
- **Payment Processing**: Secure transaction handling

## Installation & Setup

### Prerequisites
- Python 3.8+
- Flask
- Requests library
- Environment variables for API keys

### Environment Variables
Create a `.env` file with:
```
NAMECHEAP_API_USER=your_namecheap_username
NAMECHEAP_API_KEY=your_namecheap_api_key
NAMECHEAP_CLIENT_IP=your_whitelisted_ip
ZAPIER_WEBHOOK_URL=your_zapier_webhook_url
BACKOFFICE_API_URL=https://rizzosai-backend.onrender.com
```

### Installation
```bash
# Install dependencies
pip install flask requests python-dotenv

# Run the application
python app.py
```

## API Endpoints

### Core Routes
- `GET /`: Main sales page with domain selection
- `GET /success`: Success page after registration
- `GET /privacy`: Privacy policy page
- `GET /terms`: Terms and conditions page

### API Endpoints
- `POST /api/domain/check`: Check domain availability via Namecheap
- `POST /domain-purchase`: Process domain purchase with Zapier integration
- `GET /api/health`: Health check for integrations
- `GET /api/test-integrations`: Test Zapier and Namecheap connections

## File Structure

```
rizzosai-sales-zapier/
├── app.py                 # Main Flask application
├── templates/
│   ├── index.html         # Main sales page
│   ├── success.html       # Success confirmation page
│   ├── privacy.html       # Privacy policy
│   └── terms.html         # Terms and conditions
├── requirements.txt       # Python dependencies
├── .env                   # Environment variables (create this)
└── README.md             # This file
```

## Key Features Explained

### Domain Availability Checking
- Real-time checks via Namecheap API
- XML response parsing for accurate availability status
- Immediate feedback to users before purchase

### Automated Workflows
- Zapier webhook triggers on form submission
- Automated email sequences for user onboarding
- Integration with back office for account creation

### Responsive Design
- Patriotic red, white, and blue color scheme
- Mobile-optimized layout
- Audio integration for enhanced user experience

## Deployment

### Environment Setup
1. Set up Namecheap API access and whitelist your server IP
2. Configure Zapier webhooks for automation
3. Set environment variables in your hosting platform

### Production Considerations
- Use secure HTTPS connections
- Implement rate limiting for API calls
- Set up monitoring for integration health
- Configure proper error logging

## Integration Testing

Test all integrations using the `/api/test-integrations` endpoint:
- Verifies Zapier webhook connectivity
- Tests Namecheap API authentication
- Checks back office API connection

## Support & Maintenance

### Monitoring
- Health check endpoint for system status
- Integration status display on main page
- Error logging for troubleshooting

### Updates
- Regular testing of API integrations
- Monitoring of third-party service changes
- User feedback integration for improvements

## Security Features

- Environment variable protection for API keys
- Input validation and sanitization
- Secure payment processing integration
- CORS configuration for API security

## Business Model

RizzosAI Domains operates on a unique domain rental model:
- Premium digital space rental at $20/day
- Fair distribution through the 5-referral system
- Automated placement ensures no user is left behind
- Direct earnings after initial system requirements

## Contact

- Support: support@rizzosai.com
- Technical: dev@rizzosai.com
- Legal: legal@rizzosai.com

---

**Built with Flask, powered by automation, designed for success.**