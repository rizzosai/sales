from flask import Flask, render_template, request, jsonify, redirect, url_for
import requests
import json
from datetime import datetime
import os
import xml.etree.ElementTree as ET

app = Flask(__name__)

# Configuration for integrations
BACK_OFFICE_URL = "https://rizzosai-backend.onrender.com"
WEBHOOK_ENDPOINT = f"{BACK_OFFICE_URL}/webhook/domain-purchase"

# Namecheap API Configuration (use environment variables in production)
NAMECHEAP_API_USER = os.environ.get('NAMECHEAP_API_USER', 'your_api_user')
NAMECHEAP_API_KEY = os.environ.get('NAMECHEAP_API_KEY', 'your_api_key')
NAMECHEAP_USERNAME = os.environ.get('NAMECHEAP_USERNAME', 'your_username')
NAMECHEAP_CLIENT_IP = os.environ.get('NAMECHEAP_CLIENT_IP', 'your_ip')
NAMECHEAP_SANDBOX = os.environ.get('NAMECHEAP_SANDBOX', 'true').lower() == 'true'

# Zapier Webhook URL (you'll configure this in Zapier)
ZAPIER_WEBHOOK_URL = os.environ.get('ZAPIER_WEBHOOK_URL', '')

@app.route('/')
def index():
    """Main sales landing page with 5-referral system"""
    return render_template('index.html')

@app.route('/api/domain/check', methods=['POST'])
def check_domain_availability():
    """Check if domain is available via Namecheap API"""
    try:
        data = request.get_json()
        domain = data.get('domain', '').strip().lower()
        import os
        port = int(os.environ.get("PORT", 5000))
        app.run(host="0.0.0.0", port=port, debug=os.environ.get('DEBUG', 'False').lower() == 'true')
        
        if not domain:
            return jsonify({'error': 'Domain name required'}), 400
            
        # Remove any protocol or www prefix
        domain = domain.replace('http://', '').replace('https://', '').replace('www.', '')
        
        # Basic domain validation
        if '.' not in domain or len(domain) < 3:
            return jsonify({'available': False, 'error': 'Invalid domain format'}), 400

        # DEBUG: Show raw Namecheap API response if requested
        debug = data.get('debug', False)
        if debug:
            try:
                url = 'https://api.sandbox.namecheap.com/xml.response' if NAMECHEAP_SANDBOX else 'https://api.namecheap.com/xml.response'
                params = {
                    'ApiUser': NAMECHEAP_API_USER,
                    'ApiKey': NAMECHEAP_API_KEY,
                    'UserName': NAMECHEAP_USERNAME,
                    'Command': 'namecheap.domains.check',
                    'ClientIp': NAMECHEAP_CLIENT_IP,
                    'DomainList': domain
                }
                response = requests.get(url, params=params, timeout=10)
                return jsonify({
                    'domain': domain,
                    'status_code': response.status_code,
                    'raw_response': response.text
                })
            except Exception as e:
                return jsonify({'error': str(e)}), 500

        # Check with Namecheap API
        is_available = check_namecheap_availability(domain)
        return jsonify({
            'available': is_available,
            'domain': domain,
            'message': f"Domain {domain} is {'available' if is_available else 'not available'}"
        })
        
    except Exception as e:
        app.logger.error(f"Domain check error: {e}")
        return jsonify({'error': 'Unable to check domain availability'}), 500

def check_namecheap_availability(domain):
    """Check domain availability using Namecheap API"""
    try:
        # Namecheap API endpoint
        url = 'https://api.sandbox.namecheap.com/xml.response' if NAMECHEAP_SANDBOX else 'https://api.namecheap.com/xml.response'
        
        params = {
            'ApiUser': NAMECHEAP_API_USER,
            'ApiKey': NAMECHEAP_API_KEY,
            'UserName': NAMECHEAP_USERNAME,
            'Command': 'namecheap.domains.check',
            'ClientIp': NAMECHEAP_CLIENT_IP,
            'DomainList': domain
        }
        
        response = requests.get(url, params=params, timeout=10)
        
        if response.status_code == 200:
            # Parse XML response
            root = ET.fromstring(response.content)
            
            # Find the domain result
            for domain_result in root.findall('.//DomainCheckResult'):
                if domain_result.get('Domain').lower() == domain.lower():
                    return domain_result.get('Available').lower() == 'true'
                    
        # If API fails, assume not available for safety
        return False
        
    except Exception as e:
        app.logger.error(f"Namecheap API error: {e}")
        return False

@app.route('/pay')
def payment_page():
    """Payment page for domain registration"""
    domain = request.args.get('domain', '')
    if not domain:
        return redirect(url_for('index'))
    return render_template('payment.html', domain=domain)

@app.route('/domain-purchase', methods=['POST'])
def handle_domain_purchase():
    """Handle domain purchase form submission with Zapier integration"""
    try:
        # Get form data
        data = request.get_json() if request.is_json else request.form.to_dict()
        
        # Validate required fields
        required_fields = ['email', 'first_name', 'domain_preference']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'status': 'error',
                    'message': f'Missing required field: {field}'
                }), 400
        
        # Prepare webhook data for back office
        webhook_data = {
            'email': data.get('email'),
            'first_name': data.get('first_name'),
            'last_name': data.get('last_name', ''),
            'domain_preference': data.get('domain_preference'),
            'phone': data.get('phone', ''),
            'selected_plan': 'domain_rental',
            'amount': 20,
            'source': 'sales_website_zapier',
            'timestamp': datetime.now().isoformat(),
            'referral_system': '5_referral_system',
            'namecheap_check': True
        }
        
        # Send to Zapier if configured
        if ZAPIER_WEBHOOK_URL:
            try:
                zapier_response = requests.post(
                    ZAPIER_WEBHOOK_URL,
                    json=webhook_data,
                    headers={'Content-Type': 'application/json'},
                    timeout=10
                )
                webhook_data['zapier_status'] = 'success' if zapier_response.status_code == 200 else 'failed'
            except Exception as e:
                webhook_data['zapier_status'] = 'failed'
                webhook_data['zapier_error'] = str(e)
        
        # Send webhook to back office
        try:
            response = requests.post(
                WEBHOOK_ENDPOINT,
                json=webhook_data,
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                return jsonify({
                    'status': 'success',
                    'message': 'Domain purchase processed successfully',
                    'redirect_url': '/success',
                    'back_office_url': BACK_OFFICE_URL,
                    'zapier_integrated': bool(ZAPIER_WEBHOOK_URL)
                })
            else:
                return jsonify({
                    'status': 'error',
                    'message': 'Failed to process domain purchase'
                }), 500
                
        except requests.exceptions.RequestException as e:
            app.logger.error(f"Back office webhook error: {e}")
            return jsonify({
                'status': 'error',
                'message': 'Unable to connect to back office system'
            }), 500
            
    except Exception as e:
        app.logger.error(f"Domain purchase error: {e}")
        return jsonify({
            'status': 'error',
            'message': 'An unexpected error occurred'
        }), 500

@app.route('/success')
def success():
    """Success page after domain purchase"""
    return render_template('success.html')

@app.route('/privacy')
def privacy():
    """Privacy policy page"""
    return render_template('privacy.html')

@app.route('/terms')
def terms():
    """Terms and conditions page"""
    return render_template('terms.html')

@app.route('/api/health')
def health_check():
    """Health check endpoint for monitoring"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'service': 'RizzosAI Sales Website',
        'integrations': {
            'back_office': bool(BACK_OFFICE_URL),
            'zapier': bool(ZAPIER_WEBHOOK_URL),
            'namecheap': bool(NAMECHEAP_API_KEY),
        }
    })

@app.route('/api/test-integrations')
def test_integrations():
    """Test endpoint to verify all integrations are working"""
    results = {}
    
    # Test back office connection
    try:
        response = requests.get(f"{BACK_OFFICE_URL}/health", timeout=5)
        results['back_office'] = 'connected' if response.status_code == 200 else 'error'
    except:
        results['back_office'] = 'unreachable'
    
    # Test Zapier webhook (if configured)
    if ZAPIER_WEBHOOK_URL:
        try:
            test_data = {'test': True, 'timestamp': datetime.now().isoformat()}
            response = requests.post(ZAPIER_WEBHOOK_URL, json=test_data, timeout=5)
            results['zapier'] = 'connected' if response.status_code == 200 else 'error'
        except:
            results['zapier'] = 'unreachable'
    else:
        results['zapier'] = 'not_configured'
    
    # Test Namecheap API
    if NAMECHEAP_API_KEY and NAMECHEAP_API_KEY != 'your_api_key':
        try:
            available = check_namecheap_availability('test-domain-that-should-not-exist-12345.com')
            results['namecheap'] = 'connected'
        except:
            results['namecheap'] = 'error'
    else:
        results['namecheap'] = 'not_configured'
    
    return jsonify({
        'status': 'integration_test_complete',
        'results': results,
        'timestamp': datetime.now().isoformat()
    })

@app.errorhandler(404)
def not_found(error):
    """404 error handler"""
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_error(error):
    """500 error handler"""
    return render_template('500.html'), 500

