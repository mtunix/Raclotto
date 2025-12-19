#!/bin/bash

# Script to generate self-signed SSL certificates for HTTPS development
# This helps avoid browser security warnings

CERT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CERT_FILE="$CERT_DIR/cert.pem"
KEY_FILE="$CERT_DIR/key.pem"

echo "Generating self-signed SSL certificate..."
echo "Certificate will be saved to: $CERT_FILE"
echo "Key will be saved to: $KEY_FILE"
echo ""

# Generate certificate valid for 365 days
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout "$KEY_FILE" \
  -out "$CERT_FILE" \
  -days 365 \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

if [ $? -eq 0 ]; then
  echo ""
  echo "✓ Certificate generated successfully!"
  echo ""
  echo "To use these certificates, set the following environment variables:"
  echo "  export SSL_CRT_FILE=cert.pem"
  echo "  export SSL_KEY_FILE=key.pem"
  echo ""
  echo "Or add them to your .env file:"
  echo "  SSL_CRT_FILE=cert.pem"
  echo "  SSL_KEY_FILE=key.pem"
  echo ""
  echo "Note: You may need to accept the certificate in your browser on first use."
else
  echo ""
  echo "✗ Failed to generate certificate. Make sure OpenSSL is installed."
  exit 1
fi

