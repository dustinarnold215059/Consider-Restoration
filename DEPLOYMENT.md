# Consider Restoration - Deployment Guide

## 🚀 Production Deployment Checklist

### Prerequisites
- [ ] Domain name purchased and configured
- [ ] SSL certificate obtained
- [ ] Cloud hosting account (AWS, DigitalOcean, etc.)
- [ ] Database hosting setup (PostgreSQL)
- [ ] Stripe account activated with live keys
- [ ] Email service configured (SendGrid/Mailgun)

## 1. Database Setup

### Option A: Using Managed Database (Recommended)
```bash
# Create PostgreSQL database on your cloud provider
# AWS RDS, DigitalOcean Managed Database, etc.
```

### Option B: Self-hosted PostgreSQL
```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql
CREATE DATABASE consider_restoration_prod;
CREATE USER cr_user WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE consider_restoration_prod TO cr_user;
\q
```

### Run Database Migration
```bash
cd server
psql -h your-db-host -U your-username -d consider_restoration_prod -f migrations/001-initial-setup.sql
```

## 2. Server Deployment

### Option A: DigitalOcean Droplet (Recommended for beginners)

1. **Create Droplet**
   - Ubuntu 22.04 LTS
   - 2GB RAM minimum (4GB recommended)
   - $24-48/month

2. **Server Setup**
```bash
# Connect to server
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Install PM2 (Process Manager)
npm install -g pm2

# Install Nginx
apt install nginx

# Install Certbot for SSL
apt install certbot python3-certbot-nginx
```

3. **Deploy Application**
```bash
# Clone your repository
git clone https://github.com/yourusername/christophers-website.git
cd christophers-website/server

# Install dependencies
npm install --production

# Set up environment file
cp .env.example .env
nano .env  # Fill in your production values

# Start with PM2
pm2 start server.js --name "consider-restoration"
pm2 startup
pm2 save
```

4. **Configure Nginx**
```bash
# Create Nginx configuration
nano /etc/nginx/sites-available/considerrestoration.com
```

```nginx
server {
    listen 80;
    server_name considerrestoration.com www.considerrestoration.com;

    # Frontend static files
    location / {
        root /path/to/christophers-website;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

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
}
```

```bash
# Enable site
ln -s /etc/nginx/sites-available/considerrestoration.com /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx

# Get SSL certificate
certbot --nginx -d considerrestoration.com -d www.considerrestoration.com
```

### Option B: AWS EC2 with Elastic Beanstalk

1. **Prepare Application**
```bash
# Create Elastic Beanstalk configuration
mkdir .ebextensions
```

Create `.ebextensions/01-node-command.config`:
```yaml
option_settings:
  aws:elasticbeanstalk:container:nodejs:
    NodeCommand: "npm start"
  aws:elasticbeanstalk:application:environment:
    NODE_ENV: production
```

2. **Deploy**
```bash
# Install EB CLI
pip install awsebcli

# Initialize and deploy
eb init
eb create production
eb deploy
```

## 3. Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Essential Configuration
DATABASE_URL=postgres://username:password@host:5432/database
JWT_SECRET=generate-256-bit-random-string
STRIPE_SECRET_KEY=sk_live_your_live_key
SENDGRID_API_KEY=SG.your_sendgrid_key
FRONTEND_URL=https://considerrestoration.com
```

## 4. DNS Configuration

Set up these DNS records:

```
Type    Name    Value                   TTL
A       @       your-server-ip          300
A       www     your-server-ip          300
CNAME   api     considerrestoration.com 300
```

## 5. SSL Certificate Setup

### Using Let's Encrypt (Free)
```bash
certbot --nginx -d considerrestoration.com -d www.considerrestoration.com
```

### Using Cloudflare (Recommended)
1. Sign up for Cloudflare
2. Add your domain
3. Update nameservers
4. Enable "Full (strict)" SSL mode

## 6. Monitoring & Maintenance

### Set up monitoring
```bash
# Install monitoring tools
npm install -g pm2
pm2 install pm2-server-monit

# Set up log rotation
pm2 install pm2-logrotate
```

### Backup Strategy
```bash
# Database backup script
#!/bin/bash
pg_dump $DATABASE_URL | gzip > backup-$(date +%Y%m%d).sql.gz
aws s3 cp backup-$(date +%Y%m%d).sql.gz s3://your-backup-bucket/
```

## 7. Testing Deployment

### Health Check Endpoints
```bash
# Test API
curl https://api.considerrestoration.com/health

# Test frontend
curl https://considerrestoration.com

# Test booking flow
# (Manual testing in browser)
```

## 8. Go-Live Checklist

- [ ] Database migration completed
- [ ] All environment variables set
- [ ] SSL certificate installed
- [ ] Email sending configured and tested
- [ ] Payment processing tested (small test transaction)
- [ ] Backup strategy in place
- [ ] Monitoring alerts configured
- [ ] DNS propagated (24-48 hours)
- [ ] Google Analytics tracking code updated
- [ ] Social media links updated
- [ ] Google Business Profile updated

## 9. Post-Launch Tasks

### Week 1
- [ ] Monitor server performance
- [ ] Check error logs daily
- [ ] Test all booking flows
- [ ] Monitor email deliverability

### Week 2-4
- [ ] Set up automated backups
- [ ] Configure monitoring alerts
- [ ] Optimize performance based on usage
- [ ] Set up Google Search Console

## 10. Troubleshooting

### Common Issues

**503 Service Unavailable**
```bash
# Check PM2 status
pm2 status
pm2 logs consider-restoration

# Restart if needed
pm2 restart consider-restoration
```

**Database Connection Issues**
```bash
# Test database connection
psql $DATABASE_URL -c "SELECT version();"

# Check environment variables
env | grep DATABASE
```

**SSL Certificate Issues**
```bash
# Renew certificate
certbot renew
nginx -t && systemctl reload nginx
```

## 11. Performance Optimization

### Server Optimization
```bash
# Enable gzip compression in Nginx
location / {
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
}
```

### Database Optimization
```sql
-- Add indexes for better performance (already included in migration)
-- Monitor slow queries
-- Set up connection pooling
```

## 12. Security Checklist

- [ ] Firewall configured (only 80, 443, 22 open)
- [ ] SSH keys configured (disable password auth)
- [ ] Database accessible only from application server
- [ ] Environment variables secured
- [ ] Regular security updates scheduled
- [ ] Backup encryption enabled

## 13. Cost Estimation

### Monthly Costs
- **Server (DigitalOcean 4GB)**: $48
- **Database (2GB)**: $25
- **SendGrid (40k emails)**: $15
- **SSL Certificate**: $0 (Let's Encrypt)
- **Domain**: $12/year
- **Backups**: $5
- **Monitoring**: $10

**Total: ~$115/month**

## 14. Support Contacts

- **Hosting Support**: Your hosting provider
- **Domain Support**: Your domain registrar
- **Stripe Support**: https://support.stripe.com
- **SendGrid Support**: https://support.sendgrid.com

## 15. Scaling Considerations

### When to Scale
- Server CPU > 80% consistently
- Response times > 2 seconds
- More than 100 concurrent users

### Scaling Options
1. **Vertical Scaling**: Upgrade server resources
2. **Horizontal Scaling**: Add load balancer + multiple servers
3. **Database Scaling**: Read replicas, connection pooling
4. **CDN**: Cloudflare for static assets

---

Need help with deployment? Contact your development team or follow this guide step by step.