#!/bin/bash

# Create SSL directory if it doesn't exist
mkdir -p nginx/ssl

# Generate self-signed SSL certificate for development
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout nginx/ssl/key.pem \
    -out nginx/ssl/cert.pem \
    -subj "/C=VN/ST=Hanoi/L=Hanoi/O=SupportSystem/OU=IT/CN=localhost"

echo "SSL certificate generated successfully!"
echo "Certificate: nginx/ssl/cert.pem"
echo "Private key: nginx/ssl/key.pem"
echo ""
echo "Note: This is a self-signed certificate for development only."
echo "For production, use a proper SSL certificate from a trusted CA." 