# 🚀 Production Deployment Guide

## Overview
This guide covers deploying Christopher's Massage Therapy website with enterprise-grade security, database backend, and payment processing.

## 🔧 Architecture

### Server-Side Components
- **Node.js/Express API** - Secure backend server
- **SQLite/PostgreSQL Database** - Production data storage
- **JWT Authentication** - Secure session management
- **Stripe Integration** - PCI-compliant payment processing
- **Email Service** - SendGrid integration for notifications

### Security Features
- ✅ Server-side authentication with JWT tokens
- ✅ Password hashing with bcryptjs
- ✅ Rate limiting and DDoS protection
- ✅ CORS and security headers (Helmet)
- ✅ Secure session management
- ✅ Data validation and sanitization
- ✅ Stripe webhook verification

## 🏗️ Deployment Steps

### 1. Server Setup

#### Install Dependencies
```bash
cd server
npm install
```

#### Environment Configuration
```bash
cp .env.example .env
```

Edit `.env` with your production values:
```env
NODE_ENV=production
PORT=3050
DATABASE_URL=./production-database.sqlite
JWT_SECRET=your-actual-super-secret-jwt-key-256-bits-minimum
SESSION_SECRET=your-actual-super-secret-session-key-256-bits-minimum
STRIPE_SECRET_KEY=sk_live_your_actual_stripe_secret
STRIPE_WEBHOOK_SECRET=whsec_your_actual_webhook_secret
SENDGRID_API_KEY=your_actual_sendgrid_key
FRONTEND_URL=https://considerrestoration.com
```

#### Database Setup
```bash
# Initialize database
npm run setup

# Run migrations
npm run migrate
```

#### Start Production Server
```bash
# Start with PM2 for production
npm install -g pm2
pm2 start server.js --name "massage-api"
pm2 startup
pm2 save
```

### 2. Stripe Configuration

#### Create Stripe Account
1. Sign up at [stripe.com](https://stripe.com)
2. Get API keys from Dashboard
3. Configure webhook endpoint: `https://yoursite.com/api/payments/webhook`
4. Select webhook events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `invoice.payment_succeeded`

#### Test Payments
```bash
# Use test cards for development
4242424242424242 # Successful payment
4000000000000002 # Declined payment
```

### 3. SSL/HTTPS Setup

#### Using Let's Encrypt (Recommended)
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Generate certificate
sudo certbot --nginx -d considerrestoration.com -d www.considerrestoration.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 4. Reverse Proxy (Nginx)

Create `/etc/nginx/sites-available/considerrestoration`:
```nginx
server {
    listen 443 ssl http2;
    server_name considerrestoration.com www.considerrestoration.com;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/considerrestoration.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/considerrestoration.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # API routes
    location /api/ {
        proxy_pass http://localhost:3050;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static website files
    location / {
        root /var/www/considerrestoration;
        index index.html;
        try_files $uri $uri/ =404;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name considerrestoration.com www.considerrestoration.com;
    return 301 https://$server_name$request_uri;
}
```

### 5. Database Backup

#### Automated Backups
```bash
# Install backup utility
cd server
node utils/backup-database.js create

# Schedule daily backups
crontab -e
# Add: 0 2 * * * cd /path/to/server && node utils/backup-database.js create
```

#### Manual Backup/Restore
```bash
# Create backup
node utils/backup-database.js create

# List backups
node utils/backup-database.js list

# Restore from backup
node utils/backup-database.js restore ./backups/backup-2024-01-15.sql
```

## 🔒 Security Checklist

### Server Security
- [ ] Strong JWT secrets (256+ bits)
- [ ] HTTPS enforced
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Security headers (Helmet)
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention
- [ ] XSS protection

### Database Security
- [ ] Database backups configured
- [ ] Access credentials secured
- [ ] Connection encryption
- [ ] Regular security updates

### Payment Security
- [ ] Stripe Live keys configured
- [ ] Webhook endpoint secured
- [ ] PCI compliance verified
- [ ] Test payments working
- [ ] Refund process tested

### Authentication Security
- [ ] Password complexity requirements
- [ ] Account lockout after failed attempts
- [ ] Session expiration configured
- [ ] JWT token rotation
- [ ] Secure password reset flow

## 📊 Monitoring & Logging

### Application Monitoring
```bash
# Install monitoring tools
npm install -g pm2-logrotate
pm2 install pm2-server-monit

# View logs
pm2 logs massage-api
```

### Health Checks
```bash
# Test API health
curl https://considerrestoration.com/health

# Test specific endpoints
curl https://considerrestoration.com/api/auth/login -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass"}'
```

### Database Monitoring
```bash
# Check database size
ls -lh server/production-database.sqlite

# Check backup status
node utils/backup-database.js list
```

## 🚨 Troubleshooting

### Common Issues

#### "Server not available" error
- Check if server is running: `pm2 status`
- Check server logs: `pm2 logs massage-api`
- Verify port configuration
- Check firewall settings

#### Payment processing fails
- Verify Stripe keys in `.env`
- Check webhook endpoint configuration
- Test with Stripe test cards
- Review Stripe dashboard logs

#### Database connection errors
- Check database file permissions
- Verify DATABASE_URL in `.env`
- Check disk space
- Review server logs

#### Email notifications not sending
- Verify SendGrid API key
- Check FROM_EMAIL configuration
- Review email service logs
- Test email templates

## 📞 Support & Maintenance

### Regular Maintenance Tasks
- Weekly: Review error logs and monitoring
- Monthly: Update dependencies and security patches
- Quarterly: Review and rotate API keys
- Annually: Renew SSL certificates

### Performance Optimization
- Enable gzip compression
- Optimize database queries
- Cache static assets
- Monitor response times
- Scale server resources as needed

### Backup Strategy
- Daily automated backups
- Weekly backup verification
- Monthly disaster recovery testing
- Offsite backup storage

## 🎯 Post-Deployment Verification

### Functionality Tests
- [ ] User registration works
- [ ] Login/logout works
- [ ] Appointment booking works
- [ ] Payment processing works
- [ ] Email notifications work
- [ ] Admin panel accessible
- [ ] Mobile responsiveness
- [ ] SSL certificate valid

### Performance Tests
- [ ] Page load times < 3 seconds
- [ ] API response times < 500ms
- [ ] Database queries optimized
- [ ] CDN configured for static assets

### Security Tests
- [ ] SSL Labs grade A+
- [ ] Security headers present
- [ ] Authentication working
- [ ] Rate limiting effective
- [ ] Data validation working

## 📋 Production Environment Variables

Required variables for production:
```env
NODE_ENV=production
PORT=3050
DATABASE_URL=./production-database.sqlite
JWT_SECRET=<strong-256-bit-secret>
SESSION_SECRET=<strong-256-bit-secret>
STRIPE_SECRET_KEY=<live-stripe-key>
STRIPE_WEBHOOK_SECRET=<webhook-secret>
SENDGRID_API_KEY=<sendgrid-key>
FROM_EMAIL=noreply@considerrestoration.com
FRONTEND_URL=https://considerrestoration.com
```

## 🆘 Emergency Procedures

### Server Down
1. Check server status: `pm2 status`
2. Restart if needed: `pm2 restart massage-api`
3. Check logs: `pm2 logs`
4. Verify database connection
5. Test critical endpoints

### Database Corruption
1. Stop the application
2. Restore from latest backup
3. Verify data integrity
4. Restart application
5. Monitor for issues

### Payment Issues
1. Check Stripe dashboard
2. Verify webhook status
3. Review payment logs
4. Contact Stripe support if needed
5. Notify affected users

This production setup ensures enterprise-grade security, reliability, and scalability for Christopher's Massage Therapy website.