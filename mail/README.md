# Mailcow Email Server Guide

This guide covers both setting up a new Mailcow email server and adding a domain to an existing Mailcow installation.

## Option 1: Setting Up a New Mailcow Server

### Prerequisites
- Ubuntu server
- Domain with DNS access
- Docker and Docker Compose installed

### 1. DNS Configuration

Set up these DNS records for the domain (example.com):
```
@ A [SERVER-IP]
mail A [SERVER-IP]
www CNAME example.com
@ MX 10 mail.example.com
autoconfig.mail CNAME mail.example.com
autodiscover.mail CNAME mail.example.com
autodiscover CNAME mail.example.com
@ TXT v=spf1 mx a ip4:[SERVER-IP] -all
_dmarc TXT v=DMARC1; p=none; rua=mailto:admin@example.com
```

The DKIM record will be generated after Mailcow is installed.

### 2. Install Mailcow

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install requirements
sudo apt install -y curl git docker.io docker-compose

# Create directory for Mailcow
mkdir -p /opt/mailcow
cd /opt/mailcow

# Clone Mailcow repository
git clone https://github.com/mailcow/mailcow-dockerized .

# Run the configuration script
./generate_config.sh
```

When prompted:
- Enter hostname (e.g., `mail.example.com`)
- Select your timezone

### 3. Configure Mailcow

Edit mailcow.conf to customize settings:
```bash
nano mailcow.conf
```

If you need to run multiple instances or have port conflicts, set unique HTTP/HTTPS ports:
```
HTTP_PORT=8081
HTTPS_PORT=8443
```

### 4. Start Mailcow

```bash
# Pull and start containers
docker-compose pull
docker-compose up -d
```

### 5. Set Up Nginx Reverse Proxy (Optional)

If you've changed the default ports, create a new Nginx configuration:
```bash
sudo nano /etc/nginx/sites-available/mail.example.com
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name mail.example.com;

    location / {
        proxy_pass http://127.0.0.1:8081;
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
        
        client_max_body_size 100M;
    }
    
    access_log /var/log/nginx/mail.example.com.access.log;
    error_log /var/log/nginx/mail.example.com.error.log;
}
```

Enable the configuration:
```bash
sudo ln -s /etc/nginx/sites-available/mail.example.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 6. Access the Admin Panel

1. Visit `http://mail.example.com` (or http://mail.example.com:8081 if you changed the port)
2. Login with default credentials:
   - Username: `admin`
   - Password: `moohoo`

### 7. Create Email Accounts

1. Go to "Mail Setup" → "Domains"
2. Add the domain (this determines the email address format - e.g., adding `mail.example.com` creates addresses like user@mail.example.com)
3. Go to "Mail Setup" → "Mailboxes"
4. Create email accounts

## Option 2: Adding a Domain to an Existing Mailcow Server

If you already have a working Mailcow server and want to add another domain:

### 1. DNS Configuration for the New Domain

For the new domain (e.g., e-polyclinic.uz), add these DNS records pointing to the existing mail server (e.g., mail.students.uz):

```
@ A [EXISTING-SERVER-IP]
www A [EXISTING-SERVER-IP]

# Mail configuration
mail.e-polyclinic.uz MX 10 mail.students.uz
autoconfig.mail.e-polyclinic.uz CNAME mail.students.uz
autodiscover.mail.e-polyclinic.uz CNAME mail.students.uz
autodiscover.e-polyclinic.uz CNAME mail.students.uz

# Email authentication
e-polyclinic.uz TXT v=spf1 +a +mx +ip4:[EXISTING-SERVER-IP] -all
_dmarc.mail.e-polyclinic.uz TXT v=DMARC1; p=none; rua=mailto:dmarc-reports@e-polyclinic.uz
```

### 2. Add the Domain in Mailcow Admin Panel

1. Log in to the existing Mailcow admin panel
2. Go to "Mail Setup" → "Domains"
3. Click "Add domain"
4. Enter the domain name (e.g., `mail.e-polyclinic.uz`)
5. Configure any domain-specific settings

Note: The domain added here will be what appears after the @ symbol in email addresses (user@mail.e-polyclinic.uz).

### 3. Configure DKIM for the New Domain

After adding the domain:

1. In the Mailcow admin panel, go to "Configuration" → "Configuration & Details"
2. Find "ARC/DKIM keys" and locate the newly added domain
3. Copy the DKIM public key (the long string starting with "v=DKIM1...")
4. Add this as a TXT record for `dkim._domainkey.mail.e-polyclinic.uz`

### 4. Create Email Accounts for the New Domain

1. Go to "Mail Setup" → "Mailboxes"
2. Click "Add mailbox"
3. Select the new domain from the dropdown
4. Fill in the username, password, and other details

## Common Troubleshooting

### Fixing the Missing Postfix Transport Database

If you see errors like `warning: hash:/etc/postfix/transport is unavailable. open database /etc/postfix/transport.db: No such file or directory`:

1. Create the missing transport file:
   ```bash
   touch ./data/conf/postfix/transport
   ```

2. Enter the Postfix container:
   ```bash
   docker-compose exec postfix-mailcow bash
   ```

3. Generate the transport database file:
   ```bash
   postmap /etc/postfix/transport
   ```

4. Verify the database file was created:
   ```bash
   ls -la /etc/postfix/transport*
   ```

5. Exit the container:
   ```bash
   exit
   ```

6. Restart the Postfix service:
   ```bash
   docker-compose restart postfix-mailcow
   ```

### Docker Network Conflict
```
Error: failed to create network mailcowdockerized_mailcow-network: Error response from daemon: Pool overlaps with other one on this address space
```

**Solution:**
1. Edit docker-compose.yml and specify a different subnet:
```yaml
networks:
  mailcow-network:
    driver: bridge
    ipam:
      driver: default
      config:
        - subnet: 172.22.1.0/24
```
2. Clean up and restart:
```bash
docker-compose down
docker network prune
docker-compose up -d
```

### Unbound Container Unhealthy
```
container for service "unbound-mailcow" is unhealthy
```

**Solution:**
1. Stop systemd-resolved:
```bash
sudo systemctl stop systemd-resolved
sudo systemctl disable systemd-resolved
```

2. Update resolv.conf:
```bash
sudo nano /etc/resolv.conf
# Add:
nameserver 1.1.1.1
nameserver 8.8.8.8
```

3. Restart the container:
```bash
docker restart mailcowdockerized-unbound-mailcow-1
```

### Nginx 502 Bad Gateway

**Solution:**
1. Check if Mailcow services are running:
```bash
docker-compose ps
```

2. Check correct ports in mailcow.conf:
```bash
grep HTTP_PORT mailcow.conf
```

3. Ensure Nginx configuration uses correct port:
```bash
sudo nano /etc/nginx/sites-available/mail.example.com
# Update proxy_pass with correct port
```

4. Try restarting all containers:
```bash
docker-compose restart
docker-compose up -d --force-recreate nginx-mailcow
```

### Domain Cannot Match Hostname Error

**Solution:**
- Add a different domain (e.g., `example.com` instead of `mail.example.com`)
- OR change the server hostname in mailcow.conf:
```bash
nano mailcow.conf
# Change: MAILCOW_HOSTNAME=mx.example.com
```

### Gmail Delivery Issues (SPF/DKIM)

If you see errors like `550-5.7.26 Gmail requires all senders to authenticate with either SPF or DKIM`:

1. Make sure your SPF record is correctly set up:
   ```
   @ TXT v=spf1 mx a ip4:[YOUR-SERVER-IP] -all
   ```

2. Verify your DKIM configuration:
   - Check that `dkim._domainkey.mail.example.com` TXT record has your public key
   - Ensure the key is properly formatted without line breaks

3. Test your email configuration using mail-tester.com
   - Send an email to the address provided by mail-tester
   - Review the authentication results and fix any issues

## Firewall Configuration

Allow these essential mail ports:
```bash
sudo ufw allow 25/tcp    # SMTP
sudo ufw allow 465/tcp   # SMTPS
sudo ufw allow 587/tcp   # Submission
sudo ufw allow 143/tcp   # IMAP
sudo ufw allow 993/tcp   # IMAPS
sudo ufw allow 110/tcp   # POP3
sudo ufw allow 995/tcp   # POP3S
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
```

## Testing Your Setup

1. **Test webmail access:**
   - Visit http://mail.example.com/SOGo/

2. **Email client settings:**
   - IMAP: mail.example.com:993 (SSL/TLS)
   - SMTP: mail.example.com:587 (STARTTLS)

3. **Send test emails:**
   - Between internal accounts
   - To/from external email providers

4. **Check mail queue:**
   ```bash
   docker-compose exec postfix-mailcow postqueue -p
   ```

5. **Command line tests:**
   ```bash
   telnet mail.example.com 25    # Test SMTP
   telnet mail.example.com 143   # Test IMAP
   ```

6. **Check logs:**
   ```bash
   docker-compose logs postfix-mailcow | tail -50
   ```

## Important Domain Configuration Notes

When setting up your domains in Mailcow:

1. The domain name added in Mailcow admin panel determines the domain for email addresses (e.g., if `mail.example.com` is added as the domain, emails will be user@mail.example.com).
2. In this setup, `mail.e-polyclinic.uz` is added as the domain in Mailcow.
3. This differs from the standard recommendation but will work as long as DNS records are configured accordingly.
4. Email addresses will be created as `user@example.com`, not as `user@mail.example.com`.
5. The MX record must point to your mail server (e.g., `mail.example.com`), not directly to an IP address.