# BCE Office Inventory Tracker

A web portal for tracking office equipment across Biz Cloud Experts locations. Staff can log equipment by scanning a photo or entering details manually. Admins get a dashboard with filters, user management, and Excel export.

Portal: `https://d28o7lqen6b51.cloudfront.net`

---

## Architecture

### Overview

The application follows a serverless architecture on AWS, with a React SPA frontend served via CloudFront and a Lambda-backed REST API.

```
┌─────────────────────────────────────────────────────────────────────┐
│                          USERS (US & India only)                    │
│                     Browser / Mobile Device                         │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │     AWS WAF          │
                    │  - Common Rules      │
                    │  - Bad Input Rules   │
                    │  - Rate Limiting     │
                    │  - Geo Restriction   │
                    │    (US + India)      │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   CloudFront (CDN)   │
                    │   HTTPS only         │
                    │   OAC to S3          │
                    └──────┬───────┬──────┘
                           │       │
              ┌────────────┘       └────────────┐
              ▼                                  ▼
   ┌────────────────────┐            ┌────────────────────┐
   │  S3 - Website       │            │  API Gateway       │
   │  (React SPA)        │            │  (REST API)        │
   │  Block All Public   │            └─────────┬──────────┘
   │  SSL Enforced       │                      │
   └────────────────────┘                       ▼
                                     ┌────────────────────┐
                                     │  Lambda Function    │
                                     │  (Node.js 20.x)    │
                                     └──┬──────┬──────┬───┘
                                        │      │      │
                          ┌─────────────┘      │      └──────────────┐
                          ▼                    ▼                     ▼
               ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
               │  DynamoDB        │ │  DynamoDB        │ │  S3 - Images     │
               │  Inventory Table │ │  Users Table     │ │  Block All Public│
               │  (encrypted)    │ │  (encrypted)     │ │  SSL Enforced    │
               └──────────────────┘ └──────────────────┘ └────────┬─────────┘
                                                                  │
                                                                  ▼
                                                       ┌──────────────────┐
                                                       │  Rekognition     │
                                                       │  - DetectLabels  │
                                                       │  - DetectText    │
                                                       └──────────────────┘
```

### Authentication

- AWS Cognito (Hosted UI) with authorization code flow
- Supports Google SSO and username/password
- Role-based access: Admin and User roles
- Admin access managed via Users tab toggle

### Components

| Component | Service | Purpose |
|-----------|---------|---------|
| Frontend | S3 + CloudFront | React SPA hosting with HTTPS |
| API | API Gateway + Lambda | REST API for CRUD operations |
| Database | DynamoDB (x2) | Inventory items + User management |
| Image Storage | S3 | Equipment photo uploads via presigned URLs |
| Image Recognition | Rekognition | Auto-detect equipment and read text from photos |
| Auth | Cognito | SSO with Google + username/password |
| Security | WAF | Common exploits, rate limiting, geo restriction |
| IaC | AWS CDK (TypeScript) | Infrastructure as Code |

---

## Security

- S3 buckets: `BlockPublicAccess.BLOCK_ALL` + `enforceSSL: true`
- CloudFront: Uses Origin Access Control (OAC) — not OAI (legacy)
- CloudFront: HTTPS only (`REDIRECT_TO_HTTPS`)
- DynamoDB: AWS-managed encryption at rest
- WAF: AWS Managed Common Rule Set, Known Bad Inputs, rate limiting (1000 req/5min/IP)
- WAF: Geo restriction — only US and India traffic allowed
- Image uploads: Presigned URLs with 5-minute expiry
- No hardcoded credentials in frontend code
- Cognito handles all authentication

---

## Deployment Steps

### Prerequisites

- Node.js 18+
- AWS CLI configured with credentials
- AWS CDK CLI (`npm install -g aws-cdk`)

### 1. Clone the repository

```bash
git clone https://github.com/bizcloud-experts/bce-inventory.git
cd bce-inventory
```

### 2. Install dependencies

```bash
cd frontend && npm install && cd ..
cd infra && npm install && cd ..
```

### 3. Build the frontend

```bash
cd frontend
VITE_API_URL=<your-api-gateway-url> npx vite build
cd ..
```

### 4. Bootstrap CDK (first time only)

```bash
cd infra
npx cdk bootstrap
```

### 5. Deploy the stack

```bash
npx cdk deploy --require-approval never
```

This creates all AWS resources: DynamoDB tables, Lambda, API Gateway, S3 buckets, CloudFront distribution.

### 6. Update frontend with API URL

After deploy, copy the `ApiUrl` from the stack outputs and rebuild the frontend:

```bash
cd ../frontend
VITE_API_URL=<ApiUrl-from-output> npx vite build
```

### 7. Upload frontend to S3

```bash
aws s3 sync dist/ s3://<website-bucket-name>/ --delete
aws cloudfront create-invalidation --distribution-id <dist-id> --paths "/*"
```

### 8. Configure WAF (optional)

WAF is configured separately via AWS CLI. See the deployment history for geo restriction and rule setup commands.

### 9. Configure Cognito

Update `frontend/src/main.jsx` with your Cognito User Pool details:
- `authority`: Cognito User Pool URL
- `client_id`: App client ID
- `redirect_uri`: CloudFront distribution URL

Ensure the CloudFront URL is added to the Cognito app client's allowed callback and logout URLs.

---

## Project Structure

```
├── frontend/           # React app (Vite)
│   ├── src/
│   │   ├── App.jsx     # Main app with auth, admin dashboard, user panel
│   │   ├── api.js      # API client functions
│   │   ├── icons.jsx   # SVG icon components
│   │   ├── main.jsx    # Entry point with Cognito AuthProvider
│   │   └── index.css   # Global styles
│   └── public/         # Static assets (favicon, logo)
├── backend/
│   └── index.mjs       # Lambda handler (all API routes)
├── infra/
│   └── lib/
│       ├── app.ts      # CDK app entry
│       └── inventory-stack.ts  # Full infrastructure stack
└── README.md
```

---

## Features

- Equipment logging with scan (camera) or manual entry
- Auto-fill form fields from scanned image (Rekognition + text detection)
- Admin dashboard with category tabs: Office, FieldsManager, TVs, Podcast Room
- Working/Not Working status toggle filter
- Location filter: Suite 180 / Suite 300
- Excel export of filtered inventory
- User management with admin toggle
- Cognito SSO (Google + username/password)
